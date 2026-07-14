// Generates game art via the Nano Banana API (Gemini image models).
// Usage:
//   GEMINI_API_KEY=... node scripts/art/generate.mjs [--only id1,id2] [--kind enemy,bg] [--force] [--model <model>]
// Resumable: skips assets whose output .webp already exists (unless --force).
// Failures land in scripts/art/failures.json for a later retry pass.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const OUT_ROOT = join(root, 'public', 'art');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY env var is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? true) : undefined;
};
const only = flag('only') ? String(flag('only')).split(',') : null;
const kinds = flag('kind') ? String(flag('kind')).split(',') : null;
const force = args.includes('--force');
const MODEL = typeof flag('model') === 'string' ? flag('model') : 'gemini-3.1-flash-image';

const KIND_DIR = { card: 'cards', guest: 'guests', enemy: 'enemies', relic: 'relics', coffee: 'coffee', bg: 'bg', node: 'nodes' };

const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8'));

function outPath(asset) {
  return join(OUT_ROOT, KIND_DIR[asset.kind], `${asset.id}.webp`);
}

async function callApi(asset, attempt = 1) {
  const parts = [];
  if (asset.photo && existsSync(asset.photo)) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: readFileSync(asset.photo).toString('base64'),
      },
    });
  }
  parts.push({ text: asset.prompt });

  const [w, h] = asset.size;
  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: w === h ? '1:1' : '16:9' },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`HTTP ${res.status} after ${attempt} attempts`);
    const wait = Math.min(60000, 2000 * 2 ** attempt);
    console.log(`  ${res.status}, retrying in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
    return callApi(asset, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  const data = await res.json();
  const cand = data.candidates?.[0];
  const img = cand?.content?.parts?.find((p) => p.inlineData?.data);
  if (!img) {
    const reason = cand?.finishReason ?? 'no candidates';
    const text = cand?.content?.parts?.find((p) => p.text)?.text?.slice(0, 160) ?? '';
    throw new Error(`no image returned (${reason}) ${text}`);
  }
  return Buffer.from(img.inlineData.data, 'base64');
}

async function processAsset(asset) {
  const out = outPath(asset);
  if (!force && existsSync(out)) return 'skipped';
  const raw = await callApi(asset);
  mkdirSync(dirname(out), { recursive: true });
  const [w, h] = asset.size;
  await sharp(raw)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .webp({ quality: asset.kind === 'bg' ? 74 : 80 })
    .toFile(out);
  return 'generated';
}

const queue = manifest.filter((a) =>
  (!only || only.includes(a.id)) && (!kinds || kinds.includes(a.kind)));

console.log(`model=${MODEL} · ${queue.length} assets queued`);
const failures = [];
let done = 0, skipped = 0;

// modest parallelism to stay under rate limits
const CONCURRENCY = 3;
let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const asset = queue[cursor++];
    try {
      const status = await processAsset(asset);
      if (status === 'skipped') skipped++;
      else {
        done++;
        console.log(`✓ ${asset.kind}/${asset.id} (${done})`);
      }
    } catch (err) {
      console.error(`✗ ${asset.kind}/${asset.id}: ${err.message}`);
      failures.push({ id: asset.id, kind: asset.kind, error: String(err.message) });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

writeFileSync(join(here, 'failures.json'), JSON.stringify(failures, null, 1));
console.log(`\ndone: ${done} generated, ${skipped} skipped, ${failures.length} failed`);
if (failures.length) console.log('failures written to scripts/art/failures.json — rerun to retry');
