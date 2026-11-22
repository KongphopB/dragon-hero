// QUESTION: monster intent, ultimate gauge, card hand, the FBD board and the submit button.
// Study cards hook in here: x-ray (faint answer arrow), cut (hide decoy forces), protractor (angle guides).
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;
  var boardCtrl = null;

  function intentText(id, m) {
    var it = DH.INTENTS[id];
    return it ? it.desc.replace("{X}", m ? String(m.baseDmg) : "") : "";
  }

  function intentBarHtml(g) {
    var it = DH.INTENTS[g.intent];
    if (!it) return "";
    return '<div class="intent-bar ' + (it.good ? "is-good" : "is-bad") + '">' +
      '<span class="intent-ico">' + it.icon + '</span>' +
      '<span><b>' + DH.esc(g.monster.name.split(" (")[0]) + ' เตรียม: ' + it.name + '</b><br>' + DH.esc(intentText(g.intent, g.monster)) + '</span>' +
    '</div>';
  }

  function ultBarHtml(g, charDraft) {
    var u = DH.ULTIMATES[charDraft.job];
    if (!u) return "";
    var val = g.ult || 0;
    var ready = val >= DH.ULT_MAX && !g.ultArmed;
    var pips = "";
    for (var i = 0; i < DH.ULT_MAX; i++) {
      var fill = Math.max(0, Math.min(1, val - i));
      pips += '<i><b style="width:' + Math.round(fill * 100) + '%"></b></i>';
    }
    if (g.ultArmed) {
      return '<div class="ult-bar armed" style="--ult:' + u.color + '"><span class="ult-ico">' + u.icon + '</span><span><b>' + u.name + ' พร้อมปล่อย!</b><br>' + DH.esc(u.desc) + '</span></div>';
    }
    return '<div class="ult-bar' + (ready ? " ready" : "") + '" style="--ult:' + u.color + '">' +
      '<span class="ult-ico">' + u.icon + '</span>' +
      '<span class="ult-info"><b>ท่าไม้ตาย: ' + u.name + '</b><span class="ult-pips">' + pips + '</span></span>' +
      (ready ? '<button type="button" class="ult-btn" id="btnUlt">⚡ ใช้!</button>' : '<span class="ult-hint">ตอบถูกเพื่อชาร์จ</span>') +
    '</div>';
  }

  function cardsHtml(g) {
    var intent = DH.INTENTS[g.intent];
    var counters = intent ? intent.counter : [];
    if (!g.cards.length) return '<div class="hand-head">🃏 ไม่มีการ์ดในมือ <span>ปราบมอนเพื่อเลือกการ์ดใหม่</span></div>';
    return '<div class="hand-head">🃏 การ์ดกลยุทธ์ <span>แตะ 1 ใบก่อนส่งคำตอบ</span></div><div class="cards-tray">' +
      g.cards.map(function (cid, idx) {
        var c = DH.CARDS[cid];
        var isCounter = !g.armedCard && counters.indexOf(cid) >= 0;
        return '<button type="button" class="card-pill kind-' + c.kind + ' card-' + cid + (isCounter ? " is-counter" : "") + '" data-cardidx="' + idx + '"' + (g.armedCard ? " disabled" : "") + '>' +
          (isCounter ? '<span class="counter-tag">แก้ทาง!</span>' : '') +
          '<div class="card-name">' + c.icon + ' <b>' + c.name + '</b></div>' +
          '<div class="card-desc">' + DH.esc(c.desc) + '</div>' +
        '</button>';
      }).join("") + '</div>';
  }

  // X-ray: the first answer arrow the player hasn't got right yet.
  function pickXray(g) {
    var q = g.curQ;
    if (g.xrayPick && g.xrayPick.q === q.id) return g.xrayPick;
    var multi = !Array.isArray(q.ex);
    var views = multi ? ["A", "B"] : ["all"];
    var place = g.draftPlace || {};
    var pick = null;
    views.some(function (v) {
      // Reveal a harder force before W: everyone knows weight points down.
      var exp = (multi ? (q.ex[v] || []) : q.ex).slice().sort(function (a, b) { return (a[0] === "W") - (b[0] === "W"); });
      return exp.some(function (e) {
        var got = place[v] && place[v][e[0]];
        var angs = got === undefined ? [] : (Array.isArray(got) ? got : [got]);
        var want = Array.isArray(e[1]) ? e[1][0] : e[1];
        var ok = angs.some(function (a) { var d = Math.abs(a - want) % 360; return Math.min(d, 360 - d) <= (q.tol || 12); });
        if (!ok) { pick = { q: q.id, view: v, force: e[0], angle: want }; return true; }
        return false;
      });
    });
    if (!pick) {
      var e0 = multi ? q.ex.A[0] : q.ex[0];
      pick = { q: q.id, view: multi ? "A" : "all", force: e0[0], angle: Array.isArray(e0[1]) ? e0[1][0] : e0[1] };
    }
    g.xrayPick = pick;
    return pick;
  }

  // Protractor: reference lines for the angles that matter in this question.
  function angleGuidesFor(q) {
    var out = [{ angle: 0, label: "0°", color: "#94a3b8" }, { angle: 90, label: "90°", color: "#94a3b8" }];
    if (q.ia) {
      out.push({ angle: q.ia, label: "θ=" + q.ia + "°", color: "#fbbf24" });
      out.push({ angle: 90 + q.ia, label: (90 + q.ia) + "°", color: "#fbbf24" });
    }
    (q.rp || []).forEach(function (a) {
      if (out.every(function (o) { return o.angle !== a; })) out.push({ angle: a, label: a + "°", color: "#c084fc" });
    });
    return out;
  }

  DH.Screens.scene("QUESTION", {
    html: function (g, charDraft) {
      var q = g.curQ;
      return '<div class="tbar"><i id="sTimerBar" style="width:100%"></i></div>' +
        K.monsterMiniHud(g.monster) +
        intentBarHtml(g) +
        ultBarHtml(g, charDraft) +
        (g.armedCard ? '<div class="armed-card kind-' + DH.CARDS[g.armedCard].kind + '">✨ ใช้การ์ด ' + DH.CARDS[g.armedCard].icon + ' <b>' + DH.CARDS[g.armedCard].name + '</b> แล้ว</div>' : '') +
        (g.cardMsg ? '<div class="card-msg">' + DH.esc(g.cardMsg) + '</div>' : '') +
        (g.secondChanceMsg ? '<div class="rpg-card" style="padding:8px 12px;margin-bottom:8px;border-color:#f59e0b;color:#fde047">' + DH.esc(g.secondChanceMsg) + '</div>' : '') +
        cardsHtml(g) +
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
    },

    bind: function (g) {
      var el;
      var aid = { overlayArrows: [], hideDecoys: g.armedCard === "cut", angleGuides: g.armedCard === "protractor" ? angleGuidesFor(g.curQ) : [] };
      g.xrayText = "";
      if (g.armedCard === "xray") {
        var xp = pickXray(g);
        var fnm = (DH.FORCES[xp.force] && DH.FORCES[xp.force].n) || xp.force;
        if (xp.view === "all") aid.overlayArrows = [{ force: xp.force, angle: xp.angle, opacity: 0.55 }];
        g.xrayText = "🔍 เอ็กซ์เรย์: " + (xp.view === "all" ? "" : "ในมุมโฟกัส " + xp.view + " ") + "มีแรง " + fnm + " ทิศ " + xp.angle + "°" + (xp.view === "all" ? " (ลูกศรจางบนกระดาน)" : "");
        var xt = document.querySelector(".card-msg.xray");
        if (!xt) {
          var holder = document.createElement("div");
          holder.className = "card-msg xray";
          holder.textContent = g.xrayText;
          var board0 = document.getElementById("soloBoard");
          board0.parentNode.insertBefore(holder, board0);
        }
      }
      boardCtrl = global.FBD.mount(document.getElementById("soloBoard"), g.curQ, {
        biome: g.monster && g.monster.id,
        initialState: Object.keys(g.draftPlace).length ? g.draftPlace : undefined,
        overlayArrows: aid.overlayArrows,
        hideDecoys: aid.hideDecoys,
        angleGuides: aid.angleGuides,
        onChange: function (st) { g.draftPlace = st; }
      });
      if ((el = document.getElementById("btnUlt"))) el.onclick = DH.Game.useUltimate;
      document.querySelectorAll("[data-cardidx]").forEach(function (btn) {
        btn.onclick = function () { DH.Game.useCard(+btn.dataset.cardidx); };
      });
      document.getElementById("btnSubmit").onclick = function () {
        var place = boardCtrl ? boardCtrl.getState() : g.draftPlace;
        DH.Game.submitAnswer(false, place);
      };
    },

    timer: function (g, charDraft, txt, bar) {
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
    }
  });
})(window);
