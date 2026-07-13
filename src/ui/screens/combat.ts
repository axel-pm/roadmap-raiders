// Combat screen: renders CombatState, handles card play + targeting + choices,
// and drives the animation/audio timeline (card flight, hits, lunges, SFX).

import { h, clear, addTapAndHold } from '../dom';
import { artImg, bgLayer } from '../art';
import { cardElFromInstance, cardDefOf } from '../components/cardEl';
import type { CombatEngine } from '../../engine/combat/engine';
import type { EnemyState } from '../../engine/combat/state';
import type { CardInstance } from '../../engine/types';
import { STATUSES, KEYWORD_TEXT } from '../../content/keywords';
import { ENEMIES_BY_ID } from '../../content';
import { COFFEES_BY_ID } from '../../content/coffee';
import {
  flyClone, shake, screenShake, flash, lunge, dissolve, banner, floatNumber, motionOK, wait,
} from '../fx';
import { sfx } from '../../audio/sfx';
import { showTooltip } from '../tooltip';
import { showInspect } from '../inspect';

type Impact =
  | { t: 'damage'; side: 'player' | 'enemy'; uid: number; amount: number; blocked: number }
  | { t: 'heal'; side: 'player' | 'enemy'; uid: number; amount: number }
  | { t: 'block'; side: 'player' | 'enemy'; uid: number; amount: number }
  | { t: 'status'; side: 'player' | 'enemy'; uid: number; emoji: string; negated: boolean; debuff: boolean }
  | { t: 'death'; uid: number };

export interface CombatScreenOpts {
  budget: number;
  floorLabel: string;
  bgId?: string;
  coffees?: () => string[];
  onDrinkCoffee?: (index: number) => void;
  onEnd: (result: 'win' | 'lose') => void;
  onSettings?: () => void;
}

export class CombatScreen {
  private root: HTMLElement;
  private engine: CombatEngine;
  private opts: CombatScreenOpts;
  private selectedUid: number | null = null;
  private enemyEls = new Map<number, HTMLElement>();
  private enemyAreaEl: HTMLElement | null = null;
  private playerRowEl: HTMLElement | null = null;
  private msgLog: HTMLElement;
  private unsubs: Array<() => void> = [];
  private ended = false;
  private choiceSelection = new Set<number>();

  // animation timeline state
  private buffering = false;
  private impacts: Impact[] = [];
  private busy = false;
  private skip = false;
  private pendingEnd: 'win' | 'lose' | null = null;

  constructor(root: HTMLElement, engine: CombatEngine, opts: CombatScreenOpts) {
    this.root = root;
    this.engine = engine;
    this.opts = opts;
    this.msgLog = h('div', { class: 'msg-log' });
    this.subscribe();
  }

  mount(): void {
    this.render();
    document.body.appendChild(this.msgLog);
  }

  unmount(): void {
    for (const u of this.unsubs) u();
    this.msgLog.remove();
    clear(this.root);
  }

  setBudget(budget: number): void {
    this.opts.budget = budget;
  }

  private subscribe(): void {
    const ev = this.engine.events;
    this.unsubs.push(
      ev.on('stateChanged', () => { if (!this.buffering) this.render(); }),
      ev.on('damage', (d) => {
        if (this.buffering) { this.impacts.push({ t: 'damage', ...d }); return; }
        this.liveDamage(d.side, d.uid, d.amount, d.blocked);
      }),
      ev.on('healed', (d) => {
        if (this.buffering) { this.impacts.push({ t: 'heal', ...d }); return; }
        const anchor = this.anchor(d.side, d.uid);
        if (anchor) { floatNumber(anchor, `+${d.amount}`, 'heal'); sfx('heal'); }
      }),
      ev.on('blockGained', (d) => {
        if (d.amount <= 0) return;
        if (this.buffering) { this.impacts.push({ t: 'block', ...d }); return; }
        const anchor = this.anchor(d.side, d.uid);
        if (anchor) { floatNumber(anchor, `+${d.amount} 🛡`, 'block'); sfx('block'); }
      }),
      ev.on('statusApplied', ({ side, uid, status, negated }) => {
        const imp: Impact = { t: 'status', side, uid, emoji: negated ? '🧭' : STATUSES[status].emoji, negated, debuff: STATUSES[status].isDebuff };
        if (this.buffering) { this.impacts.push(imp); return; }
        const anchor = this.anchor(side, uid);
        if (anchor) floatNumber(anchor, negated ? 'Negated! 🧭' : STATUSES[status].emoji, 'status');
      }),
      ev.on('enemyDied', ({ uid }) => {
        if (this.buffering) this.impacts.push({ t: 'death', uid });
      }),
      ev.on('enemyMove', ({ uid, name }) => {
        const enemy = this.engine.state.enemies.find((x) => x.uid === uid);
        const def = enemy ? ENEMIES_BY_ID[enemy.defId] : null;
        this.message(`${def?.name ?? '???'}: ${name}`);
      }),
      ev.on('message', ({ text }) => this.message(text)),
      ev.on('combatEnded', ({ result }) => {
        if (this.ended) return;
        this.ended = true;
        // wait for any running animation timeline to drain
        if (this.busy) { this.pendingEnd = result; return; }
        this.finish(result);
      }),
    );
  }

