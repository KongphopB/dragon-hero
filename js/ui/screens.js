(function (global) {
  var DH = global.DH = global.DH || {};
  var app = null;
  var boardCtrl = null;

  function ensureApp() {
    if (!app) app = document.getElementById("app");
    return app;
  }

  function bgFilterStyle(m) {
    if (!m || !m.isBoss) return "";
    if (m.phase === 2) return "filter:sepia(0.35) saturate(1.5) hue-rotate(-18deg) brightness(0.9)";
    if (m.phase === 3) return "filter:brightness(0.62) contrast(1.15) saturate(1.25)";
    return "";
  }

  // Monster = action wrapper (enter / lunge / hurt / dead) > rig with its own idle loop > overlapping layered parts.
  function monsterObjectHtml(m, animClass, extraStyle) {
    var rig = (DH.MONSTER_RIGS && DH.MONSTER_RIGS[m.id]) || { parts: [], fx: [] };
    var fallbackSrc = DH.esc(m.sprite);
    var baseSrc = rig.baseSrc ? DH.esc(rig.baseSrc) : fallbackSrc;
    var baseClip = rig.base ? (' style="clip-path:' + rig.base + '"') : "";
    var parts = (rig.parts || []).map(function (p) {
      var pSrc = p.src ? DH.esc(p.src) : fallbackSrc;
      var st = "transform-origin:" + (p.pivot || "50% 50%") + ";z-index:" + (p.z || 3) + (p.clip ? ";clip-path:" + p.clip : "");
      return '<img class="mon-part part-' + p.name + '" src="' + pSrc + '" alt="" style="' + st + '">';
    }).join("");
    var fx = (rig.fx || []).map(function (f) {
      return '<span class="mon-fx fx-' + f.name + '" style="left:' + f.left + ';top:' + f.top + '"></span>';
    }).join("");
    var atkSeq = rig.atkSeq || [];
    var seqTag = atkSeq.length ? (" seq-" + atkSeq.length + "f") : "";
    var atkHtml = atkSeq.map(function (src, idx) {
      return '<img class="mon-atk-frame atk-f-' + idx + '" src="' + DH.esc(src) + '?v=9" alt="">';
    }).join("");
    return '<div class="monster-slot mon-' + DH.esc(m.id) + seqTag + ' ' + (animClass || "anim-mon-idle") + '" style="' + (extraStyle || "") + '">' +
      '<div class="mon-act">' +
        '<div class="monster-obj mon-rig rig-' + DH.esc(m.id) + (m.isBoss ? " is-boss phase-" + (m.phase || 1) : "") + '" role="img" aria-label="' + DH.esc(m.name) + '">' +
          '<div class="mon-idle-layer"><img class="mon-base" src="' + baseSrc + '" alt=""' + baseClip + '>' + parts + fx + '</div>' +
          atkHtml +
        '</div>' +
      '</div>' +
      '<div class="monster-shadow shadow-' + DH.esc(m.id) + '"></div>' +
    '</div>';
  }

  function hudBar(g, charDraft) {
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var hs = "";
    for (var i = 0; i < g.maxHearts; i++) hs += i < g.hearts ? "❤️" : "🖤";
    var tired = g.hearts <= 0 && g.phase !== "LOBBY";
    return '<div class="hud-strip">' +
      '<span>' + jb.icon + ' ' + DH.esc(charDraft.name) + ' ' + hs + (tired ? ' <b class="hud-tired" title="หัวใจหมด: ดาเมจ ×0.5 จนกว่าจะฟื้น">😵 หมดแรง</b>' : '') + '</span>' +
      '<span id="sTimerTxt" style="color:var(--gold)">ด่าน ' + (g.stageIdx + 1) + '/' + DH.STAGES.length + '</span>' +
      '<span style="color:var(--gold)">⚔️ ' + g.score + (g.streak >= 2 ? ' · 🔥' + g.streak : '') + muteButtonHtml() + '</span>' +
    '</div>';
  }

  function muteButtonHtml() {
    var on = DH.SFX.isEnabled();
    return '<button type="button" class="mute-btn" data-mute="1" aria-label="' + (on ? "ปิดเสียง" : "เปิดเสียง") + '" title="' + (on ? "ปิดเสียง" : "เปิดเสียง") + '">' + (on ? "🔊" : "🔇") + '</button>';
  }

  function monsterMiniHud(m) {
    var pct = Math.max(0, Math.min(100, 100 * m.hp / Math.max(1, m.maxHp)));
    var bonusHp = (DH.Game.getState() || {}).bossBonusHp || 0;
    return '<div class="mon-mini">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
        '<b style="font-size:0.95rem;color:#fef08a">' + DH.esc(m.name) + (m.isBoss ? ' (เฟส ' + m.phase + '/3)' : '') + (m.isBoss && bonusHp > 0 ? ' <span style="color:#fb923c;font-size:0.78rem">(+' + bonusHp + ' HP)</span>' : '') + '</b>' +
        '<span style="font-size:0.8rem;color:#cbd5e1;font-weight:700">HP ' + m.hp + ' / ' + m.maxHp + '</span>' +
      '</div>' +
      '<div class="hp-track"><div class="hp-fill" style="width:' + pct + '%"></div></div>' +
      targetLine(DH.Game.getState()) +
    '</div>';
  }

  // Feature 3: how much damage is still needed to finish this monster, and how hard that is.
  function targetLine(g) {
    if (!g || !g.monster) return "";
    var m = g.monster;
    var left = Math.max(0, m.count - g.qInStage + (g.phase === "QUESTION" ? 1 : 0));
    var cls, txt;
    if (m.hp <= 0) {
      cls = "ok";
      txt = "🎯 โค่นได้แล้ว!";
    } else if (left === 0) {
      cls = "bad";
      txt = "🎯 ไม่เหลือข้อให้โจมตีแล้ว (ขาดอีก " + m.hp + " ดาเมจ)";
    } else {
      var per = Math.ceil(m.hp / left);
      var hint;
      if (per <= m.baseDmg) { cls = "ok"; hint = "ตอบถูกครบก็พอ"; }
      else if (per <= Math.round(m.baseDmg * 1.5)) { cls = "warn"; hint = "ต้องตอบถูกและเร็ว"; }
      else { cls = "bad"; hint = "ต้องตอบถูกเร็ว + ใช้การ์ดดาบคู่"; }
      txt = "🎯 " + (m.isBoss ? "เป้าโค่นมังกร: " : "") + "ขาดอีก " + m.hp + " ดาเมจ ใน " + left + " ข้อ (≈" + per + "/ข้อ · " + hint + ")";
    }
    return '<div class="target-line t-' + cls + '">' + txt + '</div>';
  }

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

  // ---------- Tactic UI helpers ----------
  function intentText(id, m) {
    var it = DH.INTENTS[id];
    return it ? it.desc.replace("{X}", m ? String(m.baseDmg) : "") : "";
  }

  function intentBarHtml(g) {
    var it = DH.INTENTS[g.intent];
    if (!it) return "";
    return '<div class="intent-bar ' + (it.good ? "is-good" : "is-bad") + '">' +
      '<span class="intent-ico">' + it.icon + '</span>' +
      '<span><b>' + DH.esc(g.monster.name.split(" (")[0]) + ' เตรียม: ' + it.name + '</b><br>' + DH.esc(intentText(g.intent, g.monster)) + '</span>' +
    '</div>';
  }

  function ultBarHtml(g, charDraft) {
    var u = DH.ULTIMATES[charDraft.job];
    if (!u) return "";
    var val = g.ult || 0;
    var ready = val >= DH.ULT_MAX && !g.ultArmed;
    var pips = "";
    for (var i = 0; i < DH.ULT_MAX; i++) {
      var fill = Math.max(0, Math.min(1, val - i));
      pips += '<i><b style="width:' + Math.round(fill * 100) + '%"></b></i>';
    }
    if (g.ultArmed) {
      return '<div class="ult-bar armed" style="--ult:' + u.color + '"><span class="ult-ico">' + u.icon + '</span><span><b>' + u.name + ' พร้อมปล่อย!</b><br>' + DH.esc(u.desc) + '</span></div>';
    }
    return '<div class="ult-bar' + (ready ? " ready" : "") + '" style="--ult:' + u.color + '">' +
      '<span class="ult-ico">' + u.icon + '</span>' +
      '<span class="ult-info"><b>ท่าไม้ตาย: ' + u.name + '</b><span class="ult-pips">' + pips + '</span></span>' +
      (ready ? '<button type="button" class="ult-btn" id="btnUlt">⚡ ใช้!</button>' : '<span class="ult-hint">ตอบถูกเพื่อชาร์จ</span>') +
    '</div>';
  }

  // X-ray: the first answer arrow the player hasn't got right yet.
  function pickXray(g) {
    var q = g.curQ;
    if (g.xrayPick && g.xrayPick.q === q.id) return g.xrayPick;
    var multi = !Array.isArray(q.ex);
    var views = multi ? ["A", "B"] : ["all"];
    var place = g.draftPlace || {};
    var pick = null;
    views.some(function (v) {
      // Reveal a harder force before W: everyone knows weight points down.
      var exp = (multi ? (q.ex[v] || []) : q.ex).slice().sort(function (a, b) { return (a[0] === "W") - (b[0] === "W"); });
      return exp.some(function (e) {
        var got = place[v] && place[v][e[0]];
        var angs = got === undefined ? [] : (Array.isArray(got) ? got : [got]);
        var want = Array.isArray(e[1]) ? e[1][0] : e[1];
        var ok = angs.some(function (a) { var d = Math.abs(a - want) % 360; return Math.min(d, 360 - d) <= (q.tol || 12); });
        if (!ok) { pick = { q: q.id, view: v, force: e[0], angle: want }; return true; }
        return false;
      });
    });
    if (!pick) {
      var e0 = multi ? q.ex.A[0] : q.ex[0];
      pick = { q: q.id, view: multi ? "A" : "all", force: e0[0], angle: Array.isArray(e0[1]) ? e0[1][0] : e0[1] };
    }
    g.xrayPick = pick;
    return pick;
  }

  // Protractor: reference lines for the angles that matter in this question.
  function angleGuidesFor(q) {
    var out = [{ angle: 0, label: "0°", color: "#94a3b8" }, { angle: 90, label: "90°", color: "#94a3b8" }];
    if (q.ia) {
      out.push({ angle: q.ia, label: "θ=" + q.ia + "°", color: "#fbbf24" });
      out.push({ angle: 90 + q.ia, label: (90 + q.ia) + "°", color: "#fbbf24" });
    }
    (q.rp || []).forEach(function (a) {
      if (out.every(function (o) { return o.angle !== a; })) out.push({ angle: a, label: a + "°", color: "#c084fc" });
    });
    return out;
  }

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

  // Feature 5: how the player's mistakes changed between the first and second half of the run.
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

  function updateTimer() {
    var g = DH.Game.getState();
    var charDraft = DH.Game.getChar();
    var txt = document.getElementById("sTimerTxt");
    var bar = document.getElementById("sTimerBar");
    if (!g || !txt) return;
    if (g.phase === "INTRO") {
      if (bar) {
        bar.style.width = (100 * (7.0 - (g.introLeft || 0)) / 7.0) + "%";
        bar.style.background = "var(--gold)";
      }
      txt.textContent = "🎬 ออกเดินทาง...";
      return;
    }
    if (g.phase === "QUESTION") {
      if (!charDraft.timed) { txt.textContent = "⏱ ไม่จำกัดเวลา"; return; }
      if (g.frozenLeft > 0) {
        txt.textContent = "❄️ แช่แข็ง (" + Math.ceil(g.frozenLeft) + " วิ)";
        txt.style.color = "#38bdf8";
        return;
      }
      txt.style.color = "";
      txt.textContent = "⏱ " + Math.ceil(g.timeLeft) + " วิ";
      if (bar) {
        bar.style.width = (100 * g.timeLeft / Math.max(1, g.timeTotal)) + "%";
        bar.style.background = g.timeLeft <= 3 ? "var(--bad)" : "var(--ok)";
      }
    } else if (g.phase === "REVEAL") {
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
  }

  function render() {
    var g = DH.Game.getState();
    if (!g) { DH.Creator.render(); return; }
    var charDraft = DH.Game.getChar();
    var jb = DH.JOBS[charDraft.job] || DH.JOBS.warrior;
    var body = "";

    if (g.phase === "LOBBY") {
      body = '<div class="scene-stage">' +
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
    } else if (g.phase === "INTRO") {
      body = '<div class="tbar"><i id="sTimerBar" style="width:0%"></i></div>' +
      '<div class="scene-stage">' +
        '<div class="crane-world">' +
          '<img class="crane-bg" src="assets/bg/bg_depart_crane.webp">' +
          '<div class="crane-walker">' +
            DH.Avatar.render(charDraft.look, charDraft.job, { walking: true, backView: true }) +
          '</div>' +
        '</div>' +
        '<div class="scene-scrim"></div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>🎬 <b>' + DH.esc(charDraft.name) + ' (' + jb.name + ')</b> เดินออกจากประตูเมือง มุ่งหน้าสู่ทุ่งหญ้ากว้างใหญ่...</div>' +
        '<button class="btn-sec" id="btnNext" style="margin-top:10px;width:100%">ข้ามคัตซีน ▶</button>' +
      '</div>';
    } else if (g.phase === "ENCOUNTER") {
      var m = g.monster;
      body = '<div class="scene-stage stage-' + DH.esc(m.id) + '">' +
        '<img class="scene-bg" src="' + DH.esc(m.bg) + '" style="' + bgFilterStyle(m) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m.name) + '</div><div class="mon-sub">' + DH.esc(m.subtitle) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m.hp / m.maxHp) + '%"></div></div><div class="hp-text">HP ' + m.hp + ' / ' + m.maxHp + ' · ต้องสู้ ' + m.count + ' ข้อ' + (m.isBoss && g.bossBonusHp > 0 ? ' (เสริม +' + g.bossBonusHp + ' HP จากมอนหนี)' : '') + '</div>' + targetLine(g) + '</div>' +
        '<div class="actors-row">' +
          '<div class="actor-unit">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m, "anim-mon-enter") +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:var(--gold)">' +
        '<div>' + (m.isBoss ? '🔥 <b>บอสใหญ่ปรากฏตัว!</b> ' : '⚠️ <b>พบศัตรูขวางทาง!</b> ') + DH.esc(m.name) + (m.isBoss && g.bossBonusHp > 0 ? ' <span style="color:#fb923c">(ได้รับเลือดเสริมจากมอนที่หนี +' + g.bossBonusHp + ' HP!)</span>' : '') + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">เข้าโจมตี ⚔️</button>' +
      '</div>';
    } else if (g.phase === "QUESTION") {
      var q = g.curQ;
      var intent = DH.INTENTS[g.intent];
      var counters = intent ? intent.counter : [];
      var cardsHtml = g.cards.length ? ('<div class="hand-head">🃏 การ์ดกลยุทธ์ <span>แตะ 1 ใบก่อนส่งคำตอบ</span></div><div class="cards-tray">' +
        g.cards.map(function (cid, idx) {
          var c = DH.CARDS[cid];
          var isCounter = !g.armedCard && counters.indexOf(cid) >= 0;
          return '<button type="button" class="card-pill kind-' + c.kind + ' card-' + cid + (isCounter ? " is-counter" : "") + '" data-cardidx="' + idx + '"' + (g.armedCard ? " disabled" : "") + '>' +
            (isCounter ? '<span class="counter-tag">แก้ทาง!</span>' : '') +
            '<div class="card-name">' + c.icon + ' <b>' + c.name + '</b></div>' +
            '<div class="card-desc">' + DH.esc(c.desc) + '</div>' +
          '</button>';
        }).join("") + '</div>') : '<div class="hand-head">🃏 ไม่มีการ์ดในมือ <span>ปราบมอนเพื่อเลือกการ์ดใหม่</span></div>';

      body = '<div class="tbar"><i id="sTimerBar" style="width:100%"></i></div>' +
        monsterMiniHud(g.monster) +
        intentBarHtml(g) +
        ultBarHtml(g, charDraft) +
        (g.armedCard ? '<div class="armed-card kind-' + DH.CARDS[g.armedCard].kind + '">✨ ใช้การ์ด ' + DH.CARDS[g.armedCard].icon + ' <b>' + DH.CARDS[g.armedCard].name + '</b> แล้ว</div>' : '') +
        (g.cardMsg ? '<div class="card-msg">' + DH.esc(g.cardMsg) + '</div>' : '') +
        (g.secondChanceMsg ? '<div class="rpg-card" style="padding:8px 12px;margin-bottom:8px;border-color:#f59e0b;color:#fde047">' + DH.esc(g.secondChanceMsg) + '</div>' : '') +
        cardsHtml +
        '<div class="rpg-card rpg-panel-quest">' +
          '<div class="quest-head-bar">' +
            '<span style="font-weight:800;color:var(--gold);font-size:0.86rem">📜 ภารกิจโจมตี · ข้อ ' + g.qInStage + '/' + g.monster.count + '</span>' +
            '<div style="display:flex;gap:5px;flex-wrap:wrap"><span class="rpg-badge" style="font-size:0.75rem;padding:2px 8px">' + DH.esc(q.lv) + '</span><span class="rpg-badge" style="font-size:0.75rem;padding:2px 8px">' + DH.esc(q.tg) + '</span></div>' +
          '</div>' +
          (g.curFocus && DH.MISTAKE_META[g.curFocus] ? '<div class="focus-badge">🎯 โจทย์ฝึกจุดอ่อน: ' + DH.esc(DH.MISTAKE_META[g.curFocus].label) + '</div>' : '') +
          '<p style="font-weight:700;margin:6px 0 10px">' + DH.esc(q.t) + '</p>' +
          '<div id="soloBoard"></div>' +
          '<button type="button" class="btn-pri" id="btnSubmit" style="width:100%;margin-top:10px">⚔️ ส่งคำตอบโจมตี!</button>' +
        '</div>';
    } else if (g.phase === "REVEAL") {
      var r = g.lastRes;
      var good = r.acc >= 0.999;
      var partial = r.acc >= 0.5 && !good;
      var resTitle = good ? "⚔️ โจมตีเข้าเป้าเต็มแรง!" : (partial ? "🟡 โจมตีเฉียด! (" + Math.round(r.acc * 100) + "%)" : (r.outcome === "shielded" ? "🛡️ โล่ป้องกันการโจมตีไว้ได้!" : "💥 พลาดท่า! เตรียมรับการสวนกลับ"));
      body = '<div class="tbar"><i id="sTimerBar" style="width:100%"></i></div>' +
        monsterMiniHud(g.monster) +
        '<div class="rpg-card" style="border-left:6px solid ' + (good ? "var(--ok)" : (partial ? "var(--warn)" : "var(--bad)")) + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b style="font-size:1.05rem">' + (r.timedOut ? "⏱ หมดเวลา · " : "") + resTitle + '</b>' +
            '<b style="font-size:1.15rem;color:' + (r.dmg >= 0 ? "var(--ok)" : "var(--bad)") + '">' + (r.dmg >= 0 ? "+" : "") + r.dmg + ' ดาเมจ</b>' +
          '</div>' +
          revealTacticsHtml(g, r) +
          (r.exhausted && r.dmg > 0 ? '<div class="tired-note">😵 หมดแรงอยู่ ดาเมจเหลือครึ่งเดียว · ใช้การ์ดฟื้นฟู 💚 หรือผ่านด่านนี้เพื่อฟื้นหัวใจ</div>' : '') +
          (!r.exhausted && r.nowExhausted ? '<div class="tired-note">😵 หัวใจหมดแล้ว! ข้อต่อไปดาเมจจะเหลือครึ่งเดียวจนกว่าจะฟื้น</div>' : '') +
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
    } else if (g.phase === "BATTLE") {
      var r2 = g.lastRes;
      var out = r2.outcome;
      // A meteor still lands on a wrong answer, so the monster gets hit either way.
      var hitMon = (out === "correct" || out === "partial") || r2.meteor > 0;
      var shielded = out === "shielded";
      var atkStyle = DH.Avatar.attackStyle(charDraft.job);
      var anim = hitMon ? "anim-atk atk-" + atkStyle : (shielded ? "anim-block" : "anim-hurt");
      var monAnim = hitMon ? (g.monster.hp <= 0 ? "anim-mon-dead" : "anim-mon-hurt") : "anim-mon-lunge";
      var pop = hitMon
        ? '<div class="actor-dmg ok">+' + r2.dmg + ' ⚔️</div>'
        : (shielded ? '<div class="actor-dmg" style="color:#60a5fa">🛡️ ป้องกัน!</div>' : '<div class="actor-dmg bad">' + (r2.heartsLost ? '💥 -' + r2.heartsLost + ' ❤️' : '💥') + '</div>');
      var ultDef = r2.ult ? DH.ULTIMATES[r2.ult] : null;
      var tacticFx =
        (ultDef ? '<div class="ult-flash" style="--ult:' + ultDef.color + '"></div><div class="ult-banner" style="--ult:' + ultDef.color + '">' + ultDef.icon + ' ' + ultDef.name + '!</div>' : '') +
        (r2.meteor ? '<div class="meteor-fx"><span></span></div>' : '') +
        (r2.effect && r2.effect.type === "heal" ? '<div class="mon-heal-pop">+' + r2.effect.amount + ' 💧</div>' : '') +
        (r2.effect && r2.effect.type === "stolen" ? '<div class="steal-fx">' + DH.CARDS[r2.effect.card].icon + '</div>' : '') +
        (r2.effect && r2.effect.type === "pierced" ? '<div class="pierce-fx">🔨 ทะลุการ์ด!</div>' : '') +
        (r2.card && !ultDef ? '<div class="card-cast kind-' + DH.CARDS[r2.card].kind + '">' + DH.CARDS[r2.card].icon + '</div>' : '');
      var sparks = '<span class="flash"></span><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i>';
      // Hit effects land where the blow connects: on the monster when we hit, on the hero when it hits us.
      var m2 = g.monster;
      var isDragonAtk = !hitMon && m2.id === "dragon";
      var monSlash = !hitMon && !shielded && (m2.id === "goblin" || m2.id === "fenrir");
      var monSlam = !hitMon && !shielded && (m2.id === "slime" || m2.id === "orc");
      var dragonBreathFx = '';
      var impact = hitMon
        ? '<div class="impact-fx on-mon fx-' + atkStyle + '"><span class="slash"></span><span class="slash slash-2"></span><span class="ring"></span>' + sparks + '</div>'
        : '<div class="impact-fx on-hero' + (shielded ? ' fx-block' : '') + (monSlash ? ' fx-mon-slash' : '') + (monSlam ? ' fx-slam' : '') + (isDragonAtk && !shielded ? ' fx-dragon-fire' : '') + '">' + (monSlash ? '<span class="slash"></span><span class="slash slash-2"></span>' : '') + '<span class="ring"></span><span class="ring ring-2"></span>' + sparks + '</div>';
      body = '<div class="scene-stage stage-' + DH.esc(m2.id) + ' ' + (hitMon ? "shake-hero-hit" : (!shielded ? "shake-hit" : "")) + '">' +
        '<img class="scene-bg" src="' + DH.esc(m2.bg) + '" style="' + bgFilterStyle(m2) + '">' +
        '<div class="mon-hud"><div class="mon-title">' + DH.esc(m2.name) + '</div><div class="hp-track"><div class="hp-fill" style="width:' + (100 * m2.hp / m2.maxHp) + '%"></div></div><div class="hp-text">HP ' + m2.hp + ' / ' + m2.maxHp + '</div>' + targetLine(g) + '</div>' +
        (hitMon ? '<div class="boss-impact-zone"><div class="big-dmg-pop">-' + r2.dmg + '</div></div>' : '') +
        impact +
        tacticFx +
        (r2.phaseUp ? '<div class="phase-up-flash"></div><div class="phase-up-banner">🔥 มังกรโกรธจัด! <b>เข้าสู่เฟส ' + r2.phaseUp + '</b><span>' + (r2.phaseUp === 3 ? 'เกล็ดลุกเป็นไฟ ใกล้ล้มแล้ว สู้ต่อ!' : 'มังกรเริ่มเคลื่อนไหวเร็วขึ้น!') + '</span></div>' : '') +
        '<div class="actors-row">' +
          (hitMon && atkStyle === "ranged" ? '<span class="proj proj-' + DH.esc(charDraft.job) + '"></span>' : '') +
          dragonBreathFx +
          '<div class="actor-unit ' + anim + '">' + pop + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m2, monAnim) +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (hitMon ? "var(--ok)" : "var(--bad)") + '">' +
        '<div>' + (hitMon ? ((out === "correct" || out === "partial") ? '⚔️ <b>โจมตีสำเร็จ!</b> สร้าง ' + r2.dmg + ' ดาเมจ!' : '☄️ <b>อุกกาบาตถล่ม!</b> แม้ตอบพลาดก็ยังสร้าง ' + r2.dmg + ' ดาเมจ') : (out === "shielded" ? '🛡️ <b>ป้องกันไว้ได้!</b> ไม่เสียหัวใจและไม่เสีย Streak' : '💥 <b>ถูกมอนสเตอร์สวนกลับ!</b>')) + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">ดำเนินการต่อ ▶</button>' +
      '</div>';
    } else if (g.phase === "MON_DEFEAT" || g.phase === "MON_ESCAPE") {
      var dead = g.phase === "MON_DEFEAT";
      var m3 = g.monster;
      body = '<div class="scene-stage stage-' + DH.esc(m3.id) + '">' +
        '<img class="scene-bg" src="' + DH.esc(m3.bg) + '" style="' + (dead ? "filter:brightness(0.75)" : "") + '">' +
        '<div class="actors-row">' +
          '<div class="actor-unit ' + (dead ? "anim-walk" : "") + '">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          (dead ? monsterObjectHtml(m3, "anim-mon-dead") : monsterObjectHtml(m3, "anim-mon-flee")) +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (dead ? "var(--ok)" : "var(--warn)") + '">' +
        '<div>' + (dead ? '💥 <b>โค่น ' + DH.esc(m3.name) + ' สำเร็จ!</b>' : '💨 <b>' + DH.esc(m3.name) + ' หนีไปได้!</b> เลือดที่เหลือ +' + m3.hp + ' HP ถูกส่งไปเพิ่มให้มังกรบอส! (รวม +' + g.bossBonusHp + ' HP)') + '</div>' +
        (dead && g.draft ? draftHtml(g) : '') +
        (dead && g.draftPicked ? '<div class="draft-got">🎁 ได้รับ ' + DH.CARDS[g.draftPicked].icon + ' <b>' + DH.CARDS[g.draftPicked].name + '</b> เข้ามือแล้ว (มีการ์ด ' + g.cards.length + ' ใบ)</div>' : '') +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%"' + (dead && g.draft ? ' disabled' : '') + '>' + (dead && g.draft ? 'เลือกการ์ดก่อนไปต่อ' : 'มุ่งหน้าสู่ด่านถัดไป ▶') + '</button>' +
      '</div>';
    } else if (g.phase === "VICTORY" || g.phase === "DEFEAT") {
      var win = g.phase === "VICTORY";
      var m4 = g.monster;
      body = '<div class="scene-stage stage-dragon">' +
        '<img class="scene-bg" src="assets/bg/bg_dragon.webp" style="' + (win ? "filter:brightness(0.95)" : "filter:brightness(0.65) saturate(1.3)") + '">' +
        (!win ? '<div class="' + (g.defeatFate === "eat" ? "dragon-eat-overlay" : "dragon-fire-overlay") + '"></div>' : '') +
        '<div class="actors-row">' +
          '<div class="actor-unit ' + (win ? "anim-walk" : "anim-hurt") + '">' + DH.Avatar.render(charDraft.look, charDraft.job) + '<div class="actor-tag">' + DH.esc(charDraft.name) + '</div></div>' +
          monsterObjectHtml(m4, win ? "anim-mon-dead" : "anim-mon-lunge") +
        '</div>' +
      '</div>' +
      '<div class="rpg-card" style="text-align:center;margin-top:10px;border-color:' + (win ? "#4ade80" : "#ef4444") + '">' +
        '<div>' + (win ? '🎉 <b>ชัยชนะอันยิ่งใหญ่!</b> คุณโค่นมังกรเพลิงบรรพกาลสำเร็จแล้ว!' : (g.defeatFate === "eat" ? '🐉 <b>พ่ายแพ้...</b> ดาเมจไม่พอโค่นมังกร คุณถูกมังกรกลืนลงท้อง!' : '🔥 <b>พ่ายแพ้...</b> ดาเมจไม่พอโค่นมังกร คุณถูกเปลวไฟมังกรเผาวอด!')) + '</div>' +
        '<button class="btn-pri" id="btnNext" style="margin-top:10px;width:100%">ดูผลสรุป &amp; จุดที่พลาด ▶</button>' +
      '</div>';
    } else if (g.phase === "SUMMARY") {
      var avgAcc = Math.round(100 * g.accSum / Math.max(1, g.qTotal));
      var tier = avgAcc >= 85 ? 1 : (avgAcc >= 65 ? 2 : (avgAcc >= 45 ? 3 : 0));
      var medal = tier === 1 ? "🥇 กรอบทอง! จอมปราชญ์ฟิสิกส์" : (tier === 2 ? "🥈 กรอบเงิน! ผู้กล้าชำนาญศึก" : (tier === 3 ? "🥉 กรอบทองแดง! นักผจญภัยฝึกหัด" : "⚔️ จบการผจญภัย"));
      var mList = Object.keys(g.mistakes).map(function (c) { return [c, g.mistakes[c]]; }).sort(function (a, b) { return b[1] - a[1]; });
      body = '<div class="rpg-card ' + (tier ? "rank-frame-" + tier : "") + '" style="text-align:center;margin-bottom:12px">' +
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
    }

    ensureApp().innerHTML = hudBar(g, charDraft) + body;
    bindPhase(g);
  }

  // Melee dashes and monster lunges should close the actual gap between the two, whatever the screen width.
  function setDashDistance() {
    var stage = document.querySelector(".scene-stage");
    var row = document.querySelector(".actors-row");
    var hero = row && row.querySelector(".avatar-stack");
    var mon = row && row.querySelector(".monster-obj");
    if (!hero || !mon || !stage) return;
    var stR = stage.getBoundingClientRect();
    var rowR = row.getBoundingClientRect();
    var hR = hero.getBoundingClientRect();
    var mR = mon.getBoundingClientRect();
    var gap = mR.left - hR.right;
    var dashY = Math.round((mR.top + mR.height * 0.55) - (hR.top + hR.height * 0.50));
    stage.style.setProperty("--dash", Math.max(30, Math.round(gap + 12)) + "px");
    stage.style.setProperty("--dash-y", dashY + "px");
    stage.style.setProperty("--hero-fx-x", Math.round(hR.left + hR.width * 0.55 - stR.left) + "px");
    stage.style.setProperty("--hero-fx-y", Math.round(hR.top + hR.height * 0.50 - stR.top) + "px");
    stage.style.setProperty("--mon-fx-x", Math.round(mR.left + mR.width * 0.42 - stR.left) + "px");
    stage.style.setProperty("--mon-fx-y", Math.round(mR.top + mR.height * 0.50 - stR.top) + "px");

    var mouth = mon.querySelector(".fx-fire-glow");
    var mPt = mouth ? mouth.getBoundingClientRect() : null;
    var mx = mPt ? (mPt.left + mPt.width / 2 - rowR.left - 8) : (mR.left + mR.width * 0.16 - rowR.left);
    var my = mPt ? (mPt.top + mPt.height / 2 - rowR.top + 4) : (mR.top + mR.height * 0.70 - rowR.top);
    var hx = hR.left + hR.width * 0.52 - rowR.left;
    var hy = hR.top + hR.height * 0.50 - rowR.top;
    var dx = hx - mx;
    var dy = hy - my;
    row.style.setProperty("--mouth-x", Math.round(mx) + "px");
    row.style.setProperty("--mouth-y", Math.round(my) + "px");
    row.style.setProperty("--fire-dx", Math.round(dx) + "px");
    row.style.setProperty("--fire-dy", Math.round(dy) + "px");
    row.style.setProperty("--fire-dist", Math.round(Math.hypot(dx, dy)) + "px");
    row.style.setProperty("--fire-ang", (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + "deg");
  }

  function bindPhase(g) {
    var el;
    if (g.phase === "LOBBY") {
      document.getElementById("btnEditChar").onclick = DH.Game.resetToCreate;
      document.getElementById("btnDepart").onclick = function () { DH.Game.newRun(0); };
      document.getElementById("btnTutorial").onclick = function () { DH.Tutorial.open(); };
    } else if (g.phase === "INTRO" && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.enterEncounter;
    else if (g.phase === "ENCOUNTER" && (el = document.getElementById("btnNext"))) el.onclick = DH.Game.startQuestion;
    else if (g.phase === "QUESTION") {
      var aid = { overlayArrows: [], hideDecoys: g.armedCard === "cut", angleGuides: g.armedCard === "protractor" ? angleGuidesFor(g.curQ) : [] };
      g.xrayText = "";
      if (g.armedCard === "xray") {
        var xp = pickXray(g);
        var fnm = (DH.FORCES[xp.force] && DH.FORCES[xp.force].n) || xp.force;
        if (xp.view === "all") aid.overlayArrows = [{ force: xp.force, angle: xp.angle, opacity: 0.55 }];
        g.xrayText = "🔍 เอ็กซ์เรย์: " + (xp.view === "all" ? "" : "ในมุมโฟกัส " + xp.view + " ") + "มีแรง " + fnm + " ทิศ " + xp.angle + "°" + (xp.view === "all" ? " (ลูกศรจางบนกระดาน)" : "");
        var xt = document.querySelector(".card-msg.xray");
        if (!xt) {
          var holder = document.createElement("div");
          holder.className = "card-msg xray";
          holder.textContent = g.xrayText;
          var board0 = document.getElementById("soloBoard");
          board0.parentNode.insertBefore(holder, board0);
        }
      }
      boardCtrl = global.FBD.mount(document.getElementById("soloBoard"), g.curQ, {
        biome: g.monster && g.monster.id,
        initialState: Object.keys(g.draftPlace).length ? g.draftPlace : undefined,
        overlayArrows: aid.overlayArrows,
        hideDecoys: aid.hideDecoys,
        angleGuides: aid.angleGuides,
        onChange: function (st) { g.draftPlace = st; }
      });
      if ((el = document.getElementById("btnUlt"))) el.onclick = DH.Game.useUltimate;
      document.querySelectorAll("[data-cardidx]").forEach(function (btn) {
        btn.onclick = function () { DH.Game.useCard(+btn.dataset.cardidx); };
      });
      document.getElementById("btnSubmit").onclick = function () {
        var place = boardCtrl ? boardCtrl.getState() : g.draftPlace;
        DH.Game.submitAnswer(false, place);
      };
    } else if (g.phase === "REVEAL") {
      global.FBD.mount(document.getElementById("soloRevBoard"), g.lastRes.q, {
        biome: g.monster && g.monster.id,
        readOnly: true,
        initialState: g.lastRes.place,
        revealData: { revealMode: "key" }
      });
      document.getElementById("btnRevPause").onclick = DH.Game.toggleRevPause;
      document.getElementById("btnGoBattle").onclick = DH.Game.enterBattle;
    } else if (g.phase === "BATTLE" && (el = document.getElementById("btnNext"))) {
      el.onclick = DH.Game.afterBattle;
      setDashDistance();
    }
    else if ((g.phase === "MON_DEFEAT" || g.phase === "MON_ESCAPE") && (el = document.getElementById("btnNext"))) {
      el.onclick = DH.Game.nextStage;
      document.querySelectorAll("[data-draft]").forEach(function (b) {
        b.onclick = function () { DH.Game.pickDraft(b.dataset.draft); };
      });
    }
    else if ((g.phase === "VICTORY" || g.phase === "DEFEAT") && (el = document.getElementById("btnNext"))) {
      el.onclick = DH.Game.goSummary;
      if (g.phase === "DEFEAT") setDashDistance();
    }
    else if (g.phase === "SUMMARY") {
      document.getElementById("btnRetryBoss").onclick = function () { DH.Game.newRun(DH.STAGES.length - 1); };
      document.getElementById("btnRestart").onclick = DH.Game.resetToCreate;
      var txt = resultText(g, DH.Game.getChar());
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
    updateTimer();
  }

  DH.Screens = {
    render: render,
    updateTimer: updateTimer,
    monsterHtml: monsterObjectHtml,
    muteButtonHtml: muteButtonHtml,
    setDashDistance: setDashDistance
  };
})(window);
