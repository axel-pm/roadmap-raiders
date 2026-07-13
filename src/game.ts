// Game controller: routes between title, map, and room screens; owns the run.

import { h, clear } from './ui/dom';
import { bgLayer } from './ui/art';
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
import {
  loadMeta, recordRun, saveRun, loadRun, hasSavedRun, clearRun,
  XP_PER_UNLOCK_BATCH, TOTAL_GUESTS,
} from './engine/meta/save';
import type { MetaState } from './engine/meta/save';
import { GUESTS } from './content/guests/generate';
import { renderCompendium } from './ui/screens/compendium';

export class Game {
  private root: HTMLElement;
  private run: RunState | null = null;
  private meta: MetaState;
  private ascension = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.meta = loadMeta();
    this.ascension = this.meta.maxAscensionReached;
  }

  // --- title ---

  showTitle(): void {
    clear(this.root);
    document.body.style.backgroundImage = '';
    const meta = this.meta;
    const canContinue = hasSavedRun();
    const nextUnlockIn = meta.guestsUnlocked >= TOTAL_GUESTS
      ? null
      : XP_PER_UNLOCK_BATCH - (meta.listenerXp % XP_PER_UNLOCK_BATCH);

    const ascensionRow = meta.maxAscensionReached > 0
      ? h('div', { class: 'ascension-row' },
          h('button', {
            class: 'btn btn-ghost asc-btn',
            onTap: () => { this.ascension = Math.max(0, this.ascension - 1); this.showTitle(); },
          }, '−'),
          h('span', { class: 'ascension-label' }, this.ascension === 0 ? 'Standard' : `🔥 Ascension ${this.ascension}`),
          h('button', {
            class: 'btn btn-ghost asc-btn',
            onTap: () => { this.ascension = Math.min(this.meta.maxAscensionReached, this.ascension + 1); this.showTitle(); },
          }, '+'))
      : null;

    this.root.appendChild(
      h('div', { class: 'screen-title', style: `background-image:${bgLayer('title', 0.45)}` },
        h('h1', { class: 'game-title' }, 'ROADMAP RAIDERS'),
        h('p', { class: 'game-subtitle' }, 'A PM roguelike deckbuilder powered by Lenny’s Podcast'),
        h('div', { class: 'title-buttons' },
          canContinue
            ? h('button', { class: 'btn btn-gold', onTap: () => this.continueRun() }, '▶️ Continue Run')
            : null,
          h('button', { class: 'btn btn-primary', onTap: () => this.newGame() }, '🗺 New Run'),
          ascensionRow,
          h('button', { class: 'btn', onTap: () => this.showHowTo() }, '❔ How to Play'),
          h('button', { class: 'btn', onTap: () => this.showCompendium() }, '📚 Compendium'),
          h('button', { class: 'btn', onTap: () => this.showHistory() }, '📜 Run History'),
          h('button', {
            class: 'btn btn-ghost',
            onTap: () => {
              const seed = window.prompt('Enter a run seed (e.g. SHIP-01234):');
              if (seed?.trim()) this.newGame(seed.trim().toUpperCase());
            },
          }, '🎲 Custom Seed'),
        ),
        h('p', { class: 'title-meta' },
          `🎧 ${meta.guestsUnlocked}/${TOTAL_GUESTS} guests unlocked · 🏆 ${meta.stats.wins} wins / ${meta.stats.runs} runs`
          + (nextUnlockIn !== null ? ` · next unlock in ${nextUnlockIn} XP` : '')),
        h('p', { class: 'title-credit' }, 'Unofficial fan project · Data from Lenny’s Podcast community'),
      ),
    );
  }

  newGame(seed?: string): void {
    if (hasSavedRun() && !window.confirm('Abandon the saved run and start a new one?')) return;
    clearRun();
    const unlockedIds = GUESTS.slice(0, this.meta.guestsUnlocked).map((g) => g.id);
    this.run = newRun(seed ?? randomSeedString(), this.ascension, unlockedIds);
    this.showMap();
  }

  continueRun(): void {
    const run = loadRun();
    if (!run) {
      this.showTitle();
      return;
    }
    this.run = run;
    if (run.position !== null) {
      // saved at node entry: re-enter the room (same rng → same encounter)
      const node = run.position.row >= 15
        ? run.map.boss
        : run.map.rows[run.position.row]?.[run.position.col];
      if (node) {
        this.resolveRoom(node.type);
        return;
      }
    }
    this.showMap();
  }

  private showCompendium(): void {
    renderCompendium(this.root, this.meta.guestsUnlocked, () => this.showTitle());
  }

  private showHowTo(): void {
    clear(this.root);
    const section = (title: string, text: string) =>
      h('div', { class: 'howto-section' },
        h('h3', {}, title),
        h('p', {}, text));
    this.root.appendChild(
      h('div', { class: 'room-screen' },
        h('h2', { class: 'room-title' }, '❔ How to Play'),
        h('div', { class: 'howto-grid' },
          section('🎯 Goal', 'Climb the product roadmap through 3 acts — Find PMF, Scale-Up, and The IPO Road — and defeat The HiPPO at the top. Your Morale ❤️ is your health: hit 0 and the run ends.'),
          section('⚔️ Combat', 'Each turn you get 3 Bandwidth ⚡ and draw 5 cards. Attacks deal damage, Skills defend and manipulate, Powers give lasting effects. Enemies telegraph their next move above their heads. Block what you can with Buffer 🛡, which expires each turn.'),
          section('🗺 The Roadmap', 'Pick your path: fights 👾, elites 💀, events ❓, shops 🛒, retros ☕ (heal or upgrade a card), and treasures 🎁. Every act ends in a boss 🚩.'),
          section('🎙️ Guests', 'Real Lenny’s Podcast guests are unique cards: meet them in events, hire them in shops, or find them in rewards. Win runs to earn Listener XP and unlock all 60.'),
          section('🃏 Deckbuilding', 'After each fight, add 1 of 3 cards (or skip — a thin deck is a fast deck). Upgrade at retros, remove cards in shops, collect framework relics 🔮 for passive power.'),
          section('☕ Coffee', 'Consumables you can drink any time in combat from the top bar. Espresso in an elite fight has saved many careers.'),
        ),
        h('div', { class: 'room-actions' },
          h('button', { class: 'btn btn-primary', onTap: () => this.showTitle() }, 'Back')),
      ),
    );
  }

  private showHistory(): void {
    clear(this.root);
    const rows = this.meta.runHistory.map((r) =>
      h('div', { class: 'history-row' },
        h('span', {}, r.won ? '🏆' : '💀'),
        h('span', { class: 'history-seed' }, r.seed),
        h('span', {}, r.ascension > 0 ? `A${r.ascension}` : ''),
        h('span', {}, `Act ${r.act}`),
        h('span', {}, `${r.floors} floors`),
        h('span', { class: 'history-score' }, `${r.score} pts`),
      ));
    this.root.appendChild(
      h('div', { class: 'room-screen' },
        h('h2', { class: 'room-title' }, '📜 Run History'),
        h('p', { class: 'room-sub' },
          `Listener XP: ${this.meta.listenerXp} · Best score: ${this.meta.stats.bestScore}`),
        rows.length
          ? h('div', { class: 'history-list' }, ...rows)
          : h('p', { class: 'room-sub' }, 'No runs yet. The backlog awaits.'),
        h('div', { class: 'room-actions' },
          h('button', { class: 'btn btn-primary', onTap: () => this.showTitle() }, 'Back')),
      ),
    );
  }

  // --- map ---

  showMap(): void {
    const run = this.run!;
    saveRun(run);
    renderMapScreen(this.root, run, {
      onPick: (node) => this.enterNode(node),
      onShowDeck: () => showDeckOverlay(this.root, run.deck),
    });
  }

  private enterNode(node: MapNode): void {
    const run = this.run!;
    moveTo(run, node);
    saveRun(run); // mid-room refresh resumes at this node
    this.resolveRoom(node.type);
  }

  private resolveRoom(type: MapNode['type']): void {
    const run = this.run!;
    switch (type) {
      case 'monster': return this.startCombat(run.position!.row < 3 ? 'weak' : 'normal');
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
      bgId: `act${run.act}`,
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
    const ev = pickEvent(run, run.seenEventIds);
    run.seenEventIds.push(ev.id);

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
    const score = runScore(run, won);
    const before = this.meta.guestsUnlocked;
    this.meta = recordRun(this.meta, {
      date: new Date().toISOString(),
      seed: run.seed,
      ascension: run.ascension,
      won,
      score,
      floors: run.floorsClimbed,
      act: run.act,
    });
    clearRun();
    const unlocked = this.meta.guestsUnlocked - before;
    const extras: string[] = [];
    if (unlocked > 0) extras.push(`🎧 ${unlocked} new guest${unlocked === 1 ? '' : 's'} unlocked!`);
    if (won && this.meta.maxAscensionReached > run.ascension) {
      extras.push(`🔥 Ascension ${this.meta.maxAscensionReached} unlocked!`);
    }
    renderEndScreen(this.root, won, {
      score,
      floors: run.floorsClimbed,
      seed: run.seed,
      reason: [reason, ...extras].filter(Boolean).join('  ·  ') || undefined,
    }, () => this.showTitle());
    this.run = null;
  }
}