  private finish(result: 'win' | 'lose'): void {
    if (result === 'win') sfx('victoryChime');
    setTimeout(() => this.opts.onEnd(result), 650);
  }

  private anchor(side: 'player' | 'enemy', uid: number): HTMLElement | null {
    return side === 'enemy' ? (this.enemyEls.get(uid) ?? null) : this.playerRowEl;
  }

  private liveDamage(side: 'player' | 'enemy', uid: number, amount: number, blocked: number): void {
    const anchor = this.anchor(side, uid);
    if (!anchor) return;
    if (amount > 0) {
      floatNumber(anchor, `-${amount}`, side === 'player' ? 'dmg-player' : '');
      const heavy = amount >= 10;
      flash(anchor);
      shake(anchor, heavy ? 'heavy' : 'light');
      sfx(heavy ? 'heavyHit' : 'hit', { haptics: true });
      if (heavy && side === 'player') screenShake(this.root);
      if (side === 'enemy') lunge(anchor, 'up');
      else lunge(anchor, 'down');
    } else if (blocked > 0) {
      floatNumber(anchor, 'Blocked', 'block');
      sfx('block');
    }
  }

  private message(text: string): void {
    const el = h('div', { class: 'msg' }, text);
    this.msgLog.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    while (this.msgLog.children.length > 4) this.msgLog.firstChild?.remove();
  }

  // --- interactions ---

  private onCardTap(cardEl: HTMLElement, card: CardInstance): void {
    const engine = this.engine;
    if (this.busy || engine.state.pendingChoice) return;
    if (!engine.canPlay(card)) return;
    const def = cardDefOf(card);
    if (this.selectedUid === card.uid) {
      this.selectedUid = null;
      this.render();
      return;
    }
    if (def.target === 'enemy') {
      const alive = engine.state.enemies.filter((e) => !e.dead);
      if (alive.length === 1) {
        void this.playAndAnimate(cardEl, card, alive[0]!.uid);
      } else {
        this.selectedUid = card.uid;
        this.render();
      }
      return;
    }
    void this.playAndAnimate(cardEl, card, undefined);
  }

  private onEnemyTap(enemy: EnemyState): void {
    if (this.busy || this.selectedUid === null || enemy.dead) return;
    const uid = this.selectedUid;
    const cardEl = this.root.querySelector<HTMLElement>('.card.card-selected');
    this.selectedUid = null;
    const card = this.engine.state.hand.find((c) => c.uid === uid);
    if (card) void this.playAndAnimate(cardEl, card, enemy.uid);
  }

  /** Player plays a card: fly → resolve → replay impacts with juice. */
  private async playAndAnimate(cardEl: HTMLElement | null, card: CardInstance, targetUid: number | undefined): Promise<void> {
    const def = cardDefOf(card);
    this.busy = true;
    this.selectedUid = null;
    sfx('cardPlay');

    // flight target
    let targetEl: HTMLElement | null = null;
    if (def.target === 'enemy' && targetUid !== undefined) targetEl = this.enemyEls.get(targetUid) ?? null;
    else if (def.target === 'allEnemies' || def.target === 'randomEnemy') targetEl = this.enemyAreaEl;
    else targetEl = this.playerRowEl;

    if (cardEl && targetEl && motionOK()) {
      await flyClone(cardEl, targetEl, { duration: 300 });
    }

    this.impacts = [];
    this.buffering = true;
    this.engine.playCard(card.uid, targetUid);
    this.buffering = false;
    this.render();
    await this.replayImpacts();
    this.busy = false;
    if (this.pendingEnd) { const r = this.pendingEnd; this.pendingEnd = null; this.finish(r); }
  }

