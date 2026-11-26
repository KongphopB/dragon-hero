// Tactic layer for the class game (milestone 3): the single-player card system, adapted to a class.
// Only active when the teacher left "การ์ดกลยุทธ์ & ท่าไม้ตาย" on in room setup.
//
//   - The monster rolls ONE intent per question for the whole class (same weights as single-player).
//   - Every student has their own hand of cards, 3 hearts (kept across stages), and an ultimate gauge.
//   - Class shield (feature 4): if at least 70% of the class answers at least half right, the monster's
//     counter-attack fails for everyone this turn: nobody loses hearts, no stealing, no healing.
//   - After a monster falls each student picks 1 of 3 cards (mage: 4) on their phone.
//   - The server owns the clock, so "freeze" gives you the full speed bonus instead of stopping time.
"use strict";
const { DH } = require("./shared");

const MAX_HEARTS = 3;
const EXHAUSTED_MULT = 0.5;
const SHIELD_RATE = 0.7;
const HEAL_RATE = 0.15;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------------------------------------------------------------- setup
function setupPlayer(p) {
  p.hearts = MAX_HEARTS;
  p.cards = [];
  const start = (DH.JOBS[p.job] || {}).startCard;
  if (start && DH.CARDS[start]) p.cards.push(start);
  p.ult = 0;
  p.fortress = 0;
  p.heartsLost = 0;
  resetTurn(p);
  p.knightUsed = false;
  p.draft = null;
  p.draftPicked = null;
}

function resetTurn(p) {
  p.armed = null;          // card played this question
  p.ultArmed = false;
  p.hint = null;           // x-ray / cut help sent to this phone
  p.scUsed = false;        // second chance spent
  p.retry = null;          // second chance: what is still wrong
  p.tac = null;            // what happened to this student this turn (for the reveal)
}

function newStage(room) {
  room.players.forEach((p) => { p.knightUsed = false; });
}

// ---------------------------------------------------------------- intents
function rollIntent(g, room) {
  if (g.stageIdx === 0 && g.qNum === 1) return "open";          // a friendly first question
  const table = DH.MONSTER_INTENTS[g.monster.id] || { open: 1, heavy: 1 };
  const roll = () => {
    let total = 0, k;
    for (k in table) total += table[k];
    let r = Math.random() * total;
    for (k in table) { r -= table[k]; if (r <= 0) return k; }
    return Object.keys(table)[0];
  };
  let id = roll();
  if (id === g.intent) id = roll();
  return id;
}

// Words for the intent, adjusted for a whole class.
function intentInfo(g) {
  const it = DH.INTENTS[g.intent];
  if (!it) return null;
  const desc = {
    open: "ตานี้ดาเมจของทุกคน ×1.5",
    heavy: "ใครตอบผิดเกินครึ่ง เสีย 2 หัวใจ",
    guard: "ดาเมจของทุกคนเหลือครึ่ง (ยกเว้นใช้ทุบเกราะ)",
    haste: "เวลาทำโจทย์ลดลง 30%",
    charge: "ถ้าทั้งห้องตีรวมไม่ถึง " + chargeTarget(g).toLocaleString() + " ดาเมจ มอนฟื้นเลือด 15%",
    regen: "ถ้าตอบถูกครบไม่ถึงครึ่งห้อง มอนฟื้นเลือด 15%",
    steal: "ใครตอบผิดเกินครึ่ง โดนขโมยการ์ด 1 ใบ"
  }[g.intent] || it.desc;
  return { id: g.intent, icon: it.icon, name: it.name, desc, good: !!it.good, counter: it.counter };
}

function chargeTarget(g) { return Math.round(g.monster.baseDmg * g.n * 0.5); }

