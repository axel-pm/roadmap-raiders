// The Roadmap: StS-style branching map rendered bottom-to-top with SVG edges.

import { h, clear } from '../dom';
import { bgLayer, artImg } from '../art';
import type { RunState } from '../../engine/run/run';
import { nextNodes } from '../../engine/run/run';
import type { MapNode } from '../../engine/map/generate';
import { MAP_ROWS } from '../../engine/map/generate';

const ROOM_ICONS: Record<string, string> = {
  monster: '👾',
  elite: '💀',
  event: '❓',
  shop: '🛒',
  rest: '☕',
  treasure: '🎁',
  boss: '🚩',
};

const ACT_NAMES: Record<number, string> = {
  1: 'Act 1 · Find PMF',
  2: 'Act 2 · Scale-Up',
  3: 'Act 3 · The IPO Road',
};

export interface MapScreenOpts {
  onPick: (node: MapNode) => void;
  onShowDeck: () => void;
  onSettings?: () => void;
}

export function renderMapScreen(root: HTMLElement, run: RunState, opts: MapScreenOpts): void {
  clear(root);
  const available = nextNodes(run);
  const isAvailable = (n: MapNode) =>
    available.some((a) => a.row === n.row && a.col === n.col);
  const isCurrent = (n: MapNode) =>
    run.position !== null && run.position.row === n.row && run.position.col === n.col;

  const hud = h('div', { class: 'hud' },
    h('span', { class: 'hud-hp' }, `❤️ ${run.hp}/${run.maxHp}`),
    h('span', { class: 'hud-budget' }, `💰 ${run.budget}`),
    h('span', { class: 'hud-spacer' }),
    h('span', { class: 'pile-btn', onTap: opts.onShowDeck }, `🃏 Deck: ${run.deck.length}`),
    h('span', { class: 'hud-floor' }, `${ACT_NAMES[run.act]}`),
    opts.onSettings ? h('span', { class: 'hud-gear', title: 'Settings', onTap: opts.onSettings }, '⚙') : null,
  );

  const relicBar = h('div', { class: 'relic-bar' },
    ...run.relics.map((id) => h('span', { class: 'relic-chip', data: { relic: id } }, relicEmoji(id))),
  );

  const grid = h('div', { class: 'map-grid' });
  const nodeEls = new Map<string, HTMLElement>();

  // boss row on top
  const bossEl = h('div', {
    class: `map-node boss${available.some((a) => a.row === MAP_ROWS) ? ' available' : ''}`,
    onTap: () => {
      if (available.some((a) => a.row === MAP_ROWS)) opts.onPick(run.map.boss);
    },
  }, artImg('nodes', 'boss', ROOM_ICONS.boss!, 'node-art'));
  nodeEls.set(`${MAP_ROWS}:${run.map.boss.col}`, bossEl);
  grid.appendChild(h('div', { class: 'map-row boss-row' }, bossEl));

  for (let row = MAP_ROWS - 1; row >= 0; row--) {
    const rowEl = h('div', { class: 'map-row' });
    for (let col = 0; col < 7; col++) {
      const node = run.map.rows[row]![col];
      if (!node) {
        rowEl.appendChild(h('div', { class: 'map-slot' }));
        continue;
      }
      const cls = [
        'map-node',
        node.type,
        isAvailable(node) ? 'available' : '',
        isCurrent(node) ? 'current' : '',
        run.position !== null && node.row <= run.position.row && !isCurrent(node) ? 'passed' : '',
      ].filter(Boolean).join(' ');
      const el = h('div', {
        class: cls,
        onTap: () => { if (isAvailable(node)) opts.onPick(node); },
      }, artImg('nodes', node.type, ROOM_ICONS[node.type]!, 'node-art'));
      nodeEls.set(`${row}:${col}`, el);
      rowEl.appendChild(h('div', { class: 'map-slot' }, el));
    }
    grid.appendChild(rowEl);
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('map-edges');

  const scroller = h('div', { class: 'map-scroll' });
  const wrap = h('div', { class: 'map-wrap' });
  wrap.appendChild(svg);
  wrap.appendChild(grid);
  scroller.appendChild(wrap);

  scroller.style.backgroundImage = bgLayer(`act${run.act}`, 0.82);
  scroller.classList.add('has-bg');
  root.appendChild(h('div', { class: 'map-screen' }, hud, relicBar, scroller));

  // draw edges once layout settles
  requestAnimationFrame(() => {
    const wrapRect = wrap.getBoundingClientRect();
    svg.setAttribute('width', String(wrap.scrollWidth));
    svg.setAttribute('height', String(wrap.scrollHeight));
    const center = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - wrapRect.left + r.width / 2,
        y: r.top - wrapRect.top + r.height / 2,
      };
    };
    const drawEdge = (from: HTMLElement, to: HTMLElement, active: boolean) => {
      const a = center(from);
      const b = center(to);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
      line.setAttribute('class', active ? 'edge active' : 'edge');
      svg.appendChild(line);
    };
    for (let row = 0; row < MAP_ROWS; row++) {
      for (const node of run.map.rows[row]!) {
        if (!node) continue;
        const from = nodeEls.get(`${row}:${node.col}`);
        if (!from) continue;
        const targets = row === MAP_ROWS - 1 ? [run.map.boss.col] : node.next;
        for (const col of targets) {
          const to = nodeEls.get(`${row + 1}:${col}`);
          if (to) drawEdge(from, to, isCurrent(node));
        }
      }
    }
    // scroll so the current position is visible near the bottom
    const focus = run.position
      ? nodeEls.get(`${run.position.row}:${run.position.col}`)
      : nodeEls.get('0:0') ?? null;
    (focus ?? bossEl).scrollIntoView({ block: run.position ? 'center' : 'end' });
  });
}

function relicEmoji(id: string): string {
  // lightweight lookup to avoid importing full relic defs here
  return RELIC_EMOJI[id] ?? '🔮';
}

import { RELICS_BY_ID } from '../../content/relics';
const RELIC_EMOJI: Record<string, string> = Object.fromEntries(
  Object.values(RELICS_BY_ID).map((r) => [r.id, r.emoji]),
);
