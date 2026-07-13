// Synthesized one-shot sound effects for game feel. Each returns a stereo buffer.

import { makeStereo, mixInto, tone, pluck, noise, lowpass, highpass, reverb, mtof, SR, adsr } from './synth.mjs';

function mono(dur) { return new Float32Array(Math.ceil(dur * SR)); }
function place(out, mono, gain = 1) {
  const st = { L: mono, R: mono, n: mono.length };
  mixInto(out, st, 0, gain, gain);
}

// pitch-swept sine
function sweep(f0, f1, dur, gain = 0.5, type = 'sine') {
  const n = Math.ceil(dur * SR);
  const out = new Float32Array(n);
  let phi = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 * Math.pow(f1 / f0, t);
    phi += (2 * Math.PI * f) / SR;
    let v = Math.sin(phi);
    if (type === 'saw') v = 2 * (phi / (2 * Math.PI) % 1) - 1;
    out[i] = v;
  }
  const env = adsr(n, 0.002, dur * 0.3, 0.5, dur * 0.5);
  for (let i = 0; i < n; i++) out[i] *= env[i] * gain;
  return out;
}

export const SFX = {
  // whoosh: filtered noise sweep
  cardPlay: () => {
    const dst = makeStereo(0.35);
    const nz = noise(0.35, 0.6);
    const bp = highpass(lowpass(nz, 3500), 800);
    const env = adsr(bp.length, 0.01, 0.08, 0.3, 0.2);
    for (let i = 0; i < bp.length; i++) bp[i] *= env[i];
    place(dst, bp, 0.5);
    return dst;
  },
  draw: () => {
    const dst = makeStereo(0.18);
    place(dst, sweep(1200, 2200, 0.12, 0.3), 0.5);
    return dst;
  },
  hit: () => {
    const dst = makeStereo(0.4);
    const body = sweep(220, 70, 0.3, 0.7);
    const nz = lowpass(noise(0.12, 0.7), 1800);
    const env = adsr(nz.length, 0.001, 0.05, 0.2, 0.08);
    for (let i = 0; i < nz.length; i++) nz[i] *= env[i];
    place(dst, body, 0.7);
    place(dst, nz, 0.5);
    return dst;
  },
  heavyHit: () => {
    const dst = makeStereo(0.6);
    const body = sweep(180, 45, 0.5, 0.9);
    const nz = lowpass(noise(0.2, 0.9), 1400);
    const env = adsr(nz.length, 0.001, 0.08, 0.3, 0.14);
    for (let i = 0; i < nz.length; i++) nz[i] *= env[i];
    place(dst, body, 0.85);
    place(dst, nz, 0.6);
    return reverb2(dst, 0.15);
  },
  block: () => {
    const dst = makeStereo(0.4);
    // FM ping
    const n = Math.ceil(0.35 * SR);
    const out = new Float32Array(n);
    let phi = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const mod = Math.sin((2 * Math.PI * 620 * i) / SR) * 300 * (1 - t);
      phi += (2 * Math.PI * (720 + mod)) / SR;
      out[i] = Math.sin(phi);
    }
    const env = adsr(n, 0.001, 0.1, 0.2, 0.25);
    for (let i = 0; i < n; i++) out[i] *= env[i] * 0.4;
    place(dst, out, 0.6);
    return dst;
  },
  debuff: () => {
    const dst = makeStereo(0.5);
    // wobble down
    const n = Math.ceil(0.45 * SR);
    const out = new Float32Array(n);
    let phi = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const f = 400 * (1 - 0.5 * t) * (1 + 0.08 * Math.sin(2 * Math.PI * 7 * t));
      phi += (2 * Math.PI * f) / SR;
      out[i] = Math.sin(phi) * 0.5;
    }
    const env = adsr(n, 0.02, 0.2, 0.4, 0.2);
    for (let i = 0; i < n; i++) out[i] *= env[i];
    place(dst, lowpass(out, 1400), 0.5);
    return dst;
  },
  heal: () => {
    const dst = makeStereo(0.7);
    [0, 4, 7, 12].forEach((semi, i) => {
      const p = pluck(mtof(72 + semi), 0.5, { gain: 0.4 });
      mixInto(dst, reverb(p, { mix: 0.35, decay: 0.5 }), Math.round(i * 0.06 * SR));
    });
    return dst;
  },
  coin: () => {
    const dst = makeStereo(0.4);
    const a = pluck(mtof(84), 0.25, { gain: 0.4 });
    const b = pluck(mtof(88), 0.3, { gain: 0.4 });
    mixInto(dst, { L: a, R: a, n: a.length }, 0);
    mixInto(dst, { L: b, R: b, n: b.length }, Math.round(0.05 * SR));
    return dst;
  },
  drink: () => {
    const dst = makeStereo(0.5);
    place(dst, sweep(300, 900, 0.4, 0.4), 0.5);
    const nz = highpass(noise(0.15, 0.3), 4000);
    place(dst, nz, 0.2);
    return dst;
  },
  button: () => {
    const dst = makeStereo(0.12);
    const t = tone(mtof(76), 0.09, { type: 'sine', a: 0.001, d: 0.04, s: 0.2, r: 0.04, gain: 0.35 });
    place(dst, t, 0.5);
    return dst;
  },
  enemyDeath: () => {
    const dst = makeStereo(0.7);
    place(dst, sweep(500, 60, 0.6, 0.6, 'saw'), 0.5);
    const nz = lowpass(noise(0.5, 0.5), 2000);
    const env = adsr(nz.length, 0.01, 0.2, 0.3, 0.3);
    for (let i = 0; i < nz.length; i++) nz[i] *= env[i];
    place(dst, nz, 0.4);
    return reverb2(dst, 0.2);
  },
  cardFlip: () => {
    const dst = makeStereo(0.2);
    const nz = highpass(noise(0.12, 0.5), 2500);
    const env = adsr(nz.length, 0.005, 0.05, 0.2, 0.06);
    for (let i = 0; i < nz.length; i++) nz[i] *= env[i];
    place(dst, nz, 0.4);
    return dst;
  },
  victoryChime: () => {
    const dst = makeStereo(0.9);
    [0, 4, 7, 11, 12].forEach((s, i) => {
      const p = pluck(mtof(72 + s), 0.6, { gain: 0.45 });
      mixInto(dst, reverb(p, { mix: 0.4, decay: 0.6 }), Math.round(i * 0.08 * SR));
    });
    return dst;
  },
};

function reverb2(stereo, mix) {
  // reverb applied to an already-stereo buffer (sum to mono first)
  const mono = new Float32Array(stereo.n);
  for (let i = 0; i < stereo.n; i++) mono[i] = (stereo.L[i] + stereo.R[i]) * 0.5;
  return reverb(mono, { mix, decay: 0.5 });
}
