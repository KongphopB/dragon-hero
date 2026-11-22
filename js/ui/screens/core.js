// Screen router. Each game phase lives in its own file in js/ui/screens/ and registers itself with
//   DH.Screens.scene("PHASE", { html(g, charDraft), bind(g, charDraft), timer(g, charDraft, txt, bar) })
// html returns the scene markup (the HUD strip is added on top automatically), bind wires its buttons
// after it is on the page, and timer (optional) updates the countdown text/bar every tick.
(function (global) {
  var DH = global.DH = global.DH || {};
  var scenes = {};
  var app = null;

  function scene(phases, def) {
    [].concat(phases).forEach(function (p) { scenes[p] = def; });
  }

  function render() {
    var g = DH.Game.getState();
    if (!g) { DH.Creator.render(); return; }
    var charDraft = DH.Game.getChar();
    var s = scenes[g.phase];
    if (!app) app = document.getElementById("app");
    app.innerHTML = DH.Screens.kit.hudBar(g, charDraft) + (s ? s.html(g, charDraft) : "");
    if (s && s.bind) s.bind(g, charDraft);
    updateTimer();
  }

  function updateTimer() {
    var g = DH.Game.getState();
    var txt = document.getElementById("sTimerTxt");
    if (!g || !txt) return;
    var s = scenes[g.phase];
    if (s && s.timer) s.timer(g, DH.Game.getChar(), txt, document.getElementById("sTimerBar"));
  }

  DH.Screens = {
    scene: scene,
    render: render,
    updateTimer: updateTimer,
    kit: {}            // shared building blocks, filled in by common.js
  };
})(window);
