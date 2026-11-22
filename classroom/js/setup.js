// Teacher room setup: pick a question pack, a play mode, game length and options, then create the room.
// Choices are remembered on this computer (localStorage "dh_host_setup") for next lesson.
(function () {
  var DH = window.DH;
  var KEY = "dh_host_setup";

  // Questions per stage (slime, goblin, fenrir, orc, dragon) for each game length.
  var LENGTHS = {
    short:  { name: "สั้น", perStage: [1, 1, 1, 2, 3] },
    medium: { name: "กลาง", perStage: DH.STAGES.map(function (s) { return s.count; }) },
    long:   { name: "ยาว", perStage: [3, 3, 3, 4, 5] }
  };
  var PACES = {
    normal:  { name: "ปกติ", note: "ตามที่โจทย์กำหนด", mult: 1 },
    slow:    { name: "ให้เวลาเพิ่ม", note: "×1.5 สำหรับห้องที่ช้า", mult: 1.5 },
    untimed: { name: "ไม่จับเวลา", note: "", mult: 1.3 }
  };
  var MODES = {
    sync: {
      name: "ทั้งห้องโจทย์เดียวกัน",
      desc: "โจทย์ขึ้นกลางจอครู ทุกคนตอบพร้อมกัน ครูกดไปข้อถัดไป",
      fit: "เหมาะกับสอนในคาบ เฉลยและอธิบายไปด้วยกัน"
    },
    self: {
      name: "ต่างคนต่างทำ",
      desc: "แต่ละคนได้โจทย์ของตัวเองตามจุดอ่อน ทำเสร็จไปข้อต่อเองไม่ต้องรอ",
      fit: "เหมาะกับฝึกท้ายคาบ ห้องที่เร็วช้าต่างกัน"
    }
  };
  var TOGGLES = [
    { id: "cards", name: "การ์ดกลยุทธ์ & ท่าไม้ตาย", note: "นักเรียนใช้การ์ดบนมือถือ มอนประกาศท่าก่อนทุกข้อ" },
    { id: "hideWrong", name: "ซ่อนชื่อคนที่ตอบผิด", note: "ฉากตีมอนบนจอครูไม่โชว์ชื่อคนที่ตอบผิด" },
    { id: "autoNext", name: "เฉลยแล้วไปต่อเองใน 10 วิ", note: "ปิดไว้ = ครูกดไปต่อเอง (มีเวลาอธิบายเฉลย)", syncOnly: true },
    { id: "sound", name: "เสียงบนจอครู", note: "เสียงเอฟเฟกต์ตอนตีมอนและนับเวลา" }
  ];

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  var st = {
    cls: saved.cls || "",
    pack: DH.PACKS.some(function (p) { return p.id === saved.pack; }) ? saved.pack : DH.PACKS[0].id,
    mode: MODES[saved.mode] ? saved.mode : "sync",
    length: LENGTHS[saved.length] ? saved.length : "medium",
    pace: PACES[saved.pace] ? saved.pace : "normal",
    opts: Object.assign({ cards: true, hideWrong: true, autoNext: false, sound: true }, saved.opts || {}),
    advOpen: false
  };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ cls: st.cls, pack: st.pack, mode: st.mode, length: st.length, pace: st.pace, opts: st.opts })); } catch (e) { /* ignore */ }
  }
  function pack() { return DH.PACKS.filter(function (p) { return p.id === st.pack; })[0]; }
  function total(len) { return LENGTHS[len].perStage.reduce(function (a, b) { return a + b; }, 0); }

  // Rough lesson length: answer time + answer key + battle per question, plus stage transitions and the ending.
  function minutes() {
    var p = pack(), n = total(st.length), pace = PACES[st.pace];
    var answer = p.avgTime * pace.mult * (st.mode === "sync" ? 0.85 : 0.7);
    var reveal = st.mode === "sync" ? (st.opts.autoNext ? 10 : 20) : 6;
    var perQ = answer + reveal + 7;
    var secs = 10 + n * perQ + 5 * 13 + 90;
    return Math.max(5, Math.round(secs / 60));
  }

  function esc(s) { return DH.esc(s); }

  function levelBar(p) {
    var t = Math.max(1, p.count);
    return '<div class="su-lv" title="ง่าย ' + p.levels["ง่าย"] + ' · กลาง ' + p.levels["กลาง"] + ' · ยาก ' + p.levels["ยาก"] + '">' +
      '<i class="e" style="width:' + (100 * p.levels["ง่าย"] / t) + '%"></i>' +
      '<i class="m" style="width:' + (100 * p.levels["กลาง"] / t) + '%"></i>' +
      '<i class="h" style="width:' + (100 * p.levels["ยาก"] / t) + '%"></i></div>' +
      '<div class="su-lv-key"><span class="e">ง่าย ' + p.levels["ง่าย"] + '</span><span class="m">กลาง ' + p.levels["กลาง"] + '</span><span class="h">ยาก ' + p.levels["ยาก"] + '</span></div>';
  }

  function packCard(p) {
    return '<div class="su-opt' + (p.id === st.pack ? " on" : "") + '" role="radio" tabindex="0" aria-checked="' + (p.id === st.pack) + '" data-pack="' + p.id + '">' +
      (p.recommended ? '<span class="su-rec">แนะนำ</span>' : '') +
      '<b class="su-name">' + esc(p.name) + '</b>' +
      '<span class="su-desc">' + esc(p.desc) + '</span>' +
      '<div class="su-meta"><span class="su-chip">📝 ' + p.count + ' ข้อ</span>' +
        p.topics.map(function (t) { return '<span class="su-chip">' + esc(DH.TOPIC_LABELS[t] || t) + '</span>'; }).join("") + '</div>' +
      levelBar(p) +
      '<button type="button" class="su-peek" data-peek="' + p.id + '">👁 ดูตัวอย่างโจทย์</button>' +
    '</div>';
  }

  // Little pictures of the two modes: one projector question for all phones vs. each phone on its own question.
  function modeArt(mode) {
    var phone = function (x, fill, mark) {
      return '<rect x="' + x + '" y="54" width="26" height="38" rx="5" fill="#1e293b" stroke="#64748b" stroke-width="2"/>' +
        '<rect x="' + (x + 4) + '" y="60" width="18" height="20" rx="2" fill="' + fill + '"/>' +
        '<text x="' + (x + 13) + '" y="75" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a">' + mark + '</text>';
    };
    if (mode === "sync") {
      return '<svg viewBox="0 0 240 96" aria-hidden="true">' +
        '<rect x="62" y="6" width="116" height="40" rx="4" fill="#0f172a" stroke="#fbbf24" stroke-width="2"/>' +
        '<rect x="96" y="12" width="48" height="28" rx="3" fill="#fde68a"/>' +
        '<text x="120" y="31" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a">ข้อ 3</text>' +
        '<path d="M120 46 L76 54 M120 46 L120 54 M120 46 L164 54" stroke="#fbbf24" stroke-dasharray="3 3" stroke-width="1.5" fill="none"/>' +
        phone(63, "#fde68a", "3") + phone(107, "#fde68a", "3") + phone(151, "#fde68a", "3") +
      '</svg>';
    }
    return '<svg viewBox="0 0 240 96" aria-hidden="true">' +
      '<rect x="62" y="6" width="116" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>' +
      '<rect x="72" y="16" width="96" height="7" rx="3" fill="#334155"/><rect x="72" y="16" width="70" height="7" rx="3" fill="#ef4444"/>' +
      '<rect x="72" y="29" width="30" height="6" rx="3" fill="#4ade80"/><rect x="72" y="37" width="52" height="4" rx="2" fill="#38bdf8"/>' +
      phone(63, "#86efac", "2") + phone(107, "#7dd3fc", "5") + phone(151, "#fca5a5", "4") +
      '<text x="208" y="78" font-size="16" fill="#94a3b8">⟳</text>' +
    '</svg>';
  }

  function modeCard(id) {
    var m = MODES[id];
    return '<div class="su-opt' + (id === st.mode ? " on" : "") + '" role="radio" tabindex="0" aria-checked="' + (id === st.mode) + '" data-mode="' + id + '">' +
      '<div class="su-illu">' + modeArt(id) + '</div>' +
      '<b class="su-name">' + (id === "sync" ? "👩‍🏫 " : "🏃 ") + m.name + '</b>' +
      '<span class="su-desc">' + m.desc + '</span>' +
      '<span class="su-fit">✦ ' + m.fit + '</span>' +
    '</div>';
  }

  function seg(field, defs, labelFn) {
    return '<div class="su-seg" role="radiogroup">' + Object.keys(defs).map(function (k) {
      return '<button type="button" role="radio" aria-checked="' + (st[field] === k) + '" class="' + (st[field] === k ? "on" : "") + '" data-' + field + '="' + k + '">' + labelFn(k, defs[k]) + '</button>';
    }).join("") + '</div>';
  }

  function render() {
    var p = pack(), n = total(st.length);
    var short = p.count < n;
    var paceNote = function (k, d) {
      var note = k === "untimed" ? (st.mode === "sync" ? "ครูกดหมดเวลาเอง" : "ทำจนเสร็จทีละข้อ") : d.note;
      return d.name + '<small>' + note + '</small>';
    };
    document.getElementById("setup").innerHTML =
      '<header class="su-top">' +
        '<a class="cl-link" href="index.html">← กลับ</a>' +
        '<div><h1>🏰 สร้างห้องเรียน</h1><div class="su-sub">ตั้งค่า 3 อย่าง แล้วรับรหัสห้องให้นักเรียน</div></div>' +
      '</header>' +
      '<div class="su-grid">' +
        '<div class="su-main">' +
          '<section class="rpg-card su-sec">' +
            '<div class="su-sec-head"><span class="su-num">1</span><h2>ชุดโจทย์</h2><span>เลือก 1 ชุด</span></div>' +
            '<div class="su-field"><label for="clsName">ชื่อห้อง / ชั้นเรียน <span style="color:var(--mute);font-weight:400">(ไม่บังคับ · ขึ้นบนจอและไฟล์ผลคะแนน)</span></label>' +
              '<input id="clsName" maxlength="30" placeholder="เช่น ม.4/2 คาบ 3" value="' + esc(st.cls) + '"></div>' +
            '<div class="su-opts packs" role="radiogroup" aria-label="ชุดโจทย์">' + DH.PACKS.map(packCard).join("") +
              '<div class="su-opt is-soon"><span class="su-plus">＋</span><b>ชุดที่ครูแต่งเอง</b><span class="su-desc">แต่งโจทย์ของตัวเองได้ในหน้า "แต่งชุดโจทย์" (เร็วๆ นี้)</span></div>' +
            '</div>' +
          '</section>' +
          '<section class="rpg-card su-sec">' +
            '<div class="su-sec-head"><span class="su-num">2</span><h2>โหมดการเล่น</h2></div>' +
            '<div class="su-opts modes" role="radiogroup" aria-label="โหมดการเล่น">' + modeCard("sync") + modeCard("self") + '</div>' +
          '</section>' +
          '<section class="rpg-card su-sec">' +
            '<div class="su-sec-head"><span class="su-num">3</span><h2>ความยาวเกม</h2><span>5 ด่าน จบที่บอสมังกร</span></div>' +
            '<div class="su-row"><label>จำนวนโจทย์</label>' + seg("length", LENGTHS, function (k, d) { return d.name + '<small>' + total(k) + ' ข้อ</small>'; }) + '</div>' +
            (short ? '<div class="su-warn">⚠️ ชุดนี้มี ' + p.count + ' ข้อ น้อยกว่า ' + n + ' ข้อ บางข้อจะวนมาซ้ำ</div>' : '') +
            '<div class="su-row"><label>เวลาต่อข้อ</label>' + seg("pace", PACES, paceNote) + '</div>' +
            '<details class="su-adv"' + (st.advOpen ? " open" : "") + '>' +
              '<summary>⚙️ ตั้งค่าเพิ่มเติม <span style="color:var(--mute);font-weight:400;font-size:0.82rem">ค่าเริ่มต้นใช้ได้เลย</span><span class="su-caret">▾</span></summary>' +
              '<div class="su-toggles">' + TOGGLES.map(function (t) {
                var off = t.syncOnly && st.mode !== "sync";
                return '<label class="su-tog' + (off ? " is-off" : "") + '"><span class="su-tog-txt"><b>' + t.name + '</b><span>' + (off ? "ใช้เฉพาะโหมดทั้งห้องโจทย์เดียวกัน" : t.note) + '</span></span>' +
                  '<input type="checkbox" data-opt="' + t.id + '"' + (st.opts[t.id] ? " checked" : "") + (off ? " disabled" : "") + '><span class="su-switch"></span></label>';
              }).join("") + '</div>' +
            '</details>' +
          '</section>' +
        '</div>' +
        '<aside class="su-side">' +
          '<div class="rpg-card su-sum">' +
            '<h3>สรุปห้องนี้</h3>' +
            '<dl>' +
              '<dt>ห้อง</dt><dd>' + (st.cls ? esc(st.cls) : '<span style="color:var(--mute);font-weight:400">ไม่ได้ตั้งชื่อ</span>') + '</dd>' +
              '<dt>ชุดโจทย์</dt><dd>' + esc(p.name) + '</dd>' +
              '<dt>โหมด</dt><dd>' + MODES[st.mode].name + '</dd>' +
              '<dt>โจทย์</dt><dd>' + n + ' ข้อ · ' + LENGTHS[st.length].name + '</dd>' +
              '<dt>เวลาต่อข้อ</dt><dd>' + PACES[st.pace].name + '</dd>' +
              '<dt>การ์ดกลยุทธ์</dt><dd>' + (st.opts.cards ? "เปิด" : "ปิด") + '</dd>' +
            '</dl>' +
            '<div class="su-sum-row">' +
              '<div class="su-time"><b>≈ ' + minutes() + ' นาที</b><span>เวลาเล่นโดยประมาณ</span></div>' +
              '<button type="button" class="btn-pri" id="btnCreate">สร้างห้อง &amp; รับรหัส ▶</button>' +
            '</div>' +
            '<div class="su-note">ยังแก้การตั้งค่าได้ในหน้ารอนักเรียน</div>' +
          '</div>' +
        '</aside>' +
      '</div>';
  }

  function set(field, val) { st[field] = val; save(); render(); }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-peek],[data-pack],[data-mode],[data-length],[data-pace],#btnCreate,[data-close],#peekPrev,#peekNext");
    if (!el) return;
    if (el.dataset.peek) { e.stopPropagation(); openPeek(el.dataset.peek); return; }
    if (el.dataset.pack) return set("pack", el.dataset.pack);
    if (el.dataset.mode) return set("mode", el.dataset.mode);
    if (el.dataset.length) return set("length", el.dataset.length);
    if (el.dataset.pace) return set("pace", el.dataset.pace);
    if (el.id === "btnCreate") { save(); return DH.Lobby.open({ cls: st.cls, pack: st.pack, mode: st.mode, length: st.length, pace: st.pace, opts: st.opts }); }
    if (el.hasAttribute("data-close")) return closePeek();
    if (el.id === "peekPrev") return showPeek(-1);
    if (el.id === "peekNext") return showPeek(1);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePeek();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".su-opt[role=radio]")) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.dataset.opt) { st.opts[e.target.dataset.opt] = e.target.checked; save(); render(); }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "clsName") {
      st.cls = e.target.value;
      save();
      var dd = document.querySelector(".su-sum dd");
      if (dd) dd.innerHTML = st.cls ? esc(st.cls) : '<span style="color:var(--mute);font-weight:400">ไม่ได้ตั้งชื่อ</span>';
    }
  });
  document.addEventListener("toggle", function (e) {
    if (e.target.classList && e.target.classList.contains("su-adv")) st.advOpen = e.target.open;
  }, true);

  // ---------- sample question viewer ----------
  var peekPack = null, peekIdx = 0;
  function openPeek(id) {
    peekPack = DH.PACKS.filter(function (p) { return p.id === id; })[0];
    peekIdx = 0;
    document.getElementById("peek").hidden = false;
    showPeek(0);
  }
  function showPeek(step) {
    var qs = peekPack.questions;
    peekIdx = (peekIdx + step + qs.length) % qs.length;
    var q = qs[peekIdx];
    document.getElementById("peekTitle").textContent = "ตัวอย่างโจทย์ · " + peekPack.name;
    document.getElementById("peekMeta").innerHTML = ['<span class="su-chip">' + esc(q.lv) + '</span>', '<span class="su-chip">' + esc(q.tg) + '</span>', '<span class="su-chip">⏱ ' + q.tm + ' วิ</span>'].join("");
    document.getElementById("peekQ").textContent = q.t;
    document.getElementById("peekPos").textContent = (peekIdx + 1) + " / " + qs.length;
    window.FBD.mount(document.getElementById("peekBoard"), q, { readOnly: true, biome: DH.STAGES[(q.stage || 1) - 1] && DH.STAGES[(q.stage || 1) - 1].monsterId });
  }
  function closePeek() { document.getElementById("peek").hidden = true; }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 2800);
  }

  render();
})();
