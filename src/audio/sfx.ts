// One-shot sound effects. Fire-and-forget; buffers lazy-load and cache.

import { audio } from './engine';
import { haptic } from './haptics';

export type SfxName =
  | 'cardPlay' | 'draw' | 'hit' | 'heavyHit' | 'block' | 'debuff'
  | 'heal' | 'coin' | 'drink' | 'button' | 'enemyDeath' | 'cardFlip'
  | 'victoryChime';

export function sfx(name: SfxName, { pitch = 1, haptics = false }: { pitch?: number; haptics?: boolean } = {}): void {
  if (!audio.settings.sfxOn) return;
  if (haptics) haptic(name === 'heavyHit' ? 'heavy' : 'light');
  void (async () => {
    const buf = await audio.load(`sfx_${name}`);
    if (!buf || !audio.ctx || !audio.isUnlocked) return;
    const ctx = audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // ±4% random detune for life, plus optional explicit pitch
    src.playbackRate.value = pitch * (0.96 + Math.random() * 0.08);
    src.connect(audio.sfxBus);
    src.start();
  })();
}
