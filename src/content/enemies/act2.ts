// Act 2: Scale-Up — enemies, elites, Stakeholder Hydra boss.

import type { EnemyDef, EncounterDef } from '../../engine/types';

const e = (def: EnemyDef): EnemyDef => def;

export const ACT2_ENEMIES: EnemyDef[] = [
  e({
    id: 'churn_wraith', name: 'Churn Wraith', emoji: '🌫️',
    description: 'Users leave silently. Each departure makes the next one easier.',
    hp: [40, 46],
    moves: {
      silentExit: { intent: 'attack', name: 'Silent Exit', effects: [{ kind: 'damage', amount: 7 }] },
      fade: {
        intent: 'buff', name: 'Fade',
        effects: [
          { kind: 'block', amount: 6 },
          { kind: 'applyStatus', status: 'headsDown', stacks: 1, target: 'self' },
        ],
      },
      compound: {
        intent: 'buff', name: 'Compounding Churn',
        effects: [{ kind: 'applyStatus', status: 'momentum', stacks: 2, target: 'self' }],
      },
    },
    ai: ({ hpPct, flags, history }) => {
      if (hpPct < 0.4 && !flags.faded) {
        flags.faded = 1;
        return 'fade';
      }
      // races you: buffs every 3rd move
      return history.length % 3 === 2 ? 'compound' : 'silentExit';
    },
  }),
  e({
    id: 'competitor_shadow', name: 'Competitor Shadow', emoji: '🥷',
    description: 'They shipped your roadmap. Last week. With better onboarding.',
    hp: [42, 48],
    moves: {
      copyFeature: { intent: 'unknown', name: 'Copy Feature', effects: [{ kind: 'damage', amount: 7 }, { kind: 'block', amount: 7 }] },
      undercut: {
        intent: 'attackDebuff', name: 'Undercut',
        effects: [
          { kind: 'damage', amount: 9 },
          { kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'enemy' },
        ],
      },
    },
    ai: ({ history, rng }) =>
      history[history.length - 1] === 'undercut' || rng.chance(0.5) ? 'copyFeature' : 'undercut',
  }),
  e({
    id: 'dark_pattern_vampire', name: 'Dark Pattern Vampire', emoji: '🧛',
    description: 'The unsubscribe link is 4pt gray text on a gray background.',
    hp: [38, 44],
    moves: {
      confirmshaming: {
        intent: 'attack', name: 'Confirmshaming',
        effects: [{ kind: 'damage', amount: 7 }, { kind: 'heal', amount: 4 }],
      },
      roachMotel: {
        intent: 'debuff', name: 'Roach Motel',
        effects: [
          { kind: 'applyStatus', status: 'burnout', stacks: 1, target: 'enemy' },
          { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'enemy' },
        ],
      },
    },
    ai: ({ history, rng }) =>
      history[history.length - 1] === 'roachMotel' ? 'confirmshaming'
        : rng.chance(0.35) ? 'roachMotel' : 'confirmshaming',
  }),
  e({
    id: 'committee_ghost', name: 'Committee Ghost', emoji: '👤',
    description: 'Concerned about alignment. Requests a follow-up. Brings friends.',
    hp: [20, 24],
    moves: {
      object: { intent: 'attack', name: 'Raise Objection', effects: [{ kind: 'damage', amount: 4 }] },
      secondThat: {
        intent: 'buff', name: 'Second That!',
        effects: [{ kind: 'custom', id: 'buffRandomAlly', arg: 2 }],
      },
    },
    ai: ({ history, rng }) =>
      history[history.length - 1] === 'secondThat' ? 'object'
        : rng.chance(0.45) ? 'secondThat' : 'object',
  }),
  e({
    id: 'okr_ouroboros', name: 'OKR Ouroboros', emoji: '🐍',
    description: 'Objectives that feed on their own key results, forever cascading.',
    hp: [46, 52],
    moves: {
      cascade: {
        intent: 'attack', name: 'Cascade',
        effects: [
          { kind: 'damage', amount: 6 },
          { kind: 'applyStatus', status: 'momentum', stacks: 1, target: 'self' },
        ],
      },
      realign: {
        intent: 'defend', name: 'Realign',
        effects: [{ kind: 'removeDebuffs', target: 'self' }, { kind: 'block', amount: 10 }],
      },
    },
    ai: ({ history, rng }) =>
      history[history.length - 1] !== 'realign' && rng.chance(0.3) ? 'realign' : 'cascade',
  }),
  e({
    id: 'growth_hacker_gremlin', name: 'Growth Hacker Gremlin', emoji: '🧟‍♂️',
    description: 'One weird trick to 10x your funnel. Compliance hates them.',
    hp: [34, 40],
    moves: {
      spamBlast: { intent: 'attack', name: 'Spam Blast', effects: [{ kind: 'damage', amount: 3, times: 4 }] },
      darkFunnel: {
        intent: 'debuff', name: 'Dark Funnel',
        effects: [{ kind: 'applyStatus', status: 'techDebt', stacks: 3, target: 'enemy' }],
      },
    },
    ai: ({ history, rng }) =>
      history[history.length - 1] === 'darkFunnel' ? 'spamBlast'
        : rng.chance(0.4) ? 'darkFunnel' : 'spamBlast',
  }),
];

