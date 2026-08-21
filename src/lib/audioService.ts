/**
 * Web Audio API Sound Synthesizer & Audio Recording Utilities
 * Provides realistic ringtones, call sound effects, and MediaRecorder utilities
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;
  private ringtoneNodes: OscillatorNode[] = [];

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx && AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a pleasant chime when call connects
   */
  playCallConnected() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Plays a call ended beep tone
   */
  playCallEnded() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [440, 330].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.15, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.22);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Plays a subtle pop when sending voice note
   */
  playSentSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignored
    }
  }

  /**
   * Plays a cheerful chord when a player is approved / joins
   */
  playJoin() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.1, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } catch {
      // Ignored
    }
  }

  /**
   * Plays a triumphant fanfare when all pending are approved or match wins
   */
  playVictory() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.12, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.4);
      });
    } catch {
      // Ignored
    }
  }

  /**
   * Starts repeating realistic outgoing ringback tone (Dual Tone 440Hz + 480Hz)
   */
  startOutgoingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playPulse = () => {
      try {
        const now = ctx.currentTime;
        [440, 480].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.setValueAtTime(0.08, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.35);
          this.ringtoneNodes.push(osc);
        });
      } catch {
        // Ignored
      }
    };

    playPulse();
    this.ringtoneInterval = window.setInterval(playPulse, 3200);
  }

  /**
   * Starts repeating melodic incoming ringtone
   */
  startIncomingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playMelody = () => {
      try {
        const now = ctx.currentTime;
        const melody = [
          { f: 587.33, t: 0.0 }, // D5
          { f: 659.25, t: 0.18 }, // E5
          { f: 880.00, t: 0.36 }, // A5
          { f: 783.99, t: 0.54 }, // G5
          { f: 659.25, t: 0.72 }, // E5
          { f: 880.00, t: 0.90 }, // A5
        ];

        melody.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, now + note.t);

          gain.gain.setValueAtTime(0, now + note.t);
          gain.gain.linearRampToValueAtTime(0.14, now + note.t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + note.t);
          osc.stop(now + note.t + 0.25);
          this.ringtoneNodes.push(osc);
        });
      } catch {
        // Ignored
      }
    };

    playMelody();
    this.ringtoneInterval = window.setInterval(playMelody, 2600);
  }

  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    this.ringtoneNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Already stopped
      }
    });
    this.ringtoneNodes = [];
  }
}

export const SoundEffects = new SoundEffectsService();
