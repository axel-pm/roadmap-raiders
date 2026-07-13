// Act 1: Find PMF — enemies, elites, boss.

import type { EnemyDef, EncounterDef } from '../../engine/types';

const e = (def: EnemyDef): EnemyDef => def;

export const ACT1_ENEMIES: EnemyDef[] = [
  e({
    id: 'meeting_goblin', name: 'Meeting Goblin', emoji: '👺',
    description: 'It multiplies. It has no agenda. It could have been an email.',
    hp: [12, 15],
    moves: {
      ramble: { intent: 'attack', name: 'Ramble', effects: [{ kind: 'damage', amount: 4 }] },
      anotherMeeting: {
        intent: 'debuff', name: 'Schedule Another',
        effects: [{ kind: 'addCard', cardId: 'meetings', where: 'discard' }],
      },
    },
    ai: ({ history, rng }) => {
      if (history[history.length - 1] === 'anotherMeeting') return 'ramble';
      return rng.chance(0.35) ? 'anotherMeeting' : 'ramble';
    },
  }),
  e({
    id: 'bikeshedding_demon', name: 'Bikeshedding Demon', emoji: '🚲',
    description: 'Endless debates about trivial details while the real decisions rot.',
    hp: [24, 28],
    moves: {
      nitpick: { intent: 'attack', name: 'Nitpick', effects: [{ kind: 'damage', amount: 5 }] },
      paintItBlue: {
        intent: 'debuff', name: 'Paint It Blue',
        effects: [{ kind: 'applyStatus', status: 'distracted', stacks: 2, target: 'enemy' }],
      },
      derail: { intent: 'attack', name: 'Derail', effects: [{ kind: 'damage', amount: 3, times: 2 }] },
    },
    ai: ({ turn }) => {
      const cycle = ['nitpick', 'paintItBlue', 'derail'] as const;
      return cycle[(turn) % 3]!;
    },
  }),
  e({
    id: 'vanity_metrics_phantom', name: 'Vanity Metrics Phantom', emoji: '👻',
    description: 'Ten million page views. Zero paying customers.',
    hp: [22, 26],
    moves: {
      impressiveChart: {
        intent: 'buff', name: 'Impressive Chart',
        effects: [
          { kind: 'block', amount: 6 },
          { kind: 'applyStatus', status: 'momentum', stacks: 1, target: 'self' },
        ],
      },
      hollowNumber: { intent: 'attack', name: 'Hollow Number', effects: [{ kind: 'damage', amount: 6 }] },
    },
    ai: ({ history }) =>
      history.length === 0 || history[history.length - 1] === 'hollowNumber'
        ? 'impressiveChart'
        : 'hollowNumber',
  }),
  e({
    id: 'mvp_mimic', name: 'MVP Mimic', emoji: '📦',
    description: 'Looks minimal. Looks viable. Then it bites.',
    hp: [28, 32],
    moves: {
      lookHarmless: { intent: 'defend', name: 'Look Harmless', effects: [{ kind: 'block', amount: 5 }] },
      bite: { intent: 'attack', name: 'Bite', effects: [{ kind: 'damage', amount: 9 }] },
      adapt: {
        intent: 'buff', name: 'Adapt',
        effects: [{ kind: 'applyStatus', status: 'momentum', stacks: 2, target: 'self' }],
      },
    },
    ai: ({ turn, history, rng }) => {
      if (turn <= 2) return 'lookHarmless';
      if (history[history.length - 1] === 'bite' && rng.chance(0.4)) return 'adapt';
      return 'bite';
    },
  }),
  e({
    id: 'nps_troll', name: 'NPS Troll', emoji: '🧌',
    description: 'Would not recommend to a friend or colleague. Score: 0.',
    hp: [26, 30],
    moves: {
      detractorRant: {
        intent: 'attackDebuff', name: 'Detractor Rant',
        effects: [
          { kind: 'damage', amount: 5 },
          { kind: 'applyStatus', status: 'distracted', stacks: 1, target: 'enemy' },
        ],
      },
      surveySpam: {
        intent: 'debuff', name: 'Survey Spam',
        effects: [{ kind: 'addCard', cardId: 'bug_report', where: 'draw', count: 2 }],
      },
    },
    ai: ({ history, rng }) => {
      if (history[history.length - 1] === 'surveySpam') return 'detractorRant';
      return rng.chance(0.4) ? 'surveySpam' : 'detractorRant';
    },
  }),
  e({
    id: 'slide_deck_zombie', name: 'Slide Deck Zombie', emoji: '🧟',
    description: 'Slide 87 of 340. Nobody has asked a question in an hour.',
    hp: [18, 22],
    moves: {
      deathBySlides: { intent: 'attack', name: 'Death by Slides', effects: [{ kind: 'damage', amount: 3, times: 3 }] },
      oneMoreSlide: {
        intent: 'defend', name: 'One More Slide',
        effects: [{ kind: 'block', amount: 6 }, { kind: 'heal', amount: 3 }],
      },
    },
    ai: ({ history, rng }) => {
      if (history[history.length - 1] === 'oneMoreSlide') return 'deathBySlides';
      return rng.chance(0.35) ? 'oneMoreSlide' : 'deathBySlides';
    },
  }),
];

