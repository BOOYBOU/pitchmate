import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Volume2,
  VolumeX,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { SoundEffects } from '../lib/audioService';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioUrl: string, durationSeconds: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  disabled = false,
  compact = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>([4, 6, 12, 8, 16, 22, 14, 8, 4]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage('');
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported mime type
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // chunk every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Setup audio analyzer for dynamic visualizer waves
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevels = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
            audioCtx.close();
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          const sliced = Array.from(dataArray.slice(0, 10)).map((val) => Math.max(4, Math.min(32, (val / 255) * 32)));
          setAudioLevels(sliced);
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };
        updateLevels();
      } catch {
        // Fallback to subtle random oscillation if analyzer not available
        const interval = window.setInterval(() => {
          setAudioLevels((prev) => prev.map(() => Math.floor(Math.random() * 20) + 6));
        }, 150);
        setTimeout(() => clearInterval(interval), 60000);
      }
    } catch (err: unknown) {
      console.error('Error starting recording:', err);
      const isPermissionDenied = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setErrorMessage(
        isPermissionDenied
          ? 'Microphone permission was denied. Please allow microphone access in your browser.'
          : 'Could not access microphone.'
      );
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    const finalDuration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      // Convert blob to base64 Data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        if (base64Audio) {
          SoundEffects.playSentSound();
          onSendVoiceNote(base64Audio, finalDuration);
        }
      };
      reader.readAsDataURL(audioBlob);

      // Stop tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.stop();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090D16] border border-rose-500/50 rounded-2xl animate-in fade-in shadow-lg shadow-rose-950/20 w-full">
        {/* Pulsing Recording Beacon */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-mono font-bold text-rose-400">{formatSeconds(recordingSeconds)}</span>
        </div>

        {/* Live Audio Visualizer Bars */}
        <div className="flex-1 flex items-center justify-center gap-1 h-6 px-2 overflow-hidden">
          {audioLevels.map((lvl, idx) => (
            <div
              key={idx}
              className="w-1 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full transition-all duration-75"
              style={{ height: `${lvl}px` }}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Discard Recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={stopAndSendRecording}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 transition-all cursor-pointer"
            title="Send Voice Note"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {errorMessage && (
        <div className="absolute bottom-full mb-2 left-0 right-0 p-2 bg-rose-950 border border-rose-500/40 text-rose-300 text-[11px] rounded-xl shadow-lg z-20 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="ml-auto text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className={`flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer ${
          compact
            ? 'p-2 bg-[#0E1526] hover:bg-emerald-950/50 border border-[#1E293B] hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300'
            : 'px-3 py-2 bg-[#0E1526] hover:bg-emerald-950/50 border border-[#1E293B] hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-xs font-semibold'
        }`}
        title="Record Voice Note (MediaRecorder)"
      >
        <Mic className="w-4 h-4" />
        {!compact && <span>Voice Note</span>}
      </button>
    </div>
  );
};

interface VoiceNotePlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  isSender?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  durationSeconds = 0,
  isSender = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate pseudo-waveform bars based on audioUrl hash
  const waveformBars = React.useMemo(() => {
    const barsCount = 20;
    const bars: number[] = [];
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) {
      seed = (seed + audioUrl.charCodeAt(i) * (i + 1)) % 1000;
    }
    for (let i = 0; i < barsCount; i++) {
      const height = Math.abs(Math.sin(seed + i * 0.8) * 16) + 6;
      bars.push(height);
    }
    return bars;
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Audio playback error:', e);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = Math.floor(sec % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl border transition-all ${
        isSender
          ? 'bg-emerald-950/40 border-emerald-500/30'
          : 'bg-[#0E1526] border-[#1E293B]'
      }`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause CTA */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
          isSender
            ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
        title={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform & Slider Container */}
      <div className="flex-1 min-w-[140px] max-w-[220px] space-y-1">
        {/* Waveform graphic */}
        <div className="flex items-center gap-[2px] h-5 px-1">
          {waveformBars.map((barHeight, idx) => {
            const barProgress = (idx / waveformBars.length) * 100;
            const isPassed = barProgress <= progressPercentage;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-colors ${
                  isPassed
                    ? isSender
                      ? 'bg-emerald-400'
                      : 'bg-blue-400'
                    : 'bg-slate-700/60'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>

        {/* Hidden scrubbable range */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-transparent cursor-pointer appearance-none accent-emerald-400"
        />

        {/* Duration & Speed */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{formatTime(currentTime > 0 ? currentTime : duration)}</span>
          <span className="flex items-center gap-1">
            <Mic className="w-2.5 h-2.5 text-emerald-400" />
            Voice Note
          </span>
        </div>
      </div>

      {/* Speed multiplier badge */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
        title="Change playback speed"
      >
        {playbackSpeed}x
      </button>
    </div>
  );
};
