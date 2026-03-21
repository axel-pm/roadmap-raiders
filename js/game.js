/**
 * Roadmap Raiders - A Munchkin-style PM Card Battle Game
 * Powered by Lenny's Podcast transcript data
 */

// === EMOJI MAPS ===
const DOMAIN_EMOJI = {
    Growth: "\u{1F680}",
    Strategy: "\u{1F3AF}",
    Leadership: "\u{1F451}",
    Execution: "\u{2692}\uFE0F",
    Data: "\u{1F4CA}",
    AI: "\u{1F916}",
    Design: "\u{1F3A8}",
    Revenue: "\u{1F4B0}",
};

const MONSTER_EMOJI = {
    "Scope Creep Dragon": "\u{1F409}",
    "Bikeshedding Demon": "\u{1F6B2}",
    "The HiPPO": "\u{1F99B}",
    "Technical Debt Golem": "\u{1FAA8}",
    "Vanity Metrics Phantom": "\u{1F47B}",
    "Feature Factory": "\u{1F3ED}",
    "Stakeholder Hydra": "\u{1F40D}",
    "Churn Wraith": "\u{1F4A8}",
    "Analysis Paralysis Sphinx": "\u{1F914}",
    "Burnout Phoenix": "\u{1F525}",
    "MVP Mimic": "\u{1F3AD}",
    "AI Hype Beast": "\u{1F4A5}",
    "Reorg Tornado": "\u{1F32A}\uFE0F",
    "Competitor Shadow": "\u{1F441}\uFE0F",
    "Sev-1 Incident": "\u{1F6A8}",
};

const TREASURE_EMOJI = {
    "OKR Framework": "\u{1F4CB}",
    "North Star Metric": "\u{2B50}",
    "User Interview Notes": "\u{1F4DD}",
    "Winning A/B Test": "\u{1F9EA}",
    "Product Sense": "\u{1F9E0}",
    "Series B Deck": "\u{1F4B5}",
    "Sprint Retro": "\u{1F504}",
    "Product-Market Fit": "\u{1F3C6}",
    "Competitive Moat": "\u{1F3F0}",
    "War Room Slack Channel": "\u{1F4AC}",
    "AI Copilot": "\u{1F916}",
    "Launch Blog Post": "\u{1F4F0}",
};

// === GAME STATE ===
const GameState = {
    cardData: null,
    screen: "title",
    selectedHeroes: [],
    playerDeck: [],
    playerHand: [],
    playedCards: [],
    discardPile: [],
    treasures: [],
    hp: 20,
    maxHp: 20,
    level: 1,
    floor: 1,
    score: 0,
    monstersDefeated: 0,
    currentMonster: null,
    shieldActive: false,
    bonusAttack: 0,
    bonusAllStats: 0,
    doubleNext: false,
    gameOver: false,
};

// === INITIALIZATION ===
async function init() {
    try {
        const resp = await fetch("data/cards.json");
        GameState.cardData = await resp.json();
    } catch (e) {
        console.error("Failed to load card data:", e);
        return;
    }

    // Bind UI events (using addTap for iOS compatibility)
    addTap(document.getElementById("btn-new-game"), showSelectScreen);
    addTap(document.getElementById("btn-how-to-play"), () => showScreen("howto"));
    addTap(document.getElementById("btn-back-title"), () => showScreen("title"));
    addTap(document.getElementById("btn-start-game"), startGame);
    addTap(document.getElementById("btn-fight"), fight);
    addTap(document.getElementById("btn-run"), runAway);
    addTap(document.getElementById("btn-use-ability"), useAbility);
    addTap(document.getElementById("btn-take-treasure"), takeTreasure);
    addTap(document.getElementById("btn-play-again"), () => showScreen("title"));
    addTap(document.getElementById("btn-retry"), () => showScreen("title"));

    // Drop zone for cards
    const playZone = document.getElementById("played-cards");
    playZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        playZone.classList.add("drag-over");
    });
    playZone.addEventListener("dragleave", () => {
        playZone.classList.remove("drag-over");
    });
    playZone.addEventListener("drop", (e) => {
        e.preventDefault();
        playZone.classList.remove("drag-over");
        const cardId = e.dataTransfer.getData("text/plain");
        playCardFromHand(cardId);
    });

    showScreen("title");
}

