// Whole-class game loop (milestone 2: "same question for everyone", teacher presses next).
//
//   INTRO -> ENCOUNTER -> QUESTION -> REVEAL -> BATTLE -> BOARD -> QUESTION ...
//                                                       \-> MON_DEFEAT / MON_ESCAPE -> ENCOUNTER (next stage)
//   boss stage ends in VICTORY / DEFEAT -> FINAL (podium) -> SUMMARY (class mistakes, CSV)
// Room setting mode "self" runs selfpaced.js instead (each student plays their own whole run at their own pace).
// With tactics on (room setting "cards"), tactics.js adds monster intents, cards, hearts,
// ultimates, the class shield and the card reward after each monster.
//
// The server owns the clock, grades every answer with js/core/grading.js and picks questions with
// js/core/adaptive.js, steering toward the mistakes the whole class makes most.
"use strict";
const { DH } = require("./shared");
const T = require("./tactics");
const S = require("./selfpaced");

const LENGTHS = { short: [1, 1, 1, 2, 3], medium: null, long: [3, 3, 3, 4, 5] };
const PACE = { normal: 1, slow: 1.5, untimed: 0 };
const INTRO_MS = 8000;
const REVEAL_AUTO_MS = 10000;
const BATTLE_MS = 8000;
const HP_FACTOR = 0.65;           // same as single-player: perfect play kills with ~1/3 to spare

