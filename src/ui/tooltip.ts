// Touch-friendly popover tooltips. Tap an element to anchor a popover to it;
// tap anywhere else dismisses. Replaces title= attributes on mobile (title is
// kept in parallel for desktop hover).

import { h, clear } from './dom';

let current: HTMLElement | null = null;

function dismiss(): void {
  if (current) {
    current.remove();
    current = null;
    document.removeEventListener('pointerdown', onDocDown, true);
  }
}

function onDocDown(ev: Event): void {
  if (current && !current.contains(ev.target as Node)) dismiss();
}

export interface TipContent {
  title: string;
  body: string;
  emoji?: string;
}

/** Show a popover anchored to `anchor`. Toggles off if same anchor re-tapped. */
export function showTooltip(anchor: HTMLElement, content: TipContent): void {
  const wasFor = current?.dataset.anchorId;
  dismiss();
  const id = anchor.dataset.tipId ?? (anchor.dataset.tipId = String(Math.random()));
  if (wasFor === id) return; // toggle off

  const pop = h('div', { class: 'tooltip-pop' },
    h('div', { class: 'tooltip-title' },
      content.emoji ? h('span', { class: 'tooltip-emoji' }, content.emoji) : null,
      content.title),
    h('div', { class: 'tooltip-body' }, content.body),
  );
  pop.dataset.anchorId = id;
  document.body.appendChild(pop);
  current = pop;

  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  let left = r.left + r.width / 2 - pw / 2;
  left = Math.max(8, Math.min(window.innerWidth - pw - 8, left));
  let top = r.top - ph - 10;
  let arrowDown = true;
  if (top < 8) { top = r.bottom + 10; arrowDown = false; } // flip below
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.classList.add(arrowDown ? 'tip-above' : 'tip-below');
  // arrow x relative to popover
  const arrowX = r.left + r.width / 2 - left;
  pop.style.setProperty('--arrow-x', `${Math.max(12, Math.min(pw - 12, arrowX))}px`);

  setTimeout(() => document.addEventListener('pointerdown', onDocDown, true), 0);
}

export function hideTooltip(): void {
  dismiss();
}

/** Convenience: wire an element so tapping it shows a tooltip. */
export function attachTooltip(el: HTMLElement, content: TipContent): void {
  el.style.cursor = 'help';
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    showTooltip(el, content);
  });
}

void clear;
