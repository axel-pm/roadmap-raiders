// Tiny DOM helpers. No framework, no innerHTML templating.

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: {
    class?: string;
    id?: string;
    style?: string;
    title?: string;
    disabled?: boolean;
    data?: Record<string, string>;
    onTap?: (ev: Event) => void;
  } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs.class) el.className = attrs.class;
  if (attrs.id) el.id = attrs.id;
  if (attrs.style) el.setAttribute('style', attrs.style);
  if (attrs.title) el.title = attrs.title;
  if (attrs.disabled && 'disabled' in el) (el as HTMLButtonElement).disabled = true;
  if (attrs.data) {
    for (const [k, v] of Object.entries(attrs.data)) el.dataset[k] = v;
  }
  if (attrs.onTap) addTap(el, attrs.onTap);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

/**
 * iOS-safe tap handler (ported from the original game): fires on touchend
 * without the 300ms delay and without double-firing the synthetic click.
 */
export function addTap(el: HTMLElement, handler: (ev: Event) => void): void {
  let touched = false;
  el.addEventListener('touchend', (ev) => {
    touched = true;
    ev.preventDefault();
    handler(ev);
  }, { passive: false });
  el.addEventListener('click', (ev) => {
    if (touched) {
      touched = false;
      return;
    }
    handler(ev);
  });
}

/**
 * Tap + long-press on the same element. A hold past `holdMs` fires `onHold`
 * and suppresses the tap; a quick press fires `onTap`. Movement beyond a small
 * threshold cancels both (it's a scroll, not a tap). Works for touch and mouse.
 */
export function addTapAndHold(
  el: HTMLElement,
  onTap: (ev: Event) => void,
  onHold: (ev: Event) => void,
  holdMs = 350,
): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let held = false;
  let moved = false;
  let startX = 0;
  let startY = 0;

  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

  const down = (ev: PointerEvent) => {
    held = false;
    moved = false;
    startX = ev.clientX;
    startY = ev.clientY;
    clearTimer();
    timer = setTimeout(() => {
      if (!moved) {
        held = true;
        onHold(ev);
      }
    }, holdMs);
  };

  const move = (ev: PointerEvent) => {
    if (Math.abs(ev.clientX - startX) > 12 || Math.abs(ev.clientY - startY) > 12) {
      moved = true;
      clearTimer();
    }
  };

  const up = (ev: Event) => {
    clearTimer();
    if (held) {
      ev.preventDefault();
      return; // hold already handled
    }
    if (!moved) onTap(ev);
  };

  const cancel = () => { clearTimer(); held = false; };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);
  // block the iOS long-press callout
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** floating combat text (damage numbers, heals, statuses) */
export function floatText(anchor: HTMLElement, text: string, cls = ''): void {
  const rect = anchor.getBoundingClientRect();
  const el = h('div', { class: `float-text ${cls}` }, text);
  el.style.left = `${rect.left + rect.width / 2 + (Math.random() * 30 - 15)}px`;
  el.style.top = `${rect.top + rect.height * 0.3}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