function now() { return Date.now(); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------------------------------------------------------------- questions
function packQuestions(packId) {
  const p = (DH.PACKS || []).filter((x) => x.id === packId)[0] || (DH.PACKS || [])[0];
  return p ? p.questions : DH.QUESTIONS;
}

// What phones may see while answering: no answer key, no explanation.
function publicQuestion(q) {
  const out = clone(q);
  delete out.why;
  delete out.fallbackForces;
  if (Array.isArray(q.ex)) delete out.ex;
  else out.ex = Object.keys(q.ex || {}).reduce((o, v) => { o[v] = []; return o; }, {});   // keeps the A/B views
  return out;
}

// Answers are small objects: { all|A|B: { forceKey: angle | [angles] } }
function cleanPlace(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  ["all", "A", "B"].forEach((v) => {
    const src = raw[v];
    if (!src || typeof src !== "object") return;
    const dst = {};
    Object.keys(src).slice(0, 12).forEach((k) => {
      if (typeof k !== "string" || k.length > 24) return;
      const val = src[k];
      const list = (Array.isArray(val) ? val : [val]).slice(0, 4).map(Number).filter((a) => isFinite(a)).map((a) => ((a % 360) + 360) % 360);
      if (list.length) dst[k] = list.length === 1 ? list[0] : list;
    });
    out[v] = dst;
  });
  return out;
}

// ---------------------------------------------------------------- game object
function newGame(room) {
  const s = room.settings;
  const per = LENGTHS[s.length] || DH.STAGES.map((st) => st.count);
  const players = [...room.players.values()].filter((p) => p.ready);
  players.forEach((p) => {
    p.score = 0; p.streak = 0; p.answered = 0; p.correct = 0; p.accSum = 0; p.mistakes = {}; p.rank = 0; p.prevRank = 0; p.lastDmg = 0;
    if (s.opts.cards) T.setupPlayer(p);
  });
  return {
    tactics: !!s.opts.cards,
    intent: null,
    n: Math.max(1, players.length),
    perStage: per,
    qTotal: per.reduce((a, b) => a + b, 0),
    stageIdx: 0,
    qInStage: 0,
    qNum: 0,
    usedQids: [],
    classMistakes: {},
    topicStats: {},
    history: [],
    bossBonusHp: 0,
    monster: null,
    q: null,
    answers: new Map(),
    endsAt: 0,
    timer: null,
    botTimers: [],
    result: null,
    defeatFate: Math.random() < 0.5 ? "burn" : "eat",
    battle: null,
    reveal: null
  };
}

function initStage(room) {
  const g = room.game;
  const st = DH.STAGES[g.stageIdx];
  const count = g.perStage[g.stageIdx];
  let maxHp = Math.round(count * st.baseDmg * HP_FACTOR * g.n);
  if (st.isBoss) maxHp += g.bossBonusHp;
  g.monster = {
    id: st.monsterId, name: st.name, subtitle: st.subtitle, bg: st.bg, sprite: st.sprite,
    hp: maxHp, maxHp, isBoss: !!st.isBoss, phase: 1, count, baseDmg: st.baseDmg, stage: st.stage
  };
  g.qInStage = 0;
  if (g.tactics) T.newStage(room);
}

function bossPhase(m) {
  const r = m.hp / Math.max(1, m.maxHp);
  return r > 0.66 ? 1 : (r > 0.33 ? 2 : 3);
}

// ---------------------------------------------------------------- flow
function clearTimers(room) {
  const g = room.game;
  if (!g) return;
  clearTimeout(g.timer);
  g.botTimers.forEach(clearTimeout);
  g.botTimers = [];
}

function setPhase(room, phase, autoMs, next) {
  const g = room.game;
  clearTimers(room);
  room.phase = phase;
  g.phaseAt = now();
  g.autoAt = autoMs ? now() + autoMs : 0;
  if (autoMs) g.timer = setTimeout(next, autoMs);
  room.broadcastGame();
}

function start(room) {
  room.game = newGame(room);
  if (room.settings.mode === "self") return S.start(room);
  initStage(room);
  setPhase(room, "INTRO", INTRO_MS, () => encounter(room));
}

function encounter(room) {
  setPhase(room, "ENCOUNTER");
}

function startQuestion(room) {
  const g = room.game;
  const st = DH.STAGES[g.stageIdx];
  const all = packQuestions(room.settings.pack);
  let pool = all.filter((q) => q.stage === st.stage);
  if (!pool.length) {
    // pack has nothing for this stage: take the nearest stage it does have
    const stages = [...new Set(all.map((q) => q.stage))].sort((a, b) => Math.abs(a - st.stage) - Math.abs(b - st.stage));
    pool = all.filter((q) => q.stage === stages[0]);
  }
  const picked = DH.Adaptive.pick(pool, g.usedQids, g.classMistakes);
  g.q = picked.q;
  g.focus = picked.focusCode;
  g.usedQids.push(g.q.id);
  g.qInStage++;
  g.qNum++;
  g.answers = new Map();
  if (g.tactics) {
    room.players.forEach((p) => { if (p.ready) T.resetTurn(p); });
    g.intent = T.rollIntent(g, room);
  }
  const mult = PACE[room.settings.pace];
  g.timeTotal = mult ? Math.round((g.q.tm || 25) * mult) : 0;
  if (g.tactics && g.intent === "haste" && g.timeTotal) g.timeTotal = Math.max(8, Math.round(g.timeTotal * 0.7));
  g.qStartAt = now();
  g.endsAt = g.timeTotal ? g.qStartAt + g.timeTotal * 1000 : 0;
  setPhase(room, "QUESTION", g.timeTotal ? g.timeTotal * 1000 + 600 : 0, () => reveal(room));
  scheduleBots(room);
}

function answer(room, p, msg) {
  const g = room.game;
  if (g && g.self) return S.answer(room, p, msg);
  if (room.phase !== "QUESTION" || !g || msg.qn !== g.qNum || g.answers.has(p.id)) return;
  const place = cleanPlace(msg.place);
  const t = now();
  const res = DH.Grading.gradeAnswer(g.q, place);
  if (g.tactics && T.wantsRetry(g, p, res)) {
    if (p.sock) p.sock.sendJson(playerView(room, p));
    return;
  }
  const remRatio = g.timeTotal ? Math.max(0, Math.min(1, (g.endsAt - t) / (g.timeTotal * 1000))) : 0.4;
  g.answers.set(p.id, { place, at: t, secs: (t - g.qStartAt) / 1000, res, remRatio });
  if (p.sock) p.sock.sendJson({ t: "answered", qn: g.qNum });
  room.pushProgress();
  // Everyone who is here has answered: no need to wait for the clock.
  const waiting = [...room.players.values()].filter((x) => x.ready && (x.bot || x.sock) && !g.answers.has(x.id));
  if (!waiting.length) setTimeout(() => { if (room.phase === "QUESTION" && g.qNum === msg.qn) reveal(room); }, 600);
}

function scoreAnswer(g, p, a) {
  const m = g.monster;
  const full = a.res.acc >= 0.999;
  const half = a.res.acc >= 0.5;
  if (full) p.streak++; else p.streak = 0;
  if (!half) return 0;
  const maxSpd = p.job === "archer" ? 0.6 : 0.5;
  const sSpeed = 1 + maxSpd * a.remRatio;
  const mStreak = p.streak >= 5 ? 1.2 : (p.streak >= 3 ? 1.1 : (p.streak >= 2 ? 1.05 : 1));
  const mClass = (p.job === "warrior" && p.streak >= 3) ? 1.15 : 1;
  return Math.round(m.baseDmg * a.res.acc * sSpeed * mStreak * mClass);
}

// Bucket every placed arrow so the teacher can see where the class put each force (feature 1).
function classArrows(g) {
  const views = {};
  g.answers.forEach((a) => {
    Object.keys(a.place).forEach((v) => {
      const bucket = views[v] = views[v] || {};
      Object.keys(a.place[v]).forEach((k) => {
        const angs = Array.isArray(a.place[v][k]) ? a.place[v][k] : [a.place[v][k]];
        angs.forEach((ang) => {
          const key = k + "|" + (Math.round(ang / 5) * 5) % 360;
          bucket[key] = (bucket[key] || 0) + 1;
        });
      });
    });
  });
  const out = {};
  Object.keys(views).forEach((v) => {
    out[v] = Object.keys(views[v]).map((key) => {
      const i = key.lastIndexOf("|");
      return { force: key.slice(0, i), angle: Number(key.slice(i + 1)), count: views[v][key] };
    }).sort((a, b) => b.count - a.count).slice(0, 30);
  });
  return out;
}

function reveal(room) {
  const g = room.game;
  if (room.phase !== "QUESTION") return;
  const m = g.monster;
  const ready = [...room.players.values()].filter((p) => p.ready);
  let total = 0, full = 0, part = 0, wrong = 0, accSum = 0;
  const codeCount = {};
  // with tactics, cards / intent / hearts / class shield decide each answer's damage first
  const tac = g.tactics ? T.resolveRound(room, ready) : null;
  ready.forEach((p) => {
    const a = g.answers.get(p.id);
    p.lastDmg = 0;
    p.lastRes = null;
    if (!a) { if (!tac) p.streak = 0; return; }
    const dmg = tac ? a.dmg + (a.meteor || 0) : scoreAnswer(g, p, a);
    a.dmg = dmg;
    p.lastDmg = dmg;
    p.lastRes = a;
    p.score += dmg;
    p.answered++;
    p.accSum += a.res.acc;
    if (a.res.acc >= 0.999) { p.correct++; full++; } else if (a.res.acc >= 0.5) part++; else wrong++;
    accSum += a.res.acc;
    total += dmg;
    a.res.codes.forEach((c) => {
      p.mistakes[c] = (p.mistakes[c] || 0) + 1;
      g.classMistakes[c] = (g.classMistakes[c] || 0) + 1;
      codeCount[c] = (codeCount[c] || 0) + 1;
    });
    const ts = g.topicStats[g.q.topic] = g.topicStats[g.q.topic] || { ok: 0, total: 0 };
    ts.total++;
    if (a.res.acc >= 0.999) ts.ok++;
  });
  const n = g.answers.size;
  g.reveal = {
    answered: n, players: ready.length, full, part, wrong, noAnswer: ready.length - n,
    avgAcc: n ? accSum / n : 0, damage: total,
    mistakes: Object.keys(codeCount).sort((a, b) => codeCount[b] - codeCount[a]).slice(0, 3).map((c) => ({
      code: c, count: codeCount[c], label: (DH.MISTAKE_META[c] || {}).label || c, tip: (DH.MISTAKE_META[c] || {}).tip || ""
    })),
    arrows: classArrows(g),
    tactics: tac
  };
  g.history.push({ qNum: g.qNum, id: g.q.id, t: g.q.t, tg: g.q.tg, topic: g.q.topic, stage: m.stage, full, part, wrong, noAnswer: ready.length - n, avgAcc: g.reveal.avgAcc });
  g.battle = buildBattle(room, Math.max(0, total), tac);
  setPhase(room, "REVEAL", room.settings.opts.autoNext ? REVEAL_AUTO_MS : 0, () => battle(room));
}

// Who walks up to the monster: the 3 fastest full-marks answers and 2 wrong ones
// (topped up with more correct answers when fewer than 2 got it wrong).
function buildBattle(room, total, tac) {
  const g = room.game;
  const rows = [];
  g.answers.forEach((a, id) => { const p = room.players.get(id); if (p) rows.push({ p, a }); });
  const fast = rows.filter((r) => r.a.res.acc >= 0.999).sort((x, y) => x.a.at - y.a.at);
  const wrongs = rows.filter((r) => r.a.res.acc < 0.5);
  for (let i = wrongs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [wrongs[i], wrongs[j]] = [wrongs[j], wrongs[i]]; }
  const hitters = fast.slice(0, 3);
  const missers = wrongs.slice(0, 2);
  const used = new Set(hitters.concat(missers).map((r) => r.p.id));
  const extra = rows.filter((r) => !used.has(r.p.id) && r.a.dmg > 0).sort((x, y) => y.a.dmg - x.a.dmg || x.a.at - y.a.at);
  while (hitters.length + missers.length < 5 && extra.length) hitters.push(extra.shift());
  const hide = room.settings.opts.hideWrong;
  const card = (r, hit) => ({
    id: r.p.id, name: hit || !hide ? r.p.name : "???", job: r.p.job, look: r.p.look,
    hit, dmg: r.a.dmg || 0, secs: Math.round(r.a.secs * 10) / 10, acc: r.a.res.acc,
    card: r.p.tac ? r.p.tac.card : null, ult: r.p.tac ? r.p.tac.ult : null, meteor: r.a.meteor || 0
  });
  return {
    attackers: hitters.map((r) => card(r, true)).concat(missers.map((r) => card(r, false))), total,
    shield: !!(tac && tac.shield), effect: tac ? tac.effect : null, intent: room.game.intent,
    ults: tac ? tac.ults : [], meteor: tac ? tac.meteor : 0
  };
}

function battle(room) {
  const g = room.game;
  if (room.phase !== "REVEAL") return;
  const m = g.monster;
  const before = m.isBoss ? bossPhase(m) : 1;
  m.hp = Math.max(0, m.hp - g.battle.total);
  // the monster's own move: charge / regen heal it if it is still standing
  const eff = g.battle.effect;
  if (eff && eff.type === "heal" && m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + eff.amount);
  if (m.isBoss) {
    m.phase = bossPhase(m);
    g.battle.phaseUp = m.phase > before && m.hp > 0 ? m.phase : 0;
  }
  rank(room);
  setPhase(room, "BATTLE", BATTLE_MS, () => afterBattle(room));
}

function afterBattle(room) {
  const g = room.game;
  const m = g.monster;
  if (m.hp <= 0) {
    if (m.isBoss) { g.result = "win"; return setPhase(room, "VICTORY"); }
    if (g.tactics) { T.offerDrafts(room); botsPickDrafts(room); }
    return setPhase(room, "MON_DEFEAT");
  }
  if (g.qInStage >= m.count) {
    if (m.isBoss) { g.result = "lose"; return setPhase(room, "DEFEAT"); }
    g.bossBonusHp += m.hp;
    return setPhase(room, "MON_ESCAPE");
  }
  setPhase(room, "BOARD");
}

function nextStage(room) {
  const g = room.game;
  if (g.tactics) T.closeDrafts(room);
  g.stageIdx++;
  initStage(room);
  encounter(room);
}

function rank(room) {
  const list = [...room.players.values()].filter((p) => p.ready);
  list.forEach((p) => { p.prevRank = p.rank || 0; });
  list.sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name));
  list.forEach((p, i) => { p.rank = i + 1; });
  return list;
}

