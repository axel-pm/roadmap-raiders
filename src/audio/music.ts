// Mood-based music player: seamless looping tracks with equal-power crossfades.

import { audio } from './engine';

export type Mood = 'title' | 'map' | 'combat' | 'boss';

interface Layer {
  source: AudioBufferSourceNode;
  gain: GainNode;
  mood: Mood;
}

class MusicPlayer {
  private current: Layer | null = null;
  private desired: Mood | null = null;
  private crossfadeSec = 1.5;

  constructor() {
    // start desired mood once audio unlocks
    audio.onUnlock = () => {
      if (this.desired) void this.play(this.desired);
    };
  }

  /** Request a mood. Loads lazily, crossfades from the current one. */
  async play(mood: Mood): Promise<void> {
    this.desired = mood;
    if (!audio.isUnlocked) return; // will start on unlock
    if (this.current?.mood === mood) return;

    const buf = await audio.load(mood);
    if (!buf || !audio.ctx) return;
    // guard: desired may have changed while loading
    if (this.desired !== mood) return;
    if (this.current?.mood === mood) return;

    const ctx = audio.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(audio.musicBus);
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(gain);
    source.start();

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + this.crossfadeSec);

    const prev = this.current;
    if (prev) {
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0, now + this.crossfadeSec);
      const toStop = prev.source;
      setTimeout(() => { try { toStop.stop(); } catch { /* already stopped */ } }, (this.crossfadeSec + 0.2) * 1000);
    }
    this.current = { source, gain, mood };
  }

  /** One-shot sting layered over whatever is playing (or silence). */
  async sting(name: 'victory' | 'defeat'): Promise<void> {
    if (!audio.isUnlocked || !audio.ctx) return;
    const buf = await audio.load(name);
    if (!buf) return;
    // duck music briefly
    const prev = this.current;
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    if (prev) {
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
    }
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(audio.musicBus);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g);
    src.start();
  }

  currentMood(): Mood | null {
    return this.current?.mood ?? null;
  }
}

export const music = new MusicPlayer();
