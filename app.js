(function () {
  "use strict";

  var SETS = {
    rlfl: {
      key: "rlfl",
      label: "RLFL — RipLab Football League",
      teams: RLFL_TEAMS,
      roster: RLFL_ROSTER
    }
  };
  var activeSet = SETS.rlfl;
  var TEAMS = activeSet.teams;

  // Color-parallel hits: the card's whole background renders as this metallic gradient.
  // Same palette backs both the plain color tiers and their autograph counterparts.
  var REFRACTOR_COLORS = {
    "Refractor":        "linear-gradient(135deg, #3a3a3a 0%, #c7c7c7 28%, #ffffff 50%, #c7c7c7 72%, #3a3a3a 100%)",
    "Rookie Refractor": "linear-gradient(135deg, #3a3320 0%, #c9b077 28%, #fff6d8 50%, #c9b077 72%, #3a3320 100%)",
    "Green Refractor":  "linear-gradient(135deg, #072a15 0%, #2f8a4f 28%, #c3f7d3 50%, #2f8a4f 72%, #072a15 100%)",
    "Blue Refractor":   "linear-gradient(135deg, #06203d 0%, #2f6fb3 28%, #bfe4ff 50%, #2f6fb3 72%, #06203d 100%)",
    "Orange Refractor": "linear-gradient(135deg, #3a2008 0%, #d97a1f 28%, #ffe3bf 50%, #d97a1f 72%, #3a2008 100%)",
    "Gold Refractor":   "linear-gradient(135deg, #4a3510 0%, #d4af37 28%, #fff6cf 50%, #d4af37 72%, #4a3510 100%)",
    "Red Refractor":    "linear-gradient(135deg, #3a0808 0%, #b3302f 28%, #ffcfc7 50%, #b3302f 72%, #3a0808 100%)",
    "Black Refractor":  "linear-gradient(135deg, #050505 0%, #3a3a3a 28%, #8a8a8a 50%, #3a3a3a 72%, #050505 100%)",
    "Superfractor 1/1": "linear-gradient(120deg, #ff2d6e, #ff9900, #f5e642, #33e07a, #29c5ff, #9b5cff, #ff2d6e)",
    "Case Hit":         "linear-gradient(135deg, #050505 0%, #3a1a52 30%, #8a3fd6 50%, #3a1a52 70%, #050505 100%)"
  };
  // How much each tier multiplies a hit card's baseline (legendary-range) value.
  var PARALLEL_VALUE_MULT = {
    "Refractor": 1.3, "Rookie Refractor": 1.8, "Green Refractor": 2.5, "Blue Refractor": 3.5,
    "Orange Refractor": 5, "Gold Refractor": 8, "Red Refractor": 14, "Black Refractor": 24,
    "Superfractor 1/1": 60, "Case Hit": 18
  };
  var AUTOGRAPH_VALUE_MULT = 2.2;
  // Autograph tag name -> the base color tier it borrows its background/value from ("Base Autograph" has none).
  var AUTOGRAPH_TAG_TO_COLOR_KEY = {
    "Green Refractor Autograph": "Green Refractor", "Blue Refractor Autograph": "Blue Refractor",
    "Orange Refractor Autograph": "Orange Refractor", "Gold Refractor Autograph": "Gold Refractor",
    "Red Refractor Autograph": "Red Refractor", "Black Refractor Autograph": "Black Refractor",
    "Superfractor Autograph 1/1": "Superfractor 1/1"
  };
  function tierValueKey(tag) {
    if (!tag) return null;
    if (PARALLEL_VALUE_MULT.hasOwnProperty(tag)) return tag;
    if (AUTOGRAPH_TAG_TO_COLOR_KEY.hasOwnProperty(tag)) return AUTOGRAPH_TAG_TO_COLOR_KEY[tag];
    return null;
  }

  var RARITY_META = {
    common:    { label: "Common",    value: [1, 5] },
    uncommon:  { label: "Uncommon",  value: [5, 15] },
    rare:      { label: "Rare",      value: [15, 45] },
    epic:      { label: "Epic",      value: [45, 120] },
    legendary: { label: "Legendary", value: [120, 400] }
  };
  var RARITY_ORDER = ["common","uncommon","rare","epic","legendary"];

  var PRODUCT_NAME = "RLFL Debut Chrome";

  // Rarest-first parallel ladder. Each `p` is the CUMULATIVE chance a pack's hit slot
  // lands on this tier or something rarer — e.g. Hobby's Green (.125) already includes
  // its share of Blue/Orange/.../Superfractor packs, so the tiers nest cleanly.
  function buildLadder(o) {
    return [
      { name: "Superfractor 1/1",  p: 1 / o.superfractor },
      { name: "Black Refractor",   p: 1 / o.black },
      { name: "Red Refractor",     p: 1 / o.red },
      { name: "Gold Refractor",    p: 1 / o.gold },
      { name: "Orange Refractor",  p: 1 / o.orange },
      { name: "Blue Refractor",    p: 1 / o.blue },
      { name: "Green Refractor",   p: 1 / o.green },
      { name: "Rookie Refractor",  p: 1 / o.rookieRefractor },
      { name: "Refractor",         p: 1 / o.refractor }
    ];
  }
  // Color-only subset (no Refractor/Rookie Refractor) rescaled so its "any color" total
  // matches the format's given "color refractor autograph" pack odds.
  function autoColorLadder(baseLadder, colorAutoP) {
    var colors = baseLadder.filter(function (t) { return t.name !== "Refractor" && t.name !== "Rookie Refractor"; });
    var topP = colors[colors.length - 1].p; // "Green Refractor" — least rare of the color-only tiers
    var scale = topP > 0 ? colorAutoP / topP : 0;
    return colors.map(function (t) { return { name: t.name, p: t.p * scale }; });
  }
  function rollLadder(ladder) {
    var r = Math.random();
    for (var i = 0; i < ladder.length; i++) if (r < ladder[i].p) return ladder[i].name;
    return null;
  }

  var FORMATS = [
    {
      id: "retail", tier: "RETAIL", name: "Retail",
      boxPrice: 40, casePrice: 800, boxesPerCase: 20,
      packsPerBox: 8, cardsPerPack: 6, cardsPerBox: 48,
      blurb: "The cheapest way in. Mostly base cards, but every chase card — up to a 1/1 — is still in the pool.",
      odds: { common: .60, uncommon: .26, rare: .10, epic: .03, legendary: .01 },
      valueScale: 1, guaranteedAutographs: 0,
      caseHitP: 1 / 150, baseAutoP: 1 / 100, colorAutoP: 1 / 400,
      packOdds: { refractor: 3, rookieRefractor: 8, green: 16, blue: 35, orange: 70, gold: 140, red: 350, black: 700, superfractor: 3500 }
    },
    {
      id: "hobby", tier: "HOBBY", name: "Hobby",
      boxPrice: 250, casePrice: 3000, boxesPerCase: 12,
      packsPerBox: 12, cardsPerPack: 6, cardsPerBox: 72,
      blurb: "The main premium format — noticeably better refractor and autograph odds, one autograph guaranteed.",
      odds: { common: .46, uncommon: .28, rare: .16, epic: .07, legendary: .03 },
      valueScale: 2.5, guaranteedAutographs: 1,
      caseHitP: 1 / 96, baseAutoP: 1 / 60, colorAutoP: 1 / 70,
      packOdds: { refractor: 2, rookieRefractor: 5, green: 8, blue: 18, orange: 35, gold: 70, red: 175, black: 350, superfractor: 1750 }
    },
    {
      id: "jumbo", tier: "JUMBO", name: "Jumbo Hobby",
      boxPrice: 600, casePrice: 4800, boxesPerCase: 8,
      packsPerBox: 16, cardsPerPack: 8, cardsPerBox: 128,
      blurb: "The most loaded format on the shelf — a refractor in every pack and two autographs guaranteed.",
      odds: { common: .30, uncommon: .27, rare: .21, epic: .14, legendary: .08 },
      valueScale: 5, guaranteedAutographs: 2,
      caseHitP: 1 / 60, baseAutoP: 1 / 40, colorAutoP: 1 / 35,
      packOdds: { refractor: 1, rookieRefractor: 3, green: 5, blue: 10, orange: 20, gold: 40, red: 100, black: 200, superfractor: 1000 }
    }
  ];
  FORMATS.forEach(function (f) {
    f.parallelLadder = buildLadder(f.packOdds);
    f.autoColorLadder = autoColorLadder(f.parallelLadder, f.colorAutoP);
  });

  // Skill-position hierarchy: QBs command the most, linemen the least.
  var POSITION_VALUE_MULT = { QB: 2.0, WR: 1.6, RB: 1.3, TE: 1.1, DEF: 0.9, OL: 0.6 };

  var STORAGE_KEY = "break-room-save-v1";
  var state = loadState();
  var pendingBreak = null; // format being configured in the buy-in modal

  function loadState() {
    var def = { cash: 5000, collection: [], stats: { breaksOpened: 0, totalSpent: 0 }, activeBreak: null };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return def;
      var parsed = JSON.parse(raw);
      if (typeof parsed.cash !== "number") return def;
      if (parsed.activeBreak && !findFormat(parsed.activeBreak.formatId)) parsed.activeBreak = null;
      return parsed;
    } catch (e) { return def; }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function money(n) {
    var neg = n < 0;
    return (neg ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString();
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  function pickRarity(odds) {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < RARITY_ORDER.length; i++) {
      var key = RARITY_ORDER[i];
      acc += odds[key] || 0;
      if (r <= acc) return key;
    }
    return "common";
  }

  // Plain base card: any card that isn't its pack's designated hit-slot card.
  function makeCard(rarity, format) {
    var range = RARITY_META[rarity].value;
    var team = pick(TEAMS);
    var player = pick(activeSet.roster[team]);
    var posMult = POSITION_VALUE_MULT[player.pos] || 1;
    var scale = format.valueScale * posMult;
    var lo = Math.max(1, Math.round(range[0] * scale));
    var hi = Math.max(lo, Math.round(range[1] * scale));
    return {
      id: uid(), team: team, rarity: rarity, player: player.name, pos: player.pos,
      isRookie: !!player.rookie, tag: null, value: rand(lo, hi)
    };
  }

  function pickHitPlayer(team, requiresRookie) {
    var pool = activeSet.roster[team];
    if (requiresRookie) {
      var rookies = pool.filter(function (p) { return p.rookie; });
      if (rookies.length) pool = rookies;
    }
    return pick(pool);
  }

  // A pack's hit-slot card: refractor / autograph / case hit. Always shown as "legendary"
  // rarity — its real value comes from the parallel + autograph multipliers, not the
  // common/uncommon/rare/epic/legendary roll that drives ordinary base cards.
  function makeHitCard(format, tag, isAutograph, requiresRookie) {
    var team = pick(TEAMS);
    var player = pickHitPlayer(team, requiresRookie);
    var posMult = POSITION_VALUE_MULT[player.pos] || 1;
    var colorMult = PARALLEL_VALUE_MULT[tierValueKey(tag)] || 1;
    var mult = format.valueScale * posMult * colorMult * (isAutograph ? AUTOGRAPH_VALUE_MULT : 1);
    var base = RARITY_META.legendary.value;
    var lo = Math.max(1, Math.round(base[0] * mult));
    var hi = Math.max(lo, Math.round(base[1] * mult));
    return {
      id: uid(), team: team, rarity: "legendary", player: player.name, pos: player.pos,
      isRookie: !!player.rookie, tag: tag, value: rand(lo, hi)
    };
  }

  // Decides what (if anything) occupies a single pack's one hit slot.
  function rollPackHit(format) {
    if (Math.random() < format.caseHitP) {
      return { tag: "Case Hit", isAutograph: false, requiresRookie: false };
    }
    var totalAutoP = format.baseAutoP + format.colorAutoP;
    if (Math.random() < totalAutoP) {
      if (Math.random() < format.colorAutoP / totalAutoP) {
        var color = rollLadder(format.autoColorLadder) || "Green Refractor";
        var tag = color === "Superfractor 1/1" ? "Superfractor Autograph 1/1" : color + " Autograph";
        return { tag: tag, isAutograph: true, requiresRookie: false };
      }
      return { tag: "Base Autograph", isAutograph: true, requiresRookie: false };
    }
    var tier = rollLadder(format.parallelLadder);
    if (!tier) return { tag: null, isAutograph: false, requiresRookie: false };
    return { tag: tier, isAutograph: false, requiresRookie: tier === "Rookie Refractor" };
  }

  function generatePackCards(format) {
    var hit = rollPackHit(format);
    var hitIndex = format.cardsPerPack - 1;
    var cards = [];
    for (var i = 0; i < format.cardsPerPack; i++) {
      if (i === hitIndex && hit.tag) {
        cards.push(makeHitCard(format, hit.tag, hit.isAutograph, hit.requiresRookie));
      } else {
        cards.push(makeCard(pickRarity(format.odds), format));
      }
    }
    return { cards: cards, hasAutograph: hit.isAutograph, hitIndex: hitIndex };
  }

  // Forces a pack's hit slot into an autograph to satisfy a box's guarantee — usually a
  // Base Autograph, with a small chance of upgrading to a color refractor autograph.
  function upgradePackToAutograph(pack, format) {
    var tag = "Base Autograph";
    if (Math.random() < 0.12) {
      var color = rollLadder(format.autoColorLadder) || "Green Refractor";
      tag = color === "Superfractor 1/1" ? "Superfractor Autograph 1/1" : color + " Autograph";
    }
    pack.cards[pack.hitIndex] = makeHitCard(format, tag, true, false);
    pack.hasAutograph = true;
  }

  function generateBoxCards(format) {
    var packs = [];
    var autoCount = 0;
    for (var p = 0; p < format.packsPerBox; p++) {
      var pk = generatePackCards(format);
      packs.push(pk);
      if (pk.hasAutograph) autoCount++;
    }
    while (autoCount < format.guaranteedAutographs) {
      var candidates = [];
      for (var i = 0; i < packs.length; i++) if (!packs[i].hasAutograph) candidates.push(packs[i]);
      upgradePackToAutograph(candidates.length ? pick(candidates) : pick(packs), format);
      autoCount++;
    }
    var cards = [];
    for (var k = 0; k < packs.length; k++) cards = cards.concat(packs[k].cards);
    return cards;
  }

  function generateCards(format, boxCount) {
    var all = [];
    for (var i = 0; i < boxCount; i++) all = all.concat(generateBoxCards(format));
    return all;
  }

  function findFormat(id) {
    for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i].id === id) return FORMATS[i];
    return null;
  }

  function teamPriceFor(format) { return Math.round(format.casePrice / TEAMS.length); }

  // ---------- reveal animation helpers ----------
  var REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RARITY_TIMING = {
    common:    { shake: 220, hold: 550 },
    uncommon:  { shake: 240, hold: 650 },
    rare:      { shake: 280, hold: 850 },
    epic:      { shake: 340, hold: 1250 },
    legendary: { shake: 380, hold: 1600 }
  };
  var CALLOUTS = {
    common: ["Common — {player}, {team}.", "{player} of the {team}. Next up."],
    uncommon: ["Uncommon — {player}, {team}. Not bad.", "{player}, {team}. Solid uncommon."],
    rare: ["Ooh, a RARE! {player}, {team}.", "Rare pull: {player}, {team}!"],
    epic: ["EPIC HIT! {tag} — {player}, {team}!!", "That's an EPIC — {player}, {tag}!"],
    legendary: ["LEGENDARY!! {tag} — {player}, {team}!! Let's GOOO!", "No way — LEGENDARY hit, {player}, {tag}!!"]
  };
  function fmt(tpl, card) {
    return tpl.replace(/{player}/g, card.player).replace(/{team}/g, card.team).replace(/{tag}/g, card.tag || "hit");
  }
  function calloutHTML(card, isMine, wholeBox, mega) {
    var main = mega
      ? "💰 HUGE HIT!! " + card.player + " just went for " + money(card.value) + "!!"
      : fmt(pick(CALLOUTS[card.rarity]), card);
    var sub = wholeBox
      ? "Personal break — every card is yours."
      : (isMine ? "Matches your team — keeping it." : "Not your team — ships to another spot.");
    return '<div class="callout-main">' + main + '</div><div class="callout-sub">' + sub + '</div>';
  }
  var pendingTimers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); pendingTimers.push(id); return id; }
  function spawnConfetti(container, count, rarity, mega) {
    if (REDUCE_MOTION || !container) return;
    var colors = mega
      ? ["#ffd54a", "#fff6cf", "var(--accent)", "#ffffff"]
      : [rarityColorVar(rarity), "var(--accent)", "var(--accent-2)"];
    for (var i = 0; i < count; i++) {
      var el = document.createElement("span");
      el.className = "confetti-piece";
      el.style.left = rand(10, 90) + "%";
      el.style.background = colors[i % colors.length];
      el.style.setProperty("--dx", rand(-90, 90) + "px");
      el.style.setProperty("--rot", rand(-200, 200) + "deg");
      el.style.setProperty("--dur", (rand(700, 1100) / 1000) + "s");
      el.style.animationDelay = rand(0, 120) + "ms";
      container.appendChild(el);
      later((function (node) { return function () { if (node.parentNode) node.parentNode.removeChild(node); }; })(el), 1300);
    }
  }
  function triggerFlash(stageEl, mega) {
    if (REDUCE_MOTION || !stageEl) return;
    var flash = stageEl.querySelector(".stage-flash");
    if (!flash) return;
    flash.classList.remove("active", "mega");
    void flash.offsetWidth;
    if (mega) flash.classList.add("mega");
    flash.classList.add("active");
  }
  var AVATAR_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="20" y="58" width="60" height="34" rx="14" fill="var(--accent-2)"/>' +
      '<circle cx="50" cy="38" r="24" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>' +
      '<path d="M26 30 A24 24 0 0 1 74 30" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="40" cy="40" r="3.4" fill="var(--text)"/>' +
      '<circle cx="60" cy="40" r="3.4" fill="var(--text)"/>' +
      '<path d="M39 50 Q50 57 61 50" fill="none" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="74" cy="34" r="4" fill="var(--accent)"/>' +
    '</svg>';

  // ---------- team crests + position silhouettes ----------
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function teamCrestColor(team) { return "hsl(" + (hashStr(team) % 360) + " 55% 42%)"; }
  function teamInitials(team) {
    var words = team.split(" ");
    if (words.length < 2) return team.slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  function teamCrestHTML(team) {
    return '<span class="team-crest" style="background:' + teamCrestColor(team) + '">' + teamInitials(team) + '</span>';
  }

  var POSITION_SILHOUETTE = {
    QB:
      '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="14" r="9" fill="currentColor"/>' +
        '<rect x="20" y="24" width="20" height="28" rx="9" fill="currentColor"/>' +
        '<rect x="12" y="27" width="8" height="21" rx="4" fill="currentColor"/>' +
        '<rect x="37" y="4" width="8" height="26" rx="4" fill="currentColor"/>' +
        '<circle cx="41" cy="3" r="5" fill="currentColor"/>' +
        '<rect x="21" y="52" width="7" height="26" rx="3.5" fill="currentColor"/>' +
        '<rect x="32" y="52" width="7" height="26" rx="3.5" fill="currentColor"/>' +
      '</svg>',
    WR:
      '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="14" r="9" fill="currentColor"/>' +
        '<rect x="20" y="24" width="20" height="28" rx="9" fill="currentColor"/>' +
        '<rect x="10" y="2" width="8" height="28" rx="4" fill="currentColor"/>' +
        '<rect x="42" y="2" width="8" height="28" rx="4" fill="currentColor"/>' +
        '<rect x="21" y="52" width="7" height="26" rx="3.5" fill="currentColor"/>' +
        '<rect x="32" y="52" width="7" height="26" rx="3.5" fill="currentColor"/>' +
      '</svg>',
    RB:
      '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="16" r="9" fill="currentColor"/>' +
        '<rect x="19" y="26" width="22" height="26" rx="10" fill="currentColor" transform="rotate(-8 30 39)"/>' +
        '<rect x="10" y="30" width="8" height="18" rx="4" fill="currentColor"/>' +
        '<rect x="39" y="32" width="8" height="16" rx="4" fill="currentColor"/>' +
        '<ellipse cx="44" cy="42" rx="7" ry="9" fill="currentColor"/>' +
        '<rect x="16" y="50" width="8" height="28" rx="4" fill="currentColor"/>' +
        '<rect x="33" y="46" width="8" height="22" rx="4" fill="currentColor" transform="rotate(18 37 57)"/>' +
      '</svg>',
    TE:
      '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="14" r="9" fill="currentColor"/>' +
        '<rect x="20" y="24" width="20" height="28" rx="9" fill="currentColor"/>' +
        '<rect x="4" y="26" width="16" height="8" rx="4" fill="currentColor"/>' +
        '<rect x="40" y="26" width="16" height="8" rx="4" fill="currentColor"/>' +
        '<rect x="21" y="52" width="7" height="26" rx="3.5" fill="currentColor"/>' +
        '<rect x="32" y="52" width="7" height="26" rx="3.5" fill="currentColor"/>' +
      '</svg>',
    OL:
      '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="14" r="9" fill="currentColor"/>' +
        '<rect x="16" y="22" width="28" height="32" rx="10" fill="currentColor"/>' +
        '<rect x="6" y="32" width="13" height="9" rx="4.5" fill="currentColor"/>' +
        '<rect x="41" y="32" width="13" height="9" rx="4.5" fill="currentColor"/>' +
        '<rect x="14" y="54" width="9" height="24" rx="4" fill="currentColor"/>' +
        '<rect x="37" y="54" width="9" height="24" rx="4" fill="currentColor"/>' +
      '</svg>',
    DEF:
      '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="20" r="9" fill="currentColor"/>' +
        '<rect x="20" y="30" width="20" height="24" rx="9" fill="currentColor"/>' +
        '<rect x="8" y="34" width="14" height="9" rx="4.5" fill="currentColor"/>' +
        '<rect x="38" y="34" width="14" height="9" rx="4.5" fill="currentColor"/>' +
        '<rect x="19" y="52" width="9" height="22" rx="4" fill="currentColor"/>' +
        '<rect x="32" y="52" width="9" height="22" rx="4" fill="currentColor"/>' +
      '</svg>'
  };
  function positionSilhouette(pos) { return POSITION_SILHOUETTE[pos] || POSITION_SILHOUETTE.DEF; }

  // ---------- rendering ----------

  function collectionValue() {
    return state.collection.reduce(function (s, c) { return s + c.value; }, 0);
  }

  function renderHeader() {
    document.getElementById("cashDisplay").textContent = money(state.cash);
    document.getElementById("statsLine").textContent =
      state.stats.breaksOpened + " break" + (state.stats.breaksOpened === 1 ? "" : "s") + " opened · " +
      money(state.stats.totalSpent) + " spent · " + money(collectionValue()) + " in collection";
  }

  function oddsChips(odds) {
    return RARITY_ORDER.map(function (key) {
      var pct = Math.round(odds[key] * 100);
      return '<span class="odds-chip">' + RARITY_META[key].label + " " + pct + "%</span>";
    }).join("");
  }

  function cheapestBreakPrice() {
    return FORMATS.reduce(function (min, f) { return Math.min(min, teamPriceFor(f)); }, Infinity);
  }

  function renderShop() {
    var grid = document.getElementById("breakGrid");
    var notice = document.getElementById("shopNotice");
    var badge = document.getElementById("setBadge");
    if (badge) badge.textContent = activeSet.label;
    var locked = !!state.activeBreak;

    if (!locked && state.cash < cheapestBreakPrice()) {
      notice.innerHTML =
        '<div class="cash-warning">' +
          '<span>You can\'t afford any break right now. Sell cards from your Collection, or take a bailout to keep playing.</span>' +
          '<button class="btn btn-primary" id="bailoutBtn">Take $50 Bailout</button>' +
        '</div>';
    } else {
      notice.innerHTML = "";
    }

    grid.innerHTML = FORMATS.map(function (f) {
      var btn = locked
        ? '<button class="btn btn-block" data-goto-live="1">Break In Progress →</button>'
        : '<button class="btn btn-primary btn-block" data-buy="' + f.id + '">Buy In — from ' + money(teamPriceFor(f)) + '</button>';
      return (
        '<div class="break-card">' +
          '<div class="break-card__band"><span class="tier">' + f.tier + '</span><span class="price">' + money(f.boxPrice) + '/box</span></div>' +
          '<div class="break-card__body">' +
            '<h3>' + f.name + '</h3>' +
            '<p>' + f.blurb + '</p>' +
            '<p class="section-sub">' + f.packsPerBox + ' packs/box (' + f.cardsPerPack + ' cards each = ' + f.cardsPerBox + ') · ' +
              f.boxesPerCase + ' boxes/case (' + money(f.casePrice) + ') · ' + TEAMS.length + '-team checklist' +
              (f.guaranteedAutographs ? ' · guaranteed ' + f.guaranteedAutographs + ' autograph' + (f.guaranteedAutographs > 1 ? 's' : '') + '/box' : '') + '</p>' +
            '<div class="odds-row">' + oddsChips(f.odds) + '</div>' +
            '<div class="break-card__foot">' + btn + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function rarityColorVar(rarity) { return "var(--rarity-" + rarity + ")"; }

  function cardFaceClasses(card, isMine, size) {
    return "card-face" + (size ? " card-face--" + size : "") + (isMine ? " mine" : "") +
      (card.rarity === "legendary" ? " legendary" : "") + (REFRACTOR_COLORS[card.tag] ? " refractor" : "");
  }

  function cardInnerHTML(card, isMine) {
    return (
      '<div class="card-face__topbar">' +
        '<span class="rlfl-crest">RLFL</span>' +
        '<span class="rarity-tag" style="background:' + rarityColorVar(card.rarity) + '">' + RARITY_META[card.rarity].label + '</span>' +
        (card.isRookie ? '<span class="rc-crest">RC</span>' : '<span class="crest-spacer"></span>') +
      '</div>' +
      '<div class="pos-silhouette">' + positionSilhouette(card.pos) + '</div>' +
      '<div class="card-face__id">' +
        '<div class="card-face__nameblock">' +
          '<div class="team">' + card.team + '</div>' +
          '<div class="player">' + card.player + (card.pos ? ' <span class="pos-tag">' + card.pos + '</span>' : '') + '</div>' +
          (card.tag ? '<div class="cardtag">' + (card.tag.indexOf("Autograph") !== -1 ? "✎ " : "") + card.tag + '</div>' : '') +
        '</div>' +
        teamCrestHTML(card.team) +
      '</div>' +
      '<div class="card-face__valuerow">' +
        (isMine ? '<span class="mine-flag">YOURS</span>' : '<span></span>') +
        '<span class="value mono">' + money(card.value) + '</span>' +
      '</div>'
    );
  }

  function cardFaceHTML(card, isMine, size) {
    var refractorBg = REFRACTOR_COLORS[card.tag];
    var styleAttr = refractorBg ? ' style="background:' + refractorBg + '"' : '';
    return '<div class="' + cardFaceClasses(card, isMine, size) + '"' + styleAttr + '>' + cardInnerHTML(card, isMine) + '</div>';
  }

  function renderLive() {
    var content = document.getElementById("liveContent");
    var sub = document.getElementById("liveSub");
    var ab = state.activeBreak;

    if (!ab) {
      sub.textContent = "Head to the Shop to buy into a break.";
      content.innerHTML =
        '<div class="empty-state"><h3>No break running</h3><p>Buy a spot in the Shop tab to start ripping.</p></div>';
      return;
    }

    var format = findFormat(ab.formatId);
    var revealed = ab.revealedCount;
    var total = ab.cards.length;
    var done = revealed >= total;

    var wholeBox = ab.mode !== "team";
    var modeLabel = ab.mode === "case" ? "1 Case" : ab.mode === "box" ? "1 Box" : "Team Break";
    sub.textContent = PRODUCT_NAME + " " + format.name + " · " + modeLabel +
      (wholeBox ? "" : " · your team: " + ab.yourTeam);

    var historyHTML = "";
    if (revealed > 0) {
      var seen = ab.cards.slice(0, revealed).slice().reverse();
      historyHTML =
        '<div class="history-label">Pulled so far (' + revealed + ' / ' + total + ')</div>' +
        '<div class="history-strip">' +
          seen.map(function (card) {
            return '<div class="history-thumb">' + cardFaceHTML(card, wholeBox || card.team === ab.yourTeam, "sm") + '</div>';
          }).join("") +
        '</div>';
    }

    var stageOrRecap;
    if (!done) {
      stageOrRecap =
        '<div class="stage" id="stageEl">' +
          '<div class="stage-flash"></div>' +
          '<div class="avatar-wrap" id="avatarWrap">' + AVATAR_SVG + '</div>' +
          '<div class="stage-main">' +
            '<div class="spotlight-slot" id="spotlightSlot">' +
              '<div class="spotlight-card card-face card-face--back" id="spotlightCard">NEXT UP</div>' +
              '<div class="hand hand-left"></div><div class="hand hand-right"></div>' +
            '</div>' +
            '<div class="callout-bubble" id="calloutBubble"><div class="callout-main">Ready when you are.</div><div class="callout-sub">Rip the next card to see what you get.</div></div>' +
            '<div class="reveal-controls">' +
              '<button class="btn btn-primary" id="ripNextBtn">Rip Next Card (' + (total - revealed) + ' left)</button>' +
              '<button class="btn" id="ripAllBtn">' + (autoRipping ? "Stop Auto-Rip" : "Auto-Rip All") + '</button>' +
              '<button class="btn btn-ghost" id="ripInstantBtn">Instant Rip (skip animation)</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    } else {
      var kept = ab.cards.filter(function (c) { return wholeBox || c.team === ab.yourTeam; });
      var keptValue = kept.reduce(function (s, c) { return s + c.value; }, 0);
      var net = keptValue - ab.price;
      var recapLine = wholeBox
        ? "It's your " + (ab.mode === "case" ? "whole case" : "whole box") + " — all " + total + " cards went into your collection."
        : kept.length + " of " + total + " cards matched " + ab.yourTeam + " and went into your collection.";
      stageOrRecap =
        '<div class="recap">' +
          '<h3>Break Complete</h3>' +
          '<p class="section-sub">' + recapLine + '</p>' +
          '<div class="recap-stats">' +
            '<div class="recap-stat"><div class="num mono">' + money(ab.price) + '</div><div class="label">Paid</div></div>' +
            '<div class="recap-stat"><div class="num mono">' + money(keptValue) + '</div><div class="label">Pulled Value</div></div>' +
            '<div class="recap-stat"><div class="num mono ' + (net >= 0 ? "pos" : "neg") + '">' + (net >= 0 ? "+" : "") + money(net) + '</div><div class="label">Net</div></div>' +
          '</div>' +
          '<button class="btn btn-primary" id="backToShopBtn">Back to Shop</button>' +
        '</div>';
    }

    content.innerHTML =
      '<div class="live-header"><span class="your-team-badge">' + (wholeBox ? "📦 Personal " + (ab.mode === "case" ? "Case" : "Box") + " — every card is yours" : "🎯 " + ab.yourTeam) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round((revealed / total) * 100) + '%"></div></div>' +
      stageOrRecap +
      historyHTML;
  }

  function renderCollection() {
    var content = document.getElementById("collectionContent");
    var sub = document.getElementById("collectionSub");
    var coll = state.collection.slice().sort(function (a, b) { return b.value - a.value; });

    sub.textContent = coll.length + " card" + (coll.length === 1 ? "" : "s") + " · " + money(collectionValue()) + " total value";

    if (coll.length === 0) {
      content.innerHTML = '<div class="empty-state"><h3>Empty binder</h3><p>Rip a break and cards matching your team land here.</p></div>';
      return;
    }

    var rows = coll.map(function (c) {
      return (
        '<tr>' +
          '<td><span class="rarity-dot" style="background:' + rarityColorVar(c.rarity) + '"></span>' + RARITY_META[c.rarity].label + '</td>' +
          '<td>' + c.player + (c.tag ? ' <span class="section-sub">· ' + c.tag + '</span>' : '') + '</td>' +
          '<td>' + (c.pos || "") + '</td>' +
          '<td>' + c.team + '</td>' +
          '<td class="num mono">' + money(c.value) + '</td>' +
          '<td><button class="btn" data-sell="' + c.id + '">Sell</button></td>' +
        '</tr>'
      );
    }).join("");

    content.innerHTML =
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Rarity</th><th>Player</th><th>Pos</th><th>Team</th><th>Value</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  }

  function renderAll() {
    renderHeader();
    renderShop();
    renderLive();
    renderCollection();
    saveState();
  }

  // ---------- toast ----------
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  // ---------- tabs ----------
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === name + "View");
    });
  }
  document.getElementById("tabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (btn) switchTab(btn.dataset.tab);
  });

  // ---------- modal ----------
  var backdrop = document.getElementById("pickModalBackdrop");
  function openModal(formatId) {
    var f = findFormat(formatId);
    if (!f) return;
    pendingBreak = f;
    var teamPrice = teamPriceFor(f);
    document.getElementById("pickModalTitle").textContent = PRODUCT_NAME + " — " + f.name;
    document.getElementById("pickModalSub").textContent = f.packsPerBox + " packs/box, " + f.cardsPerPack + " cards/pack · " + f.boxesPerCase + " boxes/case · pick how you buy in";
    document.getElementById("modalTeamPrice").textContent = money(teamPrice);
    var sel = document.getElementById("teamSelect");
    sel.innerHTML = TEAMS.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join("");
    document.getElementById("modalBoxPrice").textContent = money(f.boxPrice);
    document.getElementById("modalCasePrice").textContent = money(f.casePrice);
    document.getElementById("confirmTeamBtn").disabled = state.cash < teamPrice;
    document.getElementById("confirmBoxBtn").disabled = state.cash < f.boxPrice;
    document.getElementById("confirmCaseBtn").disabled = state.cash < f.casePrice;
    backdrop.hidden = false;
  }
  function closeModal() { backdrop.hidden = true; pendingBreak = null; }

  function startBreak(mode, yourTeam, price) {
    var f = pendingBreak;
    var boxCount = mode === "box" ? 1 : f.boxesPerCase;
    state.cash -= price;
    state.stats.totalSpent += price;
    state.stats.breaksOpened += 1;
    state.activeBreak = {
      formatId: f.id,
      mode: mode,
      yourTeam: yourTeam,
      price: price,
      cards: generateCards(f, boxCount),
      revealedCount: 0
    };
    closeModal();
    switchTab("live");
    renderAll();
  }

  document.getElementById("breakGrid").addEventListener("click", function (e) {
    var buyBtn = e.target.closest("[data-buy]");
    if (buyBtn) { openModal(buyBtn.dataset.buy); return; }
    var goBtn = e.target.closest("[data-goto-live]");
    if (goBtn) { switchTab("live"); }
  });
  document.getElementById("shopNotice").addEventListener("click", function (e) {
    if (e.target.closest("#bailoutBtn")) {
      state.cash += 50;
      showToast("House bailout: +$50");
      renderAll();
    }
  });
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });
  document.getElementById("confirmTeamBtn").addEventListener("click", function () {
    if (!pendingBreak) return;
    var team = document.getElementById("teamSelect").value;
    startBreak("team", team, teamPriceFor(pendingBreak));
  });
  document.getElementById("confirmBoxBtn").addEventListener("click", function () {
    if (!pendingBreak) return;
    startBreak("box", null, pendingBreak.boxPrice);
  });
  document.getElementById("confirmCaseBtn").addEventListener("click", function () {
    if (!pendingBreak) return;
    startBreak("case", null, pendingBreak.casePrice);
  });

  // ---------- live break interactions ----------
  var busy = false;
  var autoRipping = false;

  function playRevealAnimation(card, isMine, wholeBox, done) {
    var spotlight = document.getElementById("spotlightCard");
    var slot = document.getElementById("spotlightSlot");
    var callout = document.getElementById("calloutBubble");
    var avatarWrap = document.getElementById("avatarWrap");
    var stageEl = document.getElementById("stageEl");
    if (!spotlight) { done(); return; }
    var timing = RARITY_TIMING[card.rarity];
    var big = card.rarity === "epic" || card.rarity === "legendary";
    var mega = card.value >= 1000;
    var refractorBg = REFRACTOR_COLORS[card.tag];

    spotlight.classList.add("shaking");

    later(function () {
      spotlight.className = "spotlight-card " + cardFaceClasses(card, isMine) + " revealed" + (mega ? " mega-hit" : "");
      spotlight.style.background = refractorBg || "";
      spotlight.innerHTML = cardInnerHTML(card, isMine);
      if (slot) slot.classList.add("lifted");
      if (callout) callout.innerHTML = calloutHTML(card, isMine, wholeBox, mega);
      if (big && avatarWrap) avatarWrap.classList.add("hype");
      if (mega) {
        spawnConfetti(stageEl, 42, card.rarity, true);
        triggerFlash(stageEl, true);
        if (stageEl) { stageEl.classList.remove("mega-shake"); void stageEl.offsetWidth; stageEl.classList.add("mega-shake"); }
      } else {
        if (big) spawnConfetti(stageEl, card.rarity === "legendary" ? 26 : 12, card.rarity);
        if (card.rarity === "legendary") triggerFlash(stageEl);
      }

      later(function () {
        if (avatarWrap) avatarWrap.classList.remove("hype");
        if (spotlight) spotlight.classList.remove("mega-hit");
        if (stageEl) stageEl.classList.remove("mega-shake");
        done();
      }, timing.hold + (mega ? 700 : 0));
    }, REDUCE_MOTION ? 20 : timing.shake);
  }

  function revealNext() {
    if (busy) return;
    var ab = state.activeBreak;
    if (!ab || ab.revealedCount >= ab.cards.length) return;
    busy = true;
    var card = ab.cards[ab.revealedCount];
    var wholeBox = ab.yourTeam === null;
    var isMine = wholeBox || card.team === ab.yourTeam;
    playRevealAnimation(card, isMine, wholeBox, function () {
      ab.revealedCount += 1;
      if (isMine) state.collection.push(card);
      busy = false;
      renderAll();
      if (autoRipping && ab.revealedCount < ab.cards.length) {
        later(revealNext, 220);
      } else {
        autoRipping = false;
      }
    });
  }

  function instantRip() {
    var ab = state.activeBreak;
    if (!ab || ab.revealedCount >= ab.cards.length) return;
    autoRipping = false;
    busy = false;
    var wholeBox = ab.yourTeam === null;
    for (var i = ab.revealedCount; i < ab.cards.length; i++) {
      var card = ab.cards[i];
      if (wholeBox || card.team === ab.yourTeam) state.collection.push(card);
    }
    ab.revealedCount = ab.cards.length;
    renderAll();
  }

  document.getElementById("liveContent").addEventListener("click", function (e) {
    if (e.target.closest("#ripNextBtn")) { revealNext(); return; }
    if (e.target.closest("#ripAllBtn")) {
      autoRipping = !autoRipping;
      if (autoRipping) revealNext(); else renderAll();
      return;
    }
    if (e.target.closest("#ripInstantBtn")) { instantRip(); return; }
    if (e.target.closest("#backToShopBtn")) {
      state.activeBreak = null;
      switchTab("shop");
      renderAll();
      return;
    }
  });

  // ---------- collection interactions ----------
  document.getElementById("collectionContent").addEventListener("click", function (e) {
    var sellBtn = e.target.closest("[data-sell]");
    if (!sellBtn) return;
    var id = sellBtn.dataset.sell;
    var idx = state.collection.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return;
    var card = state.collection[idx];
    state.cash += card.value;
    state.collection.splice(idx, 1);
    showToast("Sold " + card.player + " for " + money(card.value));
    renderAll();
  });

  document.getElementById("sellAllBtn").addEventListener("click", function () {
    if (state.collection.length === 0) return;
    var total = collectionValue();
    state.cash += total;
    state.collection = [];
    showToast("Sold entire collection for " + money(total));
    renderAll();
  });

  // reset with a two-click confirm, no blocking dialog
  var resetArmed = false, resetTimer = null;
  document.getElementById("resetBtn").addEventListener("click", function (e) {
    if (!resetArmed) {
      resetArmed = true;
      e.target.textContent = "Click again to confirm";
      resetTimer = setTimeout(function () { resetArmed = false; e.target.textContent = "Reset Save"; }, 3000);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    e.target.textContent = "Reset Save";
    localStorage.removeItem(STORAGE_KEY);
    state = { cash: 5000, collection: [], stats: { breaksOpened: 0, totalSpent: 0 }, activeBreak: null };
    switchTab("shop");
    renderAll();
    showToast("Save reset");
  });

  renderAll();

  // ---------- installable app support ----------
  // Register the service worker so the app can be installed and opens offline after the first visit.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* ignore — app still works, just not offline/installable */ });
    });
  }

  // Chrome/Edge/Android show a native install prompt we can trigger ourselves.
  var deferredInstallEvent = null;
  var installBanner = document.getElementById("installBanner");
  var installBtn = document.getElementById("installBtn");
  var installDismiss = document.getElementById("installDismiss");
  var INSTALL_DISMISS_KEY = "break-room-install-dismissed";

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function userDismissedInstall() {
    try { return localStorage.getItem(INSTALL_DISMISS_KEY) === "1"; } catch (e) { return false; }
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstallEvent = e;
    if (installBanner && !isStandalone() && !userDismissedInstall()) {
      installBanner.hidden = false;
    }
  });

  if (installBtn) {
    installBtn.addEventListener("click", function () {
      if (!deferredInstallEvent) return;
      deferredInstallEvent.prompt();
      deferredInstallEvent.userChoice.finally(function () {
        deferredInstallEvent = null;
        if (installBanner) installBanner.hidden = true;
      });
    });
  }
  if (installDismiss) {
    installDismiss.addEventListener("click", function () {
      if (installBanner) installBanner.hidden = true;
      try { localStorage.setItem(INSTALL_DISMISS_KEY, "1"); } catch (e) { /* ignore */ }
    });
  }

  // iOS Safari has no beforeinstallprompt — show a manual hint instead.
  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  if (isIOS && !isStandalone() && !userDismissedInstall() && installBanner) {
    var msg = installBanner.querySelector("span");
    if (msg) msg.innerHTML = "<strong>Install this app:</strong> tap Share, then “Add to Home Screen.”";
    if (installBtn) installBtn.hidden = true;
    installBanner.hidden = false;
  }
})();
