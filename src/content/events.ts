// ?-room events. Each option mutates the run via the GameApi and must end by
// calling api.done() (or api.pickGuest/removeCards flows that call it).

import type { RunState } from '../engine/run/run';
import type { CardDef } from '../engine/types';
import { GUEST_CARDS, cardPool } from './index';
import { makeInstance } from '../engine/combat/engine';

export interface GameApi {
  run: RunState;
  /** show a pick-1-of-N card choice; null = skipped */
  chooseCard(title: string, defs: CardDef[], skippable: boolean): Promise<CardDef | null>;
  /** pick up to `count` cards from the deck to remove */
  removeCards(count: number): Promise<number>;
  /** award a random relic */
  grantRelic(): void;
  message(text: string): void;
  done(): void;
}

export interface EventOption {
  label: string;
  description?: string;
  disabled?: boolean;
  apply: (api: GameApi) => void | Promise<void>;
}

export interface EventDef {
  id: string;
  name: string;
  emoji: string;
  text: string;
  minAct?: number;
  options: (run: RunState) => EventOption[];
}

function unownedGuests(run: RunState): CardDef[] {
  return GUEST_CARDS.filter((g) => !run.deck.some((c) => c.defId === g.id));
}

export const EVENTS: EventDef[] = [
  {
    id: 'podcast_interview',
    name: 'Podcast Interview',
    emoji: '🎙️',
    text: 'A calendar invite appears: "Lenny <> You". The mic is warm, the guest chair is open, and three legends are waiting in the greenroom.',
    options: (run) => [
      {
        label: '🎧 Sit down and listen',
        description: 'Choose 1 of 3 guest cards to add to your deck',
        apply: async (api) => {
          const pool = api.run.rng.get('events').shuffle(unownedGuests(run)).slice(0, 3);
          if (pool.length === 0) {
            api.message('Every guest is already on your team!');
            api.done();
            return;
          }
          await api.chooseCard('Choose a guest to join you', pool, false);
          api.done();
        },
      },
      {
        label: '📵 Decline politely',
        description: 'Leave with nothing but regret',
        apply: (api) => api.done(),
      },
    ],
  },
  {
    id: 'the_advisor',
    name: 'The Advisor',
    emoji: '🧙',
    text: 'A veteran operator offers office hours. "I can introduce you to someone great," they say, "or do it for free — but you\'ll owe me."',
    options: (run) => [
      {
        label: '💰 Pay 40 Budget for the intro',
        description: 'Choose 1 of 3 guest cards',
        disabled: run.budget < 40,
        apply: async (api) => {
          api.run.budget -= 40;
          const pool = api.run.rng.get('events').shuffle(unownedGuests(api.run)).slice(0, 3);
          if (pool.length) await api.chooseCard('Choose a guest to join you', pool, false);
          api.done();
        },
      },
      {
        label: '🤝 Take the free intro',
        description: 'Choose 1 of 3 guests, but gain a Doubt curse',
        apply: async (api) => {
          const pool = api.run.rng.get('events').shuffle(unownedGuests(api.run)).slice(0, 3);
          if (pool.length) await api.chooseCard('Choose a guest to join you', pool, false);
          api.run.deck.push(makeInstance('doubt'));
          api.message('A Doubt creeps into your deck…');
          api.done();
        },
      },
      { label: '🚶 Walk away', apply: (api) => api.done() },
    ],
  },
  {
    id: 'layoffs',
    name: 'Layoffs',
    emoji: '📉',
    text: 'The board wants "efficiency". You can trim the roadmap — but morale takes the hit either way.',
    options: () => [
      {
        label: '✂️ Cut deep',
        description: 'Remove up to 2 cards from your deck. Lose 5 max Morale.',
        apply: async (api) => {
          await api.removeCards(2);
          api.run.maxHp -= 5;
          api.run.hp = Math.min(api.run.hp, api.run.maxHp);
          api.done();
        },
      },
      { label: '🛡 Protect the team', description: 'Leave unchanged', apply: (api) => api.done() },
    ],
  },
  {
    id: 'viral_tweet',
    name: 'Viral Post',
    emoji: '🐦',
    text: 'Your launch thread is taking off. Quote-tweets are pouring in. This either ends in sign-ups… or in ratio.',
    options: () => [
      {
        label: '🚀 Lean in',
        description: '50/50: gain 100 Budget, or gain a Doubt curse',
        apply: (api) => {
          if (api.run.rng.get('events').chance(0.5)) {
            api.run.budget += 100;
            api.message('It worked! +100 Budget');
          } else {
            api.run.deck.push(makeInstance('doubt'));
            api.message('Ratio’d. A Doubt joins your deck.');
          }
          api.done();
        },
      },
      { label: '🔕 Mute notifications', apply: (api) => api.done() },
    ],
  },
  {
    id: 'hackathon',
    name: 'Hackathon',
    emoji: '💻',
    text: 'Pizza boxes stack up. Someone is rebuilding the onboarding flow in a framework that came out on Tuesday.',
    options: () => [
      {
        label: '🛠 Join a team',
        description: 'Upgrade 2 random cards',
        apply: (api) => {
          const upgradable = api.run.rng.get('events')
            .shuffle(api.run.deck.filter((c) => !c.upgraded)).slice(0, 2);
          for (const card of upgradable) card.upgraded = true;
          api.message(upgradable.length ? `Upgraded ${upgradable.length} card(s)!` : 'Nothing left to upgrade!');
          api.done();
        },
      },
      {
        label: '🎤 Pitch a moonshot',
        description: 'Gain a random rare card… and Meetings to plan it',
        apply: (api) => {
          const rare = api.run.rng.get('events').pick(cardPool('rare'));
          api.run.deck.push(makeInstance(rare.id));
          api.run.deck.push(makeInstance('meetings'));
          api.message(`Gained ${rare.name} — and a Meetings curse.`);
          api.done();
        },
      },
      { label: '🏠 Go home early', apply: (api) => api.done() },
    ],
  },
  {
    id: 'production_outage',
    name: 'Production Outage',
    emoji: '🚒',
    text: 'PagerDuty at 3:12 AM. The status page is a Christmas tree. Legal is asking if "data loss" is singular or plural.',
    options: () => [
      {
        label: '🧯 All hands on deck',
        description: 'Lose 10 Morale, gain a relic for the war story',
        apply: (api) => {
          api.run.hp = Math.max(1, api.run.hp - 10);
          api.message('You survived the postmortem. Relic acquired!');
          api.grantRelic();
          api.done();
        },
      },
      {
        label: '📝 File tickets and sleep',
        description: 'Add 2 Bug Reports to your deck',
        apply: (api) => {
          api.run.deck.push(makeInstance('bug_report'), makeInstance('bug_report'));
          api.done();
        },
      },
    ],
  },
  {
    id: 'migration_weekend',
    name: 'Migration Weekend',
    emoji: '🗄️',
    text: 'The Great Replatforming. Two days, one database, zero rollback plan. But imagine the codebase afterwards — clean.',
    options: (run) => [
      {
        label: '⛏ Do the migration',
        description: 'Lose 12 Morale. Remove ALL Curses and Statuses from your deck.',
        disabled: run.hp <= 12,
        apply: (api) => {
          api.run.hp -= 12;
          const before = api.run.deck.length;
          api.run.deck = api.run.deck.filter((card) => {
            const def = api.run.deck && card ? cardDefLookup(card.defId) : null;
            return !def || (def.type !== 'curse' && def.type !== 'status');
          });
          api.message(`Cleaned ${before - api.run.deck.length} junk card(s) from your deck.`);
          api.done();
        },
      },
      { label: '📅 Postpone to next quarter', apply: (api) => api.done() },
    ],
  },
];

import { CARDS_BY_ID } from './index';
function cardDefLookup(id: string) {
  return CARDS_BY_ID[id];
}

export function pickEvent(run: RunState, seenEventIds: string[]): EventDef {
  const rng = run.rng.get('events');
  const pool = EVENTS.filter((e) => (e.minAct ?? 1) <= run.act && !seenEventIds.includes(e.id));
  return rng.pick(pool.length ? pool : EVENTS);
}
