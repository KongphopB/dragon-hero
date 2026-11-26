// Self-paced mode (milestone 4): "ต่างคนต่างทำ".
//
// Every student plays their own whole adventure on their phone, like single-player: their own
// slime, goblin, fenrir, orc and dragon, their own questions (picked from their own mistakes), at
// their own speed. Finishing early does not end anything: a student who is done waits, and the
// game ends only when EVERY connected student is done, or when the teacher ends it.
// Meanwhile the teacher's screen shows one thing: the live damage ranking of the class.
// After the end: the usual podium (FINAL) and class summary (SUMMARY).
//
// Per student (p.run): ENCOUNTER -> QUESTION -> REVEAL -> BATTLE -> QUESTION ... -> MON_DEFEAT /
// MON_ESCAPE -> next stage ... -> their dragon -> VICTORY / DEFEAT -> DONE.
// The room itself stays in phase "SELF" until the end.
"use strict";
const { DH } = require("./shared");
const T = require("./tactics");

const BOSS = DH.STAGES.length - 1;
const BATTLE_MS = 3600;
const HP_FACTOR = 0.65;
const G = () => require("./game");    // game.js requires this file too, so look it up when needed

function now() { return Date.now(); }
function here(room, p) { return room.game && room.game.self && room.players.has(p.id) && p.run; }

// ---------------------------------------------------------------- start
function start(room) {
  const g = room.game;
  g.self = true;
  g.qStats = {};
  room.phase = "SELF";
  g.phaseAt = now();
  g.autoAt = 0;
  room.players.forEach((p) => {
    if (!p.ready) return;
    p.run = { stageIdx: 0, qInStage: 0, qNum: 0, usedQids: [], bonus: 0, timer: null, phase: null, solo: true, result: null };
    enterStage(room, p, 0);
  });
  pushHost(room, true);
}

// Each stage's monster is this student's own, with single-player HP. Escaped monsters make
// this student's dragon stronger, as in single-player.
function enterStage(room, p, idx) {
  const g = room.game, r = p.run;
  const st = DH.STAGES[idx], count = g.perStage[idx];
  let hp = Math.round(count * st.baseDmg * HP_FACTOR);
  if (idx === BOSS) hp += r.bonus;
  r.stageIdx = idx;
  r.qInStage = 0;
  r.answer = null;
  r.monster = { id: st.monsterId, name: st.name, subtitle: st.subtitle, bg: st.bg, sprite: st.sprite, hp, maxHp: hp, isBoss: idx === BOSS, phase: 1, count, baseDmg: st.baseDmg, stage: st.stage };
  r.healBase = hp;
  if (g.tactics) p.knightUsed = false;
  setRunPhase(room, p, "ENCOUNTER");
}

function setRunPhase(room, p, phase, ms, then) {
  const r = p.run;
  clearTimeout(r.timer);
  r.phase = phase;
  if (ms) r.timer = setTimeout(() => { if (here(room, p) && r.phase === phase) then(); }, ms);
  send(room, p);
  pushHost(room);
  if (p.bot) botStep(room, p);
}

function send(room, p) { if (p.sock) p.sock.sendJson(playerView(room, p)); }

// ---------------------------------------------------------------- one student's flow
// The phone's "next" button (and the bots).
function next(room, p) {
  if (!here(room, p) || room.phase !== "SELF") return;
  const r = p.run;
  if (r.phase === "ENCOUNTER") return startQuestion(room, p);
  if (r.phase === "REVEAL") return battle(room, p);
  if (r.phase === "BATTLE") return after(room, p);
  if (r.phase === "MON_DEFEAT" || r.phase === "MON_ESCAPE") {
    if (room.game.tactics && p.draft) T.pickDraft(room, p, p.draft[Math.floor(Math.random() * p.draft.length)]);
    p.draft = null;
    return enterStage(room, p, r.stageIdx + 1);
  }
  if (r.phase === "VICTORY" || r.phase === "DEFEAT") {
    setRunPhase(room, p, "DONE");
    return checkAllDone(room);
  }
}

