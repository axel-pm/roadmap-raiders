import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadMeta, saveMeta, defaultMeta, recordRun, saveRun, loadRun, hasSavedRun, clearRun,
} from '../../src/engine/meta/save';
import { newRun, nextNodes, moveTo } from '../../src/engine/run/run';

// minimal localStorage shim for node
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
  } as Storage;
});

describe('meta persistence', () => {
  it('round-trips meta state', () => {
    const meta = defaultMeta();
    meta.listenerXp = 450;
    saveMeta(meta);
    expect(loadMeta().listenerXp).toBe(450);
  });

  it('recordRun accumulates XP and unlocks guests in batches', () => {
    let meta = defaultMeta();
    expect(meta.guestsUnlocked).toBe(20);
    meta = recordRun(meta, { date: 'x', seed: 'S', ascension: 0, won: false, score: 650, floors: 12, act: 2 });
    // 650 XP → 2 batches of 5
    expect(meta.guestsUnlocked).toBe(30);
    expect(meta.stats.runs).toBe(1);
    expect(meta.stats.bestScore).toBe(650);
  });

  it('winning unlocks the next ascension', () => {
    let meta = defaultMeta();
    meta = recordRun(meta, { date: 'x', seed: 'S', ascension: 0, won: true, score: 900, floors: 48, act: 3 });
    expect(meta.maxAscensionReached).toBe(1);
    meta = recordRun(meta, { date: 'x', seed: 'S', ascension: 1, won: true, score: 900, floors: 48, act: 3 });
    expect(meta.maxAscensionReached).toBe(2);
  });

  it('guests cap at 60', () => {
    let meta = defaultMeta();
    meta = recordRun(meta, { date: 'x', seed: 'S', ascension: 0, won: true, score: 99999, floors: 48, act: 3 });
    expect(meta.guestsUnlocked).toBe(60);
  });
});

describe('run persistence', () => {
  it('round-trips a run including rng state', () => {
    const run = newRun('SAVE-1', 0);
    moveTo(run, nextNodes(run)[0]!);
    // burn some rng so states diverge from fresh
    run.rng.get('combat').next();
    run.rng.get('cardRewards').next();
    run.budget = 142;
    saveRun(run);
    expect(hasSavedRun()).toBe(true);

    const loaded = loadRun()!;
    expect(loaded.seed).toBe('SAVE-1');
    expect(loaded.budget).toBe(142);
    expect(loaded.position).toEqual(run.position);
    expect(loaded.deck.length).toBe(run.deck.length);
    // rng continues from the same point
    expect(loaded.rng.get('combat').next()).toBe(run.rng.get('combat').next());
    expect(JSON.stringify(loaded.map)).toBe(JSON.stringify(run.map));
  });

  it('clearRun removes the save', () => {
    saveRun(newRun('SAVE-2', 0));
    clearRun();
    expect(hasSavedRun()).toBe(false);
    expect(loadRun()).toBeNull();
  });

  it('rejects saves from a different version', () => {
    saveRun(newRun('SAVE-3', 0));
    const raw = JSON.parse(store.get('rr.run.v1')!);
    raw.version = 999;
    store.set('rr.run.v1', JSON.stringify(raw));
    expect(loadRun()).toBeNull();
    expect(hasSavedRun()).toBe(false);
  });
});
