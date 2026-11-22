(function (global) {
  var DH = global.DH = global.DH || {};
  var DONE_KEY = "dh_tut_done";

  // Practice copies of two stage-1 questions (own ids so they never count as "used" in a run).
  function practiceQuestion(srcId, id, text) {
    var src = DH.QUESTIONS.filter(function (q) { return q.id === srcId; })[0];
    var q = JSON.parse(JSON.stringify(src));
    q.id = id;
    q.t = text;
    q.tm = 0;
    return q;
  }

  // Guided steps for the first board: one force at a time, with a plain hint when it's placed wrong.
  var GUIDE = [
    { force: "W", todo: "ลากปุ่ม <b>W</b> ขึ้นไปวาง<b>ใต้กล่อง</b> ให้ลูกศรชี้ลงตรง ๆ ↓", wrong: "น้ำหนัก W ต้องชี้<b>ลงตรง ๆ</b> (270°) เสมอ · แตะ ✕ ที่หัวลูกศรเพื่อลบ แล้วลากใหม่" },
    { force: "N", todo: "ลากปุ่ม <b>N</b> ไปวาง<b>เหนือกล่อง</b> ให้ลูกศรชี้ขึ้น ↑ (พื้นดันกล่องขึ้น)", wrong: "แรงตั้งฉาก N ดัน<b>ออกจากพื้น</b> พื้นราบจึงชี้ขึ้นตรง ๆ (90°) · แตะ ✕ แล้วลากใหม่" }
  ];

  var t = null; // tutorial state while open

  function isDone() {
    try { return localStorage.getItem(DONE_KEY) === "1"; } catch (e) { return false; }
  }

  function finish() {
    try { localStorage.setItem(DONE_KEY, "1"); } catch (e) { /* ignore */ }
    t = null;
    DH.Screens.render();
  }

  function app() { return document.getElementById("app"); }

  function shell(stepNo, inner) {
    var dots = [1, 2, 3, 4].map(function (i) { return '<i class="' + (i <= stepNo ? "on" : "") + '"></i>'; }).join("");
    return '<div class="tut-top"><span class="tut-dots">' + dots + '</span>' +
      '<button type="button" class="btn-link" id="tutSkip">ข้ามการฝึก ✕</button></div>' + inner;
  }

  function bindSkip() {
    document.getElementById("tutSkip").onclick = finish;
  }

  // ---------- Step 1: what we're doing ----------
  function stepIntro() {
    var c = DH.Game.getChar();
    app().innerHTML = shell(1,
      '<div class="rpg-card tut-card">' +
        '<div class="tut-hero">' + DH.Avatar.render(c.look, c.job, { large: true }) + '</div>' +
        '<h2>📘 ค่ายฝึกนักผจญภัย</h2>' +
        '<p>ในการผจญภัย ทุกครั้งที่จะโจมตีมอนสเตอร์ คุณต้อง<b>เขียนแผนภาพแรง (FBD)</b> ของวัตถุในโจทย์ให้ถูก</p>' +
        '<ul class="tut-list">' +
          '<li>⚔️ วางแรงถูกครบ = โจมตีแรงเต็มที่ · ยิ่งตอบเร็วยิ่งแรง</li>' +
          '<li>🟡 ถูกบางส่วน = โจมตีเบาลง</li>' +
          '<li>💥 ผิดเกินครึ่ง = ถูกมอนสวนกลับ เสียหัวใจ ❤️</li>' +
        '</ul>' +
        '<p class="tut-soft">ฝึก 2 ข้อ ไม่จับเวลา ไม่เสียหัวใจ</p>' +
        '<button type="button" class="btn-pri" id="tutNext" style="width:100%">เริ่มฝึก ▶</button>' +
      '</div>');
    bindSkip();
    document.getElementById("tutNext").onclick = stepGuided;
  }

  // ---------- Step 2: guided board ----------
  function stepGuided() {
    var q = practiceQuestion("s1_flat_rest", "tut_flat", "กล่องวางนิ่งอยู่บนพื้นราบ มีแรงอะไรกระทำต่อกล่องบ้าง?");
    t = { q: q, place: {}, guided: true };
    app().innerHTML = shell(2,
      '<div class="rpg-card tut-card">' +
        '<div class="tut-q">📜 ' + DH.esc(q.t) + '</div>' +
        '<div class="tut-coach" id="tutCoach"></div>' +
        '<div id="tutBoard"></div>' +
        '<div id="tutFeedback"></div>' +
        '<button type="button" class="btn-pri" id="tutSubmit" style="width:100%;margin-top:10px">⚔️ ส่งคำตอบ</button>' +
      '</div>');
    bindSkip();
    global.FBD.mount(document.getElementById("tutBoard"), q, {
      biome: "slime",
      overlayArrows: q.ex.map(function (e) { return { force: e[0], angle: e[1] }; }),
      onChange: function (st) { t.place = st; updateCoach(); }
    });
    updateCoach();
    document.getElementById("tutSubmit").onclick = function () { submitPractice(stepSolo); };
  }

  function forceStatus(q, place, force) {
    var res = DH.Grading.gradeAnswer(q, place);
    var placed = place.all && place.all[force] !== undefined;
    var row = res.rows.filter(function (r) { return r.force === force; })[0];
    if (!placed) return "todo";
    return row && row.status === "ok" ? "ok" : "wrong";
  }

  function updateCoach() {
    var box = document.getElementById("tutCoach");
    if (!box || !t || !t.guided) return;
    var allOk = true;
    var currentShown = false;
    box.innerHTML = GUIDE.map(function (g, i) {
      var st = forceStatus(t.q, t.place, g.force);
      if (st !== "ok") allOk = false;
      var cls = st === "ok" ? "done" : (st === "wrong" ? "wrong" : (!currentShown ? "now" : ""));
      if (st !== "ok") currentShown = true;
      var txt = st === "wrong" ? g.wrong : g.todo;
      return '<div class="tut-step ' + cls + '"><span class="tut-num">' + (st === "ok" ? "✓" : i + 1) + '</span><span>' + txt + '</span></div>';
    }).join("") +
    '<div class="tut-step ' + (allOk ? "now" : "") + '"><span class="tut-num">3</span><span>' +
      (allOk ? '<b>ครบแล้ว!</b> กดปุ่ม <b>ส่งคำตอบ</b> ด้านล่างเพื่อโจมตี' : 'เมื่อวางครบ กด <b>ส่งคำตอบ</b>') +
    '</span></div>' +
    '<div class="tut-tip">💡 ลูกศรจาง ๆ บนกระดานคือคำใบ้ตำแหน่ง (ในเกมจริงจะไม่มี)</div>';
  }

  // ---------- Step 3: on your own (hint on request) ----------
  function stepSolo() {
    var q = practiceQuestion("s1_hang_1", "tut_rope", "โคมไฟแขวนนิ่งด้วยเชือกเส้นเดียวจากเพดาน มีแรงอะไรกระทำต่อโคมไฟบ้าง?");
    t = { q: q, place: {}, guided: false, tries: 0 };
    app().innerHTML = shell(3,
      '<div class="rpg-card tut-card">' +
        '<div class="tut-q">📜 ' + DH.esc(q.t) + '</div>' +
        '<div class="tut-coach"><div class="tut-step now"><span class="tut-num">!</span><span>ข้อนี้ลองเองเลย! คิดว่า<b>อะไรสัมผัสวัตถุ</b>อยู่บ้าง + อย่าลืมน้ำหนักของมันเอง</span></div></div>' +
        '<div id="tutBoard"></div>' +
        '<div id="tutFeedback"></div>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button type="button" class="btn-sec" id="tutHint" style="flex:0 0 auto">💡 ขอคำใบ้</button>' +
          '<button type="button" class="btn-pri" id="tutSubmit" style="flex:1">⚔️ ส่งคำตอบ</button>' +
        '</div>' +
      '</div>');
    bindSkip();
    var mountBoard = function (withHint) {
      global.FBD.mount(document.getElementById("tutBoard"), q, {
        biome: "slime",
        initialState: Object.keys(t.place).length ? t.place : undefined,
        overlayArrows: withHint ? q.ex.map(function (e) { return { force: e[0], angle: e[1] }; }) : [],
        onChange: function (st) { t.place = st; }
      });
    };
    mountBoard(false);
    document.getElementById("tutHint").onclick = function () { mountBoard(true); this.disabled = true; };
    document.getElementById("tutSubmit").onclick = function () { submitPractice(stepCards); };
  }

  function submitPractice(next) {
    var res = DH.Grading.gradeAnswer(t.q, t.place);
    var fb = document.getElementById("tutFeedback");
    var good = res.acc >= 0.999;
    t.tries = (t.tries || 0) + 1;
    var rows = '<ul class="fb-list">' + res.rows.map(function (row) {
      if (row.header) return "";
      var fn = (DH.FORCES[row.force] && DH.FORCES[row.force].n) || row.force;
      var ok = row.status === "ok";
      return '<li style="color:' + (ok ? "#4ade80" : "#f87171") + '">' + (ok ? "✓ " : "✗ ") + DH.esc(fn) + " — " + DH.esc(row.msg) + "</li>";
    }).join("") + "</ul>";
    if (good) {
      DH.SFX.hit();
      fb.innerHTML = '<div class="tut-result ok">⚔️ <b>ถูกต้องครบ!</b> ในเกมจริงนี่คือการโจมตีเต็มแรง' + rows +
        '<p class="tut-why">' + DH.esc(t.q.why).replace(/\n/g, "<br>") + '</p>' +
        '<button type="button" class="btn-pri" id="tutContinue" style="width:100%">ไปต่อ ▶</button></div>';
      document.getElementById("tutSubmit").disabled = true;
      document.getElementById("tutContinue").onclick = next;
    } else {
      DH.SFX.hurt();
      fb.innerHTML = '<div class="tut-result bad">💥 <b>ยังไม่ครบ (' + Math.round(res.acc * 100) + '%)</b> ดูจุดที่ผิดแล้วแก้บนกระดานได้เลย' + rows +
        (t.tries >= 2 ? '<button type="button" class="btn-sec" id="tutContinue" style="width:100%;margin-top:6px">ดูเฉลยแล้วไปต่อ ▶</button>' : '') + '</div>';
      var c = document.getElementById("tutContinue");
      if (c) c.onclick = function () {
        fb.innerHTML = '<div class="tut-result">📖 <b>เฉลย</b><p class="tut-why">' + DH.esc(t.q.why).replace(/\n/g, "<br>") + '</p>' +
          '<button type="button" class="btn-pri" id="tutContinue2" style="width:100%">ไปต่อ ▶</button></div>';
        document.getElementById("tutContinue2").onclick = next;
      };
    }
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- Step 4: cards, hearts, timer ----------
  function stepCards() {
    var c = DH.Game.getChar();
    var jb = DH.JOBS[c.job] || DH.JOBS.warrior;
    var card = DH.CARDS[jb.startCard];
    app().innerHTML = shell(4,
      '<div class="rpg-card tut-card">' +
        '<h2>🃏 การ์ด หัวใจ และเวลา</h2>' +
        '<div class="tut-row"><span class="tut-ico">⏱</span><div><b>จับเวลาทุกข้อ</b><br>ตอบถูกเร็ว = ดาเมจสูงขึ้น · หมดเวลาจะส่งเท่าที่วางไว้</div></div>' +
        '<div class="tut-row"><span class="tut-ico">🃏</span><div><b>การ์ดกลยุทธ์</b><br>แตะการ์ด<b>ก่อนกดส่งคำตอบ</b> · คุณมี <b>' + card.icon + ' ' + card.name + '</b> ติดตัว: ' + DH.esc(card.desc) + '</div></div>' +
        '<div class="tut-row"><span class="tut-ico">⚔️</span><div><b>ระวังดาบคู่ ×2</b><br>ถ้าตอบถูกครบ ดาเมจ ×2 แต่ถ้าผิด คะแนนจะ<b>ติดลบ</b>!</div></div>' +
        '<div class="tut-row"><span class="tut-ico">❤️</span><div><b>หัวใจ 3 ดวงต่อด่าน</b><br>ผิดเกินครึ่งเสีย 1 ดวง · ถ้าหมดจะ <b>😵 หมดแรง</b> ดาเมจเหลือครึ่งเดียวจนกว่าจะฟื้น (การ์ด 💚 หรือผ่านด่าน)</div></div>' +
        '<div class="tut-row"><span class="tut-ico">🐉</span><div><b>เป้าหมาย</b><br>ปราบมอน 4 ตัวแล้วโค่นมังกร · มอนที่หนีไปจะเพิ่มเลือดให้มังกร!</div></div>' +
        '<button type="button" class="btn-pri" id="tutDone" style="width:100%;margin-top:10px">✅ พร้อมแล้ว! กลับไปลานน้ำพุ</button>' +
      '</div>');
    bindSkip();
    document.getElementById("tutDone").onclick = function () { DH.SFX.join(); finish(); };
  }

  DH.Tutorial = {
    isDone: isDone,
    open: stepIntro
  };
})(window);
