// Run state + the roguelike economy: encounters, rewards, shops, rest.

import { RngBundle } from '../../core/rng';
import type { CardDef, CardInstance, EncounterDef, RelicDef } from '../types';
import { generateMap, availableNodes } from '../map/generate';
import type { GameMap, MapNode } from '../map/generate';
import { makeInstance } from '../combat/engine';
import { ALL_ENCOUNTERS, cardPool, GUEST_CARDS, STARTER_DECK, CARDS_BY_ID } from '../../content';
import { RELICS } from '../../content/relics';
import { COFFEES } from '../../content/coffee';
import type { CoffeeDef } from '../types';

export const STARTING_HP = 70;
export const STARTING_BUDGET = 99;
export const REST_HEAL_PCT = 0.30;
export const BASE_REMOVAL_COST = 75;

export interface RunState {
  seed: string;
  ascension: number;
  act: 1 | 2 | 3;
  map: GameMap;
  position: { row: number; col: number } | null;
  hp: number;
  maxHp: number;
  budget: number;
  deck: CardInstance[];
  relics: string[];
  coffees: string[];
  coffeeSlots: number;
  floorsClimbed: number;
  monstersDefeated: number;
  elitesDefeated: number;
  bossesDefeated: number;
  removalCost: number;
  lastEncounterId: string | null;
  rng: RngBundle;
}

export function newRun(seed: string, ascension: number): RunState {
  const rng = RngBundle.fromSeed(seed);
  const run: RunState = {
    seed,
    ascension,
    act: 1,
    map: generateMap(rng.get('map'), 1),
    position: null,
    hp: ascension >= 5 ? Math.floor(STARTING_HP * 0.8) : STARTING_HP,
    maxHp: STARTING_HP,
    budget: STARTING_BUDGET,
    deck: STARTER_DECK.map((id) => makeInstance(id)),
    relics: ['pm_notebook'],
    coffees: [],
    coffeeSlots: 2,
    floorsClimbed: 0,
    monstersDefeated: 0,
    elitesDefeated: 0,
    bossesDefeated: 0,
    removalCost: BASE_REMOVAL_COST,
    lastEncounterId: null,
    rng,
  };
  if (ascension >= 6) run.deck.push(makeInstance('scope_creep_curse'));
  return run;
}

export function runScore(run: RunState, won: boolean): number {
  return run.floorsClimbed * 10
    + run.monstersDefeated * 15
    + run.elitesDefeated * 50
    + run.bossesDefeated * 150
    + (won ? 500 : 0);
}

export function nextNodes(run: RunState): MapNode[] {
  return availableNodes(run.map, run.position);
}

export function moveTo(run: RunState, node: MapNode): void {
  run.position = { row: node.row, col: node.col };
  run.floorsClimbed++;
}

// --- encounters ---

export function pickEncounter(run: RunState, pool: 'weak' | 'normal' | 'elite' | 'boss'): EncounterDef {
  // the first 3 monster fights of an act draw from the weak pool
  const effectivePool = pool === 'weak' || pool === 'normal'
    ? (run.position !== null && run.position.row < 3 ? 'weak' : 'normal')
    : pool;
  let options = ALL_ENCOUNTERS.filter((e) => e.act === run.act && e.pool === effectivePool);
  if (options.length === 0) options = ALL_ENCOUNTERS.filter((e) => e.act === run.act && e.pool === 'normal');
  const fresh = options.filter((e) => e.id !== run.lastEncounterId);
  const chosen = run.rng.get('map').pick(fresh.length ? fresh : options);
  run.lastEncounterId = chosen.id;
  return chosen;
}

// --- rewards ---

export function budgetReward(run: RunState, pool: 'weak' | 'normal' | 'elite' | 'boss'): number {
  const rng = run.rng.get('cardRewards');
  let amount: number;
  switch (pool) {
    case 'weak': amount = rng.int(10, 20); break;
    case 'normal': amount = rng.int(15, 25); break;
    case 'elite': amount = rng.int(30, 45); break;
    case 'boss': amount = rng.int(70, 90); break;
  }
  if (run.relics.includes('swag_box')) amount = Math.round(amount * 1.25);
  return amount;
}

const GUEST_REPLACE_CHANCE = 0.08;

export function rollCardReward(run: RunState, kind: 'normal' | 'elite' | 'boss'): CardDef[] {
  const rng = run.rng.get('cardRewards');
  const count = (run.relics.includes('product_sense_relic') ? 4 : 3)
    - (run.ascension >= 9 ? 1 : 0);
  const picks: CardDef[] = [];
  const taken = new Set<string>();

  for (let i = 0; i < count; i++) {
    if (kind !== 'boss' && rng.chance(GUEST_REPLACE_CHANCE)) {
      const guests = GUEST_CARDS.filter((g) => !taken.has(g.id)
        && !run.deck.some((c) => c.defId === g.id));
      if (guests.length) {
        const g = rng.pick(guests);
        taken.add(g.id);
        picks.push(g);
        continue;
      }
    }
    const rarity = kind === 'boss'
      ? 'rare'
      : rng.weighted(kind === 'elite'
          ? ([['common', 50], ['uncommon', 40], ['rare', 10]] as const)
          : ([['common', 60], ['uncommon', 35], ['rare', 5]] as const));
    const pool = cardPool(rarity).filter((cd) => !taken.has(cd.id));
    if (pool.length === 0) continue;
    const card = rng.pick(pool);
    taken.add(card.id);
    picks.push(card);
  }
  return picks;
}

