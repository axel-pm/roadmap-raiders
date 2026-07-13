// Act 3: The IPO Road — enemies, elites, and The HiPPO.

import type { EnemyDef, EncounterDef } from '../../engine/types';

const e = (def: EnemyDef): EnemyDef => def;

export const ACT3_ENEMIES: EnemyDef[] = [
  e({
    id: 'sev1_incident', name: 'Sev-1 Incident', emoji: '🚨',
    description: 'All hands. War room. The CEO is typing in the status channel.',
    hp: [66, 74],
    moves: {
      pageEveryone: { intent: 'attack', name: 'Page Everyone', effects: [{ kind: 'damage', amount: 11 }] },
      cascadeFailure: {
        intent: 'attackDebuff', name: 'Cascade Failure',
        effects: [
          { kind: 'damage', amount: 6, times: 2 },
          { kind: 'applyStatus', status: 'techDebt', stacks: 2, target: 'enemy' },
        ],
      },
      postmortem: { intent: 'defend', name: 'Blameless Postmortem', effects: [{ kind: 'block', amount: 10 }] },
    },
    ai: ({ turn, history, rng }) => {
      if (turn === 1) return 'pageEveryone';
      const last = history[history.length - 1];
      if (last === 'pageEveryone') return rng.chance(0.6) ? 'cascadeFailure' : 'postmortem';
      return 'pageEveryone';
    },
  }),
  e({
    id: 'compliance_lich', name: 'Compliance Lich', emoji: '🧟‍♀️',
    description: 'Undying keeper of the checklist. Your launch needs 14 more approvals.',
    hp: [62, 70],
    moves: {
      redTape: {
        intent: 'debuff', name: 'Red Tape',
        effects: [
          { kind: 'applyStatus', status: 'distracted', stacks: 2, target: 'enemy' },
          { kind: 'block', amount: 5 },
        ],
      },
      audit: {
        intent: 'attackDebuff', name: 'Audit',
        effects: [
          { kind: 'damage', amount: 10 },
          { kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'enemy' },
        ],
      },
    },
    ai: ({ history }) =>
      history[history.length - 1] === 'redTape' ? 'audit' : 'redTape',
  }),
  e({
    id: 'the_consultant', name: 'The Consultant', emoji: '🕴️',
    description: 'Has a 2x2 for everything. Bills by the hour. Recommends more consultants.',
    hp: [56, 64],
    moves: {
      frameworkSlam: { intent: 'attack', name: 'Framework Slam', effects: [{ kind: 'damage', amount: 12 }] },
      invoice: {
        intent: 'debuff', name: 'Invoice',
        effects: [{ kind: 'loseBudget', amount: 25 }, { kind: 'block', amount: 6 }],
      },
      bestPractices: {
        intent: 'buff', name: 'Best Practices',
        effects: [{ kind: 'applyStatus', status: 'momentum', stacks: 3, target: 'self' }],
      },
    },
    ai: ({ turn, history }) => {
      if (turn === 1) return 'invoice';
      const cycle = ['frameworkSlam', 'bestPractices', 'frameworkSlam', 'invoice'] as const;
      return cycle[history.length % 4]!;
    },
  }),
  e({
    id: 'deadline_reaper', name: 'Deadline Reaper', emoji: '⏱️',
    description: 'The launch date was promised at the board meeting. It is coming.',
    hp: [76, 84],
    moves: {
      tick: { intent: 'attack', name: 'Tick', effects: [{ kind: 'damage', amount: 6 }] },
      tock: { intent: 'attack', name: 'Tock', effects: [{ kind: 'damage', amount: 8 }] },
      shipOrDie: { intent: 'attack', name: 'SHIP OR DIE', effects: [{ kind: 'damage', amount: 30 }] },
    },
    ai: ({ turn }) => {
      // countdown: big slam every 4th turn
      if (turn % 4 === 0) return 'shipOrDie';
      return turn % 2 === 1 ? 'tick' : 'tock';
    },
  }),
  e({
    id: 'vaporware_wisp', name: 'Vaporware Wisp', emoji: '💨',
    description: 'Announced at three conferences. Exists in zero repositories.',
    hp: [28, 34],
    moves: {
      overpromise: { intent: 'attack', name: 'Overpromise', effects: [{ kind: 'damage', amount: 8 }] },
      vanish: {
        intent: 'buff', name: 'Vanish',
        effects: [{ kind: 'applyStatus', status: 'headsDown', stacks: 1, target: 'self' }],
      },
    },
    ai: ({ history }) =>
      history[history.length - 1] === 'vanish' ? 'overpromise' : (history.length % 2 === 0 ? 'vanish' : 'overpromise'),
  }),
];