// ---------------------------------------------------------------- playing cards / ultimate
function useCard(room, p, msg) {
  const g = room.game;
  if (room.phase !== "QUESTION" || msg.qn !== g.qNum || g.answers.has(p.id) || p.armed) return false;
  const idx = Math.floor(Number(msg.idx));
  const cid = p.cards[idx];
  if (!cid || (msg.cid && msg.cid !== cid)) return false;
  p.cards.splice(idx, 1);
  p.armed = cid;
  if (cid === "heal") {
    const before = p.hearts;
    p.hearts = Math.min(MAX_HEARTS, p.hearts + (p.job === "priest" ? 2 : 1));
    p.hint = { kind: "msg", text: p.hearts > before ? "💚 ฟื้นหัวใจ +" + (p.hearts - before) : "💚 หัวใจเต็มอยู่แล้ว · ถ้าตอบถูกยังได้ดาเมจ +15%" };
  } else if (cid === "freeze") {
    p.hint = { kind: "msg", text: "❄️ หยุดเวลา: ข้อนี้คุณได้โบนัสความเร็วเต็มไม่ว่าจะตอบช้าแค่ไหน" };
  } else if (cid === "xray") {
    p.hint = xrayHint(g.q);
  } else if (cid === "cut") {
    const keys = {};
    if (Array.isArray(g.q.ex)) keys.all = g.q.ex.map((e) => e[0]);
    else Object.keys(g.q.ex).forEach((v) => { keys[v] = g.q.ex[v].map((e) => e[0]); });
    p.hint = { kind: "cut", keys };
  } else if (cid === "protractor") {
    p.hint = { kind: "protractor" };
  }
  return true;
}

// X-ray reveals one answer arrow: a harder force first (everyone knows weight points down).
function xrayHint(q) {
  const multi = !Array.isArray(q.ex);
  const view = multi ? "A" : "all";
  const list = (multi ? q.ex.A : q.ex).slice().sort((a, b) => (a[0] === "W") - (b[0] === "W"));
  const e = list[0];
  const angle = Array.isArray(e[1]) ? e[1][0] : e[1];
  return { kind: "xray", view, force: e[0], angle };
}

function useUltimate(room, p, msg) {
  const g = room.game;
  if (room.phase !== "QUESTION" || msg.qn !== g.qNum || g.answers.has(p.id) || p.ultArmed || p.ult < DH.ULT_MAX) return false;
  p.ultArmed = true;
  p.ult = 0;
  if (p.job === "priest") p.hearts = MAX_HEARTS;
  if (p.job === "knight") p.fortress = 2;
  return true;
}

// Second chance: a wrong first try is sent back with what is still wrong (once, if time remains).
function wantsRetry(g, p, res) {
  if (p.armed !== "second_chance" || p.scUsed || res.acc >= 0.999) return false;
  if (g.timeTotal && g.endsAt - Date.now() < 3000) return false;
  p.scUsed = true;
  p.retry = res.wrongItems.slice(0, 6);
  return true;
}

