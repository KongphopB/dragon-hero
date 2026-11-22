// Classroom rooms: create, join, character, kick, reconnect, test bots.
// The game itself (questions, battles, ending) lives in game.js.
"use strict";
const crypto = require("crypto");
const { DH } = require("./shared");
const game = require("./game");

const MAX_ROOMS = 200;
const MAX_PLAYERS = 60;
const HOST_GONE_MS = 30 * 60 * 1000;     // room closes if the teacher is away this long
const ROOM_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const BAD_WORDS = ["ควย", "เหี้ย", "สัส", "เย็ด", "มึง", "กู", "หี", "แตด", "fuck", "shit", "bitch", "dick"];
const BOT_NAMES = ["ต้นกล้า", "ใบเฟิร์น", "ปลื้ม", "มายด์", "ภูมิ", "แพรวา", "ไอซ์", "ฟ้าใส", "บอส", "น้ำหวาน", "กัปตัน", "ข้าวหอม",
  "ปั้นจั่น", "มิวสิค", "ธามไท", "ออม", "เจได", "พิ้งค์", "ณดล", "ฝ้าย", "เต้ย", "ใบบัว", "กาย", "เพลง", "ไผ่", "มะปราง"];

const rooms = new Map();   // code -> Room

const token = () => crypto.randomBytes(12).toString("base64url");
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------- validation
function cleanName(raw) {
  let s = String(raw || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 18);
  if (!s) return { error: "ใส่ชื่อก่อนนะ" };
  const flat = s.toLowerCase().replace(/[\s._\-*]/g, "");
  if (BAD_WORDS.some((w) => flat.includes(w))) return { error: "ชื่อนี้ใช้ไม่ได้ ลองตั้งชื่ออื่น" };
  return { name: s };
}

const ids = (list) => list.map((o) => o.id);
function oneOf(v, allowed, dflt) { return allowed.indexOf(v) >= 0 ? v : dflt; }
function idx(v, n) { v = Math.floor(Number(v)); return v >= 0 && v < n ? v : 0; }

// Anything a phone sends is rebuilt from the catalogue, so a tampered look can't break other screens.
function cleanLook(raw, job) {
  const A = DH.AVATAR, P = DH.AVATAR_PALETTES;
  const l = A.normalize(JSON.parse(JSON.stringify(raw || {})), job);
  const race = A.races.filter((r) => r.id === l.race)[0] || A.races[0];
  const weapons = {};
  Object.keys(A.weapons).forEach((j) => {
    if (l.weapons && ids(A.weapons[j]).indexOf(l.weapons[j]) >= 0) weapons[j] = l.weapons[j];
  });
  return {
    v: 2,
    race: race.id,
    raceVar: race.variants ? oneOf(l.raceVar, ids(race.variants), race.variants[0].id) : "",
    skin: idx(l.skin, P.skin.length),
    eyes: oneOf(l.eyes, ids(A.eyes), "normal"),
    eyeColor: idx(l.eyeColor, (P.eye || [0]).length),
    mouth: oneOf(l.mouth, ids(A.mouths), "smile"),
    beard: oneOf(l.beard, ids(A.beards), ""),
    blush: !!l.blush,
    hair: oneOf(l.hair, ids(A.hair), "short"),
    hairColor: idx(l.hairColor, P.hair.length),
    outfit: oneOf(l.outfit, ids(A.outfits), "tunic"),
    main: idx(l.main, P.cloth.length),
    trim: idx(l.trim, P.cloth.length),
    weapons,
    hat: oneOf(String(l.hat || ""), ids(A.hats), ""),
    acc: oneOf(l.acc, ids(A.accs), ""),
    pet: oneOf(l.pet, ids(A.pets), "")
  };
}

function cleanSettings(s) {
  s = s || {};
  const o = s.opts || {};
  return {
    cls: String(s.cls || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 30),
    pack: String(s.pack || "std_all").slice(0, 40),
    mode: s.mode === "self" ? "self" : "sync",
    length: ["short", "medium", "long"].indexOf(s.length) >= 0 ? s.length : "medium",
    pace: ["normal", "slow", "untimed"].indexOf(s.pace) >= 0 ? s.pace : "normal",
    opts: { cards: o.cards !== false, hideWrong: o.hideWrong !== false, autoNext: !!o.autoNext, sound: o.sound !== false }
  };
}

// ---------------------------------------------------------------- room
class Room {
  constructor(settings) {
    do { this.code = String(100000 + crypto.randomInt(900000)); } while (rooms.has(this.code));
    this.hostToken = token();
    this.settings = cleanSettings(settings);
    this.players = new Map();     // id -> player
    this.kicked = new Set();      // tokens that may not come back
    this.phase = "LOBBY";
    this.host = null;             // host socket
    this.createdAt = Date.now();
    this.hostSeenAt = Date.now();
    this.nextId = 1;
    this.pushTimer = null;
    this.progressTimer = null;
    this.game = null;
    rooms.set(this.code, this);
  }

