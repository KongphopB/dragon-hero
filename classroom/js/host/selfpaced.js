// Teacher screen, self-paced mode (phase "SELF"): just the class's live damage ranking.
// Students play their whole adventure on their own phones; the game ends when everyone is done
// or the teacher presses "จบเกม".
(function () {
  var DH = window.DH, K = DH.HostGame.kit;

  function rows(v) {
    var top = (v.board[0] && v.board[0].score) || 1;
    return v.board.map(function (r, i) {
      var move = !r.move ? '<span class="hb-move">–</span>' : (r.move > 0 ? '<span class="hb-move up">▲' + r.move + '</span>' : '<span class="hb-move down">▼' + (-r.move) + '</span>');
      return '<li class="hb-row' + (i < 3 && r.score > 0 ? " r" + (i + 1) : "") + (r.online ? "" : " is-off") + '">' +
        '<span class="hb-rank">' + (r.rank || i + 1) + '</span>' +
        '<span class="hb-head">' + DH.Avatar.render(r.look, r.job, { still: true }) + '</span>' +
        '<span class="hb-name">' + K.esc(r.name) + (r.done ? ' <small class="hs-done" title="เล่นจบแล้ว">' + (r.won ? "🐉✅" : "✅") + '</small>' : '') + '</span>' +
        '<span class="hb-track"><i style="width:' + Math.round(100 * Math.max(0, r.score) / Math.max(1, top)) + '%"></i></span>' +
        '<span class="hb-score">' + r.score.toLocaleString() + '</span>' + move +
      '</li>';
    }).join("");
  }

  function head(v) {
    // top bar: no monster in this mode, only how many have finished
    K.$("hgStage").innerHTML = '<small>โหมด</small><b>🏃 ต่างคนต่างทำ</b>';
    var pct = v.players ? Math.round(100 * v.done / v.players) : 0;
    K.$("hgHp").innerHTML = '<div class="hg-hp-track is-done"><i style="width:' + pct + '%"></i></div><span>เล่นจบแล้ว ' + v.done + '/' + v.players + ' คน</span>';
    K.$("hgQ").innerHTML = 'คนละ <b>' + v.qTotal + '</b> ข้อ';
  }

  DH.HostGame.scene("SELF", {
    ownWorld: true,
    enter: function (v) {
      var w = K.$("hgWorld");
      w.className = "hg-world scene-stage";
      w.innerHTML = '<img class="scene-bg" src="../assets/bg/bg_plaza.webp" alt=""><div class="scene-scrim"></div>';
      K.backdrop("../assets/bg/bg_plaza.webp");
      window.dispatchEvent(new Event("resize"));
      var L = K.layer();
      L.className = "hg-layer is-dim";
      L.innerHTML = '<div class="hb-card hs-live"><div class="hb-title">🏆 อันดับดาเมจ <span>อัปเดตสด · นักเรียนเล่นบนมือถือตามจังหวะของตัวเอง</span></div><ol class="hb-list" id="hsRows"></ol></div>';
      this.update(v);
      K.setButtons("⏹ จบเกม");
    },
    update: function (v) {
      head(v);
      var list = document.getElementById("hsRows");
      if (list) list.innerHTML = rows(v);
    },
    onNext: function (v) {
      var left = v.players - v.done;
      if (confirm(left > 0 ? "จบเกมตอนนี้? ยังเล่นไม่จบอีก " + left + " คน จะหยุดตรงที่เล่นอยู่ แล้วไปดูอันดับและสรุปผล" : "ไปดูอันดับและสรุปผล?")) K.send({ t: "host:next" });
    }
  });
})();
