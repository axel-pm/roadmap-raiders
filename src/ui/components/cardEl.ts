// Card rendering shared by hand, rewards, shops, pile viewers, compendium.

import { h } from '../dom';
import { artImg } from '../art';
import type { CardDef, CardInstance } from '../../engine/types';
import { CARDS_BY_ID } from '../../content';

export interface CardElOpts {
  upgraded?: boolean;
  cost?: number | 'X' | null; // effective cost override (engine-aware)
  small?: boolean;
  selected?: boolean;
  onTap?: (ev: Event) => void;
}

export function cardDefOf(inst: CardInstance): CardDef {
  const def = CARDS_BY_ID[inst.defId];
  if (!def) throw new Error(`Unknown card: ${inst.defId}`);
  return def;
}

export function cardName(def: CardDef, upgraded: boolean): string {
  return upgraded ? `${def.name}+` : def.name;
}

export function cardText(def: CardDef, upgraded: boolean): string {
  if (upgraded && def.upgrade?.text) return def.upgrade.text;
  return def.text ?? '';
}

export function cardEl(def: CardDef, opts: CardElOpts = {}): HTMLElement {
  const upgraded = opts.upgraded ?? false;
  const cost = opts.cost !== undefined
    ? opts.cost
    : (upgraded && def.upgrade?.cost !== undefined ? def.upgrade.cost : def.cost);

  const classes = [
    'card',
    `card-${def.type}`,
    def.guest ? 'card-guest' : '',
    def.guest ? `domain-${def.guest.domain.toLowerCase()}` : '',
    opts.small ? 'card-small' : '',
    opts.selected ? 'card-selected' : '',
    upgraded ? 'card-upgraded' : '',
  ].filter(Boolean).join(' ');

  const el = h('div', { class: classes, onTap: opts.onTap },
    h('div', { class: 'card-top' },
      cost !== null
        ? h('span', { class: 'card-cost' }, String(cost))
        : h('span', { class: 'card-cost card-cost-none' }, '–'),
      h('span', { class: 'card-name' }, cardName(def, upgraded)),
    ),
    h('div', { class: 'card-art' },
      artImg(def.guest ? 'guests' : 'cards', def.id, def.emoji)),
    h('div', { class: 'card-text' }, cardText(def, upgraded)),
    def.guest
      ? h('div', { class: 'card-guest-tag' }, `🎙️ Lenny's Podcast · ${def.guest.domain}`)
      : h('div', { class: 'card-type-tag' }, def.type.toUpperCase()),
  );
  if (def.flavor && !opts.small) el.title = `“${def.flavor}”`;
  return el;
}

export function cardElFromInstance(inst: CardInstance, opts: CardElOpts = {}): HTMLElement {
  return cardEl(cardDefOf(inst), { ...opts, upgraded: inst.upgraded });
}
