import type { CardInstance, StatusId, IntentKind } from '../types';

export type Statuses = Partial<Record<StatusId, number>>;

export interface CreatureState {
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
}

export interface EnemyState extends CreatureState {
  uid: number;
  defId: string;
  currentMove: string;
  history: string[];
  /** scratch space for AI (phase flags, revive-used, countdowns) */
  flags: Record<string, number>;
  dead: boolean;
}

export interface IntentView {
  kind: IntentKind;
  name: string;
  damage?: number;
  times?: number;
}

export interface PendingChoice {
  id: number;
  prompt: string;
  cards: CardInstance[];
  min: number;
  max: number;
  /** applied by CombatEngine.resolveChoice with the selected uids */
  apply: (selectedUids: number[]) => void;
}

export interface CombatState {
  turn: number;
  energy: number;
  maxEnergy: number;
  player: CreatureState;
  enemies: EnemyState[];
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  /** powers in play (removed from deck for the combat) */
  powersInPlay: CardInstance[];
  cardsPlayedThisTurn: number;
  attacksPlayedThisTurn: number;
  skillsPlayedThisTurn: number;
  /** uids of cards granted zero cost for this combat */
  over: 'win' | 'lose' | null;
  pendingChoice: PendingChoice | null;
  /** total unblocked damage dealt to enemies (IPO card, score) */
  damageDealt: number;
}
