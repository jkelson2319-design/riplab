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

  var BREAKS = [
    {
      id: "blaster", tier: "TIER I", name: "Retail Blaster", cards: 10, price: 25,
      blurb: "Ten cards, low stakes. Honest odds, nothing guaranteed.",
      odds: { common: .58, uncommon: .25, rare: .12, epic: .04, legendary: .01 },
      guaranteedHit: false
    },
    {
      id: "hobby", tier: "TIER II", name: "Hobby Box", cards: 16, price: 60,
      blurb: "Sixteen cards with noticeably better odds at a real hit.",
      odds: { common: .50, uncommon: .27, rare: .15, epic: .06, legendary: .02 },
      guaranteedHit: false
    },
    {
      id: "mega", tier: "TIER III", name: "Mega Case", cards: 24, price: 150,
      blurb: "Twenty-four cards, the best odds in the shop, and at least one Epic+ guaranteed.",
      odds: { common: .38, uncommon: .28, rare: .17, epic: .11, legendary: .06 },
      guaranteedHit: true
    }
  ];

  var STORAGE_KEY = "break-room-save-v1";
  var state = loadState();
  var pendingBreak = null; // break being configured in the modal

  function loadState() {
    var def = { cash: 500, collection: [], stats: { breaksOpened: 0, totalSpent: 0 }, activeBreak: null };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return def;
      var parsed = JSON.parse(raw);
      if (typeof parsed.cash !== "number") return def;
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

  function makeCard(rarity) {
    var range = RARITY_META[rarity].value;
    var team = pick(TEAMS);
    var player = pick(activeSet.roster[team]);
    var card = {
      id: uid(),
      team: team,
      rarity: rarity,
      player: player.name,
      pos: player.pos,
      tag: (rarity === "epic" || rarity === "legendary") ? pick(HIT_TAGS) : null,
      value: rand(range[0], range[1])
    };
    return card;
  }

  function generateBreakCards(breakDef) {
    var cards = [];
    var hasEpicPlus = false;
    for (var i = 0; i < breakDef.cards; i++) {
      var rarity = pickRarity(breakDef.odds);
      if (rarity === "epic" || rarity === "legendary") hasEpicPlus = true;
      cards.push(makeCard(rarity));
    }
    if (breakDef.guaranteedHit && !hasEpicPlus) {
      var forced = makeCard(Math.random() < 0.25 ? "legendary" : "epic");
      cards[cards.length - 1] = forced;
    }
    return cards;
  }

  function findBreak(id) {
    for (var i = 0; i < BREAKS.length; i++) if (BREAKS[i].id === id) return BREAKS[i];
    return null;
  }

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
    return BREAKS.reduce(function (min, b) { return Math.min(min, b.price); }, Infinity);
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

    grid.innerHTML = BREAKS.map(function (b) {
      var btn = locked
        ? '<button class="btn btn-block" data-goto-live="1">Break In Progress →</button>'
        : '<button class="btn btn-primary btn-block" data-buy="' + b.id + '">Buy In — ' + money(b.price) + '</button>';
      return (
        '<div class="break-card">' +
          '<div class="break-card__band"><span class="tier">' + b.tier + '</span><span class="price">' + money(b.price) + '</span></div>' +
          '<div class="break-card__body">' +
            '<h3>' + b.name + '</h3>' +
            '<p>' + b.blurb + '</p>' +
            '<p class="section-sub">' + b.cards + ' cards · ' + TEAMS.length + '-team checklist' + (b.guaranteedHit ? ' · guaranteed Epic+' : '') + '</p>' +
            '<div class="odds-row">' + oddsChips(b.odds) + '</div>' +
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
        '<span class="rarity-tag" style="background:' + rarityColorVar(card.rarity) + '">' + RARITY_META[card.rarity].label + '</span>' +
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

    var breakDef = findBreak(ab.breakId);
    var revealed = ab.revealedCount;
    var total = ab.cards.length;
    var done = revealed >= total;

    var wholeBox = ab.yourTeam === null;
    sub.textContent = wholeBox ? breakDef.name + " · personal break, whole box" : breakDef.name + " · your team: " + ab.yourTeam;

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
            '</div>' +
          '</div>' +
        '</div>';
    } else {
      var kept = ab.cards.filter(function (c) { return wholeBox || c.team === ab.yourTeam; });
      var keptValue = kept.reduce(function (s, c) { return s + c.value; }, 0);
      var net = keptValue - ab.price;
      var recapLine = wholeBox
        ? "It's your whole box — all " + total + " cards went into your collection."
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
      '<div class="live-header"><span class="your-team-badge">' + (wholeBox ? "📦 Personal Break — whole box is yours" : "🎯 " + ab.yourTeam) + '</span></div>' +
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
  function openModal(breakId) {
    var b = findBreak(breakId);
    if (!b) return;
    pendingBreak = b;
    document.getElementById("pickModalTitle").textContent = b.name;
    document.getElementById("pickModalSub").textContent = b.cards + " cards · pick how you buy in";
    document.getElementById("randomPrice").textContent = money(b.price);
    var choosePrice = Math.round(b.price * 1.6);
    document.getElementById("chooseTeamPrice").textContent = money(choosePrice);
    var sel = document.getElementById("teamSelect");
    sel.innerHTML = TEAMS.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join("");
    var soloPrice = b.price * TEAMS.length;
    document.getElementById("soloPrice").textContent = money(soloPrice);
    document.getElementById("confirmRandomBtn").disabled = state.cash < b.price;
    document.getElementById("confirmChooseBtn").disabled = state.cash < choosePrice;
    document.getElementById("confirmSoloBtn").disabled = state.cash < soloPrice;
    backdrop.hidden = false;
  }
  function closeModal() { backdrop.hidden = true; pendingBreak = null; }

  function startBreak(yourTeam, price) {
    var b = pendingBreak;
    state.cash -= price;
    state.stats.totalSpent += price;
    state.stats.breaksOpened += 1;
    state.activeBreak = {
      breakId: b.id,
      yourTeam: yourTeam,
      price: price,
      cards: generateBreakCards(b),
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
  document.getElementById("confirmRandomBtn").addEventListener("click", function () {
    if (!pendingBreak) return;
    startBreak(pick(TEAMS), pendingBreak.price);
  });
  document.getElementById("confirmSoloBtn").addEventListener("click", function () {
    if (!pendingBreak) return;
    startBreak(null, pendingBreak.price * TEAMS.length);
  });
  document.getElementById("confirmChooseBtn").addEventListener("click", function () {
    if (!pendingBreak) return;
    var team = document.getElementById("teamSelect").value;
    startBreak(team, Math.round(pendingBreak.price * 1.6));
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
        '<span class="rarity-tag" style="background:' + rarityColorVar(card.rarity) + '">' + RARITY_META[card.rarity].label + '</span>' +
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

  document.getElementById("liveContent").addEventListener("click", function (e) {
    if (e.target.closest("#ripNextBtn")) { revealNext(); return; }
    if (e.target.closest("#ripAllBtn")) {
      autoRipping = !autoRipping;
      if (autoRipping) revealNext(); else renderAll();
      return;
    }
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
    state = { cash: 500, collection: [], stats: { breaksOpened: 0, totalSpent: 0 }, activeBreak: null };
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
