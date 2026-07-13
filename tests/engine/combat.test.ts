import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine, makeInstance } from '../../src/engine/combat/engine';
import type { CombatHost } from '../../src/engine/combat/engine';
import { CONTENT, STARTER_DECK, ALL_CARDS, GUEST_CARDS } from '../../src/content';
import { Rng } from '../../src/core/rng';

function makeHost(seed = 'TEST-1', relicIds: string[] = []): CombatHost & { budget: number } {
  const host = {
    rng: Rng.fromSeed(seed),
    content: CONTENT,
    relicIds,
    ascension: 0,
    budget: 0,
    gainBudget(n: number) { host.budget += n; },
    loseBudget(n: number) { host.budget = Math.max(0, host.budget - n); },
  };
  return host;
}

function starterDeck() {
  return STARTER_DECK.map((id) => makeInstance(id));
}

function newCombat(enemies: string[], opts: { seed?: string; relics?: string[]; deck?: ReturnType<typeof starterDeck> } = {}) {
  const host = makeHost(opts.seed ?? 'TEST-1', opts.relics ?? []);
  const engine = new CombatEngine(host);
  engine.startCombat(opts.deck ?? starterDeck(), enemies, 70, 70);
  return { engine, host };
}

describe('combat basics', () => {
  let engine: CombatEngine;

  beforeEach(() => {
    ({ engine } = newCombat(['meeting_goblin']));
  });

  it('starts with 3 energy, 5 cards, turn 1', () => {
    expect(engine.state.energy).toBe(3);
    expect(engine.state.hand.length).toBe(5);
    expect(engine.state.turn).toBe(1);
  });

  it('playing an attack deals damage and spends energy', () => {
    const shipIt = engine.state.hand.find((c) => c.defId === 'ship_it')!;
    const enemy = engine.state.enemies[0]!;
    const hpBefore = enemy.hp;
    engine.playCard(shipIt.uid, enemy.uid);
    expect(enemy.hp).toBe(hpBefore - 6);
    expect(engine.state.energy).toBe(2);
    expect(engine.state.discardPile).toContain(shipIt);
  });

  it('block absorbs enemy damage and expires next turn', () => {
    const sayNo = engine.state.hand.find((c) => c.defId === 'say_no')!;
    engine.playCard(sayNo.uid);
    expect(engine.state.player.block).toBe(5);
    const hpBefore = engine.state.player.hp;
    // force the enemy to attack (Ramble = 4 damage)
    engine.state.enemies[0]!.currentMove = 'ramble';
    engine.endTurn();
    expect(engine.state.player.hp).toBe(hpBefore); // 4 fully blocked
    expect(engine.state.player.block).toBe(0); // decayed at turn start
  });

  it('cannot play a card that costs more than remaining energy', () => {
    const s = engine.state;
    s.energy = 0;
    const shipIt = s.hand.find((c) => c.defId === 'ship_it')!;
    const enemy = s.enemies[0]!;
    const hpBefore = enemy.hp;
    engine.playCard(shipIt.uid, enemy.uid);
    expect(enemy.hp).toBe(hpBefore);
    expect(s.hand).toContain(shipIt);
  });

  it('killing all enemies wins the combat', () => {
    const enemy = engine.state.enemies[0]!;
    enemy.hp = 5;
    const shipIt = engine.state.hand.find((c) => c.defId === 'ship_it')!;
    engine.playCard(shipIt.uid, enemy.uid);
    expect(engine.state.over).toBe('win');
  });

  it('player death loses the combat', () => {
    engine.state.player.hp = 1;
    engine.state.enemies[0]!.currentMove = 'ramble';
    engine.endTurn();
    expect(engine.state.over).toBe('lose');
  });
});

