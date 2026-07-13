// Game controller: routes between title, map, and room screens; owns the run.

import { h, clear } from './ui/dom';
import { CombatEngine, makeInstance } from './engine/combat/engine';
import type { CombatHost } from './engine/combat/engine';
import { CONTENT } from './content';
import { CombatScreen } from './ui/screens/combat';
import { renderMapScreen } from './ui/screens/map';
import {
  renderRewardScreen, renderRestScreen, renderTreasureScreen, renderEventScreen,
  renderShopScreen, renderEndScreen, renderBossRelicScreen, pickCardOverlay, showDeckOverlay,
} from './ui/screens/simple';
import { randomSeedString } from './core/rng';
import type { MapNode } from './engine/map/generate';
import type { RunState, ShopStock } from './engine/run/run';
import {
  newRun, moveTo, pickEncounter, budgetReward, rollCardReward, rollRelicReward,
  rollBossRelics, rollCoffeeReward, advanceAct, gainRelic, restHealAmount,
  generateShop, runScore, afterCombatHeal,
} from './engine/run/run';
import { COFFEES_BY_ID } from './content/coffee';
import type { CardDef } from './engine/types';
import { cardEl } from './ui/components/cardEl';
import { pickEvent } from './content/events';
import type { GameApi } from './content/events';

export class Game {
  private root: HTMLElement;
  private run: RunState | null = null;
  private seenEventIds: string[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
  }

  // --- title ---

  showTitle(): void {
    clear(this.root);
    this.root.appendChild(
      h('div', { class: 'screen-title' },
        h('h1', { class: 'game-title' }, 'ROADMAP RAIDERS'),
        h('p', { class: 'game-subtitle' }, 'A PM roguelike deckbuilder powered by Lenny’s Podcast'),
        h('div', { class: 'title-buttons' },
          h('button', { class: 'btn btn-primary', onTap: () => this.newGame() }, '🗺 New Run'),
        ),
        h('p', { class: 'title-credit' }, 'Unofficial fan project · Data from Lenny’s Podcast community'),
      ),
    );
  }

  newGame(seed?: string): void {
    this.run = newRun(seed ?? randomSeedString(), 0);
    this.seenEventIds = [];
    this.showMap();
  }

  // --- map ---

  showMap(): void {
    const run = this.run!;
    renderMapScreen(this.root, run, {
      onPick: (node) => this.enterNode(node),
      onShowDeck: () => showDeckOverlay(this.root, run.deck),
    });
  }

  private enterNode(node: MapNode): void {
    const run = this.run!;
    moveTo(run, node);
    switch (node.type) {
      case 'monster': return this.startCombat(node.row < 3 ? 'weak' : 'normal');
      case 'elite': return this.startCombat('elite');
      case 'boss': return this.startCombat('boss');
      case 'rest': return this.showRest();
      case 'treasure': return this.showTreasure();
      case 'shop': return this.showShop();
      case 'event': return this.showEvent();
    }
  }

  // --- combat ---

  private startCombat(pool: 'weak' | 'normal' | 'elite' | 'boss'): void {
    const run = this.run!;
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
    clear(this.root);
    const screen = new CombatScreen(this.root, engine, {
      budget: run.budget,
      floorLabel: `Sprint ${run.floorsClimbed} · Act ${run.act}`,
      coffees: () => run.coffees,
      onDrinkCoffee: (i) => {
        const id = run.coffees[i];
        const def = id ? COFFEES_BY_ID[id] : undefined;
        if (!def) return;
        run.coffees.splice(i, 1);
        engine.applyExternalEffects(def.effects);
      },
      onEnd: (result) => {
        screen.unmount();
        run.hp = engine.state.player.hp;
        if (result === 'lose') {
          this.endRun(false, 'Your Morale hit zero.');
          return;
        }
        if (pool === 'boss') run.bossesDefeated++;
        else if (pool === 'elite') run.elitesDefeated++;
        else run.monstersDefeated++;

        afterCombatHeal(run);

        if (pool === 'boss') {
          this.showBossReward();
          return;
        }
        this.showReward(pool);
      },
    });
    engine.startCombat(run.deck.map((c) => ({ ...c })), encounter.enemies, run.hp, run.maxHp);
    screen.mount();
  }

  private showReward(pool: 'weak' | 'normal' | 'elite'): void {
    const run = this.run!;
    const budget = budgetReward(run, pool);
    run.budget += budget;
    const cards = rollCardReward(run, pool === 'elite' ? 'elite' : 'normal');
    const relic = pool === 'elite' ? rollRelicReward(run) : null;
    const coffee = rollCoffeeReward(run);
    if (coffee) run.coffees.push(coffee.id);

    renderRewardScreen(this.root, {
      budget,
      cards,
      relic,
      coffee,
      onPickCard: (def) => {
        if (def) run.deck.push(makeInstance(def.id));
      },
      onTakeRelic: () => {
        if (relic) gainRelic(run, relic);
      },
      onDone: () => this.showMap(),
    });
  }

