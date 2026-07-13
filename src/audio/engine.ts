// Audio engine: one AudioContext, master/music/sfx buses, gesture unlock,
// lazy buffer loading, persisted settings. All playback goes through here.

export interface AudioSettings {
  musicOn: boolean;
  sfxOn: boolean;
  musicVol: number; // 0..1
  sfxVol: number;
}

const SETTINGS_KEY = 'rr.audio.v1';

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { musicOn: true, sfxOn: true, musicVol: 0.7, sfxVol: 0.8, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { musicOn: true, sfxOn: true, musicVol: 0.7, sfxVol: 0.8 };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  settings: AudioSettings = loadSettings();
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private unlocked = false;
  private base = import.meta.env.BASE_URL;

  /** Install the one-time gesture unlock. Safe to call at boot. */
  installUnlock(): void {
    if (this.unlocked) return;
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      this.onUnlock?.();
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  /** called once audio is unlocked (music layer hooks this to start) */
  onUnlock: (() => void) | null = null;

  get isUnlocked(): boolean {
    return this.unlocked && this.ctx?.state === 'running';
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.settings.musicOn ? this.settings.musicVol : 0;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfxOn ? this.settings.sfxVol : 0;
    this.sfxBus.connect(this.master);
  }

  async load(name: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) return this.buffers.get(name)!;
    if (this.loading.has(name)) return this.loading.get(name)!;
    this.ensureContext();
    const p = (async () => {
      try {
        const res = await fetch(`${this.base}audio/${name}.m4a`);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const buf = await this.ctx!.decodeAudioData(arr);
        this.buffers.set(name, buf);
        return buf;
      } catch {
        return null;
      }
    })();
    this.loading.set(name, p);
    return p;
  }

  save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch { /* ignore */ }
  }

  setMusicOn(on: boolean): void {
    this.settings.musicOn = on;
    if (this.musicBus) this.rampBus(this.musicBus, on ? this.settings.musicVol : 0);
    this.save();
  }

  setSfxOn(on: boolean): void {
    this.settings.sfxOn = on;
    if (this.sfxBus) this.sfxBus.gain.value = on ? this.settings.sfxVol : 0;
    this.save();
  }

  private rampBus(bus: GainNode, target: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(target, now + 0.3);
  }
}

export const audio = new AudioEngine();
