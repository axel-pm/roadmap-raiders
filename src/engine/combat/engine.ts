// Headless combat engine. No DOM. Mutates CombatState, emits typed events.
// The UI subscribes and renders; tests subscribe and assert.

import { Emitter } from '../../core/events';
import type { Rng } from '../../core/rng';
import type {
  Amount, CardDef, CardInstance, CardKeyword, Effect, EnemyDef, StatusId, TargetSpec,
} from '../types';
import { STATUSES } from '../../content/keywords';
import type {
  CombatState, CreatureState, EnemyState, IntentView, PendingChoice,
} from './state';

export interface EffectCtx {
  source: 'player' | EnemyState;
  card?: CardInstance;
  /** chosen enemy for 'enemy'-targeted player effects */
  targetUid?: number;
  /** X-cost energy spent */
  xSpent?: number;
}

export type CustomEffectHandler = (engine: CombatEngine, ctx: EffectCtx, arg?: number) => void;

export interface RelicCombatHooks {
  onCombatStart?: (engine: CombatEngine) => void;
  onTurnStart?: (engine: CombatEngine) => void;
  onCardPlayed?: (engine: CombatEngine, card: CardInstance, def: CardDef) => void;
  onExhaust?: (engine: CombatEngine, card: CardInstance) => void;
  onCombatEnd?: (engine: CombatEngine, result: 'win' | 'lose') => void;
  onTurnEnd?: (engine: CombatEngine) => void;
  /** flat damage modifier for player attacks */
  modifyAttackDamage?: (engine: CombatEngine, amount: number, def: CardDef | null) => number;
}

export interface Content {
  cards: Record<string, CardDef>;
  enemies: Record<string, EnemyDef>;
  customEffects: Record<string, CustomEffectHandler>;
  relicHooks: Record<string, RelicCombatHooks>;
}

export interface CombatHost {
  rng: Rng;
  content: Content;
  relicIds: string[];
  ascension: number;
  isEliteOrBoss?: boolean;
  gainBudget(n: number): void;
  loseBudget(n: number): void;
}

export interface CombatEvents extends Record<string, unknown> {
  stateChanged: { state: CombatState };
  damage: { side: 'player' | 'enemy'; uid: number; amount: number; blocked: number };
  healed: { side: 'player' | 'enemy'; uid: number; amount: number };
  blockGained: { side: 'player' | 'enemy'; uid: number; amount: number };
  statusApplied: { side: 'player' | 'enemy'; uid: number; status: StatusId; stacks: number; negated: boolean };
  cardPlayed: { card: CardInstance; def: CardDef };
  cardExhausted: { card: CardInstance };
  drawn: { cards: CardInstance[] };
  enemyMove: { uid: number; name: string };
  enemyDied: { uid: number; defId: string };
  turnStarted: { turn: number };
  combatEnded: { result: 'win' | 'lose' };
  choiceRequested: { prompt: string };
  message: { text: string };
}

let cardUidCounter = 1;
export function makeInstance(defId: string, upgraded = false): CardInstance {
  return { uid: cardUidCounter++, defId, upgraded };
}

let choiceIdCounter = 1;
let enemyUidCounter = 1;

const DRAW_PER_TURN = 5;
const MAX_HAND = 10;

export class CombatEngine {
  state!: CombatState;
  readonly events = new Emitter<CombatEvents>();
  readonly host: CombatHost;
  private firstSkillDoubledThisTurn = false;
  private attackDrawUsedThisTurn = 0;

  constructor(host: CombatHost) {
    this.host = host;
  }

  // --- content helpers ---

  def(card: CardInstance): CardDef {
    const d = this.host.content.cards[card.defId];
    if (!d) throw new Error(`Unknown card def: ${card.defId}`);
    return d;
  }

  /** effective (upgrade-aware) view of a card */
  cardEffects(card: CardInstance): Effect[] {
    const d = this.def(card);
    return card.upgraded && d.upgrade?.effects ? d.upgrade.effects : d.effects;
  }

  cardKeywords(card: CardInstance): CardKeyword[] {
    const d = this.def(card);
    return card.upgraded && d.upgrade?.keywords ? d.upgrade.keywords : (d.keywords ?? []);
  }

