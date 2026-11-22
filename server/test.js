// End-to-end test of the classroom server over real WebSockets (needs Node 22+ for the built-in client).
//   npm test
"use strict";
const { spawn } = require("child_process");
const path = require("path");

const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = "http://127.0.0.1:" + PORT;
let failures = 0;
const ok = (cond, label) => { console.log((cond ? "  ✓ " : "  ✗ ") + label); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A test client that records every message and can wait for one matching a predicate.
function client() {
  const sock = new WebSocket("ws://127.0.0.1:" + PORT + "/ws");
  const c = { sock, msgs: [], waiters: [], closed: false };
  sock.onmessage = (e) => {
    const m = JSON.parse(e.data);
    c.msgs.push(m);
    c.waiters = c.waiters.filter((w) => { if (w.pred(m)) { w.res(m); return false; } return true; });
  };
  sock.onclose = () => { c.closed = true; };
  c.ready = new Promise((r) => { sock.onopen = r; });
  c.send = (o) => sock.send(JSON.stringify(o));
  c.wait = (pred, ms = 3000) => {
    const hit = c.msgs.filter(pred).pop();
    if (hit) return Promise.resolve(hit);
    return new Promise((res, rej) => {
      c.waiters.push({ pred, res });
      setTimeout(() => rej(new Error("timeout waiting for message")), ms);
    });
  };
  c.next = (pred, ms) => { c.msgs = []; return c.wait(pred, ms); };
  return c;
}

const LOOK = { v: 2, race: "elf", skin: 1, hair: "long", hairColor: 2, outfit: "archer", main: 4, trim: 1, eyes: "big", mouth: "smile", blush: true, weapons: {} };

async function main() {
  const proc = spawn(process.execPath, [path.join(__dirname, "index.js")], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: "pipe" });
  let out = "";
  proc.stdout.on("data", (d) => { out += d; });
  proc.stderr.on("data", (d) => { out += d; });
  for (let i = 0; i < 50 && !out.includes("running"); i++) await sleep(100);

  try {
    console.log("HTTP");
    let r = await fetch(BASE + "/");
    ok(r.url.endsWith("/classroom/") && r.status === 200, "/ redirects to the classroom landing page");
    r = await fetch(BASE + "/js/data/stages.js");
    ok(r.status === 200 && (r.headers.get("content-type") || "").includes("javascript"), "game files are served");
    r = await fetch(BASE + "/server/rooms.js");
    ok(r.status === 404, "server source is not served");
    r = await fetch(BASE + "/js/../server/rooms.js");
    ok(r.status === 404 || r.status === 403, "path traversal is blocked");
    r = await fetch(BASE + "/api/info");
    const info = await r.json();
    ok(Array.isArray(info.lan) && info.port === PORT, "/api/info lists LAN addresses");

    console.log("Rooms");
    const host = client(); await host.ready;
    host.send({ t: "host:create", settings: { cls: "ม.4/2 <b>", mode: "sync", length: "short", opts: { cards: false } } });
    const room = await host.wait((m) => m.t === "room");
    ok(/^\d{6}$/.test(room.code) && room.hostToken, "teacher gets a 6-digit code and a host token");
    ok(room.settings.cls === "ม.4/2 b" && room.settings.opts.cards === false && room.settings.length === "short", "room settings are cleaned and kept");
    r = await fetch(BASE + "/api/room/" + room.code);
    ok((await r.json()).ok === true, "/api/room/<code> finds the room");
    r = await fetch(BASE + "/api/room/000000");
    ok((await r.json()).ok === false, "unknown code is reported");

    const bad = client(); await bad.ready;
    bad.send({ t: "join", code: "000000" });
    ok((await bad.wait((m) => m.t === "error")).reason === "no_room", "joining a wrong code is refused");

    // 30 phones join at once and make characters
    const kids = [];
    for (let i = 0; i < 30; i++) { const k = client(); kids.push(k); }
    await Promise.all(kids.map((k) => k.ready));
    kids.forEach((k) => k.send({ t: "join", code: room.code }));
    const toks = await Promise.all(kids.map((k) => k.wait((m) => m.t === "joined")));
    ok(toks.every((t) => t.token) && new Set(toks.map((t) => t.token)).size === 30, "30 students joined with their own tokens");
    let lobby = await host.next((m) => m.t === "lobby" && m.creating === 30);
    ok(lobby.players.length === 0, "students still making characters are not on the teacher screen yet");
    kids.forEach((k, i) => k.send({ t: "char", name: i < 2 ? "ต้น" : "นักเรียน " + i, job: ["warrior", "mage", "archer", "knight", "priest"][i % 5], look: LOOK }));
    lobby = await host.next((m) => m.t === "lobby" && m.players.length === 30);
    ok(lobby.players.length === 30 && lobby.creating === 0, "all 30 characters show up in the lobby");
    const names = lobby.players.map((p) => p.name);
    ok(names.includes("ต้น") && names.includes("ต้น 2"), "duplicate names get a number");
    ok(lobby.players.every((p) => p.look && p.look.race === "elf" && p.look.v === 2), "looks are passed through");
    const cnt = await kids[5].wait((m) => m.t === "count" && m.count === 30);
    ok(cnt.count === 30, "students see how many classmates are in");

    // validation
    const k0 = kids[0];
    k0.send({ t: "char", name: "  เหี้ย  ", job: "warrior", look: LOOK });
    ok((await k0.next((m) => m.t === "char_error")).message.length > 0, "rude names are refused");
    k0.send({ t: "char", name: "x".repeat(50) + "<script>", job: "hacker", look: { race: "dragon", skin: 99, hair: "../../x", hat: "<img>", weapons: { warrior: "nuke" } } });
    const me = await k0.next((m) => m.t === "you");
    ok(me.name.length === 18 && !me.name.includes("<"), "names are trimmed and stripped of tags");
    ok(me.job === "warrior" && me.look.race === "human" && me.look.skin >= 0 && me.look.skin < 8 && me.look.hair === "short" && me.look.hat === "" && !me.look.weapons.warrior, "a tampered look is rebuilt from the catalogue");

    // reconnect
    const kid7 = kids[7], tok7 = toks[7].token;
    kid7.sock.close();
    lobby = await host.next((m) => m.t === "lobby" && m.players.some((p) => p.name === "นักเรียน 7" && !p.online));
    ok(true, "a dropped phone shows as offline but keeps its place");
    const back = client(); await back.ready;
    back.send({ t: "join", code: room.code, token: tok7 });
    const you7 = await back.wait((m) => m.t === "you");
    ok(you7.ready && you7.name === "นักเรียน 7", "reconnecting with the token restores the same character");
    lobby = await host.next((m) => m.t === "lobby" && m.players.some((p) => p.name === "นักเรียน 7" && p.online));
    ok(lobby.players.length === 30, "no duplicate after reconnect");

    // kick
    const target = lobby.players.find((p) => p.name === "นักเรียน 9");
    host.send({ t: "host:kick", id: target.id });
    await kids[9].wait((m) => m.t === "kicked");
    ok(true, "kicked student is told");
    lobby = await host.next((m) => m.t === "lobby" && m.players.length === 29);
    ok(!lobby.players.some((p) => p.name === "นักเรียน 9"), "kicked student leaves the lobby");
    const again = client(); await again.ready;
    again.send({ t: "join", code: room.code, token: toks[9].token });
    ok((await again.wait((m) => m.t === "error")).reason === "kicked", "kicked student cannot come back with the same token");

    // a student cannot act as the teacher
    kids[3].send({ t: "host:kick", id: lobby.players[0].id });
    kids[3].send({ t: "host:start" });
    await sleep(400);
    ok(host.msgs.every((m) => m.t !== "lobby" || m.players.length === 29) && !kids[3].msgs.some((m) => m.phase === "STARTED"), "students cannot send teacher commands");

    // teacher refresh
    const host2 = client(); await host2.ready;
    host2.send({ t: "host:resume", code: room.code, hostToken: "wrong" });
    ok((await host2.wait((m) => m.t === "error")).reason === "no_room", "resume with a wrong host token is refused");
    host2.send({ t: "host:resume", code: room.code, hostToken: room.hostToken });
    lobby = await host2.wait((m) => m.t === "lobby");
    ok(lobby.players.length === 29, "teacher can reload the page and get the room back");

    // bots
    host2.send({ t: "host:bots", n: 5 });
    lobby = await host2.next((m) => m.t === "lobby" && m.players.length === 34);
    ok(lobby.players.filter((p) => p.bot).length === 5, "test bots join");

    // start
    const late = client(); await late.ready;
    late.send({ t: "join", code: room.code });
    await late.wait((m) => m.t === "joined");
    host2.send({ t: "host:start" });
    await kids[4].wait((m) => m.t === "game" && m.phase === "INTRO");
    ok(true, "students are told the game started");
    ok(!!(await late.wait((m) => m.t === "started_without_you")), "a student still on the character screen is told they missed the start");
    const later = client(); await later.ready;
    later.send({ t: "join", code: room.code });
    ok((await later.wait((m) => m.t === "error")).reason === "started", "new students cannot join after the start");

    // flooding and oversized messages
    const flood = client(); await flood.ready;
    flood.sock.send("x".repeat(70000));
    await sleep(300);
    ok(flood.closed, "an oversized message closes that connection");
    r = await fetch(BASE + "/healthz");
    ok((await r.json()).ok, "server is still healthy afterwards");

    // close room
    host2.send({ t: "host:close" });
    await kids[4].wait((m) => m.t === "closed");
    r = await fetch(BASE + "/api/room/" + room.code);
    ok((await r.json()).ok === false, "closing the room tells students and removes it");

    await gameTest();
  } catch (e) {
    failures++;
    console.log("  ✗ " + e.message);
  } finally {
    proc.kill();
  }
  console.log(failures ? "\n" + failures + " FAILED" : "\nall passed");
  process.exit(failures ? 1 : 0);
}

