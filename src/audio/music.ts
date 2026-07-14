// Background music: one continuous loop ("The Hollow Loop") across the whole
// game. It starts once on the first screen and keeps playing seamlessly through
// navigation — no per-screen restarts or crossfades.

import { audio } from './engine';

// Kept for call-site compatibility; the track no longer changes per mood.
export type Mood = 'title' | 'map' | 'combat' | 'boss';

const THEME = 'theme';

class MusicPlayer {
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private started = false;
  private wantPlaying = false;

  constructor() {
    audio.onUnlock = () => { if (this.wantPlaying) void this.start(); };
  }

  /** Ensure the background loop is playing. Mood is ignored (single track). */
  async play(_mood: Mood): Promise<void> {
    this.wantPlaying = true;
    if (!audio.isUnlocked) return; // will begin on unlock
    if (this.started) return;
    await this.start();
  }

  private async start(): Promise<void> {
    if (this.started || !audio.ctx) return;
    if (audio.ctx.state === 'suspended') {
      try { await audio.ctx.resume(); } catch { /* ignore */ }
    }
    const buf = await audio.load(THEME, 'mp3');
    if (!buf || !audio.ctx || this.started) return;
    this.started = true;

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
    gain.gain.linearRampToValueAtTime(1, now + 1.2); // gentle fade-in

    this.source = source;
    this.gain = gain;
  }

  /** No-op: the single background loop plays continuously across the game. */
  async sting(_name: 'victory' | 'defeat'): Promise<void> {
    // intentionally empty — the loop keeps playing through win/lose screens
  }

  currentMood(): Mood | null {
    return this.started ? 'title' : null;
  }

  get isPlaying(): boolean {
    return this.source !== null && this.gain !== null && this.started;
  }
}

export const music = new MusicPlayer();
