// Relics: PM frameworks and artifacts as passive items.
// Combat hooks live here; run-level effects (rewards, shop, rest) are handled
// in engine/run code by relic id.

import type { RelicDef } from '../engine/types';
import type { RelicCombatHooks } from '../engine/combat/engine';

const r = (def: RelicDef): RelicDef => def;

export const RELICS: RelicDef[] = [
  // commons
  r({ id: 'okr_framework', name: 'OKR Framework', emoji: '🎯', rarity: 'common', description: 'Start each combat with 1 Momentum.' }),
  r({ id: 'user_interview_notes', name: 'User Interview Notes', emoji: '📓', rarity: 'common', description: 'Retros heal 10 additional Morale.' }),
  r({ id: 'sprint_retro', name: 'Sprint Retro', emoji: '🔁', rarity: 'common', description: 'Heal 5 Morale after each combat.' }),
  r({ id: 'war_room_channel', name: 'War Room Channel', emoji: '📟', rarity: 'common', description: 'Gain 1 extra Bandwidth on your first turn.' }),
  r({ id: 'kanban_board', name: 'Kanban Board', emoji: '📌', rarity: 'common', description: 'Whenever a card is Archived, gain 2 Buffer.' }),
  r({ id: 'rubber_duck', name: 'Rubber Duck', emoji: '🦆', rarity: 'common', description: 'The first Skill you play each combat costs 0.' }),
  r({ id: 'espresso_machine', name: 'Espresso Machine', emoji: '☕', rarity: 'common', description: 'You can hold 1 more Coffee.' }),
  r({ id: 'standing_desk', name: 'Standing Desk', emoji: '🧍', rarity: 'common', description: 'Gain 8 max Morale.' }),
  r({ id: 'second_monitor', name: 'Second Monitor', emoji: '🖥️', rarity: 'common', description: 'Scry 2 at the start of each combat.' }),
  r({ id: 'swag_box', name: 'Swag Box', emoji: '📦', rarity: 'common', description: 'Enemies drop 25% more Budget.' }),
  // uncommons
  r({ id: 'winning_ab_test', name: 'Winning A/B Test', emoji: '🧪', rarity: 'uncommon', description: 'The first Attack you play each combat is played twice.' }),
  r({ id: 'competitive_moat', name: 'Competitive Moat', emoji: '🏰', rarity: 'uncommon', description: 'Start each combat with 8 Buffer.' }),
  r({ id: 'series_b_deck', name: 'Series B Deck', emoji: '💼', rarity: 'uncommon', description: 'Gain 150 Budget when picked up.' }),
  r({ id: 'analytics_dashboard', name: 'Analytics Dashboard', emoji: '📊', rarity: 'uncommon', description: 'Scry 1 at the start of each turn.' }),
  r({ id: 'customer_advisory_board', name: 'Customer Advisory Board', emoji: '🧑‍🤝‍🧑', rarity: 'uncommon', description: 'Guest cards cost 1 less Bandwidth.' }),
  r({ id: 'on_call_pager', name: 'On-Call Pager', emoji: '📳', rarity: 'uncommon', description: 'Start each combat with 2 Pushback.' }),
  r({ id: 'figma_file', name: 'Figma File', emoji: '🎨', rarity: 'uncommon', description: 'Start each combat with 1 Craft.' }),
  r({ id: 'term_sheet', name: 'Term Sheet', emoji: '📃', rarity: 'uncommon', description: 'Shop prices are 20% lower.' }),
  // rares
  r({ id: 'north_star_metric', name: 'North Star Metric', emoji: '⭐', rarity: 'rare', description: 'Draw 1 additional card each turn.' }),
  r({ id: 'product_sense_relic', name: 'Product Sense', emoji: '🧠', rarity: 'rare', description: 'Card rewards offer 4 choices.' }),
  r({ id: 'ai_copilot', name: 'AI Copilot', emoji: '🤖', rarity: 'rare', description: 'The first card you play each turn costs 0.' }),
  r({ id: 'founders_hoodie', name: "Founder's Hoodie", emoji: '🧥', rarity: 'rare', description: 'Take at most 1 damage on turn 1 of Elite and Boss fights.' }),
  r({ id: 'mechanical_keyboard', name: 'Mechanical Keyboard', emoji: '⌨️', rarity: 'rare', description: 'Whenever you play 3 Attacks in a turn, draw 1 card.' }),
  // boss relics
  r({ id: 'product_market_fit', name: 'Product-Market Fit', emoji: '🚀', rarity: 'boss', description: 'Gain 1 additional Bandwidth each turn. Retros no longer heal.' }),
  r({ id: 'vision_doc_relic', name: 'The Vision Doc', emoji: '📜', rarity: 'boss', description: 'Gain 1 additional Bandwidth each turn. You can no longer remove cards from your deck.' }),
  r({ id: 'hypergrowth', name: 'Hypergrowth', emoji: '📈', rarity: 'boss', description: 'Draw 7 cards each turn. A Meetings curse is added to your deck.' }),
  // event relics
  r({ id: 'golden_gong', name: 'Golden Gong', emoji: '🔔', rarity: 'event', description: 'Ship It cards deal double damage.' }),
  r({ id: 'lennys_mic', name: "Lenny's Mic", emoji: '🎙️', rarity: 'event', description: 'Start each combat with 1 Momentum and 1 Craft.' }),
];

