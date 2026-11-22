(function () {
  var DH = window.DH;

  // Sound on/off is remembered per device (a class of 40 phones beeping is a lot).
  try { if (localStorage.getItem("dh_sfx") === "off") DH.SFX.setEnabled(false); } catch (e) { /* ignore */ }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-mute]");
    if (!b) return;
    var on = !DH.SFX.isEnabled();
    DH.SFX.setEnabled(on);
    try { localStorage.setItem("dh_sfx", on ? "on" : "off"); } catch (err) { /* ignore */ }
    document.querySelectorAll("[data-mute]").forEach(function (x) {
      x.textContent = on ? "🔊" : "🔇";
      x.title = x.ariaLabel = on ? "ปิดเสียง" : "เปิดเสียง";
    });
    if (on) DH.SFX.tick();
  });

  DH.Game.setCallbacks(DH.Screens.render, DH.Screens.updateTimer);
  // Avatar sprites are recoloured on a canvas, so wait until they are decoded (a few ms).
  DH.AvatarColor.ready.then(function () { DH.Screens.render(); });

  // Warm the cache with every stage's art after the first screen is up, so monsters, their moving
  // parts and attack frames don't pop in late on slow classroom Wi-Fi.
  setTimeout(function () {
    var urls = ["assets/bg/bg_depart_crane.webp"];
    DH.STAGES.forEach(function (s) {
      urls.push(s.bg);
      var rig = DH.MONSTER_RIGS && DH.MONSTER_RIGS[s.monsterId];
      if (!rig || !rig.baseSrc) { urls.push(s.sprite); return; }
      urls.push(rig.baseSrc);
      (rig.parts || []).forEach(function (p) { if (p.src) urls.push(p.src); });
      // Attack frames are requested with ?v=9 in js/ui/screens/common.js, so preload that exact URL.
      (rig.atkSeq || []).forEach(function (f) { urls.push(f + "?v=9"); });
    });
    urls.forEach(function (u) { var img = new Image(); img.src = u; });
  }, 300);
})();
