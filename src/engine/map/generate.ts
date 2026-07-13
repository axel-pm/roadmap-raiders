// StS-style layered-DAG map generation: N paths walk bottom-to-top over a
// column grid; crossing edges are swapped away; room types fill quotas with
// adjacency constraints. Rendered as a product roadmap.

import type { Rng } from '../../core/rng';
import type { RoomType } from '../types';

export const MAP_ROWS = 15;
export const MAP_COLS = 7;
const NUM_PATHS = 6;

export interface MapNode {
  row: number;
  col: number;
  type: RoomType;
  /** columns in the next row this node connects to */
  next: number[];
}

export interface GameMap {
  /** rows[0] = start row ... rows[MAP_ROWS-1] = pre-boss row */
  rows: (MapNode | null)[][];
  /** single boss node, conceptually row MAP_ROWS */
  boss: MapNode;
}

export function generateMap(rng: Rng, act: 1 | 2 | 3): GameMap {
  void act;
  // 1. walk paths
  const paths: number[][] = [];
  for (let p = 0; p < NUM_PATHS; p++) {
    let col = rng.int(0, MAP_COLS - 1);
    if (p === 1) {
      while (col === paths[0]![0]) col = rng.int(0, MAP_COLS - 1);
    }
    const path = [col];
    for (let row = 1; row < MAP_ROWS; row++) {
      col = Math.max(0, Math.min(MAP_COLS - 1, col + rng.int(-1, 1)));
      path.push(col);
    }
    paths.push(path);
  }

  // 2. un-cross edges row by row (swap destinations when two edges cross)
  for (let row = 0; row < MAP_ROWS - 1; row++) {
    let swapped = true;
    let guard = 0;
    while (swapped && guard++ < 50) {
      swapped = false;
      for (let i = 0; i < paths.length; i++) {
        for (let j = i + 1; j < paths.length; j++) {
          const a1 = paths[i]![row]!, a2 = paths[i]![row + 1]!;
          const b1 = paths[j]![row]!, b2 = paths[j]![row + 1]!;
          if ((a1 < b1 && a2 > b2) || (a1 > b1 && a2 < b2)) {
            paths[i]![row + 1] = b2;
            paths[j]![row + 1] = a2;
            swapped = true;
          }
        }
      }
    }
  }

  // 3. build node grid from path visits
  const rows: (MapNode | null)[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => null),
  );
  for (const path of paths) {
    for (let row = 0; row < MAP_ROWS; row++) {
      const col = path[row]!;
      rows[row]![col] ??= { row, col, type: 'monster', next: [] };
      if (row > 0) {
        const prev = rows[row - 1]![path[row - 1]!]!;
        if (!prev.next.includes(col)) prev.next.push(col);
      }
    }
  }
  for (const row of rows) {
    for (const node of row) node?.next.sort((a, b) => a - b);
  }

  // 4. assign room types
  const boss: MapNode = { row: MAP_ROWS, col: Math.floor(MAP_COLS / 2), type: 'boss', next: [] };
  for (const node of rows[MAP_ROWS - 1]!) {
    if (node) node.next = [boss.col];
  }

  const fixedRows: Record<number, RoomType> = {
    0: 'monster',
    8: 'treasure',
    [MAP_ROWS - 1]: 'rest',
  };

  for (let rowIdx = 0; rowIdx < MAP_ROWS; rowIdx++) {
    const fixed = fixedRows[rowIdx];
    for (const node of rows[rowIdx]!) {
      if (!node) continue;
      if (fixed) {
        node.type = fixed;
        continue;
      }
      node.type = pickRoomType(rng, rowIdx, node, rows);
    }
  }

  return { rows, boss };
}

const ROOM_WEIGHTS: readonly (readonly [RoomType, number])[] = [
  ['monster', 45],
  ['event', 22],
  ['rest', 12],
  ['elite', 8],
  ['shop', 5],
];

function pickRoomType(rng: Rng, rowIdx: number, node: MapNode, rows: (MapNode | null)[][]): RoomType {
  const parents: MapNode[] = [];
  if (rowIdx > 0) {
    for (const p of rows[rowIdx - 1]!) {
      if (p && p.next.includes(node.col)) parents.push(p);
    }
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const type = rng.weighted(ROOM_WEIGHTS);
    if (type === 'elite' && rowIdx < 5) continue;
    // avoid rest right before the forced pre-boss rest
    if (type === 'rest' && rowIdx >= MAP_ROWS - 2) continue;
    // no same special room twice in a row along a path
    if ((type === 'elite' || type === 'rest' || type === 'shop')
      && parents.some((p) => p.type === type)) continue;
    return type;
  }
  return 'monster';
}

/** nodes reachable from the current position (or all row-0 nodes at act start) */
export function availableNodes(map: GameMap, position: { row: number; col: number } | null): MapNode[] {
  if (position === null) {
    return map.rows[0]!.filter((n): n is MapNode => n !== null);
  }
  if (position.row >= MAP_ROWS) return [];
  if (position.row === MAP_ROWS - 1) return [map.boss];
  const current = map.rows[position.row]![position.col];
  if (!current) return [];
  return current.next
    .map((col) => map.rows[position.row + 1]![col])
    .filter((n): n is MapNode => n !== null);
}
