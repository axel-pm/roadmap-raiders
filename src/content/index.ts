// Assembles the Content registry the engine consumes.

import type { Content } from '../engine/combat/engine';
import type { CardDef, EnemyDef, EncounterDef } from '../engine/types';
import { ALL_TACTIC_CARDS } from './cards/tactics';
import { generateAllGuestCards } from './guests/generate';
import { CUSTOM_EFFECTS, setCardPoolGetter } from './customEffects';
import { ACT1_ENEMIES, ACT1_ELITES, ACT1_BOSS, ACT1_ENCOUNTERS } from './enemies/act1';
import { ACT2_ENEMIES, ACT2_ELITES, ACT2_BOSS, ACT2_ENCOUNTERS } from './enemies/act2';
import { ACT3_ENEMIES, ACT3_ELITES, ACT3_BOSS, ACT3_ENCOUNTERS } from './enemies/act3';
import { RELIC_COMBAT_HOOKS } from './relics';

export const GUEST_CARDS: CardDef[] = generateAllGuestCards();

export const ALL_CARDS: CardDef[] = [...ALL_TACTIC_CARDS, ...GUEST_CARDS];

export const CARDS_BY_ID: Record<string, CardDef> = Object.fromEntries(
  ALL_CARDS.map((c) => [c.id, c]),
);

export const ALL_ENEMIES: EnemyDef[] = [
  ...ACT1_ENEMIES, ...ACT1_ELITES, ACT1_BOSS,
  ...ACT2_ENEMIES, ...ACT2_ELITES, ...ACT2_BOSS,
  ...ACT3_ENEMIES, ...ACT3_ELITES, ACT3_BOSS,
];

export const ENEMIES_BY_ID: Record<string, EnemyDef> = Object.fromEntries(
  ALL_ENEMIES.map((e) => [e.id, e]),
);

export const ALL_ENCOUNTERS: EncounterDef[] = [
  ...ACT1_ENCOUNTERS, ...ACT2_ENCOUNTERS, ...ACT3_ENCOUNTERS,
];

setCardPoolGetter((rarity) => {
  if (rarity === 'guest') return GUEST_CARDS;
  return ALL_TACTIC_CARDS.filter((c) => c.rarity === rarity);
});

export const CONTENT: Content = {
  cards: CARDS_BY_ID,
  enemies: ENEMIES_BY_ID,
  customEffects: CUSTOM_EFFECTS,
  relicHooks: RELIC_COMBAT_HOOKS,
};

/** rarity pool helper for rewards/shops */
export function cardPool(rarity: 'common' | 'uncommon' | 'rare'): CardDef[] {
  return ALL_TACTIC_CARDS.filter((c) => c.rarity === rarity);
}

/** obtainable tactic cards for the compendium (no curses/statuses) */
export const ALL_TACTIC_CARDS_PUBLIC: CardDef[] = ALL_TACTIC_CARDS.filter(
  (c) => c.type !== 'curse' && c.type !== 'status',
);

export const STARTER_DECK: string[] = [
  'ship_it', 'ship_it', 'ship_it', 'ship_it', 'ship_it',
  'say_no', 'say_no', 'say_no', 'say_no',
  'user_interview',
];
