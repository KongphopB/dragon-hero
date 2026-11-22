// Teacher screen, damage rankings:
//   BOARD   top 10 by total damage after each battle, with how many places each moved
//   FINAL   the podium: top 5 with gold / silver / bronze frames, then the full class list
(function () {
  var DH = window.DH, K = DH.HostGame.kit;

  function move(r) {
    if (!r.move) return '<span class="hb-move">–</span>';
    return r.move > 0 ? '<span class="hb-move up">▲' + r.move + '</span>' : '<span class="hb-move down">▼' + (-r.move) + '</span>';
  }

  function head(look, job) {
    return '<span class="hb-head">' + DH.Avatar.render(look, job, { still: true }) + '</span>';
  }

  DH.HostGame.scene("BOARD", {
    enter: function (v) {
      var L = K.layer();
      L.className = "hg-layer is-dim";
      var top = (v.board[0] && v.board[0].score) || 1;
      L.innerHTML =
        '<div class="hb-card">' +
          '<div class="hb-title">🏆 อันดับดาเมจสะสม <span>หลังข้อ ' + v.qNum + '/' + v.qTotal + '</span></div>' +
          '<ol class="hb-list">' + v.board.map(function (r, i) {
            return '<li class="hb-row' + (i < 3 ? " r" + (i + 1) : "") + '" style="animation-delay:' + (i * 0.06) + 's">' +
              '<span class="hb-rank">' + r.rank + '</span>' + head(r.look, r.job) +
              '<span class="hb-name">' + K.esc(r.name) + '</span>' +
              '<span class="hb-track"><i style="width:' + Math.round(100 * r.score / top) + '%"></i></span>' +
              '<span class="hb-score">' + r.score.toLocaleString() + (r.lastDmg ? '<small>+' + r.lastDmg.toLocaleString() + '</small>' : '') + '</span>' +
              move(r) +
            '</li>';
          }).join("") + '</ol>' +
        '</div>';
      K.setButtons("▶ ข้อถัดไป (" + (v.qNum + 1) + "/" + v.qTotal + ")");
    }
  });

  DH.HostGame.scene("FINAL", {
    enter: function (v) {
      var L = K.layer();
      L.className = "hg-layer is-dim is-final";
      var b = v.board;
      var podium = [b[3], b[1], b[0], b[2], b[4]];         // 4 2 1 3 5 from left to right
      var places = [4, 2, 1, 3, 5];
      L.innerHTML =
        '<div class="hf-wrap">' +
          '<div class="hf-title">' + (v.result === "win" ? '🎉 ปราบมังกรสำเร็จ! ฮีโร่ของห้องนี้คือ…' : '🐉 มังกรยังไม่ล้ม แต่นี่คือนักสู้ที่เก่งที่สุดของห้อง') + '</div>' +
          '<div class="hf-podium">' + podium.map(function (r, i) {
            if (!r) return '<div class="hf-slot is-empty"></div>';
            var place = places[i];
            return '<div class="hf-slot p' + place + '" style="animation-delay:' + ((5 - place) * 0.35) + 's">' +
              '<div class="hf-hero rank-frame-' + Math.min(place, 4) + '">' + DH.Avatar.render(r.look, r.job, { large: place <= 3 }) + '</div>' +
              '<div class="hf-name">' + K.esc(r.name) + '</div>' +
              '<div class="hf-score">⚔️ ' + r.score.toLocaleString() + '</div>' +
              '<div class="hf-block"><span>' + (place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : place) + '</span></div>' +
            '</div>';
          }).join("") + '</div>' +
          (b.length > 5 ? '<div class="hf-rest">' + b.slice(5).map(function (r) {
            return '<span><b>' + r.rank + '</b> ' + K.esc(r.name) + ' · ' + r.score.toLocaleString() + '</span>';
          }).join("") + '</div>' : '') +
        '</div>';
      K.setButtons("📊 สรุปจุดที่ห้องพลาด ▶");
    }
  });
})();
