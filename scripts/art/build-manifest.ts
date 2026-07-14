// Builds scripts/art/manifest.json from the live content registries.
// Run with: npx vite-node scripts/art/build-manifest.ts

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_TACTIC_CARDS } from '../../src/content/cards/tactics';
import { ALL_ENEMIES } from '../../src/content';
import { RELICS } from '../../src/content/relics';
import { COFFEES } from '../../src/content/coffee';
import { GUESTS } from '../../src/content/guests/generate';
import type { Domain } from '../../src/engine/types';

const here = dirname(fileURLToPath(import.meta.url));

// One shared voice for every asset — the consistency anchor.
// Direction: Slay the Spire structure, Lenny's Podcast warmth — campfire-lit
// corporate fantasy in an indie zine / risograph idiom.
const STYLE = [
  'Warm painterly illustration for a cozy-but-epic roguelike deckbuilder card game,',
  'inspired by indie zine and risograph print art: bold hand-drawn ink outlines,',
  'chunky painterly fills, visible speckled grain texture, dramatic warm campfire-glow lighting.',
  'Palette dominated by sunrise orange, peach, coral and cream, with deep warm brown',
  'shadows and muted teal-navy accents. Slightly exaggerated friendly proportions,',
  'strong readable silhouette, centered composition.',
  'Corporate tech-office life reimagined as fantasy adventure.',
  'No text, no letters, no watermark, no card frame, no border.',
].join(' ');

const DOMAIN_TONE: Record<Domain, string> = {
  Leadership: 'regal purple and violet glow',
  Growth: 'vivid emerald green glow',
  Strategy: 'cool sapphire blue glow',
  Revenue: 'deep gold and green glow',
  Data: 'teal and cyan glow',
  AI: 'crimson and magenta glow',
  Design: 'warm amber and orange glow',
  Execution: 'burnt orange glow',
};

interface Asset {
  id: string;
  kind: 'card' | 'guest' | 'enemy' | 'relic' | 'coffee' | 'bg' | 'node';
  prompt: string;
  size: [number, number];
  photo?: string; // unused since the person-policy block; kept for the generator API
}

// --- map node tokens (the roadmap markers) ---
const NODE_SUBJECTS: Record<string, string> = {
  monster: 'A snarling little PM-gremlin creature head glaring out, bold and iconic',
  elite: 'A fearsome horned demon skull with glowing eyes, menacing and powerful',
  event: 'A glowing mysterious question-mark rune floating over a small unfurled scroll',
  shop: 'A cozy merchant market stall with a bulging coin purse and hanging wares',
  rest: 'A warm crackling campfire with a steaming coffee mug beside it',
  treasure: 'An ornate wooden treasure chest brimming with golden light and coins',
  boss: 'An ominous monstrous silhouette wearing a crown, radiating dread, a warning banner',
};

/** merge scripts/art/descriptions/batch*.json (written by vision subagents) */
function loadDescriptions(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (let i = 1; i <= 5; i++) {
    const p = join(here, 'descriptions', `batch${i}.json`);
    if (existsSync(p)) Object.assign(merged, JSON.parse(readFileSync(p, 'utf8')));
  }
  return merged;
}

