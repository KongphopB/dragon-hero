(function (global) {
  var DH = global.DH = global.DH || {};
  var KEY = "dh_unlocks";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || { ids: {}, drillFixed: 0 }; }
    catch (e) { return { ids: {}, drillFixed: 0 }; }
  }
  function save(st) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
  }

  /**
   * Called once when a run reaches its summary. Returns the ids unlocked by this run.
   * hat_dragon: beat the dragon · acc_wings: beat it without losing a heart ·
   * pet_dragon: 5 weakness-drill questions answered without repeating the mistake (across runs)
   */
  function evaluate(g) {
    if (!g || g.unlockChecked) return g && g.newUnlocks || [];
    var st = load();
    var fresh = [];
    var grant = function (id) { if (!st.ids[id]) { st.ids[id] = true; fresh.push(id); } };
    if (g.result === "win") grant("hat_dragon");
    if (g.result === "win" && !(g.heartsLost > 0)) grant("acc_wings");
    st.drillFixed += (g.qLog || []).filter(function (e) { return e.fixedFocus; }).length;
    if (st.drillFixed >= 5) grant("pet_dragon");
    save(st);
    g.unlockChecked = true;
    g.newUnlocks = fresh;
    return fresh;
  }

  DH.Unlocks = {
    has: function (id) { return !id || !!load().ids[id]; },
    progress: function () { return load(); },
    evaluate: evaluate
  };
})(window);
