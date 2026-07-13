import './styles/main.css';
import { h, clear } from './ui/dom';
import { CombatEngine, makeInstance } from './engine/combat/engine';
import type { CombatHost } from './engine/combat/engine';
import { CONTENT, STARTER_DECK, ALL_ENCOUNTERS } from './content';
import { CombatScreen } from './ui/screens/combat';
import { Rng, randomSeedString } from './core/rng';

const app = document.getElementById('app')!;

function showTitle(): void {
  clear(app);
  app.appendChild(
    h('div', { class: 'screen-title' },
      h('h1', { class: 'game-title' }, 'ROADMAP RAIDERS'),
      h('p', { class: 'game-subtitle' }, 'A PM roguelike deckbuilder powered by Lenny’s Podcast'),
      h('div', { class: 'title-buttons' },
        h('button', { class: 'btn btn-primary', onTap: () => startDebugCombat('weak') }, '⚔️ Quick Fight'),
        h('button', { class: 'btn', onTap: () => startDebugCombat('elite') }, '💀 Elite Fight'),
        h('button', { class: 'btn', onTap: () => startDebugCombat('boss') }, '🏭 Boss Fight'),
      ),
      h('p', { class: 'title-credit' }, 'Unofficial fan project · Data from Lenny’s Podcast community'),
    ),
  );
}

// Phase 1 harness: jump straight into a combat. The run loop replaces this next.
function startDebugCombat(pool: 'weak' | 'normal' | 'elite' | 'boss'): void {
  const seed = randomSeedString();
  const rng = Rng.fromSeed(seed);
  let budget = 99;

  const host: CombatHost = {
    rng,
    content: CONTENT,
    relicIds: [],
    ascension: 0,
    isEliteOrBoss: pool === 'elite' || pool === 'boss',
    gainBudget: (n) => { budget += n; },
    loseBudget: (n) => { budget = Math.max(0, budget - n); },
  };

  const encounters = ALL_ENCOUNTERS.filter((e) => e.pool === pool);
  const encounter = rng.pick(encounters);
  const deck = STARTER_DECK.map((id) => makeInstance(id));

  const engine = new CombatEngine(host);
  clear(app);
  const screen = new CombatScreen(app, engine, {
    budget,
    floorLabel: `Sprint 1 · ${seed}`,
    onEnd: (result) => {
      screen.unmount();
      clear(app);
      app.appendChild(
        h('div', { class: 'screen-title' },
          h('h1', { class: 'game-title' }, result === 'win' ? 'VICTORY' : 'GAME OVER'),
          h('div', { class: 'title-buttons' },
            h('button', { class: 'btn btn-primary', onTap: showTitle }, 'Back to Title'),
          ),
        ),
      );
    },
  });
  screen.mount();
  engine.startCombat(deck, encounter.enemies, 70, 70);
}

showTitle();
