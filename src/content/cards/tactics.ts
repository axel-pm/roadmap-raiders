// The tactic card pool: starters, commons, uncommons, rares, curses, statuses.
// Guest cards are generated separately in content/guests.

import type { CardDef } from '../../engine/types';

const c = (def: CardDef): CardDef => def;

export const STARTER_CARDS: CardDef[] = [
  c({
    id: 'ship_it', name: 'Ship It', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    emoji: '🚢', effects: [{ kind: 'damage', amount: 6 }],
    upgrade: { effects: [{ kind: 'damage', amount: 9 }], text: 'Deal 9 damage.' },
    text: 'Deal 6 damage.',
    flavor: 'Real artists ship.',
  }),
  c({
    id: 'say_no', name: 'Say No', type: 'skill', rarity: 'starter', cost: 1, target: 'none',
    emoji: '🙅', effects: [{ kind: 'block', amount: 5 }],
    upgrade: { effects: [{ kind: 'block', amount: 8 }], text: 'Gain 8 Buffer.' },
    text: 'Gain 5 Buffer.',
    flavor: 'Strategy is what you don’t do.',
  }),
  c({
    id: 'user_interview', name: 'User Interview', type: 'skill', rarity: 'starter', cost: 1, target: 'enemy',
    emoji: '🎤', effects: [{ kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'enemy' }, { kind: 'draw', count: 1 }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'exposed', stacks: 2, target: 'enemy' }, { kind: 'draw', count: 1 }],
      text: 'Apply 2 Exposed. Draw 1 card.',
    },
    text: 'Apply 1 Exposed. Draw 1 card.',
    flavor: 'Five whys deep, the truth surfaces.',
  }),
];

