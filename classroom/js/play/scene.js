// Student phone, the battlefield: the same scene as single-player (your own hero facing the monster,
// with the monster's HP), used for every moment that isn't a question or an answer key.
//   DH.PlayScene.html(v, me, { heroAnim, monAnim, pop, impact, overlay, walking, shake })
//   DH.PlayScene.after()   call once the scene is on the page (dash distances for attack animations)
(function () {
  var DH = window.DH;
  var SPARKS = '<span class="flash"></span>' + new Array(9).join('<i class="spark"></i>');

  function esc(s) { return DH.esc(s); }

  function bgFilter(m) {
    if (!m.isBoss) return "";
    if (m.phase === 2) return "filter:sepia(0.35) saturate(1.5) hue-rotate(-18deg) brightness(0.9)";
    if (m.phase === 3) return "filter:brightness(0.62) contrast(1.15) saturate(1.25)";
    return "";
  }

  // The monster rig from single-player; its image paths are relative to the game root.
  function monster(m, anim) {
    var html = DH.Screens.monsterHtml(Object.assign({}, m, { sprite: "../" + m.sprite }), anim || "anim-mon-idle");
    return html.replace(/src="assets\//g, 'src="../assets/');
  }

  function impactOnMonster(style) {
    return '<div class="impact-fx on-mon fx-' + style + '"><span class="slash"></span><span class="slash slash-2"></span><span class="ring"></span>' + SPARKS + '</div>';
  }
  function impactOnHero(m, blocked) {
    var slash = !blocked && (m.id === "goblin" || m.id === "fenrir");
    var slam = !blocked && (m.id === "slime" || m.id === "orc");
    var fire = !blocked && m.id === "dragon";
    return '<div class="impact-fx on-hero' + (blocked ? ' fx-block' : '') + (slash ? ' fx-mon-slash' : '') + (slam ? ' fx-slam' : '') + (fire ? ' fx-dragon-fire' : '') + '">' +
      (slash ? '<span class="slash"></span><span class="slash slash-2"></span>' : '') + '<span class="ring"></span><span class="ring ring-2"></span>' + SPARKS + '</div>';
  }

  function html(v, me, o) {
    o = o || {};
    var m = v.monster;
    var pct = Math.max(0, Math.min(100, 100 * m.hp / Math.max(1, m.maxHp)));
    return '<div class="scene-stage pg-stage stage-' + esc(m.id) + (o.shake ? " " + o.shake : "") + '">' +
      '<img class="scene-bg" src="../' + esc(m.bg) + '" style="' + (o.bgStyle || bgFilter(m)) + '" alt="">' +
      (o.overlay || "") +
      '<div class="mon-hud"><div class="mon-title">' + esc(m.name) + '</div>' +
        '<div class="hp-track"><div class="hp-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="hp-text">HP ' + m.hp.toLocaleString() + ' / ' + m.maxHp.toLocaleString() + (m.isBoss ? ' · เฟส ' + m.phase + '/3' : '') + '</div></div>' +
      (o.impact || "") + (o.fx || "") +
      '<div class="actors-row">' +
        (o.projectile ? '<span class="proj proj-' + esc(me.job) + '"></span>' : '') +
        '<div class="actor-unit ' + (o.heroAnim || "") + '">' + (o.pop || "") +
          DH.Avatar.render(me.look, me.job, { walking: !!o.walking }) +
          '<div class="actor-tag">' + esc(me.name) + '</div></div>' +
        monster(m, o.monAnim) +
      '</div>' +
    '</div>';
  }

  // Your own blow this question (or the counter-attack on you), single-player style.
  function battle(v, me) {
    var my = v.my || {}, m = v.monster;
    var style = DH.Avatar.attackStyle(me.job);
    var hit = v.lastDmg > 0;
    var blocked = !hit && (v.shield || !!my.protectedBy);
    var o = {};
    if (hit) {
      o.heroAnim = "anim-atk atk-" + style;
      o.monAnim = m.hp <= 0 ? "anim-mon-dead" : "anim-mon-hurt";
      o.impact = impactOnMonster(style);
      o.projectile = style === "ranged";
      o.shake = "shake-hero-hit";
      o.fx = '<div class="boss-impact-zone"><div class="big-dmg-pop">-' + v.lastDmg.toLocaleString() + '</div></div>' +
        (my.ult ? '<div class="ult-flash" style="--ult:' + DH.ULTIMATES[my.ult].color + '"></div><div class="ult-banner" style="--ult:' + DH.ULTIMATES[my.ult].color + '">' + DH.ULTIMATES[my.ult].icon + ' ' + DH.ULTIMATES[my.ult].name + '!</div>' : '') +
        (my.meteor ? '<div class="meteor-fx"><span></span></div>' : '') +
        (my.card && !my.ult ? '<div class="card-cast kind-' + DH.CARDS[my.card].kind + '">' + DH.CARDS[my.card].icon + '</div>' : '');
      o.pop = '<div class="actor-dmg ok">+' + v.lastDmg.toLocaleString() + ' ⚔️</div>';
    } else {
      o.heroAnim = blocked ? "anim-block" : "anim-hurt";
      o.monAnim = "anim-mon-lunge";
      o.impact = impactOnHero(m, blocked);
      o.shake = blocked ? "" : "shake-hit";
      o.pop = blocked ? '<div class="actor-dmg" style="color:#60a5fa">🛡️ ' + (v.shield ? "โล่ทั้งห้อง!" : "ป้องกัน!") + '</div>'
                      : '<div class="actor-dmg bad">💥' + (my.lost ? ' -' + my.lost + ' ❤️' : '') + '</div>';
    }
    if (v.effect && v.effect.type === "heal" && m.hp > 0) o.fx = (o.fx || "") + '<div class="mon-heal-pop">+' + v.effect.amount.toLocaleString() + ' 💧</div>';
    var text = hit
      ? (my.answered && my.acc >= 0.999 ? '⚔️ <b>โจมตีเต็มแรง!</b> คุณสร้าง ' + v.lastDmg.toLocaleString() + ' ดาเมจ' : '⚔️ <b>โจมตีโดน!</b> คุณสร้าง ' + v.lastDmg.toLocaleString() + ' ดาเมจ')
      : (blocked ? '🛡️ <b>' + (v.shield ? "โล่ทั้งห้องกันไว้ได้!" : "ป้องกันไว้ได้!") + '</b> ไม่เสียหัวใจ'
                 : (my.answered ? '💥 <b>โดนมอนสวนกลับ!</b>' : '⏱ <b>ไม่ได้ส่งคำตอบ</b> มอนสวนกลับ!') + (my.lost ? ' เสีย ' + my.lost + ' หัวใจ' : ''));
    return { scene: html(v, me, o), text: text, good: hit || blocked };
  }

  function after() {
    if (DH.Screens && DH.Screens.setDashDistance) DH.Screens.setDashDistance();
  }

  DH.PlayScene = { html: html, battle: battle, after: after };
})();