// Teacher's "next" button: what it does depends on where we are.
function next(room) {
  const ph = room.phase;
  if (ph === "SELF") return S.endNow(room);
  if (ph === "INTRO") return encounter(room);
  if (ph === "ENCOUNTER" || ph === "BOARD") return startQuestion(room);
  if (ph === "QUESTION") return reveal(room);
  if (ph === "REVEAL") return battle(room);
  if (ph === "BATTLE") return afterBattle(room);
  if (ph === "MON_DEFEAT" || ph === "MON_ESCAPE") return nextStage(room);
  if (ph === "VICTORY" || ph === "DEFEAT") { rank(room); return setPhase(room, "FINAL"); }
  if (ph === "FINAL") return setPhase(room, "SUMMARY");
}

function stop(room) {
  clearTimers(room);
  room.players.forEach((p) => { if (p.run) { clearTimeout(p.run.timer); p.run = null; } });
  room.game = null;
}

// ---------------------------------------------------------------- test bots
function botPlace(q, skill) {
  const ex = q.ex;
  const mk = (list) => {
    const o = {};
    // the same force can appear twice (two contact forces P): those become a list of angles
    list.forEach((e) => { const a = Array.isArray(e[1]) ? e[1][0] : e[1]; o[e[0]] = o[e[0]] === undefined ? a : [].concat(o[e[0]], a); });
    return o;
  };
  const place = Array.isArray(ex) ? { all: mk(ex) } : Object.keys(ex).reduce((o, v) => { o[v] = mk(ex[v]); return o; }, {});
  if (Math.random() < skill) return place;
  // a typical slip: drop a force, or point one the wrong way
  Object.keys(place).forEach((v) => {
    const keys = Object.keys(place[v]);
    if (!keys.length) return;
    const k = pick(keys);
    if (Math.random() < 0.5) delete place[v][k];
    else place[v][k] = ([].concat(place[v][k])[0] + 90) % 360;
  });
  return place;
}

