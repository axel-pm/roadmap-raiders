// Status registry + keyword tooltip text. PM names, StS souls.

import type { StatusDef, StatusId, CardKeyword } from '../engine/types';

export const STATUSES: Record<StatusId, StatusDef> = {
  momentum: {
    id: 'momentum', name: 'Momentum', emoji: '💪', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Deals ${n} additional damage with attacks.`,
  },
  craft: {
    id: 'craft', name: 'Craft', emoji: '🎨', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Gains ${n} additional Buffer from cards.`,
  },
  exposed: {
    id: 'exposed', name: 'Exposed', emoji: '🎯', stackMode: 'duration', isDebuff: true, turnDecay: true,
    description: (n) => `Takes 50% more damage for ${n} turn${n === 1 ? '' : 's'}.`,
  },
  distracted: {
    id: 'distracted', name: 'Distracted', emoji: '💫', stackMode: 'duration', isDebuff: true, turnDecay: true,
    description: (n) => `Deals 25% less damage for ${n} turn${n === 1 ? '' : 's'}.`,
  },
  burnout: {
    id: 'burnout', name: 'Burnout', emoji: '🔥', stackMode: 'duration', isDebuff: true, turnDecay: true,
    description: (n) => `Gains 25% less Buffer for ${n} turn${n === 1 ? '' : 's'}.`,
  },
  techDebt: {
    id: 'techDebt', name: 'Tech Debt', emoji: '🧱', stackMode: 'intensity', isDebuff: true,
    description: (n) => `Takes ${n} damage at the start of its turn, then Tech Debt is reduced by 1.`,
  },
  pushback: {
    id: 'pushback', name: 'Pushback', emoji: '🌵', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Attackers take ${n} damage when they hit this creature.`,
  },
  alignment: {
    id: 'alignment', name: 'Alignment', emoji: '🧭', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Negates the next ${n} debuff${n === 1 ? '' : 's'}.`,
  },
  headsDown: {
    id: 'headsDown', name: 'Heads-Down', emoji: '👻', stackMode: 'duration', isDebuff: false, turnDecay: true,
    description: (n) => `Reduces ALL damage taken to 1 for ${n} turn${n === 1 ? '' : 's'}.`,
  },
  hype: {
    id: 'hype', name: 'Hype', emoji: '📈', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Gains ${n} Momentum at the end of its turn.`,
  },
  barricade: {
    id: 'barricade', name: 'Vision Locked', emoji: '📜', stackMode: 'boolean', isDebuff: false,
    description: () => `Buffer no longer expires at the start of the turn.`,
  },
  drawNextTurn: {
    id: 'drawNextTurn', name: 'Prepared', emoji: '📋', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Draws ${n} additional card${n === 1 ? '' : 's'} next turn.`,
  },
  echo: {
    id: 'echo', name: 'Echo', emoji: '🔁', stackMode: 'intensity', isDebuff: false,
    description: (n) => `The next ${n} card${n === 1 ? '' : 's'} played this turn ${n === 1 ? 'is' : 'are'} played twice.`,
  },
  noHeal: {
    id: 'noHeal', name: 'No Rest', emoji: '🚫', stackMode: 'boolean', isDebuff: true,
    description: () => `Cannot heal Morale.`,
  },
  flywheel: {
    id: 'flywheel', name: 'Flywheel', emoji: '⚙️', stackMode: 'boolean', isDebuff: false,
    description: () => `At the end of your turn, deal damage equal to half your Buffer to a random enemy.`,
  },
  foresight: {
    id: 'foresight', name: 'Foresight', emoji: '🔮', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Scry ${n} at the start of each turn.`,
  },
  regen: {
    id: 'regen', name: 'Recharge', emoji: '💚', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Heals ${n} Morale at the start of each turn.`,
  },
  momentumDown: {
    id: 'momentumDown', name: 'Sprint Fatigue', emoji: '📉', stackMode: 'intensity', isDebuff: true,
    description: (n) => `Loses ${n} Momentum at the end of the turn.`,
  },
  strengthPerTurn: {
    id: 'strengthPerTurn', name: 'OKR Cadence', emoji: '🎯', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Gains ${n} Momentum at the start of each turn.`,
  },
  energizedEveryTurn: {
    id: 'energizedEveryTurn', name: 'Energized', emoji: '⚡', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Gains ${n} additional Bandwidth each turn.`,
  },
  doubleFirstSkill: {
    id: 'doubleFirstSkill', name: 'Automation', emoji: '🤖', stackMode: 'boolean', isDebuff: false,
    description: () => `The first Skill played each turn is played twice.`,
  },
  attackDraw: {
    id: 'attackDraw', name: 'Shipping Culture', emoji: '🚢', stackMode: 'intensity', isDebuff: false,
    description: (n) => `The first ${n} Attack${n === 1 ? '' : 's'} played each turn draw${n === 1 ? 's' : ''} a card.`,
  },
  drawEveryTurn: {
    id: 'drawEveryTurn', name: 'Growth Model', emoji: '📊', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Draws ${n} additional card${n === 1 ? '' : 's'} each turn.`,
  },
  archiveBuffer: {
    id: 'archiveBuffer', name: 'Compounding', emoji: '🌀', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Gains ${n} Buffer whenever one of your cards is Archived.`,
  },
  archiveDraw: {
    id: 'archiveDraw', name: 'Lean Loop', emoji: '♻️', stackMode: 'intensity', isDebuff: false,
    description: (n) => `Draws ${n} card${n === 1 ? '' : 's'} whenever one of your cards is Archived.`,
  },
  exposeRetal: {
    id: 'exposeRetal', name: 'Reserved', emoji: '❔', stackMode: 'intensity', isDebuff: false,
    description: () => ``,
  },
};

export const KEYWORD_TEXT: Record<CardKeyword, { name: string; text: string }> = {
  archive: { name: 'Archive', text: 'When played, this card is removed for the rest of the combat.' },
  dayOne: { name: 'Day One', text: 'Starts in your opening hand.' },
  pinned: { name: 'Pinned', text: 'Not discarded at the end of your turn.' },
  fomo: { name: 'FOMO', text: 'If this card is still in your hand at the end of your turn, it is Archived.' },
  unplayable: { name: 'Unplayable', text: 'This card cannot be played.' },
};

export const TERMS = {
  bandwidth: { name: 'Bandwidth', emoji: '⚡', text: 'Energy to play cards. Refills to max each turn.' },
  morale: { name: 'Morale', emoji: '❤️', text: 'Your HP. Reach 0 and the run ends.' },
  buffer: { name: 'Buffer', emoji: '🛡️', text: 'Blocks incoming damage. Expires at the start of your turn.' },
  budget: { name: 'Budget', emoji: '💰', text: 'Currency for shops and events.' },
  coffee: { name: 'Coffee', emoji: '☕', text: 'Consumable. Drink anytime during combat for a one-shot effect.' },
  scry: { name: 'Scry', emoji: '🔍', text: 'Look at the top cards of your draw pile. Discard any of them.' },
};