export const COMMON_CARDS: CardDef[] = [
  // --- attacks ---
  c({
    id: 'hotfix', name: 'Hotfix', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    emoji: '🩹', effects: [{ kind: 'damage', amount: 3 }],
    upgrade: { effects: [{ kind: 'damage', amount: 6 }], text: 'Deal 6 damage.' },
    text: 'Deal 3 damage.',
  }),
  c({
    id: 'double_down', name: 'Double Down', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '🎲', effects: [{ kind: 'damage', amount: 4, times: 2 }],
    upgrade: { effects: [{ kind: 'damage', amount: 5, times: 2 }], text: 'Deal 5 damage twice.' },
    text: 'Deal 4 damage twice.',
  }),
  c({
    id: 'feature_freeze', name: 'Feature Freeze', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '🧊', effects: [{ kind: 'damage', amount: 6 }, { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'enemy' }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 9 }, { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'enemy' }],
      text: 'Deal 9 damage. Apply 1 Distracted.',
    },
    text: 'Deal 6 damage. Apply 1 Distracted.',
  }),
  c({
    id: 'scope_cut', name: 'Scope Cut', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '✂️', effects: [{ kind: 'damage', amount: 7 }, { kind: 'custom', id: 'bonusVsExposed', arg: 4 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 9 }, { kind: 'custom', id: 'bonusVsExposed', arg: 6 }],
      text: 'Deal 9 damage. Deal 6 more if the target is Exposed.',
    },
    text: 'Deal 7 damage. Deal 4 more if the target is Exposed.',
  }),
  c({
    id: 'crunch_time', name: 'Crunch Time', type: 'attack', rarity: 'common', cost: 2, target: 'enemy',
    emoji: '⏰', effects: [{ kind: 'damage', amount: 12 }, { kind: 'applyStatus', status: 'burnout', stacks: 1, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 16 }, { kind: 'applyStatus', status: 'burnout', stacks: 1, target: 'self' }],
      text: 'Deal 16 damage. You gain 1 Burnout.',
    },
    text: 'Deal 12 damage. You gain 1 Burnout.',
  }),
  c({
    id: 'data_dive', name: 'Data Dive', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '📊', effects: [{ kind: 'damage', amount: 5 }, { kind: 'scry', count: 2 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 7 }, { kind: 'scry', count: 3 }],
      text: 'Deal 7 damage. Scry 3.',
    },
    text: 'Deal 5 damage. Scry 2.',
  }),
  c({
    id: 'sprint_push', name: 'Sprint Push', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '🏃', effects: [{ kind: 'damage', amount: 5 }, { kind: 'custom', id: 'fatalEnergy', arg: 1 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 8 }, { kind: 'custom', id: 'fatalEnergy', arg: 1 }],
      text: 'Deal 8 damage. If this kills the enemy, gain 1 Bandwidth.',
    },
    text: 'Deal 5 damage. If this kills the enemy, gain 1 Bandwidth.',
  }),
  c({
    id: 'ship_fast', name: 'Ship Fast', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '💨', effects: [{ kind: 'damage', amount: 9 }, { kind: 'addCard', cardId: 'bug_report', where: 'discard' }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 12 }, { kind: 'addCard', cardId: 'bug_report', where: 'discard' }],
      text: 'Deal 12 damage. Add a Bug Report to your discard pile.',
    },
    text: 'Deal 9 damage. Add a Bug Report to your discard pile.',
    flavor: 'Move fast. Break things. File tickets.',
  }),
  // --- skills ---
  c({
    id: 'dogfooding', name: 'Dogfooding', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '🐕', effects: [{ kind: 'block', amount: 5 }, { kind: 'draw', count: 1 }],
    upgrade: { effects: [{ kind: 'block', amount: 8 }, { kind: 'draw', count: 1 }], text: 'Gain 8 Buffer. Draw 1 card.' },
    text: 'Gain 5 Buffer. Draw 1 card.',
  }),
  c({
    id: 'stakeholder_update', name: 'Stakeholder Update', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '📧', effects: [{ kind: 'block', amount: 8 }],
    upgrade: { effects: [{ kind: 'block', amount: 11 }], text: 'Gain 11 Buffer.' },
    text: 'Gain 8 Buffer.',
  }),
  c({
    id: 'timebox', name: 'Timebox', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '⏳', effects: [{ kind: 'block', amount: 4 }, { kind: 'scry', count: 2 }],
    upgrade: { effects: [{ kind: 'block', amount: 6 }, { kind: 'scry', count: 3 }], text: 'Gain 6 Buffer. Scry 3.' },
    text: 'Gain 4 Buffer. Scry 2.',
  }),
  c({
    id: 'coffee_chat', name: 'Coffee Chat', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    emoji: '☕', effects: [{ kind: 'block', amount: 3 }],
    upgrade: { effects: [{ kind: 'block', amount: 5 }], text: 'Gain 5 Buffer.' },
    text: 'Gain 3 Buffer.',
  }),
  c({
    id: 'deprioritize', name: 'Deprioritize', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '📉', effects: [{ kind: 'applyStatus', status: 'distracted', stacks: 2, target: 'enemy' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'distracted', stacks: 3, target: 'enemy' }],
      text: 'Apply 3 Distracted.',
    },
    text: 'Apply 2 Distracted.',
  }),
  c({
    id: 'retro_notes', name: 'Retro Notes', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '📝', effects: [{ kind: 'custom', id: 'retroNotes' }],
    upgrade: { cost: 0, text: 'Put a card from your discard pile on top of your draw pile.' },
    text: 'Put a card from your discard pile on top of your draw pile.',
  }),
  c({
    id: 'delegate', name: 'Delegate', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    emoji: '🤝', effects: [{ kind: 'custom', id: 'discardChooseThenDraw', arg: 1 }],
    upgrade: {
      effects: [{ kind: 'custom', id: 'discardChooseThenDraw', arg: 2 }],
      text: 'Discard a card. Draw 2 cards.',
    },
    text: 'Discard a card. Draw 1 card.',
  }),
  c({
    id: 'quick_win', name: 'Quick Win', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    emoji: '✅', effects: [{ kind: 'damage', amount: 2 }, { kind: 'block', amount: 2 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 4 }, { kind: 'block', amount: 4 }],
      text: 'Deal 4 damage. Gain 4 Buffer.',
    },
    text: 'Deal 2 damage. Gain 2 Buffer.',
  }),
  c({
    id: 'bug_triage', name: 'Bug Triage', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    emoji: '🐛', effects: [{ kind: 'applyStatus', status: 'techDebt', stacks: 3, target: 'enemy' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'techDebt', stacks: 5, target: 'enemy' }],
      text: 'Apply 5 Tech Debt.',
    },
    text: 'Apply 3 Tech Debt.',
  }),
  c({
    id: 'standup', name: 'Standup', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '🧍', keywords: ['fomo'], effects: [{ kind: 'draw', count: 2 }],
    upgrade: { effects: [{ kind: 'draw', count: 3 }], text: 'Draw 3 cards. FOMO.' },
    text: 'Draw 2 cards. FOMO.',
  }),
  c({
    id: 'write_it_down', name: 'Write It Down', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '✍️', keywords: ['pinned'], effects: [{ kind: 'block', amount: 6 }],
    upgrade: { effects: [{ kind: 'block', amount: 9 }], text: 'Gain 9 Buffer. Pinned.' },
    text: 'Gain 6 Buffer. Pinned.',
  }),
  c({
    id: 'push_back', name: 'Push Back', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    emoji: '🌵', effects: [{ kind: 'applyStatus', status: 'pushback', stacks: 3, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'pushback', stacks: 5, target: 'self' }],
      text: 'Gain 5 Pushback.',
    },
    text: 'Gain 3 Pushback.',
  }),
];

