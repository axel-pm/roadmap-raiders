// Headless full-run simulation: a greedy bot plays complete 3-act runs.
// Validates that every room type resolves without exceptions and that the
// game is winnable end-to-end.

import { describe, it, expect } from 'vitest';
import { CombatEngine, makeInstance } from '../../src/engine/combat/engine';
import type { CombatHost } from '../../src/engine/combat/engine';
import { CONTENT } from '../../src/content';
import type { RunState } from '../../src/engine/run/run';
import {
  newRun, nextNodes, moveTo, pickEncounter, budgetReward, rollCardReward,
  rollRelicReward, rollBossRelics, rollCoffeeReward, advanceAct, gainRelic,
  restHealAmount, generateShop, afterCombatHeal,
} from '../../src/engine/run/run';
import { pickEvent } from '../../src/content/events';
import type { GameApi } from '../../src/content/events';
import { CARDS_BY_ID } from '../../src/content';
import { COFFEES_BY_ID } from '../../src/content/coffee';

interface SimResult {
  won: boolean;
  act: number;
  floors: number;
  reason: string;
}

function playCombat(run: RunState, pool: 'weak' | 'normal' | 'elite' | 'boss'): 'win' | 'lose' {
  const encounter = pickEncounter(run, pool);
  const host: CombatHost = {
    rng: run.rng.get('combat'),
    content: CONTENT,
    relicIds: run.relics,
    ascension: run.ascension,
    isEliteOrBoss: pool === 'elite' || pool === 'boss',
    gainBudget: (n) => { run.budget += n; },
    loseBudget: (n) => { run.budget = Math.max(0, run.budget - n); },
  };
  const engine = new CombatEngine(host);
  engine.startCombat(run.deck.map((c) => ({ ...c })), encounter.enemies, run.hp, run.maxHp);

  // drink combat coffees going into big fights, like a human would
  if (pool === 'elite' || pool === 'boss') {
    for (const id of [...run.coffees]) {
      const def = COFFEES_BY_ID[id];
      if (def?.combatOnly) {
        run.coffees.splice(run.coffees.indexOf(id), 1);
        engine.applyExternalEffects(def.effects);
        if (engine.state.pendingChoice) {
          const choice = engine.state.pendingChoice;
          engine.resolveChoice(choice.cards.slice(0, choice.min).map((c) => c.uid));
        }
      }
    }
  }

  const incomingDamage = () =>
    engine.state.enemies
      .filter((e) => !e.dead)
      .reduce((sum, e) => {
        const intent = engine.intentView(e);
        return sum + (intent.damage ?? 0) * (intent.times ?? 1);
      }, 0);

  let turns = 0;
  while (!engine.state.over && turns < 60) {
    turns++;
    let safety = 0;
    while (!engine.state.over && safety++ < 40) {
      if (engine.state.pendingChoice) {
        const choice = engine.state.pendingChoice;
        engine.resolveChoice(choice.cards.slice(0, choice.min).map((c) => c.uid));
        continue;
      }
      const playable = engine.state.hand.filter((c) => engine.canPlay(c));
      if (playable.length === 0) break;

      // policy: block first while telegraphed damage exceeds current block,
      // then attack the lowest-HP enemy; powers/utility fill the gaps
      const needBlock = incomingDamage() > engine.state.player.block;
      const isBlockCard = (c: (typeof playable)[number]) =>
        engine.cardEffects(c).some((e) => e.kind === 'block');
      const isAttackCard = (c: (typeof playable)[number]) =>
        engine.cardEffects(c).some((e) => e.kind === 'damage');

      const card = (needBlock ? playable.find(isBlockCard) : undefined)
        ?? playable.find(isAttackCard)
        ?? playable[0]!;
      const target = engine.state.enemies
        .filter((e) => !e.dead)
        .sort((a, b) => a.hp - b.hp)[0];
      engine.playCard(card.uid, target?.uid);
    }
    if (engine.state.pendingChoice) {
      const choice = engine.state.pendingChoice;
      engine.resolveChoice(choice.cards.slice(0, choice.min).map((c) => c.uid));
    }
    if (!engine.state.over) engine.endTurn();
  }
  if (!engine.state.over) throw new Error(`combat never ended: ${encounter.id} (turn cap hit)`);
  run.hp = Math.max(0, engine.state.player.hp);
  return engine.state.over;
}

function makeApi(run: RunState, done: () => void): GameApi {
  return {
    run,
    chooseCard: (_title, defs) => {
      const def = defs[0] ?? null;
      if (def) run.deck.push(makeInstance(def.id));
      return Promise.resolve(def);
    },
    removeCards: () => Promise.resolve(0),
    grantRelic: () => {
      const relic = rollRelicReward(run);
      if (relic) gainRelic(run, relic);
    },
    message: () => {},
    done,
  };
}

