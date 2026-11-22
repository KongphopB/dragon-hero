(function (global) {
  var DH = global.DH = global.DH || {};

  var charDraft = JSON.parse(localStorage.getItem("dh_solo_char") || "null") || {
    name: "นักผจญภัย",
    job: "warrior",
    look: { skin: 0, hair: 1, hairColor: 0, outfit: 0, hat: 0 },
    timed: true
  };
  // Characters saved before the v2 creator get upgraded to the new look format once.
  if (DH.AVATAR && (!charDraft.look || charDraft.look.v !== 2)) {
    charDraft.look = DH.AVATAR.normalize(charDraft.look, charDraft.job);
    try { localStorage.setItem("dh_solo_char", JSON.stringify(charDraft)); } catch (e) { /* ignore */ }
  }

  var g = null;
  var tmr = null;
  var EXHAUSTED_MULT = 0.5;
  var SAVE_KEY = "dh_solo_run";
  // Phases worth resuming after a refresh; LOBBY/SUMMARY just start fresh.
  var RESUMABLE = ["INTRO", "ENCOUNTER", "QUESTION", "REVEAL", "BATTLE", "MON_DEFEAT", "MON_ESCAPE", "VICTORY", "DEFEAT"];
  var lastSave = 0;
  var onRender = function () {};
  var onTick = function () {};

  function saveChar() {
    localStorage.setItem("dh_solo_char", JSON.stringify(charDraft));
  }

  function stopTimer() {
    if (tmr) { clearInterval(tmr); tmr = null; }
  }

  function initStage(idx) {
    var st = DH.STAGES[idx];
    var maxHp = Math.round(st.count * st.baseDmg * st.hpFactor);
    if (st.isBoss && g.bossBonusHp > 0) maxHp += g.bossBonusHp;
    var hp = maxHp;
    g.monster = {
      id: st.monsterId,
      name: st.name,
      subtitle: st.subtitle,
      bg: st.bg,
      sprite: st.sprite,
      hp: hp,
      maxHp: maxHp,
      isBoss: !!st.isBoss,
      phase: 1,
      count: st.count,
      baseDmg: st.baseDmg
    };
    g.qInStage = 0;
    // Hearts carry over between stages: only the heal card and the priest's ultimate restore them.
    g.knightShieldUsed = false;
  }

  function updateBossPhase() {
    var m = g.monster;
    if (!m.isBoss) return;
    var r = m.hp / Math.max(1, m.maxHp);
    if (r > 0.66) m.phase = 1;
    else if (r > 0.33) m.phase = 2;
    else m.phase = 3;
  }

  function pickQuestion() {
    var stNum = DH.STAGES[g.stageIdx].stage;
    var pool = DH.QUESTIONS.filter(function (q) { return q.stage === stNum; });
    var picked = DH.Adaptive.pick(pool, g.usedQids, g.mistakes);
    g.usedQids.push(picked.q.id);
    g.curFocus = picked.focusCode;
    return picked.q;
  }

  function enterLobby() {
    stopTimer();
    g = {
      phase: "LOBBY",
      stageIdx: 0,
      qInStage: 0,
      qGlobal: 0,
      score: 0,
      streak: 0,
      hearts: 3,
      maxHearts: 3,
      cards: []
    };
    onRender();
  }

  function newRun(startStageIdx) {
    stopTimer();
    startStageIdx = startStageIdx || 0;
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var extra = DH.ALL_CARDS.filter(function (c) { return c !== jb.startCard; });
    var c2 = extra[Math.floor(Math.random() * extra.length)];
    g = {
      phase: "INTRO",
      stageIdx: startStageIdx,
      qInStage: 0,
      qGlobal: 0,
      score: 0,
      streak: 0,
      hearts: 3,
      maxHearts: 3,
      cards: [jb.startCard, c2],
      intent: null,
      ult: 0,
      ultArmed: false,
      fortress: 0,
      draft: null,
      draftPicked: null,
      cardMsg: "",
      usedQids: [],
      mistakes: {},
      topicStats: {},
      qLog: [],
      curFocus: null,
      accSum: 0,
      qTotal: 0,
      bossBonusHp: 0,
      knightShieldUsed: false,
      monster: null,
      curQ: null,
      armedCard: null,
      draftPlace: {},
      timeLeft: 0,
      timeTotal: 25,
      frozenLeft: 0,
      secondChanceUsed: false,
      secondChanceRetries: 0,
      secondChanceMsg: "",
      lastRes: null,
      revLeft: 10,
      revPaused: false,
      defeatFate: Math.random() < 0.5 ? "burn" : "eat",
      result: null,
      startedAt: Date.now()
    };
    initStage(startStageIdx);
    if (startStageIdx > 0) {
      enterEncounter();
    } else {
      g.phase = "INTRO";
      g.introLeft = 7.0;
      onRender();
      tmr = setInterval(function () {
        if (!g || g.phase !== "INTRO") { stopTimer(); return; }
        g.introLeft = Math.max(0, g.introLeft - 0.1);
        onTick();
        if (g.introLeft <= 0) {
          stopTimer();
          enterEncounter();
        }
      }, 100);
    }
  }

  function enterEncounter() {
    stopTimer();
    g.phase = "ENCOUNTER";
    if (g.monster.isBoss) DH.SFX.roar();
    onRender();
  }

  // ---------- Monster intents ----------
  function rollIntent() {
    // The very first question of a run is a gentle opening so new players see a good intent first.
    if (g.stageIdx === 0 && g.qGlobal === 1) return "open";
    var table = DH.MONSTER_INTENTS[g.monster.id] || { open: 1, heavy: 1 };
    var pick = function () {
      var total = 0, k;
      for (k in table) total += table[k];
      var r = Math.random() * total;
      for (k in table) { r -= table[k]; if (r <= 0) return k; }
      return Object.keys(table)[0];
    };
    var id = pick();
    if (id === g.intent) id = pick(); // avoid long repeats
    return id;
  }

  function startQuestion() {
    stopTimer();
    g.qInStage++;
    g.qGlobal++;
    g.curQ = pickQuestion();
    g.phase = "QUESTION";
    g.intent = rollIntent();
    g.armedCard = null;
    g.ultArmed = false;
    g.draftPlace = {};
    g.timeTotal = g.curQ.tm || 25;
    g.hasteLost = 0;
    if (g.intent === "haste") {
      g.hasteLost = Math.round(g.timeTotal * 0.3);
      g.timeTotal -= g.hasteLost;
    }
    g.timeLeft = g.timeTotal;
    g.frozenLeft = 0;
    g.secondChanceUsed = false;
    g.secondChanceRetries = 0;
    g.secondChanceMsg = "";
    g.cardMsg = "";
    onRender();
    runQuestionTimer();
  }

  function runQuestionTimer() {
    stopTimer();
    if (charDraft.timed) {
      tmr = setInterval(function () {
        if (!g || g.phase !== "QUESTION") { stopTimer(); return; }
        if (g.frozenLeft > 0) {
          g.frozenLeft = Math.max(0, g.frozenLeft - 0.1);
          onTick();
          return;
        }
        g.timeLeft = Math.max(0, g.timeLeft - 0.1);
        onTick();
        if (g.timeLeft <= 0) {
          stopTimer();
          submitAnswer(true, g.draftPlace);
        }
      }, 100);
    }
  }

  // ---------- Cards and ultimates ----------
  function useCard(idx) {
    if (!g || g.phase !== "QUESTION" || g.armedCard) return;
    var cid = g.cards.splice(idx, 1)[0];
    if (!cid) return;
    g.armedCard = cid;
    DH.SFX.card();
    if (cid === "freeze") {
      g.frozenLeft = 10;
      if (g.hasteLost) {
        g.timeLeft += g.hasteLost;
        g.timeTotal += g.hasteLost;
        g.hasteLost = 0;
        g.cardMsg = "❄️ ลบผลเร่งเวลาของมอนแล้ว + แช่แข็งนาฬิกา 10 วินาที";
      }
    }
    if (cid === "heal") {
      var before = g.hearts;
      g.hearts = Math.min(g.maxHearts, g.hearts + (charDraft.job === "priest" ? 2 : 1));
      g.cardMsg = g.hearts > before ? "💚 ฟื้นหัวใจ +" + (g.hearts - before) : "💚 หัวใจเต็มอยู่แล้ว · ถ้าตอบถูกยังได้ดาเมจ +15%";
    }
    onRender();
  }

  function useUltimate() {
    if (!g || g.phase !== "QUESTION" || g.ultArmed || (g.ult || 0) < DH.ULT_MAX) return;
    g.ultArmed = true;
    g.ult = 0;
    DH.SFX.card();
    DH.SFX.hit();
    if (charDraft.job === "priest") g.hearts = g.maxHearts;
    if (charDraft.job === "knight") g.fortress = 2;
    onRender();
  }

  function submitAnswer(timedOut, place) {
    var q = g.curQ;
    var res = DH.Grading.gradeAnswer(q, place);

    if (!timedOut && g.armedCard === "second_chance" && !g.secondChanceUsed && res.acc < 0.999) {
      g.secondChanceUsed = true;
      g.secondChanceRetries = 1;
      g.secondChanceMsg = "🔁 โอกาสที่สอง! จุดที่ยังไม่ถูก: " + res.wrongItems.join(", ") + " — แก้แล้วส่งใหม่ได้เลย!";
      onRender();
      return;
    }

    stopTimer();
    var card = g.armedCard;
    var job = charDraft.job;
    var ult = g.ultArmed ? job : null;
    var intent = g.intent;
    var m = g.monster;
    var base = m.baseDmg;
    var full = res.acc >= 0.999;
    var half = res.acc >= 0.5;

    // --- hearts and streak: what protects you this turn
    var lost = 0;
    var protectedBy = null;
    if (!half) {
      var wouldLose = intent === "heavy" ? 2 : 1;
      if (card === "shield") protectedBy = "shield";
      else if (g.fortress > 0) { g.fortress--; protectedBy = "fortress"; }
      else if (job === "knight" && !g.knightShieldUsed) { g.knightShieldUsed = true; protectedBy = "knight"; }
      if (!protectedBy) lost = wouldLose;
    }
    if (full) g.streak++;
    else if (!(card === "shield" || protectedBy)) g.streak = 0;
    var shieldSaved = !!protectedBy;

    // --- damage
    var remRatio = charDraft.timed ? Math.max(0, Math.min(1, g.timeLeft / Math.max(1, g.timeTotal))) : 0.4;
    var maxSpd = job === "archer" ? 0.6 : 0.5;
    if (ult === "archer") remRatio = 1;
    var sSpeed = half ? (1 + maxSpd * remRatio) : 1;
    var mStreak = g.streak >= 5 ? 1.2 : (g.streak >= 3 ? 1.1 : (g.streak >= 2 ? 1.05 : 1));
    var mClass = (job === "warrior" && g.streak >= 3) ? 1.15 : 1;
    var dmg = 0;

    if (card === "double") {
      if (full) dmg = Math.round(base * sSpeed * mClass * 2 * mStreak);
      else if (shieldSaved) dmg = 0;
      else dmg = -Math.round(base * 0.5);
    } else if (half) {
      var mCard = DH.CARD_MULT[card] || 1;
      if (card === "second_chance" && !g.secondChanceRetries) mCard = 1;
      dmg = Math.round(base * res.acc * sSpeed * mClass * mCard * mStreak);
    }

    var pierce = card === "breaker" || ult === "warrior" || ult === "archer";
    if (dmg > 0) {
      if (ult === "warrior") dmg = Math.round(dmg * 3);
      if (ult === "archer") dmg = Math.round(dmg * 1.6);
      if (ult === "knight" || ult === "priest") dmg = Math.round(dmg * 1.5);
      if (intent === "open") dmg = Math.round(dmg * 1.5);
      if (intent === "guard" && !pierce) dmg = Math.round(dmg * 0.5);
    }
    // Out of hearts = exhausted: every hit does half damage until healed (heal card / priest ultimate).
    var exhausted = g.hearts <= 0;
    if (exhausted && dmg > 0) dmg = Math.round(dmg * EXHAUSTED_MULT);
    // The meteor lands whatever the answer was.
    var meteor = ult === "mage" ? base * 2 : 0;
    dmg += meteor;

    g.hearts = Math.max(0, g.hearts - lost);
    g.heartsLost = (g.heartsLost || 0) + lost;

    g.score += dmg;
    g.accSum += res.acc;
    g.qTotal++;
    var tp = q.topic || "general";
    g.topicStats[tp] = g.topicStats[tp] || { ok: 0, total: 0 };
    g.topicStats[tp].total++;
    if (full) g.topicStats[tp].ok++;
    res.codes.forEach(function (c) { g.mistakes[c] = (g.mistakes[c] || 0) + 1; });
    g.qLog.push({
      stage: DH.STAGES[g.stageIdx].stage,
      acc: res.acc,
      codes: res.codes.slice(),
      focus: g.curFocus,
      fixedFocus: !!g.curFocus && res.codes.indexOf(g.curFocus) < 0 && half
    });

    var prevPhase = m.phase;
    if (dmg > 0) m.hp = Math.max(0, m.hp - dmg);

    // --- the monster's own move resolves after the blow
    var effect = null;
    if (m.hp > 0) {
      var regen = Math.round(m.maxHp * 0.15);
      if (intent === "charge" && dmg < base) effect = { type: "heal", amount: regen, why: "ชาร์จพลังสำเร็จ" };
      if (intent === "regen" && !full) effect = { type: "heal", amount: regen, why: "ฟื้นตัว" };
      if (effect) m.hp = Math.min(m.maxHp, m.hp + regen);
    }
    if (intent === "steal" && !half) {
      if (protectedBy) effect = { type: "blocked", why: "กันการขโมยไว้ได้" };
      else if (g.cards.length) {
        var si = Math.floor(Math.random() * g.cards.length);
        effect = { type: "stolen", card: g.cards.splice(si, 1)[0] };
      }
    }
    if (intent === "heavy" && !half && protectedBy) effect = { type: "blocked", why: "กันท่าโจมตีหนักไว้ได้" };
    if (intent === "guard" && dmg > 0 && pierce) effect = { type: "pierced" };

    updateBossPhase();
    var phaseUp = m.isBoss && m.hp > 0 && m.phase > prevPhase ? m.phase : 0;

    // --- ultimate gauge (not refilled on the turn it was spent)
    if (!ult) g.ult = Math.min(DH.ULT_MAX, (g.ult || 0) + (full ? 1 : (half ? 0.5 : 0)));

    g.lastRes = {
      timedOut: !!timedOut,
      acc: res.acc,
      outcome: shieldSaved && !half ? "shielded" : res.outcome,
      dmg: dmg,
      meteor: meteor,
      codes: res.codes,
      rows: res.rows,
      card: card,
      cardEarned: null,
      ult: ult,
      intent: intent,
      effect: effect,
      heartsLost: lost,
      protectedBy: protectedBy,
      exhausted: exhausted,
      nowExhausted: g.hearts <= 0,
      phaseUp: phaseUp,
      place: place,
      q: q
    };
    g.ultArmed = false;

    g.phase = "REVEAL";
    g.revLeft = 10;
    g.revPaused = false;
    onRender();
    runRevealTimer();
  }

  function runRevealTimer() {
    stopTimer();
    tmr = setInterval(function () {
      if (!g || g.phase !== "REVEAL") { stopTimer(); return; }
      if (g.revPaused) { onTick(); return; }
      g.revLeft = Math.max(0, g.revLeft - 0.1);
      onTick();
      if (g.revLeft <= 0) { stopTimer(); enterBattle(); }
    }, 100);
  }

  function enterBattle() {
    stopTimer();
    g.phase = "BATTLE";
    var out = g.lastRes.outcome;
    if (out === "correct" || out === "partial") DH.SFX.hit(); else DH.SFX.hurt();
    if (g.lastRes.phaseUp) setTimeout(function () { if (g && g.phase === "BATTLE") DH.SFX.roar(); }, 1150);
    onRender();
  }

  function afterBattle() {
    var m = g.monster;
    if (m.hp <= 0) {
      if (m.isBoss) { g.phase = "VICTORY"; g.result = "win"; DH.SFX.win(); onRender(); return; }
      g.draft = drawDraft(charDraft.job === "mage" ? 4 : 3);
      g.phase = "MON_DEFEAT";
      onRender();
      return;
    }
    if (g.qInStage >= m.count) {
      if (m.isBoss) { g.phase = "DEFEAT"; g.result = "lose"; DH.SFX.lose(); onRender(); return; }
      g.bossBonusHp += m.hp;
      g.phase = "MON_ESCAPE";
      onRender();
      return;
    }
    startQuestion();
  }

  // Pick-one-of-N card reward: distinct cards, at least one study card so help is always on offer.
  function drawDraft(n) {
    var pool = DH.ALL_CARDS.slice();
    var study = pool.filter(function (c) { return DH.CARDS[c].kind === "study"; });
    var out = [study[Math.floor(Math.random() * study.length)]];
    while (out.length < n) {
      var c = pool[Math.floor(Math.random() * pool.length)];
      if (out.indexOf(c) < 0) out.push(c);
    }
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function pickDraft(cid) {
    if (!g || !g.draft || g.draft.indexOf(cid) < 0) return;
    if (g.cards.length >= DH.HAND_MAX) g.cards.shift();
    g.cards.push(cid);
    g.draftPicked = cid;
    g.draft = null;
    DH.SFX.card();
    onRender();
  }

  function nextStage() {
    g.draft = null;
    g.draftPicked = null;
    if (g.stageIdx + 1 < DH.STAGES.length) {
      g.stageIdx++;
      initStage(g.stageIdx);
      enterEncounter();
    } else {
      g.phase = "SUMMARY";
      onRender();
    }
  }

  // ---------- Save / resume (a phone reload must not wipe a 15-minute run) ----------
  function saveRun(force) {
    try {
      if (!g || g.tutorial || RESUMABLE.indexOf(g.phase) < 0) {
        if (!g || g.phase === "SUMMARY" || g.phase === "LOBBY") localStorage.removeItem(SAVE_KEY);
        return;
      }
      var now = Date.now();
      if (!force && now - lastSave < 1000) return;
      lastSave = now;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, savedAt: now, g: g }));
    } catch (e) { /* storage full or blocked: the game still works, it just won't resume */ }
  }

  function getSavedRun() {
    try {
      var raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!raw || raw.v !== 1 || !raw.g || RESUMABLE.indexOf(raw.g.phase) < 0) return null;
      if (Date.now() - raw.savedAt > 3 * 24 * 3600 * 1000) return null; // stale after 3 days
      return raw;
    } catch (e) { return null; }
  }

  function discardSavedRun() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  function resumeRun() {
    var raw = getSavedRun();
    if (!raw) return false;
    stopTimer();
    g = raw.g;
    // Runs saved by an older version may hold cards that no longer exist (e.g. the old magnifier).
    var known = function (c) { return !!DH.CARDS[c]; };
    g.cards = (g.cards || []).filter(known);
    if (g.armedCard && !known(g.armedCard)) g.armedCard = null;
    if (g.lastRes && g.lastRes.card && !known(g.lastRes.card)) g.lastRes.card = null;
    if (g.draft) g.draft = g.draft.filter(known);
    g.ult = g.ult || 0;
    g.fortress = g.fortress || 0;
    if (g.phase === "INTRO") { enterEncounter(); return true; }
    onRender();
    if (g.phase === "QUESTION") runQuestionTimer();
    else if (g.phase === "REVEAL") runRevealTimer();
    return true;
  }

  DH.Game = {
    getChar: function () { return charDraft; },
    saveChar: saveChar,
    getState: function () { return g; },
    setCallbacks: function (renderCb, tickCb) {
      onRender = function () { saveRun(true); renderCb(); };
      onTick = function () { saveRun(false); tickCb(); };
    },
    getSavedRun: getSavedRun,
    discardSavedRun: discardSavedRun,
    resumeRun: resumeRun,
    exhaustedMult: EXHAUSTED_MULT,
    enterLobby: enterLobby,
    newRun: newRun,
    enterEncounter: enterEncounter,
    startQuestion: startQuestion,
    useCard: useCard,
    useUltimate: useUltimate,
    pickDraft: pickDraft,
    submitAnswer: submitAnswer,
    enterBattle: enterBattle,
    afterBattle: afterBattle,
    nextStage: nextStage,
    toggleRevPause: function () { if (g) { g.revPaused = !g.revPaused; onRender(); } },
    goSummary: function () { if (g) { g.phase = "SUMMARY"; onRender(); } },
    resetToCreate: function () { stopTimer(); g = null; discardSavedRun(); onRender(); }
  };
})(window);