export const RELICS_BY_ID: Record<string, RelicDef> = Object.fromEntries(
  RELICS.map((x) => [x.id, x]),
);

export const RELIC_COMBAT_HOOKS: Record<string, RelicCombatHooks> = {
  okr_framework: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'momentum', 1),
  },
  war_room_channel: {
    onTurnStart: (engine) => {
      if (engine.state.turn === 1) engine.state.energy += 1;
    },
  },
  kanban_board: {
    onExhaust: (engine) => engine.gainBlock(engine.state.player, 'player', 0, 2, false),
  },
  rubber_duck: {
    onCardPlayed: (engine, _card, def) => {
      // first skill each combat refunds its cost
      const flagHolder = engine.state as unknown as { _duckUsed?: boolean };
      if (def.type === 'skill' && !flagHolder._duckUsed) {
        flagHolder._duckUsed = true;
        const cost = def.cost;
        if (typeof cost === 'number') engine.state.energy += cost;
      }
    },
  },
  second_monitor: {
    onCombatStart: (engine) => engine.scry(2),
  },
  winning_ab_test: {
    onCardPlayed: (engine, card, def) => {
      const flagHolder = engine.state as unknown as { _abUsed?: boolean };
      if (def.type === 'attack' && !flagHolder._abUsed) {
        flagHolder._abUsed = true;
        engine.applyEffects(engine.cardEffects(card), { source: 'player', card });
      }
    },
  },
  competitive_moat: {
    onCombatStart: (engine) => engine.gainBlock(engine.state.player, 'player', 0, 8, false),
  },
  analytics_dashboard: {
    onTurnStart: (engine) => engine.scry(1),
  },
  on_call_pager: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'pushback', 2),
  },
  figma_file: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'craft', 1),
  },
  north_star_metric: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'drawEveryTurn', 1),
  },
  ai_copilot: {
    onTurnStart: (engine) => {
      (engine.state as unknown as { _copilotArmed?: boolean })._copilotArmed = true;
    },
    onCardPlayed: (engine, _card, def) => {
      const flagHolder = engine.state as unknown as { _copilotArmed?: boolean };
      if (flagHolder._copilotArmed) {
        flagHolder._copilotArmed = false;
        const cost = def.cost;
        if (typeof cost === 'number') engine.state.energy += cost;
      }
    },
  },
  founders_hoodie: {
    onCombatStart: (engine) => {
      if (engine.host.isEliteOrBoss) engine.addStatus('player', 0, 'headsDown', 1);
    },
  },
  mechanical_keyboard: {
    onCardPlayed: (engine, _card, def) => {
      if (def.type === 'attack' && engine.state.attacksPlayedThisTurn === 3) engine.draw(1);
    },
  },
  product_market_fit: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'energizedEveryTurn', 1),
  },
  vision_doc_relic: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'energizedEveryTurn', 1),
  },
  hypergrowth: {
    onCombatStart: (engine) => engine.addStatus('player', 0, 'drawEveryTurn', 2),
  },
  golden_gong: {
    modifyAttackDamage: (_engine, amount, def) =>
      def && def.id === 'ship_it' ? amount * 2 : amount,
  },
  lennys_mic: {
    onCombatStart: (engine) => {
      engine.addStatus('player', 0, 'momentum', 1);
      engine.addStatus('player', 0, 'craft', 1);
    },
  },
};
