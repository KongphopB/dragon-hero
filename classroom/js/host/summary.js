// Teacher screen, SUMMARY: what the class got wrong most (with tips), accuracy per topic,
// how each question went, the results spreadsheet, and "play again" / "close room".
(function () {
  var DH = window.DH, K = DH.HostGame.kit;

  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function color(p) { return p >= 80 ? "var(--ok)" : (p >= 50 ? "var(--warn)" : "var(--bad)"); }

  DH.HostGame.scene("SUMMARY", {
    enter: function (v) {
      var s = v.summary, c = K.ctx();
      var L = K.layer();
      L.className = "hg-layer is-dim is-scroll";
      var csvUrl = "/api/room/" + c.room.code + "/results.csv?key=" + encodeURIComponent(c.room.hostToken);
      L.innerHTML =
        '<div class="hs-card">' +
          '<div class="hs-title">📊 สรุปผลทั้งห้อง <span>' + (v.result === "win" ? "🎉 ปราบมังกรสำเร็จ" : "🐉 ยังไม่ชนะมังกร") + ' · ' + v.board.length + ' คน · ' + s.questions.length + ' ข้อ</span></div>' +
          '<div class="hs-grid">' +
            '<section><h3>🧠 จุดที่ห้องพลาดบ่อย</h3>' +
              (s.mistakes.length ? s.mistakes.map(function (m, i) {
                return '<div class="hs-mis' + (i === 0 ? " is-top" : "") + '"><b>⚠️ ' + K.esc(m.label) + '</b><span class="su-chip">' + m.count + ' ครั้ง</span><div>💡 ' + K.esc(m.tip) + '</div></div>';
              }).join("") : '<p class="hs-clean">🌟 แทบไม่มีจุดผิดซ้ำ ยอดเยี่ยมมาก!</p>') +
            '</section>' +
            '<section><h3>📚 ถูกครบแยกตามเรื่อง</h3>' +
              s.topics.map(function (t) {
                var p = pct(t.ok, t.total);
                return '<div class="hs-row"><span>' + K.esc(t.label) + '</span><span class="hs-track"><i style="width:' + p + '%;background:' + color(p) + '"></i></span><b>' + p + '%</b></div>';
              }).join("") +
              '<h3>📜 แต่ละข้อ</h3>' +
              s.questions.map(function (q) {
                var n = q.full + q.part + q.wrong + q.noAnswer, p = pct(q.full, n);
                return '<div class="hs-row hs-q" title="' + K.esc(q.t) + '"><span>ข้อ ' + q.qNum + ' · ' + K.esc(q.tg) + '</span><span class="hs-track"><i style="width:' + p + '%;background:' + color(p) + '"></i></span><b>' + p + '%</b></div>';
              }).join("") +
            '</section>' +
          '</div>' +
          '<div class="hs-actions">' +
            '<a class="btn-pri" href="' + csvUrl + '" download>📥 ดาวน์โหลดผลทั้งห้อง (CSV)</a>' +
            '<button type="button" class="btn-sec" id="hsAgain">🔁 เล่นอีกรอบ (ห้องเดิม)</button>' +
            '<button type="button" class="btn-sec lb-danger" id="hsClose">🚪 ปิดห้อง</button>' +
          '</div>' +
        '</div>';
      K.setButtons("");
      document.getElementById("hsAgain").onclick = function () { K.send({ t: "host:lobby" }); };
      document.getElementById("hsClose").onclick = function () {
        if (confirm("ปิดห้องนี้? นักเรียนทุกคนจะออกจากห้อง (ดาวน์โหลดผลก่อนได้)")) K.send({ t: "host:close" });
      };
    }
  });
})();