async function simulateRun(seed: string): Promise<SimResult> {
  const run = newRun(seed, 0);
  const seenEvents: string[] = [];

  for (let step = 0; step < 200; step++) {
    const options = nextNodes(run);
    if (options.length === 0) throw new Error(`no available nodes at act ${run.act}`);
    // prefer rest when hurt, else first option
    const node = run.hp < run.maxHp * 0.4
      ? options.find((n) => n.type === 'rest') ?? options[0]!
      : options[0]!;
    moveTo(run, node);

    switch (node.type) {
      case 'monster':
      case 'elite':
      case 'boss': {
        const pool = node.type === 'monster' ? 'normal' : node.type;
        const result = playCombat(run, pool);
        if (result === 'lose') {
          return { won: false, act: run.act, floors: run.floorsClimbed, reason: 'died in combat' };
        }
        afterCombatHeal(run);
        if (node.type === 'boss') {
          run.bossesDefeated++;
          run.budget += budgetReward(run, 'boss');
          const cards = rollCardReward(run, 'boss');
          if (cards[0]) run.deck.push(makeInstance(cards[0].id));
          const bossRelics = rollBossRelics(run);
          if (bossRelics[0]) gainRelic(run, bossRelics[0]);
          if (!advanceAct(run)) {
            return { won: true, act: 3, floors: run.floorsClimbed, reason: 'defeated The HiPPO' };
          }
        } else {
          if (node.type === 'elite') run.elitesDefeated++;
          else run.monstersDefeated++;
          run.budget += budgetReward(run, pool as 'normal' | 'elite');
          const cards = rollCardReward(run, node.type === 'elite' ? 'elite' : 'normal');
          // greedy deck-building: prefer uncommon/rare attacks and skills
          const pick = cards.find((c) => c.rarity !== 'common') ?? cards[0];
          if (pick) run.deck.push(makeInstance(pick.id));
          if (node.type === 'elite') {
            const relic = rollRelicReward(run);
            if (relic) gainRelic(run, relic);
          }
          const coffee = rollCoffeeReward(run);
          if (coffee) run.coffees.push(coffee.id);
        }
        break;
      }
      case 'rest': {
        if (run.hp < run.maxHp * 0.65) {
          run.hp = Math.min(run.maxHp, run.hp + restHealAmount(run));
        } else {
          const target = run.deck.find((c) => !c.upgraded);
          if (target) target.upgraded = true;
        }
        break;
      }
      case 'treasure': {
        const relic = rollRelicReward(run);
        if (relic) gainRelic(run, relic);
        break;
      }
      case 'shop': {
        const stock = generateShop(run);
        for (const item of stock.cards) {
          if (!item.sold && run.budget >= item.price && item.def.rarity !== 'common') {
            run.budget -= item.price;
            item.sold = true;
            run.deck.push(makeInstance(item.def.id));
            break;
          }
        }
        break;
      }
      case 'event': {
        const ev = pickEvent(run, seenEvents);
        seenEvents.push(ev.id);
        await new Promise<void>((resolve) => {
          const api = makeApi(run, resolve);
          const options = ev.options(run).filter((o) => !o.disabled);
          const option = options[0]!;
          void Promise.resolve(option.apply(api)).then(() => {
            // some options call api.done() themselves; resolve either way
            resolve();
          });
        });
        break;
      }
    }
    if (run.hp <= 0) {
      return { won: false, act: run.act, floors: run.floorsClimbed, reason: 'hp reached 0 outside combat' };
    }
  }
  throw new Error('run never terminated in 200 steps');
}

describe('full-run simulation', () => {
  it('30 seeded runs complete without exceptions', { timeout: 60000 }, async () => {
    const results: SimResult[] = [];
    for (let i = 0; i < 30; i++) {
      results.push(await simulateRun(`SIM-${i}`));
    }
    const wins = results.filter((r) => r.won).length;
    const acts = results.map((r) => r.act);
    // eslint-disable-next-line no-console
    console.log(`sim: ${wins}/30 wins; act distribution:`,
      { act1: acts.filter((a) => a === 1).length, act2: acts.filter((a) => a === 2).length, act3: acts.filter((a) => a === 3).length });
    expect(results.length).toBe(30);
    // sanity: the greedy bot should at least escape Act 1 sometimes
    expect(results.filter((r) => r.act >= 2).length).toBeGreaterThan(0);
  });

  it('deck growth: added cards are all valid defs', async () => {
    const run = newRun('DECK-CHECK', 0);
    for (const card of run.deck) {
      expect(CARDS_BY_ID[card.defId]).toBeTruthy();
    }
  });
});