function scheduleBots(room) {
  const g = room.game;
  const limit = g.timeTotal ? g.timeTotal * 1000 : 20000;
  room.players.forEach((p) => {
    if (!p.bot || !p.ready) return;
    p.skill = p.skill || 0.35 + Math.random() * 0.6;
    const qn = g.qNum;
    const delay = (0.15 + Math.random() * 0.7) * limit * (room.botSpeed || 1);
    g.botTimers.push(setTimeout(() => {
      if (room.phase !== "QUESTION" || g.qNum !== qn) return;
      if (g.tactics) T.botTurn(room, p);
      answer(room, p, { qn, place: botPlace(g.q, p.skill) });
    }, delay));
  });
}

function botsPickDrafts(room) {
  room.players.forEach((p) => {
    if (p.bot && p.draft) setTimeout(() => { if (p.draft) { T.pickDraft(room, p, p.draft[0]); room.pushDraft(); } }, 600 + Math.random() * 2500);
  });
}

// The phone's own "next" button (self-paced mode only; in the class game the teacher drives).
function playerNext(room, p) {
  if (room.game && room.game.self) S.next(room, p);
}

// A student left: in self-paced mode they no longer hold up the ending.
function playerLeft(room) {
  if (room.game && room.game.self && room.phase === "SELF") S.checkAllDone(room);
}

