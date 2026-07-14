// Build favicon assets from public/favicon.svg → PNG sizes + a multi-size .ico.
// The .ico embeds PNG payloads (supported by all modern browsers + Windows).
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', '..', 'public');
const svg = join(pub, 'favicon.svg');

const sizes = [16, 32, 48];
const pngs = {};
for (const sz of [...sizes, 180]) {
  const buf = await sharp(svg).resize(sz, sz).png().toBuffer();
  pngs[sz] = buf;
  if (sz !== 180) writeFileSync(join(pub, `favicon-${sz}.png`), buf);
}
writeFileSync(join(pub, 'favicon-180.png'), pngs[180]);

// --- assemble ICO (PNG-in-ICO) ---
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const bodies = [];
  entries.forEach((e, i) => {
    const b = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 0); // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1); // height
    dir.writeUInt8(0, b + 2);       // palette
    dir.writeUInt8(0, b + 3);       // reserved
    dir.writeUInt16LE(1, b + 4);    // color planes
    dir.writeUInt16LE(32, b + 6);   // bpp
    dir.writeUInt32LE(e.data.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += e.data.length;
    bodies.push(e.data);
  });
  return Buffer.concat([header, dir, ...bodies]);
}

const ico = buildIco(sizes.map((sz) => ({ size: sz, data: pngs[sz] })));
writeFileSync(join(pub, 'favicon.ico'), ico);

console.log(`✓ favicon.ico (${sizes.join('/')}), favicon-{16,32,48,180}.png, favicon.svg`);