describe('damage pipeline', () => {
  it('momentum adds flat damage, exposed multiplies by 1.5', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const enemy = engine.state.enemies[0]!;
    engine.addStatus('player', 0, 'momentum', 2);
    engine.addStatus('enemy', enemy.uid, 'exposed', 1);
    const hpBefore = enemy.hp;
    engine.dealDamage('player', enemy, 6, true);
    // (6 + 2) * 1.5 = 12
    expect(hpBefore - enemy.hp).toBe(12);
  });

  it('distracted reduces attack damage by 25%', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const enemy = engine.state.enemies[0]!;
    engine.addStatus('player', 0, 'distracted', 1);
    const hpBefore = enemy.hp;
    engine.dealDamage('player', enemy, 8, true);
    expect(hpBefore - enemy.hp).toBe(6); // floor(8 * 0.75)
  });

  it('headsDown caps damage at 1', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.addStatus('player', 0, 'headsDown', 1);
    const hpBefore = engine.state.player.hp;
    engine.dealDamage(engine.state.enemies[0]!, 'player', 20, true);
    expect(hpBefore - engine.state.player.hp).toBe(1);
  });

  it('pushback damages the attacker', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const enemy = engine.state.enemies[0]!;
    engine.addStatus('player', 0, 'pushback', 3);
    const enemyHpBefore = enemy.hp;
    engine.dealDamage(enemy, 'player', 5, true);
    expect(enemyHpBefore - enemy.hp).toBe(3);
  });

  it('burnout reduces block gained from cards', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.addStatus('player', 0, 'burnout', 1);
    engine.gainBlock(engine.state.player, 'player', 0, 8, true);
    expect(engine.state.player.block).toBe(6); // floor(8 * 0.75)
  });

  it('alignment negates a debuff', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.addStatus('player', 0, 'alignment', 1);
    engine.addStatus('player', 0, 'distracted', 2);
    expect(engine.state.player.statuses.distracted).toBeUndefined();
    expect(engine.state.player.statuses.alignment).toBeUndefined();
  });

  it('techDebt ticks at turn start and decrements', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.addStatus('player', 0, 'techDebt', 3);
    const hpBefore = engine.state.player.hp;
    engine.state.enemies[0]!.currentMove = 'lookHarmless';
    engine.endTurn();
    expect(hpBefore - engine.state.player.hp).toBe(3);
    expect(engine.state.player.statuses.techDebt).toBe(2);
  });
});

describe('deck mechanics', () => {
  it('reshuffles discard into draw pile when empty', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const s = engine.state;
    s.discardPile.push(...s.drawPile);
    s.drawPile = [];
    engine.draw(3);
    expect(s.hand.length).toBe(8);
  });

  it('hand caps at 10', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.draw(20);
    expect(engine.state.hand.length).toBe(10);
  });

  it('FOMO cards are archived at end of turn', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const standup = makeInstance('standup');
    engine.state.hand.push(standup);
    engine.state.enemies[0]!.currentMove = 'lookHarmless';
    engine.endTurn();
    expect(engine.state.exhaustPile).toContain(standup);
  });

  it('pinned cards stay in hand at end of turn', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const note = makeInstance('write_it_down');
    engine.state.hand.push(note);
    engine.state.enemies[0]!.currentMove = 'lookHarmless';
    engine.endTurn();
    expect(engine.state.hand).toContain(note);
  });

  it('scry requests a choice and puts discards in discard pile', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.scry(2);
    expect(engine.state.pendingChoice).not.toBeNull();
    const choice = engine.state.pendingChoice!;
    const discarded = choice.cards[0]!;
    engine.resolveChoice([discarded.uid]);
    expect(engine.state.discardPile).toContain(discarded);
    expect(engine.state.pendingChoice).toBeNull();
  });

  it('X-cost cards spend all energy', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const bigBet = makeInstance('big_bet');
    engine.state.hand.push(bigBet);
    const enemy = engine.state.enemies[0]!;
    const hpBefore = enemy.hp;
    engine.playCard(bigBet.uid);
    expect(engine.state.energy).toBe(0);
    expect(hpBefore - enemy.hp).toBe(24); // 8 x 3
  });
});

describe('powers and statuses over turns', () => {
  it('OKRs grants momentum each turn', () => {
    const { engine } = newCombat(['mvp_mimic']);
    const okrs = makeInstance('okrs');
    engine.state.hand.push(okrs);
    engine.playCard(okrs.uid);
    expect(engine.state.powersInPlay).toContain(okrs);
    engine.state.enemies[0]!.currentMove = 'lookHarmless';
    engine.endTurn();
    expect(engine.state.player.statuses.momentum).toBe(1);
    engine.state.enemies[0]!.currentMove = 'lookHarmless';
    engine.endTurn();
    expect(engine.state.player.statuses.momentum).toBe(2);
  });

  it('echo doubles the next card', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.addStatus('player', 0, 'echo', 1);
    const shipIt = engine.state.hand.find((c) => c.defId === 'ship_it')!;
    const enemy = engine.state.enemies[0]!;
    const hpBefore = enemy.hp;
    engine.playCard(shipIt.uid, enemy.uid);
    expect(hpBefore - enemy.hp).toBe(12);
    expect(engine.state.player.statuses.echo).toBeUndefined();
  });

  it('archive keyword exhausts the card and triggers archiveBuffer', () => {
    const { engine } = newCombat(['mvp_mimic']);
    engine.addStatus('player', 0, 'archiveBuffer', 3);
    const warRoom = makeInstance('war_room');
    engine.state.hand.push(warRoom);
    engine.playCard(warRoom.uid);
    expect(engine.state.exhaustPile).toContain(warRoom);
    expect(engine.state.player.block).toBe(3);
  });
});

