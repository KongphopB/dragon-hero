// Teacher screen, story beats between questions:
//   INTRO        5 random students walk out of the town gate (camera crane, like single-player)
//   ENCOUNTER    the next monster appears; teacher starts the first question
//   MON_DEFEAT   monster falls          MON_ESCAPE  monster flees, its HP goes to the dragon
//   VICTORY      dragon falls           DEFEAT      not enough damage: eaten or burned
(function () {
  var DH = window.DH, K = DH.HostGame.kit;

  DH.HostGame.scene("INTRO", {
    ownWorld: true,
    enter: function (v) {
      var w = K.$("hgWorld");
      w.className = "hg-world scene-stage";
      w.innerHTML =
        '<div class="crane-world">' +
          '<img class="crane-bg" src="../assets/bg/bg_depart_crane.webp" alt="">' +
          (v.walkers || []).map(function (p, i) {
            return '<div class="crane-walker" style="margin-left:' + ((i - 2) * 26) + 'px;animation-delay:' + (i * 0.18) + 's">' +
              DH.Avatar.render(p.look, p.job, { walking: true, backView: true }) + '</div>';
          }).join("") +
        '</div><div class="scene-scrim"></div>';
      K.backdrop("../assets/bg/bg_depart_crane.webp");
      DH.HostGame.kit.bar(v);
      var names = (v.walkers || []).map(function (p) { return "<b>" + K.esc(p.name) + "</b>"; }).join(" · ");
      K.caption('🎬 เหล่านักผจญภัยออกจากประตูเมือง มุ่งหน้าสู่ทุ่งหญ้า…<span>' + names + (v.players > 5 ? ' และเพื่อนอีก ' + (v.players - 5) + ' คน' : '') + '</span>');
      K.setButtons("ข้ามคัตซีน ▶");
      // world must be rebuilt for the first monster afterwards
      w.dataset.k = w.dataset.k || 1;
      window.dispatchEvent(new Event("resize"));
    }
  });

  DH.HostGame.scene("ENCOUNTER", {
    ownWorld: true,
    enter: function (v) {
      var m = v.monster;
      K.world(m, v.party || [], "anim-mon-enter");
      K.caption((m.isBoss ? '🔥 <b>บอสใหญ่ปรากฏตัว!</b> ' : '⚠️ <b>พบศัตรูขวางทาง!</b> ') + K.esc(m.name) +
        '<span>HP ' + m.maxHp.toLocaleString() + ' · ต้องสู้ ' + m.count + ' ข้อ' +
        (m.isBoss && v.bossBonusHp > 0 ? ' · ได้เลือดเสริม +' + v.bossBonusHp.toLocaleString() + ' จากมอนที่หนีไป' : '') +
        ' · ทั้งห้องต้องช่วยกันตีให้หมด!</span>', m.isBoss ? "is-boss" : "");
      K.setButtons("▶ เริ่มข้อที่ " + (v.qNum + 1));
    }
  });

  DH.HostGame.scene(["MON_DEFEAT", "MON_ESCAPE"], {
    enter: function (v) {
      var dead = v.phase === "MON_DEFEAT", m = v.monster;
      K.setMonsterAnim(dead ? "anim-mon-dead" : "anim-mon-flee");
      K.caption(dead
        ? '💥 <b>โค่น ' + K.esc(m.name.split(" (")[0]) + ' สำเร็จ!</b><span>ทั้งห้องร่วมมือกันได้ยอดเยี่ยม ไปด่านต่อไปกัน</span>'
        : '💨 <b>' + K.esc(m.name.split(" (")[0]) + ' หนีไปได้!</b><span>เลือดที่เหลือ +' + m.hp.toLocaleString() + ' HP ถูกส่งไปเพิ่มให้มังกรบอส (รวม +' + v.bossBonusHp.toLocaleString() + ')</span>',
        dead ? "is-good" : "is-warn");
      K.setButtons("มุ่งหน้าสู่ด่านถัดไป ▶");
    }
  });

  DH.HostGame.scene(["VICTORY", "DEFEAT"], {
    ownWorld: true,
    enter: function (v) {
      var win = v.phase === "VICTORY", m = v.monster;
      var overlay = win ? "" : '<div class="' + (v.defeatFate === "eat" ? "dragon-eat-overlay" : "dragon-fire-overlay") + '"></div>';
      K.world(m, v.party || [], win ? "anim-mon-dead" : "anim-mon-lunge", overlay);
      var heroes = document.querySelectorAll("#hgParty .hg-hero");
      heroes.forEach(function (h) { h.classList.add(win ? "anim-walk" : "anim-hurt"); });
      K.caption(win
        ? '🎉 <b>ชัยชนะ!</b> ทั้งห้องโค่นมังกรเพลิงบรรพกาลได้สำเร็จ!<span>ไปดูว่าใครคือฮีโร่ของห้องนี้</span>'
        : (v.defeatFate === "eat" ? '🐉 <b>พ่ายแพ้…</b> ดาเมจไม่พอ ทุกคนถูกมังกรกลืนลงท้อง!' : '🔥 <b>พ่ายแพ้…</b> ดาเมจไม่พอ ทุกคนถูกเปลวไฟมังกรเผาวอด!') +
          '<span>ไม่เป็นไร มาดูกันว่าพลาดตรงไหนบ้าง</span>',
        win ? "is-good is-big" : "is-bad is-big");
      K.setButtons("🏆 ดูผลอันดับ ▶");
    }
  });
})();