  /** Enemy turn with a sweeping banner and sequenced enemy attacks. */
  private async endTurnAndAnimate(): Promise<void> {
    const s = this.engine.state;
    if (this.busy || s.over || s.pendingChoice) return;
    this.busy = true;
    this.impacts = [];
    this.buffering = true;
    this.engine.endTurn();
    this.buffering = false;
    // if the fight is still going, the enemies acted → announce + replay
    await banner('Enemy Sprint', 'banner-enemy');
    this.render();
    await this.replayImpacts();
    this.busy = false;
    if (this.pendingEnd) { const r = this.pendingEnd; this.pendingEnd = null; this.finish(r); }
  }

  /** Overlap fanned cards so the whole hand fits the container width. */
  private layoutFan(hand: HTMLElement, cards: HTMLElement[]): void {
    if (cards.length < 2) return;
    const cw = cards[0]!.offsetWidth || 118;
    const avail = hand.clientWidth - 20;
    // desired step between card left edges to fit all cards
    let step = (avail - cw) / (cards.length - 1);
    step = Math.max(28, Math.min(cw + 8, step)); // clamp: never more than side-by-side, min overlap
    const overlap = step - cw; // negative when overlapping
    cards.forEach((el, i) => {
      el.style.marginLeft = i === 0 ? '0' : `${overlap}px`;
      el.style.marginRight = '0';
      el.style.zIndex = String(i + 1);
    });
    // if even max overlap can't fit (>10 cards), let it scroll
    hand.style.overflowX = (cw + (cards.length - 1) * step) > hand.clientWidth ? 'auto' : 'visible';
  }

  private async replayImpacts(): Promise<void> {
    const list = this.impacts;
    this.impacts = [];
    this.skip = false;
    for (const imp of list) {
      if (this.skip) { this.applyImpact(imp, true); continue; }
      this.applyImpact(imp, false);
      await wait(motionOK() ? 150 : 0);
    }
  }

  private applyImpact(imp: Impact, silent: boolean): void {
    if (imp.t === 'death') {
      const el = this.enemyEls.get(imp.uid);
      if (el) void dissolve(el);
      if (!silent) sfx('enemyDeath');
      return;
    }
    const anchor = this.anchor(imp.side, imp.uid);
    if (!anchor) return;
    if (silent) {
      // fast-forward: just the number, no shake/sfx spam
      if (imp.t === 'damage' && imp.amount > 0) floatNumber(anchor, `-${imp.amount}`);
      return;
    }
    switch (imp.t) {
      case 'damage':
        this.liveDamage(imp.side, imp.uid, imp.amount, imp.blocked);
        break;
      case 'heal':
        floatNumber(anchor, `+${imp.amount}`, 'heal');
        sfx('heal');
        break;
      case 'block':
        floatNumber(anchor, `+${imp.amount} 🛡`, 'block');
        sfx('block');
        break;
      case 'status':
        floatNumber(anchor, imp.negated ? 'Negated! 🧭' : imp.emoji, 'status');
        if (!imp.negated) sfx('debuff', { pitch: imp.debuff ? 1 : 1.3 });
        break;
    }
  }

  // --- rendering ---

