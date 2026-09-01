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
  // ---------- card value multipliers (single source of truth) ----------
  // Every card's value is PLAYER BASE VALUE x PARALLEL MULT x AUTO MULT (if applicable).
  // Nothing else in the file should hardcode a rarity multiplier — everything reads from
  // here so the whole economy can be rebalanced by editing this one object.
  var CARD_MULT = {
    base: 1,
    refractor: 1.5,
    rookieRefractor: 2,
    green: 2.25,
    blue: 3.5,
    orange: 5,
    gold: 8,
    red: 14,
    black: 24,
    superfractor: 60,
    autograph: 3,
    caseHit: 15
  };
  // Plain refractor/color tag name -> its CARD_MULT key. Rookie Refractor and Case Hit are
  // deliberately excluded: they're separate chase families, not rungs on this color ladder.
  var COLOR_TAG_MULT_KEY = {
    "Refractor": "refractor", "Green Refractor": "green", "Blue Refractor": "blue",
    "Orange Refractor": "orange", "Gold Refractor": "gold", "Red Refractor": "red",
    "Black Refractor": "black", "Superfractor 1/1": "superfractor"
  };
  // Given any card tag (plain, autograph, rookie, or case hit), returns the plain color/
  // rookie tag name used for cosmetic lookups (REFRACTOR_COLORS background, QB image
  // filter) — e.g. "Green Refractor Autograph" -> "Green Refractor". Returns null for
  // Base Autograph and Case Hit, which have no color tier of their own.
  function tierValueKey(tag) {
    if (!tag) return null;
    if (COLOR_TAG_MULT_KEY.hasOwnProperty(tag) || tag === "Rookie Refractor") return tag;
    if (tag === "Superfractor Autograph 1/1") return "Superfractor 1/1";
    var m = /^(.*) Autograph$/.exec(tag);
    if (m && COLOR_TAG_MULT_KEY.hasOwnProperty(m[1])) return m[1];
    return null;
  }
  // The parallel multiplier a tag contributes on its own, before any autograph bonus —
  // e.g. "Blue Refractor" and "Blue Refractor Autograph" both resolve to CARD_MULT.blue.
  function parallelMultFor(tag) {
    if (!tag) return CARD_MULT.base;
    if (tag === "Rookie Refractor") return CARD_MULT.rookieRefractor;
    var colorTag = tierValueKey(tag);
    if (colorTag && COLOR_TAG_MULT_KEY.hasOwnProperty(colorTag)) return CARD_MULT[COLOR_TAG_MULT_KEY[colorTag]];
    return CARD_MULT.base; // e.g. "Base Autograph"
  }
  // Case Hit is its own standalone chase family — it does not stack with the parallel
  // ladder or an autograph bonus.
  function cardValueMultiplier(tag, isAutograph) {
    if (tag === "Case Hit") return CARD_MULT.caseHit;
    var mult = parallelMultFor(tag);
    return isAutograph ? mult * CARD_MULT.autograph : mult;
  }

  // Flat value range for ordinary base cards (every card that isn't a pack's hit slot).
  var BASE_CARD_VALUE = [1, 6];
  // A pack's hit-slot card starts from this same "player base value" range, then the
  // parallel/autograph/case-hit multiplier above is applied on top of it.
  var HIT_CARD_VALUE = [2, 8];

  var PRODUCT_NAME = "RLFL Debut Chrome";

  // Rarest-first STANDARD COLOR LADDER: Refractor -> Green -> Blue -> Orange -> Gold ->
  // Red -> Black -> Superfractor. Rookie Refractor is NOT a rung here — it's a separate,
  // rookie-only roll (see rollPackHit) so it never competes with or sits "between" colors.
  // Each `p` is the CUMULATIVE chance a pack's hit slot lands on this tier or something
  // rarer, so a single random draw (rollLadder) can never trigger two tiers at once.
  function buildColorLadder(o) {
    return [
      { name: "Superfractor 1/1",  p: 1 / o.superfractor },
      { name: "Black Refractor",   p: 1 / o.black },
      { name: "Red Refractor",     p: 1 / o.red },
      { name: "Gold Refractor",    p: 1 / o.gold },
      { name: "Orange Refractor",  p: 1 / o.orange },
      { name: "Blue Refractor",    p: 1 / o.blue },
      { name: "Green Refractor",   p: 1 / o.green },
      { name: "Refractor",         p: 1 / o.refractor }
    ];
  }
  // The autograph chase has its own ladder over the same color names (Refractor up
  // through Superfractor, no Rookie Refractor), rescaled so its "any color auto" total
  // matches the format's colorAutoP. Anything below "Refractor Autograph" falls through
  // to plain "Base Autograph".
  function autoColorLadder(colorLadder, colorAutoP) {
    var bottomP = colorLadder[colorLadder.length - 1].p; // "Refractor" — least rare rung
    var scale = bottomP > 0 ? colorAutoP / bottomP : 0;
    return colorLadder.map(function (t) { return { name: t.name, p: t.p * scale }; });
  }
  function rollLadder(ladder) {
    var r = Math.random();
    for (var i = 0; i < ladder.length; i++) if (r < ladder[i].p) return ladder[i].name;
    return null;
  }
  function autoTagFromColorName(name) {
    return name === "Superfractor 1/1" ? "Superfractor Autograph 1/1" : name + " Autograph";
  }

  var FORMATS = [
    {
      id: "retail", tier: "RETAIL", name: "Retail",
      boxPrice: 40, casePrice: 800, boxesPerCase: 20,
      packsPerBox: 4, cardsPerPack: 4, cardsPerBox: 16,
      blurb: "The cheapest way in. Mostly base cards, but every chase card — up to a 1/1 — is still in the pool.",
      valueScale: 0.49, guaranteedAutographs: 0,
      caseHitP: 1 / 150, baseAutoP: 1 / 100, colorAutoP: 1 / 400,
      packOdds: { refractor: 3, rookieRefractor: 8, green: 16, blue: 35, orange: 70, gold: 140, red: 350, black: 700, superfractor: 3500 }
    },
    {
      id: "hobby", tier: "HOBBY", name: "Hobby",
      boxPrice: 250, casePrice: 3000, boxesPerCase: 12,
      packsPerBox: 6, cardsPerPack: 5, cardsPerBox: 30,
      blurb: "The main premium format — noticeably better refractor and autograph odds, one autograph guaranteed.",
      valueScale: 1.59, guaranteedAutographs: 1,
      caseHitP: 1 / 96, baseAutoP: 1 / 60, colorAutoP: 1 / 70,
      packOdds: { refractor: 2, rookieRefractor: 5, green: 8, blue: 18, orange: 35, gold: 70, red: 175, black: 350, superfractor: 1750 }
    },
    {
      id: "jumbo", tier: "JUMBO", name: "Jumbo Hobby",
      boxPrice: 600, casePrice: 4800, boxesPerCase: 8,
      packsPerBox: 8, cardsPerPack: 6, cardsPerBox: 48,
      blurb: "The most loaded format on the shelf — a refractor in every pack and two autographs guaranteed.",
      valueScale: 2.19, guaranteedAutographs: 2,
      caseHitP: 1 / 60, baseAutoP: 1 / 40, colorAutoP: 1 / 35,
      packOdds: { refractor: 1, rookieRefractor: 3, green: 5, blue: 10, orange: 20, gold: 40, red: 100, black: 200, superfractor: 1000 }
    }
  ];
  FORMATS.forEach(function (f) {
    f.colorLadder = buildColorLadder(f.packOdds);
    f.autoColorLadder = autoColorLadder(f.colorLadder, f.colorAutoP);
    // Rookie Refractor is its own independent roll, not a rung on the color ladder above.
    f.rookieRefractorP = 1 / f.packOdds.rookieRefractor;
    // "Mega hit" scales with the format instead of a fixed dollar figure — a Retail box
    // should still be able to produce its own jaw-dropping moment even though its dollar
    // values run far lower than Jumbo's.
    f.megaThreshold = f.boxPrice * 2;
  });

  // Skill-position hierarchy: QBs command the most. Linemen and defense are much less
  // collectible, so even a nice-tier hit on an OL card stays modest — the color/rarity
  // makes it a notable pull, but not a payday.
  var POSITION_VALUE_MULT = { QB: 2.2, WR: 1.6, RB: 1.2, TE: 0.9, DEF: 0.5, OL: 0.2 };

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
      if (parsed.activeBreak && (!findFormat(parsed.activeBreak.formatId) || !Array.isArray(parsed.activeBreak.packs))) parsed.activeBreak = null;
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

  // Plain base card: any card that isn't its pack's designated hit-slot card.
  function makeCard(format) {
    var team = pick(TEAMS);
    var player = pick(activeSet.roster[team]);
    var posMult = POSITION_VALUE_MULT[player.pos] || 1;
    var scale = format.valueScale * posMult;
    var lo = Math.max(1, Math.round(BASE_CARD_VALUE[0] * scale));
    var hi = Math.max(lo, Math.round(BASE_CARD_VALUE[1] * scale));
    var value = rand(lo, hi);
    return {
      id: uid(), team: team, player: player.name, pos: player.pos,
      isRookie: !!player.rookie, tag: null, value: value, isMega: value >= format.megaThreshold
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

  // A pack's hit-slot card: refractor / autograph / case hit. Its value is always
  // PLAYER BASE VALUE x PARALLEL MULT x AUTO MULT (if applicable) — CARD_MULT is the only
  // place rarity multipliers live, so the player being hit still matters as much as the
  // parallel does (a star's Gold Refractor is worth far more than a scrub's).
  function makeHitCard(format, tag, isAutograph, requiresRookie) {
    var team = pick(TEAMS);
    var player = pickHitPlayer(team, requiresRookie);
    var posMult = POSITION_VALUE_MULT[player.pos] || 1;
    var baseScale = format.valueScale * posMult;
    var lo = Math.max(1, Math.round(HIT_CARD_VALUE[0] * baseScale));
    var hi = Math.max(lo, Math.round(HIT_CARD_VALUE[1] * baseScale));
    var playerBaseValue = rand(lo, hi);
    var value = Math.round(playerBaseValue * cardValueMultiplier(tag, isAutograph));
    return {
      id: uid(), team: team, player: player.name, pos: player.pos,
      isRookie: !!player.rookie, tag: tag, value: value, isMega: value >= format.megaThreshold
    };
  }

  // Decides what (if anything) occupies a single pack's one hit slot. Case Hit, Autograph,
  // Rookie Refractor, and the standard color ladder are four independent, mutually
  // exclusive rolls — never nested inside one another — so none of them compete for the
  // same "slot" in a way that would make one imply or preclude another.
  function rollPackHit(format) {
    if (Math.random() < format.caseHitP) {
      return { tag: "Case Hit", isAutograph: false, requiresRookie: false };
    }
    var totalAutoP = format.baseAutoP + format.colorAutoP;
    if (Math.random() < totalAutoP) {
      if (Math.random() < format.colorAutoP / totalAutoP) {
        var color = rollLadder(format.autoColorLadder) || "Refractor";
        return { tag: autoTagFromColorName(color), isAutograph: true, requiresRookie: false };
      }
      return { tag: "Base Autograph", isAutograph: true, requiresRookie: false };
    }
    if (Math.random() < format.rookieRefractorP) {
      return { tag: "Rookie Refractor", isAutograph: false, requiresRookie: true };
    }
    var tier = rollLadder(format.colorLadder);
    if (!tier) return { tag: null, isAutograph: false, requiresRookie: false };
    return { tag: tier, isAutograph: false, requiresRookie: false };
  }

  function generatePackCards(format) {
    var hit = rollPackHit(format);
    var hitIndex = format.cardsPerPack - 1;
    var cards = [];
    for (var i = 0; i < format.cardsPerPack; i++) {
      if (i === hitIndex && hit.tag) {
        cards.push(makeHitCard(format, hit.tag, hit.isAutograph, hit.requiresRookie));
      } else {
        cards.push(makeCard(format));
      }
    }
    return { cards: cards, hasAutograph: hit.isAutograph, hitIndex: hitIndex };
  }

  // Forces a pack's hit slot into an autograph to satisfy a box's guarantee — usually a
  // Base Autograph, with a small chance of upgrading to a color refractor autograph.
  function upgradePackToAutograph(pack, format) {
    var tag = "Base Autograph";
    if (Math.random() < 0.12) {
      var color = rollLadder(format.autoColorLadder) || "Refractor";
      tag = autoTagFromColorName(color);
    }
    pack.cards[pack.hitIndex] = makeHitCard(format, tag, true, false);
    pack.hasAutograph = true;
  }

  // Returns one box's packs, each still its own unopened group of cards, so the player
  // picks which pack to rip rather than the box being flattened into one card stream.
  function generateBoxPacks(format) {
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
    return packs.map(function (p) { return { cards: p.cards, revealedCount: 0, torn: false }; });
  }

  function generatePacks(format, boxCount) {
    var all = [];
    for (var i = 0; i < boxCount; i++) all = all.concat(generateBoxPacks(format));
    return all;
  }

  function findFormat(id) {
    for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i].id === id) return FORMATS[i];
    return null;
  }

  function teamPriceFor(format) { return Math.round(format.casePrice / TEAMS.length); }

  // ---------- reveal animation helpers ----------
  var REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pendingTimers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); pendingTimers.push(id); return id; }
  function spawnConfetti(container, count, baseColor, mega) {
    if (REDUCE_MOTION || !container) return;
    var colors = mega
      ? ["#ffd54a", "#fff6cf", "var(--accent)", "#ffffff"]
      : [baseColor, "var(--accent)", "var(--accent-2)"];
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

  function oddsChipsHTML(labels) {
    return labels.map(function (c) { return '<span class="odds-chip">' + c + '</span>'; }).join("");
  }
  function oddsGroup(label, chipsHTML) {
    return '<div class="odds-group"><span class="odds-group__label">' + label + '</span>' +
      '<div class="odds-row">' + chipsHTML + '</div></div>';
  }
  // Four separate chase families, shown as separate groups so the UI doesn't imply Rookie
  // Refractor / Autographs / Case Hit are just more colors on the parallel ladder.
  function oddsGroupsHTML(f) {
    var parallelChips = oddsChipsHTML(f.colorLadder.slice().reverse().map(function (t) {
      return t.name + " 1:" + f.packOdds[COLOR_TAG_MULT_KEY[t.name]].toLocaleString();
    }));
    var rookieChips = oddsChipsHTML(["Rookie Refractor 1:" + f.packOdds.rookieRefractor.toLocaleString()]);
    var autoChips = oddsChipsHTML(
      ["Base Autograph 1:" + Math.round(1 / f.baseAutoP).toLocaleString()].concat(
        f.autoColorLadder.slice().reverse().map(function (t) {
          return autoTagFromColorName(t.name) + " 1:" + Math.round(1 / t.p).toLocaleString();
        })
      )
    );
    var caseHitChips = oddsChipsHTML(["Case Hit 1:" + Math.round(1 / f.caseHitP).toLocaleString()]);
    return (
      oddsGroup("Parallels", parallelChips) +
      oddsGroup("Rookie Chase", rookieChips) +
      oddsGroup("Autograph Chase", autoChips) +
      oddsGroup("Case Hit", caseHitChips)
    );
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
            '<div class="odds-groups">' + oddsGroupsHTML(f) + '</div>' +
            '<div class="break-card__foot">' + btn + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  // QBs get a real photo-based card template instead of the generic silhouette layout.
  // Most QBs share one generic photo, retinted per parallel tier via CSS filter so rarity
  // is still visible without a separate image per color. A player can instead get their
  // own art via QB_PLAYER_ART: `image` is a self-contained finished card design (team
  // logo, name, and position already baked in by hand in Canva) reused across that
  // player's tiers with the same CSS retint until real per-parallel art exists; `variants`
  // lets a specific tag point at its own fully unique, finished art with no retint at all.
  var QB_CARD_IMAGE = "images/qb-chrome.jpg";
  var QB_PLAYER_ART = {
    "Justin Hayes": { image: "images/qb-justin-hayes.jpg", selfContained: true }
  };
  function qbArtFor(card) {
    var art = QB_PLAYER_ART[card.player];
    if (art && art.variants && card.tag && art.variants[card.tag]) {
      return { src: art.variants[card.tag], selfContained: true, filter: "" };
    }
    if (art) return { src: art.image, selfContained: !!art.selfContained, filter: qbImageFilter(card.tag) };
    return { src: QB_CARD_IMAGE, selfContained: false, filter: qbImageFilter(card.tag) };
  }
  var QB_IMAGE_FILTER = {
    "Rookie Refractor": "sepia(.25) saturate(1.3) hue-rotate(-8deg)",
    "Green Refractor": "hue-rotate(100deg) saturate(1.4)",
    "Blue Refractor": "hue-rotate(190deg) saturate(1.3)",
    "Orange Refractor": "hue-rotate(-40deg) saturate(1.5) brightness(1.05)",
    "Gold Refractor": "sepia(.5) saturate(1.8) hue-rotate(-12deg) brightness(1.05)",
    "Red Refractor": "hue-rotate(300deg) saturate(1.6)",
    "Black Refractor": "grayscale(.7) brightness(.65) contrast(1.25)",
    "Superfractor 1/1": "saturate(2.2) contrast(1.15) brightness(1.05)",
    "Case Hit": "hue-rotate(250deg) saturate(1.5) brightness(.9)"
  };
  function qbImageFilter(tag) {
    if (!tag) return "";
    if (tag === "Case Hit") return QB_IMAGE_FILTER["Case Hit"];
    var key = tierValueKey(tag);
    return (key && QB_IMAGE_FILTER[key]) || "";
  }
  function qbCardInnerHTML(card, isMine) {
    var badge = cardBadge(card);
    var art = qbArtFor(card);
    var tagLabel = card.tag ? (card.tag.indexOf("Autograph") !== -1 ? "✎ " : "") + card.tag : badge.label;
    return (
      '<div class="qb-card__imgwrap' + (art.selfContained ? ' qb-card__imgwrap--contain' : '') + '">' +
        '<img class="qb-card__img" src="' + art.src + '" alt=""' + (art.filter ? ' style="filter:' + art.filter + '"' : '') + '>' +
        (art.selfContained ? '' :
          '<div class="qb-card__plate">' +
            '<div class="qb-card__team' + (isMine ? ' mine' : '') + '">' + card.team + '</div>' +
            '<div class="qb-card__player">' + card.player + '</div>' +
          '</div>'
        ) +
      '</div>' +
      '<div class="qb-card__footer">' +
        '<span class="rarity-tag" style="background:' + badge.color + '">' + tagLabel + '</span>' +
        '<span class="value mono">' + money(card.value) + '</span>' +
      '</div>'
    );
  }

  function cardBadge(card) {
    if (!card.tag) return { label: "BASE", color: "var(--surface-2)" };
    if (card.tag === "Case Hit") return { label: "CASE HIT", color: "#8a3fd6" };
    if (card.tag.indexOf("Autograph") !== -1) return { label: "AUTOGRAPH", color: "#d4af37" };
    return { label: "PARALLEL", color: "var(--accent)" };
  }

  function cardFaceClasses(card, isMine, size) {
    return "card-face" + (size ? " card-face--" + size : "") + (isMine ? " mine" : "") +
      (card.pos === "QB" ? " qb-card" : "") +
      (card.tag ? " legendary" : "") + (REFRACTOR_COLORS[card.tag] ? " refractor" : "") +
      (card.isMega ? " mega-hit" : "");
  }

  function cardInnerHTML(card, isMine) {
    if (card.pos === "QB") return qbCardInnerHTML(card, isMine);
    var badge = cardBadge(card);
    return (
      '<div class="card-face__topbar">' +
        '<span class="rlfl-crest">RLFL</span>' +
        '<span class="rarity-tag" style="background:' + badge.color + '">' + badge.label + '</span>' +
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
    var refractorBg = card.pos === "QB" ? null : REFRACTOR_COLORS[card.tag];
    var styleAttr = refractorBg ? ' style="background:' + refractorBg + '"' : '';
    return '<div class="' + cardFaceClasses(card, isMine, size) + '"' + styleAttr + '>' + cardInnerHTML(card, isMine) + '</div>';
  }

  // Small deterministic tilt per index so the grid reads as packs scattered/fanned across
  // a table rather than a perfect grid — same angle every render, no jitter on re-render.
  var PACK_TILT_STEPS = [-7, -3, 0, 3, 7];
  function packGridHTML(ab, format) {
    var tiles = ab.packs.map(function (p, i) {
      var done = p.revealedCount >= p.cards.length;
      var multiBox = ab.packs.length > format.packsPerBox;
      var label = multiBox
        ? "Box " + (Math.floor(i / format.packsPerBox) + 1) + " · Pack " + ((i % format.packsPerBox) + 1)
        : "Pack " + (i + 1);
      var tilt = PACK_TILT_STEPS[i % PACK_TILT_STEPS.length];
      return (
        '<button class="pack-tile' + (done ? ' opened' : '') + '" data-pack="' + i + '"' + (done ? ' disabled' : '') + '>' +
          '<div class="pack-mini" style="--tilt:' + tilt + 'deg">' +
            '<div class="pack-mini__seam"></div>' +
            (done
              ? '<span class="pack-mini__brand">✓</span>'
              : '<span class="pack-mini__brand">RLFL</span><span class="pack-mini__sub">CHROME</span>') +
          '</div>' +
          '<span class="pack-tile__label">' + label + '</span>' +
          '<span class="pack-tile__status">' + (done ? "Opened" : p.cards.length + " cards") + '</span>' +
        '</button>'
      );
    }).join("");
    return (
      '<div class="pack-grid-wrap">' +
        '<div class="pack-grid-head"><h3>Choose a Pack</h3><button class="btn" id="instantRipBoxBtn">Instant Rip Everything Left</button></div>' +
        '<div class="pack-grid">' + tiles + '</div>' +
      '</div>'
    );
  }

  function packIntroHTML(ab) {
    return (
      '<div class="stage pack-intro-stage" id="stageEl">' +
        '<div class="stage-flash"></div>' +
        '<div class="pack3d-wrap">' +
          '<div class="pack3d" id="pack3d">' +
            '<div class="pack3d__half pack3d__half--top"><div class="pack3d__inner"><span class="pack3d__brand">RLFL</span><span class="pack3d__sub">DEBUT CHROME</span></div></div>' +
            '<div class="pack3d__half pack3d__half--bottom"><div class="pack3d__inner"><span class="pack3d__brand">RLFL</span><span class="pack3d__sub">DEBUT CHROME</span></div></div>' +
            '<div class="pack3d__seam"></div>' +
            '<div class="pack3d__shine"></div>' +
          '</div>' +
        '</div>' +
        '<h3 class="pack-intro-title">Pack ' + (ab.currentPackIndex + 1) + '</h3>' +
        '<p class="pack-intro-sub">Tap to tear it open.</p>' +
        '<button class="btn btn-primary" id="tearPackBtn">Tear Open</button>' +
      '</div>'
    );
  }

  // A stacked deck: the current card sits fully visible at front (left), the rest of the
  // pack peeks out behind/to the right just enough to hint at its color (so a refractor
  // sheen or autograph gold is visible before you get to it). Swiping the front card up
  // (or tapping the button) takes it and reveals the next one.
  function packStackHTML(ab, pack) {
    var wholeBox = ab.yourTeam === null;
    var remaining = pack.cards.slice(pack.revealedCount);
    var wrapWidth = 118 + Math.max(0, remaining.length - 1) * 30;
    var items = remaining.map(function (card, k) {
      var isMine = wholeBox || card.team === ab.yourTeam;
      var tx = k * 30;
      var rot = (k * 3).toFixed(1);
      var z = remaining.length - k;
      var base = "translate(" + tx + "px, 0) rotate(" + rot + "deg)";
      return (
        '<div class="stack-item' + (k === 0 ? ' stack-item--front' : '') + '" data-base-transform="' + base + '" style="transform:' + base + '; z-index:' + z + ';">' +
          cardFaceHTML(card, isMine, "sm") +
        '</div>'
      );
    }).join("");
    return (
      '<div class="stage stack-stage" id="stageEl">' +
        '<div class="stage-flash"></div>' +
        '<div class="pack-progress">Pack ' + (ab.currentPackIndex + 1) + ' · card ' + (pack.revealedCount + 1) + ' of ' + pack.cards.length + '</div>' +
        '<div class="stack-wrap" id="stackWrap" style="width:' + wrapWidth + 'px;">' + items + '</div>' +
        '<button class="btn btn-primary" id="nextCardBtn">Next Card ↑</button>' +
        '<p class="stack-hint">Swipe up on the top card, or tap the button.</p>' +
      '</div>'
    );
  }

  function packDoneHTML(ab, pack) {
    var wholeBox = ab.yourTeam === null;
    var kept = pack.cards.filter(function (c) { return wholeBox || c.team === ab.yourTeam; });
    var keptValue = kept.reduce(function (s, c) { return s + c.value; }, 0);
    var recapLine = wholeBox ? "Every card is yours." : kept.length + " of " + pack.cards.length + " matched " + ab.yourTeam + ".";
    return (
      '<div class="stage" id="stageEl">' +
        '<div class="stage-flash"></div>' +
        '<h3 class="pack-intro-title">Pack ' + (ab.currentPackIndex + 1) + ' Complete</h3>' +
        '<p class="pack-intro-sub">' + recapLine + ' Value <strong>' + money(keptValue) + '</strong></p>' +
        '<button class="btn btn-primary" id="backToPacksBtn">Back to Packs</button>' +
      '</div>'
    );
  }

  function packRipHTML(ab) {
    var pack = ab.packs[ab.currentPackIndex];
    if (pack.revealedCount >= pack.cards.length) return packDoneHTML(ab, pack);
    if (!pack.torn) return packIntroHTML(ab);
    return packStackHTML(ab, pack);
  }

  // Fires the mega-hit burst once per card, the moment it first becomes the front of the
  // stack (not on every re-render for unrelated reasons, and not again on repeat renders).
  var burstedCardId = null;
  function maybeBurstFrontCard(ab) {
    if (!ab || ab.currentPackIndex === null) return;
    var pack = ab.packs[ab.currentPackIndex];
    if (!pack || !pack.torn) return;
    var front = pack.cards[pack.revealedCount];
    if (!front || !front.isMega || burstedCardId === front.id) return;
    burstedCardId = front.id;
    var stageEl = document.getElementById("stageEl");
    if (stageEl) { spawnConfetti(stageEl, 42, "#ffd54a", true); triggerFlash(stageEl, true); }
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
    var total = ab.packs.reduce(function (s, p) { return s + p.cards.length; }, 0);
    var revealed = ab.packs.reduce(function (s, p) { return s + p.revealedCount; }, 0);
    var done = revealed >= total;

    var wholeBox = ab.mode !== "team";
    var modeLabel = ab.mode === "case" ? "1 Case" : ab.mode === "box" ? "1 Box" : "Team Break";
    sub.textContent = PRODUCT_NAME + " " + format.name + " · " + modeLabel +
      (wholeBox ? "" : " · your team: " + ab.yourTeam);

    var revealedCards = [];
    ab.packs.forEach(function (p) {
      for (var i = 0; i < p.revealedCount; i++) revealedCards.push(p.cards[i]);
    });

    var historyHTML = "";
    if (revealedCards.length > 0) {
      var seen = revealedCards.slice().reverse();
      historyHTML =
        '<div class="history-label">Pulled so far (' + revealed + ' / ' + total + ')</div>' +
        '<div class="history-strip">' +
          seen.map(function (card) {
            return '<div class="history-thumb">' + cardFaceHTML(card, wholeBox || card.team === ab.yourTeam, "sm") + '</div>';
          }).join("") +
        '</div>';
    }

    var mainHTML;
    if (done) {
      var kept = revealedCards.filter(function (c) { return wholeBox || c.team === ab.yourTeam; });
      var keptValue = kept.reduce(function (s, c) { return s + c.value; }, 0);
      var net = keptValue - ab.price;
      var recapLine = wholeBox
        ? "It's your " + (ab.mode === "case" ? "whole case" : "whole box") + " — all " + total + " cards went into your collection."
        : kept.length + " of " + total + " cards matched " + ab.yourTeam + " and went into your collection.";
      mainHTML =
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
    } else if (ab.currentPackIndex === null) {
      mainHTML = packGridHTML(ab, format);
    } else {
      mainHTML = packRipHTML(ab);
    }

    content.innerHTML =
      '<div class="live-header"><span class="your-team-badge">' + (wholeBox ? "📦 Personal " + (ab.mode === "case" ? "Case" : "Box") + " — every card is yours" : "🎯 " + ab.yourTeam) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round((revealed / total) * 100) + '%"></div></div>' +
      mainHTML +
      historyHTML;

    if (document.getElementById("stackWrap")) maybeBurstFrontCard(ab);
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

    var tiles = coll.map(function (c) {
      return (
        '<div class="collection-card">' +
          '<div class="collection-card__face">' + cardFaceHTML(c, true, "sm") + '</div>' +
          '<button class="btn collection-card__sell" data-sell="' + c.id + '">Sell</button>' +
        '</div>'
      );
    }).join("");

    content.innerHTML = '<div class="collection-grid">' + tiles + '</div>';
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
    t.style.pointerEvents = "";
    t.style.cursor = "";
    t.onclick = null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }
  // Stays up (no auto-hide) until tapped — used only for "a new version is ready."
  function showUpdateToast() {
    var t = document.getElementById("toast");
    clearTimeout(toastTimer);
    t.textContent = "Update ready — tap to reload";
    t.classList.add("show");
    t.style.pointerEvents = "auto";
    t.style.cursor = "pointer";
    t.onclick = function () { window.location.reload(); };
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
      packs: generatePacks(f, boxCount),
      currentPackIndex: null
    };
    burstedCardId = null;
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
  // Instantly resolves every remaining card across every unopened pack in the box/case
  // (used by the pack grid's "Instant Rip Everything Left").
  function instantRipBox() {
    var ab = state.activeBreak;
    if (!ab) return;
    var wholeBox = ab.yourTeam === null;
    ab.packs.forEach(function (pack) {
      for (var i = pack.revealedCount; i < pack.cards.length; i++) {
        var card = pack.cards[i];
        if (wholeBox || card.team === ab.yourTeam) state.collection.push(card);
      }
      pack.revealedCount = pack.cards.length;
      pack.torn = true;
    });
    ab.currentPackIndex = null;
    renderAll();
  }

  // Takes the front card off the stack: animates it flying up and away, then collects it
  // and reveals whatever was peeking behind it as the new front card.
  function advanceStack() {
    var ab = state.activeBreak;
    if (!ab || ab.currentPackIndex === null) return;
    var pack = ab.packs[ab.currentPackIndex];
    if (!pack || !pack.torn || pack.revealedCount >= pack.cards.length) return;
    var card = pack.cards[pack.revealedCount];
    var isMine = ab.yourTeam === null || card.team === ab.yourTeam;
    var frontEl = document.querySelector(".stack-item--front");
    if (frontEl) {
      frontEl.style.pointerEvents = "none";
      frontEl.style.transition = "transform .3s cubic-bezier(.3,.6,.4,1), opacity .26s ease-in";
      frontEl.style.transform = (frontEl.dataset.baseTransform || "") + " translateY(-240px) rotate(-16deg)";
      frontEl.style.opacity = "0";
    }
    later(function () {
      if (isMine) state.collection.push(card);
      pack.revealedCount += 1;
      renderAll();
    }, REDUCE_MOTION ? 20 : 300);
  }

  document.getElementById("liveContent").addEventListener("click", function (e) {
    var packBtn = e.target.closest("[data-pack]");
    if (packBtn) {
      var idx = parseInt(packBtn.dataset.pack, 10);
      var ab = state.activeBreak;
      if (ab && ab.packs[idx] && ab.packs[idx].revealedCount < ab.packs[idx].cards.length) {
        ab.currentPackIndex = idx;
        renderAll();
      }
      return;
    }
    var tearBtn = e.target.closest("#tearPackBtn");
    if (tearBtn) {
      tearBtn.disabled = true;
      var pack3d = document.getElementById("pack3d");
      var introStage = document.getElementById("stageEl");
      if (pack3d) pack3d.classList.add("tearing");
      triggerFlash(introStage, true);
      spawnConfetti(introStage, 18, "var(--accent)");
      later(function () {
        var abNow = state.activeBreak;
        if (!abNow) return;
        abNow.packs[abNow.currentPackIndex].torn = true;
        renderAll();
      }, 620);
      return;
    }
    if (e.target.closest("#nextCardBtn")) { advanceStack(); return; }
    if (e.target.closest("#instantRipBoxBtn")) { instantRipBox(); return; }
    if (e.target.closest("#backToPacksBtn")) {
      if (state.activeBreak) state.activeBreak.currentPackIndex = null;
      renderAll();
      return;
    }
    if (e.target.closest("#backToShopBtn")) {
      state.activeBreak = null;
      switchTab("shop");
      renderAll();
      return;
    }
  });

  // Swipe the front card of the stack up to take it, same action as the button.
  (function attachStackSwipe(container) {
    var drag = null;
    container.addEventListener("pointerdown", function (e) {
      var front = e.target.closest(".stack-item--front");
      if (!front) return;
      drag = { el: front, startX: e.clientX, startY: e.clientY, base: front.dataset.baseTransform || "" };
      if (front.setPointerCapture) { try { front.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    });
    container.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = (e.clientX - drag.startX) * 0.25;
      var dy = Math.min(0, e.clientY - drag.startY);
      drag.el.style.transition = "none";
      drag.el.style.transform = drag.base + " translate(" + dx + "px," + dy + "px)";
    });
    function endDrag(e) {
      if (!drag) return;
      var dy = e.clientY - drag.startY;
      var el = drag.el, base = drag.base;
      drag = null;
      if (dy < -55) {
        advanceStack();
      } else {
        el.style.transition = "transform .2s ease-out";
        el.style.transform = base;
      }
    }
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
  })(document.getElementById("liveContent"));

  // Holographic tilt + glare: the card leans toward the pointer and a light sweep tracks
  // it, like tilting a real refractor under a lamp. Works for touch too since pointer
  // events unify mouse/pen/touch.
  (function attachCardTilt(container) {
    container.addEventListener("pointermove", function (e) {
      var face = e.target.closest(".card-face");
      if (!face || !container.contains(face)) return;
      var r = face.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var rx = (0.5 - py) * 16;
      var ry = (px - 0.5) * 16;
      face.style.setProperty("--tiltX", rx.toFixed(2) + "deg");
      face.style.setProperty("--tiltY", ry.toFixed(2) + "deg");
      face.style.setProperty("--glareX", (px * 100).toFixed(1) + "%");
      face.style.setProperty("--glareY", (py * 100).toFixed(1) + "%");
      face.classList.add("tilting");
    });
    container.addEventListener("pointerout", function (e) {
      var face = e.target.closest(".card-face");
      if (!face) return;
      var to = e.relatedTarget;
      if (to && face.contains(to)) return;
      face.classList.remove("tilting");
    });
  })(document.getElementById("liveContent"));

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
    var hadController = !!navigator.serviceWorker.controller;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* ignore — app still works, just not offline/installable */ });
    });
    // The service worker caches the app aggressively for offline use, so an already-open
    // tab (or an installed PWA someone hasn't reopened in a while) can be stuck showing an
    // old cached version even after a new one has shipped. skipWaiting()/clients.claim() in
    // sw.js mean the new worker takes over automatically — this just tells the player when
    // that's happened so they know to reload for the update instead of wondering why a new
    // feature isn't there.
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) { hadController = true; return; }
      showUpdateToast();
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