export const ACT1_ELITES: EnemyDef[] = [
  e({
    id: 'scope_creep_dragon', name: 'Scope Creep Dragon', emoji: '🐉',
    description: 'Every scale is a feature request. It grows as you feed it.',
    hp: [60, 68],
    moves: {
      justOneMore: {
        intent: 'attackDebuff', name: 'Just One More Thing',
        effects: [
          { kind: 'damage', amount: 7 },
          { kind: 'addCard', cardId: 'scope_creep_curse', where: 'draw' },
        ],
      },
      devourTimeline: { intent: 'attack', name: 'Devour Timeline', effects: [{ kind: 'damage', amount: 12 }] },
      grow: {
        intent: 'buff', name: 'Grow',
        effects: [{ kind: 'applyStatus', status: 'momentum', stacks: 3, target: 'self' }],
      },
    },
    ai: ({ history, hpPct, flags }) => {
      if (hpPct <= 0.5 && !flags.grew) {
        flags.grew = 1;
        return 'grow';
      }
      return history[history.length - 1] === 'justOneMore' ? 'devourTimeline' : 'justOneMore';
    },
  }),
  e({
    id: 'analysis_paralysis_sphinx', name: 'Analysis Paralysis Sphinx', emoji: '🦁',
    description: 'It has one more question. It always has one more question.',
    hp: [54, 60],
    moves: {
      endlessQuestions: {
        intent: 'debuff', name: 'Endless Questions',
        effects: [
          { kind: 'applyStatus', status: 'distracted', stacks: 2, target: 'enemy' },
          { kind: 'applyStatus', status: 'burnout', stacks: 2, target: 'enemy' },
        ],
      },
      riddleWall: { intent: 'defend', name: 'Riddle Wall', effects: [{ kind: 'block', amount: 15 }] },
      pointedQuestion: { intent: 'attack', name: 'Pointed Question', effects: [{ kind: 'damage', amount: 11 }] },
    },
    ai: ({ turn, history, rng }) => {
      if (turn === 1) return 'endlessQuestions';
      const last = history[history.length - 1];
      if (last === 'pointedQuestion') return rng.chance(0.5) ? 'riddleWall' : 'endlessQuestions';
      return 'pointedQuestion';
    },
  }),
];

export const ACT1_BOSS: EnemyDef = e({
  id: 'feature_factory', name: 'Feature Factory', emoji: '🏭',
  description: 'Output over outcomes. The assembly line never stops. Nobody asks why.',
  hp: [135, 145],
  moves: {
    assemblyLine: { intent: 'attack', name: 'Assembly Line', effects: [{ kind: 'damage', amount: 5, times: 3 }] },
    roadmapBloat: {
      intent: 'debuff', name: 'Roadmap Bloat',
      effects: [{ kind: 'addCard', cardId: 'legacy_code', where: 'discard', count: 2 }],
    },
    overdrive: {
      intent: 'buff', name: 'Overdrive',
      effects: [
        { kind: 'applyStatus', status: 'momentum', stacks: 2, target: 'self' },
        { kind: 'block', amount: 8 },
      ],
    },
    massProduction: { intent: 'attack', name: 'Mass Production', effects: [{ kind: 'damage', amount: 4, times: 5 }] },
  },
  ai: ({ turn, hpPct }) => {
    if (hpPct <= 0.5 && turn % 3 === 0) return 'massProduction';
    const cycle = ['assemblyLine', 'roadmapBloat', 'overdrive'] as const;
    return cycle[(turn - 1) % 3]!;
  },
});

export const ACT1_ENCOUNTERS: EncounterDef[] = [
  // weak pool: the first few fights on the floor
  { id: 'a1_goblins', enemies: ['meeting_goblin', 'meeting_goblin'], act: 1, pool: 'weak' },
  { id: 'a1_zombie', enemies: ['slide_deck_zombie'], act: 1, pool: 'weak' },
  { id: 'a1_troll', enemies: ['nps_troll'], act: 1, pool: 'weak' },
  { id: 'a1_demon', enemies: ['bikeshedding_demon'], act: 1, pool: 'weak' },
  // normal pool
  { id: 'a1_phantom', enemies: ['vanity_metrics_phantom'], act: 1, pool: 'normal' },
  { id: 'a1_mimic', enemies: ['mvp_mimic'], act: 1, pool: 'normal' },
  { id: 'a1_goblin_horde', enemies: ['meeting_goblin', 'meeting_goblin', 'meeting_goblin'], act: 1, pool: 'normal' },
  { id: 'a1_zombie_troll', enemies: ['slide_deck_zombie', 'nps_troll'], act: 1, pool: 'normal' },
  { id: 'a1_demon_goblin', enemies: ['bikeshedding_demon', 'meeting_goblin'], act: 1, pool: 'normal' },
  // elites
  { id: 'a1_dragon', enemies: ['scope_creep_dragon'], act: 1, pool: 'elite' },
  { id: 'a1_sphinx', enemies: ['analysis_paralysis_sphinx'], act: 1, pool: 'elite' },
  // boss
  { id: 'a1_boss', enemies: ['feature_factory'], act: 1, pool: 'boss' },
];