  cardCost(card: CardInstance): number | 'X' | null {
    if (card.freeThisCombat) return 0;
    const d = this.def(card);
    let base = card.upgraded && d.upgrade?.cost !== undefined ? d.upgrade.cost : d.cost;
    if (typeof base === 'number' && d.guest && this.host.relicIds.includes('customer_advisory_board')) {
      base = Math.max(0, base - 1);
    }
    return base;
  }

  enemyDef(e: EnemyState): EnemyDef {
    const d = this.host.content.enemies[e.defId];
    if (!d) throw new Error(`Unknown enemy def: ${e.defId}`);
    return d;
  }

  private relicHooks(): RelicCombatHooks[] {
    return this.host.relicIds
      .map((id) => this.host.content.relicHooks[id])
      .filter((h): h is RelicCombatHooks => !!h);
  }

  // --- setup ---

  startCombat(deck: CardInstance[], enemyIds: string[], playerHp: number, playerMaxHp: number): void {
    const rng = this.host.rng;
    const asc = this.host.ascension;
    const enemies: EnemyState[] = enemyIds.map((defId) => {
      const def = this.host.content.enemies[defId];
      if (!def) throw new Error(`Unknown enemy: ${defId}`);
      let hp = rng.int(def.hp[0], def.hp[1]);
      if (asc >= 1) hp = Math.round(hp * 1.1);
      if (asc >= 3 && this.host.isEliteOrBoss) hp = Math.round(hp * 1.1);
      const statuses: EnemyState['statuses'] = {};
      if (asc >= 7) statuses.momentum = 1;
      if (asc >= 10 && this.host.isEliteOrBoss) statuses.hype = (statuses.hype ?? 0) + 1;
      return {
        uid: enemyUidCounter++, defId, hp, maxHp: hp, block: 0,
        statuses, currentMove: '', history: [], flags: {}, dead: false,
      };
    });

    // Day One (innate) cards go on top of the draw pile
    const shuffled = rng.shuffle(deck.map((c) => ({ ...c })));
    const innate = shuffled.filter((c) => this.cardKeywords(c).includes('dayOne'));
    const rest = shuffled.filter((c) => !this.cardKeywords(c).includes('dayOne'));

    this.state = {
      turn: 0,
      energy: 0,
      maxEnergy: 3,
      player: { hp: playerHp, maxHp: playerMaxHp, block: 0, statuses: {} },
      enemies,
      hand: [],
      drawPile: [...rest, ...innate], // draw from the end
      discardPile: [],
      exhaustPile: [],
      powersInPlay: [],
      cardsPlayedThisTurn: 0,
      attacksPlayedThisTurn: 0,
      skillsPlayedThisTurn: 0,
      over: null,
      pendingChoice: null,
      damageDealt: 0,
    };

    for (const e of enemies) {
      const def = this.enemyDef(e);
      if (def.onSpawn) this.applyEffects(def.onSpawn, { source: e });
      this.rollIntent(e);
    }

    for (const h of this.relicHooks()) h.onCombatStart?.(this);
    this.startPlayerTurn();
  }

  // --- turn flow ---

  private startPlayerTurn(): void {
    const s = this.state;
    if (s.over) return;
    s.turn++;
    const p = s.player;

    if (!p.statuses.barricade) p.block = 0;
    s.energy = s.maxEnergy + (p.statuses.energizedEveryTurn ?? 0);
    s.cardsPlayedThisTurn = 0;
    s.attacksPlayedThisTurn = 0;
    s.skillsPlayedThisTurn = 0;
    this.firstSkillDoubledThisTurn = false;
    this.attackDrawUsedThisTurn = 0;

    if (p.statuses.strengthPerTurn) this.addStatus('player', 0, 'momentum', p.statuses.strengthPerTurn);
    if (p.statuses.regen) this.heal('player', 0, p.statuses.regen);
    this.tickTechDebt(p, 'player', 0);

    this.events.emit('turnStarted', { turn: s.turn });
    for (const h of this.relicHooks()) h.onTurnStart?.(this);

    const drawCount = DRAW_PER_TURN + (p.statuses.drawNextTurn ?? 0) + (p.statuses.drawEveryTurn ?? 0);
    delete p.statuses.drawNextTurn;
    this.draw(drawCount);

    if (p.statuses.foresight) this.scry(p.statuses.foresight);
    this.changed();
  }

