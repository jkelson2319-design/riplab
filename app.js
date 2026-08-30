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

  var HIT_TAGS = ["Rookie Auto","Patch Auto","On-Card Auto","Game-Worn Relic","1-of-1 Print Plate","Gold Refractor","Case Hit"];

  var RARITY_META = {
    common:    { label: "Common",    value: [1, 5] },
    uncommon:  { label: "Uncommon",  value: [5, 15] },
    rare:      { label: "Rare",      value: [15, 45] },
    epic:      { label: "Epic",      value: [45, 120] },
    legendary: { label: "Legendary", value: [120, 400] }
  };
  var RARITY_ORDER = ["common","uncommon","rare","epic","legendary"];

  var PRODUCT_NAME = "RLFL Debut Chrome";

  var FORMATS = [
    {
      id: "retail", tier: "RETAIL", name: "Retail",
      boxPrice: 40, casePrice: 800, boxesPerCase: 20, cardsPerBox: 10,
      blurb: "The entry point. Ten cards a box, honest odds, nothing guaranteed.",
      odds: { common: .60, uncommon: .26, rare: .10, epic: .03, legendary: .01 },
      guaranteedHit: false, valueScale: 1
    },
    {
      id: "hobby", tier: "HOBBY", name: "Hobby",
      boxPrice: 250, casePrice: 3000, boxesPerCase: 12, cardsPerBox: 16,
      blurb: "Sixteen cards a box with noticeably better odds — and noticeably bigger hits.",
      odds: { common: .46, uncommon: .28, rare: .16, epic: .07, legendary: .03 },
      guaranteedHit: false, valueScale: 2.5
    },
    {
      id: "jumbo", tier: "JUMBO", name: "Jumbo",
      boxPrice: 600, casePrice: 4800, boxesPerCase: 8, cardsPerBox: 24,
      blurb: "Twenty-four cards a box, the best odds on the shelf, and at least one Epic+ guaranteed per box.",
      odds: { common: .30, uncommon: .27, rare: .21, epic: .14, legendary: .08 },
      guaranteedHit: true, valueScale: 5
    }
  ];

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

  function makeCard(rarity, format) {
    var range = RARITY_META[rarity].value;
    var team = pick(TEAMS);
    var player = pick(activeSet.roster[team]);
    var posMult = POSITION_VALUE_MULT[player.pos] || 1;
    var scale = format.valueScale * posMult;
    var lo = Math.max(1, Math.round(range[0] * scale));
    var hi = Math.max(lo, Math.round(range[1] * scale));
    var card = {
      id: uid(),
      team: team,
      rarity: rarity,
      player: player.name,
      pos: player.pos,
      tag: (rarity === "epic" || rarity === "legendary") ? pick(HIT_TAGS) : null,
      value: rand(lo, hi)
    };
    return card;
  }

  function generateBoxCards(format) {
    var cards = [];
    var hasEpicPlus = false;
    for (var i = 0; i < format.cardsPerBox; i++) {
      var rarity = pickRarity(format.odds);
      if (rarity === "epic" || rarity === "legendary") hasEpicPlus = true;
      cards.push(makeCard(rarity, format));
    }
    if (format.guaranteedHit && !hasEpicPlus) {
      cards[cards.length - 1] = makeCard(Math.random() < 0.25 ? "legendary" : "epic", format);
    }
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
  function calloutHTML(card, isMine, wholeBox) {
    var main = fmt(pick(CALLOUTS[card.rarity]), card);
    var sub = wholeBox
      ? "Personal break — every card is yours."
      : (isMine ? "Matches your team — keeping it." : "Not your team — ships to another spot.");
    return '<div class="callout-main">' + main + '</div><div class="callout-sub">' + sub + '</div>';
  }
  var pendingTimers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); pendingTimers.push(id); return id; }
  function spawnConfetti(container, count, rarity) {
    if (REDUCE_MOTION || !container) return;
    var colors = [rarityColorVar(rarity), "var(--accent)", "var(--accent-2)"];
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
  function triggerFlash(stageEl) {
    if (REDUCE_MOTION || !stageEl) return;
    var flash = stageEl.querySelector(".stage-flash");
    if (!flash) return;
    flash.classList.remove("active");
    void flash.offsetWidth;
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
            '<p class="section-sub">' + f.cardsPerBox + ' cards/box · ' + f.boxesPerCase + ' boxes/case (' + money(f.casePrice) + ') · ' + TEAMS.length + '-team checklist' + (f.guaranteedHit ? ' · guaranteed Epic+/box' : '') + '</p>' +
            '<div class="odds-row">' + oddsChips(f.odds) + '</div>' +
            '<div class="break-card__foot">' + btn + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function rarityColorVar(rarity) { return "var(--rarity-" + rarity + ")"; }

  function cardFaceHTML(card, isMine, size) {
    var classes = "card-face" + (size ? " card-face--" + size : "") + (isMine ? " mine" : "") + (card.rarity === "legendary" ? " legendary" : "");
    return (
      '<div class="' + classes + '">' +
        '<div class="pos-silhouette">' + positionSilhouette(card.pos) + '</div>' +
        '<div class="card-face__top">' +
          '<span class="rarity-tag" style="background:' + rarityColorVar(card.rarity) + '">' + RARITY_META[card.rarity].label + '</span>' +
          teamCrestHTML(card.team) +
        '</div>' +
        '<div><div class="team">' + card.team + '</div><div class="player">' + card.player + (card.pos ? ' <span class="pos-tag">' + card.pos + '</span>' : '') + '</div>' +
        (card.tag ? '<div class="cardtag">' + card.tag + '</div>' : '') + '</div>' +
        '<div style="display:flex; align-items:center; justify-content:space-between;">' +
          (isMine ? '<span class="mine-flag">YOURS</span>' : '<span></span>') +
          '<span class="value mono">' + money(card.value) + '</span>' +
        '</div>' +
      '</div>'
    );
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
    document.getElementById("pickModalSub").textContent = f.cardsPerBox + " cards/box · " + f.boxesPerCase + " boxes/case · pick how you buy in";
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

    spotlight.classList.add("shaking");

    later(function () {
      spotlight.className = "spotlight-card card-face" + (isMine ? " mine" : "") + (card.rarity === "legendary" ? " legendary" : "") + " revealed";
      spotlight.innerHTML =
        '<div class="pos-silhouette">' + positionSilhouette(card.pos) + '</div>' +
        '<div class="card-face__top">' +
          '<span class="rarity-tag" style="background:' + rarityColorVar(card.rarity) + '">' + RARITY_META[card.rarity].label + '</span>' +
          teamCrestHTML(card.team) +
        '</div>' +
        '<div><div class="team">' + card.team + '</div><div class="player">' + card.player + (card.pos ? ' <span class="pos-tag">' + card.pos + '</span>' : '') + '</div>' +
        (card.tag ? '<div class="cardtag">' + card.tag + '</div>' : '') + '</div>' +
        '<div style="display:flex; align-items:center; justify-content:space-between;">' +
          (isMine ? '<span class="mine-flag">YOURS</span>' : '<span></span>') +
          '<span class="value mono">' + money(card.value) + '</span>' +
        '</div>';
      if (slot) slot.classList.add("lifted");
      if (callout) callout.innerHTML = calloutHTML(card, isMine, wholeBox);
      if (big && avatarWrap) avatarWrap.classList.add("hype");
      if (big) spawnConfetti(stageEl, card.rarity === "legendary" ? 26 : 12, card.rarity);
      if (card.rarity === "legendary") triggerFlash(stageEl);

      later(function () {
        if (avatarWrap) avatarWrap.classList.remove("hype");
        done();
      }, timing.hold);
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