// Phone actions with tactics: play a card, fire the ultimate, take a reward card.
function act(room, p, msg) {
  const g = room.game;
  if (!g || !g.tactics || !p.ready) return;
  let changed = false;
  if (msg.t === "card") changed = T.useCard(room, p, msg);
  else if (msg.t === "ult") changed = T.useUltimate(room, p, msg);
  else if (msg.t === "draft") { changed = T.pickDraft(room, p, String(msg.cid)); if (changed && !g.self) room.pushDraft(); }
  if (changed && p.sock) p.sock.sendJson(playerView(room, p));
}

// ---------------------------------------------------------------- views
function monsterView(m) {
  return m && { id: m.id, name: m.name, subtitle: m.subtitle, bg: m.bg, sprite: m.sprite, hp: m.hp, maxHp: m.maxHp, isBoss: m.isBoss, phase: m.phase, count: m.count, baseDmg: m.baseDmg };
}

// Current standings without re-ranking (rank() runs once per battle so the up/down arrows survive).
function standings(room) {
  return [...room.players.values()].filter((p) => p.ready).sort((a, b) => (a.rank || 999) - (b.rank || 999));
}

function leaderboard(room, n) {
  return standings(room).slice(0, n).map((p) => ({
    id: p.id, name: p.name, job: p.job, look: p.look, score: p.score, rank: p.rank, move: p.prevRank ? p.prevRank - p.rank : 0,
    lastDmg: p.lastDmg, correct: p.correct, answered: p.answered
  }));
}