  endTurn(): void {
    const s = this.state;
    if (s.over || s.pendingChoice) return;
    const p = s.player;

    // end-of-turn-in-hand triggers (curses), then FOMO / Pinned / discard
    for (const card of [...s.hand]) {
      const d = this.def(card);
      if (d.endOfTurnInHand) this.applyEffects(d.endOfTurnInHand, { source: 'player', card });
    }
    const keep: CardInstance[] = [];
    for (const card of [...s.hand]) {
      const kw = this.cardKeywords(card);
      if (kw.includes('fomo')) this.exhaust(card);
      else if (kw.includes('pinned')) keep.push(card);
      else s.discardPile.push(card);
    }
    s.hand = keep;

    if (p.statuses.flywheel && p.block > 0) {
      const target = this.randomAliveEnemy();
      if (target) this.dealDamage('player', target, Math.floor(p.block / 2), false);
    }
    if (p.statuses.momentumDown) {
      this.addStatus('player', 0, 'momentum', -p.statuses.momentumDown);
      delete p.statuses.momentumDown;
    }
    this.decayDurations(p);
    for (const h of this.relicHooks()) h.onTurnEnd?.(this);

    // enemy turns
    for (const e of s.enemies) {
      if (e.dead || s.over) continue;
      if (!e.statuses.barricade) e.block = 0;
      this.tickTechDebt(e, 'enemy', e.uid);
      if (e.dead || s.over) continue;
      const def = this.enemyDef(e);
      const move = def.moves[e.currentMove];
      if (move) {
        this.events.emit('enemyMove', { uid: e.uid, name: move.name });
        this.applyEffects(move.effects, { source: e });
        e.history.push(e.currentMove);
      }
      if (e.dead || s.over) continue;
      if (e.statuses.hype) this.addStatus('enemy', e.uid, 'momentum', e.statuses.hype);
      this.decayDurations(e);
      this.rollIntent(e);
    }

    if (!s.over) this.startPlayerTurn();
    this.changed();
  }

  // --- playing cards ---

  canPlay(card: CardInstance): boolean {
    const s = this.state;
    if (s.over || s.pendingChoice) return false;
    if (!s.hand.includes(card)) return false;
    const cost = this.cardCost(card);
    if (cost === null || this.cardKeywords(card).includes('unplayable')) return false;
    if (cost === 'X') return true;
    return cost <= s.energy;
  }

  playCard(uid: number, targetUid?: number): void {
    const s = this.state;
    const card = s.hand.find((c) => c.uid === uid);
    if (!card || !this.canPlay(card)) return;
    const def = this.def(card);

    if (def.target === 'enemy' && targetUid === undefined) return;
    if (targetUid !== undefined) {
      const t = s.enemies.find((e) => e.uid === targetUid);
      if (!t || t.dead) return;
    }

    const cost = this.cardCost(card);
    let xSpent = 0;
    if (cost === 'X') {
      xSpent = s.energy;
      s.energy = 0;
    } else {
      s.energy -= cost as number;
    }

    s.hand = s.hand.filter((c) => c !== card);
    s.cardsPlayedThisTurn++;
    if (def.type === 'attack') s.attacksPlayedThisTurn++;
    if (def.type === 'skill') s.skillsPlayedThisTurn++;
    this.events.emit('cardPlayed', { card, def });

    let plays = 1;
    const p = s.player;
    if (p.statuses.echo && p.statuses.echo > 0) {
      this.addStatus('player', 0, 'echo', -1);
      plays = 2;
    } else if (def.type === 'skill' && p.statuses.doubleFirstSkill && !this.firstSkillDoubledThisTurn) {
      this.firstSkillDoubledThisTurn = true;
      plays = 2;
    }

    const ctx: EffectCtx = { source: 'player', card, targetUid, xSpent };
    for (let i = 0; i < plays; i++) {
      if (s.over) break;
      this.applyEffects(this.cardEffects(card), ctx);
    }

    // attackDraw (Shipping Culture)
    if (def.type === 'attack' && p.statuses.attackDraw && this.attackDrawUsedThisTurn < p.statuses.attackDraw) {
      this.attackDrawUsedThisTurn++;
      this.draw(1);
    }

    // where does the card go?
    if (def.type === 'power') {
      s.powersInPlay.push(card);
    } else if (this.cardKeywords(card).includes('archive')) {
      this.exhaust(card, false);
    } else {
      s.discardPile.push(card);
    }

    for (const h of this.relicHooks()) h.onCardPlayed?.(this, card, def);
    this.checkCombatEnd();
    this.changed();
  }