// ---------------------------------------------------------------- the round
// Called by game.js at REVEAL for every ready student. Returns the class-level outcome.
function resolveRound(room, ready) {
  const g = room.game;
  const m = g.monster;
  const intent = g.intent;
  const out = { shield: false, shieldPct: 0, effect: null, heartsLost: 0, stolen: 0, cards: {}, ults: [], meteor: 0 };

  // 1. damage for each answer (before we know whether the class shield holds)
  let halfCount = 0, fullCount = 0;
  ready.forEach((p) => {
    const a = g.answers.get(p.id);
    p.tac = { card: p.armed, ult: p.ultArmed ? p.job : null, exhausted: p.hearts <= 0 };
    if (p.armed) out.cards[p.armed] = (out.cards[p.armed] || 0) + 1;
    if (p.ultArmed) out.ults.push({ id: p.id, name: p.name, job: p.job });
    if (!a) return;
    const full = a.res.acc >= 0.999, half = a.res.acc >= 0.5;
    if (half) halfCount++;
    if (full) fullCount++;
    a.dmg = damage(g, p, a);
    a.meteor = p.tac.ult === "mage" ? m.baseDmg * 2 : 0;
    out.meteor += a.meteor;
  });

  // 2. class shield (feature 4): enough of the class got it at least half right
  const counted = ready.filter((p) => p.bot || p.sock || g.answers.has(p.id)).length || 1;
  out.shieldPct = halfCount / counted;
  out.shield = out.shieldPct >= SHIELD_RATE;

  // 3. hearts, streaks, steals, gauge for each student
  ready.forEach((p) => {
    const a = g.answers.get(p.id);
    const online = p.bot || p.sock;
    if (!a && !online) return;                       // gone: nothing happens to them
    const acc = a ? a.res.acc : 0;
    const full = acc >= 0.999, half = acc >= 0.5;
    let protectedBy = null, lost = 0;
    if (!half) {
      if (out.shield) protectedBy = "class";
      else if (p.armed === "shield") protectedBy = "shield";
      else if (p.fortress > 0) { p.fortress--; protectedBy = "fortress"; }
      else if (p.job === "knight" && !p.knightUsed) { p.knightUsed = true; protectedBy = "knight"; }
      if (!protectedBy) lost = intent === "heavy" ? 2 : 1;
    }
    if (a && a.dmg < 0 && protectedBy) a.dmg = 0;     // "double" gone wrong, but you were protected
    p.hearts = Math.max(0, p.hearts - lost);
    p.heartsLost += lost;
    if (lost) out.heartsLost++;
    if (full) p.streak++;
    else if (!protectedBy) p.streak = 0;
    if (intent === "steal" && !half && !protectedBy && p.cards.length) {
      p.tac.stolen = p.cards.splice(Math.floor(Math.random() * p.cards.length), 1)[0];
      out.stolen++;
    }
    if (!p.tac.ult) p.ult = Math.min(DH.ULT_MAX, p.ult + (full ? 1 : (half ? 0.5 : 0)));
    Object.assign(p.tac, { lost, protectedBy, nowExhausted: p.hearts <= 0, dmg: a ? a.dmg + (a.meteor || 0) : 0 });
  });

  // 4. the monster's own move (a whole-class matter)
  if (!out.shield) {
    const total = ready.reduce((s, p) => { const a = g.answers.get(p.id); return s + (a ? Math.max(0, a.dmg) + (a.meteor || 0) : 0); }, 0);
    if (intent === "charge" && total < chargeTarget(g)) out.effect = { type: "heal", amount: Math.round(m.maxHp * HEAL_RATE), why: "ชาร์จพลังสำเร็จ" };
    if (intent === "regen" && fullCount < counted / 2) out.effect = { type: "heal", amount: Math.round(m.maxHp * HEAL_RATE), why: "ฟื้นตัว" };
  } else if (["heavy", "steal", "charge", "regen"].indexOf(intent) >= 0) {
    out.effect = { type: "blocked", why: "โล่ทั้งห้องกันท่า" + DH.INTENTS[intent].name + "ไว้ได้" };
  }
  return out;
}