// === SCREEN MANAGEMENT ===
function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    GameState.screen = name;
}

// === HERO SELECTION ===
function showSelectScreen() {
    GameState.selectedHeroes = [];
    const grid = document.getElementById("hero-grid");
    grid.innerHTML = "";

    // Show 15 random heroes to pick from
    const heroes = shuffle([...GameState.cardData.heroes]).slice(0, 15);

    heroes.forEach((hero) => {
        const card = createHeroCardElement(hero, true);
        addTap(card, () => toggleHeroSelection(hero, card));
        grid.appendChild(card);
    });

    updateSelectCount();
    showScreen("select");
}

function toggleHeroSelection(hero, cardEl) {
    const idx = GameState.selectedHeroes.findIndex((h) => h.id === hero.id);
    if (idx >= 0) {
        GameState.selectedHeroes.splice(idx, 1);
        cardEl.classList.remove("selected");
    } else if (GameState.selectedHeroes.length < 3) {
        GameState.selectedHeroes.push(hero);
        cardEl.classList.add("selected");
    }
    updateSelectCount();
}

function updateSelectCount() {
    document.getElementById("select-count").textContent = `${GameState.selectedHeroes.length}/3 selected`;
    document.getElementById("btn-start-game").disabled = GameState.selectedHeroes.length !== 3;
}

// === GAME START ===
function startGame() {
    // Reset state
    GameState.hp = 20;
    GameState.maxHp = 20;
    GameState.level = 1;
    GameState.floor = 1;
    GameState.score = 0;
    GameState.monstersDefeated = 0;
    GameState.playedCards = [];
    GameState.discardPile = [];
    GameState.treasures = [];
    GameState.shieldActive = false;
    GameState.bonusAttack = 0;
    GameState.bonusAllStats = 0;
    GameState.doubleNext = false;
    GameState.gameOver = false;

    // Build deck: 3 selected + random extras
    const remaining = GameState.cardData.heroes.filter(
        (h) => !GameState.selectedHeroes.some((s) => s.id === h.id)
    );
    const extras = shuffle(remaining).slice(0, 12);
    GameState.playerDeck = shuffle([...extras]);
    GameState.playerHand = [...GameState.selectedHeroes, ...GameState.playerDeck.splice(0, 2)];

    // Clear messages
    document.getElementById("messages").innerHTML = "";

    showScreen("game");
    updateHUD();
    spawnMonster();
    renderHand();
    addMessage("Welcome to Roadmap Raiders! Defeat monsters to reach Level 10!", "info");
}

// === MONSTER SPAWNING ===
function spawnMonster() {
    // Pick a monster scaled to current level
    const monsters = [...GameState.cardData.monsters];
    // Filter to monsters near our level
    const scaled = monsters.filter((m) => m.level <= GameState.level + 2);
    const pool = scaled.length > 0 ? scaled : monsters;
    const monster = { ...pool[Math.floor(Math.random() * pool.length)] };

    // Scale monster stats with floor
    const scale = 1 + (GameState.floor - 1) * 0.15;
    monster.stats = {
        attack: Math.round(monster.stats.attack * scale),
        defense: Math.round(monster.stats.defense * scale),
        wisdom: Math.round(monster.stats.wisdom * scale),
    };

    GameState.currentMonster = monster;
    GameState.playedCards = [];
    GameState.bonusAttack = 0;
    GameState.bonusAllStats = 0;
    GameState.doubleNext = false;

    renderMonster();
    renderPlayZone();
    updatePowerComparison();
    updateButtons();

    addMessage(`A ${monster.name} appears on Floor ${GameState.floor}!`, "combat");
}