function startQuestion(room, p) {
  const game = room.game, r = p.run;
  const st = DH.STAGES[r.stageIdx];
  const all = G().packQuestions(room);
  let pool = all.filter((q) => q.stage === st.stage);
  if (!pool.length) {
    const stages = [...new Set(all.map((q) => q.stage))].sort((a, b) => Math.abs(a - st.stage) - Math.abs(b - st.stage));
    pool = all.filter((q) => q.stage === stages[0]);
  }
  const picked = DH.Adaptive.pick(pool, r.usedQids, p.mistakes);   // this student's own weak spots
  r.q = picked.q;
  r.focus = picked.focusCode;
  r.usedQids.push(r.q.id);
  r.qInStage++;
  r.qNum++;
  r.answer = null;
  if (game.tactics) {
    T.resetTurn(p);
    r.intent = T.rollIntent(r, room);
  }
  const mult = G().PACE[room.settings.pace];
  r.timeTotal = mult ? Math.round((r.q.tm || 25) * mult) : 0;
  if (game.tactics && r.intent === "haste" && r.timeTotal) r.timeTotal = Math.max(8, Math.round(r.timeTotal * 0.7));
  r.qStartAt = now();
  r.endsAt = r.timeTotal ? r.qStartAt + r.timeTotal * 1000 : 0;
  setRunPhase(room, p, "QUESTION", r.timeTotal ? r.timeTotal * 1000 + 600 : 0, () => answer(room, p, { qn: r.qNum, place: {} }, true));
}

function answer(room, p, msg, timedOut) {
  if (!here(room, p) || room.phase !== "SELF") return;
  const game = room.game, r = p.run;
  if (r.phase !== "QUESTION" || msg.qn !== r.qNum || r.answer) return;
  const place = G().cleanPlace(msg.place);
  const t = now();
  const res = DH.Grading.gradeAnswer(r.q, place);
  if (!timedOut && game.tactics && T.wantsRetry(r, p, res)) { send(room, p); return; }
  const remRatio = r.timeTotal ? Math.max(0, Math.min(1, (r.endsAt - t) / (r.timeTotal * 1000))) : 0.4;
  const a = { place, at: t, secs: (t - r.qStartAt) / 1000, res, remRatio, timedOut: !!timedOut };
  r.answer = a;

  let dmg, meteor = 0, effect = null;
  if (game.tactics) { const o = T.resolveSolo(p, r, a); dmg = o.dmg; meteor = o.meteor; effect = o.effect; }
  else dmg = G().scoreAnswer(r, p, a);
  const total = dmg + meteor;
  a.dmg = total;
  a.meteor = meteor;
  r.effect = effect;

  // the blow lands now (the battle animation replays it)
  const m = r.monster;
  if (total > 0) m.hp = Math.max(0, m.hp - total);
  if (effect && effect.type === "heal" && m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + effect.amount);
  if (m.isBoss) m.phase = G().bossPhase(m);

  // personal and class statistics
  p.score += total;
  p.lastDmg = total;
  p.lastRes = a;
  p.answered++;
  p.accSum += res.acc;
  if (res.acc >= 0.999) p.correct++;
  res.codes.forEach((c) => {
    p.mistakes[c] = (p.mistakes[c] || 0) + 1;
    game.classMistakes[c] = (game.classMistakes[c] || 0) + 1;
  });
  const ts = game.topicStats[r.q.topic] = game.topicStats[r.q.topic] || { ok: 0, total: 0 };
  ts.total++;
  if (res.acc >= 0.999) ts.ok++;
  const qs = game.qStats[r.q.id] = game.qStats[r.q.id] || { id: r.q.id, t: r.q.t, tg: r.q.tg, topic: r.q.topic, stage: r.q.stage, full: 0, part: 0, wrong: 0, accSum: 0, n: 0 };
  qs.n++;
  qs.accSum += res.acc;
  if (res.acc >= 0.999) qs.full++; else if (res.acc >= 0.5) qs.part++; else qs.wrong++;
  G().rank(room);

  setRunPhase(room, p, "REVEAL");
}