describe('enemy behavior', () => {
  it('enemies telegraph and execute their moves', () => {
    const { engine } = newCombat(['bikeshedding_demon']);
    const enemy = engine.state.enemies[0]!;
    expect(enemy.currentMove).toBeTruthy();
    const intent = engine.intentView(enemy);
    expect(intent.name).toBeTruthy();
    const hpBefore = engine.state.player.hp;
    enemy.currentMove = 'nitpick';
    engine.endTurn();
    expect(engine.state.player.hp).toBe(hpBefore - 5);
  });

  it('meeting goblin can add Meetings curses to the discard pile', () => {
    const { engine } = newCombat(['meeting_goblin']);
    const enemy = engine.state.enemies[0]!;
    enemy.currentMove = 'anotherMeeting';
    engine.endTurn();
    expect(engine.state.discardPile.some((card) => card.defId === 'meetings')).toBe(true);
  });

  it('scope creep dragon grows below 50% hp', () => {
    const { engine } = newCombat(['scope_creep_dragon']);
    const dragon = engine.state.enemies[0]!;
    dragon.hp = Math.floor(dragon.maxHp * 0.4);
    engine.rollIntent(dragon);
    expect(dragon.currentMove).toBe('grow');
  });

  it('vanity phantom alternates buff and attack', () => {
    const { engine } = newCombat(['vanity_metrics_phantom']);
    const phantom = engine.state.enemies[0]!;
    expect(phantom.currentMove).toBe('impressiveChart');
    engine.endTurn();
    expect(phantom.currentMove).toBe('hollowNumber');
  });
});

describe('content sanity', () => {
  it('all card effects resolve without throwing', () => {
    for (const def of ALL_CARDS) {
      const { engine } = newCombat(['mvp_mimic', 'meeting_goblin'], { seed: `sanity-${def.id}` });
      const inst = makeInstance(def.id);
      engine.state.hand.push(inst);
      engine.state.energy = 99;
      const target = engine.state.enemies[0]!.uid;
      expect(() => {
        engine.playCard(inst.uid, target);
        if (engine.state.pendingChoice) {
          const choice = engine.state.pendingChoice;
          engine.resolveChoice(choice.cards.slice(0, choice.min).map((x) => x.uid));
        }
      }, `card ${def.id}`).not.toThrow();
    }
  });

  it('all upgraded card effects resolve without throwing', () => {
    for (const def of ALL_CARDS) {
      const { engine } = newCombat(['mvp_mimic', 'meeting_goblin'], { seed: `sanity-up-${def.id}` });
      const inst = makeInstance(def.id, true);
      engine.state.hand.push(inst);
      engine.state.energy = 99;
      expect(() => {
        engine.playCard(inst.uid, engine.state.enemies[0]!.uid);
        if (engine.state.pendingChoice) {
          const choice = engine.state.pendingChoice;
          engine.resolveChoice(choice.cards.slice(0, choice.min).map((x) => x.uid));
        }
      }, `card ${def.id}+`).not.toThrow();
    }
  });

  it('generates exactly 60 unique guest cards', () => {
    expect(GUEST_CARDS.length).toBe(60);
    expect(new Set(GUEST_CARDS.map((g) => g.id)).size).toBe(60);
    for (const g of GUEST_CARDS) {
      expect(g.rarity).toBe('special');
      expect(g.guest).toBeTruthy();
    }
  });
});

describe('determinism', () => {
  it('same seed produces identical combat outcomes', () => {
    const run = (seed: string) => {
      const { engine } = newCombat(['bikeshedding_demon', 'meeting_goblin'], { seed });
      const log: string[] = [];
      for (let i = 0; i < 10 && !engine.state.over; i++) {
        const playable = engine.state.hand.filter((card) => engine.canPlay(card));
        for (const card of playable) {
          if (engine.state.over || engine.state.pendingChoice) break;
          const target = engine.state.enemies.find((e) => !e.dead);
          engine.playCard(card.uid, target?.uid);
        }
        if (engine.state.pendingChoice) engine.resolveChoice([]);
        if (!engine.state.over) engine.endTurn();
        log.push(`${engine.state.player.hp}:${engine.state.enemies.map((e) => e.hp).join(',')}`);
      }
      return log.join('|');
    };
    expect(run('DET-42')).toBe(run('DET-42'));
    expect(run('DET-42')).not.toBe(run('DET-43'));
  });
});
