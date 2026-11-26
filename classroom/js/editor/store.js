// Teacher-made question packs, kept in this browser (localStorage "dh_packs") and moved between
// computers as .json files. A pack: { id: "my:...", name, desc, updatedAt, items: [ {ref: bankId} | {q: question} ] }
// Used by the editor (editor.html) and by room setup (host.html) to list and send packs.
(function () {
  var DH = window.DH = window.DH || {};
  var KEY = "dh_packs";
  var SCENES = ["flat", "inc", "r"];
  var FORCES = ["W", "N", "T", "U", "f", "F"];

  function load() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function store(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function newId() { return "my:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function bankById(id) {
    for (var i = 0; i < DH.QUESTIONS.length; i++) if (DH.QUESTIONS[i].id === id) return DH.QUESTIONS[i];
    return null;
  }

  // The questions of a pack as the game sees them (bank references resolved).
  function resolve(pack) {
    return (pack.items || []).map(function (it) { return it.ref ? bankById(it.ref) : it.q; }).filter(Boolean);
  }

  // What the editor can write: one object, the simple scenes, the usual forces.
  function canEdit(q) {
    return SCENES.indexOf(q.k) >= 0 && (q.type === "A" || q.type === "B") && !q.btComp &&
      (q.bt || []).every(function (f) { return FORCES.indexOf(f) >= 0; });
  }

  // Basic checks before saving / after importing (the server checks again).
  function problems(q) {
    var out = [];
    if (!String(q.t || "").trim()) out.push("ยังไม่มีข้อความโจทย์");
    if (!q.ex || !q.ex.length) out.push("ยังไม่ได้วางลูกศรเฉลยบนกระดาน");
    if (!q.bt || q.bt.length < 2) out.push("เลือกปุ่มแรงให้นักเรียนอย่างน้อย 2 ปุ่ม");
    (q.ex || []).forEach(function (e) { if ((q.bt || []).indexOf(e[0]) < 0) out.push("เฉลยมีแรง " + e[0] + " แต่ไม่ได้เปิดปุ่มแรงนี้ให้นักเรียน"); });
    return out;
  }

  function list() { return load().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }); }
  function get(id) { return load().filter(function (p) { return p.id === id; })[0] || null; }
  function save(pack) {
    var all = load().filter(function (p) { return p.id !== pack.id; });
    pack.updatedAt = Date.now();
    all.push(pack);
    return store(all);
  }
  function remove(id) { store(load().filter(function (p) { return p.id !== id; })); }

  function exportFile(pack) {
    var data = { kind: "dragon-hero-pack", version: 1, name: pack.name, desc: pack.desc || "", items: pack.items };
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ชุดโจทย์-" + String(pack.name || "dragon-hero").replace(/[\\/:*?"<>|]+/g, "_") + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // Read a pack file; keeps only items this version understands.
  function importFile(file) {
    return new Promise(function (ok, fail) {
      var r = new FileReader();
      r.onload = function () {
        var data;
        try { data = JSON.parse(r.result); } catch (e) { return fail(new Error("ไฟล์นี้ไม่ใช่ชุดโจทย์ (อ่าน JSON ไม่ได้)")); }
        if (!data || data.kind !== "dragon-hero-pack" || !Array.isArray(data.items)) return fail(new Error("ไฟล์นี้ไม่ใช่ชุดโจทย์ของ Dragon Hero"));
        var items = data.items.filter(function (it) {
          if (it && it.ref) return !!bankById(it.ref);
          return it && it.q && canEdit(it.q) && !problems(it.q).length;
        }).slice(0, 80);
        if (!items.length) return fail(new Error("ไม่พบโจทย์ที่ใช้ได้ในไฟล์นี้"));
        var pack = { id: newId(), name: String(data.name || "ชุดที่นำเข้า").slice(0, 60), desc: String(data.desc || "").slice(0, 200), items: items };
        save(pack);
        ok({ pack: pack, skipped: data.items.length - items.length });
      };
      r.onerror = function () { fail(new Error("อ่านไฟล์ไม่ได้")); };
      r.readAsText(file);
    });
  }

  DH.PackStore = {
    list: list, get: get, save: save, remove: remove, newId: newId, resolve: resolve, bankById: bankById,
    canEdit: canEdit, problems: problems, exportFile: exportFile, importFile: importFile, FORCES: FORCES
  };
})();
