#!/usr/bin/env python3
"""Extract card data from Lenny's podcast transcripts for the Roadmap Raiders game."""

import os
import re
import json
import random
import yaml

EPISODES_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'transcripts', 'episodes')
# Comprehensive dataset from LennysNewsletter
COMPREHENSIVE_DIR = os.path.join(os.path.dirname(__file__), '..', 'lennys-newsletterpodcastdata-all')
INDEX_FILE = os.path.join(COMPREHENSIVE_DIR, 'index.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'cards.json')

# PM domains and their associated keywords
PM_DOMAINS = {
    "Growth": ["growth", "acquisition", "retention", "viral", "PLG", "product-led", "funnel", "conversion", "onboarding"],
    "Strategy": ["strategy", "vision", "roadmap", "prioritization", "positioning", "market", "competitive"],
    "Leadership": ["leadership", "management", "hiring", "culture", "team", "coaching", "mentorship"],
    "Execution": ["execution", "shipping", "iteration", "agile", "sprint", "velocity", "ops"],
    "Data": ["analytics", "metrics", "data", "experimentation", "A/B", "measurement", "KPI"],
    "AI": ["AI", "machine learning", "LLM", "GPT", "agents", "automation", "intelligence"],
    "Design": ["design", "UX", "user research", "prototype", "usability", "interface"],
    "Revenue": ["revenue", "pricing", "monetization", "sales", "enterprise", "B2B", "SaaS"],
}

# Special abilities based on keywords
ABILITIES = {
    "Growth Hack": {"keywords": ["growth", "viral", "PLG"], "description": "Draw 2 extra cards", "effect": "draw_2"},
    "Pivot Master": {"keywords": ["pivot", "strategy", "positioning"], "description": "Swap one card with opponent", "effect": "swap_card"},
    "Ship It": {"keywords": ["shipping", "execution", "iteration"], "description": "+3 Attack this turn", "effect": "attack_boost_3"},
    "Data Driven": {"keywords": ["data", "analytics", "metrics"], "description": "Peek at opponent's hand", "effect": "peek"},
    "User Empathy": {"keywords": ["user research", "design", "UX"], "description": "Heal 2 HP", "effect": "heal_2"},
    "AI Amplify": {"keywords": ["AI", "machine learning", "LLM"], "description": "Double next card's power", "effect": "double_next"},
    "Culture Shield": {"keywords": ["culture", "hiring", "team"], "description": "Block next attack", "effect": "shield"},
    "Revenue Engine": {"keywords": ["revenue", "pricing", "sales"], "description": "+2 to all cards this turn", "effect": "power_boost_2"},
}


def parse_transcript(filepath):
    """Parse a transcript file and return metadata + content."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split YAML frontmatter
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None

    try:
        metadata = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return None

    transcript_text = parts[2].strip()
    return {
        'metadata': metadata,
        'text': transcript_text,
    }


def extract_quotes(text, max_quotes=5):
    """Extract short, memorable quotes from transcript text."""
    # Remove speaker labels like **Name** (00:00:00):
    clean_text = re.sub(r'\*\*[^*]+\*\*\s*\(\d{2}:\d{2}:\d{2}\):\s*', '', text)
    # Remove markdown formatting
    clean_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean_text)
    clean_text = re.sub(r'\*([^*]+)\*', r'\1', clean_text)

    sentences = re.split(r'[.!?]+', clean_text)
    good_quotes = []

    for s in sentences:
        s = s.strip()
        # Skip if it starts with "Lenny" (interviewer questions)
        if s.lower().startswith('lenny'):
            continue
        words = s.split()
        # Look for quotable sentences: 8-25 words, contains strong language
        if 8 <= len(words) <= 25:
            strong_words = ['never', 'always', 'most important', 'secret', 'key',
                          'biggest', 'best', 'worst', 'critical', 'everything',
                          'nothing', 'only', 'real', 'actually', 'truth',
                          'mistake', 'lesson', 'learn', 'build', 'ship',
                          'customer', 'user', 'product', 'growth', 'team',
                          'company', 'people', 'world', 'change', 'think',
                          'believe', 'create', 'power', 'strategy', 'win']
            if any(w in s.lower() for w in strong_words):
                quote = s.strip()
                # Skip podcast plugs, URLs, and other noise
                skip_phrases = ['subscribe', 'episode', 'podcast', 'http', 'lenny',
                               'missing future', 'brought to you', 'sponsor']
                if any(sp in quote.lower() for sp in skip_phrases):
                    continue
                if quote:
                    good_quotes.append(quote)

    # Deduplicate and pick best ones
    seen = set()
    unique = []
    for q in good_quotes:
        key = q.lower()[:30]
        if key not in seen:
            seen.add(key)
            unique.append(q)

    return unique[:max_quotes]


def determine_domain(metadata):
    """Determine the PM domain based on keywords."""
    keywords = [k.lower() for k in metadata.get('keywords', [])]
    desc = metadata.get('description', '').lower()
    title = metadata.get('title', '').lower()
    combined = ' '.join(keywords) + ' ' + desc + ' ' + title

    scores = {}
    for domain, domain_keywords in PM_DOMAINS.items():
        score = sum(1 for kw in domain_keywords if kw.lower() in combined)
        if score > 0:
            scores[domain] = score

    if scores:
        return max(scores, key=scores.get)
    return random.choice(list(PM_DOMAINS.keys()))


def determine_ability(metadata):
    """Pick a special ability based on keywords."""
    keywords = [k.lower() for k in metadata.get('keywords', [])]
    combined = ' '.join(keywords)

    for ability_name, ability_data in ABILITIES.items():
        if any(kw.lower() in combined for kw in ability_data['keywords']):
            return {"name": ability_name, "description": ability_data['description'], "effect": ability_data['effect']}

    # Default ability
    return {"name": "Ship It", "description": "+3 Attack this turn", "effect": "attack_boost_3"}


def calculate_stats(metadata, text):
    """Calculate card stats based on episode data."""
    views = metadata.get('view_count', 10000)
    duration = metadata.get('duration_seconds', 3600)
    word_count = len(text.split()) if text else 5000

    # Normalize stats to game-friendly ranges
    # Attack: 1-10 based on view count (popularity = influence)
    attack = min(10, max(1, int(views / 10000) + 1))

    # Defense: 1-10 based on duration (longer = more depth)
    defense = min(10, max(1, int(duration / 600) + 1))

    # Wisdom: 1-10 based on word count (more words = more knowledge)
    wisdom = min(10, max(1, int(word_count / 3000) + 1))

    return {"attack": attack, "defense": defense, "wisdom": wisdom}


def generate_guest_cards():
    """Generate hero cards from podcast guests."""
    cards = []

    if not os.path.exists(EPISODES_DIR):
        print(f"Episodes directory not found: {EPISODES_DIR}")
        return cards

    for episode_dir in sorted(os.listdir(EPISODES_DIR)):
        transcript_path = os.path.join(EPISODES_DIR, episode_dir, 'transcript.md')
        if not os.path.exists(transcript_path):
            continue

        parsed = parse_transcript(transcript_path)
        if not parsed or not parsed['metadata']:
            continue

        meta = parsed['metadata']
        guest = meta.get('guest', episode_dir.replace('-', ' ').title())
        title = meta.get('title', '')
        description = meta.get('description', '')

        # Extract domain and stats
        domain = determine_domain(meta)
        stats = calculate_stats(meta, parsed['text'])
        ability = determine_ability(meta)
        quotes = extract_quotes(parsed['text'])

        card = {
            "id": f"guest_{episode_dir}",
            "type": "hero",
            "name": guest,
            "title": title,
            "domain": domain,
            "stats": stats,
            "ability": ability,
            "quotes": quotes[:3],
            "keywords": meta.get('keywords', [])[:5],
            "episode_date": meta.get('publish_date', ''),
            "views": meta.get('view_count', 0),
        }
        cards.append(card)

    return cards


# Monster cards representing PM challenges
MONSTER_CARDS = [
    {"id": "monster_scope_creep", "type": "monster", "name": "Scope Creep Dragon", "domain": "Execution",
     "stats": {"attack": 6, "defense": 8, "wisdom": 3}, "description": "An ever-growing beast that devours timelines and budgets.",
     "reward": "Ship It ability card", "level": 3},
    {"id": "monster_bikeshedding", "type": "monster", "name": "Bikeshedding Demon", "domain": "Strategy",
     "stats": {"attack": 4, "defense": 5, "wisdom": 2}, "description": "Forces everyone to argue about button colors instead of shipping.",
     "reward": "+2 Wisdom", "level": 2},
    {"id": "monster_hippo", "type": "monster", "name": "The HiPPO", "domain": "Leadership",
     "stats": {"attack": 9, "defense": 7, "wisdom": 4}, "description": "Highest Paid Person's Opinion overrides all data and research.",
     "reward": "Data Driven ability card", "level": 5},
    {"id": "monster_technical_debt", "type": "monster", "name": "Technical Debt Golem", "domain": "Execution",
     "stats": {"attack": 5, "defense": 9, "wisdom": 1}, "description": "Slow, immovable, and gets bigger every sprint you ignore it.",
     "reward": "+3 Defense", "level": 4},
    {"id": "monster_vanity_metrics", "type": "monster", "name": "Vanity Metrics Phantom", "domain": "Data",
     "stats": {"attack": 3, "defense": 3, "wisdom": 8}, "description": "Looks impressive but provides zero actionable insight.",
     "reward": "Data Driven ability card", "level": 2},
    {"id": "monster_feature_factory", "type": "monster", "name": "Feature Factory", "domain": "Strategy",
     "stats": {"attack": 7, "defense": 6, "wisdom": 2}, "description": "Churns out features nobody asked for at alarming speed.",
     "reward": "User Empathy ability card", "level": 4},
    {"id": "monster_stakeholder_hydra", "type": "monster", "name": "Stakeholder Hydra", "domain": "Leadership",
     "stats": {"attack": 8, "defense": 6, "wisdom": 5}, "description": "Cut one requirement and two more grow in its place.",
     "reward": "Pivot Master ability card", "level": 5},
    {"id": "monster_churn_wraith", "type": "monster", "name": "Churn Wraith", "domain": "Growth",
     "stats": {"attack": 7, "defense": 4, "wisdom": 6}, "description": "Silently steals your users in the night. Hard to detect until too late.",
     "reward": "Growth Hack ability card", "level": 4},
    {"id": "monster_analysis_paralysis", "type": "monster", "name": "Analysis Paralysis Sphinx", "domain": "Data",
     "stats": {"attack": 2, "defense": 10, "wisdom": 9}, "description": "Asks endless questions, never lets you ship anything.",
     "reward": "Ship It ability card", "level": 3},
    {"id": "monster_burnout_phoenix", "type": "monster", "name": "Burnout Phoenix", "domain": "Leadership",
     "stats": {"attack": 8, "defense": 3, "wisdom": 7}, "description": "Burns bright then crashes. Rises again to burn your whole team.",
     "reward": "Culture Shield ability card", "level": 5},
    {"id": "monster_mvp_mimic", "type": "monster", "name": "MVP Mimic", "domain": "Execution",
     "stats": {"attack": 4, "defense": 4, "wisdom": 4}, "description": "Disguises itself as a real product. Fools investors but not users.",
     "reward": "+2 Attack", "level": 2},
    {"id": "monster_ai_hype", "type": "monster", "name": "AI Hype Beast", "domain": "AI",
     "stats": {"attack": 6, "defense": 5, "wisdom": 3}, "description": "Promises to solve everything with AI. Delivers a chatbot wrapper.",
     "reward": "AI Amplify ability card", "level": 3},
    {"id": "monster_reorg", "type": "monster", "name": "Reorg Tornado", "domain": "Leadership",
     "stats": {"attack": 9, "defense": 2, "wisdom": 1}, "description": "Strikes without warning. Scatters teams across the org chart.",
     "reward": "Culture Shield ability card", "level": 4},
    {"id": "monster_competitor_shadow", "type": "monster", "name": "Competitor Shadow", "domain": "Strategy",
     "stats": {"attack": 6, "defense": 7, "wisdom": 6}, "description": "Always one step ahead. Copies your roadmap before you ship.",
     "reward": "Pivot Master ability card", "level": 4},
    {"id": "monster_sev1", "type": "monster", "name": "Sev-1 Incident", "domain": "Execution",
     "stats": {"attack": 10, "defense": 1, "wisdom": 2}, "description": "Pages you at 3am. All hands on deck. Nothing else matters.",
     "reward": "+3 Attack", "level": 5},
]

# Treasure/Power-up cards
TREASURE_CARDS = [
    {"id": "treasure_okr", "type": "treasure", "name": "OKR Framework", "domain": "Strategy",
     "description": "Align your team with clear objectives.", "effect": "+2 to all stats for 1 turn", "rarity": "common"},
    {"id": "treasure_north_star", "type": "treasure", "name": "North Star Metric", "domain": "Data",
     "description": "One metric to rule them all.", "effect": "+4 Wisdom permanently", "rarity": "rare"},
    {"id": "treasure_user_interview", "type": "treasure", "name": "User Interview Notes", "domain": "Design",
     "description": "Finally, actual user feedback!", "effect": "Heal 3 HP", "rarity": "common"},
    {"id": "treasure_ab_test", "type": "treasure", "name": "Winning A/B Test", "domain": "Data",
     "description": "Statistical significance achieved!", "effect": "+3 Attack for 2 turns", "rarity": "uncommon"},
    {"id": "treasure_product_sense", "type": "treasure", "name": "Product Sense", "domain": "Strategy",
     "description": "You just... know what to build.", "effect": "Choose any card from discard pile", "rarity": "legendary"},
    {"id": "treasure_investor_deck", "type": "treasure", "name": "Series B Deck", "domain": "Revenue",
     "description": "Fresh capital unlocks new possibilities.", "effect": "Draw 3 cards", "rarity": "rare"},
    {"id": "treasure_retro", "type": "treasure", "name": "Sprint Retro", "domain": "Execution",
     "description": "Learn from your mistakes. Adjust and improve.", "effect": "+2 Defense permanently", "rarity": "common"},
    {"id": "treasure_pmf", "type": "treasure", "name": "Product-Market Fit", "domain": "Growth",
     "description": "The holy grail. Users are pulling the product from your hands.", "effect": "+5 to all stats for 1 turn", "rarity": "legendary"},
    {"id": "treasure_moat", "type": "treasure", "name": "Competitive Moat", "domain": "Strategy",
     "description": "Network effects, switching costs, and brand loyalty.", "effect": "+4 Defense permanently", "rarity": "rare"},
    {"id": "treasure_slack_channel", "type": "treasure", "name": "War Room Slack Channel", "domain": "Execution",
     "description": "#incident-response is live. All hands.", "effect": "+3 Attack this turn", "rarity": "common"},
    {"id": "treasure_ai_copilot", "type": "treasure", "name": "AI Copilot", "domain": "AI",
     "description": "Your AI pair programmer ships 10x faster.", "effect": "Play 2 cards this turn", "rarity": "uncommon"},
    {"id": "treasure_launch_blog", "type": "treasure", "name": "Launch Blog Post", "domain": "Growth",
     "description": "Hit #1 on Hacker News. Traffic is spiking.", "effect": "+3 Wisdom for 2 turns", "rarity": "uncommon"},
]


def generate_comprehensive_cards():
    """Generate hero cards from the comprehensive LennysNewsletter dataset."""
    cards = []
    podcasts_dir = os.path.join(COMPREHENSIVE_DIR, 'podcasts')

    if not os.path.exists(podcasts_dir):
        print(f"Comprehensive podcasts dir not found: {podcasts_dir}")
        return cards

    # Load index for metadata
    index_data = {}
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            idx = json.load(f)
            for p in idx.get('podcasts', []):
                index_data[p.get('guest', '')] = p

    for fname in sorted(os.listdir(podcasts_dir)):
        if not fname.endswith('.md'):
            continue

        filepath = os.path.join(podcasts_dir, fname)
        parsed = parse_transcript(filepath)
        if not parsed or not parsed['metadata']:
            continue

        meta = parsed['metadata']
        guest = meta.get('guest', fname.replace('.md', '').replace('-', ' ').title())
        title = meta.get('title', '')

        # Merge index data for word_count
        idx_entry = index_data.get(guest, {})
        word_count = meta.get('word_count', idx_entry.get('word_count', 5000))

        # Build keywords from tags
        tags = meta.get('tags', [])
        meta['keywords'] = tags  # Normalize for domain detection

        domain = determine_domain(meta)
        # Use word count for stats since this dataset doesn't have view counts
        views = idx_entry.get('word_count', word_count)  # proxy: longer episodes = more impactful
        stats_meta = {**meta, 'view_count': views * 3, 'duration_seconds': word_count * 0.5}
        stats = calculate_stats(stats_meta, parsed['text'])
        ability = determine_ability(meta)
        quotes = extract_quotes(parsed['text'])

        card = {
            "id": f"guest_{fname.replace('.md', '')}",
            "type": "hero",
            "name": guest,
            "title": title,
            "domain": domain,
            "stats": stats,
            "ability": ability,
            "quotes": quotes[:3],
            "keywords": tags[:5],
            "episode_date": str(meta.get('date', '')),
            "views": views * 3,
        }
        cards.append(card)

    return cards


def main():
    print("Extracting card data from Lenny's podcast transcripts...")

    # Use comprehensive dataset only
    all_cards = generate_comprehensive_cards()
    print(f"Generated {len(all_cards)} hero cards from comprehensive dataset")

    # Pick the top 60 guests by view count for the game deck
    all_cards.sort(key=lambda c: c.get('views', 0), reverse=True)
    top_guests = all_cards[:60]

    game_data = {
        "meta": {
            "name": "Roadmap Raiders",
            "version": "1.0.0",
            "description": "A Munchkin-style PM card battle game powered by Lenny's Podcast data",
            "source": "https://github.com/LennysNewsletter/lennys-newsletterpodcastdata-all",
            "total_episodes_processed": len(all_cards),
        },
        "heroes": top_guests,
        "monsters": MONSTER_CARDS,
        "treasures": TREASURE_CARDS,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(game_data, f, indent=2, default=str)

    print(f"Wrote game data to {OUTPUT_FILE}")
    print(f"  Heroes: {len(top_guests)}")
    print(f"  Monsters: {len(MONSTER_CARDS)}")
    print(f"  Treasures: {len(TREASURE_CARDS)}")


if __name__ == '__main__':
    main()
