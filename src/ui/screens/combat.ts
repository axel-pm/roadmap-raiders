// Combat screen: renders CombatState, handles card play + targeting + choices.

import { h, clear, floatText } from '../dom';
import { cardElFromInstance, cardDefOf } from '../components/cardEl';
import type { CombatEngine } from '../../engine/combat/engine';
import type { EnemyState } from '../../engine/combat/state';
import type { CardInstance } from '../../engine/types';
import { STATUSES } from '../../content/keywords';
import { ENEMIES_BY_ID } from '../../content';

export interface CombatScreenOpts {
  budget: number;
  floorLabel: string;
  onEnd: (result: 'win' | 'lose') => void;
}

export class CombatScreen {
  private root: HTMLElement;
  private engine: CombatEngine;
  private opts: CombatScreenOpts;
  private selectedUid: number | null = null;
  private enemyEls = new Map<number, HTMLElement>();
  private playerRowEl: HTMLElement | null = null;
  private msgLog: HTMLElement;
  private unsubs: Array<() => void> = [];
  private ended = false;
  private choiceSelection = new Set<number>();

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
      ev.on('stateChanged', () => this.render()),
      ev.on('damage', ({ side, uid, amount, blocked }) => {
        const anchor = side === 'enemy' ? this.enemyEls.get(uid) : this.playerRowEl;
        if (anchor) {
          if (amount > 0) floatText(anchor, `-${amount}`);
          else if (blocked > 0) floatText(anchor, 'Blocked!', 'block');
          const emoji = anchor.querySelector('.enemy-emoji');
          if (emoji) {
            emoji.classList.remove('hit');
            void (emoji as HTMLElement).offsetWidth;
            emoji.classList.add('hit');
          }
        }
      }),
      ev.on('healed', ({ side, uid, amount }) => {
        const anchor = side === 'enemy' ? this.enemyEls.get(uid) : this.playerRowEl;
        if (anchor) floatText(anchor, `+${amount}`, 'heal');
      }),
      ev.on('blockGained', ({ side, uid, amount }) => {
        if (amount <= 0) return;
        const anchor = side === 'enemy' ? this.enemyEls.get(uid) : this.playerRowEl;
        if (anchor) floatText(anchor, `+${amount} 🛡`, 'block');
      }),
      ev.on('statusApplied', ({ side, uid, status, negated }) => {
        const anchor = side === 'enemy' ? this.enemyEls.get(uid) : this.playerRowEl;
        if (anchor) {
          floatText(anchor, negated ? 'Negated! 🧭' : STATUSES[status].emoji, 'status');
        }
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
        setTimeout(() => this.opts.onEnd(result), 600);
      }),
    );
  }

  private message(text: string): void {
    const el = h('div', { class: 'msg' }, text);
    this.msgLog.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    while (this.msgLog.children.length > 4) this.msgLog.firstChild?.remove();
  }

  // --- interactions ---

  private onCardTap(card: CardInstance): void {
    const engine = this.engine;
    if (engine.state.pendingChoice) return;
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
        engine.playCard(card.uid, alive[0]!.uid);
        this.selectedUid = null;
      } else {
        this.selectedUid = card.uid;
        this.render();
      }
      return;
    }
    engine.playCard(card.uid);
    this.selectedUid = null;
  }

  private onEnemyTap(enemy: EnemyState): void {
    if (this.selectedUid === null || enemy.dead) return;
    const uid = this.selectedUid;
    this.selectedUid = null;
    this.engine.playCard(uid, enemy.uid);
  }

  // --- rendering ---

  render(): void {
    const s = this.engine.state;
    clear(this.root);
    this.enemyEls.clear();

    const hpPct = Math.max(0, (s.player.hp / s.player.maxHp) * 100);

    const hud = h('div', { class: 'hud' },
      h('span', { class: 'hud-hp' }, `❤️ ${s.player.hp}/${s.player.maxHp}`),
      h('div', { class: 'hp-bar' },
        h('div', { class: 'hp-bar-fill', style: `width:${hpPct}%` })),
      h('span', { class: 'hud-spacer' }),
      h('span', { class: 'hud-floor' }, this.opts.floorLabel),
      h('span', { class: 'hud-budget' }, `💰 ${this.opts.budget}`),
    );

    const enemyArea = h('div', { class: 'enemy-area' });
    for (const enemy of s.enemies) {
      const el = this.renderEnemy(enemy);
      this.enemyEls.set(enemy.uid, el);
      enemyArea.appendChild(el);
    }

    const p = s.player;
    const playerStatuses = this.statusRow(p.statuses, p.block);
    this.playerRowEl = h('div', { class: 'player-row' },
      h('div', { class: 'energy-orb' }, `${s.energy}/${s.maxEnergy}`),
      h('div', { class: 'player-mid' },
        h('span', { class: 'player-hp-text' }, `You  ❤️ ${p.hp}/${p.maxHp}`),
        playerStatuses,
      ),
      h('button', {
        class: 'btn-endturn',
        onTap: () => { if (!s.over && !s.pendingChoice) this.engine.endTurn(); },
      }, 'End Turn ▶'),
    );

    const hand = h('div', { class: 'hand-area' });
    for (const card of s.hand) {
      const el = cardElFromInstance(card, {
        cost: this.engine.cardCost(card),
        selected: this.selectedUid === card.uid,
        onTap: () => this.onCardTap(card),
      });
      if (!this.engine.canPlay(card)) el.classList.add('unplayable-now');
      hand.appendChild(el);
    }

    const piles = h('div', { class: 'pile-row' },
      h('span', { class: 'pile-btn', onTap: () => this.showPile('Draw pile (shuffled)', s.drawPile) },
        `📚 Draw: ${s.drawPile.length}`),
      h('span', { class: 'pile-btn', onTap: () => this.showPile('Discard pile', s.discardPile) },
        `🗑 Discard: ${s.discardPile.length}`),
      h('span', { class: 'pile-btn', onTap: () => this.showPile('Archived', s.exhaustPile) },
        `📦 Archived: ${s.exhaustPile.length}`),
    );

    this.root.appendChild(
      h('div', { class: 'combat-screen' }, hud, enemyArea, this.playerRowEl, piles, hand),
    );

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

    const el = h('div', {
      class: `enemy${enemy.dead ? ' dead' : ''}${this.selectedUid !== null && !enemy.dead ? ' targetable' : ''}`,
      onTap: () => this.onEnemyTap(enemy),
    },
      h('div', { class: `enemy-intent intent-${intent.kind}`, title: intent.name }, intentText || ' '),
      h('div', { class: 'enemy-emoji' }, def.emoji),
      h('div', { class: 'enemy-name' }, def.name),
      h('div', { class: 'creature-bars' },
        h('div', { class: 'creature-hp-bar' },
          h('div', { class: 'creature-hp-fill', style: `width:${hpPct}%` })),
        h('span', { class: 'creature-hp-num' }, `${Math.max(0, enemy.hp)}/${enemy.maxHp}`),
      ),
      this.statusRow(enemy.statuses, enemy.block),
    );
    el.title = def.description;
    return el;
  }

  private statusRow(statuses: Record<string, number | undefined>, block: number): HTMLElement {
    const row = h('div', { class: 'status-row' });
    if (block > 0) row.appendChild(h('span', { class: 'status-chip block-chip' }, `🛡 ${block}`));
    for (const [id, stacks] of Object.entries(statuses)) {
      if (!stacks) continue;
      const def = STATUSES[id as keyof typeof STATUSES];
      if (!def) continue;
      row.appendChild(h('span', {
        class: `status-chip${def.isDebuff ? ' debuff' : ''}`,
        title: `${def.name}: ${def.description(stacks)}`,
      }, `${def.emoji}${stacks}`));
    }
    return row;
  }

  private renderChoice(): void {
    const choice = this.engine.state.pendingChoice!;
    this.choiceSelection = new Set();

    const cardsEl = h('div', { class: 'overlay-cards' });
    const confirmBtn = h('button', { class: 'btn btn-primary' }, 'Confirm') as HTMLButtonElement;

    const refresh = () => {
      const n = this.choiceSelection.size;
      confirmBtn.disabled = n < choice.min || n > choice.max;
      confirmBtn.textContent = choice.max === 0 || choice.cards.length === 0
        ? 'OK'
        : `Confirm (${n}/${choice.max})`;
    };

    for (const card of choice.cards) {
      const el = cardElFromInstance(card, {
        small: true,
        onTap: () => {
          if (this.choiceSelection.has(card.uid)) this.choiceSelection.delete(card.uid);
          else if (this.choiceSelection.size < choice.max) this.choiceSelection.add(card.uid);
          el.classList.toggle('card-selected', this.choiceSelection.has(card.uid));
          refresh();
        },
      });
      cardsEl.appendChild(el);
    }

    confirmBtn.addEventListener('click', () => {
      this.engine.resolveChoice([...this.choiceSelection]);
    });
    refresh();

    const skipBtn = choice.min === 0
      ? h('button', {
          class: 'btn btn-ghost',
          onTap: () => this.engine.resolveChoice([]),
        }, 'Skip')
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
        ...pile.map((card) => cardElFromInstance(card, { small: true }))),
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
