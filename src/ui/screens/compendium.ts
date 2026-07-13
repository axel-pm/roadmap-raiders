// Compendium: browse all guests (with quotes + episodes), cards, and relics.

import { h, clear } from '../dom';
import { artImg } from '../art';
import { cardEl } from '../components/cardEl';
import { GUEST_CARDS, ALL_TACTIC_CARDS_PUBLIC } from '../../content';
import { GUESTS } from '../../content/guests/generate';
import { RELICS } from '../../content/relics';
import { CARDS_BY_ID } from '../../content';

type Tab = 'guests' | 'cards' | 'relics';

export function renderCompendium(
  root: HTMLElement,
  guestsUnlocked: number,
  onBack: () => void,
): void {
  let tab: Tab = 'guests';

  const render = () => {
    clear(root);
    const tabs = h('div', { class: 'room-actions' },
      ...(['guests', 'cards', 'relics'] as Tab[]).map((t) =>
        h('button', {
          class: `btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`,
          onTap: () => { tab = t; render(); },
        }, t === 'guests' ? '🎙️ Guests' : t === 'cards' ? '🃏 Cards' : '🔮 Frameworks')),
    );

    let body: HTMLElement;
    if (tab === 'guests') {
      body = h('div', { class: 'compendium-list' });
      GUESTS.forEach((g, i) => {
        const unlocked = i < guestsUnlocked;
        const def = CARDS_BY_ID[g.id];
        const entry = h('div', { class: `guest-entry${unlocked ? '' : ' locked'}` },
          unlocked && def ? cardEl(def, { small: true }) : h('div', { class: 'card card-small guest-locked-card' }, '🔒'),
          h('div', { class: 'guest-info' },
            h('div', { class: 'guest-name' }, unlocked ? `#${g.rank} ${g.name}` : `#${g.rank} ???`),
            unlocked
              ? h('div', { class: 'guest-episode' }, g.episodeTitle)
              : h('div', { class: 'guest-episode' }, 'Earn Listener XP to unlock.'),
            unlocked && g.quotes[0]
              ? h('div', { class: 'guest-quote' }, `“${g.quotes[0]}”`)
              : null,
          ),
        );
        body.appendChild(entry);
      });
    } else if (tab === 'cards') {
      body = h('div', { class: 'overlay-cards' },
        ...ALL_TACTIC_CARDS_PUBLIC.map((def) => cardEl(def, { small: true })));
    } else {
      body = h('div', { class: 'compendium-list' },
        ...RELICS.map((relic) =>
          h('div', { class: 'relic-offer', style: 'cursor:default' },
            h('span', { class: 'relic-offer-emoji' }, artImg('relics', relic.id, relic.emoji)),
            h('div', {},
              h('div', { class: 'relic-offer-name' }, relic.name),
              h('div', { class: 'relic-offer-desc' }, relic.description)))));
    }

    root.appendChild(
      h('div', { class: 'room-screen' },
        h('h2', { class: 'room-title' }, '📚 Compendium'),
        h('p', { class: 'room-sub' },
          tab === 'guests'
            ? `${Math.min(guestsUnlocked, GUEST_CARDS.length)}/${GUEST_CARDS.length} guests unlocked`
            : tab === 'cards'
              ? `${ALL_TACTIC_CARDS_PUBLIC.length} tactic cards`
              : `${RELICS.length} frameworks`),
        tabs,
        body,
        h('div', { class: 'room-actions' },
          h('button', { class: 'btn btn-primary', onTap: onBack }, 'Back')),
      ),
    );
  };
  render();
}
