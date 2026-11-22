// MON_DEFEAT / MON_ESCAPE: a normal monster falls (pick-1 card draft) or runs away (its HP goes to the dragon).
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;

  function draftHtml(g) {
    var full = g.cards.length >= DH.HAND_MAX;
    return '<div class="draft-box">' +
      '<div class="draft-title">🎁 หีบสมบัติ! เลือกการ์ด 1 ใบ' + (full ? ' <span>(มือเต็ม ใบแรก ' + DH.CARDS[g.cards[0]].icon + ' จะถูกแทน)</span>' : '') + '</div>' +
      '<div class="draft-row">' + g.draft.map(function (cid, i) {
        var c = DH.CARDS[cid];
        return '<button type="button" class="draft-card kind-' + c.kind + '" data-draft="' + cid + '" style="animation-delay:' + (i * 0.12) + 's">' +
          '<span class="draft-ico">' + c.icon + '</span><b>' + c.name + '</b><span class="draft-desc">' + DH.esc(c.desc) + '</span>' +
          '<span class="draft-kind">' + ({ attack: "โจมตี", defense: "ป้องกัน", study: "ช่วยคิด" })[c.kind] + '</span>' +
        '</button>';
      }).join("") + '</div>' +
    '</div>';
  }

  DH.Screens.scene(["MON_DEFEAT", "MON_ESCAPE"], {
    html: function (g, charDraft) {
      var dead = g.phase === "MON_DEFEAT";
      var m3 = g.monster;
      return '<div class="scene-stage stage-' + DH.esc(m3.id) + '">' +
        '<img class="scene-bg" src="' + DH.esc(m3.bg) + '" style="' + (dead ? "filter:brightness(0.75)" : "") + '">' +
        '<div class="actors-row">' +
          '<div class="actor-unit ' + (dead ? "anim-walk" : "") + '">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          (dead ? K.monsterHtml(m3, "anim-mon-dead") : K.monsterHtml(m3, "anim-mon-flee")) +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (dead ? "var(--ok)" : "var(--warn)") + '">' +
        '<div>' + (dead ? '💥 <b>โค่น ' + DH.esc(m3.name) + ' สำเร็จ!</b>' : '💨 <b>' + DH.esc(m3.name) + ' หนีไปได้!</b> เลือดที่เหลือ +' + m3.hp + ' HP ถูกส่งไปเพิ่มให้มังกรบอส! (รวม +' + g.bossBonusHp + ' HP)') + '</div>' +
        (dead && g.draft ? draftHtml(g) : '') +
        (dead && g.draftPicked ? '<div class="draft-got">🎁 ได้รับ ' + DH.CARDS[g.draftPicked].icon + ' <b>' + DH.CARDS[g.draftPicked].name + '</b> เข้ามือแล้ว (มีการ์ด ' + g.cards.length + ' ใบ)</div>' : '') +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%"' + (dead && g.draft ? ' disabled' : '') + '>' + (dead && g.draft ? 'เลือกการ์ดก่อนไปต่อ' : 'มุ่งหน้าสู่ด่านถัดไป ▶') + '</button>' +
      '</div>';
    },

    bind: function () {
      var el = document.getElementById("btnNext");
      if (!el) return;
      el.onclick = DH.Game.nextStage;
      document.querySelectorAll("[data-draft]").forEach(function (b) {
        b.onclick = function () { DH.Game.pickDraft(b.dataset.draft); };
      });
    }
  });
})(window);
