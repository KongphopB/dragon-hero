// Teacher screen, QUESTION and REVEAL: the question sits centred on top of the battlefield
// while students answer, then the same card flips to the answer key with every student's
// arrows drawn faintly underneath (feature 1). It leaves when the battle starts.
(function () {
  var DH = window.DH, K = DH.HostGame.kit;
  var showClass = true;     // teacher can hide the class arrows to talk through the key alone

  function head(v, extra) {
    var q = v.q;
    return '<div class="hq-head">' +
      '<span class="hq-num">📜 ข้อ ' + v.qNum + '/' + v.qTotal + '</span>' +
      '<span class="su-chip">' + K.esc(q.lv) + '</span><span class="su-chip">' + K.esc(q.tg) + '</span>' +
      (v.focus && v.focus.label ? '<span class="hq-focus">🎯 ฝึกจุดที่ห้องพลาดบ่อย: ' + K.esc(v.focus.label) + '</span>' : '') +
      (extra || "") +
    '</div>';
  }

  function progressHtml(v) {
    var pct = v.players ? Math.round(100 * v.answered / v.players) : 0;
    return '<div class="hq-progress"><div class="hq-ptrack"><i style="width:' + pct + '%"></i></div>' +
      '<b>ส่งแล้ว ' + v.answered + '/' + v.players + '</b></div>';
  }

  function timerHtml(v) {
    if (!v.timeTotal) return '<div class="hq-timer is-untimed">⏱ ไม่จับเวลา</div>';
    return '<div class="hq-timer" id="hqTimer"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="t-bg"/><circle cx="22" cy="22" r="19" class="t-fg" id="hqRing"/></svg><b id="hqSec"></b></div>';
  }

  function mountBoard(el, q, opts) {
    window.FBD.mount(el, q, Object.assign({ readOnly: true, biome: K.view().monster && K.view().monster.id }, opts || {}));
  }

  // ---------------------------------------------------------------- QUESTION
  DH.HostGame.scene("QUESTION", {
    enter: function (v) {
      var L = K.layer();
      L.className = "hg-layer is-dim";
      L.innerHTML =
        '<div class="hq-card" id="hqCard">' +
          head(v, timerHtml(v)) +
          '<div class="hq-body">' +
            '<div class="hq-text"><p>' + K.esc(v.q.t) + '</p>' +
              '<div id="hqProg">' + progressHtml(v) + '</div>' +
              '<div class="hq-hint">นักเรียนวาดแรงบนมือถือ · ครบทุกคนแล้วจะเฉลยเอง</div>' +
            '</div>' +
            '<div class="hq-board" id="hqBoard"></div>' +
          '</div>' +
        '</div>';
      mountBoard(document.getElementById("hqBoard"), v.q);
      K.setButtons("⏹ หมดเวลา เฉลยเลย");
    },
    update: function (v) {
      var p = document.getElementById("hqProg");
      if (p) p.innerHTML = progressHtml(v);
    },
    tick: function (v) {
      if (!v.timeTotal) return;
      var s = K.left(v.endsAt), ring = document.getElementById("hqRing"), sec = document.getElementById("hqSec");
      if (!ring) return;
      var frac = Math.max(0, Math.min(1, s / v.timeTotal));
      ring.style.strokeDashoffset = String(119.4 * (1 - frac));
      ring.classList.toggle("is-low", s <= 5);
      sec.textContent = s;
    }
  });

  // ---------------------------------------------------------------- REVEAL
  function classOverlay(v) {
    var arrows = v.reveal.arrows || {};
    var list = arrows.all || [];
    if (!list.length) return [];
    var max = list.reduce(function (a, x) { return Math.max(a, x.count); }, 1);
    return list.map(function (a) { return { force: a.force, angle: a.angle, opacity: 0.12 + 0.55 * a.count / max }; });
  }

  function statsHtml(v) {
    var r = v.reveal, n = Math.max(1, r.answered + r.noAnswer);
    var seg = function (cls, k, label) { return k ? '<i class="' + cls + '" style="flex:' + k + '" title="' + label + ' ' + k + ' คน"></i>' : ''; };
    return '<div class="hr-bar">' + seg("ok", r.full, "ถูกครบ") + seg("part", r.part, "ถูกบางส่วน") + seg("bad", r.wrong, "ผิด") + seg("none", r.noAnswer, "ไม่ได้ส่ง") + '</div>' +
      '<div class="hr-legend"><span class="ok">✓ ถูกครบ ' + r.full + '</span><span class="part">◐ บางส่วน ' + r.part + '</span><span class="bad">✗ ผิด ' + r.wrong + '</span>' +
        (r.noAnswer ? '<span class="none">… ไม่ได้ส่ง ' + r.noAnswer + '</span>' : '') + '</div>' +
      '<div class="hr-big"><b>' + Math.round(100 * r.avgAcc) + '%</b><span>ความแม่นยำเฉลี่ยของห้อง</span><b class="dmg">⚔️ ' + r.damage.toLocaleString() + '</b><span>ดาเมจรวมรอบนี้</span></div>' +
      (r.mistakes.length ? '<div class="hr-mis"><div class="hr-mis-h">⚠️ จุดที่ห้องพลาดมากที่สุด</div>' + r.mistakes.map(function (m) {
        return '<div class="hr-mis-row"><b>' + K.esc(m.label) + '</b> <span class="su-chip">' + m.count + ' คน</span><div>💡 ' + K.esc(m.tip) + '</div></div>';
      }).join("") + '</div>' : '<div class="hr-mis is-clean">🌟 ไม่มีจุดผิดซ้ำเลย</div>');
  }

  function drawRevealBoard(v) {
    var multi = !Array.isArray(v.q.ex);
    mountBoard(document.getElementById("hqBoard"), v.q, {
      initialState: {},
      revealData: { revealMode: "key" },
      hideToggle: true,
      overlayArrows: showClass && !multi ? classOverlay(v) : []
    });
  }

  DH.HostGame.scene("REVEAL", {
    enter: function (v) {
      var L = K.layer();
      L.className = "hg-layer is-dim";
      var multi = !Array.isArray(v.q.ex);
      L.innerHTML =
        '<div class="hq-card is-reveal" id="hqCard">' +
          head(v, '<span class="hq-num hq-key">✅ เฉลย</span>') +
          '<div class="hq-body">' +
            '<div class="hq-text">' + statsHtml(v) +
              '<div class="hr-why">' + K.esc(v.q.why).replace(/\n/g, "<br>") + '</div>' +
            '</div>' +
            '<div class="hq-board-wrap">' +
              '<div class="hq-board" id="hqBoard"></div>' +
              (multi ? '<div class="hq-note">โจทย์หลายวัตถุ: ลูกศรของห้องดูได้ในหน้ามือถือของแต่ละคน</div>'
                     : '<label class="hq-toggle"><input type="checkbox" id="hqShowClass"' + (showClass ? " checked" : "") + '> แสดงลูกศรที่ทั้งห้องวาด (จาง = มีคนวาดน้อย)</label>') +
            '</div>' +
          '</div>' +
        '</div>';
      drawRevealBoard(v);
      var t = document.getElementById("hqShowClass");
      if (t) t.onchange = function () { showClass = t.checked; drawRevealBoard(v); };
      K.setButtons("⚔️ ไปฉากต่อสู้ ▶");
    },
    tick: function (v) {
      if (!v.autoAt) return;
      var b = K.$("hgNext");
      if (b) b.innerHTML = "⚔️ ไปฉากต่อสู้ใน " + K.left(v.autoAt) + " ▶";
    },
    leave: function () {
      var c = document.getElementById("hqCard");
      if (c) c.classList.add("is-leaving");
    }
  });
})();
