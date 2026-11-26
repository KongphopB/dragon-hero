// Question form for the pack editor: the teacher picks a scene, writes the question, chooses which
// force buttons students get, and places the answer arrows on the same FBD board students use.
// "ลองทำเป็นนักเรียน" grades a try with the game's own grading.
//   DH.QForm.open(question or null, done(questionOrNull))
(function () {
  var DH = window.DH, S = DH.PackStore;
  var q = null, done = null, mode = "key", tryState = null;

  var SCENES = [["flat", "🟫 พื้นราบ"], ["inc", "⛰️ พื้นเอียง"], ["r", "🪢 แขวนด้วยเชือก"]];
  var LEVELS = ["ง่าย", "กลาง", "ยาก"];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return DH.esc(s); }

  function blank() {
    return { k: "flat", stage: 1, lv: "ง่าย", topic: "flat", tg: "", t: "", why: "", tm: 25, tol: 12,
      bt: ["W", "N", "F", "f"], ex: [], rp: [], fa: [], ia: 30, dot: 0, two: 0 };
  }

  // The question exactly as the game will see it (what the board and the grading get).
  function asGame() {
    var o = {
      id: "preview", stage: q.stage, type: q.k === "inc" ? "B" : "A", lv: q.lv, topic: q.topic, tg: q.tg || "โจทย์ของครู", st: "สมดุล",
      k: q.k, rp: (q.rp || []).slice(), bt: q.bt.slice(), t: q.t, ex: q.ex.map(function (e) { return e.slice(); }), why: q.why, tm: q.tm, tol: q.tol || 12
    };
    if (q.k === "inc") { o.ia = q.ia; if (q.dot) o.dot = 1; }
    if (q.k === "r" && q.two) o.two = 1;
    if (q.fa && q.fa.length) o.fa = q.fa.slice();
    return o;
  }

  function placeFromEx(ex) {
    var all = {};
    ex.forEach(function (e) { all[e[0]] = all[e[0]] === undefined ? e[1] : [].concat(all[e[0]], e[1]); });
    return { all: all, A: {}, B: {} };
  }
  function exFromPlace(st) {
    var out = [], all = (st && st.all) || {};
    Object.keys(all).forEach(function (k) { [].concat(all[k]).forEach(function (a) { out.push([k, Math.round(a)]); }); });
    return out;
  }

  // ---------------------------------------------------------------- form
  function seg(name, items, val) {
    return '<div class="su-seg">' + items.map(function (it) {
      return '<button type="button" class="' + (String(val) === String(it[0]) ? "on" : "") + '" data-set="' + name + '" data-val="' + it[0] + '">' + it[1] + '</button>';
    }).join("") + '</div>';
  }
  function num(id, val, min, max, suffix) {
    return '<span class="qf-num"><input type="number" id="' + id + '" value="' + val + '" min="' + min + '" max="' + max + '">' + (suffix || "") + '</span>';
  }

  function sceneHtml() {
    var h = seg("k", SCENES, q.k);
    if (q.k === "inc") {
      h += '<div class="qf-row"><label>มุมพื้นเอียง θ</label>' + num("qfIa", q.ia, 5, 80, "°") + '</div>' +
        '<div class="qf-row"><label>วัตถุ</label>' + seg("dot", [[0, "📦 กล่อง"], [1, "⚪ ทรงกลม"]], q.dot ? 1 : 0) + '</div>';
    }
    if (q.k === "r" || q.k === "inc") {
      var ropes = q.k === "r" ? (q.two ? 2 : 1) : (q.rp.length ? 1 : 0);
      h += '<div class="qf-row"><label>เชือก</label>' + (q.k === "r" ? seg("two", [[0, "1 เส้น"], [1, "2 เส้น"]], q.two ? 1 : 0) : seg("rope", [[0, "ไม่มี"], [1, "มีเชือกผูก"]], ropes)) + '</div>';
      for (var i = 0; i < ropes; i++) h += '<div class="qf-row"><label>ทิศเชือก ' + (ropes > 1 ? (i + 1) : "") + '</label>' + num("qfRp" + i, q.rp[i] != null ? q.rp[i] : (i ? 30 : 150), 0, 359, "° <small>(0°=ขวา 90°=ขึ้น)</small>") + '</div>';
    }
    h += '<div class="qf-row"><label>แรงที่โจทย์ให้มา</label>' + seg("fa", [["", "ไม่มี"], ["on", "มีลูกศร F ในฉาก"]], q.fa && q.fa.length ? "on" : "") + '</div>';
    if (q.fa && q.fa.length) h += '<div class="qf-row"><label>ทิศของ F</label>' + num("qfFa", q.fa[0], 0, 359, "°") + '</div>';
    return h;
  }

  function formHtml() {
    var stageOpts = DH.STAGES.map(function (st, i) { return '<option value="' + (i + 1) + '"' + (q.stage === i + 1 ? " selected" : "") + '>ด่าน ' + (i + 1) + ' · ' + esc(st.name.split(" (")[0]) + '</option>'; }).join("");
    var topicOpts = Object.keys(DH.TOPIC_LABELS).filter(function (t) { return t !== "multi" && t !== "decompose"; })
      .map(function (t) { return '<option value="' + t + '"' + (q.topic === t ? " selected" : "") + '>' + esc(DH.TOPIC_LABELS[t]) + '</option>'; }).join("");
    return '<header class="su-top">' +
        '<button type="button" class="cl-link" id="qfCancel">← กลับไปที่ชุด</button>' +
        '<div><h1>✏️ ' + (q.__new ? "แต่งโจทย์ใหม่" : "แก้โจทย์") + '</h1><div class="su-sub">โจทย์วัตถุเดียว: พื้นราบ พื้นเอียง หรือแขวนด้วยเชือก</div></div>' +
      '</header>' +
      '<div class="qf-grid">' +
        '<div class="qf-form">' +
          '<section class="rpg-card su-sec"><div class="su-sec-head"><span class="su-num">1</span><h2>ฉาก</h2></div>' + sceneHtml() + '</section>' +
          '<section class="rpg-card su-sec"><div class="su-sec-head"><span class="su-num">2</span><h2>โจทย์</h2></div>' +
            '<textarea id="qfT" rows="3" maxlength="400" placeholder="เช่น กล่องมวล 5 kg วางนิ่งบนพื้นเอียง 30° ที่ฝืด">' + esc(q.t) + '</textarea>' +
            '<div class="qf-label">ปุ่มแรงที่ให้นักเรียนเลือก <small>(ใส่ตัวหลอกได้)</small></div>' +
            '<div class="qf-forces">' + S.FORCES.map(function (f) {
              return '<label class="qf-force"><input type="checkbox" data-force="' + f + '"' + (q.bt.indexOf(f) >= 0 ? " checked" : "") + '><span style="--fc:' + DH.FORCES[f].c + '">' + esc(DH.FORCES[f].n) + '</span></label>';
            }).join("") + '</div>' +
          '</section>' +
          '<section class="rpg-card su-sec"><div class="su-sec-head"><span class="su-num">3</span><h2>ใช้ตอนไหน</h2></div>' +
            '<div class="qf-two"><label>ด่าน (มอนสเตอร์)<select id="qfStage">' + stageOpts + '</select></label>' +
            '<label>เรื่อง<select id="qfTopic">' + topicOpts + '</select></label></div>' +
            '<div class="qf-row"><label>ระดับ</label>' + seg("lv", LEVELS.map(function (l) { return [l, l]; }), q.lv) + '</div>' +
            '<div class="qf-two"><label>หัวข้อสั้นๆ<input id="qfTg" maxlength="40" value="' + esc(q.tg) + '" placeholder="เช่น พื้นเอียงฝืด"></label>' +
            '<label>เวลาทำ (วินาที)<input type="number" id="qfTm" min="8" max="120" value="' + q.tm + '"></label></div>' +
          '</section>' +
          '<section class="rpg-card su-sec"><div class="su-sec-head"><span class="su-num">4</span><h2>คำอธิบายเฉลย</h2></div>' +
            '<textarea id="qfWhy" rows="3" maxlength="800" placeholder="อธิบายว่าทำไมแต่ละแรงชี้ทิศนั้น (นักเรียนเห็นหลังตอบ)">' + esc(q.why) + '</textarea>' +
          '</section>' +
        '</div>' +
        '<div class="qf-side">' +
          '<div class="rpg-card qf-board-card">' +
            seg("mode", [["key", "🎯 วางลูกศรเฉลย"], ["try", "🧑‍🎓 ลองทำเป็นนักเรียน"]], mode) +
            '<div class="qf-board-hint" id="qfHint"></div>' +
            '<div id="qfBoard"></div>' +
            '<div id="qfUnder"></div>' +
          '</div>' +
          '<div class="rpg-card qf-save"><div id="qfProblems"></div>' +
            '<button type="button" class="btn-pri" id="qfSave" style="width:100%">💾 บันทึกโจทย์</button></div>' +
        '</div>' +
      '</div>';
  }

  function keyList() {
    if (!q.ex.length) return '<p class="qf-empty">ลากปุ่มแรงขึ้นไปวางรอบวัตถุเพื่อทำเฉลย</p>';
    return '<div class="qf-keys">' + q.ex.map(function (e, i) {
      return '<span class="qf-key" style="--fc:' + (DH.FORCES[e[0]] || {}).c + '"><b>' + esc((DH.FORCES[e[0]] || {}).short || e[0]) + '</b>' +
        '<input type="number" min="0" max="359" value="' + e[1] + '" data-angle="' + i + '" title="ปรับมุมละเอียด">°</span>';
    }).join("") + '</div><div class="qf-tol">นับว่าถูกถ้ามุมคลาดไม่เกิน ±' + (q.tol || 12) + '°</div>';
  }

  function drawBoard() {
    var g = asGame();
    $("qfHint").textContent = mode === "key"
      ? "วางลูกศรของแรงที่ถูกต้องทุกแรง นี่คือเฉลยของข้อนี้"
      : "ลองตอบเหมือนนักเรียน แล้วกดตรวจ เพื่อดูว่าเกมตรวจตามที่คิดไว้ไหม";
    if (mode === "key") {
      window.FBD.mount($("qfBoard"), g, { initialState: placeFromEx(q.ex), onChange: function (st) { q.ex = exFromPlace(st); $("qfUnder").innerHTML = keyList(); checks(); } });
      $("qfUnder").innerHTML = keyList();
    } else {
      tryState = null;
      var ctrl = window.FBD.mount($("qfBoard"), g, { onChange: function (st) { tryState = st; } });
      $("qfUnder").innerHTML = '<button type="button" class="btn-sec" id="qfCheck" style="width:100%;margin-top:8px">✔️ ตรวจคำตอบนี้</button><div id="qfResult"></div>';
      $("qfCheck").onclick = function () {
        var r = DH.Grading.gradeAnswer(g, tryState || ctrl.getState());
        var pct = Math.round(r.acc * 100);
        $("qfResult").innerHTML = '<div class="qf-res ' + (pct >= 100 ? "ok" : (pct >= 50 ? "part" : "bad")) + '"><b>ได้ ' + pct + '%</b>' +
          '<ul class="fb-list">' + r.rows.map(function (row) {
            if (row.header) return '<li>' + esc(row.header) + '</li>';
            var ok = row.status === "ok";
            return '<li style="color:' + (ok ? "#4ade80" : "#f87171") + '">' + (ok ? "✓" : "✗") + ' ' + esc((DH.FORCES[row.force] || {}).n || row.force) + ' — ' + esc(row.msg) + '</li>';
          }).join("") + '</ul></div>';
      };
    }
  }

  function checks() {
    var list = S.problems(asGame());
    $("qfProblems").innerHTML = list.length ? '<ul class="qf-problems">' + list.map(function (p) { return '<li>⚠️ ' + esc(p) + '</li>'; }).join("") + '</ul>' : '<div class="qf-ok">✅ พร้อมบันทึก</div>';
    $("qfSave").disabled = list.length > 0;
  }

  function draw() {
    document.getElementById("editor").innerHTML = formHtml();
    drawBoard();
    checks();
  }

  // ---------------------------------------------------------------- events (only while the form is open)
  function onClick(e) {
    if (!q) return;
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.set) {
      var name = b.dataset.set, val = b.dataset.val;
      if (name === "mode") { mode = val; return draw(); }
      if (name === "k") {
        q.k = val;
        q.rp = val === "r" ? [90] : [];
        q.two = 0;
        if (val === "inc" && q.topic === "flat") q.topic = "incline";
        if (val === "r" && q.topic === "flat") q.topic = "rope";
        if (val === "flat") q.topic = "flat";
        if (val === "r" && q.bt.indexOf("T") < 0) q.bt.push("T");
      }
      if (name === "dot") q.dot = Number(val);
      if (name === "two") {
        q.two = Number(val);
        q.rp = q.two ? [150, 30] : [90];
        if (q.two && q.bt.indexOf("U") < 0) q.bt.push("U");
      }
      if (name === "rope") { q.rp = Number(val) ? [30] : []; if (Number(val) && q.bt.indexOf("T") < 0) q.bt.push("T"); }
      if (name === "fa") q.fa = val ? [0] : [];
      if (name === "lv") q.lv = val;
      return draw();
    }
    if (b.id === "qfCancel") {
      if (!q.__dirty || confirm("ออกโดยไม่บันทึก?")) { var d = done; close(); d(null); }
      return;
    }
    if (b.id === "qfSave") {
      var g = asGame();
      delete g.id;
      var d2 = done; close(); d2(g);
    }
  }

  function onInput(e) {
    if (!q) return;
    var t = e.target, id = t.id, v = t.value;
    q.__dirty = true;
    if (id === "qfT") q.t = v;
    else if (id === "qfWhy") q.why = v;
    else if (id === "qfTg") q.tg = v;
    else if (id === "qfTm") q.tm = Math.max(8, Math.min(120, Number(v) || 25));
    else if (id === "qfStage") q.stage = Number(v);
    else if (id === "qfTopic") q.topic = v;
    else if (id === "qfIa" || id === "qfFa" || /^qfRp\d$/.test(id)) {
      // scene numbers redraw the board once the teacher stops typing
      var n = ((Math.round(Number(v)) % 360) + 360) % 360;
      if (id === "qfIa") q.ia = Math.max(5, Math.min(80, Math.round(Number(v)) || 30));
      else if (id === "qfFa") q.fa = [n];
      else q.rp[Number(id.slice(4))] = n;
      clearTimeout(onInput.timer);
      onInput.timer = setTimeout(drawBoard, 400);
      return;
    } else if (t.dataset.force) {
      var f = t.dataset.force;
      if (t.checked && q.bt.indexOf(f) < 0) q.bt.push(f);
      if (!t.checked) q.bt = q.bt.filter(function (x) { return x !== f; });
      drawBoard();
    } else if (t.dataset.angle) {
      q.ex[Number(t.dataset.angle)][1] = ((Math.round(Number(v)) % 360) + 360) % 360;
      clearTimeout(onInput.timer);
      onInput.timer = setTimeout(drawBoard, 400);
    }
    checks();
  }

  function close() {
    document.removeEventListener("click", onClick);
    document.removeEventListener("input", onInput);
    document.removeEventListener("change", onInput);
    q = null; done = null;
  }

  DH.QForm = {
    open: function (question, cb) {
      q = Object.assign(blank(), question ? JSON.parse(JSON.stringify(question)) : { __new: true });
      q.bt = (q.bt || []).filter(function (f) { return S.FORCES.indexOf(f) >= 0; });
      q.rp = q.rp || [];
      q.fa = q.fa || [];
      done = cb;
      mode = "key";
      document.addEventListener("click", onClick);
      document.addEventListener("input", onInput);
      document.addEventListener("change", onInput);
      draw();
    }
  };
})();
