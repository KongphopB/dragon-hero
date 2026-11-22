(function (global) {
  var DH = global.DH = global.DH || {};

  var charDraft = JSON.parse(localStorage.getItem("dh_solo_char") || "null") || {
    name: "นักผจญภัย",
    job: "warrior",
    look: { skin: 0, hair: 1, hairColor: 0, outfit: 0, hat: 0 },
    timed: true
  };

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
    g.hearts = g.maxHearts;
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
      magnifierMsg: "",
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

  function startQuestion() {
    stopTimer();
    g.qInStage++;
    g.qGlobal++;
    g.curQ = pickQuestion();
    g.phase = "QUESTION";
    g.armedCard = null;
    g.draftPlace = {};
    g.timeTotal = g.curQ.tm || 25;
    g.timeLeft = g.timeTotal;
    g.frozenLeft = 0;
    g.secondChanceUsed = false;
    g.secondChanceRetries = 0;
    g.magnifierMsg = "";
    g.secondChanceMsg = "";
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

  function useCard(idx) {
    if (!g || g.phase !== "QUESTION" || g.armedCard) return;
    var cid = g.cards.splice(idx, 1)[0];
    g.armedCard = cid;
    DH.SFX.card();
    if (cid === "freeze") g.frozenLeft = 10;
    if (cid === "magnifier") {
      var q = g.curQ;
      var cnt = Array.isArray(q.ex) ? q.ex.length : ((q.ex.A || []).length + (q.ex.B || []).length);
      g.magnifierMsg = "🔍 แว่นขยายเผยว่า: ข้อนี้มีแรง/องค์ประกอบในเฉลยทั้งหมด " + cnt + " รายการ!";
    }
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
    var base = g.monster.baseDmg;
    var shieldSaved = false;

    if (res.acc >= 0.999) {
      g.streak++;
    } else {
      if (card === "shield" || (charDraft.job === "knight" && !g.knightShieldUsed)) {
        if (charDraft.job === "knight" && !g.knightShieldUsed) g.knightShieldUsed = true;
        shieldSaved = true;
      } else {
        g.streak = 0;
      }
    }

    var remRatio = charDraft.timed ? Math.max(0, Math.min(1, g.timeLeft / Math.max(1, g.timeTotal))) : 0.4;
    var maxSpd = charDraft.job === "archer" ? 0.6 : 0.5;
    var sSpeed = res.acc >= 0.5 ? (1 + maxSpd * remRatio) : 1;
    var mStreak = g.streak >= 5 ? 1.2 : (g.streak >= 3 ? 1.1 : (g.streak >= 2 ? 1.05 : 1));
    var mClass = (charDraft.job === "warrior" && g.streak >= 3) ? 1.15 : 1;
    var dmg = 0;

    if (card === "double") {
      if (res.acc >= 0.999) dmg = Math.round(base * res.acc * sSpeed * mClass * 2 * mStreak);
      else if (shieldSaved) dmg = 0;
      else dmg = -Math.round(base * 0.5);
    } else {
      var healBoost = charDraft.job === "priest" ? 1.25 : 1.15;
      var mc = card === "magnifier" ? 0.85 : (card === "second_chance" && g.secondChanceRetries > 0 ? 0.7 : (card === "heal" ? healBoost : 1));
      if (res.acc >= 0.5) dmg = Math.round(base * res.acc * sSpeed * mClass * mc * mStreak);
    }

    // Out of hearts = exhausted: every hit does half damage until a heal or the next stage.
    var exhausted = g.hearts <= 0;
    if (exhausted && dmg > 0) dmg = Math.round(dmg * EXHAUSTED_MULT);
    if (card === "heal" && res.acc >= 0.5 && g.hearts < g.maxHearts) g.hearts++;
    if (res.acc < 0.5 && !shieldSaved) g.hearts = Math.max(0, g.hearts - 1);

    g.score += dmg;
    g.accSum += res.acc;
    g.qTotal++;
    var tp = q.topic || "general";
    g.topicStats[tp] = g.topicStats[tp] || { ok: 0, total: 0 };
    g.topicStats[tp].total++;
    if (res.acc >= 0.999) g.topicStats[tp].ok++;
    res.codes.forEach(function (c) { g.mistakes[c] = (g.mistakes[c] || 0) + 1; });
    g.qLog.push({
      stage: DH.STAGES[g.stageIdx].stage,
      acc: res.acc,
      codes: res.codes.slice(),
      focus: g.curFocus,
      fixedFocus: !!g.curFocus && res.codes.indexOf(g.curFocus) < 0 && res.acc >= 0.5
    });

    var cardEarned = null;
    if (g.streak > 0 && g.streak % 3 === 0 && g.cards.length < 3) {
      cardEarned = DH.ALL_CARDS[Math.floor(Math.random() * DH.ALL_CARDS.length)];
      g.cards.push(cardEarned);
    }

    var prevPhase = g.monster.phase;
    if (dmg > 0) g.monster.hp = Math.max(0, g.monster.hp - dmg);
    updateBossPhase();
    var phaseUp = g.monster.isBoss && g.monster.hp > 0 && g.monster.phase > prevPhase ? g.monster.phase : 0;

    g.lastRes = {
      timedOut: !!timedOut,
      acc: res.acc,
      outcome: shieldSaved && res.acc < 0.5 ? "shielded" : res.outcome,
      dmg: dmg,
      codes: res.codes,
      rows: res.rows,
      card: card,
      cardEarned: cardEarned,
      exhausted: exhausted,
      nowExhausted: g.hearts <= 0,
      phaseUp: phaseUp,
      place: place,
      q: q
    };

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
      if (g.cards.length < 3) g.cards.push(DH.ALL_CARDS[Math.floor(Math.random() * DH.ALL_CARDS.length)]);
      if (charDraft.job === "mage" && g.cards.length < 3) g.cards.push(DH.ALL_CARDS[Math.floor(Math.random() * DH.ALL_CARDS.length)]);
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

  function nextStage() {
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
    submitAnswer: submitAnswer,
    enterBattle: enterBattle,
    afterBattle: afterBattle,
    nextStage: nextStage,
    toggleRevPause: function () { if (g) { g.revPaused = !g.revPaused; onRender(); } },
    goSummary: function () { if (g) { g.phase = "SUMMARY"; onRender(); } },
    resetToCreate: function () { stopTimer(); g = null; discardSavedRun(); onRender(); }
  };
})(window);