// === RENDERING ===
function createHeroCardElement(hero, forSelection = false) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-domain", hero.domain);
    card.setAttribute("data-id", hero.id);
    card.draggable = !forSelection;

    const emoji = DOMAIN_EMOJI[hero.domain] || "\u{1F464}";
    const abilityText = hero.ability ? hero.ability.name : "";
    const quote = hero.quotes && hero.quotes.length > 0 ? hero.quotes[0] : "";
    // Clean quote: remove timestamps and podcast plugs
    const cleanQuote = quote
        .replace(/Lenny \(\d{2}:\d{2}:\d{2}\):/g, "")
        .replace(/It's the best way to avoid missing.*/g, "")
        .trim()
        .slice(0, 80);

    card.innerHTML = `
        <div class="card-header">
            <span class="card-type-badge hero-badge">HERO</span>
            <span class="card-domain">${hero.domain}</span>
        </div>
        <div class="card-art">
            <span class="card-emoji">${emoji}</span>
        </div>
        <h3 class="card-name" title="${hero.name}">${hero.name}</h3>
        ${cleanQuote ? `<p class="card-quote">"${cleanQuote}"</p>` : ""}
        <div class="card-stats">
            <div class="stat"><span class="stat-icon">&#9876;</span><span>${hero.stats.attack}</span></div>
            <div class="stat"><span class="stat-icon">&#128737;</span><span>${hero.stats.defense}</span></div>
            <div class="stat"><span class="stat-icon">&#9733;</span><span>${hero.stats.wisdom}</span></div>
        </div>
        ${abilityText ? `<div class="card-ability">${abilityText}</div>` : ""}
    `;

    if (!forSelection) {
        card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", hero.id);
            card.classList.add("dragging");
        });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
        // Tap to play (works on both touch and mouse)
        addTap(card, () => playCardFromHand(hero.id));
    }

    return card;
}

function renderMonster() {
    const m = GameState.currentMonster;
    if (!m) return;

    const emoji = MONSTER_EMOJI[m.name] || "\u{1F47E}";
    document.getElementById("monster-emoji").textContent = emoji;
    document.getElementById("monster-name").textContent = m.name;
    document.getElementById("monster-desc").textContent = m.description;
    document.getElementById("monster-level").textContent = `Lv.${m.level}`;
    document.getElementById("monster-atk").textContent = m.stats.attack;
    document.getElementById("monster-def").textContent = m.stats.defense;
    document.getElementById("monster-wis").textContent = m.stats.wisdom;
    document.getElementById("monster-reward").textContent = `Reward: ${m.reward}`;
}

function renderHand() {
    const hand = document.getElementById("player-hand");
    hand.innerHTML = "";
    GameState.playerHand.forEach((hero) => {
        hand.appendChild(createHeroCardElement(hero));
    });
}

function renderPlayZone() {
    const zone = document.getElementById("played-cards");
    zone.innerHTML = "";

    if (GameState.playedCards.length === 0) {
        zone.innerHTML = '<div class="play-zone-hint">Tap cards in your hand to play them!</div>';
        return;
    }

    GameState.playedCards.forEach((hero) => {
        const card = createHeroCardElement(hero);
        card.draggable = false;
        card.style.cursor = "pointer";
        card.title = "Tap to return to hand";
        // Clear existing listeners by cloning
        const freshCard = card.cloneNode(true);
        addTap(freshCard, () => returnCardToHand(hero.id));
        zone.appendChild(freshCard);
    });
}

function renderPlayedCard(hero) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-domain", hero.domain);
    card.style.width = "120px";
    card.style.minWidth = "120px";
    card.style.cursor = "pointer";
    card.title = "Click to return to hand";

    const emoji = DOMAIN_EMOJI[hero.domain] || "\u{1F464}";
    card.innerHTML = `
        <div class="card-art" style="height:40px">
            <span class="card-emoji" style="font-size:1.5rem">${emoji}</span>
        </div>
        <h3 class="card-name" style="font-size:0.7rem">${hero.name}</h3>
        <div class="card-stats">
            <div class="stat"><span class="stat-icon">&#9876;</span><span>${hero.stats.attack}</span></div>
            <div class="stat"><span class="stat-icon">&#128737;</span><span>${hero.stats.defense}</span></div>
        </div>
    `;

    card.addEventListener("click", () => returnCardToHand(hero.id));
    return card;
}