  private showBossReward(): void {
    const run = this.run!;
    const budget = budgetReward(run, 'boss');
    run.budget += budget;
    const cards = rollCardReward(run, 'boss');
    const actName = `Act ${run.act}`;

    renderRewardScreen(this.root, {
      budget,
      cards,
      relic: null,
      coffee: null,
      onPickCard: (def) => {
        if (def) run.deck.push(makeInstance(def.id));
      },
      onTakeRelic: () => {},
      onDone: () => {
        if (run.act >= 3) {
          this.endRun(true);
          return;
        }
        const bossRelics = rollBossRelics(run);
        if (bossRelics.length === 0) {
          this.nextAct();
          return;
        }
        renderBossRelicScreen(this.root, actName, bossRelics, (relic) => {
          if (relic) gainRelic(run, relic);
          this.nextAct();
        });
      },
    });
  }

  private nextAct(): void {
    const run = this.run!;
    if (!advanceAct(run)) {
      this.endRun(true);
      return;
    }
    this.showMap();
  }

  // --- rooms ---

  private showRest(): void {
    const run = this.run!;
    renderRestScreen(this.root, {
      run,
      onHeal: () => {
        run.hp = Math.min(run.maxHp, run.hp + restHealAmount(run));
        this.showMap();
      },
      onUpgrade: (card) => {
        card.upgraded = true;
        this.showMap();
      },
      onSkip: () => this.showMap(),
    });
  }

  private showTreasure(): void {
    const run = this.run!;
    const relic = rollRelicReward(run);
    renderTreasureScreen(this.root, relic, () => {
      if (relic) gainRelic(run, relic);
      this.showMap();
    });
  }

  private showShop(): void {
    const run = this.run!;
    const stock = generateShop(run);
    this.renderShop(stock);
  }

  private renderShop(stock: ShopStock): void {
    const run = this.run!;
    renderShopScreen(this.root, {
      run,
      stock,
      onBuyCard: (i) => {
        const item = stock.cards[i]!;
        run.budget -= item.price;
        item.sold = true;
        run.deck.push(makeInstance(item.def.id));
        this.renderShop(stock);
      },
      onBuyRelic: (i) => {
        const item = stock.relics[i]!;
        run.budget -= item.price;
        item.sold = true;
        gainRelic(run, item.def);
        this.renderShop(stock);
      },
      onBuyGuest: () => {
        const item = stock.guest!;
        run.budget -= item.price;
        item.sold = true;
        run.deck.push(makeInstance(item.def.id));
        this.renderShop(stock);
      },
      onRemove: () => {
        pickCardOverlay(this.root, 'Choose a card to deprecate', run.deck, (card) => {
          run.budget -= stock.removalPrice;
          stock.removalUsed = true;
          run.removalCost += 25;
          run.deck = run.deck.filter((x) => x !== card);
          this.renderShop(stock);
        });
      },
      onLeave: () => this.showMap(),
    });
  }

  private showEvent(): void {
    const run = this.run!;
    const ev = pickEvent(run, this.seenEventIds);
    this.seenEventIds.push(ev.id);

    const api: GameApi = {
      run,
      chooseCard: (title, defs, skippable) => new Promise<CardDef | null>((resolve) => {
        const overlay = h('div', { class: 'overlay' },
          h('div', { class: 'overlay-title' }, title),
          h('div', { class: 'overlay-cards' },
            ...defs.map((def) => cardEl(def, {
              onTap: () => {
                overlay.remove();
                run.deck.push(makeInstance(def.id));
                resolve(def);
              },
            }))),
          skippable
            ? h('button', { class: 'btn btn-ghost', onTap: () => { overlay.remove(); resolve(null); } }, 'Skip')
            : null,
        );
        this.root.appendChild(overlay);
      }),
      removeCards: (count) => new Promise<number>((resolve) => {
        let removed = 0;
        const step = () => {
          if (removed >= count) return resolve(removed);
          pickCardOverlay(this.root, `Remove a card (${removed + 1}/${count})`, run.deck, (card) => {
            run.deck = run.deck.filter((x) => x !== card);
            removed++;
            step();
          }, () => resolve(removed));
        };
        step();
      }),
      grantRelic: () => {
        const relic = rollRelicReward(run);
        if (relic) gainRelic(run, relic);
      },
      message: (text) => {
        const el = h('div', { class: 'msg' }, text);
        const log = h('div', { class: 'msg-log' }, el);
        document.body.appendChild(log);
        setTimeout(() => log.remove(), 3400);
      },
      done: () => this.showMap(),
    };

    renderEventScreen(this.root, ev, ev.options(run).map((o) => ({
      label: o.label,
      description: o.description,
      disabled: o.disabled,
      onPick: () => void o.apply(api),
    })));
  }

  // --- end ---

  private endRun(won: boolean, reason?: string): void {
    const run = this.run!;
    renderEndScreen(this.root, won, {
      score: runScore(run, won),
      floors: run.floorsClimbed,
      seed: run.seed,
      reason,
    }, () => this.showTitle());
    this.run = null;
  }
}