  /** used by Coffee (potions) and events during combat */
  applyExternalEffects(effects: Effect[], targetUid?: number): void {
    if (this.state.over) return;
    this.applyEffects(effects, { source: 'player', targetUid });
    this.checkCombatEnd();
    this.changed();
  }

  // --- effect interpreter ---

  applyEffects(effects: Effect[], ctx: EffectCtx): void {
    for (const eff of effects) {
      if (this.state.over) return;
      this.applyEffect(eff, ctx);
    }
  }

  private applyEffect(eff: Effect, ctx: EffectCtx): void {
    const s = this.state;
    const fromPlayer = ctx.source === 'player';

    switch (eff.kind) {
      case 'damage': {
        const times = eff.times === 'x' ? (ctx.xSpent ?? 0) : (eff.times ?? 1);
        for (let i = 0; i < times; i++) {
          if (s.over) return;
          if (fromPlayer) {
            for (const t of this.resolveEnemyTargets(eff.target ?? 'enemy', ctx)) {
              if (!t.dead) this.dealDamage('player', t, this.resolveAmount(eff.amount, ctx), true, ctx.card ? this.def(ctx.card) : null);
            }
          } else {
            this.dealDamage(ctx.source as EnemyState, 'player', this.resolveAmount(eff.amount, ctx), true);
          }
        }
        break;
      }
      case 'block': {
        const target: CreatureState = fromPlayer ? s.player : (ctx.source as EnemyState);
        const uid = fromPlayer ? 0 : (ctx.source as EnemyState).uid;
        this.gainBlock(target, fromPlayer ? 'player' : 'enemy', uid, this.resolveAmount(eff.amount, ctx), fromPlayer);
        break;
      }
      case 'applyStatus': {
        if (fromPlayer) {
          if (eff.target === 'self') {
            this.addStatus('player', 0, eff.status, eff.stacks);
          } else {
            for (const t of this.resolveEnemyTargets(eff.target, ctx)) {
              if (!t.dead) this.addStatus('enemy', t.uid, eff.status, eff.stacks);
            }
          }
        } else {
          const src = ctx.source as EnemyState;
          if (eff.target === 'self') this.addStatus('enemy', src.uid, eff.status, eff.stacks);
          else if (eff.target === 'allEnemies') {
            for (const e of s.enemies) if (!e.dead) this.addStatus('enemy', e.uid, eff.status, eff.stacks);
          } else this.addStatus('player', 0, eff.status, eff.stacks);
        }
        break;
      }
      case 'removeDebuffs': {
        const target: CreatureState = fromPlayer
          ? (eff.target === 'self' ? s.player : s.player)
          : (ctx.source as EnemyState);
        for (const key of Object.keys(target.statuses) as StatusId[]) {
          if (STATUSES[key].isDebuff) delete target.statuses[key];
        }
        break;
      }
      case 'draw':
        this.draw(eff.count);
        break;
      case 'gainEnergy':
        s.energy += eff.count;
        break;
      case 'heal': {
        if (fromPlayer) this.heal('player', 0, eff.amount);
        else {
          const src = ctx.source as EnemyState;
          this.heal('enemy', src.uid, eff.amount);
        }
        break;
      }
      case 'loseHp':
        this.loseHpDirect(fromPlayer ? s.player : (ctx.source as EnemyState), fromPlayer ? 'player' : 'enemy', fromPlayer ? 0 : (ctx.source as EnemyState).uid, eff.amount);
        break;
      case 'gainBudget':
        this.host.gainBudget(this.resolveAmount(eff.amount, ctx));
        break;
      case 'loseBudget':
        this.host.loseBudget(eff.amount);
        this.events.emit('message', { text: `Lost ${eff.amount} Budget!` });
        break;
      case 'scry':
        this.scry(eff.count);
        break;
      case 'addCard': {
        const count = eff.count ?? 1;
        for (let i = 0; i < count; i++) {
          const inst = makeInstance(eff.cardId);
          if (eff.freeThisCombat) inst.freeThisCombat = true;
          if (eff.where === 'hand' && s.hand.length < MAX_HAND) s.hand.push(inst);
          else if (eff.where === 'draw') s.drawPile.splice(this.host.rng.int(0, s.drawPile.length), 0, inst);
          else s.discardPile.push(inst);
        }
        break;
      }
      case 'exhaustRandomHand': {
        for (let i = 0; i < eff.count && s.hand.length > 0; i++) {
          const card = this.host.rng.pick(s.hand);
          s.hand = s.hand.filter((c) => c !== card);
          this.exhaust(card);
        }
        break;
      }
      case 'upgradeAllInHand':
        for (const c of s.hand) c.upgraded = true;
        break;
      case 'executeBelow': {
        for (const t of this.resolveEnemyTargets('enemy', ctx)) {
          if (!t.dead && t.hp / t.maxHp <= eff.pct / 100) {
            this.events.emit('message', { text: 'Killed the feature!' });
            this.killEnemy(t);
          }
        }
        break;
      }
      case 'custom': {
        const handler = this.host.content.customEffects[eff.id];
        if (!handler) throw new Error(`Unknown custom effect: ${eff.id}`);
        handler(this, ctx, eff.arg);
        break;
      }
    }
  }

