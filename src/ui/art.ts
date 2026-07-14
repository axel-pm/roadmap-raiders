// Art asset resolution with emoji fallback. Every image is optional:
// if the .webp is missing the emoji shows instead and the game plays on.

import { h } from './dom';

export type ArtKind = 'cards' | 'guests' | 'enemies' | 'relics' | 'coffee' | 'bg' | 'nodes';

export function artUrl(kind: ArtKind, id: string): string {
  return `${import.meta.env.BASE_URL}art/${kind}/${id}.webp`;
}

/**
 * An element showing the art image over an emoji fallback.
 * The emoji sits underneath; the image covers it once loaded and removes
 * itself on error, so a missing file silently falls back.
 */
export function artImg(kind: ArtKind, id: string, fallbackEmoji: string, cls = ''): HTMLElement {
  const holder = h('span', { class: `art-holder ${cls}` },
    h('span', { class: 'art-fallback' }, fallbackEmoji));
  const img = document.createElement('img');
  img.className = 'art-img';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = '';
  img.src = artUrl(kind, id);
  img.addEventListener('error', () => img.remove());
  holder.appendChild(img);
  return holder;
}

/** background-image CSS value with a readability gradient; missing file → gradient only */
export function bgLayer(id: string, darkness = 0.72): string {
  return `linear-gradient(rgba(10, 9, 18, ${darkness}), rgba(10, 9, 18, ${Math.min(1, darkness + 0.12)})), url("${artUrl('bg', id)}")`;
}