// === CARD PLAY MECHANICS ===
function playCardFromHand(cardId) {
    if (GameState.gameOver) return;

    const idx = GameState.playerHand.findIndex((h) => h.id === cardId);
    if (idx < 0) return;

    const card = GameState.playerHand.splice(idx, 1)[0];

    // Apply double-next bonus
    if (GameState.doubleNext) {
        card._doubled = true;
        GameState.doubleNext = false;
        addMessage(`${card.name}'s power is DOUBLED!`, "reward");
    }

    GameState.playedCards.push(card);
    renderHand();
    renderPlayZone();
    updatePowerComparison();
    updateButtons();
}

function returnCardToHand(cardId) {
    const idx = GameState.playedCards.findIndex((h) => h.id === cardId);
    if (idx < 0) return;

    const card = GameState.playedCards.splice(idx, 1)[0];
    delete card._doubled;
    GameState.playerHand.push(card);
    renderHand();
    renderPlayZone();
    updatePowerComparison();
    updateButtons();
}

// === POWER CALCULATION ===
function getPlayerPower() {
    let total = 0;
    for (const card of GameState.playedCards) {
        let power = card.stats.attack + Math.floor(card.stats.wisdom / 2) + GameState.bonusAllStats;
        if (card._doubled) power *= 2;
        total += power;
    }
    total += GameState.bonusAttack;
    return total;
}

function getMonsterPower() {
    const m = GameState.currentMonster;
    if (!m) return 0;
    return m.stats.attack + m.stats.defense;
}

function updatePowerComparison() {
    const pp = getPlayerPower();
    const mp = getMonsterPower();
    document.getElementById("player-power").textContent = pp;
    document.getElementById("monster-power").textContent = mp;

    const ppEl = document.getElementById("player-power");
    ppEl.style.color = pp >= mp ? "var(--accent-green)" : "var(--accent-primary)";
}

// === COMBAT ===
function fight() {
    if (GameState.playedCards.length === 0 || GameState.gameOver) return;

    const playerPower = getPlayerPower();
    const monsterPower = getMonsterPower();
    const monster = GameState.currentMonster;

    if (playerPower >= monsterPower) {
        // Victory!
        const monsterCard = document.getElementById("monster-card");
        monsterCard.classList.add("flash-green");
        setTimeout(() => monsterCard.classList.remove("flash-green"), 500);

        GameState.monstersDefeated++;
        GameState.score += monster.level * 100;

        // Level up every 2 monsters (but cap consideration at level 10)
        if (GameState.monstersDefeated % 2 === 0 && GameState.level < 10) {
            GameState.level++;
            addMessage(`LEVEL UP! You're now Level ${GameState.level}!`, "reward");
        }

        addMessage(`Defeated ${monster.name}! (+${monster.level * 100} score)`, "reward");

        // Move played cards to discard
        GameState.discardPile.push(...GameState.playedCards);
        GameState.playedCards = [];

        // Draw new cards
        drawCards(1);

        // Check for victory
        if (GameState.level >= 10) {
            endGame(true);
            return;
        }

        // Award treasure
        awardTreasure();
    } else {
        // Defeat!
        const monsterCard = document.getElementById("monster-card");
        monsterCard.classList.add("shake");
        setTimeout(() => monsterCard.classList.remove("shake"), 500);

        const damage = Math.max(1, Math.ceil((monsterPower - playerPower) / 2));
        const actualDamage = GameState.shieldActive ? 0 : damage;

        if (GameState.shieldActive) {
            addMessage("Shield absorbed the damage!", "heal");
            GameState.shieldActive = false;
        } else {
            GameState.hp -= actualDamage;
            addMessage(`${monster.name} deals ${actualDamage} damage! (${GameState.hp} HP left)`, "combat");
        }

        // Return played cards to discard (they're exhausted)
        GameState.discardPile.push(...GameState.playedCards);
        GameState.playedCards = [];

        if (GameState.hp <= 0) {
            GameState.hp = 0;
            endGame(false, "Your HP reached 0!");
            return;
        }

        // Draw a card as consolation
        drawCards(1);

        // Same monster stays but move to next floor
        GameState.floor++;
        spawnMonster();
    }

    updateHUD();
    renderHand();
    renderPlayZone();
    updatePowerComparison();
    updateButtons();
}

