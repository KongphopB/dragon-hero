// Student phone during a class game. The big picture is on the projector; the phone is for
// answering, seeing your own result, and knowing your damage and rank.
//   DH.PlayGame.show(view, { send, me })   view = the server's "game" message for this student
(function () {
  var DH = window.DH, PT = DH.PlayTactics;
  var v = null, ctx = null, skew = 0, tick = 0;
  var draft = {}, draftQn = 0, board = null, sentQn = 0;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return DH.esc(s); }
  function app() { return $("app"); }
  function left(ts) { return Math.max(0, (ts - (Date.now() + skew)) / 1000); }

  function hud() {
    var me = ctx.me(), jb = DH.JOBS[me.job] || DH.JOBS.warrior;
    return '<div class="pg-hud">' +
      '<span class="pg-me">' + jb.icon + ' ' + esc(me.name) + (v.tac ? ' ' + PT.hearts(v.tac) : '') + '</span>' +
      (v.self && v.stageIdx != null ? '<span class="pg-stagechip">ด่าน ' + (v.stageIdx + 1) + '/' + v.stages + '</span>' : '') +
      '<span class="pg-score">⚔️ ' + (v.score || 0).toLocaleString() + '</span>' +
      (v.rank ? '<span class="pg-rank">#' + v.rank + '<small>/' + v.players + '</small></span>' : '') +
    '</div>';
  }

  function monsterMini() {
    var m = v.monster;
    if (!m) return "";
    var pct = Math.max(0, Math.min(100, 100 * m.hp / Math.max(1, m.maxHp)));
    return '<div class="pg-mon"><b>' + esc(m.name.split(" (")[0]) + '</b><div class="pg-mon-track"><i style="width:' + pct + '%"></i></div><span>HP ' + m.hp.toLocaleString() + '</span></div>';
  }

  function hero(opts) { var me = ctx.me(); return '<div class="pg-hero">' + DH.Avatar.render(me.look, me.job, opts || {}) + '</div>'; }

  // ---------------------------------------------------------------- per phase
  // Like single-player: your own hero faces the monster; the question only opens when the teacher starts it.
  function onStage(sceneHtml, text, cls, extra) {
    return hud() + sceneHtml + '<div class="rpg-card pg-cap' + (cls ? " " + cls : "") + '">' + text + (extra || "") + '</div>';
  }
  function scene(o) { return DH.PlayScene.html(v, ctx.me(), o); }
  function monName() { return esc(v.monster.name.split(" (")[0]); }
  var WAIT_Q = '<div class="pg-waitq">⏳ รอครูกดเริ่มทำโจทย์ แล้วโจทย์จะขึ้นที่นี่</div>';
  // Self-paced mode: the student moves on with their own button instead of waiting for the teacher.
  function goBtn(label, disabled) {
    return '<button type="button" class="btn-pri pg-go" id="pgNext"' + (disabled ? " disabled" : "") + '>' + label + '</button>';
  }

  function rankCard() {
    var mv = v.move > 0 ? '<span class="pg-up">▲ ขึ้น ' + v.move + ' อันดับ</span>' : (v.move < 0 ? '<span class="pg-down">▼ ลง ' + (-v.move) + ' อันดับ</span>' : '');
    return '<div class="pg-rankrow' + (v.rank && v.rank <= 3 ? " rank-frame-" + v.rank : "") + '">' +
      '<span>อันดับของคุณ</span><b class="pg-bigrank">#' + v.rank + '<small>/' + v.players + '</small></b>' + mv +
      '<div class="pg-total">ดาเมจสะสม ⚔️ ' + v.score.toLocaleString() + (v.lastDmg ? ' <small>(+' + v.lastDmg.toLocaleString() + ')</small>' : '') + '</div>' +
      (v.streak >= 2 ? '<div class="pg-streak">🔥 ถูกติดกัน ' + v.streak + ' ข้อ</div>' : '') +
    '</div>';
  }

  var SCREENS = {
    INTRO: function () {
      var me = ctx.me();
      return hud() +
        '<div class="scene-stage pg-stage"><div class="crane-world"><img class="crane-bg" src="../assets/bg/bg_depart_crane.webp" alt="">' +
          '<div class="crane-walker">' + DH.Avatar.render(me.look, me.job, { walking: true, backView: true }) + '</div></div><div class="scene-scrim"></div></div>' +
        '<div class="rpg-card pg-cap">🎬 <b>' + esc(me.name) + '</b> เดินออกจากประตูเมือง มุ่งหน้าสู่ทุ่งหญ้ากว้างใหญ่…</div>';
    },
    ENCOUNTER: function () {
      var m = v.monster;
      if (v.self) {
        return onStage(scene({ monAnim: "anim-mon-enter" }),
          (m.isBoss ? '🔥 <b>ถึงถ้ำมังกรแล้ว!</b> ' + monName() : '⚠️ <b>พบศัตรูขวางทาง!</b> ' + monName()) +
          '<div class="pg-sub">ด่าน ' + (v.stageIdx + 1) + '/' + v.stages + ' · ต้องสู้ ' + m.count + ' ข้อ' + (m.isBoss ? '' : ' · ทำตามจังหวะของคุณเอง') + '</div>',
          m.isBoss ? "is-boss" : "", goBtn(m.isBoss ? "🔥 บุกถ้ำมังกร!" : "⚔️ เริ่มสู้!"));
      }
      return onStage(scene({ monAnim: "anim-mon-enter" }),
        (m.isBoss ? '🔥 <b>บอสใหญ่ปรากฏตัว!</b> ' : '⚠️ <b>พบศัตรูขวางทาง!</b> ') + monName() + '<div class="pg-sub">ต้องสู้ ' + m.count + ' ข้อ · ทั้งห้องช่วยกันตี</div>',
        m.isBoss ? "is-boss" : "", WAIT_Q);
    },
    QUESTION: question,
    REVEAL: reveal,
    BATTLE: function () {
      var b = DH.PlayScene.battle(v, ctx.me());
      return onStage(b.scene, b.text, b.good ? "is-good" : "is-bad", v.self ? goBtn("ต่อไป ▶") : "");
    },
    BOARD: function () {
      return onStage(scene({}), rankCard(), "", WAIT_Q);
    },
    MON_DEFEAT: function () {
      return onStage(scene({ monAnim: "anim-mon-dead", heroAnim: "anim-walk" }),
        '💥 <b>โค่น ' + monName() + ' สำเร็จ!</b><div class="pg-sub">' +
          (v.tac ? (v.draftPicked ? "รอเพื่อนเลือกการ์ด แล้วครูจะพาไปด่านต่อไป" : "เลือกการ์ดรางวัลก่อนไปด่านต่อไป") : "ทั้งห้องช่วยกันได้เยี่ยม รอครูพาไปด่านต่อไป") + '</div>',
        "is-good", (v.tac ? PT.draftHtml(v) : "") + (v.self ? goBtn("ไปด่านต่อไป ▶", v.tac && v.draft && !v.draftPicked) : ""));
    },
    MON_ESCAPE: function () {
      return onStage(scene({ monAnim: "anim-mon-flee" }),
        '💨 <b>' + monName() + ' หนีไปได้!</b><div class="pg-sub">เลือดที่เหลือไปเพิ่มให้มังกรบอส ต้องตีให้แรงขึ้น!</div>', "is-warn", v.self ? goBtn("ไปด่านต่อไป ▶") : "");
    },
    VICTORY: function () {
      return onStage(scene({ monAnim: "anim-mon-dead", heroAnim: "anim-walk", bgStyle: "filter:brightness(0.95)" }),
        v.self ? '🎉 <b>ชัยชนะ!</b> คุณโค่นมังกรเพลิงบรรพกาลได้สำเร็จ!' : '🎉 <b>ชัยชนะ!</b> ห้องเราโค่นมังกรเพลิงบรรพกาลได้สำเร็จ!<div class="pg-sub">ดูจอหน้าห้อง ใครคือฮีโร่ของห้อง?</div>',
        "is-good", v.self ? goBtn("🏁 จบการผจญภัย ▶") : "");
    },
    DEFEAT: function () {
      var eat = v.defeatFate === "eat";
      return onStage(scene({ monAnim: "anim-mon-lunge", heroAnim: "anim-hurt", bgStyle: "filter:brightness(0.65) saturate(1.3)",
          overlay: '<div class="' + (eat ? "dragon-eat-overlay" : "dragon-fire-overlay") + '"></div>' }),
        (eat ? '🐉 <b>พ่ายแพ้…</b> ดาเมจไม่พอ ถูกมังกรกลืนลงท้อง!' : '🔥 <b>พ่ายแพ้…</b> ดาเมจไม่พอ ถูกเปลวไฟมังกรเผาวอด!') +
        (v.self ? '' : '<div class="pg-sub">ดูจอหน้าห้องเพื่อดูอันดับ</div>'), "is-bad", v.self ? goBtn("🏁 จบการผจญภัย ▶") : "");
    },
    DONE: function () {
      var me = v.me || {};
      return onStage(scene({ monAnim: v.result === "win" ? "anim-mon-dead" : "anim-mon-idle" }),
        '🏁 <b>จบการผจญภัยของคุณแล้ว!</b> ' + (v.result === "win" ? "ปราบมังกรสำเร็จ 🐉✅" : "มังกรยังไม่ล้ม") +
        '<div class="pg-stats pg-stats-sm"><span>⚔️ ' + (v.score || 0).toLocaleString() + '<small>ดาเมจรวม</small></span>' +
          '<span>#' + v.rank + '<small>อันดับตอนนี้</small></span>' +
          '<span>' + Math.round(100 * (me.acc || 0)) + '%<small>แม่นยำ</small></span></div>' +
        '<div class="pg-waitq">⏳ รอเพื่อนเล่นให้จบ (' + v.doneCount + '/' + v.doneOf + ' คน) หรือครูกดจบเกม</div>', v.result === "win" ? "is-good" : "");
    },
    FINAL: finalScreen,
    SUMMARY: finalScreen
  };

  function timerBar() {
    if (!v.timeTotal) return '<div class="pg-timer is-untimed">⏱ ไม่จับเวลา</div>';
    return '<div class="pg-timer"><div class="pg-ttrack"><i id="pgTbar"></i></div><b id="pgTsec"></b></div>';
  }

  function question() {
    var q = v.q;
    if (v.answered || sentQn === v.qNum) {
      return hud() + timerBar() +
        '<div class="rpg-card pg-watch pg-sent"><div class="pl-big-ico">✅</div><b>ส่งคำตอบแล้ว!</b><span>รอเพื่อนส่งให้ครบ <b id="pgCount">' + (v.count || 0) + '/' + v.players + '</b></span>' + hero({ large: true }) + '</div>';
    }
    var me = ctx.me();
    return hud() + monsterMini() + timerBar() +
      (v.tac ? PT.intentBar(v.tac) + PT.ultBar(v.tac, me.job) + PT.hand(v.tac) : '') +
      '<div class="rpg-card pg-q">' +
        '<div class="pg-qhead"><span>📜 ข้อ ' + v.qNum + '/' + v.qTotal + '</span><span class="su-chip">' + esc(q.lv) + '</span><span class="su-chip">' + esc(q.tg) + '</span></div>' +
        '<p class="pg-qtext">' + esc(q.t) + '</p>' +
        '<div id="pgBoard"></div>' +
        '<button type="button" class="btn-pri" id="pgSubmit" style="width:100%;margin-top:10px">⚔️ ส่งคำตอบ!</button>' +
      '</div>';
  }

  function resultTitle(mine) {
    if (!mine) return ["⏱", "หมดเวลา · ไม่ได้ส่งคำตอบ", "bad"];
    if (mine.acc >= 0.999) return ["⚔️", "ถูกครบ! โจมตีเต็มแรง", "ok"];
    if (mine.acc >= 0.5) return ["🟡", "ถูกบางส่วน (" + Math.round(mine.acc * 100) + "%)", "part"];
    return ["💥", "ยังไม่ถูก", "bad"];
  }

  function reveal() {
    var mine = v.mine, t = resultTitle(mine);
    return hud() +
      '<div class="rpg-card pg-res is-' + t[2] + '">' +
        '<div class="pg-res-head"><b>' + t[0] + ' ' + t[1] + '</b><b class="pg-dmg">' + (mine && mine.dmg ? '+' + mine.dmg.toLocaleString() : '+0') + ' ดาเมจ</b></div>' +
        (mine ? '<div class="pg-res-sub">ตอบใน ' + mine.secs + ' วิ · ' + (v.myAcc ? 'ความแม่นยำของคุณตอนนี้ ' : 'ห้องนี้ถูกเฉลี่ย ') + Math.round(v.classAcc * 100) + '%</div>' : '') +
        (v.tac ? PT.revealLog(v.tac, ctx.me().job) : '') +
        '<div id="pgRevBoard"></div>' +
        (mine ? '<ul class="fb-list">' + mine.rows.map(function (row) {
          if (row.header) return '<li style="color:var(--accent);font-weight:800">' + esc(row.header) + '</li>';
          var fn = (DH.FORCES[row.force] && DH.FORCES[row.force].n) || row.force;
          var ok = row.status === "ok";
          return '<li style="color:' + (ok ? "#4ade80" : "#f87171") + '">' + (ok ? "✓" : "✗") + ' ' + esc(fn) + ' — ' + esc(row.msg) + '</li>';
        }).join("") + '</ul>' : '') +
        '<p class="pg-why">' + esc(v.q.why).replace(/\n/g, "<br>") + '</p>' +
        (v.self ? goBtn("⚔️ ไปฉากต่อสู้ ▶") : '') +
      '</div>';
  }

  function finalScreen() {
    var me = v.me || {}, place = v.rank;
    var medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "⚔️";
    return hud() +
      '<div class="rpg-card pg-final' + (place && place <= 3 ? " rank-frame-" + place : "") + '">' +
        '<div class="pg-final-top">' + (v.self
          ? (v.myResult === "win" ? "🎉 คุณปราบมังกรสำเร็จ!" : (v.myResult === "lose" ? "🐉 มังกรของคุณยังไม่ล้ม ครั้งหน้าเอาใหม่!" : "⏹ ครูจบเกมก่อนคุณเล่นจบ"))
          : (v.result === "win" ? "🎉 ห้องเราปราบมังกรสำเร็จ!" : "🐉 มังกรยังไม่ล้ม ครั้งหน้าเอาใหม่!")) + '</div>' +
        hero({ large: true }) +
        '<b class="pg-bigrank">' + medal + ' อันดับ ' + place + '<small>/' + v.players + '</small></b>' +
        '<div class="pg-stats"><span>⚔️ ' + (v.score || 0).toLocaleString() + '<small>ดาเมจรวม</small></span>' +
          '<span>' + (me.correct || 0) + '/' + (me.answered || 0) + '<small>ถูกครบ</small></span>' +
          '<span>' + Math.round(100 * (me.acc || 0)) + '%<small>แม่นยำ</small></span></div>' +
      '</div>' +
      '<div class="rpg-card pg-mistakes"><h3>🧠 จุดที่คุณควรระวัง</h3>' +
        ((me.mistakes || []).length ? me.mistakes.map(function (m) {
          return '<div class="pg-mis"><b>⚠️ ' + esc(m.label) + '</b> <span class="su-chip">' + m.count + ' ครั้ง</span><div>💡 ' + esc(m.tip) + '</div></div>';
        }).join("") : '<p style="color:#86efac;font-weight:700">🌟 ไม่มีจุดผิดซ้ำเลย เยี่ยมมาก!</p>') +
      '</div>' +
      '<div class="pg-tip">ครูอาจกดเล่นอีกรอบ รอที่หน้านี้ได้เลย</div>';
  }

  // ---------------------------------------------------------------- wiring per phase
  function afterDraw() {
    if (v.phase === "QUESTION" && $("pgBoard")) {
      if (draftQn !== v.qNum) { draft = {}; draftQn = v.qNum; }
      var q = JSON.parse(JSON.stringify(v.q));
      board = window.FBD.mount($("pgBoard"), q, Object.assign({
        biome: v.monster && v.monster.id,
        initialState: Object.keys(draft).length ? draft : undefined,
        onChange: function (st) { draft = st; }
      }, v.tac ? PT.boardOpts(v.tac, q) : {}));
      document.querySelectorAll("[data-card]").forEach(function (b) {
        b.onclick = function () { b.disabled = true; ctx.send({ t: "card", qn: v.qNum, idx: Number(b.dataset.card), cid: b.dataset.cid }); };
      });
      if ($("ptUlt")) $("ptUlt").onclick = function () { $("ptUlt").disabled = true; ctx.send({ t: "ult", qn: v.qNum }); };
      $("pgSubmit").onclick = function () {
        var place = board ? board.getState() : draft;
        sentQn = v.qNum;
        ctx.send({ t: "answer", qn: v.qNum, place: place });
        if (navigator.vibrate) navigator.vibrate(30);
        draw();
      };
    }
    if ($("pgNext")) $("pgNext").onclick = function () { $("pgNext").disabled = true; ctx.send({ t: "next" }); };
    if (v.phase === "MON_DEFEAT") {
      document.querySelectorAll("[data-draft]").forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll("[data-draft]").forEach(function (x) { x.disabled = true; });
          ctx.send({ t: "draft", cid: b.dataset.draft });
        };
      });
    }
    if (v.phase === "REVEAL" && $("pgRevBoard")) {
      window.FBD.mount($("pgRevBoard"), v.q, {
        biome: v.monster && v.monster.id,
        readOnly: true,
        initialState: v.mine ? v.mine.place : {},
        revealData: { revealMode: "key" }
      });
    }
  }

  function draw() {
    var f = SCREENS[v.phase];
    if (!f) return;
    app().innerHTML = '<div class="pg">' + f() + '</div>';
    if (app().querySelector(".actors-row")) DH.PlayScene.after();
    afterDraw();
    clock();
  }

  function clock() {
    var bar = $("pgTbar"), sec = $("pgTsec");
    if (!bar || !v.timeTotal) return;
    var s = left(v.endsAt);
    bar.style.width = (100 * s / v.timeTotal) + "%";
    bar.classList.toggle("is-low", s <= 5);
    sec.textContent = Math.ceil(s) + " วิ";
  }

  function show(view, context) {
    ctx = context;
    if (view.now) skew = view.now - Date.now();
    var same = v && v.phase === view.phase && v.qNum === view.qNum;
    var wasAnswered = v && v.answered;
    var tacBefore = v && v.tac ? JSON.stringify([v.tac.armed, v.tac.ultArmed, v.tac.hint, v.tac.retry, v.tac.cards, v.tac.hearts]) : "";
    var tacNow = view.tac ? JSON.stringify([view.tac.armed, view.tac.ultArmed, view.tac.hint, view.tac.retry, view.tac.cards, view.tac.hearts]) : "";
    v = view;
    // Second chance: the server sent the answer back, so the question opens again.
    if (view.phase === "QUESTION" && view.tac && view.tac.retry && !view.answered && sentQn === view.qNum) sentQn = 0;
    // An open question is only redrawn when something about it changed (a card, the ultimate,
    // a second chance, or the server saying we answered); the arrows being placed are kept.
    if (same && view.phase === "QUESTION" && !(view.answered && !wasAnswered) && tacBefore === tacNow) { clock(); return; }
    if (view.phase === "QUESTION" && draftQn !== view.qNum && navigator.vibrate) navigator.vibrate([40, 60, 40]);
    draw();
    clearInterval(tick);
    if (view.phase === "QUESTION" && view.timeTotal) tick = setInterval(clock, 250);
  }

  function progress(m) {
    if (!v || v.phase !== "QUESTION") return;
    v.count = m.answered;
    var c = $("pgCount");
    if (c) c.textContent = m.answered + "/" + m.players;
  }

  DH.PlayGame = { show: show, progress: progress, active: function () { return !!v; }, reset: function () { v = null; clearInterval(tick); } };
})();
