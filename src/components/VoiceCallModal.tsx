import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Shield,
  Sparkles,
  User,
  Radio,
  Clock,
  Maximize2
} from 'lucide-react';
import { ActiveVoiceCall, UserProfile } from '../types';
import { SoundEffects } from '../lib/audioService';

interface VoiceCallModalProps {
  activeCall: ActiveVoiceCall | null;
  currentUser: UserProfile;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  activeCall,
  currentUser,
  onAcceptCall,
  onRejectCall,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [voiceLevels, setVoiceLevels] = useState<number[]>([10, 16, 24, 18, 30, 22, 14, 8]);

  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  if (!activeCall || activeCall.status === 'idle') {
    return null;
  }

  const isCaller = activeCall.callerId === currentUser.id;
  const isIncoming = activeCall.status === 'incoming' && !isCaller;
  const isOutgoing = activeCall.status === 'outgoing' && isCaller;
  const isConnected = activeCall.status === 'connected';
  const isEnded = activeCall.status === 'ended';

  const otherUserName = isCaller ? activeCall.receiverName : activeCall.callerName;
  const otherUserAvatar = isCaller ? activeCall.receiverAvatar : activeCall.callerAvatar;

  // Sound and Ringtones management
  useEffect(() => {
    if (isOutgoing) {
      SoundEffects.startOutgoingRingtone();
    } else if (isIncoming) {
      SoundEffects.startIncomingRingtone();
    } else if (isConnected) {
      SoundEffects.stopRingtone();
      SoundEffects.playCallConnected();
    } else if (isEnded) {
      SoundEffects.stopRingtone();
      SoundEffects.playCallEnded();
    }

    return () => {
      SoundEffects.stopRingtone();
    };
  }, [activeCall.status, isOutgoing, isIncoming, isConnected, isEnded]);

  // Call timer management
  useEffect(() => {
    if (isConnected) {
      setCallDuration(0);
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Start Microphone stream for live voice visualization
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
          micStreamRef.current = stream;
          try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const renderVisualizer = () => {
              if (!analyserRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              const bars = Array.from(dataArray.slice(0, 8)).map((val) =>
                Math.max(6, Math.min(36, (val / 255) * 36))
              );
              setVoiceLevels(bars);
              animationFrameRef.current = requestAnimationFrame(renderVisualizer);
            };
            renderVisualizer();
          } catch {
            // Simulated voice wave if context fails
          }
        })
        .catch(() => {
          // Microphone error or blocked
        });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isConnected]);

  // Handle Mute toggle
  const toggleMute = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // toggling from muted -> unmuted
      });
    }
    setIsMuted(!isMuted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in">
      <div
        id="voice-call-card"
        className="w-full max-w-sm bg-gradient-to-b from-[#0E1526] via-[#090D16] to-[#040711] border border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center justify-between min-h-[460px] text-white relative overflow-hidden"
      >
        {/* Top Header / Security Badge */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End Encrypted</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>PitchMate Voice</span>
          </div>
        </div>

        {/* Center: User Avatar & Status */}
        <div className="flex flex-col items-center text-center space-y-4 my-auto">
          {/* Avatar with Pulsing Radar Effect during Call */}
          <div className="relative">
            {(isOutgoing || isIncoming) && (
              <>
                <div className="absolute inset-0 -m-3 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="absolute inset-0 -m-6 rounded-full bg-emerald-500/10 animate-pulse" />
              </>
            )}

            {isConnected && (
              <div className="absolute inset-0 -m-2 rounded-full border-2 border-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            )}

            <img
              src={otherUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
              alt={otherUserName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-emerald-500 shadow-2xl relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* User Name & Status */}
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black font-display text-white">{otherUserName}</h3>
            <p className="text-xs sm:text-sm font-medium text-slate-400">
              {isOutgoing && 'Calling...'}
              {isIncoming && 'Incoming Voice Call...'}
              {isConnected && (
                <span className="text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {formatDuration(callDuration)}
                </span>
              )}
              {isEnded && 'Call Ended'}
            </p>
          </div>

          {/* Dynamic Audio Visualizer wave during active call */}
          {isConnected && (
            <div className="flex items-center justify-center gap-1.5 h-10 px-4 py-2 bg-[#090D16]/80 rounded-2xl border border-emerald-500/20">
              {voiceLevels.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full transition-all duration-75"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="w-full pt-4">
          {/* Outgoing or Connected Call Controls */}
          {(isOutgoing || isConnected) && (
            <div className="flex items-center justify-center gap-6">
              {isConnected && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition-all cursor-pointer shadow-lg ${
                    isMuted
                      ? 'bg-rose-950/80 border border-rose-500 text-rose-300'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                id="end-call-btn"
                type="button"
                onClick={onEndCall}
                className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {isConnected && (
                <button
                  type="button"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`p-4 rounded-full transition-all cursor-pointer shadow-lg ${
                    !isSpeakerOn
                      ? 'bg-slate-800/80 text-slate-500'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Speaker Output"
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </button>
              )}
            </div>
          )}

          {/* Incoming Call: Accept (Green) and Decline (Red) Controls */}
          {isIncoming && (
            <div className="flex items-center justify-around w-full px-4">
              {/* Decline Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  id="decline-call-btn"
                  type="button"
                  onClick={onRejectCall}
                  className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Decline Call"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-xs font-semibold text-rose-300">Decline</span>
              </div>

              {/* Accept Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  id="accept-call-btn"
                  type="button"
                  onClick={onAcceptCall}
                  className="p-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-xl shadow-emerald-950/50 hover:scale-105 active:scale-95 animate-bounce transition-all cursor-pointer"
                  title="Accept Voice Call"
                >
                  <Phone className="w-7 h-7 fill-current" />
                </button>
                <span className="text-xs font-semibold text-emerald-300">Accept</span>
              </div>
            </div>
          )}

          {/* Ended status */}
          {isEnded && (
            <div className="text-center text-xs text-slate-400">
              <span>Voice session closed.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
