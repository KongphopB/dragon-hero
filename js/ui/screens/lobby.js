// LOBBY: the hero patrols the town fountain; start the run, edit the character or open the tutorial.
(function (global) {
  var DH = global.DH;

  DH.Screens.scene("LOBBY", {
    html: function (g, charDraft) {
      var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
      return '<div class="scene-stage">' +
        '<img class="scene-bg" src="assets/bg/bg_plaza.webp">' +
        '<div class="scene-scrim"></div>' +
        '<div class="actors-row" style="justify-content:center;bottom:10%">' +
          '<div class="actor-unit anim-patrol"><div class="walk-flip">' + DH.Avatar.render(charDraft.look, charDraft.job, { walking: true }) + '</div><div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>⛲ <b>' + DH.esc(charDraft.name) + ' (' + jb.name + ')</b> กำลังเดินรออยู่ตรงลานน้ำพุกลางเมือง!</div>' +
        (DH.Tutorial.isDone()
          ? '<div style="display:flex;gap:8px;margin-top:10px">' +
              '<button class="btn-sec" id="btnEditChar" style="flex:0 0 auto">✏️ แก้ไขตัวละคร</button>' +
              '<button class="btn-pri" id="btnDepart" style="flex:1">⚔️ กดเริ่มออกเดินทาง!</button>' +
            '</div>' +
            '<button class="btn-link" id="btnTutorial">📘 ฝึกวิธีเล่นอีกครั้ง</button>'
          : '<div class="tut-invite">ครั้งแรกใช่ไหม? ลองฝึกวาด FBD 2 ข้อก่อน ไม่จับเวลา ไม่เสียหัวใจ (ประมาณ 2 นาที)</div>' +
            '<button class="btn-pri" id="btnTutorial" style="width:100%;margin-top:8px">📘 ฝึกก่อนออกเดินทาง</button>' +
            '<div style="display:flex;gap:8px;margin-top:8px">' +
              '<button class="btn-sec" id="btnEditChar" style="flex:0 0 auto">✏️ แก้ไขตัวละคร</button>' +
              '<button class="btn-sec" id="btnDepart" style="flex:1">ข้ามไปลุยเลย ▶</button>' +
            '</div>') +
      '</div>';
    },

    bind: function () {
      document.getElementById("btnEditChar").onclick = DH.Game.resetToCreate;
      document.getElementById("btnDepart").onclick = function () { DH.Game.newRun(0); };
      document.getElementById("btnTutorial").onclick = function () { DH.Tutorial.open(); };
    }
  });
})(window);