function battle(room, p) {
  // bots don't watch the animation, so the "fast bots" test option shortens it for them
  const ms = p.bot ? Math.max(200, BATTLE_MS * (room.botSpeed || 1)) : BATTLE_MS;
  setRunPhase(room, p, "BATTLE", ms, () => after(room, p));
}

function after(room, p) {
  const r = p.run, m = r.monster;
  if (m.isBoss) {
    if (m.hp <= 0) { r.result = "win"; return setRunPhase(room, p, "VICTORY"); }
    if (r.qInStage >= m.count) { r.result = "lose"; r.fate = Math.random() < 0.5 ? "burn" : "eat"; return setRunPhase(room, p, "DEFEAT"); }
    return startQuestion(room, p);
  }
  if (m.hp <= 0) {
    if (room.game.tactics) T.offerDraft(p);
    return setRunPhase(room, p, "MON_DEFEAT");
  }
  if (r.qInStage >= m.count) {
    r.bonus += m.hp;
    return setRunPhase(room, p, "MON_ESCAPE");
  }
  startQuestion(room, p);
}

// The game ends by itself only when every connected student is done (students who left don't count).
function checkAllDone(room) {
  const game = room.game;
  if (!game || room.phase !== "SELF") return;
  const playing = [...room.players.values()].filter((p) => p.ready && p.run && (p.bot || p.sock));
  if (playing.length && playing.every((p) => p.run.phase === "DONE")) endGame(room);
}

// Teacher's "end game" button: whoever is still playing stops where they are.
function endNow(room) {
  if (room.phase !== "SELF") return;
  endGame(room);
}

function endGame(room) {
  const game = room.game;
  const runs = [...room.players.values()].filter((p) => p.ready && p.run);
  runs.forEach((p) => clearTimeout(p.run.timer));
  game.selfWins = runs.filter((p) => p.run.result === "win").length;
  game.selfTotal = runs.length;
  game.result = game.selfWins * 2 >= game.selfTotal && game.selfWins > 0 ? "win" : "lose";
  // per-question statistics in the same shape as the class game's history
  game.history = Object.keys(game.qStats).map((id, i) => {
    const s = game.qStats[id];
    return { qNum: i + 1, id, t: s.t, tg: s.tg, topic: s.topic, stage: s.stage, full: s.full, part: s.part, wrong: s.wrong, noAnswer: 0, avgAcc: s.n ? s.accSum / s.n : 0 };
  });
  G().rank(room);
  G().setPhase(room, "FINAL");
}

// ---------------------------------------------------------------- teacher screen: the ranking, batched
function pushHost(room, immediate) {
  if (!room.host || room.phase !== "SELF") return;
  if (immediate) { clearTimeout(room.selfTimer); room.selfTimer = null; room.host.sendJson(hostView(room)); return; }
  if (room.selfTimer) return;
  room.selfTimer = setTimeout(() => { room.selfTimer = null; if (room.host && room.phase === "SELF") room.host.sendJson(hostView(room)); }, 400);
}

