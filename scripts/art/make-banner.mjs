import sharp from 'sharp';

const W = 1536, H = 620;
const base = await sharp('public/art/bg/title.webp')
  .extract({ left: 0, top: 150, width: 1536, height: 620 })
  .toBuffer();

const esc = (s) => s.replace(/&/g, '&amp;');
const title = 'ROADMAP RAIDERS';
const tagline = 'A Slay the Spire-style roguelike deckbuilder for product managers';

const overlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#150b08" stop-opacity="0.18"/>
      <stop offset="0.55" stop-color="#150b08" stop-opacity="0.0"/>
      <stop offset="1" stop-color="#150b08" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9c2"/>
      <stop offset="0.5" stop-color="#f0a35e"/>
      <stop offset="1" stop-color="#d9702f"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <text x="${W / 2}" y="${H * 0.66}" text-anchor="middle"
        font-family="Luminari, Papyrus, fantasy" font-size="132" letter-spacing="3"
        fill="url(#gold)" stroke="#3a1a10" stroke-width="5" paint-order="stroke">${esc(title)}</text>
  <text x="${W / 2}" y="${H * 0.66 + 74}" text-anchor="middle"
        font-family="Georgia, serif" font-size="33" fill="#f6ede2">${esc(tagline)}</text>
</svg>`;

const overlayBuf = await sharp(Buffer.from(overlay)).resize(W, H).png().toBuffer();
const composited = await sharp(base)
  .composite([{ input: overlayBuf, top: 0, left: 0 }])
  .png()
  .toBuffer();
await sharp(composited).resize(1200).png().toFile('assets/banner.png');

console.log('banner.png', (await sharp('assets/banner.png').metadata()).width + 'x' + (await sharp('assets/banner.png').metadata()).height);
