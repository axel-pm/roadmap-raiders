// Shared content + engine types. All game content (cards, enemies, relics,
// events) is data conforming to these shapes; the engine interprets them.

import type { Rng } from '../core/rng';

export type Domain =
  | 'Leadership' | 'Growth' | 'Strategy' | 'Revenue'
  | 'Data' | 'AI' | 'Design' | 'Execution';

export type CardType = 'attack' | 'skill' | 'power' | 'curse' | 'status';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';

/** Who an effect targets. 'enemy' requires the player to pick a target. */
export type TargetSpec = 'enemy' | 'allEnemies' | 'randomEnemy' | 'self';

// --- Statuses (PM-themed names, StS analogs in comments) ---
export type StatusId =
  | 'momentum'     // Strength: +N damage per hit
  | 'craft'        // Dexterity: +N block per block gain from cards
  | 'exposed'      // Vulnerable: +50% damage taken
  | 'distracted'   // Weak: -25% damage dealt
  | 'burnout'      // Frail: -25% block gained
  | 'techDebt'     // Poison: N damage at turn start, then -1
  | 'pushback'     // Thorns: attacker takes N when hitting you
  | 'alignment'    // Artifact: negate next debuff
  | 'headsDown'    // Intangible: reduce all damage taken to 1
  | 'hype'         // Ritual: gain N momentum at end of own turn
  | 'barricade'    // Block no longer decays at turn start
  | 'drawNextTurn' // internal: draw +N next turn, then clears
  | 'echo'         // next card this turn is played twice (N charges)
  | 'noHeal'       // cannot heal (Founder's Zeal)
  | 'flywheel'     // end of turn: deal block/2 damage to random enemy
  | 'foresight'    // scry N at start of each turn
  | 'regen'        // heal N at start of turn (Weekly 1:1)
  | 'momentumDown' // internal: lose N momentum at end of turn (temp strength)
  | 'strengthPerTurn' // OKRs power: gain N momentum each turn start
  | 'energizedEveryTurn' // +N energy each turn (Founder's Zeal / PMF relic analog)
  | 'doubleFirstSkill'   // Automation: first skill each turn played twice
  | 'attackDraw'   // Culture of Shipping: draw 1 when you play an attack (N/turn)
  | 'drawEveryTurn' // Growth Model: draw +N each turn
  | 'archiveBuffer' // Compounding: gain N Buffer whenever a card is Archived
  | 'archiveDraw'   // Lean Loop: draw N whenever a card is Archived
  | 'exposeRetal'; // unused hook reserve

export type StatusStackMode = 'intensity' | 'duration' | 'boolean';

export interface StatusDef {
  id: StatusId;
  name: string;
  emoji: string;
  stackMode: StatusStackMode;
  isDebuff: boolean;
  /** decays by 1 at end of the owner's turn */
  turnDecay?: boolean;
  description: (stacks: number) => string;
}

// --- Effects: the atoms cards/enemies/relics are made of ---
export type Amount =
  | number
  | {
      base: number;
      /** dynamic scaling resolved at play time */
      scale?:
        | 'perCardInHand'
        | 'perCardPlayedThisTurn'
        | 'perExhausted'
        | 'perMomentum'
        | 'xEnergy'
        | 'blockHalf';
      mult?: number; // multiplier on the scaled part (default 1)
    };

export type Effect =
  | { kind: 'damage'; amount: Amount; times?: number | 'x'; target?: TargetSpec }
  | { kind: 'block'; amount: Amount }
  | { kind: 'applyStatus'; status: StatusId; stacks: number; target: TargetSpec }
  | { kind: 'removeDebuffs'; target: TargetSpec }
  | { kind: 'draw'; count: number }
  | { kind: 'gainEnergy'; count: number }
  | { kind: 'heal'; amount: number; target?: TargetSpec }
  | { kind: 'loseHp'; amount: number } // self, ignores block
  | { kind: 'gainBudget'; amount: Amount }
  | { kind: 'loseBudget'; amount: number } // enemy steal
  | { kind: 'scry'; count: number }
  | { kind: 'addCard'; cardId: string; where: 'hand' | 'discard' | 'draw'; count?: number; freeThisCombat?: boolean }
  | { kind: 'exhaustRandomHand'; count: number }
  | { kind: 'upgradeAllInHand' }
  | { kind: 'executeBelow'; pct: number } // Kill the Feature
  | { kind: 'custom'; id: string; arg?: number };

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  cost: number | 'X' | null; // null = unplayable
  target: TargetSpec | 'none';
  effects: Effect[];
  /** overrides applied when upgraded; name gets a "+" suffix automatically */
  upgrade?: {
    cost?: number | 'X';
    effects?: Effect[];
    keywords?: CardKeyword[];
    text?: string;
  };
  keywords?: CardKeyword[];
  /** display text; auto-generated if omitted */
  text?: string;
  upgradeText?: string;
  flavor?: string;
  guest?: { guestId: string; domain: Domain; episodeTitle: string };
  emoji: string;
  domain?: Domain;
  /** end-of-turn trigger for curses (e.g. Scope Creep replicates) */
  endOfTurnInHand?: Effect[];
  /** triggered when drawn (Bug Report) */
  onDraw?: Effect[];
}

export type CardKeyword =
  | 'archive'   // Exhaust
  | 'dayOne'    // Innate
  | 'pinned'    // Retain
  | 'fomo'      // Ethereal
  | 'unplayable';

export interface CardInstance {
  uid: number;
  defId: string;
  upgraded: boolean;
  /** cost override for this combat (A/B Test, Acquihire) */
  freeThisCombat?: boolean;
}

// --- Enemies ---
export type IntentKind = 'attack' | 'attackDebuff' | 'attackDefend' | 'defend' | 'buff' | 'debuff' | 'unknown' | 'stunned';

export interface MoveDef {
  intent: IntentKind;
  effects: Effect[];
  /** shown label, e.g. "Just One More Thing" */
  name: string;
}

export interface EnemyAiCtx {
  turn: number; // 1-based
  history: string[]; // move keys, most recent last
  hpPct: number;
  rng: Rng;
  flags: Record<string, number>;
}

export interface EnemyDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  hp: [number, number];
  moves: Record<string, MoveDef>;
  ai: (ctx: EnemyAiCtx) => string;
  onSpawn?: Effect[]; // applied to self at combat start
  /** for multi-part fights and bosses */
  onDeath?: Effect[];
}

export type RoomType = 'monster' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'boss';

export interface EncounterDef {
  id: string;
  enemies: string[]; // enemy def ids
  act: 1 | 2 | 3;
  pool: 'weak' | 'normal' | 'elite' | 'boss';
}

// --- Relics ---
export type RelicRarity = 'starterBonus' | 'common' | 'uncommon' | 'rare' | 'boss' | 'event';

export interface RelicDef {
  id: string;
  name: string;
  emoji: string;
  rarity: RelicRarity;
  description: string;
  /** engine hooks are looked up by relic id in engine/run code */
}

export interface RelicInstance {
  defId: string;
  counter: number;
}

// --- Coffee (potions) ---
export interface CoffeeDef {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
  target: 'enemy' | 'none';
  effects: Effect[];
  combatOnly: boolean;
}
