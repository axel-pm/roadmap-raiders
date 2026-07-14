// Generate PWA icons from the painted title art. → public/icons/
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// Square crop of the title vista focused on the glowing sunrise tower.
const SRC = join(root, 'public', 'art', 'bg', 'title.webp'); // 1536x864
const cropped = await sharp(SRC)
  .extract({ left: 512, top: 40, width: 720, height: 720 })
  .toBuffer();

async function icon(size, name, { maskable = false } = {}) {
  let img = sharp(cropped).resize(size, size, { fit: 'cover' });
  if (maskable) {
    // safe-zone padding: shrink art to 80%, pad with warm ground
    const inner = Math.round(size * 0.8);
    const art = await sharp(cropped).resize(inner, inner, { fit: 'cover' }).toBuffer();
    img = sharp({
      create: { width: size, height: size, channels: 4, background: { r: 28, g: 18, b: 16, alpha: 1 } },
    }).composite([{ input: art, gravity: 'center' }]);
  }
  await img.png().toFile(join(outDir, name));
  console.log(`✓ ${name} (${size}px${maskable ? ', maskable' : ''})`);
}

await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');
await icon(512, 'icon-maskable-512.png', { maskable: true });
await icon(180, 'apple-touch-icon.png');
console.log('done');
