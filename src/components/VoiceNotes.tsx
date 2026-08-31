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
import { useLanguage } from '../lib/useLanguage';

interface VoiceNoteRecorderProps {
  onSendVoiceNote?: (audioUrl: string, durationSeconds: number) => void;
  onSendAudio?: (audioUrl: string, durationSeconds: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onSendAudio,
  disabled = false,
  compact = false,
}) => {
  const { language } = useLanguage();
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
      setErrorMessage(
        language === 'ar'
          ? 'التسجيل الصوتي غير مدعوم في هذا المتصفح.'
          : 'Audio recording is not supported in this browser.'
      );
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
          ? (language === 'ar' ? 'تم رفض إذن الميكروفون. يرجى السماح بالوصول في إعدادات المتصفح.' : 'Microphone permission was denied. Please allow microphone access in your browser.')
          : (language === 'ar' ? 'تعذر الوصول إلى الميكروفون.' : 'Could not access microphone.')
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

    mediaRecorderRef.current.onstop = async () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      // Clean stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      audioChunksRef.current = [];

      try {
        const { mediaStorage } = await import('../lib/mediaStorage');
        const uploadRes = await mediaStorage.uploadAudio(audioBlob);
        const finalAudioUrl = (uploadRes.success && uploadRes.audioUrl) ? uploadRes.audioUrl : null;

        if (finalAudioUrl) {
          SoundEffects.playSentSound();
          if (onSendVoiceNote) {
            onSendVoiceNote(finalAudioUrl, finalDuration);
          } else if (onSendAudio) {
            onSendAudio(finalAudioUrl, finalDuration);
          }
        } else {
          // Fallback to data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            if (base64Audio) {
              SoundEffects.playSentSound();
              if (onSendVoiceNote) {
                onSendVoiceNote(base64Audio, finalDuration);
              } else if (onSendAudio) {
                onSendAudio(base64Audio, finalDuration);
              }
            }
          };
          reader.readAsDataURL(audioBlob);
        }
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string) || '';
          if (base64Audio) {
            SoundEffects.playSentSound();
            if (onSendVoiceNote) {
              onSendVoiceNote(base64Audio, finalDuration);
            } else if (onSendAudio) {
              onSendAudio(base64Audio, finalDuration);
            }
          }
        };
        reader.readAsDataURL(audioBlob);
      }
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
            title={language === 'ar' ? 'إلغاء التسجيل' : 'Discard Recording'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={stopAndSendRecording}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 text-xs font-bold shadow-md shadow-amber-950 transition-all cursor-pointer"
            title={language === 'ar' ? 'إرسال التسجيل' : 'Send Voice Note'}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'إرسال' : 'Send'}</span>
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
            ? 'p-2 bg-[#080B10] hover:bg-[#241A0B] border border-[#E5B869]/20 hover:border-[#E5B869]/60 text-[#F5D794]'
            : 'px-3 py-2 bg-[#080B10] hover:bg-[#241A0B] border border-[#E5B869]/20 hover:border-[#E5B869]/60 text-[#F5D794] text-xs font-semibold'
        }`}
        title={language === 'ar' ? 'تسجيل رسالة صوتية' : 'Record Voice Note'}
      >
        <Mic className="w-4 h-4 text-[#E5B869]" />
        {!compact && <span>{language === 'ar' ? 'رسالة صوتية' : 'Voice Note'}</span>}
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
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

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
          ? 'bg-[#241A0B]/80 border-[#E5B869]/40'
          : 'bg-[#141A26] border-[#E5B869]/20'
      }`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause CTA */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
          isSender
            ? 'bg-gradient-to-br from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950'
            : 'bg-gradient-to-br from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950'
        }`}
        title={isPlaying ? (language === 'ar' ? 'إيقاف مؤقت' : 'Pause voice message') : (language === 'ar' ? 'تشغيل الرسالة الصوتية' : 'Play voice message')}
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
                    ? 'bg-[#E5B869]'
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
          className="w-full h-1 bg-transparent cursor-pointer appearance-none accent-[#E5B869]"
        />

        {/* Duration & Speed */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{formatTime(currentTime > 0 ? currentTime : duration)}</span>
          <span className="flex items-center gap-1">
            <Mic className="w-2.5 h-2.5 text-[#E5B869]" />
            <span className="text-[#F5D794]">{language === 'ar' ? 'صوتية' : 'Voice'}</span>
          </span>
        </div>
      </div>

      {/* Speed multiplier badge */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="px-1.5 py-0.5 rounded-lg bg-[#080B10] hover:bg-[#141A26] border border-[#E5B869]/20 text-[#F5D794] text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
        title={language === 'ar' ? 'تغيير سرعة التشغيل' : 'Change playback speed'}
      >
        {playbackSpeed}x
      </button>
    </div>
  );
};

