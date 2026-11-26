// Pack editor (classroom/editor.html): the teacher's packs on the left, the chosen pack's questions
// on the right. Questions come from the built-in bank (picked in a dialog) or are written in the
// question form (qform.js). Everything is saved in this browser; packs move between computers as files.
(function () {
  var DH = window.DH, S = DH.PackStore;
  var cur = null;          // the pack being edited
  var editing = null;      // index of the item open in the question form, -1 for a new question
  var bankFilter = { stage: 0, topic: "" };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return DH.esc(s); }
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 2800);
  }

  function monsterName(stage) { var st = DH.STAGES[(stage || 1) - 1]; return st ? st.name.split(" (")[0] : "ด่าน " + stage; }

  // How many questions each stage (monster) has: the game picks each stage's questions from these.
  function coverage(qs) {
    return DH.STAGES.map(function (st, i) {
      var n = qs.filter(function (q) { return q.stage === i + 1; }).length;
      return '<span class="ed-cov' + (n ? "" : " is-empty") + '" title="' + esc(st.name) + '">ด่าน ' + (i + 1) + ' · ' + n + '</span>';
    }).join("");
  }

  // ---------------------------------------------------------------- page
  function render() {
    if (editing !== null) return DH.QForm.open(editing < 0 ? null : cur.items[editing].q, onFormDone);
    var packs = S.list();
    if (cur && !S.get(cur.id)) cur = null;
    var qs = cur ? S.resolve(cur) : [];
    $("editor").innerHTML =
      '<header class="su-top">' +
        '<a class="cl-link" href="host.html">← สร้างห้อง</a>' +
        '<div><h1>📜 แต่งชุดโจทย์</h1><div class="su-sub">ชุดโจทย์เก็บไว้ในเบราว์เซอร์เครื่องนี้ · ย้ายไปเครื่องอื่นด้วยการส่งออกเป็นไฟล์</div></div>' +
      '</header>' +
      '<div class="ed-grid">' +
        '<aside class="rpg-card ed-packs">' +
          '<div class="ed-h">ชุดของฉัน</div>' +
          (packs.length ? packs.map(function (p) {
            return '<button type="button" class="ed-pack' + (cur && cur.id === p.id ? " on" : "") + '" data-pack="' + esc(p.id) + '">' +
              '<b>' + esc(p.name) + '</b><span>' + p.items.length + ' ข้อ</span></button>';
          }).join("") : '<p class="ed-empty">ยังไม่มีชุดโจทย์ เริ่มสร้างชุดแรกได้เลย</p>') +
          '<button type="button" class="btn-pri" id="edNew" style="width:100%;margin-top:8px">＋ ชุดใหม่</button>' +
          '<button type="button" class="btn-sec" id="edImport" style="width:100%;margin-top:6px">📥 นำเข้าไฟล์ชุดโจทย์</button>' +
        '</aside>' +
        '<section class="ed-main">' + (cur ? packHtml(qs) : '<div class="rpg-card ed-hint"><b>เลือกชุดทางซ้าย หรือกด "＋ ชุดใหม่"</b><span>ในหนึ่งชุดใส่ได้ทั้งโจทย์จากคลังของเกม และโจทย์ที่ครูแต่งเอง</span></div>') + '</section>' +
      '</div>';
  }

  function packHtml(qs) {
    return '<div class="rpg-card ed-pack-head">' +
        '<div class="su-field"><label for="edName">ชื่อชุด</label><input id="edName" maxlength="60" value="' + esc(cur.name) + '"></div>' +
        '<div class="su-field"><label for="edDesc">คำอธิบายสั้นๆ (ไม่บังคับ)</label><input id="edDesc" maxlength="200" value="' + esc(cur.desc || "") + '" placeholder="เช่น ทบทวนพื้นเอียงก่อนสอบ"></div>' +
        '<div class="ed-covs">' + coverage(qs) + '</div>' +
        (DH.STAGES.some(function (st, i) { return !qs.some(function (q) { return q.stage === i + 1; }); }) && qs.length
          ? '<div class="ed-warn">⚠️ บางด่านยังไม่มีโจทย์ เกมจะหยิบโจทย์จากด่านที่ใกล้ที่สุดในชุดนี้มาใช้แทน</div>' : '') +
        '<div class="ed-actions">' +
          '<button type="button" class="btn-pri" id="edAddNew">✏️ แต่งข้อใหม่</button>' +
          '<button type="button" class="btn-sec" id="edAddBank">📚 เพิ่มจากคลังโจทย์</button>' +
          '<span class="ed-spacer"></span>' +
          '<button type="button" class="btn-sec" id="edExport"' + (qs.length ? "" : " disabled") + '>📤 ส่งออกไฟล์</button>' +
          '<button type="button" class="btn-sec lb-danger" id="edDelete">🗑 ลบชุด</button>' +
        '</div>' +
      '</div>' +
      '<div class="rpg-card ed-list">' +
        '<div class="ed-h">โจทย์ในชุดนี้ <span>' + cur.items.length + ' ข้อ</span></div>' +
        (cur.items.length ? cur.items.map(itemHtml).join("") : '<p class="ed-empty">ยังไม่มีโจทย์ กด "✏️ แต่งข้อใหม่" หรือ "📚 เพิ่มจากคลังโจทย์"</p>') +
      '</div>';
  }

  function itemHtml(it, i) {
    var q = it.ref ? S.bankById(it.ref) : it.q;
    if (!q) return "";
    var mine = !it.ref;
    return '<div class="ed-item">' +
      '<span class="ed-stage" title="' + esc(monsterName(q.stage)) + '">ด่าน ' + q.stage + '</span>' +
      '<div class="ed-item-body"><div class="ed-item-top"><span class="su-chip">' + esc(q.lv) + '</span><span class="su-chip">' + esc(q.tg) + '</span>' +
        '<span class="ed-src ' + (mine ? "is-mine" : "") + '">' + (mine ? "✏️ แต่งเอง" : "📚 จากคลัง") + '</span></div>' +
        '<div class="ed-item-text">' + esc(q.t) + '</div></div>' +
      '<div class="ed-item-btns">' +
        (mine ? '<button type="button" class="btn-sec" data-edit="' + i + '">✏️ แก้</button>'
              : (S.canEdit(q) ? '<button type="button" class="btn-sec" data-copy="' + i + '" title="ทำสำเนาเป็นโจทย์ของเราแล้วแก้ได้">⧉ แก้เป็นของเรา</button>' : '')) +
        '<button type="button" class="btn-sec" data-del="' + i + '" title="เอาออกจากชุด">✕</button>' +
      '</div></div>';
  }

  // ---------------------------------------------------------------- built-in bank dialog
  function bankHtml() {
    var have = {};
    cur.items.forEach(function (it) { if (it.ref) have[it.ref] = 1; });
    var qs = DH.QUESTIONS.filter(function (q) {
      return (!bankFilter.stage || q.stage === bankFilter.stage) && (!bankFilter.topic || q.topic === bankFilter.topic);
    });
    return '<div class="rpg-card ed-bank">' +
      '<div class="su-modal-head"><b>📚 คลังโจทย์ของเกม (' + DH.QUESTIONS.length + ' ข้อ)</b><button type="button" class="btn-sec" data-closebank style="padding:6px 12px">✕ ปิด</button></div>' +
      '<div class="ed-filters">' +
        '<select id="bkStage"><option value="0">ทุกด่าน</option>' + DH.STAGES.map(function (st, i) { return '<option value="' + (i + 1) + '"' + (bankFilter.stage === i + 1 ? " selected" : "") + '>ด่าน ' + (i + 1) + ' · ' + esc(st.name.split(" (")[0]) + '</option>'; }).join("") + '</select>' +
        '<select id="bkTopic"><option value="">ทุกเรื่อง</option>' + Object.keys(DH.TOPIC_LABELS).map(function (t) { return '<option value="' + t + '"' + (bankFilter.topic === t ? " selected" : "") + '>' + esc(DH.TOPIC_LABELS[t]) + '</option>'; }).join("") + '</select>' +
        '<button type="button" class="btn-sec" id="bkAll">✓ เลือกทั้งหมดที่เห็น</button>' +
      '</div>' +
      '<div class="ed-bank-list">' + qs.map(function (q) {
        return '<label class="ed-bank-row' + (have[q.id] ? " on" : "") + '"><input type="checkbox" data-bank="' + q.id + '"' + (have[q.id] ? " checked" : "") + '>' +
          '<span class="ed-stage">ด่าน ' + q.stage + '</span><span class="su-chip">' + esc(q.lv) + '</span>' +
          '<span class="ed-bank-text"><b>' + esc(q.tg) + '</b> · ' + esc(q.t) + '</span></label>';
      }).join("") + '</div>' +
      '<div class="ed-bank-foot">อยู่ในชุดแล้ว ' + Object.keys(have).length + ' ข้อจากคลัง · ติ๊กเพื่อเพิ่ม เอาติ๊กออกเพื่อนำออก</div>' +
    '</div>';
  }
  function openBank() { $("bank").innerHTML = bankHtml(); $("bank").hidden = false; }
  function setBank(id, on) {
    var i = cur.items.findIndex(function (it) { return it.ref === id; });
    if (on && i < 0) cur.items.push({ ref: id });
    if (!on && i >= 0) cur.items.splice(i, 1);
  }

  // ---------------------------------------------------------------- saving
  function persist(msg) {
    if (!S.save(cur)) return toast("บันทึกไม่สำเร็จ (พื้นที่ในเบราว์เซอร์เต็ม?)");
    if (msg) toast(msg);
  }

  function onFormDone(q) {
    if (q) {
      if (editing < 0) cur.items.push({ q: q });
      else cur.items[editing] = { q: q };
      persist("บันทึกโจทย์แล้ว");
    }
    editing = null;
    render();
  }

  // ---------------------------------------------------------------- events
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-closebank]");
    if (!t) return;
    var d = t.dataset;
    if (d.pack) { cur = S.get(d.pack); location.hash = cur.id; return render(); }
    if (t.id === "edNew") {
      cur = { id: S.newId(), name: "ชุดโจทย์ใหม่ " + new Date().toLocaleDateString("th-TH"), desc: "", items: [] };
      persist(); location.hash = cur.id; render();
      var n = $("edName"); if (n) { n.focus(); n.select(); }
      return;
    }
    if (t.id === "edImport") return $("importFile").click();
    if (!cur) return;
    if (t.id === "edAddNew") { editing = -1; return render(); }
    if (t.id === "edAddBank") return openBank();
    if (t.id === "edExport") return S.exportFile(cur);
    if (t.id === "edDelete") {
      if (confirm('ลบชุด "' + cur.name + '"? ลบแล้วกู้คืนไม่ได้ (ถ้าเคยส่งออกไฟล์ไว้ นำเข้าใหม่ได้)')) { S.remove(cur.id); cur = null; location.hash = ""; render(); toast("ลบชุดแล้ว"); }
      return;
    }
    if (d.edit) { editing = Number(d.edit); return render(); }
    if (d.copy) {
      var src = S.bankById(cur.items[Number(d.copy)].ref);
      var copy = JSON.parse(JSON.stringify(src));
      delete copy.id;
      cur.items[Number(d.copy)] = { q: copy };
      persist();
      editing = Number(d.copy);
      return render();
    }
    if (d.del) { cur.items.splice(Number(d.del), 1); persist("เอาออกจากชุดแล้ว"); return render(); }
    if (t.hasAttribute("data-closebank")) { $("bank").hidden = true; persist(); return render(); }
    if (t.id === "bkAll") {
      document.querySelectorAll("[data-bank]").forEach(function (c) { setBank(c.dataset.bank, true); });
      persist(); openBank();
    }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.bank) { setBank(t.dataset.bank, t.checked); t.closest(".ed-bank-row").classList.toggle("on", t.checked); persist(); return; }
    if (t.id === "bkStage") { bankFilter.stage = Number(t.value); return openBank(); }
    if (t.id === "bkTopic") { bankFilter.topic = t.value; return openBank(); }
    if (t.id === "importFile" && t.files[0]) {
      S.importFile(t.files[0]).then(function (r) {
        cur = r.pack; location.hash = cur.id; render();
        toast("นำเข้าแล้ว " + r.pack.items.length + " ข้อ" + (r.skipped ? " (ข้าม " + r.skipped + " ข้อที่ใช้ไม่ได้)" : ""));
      }, function (err) { toast(err.message); });
      t.value = "";
    }
  });
  document.addEventListener("input", function (e) {
    if (!cur) return;
    if (e.target.id === "edName") { cur.name = e.target.value.slice(0, 60) || "ชุดโจทย์"; persist(); }
    if (e.target.id === "edDesc") { cur.desc = e.target.value.slice(0, 200); persist(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("bank").hidden) { $("bank").hidden = true; render(); } });

  // editor.html#my:xxxx opens that pack (the "edit" link in room setup)
  var want = decodeURIComponent(location.hash.slice(1));
  if (want === "new") { cur = { id: S.newId(), name: "ชุดโจทย์ใหม่ " + new Date().toLocaleDateString("th-TH"), desc: "", items: [] }; S.save(cur); location.hash = cur.id; }
  else if (want) cur = S.get(want);
  render();
})();
