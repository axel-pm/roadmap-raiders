// Render the OST + SFX to WAV, then transcode to .m4a (AAC) via macOS afconvert.
// Output → public/audio/. Usage: node scripts/audio/build-audio.mjs [--music] [--sfx]

import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toWav, SR } from './synth.mjs';
import { TRACKS, victorySting, defeatSting, BAR } from './compose.mjs';
import { SFX } from './sfx.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'public', 'audio');
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const doMusic = args.includes('--music') || args.length === 0;
const doSfx = args.includes('--sfx') || args.length === 0;

// Trim a rendered buffer to an exact number of samples (bar-aligned loop point).
function trim(stereo, samples) {
  return { L: stereo.L.subarray(0, samples), R: stereo.R.subarray(0, samples), n: samples };
}

function encode(name, stereo, { bitrate = '96000' } = {}) {
  const wavPath = join(outDir, `${name}.wav`);
  const m4aPath = join(outDir, `${name}.m4a`);
  writeFileSync(wavPath, toWav(stereo));
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', bitrate, wavPath, m4aPath]);
  unlinkSync(wavPath);
  return m4aPath;
}

if (doMusic) {
  for (const [name, build] of Object.entries(TRACKS)) {
    const { dst, seconds } = build();
    // trim to exact bar-multiple so the loop seam is click-free
    const loopBars = Math.floor(seconds / BAR);
    const samples = Math.round(loopBars * BAR * SR);
    encode(name, trim(dst, samples), { bitrate: '112000' });
    console.log(`♪ ${name}.m4a — ${(samples / SR).toFixed(1)}s (${loopBars} bars)`);
  }
  {
    const v = victorySting();
    encode('victory', trim(v.dst, Math.round(v.seconds * SR)), { bitrate: '112000' });
    const d = defeatSting();
    encode('defeat', trim(d.dst, Math.round(d.seconds * SR)), { bitrate: '112000' });
    console.log('♪ victory.m4a, defeat.m4a');
  }
}

if (doSfx) {
  for (const [name, build] of Object.entries(SFX)) {
    const stereo = build();
    encode(`sfx_${name}`, stereo, { bitrate: '80000' });
  }
  console.log(`✓ ${Object.keys(SFX).length} SFX rendered`);
}

// size report
if (existsSync(outDir)) {
  const total = execFileSync('du', ['-sh', outDir]).toString().trim();
  console.log(`total: ${total}`);
}
