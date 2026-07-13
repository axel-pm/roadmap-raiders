<p align="center">
  <img src="assets/banner.svg" alt="Roadmap Raiders" width="560">
</p>

# Roadmap Raiders

**A Slay the Spire-inspired roguelike deckbuilder where you climb the product roadmap, fight the monsters every product manager knows — Scope Creep, the HiPPO, the Feature Factory — and recruit real [Lenny's Podcast](https://www.lennyspodcast.com/) guests into your deck.** Plays in your browser. Nothing to install.

<p align="center">
  <strong><a href="https://axel-pm.github.io/munchkin/">▶ Play it now</a></strong>
</p>

---

## The game

You're a PM climbing **The Roadmap** — a branching map through three acts: **Find PMF**, **Scale-Up**, and **The IPO Road**. Along the way you fight PM anti-patterns in full deckbuilder combat, collect framework relics, drink questionable amounts of coffee, and finally face **The HiPPO** — the Highest Paid Person's Opinion — at the top.

- **⚔️ Turn-based card combat** — 3 Bandwidth per turn, a hand of 5, Buffer to block, and enemies that telegraph their next move. Attacks, Skills, and Powers; Momentum, Exposed, Tech Debt, Burnout, and a dozen more PM-flavored statuses.
- **🎙️ 60 real podcast guests as unique cards** — each guest's card is derived from their actual episode data (domain, stats, signature ability), with their real quotes as flavor text. The top guests get handcrafted signature mechanics: Eric Ries runs a Lean Loop, Marc Andreessen goes PMF-or-Die.
- **🗺 A branching roadmap** — fights, elites, ?-events, shops, retros (heal or upgrade), treasures, and a boss at the end of every act.
- **🔮 28 framework relics** — OKRs, North Star Metric, the AI Copilot, Product-Market Fit… passive power that changes how your deck plays.
- **📈 Meta-progression** — runs earn Listener XP that unlocks more guests; wins unlock Ascension levels 1–10; mid-run saves survive a refresh; seeded runs are fully reproducible.

## Monsters you already know

Meeting Goblins (they multiply), the Bikeshedding Demon, the MVP Mimic, the Scope Creep Dragon (it stuffs curses into your deck), the Stakeholder Hydra (three heads, and killing one enrages the rest), the Burnout Phoenix (it *will* rise again), the Deadline Reaper (ship or die), and The HiPPO — 300 HP of pure gut feel.

## Run it locally

```bash
npm install
npm run dev        # dev server
npm test           # engine + simulation tests
npm run build      # production build to dist/
```

Built with Vite + TypeScript, no framework — the combat engine is fully headless and unit-tested, and a greedy bot plays complete seeded runs in CI as a balance sanity check.

## The data

Guest cards are generated from an open dataset of 289 podcast episodes (`data/cards.json` → `data/guests.json`). Regenerate with `npm run transform`; rebuild the source data with `scripts/extract_cards.py` against the community [podcast dataset](https://github.com/LennysNewsletter/lennys-newsletterpodcastdata-all).

## Credits

Card data is derived from [Lenny's Podcast](https://www.lennyspodcast.com/) via the community dataset. Guest cards celebrate the guests and their ideas; this is an unofficial fan project and isn't affiliated with or endorsed by the podcast. Game design inspired by Slay the Spire.

## License

[MIT](LICENSE).
