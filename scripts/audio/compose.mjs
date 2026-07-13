// The Roadmap Raiders original soundtrack — "campfire lofi corporate fantasy".
// Composed in code: warm pads, plucked pentatonic melody, soft bass, fire crackle.
// Each track is bar-aligned so AudioBufferSourceNode.loop is seamless.

import {
  makeStereo, mixInto, tone, pluck, noise, lowpass, highpass, reverb,
  mtof, rng, SR,
} from './synth.mjs';

const BPM = 74;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// Pentatonic scales (midi). Warm = major pentatonic; dark = minor pentatonic.
const MAJ_PENTA = [0, 2, 4, 7, 9];
const MIN_PENTA = [0, 3, 5, 7, 10];

function scaleNote(root, scale, degree) {
  const oct = Math.floor(degree / scale.length);
  const idx = ((degree % scale.length) + scale.length) % scale.length;
  return root + oct * 12 + scale[idx];
}

// --- layers ---

// Warm sustained pad chord across `bars`, chord = array of midi notes.
function padChord(dst, startBar, bars, notes, gain = 0.14) {
  const dur = bars * BAR + 0.4;
  for (const m of notes) {
    const t = tone(mtof(m), dur, {
      type: 'saw',
      detunes: [-8, 0, 7],
      a: 0.6, d: 0.4, s: 0.85, r: 1.2,
      gain,
    });
    const filtered = lowpass(t, 900, 0.1);
    const wet = reverb(filtered, { mix: 0.35, decay: 0.6 });
    mixInto(dst, wet, Math.round(startBar * BAR * SR), 1, 1);
  }
}

// Soft sine bass on the chord root, one note per bar (or two).
function bassLine(dst, startBar, bars, rootMidi, rand, busy = false) {
  for (let b = 0; b < bars; b++) {
    const hits = busy ? 2 : 1;
    for (let h = 0; h < hits; h++) {
      const m = rootMidi - 12 + (h === 1 ? 7 : 0);
      const dur = BEAT * (busy ? 1.8 : 3.6);
      const t = tone(mtof(m), dur, { type: 'sine', detunes: [0, -4], a: 0.01, d: 0.2, s: 0.7, r: 0.5, gain: 0.32 });
      const start = (startBar + b) * BAR + h * BEAT * 2;
      mixInto(dst, t, Math.round(start * SR), 1, 1);
    }
  }
}

// Plucked pentatonic melody — rest-heavy random walk.
function melody(dst, startBar, bars, root, scale, rand, { density = 0.5, gain = 0.34, octave = 12 } = {}) {
  let degree = 4;
  const steps = bars * 8; // 8th notes
  for (let s = 0; s < steps; s++) {
    if (rand() > density) continue; // rest
    // random walk, occasionally leap
    degree += rand() < 0.7 ? (rand() < 0.5 ? 1 : -1) : (rand() < 0.5 ? 2 : -2);
    degree = Math.max(0, Math.min(scale.length * 2, degree));
    const m = scaleNote(root, scale, degree) + octave;
    const swing = (s % 2 === 1) ? BEAT * 0.08 : 0;
    const start = startBar * BAR + s * (BEAT / 2) + swing;
    const dur = BEAT * (rand() < 0.3 ? 1.2 : 0.55);
    const p = pluck(mtof(m), dur, { gain: gain * (0.7 + rand() * 0.3), damp: 0.5 });
    const wet = reverb(p, { mix: 0.28, decay: 0.5 });
    mixInto(dst, wet, Math.round(start * SR), 0.95, 1); // slight stereo lean
  }
}

// Fire crackle + vinyl hiss bed.
function crackle(dst, seconds, rand, gain = 0.06) {
  const bed = noise(seconds, 1);
  const hiss = highpass(lowpass(bed, 6000), 1500);
  // sparse pops
  const out = new Float32Array(hiss.length);
  for (let i = 0; i < hiss.length; i++) out[i] = hiss[i] * 0.02;
  const pops = Math.round(seconds * 7);
  for (let k = 0; k < pops; k++) {
    const at = Math.floor(rand() * hiss.length);
    const len = Math.floor(SR * (0.004 + rand() * 0.01));
    const amp = 0.3 + rand() * 0.5;
    for (let i = 0; i < len && at + i < out.length; i++) {
      out[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (len * 0.3));
    }
  }
  const st = { L: out, R: new Float32Array(out), n: out.length };
  // decorrelate channels a touch
  for (let i = 1; i < out.length; i++) st.R[i] = out[i - 1];
  mixInto(dst, st, 0, gain, gain);
}