// A whole short game: 3 real students (one always right, one always wrong, one who drops out
// mid-question and comes back) plus 8 quick bots, played from the departure to the CSV.
async function gameTest() {
  console.log("Game");
  const { DH } = require("./shared");
  const keyPlace = (qid) => {
    const q = DH.QUESTIONS.find((x) => x.id === qid);
    // the same force can appear twice (two contact forces P): those become a list of angles
    const mk = (list) => list.reduce((o, e) => { const a = Array.isArray(e[1]) ? e[1][0] : e[1]; o[e[0]] = o[e[0]] === undefined ? a : [].concat(o[e[0]], a); return o; }, {});
    return Array.isArray(q.ex) ? { all: mk(q.ex) } : Object.keys(q.ex).reduce((o, v) => { o[v] = mk(q.ex[v]); return o; }, {});
  };

  const host = client(); await host.ready;
  host.send({ t: "host:create", settings: { cls: "test", mode: "sync", length: "short", pace: "normal", pack: "std_all", opts: { autoNext: false } } });
  const room = await host.wait((m) => m.t === "room");
  const names = ["เก่ง", "พลาด", "หลุด"];
  const kids = names.map(() => client());
  await Promise.all(kids.map((k) => k.ready));
  kids.forEach((k) => k.send({ t: "join", code: room.code }));
  const toks = await Promise.all(kids.map((k) => k.wait((m) => m.t === "joined")));
  kids.forEach((k, i) => k.send({ t: "char", name: names[i], job: i === 0 ? "archer" : "warrior", look: LOOK }));
  await host.wait((m) => m.t === "lobby" && m.players.length === 3);
  host.send({ t: "host:bots", n: 8 });
  await host.next((m) => m.t === "lobby" && m.players.length === 11);
  host.send({ t: "host:botspeed", speed: 0.05 });

  host.send({ t: "host:start" });
  const intro = await host.next((m) => m.t === "game" && m.phase === "INTRO");
  ok(intro.walkers.length === 5 && intro.monster.id === "slime", "departure shows 5 students and the first monster is the slime");
  ok(intro.qTotal === 8, "short game = 8 questions");
  const hp0 = intro.monster.maxHp;
  ok(hp0 === Math.round(1 * 100 * 0.65 * 11), "monster HP scales with class size (11 players)");

  let phase = "INTRO", qSeen = 0, revealOk = false, battleOk = false, boardOk = false, reconnectOk = false, damageOk = false;
  let wrongCard = 0, stagesSeen = new Set(["slime"]);
  let drop = kids[2];
  for (let step = 0; step < 120 && phase !== "SUMMARY"; step++) {
    host.send({ t: "host:next" });
    const v = await host.next((m) => m.t === "game" && m.phase !== phase, 15000);
    phase = v.phase;
    if (v.monster) stagesSeen.add(v.monster.id);
    if (phase === "QUESTION") {
      qSeen++;
      if (qSeen === 1) ok((!v.q.ex && !v.q.why), "teacher's question view has no answer key while students answer");
      const pq = await kids[0].wait((m) => m.t === "game" && m.phase === "QUESTION" && m.qNum === v.qNum);
      if (qSeen === 1) ok((!pq.q.ex && !pq.q.why && pq.endsAt > pq.now), "phones get the question without the key and with a deadline");
      kids[0].send({ t: "answer", qn: v.qNum, place: keyPlace(v.q.id) });
      kids[1].send({ t: "answer", qn: v.qNum, place: { all: { W: 90 } } });
      kids[1].send({ t: "answer", qn: v.qNum, place: keyPlace(v.q.id) });   // second try is ignored
      if (qSeen === 2) {
        // student 3 drops out mid-question and comes back
        drop.sock.close();
        await sleep(200);
        drop = client(); await drop.ready;
        drop.send({ t: "join", code: room.code, token: toks[2].token });
        const back = await drop.wait((m) => m.t === "game" && m.phase === "QUESTION");
        reconnectOk = back.qNum === v.qNum && back.answered === false;
        kids[2] = drop;
      }
      drop.send({ t: "answer", qn: v.qNum, place: keyPlace(v.q.id) });
      // everyone answered (bots are fast) -> server reveals on its own
      const rv = await host.wait((m) => m.t === "game" && m.phase === "REVEAL" && m.qNum === v.qNum, 15000);
      phase = "REVEAL";
      if (qSeen === 1) {
        revealOk = rv.q.ex && rv.q.why && rv.reveal.answered === 11 && rv.reveal.arrows && Object.keys(rv.reveal.arrows).length > 0;
        const mine0 = await kids[0].wait((m) => m.t === "game" && m.phase === "REVEAL");
        const mine1 = await kids[1].wait((m) => m.t === "game" && m.phase === "REVEAL");
        damageOk = mine0.mine.acc === 1 && mine0.mine.dmg > 100 && mine1.mine.acc < 0.5 && mine1.mine.dmg === 0;
        const b = rv.reveal;
        ok(b.full + b.part + b.wrong === 11, "reveal counts every answer");
      }
    }
    if (phase === "BATTLE") {
      const at = v.battle.attackers;
      if (!battleOk) {
        const hits = at.filter((a) => a.hit), misses = at.filter((a) => !a.hit);
        battleOk = at.length <= 5 && hits.length >= 1 && hits.every((a, i) => i === 0 || a.secs >= hits[i - 1].secs || a.acc < 1);
        wrongCard += misses.length;
      }
    }
    if (phase === "BOARD" && !boardOk) {
      boardOk = v.board.length === 10 && v.board.every((r, i) => i === 0 || v.board[i - 1].score >= r.score);
      const top = v.board.find((r) => r.name === "เก่ง");
      ok(!!top, "the student who always answers right is on the top-10 board");
    }
  }
  ok(revealOk, "reveal sends the key, explanation and the class's arrows");
  ok(damageOk, "right answers deal damage (with speed bonus), wrong ones deal none");
  ok(battleOk, "battle sends up to 5 attackers, fastest correct first");
  ok(boardOk, "leaderboard is sorted by damage");
  ok(reconnectOk, "a student who drops mid-question gets the same open question back");
  ok(qSeen === 8 || stagesSeen.has("dragon"), "the game runs through to the dragon (" + qSeen + " questions, " + [...stagesSeen].join(" > ") + ")");
  ok(phase === "SUMMARY", "game reaches the class summary");
  const sum = host.msgs.filter((m) => m.t === "game" && m.phase === "SUMMARY").pop();
  ok(sum && sum.summary.questions.length === qSeen && Array.isArray(sum.summary.mistakes), "summary lists every question and the class's common mistakes");
  const fin = host.msgs.filter((m) => m.t === "game" && m.phase === "SUMMARY").pop();
  ok(fin.board.length === 11 && (fin.result === "win" || fin.result === "lose"), "final board ranks all 11 and has a result");
  const me = kids[0].msgs.filter((m) => m.t === "game" && m.me).pop();
  ok(me && me.me.correct === qSeen && me.rank >= 1, "phones get a personal summary" + (me && me.me.correct !== qSeen ? " (correct " + me.me.correct + "/" + qSeen + ", answered " + me.me.answered + ")" : ""));

  let r = await fetch(BASE + "/api/room/" + room.code + "/results.csv?key=" + room.hostToken);
  const text = await r.text();
  ok(r.status === 200 && text.split("\r\n").length >= 13 && text.includes("เก่ง"), "teacher can download the results CSV");
  r = await fetch(BASE + "/api/room/" + room.code + "/results.csv?key=nope");
  ok(r.status === 403, "CSV needs the teacher's key");

  host.send({ t: "host:lobby" });
  const lob = await host.wait((m) => m.t === "lobby" && m.phase === "LOBBY");
  ok(lob.players.length === 11, "play again: everyone is back in the lobby");
  host.send({ t: "host:close" });
}

main();