export function rollRelicReward(run: RunState): RelicDef | null {
  const rng = run.rng.get('relics');
  const rarity = rng.weighted([['common', 50], ['uncommon', 33], ['rare', 17]] as const);
  let pool = RELICS.filter((r) => r.rarity === rarity && !run.relics.includes(r.id));
  if (pool.length === 0) {
    pool = RELICS.filter((r) => ['common', 'uncommon', 'rare'].includes(r.rarity) && !run.relics.includes(r.id));
  }
  return pool.length ? rng.pick(pool) : null;
}

/** advance to the next act after a boss kill; returns false after Act 3 */
export function advanceAct(run: RunState): boolean {
  if (run.act >= 3) return false;
  run.act = (run.act + 1) as 2 | 3;
  run.map = generateMap(run.rng.get('map'), run.act);
  run.position = null;
  run.lastEncounterId = null;
  return true;
}

const COFFEE_DROP_CHANCE = 0.4;

export function rollCoffeeReward(run: RunState): CoffeeDef | null {
  const rng = run.rng.get('cardRewards');
  if (run.coffees.length >= run.coffeeSlots) return null;
  if (!rng.chance(COFFEE_DROP_CHANCE)) return null;
  const rarity = rng.weighted([['common', 65], ['uncommon', 30], ['rare', 5]] as const);
  const pool = COFFEES.filter((c) => c.rarity === rarity);
  return pool.length ? rng.pick(pool) : null;
}

export function rollBossRelics(run: RunState): RelicDef[] {
  const pool = RELICS.filter((r) => r.rarity === 'boss' && !run.relics.includes(r.id));
  return run.rng.get('relics').shuffle(pool).slice(0, 3);
}

/** apply pickup side effects, then add to the relic list */
export function gainRelic(run: RunState, relic: RelicDef): void {
  run.relics.push(relic.id);
  switch (relic.id) {
    case 'series_b_deck': run.budget += 150; break;
    case 'standing_desk': run.maxHp += 8; run.hp += 8; break;
    case 'espresso_machine': run.coffeeSlots += 1; break;
    case 'hypergrowth': run.deck.push(makeInstance('meetings')); break;
  }
}

/** post-combat healing from relics (Trusty PM Notebook, Sprint Retro) */
export function afterCombatHeal(run: RunState): void {
  let heal = 0;
  if (run.relics.includes('pm_notebook')) heal += 4;
  if (run.relics.includes('sprint_retro')) heal += 5;
  if (heal > 0) run.hp = Math.min(run.maxHp, run.hp + heal);
}

// --- rest (Retro) ---

export function restHealAmount(run: RunState): number {
  if (run.relics.includes('product_market_fit')) return 0;
  const pct = run.ascension >= 4 ? 0.25 : REST_HEAL_PCT;
  let amount = Math.round(run.maxHp * pct);
  if (run.relics.includes('user_interview_notes')) amount += 10;
  return Math.min(amount, run.maxHp - run.hp);
}

// --- shop ---

export interface ShopStock {
  cards: { def: CardDef; price: number; sold: boolean }[];
  relics: { def: RelicDef; price: number; sold: boolean }[];
  guest: { def: CardDef; price: number; sold: boolean } | null;
  removalPrice: number;
  removalUsed: boolean;
}

export function generateShop(run: RunState): ShopStock {
  const rng = run.rng.get('shop');
  const priceMult = (run.relics.includes('term_sheet') ? 0.8 : 1)
    * (run.ascension >= 8 ? 1.2 : 1);
  const price = (base: number, spread: number) => Math.round((base + rng.int(0, spread)) * priceMult);

  const taken = new Set<string>();
  const pickCard = (rarity: 'common' | 'uncommon' | 'rare') => {
    const pool = cardPool(rarity).filter((cd) => !taken.has(cd.id));
    const def = rng.pick(pool);
    taken.add(def.id);
    return def;
  };

  const cards = [
    { def: pickCard('common'), price: price(45, 10), sold: false },
    { def: pickCard('common'), price: price(45, 10), sold: false },
    { def: pickCard('uncommon'), price: price(68, 14), sold: false },
    { def: pickCard('uncommon'), price: price(68, 14), sold: false },
    { def: pickCard('rare'), price: price(135, 30), sold: false },
  ];

  const relicPool = RELICS.filter((r) =>
    ['common', 'uncommon', 'rare'].includes(r.rarity) && !run.relics.includes(r.id));
  const relicPrices = { common: 150, uncommon: 200, rare: 280 } as Record<string, number>;
  const relics = rng.shuffle(relicPool).slice(0, 2).map((def) => ({
    def,
    price: Math.round(relicPrices[def.rarity]! * priceMult),
    sold: false,
  }));

  const guestPool = GUEST_CARDS.filter((g) => !run.deck.some((c) => c.defId === g.id));
  const guest = guestPool.length
    ? { def: rng.pick(guestPool), price: Math.round(120 * priceMult), sold: false }
    : null;

  return {
    cards,
    relics,
    guest,
    removalPrice: Math.round(run.removalCost * priceMult),
    removalUsed: false,
  };
}

export function canRemoveCards(run: RunState): boolean {
  return !run.relics.includes('vision_doc_relic');
}

export function cardDefFor(inst: CardInstance): CardDef {
  return CARDS_BY_ID[inst.defId]!;
}