export const UNCOMMON_CARDS: CardDef[] = [
  // --- attacks ---
  c({
    id: 'viral_feature', name: 'Viral Feature', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies',
    emoji: '🦠', effects: [{ kind: 'damage', amount: 8, target: 'allEnemies' }],
    upgrade: { effects: [{ kind: 'damage', amount: 11, target: 'allEnemies' }], text: 'Deal 11 damage to ALL enemies.' },
    text: 'Deal 8 damage to ALL enemies.',
  }),
  c({
    id: 'growth_loop', name: 'Growth Loop', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    emoji: '♻️', effects: [{ kind: 'damage', amount: 6 }, { kind: 'custom', id: 'fatalDrawEnergy', arg: 2 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 9 }, { kind: 'custom', id: 'fatalDrawEnergy', arg: 2 }],
      text: 'Deal 9 damage. If this kills the enemy, draw 2 cards and gain 1 Bandwidth.',
    },
    text: 'Deal 6 damage. If this kills the enemy, draw 2 cards and gain 1 Bandwidth.',
  }),
  c({
    id: 'pivot_hard', name: 'Pivot Hard', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    emoji: '🔄', effects: [{ kind: 'damage', amount: { base: 0, scale: 'perCardInHand', mult: 2 } }],
    upgrade: {
      effects: [{ kind: 'damage', amount: { base: 0, scale: 'perCardInHand', mult: 3 } }],
      text: 'Deal damage equal to 3× the cards in your hand.',
    },
    text: 'Deal damage equal to 2× the cards in your hand.',
  }),
  c({
    id: 'ruthless_prioritization', name: 'Ruthless Prioritization', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    emoji: '🗡️', effects: [{ kind: 'damage', amount: 12 }, { kind: 'exhaustRandomHand', count: 1 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 16 }, { kind: 'exhaustRandomHand', count: 1 }],
      text: 'Deal 16 damage. Archive a random card from your hand.',
    },
    text: 'Deal 12 damage. Archive a random card from your hand.',
  }),
  c({
    id: 'launch_day', name: 'Launch Day', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    emoji: '🚀', effects: [{ kind: 'damage', amount: 14 }],
    upgrade: { effects: [{ kind: 'damage', amount: 18 }], text: 'Deal 18 damage.' },
    text: 'Deal 14 damage.',
  }),
  c({
    id: 'cold_outreach', name: 'Cold Outreach', type: 'attack', rarity: 'uncommon', cost: 0, target: 'none',
    emoji: '📮', effects: [{ kind: 'damage', amount: 9, target: 'randomEnemy' }],
    upgrade: { effects: [{ kind: 'damage', amount: 12, target: 'randomEnemy' }], text: 'Deal 12 damage to a random enemy.' },
    text: 'Deal 9 damage to a random enemy.',
  }),
  c({
    id: 'land_and_expand', name: 'Land and Expand', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    emoji: '🗺️', effects: [
      { kind: 'damage', amount: 4 },
      { kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'enemy' },
      { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'enemy' },
    ],
    upgrade: {
      effects: [
        { kind: 'damage', amount: 7 },
        { kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'enemy' },
        { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'enemy' },
      ],
      text: 'Deal 7 damage. Apply 1 Exposed and 1 Distracted.',
    },
    text: 'Deal 4 damage. Apply 1 Exposed and 1 Distracted.',
  }),
  c({
    id: 'dashboard_drilldown', name: 'Dashboard Drilldown', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    emoji: '🔍', effects: [{ kind: 'damage', amount: 8 }, { kind: 'scry', count: 3 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 11 }, { kind: 'scry', count: 3 }],
      text: 'Deal 11 damage. Scry 3.',
    },
    text: 'Deal 8 damage. Scry 3.',
  }),
  c({
    id: 'competitive_teardown', name: 'Competitive Teardown', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    emoji: '🔧', effects: [{ kind: 'damage', amount: 7 }, { kind: 'block', amount: 4 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 9 }, { kind: 'block', amount: 6 }],
      text: 'Deal 9 damage. Gain 6 Buffer.',
    },
    text: 'Deal 7 damage. Gain 4 Buffer.',
  }),
  // --- skills ---
  c({
    id: 'roadmap_review', name: 'Roadmap Review', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🗓️', effects: [{ kind: 'draw', count: 3 }, { kind: 'custom', id: 'discardChoose', arg: 1 }],
    upgrade: {
      effects: [{ kind: 'draw', count: 4 }, { kind: 'custom', id: 'discardChoose', arg: 1 }],
      text: 'Draw 4 cards. Discard a card.',
    },
    text: 'Draw 3 cards. Discard a card.',
  }),
  c({
    id: 'design_sprint', name: 'Design Sprint', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🎨', keywords: ['archive'], effects: [{ kind: 'applyStatus', status: 'craft', stacks: 2, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'craft', stacks: 3, target: 'self' }],
      text: 'Gain 3 Craft. Archive.',
    },
    text: 'Gain 2 Craft. Archive.',
  }),
  c({
    id: 'war_room', name: 'War Room', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🚨', keywords: ['archive'], effects: [{ kind: 'gainEnergy', count: 2 }],
    upgrade: { cost: 0, text: 'Gain 2 Bandwidth. Archive.' },
    text: 'Gain 2 Bandwidth. Archive.',
  }),
  c({
    id: 'feature_flag', name: 'Feature Flag', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🚩', keywords: ['fomo'], effects: [{ kind: 'block', amount: 10 }],
    upgrade: { effects: [{ kind: 'block', amount: 13 }], text: 'Gain 13 Buffer. FOMO.' },
    text: 'Gain 10 Buffer. FOMO.',
  }),
  c({
    id: 'say_no_harder', name: 'Say No Harder', type: 'skill', rarity: 'uncommon', cost: 1, target: 'allEnemies',
    emoji: '🛑', effects: [
      { kind: 'block', amount: 9 },
      { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'allEnemies' },
    ],
    upgrade: {
      effects: [
        { kind: 'block', amount: 12 },
        { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'allEnemies' },
      ],
      text: 'Gain 12 Buffer. Apply 1 Distracted to ALL enemies.',
    },
    text: 'Gain 9 Buffer. Apply 1 Distracted to ALL enemies.',
  }),
  c({
    id: 'customer_council', name: 'Customer Council', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🧑‍🤝‍🧑', effects: [
      { kind: 'applyStatus', status: 'alignment', stacks: 1, target: 'self' },
      { kind: 'block', amount: 5 },
    ],
    upgrade: {
      effects: [
        { kind: 'applyStatus', status: 'alignment', stacks: 1, target: 'self' },
        { kind: 'block', amount: 8 },
      ],
      text: 'Gain 1 Alignment and 8 Buffer.',
    },
    text: 'Gain 1 Alignment and 5 Buffer.',
  }),
  c({
    id: 'refactor_week', name: 'Refactor Week', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🧹', effects: [{ kind: 'custom', id: 'refactorWeek', arg: 2 }],
    upgrade: {
      effects: [{ kind: 'custom', id: 'refactorWeek', arg: 3 }],
      text: 'Archive up to 3 Status or Curse cards from your hand. Heal 2 Morale for each.',
    },
    text: 'Archive up to 2 Status or Curse cards from your hand. Heal 2 Morale for each.',
  }),
  c({
    id: 'offsite', name: 'Offsite', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none',
    emoji: '🏕️', keywords: ['archive'], effects: [{ kind: 'heal', amount: 8 }],
    upgrade: { effects: [{ kind: 'heal', amount: 11 }], text: 'Heal 11 Morale. Archive.' },
    text: 'Heal 8 Morale. Archive.',
  }),
  c({
    id: 'async_update', name: 'Async Update', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none',
    emoji: '📬', keywords: ['pinned'], effects: [{ kind: 'applyStatus', status: 'drawNextTurn', stacks: 1, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'drawNextTurn', stacks: 2, target: 'self' }],
      text: 'Draw 2 additional cards next turn. Pinned.',
    },
    text: 'Draw 1 additional card next turn. Pinned.',
  }),
  c({
    id: 'ab_test', name: 'A/B Test', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🧪', effects: [{ kind: 'custom', id: 'abTest', arg: 2 }],
    upgrade: {
      effects: [{ kind: 'custom', id: 'abTest', arg: 3 }],
      text: 'Choose 1 of 3 random cards to add to your hand. It costs 0 this combat.',
    },
    text: 'Choose 1 of 2 random cards to add to your hand. It costs 0 this combat.',
  }),
  // --- powers ---
  c({
    id: 'okrs', name: 'OKRs', type: 'power', rarity: 'uncommon', cost: 2, target: 'none',
    emoji: '🎯', effects: [{ kind: 'applyStatus', status: 'strengthPerTurn', stacks: 1, target: 'self' }],
    upgrade: { cost: 1, text: 'Gain 1 Momentum at the start of each turn.' },
    text: 'Gain 1 Momentum at the start of each turn.',
  }),
  c({
    id: 'growth_model', name: 'Growth Model', type: 'power', rarity: 'uncommon', cost: 2, target: 'none',
    emoji: '📈', effects: [{ kind: 'applyStatus', status: 'drawEveryTurn', stacks: 1, target: 'self' }],
    upgrade: { cost: 1, text: 'Draw 1 additional card each turn.' },
    text: 'Draw 1 additional card each turn.',
  }),
  c({
    id: 'weekly_1on1', name: 'Weekly 1:1', type: 'power', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🗣️', effects: [{ kind: 'applyStatus', status: 'regen', stacks: 2, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'regen', stacks: 3, target: 'self' }],
      text: 'Heal 3 Morale at the start of each turn.',
    },
    text: 'Heal 2 Morale at the start of each turn.',
  }),
  c({
    id: 'north_star', name: 'North Star', type: 'power', rarity: 'uncommon', cost: 2, target: 'none',
    emoji: '⭐', effects: [{ kind: 'applyStatus', status: 'foresight', stacks: 2, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'foresight', stacks: 3, target: 'self' }],
      text: 'Scry 3 at the start of each turn.',
    },
    text: 'Scry 2 at the start of each turn.',
  }),
  c({
    id: 'automation', name: 'Automation', type: 'power', rarity: 'uncommon', cost: 2, target: 'none',
    emoji: '🤖', effects: [{ kind: 'applyStatus', status: 'doubleFirstSkill', stacks: 1, target: 'self' }],
    upgrade: { cost: 1, text: 'The first Skill you play each turn is played twice.' },
    text: 'The first Skill you play each turn is played twice.',
  }),
  c({
    id: 'compounding', name: 'Compounding', type: 'power', rarity: 'uncommon', cost: 1, target: 'none',
    emoji: '🌀', effects: [{ kind: 'applyStatus', status: 'archiveBuffer', stacks: 3, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'archiveBuffer', stacks: 5, target: 'self' }],
      text: 'Whenever a card is Archived, gain 5 Buffer.',
    },
    text: 'Whenever a card is Archived, gain 3 Buffer.',
  }),
];

