(function () {
  var DH = window.DH;
  DH.Game.setCallbacks(DH.Screens.render, DH.Screens.updateTimer);
  DH.Screens.render();

  // Warm the cache with every stage's art after the first screen is up, so monsters and
  // backgrounds don't pop in late on slow classroom Wi-Fi.
  setTimeout(function () {
    var urls = ["assets/bg/bg_depart_crane.webp"];
    DH.STAGES.forEach(function (s) { urls.push(s.bg, s.sprite); });
    urls.forEach(function (u) { var img = new Image(); img.src = u; });
  }, 300);
})();
