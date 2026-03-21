# PM Munchkin

A Munchkin-style card battle game where you fight PM monsters using wisdom from Lenny's Podcast guests.

## How to Play

1. Open `index.html` in a browser (or serve with any HTTP server)
2. Pick 3 starting heroes from Lenny's podcast guests
3. Battle PM monsters (Scope Creep Dragon, The HiPPO, Feature Factory...)
4. Play hero cards to beat monsters - your Attack must exceed their power
5. Earn treasures and level up
6. Reach Level 10 to win!

## Game Mechanics

- **Hero Cards**: Real podcast guests with stats derived from episode data (views, duration, word count)
- **Monster Cards**: PM anti-patterns and challenges (Bikeshedding Demon, Stakeholder Hydra, etc.)
- **Treasure Cards**: PM tools and frameworks (OKR Framework, North Star Metric, Product-Market Fit)
- **Special Abilities**: Each hero has an ability based on their podcast topics

## Data Source

Card data is extracted from [Lenny's Podcast](https://www.lennyspodcast.com/) transcripts via the [comprehensive dataset](https://github.com/LennysNewsletter/lennys-newsletterpodcastdata-all). 289 episodes processed, top 60 guests become hero cards.

## Regenerating Card Data

```bash
# Clone the data repo first
git clone https://github.com/LennysNewsletter/lennys-newsletterpodcastdata-all.git

# Extract cards
pip install pyyaml
python3 scripts/extract_cards.py
```

## Running Locally

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```