  resolveAmount(amount: Amount, ctx: EffectCtx): number {
    if (typeof amount === 'number') return amount;
    const s = this.state;
    const mult = amount.mult ?? 1;
    let scaled = 0;
    switch (amount.scale) {
      case 'perCardInHand': scaled = s.hand.length; break;
      case 'perCardPlayedThisTurn': scaled = s.cardsPlayedThisTurn; break;
      case 'perExhausted': scaled = s.exhaustPile.length; break;
      case 'perMomentum': scaled = s.player.statuses.momentum ?? 0; break;
      case 'xEnergy': scaled = ctx.xSpent ?? 0; break;
      case 'blockHalf': scaled = Math.floor(s.player.block / 2); break;
      case undefined: scaled = 0; break;
    }
    return amount.base + Math.floor(scaled * mult);
  }

  private resolveEnemyTargets(target: TargetSpec, ctx: EffectCtx): EnemyState[] {
    const s = this.state;
    switch (target) {
      case 'enemy': {
        const t = s.enemies.find((e) => e.uid === ctx.targetUid && !e.dead)
          ?? this.randomAliveEnemy();
        return t ? [t] : [];
      }
      case 'allEnemies':
        return s.enemies.filter((e) => !e.dead);
      case 'randomEnemy': {
        const t = this.randomAliveEnemy();
        return t ? [t] : [];
      }
      case 'self':
        return [];
    }
  }

  randomAliveEnemy(): EnemyState | null {
    const alive = this.state.enemies.filter((e) => !e.dead);
    return alive.length ? this.host.rng.pick(alive) : null;
  }

  // --- damage / block / status primitives ---

  dealDamage(
    source: 'player' | EnemyState,
    target: 'player' | EnemyState,
    base: number,
    isAttack: boolean,
    cardDef: CardDef | null = null,
  ): void {
    const s = this.state;
    const srcCreature: CreatureState = source === 'player' ? s.player : source;
    const tgtCreature: CreatureState = target === 'player' ? s.player : target;
    const side = target === 'player' ? 'player' : 'enemy';
    const uid = target === 'player' ? 0 : target.uid;

    let amt = base;
    if (isAttack) {
      amt += srcCreature.statuses.momentum ?? 0;
      if (source !== 'player' && this.host.ascension >= 2) amt += 1;
      if (source === 'player') {
        for (const h of this.relicHooks()) {
          if (h.modifyAttackDamage) amt = h.modifyAttackDamage(this, amt, cardDef);
        }
      }
      if (srcCreature.statuses.distracted) amt = Math.floor(amt * 0.75);
    }
    if (tgtCreature.statuses.exposed) amt = Math.floor(amt * 1.5);
    if (tgtCreature.statuses.headsDown) amt = Math.min(amt, 1);
    amt = Math.max(0, amt);

    const blocked = Math.min(tgtCreature.block, amt);
    tgtCreature.block -= blocked;
    const hpLoss = amt - blocked;
    tgtCreature.hp -= hpLoss;
    if (target !== 'player') s.damageDealt += hpLoss;

    this.events.emit('damage', { side, uid, amount: hpLoss, blocked });

    // Pushback (thorns) hits the attacker with direct damage
    if (isAttack && tgtCreature.statuses.pushback && !this.isDead(srcCreature)) {
      const thorns = tgtCreature.statuses.pushback;
      this.loseHpDirect(
        srcCreature,
        source === 'player' ? 'player' : 'enemy',
        source === 'player' ? 0 : source.uid,
        thorns,
        true,
      );
    }

    this.handleDeaths();
  }

