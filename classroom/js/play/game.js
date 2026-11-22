// Student phone during a class game. The big picture is on the projector; the phone is for
// answering, seeing your own result, and knowing your damage and rank.
//   DH.PlayGame.show(view, { send, me })   view = the server's "game" message for this student
(function () {
  var DH = window.DH;
  var v = null, ctx = null, skew = 0, tick = 0;
  var draft = {}, draftQn = 0, board = null, sentQn = 0;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return DH.esc(s); }
  function app() { return $("app"); }
  function left(ts) { return Math.max(0, (ts - (Date.now() + skew)) / 1000); }

  function hud() {
    var me = ctx.me(), jb = DH.JOBS[me.job] || DH.JOBS.warrior;
    return '<div class="pg-hud">' +
      '<span class="pg-me">' + jb.icon + ' ' + esc(me.name) + '</span>' +
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

  function watch(icon, title, sub, extra) {
    return hud() + monsterMini() +
      '<div class="rpg-card pg-watch"><div class="pl-big-ico">' + icon + '</div><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + (extra || '') + '</div>';
  }

  function hero(opts) { var me = ctx.me(); return '<div class="pg-hero">' + DH.Avatar.render(me.look, me.job, opts || {}) + '</div>'; }

  // ---------------------------------------------------------------- per phase
  var SCREENS = {
    INTRO: function () { return watch("🎬", "ออกเดินทางแล้ว!", "มองที่จอหน้าห้อง ทุกคนกำลังเดินออกจากเมือง", hero({ walking: true, large: true })); },
    ENCOUNTER: function () {
      return watch(v.monster.isBoss ? "🔥" : "⚠️", (v.monster.isBoss ? "บอสใหญ่: " : "เจอ ") + esc(v.monster.name.split(" (")[0]) + "!",
        "เตรียมพร้อม · โจทย์จะขึ้นบนมือถือเมื่อครูกดเริ่ม", hero({ large: true }));
    },
    QUESTION: question,
    REVEAL: reveal,
    BATTLE: function () {
      var mine = v.lastDmg > 0;
      var title = !v.inBattle ? "ดูฉากต่อสู้บนจอหน้าห้อง"
        : (mine ? "คุณได้ออกไปโจมตี! ดูจอหน้าห้อง" : "คุณออกไปสู้ แต่โดนมอนสวนกลับ! ดูจอหน้าห้อง");
      return watch(mine || !v.inBattle ? "⚔️" : "💥", title,
        mine ? "คุณสร้างดาเมจ <b>+" + v.lastDmg.toLocaleString() + "</b> ในข้อนี้" : "ข้อนี้คุณยังไม่ได้ดาเมจ ข้อหน้าเอาใหม่!",
        hero({ large: true }));
    },
    BOARD: function () {
      var mv = v.move > 0 ? '<span class="pg-up">▲ ขึ้น ' + v.move + ' อันดับ</span>' : (v.move < 0 ? '<span class="pg-down">▼ ลง ' + (-v.move) + ' อันดับ</span>' : '');
      return hud() + monsterMini() +
        '<div class="rpg-card pg-rankcard' + (v.rank && v.rank <= 3 ? " rank-frame-" + v.rank : "") + '">' +
          '<span>อันดับของคุณ</span><b class="pg-bigrank">#' + v.rank + '</b>' + mv +
          '<div class="pg-total">ดาเมจสะสม ⚔️ ' + v.score.toLocaleString() + (v.lastDmg ? ' <small>(+' + v.lastDmg.toLocaleString() + ')</small>' : '') + '</div>' +
          (v.streak >= 2 ? '<div class="pg-streak">🔥 ถูกติดกัน ' + v.streak + ' ข้อ</div>' : '') +
        '</div>' +
        '<div class="pg-tip">ข้อถัดไปกำลังจะมา ตอบให้ถูกและเร็วเพื่อดาเมจที่มากขึ้น</div>';
    },
    MON_DEFEAT: function () { return watch("💥", "โค่น " + esc(v.monster.name.split(" (")[0]) + " สำเร็จ!", "ทั้งห้องช่วยกันได้เยี่ยม ไปด่านต่อไป"); },
    MON_ESCAPE: function () { return watch("💨", esc(v.monster.name.split(" (")[0]) + " หนีไปได้!", "เลือดที่เหลือไปเพิ่มให้มังกรบอส ต้องตีให้แรงขึ้น!"); },
    VICTORY: function () { return watch("🎉", "ปราบมังกรสำเร็จ!", "ดูจอหน้าห้อง ใครคือฮีโร่ของห้อง?", hero({ large: true })); },
    DEFEAT: function () { return watch("🐉", "มังกรยังไม่ล้ม…", "ดาเมจรวมยังไม่พอ ดูจอหน้าห้องเพื่อดูอันดับ"); },
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
    return hud() + timerBar() +
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
        (mine ? '<div class="pg-res-sub">ตอบใน ' + mine.secs + ' วิ · ห้องนี้ถูกเฉลี่ย ' + Math.round(v.classAcc * 100) + '%</div>' : '') +
        '<div id="pgRevBoard"></div>' +
        (mine ? '<ul class="fb-list">' + mine.rows.map(function (row) {
          if (row.header) return '<li style="color:var(--accent);font-weight:800">' + esc(row.header) + '</li>';
          var fn = (DH.FORCES[row.force] && DH.FORCES[row.force].n) || row.force;
          var ok = row.status === "ok";
          return '<li style="color:' + (ok ? "#4ade80" : "#f87171") + '">' + (ok ? "✓" : "✗") + ' ' + esc(fn) + ' — ' + esc(row.msg) + '</li>';
        }).join("") + '</ul>' : '') +
        '<p class="pg-why">' + esc(v.q.why).replace(/\n/g, "<br>") + '</p>' +
      '</div>';
  }

  function finalScreen() {
    var me = v.me || {}, place = v.rank;
    var medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "⚔️";
    return hud() +
      '<div class="rpg-card pg-final' + (place && place <= 3 ? " rank-frame-" + place : "") + '">' +
        '<div class="pg-final-top">' + (v.result === "win" ? "🎉 ห้องเราปราบมังกรสำเร็จ!" : "🐉 มังกรยังไม่ล้ม ครั้งหน้าเอาใหม่!") + '</div>' +
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
      board = window.FBD.mount($("pgBoard"), v.q, {
        biome: v.monster && v.monster.id,
        initialState: Object.keys(draft).length ? draft : undefined,
        onChange: function (st) { draft = st; }
      });
      $("pgSubmit").onclick = function () {
        var place = board ? board.getState() : draft;
        sentQn = v.qNum;
        ctx.send({ t: "answer", qn: v.qNum, place: place });
        if (navigator.vibrate) navigator.vibrate(30);
        draw();
      };
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
    v = view;
    // An open question must not be redrawn (it would wipe the arrows being placed) unless
    // the server says we already answered.
    if (same && view.phase === "QUESTION" && !(view.answered && !wasAnswered)) { clock(); return; }
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
