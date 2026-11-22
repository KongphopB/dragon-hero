// SUMMARY: medal frame, common mistakes with tips, accuracy per topic, progress during the run,
// new unlocks, and the "send result to teacher" box (copy / share).
(function (global) {
  var DH = global.DH;

  function unlocksHtml(g) {
    var fresh = DH.Unlocks.evaluate(g);
    if (!fresh.length) return "";
    return '<div class="unlock-banner"><b>🔓 ปลดล็อกของใหม่!</b>' + fresh.map(function (id) {
      var u = DH.AVATAR.unlocks[id];
      return '<div>✨ ' + DH.esc(u.name) + ' <span>(' + DH.esc(u.how) + ')</span></div>';
    }).join("") + '<div class="unlock-tip">ไปเลือกใส่ได้ที่หน้าสร้างตัวละคร</div></div>';
  }

  // Plain-text result a student can paste into LINE / Google Form for the teacher.
  function resultText(g, charDraft) {
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var avgAcc = Math.round(100 * g.accSum / Math.max(1, g.qTotal));
    var outcome = g.result === "win" ? "ปราบมังกรสำเร็จ 🐉✅" : (g.result === "lose" ? "แพ้มังกร (ดาเมจไม่พอ)" : "ยังไม่ถึงมังกร");
    var mList = Object.keys(g.mistakes).map(function (c) { return [c, g.mistakes[c]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3)
      .map(function (p) { return "- " + ((DH.MISTAKE_META[p[0]] || {}).label || p[0]) + " ×" + p[1]; });
    var d = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return [
      "Dragon Hero: ผลการเล่น FBD",
      "ชื่อ: " + (charDraft.name || "-") + " (" + jb.name + ")",
      "ผล: " + outcome,
      "ดาเมจรวม: " + g.score + " · แม่นยำ " + avgAcc + "% · ทำ " + g.qTotal + " ข้อ",
      "จุดที่พลาดบ่อย:",
      mList.length ? mList.join("\n") : "- ไม่มี 🌟",
      "เวลา: " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes())
    ].join("\n");
  }

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(t).catch(function () { return legacyCopy(t); });
    }
    return legacyCopy(t);
  }

  function legacyCopy(t) {
    return new Promise(function (ok, fail) {
      var ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (e) { done = false; }
      ta.remove();
      if (done) ok(); else fail();
    });
  }

  // How the player's mistakes changed between the first and second half of the run.
  function progressHtml(g) {
    var log = g.qLog || [];
    if (!log.length) return "";
    var html = '<h4 style="margin:14px 0 6px">📈 พัฒนาการระหว่างเล่น</h4>';

    // Accuracy per stage
    var byStage = {};
    log.forEach(function (e) {
      byStage[e.stage] = byStage[e.stage] || { sum: 0, n: 0 };
      byStage[e.stage].sum += e.acc;
      byStage[e.stage].n++;
    });
    html += Object.keys(byStage).map(function (s) {
      var st = DH.STAGES[+s - 1];
      var pct = Math.round(100 * byStage[s].sum / byStage[s].n);
      var col = pct >= 80 ? "var(--ok)" : (pct >= 50 ? "var(--warn)" : "var(--bad)");
      return '<div class="prog-row"><span class="prog-lbl">ด่าน ' + s + ' · ' + DH.esc((st && st.name || "").split(" (")[0]) + '</span>' +
        '<span class="prog-track"><i style="width:' + pct + '%;background:' + col + '"></i></span><b class="prog-val">' + pct + '%</b></div>';
    }).join("");

    // Mistake trend: first half vs second half of the questions answered
    if (log.length >= 4) {
      var half = Math.floor(log.length / 2);
      var early = log.slice(0, half), late = log.slice(half);
      var count = function (arr, c) { return arr.filter(function (e) { return e.codes.indexOf(c) >= 0; }).length; };
      var rows = Object.keys(g.mistakes).map(function (c) {
        var e = count(early, c), l = count(late, c);
        var re = e / early.length, rl = l / late.length;
        var badge;
        if (e > 0 && l === 0) badge = '<span class="trend t-ok">🌟 แก้ได้แล้ว</span>';
        else if (e > 0 && rl < re) badge = '<span class="trend t-ok">✅ ดีขึ้น</span>';
        else if (e === 0 && l > 0) badge = '<span class="trend t-warn">🆕 เริ่มพลาดช่วงหลัง</span>';
        else badge = '<span class="trend t-bad">⚠️ ยังพลาดอยู่</span>';
        var meta = DH.MISTAKE_META[c] || { label: c };
        return { score: l * 10 + e, html: '<div class="trend-row"><span>' + DH.esc(meta.label) + '</span><span class="trend-nums">ครึ่งแรก ' + e + ' → ครึ่งหลัง ' + l + '</span>' + badge + '</div>' };
      }).sort(function (a, b) { return b.score - a.score; });
      if (rows.length) {
        html += '<div style="font-size:0.8rem;color:var(--mute);margin:10px 0 4px">ข้อผิดพลาดครึ่งแรก (' + early.length + ' ข้อ) เทียบกับครึ่งหลัง (' + late.length + ' ข้อ) · โจทย์ช่วงหลังยากกว่า</div>' +
          rows.map(function (r) { return r.html; }).join("");
      }
    }

    // Questions the game picked to drill a weakness
    var focus = log.filter(function (e) { return e.focus; });
    if (focus.length) {
      var fixed = focus.filter(function (e) { return e.fixedFocus; }).length;
      html += '<div class="rpg-badge" style="margin-top:10px;display:block;text-align:center">🎯 โจทย์ที่เกมเลือกมาฝึกจุดอ่อน: ไม่พลาดซ้ำ ' + fixed + '/' + focus.length + ' ข้อ</div>';
    }
    return html;
  }

  DH.Screens.scene("SUMMARY", {
    html: function (g, charDraft) {
      var avgAcc = Math.round(100 * g.accSum / Math.max(1, g.qTotal));
      var tier = avgAcc >= 85 ? 1 : (avgAcc >= 65 ? 2 : (avgAcc >= 45 ? 3 : 0));
      var medal = tier === 1 ? "🥇 กรอบทอง! จอมปราชญ์ฟิสิกส์" : (tier === 2 ? "🥈 กรอบเงิน! ผู้กล้าชำนาญศึก" : (tier === 3 ? "🥉 กรอบทองแดง! นักผจญภัยฝึกหัด" : "⚔️ จบการผจญภัย"));
      var mList = Object.keys(g.mistakes).map(function (c) { return [c, g.mistakes[c]]; }).sort(function (a, b) { return b[1] - a[1]; });
      return '<div class="rpg-card ' + (tier ? "rank-frame-" + tier : "") + '" style="text-align:center;margin-bottom:12px">' +
          '<div style="font-weight:900;font-size:1.1rem">' + medal + '</div>' +
          '<div style="display:flex;justify-content:center;margin:8px 0">' + DH.Avatar.render(charDraft.look, charDraft.job, { large: true }) + '</div>' +
          '<div style="font-size:1.5rem;font-weight:900;color:var(--gold)">' + g.score + ' ดาเมจสะสม · แม่นยำ ' + avgAcc + '%</div>' +
        '</div>' +
        '<div class="rpg-card">' +
          '<h3 style="margin:0 0 8px;color:var(--gold)">🧠 สรุปจุดที่คุณมักพลาดในเกมนี้</h3>' +
          (mList.length ? mList.slice(0, 5).map(function (pair) {
            var meta = DH.MISTAKE_META[pair[0]] || { label: pair[0], tip: "" };
            return '<div style="background:var(--panel2);padding:10px;border-radius:10px;border-left:4px solid var(--bad);margin-bottom:8px">' +
              '<b>⚠️ ' + DH.esc(meta.label) + '</b> <span class="rpg-badge" style="float:right">' + pair[1] + ' ครั้ง</span>' +
              '<div style="font-size:0.86rem;color:#cbd5e1;margin-top:4px">💡 ' + DH.esc(meta.tip) + '</div>' +
            '</div>';
          }).join("") : '<p style="color:#4ade80">🌟 ยอดเยี่ยมมาก! ไม่พบข้อผิดพลาดซ้ำเลย</p>') +
          '<h4 style="margin:12px 0 6px">📚 ความแม่นยำแยกตามเรื่อง</h4>' +
          Object.keys(g.topicStats).map(function (tp) {
            var st = g.topicStats[tp];
            return '<div style="display:flex;justify-content:space-between;font-size:0.86rem;padding:4px 0;border-bottom:1px solid var(--line)">' +
              '<span>' + DH.esc(DH.TOPIC_LABELS[tp] || tp) + '</span>' +
              '<b>' + st.ok + '/' + st.total + ' (' + Math.round(100 * st.ok / st.total) + '%)</b></div>';
          }).join("") +
          progressHtml(g) +
          unlocksHtml(g) +
          '<div class="send-teacher">' +
            '<div class="send-title">📨 ส่งผลให้ครู</div>' +
            '<pre class="send-preview" id="resultText">' + DH.esc(resultText(g, charDraft)) + '</pre>' +
            '<div style="display:flex;gap:8px">' +
              '<button type="button" class="btn-pri" id="btnCopyResult" style="flex:1">📋 คัดลอกผล</button>' +
              (navigator.share ? '<button type="button" class="btn-sec" id="btnShareResult" style="flex:1">📤 แชร์ (LINE ฯลฯ)</button>' : '') +
            '</div>' +
            '<div class="send-msg" id="copyMsg" aria-live="polite"></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-top:14px">' +
            '<button type="button" class="btn-sec" id="btnRetryBoss" style="flex:1">🐉 ท้ามังกรอีกครั้ง</button>' +
            '<button type="button" class="btn-pri" id="btnRestart" style="flex:1">🔄 เล่นใหม่ตั้งแต่ต้น</button>' +
          '</div>' +
        '</div>';
    },

    bind: function (g, charDraft) {
      var el;
      document.getElementById("btnRetryBoss").onclick = function () { DH.Game.newRun(DH.STAGES.length - 1); };
      document.getElementById("btnRestart").onclick = DH.Game.resetToCreate;
      var txt = resultText(g, charDraft);
      var msg = document.getElementById("copyMsg");
      document.getElementById("btnCopyResult").onclick = function () {
        copyText(txt).then(function () {
          msg.textContent = "✓ คัดลอกแล้ว นำไปวางในแชตหรือฟอร์มที่ครูกำหนดได้เลย";
        }, function () {
          msg.textContent = "คัดลอกอัตโนมัติไม่ได้ กดค้างที่ข้อความด้านบนเพื่อคัดลอกเอง";
        });
      };
      if ((el = document.getElementById("btnShareResult"))) {
        el.onclick = function () { navigator.share({ title: "ผล Dragon Hero", text: txt }).catch(function () {}); };
      }
    }
  });
})(window);