export const ACT2_ELITES: EnemyDef[] = [
  e({
    id: 'technical_debt_golem', name: 'Technical Debt Golem', emoji: '🗿',
    description: 'Every shortcut you ever took, compounded, standing in your way.',
    hp: [86, 94],
    onSpawn: [{ kind: 'applyStatus', status: 'pushback', stacks: 3, target: 'self' }],
    moves: {
      accumulate: {
        intent: 'buff', name: 'Accumulate',
        effects: [
          { kind: 'block', amount: 4 },
          { kind: 'applyStatus', status: 'momentum', stacks: 1, target: 'self' },
        ],
      },
      crash: { intent: 'attack', name: 'Crash', effects: [{ kind: 'damage', amount: 14 }] },
      interestPayment: {
        intent: 'debuff', name: 'Interest Payment',
        effects: [
          { kind: 'applyStatus', status: 'techDebt', stacks: 2, target: 'enemy' },
          { kind: 'applyStatus', status: 'burnout', stacks: 1, target: 'enemy' },
        ],
      },
    },
    ai: ({ turn, history }) => {
      if (turn === 1) return 'interestPayment';
      const last = history[history.length - 1];
      if (last === 'crash') return 'accumulate';
      if (last === 'accumulate') return 'crash';
      return 'crash';
    },
  }),
  e({
    id: 'burnout_phoenix', name: 'Burnout Phoenix', emoji: '🔥',
    description: 'You put it out. It rises again from the embers of the on-call rota.',
    hp: [72, 78],
    moves: {
      flare: {
        intent: 'attackDebuff', name: 'Flare',
        effects: [
          { kind: 'damage', amount: 9 },
          { kind: 'applyStatus', status: 'burnout', stacks: 1, target: 'enemy' },
        ],
      },
      blaze: { intent: 'attack', name: 'Blaze', effects: [{ kind: 'damage', amount: 14 }] },
    },
    onDeath: [{ kind: 'custom', id: 'phoenixRebirth', arg: 35 }],
    ai: ({ history, rng }) =>
      history[history.length - 1] === 'blaze' ? 'flare'
        : rng.chance(0.45) ? 'blaze' : 'flare',
  }),
];