// --- hand-written subjects for enemies (the visual stars) ---
const ENEMY_SUBJECTS: Record<string, string> = {
  meeting_goblin: 'A small gleeful goblin in an oversized business suit clutching a calendar covered in overlapping meeting invites, conference-room table behind it',
  bikeshedding_demon: 'A pedantic horned demon obsessively repainting a tiny bicycle while towers of urgent paperwork burn behind it',
  vanity_metrics_phantom: 'A translucent ghostly figure made of glowing ascending charts and confetti, hollow where its heart should be',
  mvp_mimic: 'A cardboard shipping box mimic with duct-tape seams opening to reveal rows of sharp teeth and a glowing gullet',
  nps_troll: 'A grumpy warty troll holding a giant "0/10" survey scorecard like a war shield, angry emoji stickers on its skin',
  slide_deck_zombie: 'A decaying zombie in office wear shambling forward dragging an endless accordion of presentation slides behind it',
  scope_creep_dragon: 'A massive serpentine dragon whose scales are colorful overlapping sticky notes, coiled around a collapsing project timeline, jaws wide',
  analysis_paralysis_sphinx: 'A stone sphinx with a laptop between its paws, surrounded by floating question marks and frozen decision trees',
  feature_factory: 'A monstrous living factory with smokestacks and conveyor belts vomiting identical shrink-wrapped features, glowing furnace eyes',
  churn_wraith: 'A wraith of grey mist made of dissolving user avatars drifting away like smoke, reaching with long fingers',
  competitor_shadow: 'A sleek ninja silhouette made of living shadow holding a stolen glowing product roadmap scroll',
  dark_pattern_vampire: 'An elegant vampire in a designer suit hypnotizing with a glowing "unsubscribe" button held just out of reach',
  committee_ghost: 'A translucent ghost in business casual raising one objecting finger, endless meeting minutes swirling around it',
  okr_ouroboros: 'A serpent biting its own tail formed from cascading goal-tracking spreadsheets and arrows, infinite loop glow',
  growth_hacker_gremlin: 'A manic gremlin juggling spam emails and funnel charts, wearing a hoodie, surrounded by popup windows',
  technical_debt_golem: 'A hulking golem built from rusted server racks, tangled cables and legacy code printouts, cracks glowing ominous red',
  burnout_phoenix: 'A phoenix wreathed in exhausted orange flame rising from a nest of empty coffee cups and midnight laptops',
  hydra_sales_head: 'One head of a corporate hydra: a slick grinning dragon head wearing a sales headset, contract in its teeth',
  hydra_legal_head: 'One head of a corporate hydra: a stern dragon head in judge spectacles breathing red-tape ribbons',
  hydra_exec_head: 'One head of a corporate hydra: an imperious dragon head with a golden crown of KPI charts',
  sev1_incident: 'A blazing red siren elemental with tentacles of error logs and pager notifications, alarm light glow',
  compliance_lich: 'An undead lich in tattered legal robes holding a glowing checklist scepter, chained filing cabinets floating behind',
  the_consultant: 'A faceless figure in an immaculate suit presenting a glowing 2x2 matrix, golden hourglass billing meter floating beside',
  deadline_reaper: 'A grim reaper whose scythe blade is a giant clock hand, hourglass belt, calendar pages falling like leaves',
  vaporware_wisp: 'A barely-there wisp of glowing vapor shaped like a product mockup that dissolves at the edges',
  reorg_tornado: 'A tornado of org-chart boxes, desk chairs and name plates tearing through an office floor',
  ai_hype_beast: 'A dazzling chimera of neon circuit patterns and marketing sparkles, half magnificent, half glitching static',
  the_hippo: 'A colossal armored hippopotamus in an executive pinstripe suit on a throne of unread reports, golden gavel in fist, boardroom cathedral behind',
};

// --- hand-written subjects for marquee cards; others fall back to a template ---
const CARD_SUBJECTS: Record<string, string> = {
  ship_it: 'A determined hand slamming a giant glowing green LAUNCH lever, cargo ship of features setting sail from a dock of code',
  say_no: 'A calm open palm projecting a shimmering protective barrier that deflects a storm of incoming feature-request arrows',
  user_interview: 'A glowing golden microphone illuminating hidden truths as luminous threads rise from a shadowy user silhouette',
  hotfix: 'A tiny glowing bandage patch being slapped onto a cracked server, sparks flying',
  double_down: 'Two identical glowing dice slamming down in unison, impact shockwave',
  crunch_time: 'An office clock melting and burning at midnight, silhouetted worker hammering a keyboard in the glow',
  viral_feature: 'A luminous feature-orb exploding into a network of spreading light across a dark city grid',
  pivot_hard: 'A ship\'s wheel spun so hard it blurs, the deck tilting, stars streaking',
  launch_day: 'A rocket lifting off from an office rooftop, confetti and smoke, team silhouettes cheering',
  okrs: 'Three concentric glowing target rings aligned in the sky above a mountain path',
  north_star: 'A brilliant north star casting a single silver beam onto a dark roadmap landscape',
  founder_mode: 'A wild-eyed founder wreathed in crackling energy typing with six spectral arms',
  ship_to_prod: 'A cargo ship launched directly into a stormy sea at night from a party dock, lightning overhead',
  tenx_feature: 'A small gem multiplying into ten radiant copies in an ascending arc',
  big_bet: 'A tower of glowing poker chips pushed across a boardroom table into darkness',
  kill_the_feature: 'A ceremonial axe descending on a gift-wrapped feature box on an altar',
  hard_reset: 'A giant power switch being thrown in a dark server cathedral, arcs of light',
  vision_doc: 'An ancient illuminated scroll unfurling, projecting a glowing city blueprint into the air',
  acquihire: 'A golden magnet drawing a team of glowing figures across a chasm',
  ipo: 'A giant bronze bell being struck, shockwave of golden light over a trading floor',
  meetings: 'A hydra of calendar pages devouring an hourglass',
  scope_creep_curse: 'Tiny sticky-note tentacles sprouting from a project document, multiplying',
  doubt: 'A shadowy double whispering into a figure\'s ear, cold blue palette',
  legacy_code: 'A fossilized dinosaur skeleton made of punch cards and tangled cables',
  bug_report: 'A single glowing red beetle crawling out of a cracked ticket',
};

const RELIC_SUBJECTS: Record<string, string> = {
  pm_notebook: 'A worn leather notebook with a glowing bookmark ribbon, small and treasured',
  okr_framework: 'A brass astrolabe with three aligned target rings',
  product_market_fit: 'A radiant key perfectly seated in a heart-shaped lock',
  hypergrowth: 'A potted plant erupting into a towering beanstalk of charts',
  ai_copilot: 'A small floating brass automaton with a single kind glowing eye',
  north_star_metric: 'A compass whose needle is a shard of starlight',
  lennys_mic: 'A legendary golden podcast microphone on a velvet cushion, halo of light',
};

