// Full-screen card inspector — opened by long-pressing any card. Shows an
// enlarged card, full rules, keyword glossary, and (for guests) the flavor
// quote + episode.

import { h } from './dom';
import { cardEl } from './components/cardEl';
import type { CardDef, CardInstance, CardKeyword } from '../engine/types';
import { CARDS_BY_ID } from '../content';
import { KEYWORD_TEXT, STATUSES } from '../content/keywords';
import { sfx } from '../audio/sfx';

function defAndUpgraded(card: CardInstance | CardDef): { def: CardDef; upgraded: boolean } {
  if ('defId' in card) {
    return { def: CARDS_BY_ID[card.defId]!, upgraded: card.upgraded };
  }
  return { def: card, upgraded: false };
}

const STATUS_MENTIONS: Array<{ id: keyof typeof STATUSES; label: string }> = [
  { id: 'exposed', label: 'Exposed' }, { id: 'distracted', label: 'Distracted' },
  { id: 'momentum', label: 'Momentum' }, { id: 'burnout', label: 'Burnout' },
  { id: 'techDebt', label: 'Tech Debt' }, { id: 'craft', label: 'Craft' },
  { id: 'pushback', label: 'Pushback' }, { id: 'alignment', label: 'Alignment' },
  { id: 'headsDown', label: 'Heads-Down' }, { id: 'barricade', label: 'Vision Locked' },
];

export function showInspect(card: CardInstance | CardDef): void {
  const { def, upgraded } = defAndUpgraded(card);
  sfx('cardFlip');

  const text = (upgraded && def.upgrade?.text) ? def.upgrade.text : (def.text ?? '');
  const keywords: CardKeyword[] = (upgraded && def.upgrade?.keywords) ? def.upgrade.keywords : (def.keywords ?? []);

  // keyword glossary entries
  const glossary: HTMLElement[] = [];
  for (const kw of keywords) {
    const k = KEYWORD_TEXT[kw];
    if (k) glossary.push(h('div', { class: 'inspect-term' },
      h('span', { class: 'inspect-term-name' }, k.name), h('span', {}, k.text)));
  }
  // status keywords mentioned in the card text
  const lower = text.toLowerCase();
  for (const m of STATUS_MENTIONS) {
    if (lower.includes(m.label.toLowerCase())) {
      const s = STATUSES[m.id];
      glossary.push(h('div', { class: 'inspect-term' },
        h('span', { class: 'inspect-term-name' }, `${s.emoji} ${s.name}`),
        h('span', {}, s.description(1))));
    }
  }

  const overlay = h('div', { class: 'overlay inspect-overlay' },
    h('div', { class: 'inspect-card-big' }, cardEl(def, { upgraded })),
    h('div', { class: 'inspect-info' },
      def.guest
        ? h('div', { class: 'inspect-guest' },
            def.flavor ? h('blockquote', { class: 'inspect-quote' }, `“${def.flavor}”`) : null,
            h('div', { class: 'inspect-episode' }, `🎙️ ${def.guest.episodeTitle}`))
        : (def.flavor ? h('blockquote', { class: 'inspect-quote' }, `“${def.flavor}”`) : null),
      glossary.length ? h('div', { class: 'inspect-glossary' }, ...glossary) : null,
    ),
    h('button', { class: 'btn btn-primary', onTap: () => overlay.remove() }, 'Close'),
  );
  // tap backdrop to close
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
