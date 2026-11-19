(function () {
  var DH = window.DH;
  DH.Game.setCallbacks(DH.Screens.render, DH.Screens.updateTimer);
  DH.Screens.render();
})();
