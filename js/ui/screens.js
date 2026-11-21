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

  // Monster = action wrapper (enter / lunge / hurt / dead) > rig with its own idle loop > sprite cut-outs.
  function monsterObjectHtml(m, animClass, extraStyle) {
    var rig = (DH.MONSTER_RIGS && DH.MONSTER_RIGS[m.id]) || { base: "none", parts: [], fx: [] };
    var src = DH.esc(m.sprite);
    var parts = rig.parts.map(function (p) {
      return '<img class="mon-part part-' + p.name + '" src="' + src + '" alt="" style="clip-path:' + p.clip + ';transform-origin:' + p.pivot + '">';
    }).join("");
    var fx = rig.fx.map(function (f) {
      return '<span class="mon-fx fx-' + f.name + '" style="left:' + f.left + ';top:' + f.top + '"></span>';
    }).join("");
    return '<div class="monster-slot ' + (animClass || "anim-mon-idle") + '" style="' + (extraStyle || "") + '">' +
      '<div class="mon-act">' +
        '<div class="monster-obj mon-rig rig-' + DH.esc(m.id) + (m.isBoss ? " is-boss phase-" + (m.phase || 1) : "") + '" role="img" aria-label="' + DH.esc(m.name) + '">' +
          '<img class="mon-base" src="' + src + '" alt="" style="clip-path:' + rig.base + '">' +
          parts + fx +
        '</div>' +
      '</div>' +
      '<div class="monster-shadow shadow-' + DH.esc(m.id) + '"></div>' +
    '</div>';
  }

  // ---------- Character creator ----------
  // Built once; each change only redraws the pieces that depend on it, so the page never jumps or flickers.
  var creator = { back: false, demoTimer: null, shuffleTimer: null };

  function swatchRow(list, key, current) {
    return list.map(function (c, i) {
      return '<button type="button" class="swatch ' + (current === i ? "on" : "") + '" data-' + key + '="' + i + '" style="background:' + c + '" aria-label="' + key + ' ' + (i + 1) + '"></button>';
    }).join("");
  }

  function creatorPreviewHtml(charDraft) {
    return '<div class="cc-actor">' + DH.Avatar.render(charDraft.look, charDraft.job, { xl: true, backView: creator.back }) + '</div>';
  }

  function creatorJobInfoHtml(charDraft) {
    var j = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    return '<div class="cc-job-name">' + j.icon + ' ' + j.name + '</div>' +
      '<div class="cc-job-passive">' + DH.esc(j.passive) + '</div>' +
      '<div class="cc-job-card">การ์ดติดตัว: ' + DH.CARDS[j.startCard].icon + ' ' + DH.CARDS[j.startCard].name + '</div>';
  }

  function creatorJobsHtml(charDraft) {
    return Object.keys(DH.JOBS).map(function (jk) {
      var jb = DH.JOBS[jk];
      return '<button type="button" class="job-opt ' + (charDraft.job === jk ? "on" : "") + '" data-job="' + jk + '">' +
        '<span class="job-thumb">' + DH.Avatar.render(charDraft.look, jk, { still: charDraft.job !== jk }) + '</span>' +
        '<span class="job-text"><b>' + jb.icon + ' ' + jb.name + '</b>' +
        '<span class="job-passive">' + DH.esc(jb.passive) + '</span></span>' +
      '</button>';
    }).join("");
  }

  // Head-and-shoulders thumbnails showing the player's own face with each option applied.
  function creatorPickerHtml(charDraft, field, count, labels) {
    var html = "";
    for (var i = 0; i < count; i++) {
      var look = {};
      Object.keys(charDraft.look).forEach(function (k) { look[k] = charDraft.look[k]; });
      look[field] = i;
      if (field === "hair") look.hat = 0; // show the hairstyle itself, not a hat over it
      var on = (charDraft.look[field] || 0) === i;
      html += '<button type="button" class="pick-thumb ' + (on ? "on" : "") + '" data-' + field + '="' + i + '" title="' + DH.esc(labels ? labels[i] : "แบบที่ " + (i + 1)) + '">' +
        '<span class="pick-crop">' + DH.Avatar.render(look, charDraft.job, { still: true }) + '</span>' +
        (labels ? '<span class="pick-lbl">' + DH.esc(labels[i]) + '</span>' : '') +
      '</button>';
    }
    return html;
  }

  function refreshCreator(what) {
    var charDraft = DH.Game.getChar();
    var $ = function (id) { return document.getElementById(id); };
    if (!$("ccPreview")) return;
    $("ccPreview").innerHTML = creatorPreviewHtml(charDraft);
    $("ccJobInfo").innerHTML = creatorJobInfoHtml(charDraft);
    $("ccJobs").innerHTML = creatorJobsHtml(charDraft);
    $("ccHair").innerHTML = creatorPickerHtml(charDraft, "hair", 6);
    $("ccHat").innerHTML = creatorPickerHtml(charDraft, "hat", 6, DH.HATS);
    $("ccSkin").innerHTML = swatchRow(DH.SKIN_TONES, "skin", charDraft.look.skin);
    $("ccHairColor").innerHTML = swatchRow(DH.HAIR_COLORS, "hc", charDraft.look.hairColor);
    $("ccOutfit").innerHTML = swatchRow(DH.OUTFIT_COLORS, "oc", charDraft.look.outfit);
    var stage = $("ccStage");
    if (what !== "quiet") {
      stage.classList.remove("cc-pop");
      void stage.offsetWidth; // restart the pop animation
      stage.classList.add("cc-pop");
    }
    if (what === "job") playJobDemo(charDraft.job);
  }

  // Selecting a job shows that job's attack once, so players see what they picked.
  function playJobDemo(job) {
    var actor = document.querySelector("#ccPreview .cc-actor");
    if (!actor) return;
    clearTimeout(creator.demoTimer);
    actor.className = "cc-actor actor-unit anim-atk atk-" + DH.Avatar.attackStyle(job);
    creator.demoTimer = setTimeout(function () {
      if (actor.isConnected) actor.className = "cc-actor";
    }, 1000);
  }

  function renderCharCreate() {
    var charDraft = DH.Game.getChar();
    creator.back = false;
    ensureApp().innerHTML =
      '<div class="rpg-card cc-card">' +
        '<div class="cc-head">' +
          '<h2>🐉 Dragon Hero: ผจญภัยเดี่ยว</h2>' +
          '<button type="button" class="btn-sec" id="btnRand">🎲 สุ่มทั้งหมด</button>' +
        '</div>' +
        '<p class="cc-intro">ตั้งชื่อ เลือกอาชีพ แล้วปรับแต่งตัวละครของคุณก่อนออกเดินทาง!</p>' +
        '<div class="cc-top">' +
          '<div class="cc-stage" id="ccStage">' +
            '<img class="cc-stage-bg" src="assets/bg/bg_plaza.webp" alt="">' +
            '<div class="cc-spot"></div>' +
            '<div id="ccPreview" style="--dash:34px"></div>' +
            '<button type="button" class="cc-turn" id="btnTurn" title="หมุนดูด้านหลัง">🔄</button>' +
          '</div>' +
          '<div class="cc-side">' +
            '<label class="cc-lbl" for="inpName">ชื่อนักผจญภัย</label>' +
            '<input id="inpName" class="cc-name" value="' + DH.esc(charDraft.name) + '" maxlength="18" autocomplete="off">' +
            '<div id="ccJobInfo" class="cc-job-info"></div>' +
          '</div>' +
        '</div>' +
        '<div class="cc-section">1. เลือกอาชีพ <span>แตะเพื่อดูท่าโจมตี</span></div>' +
        '<div class="job-grid" id="ccJobs"></div>' +
        '<div class="cc-section">2. ปรับแต่งตัวละคร</div>' +
        '<div class="cust-box">' +
          '<div class="cust-row"><span class="cust-lbl">🧑 สีผิว</span><div class="swatch-row" id="ccSkin"></div></div>' +
          '<div class="cust-row cust-col"><span class="cust-lbl">💇 ทรงผม</span><div class="pick-row" id="ccHair"></div></div>' +
          '<div class="cust-row"><span class="cust-lbl">🎨 สีผม</span><div class="swatch-row" id="ccHairColor"></div></div>' +
          '<div class="cust-row"><span class="cust-lbl">👕 สีชุด</span><div class="swatch-row" id="ccOutfit"></div></div>' +
          '<div class="cust-row cust-col"><span class="cust-lbl">🎩 หมวก</span><div class="pick-row" id="ccHat"></div></div>' +
        '</div>' +
        '<label class="cc-timed">' +
          '<input type="checkbox" id="chkTimed" ' + (charDraft.timed ? "checked" : "") + '> จับเวลาขณะทำโจทย์ (แนะนำ)' +
        '</label>' +
        '<button type="button" class="btn-pri" id="btnStartSolo" style="width:100%">⛲ เข้าลานน้ำพุกลางเมือง ▶</button>' +
      '</div>';

    refreshCreator("quiet");

    var card = ensureApp().querySelector(".cc-card");
    var change = function (fn, what) { fn(); DH.Game.saveChar(); refreshCreator(what); };
    // One delegated handler: the option buttons are redrawn on every change.
    card.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !card.contains(b)) return;
      var d = b.dataset;
      if (d.job) change(function () { charDraft.job = d.job; }, "job");
      else if (d.skin) change(function () { charDraft.look.skin = +d.skin; });
      else if (d.hc) change(function () { charDraft.look.hairColor = +d.hc; });
      else if (d.oc) change(function () { charDraft.look.outfit = +d.oc; });
      else if (d.hair) change(function () { charDraft.look.hair = +d.hair; });
      else if (d.hat) change(function () { charDraft.look.hat = +d.hat; });
    });
    document.getElementById("btnTurn").onclick = function () {
      creator.back = !creator.back;
      refreshCreator();
    };
    document.getElementById("inpName").oninput = function (e) { charDraft.name = e.target.value; DH.Game.saveChar(); };
    document.getElementById("chkTimed").onchange = function (e) { charDraft.timed = e.target.checked; DH.Game.saveChar(); };
    document.getElementById("btnRand").onclick = function () {
      // Slot-machine shuffle: flick through a few random looks, then settle.
      var jks = Object.keys(DH.JOBS);
      var rnd = function (n) { return Math.floor(Math.random() * n); };
      var ticks = 0;
      clearInterval(creator.shuffleTimer);
      creator.back = false;
      creator.shuffleTimer = setInterval(function () {
        if (!document.getElementById("ccPreview")) { clearInterval(creator.shuffleTimer); return; }
        charDraft.job = jks[rnd(jks.length)];
        charDraft.look = {
          skin: rnd(DH.SKIN_TONES.length),
          hair: rnd(6),
          hairColor: rnd(DH.HAIR_COLORS.length),
          outfit: rnd(DH.OUTFIT_COLORS.length),
          hat: rnd(6)
        };
        ticks++;
        if (ticks >= 8) {
          clearInterval(creator.shuffleTimer);
          DH.Game.saveChar();
          refreshCreator("job");
        } else {
          refreshCreator("quiet");
        }
      }, 70);
    };
    document.getElementById("btnStartSolo").onclick = function () {
      clearInterval(creator.shuffleTimer);
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
      targetLine(DH.Game.getState()) +
    '</div>';
  }

  // Feature 3: how much damage is still needed to finish this monster, and how hard that is.
  function targetLine(g) {
    if (!g || !g.monster) return "";
    var m = g.monster;
    var left = Math.max(0, m.count - g.qInStage + (g.phase === "QUESTION" ? 1 : 0));
    var cls, txt;
    if (m.hp <= 0) {
      cls = "ok";
      txt = "🎯 โค่นได้แล้ว!";
    } else if (left === 0) {
      cls = "bad";
      txt = "🎯 ไม่เหลือข้อให้โจมตีแล้ว (ขาดอีก " + m.hp + " ดาเมจ)";
    } else {
      var per = Math.ceil(m.hp / left);
      var hint;
      if (per <= m.baseDmg) { cls = "ok"; hint = "ตอบถูกครบก็พอ"; }
      else if (per <= Math.round(m.baseDmg * 1.5)) { cls = "warn"; hint = "ต้องตอบถูกและเร็ว"; }
      else { cls = "bad"; hint = "ต้องตอบถูกเร็ว + ใช้การ์ดดาบคู่"; }
      txt = "🎯 " + (m.isBoss ? "เป้าโค่นมังกร: " : "") + "ขาดอีก " + m.hp + " ดาเมจ ใน " + left + " ข้อ (≈" + per + "/ข้อ · " + hint + ")";
    }
    return '<div class="target-line t-' + cls + '">' + txt + '</div>';
  }

  // Feature 5: how the player's mistakes changed between the first and second half of the run.
  function progressHtml(g) {
    var log = g.qLog || [];
    if (!log.length) return "";
    var html = '<h4 style="margin:14px 0 6px">📈 พัฒนาการระหว่างเล่น</h4>';

    // Accuracy per stage
    var byStage = {};
    log.forEach(function (e) {
      byStage[e.stage] = byStage[e.stage] || { sum: 0, n: 0 };
      byStage[e.stage].sum += e.acc;
      byStage[e.stage].n++;
    });
    html += Object.keys(byStage).map(function (s) {
      var st = DH.STAGES[+s - 1];
      var pct = Math.round(100 * byStage[s].sum / byStage[s].n);
      var col = pct >= 80 ? "var(--ok)" : (pct >= 50 ? "var(--warn)" : "var(--bad)");
      return '<div class="prog-row"><span class="prog-lbl">ด่าน ' + s + ' · ' + DH.esc((st && st.name || "").split(" (")[0]) + '</span>' +
        '<span class="prog-track"><i style="width:' + pct + '%;background:' + col + '"></i></span><b class="prog-val">' + pct + '%</b></div>';
    }).join("");

    // Mistake trend: first half vs second half of the questions answered
    if (log.length >= 4) {
      var half = Math.floor(log.length / 2);
      var early = log.slice(0, half), late = log.slice(half);
      var count = function (arr, c) { return arr.filter(function (e) { return e.codes.indexOf(c) >= 0; }).length; };
      var rows = Object.keys(g.mistakes).map(function (c) {
        var e = count(early, c), l = count(late, c);
        var re = e / early.length, rl = l / late.length;
        var badge;
        if (e > 0 && l === 0) badge = '<span class="trend t-ok">🌟 แก้ได้แล้ว</span>';
        else if (e > 0 && rl < re) badge = '<span class="trend t-ok">✅ ดีขึ้น</span>';
        else if (e === 0 && l > 0) badge = '<span class="trend t-warn">🆕 เริ่มพลาดช่วงหลัง</span>';
        else badge = '<span class="trend t-bad">⚠️ ยังพลาดอยู่</span>';
        var meta = DH.MISTAKE_META[c] || { label: c };
        return { score: l * 10 + e, html: '<div class="trend-row"><span>' + DH.esc(meta.label) + '</span><span class="trend-nums">ครึ่งแรก ' + e + ' → ครึ่งหลัง ' + l + '</span>' + badge + '</div>' };
      }).sort(function (a, b) { return b.score - a.score; });
      if (rows.length) {
        html += '<div style="font-size:0.8rem;color:var(--mute);margin:10px 0 4px">ข้อผิดพลาดครึ่งแรก (' + early.length + ' ข้อ) เทียบกับครึ่งหลัง (' + late.length + ' ข้อ) · โจทย์ช่วงหลังยากกว่า</div>' +
          rows.map(function (r) { return r.html; }).join("");
      }
    }

    // Questions the game picked to drill a weakness
    var focus = log.filter(function (e) { return e.focus; });
    if (focus.length) {
      var fixed = focus.filter(function (e) { return e.fixedFocus; }).length;
      html += '<div class="rpg-badge" style="margin-top:10px;display:block;text-align:center">🎯 โจทย์ที่เกมเลือกมาฝึกจุดอ่อน: ไม่พลาดซ้ำ ' + fixed + '/' + focus.length + ' ข้อ</div>';
    }
    return html;
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
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m.name) + '</div><div class="mon-sub">' + DH.esc(m.subtitle) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m.hp / m.maxHp) + '%"></div></div><div class="hp-text">HP ' + m.hp + ' / ' + m.maxHp + ' · ต้องสู้ ' + m.count + ' ข้อ' + (m.isBoss && g.bossBonusHp > 0 ? ' (เสริม +' + g.bossBonusHp + ' HP จากมอนหนี)' : '') + '</div>' + targetLine(g) + '</div>' +
        '<div class="actors-row" style="bottom:8%">' +
          '<div class="actor-unit">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m, "anim-mon-enter") +
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
          (g.curFocus && DH.MISTAKE_META[g.curFocus] ? '<div class="focus-badge">🎯 โจทย์ฝึกจุดอ่อน: ' + DH.esc(DH.MISTAKE_META[g.curFocus].label) + '</div>' : '') +
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
      var shielded = out === "shielded";
      var atkStyle = DH.Avatar.attackStyle(charDraft.job);
      var anim = hitMon ? "anim-atk atk-" + atkStyle : (shielded ? "anim-block" : "anim-hurt");
      var monAnim = hitMon ? (g.monster.hp <= 0 ? "anim-mon-dead" : "anim-mon-hurt") : "anim-mon-lunge";
      var pop = hitMon
        ? '<div class="actor-dmg ok">+' + r2.dmg + ' ⚔️</div>'
        : (shielded ? '<div class="actor-dmg" style="color:#60a5fa">🛡️ ป้องกัน!</div>' : '<div class="actor-dmg bad">💥 -1 ❤️</div>');
      var sparks = '<span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span>';
      // Hit effects land where the blow connects: on the monster when we hit, on the hero when it hits us.
      var impact = hitMon
        ? '<div class="impact-fx on-mon fx-' + atkStyle + '"><span class="slash"></span><span class="ring"></span>' + sparks + '</div>'
        : '<div class="impact-fx on-hero' + (shielded ? ' fx-block' : '') + '"><span class="ring"></span>' + sparks + '</div>';
      var m2 = g.monster;
      body = '<div class="scene-stage ' + (hitMon || !shielded ? "shake-hit" : "") + '">' +
        '<img class="scene-bg" src="' + DH.esc(m2.bg) + '" style="' + bgFilterStyle(m2) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m2.name) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m2.hp / m2.maxHp) + '%"></div></div><div class="hp-text">HP ' + m2.hp + ' / ' + m2.maxHp + '</div>' + targetLine(g) + '</div>' +
        (hitMon ? '<div class="boss-impact-zone"><div class="big-dmg-pop">-' + r2.dmg + '</div></div>' : '') +
        impact +
        '<div class="actors-row" style="bottom:8%">' +
          (hitMon && atkStyle === "ranged" ? '<span class="proj proj-' + DH.esc(charDraft.job) + '"></span>' : '') +
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
          (dead ? monsterObjectHtml(m3, "anim-mon-dead") : monsterObjectHtml(m3, "anim-mon-flee")) +
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
          progressHtml(g) +
          '<div style="display:flex;gap:8px;margin-top:14px">' +
            '<button type="button" class="btn-sec" id="btnRetryBoss" style="flex:1">🐉 ท้ามังกรอีกครั้ง</button>' +
            '<button type="button" class="btn-pri" id="btnRestart" style="flex:1">🔄 เล่นใหม่ตั้งแต่ต้น</button>' +
          '</div>' +
        '</div>';
    }

    ensureApp().innerHTML = hudBar(g, charDraft) + body;
    bindPhase(g);
  }

  // Melee dashes and monster lunges should close the actual gap between the two, whatever the screen width.
  function setDashDistance() {
    var row = document.querySelector(".actors-row");
    var hero = row && row.querySelector(".avatar-stack");
    var mon = row && row.querySelector(".monster-obj");
    if (!hero || !mon) return;
    var gap = mon.getBoundingClientRect().left - hero.getBoundingClientRect().right;
    row.style.setProperty("--dash", Math.max(30, Math.round(gap + 12)) + "px");
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
    } else if (g.phase === "BATTLE" && (el = document.getElementById("btnNext"))) {
      el.onclick = DH.Game.afterBattle;
      setDashDistance();
    }
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