  /** direct hp loss respecting block=no, headsDown=no (thorns/techDebt/costs) */
  loseHpDirect(creature: CreatureState, side: 'player' | 'enemy', uid: number, amount: number, viaThorns = false): void {
    void viaThorns;
    creature.hp -= amount;
    this.events.emit('damage', { side, uid, amount, blocked: 0 });
    this.handleDeaths();
  }

  gainBlock(creature: CreatureState, side: 'player' | 'enemy', uid: number, base: number, fromCard: boolean): void {
    let amt = base;
    if (fromCard) amt += creature.statuses.craft ?? 0;
    if (creature.statuses.burnout) amt = Math.floor(amt * 0.75);
    amt = Math.max(0, amt);
    creature.block += amt;
    this.events.emit('blockGained', { side, uid, amount: amt });
  }

  addStatus(side: 'player' | 'enemy', uid: number, status: StatusId, stacks: number): void {
    const s = this.state;
    const creature: CreatureState | undefined =
      side === 'player' ? s.player : s.enemies.find((e) => e.uid === uid);
    if (!creature) return;
    const def = STATUSES[status];

    // Alignment (artifact) negates incoming debuffs
    if (def.isDebuff && stacks > 0 && (creature.statuses.alignment ?? 0) > 0) {
      creature.statuses.alignment! -= 1;
      if (creature.statuses.alignment === 0) delete creature.statuses.alignment;
      this.events.emit('statusApplied', { side, uid, status, stacks, negated: true });
      return;
    }

    const current = creature.statuses[status] ?? 0;
    const next = def.stackMode === 'boolean' ? Math.max(current, stacks > 0 ? 1 : 0) : current + stacks;
    if (next <= 0) delete creature.statuses[status];
    else creature.statuses[status] = next;
    this.events.emit('statusApplied', { side, uid, status, stacks, negated: false });
  }

  heal(side: 'player' | 'enemy', uid: number, amount: number): void {
    const s = this.state;
    const creature = side === 'player' ? s.player : s.enemies.find((e) => e.uid === uid);
    if (!creature) return;
    if (side === 'player' && s.player.statuses.noHeal) return;
    const healed = Math.min(amount, creature.maxHp - creature.hp);
    if (healed <= 0) return;
    creature.hp += healed;
    this.events.emit('healed', { side, uid, amount: healed });
  }

  private tickTechDebt(creature: CreatureState, side: 'player' | 'enemy', uid: number): void {
    const n = creature.statuses.techDebt ?? 0;
    if (n <= 0) return;
    this.loseHpDirect(creature, side, uid, n);
    if (n - 1 <= 0) delete creature.statuses.techDebt;
    else creature.statuses.techDebt = n - 1;
  }

  private decayDurations(creature: CreatureState): void {
    for (const key of Object.keys(creature.statuses) as StatusId[]) {
      if (!STATUSES[key].turnDecay) continue;
      const next = (creature.statuses[key] ?? 0) - 1;
      if (next <= 0) delete creature.statuses[key];
      else creature.statuses[key] = next;
    }
  }

  private isDead(c: CreatureState): boolean {
    return c.hp <= 0;
  }

  private handleDeaths(): void {
    const s = this.state;
    for (const e of s.enemies) {
      if (!e.dead && e.hp <= 0) this.killEnemy(e);
    }
    this.checkCombatEnd();
  }

  killEnemy(e: EnemyState): void {
    if (e.dead) return;
    e.hp = Math.min(e.hp, 0);
    const def = this.enemyDef(e);
    if (def.onDeath && !e.flags.deathHandled) {
      e.flags.deathHandled = 1;
      this.applyEffects(def.onDeath, { source: e });
      if (e.hp > 0) {
        // revived (Burnout Phoenix)
        delete e.flags.deathHandled;
        this.rollIntent(e);
        return;
      }
    }
    e.dead = true;
    e.block = 0;
    e.statuses = {};
    this.events.emit('enemyDied', { uid: e.uid, defId: e.defId });
  }