function runAway() {
    if (GameState.gameOver) return;

    const damage = 2;
    GameState.hp -= damage;
    addMessage(`You ran away! Lost ${damage} HP.`, "combat");

    // Return played cards to hand
    GameState.playerHand.push(...GameState.playedCards);
    GameState.playedCards = [];

    if (GameState.hp <= 0) {
        GameState.hp = 0;
        endGame(false, "You ran out of HP while fleeing!");
        return;
    }

    GameState.floor++;
    spawnMonster();
    updateHUD();
    renderHand();
    renderPlayZone();
    updatePowerComparison();
    updateButtons();
}

function useAbility() {
    if (GameState.playedCards.length === 0 || GameState.gameOver) return;

    // Use the first played card's ability
    const card = GameState.playedCards[0];
    if (!card.ability) return;

    const effect = card.ability.effect;
    let used = false;

    switch (effect) {
        case "draw_2":
            drawCards(2);
            addMessage(`${card.name} uses Growth Hack! Drew 2 cards!`, "reward");
            used = true;
            break;
        case "swap_card":
            // Swap: discard weakest played card, draw a new one
            if (GameState.playedCards.length > 1) {
                const weakest = GameState.playedCards.reduce((a, b) =>
                    a.stats.attack < b.stats.attack ? a : b
                );
                const idx = GameState.playedCards.indexOf(weakest);
                GameState.discardPile.push(GameState.playedCards.splice(idx, 1)[0]);
                drawCards(1);
                addMessage(`${card.name} uses Pivot Master! Swapped weakest card!`, "info");
            }
            used = true;
            break;
        case "attack_boost_3":
            GameState.bonusAttack += 3;
            addMessage(`${card.name} uses Ship It! +3 Attack!`, "reward");
            used = true;
            break;
        case "peek":
            // Show monster's weakness
            const m = GameState.currentMonster;
            const weakStat = m.stats.attack < m.stats.defense ? "Attack" : "Defense";
            addMessage(`${card.name} uses Data Driven! Monster is weak in ${weakStat}!`, "info");
            GameState.bonusAttack += 2;
            used = true;
            break;
        case "heal_2":
            GameState.hp = Math.min(GameState.maxHp, GameState.hp + 2);
            addMessage(`${card.name} uses User Empathy! Healed 2 HP!`, "heal");
            used = true;
            break;
        case "double_next":
            GameState.doubleNext = true;
            addMessage(`${card.name} uses AI Amplify! Next card played will be doubled!`, "reward");
            used = true;
            break;
        case "shield":
            GameState.shieldActive = true;
            addMessage(`${card.name} uses Culture Shield! Next damage blocked!`, "info");
            used = true;
            break;
        case "power_boost_2":
            GameState.bonusAllStats += 2;
            addMessage(`${card.name} uses Revenue Engine! +2 to all cards!`, "reward");
            used = true;
            break;
    }

    if (used) {
        // Disable ability button after use
        document.getElementById("btn-use-ability").disabled = true;
        updatePowerComparison();
        updateHUD();
        renderHand();
        renderPlayZone();
    }
}

// === TREASURES ===
function awardTreasure() {
    const treasures = GameState.cardData.treasures;
    const treasure = treasures[Math.floor(Math.random() * treasures.length)];

    GameState._pendingTreasure = treasure;

    const display = document.getElementById("treasure-card-display");
    const emoji = TREASURE_EMOJI[treasure.name] || "\u{1F381}";
    display.innerHTML = `
        <div class="card" data-domain="${treasure.domain}" style="width:200px; margin:0 auto; border-color: var(--accent-gold);">
            <div class="card-header">
                <span class="card-type-badge treasure-badge">TREASURE</span>
                <span class="card-domain">${treasure.domain}</span>
            </div>
            <div class="card-art">
                <span class="card-emoji">${emoji}</span>
            </div>
            <h3 class="card-name">${treasure.name}</h3>
            <p class="card-desc">${treasure.description}</p>
            <div class="card-reward">${treasure.effect}</div>
        </div>
    `;

    document.getElementById("modal-treasure").classList.add("active");
}

function takeTreasure() {
    const treasure = GameState._pendingTreasure;
    if (!treasure) return;

    // Apply treasure effect
    applyTreasureEffect(treasure);
    GameState.treasures.push(treasure);

    document.getElementById("modal-treasure").classList.remove("active");
    GameState._pendingTreasure = null;

    // Next floor
    GameState.floor++;
    spawnMonster();
    updateHUD();
    renderHand();
    updatePowerComparison();
    updateButtons();
}