// Teacher screen: everything about the class, plus the answer key once it is time to show it.
function hostView(room) {
  if (room.phase === "SELF") return S.hostView(room);
  const g = room.game;
  const ph = room.phase;
  const v = {
    t: "game", phase: ph, now: now(), autoAt: g.autoAt, stageIdx: g.stageIdx, stages: DH.STAGES.length,
    qNum: g.qNum, qTotal: g.qTotal, qInStage: g.qInStage, monster: monsterView(g.monster), bossBonusHp: g.bossBonusHp,
    players: [...room.players.values()].filter((p) => p.ready).length,
    // who stands on the battlefield between battles: the current top 5
    party: standings(room).slice(0, 5).map((p) => ({ id: p.id, name: p.name, job: p.job, look: p.look }))
  };
  if (ph === "INTRO") {
    const all = [...room.players.values()].filter((p) => p.ready);
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    v.walkers = all.slice(0, 5).map((p) => ({ name: p.name, job: p.job, look: p.look }));
  }
  v.tactics = g.tactics;
  if (g.tactics && (ph === "QUESTION" || ph === "REVEAL")) {
    v.intent = T.intentInfo(g);
    v.shieldNeed = T.SHIELD_RATE;
  }
  if (g.tactics && ph === "MON_DEFEAT") v.drafts = T.draftProgress(room);
  if (ph === "QUESTION" || ph === "REVEAL") {
    v.q = ph === "REVEAL" ? g.q : publicQuestion(g.q);
    v.focus = g.focus ? { code: g.focus, label: (DH.MISTAKE_META[g.focus] || {}).label } : null;
    v.timeTotal = g.timeTotal;
    v.endsAt = g.endsAt;
    v.answered = g.answers.size;
  }
  if (ph === "REVEAL") v.reveal = g.reveal;
  if (ph === "BATTLE") v.battle = g.battle;
  if (ph === "BOARD" || ph === "BATTLE") v.board = leaderboard(room, 10);
  if (ph === "FINAL" || ph === "SUMMARY") {
    v.result = g.result;
    if (g.self) { v.self = true; v.selfWins = g.selfWins; v.selfTotal = g.selfTotal; }
    v.board = leaderboard(room, 60);
  }
  if (ph === "DEFEAT") v.defeatFate = g.defeatFate;
  if (ph === "SUMMARY") v.summary = summary(room);
  return v;
}

function summary(room) {
  const g = room.game;
  const cm = g.classMistakes;
  return {
    mistakes: Object.keys(cm).sort((a, b) => cm[b] - cm[a]).slice(0, 6).map((c) => ({
      code: c, count: cm[c], label: (DH.MISTAKE_META[c] || {}).label || c, tip: (DH.MISTAKE_META[c] || {}).tip || ""
    })),
    topics: Object.keys(g.topicStats).map((t) => ({ topic: t, label: DH.TOPIC_LABELS[t] || t, ok: g.topicStats[t].ok, total: g.topicStats[t].total })),
    questions: g.history
  };
}

