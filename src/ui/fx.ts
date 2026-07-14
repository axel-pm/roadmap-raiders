// Animation helpers — all gated by motionOK() so prefers-reduced-motion users
// get an instant, non-animated experience.

let reducedMotion = false;
try {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    reducedMotion = e.matches;
  });
} catch { /* SSR / no matchMedia */ }

export function motionOK(): boolean {
  return !reducedMotion;
}

/** wait helper for timelines */
export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function center(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Fly a ghost clone of `from` in an arc to `to`. Resolves when it lands.
 * Used for card-play flight. No-op (instant resolve) under reduced motion.
 */
export function flyClone(from: HTMLElement, to: HTMLElement, { duration = 320, scaleTo = 0.4 } = {}): Promise<void> {
  if (!motionOK()) return Promise.resolve();
  const a = center(from);
  const b = center(to);
  const clone = from.cloneNode(true) as HTMLElement;
  const rect = from.getBoundingClientRect();
  Object.assign(clone.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, margin: '0',
    zIndex: '200', pointerEvents: 'none', transition: 'none',
  });
  clone.classList.add('fx-flying');
  document.body.appendChild(clone);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      clone.style.transition = `transform ${duration}ms cubic-bezier(.4,.1,.3,1), opacity ${duration}ms ease-in`;
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleTo}) rotate(8deg)`;
      clone.style.opacity = '0.2';
      setTimeout(() => { clone.remove(); resolve(); }, duration);
    });
  });
}

export function shake(el: HTMLElement, intensity: 'light' | 'heavy' = 'light'): void {
  if (!motionOK()) return;
  const cls = intensity === 'heavy' ? 'fx-shake-heavy' : 'fx-shake';
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

/** screen shake by nudging a root element */
export function screenShake(root: HTMLElement): void {
  if (!motionOK()) return;
  root.classList.remove('fx-screenshake');
  void root.offsetWidth;
  root.classList.add('fx-screenshake');
  root.addEventListener('animationend', () => root.classList.remove('fx-screenshake'), { once: true });
}

export function flash(el: HTMLElement, color = 'rgba(255,255,255,0.7)'): void {
  if (!motionOK()) { return; }
  const f = document.createElement('div');
  Object.assign(f.style, {
    position: 'absolute', inset: '0', background: color, borderRadius: 'inherit',
    pointerEvents: 'none', opacity: '0.9', zIndex: '3',
  });
  const prevPos = getComputedStyle(el).position;
  if (prevPos === 'static') el.style.position = 'relative';
  el.appendChild(f);
  requestAnimationFrame(() => {
    f.style.transition = 'opacity 260ms ease-out';
    f.style.opacity = '0';
    setTimeout(() => f.remove(), 280);
  });
}

/** lunge an element toward a direction (enemy attacking the player = downward) */
export function lunge(el: HTMLElement, dir: 'down' | 'up' = 'down'): void {
  if (!motionOK()) return;
  const cls = dir === 'down' ? 'fx-lunge-down' : 'fx-lunge-up';
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

export function dissolve(el: HTMLElement): Promise<void> {
  if (!motionOK()) { el.style.opacity = '0'; return Promise.resolve(); }
  return new Promise((resolve) => {
    el.style.transition = 'opacity 400ms ease-out, transform 400ms ease-out, filter 400ms';
    el.style.transformOrigin = 'center bottom';
    el.style.opacity = '0';
    el.style.transform = 'scale(0.7) translateY(10px)';
    el.style.filter = 'blur(3px) grayscale(1)';
    setTimeout(resolve, 400);
  });
}

/** sweeping turn banner across the screen */
export function banner(text: string, cls = ''): Promise<void> {
  return new Promise((resolve) => {
    const b = document.createElement('div');
    b.className = `fx-banner ${cls}`;
    b.textContent = text;
    document.body.appendChild(b);
    if (!motionOK()) { setTimeout(() => { b.remove(); resolve(); }, 500); return; }
    b.addEventListener('animationend', () => { b.remove(); resolve(); }, { once: true });
    setTimeout(() => { if (b.isConnected) { b.remove(); resolve(); } }, 1400);
  });
}

/** floating damage/heal/status number at an element */
export function floatNumber(anchor: HTMLElement, text: string, cls = ''): void {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2 + (Math.random() * 26 - 13)}px`;
  el.style.top = `${rect.top + rect.height * 0.28}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => { if (el.isConnected) el.remove(); }, 1200);
}

/** rising ember particles for the victory screen */
export function embers(container: HTMLElement, count = 24): void {
  if (!motionOK()) return;
  for (let i = 0; i < count; i++) {
    const e = document.createElement('div');
    e.className = 'fx-ember';
    e.style.left = `${Math.random() * 100}%`;
    e.style.animationDelay = `${Math.random() * 3}s`;
    e.style.animationDuration = `${3 + Math.random() * 3}s`;
    e.style.setProperty('--drift', `${(Math.random() * 60 - 30)}px`);
    container.appendChild(e);
  }
}
