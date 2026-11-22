// VICTORY / DEFEAT: the dragon boss ending — it falls, or the hero is eaten / burned (g.defeatFate).
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;

  DH.Screens.scene(["VICTORY", "DEFEAT"], {
    html: function (g, charDraft) {
      var win = g.phase === "VICTORY";
      var m4 = g.monster;
      return '<div class="scene-stage stage-dragon">' +
        '<img class="scene-bg" src="assets/bg/bg_dragon.webp" style="' + (win ? "filter:brightness(0.95)" : "filter:brightness(0.65) saturate(1.3)") + '">' +
        (!win ? '<div class="' + (g.defeatFate === "eat" ? "dragon-eat-overlay" : "dragon-fire-overlay") + '"></div>' : '') +
        '<div class="actors-row">' +
          '<div class="actor-unit ' + (win ? "anim-walk" : "anim-hurt") + '">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          K.monsterHtml(m4, win ? "anim-mon-dead" : "anim-mon-lunge") +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (win ? "#4ade80" : "#ef4444") + '">' +
        '<div>' + (win ? '🎉 <b>ชัยชนะอันยิ่งใหญ่!</b> คุณโค่นมังกรเพลิงบรรพกาลสำเร็จแล้ว!' : (g.defeatFate === "eat" ? '🐉 <b>พ่ายแพ้...</b> ดาเมจไม่พอโค่นมังกร คุณถูกมังกรกลืนลงท้อง!' : '🔥 <b>พ่ายแพ้...</b> ดาเมจไม่พอโค่นมังกร คุณถูกเปลวไฟมังกรเผาวอด!')) + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">ดูผลสรุป &amp; จุดที่พลาด ▶</button>' +
      '</div>';
    },

    bind: function (g) {
      var el = document.getElementById("btnNext");
      if (!el) return;
      el.onclick = DH.Game.goSummary;
      if (g.phase === "DEFEAT") K.setDashDistance();
    }
  });
})(window);
