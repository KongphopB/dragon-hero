// Teacher screen, BATTLE: up to 5 students walk up to the monster — the 3 fastest full-marks
// answers strike one after another, then up to 2 who got it wrong take the monster's counter-attack.
// The class's total damage lands last and the HP bar drops.
(function () {
  var DH = window.DH, K = DH.HostGame.kit;
  var timers = [];
  var STEP_HIT = 850, STEP_MISS = 1450;
  var SPARKS = '<span class="flash"></span>' + new Array(9).join('<i class="spark"></i>');

  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function monFx() {
    var w = K.$("hgWorld"), mon = w.querySelector(".monster-obj");
    if (!mon) return;
    var k = K.scale(), wr = w.getBoundingClientRect(), r = mon.getBoundingClientRect();
    w.style.setProperty("--mon-fx-x", Math.round((r.left + r.width * 0.42 - wr.left) / k) + "px");
    w.style.setProperty("--mon-fx-y", Math.round((r.top + r.height * 0.5 - wr.top) / k) + "px");
  }
  function heroFx(hero) {
    var w = K.$("hgWorld"), k = K.scale(), wr = w.getBoundingClientRect(), r = hero.querySelector(".avatar-stack").getBoundingClientRect();
    w.style.setProperty("--hero-fx-x", Math.round((r.left + r.width * 0.55 - wr.left) / k) + "px");
    w.style.setProperty("--hero-fx-y", Math.round((r.top + r.height * 0.5 - wr.top) / k) + "px");
  }
  function impact(cls) {
    var fx = K.$("hgFx");
    var d = document.createElement("div");
    d.className = "impact-fx " + cls;
    d.innerHTML = '<span class="slash"></span><span class="slash slash-2"></span><span class="ring"></span><span class="ring ring-2"></span>' + SPARKS;
    fx.appendChild(d);
    setTimeout(function () { d.remove(); }, 1800);
  }

  // HP bar shows the monster's health before this round until the blows land.
  function barBefore(v) {
    var m = v.monster;
    var shown = Object.assign({}, v, { monster: Object.assign({}, m, { hp: Math.min(m.maxHp, m.hp + v.battle.total) }) });
    K.bar(shown);
  }

  DH.HostGame.scene("BATTLE", {
    enter: function (v) {
      timers.forEach(clearTimeout);
      timers = [];
      var b = v.battle, m = v.monster;
      barBefore(v);
      K.setMonsterAnim("anim-mon-idle");
      var party = K.$("hgParty");
      party.innerHTML = K.partyHtml(b.attackers);
      K.setButtons("ถัดไป ▶");
      if (!b.attackers.length) {
        K.caption('😶 ไม่มีใครส่งคำตอบทัน<span>มอนสเตอร์ยังไม่เสียเลือด</span>', "is-warn");
      }
      var heroes = party.querySelectorAll(".hg-hero");
      // each hero dashes exactly to the monster
      heroes.forEach(function (h) { h.style.setProperty("--dash", K.gapTo(h) + "px"); });
      monFx();

      var t = 450;
      // an ultimate in this round: a flash and its name across the screen first
      if (b.ults && b.ults.length) {
        var u0 = DH.ULTIMATES[b.ults[0].job];
        K.$("hgFx").insertAdjacentHTML("beforeend", '<div class="ult-flash" style="--ult:' + u0.color + '"></div><div class="ult-banner" style="--ult:' + u0.color + '">' + u0.icon + ' ' + u0.name + (b.ults.length > 1 ? ' +' + (b.ults.length - 1) : '') + '!</div>');
        t += 900;
      }
      if (b.meteor) later(t - 300, function () { K.$("hgFx").insertAdjacentHTML("beforeend", '<div class="meteor-fx"><span></span></div>'); });
      b.attackers.forEach(function (a, i) {
        var h = heroes[i];
        if (a.hit) {
          later(t, function () {
            var style = DH.Avatar.attackStyle(a.job);
            h.classList.add("anim-atk", "atk-" + style, "is-acting");
            K.restartMonsterAnim("anim-mon-hurt");
            impact("on-mon fx-" + style);
            if (a.card) K.pop(h, DH.CARDS[a.card].icon, "is-card");
            later(520, function () {
              var mon = K.$("hgWorld").querySelector(".monster-obj");
              K.pop(mon, "+" + a.dmg.toLocaleString(), "is-hit");
              K.pop(h, "⚡ " + a.secs + " วิ", "is-fast");
            });
          });
          t += STEP_HIT;
        } else {
          later(t, function () {
            var slot = K.$("hgWorld").querySelector(".monster-slot");
            slot.style.setProperty("--dash", K.gapTo(h) + "px");
            heroFx(h);
            // the class shield turns the counter-attack into a block
            h.classList.add(b.shield ? "anim-block" : "anim-hurt", "is-acting");
            K.restartMonsterAnim("anim-mon-lunge");
            impact("on-hero" + (b.shield ? " fx-block" : (m.id === "dragon" ? " fx-dragon-fire" : (m.id === "goblin" || m.id === "fenrir" ? " fx-mon-slash" : " fx-slam"))));
            later(650, function () { K.pop(h, b.shield ? "🛡️ โล่ทั้งห้อง!" : "💥 พลาด", b.shield ? "is-block" : "is-miss"); });
          });
          t += STEP_MISS;
        }
      });

      // total damage, HP drop, maybe a boss phase change or the monster falling
      later(t + 150, function () {
        var mon = K.$("hgWorld").querySelector(".monster-obj");
        if (b.total > 0) K.pop(mon, "-" + b.total.toLocaleString(), "is-total");
        if (b.effect && b.effect.type === "heal" && m.hp > 0) later(700, function () { K.pop(mon, "+" + b.effect.amount.toLocaleString() + " 💧", "is-heal"); });
        K.bar(v);
        if (m.hp <= 0) K.setMonsterAnim("anim-mon-dead");
        else K.setMonsterAnim("anim-mon-idle");
        if (b.phaseUp) {
          var w = K.$("hgFx");
          w.insertAdjacentHTML("beforeend", '<div class="phase-up-flash"></div><div class="phase-up-banner">🔥 มังกรโกรธจัด! <b>เข้าสู่เฟส ' + b.phaseUp + '</b><span>' +
            (b.phaseUp === 3 ? 'เกล็ดลุกเป็นไฟ ใกล้ล้มแล้ว สู้ต่อ!' : 'มังกรเริ่มเคลื่อนไหวเร็วขึ้น!') + '</span></div>');
          var bg = K.$("hgWorld").querySelector(".scene-bg");
          if (bg) bg.style.filter = m.phase === 3 ? "brightness(0.62) contrast(1.15) saturate(1.25)" : "sepia(0.35) saturate(1.5) hue-rotate(-18deg) brightness(0.9)";
        }
        K.caption((b.shield ? '🛡️ โล่ทั้งห้องกันการสวนกลับไว้ได้ · ' : '') + '⚔️ ทั้งห้องสร้างดาเมจรวม <b>' + b.total.toLocaleString() + '</b>' +
          (b.effect && b.effect.type === "heal" ? ' · 💧 มอนฟื้น +' + b.effect.amount.toLocaleString() : '') +
          '<span>' + (m.hp <= 0 ? 'มอนสเตอร์ล้มแล้ว!' : 'มอนสเตอร์เหลือ HP ' + m.hp.toLocaleString() + ' · เหลืออีก ' + Math.max(0, m.count - v.qInStage) + ' ข้อในด่านนี้') + '</span>',
          m.hp <= 0 ? "is-good" : "");
      });
    },
    leave: function () { timers.forEach(clearTimeout); timers = []; }
  });
})();