function buildAssets(): Asset[] {
  const assets: Asset[] = [];

  // backgrounds
  const BG: Record<string, string> = {
    title: 'Epic title vista at golden hour: a winding glowing product-roadmap path ascending a fantasy tower of office floors toward a radiant sunrise summit, tiny adventurer silhouette with a backpack at the base, campfire glow, city lights below',
    act1: 'A cozy startup garage-dungeon at night: exposed brick, whiteboards with glowing diagrams, pizza boxes, string lights, a campfire in an oil drum, a tunnel opening toward dawn light',
    act2: 'A vast scale-up open office at dusk as a fantasy hall: endless desks receding, glowing monitors like candles, giant metrics dashboards floating like warm stained glass, sunset through tall windows',
    act3: 'A stock-exchange cathedral at golden hour: marble columns, a towering golden bell, ticker tape falling like confetti snow, dramatic warm light from high windows with looming shadows',
  };
  for (const [id, subject] of Object.entries(BG)) {
    assets.push({
      id, kind: 'bg', size: [1536, 864],
      prompt: `${STYLE} Wide establishing shot, atmospheric depth, painterly environment concept art. ${subject}. Dark enough at the edges for UI text overlay.`,
    });
  }

  // enemies
  for (const e of ALL_ENEMIES) {
    const subject = ENEMY_SUBJECTS[e.id] ?? `${e.name}: ${e.description}`;
    assets.push({
      id: e.id, kind: 'enemy', size: [512, 512],
      prompt: `${STYLE} Full-body creature portrait for a battle screen, isolated on a deep warm brown-black background, soft ground shadow only. ${subject}.`,
    });
  }

  // tactic cards (skip guests here)
  for (const c of ALL_TACTIC_CARDS) {
    const subject = CARD_SUBJECTS[c.id]
      ?? `A symbolic corporate-fantasy scene illustrating "${c.name}" (${c.text ?? ''})`;
    const tone = c.type === 'attack' ? 'aggressive warm reds and oranges in the palette'
      : c.type === 'skill' ? 'cool defensive blues in the palette'
      : c.type === 'power' ? 'mystical purples in the palette'
      : 'sickly greens and murky browns in the palette';
    assets.push({
      id: c.id, kind: 'card', size: [512, 512],
      prompt: `${STYLE} Square card illustration, ${tone}. ${subject}.`,
    });
  }

  // guests: fictional characters painted from written appearance descriptions
  // (Google's API blocks photo-based and name-based real-person generation,
  // so likeness travels through neutral text descriptions instead)
  const descriptions = loadDescriptions();
  for (const g of GUESTS) {
    const tone = DOMAIN_TONE[g.domain] ?? 'golden glow';
    const desc = descriptions[g.id];
    assets.push({
      id: g.id, kind: 'guest', size: [512, 512],
      prompt: desc
        ? `${STYLE} Heroic bust portrait of a FICTIONAL podcast-guest character for a card game: ${desc} Speaking into an ornate brass podcast microphone, background ${tone} with a floating arcane sigil of their craft, campfire warmth on their face, warm celebratory heroic mood.`
        : `${STYLE} A heroic no-likeness emblem: an ornate brass podcast microphone on a pedestal radiating ${tone}, arcane sigils of ${g.domain.toLowerCase()} floating around it, treasure-artifact presentation.`,
    });
  }

  // relics
  for (const r of RELICS) {
    const subject = RELIC_SUBJECTS[r.id] ?? `A magical artifact: "${r.name}" — ${r.description}`;
    assets.push({
      id: r.id, kind: 'relic', size: [256, 256],
      prompt: `${STYLE} Single small magical artifact icon, isolated on plain very dark background, gentle golden glow. ${subject}.`,
    });
  }

  // coffees
  for (const c of COFFEES) {
    assets.push({
      id: c.id, kind: 'coffee', size: [256, 256],
      prompt: `${STYLE} Single glowing potion icon, isolated on plain very dark background: a magical coffee drink "${c.name}" (${c.description}) in a fantasy vessel, steam forming faint arcane shapes.`,
    });
  }

  // map node tokens — bold, iconic, readable at ~42px on the roadmap
  for (const [id, subject] of Object.entries(NODE_SUBJECTS)) {
    assets.push({
      id, kind: 'node', size: [256, 256],
      prompt: `${STYLE} A bold circular game-map token emblem, single centered subject filling the frame, readable at a tiny size, on a plain dark warm circular background. ${subject}.`,
    });
  }

  return assets;
}

const assets = buildAssets();
writeFileSync(join(here, 'manifest.json'), JSON.stringify(assets, null, 1));
const byKind = assets.reduce<Record<string, number>>((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + 1), m), {});
console.log(`manifest.json: ${assets.length} assets`, byKind,
  `(${assets.filter((a) => a.kind === 'guest' && !a.photo).length} guests currently without photos)`);