// One student's phone.
function playerView(room, p) {
  if (room.phase === "SELF" && p.run) return S.playerView(room, p);
  const g = room.game;
  const ph = room.phase;
  const v = {
    t: "game", phase: ph, now: now(), autoAt: g.autoAt, qNum: g.qNum, qTotal: g.qTotal, monster: monsterView(g.monster),
    score: p.score || 0, rank: p.rank || 0, players: [...room.players.values()].filter((x) => x.ready).length, streak: p.streak || 0
  };
  if (g.tactics) {
    v.tac = T.playerTactics(room, p);
    if (ph === "REVEAL") { v.tac.last = p.tac; v.tac.round = g.reveal && g.reveal.tactics ? { shield: g.reveal.tactics.shield, shieldPct: g.reveal.tactics.shieldPct, effect: g.reveal.tactics.effect } : null; }
    if (ph === "MON_DEFEAT") { v.draft = p.draft; v.draftPicked = p.draftPicked; }
  }
  if (ph === "QUESTION") {
    v.q = publicQuestion(g.q);
    v.timeTotal = g.timeTotal;
    v.endsAt = g.endsAt;
    v.answered = g.answers.has(p.id);
    v.count = g.answers.size;
  }
  if (ph === "REVEAL") {
    const a = g.answers.get(p.id);
    v.q = g.q;
    v.mine = a ? { place: a.place, acc: a.res.acc, outcome: a.res.outcome, rows: a.res.rows, dmg: a.dmg || 0, secs: Math.round(a.secs * 10) / 10 } : null;
    v.classAcc = g.reveal.avgAcc;
  }
  if (ph === "BATTLE") {
    // the phone replays this student's own blow (or the monster's counter-attack on them)
    const a = p.lastRes, t = p.tac || {};
    v.my = { answered: !!a, acc: a ? a.res.acc : 0, protectedBy: t.protectedBy || null, lost: t.lost || 0, card: t.card || null, ult: t.ult || null, meteor: a ? a.meteor || 0 : 0 };
    v.shield = !!g.battle.shield;
    v.effect = g.battle.effect;
  }
  if (ph === "DEFEAT") v.defeatFate = g.defeatFate;
  if (ph === "BATTLE" || ph === "BOARD") {
    v.lastDmg = p.lastDmg || 0;
    v.inBattle = ph === "BATTLE" && g.battle.attackers.some((x) => x.id === p.id);
    v.move = p.prevRank ? p.prevRank - p.rank : 0;
  }
  if (ph === "FINAL" || ph === "SUMMARY" || ph === "VICTORY" || ph === "DEFEAT") {
    v.result = g.result;
    if (g.self && p.run) { v.self = true; v.myResult = p.run.result; }
    v.me = {
      answered: p.answered, correct: p.correct, acc: p.answered ? p.accSum / p.answered : 0,
      mistakes: Object.keys(p.mistakes || {}).sort((a, b) => p.mistakes[b] - p.mistakes[a]).slice(0, 3).map((c) => ({
        label: (DH.MISTAKE_META[c] || {}).label || c, tip: (DH.MISTAKE_META[c] || {}).tip || "", count: p.mistakes[c]
      }))
    };
  }
  return v;
}

// Results for the teacher's spreadsheet.
function csv(room) {
  const list = standings(room);
  const q = (s) => '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
  const head = ["อันดับ", "ชื่อ", "อาชีพ", "ดาเมจรวม", "ถูกเต็ม", "ตอบ", "จากทั้งหมด", "ความแม่นยำเฉลี่ย (%)", "จุดที่พลาดบ่อย"];
  const rows = list.map((p) => [
    p.rank, p.name, (DH.JOBS[p.job] || {}).name || p.job, p.score, p.correct, p.answered, p.run ? p.run.qNum : (room.game ? room.game.qNum : 0),
    p.answered ? Math.round(100 * p.accSum / p.answered) : 0,
    Object.keys(p.mistakes || {}).sort((a, b) => p.mistakes[b] - p.mistakes[a]).slice(0, 3).map((c) => ((DH.MISTAKE_META[c] || {}).label || c) + " ×" + p.mistakes[c]).join("; ")
  ]);
  return "﻿" + [head].concat(rows).map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}

module.exports = {
  // used by selfpaced.js
  packQuestions, cleanPlace, PACE, scoreAnswer, bossPhase, rank, standings, setPhase, monsterView, botPlace,
  start, next, answer, act, playerNext, playerLeft, stop, hostView, playerView, csv, publicQuestion, LENGTHS };