// One student's damage this question (same maths as single-player, minus the timer cards).
function damage(g, p, a) {
  const m = g.monster;
  const base = m.baseDmg;
  const res = a.res;
  const card = p.armed;
  const ult = p.ultArmed ? p.job : null;
  const full = res.acc >= 0.999, half = res.acc >= 0.5;
  const remRatio = card === "freeze" || ult === "archer" ? 1 : a.remRatio;
  const maxSpd = p.job === "archer" ? 0.6 : 0.5;
  const sSpeed = half ? 1 + maxSpd * remRatio : 1;
  const streakNext = full ? p.streak + 1 : 0;
  const mStreak = streakNext >= 5 ? 1.2 : (streakNext >= 3 ? 1.1 : (streakNext >= 2 ? 1.05 : 1));
  const mClass = (p.job === "warrior" && streakNext >= 3) ? 1.15 : 1;
  let dmg = 0;
  if (card === "double") {
    dmg = full ? Math.round(base * sSpeed * mClass * 2 * mStreak) : -Math.round(base * 0.5);
  } else if (half) {
    let mCard = DH.CARD_MULT[card] || 1;
    if (card === "second_chance" && !p.scUsed) mCard = 1;
    dmg = Math.round(base * res.acc * sSpeed * mClass * mCard * mStreak);
  }
  const pierce = card === "breaker" || ult === "warrior" || ult === "archer";
  if (dmg > 0) {
    if (ult === "warrior") dmg = Math.round(dmg * 3);
    if (ult === "archer") dmg = Math.round(dmg * 1.6);
    if (ult === "knight" || ult === "priest") dmg = Math.round(dmg * 1.5);
    if (g.intent === "open") dmg = Math.round(dmg * 1.5);
    if (g.intent === "guard" && !pierce) dmg = Math.round(dmg * 0.5);
    if (p.hearts <= 0) dmg = Math.round(dmg * EXHAUSTED_MULT);
  }
  if (g.intent === "guard" && dmg > 0 && pierce) p.tac.pierced = true;
  return dmg;
}

// ---------------------------------------------------------------- card reward after a monster falls
function drawDraft(n) {
  const pool = DH.ALL_CARDS.slice();
  const study = pool.filter((c) => DH.CARDS[c].kind === "study");
  const out = [pick(study)];
  while (out.length < n) { const c = pick(pool); if (out.indexOf(c) < 0) out.push(c); }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function offerDrafts(room) {
  room.players.forEach((p) => {
    if (!p.ready) return;
    p.draft = drawDraft(p.job === "mage" ? 4 : 3);
    p.draftPicked = null;
  });
}

function pickDraft(room, p, cid) {
  if (room.phase !== "MON_DEFEAT" || !p.draft || p.draft.indexOf(cid) < 0) return false;
  if (p.cards.length >= DH.HAND_MAX) p.cards.shift();
  p.cards.push(cid);
  p.draftPicked = cid;
  p.draft = null;
  return true;
}

// Teacher moved on: anyone who didn't choose gets a random card from their offer.
function closeDrafts(room) {
  room.players.forEach((p) => { if (p.draft) pickDraft(room, p, pick(p.draft)); p.draft = null; });
}

function draftProgress(room) {
  let picked = 0, total = 0;
  room.players.forEach((p) => { if (!p.ready) return; total++; if (p.draftPicked) picked++; });
  return { picked, total };
}

// Bots play cards now and then, and always pick a reward.
function botTurn(room, p) {
  const g = room.game;
  if (p.ult >= DH.ULT_MAX && Math.random() < 0.6) useUltimate(room, p, { qn: g.qNum });
  if (p.cards.length && Math.random() < 0.35) {
    const counters = (DH.INTENTS[g.intent] || {}).counter || [];
    const i = Math.max(0, p.cards.findIndex((c) => counters.indexOf(c) >= 0));
    if (p.cards[i] !== "second_chance") useCard(room, p, { qn: g.qNum, idx: i });
  }
}

// ---------------------------------------------------------------- views
function playerTactics(room, p) {
  const g = room.game;
  return {
    hearts: p.hearts, maxHearts: MAX_HEARTS, cards: p.cards, armed: p.armed, ult: p.ult, ultMax: DH.ULT_MAX,
    ultArmed: p.ultArmed, fortress: p.fortress, hint: p.hint, retry: p.retry,
    intent: g && g.intent ? intentInfo(g) : null, shieldNeed: SHIELD_RATE
  };
}

module.exports = {
  setupPlayer, resetTurn, newStage, rollIntent, intentInfo, useCard, useUltimate, wantsRetry, resolveRound,
  offerDrafts, pickDraft, closeDrafts, draftProgress, botTurn, playerTactics, SHIELD_RATE, MAX_HEARTS
};