export const RARE_CARDS: CardDef[] = [
  // --- attacks ---
  c({
    id: 'ship_to_prod', name: 'Ship to Prod on Friday', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy',
    emoji: '😈', effects: [{ kind: 'damage', amount: 24 }, { kind: 'applyStatus', status: 'exposed', stacks: 2, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 30 }, { kind: 'applyStatus', status: 'exposed', stacks: 2, target: 'self' }],
      text: 'Deal 30 damage. You become Exposed for 2 turns.',
    },
    text: 'Deal 24 damage. You become Exposed for 2 turns.',
    flavor: 'What could possibly go wrong?',
  }),
  c({
    id: 'tenx_feature', name: '10x Feature', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy',
    emoji: '✨', effects: [{ kind: 'damage', amount: { base: 0, scale: 'perMomentum', mult: 3 } }],
    upgrade: {
      effects: [{ kind: 'damage', amount: { base: 0, scale: 'perMomentum', mult: 5 } }],
      text: 'Deal damage equal to 5× your Momentum.',
    },
    text: 'Deal damage equal to 3× your Momentum.',
  }),
  c({
    id: 'big_bet', name: 'Big Bet', type: 'attack', rarity: 'rare', cost: 'X', target: 'none',
    emoji: '🎰', effects: [{ kind: 'damage', amount: 8, times: 'x', target: 'randomEnemy' }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 10, times: 'x', target: 'randomEnemy' }],
      text: 'Deal 10 damage to a random enemy X times.',
    },
    text: 'Deal 8 damage to a random enemy X times.',
  }),
  c({
    id: 'kill_the_feature', name: 'Kill the Feature', type: 'attack', rarity: 'rare', cost: 1, target: 'enemy',
    emoji: '⚰️', effects: [{ kind: 'damage', amount: 5 }, { kind: 'executeBelow', pct: 20 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 5 }, { kind: 'executeBelow', pct: 30 }],
      text: 'Deal 5 damage. If the enemy is below 30% HP, kill it. (Not bosses.)',
    },
    text: 'Deal 5 damage. If the enemy is below 20% HP, kill it. (Not bosses.)',
  }),
  c({
    id: 'blitzscale', name: 'Blitzscale', type: 'attack', rarity: 'rare', cost: 2, target: 'allEnemies',
    emoji: '⚡', effects: [{ kind: 'damage', amount: 5, times: 2, target: 'allEnemies' }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 7, times: 2, target: 'allEnemies' }],
      text: 'Deal 7 damage to ALL enemies twice.',
    },
    text: 'Deal 5 damage to ALL enemies twice.',
  }),
  // --- skills ---
  c({
    id: 'founder_mode', name: 'Founder Mode', type: 'skill', rarity: 'rare', cost: 0, target: 'none',
    emoji: '🔥', keywords: ['archive'], effects: [
      { kind: 'gainEnergy', count: 2 },
      { kind: 'draw', count: 3 },
      { kind: 'loseHp', amount: 3 },
    ],
    upgrade: {
      effects: [
        { kind: 'gainEnergy', count: 2 },
        { kind: 'draw', count: 3 },
        { kind: 'loseHp', amount: 1 },
      ],
      text: 'Gain 2 Bandwidth. Draw 3 cards. Lose 1 Morale. Archive.',
    },
    text: 'Gain 2 Bandwidth. Draw 3 cards. Lose 3 Morale. Archive.',
  }),
  c({
    id: 'product_sense', name: 'Product Sense', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    emoji: '🧠', effects: [{ kind: 'custom', id: 'chooseFromDraw' }],
    upgrade: { cost: 0, text: 'Choose any card from your draw pile and put it into your hand.' },
    text: 'Choose any card from your draw pile and put it into your hand.',
  }),
  c({
    id: 'series_c', name: 'Series C', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    emoji: '💸', keywords: ['archive'], effects: [{ kind: 'gainBudget', amount: 40 }],
    upgrade: { effects: [{ kind: 'gainBudget', amount: 60 }], text: 'Gain 60 Budget. Archive.' },
    text: 'Gain 40 Budget. Archive.',
  }),
  c({
    id: 'hard_reset', name: 'Hard Reset', type: 'skill', rarity: 'rare', cost: 2, target: 'none',
    emoji: '🔌', keywords: ['archive'], effects: [{ kind: 'custom', id: 'hardReset', arg: 5 }],
    upgrade: {
      effects: [{ kind: 'custom', id: 'hardReset', arg: 6 }],
      text: 'Discard your hand. Draw 6 cards. Archive.',
    },
    text: 'Discard your hand. Draw 5 cards. Archive.',
  }),
  c({
    id: 'vision_doc', name: 'Vision Doc', type: 'power', rarity: 'rare', cost: 3, target: 'none',
    emoji: '📜', effects: [{ kind: 'applyStatus', status: 'barricade', stacks: 1, target: 'self' }],
    upgrade: { cost: 2, text: 'Buffer no longer expires at the start of your turn.' },
    text: 'Buffer no longer expires at the start of your turn.',
  }),
  c({
    id: 'acquihire', name: 'Acqui-hire', type: 'skill', rarity: 'rare', cost: 2, target: 'none',
    emoji: '🧲', keywords: ['archive'], effects: [{ kind: 'custom', id: 'acquihire', arg: 3 }],
    upgrade: { cost: 1, text: 'Choose 1 of 3 guest cards to add to your hand. It costs 0 this combat. Archive.' },
    text: 'Choose 1 of 3 guest cards to add to your hand. It costs 0 this combat. Archive.',
  }),
  c({
    id: 'moat_building', name: 'Moat Building', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    emoji: '🏰', effects: [{ kind: 'applyStatus', status: 'alignment', stacks: 2, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'alignment', stacks: 3, target: 'self' }],
      text: 'Gain 3 Alignment.',
    },
    text: 'Gain 2 Alignment.',
  }),
  c({
    id: 'heads_down_week', name: 'Heads-Down Week', type: 'skill', rarity: 'rare', cost: 3, target: 'none',
    emoji: '🎧', keywords: ['fomo', 'archive'], effects: [{ kind: 'applyStatus', status: 'headsDown', stacks: 1, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'headsDown', stacks: 2, target: 'self' }],
      text: 'Reduce ALL damage taken to 1 for 2 turns. FOMO. Archive.',
    },
    text: 'Reduce ALL damage taken to 1 this turn. FOMO. Archive.',
  }),
  c({
    id: 'ipo', name: 'IPO', type: 'skill', rarity: 'rare', cost: 3, target: 'none',
    emoji: '🔔', keywords: ['archive'], effects: [{ kind: 'custom', id: 'ipoBudget', arg: 2 }],
    upgrade: {
      effects: [{ kind: 'custom', id: 'ipoBudget', arg: 1 }],
      text: 'Gain Budget equal to ALL damage dealt this combat. Archive.',
    },
    text: 'Gain Budget equal to half the damage dealt this combat. Archive.',
  }),
  // --- powers ---
  c({
    id: 'platform_play', name: 'Platform Play', type: 'power', rarity: 'rare', cost: 2, target: 'none',
    emoji: '🏗️', effects: [{ kind: 'applyStatus', status: 'craft', stacks: 2, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'craft', stacks: 3, target: 'self' }],
      text: 'Gain 3 Craft.',
    },
    text: 'Gain 2 Craft.',
  }),
  c({
    id: 'founders_zeal', name: "Founder's Zeal", type: 'power', rarity: 'rare', cost: 3, target: 'none',
    emoji: '🧨', effects: [
      { kind: 'applyStatus', status: 'energizedEveryTurn', stacks: 1, target: 'self' },
      { kind: 'applyStatus', status: 'noHeal', stacks: 1, target: 'self' },
    ],
    upgrade: { cost: 2, text: 'Gain 1 additional Bandwidth each turn. You can no longer heal.' },
    text: 'Gain 1 additional Bandwidth each turn. You can no longer heal.',
  }),
  c({
    id: 'culture_of_shipping', name: 'Culture of Shipping', type: 'power', rarity: 'rare', cost: 2, target: 'none',
    emoji: '🚢', effects: [{ kind: 'applyStatus', status: 'attackDraw', stacks: 1, target: 'self' }],
    upgrade: {
      effects: [{ kind: 'applyStatus', status: 'attackDraw', stacks: 2, target: 'self' }],
      text: 'The first 2 Attacks you play each turn draw a card.',
    },
    text: 'The first Attack you play each turn draws a card.',
  }),
  c({
    id: 'flywheel', name: 'Flywheel', type: 'power', rarity: 'rare', cost: 2, target: 'none',
    emoji: '⚙️', effects: [{ kind: 'applyStatus', status: 'flywheel', stacks: 1, target: 'self' }],
    upgrade: { cost: 1, text: 'At the end of your turn, deal damage equal to half your Buffer to a random enemy.' },
    text: 'At the end of your turn, deal damage equal to half your Buffer to a random enemy.',
  }),
];

