// Reward, rest, treasure, event, shop, end screens — the non-combat rooms.

import { h, clear } from '../dom';
import { cardEl, cardElFromInstance } from '../components/cardEl';
import type { CardDef, CardInstance, RelicDef } from '../../engine/types';
import type { RunState, ShopStock } from '../../engine/run/run';
import { restHealAmount, canRemoveCards } from '../../engine/run/run';
import { GUESTS } from '../../content/guests/generate';

function screenShell(root: HTMLElement, title: string, ...children: (Node | null)[]): void {
  clear(root);
  root.appendChild(
    h('div', { class: 'room-screen' },
      h('h2', { class: 'room-title' }, title),
      ...children.filter((x): x is Node => x !== null),
    ),
  );
}

// --- combat reward ---

export interface RewardOpts {
  budget: number;
  cards: CardDef[];
  relic: RelicDef | null;
  onPickCard: (def: CardDef | null) => void;
  onTakeRelic: () => void;
  onDone: () => void;
}

export function renderRewardScreen(root: HTMLElement, opts: RewardOpts): void {
  let cardTaken = false;
  let relicTaken = opts.relic === null;

  const rerender = () => {
    screenShell(root, '🎉 Spoils of Victory',
      h('p', { class: 'room-sub' }, `+${opts.budget} 💰 Budget collected`),
      opts.relic && !relicTaken
        ? h('div', { class: 'relic-offer', onTap: () => { relicTaken = true; opts.onTakeRelic(); rerender(); } },
            h('span', { class: 'relic-offer-emoji' }, opts.relic.emoji),
            h('div', {},
              h('div', { class: 'relic-offer-name' }, opts.relic.name),
              h('div', { class: 'relic-offer-desc' }, opts.relic.description)))
        : null,
      !cardTaken
        ? h('div', {},
            h('p', { class: 'room-sub' }, 'Add a card to your deck:'),
            h('div', { class: 'overlay-cards' },
              ...opts.cards.map((def) => cardEl(def, {
                onTap: () => { cardTaken = true; opts.onPickCard(def); rerender(); },
              }))),
            h('div', { class: 'room-actions' },
              h('button', { class: 'btn btn-ghost', onTap: () => { cardTaken = true; opts.onPickCard(null); rerender(); } }, 'Skip card')))
        : h('div', { class: 'room-actions' },
            h('button', { class: 'btn btn-primary', onTap: opts.onDone }, 'Continue ▶')),
    );
  };
  rerender();
}

// --- rest (Retro) ---

export interface RestOpts {
  run: RunState;
  onHeal: () => void;
  onUpgrade: (card: CardInstance) => void;
  onSkip: () => void;
}

export function renderRestScreen(root: HTMLElement, opts: RestOpts): void {
  const heal = restHealAmount(opts.run);
  const upgradable = opts.run.deck.filter((c) => !c.upgraded);

  screenShell(root, '☕ Sprint Retro',
    h('p', { class: 'room-sub' }, 'Take a breath. What went well? What could be improved?'),
    h('div', { class: 'room-actions room-actions-col' },
      h('button', {
        class: 'btn btn-primary',
        disabled: heal <= 0,
        onTap: () => { if (heal > 0) opts.onHeal(); },
      }, heal > 0 ? `😴 Recover — heal ${heal} Morale` : '😴 Recover — nothing to heal'),
      h('button', {
        class: 'btn',
        disabled: upgradable.length === 0,
        onTap: () => {
          if (!upgradable.length) return;
          pickCardOverlay(root, 'Choose a card to upgrade', upgradable, (card) => opts.onUpgrade(card));
        },
      }, '⬆️ Iterate — upgrade a card'),
      h('button', { class: 'btn btn-ghost', onTap: opts.onSkip }, 'Skip'),
    ),
  );
}

// --- treasure ---

export function renderTreasureScreen(root: HTMLElement, relic: RelicDef | null, onDone: () => void): void {
  screenShell(root, '🎁 Quarterly Win',
    relic
      ? h('div', { class: 'relic-offer' },
          h('span', { class: 'relic-offer-emoji' }, relic.emoji),
          h('div', {},
            h('div', { class: 'relic-offer-name' }, relic.name),
            h('div', { class: 'relic-offer-desc' }, relic.description)))
      : h('p', { class: 'room-sub' }, 'The chest is empty. Classic enterprise procurement.'),
    h('div', { class: 'room-actions' },
      h('button', { class: 'btn btn-primary', onTap: onDone }, relic ? 'Take it ▶' : 'Continue ▶')),
  );
}

// --- event ---

export interface EventOptionView {
  label: string;
  description?: string;
  disabled?: boolean;
  onPick: () => void;
}

export function renderEventScreen(
  root: HTMLElement,
  ev: { name: string; emoji: string; text: string },
  options: EventOptionView[],
): void {
  screenShell(root, `${ev.emoji} ${ev.name}`,
    h('p', { class: 'room-sub event-text' }, ev.text),
    h('div', { class: 'room-actions room-actions-col' },
      ...options.map((o) =>
        h('button', { class: 'btn event-option', disabled: o.disabled, onTap: () => { if (!o.disabled) o.onPick(); } },
          h('div', {}, o.label),
          o.description ? h('div', { class: 'event-option-desc' }, o.description) : null)),
    ),
  );
}

// --- shop ---