  private checkCombatEnd(): void {
    const s = this.state;
    if (s.over) return;
    if (s.player.hp <= 0) {
      s.player.hp = 0;
      s.over = 'lose';
    } else if (s.enemies.every((e) => e.dead)) {
      s.over = 'win';
    } else {
      return;
    }
    s.pendingChoice = null;
    for (const h of this.relicHooks()) h.onCombatEnd?.(this, s.over);
    this.events.emit('combatEnded', { result: s.over });
  }

  // --- draw / discard / exhaust / scry ---

  draw(count: number): void {
    const s = this.state;
    const drawn: CardInstance[] = [];
    for (let i = 0; i < count; i++) {
      if (s.hand.length >= MAX_HAND) break;
      if (s.drawPile.length === 0) {
        if (s.discardPile.length === 0) break;
        s.drawPile = this.host.rng.shuffle(s.discardPile);
        s.discardPile = [];
      }
      const card = s.drawPile.pop()!;
      s.hand.push(card);
      drawn.push(card);
      const d = this.def(card);
      if (d.onDraw) this.applyEffects(d.onDraw, { source: 'player', card });
    }
    if (drawn.length) this.events.emit('drawn', { cards: drawn });
  }

  exhaust(card: CardInstance, removeFromHand = true): void {
    const s = this.state;
    if (removeFromHand) s.hand = s.hand.filter((c) => c !== card);
    s.exhaustPile.push(card);
    this.events.emit('cardExhausted', { card });
    const ab = s.player.statuses.archiveBuffer;
    if (ab) this.gainBlock(s.player, 'player', 0, ab, false);
    const ad = s.player.statuses.archiveDraw;
    if (ad) this.draw(ad);
    for (const h of this.relicHooks()) h.onExhaust?.(this, card);
  }

  scry(count: number): void {
    const s = this.state;
    if (s.over) return;
    const top: CardInstance[] = [];
    for (let i = 0; i < count && s.drawPile.length > 0; i++) top.push(s.drawPile.pop()!);
    if (top.length === 0) return;
    this.requestChoice({
      prompt: `Scry ${top.length}: choose cards to discard`,
      cards: top,
      min: 0,
      max: top.length,
      apply: (uids) => {
        // non-selected go back on top (same order), selected are discarded
        for (let i = top.length - 1; i >= 0; i--) {
          const card = top[i]!;
          if (uids.includes(card.uid)) s.discardPile.push(card);
          else s.drawPile.push(card);
        }
      },
    });
  }

  requestChoice(choice: Omit<PendingChoice, 'id'>): void {
    this.state.pendingChoice = { ...choice, id: choiceIdCounter++ };
    this.events.emit('choiceRequested', { prompt: choice.prompt });
    this.changed();
  }

  resolveChoice(selectedUids: number[]): void {
    const s = this.state;
    const choice = s.pendingChoice;
    if (!choice) return;
    const valid = selectedUids.filter((uid) => choice.cards.some((c) => c.uid === uid));
    if (valid.length < choice.min || valid.length > choice.max) return;
    s.pendingChoice = null;
    choice.apply(valid);
    this.checkCombatEnd();
    this.changed();
  }

  // --- enemy intents ---

  rollIntent(e: EnemyState): void {
    const def = this.enemyDef(e);
    const key = def.ai({
      turn: this.state?.turn ?? 0,
      history: e.history,
      hpPct: e.hp / e.maxHp,
      rng: this.host.rng,
      flags: e.flags,
    });
    e.currentMove = key;
  }

  intentView(e: EnemyState): IntentView {
    const def = this.enemyDef(e);
    const move = def.moves[e.currentMove];
    if (!move) return { kind: 'unknown', name: '?' };
    let damage: number | undefined;
    let times: number | undefined;
    for (const eff of move.effects) {
      if (eff.kind === 'damage') {
        let amt = (typeof eff.amount === 'number' ? eff.amount : eff.amount.base) + (e.statuses.momentum ?? 0);
        if (this.host.ascension >= 2) amt += 1;
        if (e.statuses.distracted) amt = Math.floor(amt * 0.75);
        if (this.state.player.statuses.exposed) amt = Math.floor(amt * 1.5);
        damage = Math.max(0, amt);
        times = typeof eff.times === 'number' ? eff.times : 1;
      }
    }
    return { kind: move.intent, name: move.name, damage, times };
  }

  private changed(): void {
    this.events.emit('stateChanged', { state: this.state });
  }
}
