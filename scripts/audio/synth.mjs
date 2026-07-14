// Tiny offline DSP library for rendering the game's original soundtrack.
// Pure Node, no deps. Renders stereo Float32 buffers → 16-bit PCM WAV.

export const SR = 44100;

// --- buffer helpers ---

export function makeStereo(seconds) {
  const n = Math.ceil(seconds * SR);
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}

export function mixInto(dst, src, startSample, gainL = 1, gainR = 1) {
  const end = Math.min(dst.n, startSample + src.n);
  for (let i = startSample, j = 0; i < end; i++, j++) {
    dst.L[i] += src.L[j] * gainL;
    dst.R[i] += src.R[j] * gainR;
  }
}

// --- envelopes ---

// ADSR over a mono Float32Array in place-ish; returns a gain multiplier array.
export function adsr(n, a, d, s, r) {
  const env = new Float32Array(n);
  const aS = Math.max(1, a * SR);
  const dS = Math.max(1, d * SR);
  const rS = Math.max(1, r * SR);
  const relStart = Math.max(0, n - rS);
  for (let i = 0; i < n; i++) {
    let g;
    if (i < aS) g = i / aS;
    else if (i < aS + dS) g = 1 - (1 - s) * ((i - aS) / dS);
    else if (i < relStart) g = s;
    else g = s * Math.max(0, 1 - (i - relStart) / rS);
    env[i] = g;
  }
  return env;
}

// --- oscillators (mono) ---

function osc(freq, dur, type, detune = 0) {
  const n = Math.ceil(dur * SR);
  const out = new Float32Array(n);
  const f = freq * Math.pow(2, detune / 1200);
  const dphi = (2 * Math.PI * f) / SR;
  let phi = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    let v;
    const p = phi % (2 * Math.PI);
    switch (type) {
      case 'sine': v = Math.sin(p); break;
      case 'tri': v = 2 * Math.abs(2 * (p / (2 * Math.PI) - Math.floor(p / (2 * Math.PI) + 0.5))) - 1; break;
      case 'saw': v = 2 * (p / (2 * Math.PI) - Math.floor(p / (2 * Math.PI) + 0.5)); break;
      case 'square': v = Math.sin(p) >= 0 ? 1 : -1; break;
      default: v = Math.sin(p);
    }
    out[i] = v;
    phi += dphi;
  }
  return out;
}

// A plucked / struck tone: sum of a few detuned oscillators through an ADSR.
export function tone(freq, dur, { type = 'sine', detunes = [0], a = 0.005, d = 0.1, s = 0.6, r = 0.2, gain = 0.5 } = {}) {
  const n = Math.ceil(dur * SR);
  const acc = new Float32Array(n);
  for (const dt of detunes) {
    const o = osc(freq, dur, type, dt);
    for (let i = 0; i < n; i++) acc[i] += o[i] / detunes.length;
  }
  const env = adsr(n, a, d, s, r);
  for (let i = 0; i < n; i++) acc[i] *= env[i] * gain;
  return acc;
}

// Karplus-Strong pluck for the melody — warm string-like body.
export function pluck(freq, dur, { gain = 0.5, damp = 0.5 } = {}) {
  const n = Math.ceil(dur * SR);
  const N = Math.max(2, Math.round(SR / freq));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  const out = new Float32Array(n);
  let idx = 0;
  const a = 0.5 - damp * 0.02;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const nxt = buf[(idx + 1) % N];
    const v = a * cur + a * nxt;
    buf[idx] = v;
    out[i] = cur;
    idx = (idx + 1) % N;
  }
  // gentle fade tail
  const env = adsr(n, 0.002, 0.05, 0.9, dur * 0.5);
  for (let i = 0; i < n; i++) out[i] *= env[i] * gain;
  return out;
}

// --- noise ---

export function noise(dur, gain = 1) {
  const n = Math.ceil(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * gain;
  return out;
}

// --- filters (mono, in place, returns new) ---

export function lowpass(buf, cutoff, res = 0.0) {
  // simple state-variable-ish one-pole cascade
  const n = buf.length;
  const out = new Float32Array(n);
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = dt / (rc + dt);
  let y = 0;
  let y2 = 0;
  for (let i = 0; i < n; i++) {
    y += alpha * (buf[i] - y);
    y2 += alpha * (y - y2);
    out[i] = y2 + res * (y2 - buf[i]);
  }
  return out;
}

export function highpass(buf, cutoff) {
  const n = buf.length;
  const out = new Float32Array(n);
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = rc / (rc + dt);
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < n; i++) {
    const o = alpha * (prevOut + buf[i] - prevIn);
    out[i] = o;
    prevIn = buf[i];
    prevOut = o;
  }
  return out;
}

// --- simple reverb (mono in → stereo out) via a few comb + allpass ---

export function reverb(buf, { mix = 0.25, decay = 0.5 } = {}) {
  const n = buf.length;
  const combTimes = [0.0297, 0.0371, 0.0411, 0.0437];
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  for (let c = 0; c < combTimes.length; c++) {
    const delay = Math.round(combTimes[c] * SR);
    const g = decay * (0.84 - c * 0.04);
    const ring = new Float32Array(delay);
    let ri = 0;
    for (let i = 0; i < n; i++) {
      const dv = ring[ri];
      const v = buf[i] + dv * g;
      ring[ri] = v;
      ri = (ri + 1) % delay;
      outL[i] += dv * (c % 2 === 0 ? 1 : 0.7);
      outR[i] += dv * (c % 2 === 1 ? 1 : 0.7);
    }
  }
  const dry = 1 - mix;
  const wet = mix / combTimes.length;
  for (let i = 0; i < n; i++) {
    outL[i] = buf[i] * dry + outL[i] * wet;
    outR[i] = buf[i] * dry + outR[i] * wet;
  }
  return { L: outL, R: outR, n };
}

// --- soft clip / limiter ---

export function softClip(x) {
  return Math.tanh(x);
}

// --- WAV encoding (16-bit stereo) ---

export function toWav(stereo) {
  const { L, R, n } = stereo;
  const bytesPerSample = 2;
  const dataSize = n * 2 * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(2, 22); // stereo
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2 * bytesPerSample, 28);
  buffer.writeUInt16LE(2 * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  let off = 44;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, softClip(L[i])));
    const r = Math.max(-1, Math.min(1, softClip(R[i])));
    buffer.writeInt16LE((l * 32767) | 0, off);
    buffer.writeInt16LE((r * 32767) | 0, off + 2);
    off += 4;
  }
  return buffer;
}

// --- musical helpers ---

// midi note → frequency
export function mtof(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// seeded RNG (mulberry32) so composition is reproducible
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