export const ACT3_ELITES: EnemyDef[] = [
  e({
    id: 'reorg_tornado', name: 'Reorg Tornado', emoji: '🌪️',
    description: 'New org chart dropped. You now report to someone who started Tuesday.',
    hp: [106, 116],
    moves: {
      shuffleTeams: {
        intent: 'debuff', name: 'Shuffle Teams',
        effects: [{ kind: 'custom', id: 'shuffleHand' }],
      },
      whirl: { intent: 'attack', name: 'Whirl', effects: [{ kind: 'damage', amount: 8, times: 2 }] },
      newOrgChart: {
        intent: 'buff', name: 'New Org Chart',
        effects: [{ kind: 'applyStatus', status: 'momentum', stacks: 2, target: 'allEnemies' }],
      },
    },
    ai: ({ turn, history }) => {
      if (turn === 1) return 'shuffleTeams';
      const last = history[history.length - 1];
      if (last === 'whirl') return history.length % 4 === 3 ? 'newOrgChart' : 'shuffleTeams';
      return 'whirl';
    },
  }),
  e({
    id: 'ai_hype_beast', name: 'AI Hype Beast', emoji: '🤖',
    description: 'It is agentic. It is a platform. It is a paradigm. It is 40% demos.',
    hp: [96, 104],
    onSpawn: [{ kind: 'applyStatus', status: 'hype', stacks: 2, target: 'self' }],
    moves: {
      hallucinate: { intent: 'attack', name: 'Hallucinate', effects: [{ kind: 'damage', amount: 5, times: 3 }] },
      overpromise: { intent: 'defend', name: 'Overpromise', effects: [{ kind: 'block', amount: 15 }] },
      demoEffect: { intent: 'attack', name: 'Demo Effect', effects: [{ kind: 'damage', amount: 20 }] },
    },
    ai: ({ history, flags, rng }) => {
      // demoEffect only once it has built up momentum (flags updated via history length proxy)
      const turnsPassed = history.length;
      if (turnsPassed >= 3 && !flags.demoUsed && rng.chance(0.5)) {
        flags.demoUsed = 1;
        return 'demoEffect';
      }
      return history[history.length - 1] === 'hallucinate' ? 'overpromise' : 'hallucinate';
    },
  }),
];

export const ACT3_BOSS: EnemyDef = e({
  id: 'the_hippo', name: 'The HiPPO', emoji: '🦛',
  description: "Highest Paid Person's Opinion. The data disagrees. The data is in a deck nobody opened.",
  hp: [290, 310],
  moves: {
    executiveOpinion: { intent: 'attack', name: 'Executive Opinion', effects: [{ kind: 'damage', amount: 13 }] },
    gutFeel: {
      intent: 'buff', name: 'Gut Feel',
      effects: [
        { kind: 'applyStatus', status: 'momentum', stacks: 3, target: 'self' },
        { kind: 'block', amount: 10 },
      ],
    },
    overrule: {
      intent: 'debuff', name: 'Overrule',
      effects: [{ kind: 'custom', id: 'stripPlayerBuffs' }],
    },
    mandate: {
      intent: 'attackDebuff', name: 'Mandate',
      effects: [
        { kind: 'damage', amount: 16 },
        { kind: 'addCard', cardId: 'doubt', where: 'discard' },
      ],
    },
    finalDecision: { intent: 'attack', name: 'Final Decision', effects: [{ kind: 'damage', amount: 9, times: 3 }] },
  },
  ai: ({ turn, hpPct, flags, history }) => {
    if (hpPct <= 0.5 && !flags.phase2) {
      flags.phase2 = 1;
      return 'overrule';
    }
    if (!flags.phase2) {
      const cycle = ['executiveOpinion', 'gutFeel', 'executiveOpinion'] as const;
      if (turn % 5 === 0) return 'overrule';
      return cycle[history.length % 3]!;
    }
    const cycle = ['mandate', 'finalDecision', 'gutFeel'] as const;
    return cycle[history.length % 3]!;
  },
});

export const ACT3_ENCOUNTERS: EncounterDef[] = [
  { id: 'a3_wisps', enemies: ['vaporware_wisp', 'vaporware_wisp'], act: 3, pool: 'weak' },
  { id: 'a3_consultant', enemies: ['the_consultant'], act: 3, pool: 'weak' },
  { id: 'a3_lich', enemies: ['compliance_lich'], act: 3, pool: 'normal' },
  { id: 'a3_sev1', enemies: ['sev1_incident'], act: 3, pool: 'normal' },
  { id: 'a3_reaper', enemies: ['deadline_reaper'], act: 3, pool: 'normal' },
  { id: 'a3_lich_wisp', enemies: ['compliance_lich', 'vaporware_wisp'], act: 3, pool: 'normal' },
  { id: 'a3_consultant_duo', enemies: ['the_consultant', 'vaporware_wisp'], act: 3, pool: 'normal' },
  { id: 'a3_tornado', enemies: ['reorg_tornado'], act: 3, pool: 'elite' },
  { id: 'a3_hype', enemies: ['ai_hype_beast'], act: 3, pool: 'elite' },
  { id: 'a3_boss', enemies: ['the_hippo'], act: 3, pool: 'boss' },
];
