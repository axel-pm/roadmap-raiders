import { describe, it, expect } from 'vitest';
import { generateMap, MAP_ROWS } from '../../src/engine/map/generate';
import { Rng } from '../../src/core/rng';
import { newRun, nextNodes, moveTo, rollCardReward, generateShop } from '../../src/engine/run/run';

describe('map generation', () => {
  it('is deterministic for a given seed', () => {
    const a = generateMap(Rng.fromSeed('MAP-1'), 1);
    const b = generateMap(Rng.fromSeed('MAP-1'), 1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('every node has a path to the boss', () => {
    for (const seed of ['A', 'B', 'C', 'D', 'E']) {
      const map = generateMap(Rng.fromSeed(seed), 1);
      for (let row = 0; row < MAP_ROWS - 1; row++) {
        for (const node of map.rows[row]!) {
          if (!node) continue;
          expect(node.next.length, `${seed} r${row}c${node.col}`).toBeGreaterThan(0);
          for (const col of node.next) {
            expect(map.rows[row + 1]![col], `${seed} r${row}c${node.col}->c${col}`).not.toBeNull();
          }
        }
      }
      // pre-boss row all connect to boss
      for (const node of map.rows[MAP_ROWS - 1]!) {
        if (node) expect(node.next).toEqual([map.boss.col]);
      }
    }
  });

  it('respects fixed rows and constraints', () => {
    for (const seed of ['X', 'Y', 'Z']) {
      const map = generateMap(Rng.fromSeed(seed), 1);
      for (const node of map.rows[0]!) if (node) expect(node.type).toBe('monster');
      for (const node of map.rows[8]!) if (node) expect(node.type).toBe('treasure');
      for (const node of map.rows[MAP_ROWS - 1]!) if (node) expect(node.type).toBe('rest');
      for (let row = 0; row < 5; row++) {
        for (const node of map.rows[row]!) {
          if (node) expect(node.type).not.toBe('elite');
        }
      }
    }
  });

  it('edges never cross', () => {
    for (const seed of ['P', 'Q', 'R', 'S']) {
      const map = generateMap(Rng.fromSeed(seed), 1);
      for (let row = 0; row < MAP_ROWS - 1; row++) {
        const edges: [number, number][] = [];
        for (const node of map.rows[row]!) {
          if (!node) continue;
          for (const col of node.next) edges.push([node.col, col]);
        }
        for (const [a1, a2] of edges) {
          for (const [b1, b2] of edges) {
            const crosses = (a1 < b1 && a2 > b2) || (a1 > b1 && a2 < b2);
            expect(crosses, `${seed} row ${row}: ${a1}->${a2} x ${b1}->${b2}`).toBe(false);
          }
        }
      }
    }
  });
});

describe('run state', () => {
  it('starts with a 10-card starter deck and full hp', () => {
    const run = newRun('RUN-1', 0);
    expect(run.deck.length).toBe(10);
    expect(run.hp).toBe(70);
    expect(nextNodes(run).length).toBeGreaterThan(0);
    expect(nextNodes(run).every((n) => n.type === 'monster')).toBe(true);
  });

  it('moving advances position and floor count', () => {
    const run = newRun('RUN-2', 0);
    const first = nextNodes(run)[0]!;
    moveTo(run, first);
    expect(run.floorsClimbed).toBe(1);
    const second = nextNodes(run);
    expect(second.every((n) => n.row === 1)).toBe(true);
  });

  it('card rewards offer 3 distinct cards', () => {
    const run = newRun('RUN-3', 0);
    for (let i = 0; i < 20; i++) {
      const reward = rollCardReward(run, 'normal');
      expect(reward.length).toBe(3);
      expect(new Set(reward.map((r) => r.id)).size).toBe(3);
    }
  });

  it('boss rewards are all rare', () => {
    const run = newRun('RUN-4', 0);
    const reward = rollCardReward(run, 'boss');
    expect(reward.every((r) => r.rarity === 'rare')).toBe(true);
  });

  it('shop stocks 5 cards, up to 2 relics, and a guest', () => {
    const run = newRun('RUN-5', 0);
    const shop = generateShop(run);
    expect(shop.cards.length).toBe(5);
    expect(shop.relics.length).toBe(2);
    expect(shop.guest).not.toBeNull();
    expect(shop.removalPrice).toBe(75);
  });
});