export interface ShopOpts {
  run: RunState;
  stock: ShopStock;
  onBuyCard: (i: number) => void;
  onBuyRelic: (i: number) => void;
  onBuyGuest: () => void;
  onRemove: () => void;
  onLeave: () => void;
}

export function renderShopScreen(root: HTMLElement, opts: ShopOpts): void {
  const { run, stock } = opts;
  const afford = (p: number) => run.budget >= p;

  const cardStall = h('div', { class: 'overlay-cards' });
  stock.cards.forEach((item, i) => {
    if (item.sold) return;
    const wrap = h('div', { class: 'shop-item' },
      cardEl(item.def, { small: true, onTap: () => { if (afford(item.price)) opts.onBuyCard(i); } }),
      h('div', { class: `shop-price${afford(item.price) ? '' : ' too-pricey'}` }, `💰 ${item.price}`),
    );
    cardStall.appendChild(wrap);
  });
  if (stock.guest && !stock.guest.sold) {
    cardStall.appendChild(h('div', { class: 'shop-item' },
      cardEl(stock.guest.def, { small: true, onTap: () => { if (afford(stock.guest!.price)) opts.onBuyGuest(); } }),
      h('div', { class: `shop-price${afford(stock.guest.price) ? '' : ' too-pricey'}` }, `🎙️ ${stock.guest.price}`),
    ));
  }

  const relicStall = h('div', { class: 'room-actions room-actions-col' });
  stock.relics.forEach((item, i) => {
    if (item.sold) return;
    relicStall.appendChild(
      h('div', { class: 'relic-offer', onTap: () => { if (afford(item.price)) opts.onBuyRelic(i); } },
        h('span', { class: 'relic-offer-emoji' }, item.def.emoji),
        h('div', {},
          h('div', { class: 'relic-offer-name' }, `${item.def.name} — 💰 ${item.price}`),
          h('div', { class: 'relic-offer-desc' }, item.def.description))),
    );
  });

  screenShell(root, '🛒 The Talent Market',
    h('p', { class: 'room-sub' }, `Budget: 💰 ${run.budget}`),
    h('p', { class: 'room-sub' }, 'Cards & hiring:'),
    cardStall,
    relicStall.children.length ? h('p', { class: 'room-sub' }, 'Frameworks:') : null,
    relicStall,
    h('div', { class: 'room-actions room-actions-col' },
      h('button', {
        class: 'btn',
        disabled: stock.removalUsed || !canRemoveCards(run) || !afford(stock.removalPrice),
        onTap: () => {
          if (!stock.removalUsed && canRemoveCards(run) && afford(stock.removalPrice)) opts.onRemove();
        },
      }, canRemoveCards(run)
        ? `🗑 Deprecate a card — 💰 ${stock.removalPrice}`
        : '🗑 Removal blocked by The Vision Doc'),
      h('button', { class: 'btn btn-primary', onTap: opts.onLeave }, 'Leave shop ▶'),
    ),
  );
}

// --- end screens ---

export function renderEndScreen(
  root: HTMLElement,
  won: boolean,
  stats: { score: number; floors: number; seed: string; reason?: string },
  onContinue: () => void,
): void {
  const quote = randomQuote();
  screenShell(root, won ? '🏆 YOU SHIPPED IT' : '💀 SPRINT FAILED',
    stats.reason ? h('p', { class: 'room-sub' }, stats.reason) : null,
    h('div', { class: 'end-stats' },
      h('div', {}, `Score: ${stats.score}`),
      h('div', {}, `Floors climbed: ${stats.floors}`),
      h('div', { class: 'end-seed' }, `Seed: ${stats.seed}`),
    ),
    quote
      ? h('blockquote', { class: 'end-quote' },
          `“${quote.text}”`,
          h('footer', {}, `— ${quote.name}, Lenny's Podcast`))
      : null,
    h('div', { class: 'room-actions' },
      h('button', { class: 'btn btn-primary', onTap: onContinue }, 'Back to Title')),
  );
}

function randomQuote(): { text: string; name: string } | null {
  const candidates = GUESTS.filter((g) => g.quotes.length > 0);
  if (!candidates.length) return null;
  const g = candidates[Math.floor(Math.random() * candidates.length)]!;
  return { text: g.quotes[Math.floor(Math.random() * g.quotes.length)]!, name: g.name };
}

// --- shared: pick-a-card overlay over any screen ---

export function pickCardOverlay(
  root: HTMLElement,
  title: string,
  cards: CardInstance[],
  onPick: (card: CardInstance) => void,
  onCancel?: () => void,
): void {
  const overlay = h('div', { class: 'overlay' },
    h('div', { class: 'overlay-title' }, title),
    h('div', { class: 'overlay-cards' },
      ...cards.map((card) => cardElFromInstance(card, {
        small: true,
        onTap: () => { overlay.remove(); onPick(card); },
      }))),
    h('button', { class: 'btn btn-ghost', onTap: () => { overlay.remove(); onCancel?.(); } }, 'Cancel'),
  );
  root.appendChild(overlay);
}

export function showDeckOverlay(root: HTMLElement, deck: CardInstance[]): void {
  const overlay = h('div', { class: 'overlay' },
    h('div', { class: 'overlay-title' }, `Your deck — ${deck.length} cards`),
    h('div', { class: 'overlay-cards' },
      ...deck.map((card) => cardElFromInstance(card, { small: true }))),
    h('button', { class: 'btn btn-primary', onTap: () => overlay.remove() }, 'Close'),
  );
  root.appendChild(overlay);
}