  render(): void {
    const s = this.engine.state;
    clear(this.root);
    this.enemyEls.clear();

    const hpPct = Math.max(0, (s.player.hp / s.player.maxHp) * 100);

    const coffeeChips = (this.opts.coffees?.() ?? []).map((id, i) => {
      const def = COFFEES_BY_ID[id];
      if (!def) return null;
      return h('span', {
        class: 'coffee-chip',
        title: `${def.name}: ${def.description}`,
        onTap: () => {
          if (this.busy || s.over || s.pendingChoice) return;
          this.opts.onDrinkCoffee?.(i);
          sfx('drink');
        },
      }, def.emoji);
    }).filter((x): x is HTMLElement => x !== null);

    const gear = h('span', {
      class: 'hud-gear', title: 'Settings',
      onTap: () => this.opts.onSettings?.(),
    }, '⚙');

    const hud = h('div', { class: 'hud' },
      h('span', { class: 'hud-hp' }, `❤️ ${s.player.hp}/${s.player.maxHp}`),
      h('div', { class: 'hp-bar' },
        h('div', { class: 'hp-bar-fill', style: `width:${hpPct}%` })),
      ...coffeeChips,
      h('span', { class: 'hud-spacer' }),
      h('span', { class: 'hud-floor' }, this.opts.floorLabel),
      h('span', { class: 'hud-budget' }, `💰 ${this.opts.budget}`),
      gear,
    );

    const enemyArea = h('div', { class: 'enemy-area' });
    this.enemyAreaEl = enemyArea;
    for (const enemy of s.enemies) {
      const el = this.renderEnemy(enemy);
      this.enemyEls.set(enemy.uid, el);
      enemyArea.appendChild(el);
    }

    const p = s.player;
    const playerStatuses = this.statusRow(p.statuses, p.block, 'player');
    this.playerRowEl = h('div', { class: 'player-row' },
      h('div', { class: 'energy-orb' }, `${s.energy}/${s.maxEnergy}`),
      h('div', { class: 'player-mid' },
        h('span', { class: 'player-hp-text' }, `You  ❤️ ${p.hp}/${p.maxHp}`),
        playerStatuses,
      ),
      h('button', {
        class: 'btn-endturn',
        onTap: () => { void this.endTurnAndAnimate(); },
      }, 'End Turn ▶'),
    );

    const hand = h('div', { class: 'hand-area' });
    const n = s.hand.length;
    const cardEls: HTMLElement[] = [];
    s.hand.forEach((card, i) => {
      const el = cardElFromInstance(card, {
        cost: this.engine.cardCost(card),
        selected: this.selectedUid === card.uid,
      });
      const mid = (n - 1) / 2;
      const off = i - mid;
      el.style.setProperty('--fan-rot', `${off * 3.0}deg`);
      el.style.setProperty('--fan-y', `${Math.abs(off) * Math.abs(off) * 2.0}px`);
      addTapAndHold(el, () => this.onCardTap(el, card), () => showInspect(card));
      if (!this.engine.canPlay(card)) el.classList.add('unplayable-now');
      cardEls.push(el);
      hand.appendChild(el);
    });
    if (n >= 5) {
      hand.classList.add('fanned');
      // overlap cards just enough to fit the viewport without horizontal scroll
      requestAnimationFrame(() => this.layoutFan(hand, cardEls));
    }

    const piles = h('div', { class: 'pile-row' },
      h('span', { class: 'pile-btn', onTap: () => this.showPile('Draw pile (shuffled)', s.drawPile) },
        `📚 ${s.drawPile.length}`),
      h('span', { class: 'pile-btn', onTap: () => this.showPile('Discard pile', s.discardPile) },
        `🗑 ${s.discardPile.length}`),
      h('span', { class: 'pile-btn', onTap: () => this.showPile('Archived', s.exhaustPile) },
        `📦 ${s.exhaustPile.length}`),
      h('span', { class: 'pile-skip', onTap: () => { this.skip = true; } }, '»'),
    );

    const screen = h('div', { class: 'combat-screen' }, hud, enemyArea, this.playerRowEl, piles, hand);
    if (this.opts.bgId) {
      enemyArea.style.backgroundImage = bgLayer(this.opts.bgId, 0.55);
      enemyArea.classList.add('has-bg');
    }
    this.root.appendChild(screen);

    if (s.pendingChoice) this.renderChoice();
  }

  private renderEnemy(enemy: EnemyState): HTMLElement {
    const def = ENEMIES_BY_ID[enemy.defId]!;
    const intent = this.engine.intentView(enemy);
    const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);

    const intentText = enemy.dead
      ? ''
      : intent.damage !== undefined
        ? `${intentIcon(intent.kind)} ${intent.damage}${(intent.times ?? 1) > 1 ? `×${intent.times}` : ''}`
        : `${intentIcon(intent.kind)} ${intent.name}`;

    const intentEl = h('div', { class: `enemy-intent intent-${intent.kind}`, title: intent.name }, intentText || ' ');
    if (!enemy.dead) {
      intentEl.addEventListener('click', (e) => {
        e.stopPropagation();
        showTooltip(intentEl, { title: intent.name, body: intentDescription(intent.kind, intent.damage, intent.times) });
      });
    }

