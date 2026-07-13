// Handlers for effects too weird for the atom union. Registered by id.

import type { CustomEffectHandler } from '../engine/combat/engine';
import { makeInstance } from '../engine/combat/engine';
import type { CardDef } from '../engine/types';

/** injected by content/index to avoid import cycles */
let cardPoolGetter: (rarity: 'uncommon' | 'rare' | 'guest') => CardDef[] = () => [];
export function setCardPoolGetter(fn: typeof cardPoolGetter): void {
  cardPoolGetter = fn;
}

export const CUSTOM_EFFECTS: Record<string, CustomEffectHandler> = {
  /** deal `arg` extra damage if the target is Exposed */
  bonusVsExposed: (engine, ctx, arg = 0) => {
    const t = engine.state.enemies.find((e) => e.uid === ctx.targetUid);
    if (t && !t.dead && t.statuses.exposed) {
      engine.dealDamage('player', t, arg, true, ctx.card ? engine.def(ctx.card) : null);
    }
  },

  /** if the chosen target died, gain `arg` energy */
  fatalEnergy: (engine, ctx, arg = 1) => {
    const t = engine.state.enemies.find((e) => e.uid === ctx.targetUid);
    if (t?.dead) engine.state.energy += arg;
  },

  /** if the chosen target died, draw `arg` and gain 1 energy */
  fatalDrawEnergy: (engine, ctx, arg = 2) => {
    const t = engine.state.enemies.find((e) => e.uid === ctx.targetUid);
    if (t?.dead) {
      engine.draw(arg);
      engine.state.energy += 1;
    }
  },

  /** discard a chosen card, then draw `arg` */
  discardChooseThenDraw: (engine, _ctx, arg = 1) => {
    const s = engine.state;
    if (s.hand.length === 0) {
      engine.draw(arg);
      return;
    }
    engine.requestChoice({
      prompt: 'Choose a card to discard',
      cards: [...s.hand],
      min: 1,
      max: 1,
      apply: (uids) => {
        const card = s.hand.find((c) => c.uid === uids[0]);
        if (card) {
          s.hand = s.hand.filter((x) => x !== card);
          s.discardPile.push(card);
        }
        engine.draw(arg);
      },
    });
  },

  /** discard `arg` chosen cards (no draw) */
  discardChoose: (engine, _ctx, arg = 1) => {
    const s = engine.state;
    if (s.hand.length === 0) return;
    const n = Math.min(arg, s.hand.length);
    engine.requestChoice({
      prompt: `Choose ${n} card${n === 1 ? '' : 's'} to discard`,
      cards: [...s.hand],
      min: n,
      max: n,
      apply: (uids) => {
        for (const uid of uids) {
          const card = s.hand.find((x) => x.uid === uid);
          if (card) {
            s.hand = s.hand.filter((x) => x !== card);
            s.discardPile.push(card);
          }
        }
      },
    });
  },

  /** put a chosen discard-pile card on top of the draw pile */
  retroNotes: (engine) => {
    const s = engine.state;
    if (s.discardPile.length === 0) return;
    engine.requestChoice({
      prompt: 'Choose a card to put on top of your draw pile',
      cards: [...s.discardPile],
      min: 1,
      max: 1,
      apply: (uids) => {
        const card = s.discardPile.find((x) => x.uid === uids[0]);
        if (card) {
          s.discardPile = s.discardPile.filter((x) => x !== card);
          s.drawPile.push(card);
        }
      },
    });
  },

  /** archive up to `arg` status/curse cards from hand, heal 2 each */
  refactorWeek: (engine, _ctx, arg = 2) => {
    const s = engine.state;
    const junk = s.hand.filter((card) => {
      const t = engine.def(card).type;
      return t === 'status' || t === 'curse';
    });
    if (junk.length === 0) return;
    engine.requestChoice({
      prompt: `Archive up to ${arg} Status/Curse cards (heal 2 each)`,
      cards: junk,
      min: 0,
      max: arg,
      apply: (uids) => {
        for (const uid of uids) {
          const card = s.hand.find((x) => x.uid === uid);
          if (card) {
            engine.exhaust(card);
            engine.heal('player', 0, 2);
          }
        }
      },
    });
  },

  /** choose 1 of `arg` random uncommon cards; it goes to hand costing 0 this combat */
  abTest: (engine, _ctx, arg = 2) => {
    const pool = cardPoolGetter('uncommon').filter((d) => d.id !== 'ab_test');
    if (pool.length === 0) return;
    const options = engine.host.rng.shuffle(pool).slice(0, arg).map((d) => {
      const inst = makeInstance(d.id);
      inst.freeThisCombat = true;
      return inst;
    });
    engine.requestChoice({
      prompt: 'A/B Test: choose a variant',
      cards: options,
      min: 1,
      max: 1,
      apply: (uids) => {
        const chosen = options.find((o) => o.uid === uids[0]);
        if (chosen && engine.state.hand.length < 10) engine.state.hand.push(chosen);
      },
    });
  },

  /** choose any card from the draw pile into hand */
  chooseFromDraw: (engine) => {
    const s = engine.state;
    if (s.drawPile.length === 0) return;
    engine.requestChoice({
      prompt: 'Choose a card from your draw pile',
      cards: [...s.drawPile],
      min: 1,
      max: 1,
      apply: (uids) => {
        const card = s.drawPile.find((x) => x.uid === uids[0]);
        if (card && s.hand.length < 10) {
          s.drawPile = s.drawPile.filter((x) => x !== card);
          s.hand.push(card);
        }
      },
    });
  },

  /** discard hand, draw `arg` */
  hardReset: (engine, _ctx, arg = 5) => {
    const s = engine.state;
    s.discardPile.push(...s.hand);
    s.hand = [];
    engine.draw(arg);
  },

  /** choose 1 of `arg` random guest cards; free this combat */
  acquihire: (engine, _ctx, arg = 3) => {
    let pool = cardPoolGetter('guest');
    if (pool.length === 0) pool = cardPoolGetter('rare');
    if (pool.length === 0) return;
    const options = engine.host.rng.shuffle(pool).slice(0, arg).map((d) => {
      const inst = makeInstance(d.id);
      inst.freeThisCombat = true;
      return inst;
    });
    engine.requestChoice({
      prompt: 'Acqui-hire: choose a guest to bring in',
      cards: options,
      min: 1,
      max: 1,
      apply: (uids) => {
        const chosen = options.find((o) => o.uid === uids[0]);
        if (chosen && engine.state.hand.length < 10) engine.state.hand.push(chosen);
      },
    });
  },

  /** gain Budget = damageDealt this combat / arg */
  ipoBudget: (engine, _ctx, arg = 2) => {
    const amount = Math.floor(engine.state.damageDealt / arg);
    if (amount > 0) engine.host.gainBudget(amount);
  },

  /** Eric Ries: whenever a card is Archived, draw 1 */
  leanLoop: (engine) => {
    engine.addStatus('player', 0, 'archiveDraw', 1);
  },

  /** Marc Andreessen: archive your hand, deal `arg` damage per card archived */
  pmfOrDie: (engine, ctx, arg = 6) => {
    const s = engine.state;
    const count = s.hand.length;
    for (const card of [...s.hand]) engine.exhaust(card);
    const t = s.enemies.find((en) => en.uid === ctx.targetUid && !en.dead) ?? engine.randomAliveEnemy();
    if (t && count > 0) {
      engine.dealDamage('player', t, arg * count, true, ctx.card ? engine.def(ctx.card) : null);
    }
  },

  /** guest Pivot: discard any number of cards, draw that many */
  pivotDiscardDraw: (engine) => {
    const s = engine.state;
    if (s.hand.length === 0) return;
    engine.requestChoice({
      prompt: 'Discard any number of cards, then draw that many',
      cards: [...s.hand],
      min: 0,
      max: s.hand.length,
      apply: (uids) => {
        let n = 0;
        for (const uid of uids) {
          const card = s.hand.find((x) => x.uid === uid);
          if (card) {
            s.hand = s.hand.filter((x) => x !== card);
            s.discardPile.push(card);
            n++;
          }
        }
        engine.draw(n);
      },
    });
  },

  /** Scope Creep curse: add a copy of itself to discard (max 5 copies total) */
  scopeCreepReplicate: (engine) => {
    const s = engine.state;
    const count = [...s.hand, ...s.drawPile, ...s.discardPile]
      .filter((card) => card.defId === 'scope_creep_curse').length;
    if (count >= 5) return;
    s.discardPile.push(makeInstance('scope_creep_curse'));
  },
};
