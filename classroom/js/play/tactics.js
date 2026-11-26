// Student phone, tactic pieces (milestone 3): hearts, the monster's intent, the ultimate gauge,
// the card hand, card hints on the board, what happened this turn, and the card reward.
// Only used when the teacher left tactic cards on (the server then sends view.tac).
(function () {
  var DH = window.DH;
  function esc(s) { return DH.esc(s); }

  // In class the server owns the clock, so a couple of cards read differently.
  var CLASS_DESC = {
    freeze: "ข้อนี้ได้โบนัสความเร็วเต็มไม่ว่าจะตอบช้าแค่ไหน · แก้ทางมอนเร่งเวลา"
  };
  function cardDesc(cid) { return CLASS_DESC[cid] || DH.CARDS[cid].desc; }

  function hearts(t) {
    var s = "";
    for (var i = 0; i < t.maxHearts; i++) s += i < t.hearts ? "❤️" : "🖤";
    return '<span class="pt-hearts">' + s + (t.hearts <= 0 ? ' <b class="hud-tired" title="ดาเมจ ×0.5 จนกว่าจะใช้การ์ดฟื้นฟู">😵 หมดแรง</b>' : '') +
      (t.fortress ? ' <span title="ป้อมปราการ">🏰' + t.fortress + '</span>' : '') + '</span>';
  }

  function intentBar(t) {
    var it = t.intent;
    if (!it) return "";
    return '<div class="intent-bar ' + (it.good ? "is-good" : "is-bad") + '">' +
      '<span class="intent-ico">' + it.icon + '</span>' +
      '<span><b>มอนเตรียม: ' + esc(it.name) + '</b><br>' + esc(it.desc) + '</span></div>' +
      (t.shieldNeed ? '<div class="pt-shield">🛡️ ถ้าทั้งห้องตอบถูกอย่างน้อยครึ่ง ' + Math.round(t.shieldNeed * 100) + '% ขึ้นไป มอนทำอะไรใครไม่ได้</div>' : '');
  }

  function ultBar(t, job) {
    var u = DH.ULTIMATES[job];
    if (!u) return "";
    if (t.ultArmed) {
      return '<div class="ult-bar armed" style="--ult:' + u.color + '"><span class="ult-ico">' + u.icon + '</span><span><b>' + u.name + ' พร้อมปล่อย!</b><br>' + esc(u.desc) + '</span></div>';
    }
    var ready = t.ult >= t.ultMax, pips = "";
    for (var i = 0; i < t.ultMax; i++) pips += '<i><b style="width:' + Math.round(100 * Math.max(0, Math.min(1, t.ult - i))) + '%"></b></i>';
    return '<div class="ult-bar' + (ready ? " ready" : "") + '" style="--ult:' + u.color + '">' +
      '<span class="ult-ico">' + u.icon + '</span>' +
      '<span class="ult-info"><b>ท่าไม้ตาย: ' + u.name + '</b><span class="ult-pips">' + pips + '</span></span>' +
      (ready ? '<button type="button" class="ult-btn" id="ptUlt">⚡ ใช้!</button>' : '<span class="ult-hint">ตอบถูกเพื่อชาร์จ</span>') +
    '</div>';
  }

  function hand(t) {
    var counters = t.intent ? t.intent.counter || [] : [];
    var armed = t.armed ? '<div class="armed-card kind-' + DH.CARDS[t.armed].kind + '">✨ ใช้การ์ด ' + DH.CARDS[t.armed].icon + ' <b>' + DH.CARDS[t.armed].name + '</b> แล้ว</div>' : '';
    var msg = t.hint && t.hint.kind === "msg" ? '<div class="card-msg">' + esc(t.hint.text) + '</div>' : '';
    var xray = t.hint && t.hint.kind === "xray"
      ? '<div class="card-msg xray">🔍 เอ็กซ์เรย์: ' + (t.hint.view !== "all" ? 'ในมุมโฟกัส ' + t.hint.view + ' ' : '') + 'มีแรง ' + esc(forceName(t.hint.force)) + ' ทิศ ' + t.hint.angle + '°' + (t.hint.view === "all" ? ' (ลูกศรจางบนกระดาน)' : '') + '</div>' : '';
    var retry = t.retry ? '<div class="pt-retry">🔁 โอกาสที่สอง! ยังไม่ถูกที่: <b>' + t.retry.map(esc).join(", ") + '</b> · แก้แล้วส่งใหม่ได้เลย</div>' : '';
    if (!t.cards.length) return armed + msg + xray + retry + '<div class="hand-head">🃏 ไม่มีการ์ดในมือ <span>ปราบมอนเพื่อเลือกการ์ดใหม่</span></div>';
    return armed + msg + xray + retry +
      '<div class="hand-head">🃏 การ์ดของคุณ <span>แตะ 1 ใบก่อนส่งคำตอบ</span></div><div class="cards-tray">' +
      t.cards.map(function (cid, i) {
        var c = DH.CARDS[cid], isCounter = !t.armed && counters.indexOf(cid) >= 0;
        return '<button type="button" class="card-pill kind-' + c.kind + ' card-' + cid + (isCounter ? " is-counter" : "") + '" data-card="' + i + '" data-cid="' + cid + '"' + (t.armed ? " disabled" : "") + '>' +
          (isCounter ? '<span class="counter-tag">แก้ทาง!</span>' : '') +
          '<div class="card-name">' + c.icon + ' <b>' + c.name + '</b></div><div class="card-desc">' + esc(cardDesc(cid)) + '</div></button>';
      }).join("") + '</div>';
  }

  function forceName(k) { return (DH.FORCES[k] && DH.FORCES[k].n) || k; }

  // Extra options for FBD.mount from the card the student played.
  function boardOpts(t, q) {
    var o = {};
    var h = t.hint;
    if (h && h.kind === "xray" && h.view === "all") o.overlayArrows = [{ force: h.force, angle: h.angle, opacity: 0.55 }];
    if (h && h.kind === "cut") {
      // the board only needs the expected force names to hide the decoys
      var ex = {};
      Object.keys(h.keys).forEach(function (v) { ex[v] = h.keys[v].map(function (k) { return [k, null]; }); });
      q.ex = Array.isArray(q.ex) || !q.ex ? ex.all || [] : ex;
      o.hideDecoys = true;
    }
    if (h && h.kind === "protractor") {
      var g = [{ angle: 0, label: "0°", color: "#94a3b8" }, { angle: 90, label: "90°", color: "#94a3b8" }];
      if (q.ia) { g.push({ angle: q.ia, label: "θ=" + q.ia + "°", color: "#fbbf24" }); g.push({ angle: 90 + q.ia, label: (90 + q.ia) + "°", color: "#fbbf24" }); }
      (q.rp || []).forEach(function (a) { if (g.every(function (x) { return x.angle !== a; })) g.push({ angle: a, label: a + "°", color: "#c084fc" }); });
      o.angleGuides = g;
    }
    return o;
  }

  // What the cards, the intent and the class did to you this turn.
  function revealLog(t, job) {
    var L = t.last, R = t.round, lines = [];
    if (!L) return "";
    if (L.ult) { var u = DH.ULTIMATES[L.ult]; lines.push(u.icon + ' <b>ท่าไม้ตาย ' + u.name + '!</b>'); }
    if (L.card) lines.push(DH.CARDS[L.card].icon + ' ใช้การ์ด <b>' + DH.CARDS[L.card].name + '</b>');
    if (L.pierced) lines.push('🔨 ทะลุการ์ดของมอนได้!');
    if (R) {
      lines.push(R.shield ? '🛡️ <b>โล่ทั้งห้อง!</b> ห้องตอบถูก ' + Math.round(R.shieldPct * 100) + '% มอนทำอะไรไม่ได้'
                          : '💔 โล่ทั้งห้องไม่ขึ้น (ห้องตอบถูก ' + Math.round(R.shieldPct * 100) + '% ต้อง 70%)');
      if (R.effect && R.effect.type === "heal") lines.push('💧 ' + esc(R.effect.why) + '! มอนฟื้นเลือด +' + R.effect.amount.toLocaleString());
    }
    if (L.lost) lines.push('💥 <b>เสีย ' + L.lost + ' หัวใจ</b>' + (L.nowExhausted ? ' · 😵 หมดแรงแล้ว ดาเมจเหลือครึ่งจนกว่าจะใช้การ์ดฟื้นฟู' : ''));
    else if (L.protectedBy && L.protectedBy !== "class") lines.push({ shield: "🛡️ โล่ป้องกันไว้ ไม่เสียหัวใจ", fortress: "🏰 ป้อมปราการรับไว้", knight: "🛡️ พลังอัศวินกันข้อแรกที่ผิดไว้" }[L.protectedBy]);
    if (L.stolen) lines.push('🫳 มอนขโมยการ์ด ' + DH.CARDS[L.stolen].icon + ' ' + DH.CARDS[L.stolen].name + ' ไป!');
    if (L.exhausted && L.dmg > 0) lines.push('😵 หมดแรงอยู่ ดาเมจข้อนี้เหลือครึ่ง');
    void job;
    return '<ul class="tactic-log">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join("") + '</ul>';
  }

  function draftHtml(v) {
    if (v.draftPicked) {
      var c = DH.CARDS[v.draftPicked];
      return '<div class="draft-got">🎁 ได้รับ ' + c.icon + ' <b>' + c.name + '</b> เข้ามือแล้ว (มีการ์ด ' + v.tac.cards.length + ' ใบ)</div>';
    }
    if (!v.draft) return "";
    var full = v.tac.cards.length >= DH.HAND_MAX;
    return '<div class="draft-box"><div class="draft-title">🎁 หีบสมบัติ! เลือกการ์ด 1 ใบ' + (full ? ' <span>(มือเต็ม ใบแรกจะถูกแทน)</span>' : '') + '</div>' +
      '<div class="draft-row">' + v.draft.map(function (cid, i) {
        var c = DH.CARDS[cid];
        return '<button type="button" class="draft-card kind-' + c.kind + '" data-draft="' + cid + '" style="animation-delay:' + (i * 0.12) + 's">' +
          '<span class="draft-ico">' + c.icon + '</span><b>' + c.name + '</b><span class="draft-desc">' + esc(cardDesc(cid)) + '</span>' +
          '<span class="draft-kind">' + ({ attack: "โจมตี", defense: "ป้องกัน", study: "ช่วยคิด" })[c.kind] + '</span></button>';
      }).join("") + '</div></div>';
  }

  DH.PlayTactics = { hearts: hearts, intentBar: intentBar, ultBar: ultBar, hand: hand, boardOpts: boardOpts, revealLog: revealLog, draftHtml: draftHtml };
})();
