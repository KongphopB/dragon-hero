(function (global) {
  var DH = global.DH = global.DH || {};
  var app = null;
  var boardCtrl = null;

  function ensureApp() {
    if (!app) app = document.getElementById("app");
    return app;
  }

  function bgFilterStyle(m) {
    if (!m || !m.isBoss) return "";
    if (m.phase === 2) return "filter:sepia(0.35) saturate(1.5) hue-rotate(-18deg) brightness(0.9)";
    if (m.phase === 3) return "filter:brightness(0.62) contrast(1.15) saturate(1.25)";
    return "";
  }

  function monsterObjectHtml(m, animClass, extraStyle) {
    return '<div class="monster-slot ' + (animClass || "anim-mon-idle") + '" style="' + (extraStyle || "") + '">' +
      '<img class="monster-obj ' + (m.isBoss ? "is-boss" : "") + '" src="' + DH.esc(m.sprite) + '" alt="' + DH.esc(m.name) + '">' +
      '<div class="monster-shadow"></div>' +
    '</div>';
  }

  function renderCharCreate() {
    var charDraft = DH.Game.getChar();
    var j = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    ensureApp().innerHTML =
      '<div class="rpg-card" style="background:linear-gradient(180deg, rgba(11,17,32,0.72), rgba(19,28,49,0.96)), url(\'assets/bg/bg_plaza.webp\') center/cover">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<h2 style="margin:0;color:var(--gold)">🐉 Dragon Hero: ผจญภัยเดี่ยว</h2>' +
          '<button type="button" class="btn-sec" id="btnRand">🎲 สุ่มทั้งหมด</button>' +
        '</div>' +
        '<p style="color:#cbd5e1;font-size:0.86rem;margin:4px 0 10px">ตั้งชื่อ เลือกอาชีพ แล้วปรับแต่งตัวละครของคุณก่อนออกเดินทาง!</p>' +
        '<label style="font-size:0.82rem;color:var(--mute);font-weight:700">ชื่อนักผจญภัย</label>' +
        '<input id="inpName" value="' + DH.esc(charDraft.name) + '" maxlength="18" style="width:100%;padding:10px;border-radius:10px;border:2px solid var(--line);background:var(--panel2);color:#fff;font:inherit;font-weight:700;margin:4px 0 10px">' +
        '<div style="display:flex;align-items:center;gap:12px;background:rgba(15,23,42,0.88);border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:12px">' +
          DH.Avatar.render(charDraft.look, charDraft.job, { large: true }) +
          '<div style="flex:1;font-size:0.84rem">' +
            '<div style="font-weight:800;font-size:1rem;color:var(--gold)">' + j.icon + ' อาชีพ: ' + j.name + '</div>' +
            '<div style="color:#cbd5e1">' + DH.esc(j.passive) + '</div>' +
            '<div style="color:var(--accent);margin-top:2px">การ์ดติดตัว: ' + DH.CARDS[j.startCard].icon + ' ' + DH.CARDS[j.startCard].name + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:0.88rem;font-weight:800;color:var(--gold);margin-bottom:6px">1. เลือกอาชีพ</div>' +
        '<div class="job-grid" style="margin-bottom:12px">' + Object.keys(DH.JOBS).map(function (jk) {
          var jb = DH.JOBS[jk];
          return '<button type="button" class="job-opt ' + (charDraft.job === jk ? "on" : "") + '" data-job="' + jk + '">' +
            '<b>' + jb.icon + ' ' + jb.name + '</b>' +
            '<div style="font-size:0.75rem;color:var(--mute)">' + DH.esc(jb.passive) + '</div>' +
          '</button>';
        }).join("") + '</div>' +
        '<div style="font-size:0.88rem;font-weight:800;color:var(--gold);margin-bottom:6px">2. ปรับแต่งตัวละคร</div>' +
        '<div class="cust-box">' +
          '<div class="cust-row">' +
            '<span class="cust-lbl">🧑 สีผิว</span>' +
            '<div class="swatch-row">' + DH.SKIN_TONES.map(function (c, i) { return '<span class="swatch ' + (charDraft.look.skin === i ? "on" : "") + '" data-skin="' + i + '" style="background:' + c + '" title="สีผิว ' + (i + 1) + '"></span>'; }).join("") + '</div>' +
          '</div>' +
          '<div class="cust-row">' +
            '<span class="cust-lbl">💇 ทรงผม</span>' +
            '<button type="button" class="btn-sec" id="btnHair" style="padding:6px 12px">แบบที่ ' + ((charDraft.look.hair || 0) + 1) + ' / 6 ▸</button>' +
          '</div>' +
          '<div class="cust-row">' +
            '<span class="cust-lbl">🎨 สีผม</span>' +
            '<div class="swatch-row">' + DH.HAIR_COLORS.map(function (c, i) { return '<span class="swatch ' + (charDraft.look.hairColor === i ? "on" : "") + '" data-hc="' + i + '" style="background:' + c + '" title="สีผม ' + (i + 1) + '"></span>'; }).join("") + '</div>' +
          '</div>' +
          '<div class="cust-row">' +
            '<span class="cust-lbl">👕 สีชุด</span>' +
            '<div class="swatch-row">' + DH.OUTFIT_COLORS.map(function (c, i) { return '<span class="swatch ' + (charDraft.look.outfit === i ? "on" : "") + '" data-oc="' + i + '" style="background:' + c + '" title="สีชุด ' + (i + 1) + '"></span>'; }).join("") + '</div>' +
          '</div>' +
          '<div class="cust-row">' +
            '<span class="cust-lbl">🎩 หมวก</span>' +
            '<button type="button" class="btn-sec" id="btnHat" style="padding:6px 12px">' + DH.HATS[(charDraft.look.hat || 0) % 6] + ' ▸</button>' +
          '</div>' +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:8px;margin:12px 0;font-size:0.88rem;cursor:pointer">' +
          '<input type="checkbox" id="chkTimed" ' + (charDraft.timed ? "checked" : "") + '> จับเวลาขณะทำโจทย์ (แนะนำ)' +
        '</label>' +
        '<button type="button" class="btn-pri" id="btnStartSolo" style="width:100%">⛲ เข้าลานน้ำพุกลางเมือง ▶</button>' +
      '</div>';

    document.getElementById("inpName").oninput = function (e) { charDraft.name = e.target.value; DH.Game.saveChar(); };
    document.getElementById("chkTimed").onchange = function (e) { charDraft.timed = e.target.checked; DH.Game.saveChar(); };
    document.getElementById("btnRand").onclick = function () {
      var jks = Object.keys(DH.JOBS);
      charDraft.job = jks[Math.floor(Math.random() * jks.length)];
      charDraft.look = {
        skin: Math.floor(Math.random() * DH.SKIN_TONES.length),
        hair: Math.floor(Math.random() * 6),
        hairColor: Math.floor(Math.random() * DH.HAIR_COLORS.length),
        outfit: Math.floor(Math.random() * DH.OUTFIT_COLORS.length),
        hat: Math.floor(Math.random() * 6)
      };
      DH.Game.saveChar();
      render();
    };
    document.querySelectorAll("[data-skin]").forEach(function (el) { el.onclick = function () { charDraft.look.skin = +el.dataset.skin; DH.Game.saveChar(); render(); }; });
    document.querySelectorAll("[data-hc]").forEach(function (el) { el.onclick = function () { charDraft.look.hairColor = +el.dataset.hc; DH.Game.saveChar(); render(); }; });
    document.querySelectorAll("[data-oc]").forEach(function (el) { el.onclick = function () { charDraft.look.outfit = +el.dataset.oc; DH.Game.saveChar(); render(); }; });
    document.getElementById("btnHair").onclick = function () { charDraft.look.hair = ((charDraft.look.hair || 0) + 1) % 6; DH.Game.saveChar(); render(); };
    document.getElementById("btnHat").onclick = function () { charDraft.look.hat = ((charDraft.look.hat || 0) + 1) % 6; DH.Game.saveChar(); render(); };
    document.querySelectorAll("[data-job]").forEach(function (el) { el.onclick = function () { charDraft.job = el.dataset.job; DH.Game.saveChar(); render(); }; });
    document.getElementById("btnStartSolo").onclick = function () {
      charDraft.name = (document.getElementById("inpName").value || "").trim() || "นักผจญภัย";
      DH.Game.saveChar();
      DH.SFX.join();
      DH.Game.enterLobby();
    };
  }

  function hudBar(g, charDraft) {
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var hs = "";
    for (var i = 0; i < g.maxHearts; i++) hs += i < g.hearts ? "❤️" : "🖤";
    return '<div class="hud-strip">' +
      '<span>' + jb.icon + ' ' + DH.esc(charDraft.name) + ' ' + hs + '</span>' +
      '<span id="sTimerTxt" style="color:var(--gold)">ด่าน ' + (g.stageIdx + 1) + '/' + DH.STAGES.length + '</span>' +
      '<span style="color:var(--gold)">⚔️ ' + g.score + (g.streak >= 2 ? ' · 🔥' + g.streak : '') + '</span>' +
    '</div>';
  }

  function monsterMiniHud(m) {
    var pct = Math.max(0, Math.min(100, 100 * m.hp / Math.max(1, m.maxHp)));
    var bonusHp = (DH.Game.getState() || {}).bossBonusHp || 0;
    return '<div class="mon-mini">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
        '<b style="font-size:0.95rem;color:#fef08a">' + DH.esc(m.name) + (m.isBoss ? ' (เฟส ' + m.phase + '/3)' : '') + (m.isBoss && bonusHp > 0 ? ' <span style="color:#fb923c;font-size:0.78rem">(+' + bonusHp + ' HP)</span>' : '') + '</b>' +
        '<span style="font-size:0.8rem;color:#cbd5e1;font-weight:700">HP ' + m.hp + ' / ' + m.maxHp + '</span>' +
      '</div>' +
      '<div class="hp-track"><div class="hp-fill" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }

  function updateTimer() {
    var g = DH.Game.getState();
    var charDraft = DH.Game.getChar();
    var txt = document.getElementById("sTimerTxt");
    var bar = document.getElementById("sTimerBar");
    if (!g || !txt) return;
    if (g.phase === "INTRO") {
      if (bar) {
        bar.style.width = (100 * (7.0 - (g.introLeft || 0)) / 7.0) + "%";
        bar.style.background = "var(--gold)";
      }
      txt.textContent = "🎬 ออกเดินทาง...";
      return;
    }
    if (g.phase === "QUESTION") {
      if (!charDraft.timed) { txt.textContent = "⏱ ไม่จำกัดเวลา"; return; }
      if (g.frozenLeft > 0) {
        txt.textContent = "❄️ แช่แข็ง (" + Math.ceil(g.frozenLeft) + " วิ)";
        txt.style.color = "#38bdf8";
        return;
      }
      txt.style.color = "";
      txt.textContent = "⏱ " + Math.ceil(g.timeLeft) + " วิ";
      if (bar) {
        bar.style.width = (100 * g.timeLeft / Math.max(1, g.timeTotal)) + "%";
        bar.style.background = g.timeLeft <= 3 ? "var(--bad)" : "var(--ok)";
      }
    } else if (g.phase === "REVEAL") {
      if (g.revPaused) {
        txt.textContent = "⏸ หยุดอ่านเฉลย";
        return;
      }
      txt.textContent = "⏱ ไปต่อใน " + Math.ceil(g.revLeft) + " วิ";
      if (bar) {
        bar.style.width = (100 * g.revLeft / 10) + "%";
        bar.style.background = "var(--accent)";
      }
    }
  }

  function render() {
    var g = DH.Game.getState();
    if (!g) { renderCharCreate(); return; }
    var charDraft = DH.Game.getChar();
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var body = "";

    if (g.phase === "LOBBY") {
      body = '<div class="scene-stage">' +
        '<img class="scene-bg" src="assets/bg/bg_plaza.webp">' +
        '<div class="scene-scrim"></div>' +
        '<div class="actors-row" style="justify-content:center;bottom:10%">' +
          '<div class="actor-unit anim-patrol"><div class="walk-flip">' + DH.Avatar.render(charDraft.look, charDraft.job, { walking: true }) + '</div><div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>⛲ <b>' + DH.esc(charDraft.name) + ' (' + jb.name + ')</b> กำลังเดินรออยู่ตรงลานน้ำพุกลางเมือง!</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn-sec" id="btnEditChar" style="flex:0 0 auto">✏️ แก้ไขตัวละคร</button>' +
          '<button class="btn-pri" id="btnDepart" style="flex:1">⚔️ กดเริ่มออกเดินทาง!</button>' +
        '</div>' +
      '</div>';
    } else if (g.phase === "INTRO") {
      body = '<div class="tbar"><i id="sTimerBar" style="width:0%"></i></div>' +
      '<div class="scene-stage">' +
        '<div class="crane-world">' +
          '<img class="crane-bg" src="assets/bg/bg_depart_crane.webp">' +
          '<div class="crane-walker">' +
            DH.Avatar.render(charDraft.look, charDraft.job, { walking: true, backView: true }) +
          '</div>' +
        '</div>' +
        '<div class="scene-scrim"></div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>🎬 <b>' + DH.esc(charDraft.name) + ' (' + jb.name + ')</b> เดินออกจากประตูเมือง มุ่งหน้าสู่ทุ่งหญ้ากว้างใหญ่...</div>' +
        '<button class="btn-sec" id="btnNext" style="margin-top:10px;width:100%">ข้ามคัตซีน ▶</button>' +
      '</div>';
    } else if (g.phase === "ENCOUNTER") {
      var m = g.monster;
      body = '<div class="scene-stage">' +
        '<img class="scene-bg" src="' + DH.esc(m.bg) + '" style="' + bgFilterStyle(m) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m.name) + '</div><div class="mon-sub">' + DH.esc(m.subtitle) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m.hp / m.maxHp) + '%"></div></div><div class="hp-text">HP ' + m.hp + ' / ' + m.maxHp + ' · ต้องสู้ ' + m.count + ' ข้อ' + (m.isBoss && g.bossBonusHp > 0 ? ' (เสริม +' + g.bossBonusHp + ' HP จากมอนหนี)' : '') + '</div></div>' +
        '<div class="actors-row" style="bottom:8%">' +
          '<div class="actor-unit">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m, "anim-mon-idle") +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>' + (m.isBoss ? '🔥 <b>บอสใหญ่ปรากฏตัว!</b> ' : '⚠️ <b>พบศัตรูขวางทาง!</b> ') + DH.esc(m.name) + (m.isBoss && g.bossBonusHp > 0 ? ' <span style="color:#fb923c">(ได้รับเลือดเสริมจากมอนที่หนี +' + g.bossBonusHp + ' HP!)</span>' : '') + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">เข้าโจมตี ⚔️</button>' +
      '</div>';
    } else if (g.phase === "QUESTION") {
      var q = g.curQ;
      var cardsHtml = g.cards.length ? ('<div style="font-size:0.82rem;color:var(--gold);font-weight:800;margin-top:2px">🃏 การ์ดกลยุทธ์ (แตะเพื่อเปิดใช้ก่อนโจมตี):</div><div class="cards-tray">' +
        g.cards.map(function (cid, idx) {
          var c = DH.CARDS[cid];
          return '<button type="button" class="card-pill card-' + cid + (g.armedCard === cid ? " armed" : "") + '" data-cardidx="' + idx + '">' +
            '<div style="font-size:0.9rem;margin-bottom:2px">' + c.icon + ' <b>' + c.name + '</b></div>' +
            '<div style="font-size:0.72rem;color:var(--mute);line-height:1.35">' + DH.esc(c.desc) + '</div>' +
          '</button>';
        }).join("") + '</div>') : '';

      body = '<div class="tbar"><i id="sTimerBar" style="width:100%"></i></div>' +
        monsterMiniHud(g.monster) +
        (g.armedCard ? '<div class="rpg-badge" style="margin-bottom:8px;border-color:var(--gold);color:#fde047">✨ กำลังใช้การ์ด: ' + DH.CARDS[g.armedCard].icon + ' ' + DH.CARDS[g.armedCard].name + '</div>' : '') +
        (g.magnifierMsg ? '<div class="rpg-card" style="padding:8px 12px;margin-bottom:8px;border-color:#a855f7">' + DH.esc(g.magnifierMsg) + '</div>' : '') +
        (g.secondChanceMsg ? '<div class="rpg-card" style="padding:8px 12px;margin-bottom:8px;border-color:#f59e0b;color:#fde047">' + DH.esc(g.secondChanceMsg) + '</div>' : '') +
        cardsHtml +
        '<div class="rpg-card rpg-panel-quest">' +
          '<div class="quest-head-bar">' +
            '<span style="font-weight:800;color:var(--gold);font-size:0.86rem">📜 ภารกิจโจมตี · ข้อ ' + g.qInStage + '/' + g.monster.count + '</span>' +
            '<div style="display:flex;gap:5px;flex-wrap:wrap"><span class="rpg-badge" style="font-size:0.75rem;padding:2px 8px">' + DH.esc(q.lv) + '</span><span class="rpg-badge" style="font-size:0.75rem;padding:2px 8px">' + DH.esc(q.tg) + '</span></div>' +
          '</div>' +
          '<p style="font-weight:700;margin:6px 0 10px">' + DH.esc(q.t) + '</p>' +
          '<div id="soloBoard"></div>' +
          '<button type="button" class="btn-pri" id="btnSubmit" style="width:100%;margin-top:10px">⚔️ ส่งคำตอบโจมตี!</button>' +
        '</div>';
    } else if (g.phase === "REVEAL") {
      var r = g.lastRes;
      var good = r.acc >= 0.999;
      var partial = r.acc >= 0.5 && !good;
      var resTitle = good ? "⚔️ โจมตีเข้าเป้าเต็มแรง!" : (partial ? "🟡 โจมตีเฉียด! (" + Math.round(r.acc * 100) + "%)" : (r.outcome === "shielded" ? "🛡️ โล่ป้องกันการโจมตีไว้ได้!" : "💥 พลาดท่า! เตรียมรับการสวนกลับ"));
      body = '<div class="tbar"><i id="sTimerBar" style="width:100%"></i></div>' +
        monsterMiniHud(g.monster) +
        '<div class="rpg-card" style="border-left:6px solid ' + (good ? "var(--ok)" : (partial ? "var(--warn)" : "var(--bad)")) + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b style="font-size:1.05rem">' + (r.timedOut ? "⏱ หมดเวลา · " : "") + resTitle + '</b>' +
            '<b style="font-size:1.15rem;color:' + (r.dmg >= 0 ? "var(--ok)" : "var(--bad)") + '">' + (r.dmg >= 0 ? "+" : "") + r.dmg + ' ดาเมจ</b>' +
          '</div>' +
          (r.cardEarned ? '<div style="margin-top:6px;color:var(--gold)">🎁 Streak! ได้รับการ์ด ' + DH.CARDS[r.cardEarned].icon + ' ' + DH.CARDS[r.cardEarned].name + '</div>' : '') +
          '<div id="soloRevBoard" style="margin-top:10px"></div>' +
          '<ul class="fb-list">' + r.rows.map(function (row) {
            if (row.header) return '<li style="color:var(--accent);font-weight:800">' + DH.esc(row.header) + '</li>';
            var fn = (DH.FORCES[row.force] && DH.FORCES[row.force].n) || row.force;
            var ico = row.status === "ok" ? "✓" : "✗";
            var col = row.status === "ok" ? "#4ade80" : "#f87171";
            return '<li style="color:' + col + '">' + ico + ' ' + DH.esc(fn) + ' — ' + DH.esc(row.msg) + '</li>';
          }).join("") + '</ul>' +
          '<p style="background:var(--panel2);padding:10px;border-radius:10px;margin:8px 0;font-size:0.9rem">' + DH.esc(r.q.why).replace(/\n/g, "<br>") + '</p>' +
          '<div style="display:flex;gap:8px">' +
            '<button type="button" class="btn-sec" id="btnRevPause" style="flex:1">' + (g.revPaused ? "▶ นับเวลาต่อ" : "⏸ หยุดอ่านเฉลย") + '</button>' +
            '<button type="button" class="btn-pri" id="btnGoBattle" style="flex:1">ไปฉากต่อสู้ ▶</button>' +
          '</div>' +
        '</div>';
    } else if (g.phase === "BATTLE") {
      var r2 = g.lastRes;
      var out = r2.outcome;
      var hitMon = (out === "correct" || out === "partial");
      var anim = hitMon ? "anim-atk" : (out === "shielded" ? "" : "anim-hurt");
      var monAnim = hitMon ? (g.monster.hp <= 0 ? "anim-mon-dead" : "anim-mon-hurt") : (out === "shielded" ? "anim-mon-idle" : "anim-mon-lunge");
      var pop = hitMon
        ? '<div class="actor-dmg ok">+' + r2.dmg + ' ⚔️</div>'
        : (out === "shielded" ? '<div class="actor-dmg" style="color:#60a5fa">🛡️ ป้องกัน!</div>' : '<div class="actor-dmg bad">💥 -1 ❤️</div>');
      var m2 = g.monster;
      body = '<div class="scene-stage">' +
        '<img class="scene-bg" src="' + DH.esc(m2.bg) + '" style="' + bgFilterStyle(m2) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m2.name) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m2.hp / m2.maxHp) + '%"></div></div><div class="hp-text">HP ' + m2.hp + ' / ' + m2.maxHp + '</div></div>' +
        (hitMon ? '<div class="boss-impact-zone"><div class="big-dmg-pop">-' + r2.dmg + '</div></div>' : '') +
        '<div class="actors-row" style="bottom:8%">' +
          '<div class="actor-unit ' + anim + '">' + pop + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m2, monAnim) +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (hitMon ? "var(--ok)" : "var(--bad)") + '">' +
        '<div>' + (hitMon ? '⚔️ <b>โจมตีสำเร็จ!</b> สร้าง ' + r2.dmg + ' ดาเมจ!' : (out === "shielded" ? '🛡️ <b>ป้องกันไว้ได้!</b> ไม่เสียหัวใจและไม่เสีย Streak' : '💥 <b>ถูกมอนสเตอร์สวนกลับ!</b>')) + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">ดำเนินการต่อ ▶</button>' +
      '</div>';
    } else if (g.phase === "MON_DEFEAT" || g.phase === "MON_ESCAPE") {
      var dead = g.phase === "MON_DEFEAT";
      var m3 = g.monster;
      body = '<div class="scene-stage">' +
        '<img class="scene-bg" src="' + DH.esc(m3.bg) + '" style="' + (dead ? "filter:brightness(0.75)" : "") + '">' +
        '<div class="actors-row" style="bottom:8%">' +
          '<div class="actor-unit ' + (dead ? "anim-walk" : "") + '">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          (dead ? monsterObjectHtml(m3, "anim-mon-dead") : monsterObjectHtml(m3, "anim-mon-idle", "opacity:0.45;transform:translateX(35px)")) +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (dead ? "var(--ok)" : "var(--warn)") + '">' +
        '<div>' + (dead ? '💥 <b>โค่น ' + DH.esc(m3.name) + ' สำเร็จ!</b> ได้รับกล่องสมบัติการ์ดช่วย +1 ใบ!' : '💨 <b>' + DH.esc(m3.name) + ' หนีไปได้!</b> เลือดที่เหลือ +' + m3.hp + ' HP ถูกส่งไปเพิ่มให้มังกรบอส! (รวม +' + g.bossBonusHp + ' HP)') + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">มุ่งหน้าสู่ด่านถัดไป ▶</button>' +
      '</div>';
    } else if (g.phase === "VICTORY" || g.phase === "DEFEAT") {
      var win = g.phase === "VICTORY";
      var m4 = g.monster;
      body = '<div class="scene-stage">' +
        '<img class="scene-bg" src="assets/bg/bg_dragon.webp" style="' + (win ? "filter:brightness(0.95)" : "filter:brightness(0.65) saturate(1.3)") + '">' +
        (!win ? '<div class="' + (g.defeatFate === "eat" ? "dragon-eat-overlay" : "dragon-fire-overlay") + '"></div>' : '') +
        '<div class="actors-row" style="bottom:8%">' +
          '<div class="actor-unit ' + (win ? "anim-walk" : "anim-hurt") + '">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m4, win ? "anim-mon-dead" : "anim-mon-lunge") +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (win ? "#4ade80" : "#ef4444") + '">' +
        '<div>' + (win ? '🎉 <b>ชัยชนะอันยิ่งใหญ่!</b> คุณโค่นมังกรเพลิงบรรพกาลสำเร็จแล้ว!' : (g.defeatFate === "eat" ? '🐉 <b>พ่ายแพ้...</b> ดาเมจไม่พอโค่นมังกร คุณถูกมังกรกลืนลงท้อง!' : '🔥 <b>พ่ายแพ้...</b> ดาเมจไม่พอโค่นมังกร คุณถูกเปลวไฟมังกรเผาวอด!')) + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">ดูผลสรุป &amp; จุดที่พลาด ▶</button>' +
      '</div>';
    } else if (g.phase === "SUMMARY") {
      var avgAcc = Math.round(100 * g.accSum / Math.max(1, g.qTotal));
      var tier = avgAcc >= 85 ? 1 : (avgAcc >= 65 ? 2 : (avgAcc >= 45 ? 3 : 0));
      var medal = tier === 1 ? "🥇 กรอบทอง! จอมปราชญ์ฟิสิกส์" : (tier === 2 ? "🥈 กรอบเงิน! ผู้กล้าชำนาญศึก" : (tier === 3 ? "🥉 กรอบทองแดง! นักผจญภัยฝึกหัด" : "⚔️ จบการผจญภัย"));
      var mList = Object.keys(g.mistakes).map(function (c) { return [c, g.mistakes[c]]; }).sort(function (a, b) { return b[1] - a[1]; });
      body = '<div class="rpg-card ' + (tier ? "rank-frame-" + tier : "") + '" style="text-align:center;margin-bottom:12px">' +
          '<div style="font-weight:900;font-size:1.1rem">' + medal + '</div>' +
          '<div style="display:flex;justify-content:center;margin:8px 0">' + DH.Avatar.render(charDraft.look, charDraft.job, { large: true }) + '</div>' +
          '<div style="font-size:1.5rem;font-weight:900;color:var(--gold)">' + g.score + ' ดาเมจสะสม · แม่นยำ ' + avgAcc + '%</div>' +
        '</div>' +
        '<div class="rpg-card">' +
          '<h3 style="margin:0 0 8px;color:var(--gold)">🧠 สรุปจุดที่คุณมักพลาดในเกมนี้</h3>' +
          (mList.length ? mList.slice(0, 5).map(function (pair) {
            var meta = DH.MISTAKE_META[pair[0]] || { label: pair[0], tip: "" };
            return '<div style="background:var(--panel2);padding:10px;border-radius:10px;border-left:4px solid var(--bad);margin-bottom:8px">' +
              '<b>⚠️ ' + DH.esc(meta.label) + '</b> <span class="rpg-badge" style="float:right">' + pair[1] + ' ครั้ง</span>' +
              '<div style="font-size:0.86rem;color:#cbd5e1;margin-top:4px">💡 ' + DH.esc(meta.tip) + '</div>' +
            '</div>';
          }).join("") : '<p style="color:#4ade80">🌟 ยอดเยี่ยมมาก! ไม่พบข้อผิดพลาดซ้ำเลย</p>') +
          '<h4 style="margin:12px 0 6px">📚 ความแม่นยำแยกตามเรื่อง</h4>' +
          Object.keys(g.topicStats).map(function (tp) {
            var st = g.topicStats[tp];
            return '<div style="display:flex;justify-content:space-between;font-size:0.86rem;padding:4px 0;border-bottom:1px solid var(--line)">' +
              '<span>' + DH.esc(DH.TOPIC_LABELS[tp] || tp) + '</span>' +
              '<b>' + st.ok + '/' + st.total + ' (' + Math.round(100 * st.ok / st.total) + '%)</b></div>';
          }).join("") +
          '<div style="display:flex;gap:8px;margin-top:14px">' +
            '<button type="button" class="btn-sec" id="btnRetryBoss" style="flex:1">🐉 ท้ามังกรอีกครั้ง</button>' +
            '<button type="button" class="btn-pri" id="btnRestart" style="flex:1">🔄 เล่นใหม่ตั้งแต่ต้น</button>' +
          '</div>' +
        '</div>';
    }

    ensureApp().innerHTML = hudBar(g, charDraft) + body;
    bindPhase(g);
  }

  function bindPhase(g) {
    var el;
    if (g.phase === "LOBBY") {
      document.getElementById("btnEditChar").onclick = DH.Game.resetToCreate;
      document.getElementById("btnDepart").onclick = function () { DH.Game.newRun(0); };
    } else if (g.phase === "INTRO" && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.enterEncounter;
    else if (g.phase === "ENCOUNTER" && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.startQuestion;
    else if (g.phase === "QUESTION") {
      boardCtrl = global.FBD.mount(document.getElementById("soloBoard"), g.curQ, {
        biome: g.monster && g.monster.id,
        initialState: Object.keys(g.draftPlace).length ? g.draftPlace : undefined,
        onChange: function (st) { g.draftPlace = st; }
      });
      document.querySelectorAll("[data-cardidx]").forEach(function (btn) {
        btn.onclick = function () { DH.Game.useCard(+btn.dataset.cardidx); };
      });
      document.getElementById("btnSubmit").onclick = function () {
        var place = boardCtrl ? boardCtrl.getState() : g.draftPlace;
        DH.Game.submitAnswer(false, place);
      };
    } else if (g.phase === "REVEAL") {
      global.FBD.mount(document.getElementById("soloRevBoard"), g.lastRes.q, {
        biome: g.monster && g.monster.id,
        readOnly: true,
        initialState: g.lastRes.place,
        revealData: { revealMode: "key" }
      });
      document.getElementById("btnRevPause").onclick = DH.Game.toggleRevPause;
      document.getElementById("btnGoBattle").onclick = DH.Game.enterBattle;
    } else if (g.phase === "BATTLE" && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.afterBattle;
    else if ((g.phase === "MON_DEFEAT" || g.phase === "MON_ESCAPE") && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.nextStage;
    else if ((g.phase === "VICTORY" || g.phase === "DEFEAT") && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.goSummary;
    else if (g.phase === "SUMMARY") {
      document.getElementById("btnRetryBoss").onclick = function () { DH.Game.newRun(DH.STAGES.length - 1); };
      document.getElementById("btnRestart").onclick = DH.Game.resetToCreate;
    }
    updateTimer();
  }

  DH.Screens = {
    render: render,
    updateTimer: updateTimer
  };
})(window);
