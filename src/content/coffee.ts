// Coffee: consumables you can drink any time during combat (StS potions).

import type { CoffeeDef } from '../engine/types';

const c = (def: CoffeeDef): CoffeeDef => def;

export const COFFEES: CoffeeDef[] = [
  c({
    id: 'espresso', name: 'Espresso', emoji: '☕', rarity: 'common',
    description: 'Gain 1 Bandwidth.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'gainEnergy', count: 1 }],
  }),
  c({
    id: 'cold_brew', name: 'Cold Brew', emoji: '🧋', rarity: 'common',
    description: 'Draw 3 cards.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'draw', count: 3 }],
  }),
  c({
    id: 'decaf', name: 'Decaf', emoji: '🍵', rarity: 'common',
    description: 'Gain 8 Buffer.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'block', amount: 8 }],
  }),
  c({
    id: 'double_shot', name: 'Double Shot', emoji: '🥃', rarity: 'uncommon',
    description: 'The next card you play this turn is played twice.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'applyStatus', status: 'echo', stacks: 1, target: 'self' }],
  }),
  c({
    id: 'nitro', name: 'Nitro Brew', emoji: '🫗', rarity: 'uncommon',
    description: 'Deal 5 damage to ALL enemies and apply 1 Exposed.',
    target: 'none', combatOnly: true,
    effects: [
      { kind: 'damage', amount: 5, target: 'allEnemies' },
      { kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'allEnemies' },
    ],
  }),
  c({
    id: 'chamomile', name: 'Chamomile', emoji: '🌼', rarity: 'common',
    description: 'Heal 12 Morale.',
    target: 'none', combatOnly: false,
    effects: [{ kind: 'heal', amount: 12 }],
  }),
  c({
    id: 'matcha', name: 'Matcha', emoji: '🍡', rarity: 'uncommon',
    description: 'Gain 2 Craft.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'applyStatus', status: 'craft', stacks: 2, target: 'self' }],
  }),
  c({
    id: 'red_eye', name: 'Red Eye', emoji: '🩸', rarity: 'uncommon',
    description: 'Gain 2 Momentum.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'applyStatus', status: 'momentum', stacks: 2, target: 'self' }],
  }),
  c({
    id: 'affogato', name: 'Affogato', emoji: '🍨', rarity: 'uncommon',
    description: 'Remove all your debuffs.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'removeDebuffs', target: 'self' }],
  }),
  c({
    id: 'founders_blend', name: "Founder's Blend", emoji: '⚗️', rarity: 'rare',
    description: 'Gain 2 Bandwidth and draw 2 cards.',
    target: 'none', combatOnly: true,
    effects: [{ kind: 'gainEnergy', count: 2 }, { kind: 'draw', count: 2 }],
  }),
];

export const COFFEES_BY_ID: Record<string, CoffeeDef> = Object.fromEntries(
  COFFEES.map((x) => [x.id, x]),
);