// ---------------------------------------------------------------- bots
function botStep(room, p) {
  const r = p.run, speed = room.botSpeed || 1;
  const later = (ms, fn) => setTimeout(() => { if (here(room, p) && room.phase === "SELF") fn(); }, ms * speed);
  const ph = r.phase;
  if (ph === "ENCOUNTER") later(1500, () => { if (r.phase === "ENCOUNTER") next(room, p); });
  if (ph === "QUESTION") {
    const qn = r.qNum, limit = r.timeTotal ? r.timeTotal * 1000 : 20000;
    later((0.15 + Math.random() * 0.7) * limit, () => {
      if (r.phase !== "QUESTION" || r.qNum !== qn) return;
      if (room.game.tactics) T.botTurn(room, p);
      p.skill = p.skill || 0.35 + Math.random() * 0.6;
      answer(room, p, { qn, place: G().botPlace(r.q, p.skill) });
    });
  }
  if (ph === "REVEAL") later(1800, () => { if (r.phase === "REVEAL") next(room, p); });
  if (ph === "MON_DEFEAT" || ph === "MON_ESCAPE" || ph === "VICTORY" || ph === "DEFEAT") later(2000, () => { if (r.phase === ph) next(room, p); });
}

// ---------------------------------------------------------------- views
function playerView(room, p) {
  const game = room.game, r = p.run;
  const v = {
    t: "game", self: true, phase: r.phase, now: now(), qNum: r.qNum, qTotal: game.qTotal, stageIdx: r.stageIdx, stages: DH.STAGES.length,
    monster: G().monsterView(r.monster), score: p.score || 0, rank: p.rank || 0, streak: p.streak || 0,
    players: [...room.players.values()].filter((x) => x.ready).length
  };
  if (r.phase === "QUESTION") {
    v.q = G().publicQuestion(r.q);
    v.timeTotal = r.timeTotal;
    v.endsAt = r.endsAt;
    v.answered = !!r.answer;
  }
  if (r.phase === "REVEAL") {
    const a = r.answer;
    v.q = r.q;
    v.mine = a && !(a.timedOut && !Object.keys(a.place).length) ? { place: a.place, acc: a.res.acc, outcome: a.res.outcome, rows: a.res.rows, dmg: a.dmg || 0, secs: Math.round(a.secs * 10) / 10 } : null;
    v.classAcc = p.answered ? p.accSum / p.answered : 0;     // on your own: your running accuracy
    v.myAcc = true;
  }
  if (r.phase === "BATTLE") {
    const a = r.answer, t = p.tac || {};
    v.lastDmg = p.lastDmg || 0;
    v.inBattle = true;
    v.my = { answered: !!a && !a.timedOut, acc: a ? a.res.acc : 0, protectedBy: t.protectedBy || null, lost: t.lost || 0, card: t.card || null, ult: t.ult || null, meteor: a ? a.meteor || 0 : 0 };
    v.shield = false;
    v.effect = r.effect;
  }
  if (r.phase === "DEFEAT") v.defeatFate = r.fate;
  if (r.phase === "DONE") {
    v.result = r.result;
    v.me = { answered: p.answered, correct: p.correct, acc: p.answered ? p.accSum / p.answered : 0 };
    const playing = [...room.players.values()].filter((x) => x.ready && x.run && (x.bot || x.sock));
    v.doneCount = playing.filter((x) => x.run.phase === "DONE").length;
    v.doneOf = playing.length;
  }
  if (game.tactics) {
    v.tac = T.playerTactics(room, p);
    if (r.phase === "REVEAL") { v.tac.last = p.tac; v.tac.round = null; }
    if (r.phase === "MON_DEFEAT") { v.draft = p.draft; v.draftPicked = p.draftPicked; }
  }
  return v;
}

// Teacher screen: only the class's damage ranking (plus how many have finished).
function hostView(room) {
  const game = room.game;
  const list = G().standings(room).filter((p) => p.run);
  return {
    t: "game", self: true, phase: "SELF", now: now(), qTotal: game.qTotal, players: list.length,
    done: list.filter((p) => p.run.phase === "DONE").length,
    board: list.map((p) => ({
      id: p.id, name: p.name, job: p.job, look: p.look, score: p.score, rank: p.rank, move: p.prevRank ? p.prevRank - p.rank : 0,
      done: p.run.phase === "DONE", won: p.run.result === "win", online: !!(p.bot || p.sock)
    }))
  };
}

module.exports = { start, next, answer, endNow, playerView, hostView, checkAllDone };
