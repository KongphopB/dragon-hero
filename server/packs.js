// Teacher-made question packs (milestone 5). A pack arrives with "host:create" from the teacher's
// browser (where it is stored). Every item is either a reference to the built-in bank ({ ref: id })
// or a question the teacher wrote ({ q: {...} }). Written questions are rebuilt field by field here:
// only the simple single-object scenes the editor can make are accepted, so a hand-edited file
// can't break the game for the class.
"use strict";
const { DH } = require("./shared");

const MAX_ITEMS = 80;
const SCENES = ["flat", "inc", "r"];
const FORCES = ["W", "N", "T", "U", "f", "F"];
const LEVELS = ["ง่าย", "กลาง", "ยาก"];

const str = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b-\u001f<>]/g, "").trim().slice(0, n);
const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
const ang = (v) => ((Math.round(Number(v)) % 360) + 360) % 360;
const angles = (list, n) => (Array.isArray(list) ? list : []).slice(0, n).map(Number).filter(isFinite).map(ang);

// One written question -> a question object the game can use, or null.
function cleanQuestion(raw, i) {
  if (!raw || typeof raw !== "object") return null;
  const k = SCENES.indexOf(raw.k) >= 0 ? raw.k : null;
  if (!k) return null;
  const bt = (Array.isArray(raw.bt) ? raw.bt : []).filter((f, j, a) => FORCES.indexOf(f) >= 0 && a.indexOf(f) === j);
  const ex = (Array.isArray(raw.ex) ? raw.ex : []).slice(0, 6)
    .filter((e) => Array.isArray(e) && bt.indexOf(e[0]) >= 0 && isFinite(Number(e[1])))
    .map((e) => [e[0], ang(e[1])]);
  const t = str(raw.t, 400);
  if (!t || !ex.length || bt.length < 2) return null;
  const q = {
    id: "my_" + i + "_" + str(raw.id, 24).replace(/[^\w-]/g, ""),
    stage: int(raw.stage, 1, 5, 1),
    type: k === "inc" ? "B" : "A",
    lv: LEVELS.indexOf(raw.lv) >= 0 ? raw.lv : "กลาง",
    topic: DH.TOPIC_LABELS[raw.topic] ? raw.topic : (k === "inc" ? "incline" : (k === "r" ? "rope" : "flat")),
    tg: str(raw.tg, 40) || "โจทย์ของครู",
    st: "สมดุล",
    k,
    rp: angles(raw.rp, 3),
    bt,
    t,
    ex,
    why: str(raw.why, 800) || "ดูลูกศรเฉลยบนกระดาน",
    tm: int(raw.tm, 8, 120, 25),
    tol: int(raw.tol, 8, 20, 12),
    custom: true
  };
  if (k === "inc") { q.ia = int(raw.ia, 5, 80, 30); if (raw.dot) q.dot = 1; }
  if (k === "r" && raw.two) q.two = 1;
  const fa = angles(raw.fa, 2);
  if (fa.length) q.fa = fa;
  return q;
}

// The whole pack -> { name, questions } (built-in questions by reference, written ones rebuilt).
function cleanPack(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) return null;
  const byId = {};
  DH.QUESTIONS.forEach((q) => { byId[q.id] = q; });
  const questions = [];
  raw.items.slice(0, MAX_ITEMS).forEach((it, i) => {
    if (it && typeof it.ref === "string" && byId[it.ref]) questions.push(byId[it.ref]);
    else if (it && it.q) { const q = cleanQuestion(it.q, i); if (q) questions.push(q); }
  });
  if (!questions.length) return null;
  return { name: str(raw.name, 60) || "ชุดของครู", questions };
}

module.exports = { cleanPack, cleanQuestion, FORCES, SCENES };