function applyTreasureEffect(treasure) {
    const effect = treasure.effect;

    if (effect.includes("all stats for 1 turn")) {
        const match = effect.match(/\+(\d+)/);
        if (match) GameState.bonusAllStats += parseInt(match[1]);
        addMessage(`${treasure.name}: ${effect}`, "reward");
    } else if (effect.includes("Wisdom permanently")) {
        // Boost a random hand card's wisdom
        if (GameState.playerHand.length > 0) {
            const card = GameState.playerHand[Math.floor(Math.random() * GameState.playerHand.length)];
            card.stats.wisdom += 4;
            addMessage(`${card.name} gained +4 Wisdom from ${treasure.name}!`, "reward");
        }
    } else if (effect.includes("Defense permanently")) {
        if (GameState.playerHand.length > 0) {
            const card = GameState.playerHand[Math.floor(Math.random() * GameState.playerHand.length)];
            card.stats.defense += parseInt(effect.match(/\+(\d+)/)?.[1] || 2);
            addMessage(`${card.name} gained Defense from ${treasure.name}!`, "reward");
        }
    } else if (effect.includes("Heal")) {
        const amount = parseInt(effect.match(/(\d+)/)?.[1] || 2);
        GameState.hp = Math.min(GameState.maxHp, GameState.hp + amount);
        addMessage(`Healed ${amount} HP from ${treasure.name}!`, "heal");
    } else if (effect.includes("Attack for")) {
        const amount = parseInt(effect.match(/\+(\d+)/)?.[1] || 2);
        GameState.bonusAttack += amount;
        addMessage(`${treasure.name}: +${amount} Attack!`, "reward");
    } else if (effect.includes("Draw")) {
        const amount = parseInt(effect.match(/(\d+)/)?.[1] || 1);
        drawCards(amount);
        addMessage(`Drew ${amount} cards from ${treasure.name}!`, "reward");
    } else if (effect.includes("Play 2 cards")) {
        addMessage(`${treasure.name}: Play 2 cards this turn!`, "reward");
    } else if (effect.includes("discard pile")) {
        // Return a random card from discard
        if (GameState.discardPile.length > 0) {
            const idx = Math.floor(Math.random() * GameState.discardPile.length);
            const card = GameState.discardPile.splice(idx, 1)[0];
            GameState.playerHand.push(card);
            addMessage(`${treasure.name}: Retrieved ${card.name} from discard!`, "reward");
        }
    } else {
        addMessage(`Got ${treasure.name}!`, "reward");
    }

    updateHUD();
    renderHand();
}

// === DECK MANAGEMENT ===
function drawCards(count) {
    for (let i = 0; i < count; i++) {
        if (GameState.playerDeck.length === 0) {
            // Reshuffle discard into deck
            if (GameState.discardPile.length === 0) {
                addMessage("No more cards to draw!", "info");
                return;
            }
            GameState.playerDeck = shuffle([...GameState.discardPile]);
            GameState.discardPile = [];
            addMessage("Deck reshuffled from discard pile.", "info");
        }
        GameState.playerHand.push(GameState.playerDeck.pop());
    }
    renderHand();
    updateHUD();
}

// === HUD ===
function updateHUD() {
    document.getElementById("hud-level").textContent = GameState.level;
    document.getElementById("hud-floor").textContent = `Floor ${GameState.floor}`;
    document.getElementById("hud-deck").textContent = GameState.playerDeck.length;
    document.getElementById("hud-score").textContent = GameState.score;

    // HP bar
    const pct = Math.max(0, (GameState.hp / GameState.maxHp) * 100);
    document.getElementById("hp-fill").style.width = `${pct}%`;
    document.getElementById("hp-text").textContent = `${GameState.hp}/${GameState.maxHp}`;

    // HP bar color
    const fill = document.getElementById("hp-fill");
    if (pct > 50) {
        fill.style.background = "linear-gradient(90deg, #2ecc71, #27ae60)";
    } else if (pct > 25) {
        fill.style.background = "linear-gradient(90deg, #f39c12, #e67e22)";
    } else {
        fill.style.background = "linear-gradient(90deg, #e94560, #c0392b)";
    }
}

