// Guest cards: the 60 Lenny's Podcast guests as unique special-rarity cards.
// Derivation axes (grounded in the real data): ability.effect is the primary
// axis (4 buckets), domain is a rider, attack/wisdom drive the numbers,
// views-rank drives unlock order. Top-10 guests get handcrafted overrides.

import type { CardDef, Domain, Effect } from '../../engine/types';
import guestsData from '../../../data/guests.json';
import { GUEST_OVERRIDES } from './overrides';

export interface GuestData {
  id: string;
  name: string;
  episodeTitle: string;
  domain: Domain;
  attack: number;
  wisdom: number;
  abilityEffect: 'draw_2' | 'swap_card' | 'heal_2' | 'peek';
  abilityName: string;
  quotes: string[];
  keywords: string[];
  episodeDate: string;
  views: number;
  rank: number;
}

export const GUESTS: GuestData[] = (guestsData as { guests: GuestData[] }).guests;

function scaleUp(n: number, heavyweight: boolean): number {
  return heavyweight ? Math.ceil(n * 1.5) : n;
}

function domainRider(g: GuestData, heavyweight: boolean): { effects: Effect[]; text: string } {
  switch (g.domain) {
    case 'Leadership': {
      const stacks = g.attack >= 8 ? 2 : 1;
      return {
        effects: [{ kind: 'applyStatus', status: 'momentum', stacks, target: 'self' }],
        text: `Gain ${stacks} Momentum.`,
      };
    }
    case 'Growth':
      return {
        effects: [{ kind: 'applyStatus', status: 'drawNextTurn', stacks: 1, target: 'self' }],
        text: 'Draw 1 additional card next turn.',
      };
    case 'Strategy':
      return { effects: [{ kind: 'scry', count: 3 }], text: 'Scry 3.' };
    case 'Revenue': {
      const budget = g.attack * 2;
      return { effects: [{ kind: 'gainBudget', amount: budget }], text: `Gain ${budget} Budget.` };
    }
    case 'Data':
      return {
        effects: [{ kind: 'applyStatus', status: 'exposed', stacks: 1, target: 'randomEnemy' }],
        text: 'Apply 1 Exposed to a random enemy.',
      };
    case 'AI':
      return {
        effects: [{ kind: 'applyStatus', status: 'echo', stacks: 1, target: 'self' }],
        text: 'The next card you play this turn is played twice.',
      };
    case 'Design':
      return {
        effects: [{ kind: 'block', amount: scaleUp(4, heavyweight) }],
        text: `Gain ${scaleUp(4, heavyweight)} Buffer.`,
      };
    case 'Execution':
      return {
        effects: [{ kind: 'damage', amount: scaleUp(5, heavyweight), target: 'randomEnemy' }],
        text: `Deal ${scaleUp(5, heavyweight)} damage to a random enemy.`,
      };
  }
}

function generateGuestCard(g: GuestData): CardDef {
  const heavyweight = g.attack + g.wisdom >= 17;
  const cost = heavyweight ? 2 : 1;
  const rider = domainRider(g, heavyweight);
  const flavor = g.quotes[0];

  let type: CardDef['type'] = 'skill';
  let base: Effect[];
  let baseText: string;
  let keywords: CardDef['keywords'];

  switch (g.abilityEffect) {
    case 'draw_2': {
      const n = scaleUp(Math.floor(g.wisdom / 3), heavyweight);
      base = [{ kind: 'draw', count: n }];
      baseText = `Draw ${n} cards.`;
      break;
    }
    case 'swap_card': {
      base = [{ kind: 'custom', id: 'pivotDiscardDraw' }];
      baseText = 'Discard any number of cards, then draw that many.';
      keywords = ['archive'];
      break;
    }
    case 'heal_2': {
      const block = scaleUp(g.wisdom, heavyweight);
      const heal = scaleUp(Math.floor(g.attack / 3), heavyweight);
      base = [{ kind: 'block', amount: block }, { kind: 'heal', amount: heal }];
      baseText = `Gain ${block} Buffer. Heal ${heal} Morale.`;
      break;
    }
    case 'peek': {
      type = 'power';
      const n = Math.max(1, Math.floor(g.wisdom / 4));
      base = [{ kind: 'applyStatus', status: 'foresight', stacks: n, target: 'self' }];
      baseText = `Scry ${n} at the start of each turn.`;
      break;
    }
  }

  return {
    id: g.id,
    name: g.name,
    type,
    rarity: 'special',
    cost,
    target: 'none',
    effects: [...base, ...rider.effects],
    upgrade: { cost: Math.max(0, cost - 1) },
    keywords,
    text: `${baseText} ${rider.text}`,
    flavor,
    guest: { guestId: g.id, domain: g.domain, episodeTitle: g.episodeTitle },
    emoji: '🎙️',
    domain: g.domain,
  };
}

export function generateAllGuestCards(): CardDef[] {
  return GUESTS.map((g) => {
    const override = GUEST_OVERRIDES[g.id];
    return override ? override(g) : generateGuestCard(g);
  });
}
