// One-time transform: data/cards.json heroes -> data/guests.json
// Cleans quotes, ranks by views, keeps everything the guest-card generator needs.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cards = JSON.parse(readFileSync(join(root, 'data/cards.json'), 'utf8'));

function cleanQuote(q) {
  let s = q.replace(/^[A-Z][\w .'-]{0,40}\s*\(\d{2}:\d{2}(?::\d{2})?\)\s*:?\s*/, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s && !/[.!?"]$/.test(s)) s += '.';
  return s;
}

function isUsableQuote(q) {
  if (q.length < 30 || q.length > 180) return false;
  if (/^Lenny\b/i.test(q)) return false;
  if (/subscribe|sponsor|lennyspodcast|this episode is brought/i.test(q)) return false;
  return true;
}

const guests = cards.heroes
  .slice()
  .sort((a, b) => b.views - a.views)
  .map((h, i) => {
    const quotes = h.quotes.map(cleanQuote).filter(isUsableQuote);
    return {
      id: h.id,
      name: h.name,
      episodeTitle: h.title,
      domain: h.domain,
      attack: h.stats.attack,
      wisdom: h.stats.wisdom,
      abilityEffect: h.ability.effect,
      abilityName: h.ability.name,
      quotes: quotes.length ? quotes : [h.quotes[0] ?? ''].filter(Boolean),
      keywords: h.keywords,
      episodeDate: h.episode_date,
      views: h.views,
      rank: i + 1,
    };
  });

writeFileSync(join(root, 'data/guests.json'), JSON.stringify({ guests }, null, 1) + '\n');
console.log(`Wrote ${guests.length} guests. Ability buckets:`,
  guests.reduce((m, g) => ((m[g.abilityEffect] = (m[g.abilityEffect] ?? 0) + 1), m), {}));
