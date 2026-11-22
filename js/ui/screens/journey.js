// INTRO: departure cutscene (hero walks out of the town gate, seen from behind).
// ENCOUNTER: a monster blocks the road; shows its HP, question count and damage target.
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;

  DH.Screens.scene("INTRO", {
    html: function (g, charDraft) {
      var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
      return '<div class="tbar"><i id="sTimerBar" style="width:0%"></i></div>' +
      '<div class="scene-stage">' +
        '<div class="crane-world">' +
          '<img class="crane-bg" src="assets/bg/bg_depart_crane.webp">' +
          '<div class="crane-walker">' +
            DH.Avatar.render(charDraft.look, charDraft.job, { walking: true, backView: true }) +
          '</div>' +
        '</div>' +
        '<div class="scene-scrim"></div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>🎬 <b>' + DH.esc(charDraft.name) + ' (' + jb.name + ')</b> เดินออกจากประตูเมือง มุ่งหน้าสู่ทุ่งหญ้ากว้างใหญ่...</div>' +
        '<button class="btn-sec" id="btnNext" style="margin-top:10px;width:100%">ข้ามคัตซีน ▶</button>' +
      '</div>';
    },

    bind: function () {
      var el = document.getElementById("btnNext");
      if (el) el.onclick = DH.Game.enterEncounter;
    },

    timer: function (g, charDraft, txt, bar) {
      if (bar) {
        bar.style.width = (100 * (7.0 - (g.introLeft || 0)) / 7.0) + "%";
        bar.style.background = "var(--gold)";
      }
      txt.textContent = "🎬 ออกเดินทาง...";
    }
  });

  DH.Screens.scene("ENCOUNTER", {
    html: function (g, charDraft) {
      var m = g.monster;
      return '<div class="scene-stage stage-' + DH.esc(m.id) + '">' +
        '<img class="scene-bg" src="' + DH.esc(m.bg) + '" style="' + K.bgFilterStyle(m) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m.name) + '</div><div class="mon-sub">' + DH.esc(m.subtitle) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m.hp / m.maxHp) + '%"></div></div><div class="hp-text">HP ' + m.hp + ' / ' + m.maxHp + ' · ต้องสู้ ' + m.count + ' ข้อ' + (m.isBoss && g.bossBonusHp > 0 ? ' (เสริม +' + g.bossBonusHp + ' HP จากมอนหนี)' : '') + '</div>' + K.targetLine(g) + '</div>' +
        '<div class="actors-row">' +
          '<div class="actor-unit">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          K.monsterHtml(m, "anim-mon-enter") +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>' + (m.isBoss ? '🔥 <b>บอสใหญ่ปรากฏตัว!</b> ' : '⚠️ <b>พบศัตรูขวางทาง!</b> ') + DH.esc(m.name) + (m.isBoss && g.bossBonusHp > 0 ? ' <span style="color:#fb923c">(ได้รับเลือดเสริมจากมอนที่หนี +' + g.bossBonusHp + ' HP!)</span>' : '') + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">เข้าโจมตี ⚔️</button>' +
      '</div>';
    },

    bind: function () {
      var el = document.getElementById("btnNext");
      if (el) el.onclick = DH.Game.startQuestion;
    }
  });
})(window);