    const el = h('div', {
      class: `enemy${enemy.dead ? ' dead' : ''}${this.selectedUid !== null && !enemy.dead ? ' targetable' : ''}`,
      onTap: () => this.onEnemyTap(enemy),
    },
      intentEl,
      h('div', { class: 'enemy-emoji' }, artImg('enemies', enemy.defId, def.emoji, 'enemy-art')),
      h('div', { class: 'enemy-name' }, def.name),
      h('div', { class: 'creature-bars' },
        h('div', { class: 'creature-hp-bar' },
          h('div', { class: 'creature-hp-fill', style: `width:${hpPct}%` })),
        h('span', { class: 'creature-hp-num' }, `${Math.max(0, enemy.hp)}/${enemy.maxHp}`),
      ),
      this.statusRow(enemy.statuses, enemy.block, 'enemy'),
    );
    el.title = def.description;
    return el;
  }

  private statusRow(statuses: Record<string, number | undefined>, block: number, _side: 'player' | 'enemy'): HTMLElement {
    const row = h('div', { class: 'status-row' });
    if (block > 0) {
      const chip = h('span', { class: 'status-chip block-chip' }, `🛡 ${block}`);
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        showTooltip(chip, { title: 'Buffer', emoji: '🛡️', body: 'Blocks incoming damage. Expires at the start of your turn.' });
      });
      row.appendChild(chip);
    }
    for (const [id, stacks] of Object.entries(statuses)) {
      if (!stacks) continue;
      const def = STATUSES[id as keyof typeof STATUSES];
      if (!def) continue;
      const chip = h('span', {
        class: `status-chip${def.isDebuff ? ' debuff' : ''}`,
        title: `${def.name}: ${def.description(stacks)}`,
      }, `${def.emoji}${stacks}`);
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        showTooltip(chip, { title: def.name, emoji: def.emoji, body: def.description(stacks) });
      });
      row.appendChild(chip);
    }
    return row;
  }

  private renderChoice(): void {
    const choice = this.engine.state.pendingChoice!;
    this.choiceSelection = new Set();

    const cardsEl = h('div', { class: 'overlay-cards' });
    const confirmBtn = h('button', { class: 'btn btn-primary' }, 'Confirm') as HTMLButtonElement;

    const refresh = () => {
      const cnt = this.choiceSelection.size;
      confirmBtn.disabled = cnt < choice.min || cnt > choice.max;
      confirmBtn.textContent = choice.max === 0 || choice.cards.length === 0
        ? 'OK'
        : `Confirm (${cnt}/${choice.max})`;
    };

    for (const card of choice.cards) {
      const el = cardElFromInstance(card, { small: true });
      addTapAndHold(el, () => {
        if (this.choiceSelection.has(card.uid)) this.choiceSelection.delete(card.uid);
        else if (this.choiceSelection.size < choice.max) this.choiceSelection.add(card.uid);
        el.classList.toggle('card-selected', this.choiceSelection.has(card.uid));
        sfx('cardFlip');
        refresh();
      }, () => showInspect(card));
      cardsEl.appendChild(el);
    }

    confirmBtn.addEventListener('click', () => {
      sfx('button');
      this.engine.resolveChoice([...this.choiceSelection]);
    });
    refresh();

    const skipBtn = choice.min === 0
      ? h('button', { class: 'btn btn-ghost', onTap: () => { sfx('button'); this.engine.resolveChoice([]); } }, 'Skip')
      : null;

    this.root.appendChild(
      h('div', { class: 'overlay' },
        h('div', { class: 'overlay-title' }, choice.prompt),
        cardsEl,
        h('div', { style: 'display:flex;gap:10px' }, confirmBtn, skipBtn),
      ),
    );
  }

  private showPile(title: string, pile: CardInstance[]): void {
    const overlay = h('div', { class: 'overlay' },
      h('div', { class: 'overlay-title' }, `${title} — ${pile.length} cards`),
      h('div', { class: 'overlay-cards' },
        ...pile.map((card) => {
          const el = cardElFromInstance(card, { small: true });
          addTapAndHold(el, () => showInspect(card), () => showInspect(card));
          return el;
        })),
      h('button', { class: 'btn btn-primary', onTap: () => overlay.remove() }, 'Close'),
    );
    this.root.appendChild(overlay);
  }
}

function intentIcon(kind: string): string {
  switch (kind) {
    case 'attack': return '⚔️';
    case 'attackDebuff': return '⚔️💫';
    case 'attackDefend': return '⚔️🛡';
    case 'defend': return '🛡';
    case 'buff': return '💪';
    case 'debuff': return '🌀';
    default: return '❓';
  }
}

function intentDescription(kind: string, damage?: number, times?: number): string {
  switch (kind) {
    case 'attack': return `Attacking for ${damage}${(times ?? 1) > 1 ? ` × ${times} hits` : ''} damage.`;
    case 'attackDebuff': return `Attacking for ${damage} and applying a debuff.`;
    case 'attackDefend': return `Attacking for ${damage} and gaining Buffer.`;
    case 'defend': return 'Gaining Buffer to block your attacks.';
    case 'buff': return 'Strengthening itself.';
    case 'debuff': return 'Weakening you.';
    default: return 'Its intent is unknown.';
  }
}

void KEYWORD_TEXT;
