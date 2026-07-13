// Seeded, serializable PRNG. sfc32 core, xmur3 seed hashing, named streams
// so map/rewards/combat rolls never perturb each other (save-resume safety).

export type RngStreamName =
  | 'map'
  | 'cardRewards'
  | 'relics'
  | 'events'
  | 'shop'
  | 'combat'
  | 'enemyHp'
  | 'misc';

export const RNG_STREAMS: RngStreamName[] = [
  'map', 'cardRewards', 'relics', 'events', 'shop', 'combat', 'enemyHp', 'misc',
];

export type RngState = [number, number, number, number];

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(state: RngState) {
    [this.a, this.b, this.c, this.d] = state;
  }

  static fromSeed(seed: string): Rng {
    const gen = xmur3(seed);
    const rng = new Rng([gen(), gen(), gen(), gen()]);
    for (let i = 0; i < 12; i++) rng.next(); // warm up
    return rng;
  }

  getState(): RngState {
    return [this.a, this.b, this.c, this.d];
  }

  /** float in [0, 1) */
  next(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick on empty array');
    return arr[this.int(0, arr.length - 1)]!;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Fisher-Yates shuffle (returns a new array) */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }

  /** weighted pick: entries of [item, weight] */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = this.next() * total;
    for (const [item, w] of entries) {
      roll -= w;
      if (roll < 0) return item;
    }
    return entries[entries.length - 1]![0];
  }
}

/** A bundle of independent named streams, all derived from one run seed. */
export class RngBundle {
  private streams = new Map<RngStreamName, Rng>();

  private constructor() {}

  static fromSeed(seed: string): RngBundle {
    const b = new RngBundle();
    for (const name of RNG_STREAMS) {
      b.streams.set(name, Rng.fromSeed(`${seed}::${name}`));
    }
    return b;
  }

  static fromStates(states: Record<string, RngState>): RngBundle {
    const b = new RngBundle();
    for (const name of RNG_STREAMS) {
      const st = states[name];
      b.streams.set(name, st ? new Rng(st) : Rng.fromSeed(`recover::${name}`));
    }
    return b;
  }

  get(name: RngStreamName): Rng {
    return this.streams.get(name)!;
  }

  getStates(): Record<RngStreamName, RngState> {
    const out = {} as Record<RngStreamName, RngState>;
    for (const [name, rng] of this.streams) out[name] = rng.getState();
    return out;
  }
}

/** Random human-friendly seed for new runs (uses Math.random — pre-run only). */
export function randomSeedString(): string {
  const words = ['SHIP', 'PIVOT', 'SCOPE', 'SPRINT', 'LAUNCH', 'RETRO', 'ROADMAP', 'BACKLOG', 'MVP', 'NORTH', 'GROWTH', 'CHURN', 'OKR', 'DEMO'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${w}-${n}`;
}
