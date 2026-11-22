// Teacher lobby (room code screen): the whole screen is the town plaza where every student
// who has joined wanders around as their own character. Room code + QR sit small in the top
// bar, the start button top-right. Clicking a student offers "kick". Live over DH.Net.
(function () {
  var DH = window.DH;
  var SESSION = "dh_host_room";   // { code, hostToken } so a page reload gets the same room back
  var net = null, room = null;    // room: { code, hostToken, settings, phase }
  var kids = [];                  // { id, name, job, look, online, x, y, tx, ty, wait, el, flip, stack, walking }
  var raf = 0, last = 0, synced = false, joinBase = "";
  var held = null;                // the student whose menu is open stands still

  // Positions are kept in fractions of the plaza picture (1200x896, drawn "cover" anchored 50% 70%),
  // so the walkable floor and the fountain stay in place whatever the screen shape.
  var IMG = { w: 1200, h: 896, ax: 0.5, ay: 0.7 };
  var FLOOR = { y0: 0.55, y1: 0.9 };                          // back edge .. front edge of the plaza floor
  var FOUNTAIN = { cx: 0.5, cy: 0.6, rx: 0.17, ry: 0.105 };  // nobody stands inside the fountain
  var SPEED = 0.055;      // screen widths per second

  // Where the picture sits on screen right now.
  function geo() {
    var st = stage(), W = st.clientWidth, H = st.clientHeight;
    var s = Math.max(W / IMG.w, H / IMG.h), rw = IMG.w * s, rh = IMG.h * s;
    return { W: W, H: H, rw: rw, rh: rh, ox: (W - rw) * IMG.ax, oy: (H - rh) * IMG.ay };
  }
  function toScreen(g, x, y) { return { x: g.ox + x * g.rw, y: g.oy + y * g.rh }; }
  function inFountain(x, y) {
    var a = (x - FOUNTAIN.cx) / FOUNTAIN.rx, b = (y - FOUNTAIN.cy) / FOUNTAIN.ry;
    return a * a + b * b < 1;
  }
  function onScreen(g, x, y) {
    var p = toScreen(g, x, y);
    return p.x > g.W * 0.04 && p.x < g.W * 0.96 && p.y > 150 && p.y < g.H * 0.97;
  }
  function okSpot(g, x, y) { return y >= FLOOR.y0 && y <= FLOOR.y1 && !inFountain(x, y) && onScreen(g, x, y); }
  function clearPath(x0, y0, x1, y1) {
    for (var i = 1; i <= 12; i++) { var t = i / 12; if (inFountain(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  function randomSpot(g) {
    for (var i = 0; i < 200; i++) {
      var x = rnd(0, 1), y = rnd(FLOOR.y0 + 0.04, FLOOR.y1);
      if (okSpot(g, x, y)) return { x: x, y: y };
    }
    return { x: 0.5, y: FLOOR.y1 };
  }

  function esc(s) { return DH.esc(s); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function stage() { return document.getElementById("lbStage"); }
  function $(id) { return document.getElementById(id); }
  function prettyCode(c) { return c.slice(0, 3) + " " + c.slice(3); }

  // Phones can't reach "localhost", so when the teacher opened the page that way, point the QR
  // at this computer's Wi-Fi address instead.
  function findJoinBase() {
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    var here = location.origin + location.pathname.replace(/host\.html$/, "");
    if (!local) return Promise.resolve(here);
    return fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (info) {
      return info.lan && info.lan[0] ? "http://" + info.lan[0] + ":" + info.port + "/classroom/" : here;
    }).catch(function () { return here; });
  }
  // The QR goes straight to the student page; the short address in the bar leads to the landing page.
  function joinUrl() { return joinBase + "play.html?code=" + room.code; }
  function shortUrl() { return joinBase.replace(/^https?:\/\//, "").replace(/\/$/, ""); }

  // ---------------------------------------------------------------- screen
  function draw() {
    var root = $("lobby");
    root.hidden = false;
    $("setup").hidden = true;
    root.innerHTML =
      '<div class="lb-stage" id="lbStage">' +
        '<img class="lb-bg" src="../assets/bg/bg_plaza.webp" alt="">' +
        '<div class="lb-shade"></div>' +
        '<header class="lb-bar">' +
          '<div class="lb-brand"><span>🐉</span><b>' + (room.settings.cls ? esc(room.settings.cls) : "Dragon Hero") + '</b></div>' +
          '<button type="button" class="lb-code" id="lbCode" title="ขยายรหัสและ QR">' +
            '<span class="lb-qr-mini">' + window.QRGen.toSvg(joinUrl(), 34) + '</span>' +
            '<span class="lb-code-txt"><small>รหัสห้อง</small><b>' + prettyCode(room.code) + '</b></span>' +
            '<span class="lb-url">' + esc(shortUrl()) + '</span>' +
            '<span class="lb-zoom">⤢</span>' +
          '</button>' +
          '<div class="lb-right">' +
            '<span class="lb-count" id="lbCount"></span>' +
            '<button type="button" class="lb-icon" id="lbSettings" title="ตั้งค่าห้อง">⚙️</button>' +
            '<button type="button" class="btn-pri lb-start" id="lbStart" disabled>▶ เริ่มผจญภัย</button>' +
          '</div>' +
        '</header>' +
        '<div class="lb-empty" id="lbEmpty"><b>รอนักเรียนเข้าห้อง…</b><span>ให้นักเรียนสแกน QR หรือเข้า ' + esc(shortUrl()) + ' แล้วกรอกรหัส</span>' +
          '<button type="button" class="btn-sec" data-bigcode>⤢ ขยายรหัสให้เห็นทั้งห้อง</button></div>' +
        '<div class="lb-feed" id="lbFeed" aria-live="polite"></div>' +
        '<div class="lb-started" id="lbStarted" hidden><div class="rpg-card">' +
          '<b>⚔️ เริ่มการผจญภัยแล้ว!</b><span>ฉากออกเดินทางและโจทย์จะมาในขั้นถัดไปของการพัฒนา</span>' +
          '<button type="button" class="btn-sec" id="lbBackLobby">↩ กลับล็อบบี้ (ทดสอบ)</button></div></div>' +
      '</div>' +
      '<div class="lb-big" id="lbBig" hidden><div class="lb-big-card">' +
        '<div class="lb-big-qr">' + window.QRGen.toSvg(joinUrl(), 260) + '</div>' +
        '<div><small>เข้าที่</small><div class="lb-big-url">' + esc(shortUrl()) + '</div>' +
        '<small>รหัสห้อง</small><div class="lb-big-code">' + prettyCode(room.code) + '</div>' +
        '<button type="button" class="btn-sec" data-closebig>ย่อกลับ</button></div>' +
      '</div></div>' +
      '<div class="lb-pop" id="lbPop" hidden></div>' +
      '<div class="lb-panel" id="lbPanel" hidden></div>';
    kids = [];
    synced = false;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function refreshBar(creating) {
    if (!$("lbCount")) return;
    $("lbCount").innerHTML = "👥 <b>" + kids.length + "</b> คน" + (creating ? ' <span class="lb-creating">✏️ กำลังสร้างตัวละคร ' + creating + '</span>' : "");
    $("lbStart").disabled = !kids.length || room.phase !== "LOBBY";
    $("lbEmpty").hidden = kids.length > 0;
    $("lbStarted").hidden = room.phase === "LOBBY";
  }

  function panelHtml() {
    var s = room.settings, P = DH.PACKS.filter(function (p) { return p.id === s.pack; })[0];
    var bots = kids.filter(function (k) { return k.bot; }).length;
    return '<div class="lb-panel-head"><b>⚙️ ห้อง ' + prettyCode(room.code) + '</b><button type="button" class="btn-sec" data-closepanel>✕</button></div>' +
      '<dl>' +
        '<dt>ชุดโจทย์</dt><dd>' + esc(P ? P.name : s.pack) + '</dd>' +
        '<dt>โหมด</dt><dd>' + (s.mode === "sync" ? "ทั้งห้องโจทย์เดียวกัน" : "ต่างคนต่างทำ") + '</dd>' +
        '<dt>ความยาว</dt><dd>' + ({ short: "สั้น", medium: "กลาง", long: "ยาว" })[s.length] + ' · ' + ({ normal: "เวลาปกติ", slow: "ให้เวลาเพิ่ม", untimed: "ไม่จับเวลา" })[s.pace] + '</dd>' +
        '<dt>การ์ดกลยุทธ์</dt><dd>' + (s.opts.cards ? "เปิด" : "ปิด") + '</dd>' +
      '</dl>' +
      '<div class="lb-panel-sec">ทดสอบ</div>' +
      '<button type="button" class="btn-sec" data-bots="5">🤖 เพิ่มนักเรียนทดสอบ 5 คน' + (bots ? ' <small>(มีอยู่ ' + bots + ')</small>' : '') + '</button>' +
      '<div class="lb-panel-sec">ห้อง</div>' +
      '<button type="button" class="btn-sec lb-danger" data-closeroom>🚪 ปิดห้องนี้</button>';
  }

  // ---------------------------------------------------------------- students
  function kidHtml(k) {
    return '<div class="lb-kid-flip' + (k.flip && k.flip.classList.contains("face-left") ? " face-left" : "") + '">' +
      DH.Avatar.render(k.look, k.job, { walking: true }) + '</div>' +
      '<div class="lb-tag">' + (k.online ? "" : "📵 ") + esc(k.name) + '</div><i class="lb-spark"></i>';
  }

  function addKid(p, animate) {
    var spot = randomSpot(geo());
    var k = { id: p.id, name: p.name, job: p.job, look: p.look, online: p.online, bot: p.bot, x: spot.x, y: spot.y, wait: rnd(0.4, 2), walking: false };
    k.tx = k.x; k.ty = k.y;
    var el = document.createElement("div");
    el.className = "lb-kid" + (animate ? " is-new" : "");
    el.dataset.kid = k.id;
    k.el = el;
    paint(k);
    stage().appendChild(el);
    kids.push(k);
    place(k);
    if (animate) {
      setTimeout(function () { el.classList.remove("is-new"); }, 1200);
      feed("✨ <b>" + esc(p.name) + "</b> เข้าห้องแล้ว");
    }
  }

  function paint(k) {
    k.el.innerHTML = kidHtml(k);
    k.el.classList.toggle("is-offline", !k.online);
    k.flip = k.el.firstChild;
    k.stack = k.el.querySelector(".avatar-stack");
    setWalking(k, k.walking);
  }

  function removeKid(k, why) {
    kids = kids.filter(function (x) { return x !== k; });
    if (held === k) { held = null; $("lbPop").hidden = true; }
    k.el.classList.add("is-gone");
    setTimeout(function () { k.el.remove(); }, 600);
    if (why) feed(why);
  }

  // Bring the plaza in line with the server's player list.
  function sync(list) {
    var seen = {};
    list.forEach(function (p) {
      seen[p.id] = true;
      var k = kids.filter(function (x) { return x.id === p.id; })[0];
      if (!k) return addKid(p, synced);
      var changed = k.name !== p.name || k.job !== p.job || JSON.stringify(k.look) !== JSON.stringify(p.look) || k.online !== p.online;
      if (changed) {
        k.name = p.name; k.job = p.job; k.look = p.look; k.online = p.online;
        paint(k);
      }
    });
    kids.slice().forEach(function (k) { if (!seen[k.id]) removeKid(k, "👋 <b>" + esc(k.name) + "</b> ออกจากห้อง"); });
    synced = true;
  }

  function setWalking(k, on) {
    k.walking = on;
    k.stack.classList.toggle("is-walking", on);
    k.stack.classList.toggle("is-idle", !on);
    k.el.classList.toggle("is-still", !on);
  }

  function place(k, g) {
    g = g || geo();
    // Farther up the plaza = farther away: smaller and drawn behind.
    var depth = Math.max(0, Math.min(1, (k.y - FLOOR.y0) / (FLOOR.y1 - FLOOR.y0)));
    var s = 0.9 + depth * 0.45;
    var p = toScreen(g, k.x, k.y);
    k.el.style.left = p.x.toFixed(1) + "px";
    k.el.style.top = p.y.toFixed(1) + "px";
    k.el.style.transform = "translate(-50%, -100%) scale(" + s.toFixed(3) + ")";
    k.el.style.zIndex = String(10 + Math.round(k.y * 100));
  }

  // Next stroll: a nearby free spot that does not mean walking through the fountain.
  function pickTarget(g, k) {
    for (var i = 0; i < 20; i++) {
      var x = k.x + rnd(-0.25, 0.25), y = k.y + rnd(-0.12, 0.12);
      if (okSpot(g, x, y) && clearPath(k.x, k.y, x, y)) return { x: x, y: y };
    }
    return null;
  }

  function tick(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!stage()) return;
    var g = geo();
    var step = SPEED * g.W * dt;              // pixels this frame
    kids.forEach(function (k) {
      // Held (menu open) and offline students stand still.
      if (k === held || !k.online) { if (k.walking) setWalking(k, false); k.wait = Math.max(k.wait, 0.5); place(k, g); return; }
      if (!k.walking) {
        k.wait -= dt;
        if (k.wait <= 0) {
          var t = pickTarget(g, k);
          if (!t) { k.wait = rnd(0.5, 1.5); return; }
          k.tx = t.x; k.ty = t.y;
          k.flip.classList.toggle("face-left", k.tx < k.x);
          setWalking(k, true);
        }
        place(k, g);
        return;
      }
      var dx = (k.tx - k.x) * g.rw, dy = (k.ty - k.y) * g.rh;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= step) {
        k.x = k.tx; k.y = k.ty;
        setWalking(k, false);
        k.wait = rnd(1.2, 4.5);
      } else {
        k.x += dx / dist * step / g.rw;
        k.y += dy / dist * step / g.rh;
      }
      place(k, g);
    });
    raf = requestAnimationFrame(tick);
  }

  function feed(html) {
    var f = $("lbFeed");
    if (!f) return;
    var row = document.createElement("div");
    row.className = "lb-feed-row";
    row.innerHTML = html;
    f.prepend(row);
    while (f.children.length > 4) f.lastChild.remove();
    setTimeout(function () { row.classList.add("is-fading"); }, 3200);
    setTimeout(function () { row.remove(); }, 4000);
  }

  function toastMsg(m) {
    var t = $("toast");
    t.textContent = m;
    t.hidden = false;
    clearTimeout(toastMsg.timer);
    toastMsg.timer = setTimeout(function () { t.hidden = true; }, 3000);
  }

  // ---------------------------------------------------------------- server
  function saved() { try { return JSON.parse(sessionStorage.getItem(SESSION) || "null"); } catch (e) { return null; } }

  function backToSetup(msg) {
    try { sessionStorage.removeItem(SESSION); } catch (e) { /* ignore */ }
    if (net) net.close();
    net = null; room = null;
    cancelAnimationFrame(raf);
    $("lobby").hidden = true;
    $("lobby").innerHTML = "";
    $("setup").hidden = false;
    if (msg) toastMsg(msg);
  }

  // create: settings for a new room, or null to resume the one saved in this tab.
  function connect(createSettings) {
    var resume = createSettings ? null : saved();
    net = DH.Net.connect({
      open: function () {
        if (room) net.send({ t: "host:resume", code: room.code, hostToken: room.hostToken });
        else if (resume) net.send({ t: "host:resume", code: resume.code, hostToken: resume.hostToken });
        else net.send({ t: "host:create", settings: createSettings });
      },
      message: function (m) {
        if (m.t === "room") {
          var first = !room;
          room = { code: m.code, hostToken: m.hostToken, settings: m.settings, phase: "LOBBY" };
          try { sessionStorage.setItem(SESSION, JSON.stringify({ code: m.code, hostToken: m.hostToken })); } catch (e) { /* ignore */ }
          if (first) findJoinBase().then(function (b) { joinBase = b; DH.AvatarColor.ready.then(draw).then(function () { if (room.lastLobby) onLobby(room.lastLobby); }); });
        } else if (m.t === "lobby") {
          if (!room) return;
          room.lastLobby = m;
          if (stage()) onLobby(m);
        } else if (m.t === "error") {
          backToSetup(m.reason === "no_room" ? "ห้องเดิมหมดอายุหรือถูกปิดแล้ว สร้างห้องใหม่ได้เลย" : "สร้างห้องไม่สำเร็จ (" + m.reason + ")");
        } else if (m.t === "closed") {
          backToSetup("ปิดห้องแล้ว");
        }
      },
      ended: function (why) {
        if (why === "replaced") { cancelAnimationFrame(raf); $("lobby").innerHTML = '<div class="lb-replaced rpg-card"><b>ห้องนี้ถูกเปิดในแท็บอื่นแล้ว</b><span>ใช้หน้าต่างล่าสุดคุมเกมได้เลย</span></div>'; }
      }
    });
  }

  function onLobby(m) {
    room.phase = m.phase;
    room.settings = m.settings;
    sync(m.players);
    refreshBar(m.creating);
  }

  // ---------------------------------------------------------------- interactions
  document.addEventListener("click", function (e) {
    var pop = $("lbPop");
    if (!pop || !room) return;
    var t = e.target;
    var kidEl = t.closest && t.closest(".lb-kid");
    if (t.closest("#lbCode") || t.closest("[data-bigcode]")) { $("lbBig").hidden = false; return; }
    if (t.closest("[data-closebig]") || t.id === "lbBig") { $("lbBig").hidden = true; return; }
    if (t.closest("[data-kick]")) {
      net.send({ t: "host:kick", id: t.closest("[data-kick]").dataset.kick });
      pop.hidden = true; held = null; return;
    }
    if (t.closest("#lbStart")) { net.send({ t: "host:start" }); return; }
    if (t.closest("#lbBackLobby")) { net.send({ t: "host:lobby" }); return; }
    if (t.closest("#lbSettings")) { $("lbPanel").innerHTML = panelHtml(); $("lbPanel").hidden = !$("lbPanel").hidden; return; }
    if (t.closest("[data-closepanel]")) { $("lbPanel").hidden = true; return; }
    if (t.closest("[data-bots]")) { net.send({ t: "host:bots", n: 5 }); $("lbPanel").hidden = true; return; }
    if (t.closest("[data-closeroom]")) {
      if (confirm("ปิดห้อง " + prettyCode(room.code) + "? นักเรียนทุกคนจะออกจากห้อง")) net.send({ t: "host:close" });
      return;
    }
    if (kidEl) {
      var k = kids.filter(function (x) { return x.id === kidEl.dataset.kid; })[0];
      if (!k) return;
      var r = kidEl.getBoundingClientRect();
      held = k;
      pop.innerHTML = '<b>' + esc(k.name) + '</b><span>' + DH.JOBS[k.job].icon + ' ' + esc(DH.JOBS[k.job].name) + (k.online ? "" : " · หลุดการเชื่อมต่อ") + '</span>' +
        '<button type="button" class="lb-kick" data-kick="' + k.id + '">🚪 เชิญออกจากห้อง</button>';
      pop.style.left = Math.round(Math.max(100, Math.min(innerWidth - 100, r.left + r.width / 2))) + "px";
      pop.style.top = Math.round(Math.max(190, r.top)) + "px";
      pop.hidden = false;
      return;
    }
    if (!t.closest("#lbPop")) { pop.hidden = true; held = null; }
    if (!t.closest("#lbPanel")) $("lbPanel").hidden = true;
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !$("lbPop")) return;
    $("lbBig").hidden = true;
    $("lbPop").hidden = true;
    $("lbPanel").hidden = true;
    held = null;
  });

  DH.Lobby = {
    open: function (settings) { connect(settings); },
    resumeIfAny: function () { if (saved()) { $("setup").hidden = true; connect(null); return true; } return false; }
  };
})();
