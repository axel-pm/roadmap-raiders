// localStorage persistence: meta progress (rr.meta.v1) + current run (rr.run.v1).
// Run saves happen at node entry and map return; resuming mid-combat restarts
// that combat from the node entry (rng states make it the exact same fight).

import { RngBundle } from '../../core/rng';
import type { RngState } from '../../core/rng';
import type { RunState } from '../run/run';
import type { GameMap } from '../map/generate';
import type { CardInstance } from '../types';

const META_KEY = 'rr.meta.v1';
const RUN_KEY = 'rr.run.v1';
const META_VERSION = 1;
const RUN_VERSION = 1;

export interface RunRecord {
  date: string;
  seed: string;
  ascension: number;
  won: boolean;
  score: number;
  floors: number;
  act: number;
}

export interface MetaState {
  version: number;
  listenerXp: number;
  guestsUnlocked: number; // count, unlocked in views-rank order
  maxAscensionReached: number;
  runHistory: RunRecord[];
  stats: { runs: number; wins: number; bestScore: number };
}

export const STARTING_GUESTS_UNLOCKED = 20;
export const XP_PER_UNLOCK_BATCH = 300;
export const GUESTS_PER_BATCH = 5;
export const TOTAL_GUESTS = 60;

export function defaultMeta(): MetaState {
  return {
    version: META_VERSION,
    listenerXp: 0,
    guestsUnlocked: STARTING_GUESTS_UNLOCKED,
    maxAscensionReached: 0,
    runHistory: [],
    stats: { runs: 0, wins: 0, bestScore: 0 },
  };
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* private mode */ }
}

export function loadMeta(): MetaState {
  const raw = storageGet(META_KEY);
  if (!raw) return defaultMeta();
  try {
    const parsed = JSON.parse(raw) as MetaState;
    if (parsed.version !== META_VERSION) return defaultMeta();
    return { ...defaultMeta(), ...parsed };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  storageSet(META_KEY, JSON.stringify(meta));
}

/** apply a finished run: XP, unlocks, history, ascension ladder */
export function recordRun(meta: MetaState, record: RunRecord): MetaState {
  meta.listenerXp += record.score;
  meta.guestsUnlocked = Math.min(
    TOTAL_GUESTS,
    STARTING_GUESTS_UNLOCKED + Math.floor(meta.listenerXp / XP_PER_UNLOCK_BATCH) * GUESTS_PER_BATCH,
  );
  meta.runHistory.unshift(record);
  meta.runHistory = meta.runHistory.slice(0, 20);
  meta.stats.runs++;
  if (record.won) {
    meta.stats.wins++;
    if (record.ascension >= meta.maxAscensionReached) {
      meta.maxAscensionReached = Math.min(10, record.ascension + 1);
    }
  }
  meta.stats.bestScore = Math.max(meta.stats.bestScore, record.score);
  saveMeta(meta);
  return meta;
}

// --- run serialization ---

interface SerializedRun {
  version: number;
  seed: string;
  ascension: number;
  act: 1 | 2 | 3;
  map: GameMap;
  position: { row: number; col: number } | null;
  hp: number;
  maxHp: number;
  budget: number;
  deck: CardInstance[];
  relics: string[];
  coffees: string[];
  coffeeSlots: number;
  floorsClimbed: number;
  monstersDefeated: number;
  elitesDefeated: number;
  bossesDefeated: number;
  removalCost: number;
  lastEncounterId: string | null;
  seenEventIds: string[];
  unlockedGuestIds: string[];
  rngStates: Record<string, RngState>;
}

export function saveRun(run: RunState): void {
  const data: SerializedRun = {
    version: RUN_VERSION,
    seed: run.seed,
    ascension: run.ascension,
    act: run.act,
    map: run.map,
    position: run.position,
    hp: run.hp,
    maxHp: run.maxHp,
    budget: run.budget,
    deck: run.deck,
    relics: run.relics,
    coffees: run.coffees,
    coffeeSlots: run.coffeeSlots,
    floorsClimbed: run.floorsClimbed,
    monstersDefeated: run.monstersDefeated,
    elitesDefeated: run.elitesDefeated,
    bossesDefeated: run.bossesDefeated,
    removalCost: run.removalCost,
    lastEncounterId: run.lastEncounterId,
    seenEventIds: run.seenEventIds,
    unlockedGuestIds: run.unlockedGuestIds,
    rngStates: run.rng.getStates(),
  };
  storageSet(RUN_KEY, JSON.stringify(data));
}

export function loadRun(): RunState | null {
  const raw = storageGet(RUN_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SerializedRun;
    if (data.version !== RUN_VERSION) {
      storageRemove(RUN_KEY);
      return null;
    }
    const { version, rngStates, ...rest } = data;
    void version;
    return { ...rest, rng: RngBundle.fromStates(rngStates) };
  } catch {
    storageRemove(RUN_KEY);
    return null;
  }
}

export function hasSavedRun(): boolean {
  return storageGet(RUN_KEY) !== null;
}

export function clearRun(): void {
  storageRemove(RUN_KEY);
}