  // What the teacher screen draws.
  hostView() {
    const list = [];
    let creating = 0;
    this.players.forEach((p) => {
      if (!p.ready) { creating++; return; }
      list.push({ id: p.id, name: p.name, job: p.job, look: p.look, online: p.bot || !!p.sock, bot: !!p.bot });
    });
    return { t: "lobby", code: this.code, phase: this.phase, settings: this.settings, players: list, creating };
  }

  playerView(p) {
    return {
      t: "you", id: p.id, phase: this.phase, ready: p.ready, name: p.name, job: p.job, look: p.look,
      cls: this.settings.cls, count: this.readyCount()
    };
  }

  readyCount() { let n = 0; this.players.forEach((p) => { if (p.ready) n++; }); return n; }

  // Coalesce bursts (30 phones joining at once) into one update every 150 ms.
  push() {
    if (this.pushTimer) return;
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      if (this.host) this.host.sendJson(this.hostView());
      const count = this.readyCount();
      this.players.forEach((p) => { if (p.sock && p.ready) p.sock.sendJson({ t: "count", count }); });
    }, 150);
  }

  attachHost(sock) {
    if (this.host && this.host !== sock) this.host.close(4000);   // newest teacher tab wins
    this.host = sock;
    this.hostSeenAt = Date.now();
    sock.sendJson({ t: "room", code: this.code, hostToken: this.hostToken, settings: this.settings });
    sock.sendJson(this.hostView());
    if (this.game) sock.sendJson(game.hostView(this));
  }

  join(sock, tok) {
    let p = null;
    if (tok && this.kicked.has(tok)) return { error: "kicked" };
    this.players.forEach((x) => { if (tok && x.token === tok) p = x; });
    if (!p) {
      if (this.phase !== "LOBBY") return { error: "started" };
      if (this.players.size >= MAX_PLAYERS) return { error: "full" };
      p = { id: "p" + this.nextId++, token: token(), name: "", job: "warrior", look: null, ready: false, sock: null, joinedAt: Date.now() };
      this.players.set(p.id, p);
    }
    if (p.sock && p.sock !== sock) p.sock.close(4001);   // same student opened a second tab
    p.sock = sock;
    sock.sendJson({ t: "joined", token: p.token });
    sock.sendJson(this.playerView(p));
    if (this.game && p.ready) sock.sendJson(game.playerView(this, p));
    this.push();
    return { player: p };
  }

  setChar(p, msg) {
    const n = cleanName(msg.name);
    if (n.error) return p.sock && p.sock.sendJson({ t: "char_error", message: n.error });
    let name = n.name, k = 2;
    const taken = (nm) => { let hit = false; this.players.forEach((x) => { if (x !== p && x.ready && x.name === nm) hit = true; }); return hit; };
    while (taken(name)) name = n.name.slice(0, 15) + " " + k++;
    p.name = name;
    p.job = DH.JOBS[msg.job] ? msg.job : "warrior";
    p.look = cleanLook(msg.look, p.job);
    p.ready = true;
    if (p.sock) p.sock.sendJson(this.playerView(p));
    this.push();
  }

  leave(p) {
    p.sock = null;
    // Someone who never finished their character just drops out; others wait to reconnect.
    if (!p.ready) this.players.delete(p.id);
    this.push();
  }

  kick(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.kicked.add(p.token);
    this.players.delete(id);
    if (p.sock) { p.sock.sendJson({ t: "kicked" }); p.sock.close(4002); }
    this.push();
  }

  addBots(n) {
    const jobs = Object.keys(DH.JOBS);
    for (let i = 0; i < n && this.players.size < MAX_PLAYERS; i++) {
      const job = pick(jobs);
      const p = { id: "p" + this.nextId++, token: token(), job, ready: true, sock: null, bot: true, joinedAt: Date.now() };
      p.look = cleanLook(DH.AVATAR.random(job, () => false), job);
      p.name = "";
      this.players.set(p.id, p);
      this.setChar(p, { name: "🤖" + pick(BOT_NAMES), job, look: p.look });
    }
    this.push();
  }

  start() {
    if (this.phase !== "LOBBY" || !this.readyCount()) return;
    // Students still on the character screen are left out of this game.
    this.players.forEach((p) => { if (!p.ready) { if (p.sock) p.sock.sendJson({ t: "started_without_you" }); this.players.delete(p.id); } });
    game.start(this);
    this.push();
  }

  // Everyone gets the new game state right away (phase changes are rare and matter).
  broadcastGame() {
    if (!this.game) return;
    if (this.host) this.host.sendJson(game.hostView(this));
    this.players.forEach((p) => { if (p.sock && p.ready) p.sock.sendJson(game.playerView(this, p)); });
  }

  // While a question is open: how many have answered (at most 5 updates a second).
  pushProgress() {
    if (this.progressTimer) return;
    this.progressTimer = setTimeout(() => {
      this.progressTimer = null;
      if (!this.game || this.phase !== "QUESTION") return;
      const n = this.game.answers.size;
      const msg = { t: "progress", answered: n, players: this.readyCount() };
      if (this.host) this.host.sendJson(msg);
      this.players.forEach((p) => { if (p.sock && p.ready) p.sock.sendJson(msg); });
    }, 200);
  }

  backToLobby() {
    game.stop(this);
    this.phase = "LOBBY";
    this.players.forEach((p) => { if (p.sock) p.sock.sendJson(this.playerView(p)); });
    this.push();
  }

  close() {
    game.stop(this);
    this.players.forEach((p) => { if (p.sock) { p.sock.sendJson({ t: "closed" }); p.sock.close(4003); } });
    if (this.host) this.host.sendJson({ t: "closed" });
    rooms.delete(this.code);
  }
}

