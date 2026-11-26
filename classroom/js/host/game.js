// Teacher game screen: router + the shared "world".
//
// The world is the single-player 640x480 scene (background, monster rig, heroes) scaled up to
// fit the projector, with a blurred copy of the background filling the sides, so the painted
// ground lines stay where the CSS expects them. Each phase lives in its own file in classroom/js/host/ and registers with
//   DH.HostGame.scene("PHASE", { enter(v, prev), update(v), leave() })
// The top bar (stage, monster HP, question count, the teacher's main button) is drawn here.
(function () {
  var DH = window.DH;
  var W = 640, H = 480;
  var scenes = {};
  var cur = null;            // { phase, scene }
  var v = null;              // latest view from the server
  var ctx = null;            // { send, room, joinUrl }
  var clockSkew = 0;         // server time - local time
  var tickTimer = 0;
  var worldMonsterId = "";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return DH.esc(s); }

  // ---------------------------------------------------------------- shell
  function shell() {
    var root = $("game");
    root.hidden = false;
    root.innerHTML =
      '<div class="hg-root" id="hgRoot">' +
        '<div class="hg-world-wrap"><img class="hg-backdrop" id="hgBackdrop" alt=""><div class="hg-world scene-stage" id="hgWorld"></div></div>' +
        '<header class="hg-bar">' +
          '<div class="hg-stage-chip" id="hgStage"></div>' +
          '<div class="hg-hp" id="hgHp"></div>' +
          '<div class="hg-right">' +
            '<span class="hg-qcount" id="hgQ"></span>' +
            '<button type="button" class="btn-sec hg-sec" id="hgSec" hidden></button>' +
            '<button type="button" class="btn-pri hg-next" id="hgNext"></button>' +
          '</div>' +
        '</header>' +
        '<div class="hg-layer" id="hgLayer"></div>' +
        '<div class="hg-caption" id="hgCaption" hidden></div>' +
      '</div>';
    window.addEventListener("resize", fit);
    $("hgNext").onclick = function () { if (cur && cur.scene.onNext) cur.scene.onNext(v); else ctx.send({ t: "host:next" }); };
    $("hgSec").onclick = function () { if (cur && cur.scene.onSec) cur.scene.onSec(v); };
    worldMonsterId = "";
  }

  // Cover the screen with the 640x480 world, bottom-anchored.
  function fit() {
    var root = $("hgRoot"), world = $("hgWorld");
    if (!root || !world) return;
    // Whole scene visible (fit), the sides filled by a blurred copy of the background.
    var k = Math.min(root.clientWidth / W, (root.clientHeight) / H);
    world.style.transform = "translateX(-50%) scale(" + k + ")";
    world.dataset.k = k;
  }
  function scale() { var w = $("hgWorld"); return w ? Number(w.dataset.k) || 1 : 1; }

  // ---------------------------------------------------------------- world pieces
  function bgFilter(m) {
    if (!m || !m.isBoss) return "";
    if (m.phase === 2) return "filter:sepia(0.35) saturate(1.5) hue-rotate(-18deg) brightness(0.9)";
    if (m.phase === 3) return "filter:brightness(0.62) contrast(1.15) saturate(1.25)";
    return "";
  }

  // (Re)build the battlefield for the current monster; party = up to 5 heroes on the left.
  function world(m, party, monAnim, extra) {
    var el = $("hgWorld");
    el.className = "hg-world scene-stage stage-" + m.id;
    el.innerHTML =
      '<img class="scene-bg" src="../' + esc(m.bg) + '" style="' + bgFilter(m) + '" alt="">' +
      (extra || "") +
      '<div class="actors-row" id="hgRow">' +
        '<div class="hg-party" id="hgParty">' + partyHtml(party) + '</div>' +
        monsterHtml(m, monAnim) +
      '</div>' +
      '<div class="hg-fx" id="hgFx"></div>';
    worldMonsterId = m.id;
    backdrop("../" + m.bg);
    fit();
  }

  function backdrop(src) { var b = $("hgBackdrop"); if (b && b.getAttribute("src") !== src) b.src = src; }

  function monsterHtml(m, anim) {
    // monster sprites are relative to the game root; this page lives one folder down
    var mm = Object.assign({}, m, { sprite: "../" + m.sprite });
    var html = DH.Screens.monsterHtml(mm, anim || "anim-mon-idle");
    return html.replace(/src="assets\//g, 'src="../assets/');
  }

  function partyHtml(party) {
    return (party || []).slice(0, 5).map(function (p, i) {
      return '<div class="actor-unit hg-hero" data-i="' + i + '" data-id="' + esc(p.id || "") + '">' +
        DH.Avatar.render(p.look, p.job, {}) +
        '<div class="actor-tag">' + esc(p.name) + '</div></div>';
    }).join("");
  }

  function setMonsterAnim(anim) {
    var slot = document.querySelector("#hgWorld .monster-slot");
    if (!slot) return;
    slot.className = slot.className.replace(/\banim-mon-[a-z]+\b/g, "").trim() + " " + anim;
    void slot.offsetWidth;
  }
  function restartMonsterAnim(anim) {
    var slot = document.querySelector("#hgWorld .monster-slot");
    if (!slot) return;
    slot.className = slot.className.replace(/\banim-mon-[a-z]+\b/g, "").trim();
    void slot.offsetWidth;
    slot.classList.add(anim);
  }

  // Distance (in world px) from a hero to the monster, for dash / lunge animations.
  function gapTo(heroEl) {
    var mon = document.querySelector("#hgWorld .monster-obj");
    if (!mon || !heroEl) return 80;
    var a = heroEl.querySelector(".avatar-stack").getBoundingClientRect(), b = mon.getBoundingClientRect();
    return Math.max(30, (b.left - a.right) / scale() + 12);
  }

  // A floating number / label at a world element.
  function pop(targetEl, html, cls) {
    var fx = $("hgFx"), world = $("hgWorld");
    if (!fx || !targetEl) return;
    var r = targetEl.getBoundingClientRect(), wr = world.getBoundingClientRect(), k = scale();
    var d = document.createElement("div");
    d.className = "hg-pop " + (cls || "");
    d.innerHTML = html;
    d.style.left = ((r.left + r.width / 2 - wr.left) / k) + "px";
    d.style.top = ((r.top + r.height * 0.15 - wr.top) / k) + "px";
    fx.appendChild(d);
    setTimeout(function () { d.remove(); }, 1800);
  }

  // ---------------------------------------------------------------- top bar
  function bar(v) {
    var m = v.monster;
    $("hgStage").innerHTML = m ? '<small>ด่าน ' + (v.stageIdx + 1) + '/' + v.stages + '</small><b>' + esc(m.name.split(" (")[0]) + '</b>' : "";
    if (!m) $("hgHp").innerHTML = "";     // self-paced endings have no monster: clear what the ranking put there
    if (m) {
      var pct = Math.max(0, Math.min(100, 100 * m.hp / Math.max(1, m.maxHp)));
      $("hgHp").innerHTML = '<div class="hg-hp-track"><i style="width:' + pct + '%"></i></div>' +
        '<span>HP ' + m.hp.toLocaleString() + ' / ' + m.maxHp.toLocaleString() + (m.isBoss ? ' · เฟส ' + m.phase + '/3' : '') + '</span>';
    }
    $("hgQ").innerHTML = v.qNum ? 'ข้อ <b>' + v.qNum + '</b>/' + v.qTotal : 'รวม ' + v.qTotal + ' ข้อ';
  }

  function setButtons(main, sec) {
    var n = $("hgNext"), s = $("hgSec");
    if (!n) return;
    n.hidden = !main;
    if (main) { n.innerHTML = main; n.disabled = false; }
    s.hidden = !sec;
    if (sec) s.innerHTML = sec;
  }

  function caption(html, cls) {
    var c = $("hgCaption");
    if (!c) return;
    c.hidden = !html;
    c.className = "hg-caption" + (cls ? " " + cls : "");
    c.innerHTML = html || "";
  }

  // seconds left until a server timestamp
  function left(ts) { return Math.max(0, Math.ceil((ts - (Date.now() + clockSkew)) / 1000)); }

  // ---------------------------------------------------------------- routing
  function show(view, context) {
    ctx = context;
    if (view.now) clockSkew = view.now - Date.now();
    var first = !$("hgRoot");
    if (first) shell();
    var prev = v;
    v = view;
    bar(v);
    var sc = scenes[v.phase];
    if (!cur || cur.phase !== v.phase) {
      if (cur && cur.scene.leave) cur.scene.leave(v);
      cur = { phase: v.phase, scene: sc || {} };
      caption("");
      // the old card fades out on its own copy while the new phase draws
      var L = $("hgLayer");
      if (L.firstChild) {
        var ghost = document.createElement("div");
        ghost.className = L.className + " is-ghost";
        while (L.firstChild) ghost.appendChild(L.firstChild);
        // ids belong to the new card now
        ghost.querySelectorAll("[id]").forEach(function (e) { e.removeAttribute("id"); });
        L.parentNode.insertBefore(ghost, L);
        setTimeout(function () { ghost.remove(); }, 700);
      }
      L.className = "hg-layer";
      if (v.monster && (worldMonsterId !== v.monster.id || first) && !(sc && sc.ownWorld)) world(v.monster, v.party || [], "anim-mon-idle");
      if (cur.scene.enter) cur.scene.enter(v, prev);
    } else if (cur.scene.update) {
      cur.scene.update(v, prev);
    }
    clearInterval(tickTimer);
    if (cur.scene.tick) { cur.scene.tick(v); tickTimer = setInterval(function () { cur.scene.tick(v); }, 250); }
  }

  // live "answered" counter while a question is open
  function progress(m) {
    if (v && v.phase === "QUESTION") { v.answered = m.answered; if (cur.scene.update) cur.scene.update(v); }
  }

  function hide() {
    clearInterval(tickTimer);
    cur = null; v = null;
    var root = $("game");
    if (root) { root.hidden = true; root.innerHTML = ""; }
    window.removeEventListener("resize", fit);
  }

  DH.HostGame = {
    scene: function (phases, def) { [].concat(phases).forEach(function (p) { scenes[p] = def; }); },
    show: show,
    progress: progress,
    hide: hide,
    // helpers for the scene files
    kit: {
      world: world, partyHtml: partyHtml, setMonsterAnim: setMonsterAnim, restartMonsterAnim: restartMonsterAnim,
      gapTo: gapTo, pop: pop, backdrop: backdrop, setButtons: setButtons, caption: caption, left: left, bar: bar,
      send: function (m) { ctx.send(m); }, ctx: function () { return ctx; }, view: function () { return v; },
      layer: function () { return $("hgLayer"); }, $: $, esc: esc, scale: scale
    }
  };
})();
