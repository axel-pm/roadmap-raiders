// Handcrafted cards for the top-10 guests by views — the famous names get
// signature mechanics instead of generated ones.

import type { CardDef } from '../../engine/types';
import type { GuestData } from './generate';

type OverrideFn = (g: GuestData) => CardDef;

const meta = (g: GuestData): Pick<CardDef, 'rarity' | 'guest' | 'domain' | 'emoji' | 'flavor'> => ({
  rarity: 'special',
  guest: { guestId: g.id, domain: g.domain, episodeTitle: g.episodeTitle },
  domain: g.domain,
  emoji: '🎙️',
  flavor: g.quotes[0],
});

export const GUEST_OVERRIDES: Record<string, OverrideFn> = {
  // #1 Eric Ries — Lean Startup: build-measure-learn as an archive engine
  'guest_eric-ries': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'power', cost: 2, target: 'none',
    effects: [{ kind: 'custom', id: 'leanLoop' }],
    upgrade: { cost: 1 },
    text: 'Whenever a card is Archived, draw 1 card.',
  }),

  // #2 Jason Lemkin — SaaS grinder: durable defense
  'guest_jason-m-lemkin': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 1, target: 'none',
    effects: [{ kind: 'block', amount: 10 }, { kind: 'heal', amount: 3 }],
    upgrade: { effects: [{ kind: 'block', amount: 14 }, { kind: 'heal', amount: 4 }], text: 'Gain 14 Buffer. Heal 4 Morale.' },
    text: 'Gain 10 Buffer. Heal 3 Morale.',
  }),

  // #3 Jeff Weinstein — customer obsession: expose their weaknesses
  'guest_jeff-weinstein': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 0, target: 'enemy',
    effects: [
      { kind: 'applyStatus', status: 'exposed', stacks: 2, target: 'enemy' },
      { kind: 'draw', count: 1 },
    ],
    upgrade: {
      effects: [
        { kind: 'applyStatus', status: 'exposed', stacks: 3, target: 'enemy' },
        { kind: 'draw', count: 1 },
      ],
      text: 'Apply 3 Exposed. Draw 1 card.',
    },
    text: 'Apply 2 Exposed. Draw 1 card.',
  }),

  // #4 Grant Lee — Gamma: momentum from storytelling
  'guest_grant-lee': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 1, target: 'none',
    effects: [{ kind: 'draw', count: 3 }, { kind: 'addCard', cardId: 'doubt', where: 'discard' }],
    upgrade: { effects: [{ kind: 'draw', count: 3 }], text: 'Draw 3 cards.' },
    text: 'Draw 3 cards. Add a Doubt to your discard pile.',
  }),

  // #5 Evan LaPointe — how brains work: think, then act twice
  'guest_evan-lapointe': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 1, target: 'none',
    effects: [
      { kind: 'applyStatus', status: 'echo', stacks: 1, target: 'self' },
      { kind: 'scry', count: 2 },
    ],
    upgrade: {
      effects: [
        { kind: 'applyStatus', status: 'echo', stacks: 2, target: 'self' },
        { kind: 'scry', count: 2 },
      ],
      text: 'The next 2 cards you play this turn are played twice. Scry 2.',
    },
    text: 'The next card you play this turn is played twice. Scry 2.',
  }),

  // #6 Eli Schwartz — SEO compounding: slow start, big payoff
  'guest_eli-schwartz': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'power', cost: 1, target: 'none',
    effects: [{ kind: 'applyStatus', status: 'drawEveryTurn', stacks: 1, target: 'self' }],
    upgrade: { cost: 0 },
    text: 'Draw 1 additional card each turn.',
  }),

  // #7 Hilary Gridley — great managers: heal and empower
  'guest_hilary-gridley': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 1, target: 'none',
    effects: [
      { kind: 'heal', amount: 5 },
      { kind: 'applyStatus', status: 'craft', stacks: 1, target: 'self' },
    ],
    upgrade: {
      effects: [
        { kind: 'heal', amount: 7 },
        { kind: 'applyStatus', status: 'craft', stacks: 1, target: 'self' },
      ],
      text: 'Heal 7 Morale. Gain 1 Craft.',
    },
    text: 'Heal 5 Morale. Gain 1 Craft.',
  }),

  // #8 Marc Andreessen — PMF or die: all-in aggression
  'guest_marc-andreessen': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'attack', cost: 1, target: 'enemy',
    keywords: ['archive'],
    effects: [{ kind: 'custom', id: 'pmfOrDie', arg: 6 }],
    upgrade: { effects: [{ kind: 'custom', id: 'pmfOrDie', arg: 8 }], text: 'Archive your hand. Deal 8 damage for each card Archived.' },
    text: 'Archive your hand. Deal 6 damage for each card Archived.',
  }),

  // #9 Peter Deng — team builder: alignment and calm
  'guest_peter-deng': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 1, target: 'none',
    effects: [
      { kind: 'applyStatus', status: 'alignment', stacks: 1, target: 'self' },
      { kind: 'block', amount: 6 },
      { kind: 'heal', amount: 2 },
    ],
    upgrade: {
      effects: [
        { kind: 'applyStatus', status: 'alignment', stacks: 2, target: 'self' },
        { kind: 'block', amount: 6 },
        { kind: 'heal', amount: 2 },
      ],
      text: 'Gain 2 Alignment, 6 Buffer. Heal 2 Morale.',
    },
    text: 'Gain 1 Alignment, 6 Buffer. Heal 2 Morale.',
  }),

  // #10 Farhan Thawar — pair programming: double output
  'guest_farhan-thawar': (g) => ({
    ...meta(g),
    id: g.id, name: g.name, type: 'skill', cost: 2, target: 'none',
    keywords: ['archive'],
    effects: [{ kind: 'applyStatus', status: 'echo', stacks: 2, target: 'self' }],
    upgrade: { cost: 1 },
    text: 'The next 2 cards you play this turn are played twice. Archive.',
  }),
};
