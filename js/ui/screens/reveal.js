// REVEAL: answer key right after submitting — damage, what the cards/intent did, per-force feedback, explanation.
(function (global) {
  var DH = global.DH;
  var K = DH.Screens.kit;

  // One line per tactic event this answer: ultimate, card played, monster intent outcome, protection.
  function revealTacticsHtml(g, r) {
    var lines = [];
    var it = DH.INTENTS[r.intent];
    if (r.ult) {
      var u = DH.ULTIMATES[r.ult];
      lines.push('<li class="tl-ult">' + u.icon + ' <b>ท่าไม้ตาย ' + u.name + '!</b>' + (r.meteor ? ' อุกกาบาต ' + r.meteor + ' ดาเมจ' : '') + '</li>');
    }
    if (r.card) lines.push('<li>' + DH.CARDS[r.card].icon + ' ใช้การ์ด <b>' + DH.CARDS[r.card].name + '</b></li>');
    if (it) {
      var msg = "";
      if (r.intent === "open") msg = r.dmg > 0 ? "มอนเปิดช่อง ดาเมจ ×1.5!" : "มอนเปิดช่อง แต่พลาดโอกาส";
      else if (r.intent === "guard") msg = r.effect && r.effect.type === "pierced" ? "ทะลุการ์ดของมอนได้!" : (r.dmg > 0 ? "มอนตั้งการ์ด ดาเมจเหลือครึ่ง" : "มอนตั้งการ์ด");
      else if (r.intent === "haste") msg = "มอนเร่งเวลา" + (r.card === "freeze" ? " แต่หยุดเวลาลบผลได้" : "");
      else if (r.intent === "heavy") msg = r.heartsLost === 2 ? "โจมตีหนัก! เสีย 2 หัวใจ" : (r.effect && r.effect.type === "blocked" ? r.effect.why : "รอดจากโจมตีหนัก");
      if (r.effect && r.effect.type === "heal") msg = r.effect.why + "! มอนฟื้นเลือด +" + r.effect.amount;
      else if (r.intent === "charge" || r.intent === "regen") msg = msg || (r.intent === "charge" ? "หยุดการชาร์จพลังได้!" : "หยุดการฟื้นตัวได้!");
      if (r.effect && r.effect.type === "stolen") msg = "มอนขโมยการ์ด " + DH.CARDS[r.effect.card].icon + " " + DH.CARDS[r.effect.card].name + " ไป!";
      else if (r.intent === "steal") msg = r.effect && r.effect.type === "blocked" ? r.effect.why : (msg || "มอนขโมยไม่สำเร็จ");
      if (msg) lines.push('<li>' + it.icon + ' ' + DH.esc(msg) + '</li>');
    }
    if (r.protectedBy === "fortress") lines.push('<li>🏰 ป้อมปราการรับไว้ (เหลือ ' + (g.fortress || 0) + ' ครั้ง)</li>');
    if (r.protectedBy === "knight") lines.push('<li>🛡️ พลังอัศวินกันข้อแรกที่ผิดไว้</li>');
    return lines.length ? '<ul class="tactic-log">' + lines.join("") + '</ul>' : "";
  }

  DH.Screens.scene("REVEAL", {
    html: function (g) {
      var r = g.lastRes;
      var good = r.acc >= 0.999;
      var partial = r.acc >= 0.5 && !good;
      var resTitle = good ? "⚔️ โจมตีเข้าเป้าเต็มแรง!" : (partial ? "🟡 โจมตีเฉียด! (" + Math.round(r.acc * 100) + "%)" : (r.outcome === "shielded" ? "🛡️ โล่ป้องกันการโจมตีไว้ได้!" : "💥 พลาดท่า! เตรียมรับการสวนกลับ"));
      return '<div class="tbar"><i id="sTimerBar" style="width:100%"></i></div>' +
        K.monsterMiniHud(g.monster) +
        '<div class="rpg-card" style="border-left:6px solid ' + (good ? "var(--ok)" : (partial ? "var(--warn)" : "var(--bad)")) + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b style="font-size:1.05rem">' + (r.timedOut ? "⏱ หมดเวลา · " : "") + resTitle + '</b>' +
            '<b style="font-size:1.15rem;color:' + (r.dmg >= 0 ? "var(--ok)" : "var(--bad)") + '">' + (r.dmg >= 0 ? "+" : "") + r.dmg + ' ดาเมจ</b>' +
          '</div>' +
          revealTacticsHtml(g, r) +
          (r.exhausted && r.dmg > 0 ? '<div class="tired-note">😵 หมดแรงอยู่ ดาเมจเหลือครึ่งเดียว · ใช้การ์ดฟื้นฟู 💚 เพื่อฟื้นหัวใจ</div>' : '') +
          (!r.exhausted && r.nowExhausted ? '<div class="tired-note">😵 หัวใจหมดแล้ว! ดาเมจจะเหลือครึ่งเดียวจนกว่าจะใช้การ์ดฟื้นฟู 💚</div>' : '') +
          (r.cardEarned ? '<div style="margin-top:6px;color:var(--gold)">🎁 Streak! ได้รับการ์ด ' + DH.CARDS[r.cardEarned].icon + ' ' + DH.CARDS[r.cardEarned].name + '</div>' : '') +
          '<div id="soloRevBoard" style="margin-top:10px"></div>' +
          '<ul class="fb-list">' + r.rows.map(function (row) {
            if (row.header) return '<li style="color:var(--accent);font-weight:800">' + DH.esc(row.header) + '</li>';
            var fn = (DH.FORCES[row.force] && DH.FORCES[row.force].n) || row.force;
            var ico = row.status === "ok" ? "✓" : "✗";
            var col = row.status === "ok" ? "#4ade80" : "#f87171";
            return '<li style="color:' + col + '">' + ico + ' ' + DH.esc(fn) + ' — ' + DH.esc(row.msg) + '</li>';
          }).join("") + '</ul>' +
          '<p style="background:var(--panel2);padding:10px;border-radius:10px;margin:8px 0;font-size:0.9rem">' + DH.esc(r.q.why).replace(/\n/g, "<br>") + '</p>' +
          '<div style="display:flex;gap:8px">' +
            '<button type="button" class="btn-sec" id="btnRevPause" style="flex:1">' + (g.revPaused ? "▶ นับเวลาต่อ" : "⏸ หยุดอ่านเฉลย") + '</button>' +
            '<button type="button" class="btn-pri" id="btnGoBattle" style="flex:1">ไปฉากต่อสู้ ▶</button>' +
          '</div>' +
        '</div>';
    },

    bind: function (g) {
      global.FBD.mount(document.getElementById("soloRevBoard"), g.lastRes.q, {
        biome: g.monster && g.monster.id,
        readOnly: true,
        initialState: g.lastRes.place,
        revealData: { revealMode: "key" }
      });
      document.getElementById("btnRevPause").onclick = DH.Game.toggleRevPause;
      document.getElementById("btnGoBattle").onclick = DH.Game.enterBattle;
    },

    timer: function (g, charDraft, txt, bar) {
      if (g.revPaused) {
        txt.textContent = "⏸ หยุดอ่านเฉลย";
        return;
      }
      txt.textContent = "⏱ ไปต่อใน " + Math.ceil(g.revLeft) + " วิ";
      if (bar) {
        bar.style.width = (100 * g.revLeft / 10) + "%";
        bar.style.background = "var(--accent)";
      }
    }
  });
})(window);
