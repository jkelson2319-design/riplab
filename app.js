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

  // Flat value range for ordinary base cards (every card that isn't a pack's hit slot).
  var BASE_CARD_VALUE = [1, 8];
  // Hit-slot cards always start from this baseline, then scale up by parallel/autograph tier.
  var HIT_CARD_VALUE = [120, 400];

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
      valueScale: 1, guaranteedAutographs: 0,
      caseHitP: 1 / 150, baseAutoP: 1 / 100, colorAutoP: 1 / 400,
      packOdds: { refractor: 3, rookieRefractor: 8, green: 16, blue: 35, orange: 70, gold: 140, red: 350, black: 700, superfractor: 3500 }
    },
    {
      id: "hobby", tier: "HOBBY", name: "Hobby",
      boxPrice: 250, casePrice: 3000, boxesPerCase: 12,
      packsPerBox: 12, cardsPerPack: 6, cardsPerBox: 72,
      blurb: "The main premium format — noticeably better refractor and autograph odds, one autograph guaranteed.",
      valueScale: 2.5, guaranteedAutographs: 1,
      caseHitP: 1 / 96, baseAutoP: 1 / 60, colorAutoP: 1 / 70,
      packOdds: { refractor: 2, rookieRefractor: 5, green: 8, blue: 18, orange: 35, gold: 70, red: 175, black: 350, superfractor: 1750 }
    },
    {
      id: "jumbo", tier: "JUMBO", name: "Jumbo Hobby",
      boxPrice: 600, casePrice: 4800, boxesPerCase: 8,
      packsPerBox: 16, cardsPerPack: 8, cardsPerBox: 128,
      blurb: "The most loaded format on the shelf — a refractor in every pack and two autographs guaranteed.",
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
    return {
      id: uid(), team: team, player: player.name, pos: player.pos,
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

  // A pack's hit-slot card: refractor / autograph / case hit. Its value comes entirely
  // from the parallel + autograph multipliers on top of the hit baseline, not from any
  // common/uncommon/rare/epic/legendary roll — every hit card starts from the same place.
  function makeHitCard(format, tag, isAutograph, requiresRookie) {
    var team = pick(TEAMS);
    var player = pickHitPlayer(team, requiresRookie);
    var posMult = POSITION_VALUE_MULT[player.pos] || 1;
    var colorMult = PARALLEL_VALUE_MULT[tierValueKey(tag)] || 1;
    var mult = format.valueScale * posMult * colorMult * (isAutograph ? AUTOGRAPH_VALUE_MULT : 1);
    var lo = Math.max(1, Math.round(HIT_CARD_VALUE[0] * mult));
    var hi = Math.max(lo, Math.round(HIT_CARD_VALUE[1] * mult));
    return {
      id: uid(), team: team, player: player.name, pos: player.pos,
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
      var color = rollLadder(format.autoColorLadder) || "Green Refractor";
      tag = color === "Superfractor 1/1" ? "Superfractor Autograph 1/1" : color + " Autograph";
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
    return packs.map(function (p) { return { cards: p.cards, revealedCount: 0 }; });
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

  function oddsChips(f) {
    var autographOdds = Math.round(1 / (f.baseAutoP + f.colorAutoP));
    var chips = [
      "Refractor 1:" + f.packOdds.refractor,
      "Rookie Refractor 1:" + f.packOdds.rookieRefractor,
      "Autograph 1:" + autographOdds.toLocaleString(),
      "Superfractor 1:" + f.packOdds.superfractor.toLocaleString()
    ];
    return chips.map(function (c) { return '<span class="odds-chip">' + c + '</span>'; }).join("");
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
            '<div class="odds-row">' + oddsChips(f) + '</div>' +
            '<div class="break-card__foot">' + btn + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  // What the top-center pill shows: BASE for filler cards, otherwise the hit category.
  function cardBadge(card) {
    if (!card.tag) return { label: "BASE", color: "var(--surface-2)" };
    if (card.tag === "Case Hit") return { label: "CASE HIT", color: "#8a3fd6" };
    if (card.tag.indexOf("Autograph") !== -1) return { label: "AUTOGRAPH", color: "#d4af37" };
    return { label: "PARALLEL", color: "var(--accent)" };
  }

  function cardFaceClasses(card, isMine, size) {
    return "card-face" + (size ? " card-face--" + size : "") + (isMine ? " mine" : "") +
      (card.tag ? " legendary" : "") + (REFRACTOR_COLORS[card.tag] ? " refractor" : "") +
      (card.value >= 1000 ? " mega-hit" : "");
  }

  function cardInnerHTML(card, isMine) {
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
    var refractorBg = REFRACTOR_COLORS[card.tag];
    var styleAttr = refractorBg ? ' style="background:' + refractorBg + '"' : '';
    return '<div class="' + cardFaceClasses(card, isMine, size) + '"' + styleAttr + '>' + cardInnerHTML(card, isMine) + '</div>';
  }

  function packGridHTML(ab, format) {
    var tiles = ab.packs.map(function (p, i) {
      var done = p.revealedCount >= p.cards.length;
      var multiBox = ab.packs.length > format.packsPerBox;
      var label = multiBox
        ? "Box " + (Math.floor(i / format.packsPerBox) + 1) + " · Pack " + ((i % format.packsPerBox) + 1)
        : "Pack " + (i + 1);
      return (
        '<button class="pack-tile' + (done ? ' opened' : '') + '" data-pack="' + i + '"' + (done ? ' disabled' : '') + '>' +
          '<span class="pack-tile__icon">' + (done ? "📭" : "📦") + '</span>' +
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

  // All of a pack's cards fan out at once (Arena-Club style) instead of one flip at a time.
  // Any $1,000+ card gets a permanent pulsing glow (via cardFaceClasses) plus its own
  // "huge hit" callout above the fan.
  function fanRevealHTML(ab, pack) {
    var wholeBox = ab.yourTeam === null;
    var kept = pack.cards.filter(function (c) { return wholeBox || c.team === ab.yourTeam; });
    var keptValue = kept.reduce(function (s, c) { return s + c.value; }, 0);
    var megaHTML = pack.cards.filter(function (c) { return c.value >= 1000; }).map(function (c) {
      return '<div class="fan-mega-callout">💰 HUGE HIT!! ' + c.player + ' — ' + money(c.value) + '!!</div>';
    }).join("");
    var mid = (pack.cards.length - 1) / 2;
    var items = pack.cards.map(function (card, i) {
      var isMine = wholeBox || card.team === ab.yourTeam;
      var off = i - mid;
      var rot = (off * 9).toFixed(1) + "deg";
      var tx = Math.round(off * 44) + "px";
      var ty = Math.round(Math.abs(off) * 7) + "px";
      var z = Math.round(100 - Math.abs(off));
      return (
        '<div class="fan-item" data-fan-x="' + tx + '" data-fan-y="' + ty + '" data-fan-rot="' + rot + '" style="z-index:' + z + '">' +
          cardFaceHTML(card, isMine, "sm") +
        '</div>'
      );
    }).join("");
    var recapLine = wholeBox ? "Every card is yours." : kept.length + " of " + pack.cards.length + " matched " + ab.yourTeam + ".";
    return (
      '<div class="stage fan-stage" id="stageEl">' +
        '<div class="stage-flash"></div>' +
        '<h3 class="pack-intro-title">Pack ' + (ab.currentPackIndex + 1) + ' Complete</h3>' +
        megaHTML +
        '<div class="fan-wrap" id="fanWrap">' + items + '</div>' +
        '<div class="fan-value">' + recapLine + ' Value <span class="fan-value__amt">' + money(keptValue) + '</span></div>' +
        '<button class="btn btn-primary" id="backToPacksBtn">Back to Packs</button>' +
      '</div>'
    );
  }

  function packRipHTML(ab) {
    var pack = ab.packs[ab.currentPackIndex];
    if (pack.revealedCount >= pack.cards.length) return fanRevealHTML(ab, pack);
    return packIntroHTML(ab);
  }

  // Staggers each fanned card from a hidden stack into its resting position/rotation.
  function animateFanIn(root) {
    var items = root.querySelectorAll(".fan-item");
    items.forEach(function (item, i) {
      later(function () {
        item.style.transform = "translate(" + item.dataset.fanX + ", " + item.dataset.fanY + ") rotate(" + item.dataset.fanRot + ")";
        item.style.opacity = "1";
      }, REDUCE_MOTION ? 0 : i * 90);
    });
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

    if (document.getElementById("fanWrap")) animateFanIn(content);
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
      var badge = cardBadge(c);
      return (
        '<tr>' +
          '<td><span class="rarity-dot" style="background:' + badge.color + '"></span>' + badge.label + '</td>' +
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
    });
    ab.currentPackIndex = null;
    renderAll();
  }

  // Reveals every card in a torn pack at once (fan) and collects the matching ones.
  // Returns true if the pack contains a $1,000+ mega hit, so the caller can fire the
  // one-time celebration burst once the fan has finished settling into place.
  function collectPack(pack, ab) {
    var wholeBox = ab.yourTeam === null;
    var hasMega = false;
    for (var i = 0; i < pack.cards.length; i++) {
      var card = pack.cards[i];
      if (card.value >= 1000) hasMega = true;
      if (wholeBox || card.team === ab.yourTeam) state.collection.push(card);
    }
    pack.revealedCount = pack.cards.length;
    return hasMega;
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
        var pack = abNow.packs[abNow.currentPackIndex];
        var hasMega = collectPack(pack, abNow);
        renderAll();
        if (hasMega) {
          later(function () {
            var fanStage = document.getElementById("stageEl");
            if (!fanStage) return;
            spawnConfetti(fanStage, 42, "#ffd54a", true);
            triggerFlash(fanStage, true);
          }, (REDUCE_MOTION ? 0 : pack.cards.length * 90) + 350);
        }
      }, 620);
      return;
    }
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
