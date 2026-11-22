// BATTLE: the attack animation for the answer just given — hero hits (dash or projectile) or the
// monster counter-attacks, plus card / ultimate / intent effects and the dragon phase-up banner.
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;

  DH.Screens.scene("BATTLE", {
    html: function (g, charDraft) {
      var r2 = g.lastRes;
      var out = r2.outcome;
      // A meteor still lands on a wrong answer, so the monster gets hit either way.
      var hitMon = (out === "correct" || out === "partial") || r2.meteor > 0;
      var shielded = out === "shielded";
      var atkStyle = DH.Avatar.attackStyle(charDraft.job);
      var anim = hitMon ? "anim-atk atk-" + atkStyle : (shielded ? "anim-block" : "anim-hurt");
      var monAnim = hitMon ? (g.monster.hp <= 0 ? "anim-mon-dead" : "anim-mon-hurt") : "anim-mon-lunge";
      var pop = hitMon
        ? '<div class="actor-dmg ok">+' + r2.dmg + ' ⚔️</div>'
        : (shielded ? '<div class="actor-dmg" style="color:#60a5fa">🛡️ ป้องกัน!</div>' : '<div class="actor-dmg bad">' + (r2.heartsLost ? '💥 -' + r2.heartsLost + ' ❤️' : '💥') + '</div>');
      var ultDef = r2.ult ? DH.ULTIMATES[r2.ult] : null;
      var tacticFx =
        (ultDef ? '<div class="ult-flash" style="--ult:' + ultDef.color + '"></div><div class="ult-banner" style="--ult:' + ultDef.color + '">' + ultDef.icon + ' ' + ultDef.name + '!</div>' : '') +
        (r2.meteor ? '<div class="meteor-fx"><span></span></div>' : '') +
        (r2.effect && r2.effect.type === "heal" ? '<div class="mon-heal-pop">+' + r2.effect.amount + ' 💧</div>' : '') +
        (r2.effect && r2.effect.type === "stolen" ? '<div class="steal-fx">' + DH.CARDS[r2.effect.card].icon + '</div>' : '') +
        (r2.effect && r2.effect.type === "pierced" ? '<div class="pierce-fx">🔨 ทะลุการ์ด!</div>' : '') +
        (r2.card && !ultDef ? '<div class="card-cast kind-' + DH.CARDS[r2.card].kind + '">' + DH.CARDS[r2.card].icon + '</div>' : '');
      var sparks = '<span class="flash"></span><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i>';
      // Hit effects land where the blow connects: on the monster when we hit, on the hero when it hits us.
      var m2 = g.monster;
      var isDragonAtk = !hitMon && m2.id === "dragon";
      var monSlash = !hitMon && !shielded && (m2.id === "goblin" || m2.id === "fenrir");
      var monSlam = !hitMon && !shielded && (m2.id === "slime" || m2.id === "orc");
      var impact = hitMon
        ? '<div class="impact-fx on-mon fx-' + atkStyle + '"><span class="slash"></span><span class="slash slash-2"></span><span class="ring"></span>' + sparks + '</div>'
        : '<div class="impact-fx on-hero' + (shielded ? ' fx-block' : '') + (monSlash ? ' fx-mon-slash' : '') + (monSlam ? ' fx-slam' : '') + (isDragonAtk && !shielded ? ' fx-dragon-fire' : '') + '">' + (monSlash ? '<span class="slash"></span><span class="slash slash-2"></span>' : '') + '<span class="ring"></span><span class="ring ring-2"></span>' + sparks + '</div>';
      return '<div class="scene-stage stage-' + DH.esc(m2.id) + ' ' + (hitMon ? "shake-hero-hit" : (!shielded ? "shake-hit" : "")) + '">' +
        '<img class="scene-bg" src="' + DH.esc(m2.bg) + '" style="' + K.bgFilterStyle(m2) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m2.name) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m2.hp / m2.maxHp) + '%"></div></div><div class="hp-text">HP ' + m2.hp + ' / ' + m2.maxHp + '</div>' + K.targetLine(g) + '</div>' +
        (hitMon ? '<div class="boss-impact-zone"><div class="big-dmg-pop">-' + r2.dmg + '</div></div>' : '') +
        impact +
        tacticFx +
        (r2.phaseUp ? '<div class="phase-up-flash"></div><div class="phase-up-banner">🔥 มังกรโกรธจัด! <b>เข้าสู่เฟส ' + r2.phaseUp + '</b><span>' + (r2.phaseUp === 3 ? 'เกล็ดลุกเป็นไฟ ใกล้ล้มแล้ว สู้ต่อ!' : 'มังกรเริ่มเคลื่อนไหวเร็วขึ้น!') + '</span></div>' : '') +
        '<div class="actors-row">' +
          (hitMon && atkStyle === "ranged" ? '<span class="proj proj-' + DH.esc(charDraft.job) + '"></span>' : '') +
          '<div class="actor-unit ' + anim + '">' + pop + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          K.monsterHtml(m2, monAnim) +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (hitMon ? "var(--ok)" : "var(--bad)") + '">' +
        '<div>' + (hitMon ? ((out === "correct" || out === "partial") ? '⚔️ <b>โจมตีสำเร็จ!</b> สร้าง ' + r2.dmg + ' ดาเมจ!' : '☄️ <b>อุกกาบาตถล่ม!</b> แม้ตอบพลาดก็ยังสร้าง ' + r2.dmg + ' ดาเมจ') : (out === "shielded" ? '🛡️ <b>ป้องกันไว้ได้!</b> ไม่เสียหัวใจและไม่เสีย Streak' : '💥 <b>ถูกมอนสเตอร์สวนกลับ!</b>')) + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">ดำเนินการต่อ ▶</button>' +
      '</div>';
    },

    bind: function () {
      var el = document.getElementById("btnNext");
      if (!el) return;
      el.onclick = DH.Game.afterBattle;
      K.setDashDistance();
    }
  });
})(window);