// ---------------------------------------------------------------- message routing
// Each socket is either the teacher of one room or one student in one room.
function handle(sock, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m.t !== "string") return;

  // rate limit: 30 messages per 3 seconds per connection
  const now = Date.now();
  sock.rate = (sock.rate || []).filter((t) => now - t < 3000);
  if (sock.rate.length >= 30) return;
  sock.rate.push(now);

  if (m.t === "host:create") {
    if (rooms.size >= MAX_ROOMS) return sock.sendJson({ t: "error", reason: "busy" });
    const room = new Room(m.settings);
    sock.role = { room, host: true };
    room.attachHost(sock);
    return;
  }
  if (m.t === "host:resume") {
    const room = rooms.get(String(m.code));
    if (!room || room.hostToken !== m.hostToken) return sock.sendJson({ t: "error", reason: "no_room" });
    sock.role = { room, host: true };
    room.attachHost(sock);
    return;
  }
  if (m.t === "join") {
    const room = rooms.get(String(m.code));
    if (!room) return sock.sendJson({ t: "error", reason: "no_room" });
    const res = room.join(sock, m.token);
    if (res.error) return sock.sendJson({ t: "error", reason: res.error });
    sock.role = { room, player: res.player };
    return;
  }

  const role = sock.role;
  if (!role || !rooms.has(role.room.code)) return;
  const room = role.room;

  if (role.host) {
    if (room.host !== sock) return;
    room.hostSeenAt = now;
    if (m.t === "host:kick") room.kick(String(m.id));
    else if (m.t === "host:bots") room.addBots(Math.max(1, Math.min(20, Number(m.n) || 5)));
    else if (m.t === "host:start") room.start();
    else if (m.t === "host:lobby") room.backToLobby();
    else if (m.t === "host:next" && room.game) game.next(room);
    else if (m.t === "host:botspeed") room.botSpeed = Math.max(0.05, Math.min(1, Number(m.speed) || 1));
    else if (m.t === "host:settings") { room.settings = cleanSettings(m.settings); room.push(); }
    else if (m.t === "host:close") room.close();
    return;
  }
  const p = role.player;
  if (p.sock !== sock || !room.players.has(p.id)) return;
  if (m.t === "answer" && room.game && p.ready) game.answer(room, p, m);
  else if (m.t === "char" && room.phase === "LOBBY") room.setChar(p, m);
  else if (m.t === "unready" && room.phase === "LOBBY") { p.ready = false; sock.sendJson(room.playerView(p)); room.push(); }
}

function onClose(sock) {
  const role = sock.role;
  if (!role) return;
  const room = role.room;
  if (role.host) { if (room.host === sock) { room.host = null; room.hostSeenAt = Date.now(); } return; }
  if (role.player.sock === sock) room.leave(role.player);
}

// Housekeeping every 30 s: forget abandoned rooms.
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room) => {
    if (now - room.createdAt > ROOM_MAX_AGE_MS || (!room.host && now - room.hostSeenAt > HOST_GONE_MS)) room.close();
  });
}, 30000).unref();

// Spreadsheet of the class results; only the teacher (host token) may download it.
function resultsCsv(code, key) {
  const room = rooms.get(String(code));
  if (!room || room.hostToken !== key || !room.game) return null;
  return { csv: game.csv(room), name: "dragon-hero-" + (room.settings.cls || room.code).replace(/[^\w\u0E00-\u0E7F.-]+/g, "_") + ".csv" };
}

function roomInfo(code) {
  const room = rooms.get(String(code));
  return room ? { ok: true, cls: room.settings.cls, phase: room.phase } : { ok: false };
}

module.exports = { handle, onClose, roomInfo, resultsCsv, rooms, cleanLook, cleanName };