function updateButtons() {
    document.getElementById("btn-fight").disabled = GameState.playedCards.length === 0;
    const hasAbility = GameState.playedCards.length > 0 && GameState.playedCards[0].ability;
    document.getElementById("btn-use-ability").disabled = !hasAbility;

    if (hasAbility) {
        document.getElementById("btn-use-ability").textContent = `Use: ${GameState.playedCards[0].ability.name}`;
    } else {
        document.getElementById("btn-use-ability").textContent = "Use Ability";
    }
}

// === MESSAGES ===
function addMessage(text, type = "info") {
    const container = document.getElementById("messages");
    const msg = document.createElement("div");
    msg.className = `msg msg-${type}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    // Auto-remove after 8 seconds
    setTimeout(() => {
        msg.style.opacity = "0";
        msg.style.transition = "opacity 0.5s";
        setTimeout(() => msg.remove(), 500);
    }, 8000);
}

// === END GAME ===
function endGame(won, reason = "") {
    GameState.gameOver = true;

    if (won) {
        const stats = document.getElementById("victory-stats");
        stats.innerHTML = `
            <div class="end-stat"><span class="end-stat-value">${GameState.score}</span><span class="end-stat-label">Score</span></div>
            <div class="end-stat"><span class="end-stat-value">${GameState.monstersDefeated}</span><span class="end-stat-label">Monsters</span></div>
            <div class="end-stat"><span class="end-stat-value">${GameState.floor}</span><span class="end-stat-label">Floors</span></div>
            <div class="end-stat"><span class="end-stat-value">${GameState.hp}/${GameState.maxHp}</span><span class="end-stat-label">HP Left</span></div>
        `;

        // Random victory quote from heroes
        const allQuotes = GameState.cardData.heroes
            .flatMap((h) => (h.quotes || []).map((q) => ({ quote: q, guest: h.name })))
            .filter((q) => q.quote.length > 20 && q.quote.length < 150 && !q.quote.includes("Lenny ("));
        if (allQuotes.length > 0) {
            const pick = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            document.getElementById("victory-quote").innerHTML = `"${pick.quote}" <br><small>- ${pick.guest}, Lenny's Podcast</small>`;
        }

        showScreen("victory");
    } else {
        document.getElementById("gameover-reason").textContent = reason;

        const stats = document.getElementById("gameover-stats");
        stats.innerHTML = `
            <div class="end-stat"><span class="end-stat-value">${GameState.level}</span><span class="end-stat-label">Level</span></div>
            <div class="end-stat"><span class="end-stat-value">${GameState.score}</span><span class="end-stat-label">Score</span></div>
            <div class="end-stat"><span class="end-stat-value">${GameState.monstersDefeated}</span><span class="end-stat-label">Monsters</span></div>
            <div class="end-stat"><span class="end-stat-value">${GameState.floor}</span><span class="end-stat-label">Floors</span></div>
        `;

        const allQuotes = GameState.cardData.heroes
            .flatMap((h) => (h.quotes || []).map((q) => ({ quote: q, guest: h.name })))
            .filter((q) => q.quote.length > 20 && q.quote.length < 150 && !q.quote.includes("Lenny ("));
        if (allQuotes.length > 0) {
            const pick = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            document.getElementById("gameover-quote").innerHTML = `"${pick.quote}" <br><small>- ${pick.guest}, Lenny's Podcast</small>`;
        }

        showScreen("gameover");
    }
}

// === UTILITIES ===
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// === TOUCH HELPERS ===
function addTap(el, handler) {
    // Works on both touch and mouse
    el.addEventListener("click", handler);
    // iOS sometimes needs explicit touchend
    let touchMoved = false;
    el.addEventListener("touchstart", () => { touchMoved = false; }, { passive: true });
    el.addEventListener("touchmove", () => { touchMoved = true; }, { passive: true });
    el.addEventListener("touchend", (e) => {
        if (!touchMoved) {
            e.preventDefault();
            handler(e);
        }
    });
}

// === BOOT ===
document.addEventListener("DOMContentLoaded", init);
