// Building blocks shared by several scenes: top HUD strip, monster rig, monster HP panel, dash maths.
// Scenes reach them as DH.Screens.kit.<name>.
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;

  K.bgFilterStyle = function (m) {
    if (!m || !m.isBoss) return "";
    if (m.phase === 2) return "filter:sepia(0.35) saturate(1.5) hue-rotate(-18deg) brightness(0.9)";
    if (m.phase === 3) return "filter:brightness(0.62) contrast(1.15) saturate(1.25)";
    return "";
  };

  // Monster = action wrapper (enter / lunge / hurt / dead) > rig with its own idle loop > overlapping layered parts.
  K.monsterHtml = function (m, animClass, extraStyle) {
    var rig = (DH.MONSTER_RIGS && DH.MONSTER_RIGS[m.id]) || { parts: [], fx: [] };
    var fallbackSrc = DH.esc(m.sprite);
    var baseSrc = rig.baseSrc ? DH.esc(rig.baseSrc) : fallbackSrc;
    var baseClip = rig.base ? (' style="clip-path:' + rig.base + '"') : "";
    var parts = (rig.parts || []).map(function (p) {
      var pSrc = p.src ? DH.esc(p.src) : fallbackSrc;
      var st = "transform-origin:" + (p.pivot || "50% 50%") + ";z-index:" + (p.z || 3) + (p.clip ? ";clip-path:" + p.clip : "");
      return '<img class="mon-part part-' + p.name + '" src="' + pSrc + '" alt="" style="' + st + '">';
    }).join("");
    var fx = (rig.fx || []).map(function (f) {
      return '<span class="mon-fx fx-' + f.name + '" style="left:' + f.left + ';top:' + f.top + '"></span>';
    }).join("");
    var atkSeq = rig.atkSeq || [];
    var seqTag = atkSeq.length ? (" seq-" + atkSeq.length + "f") : "";
    var atkHtml = atkSeq.map(function (src, idx) {
      return '<img class="mon-atk-frame atk-f-' + idx + '" src="' + DH.esc(src) + '?v=9" alt="">';
    }).join("");
    return '<div class="monster-slot mon-' + DH.esc(m.id) + seqTag + ' ' + (animClass || "anim-mon-idle") + '" style="' + (extraStyle || "") + '">' +
      '<div class="mon-act">' +
        '<div class="monster-obj mon-rig rig-' + DH.esc(m.id) + (m.isBoss ? " is-boss phase-" + (m.phase || 1) : "") + '" role="img" aria-label="' + DH.esc(m.name) + '">' +
          '<div class="mon-idle-layer"><img class="mon-base" src="' + baseSrc + '" alt=""' + baseClip + '>' + parts + fx + '</div>' +
          atkHtml +
        '</div>' +
      '</div>' +
      '<div class="monster-shadow shadow-' + DH.esc(m.id) + '"></div>' +
    '</div>';
  };

  // Top strip on every in-run screen: hero, hearts, stage / timer text, score, mute.
  K.hudBar = function (g, charDraft) {
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var hs = "";
    for (var i = 0; i < g.maxHearts; i++) hs += i < g.hearts ? "❤️" : "🖤";
    var tired = g.hearts <= 0 && g.phase !== "LOBBY";
    return '<div class="hud-strip">' +
      '<span>' + jb.icon + ' ' + DH.esc(charDraft.name) + ' ' + hs + (tired ? ' <b class="hud-tired" title="หัวใจหมด: ดาเมจ ×0.5 จนกว่าจะฟื้น">😵 หมดแรง</b>' : '') + '</span>' +
      '<span id="sTimerTxt" style="color:var(--gold)">ด่าน ' + (g.stageIdx + 1) + '/' + DH.STAGES.length + '</span>' +
      '<span style="color:var(--gold)">⚔️ ' + g.score + (g.streak >= 2 ? ' · 🔥' + g.streak : '') + K.muteButtonHtml() + '</span>' +
    '</div>';
  };

  K.muteButtonHtml = function () {
    var on = DH.SFX.isEnabled();
    return '<button type="button" class="mute-btn" data-mute="1" aria-label="' + (on ? "ปิดเสียง" : "เปิดเสียง") + '" title="' + (on ? "ปิดเสียง" : "เปิดเสียง") + '">' + (on ? "🔊" : "🔇") + '</button>';
  };

  // Compact monster HP panel above the question / answer key.
  K.monsterMiniHud = function (m) {
    var pct = Math.max(0, Math.min(100, 100 * m.hp / Math.max(1, m.maxHp)));
    var bonusHp = (DH.Game.getState() || {}).bossBonusHp || 0;
    return '<div class="mon-mini">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
        '<b style="font-size:0.95rem;color:#fef08a">' + DH.esc(m.name) + (m.isBoss ? ' (เฟส ' + m.phase + '/3)' : '') + (m.isBoss && bonusHp > 0 ? ' <span style="color:#fb923c;font-size:0.78rem">(+' + bonusHp + ' HP)</span>' : '') + '</b>' +
        '<span style="font-size:0.8rem;color:#cbd5e1;font-weight:700">HP ' + m.hp + ' / ' + m.maxHp + '</span>' +
      '</div>' +
      '<div class="hp-track"><div class="hp-fill" style="width:' + pct + '%"></div></div>' +
      K.targetLine(DH.Game.getState()) +
    '</div>';
  };

  // How much damage is still needed to finish this monster, and how hard that is.
  K.targetLine = function (g) {
    if (!g || !g.monster) return "";
    var m = g.monster;
    var left = Math.max(0, m.count - g.qInStage + (g.phase === "QUESTION" ? 1 : 0));
    var cls, txt;
    if (m.hp <= 0) {
      cls = "ok";
      txt = "🎯 โค่นได้แล้ว!";
    } else if (left === 0) {
      cls = "bad";
      txt = "🎯 ไม่เหลือข้อให้โจมตีแล้ว (ขาดอีก " + m.hp + " ดาเมจ)";
    } else {
      var per = Math.ceil(m.hp / left);
      var hint;
      if (per <= m.baseDmg) { cls = "ok"; hint = "ตอบถูกครบก็พอ"; }
      else if (per <= Math.round(m.baseDmg * 1.5)) { cls = "warn"; hint = "ต้องตอบถูกและเร็ว"; }
      else { cls = "bad"; hint = "ต้องตอบถูกเร็ว + ใช้การ์ดดาบคู่"; }
      txt = "🎯 " + (m.isBoss ? "เป้าโค่นมังกร: " : "") + "ขาดอีก " + m.hp + " ดาเมจ ใน " + left + " ข้อ (≈" + per + "/ข้อ · " + hint + ")";
    }
    return '<div class="target-line t-' + cls + '">' + txt + '</div>';
  };

  // Melee dashes and monster lunges should close the actual gap between the two, whatever the screen width.
  K.setDashDistance = function () {
    var stage = document.querySelector(".scene-stage");
    var row = document.querySelector(".actors-row");
    var hero = row && row.querySelector(".avatar-stack");
    var mon = row && row.querySelector(".monster-obj");
    if (!hero || !mon || !stage) return;
    var stR = stage.getBoundingClientRect();
    var rowR = row.getBoundingClientRect();
    var hR = hero.getBoundingClientRect();
    var mR = mon.getBoundingClientRect();
    var gap = mR.left - hR.right;
    var dashY = Math.round((mR.top + mR.height * 0.55) - (hR.top + hR.height * 0.50));
    stage.style.setProperty("--dash", Math.max(30, Math.round(gap + 12)) + "px");
    stage.style.setProperty("--dash-y", dashY + "px");
    stage.style.setProperty("--hero-fx-x", Math.round(hR.left + hR.width * 0.55 - stR.left) + "px");
    stage.style.setProperty("--hero-fx-y", Math.round(hR.top + hR.height * 0.50 - stR.top) + "px");
    stage.style.setProperty("--mon-fx-x", Math.round(mR.left + mR.width * 0.42 - stR.left) + "px");
    stage.style.setProperty("--mon-fx-y", Math.round(mR.top + mR.height * 0.50 - stR.top) + "px");

    var mouth = mon.querySelector(".fx-fire-glow");
    var mPt = mouth ? mouth.getBoundingClientRect() : null;
    var mx = mPt ? (mPt.left + mPt.width / 2 - rowR.left - 8) : (mR.left + mR.width * 0.16 - rowR.left);
    var my = mPt ? (mPt.top + mPt.height / 2 - rowR.top + 4) : (mR.top + mR.height * 0.70 - rowR.top);
    var hx = hR.left + hR.width * 0.52 - rowR.left;
    var hy = hR.top + hR.height * 0.50 - rowR.top;
    var dx = hx - mx;
    var dy = hy - my;
    row.style.setProperty("--mouth-x", Math.round(mx) + "px");
    row.style.setProperty("--mouth-y", Math.round(my) + "px");
    row.style.setProperty("--fire-dx", Math.round(dx) + "px");
    row.style.setProperty("--fire-dy", Math.round(dy) + "px");
    row.style.setProperty("--fire-dist", Math.round(Math.hypot(dx, dy)) + "px");
    row.style.setProperty("--fire-ang", (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + "deg");
  };

  // Used outside the scene files (creator, preview.html).
  DH.Screens.monsterHtml = K.monsterHtml;
  DH.Screens.muteButtonHtml = K.muteButtonHtml;
  DH.Screens.setDashDistance = K.setDashDistance;
})(window);