export const ACT2_BOSS: EnemyDef[] = [
  e({
    id: 'hydra_sales_head', name: 'Hydra: Sales Head', emoji: '🐲',
    description: '"Just promise them the integration. We\'ll figure it out."',
    hp: [52, 58],
    moves: {
      bigPromise: { intent: 'attack', name: 'Big Promise', effects: [{ kind: 'damage', amount: 10 }] },
      closeTheDeal: { intent: 'attack', name: 'Close the Deal', effects: [{ kind: 'damage', amount: 6, times: 2 }] },
    },
    onDeath: [{ kind: 'custom', id: 'hydraEnrage', arg: 2 }],
    ai: ({ history }) =>
      history[history.length - 1] === 'bigPromise' ? 'closeTheDeal' : 'bigPromise',
  }),
  e({
    id: 'hydra_legal_head', name: 'Hydra: Legal Head', emoji: '🐲',
    description: '"Have we considered the regulatory implications of shipping anything?"',
    hp: [52, 58],
    moves: {
      redlines: {
        intent: 'debuff', name: 'Redlines',
        effects: [
          { kind: 'applyStatus', status: 'distracted', stacks: 2, target: 'enemy' },
        ],
      },
      injunction: {
        intent: 'attackDebuff', name: 'Injunction',
        effects: [
          { kind: 'damage', amount: 7 },
          { kind: 'applyStatus', status: 'burnout', stacks: 1, target: 'enemy' },
        ],
      },
    },
    onDeath: [{ kind: 'custom', id: 'hydraEnrage', arg: 2 }],
    ai: ({ history }) =>
      history[history.length - 1] === 'redlines' ? 'injunction' : 'redlines',
  }),
  e({
    id: 'hydra_exec_head', name: 'Hydra: Exec Head', emoji: '🐲',
    description: '"Circling back on this — can we make it pop? Also why is velocity down?"',
    hp: [52, 58],
    moves: {
      rally: {
        intent: 'buff', name: 'Rally the Org',
        effects: [{ kind: 'applyStatus', status: 'hype', stacks: 1, target: 'self' }],
      },
      pressure: { intent: 'attack', name: 'Apply Pressure', effects: [{ kind: 'damage', amount: 8 }] },
      shield: { intent: 'defend', name: 'Executive Cover', effects: [{ kind: 'block', amount: 12 }] },
    },
    onDeath: [{ kind: 'custom', id: 'hydraEnrage', arg: 2 }],
    ai: ({ turn, history, rng }) => {
      if (turn === 1) return 'rally';
      const last = history[history.length - 1];
      if (last === 'pressure' && rng.chance(0.4)) return 'shield';
      return 'pressure';
    },
  }),
];

export const ACT2_ENCOUNTERS: EncounterDef[] = [
  { id: 'a2_wraith', enemies: ['churn_wraith'], act: 2, pool: 'weak' },
  { id: 'a2_gremlin', enemies: ['growth_hacker_gremlin'], act: 2, pool: 'weak' },
  { id: 'a2_vampire', enemies: ['dark_pattern_vampire'], act: 2, pool: 'weak' },
  { id: 'a2_shadow', enemies: ['competitor_shadow'], act: 2, pool: 'normal' },
  { id: 'a2_committee', enemies: ['committee_ghost', 'committee_ghost', 'committee_ghost'], act: 2, pool: 'normal' },
  { id: 'a2_ouroboros', enemies: ['okr_ouroboros'], act: 2, pool: 'normal' },
  { id: 'a2_vampire_ghost', enemies: ['dark_pattern_vampire', 'committee_ghost'], act: 2, pool: 'normal' },
  { id: 'a2_wraith_gremlin', enemies: ['churn_wraith', 'growth_hacker_gremlin'], act: 2, pool: 'normal' },
  { id: 'a2_golem', enemies: ['technical_debt_golem'], act: 2, pool: 'elite' },
  { id: 'a2_phoenix', enemies: ['burnout_phoenix'], act: 2, pool: 'elite' },
  { id: 'a2_boss', enemies: ['hydra_sales_head', 'hydra_exec_head', 'hydra_legal_head'], act: 2, pool: 'boss' },
];
