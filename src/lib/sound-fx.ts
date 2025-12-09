import { useAudioStore } from '@/lib/audio-store';
class SoundManager {
  private ctx: AudioContext | null = null;
  constructor() {
    // Initialize lazily to respect autoplay policies
  }
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.error("Web Audio API not supported", e);
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(console.error);
    }
    return this.ctx;
  }
  public playSfx(type: 'correct' | 'wrong' | 'click' | 'win' | 'lose' | 'tick' | 'streak' | 'emote' | 'match_found' | 'purchase' | 'double_points') {
    const { masterVolume, sfxVolume } = useAudioStore.getState();
    const effectiveVolume = masterVolume * sfxVolume;
    if (effectiveVolume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (type) {
      case 'click':
        this.playTone(ctx, 2000, 'sine', t, 0.05, 0.1 * effectiveVolume);
        break;
      case 'correct':
        this.playTone(ctx, 880, 'sine', t, 0.1, 0.1 * effectiveVolume);
        this.playTone(ctx, 1760, 'sine', t + 0.1, 0.2, 0.1 * effectiveVolume);
        break;
      case 'wrong':
        this.playTone(ctx, 150, 'sawtooth', t, 0.3, 0.2 * effectiveVolume);
        this.playTone(ctx, 100, 'sawtooth', t + 0.1, 0.3, 0.2 * effectiveVolume);
        break;
      case 'win':
        // C Major Arpeggio
        this.playTone(ctx, 523.25, 'triangle', t, 0.1, 0.2 * effectiveVolume); // C5
        this.playTone(ctx, 659.25, 'triangle', t + 0.1, 0.1, 0.2 * effectiveVolume); // E5
        this.playTone(ctx, 783.99, 'triangle', t + 0.2, 0.1, 0.2 * effectiveVolume); // G5
        this.playTone(ctx, 1046.50, 'triangle', t + 0.3, 0.4, 0.2 * effectiveVolume); // C6
        break;
      case 'lose':
        // Dissonant descending
        this.playTone(ctx, 400, 'sawtooth', t, 0.3, 0.2 * effectiveVolume);
        this.playTone(ctx, 300, 'sawtooth', t + 0.2, 0.3, 0.2 * effectiveVolume);
        this.playTone(ctx, 200, 'sawtooth', t + 0.4, 0.6, 0.2 * effectiveVolume);
        break;
      case 'tick': {
        // Woodblock-style tick (short, high pitch)
        this.playTone(ctx, 800, 'sine', t, 0.05, 0.3 * effectiveVolume);
        break;
      }
      case 'streak': {
        // Ascending slide for momentum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
        gain.gain.setValueAtTime(0.2 * effectiveVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      }
      case 'emote': {
        // Playful pop: rapid pitch slide up
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        gain.gain.setValueAtTime(0.2 * effectiveVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }
      case 'match_found': {
        // Energetic chime: Major triad with sparkle
        this.playTone(ctx, 523.25, 'sine', t, 0.6, 0.2 * effectiveVolume); // C5
        this.playTone(ctx, 659.25, 'sine', t + 0.1, 0.6, 0.2 * effectiveVolume); // E5
        this.playTone(ctx, 783.99, 'sine', t + 0.2, 1.0, 0.2 * effectiveVolume); // G5
        this.playTone(ctx, 1046.50, 'sine', t + 0.3, 1.2, 0.15 * effectiveVolume); // C6
        break;
      }
      case 'purchase': {
        // High-pitched coin sound (Cha-ching!)
        this.playTone(ctx, 1200, 'sine', t, 0.1, 0.2 * effectiveVolume);
        this.playTone(ctx, 1600, 'sine', t + 0.05, 0.3, 0.2 * effectiveVolume);
        break;
      }
      case 'double_points': {
        // Rapid ascending arpeggio (Power Up)
        this.playTone(ctx, 523.25, 'triangle', t, 0.1, 0.2 * effectiveVolume); // C5
        this.playTone(ctx, 659.25, 'triangle', t + 0.08, 0.1, 0.2 * effectiveVolume); // E5
        this.playTone(ctx, 783.99, 'triangle', t + 0.16, 0.1, 0.2 * effectiveVolume); // G5
        this.playTone(ctx, 1046.50, 'triangle', t + 0.24, 0.4, 0.2 * effectiveVolume); // C6
        break;
      }
    }
  }
  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
export const soundManager = new SoundManager();
export const playSfx = (type: 'correct' | 'wrong' | 'click' | 'win' | 'lose' | 'tick' | 'streak' | 'emote' | 'match_found' | 'purchase' | 'double_points') => soundManager.playSfx(type);