// Low drone for boss.
function drone(dst, seconds, rootMidi, gain = 0.12) {
  const t = tone(mtof(rootMidi - 24), seconds + 0.2, { type: 'saw', detunes: [-6, 0, 5], a: 1.5, d: 1, s: 0.9, r: 1.5, gain });
  const f = lowpass(t, 220);
  mixInto(dst, { L: f, R: new Float32Array(f), n: f.length }, 0, 1, 1);
}

// --- track builders ---

// A chord progression is an array of {root, notes} per bar-group.
function buildTrack({ seed, bars, root, scale, progression, density, bass2, withDrone }) {
  const rand = rng(seed);
  const seconds = bars * BAR;
  const dst = makeStereo(seconds + 2); // pad/reverb tail room, trimmed on encode
  crackle(dst, seconds, rand, 0.05);
  if (withDrone) drone(dst, seconds, root, 0.1);

  let bar = 0;
  while (bar < bars) {
    for (const chord of progression) {
      if (bar >= bars) break;
      const notes = chord.notes.map((d) => scaleNote(root, scale, d));
      padChord(dst, bar, chord.bars, notes, 0.13);
      bassLine(dst, bar, chord.bars, root + chord.notes[0] % 12, rand, bass2);
      bar += chord.bars;
    }
  }
  // melody over the whole thing, in phrases
  const rand2 = rng(seed + 999);
  for (let b = 0; b < bars; b += 4) {
    if (rand2() < 0.85) melody(dst, b, Math.min(4, bars - b), root, scale, rand2, { density });
  }
  return { dst, seconds };
}

// --- the six pieces ---

export const TRACKS = {
  // Title — warm, hopeful, spacious.
  title: () => buildTrack({
    seed: 101, bars: 32, root: 57 /* A3 */, scale: MAJ_PENTA,
    progression: [
      { notes: [0, 2, 4], bars: 2 },   // I
      { notes: [-3, 0, 2], bars: 2 },  // vi-ish
      { notes: [-1, 2, 3], bars: 2 },  // IV-ish
      { notes: [1, 3, 4], bars: 2 },   // V-ish
    ],
    density: 0.42, bass2: false, withDrone: false,
  }),

  // Map — calm, sparse, contemplative.
  map: () => buildTrack({
    seed: 202, bars: 32, root: 55 /* G3 */, scale: MAJ_PENTA,
    progression: [
      { notes: [0, 2, 4], bars: 4 },
      { notes: [-3, 0, 2], bars: 4 },
    ],
    density: 0.3, bass2: false, withDrone: false,
  }),

  // Combat — tenser, busier bass, more drive.
  combat: () => buildTrack({
    seed: 303, bars: 24, root: 50 /* D3 */, scale: MIN_PENTA,
    progression: [
      { notes: [0, 2, 4], bars: 2 },
      { notes: [3, 4, 6], bars: 2 },
      { notes: [-1, 1, 3], bars: 2 },
      { notes: [0, 2, 4], bars: 2 },
    ],
    density: 0.55, bass2: true, withDrone: false,
  }),

  // Boss — minor, low drone, heavier.
  boss: () => buildTrack({
    seed: 404, bars: 24, root: 45 /* A2 */, scale: MIN_PENTA,
    progression: [
      { notes: [0, 2, 4], bars: 2 },
      { notes: [-2, 0, 3], bars: 2 },
      { notes: [1, 3, 5], bars: 2 },
      { notes: [0, 2, 4], bars: 2 },
    ],
    density: 0.5, bass2: true, withDrone: true,
  }),
};

// Short one-shot stings (not looped).
export function victorySting() {
  const dst = makeStereo(6);
  const root = 60;
  const scale = MAJ_PENTA;
  // rising arpeggio + shimmering pad
  const notes = [0, 2, 4, 5, 7];
  notes.forEach((d, i) => {
    const m = scaleNote(root, scale, d) + 12;
    const p = pluck(mtof(m), 1.2, { gain: 0.5 });
    mixInto(dst, reverb(p, { mix: 0.4, decay: 0.7 }), Math.round(i * 0.12 * SR));
  });
  padChord(dst, 0, 3, [root, root + 4, root + 7, root + 12].map((x) => x), 0.16);
  return { dst, seconds: 5.5 };
}

export function defeatSting() {
  const dst = makeStereo(5.5);
  const root = 48;
  // descending minor, dark pad
  const notes = [7, 5, 3, 0];
  notes.forEach((d, i) => {
    const m = scaleNote(root, MIN_PENTA, d);
    const t = tone(mtof(m), 1.4, { type: 'tri', detunes: [-6, 0], a: 0.02, d: 0.4, s: 0.5, r: 0.9, gain: 0.4 });
    mixInto(dst, reverb(lowpass(t, 700), { mix: 0.4, decay: 0.7 }), Math.round(i * 0.35 * SR));
  });
  drone(dst, 5, root + 12, 0.08);
  return { dst, seconds: 5 };
}

export { BAR, BEAT, BPM };