export const CURSE_AND_STATUS_CARDS: CardDef[] = [
  c({
    id: 'meetings', name: 'Meetings', type: 'curse', rarity: 'special', cost: null, target: 'none',
    emoji: '📅', keywords: ['unplayable', 'fomo'], effects: [],
    text: 'Unplayable. FOMO.',
    flavor: 'This could have been an email.',
  }),
  c({
    id: 'scope_creep_curse', name: 'Scope Creep', type: 'curse', rarity: 'special', cost: null, target: 'none',
    emoji: '🐙', keywords: ['unplayable'], effects: [],
    endOfTurnInHand: [{ kind: 'custom', id: 'scopeCreepReplicate' }],
    text: 'Unplayable. At the end of your turn, adds a copy of itself to your discard pile.',
    flavor: 'Just one more thing…',
  }),
  c({
    id: 'doubt', name: 'Doubt', type: 'curse', rarity: 'special', cost: null, target: 'none',
    emoji: '😰', keywords: ['unplayable'], effects: [],
    endOfTurnInHand: [{ kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'self' }],
    text: 'Unplayable. At the end of your turn, you become Distracted.',
  }),
  c({
    id: 'legacy_code', name: 'Legacy Code', type: 'status', rarity: 'special', cost: null, target: 'none',
    emoji: '🦕', keywords: ['unplayable'], effects: [],
    text: 'Unplayable.',
    flavor: 'Nobody knows what it does. Nobody dares delete it.',
  }),
  c({
    id: 'bug_report', name: 'Bug Report', type: 'status', rarity: 'special', cost: null, target: 'none',
    emoji: '🐞', keywords: ['unplayable', 'fomo'], effects: [],
    onDraw: [{ kind: 'loseHp', amount: 1 }],
    text: 'Unplayable. FOMO. When drawn, lose 1 Morale.',
  }),
];

export const ALL_TACTIC_CARDS: CardDef[] = [
  ...STARTER_CARDS,
  ...COMMON_CARDS,
  ...UNCOMMON_CARDS,
  ...RARE_CARDS,
  ...CURSE_AND_STATUS_CARDS,
];
