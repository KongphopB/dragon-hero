(function (global) {
  var DH = global.DH = global.DH || {};

  // Character creator. Built once; each change only redraws the pieces that depend on it,
  // so the page never jumps or flickers. Options come from js/data/avatar-catalog.js.
  var st = { tab: "race", back: false, demoTimer: null, shuffleTimer: null };
  var TABS = [
    ["race", "🧬 เผ่า"], ["face", "🙂 หน้า"], ["hair", "💇 ผม"],
    ["outfit", "👕 ชุด"], ["weapon", "⚔️ อาวุธ"], ["extra", "🎩 ของแต่ง"], ["pet", "🐾 สัตว์เลี้ยง"]
  ];
  var NUMERIC = { skin: 1, hairColor: 1, eyeColor: 1, main: 1, trim: 1 };

  function charDraft() { return DH.Game.getChar(); }

  function lookWith(patch) {
    var l = {}, cd = charDraft(), cur = cd.look;
    Object.keys(cur).forEach(function (k) { l[k] = cur[k]; });
    Object.keys(patch).forEach(function (k) {
      if (k === "weapon") {
        var nextW = {};
        if (cur.weapons) Object.keys(cur.weapons).forEach(function (j) { nextW[j] = cur.weapons[j]; });
        nextW[cd.job] = patch.weapon;
        l.weapons = nextW;
      } else {
        l[k] = patch[k];
      }
    });
    return l;
  }

  function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

  // ---------------------------------------------------------------- building blocks
  function thumb(field, value, lk, crop, label, locked) {
    var cd = charDraft();
    var curVal = field === "weapon"
      ? ((cd.look.weapons && cd.look.weapons[cd.job]) || (DH.AVATAR.weapons[cd.job] && DH.AVATAR.weapons[cd.job][0].id) || "")
      : cd.look[field];
    var on = String(curVal) === String(value);
    var lockInfo = locked ? DH.AVATAR.unlocks[locked] : null;
    return '<button type="button" class="pick-thumb ' + crop + (on ? " on" : "") + (lockInfo ? " locked" : "") + '"' +
      (lockInfo ? ' disabled title="🔒 ' + DH.esc(lockInfo.how) + '"' : ' data-f="' + field + '" data-v="' + DH.esc(value) + '"') + '>' +
      '<span class="pick-art">' + DH.Avatar.render(lk, cd.job, { still: true }) + '</span>' +
      '<span class="pick-lbl">' + (lockInfo ? "🔒 " : "") + DH.esc(label) + '</span>' +
    '</button>';
  }

  function swatches(field, list) {
    var cur = charDraft().look[field];
    return '<div class="swatch-row">' + list.map(function (c, i) {
      return '<button type="button" class="swatch' + (cur === i ? " on" : "") + '" data-f="' + field + '" data-v="' + i + '" style="background:' + rgb(c) + '" aria-label="' + field + " " + (i + 1) + '"></button>';
    }).join("") + '</div>';
  }

  function chips(field, items) {
    var cur = charDraft().look[field];
    return '<div class="chip-row">' + items.map(function (it) {
      return '<button type="button" class="chip' + (cur === it.id ? " on" : "") + '" data-f="' + field + '" data-v="' + it.id + '">' + DH.esc(it.name) + '</button>';
    }).join("") + '</div>';
  }

  function row(label, inner) {
    return '<div class="cc-row"><div class="cc-row-lbl">' + label + '</div>' + inner + '</div>';
  }

  function grid(items, cls) {
    return '<div class="pick-grid ' + (cls || "") + '">' + items.join("") + '</div>';
  }

  function locked(opt) { return opt.unlock && !DH.Unlocks.has(opt.unlock) ? opt.unlock : null; }

  // ---------------------------------------------------------------- tabs
  function tabRace() {
    var A = DH.AVATAR, cd = charDraft();
    var race = A.races.filter(function (r) { return r.id === cd.look.race; })[0] || A.races[0];
    return grid(A.races.map(function (r) {
      var v = r.variants ? r.variants[0].id : "";
      return thumb("race", r.id, lookWith({ race: r.id, raceVar: cd.look.race === r.id ? cd.look.raceVar : v, hat: "" }), "crop-head", r.icon + " " + r.name);
    }), "cols-5") +
      (race.variants ? row("แบบ", chips("raceVar", race.variants)) : "") +
      row("สีผิว", swatches("skin", DH.AVATAR_PALETTES.skin)) +
      '<div class="cc-note">เผ่าเป็นการแต่งตัวเท่านั้น ไม่มีผลต่อพลังในเกม</div>';
  }

  function tabFace() {
    var A = DH.AVATAR, cd = charDraft();
    return row("ดวงตา", grid(A.eyes.map(function (e) {
      return thumb("eyes", e.id, lookWith({ eyes: e.id, hat: "", acc: "" }), "crop-face", e.name);
    }), "cols-6")) +
      row("สีตา", swatches("eyeColor", DH.AVATAR_PALETTES.eye || [])) +
      row("ปาก", grid(A.mouths.map(function (m) {
        return thumb("mouth", m.id, lookWith({ mouth: m.id, hat: "", acc: "" }), "crop-face", m.name);
      }), "cols-5")) +
      row("แก้มแดง", '<div class="chip-row"><button type="button" class="chip' + (cd.look.blush ? " on" : "") + '" data-f="blush" data-v="1">มี</button>' +
        '<button type="button" class="chip' + (!cd.look.blush ? " on" : "") + '" data-f="blush" data-v="0">ไม่มี</button></div>') +
      row("หนวด / เครา", grid(A.beards.map(function (b) {
        return thumb("beard", b.id, lookWith({ beard: b.id, hat: "", acc: "" }), "crop-head", b.name);
      }), "cols-5"));
  }

  function tabHair() {
    return grid(DH.AVATAR.hair.map(function (h) {
      return thumb("hair", h.id, lookWith({ hair: h.id, hat: "" }), "crop-hair", h.name);
    }), "cols-5") +
      row("สีผม", swatches("hairColor", DH.AVATAR_PALETTES.hair));
  }

  function tabOutfit() {
    var cd = charDraft();
    return grid(DH.AVATAR.outfits.map(function (o) {
      return thumb("outfit", o.id, lookWith({ outfit: o.id, acc: cd.look.acc === "cape" || cd.look.acc === "wings" ? "" : cd.look.acc }), "crop-body", o.name);
    }), "cols-5") +
      '<button type="button" class="btn-sec cc-preset" data-f="preset" data-v="1">✨ ใช้ชุดตามอาชีพ (' + DH.esc(DH.JOBS[cd.job].name) + ')</button>' +
      row("สีหลัก", swatches("main", DH.AVATAR_PALETTES.cloth)) +
      row("สีรอง", swatches("trim", DH.AVATAR_PALETTES.cloth));
  }

  function tabWeapon() {
    var cd = charDraft(), jb = DH.JOBS[cd.job] || DH.JOBS.warrior;
    var list = (DH.AVATAR.weapons && DH.AVATAR.weapons[cd.job]) || [];
    return row("อาวุธประจำอาชีพ (" + jb.icon + " " + DH.esc(jb.name) + ")", grid(list.map(function (w) {
      return thumb("weapon", w.id, lookWith({ weapon: w.id }), "crop-body", w.name);
    }), "cols-4")) +
      '<div class="cc-note">ระบบจำแบบอาวุธแยกให้แต่ละอาชีพ กดเปลี่ยนอาชีพด้านบนเพื่อปรับอาวุธของอาชีพนั้นได้</div>';
  }

  function tabExtra() {
    var A = DH.AVATAR;
    return row("หมวก", grid(A.hats.map(function (h) {
      return thumb("hat", h.id, lookWith({ hat: h.id }), "crop-hat", h.name, locked(h));
    }), "cols-4")) +
      row("เครื่องประดับ", grid(A.accs.map(function (a) {
        return thumb("acc", a.id, lookWith({ acc: a.id }), a.id === "cape" || a.id === "wings" ? "crop-body" : "crop-head", a.name, locked(a));
      }), "cols-4"));
  }

  function tabPet() {
    var cd = charDraft();
    var pal = DH.Avatar.palette(cd.look, cd.job);
    return grid(DH.AVATAR.pets.map(function (p) {
      var lk = locked(p);
      var info = lk ? DH.AVATAR.unlocks[lk] : null;
      var on = cd.look.pet === p.id;
      return '<button type="button" class="pet-pick' + (on ? " on" : "") + (info ? " locked" : "") + '"' +
        (info ? ' disabled title="🔒 ' + DH.esc(info.how) + '"' : ' data-f="pet" data-v="' + p.id + '"') + '>' +
        (p.id ? '<img src="' + DH.AvatarColor.url("pet_" + p.id, pal) + '" alt="">' : '<span class="pet-none">—</span>') +
        '<span class="pick-lbl">' + (info ? "🔒 " : "") + DH.esc(p.name) + '</span></button>';
    }), "cols-6") +
      '<div class="cc-note">สัตว์เลี้ยงจะลอยอยู่ข้างตัวคุณในทุกฉาก</div>' + unlockHints();
  }

  function unlockHints() {
    var U = DH.AVATAR.unlocks;
    var items = Object.keys(U).filter(function (id) { return !DH.Unlocks.has(id); });
    if (!items.length) return '<div class="cc-note">🌟 ปลดล็อกครบทุกชิ้นแล้ว!</div>';
    return '<div class="unlock-hints"><b>🔒 ของที่ยังล็อกอยู่</b>' + items.map(function (id) {
      return '<div>' + DH.esc(U[id].name) + ': ' + DH.esc(U[id].how) + '</div>';
    }).join("") + '</div>';
  }

  var TAB_FN = { race: tabRace, face: tabFace, hair: tabHair, outfit: tabOutfit, weapon: tabWeapon, extra: tabExtra, pet: tabPet };

  // ---------------------------------------------------------------- top area
  function previewHtml() {
    var cd = charDraft();
    return '<div class="cc-actor">' + DH.Avatar.render(cd.look, cd.job, { xl: true, backView: st.back }) + '</div>';
  }

  function jobInfoHtml() {
    var j = DH.JOBS[charDraft().job] || DH.JOBS.warrior;
    var u = DH.ULTIMATES[j.id];
    return '<div class="cc-job-name">' + j.icon + ' ' + j.name + '</div>' +
      '<div class="cc-job-passive">' + DH.esc(j.passive) + '</div>' +
      '<div class="cc-job-card">การ์ดติดตัว: ' + DH.CARDS[j.startCard].icon + ' ' + DH.CARDS[j.startCard].name + '</div>' +
      (u ? '<div class="cc-job-card">ท่าไม้ตาย: ' + u.icon + ' ' + u.name + '</div>' : '');
  }

  function jobsHtml() {
    var cd = charDraft();
    return Object.keys(DH.JOBS).map(function (jk) {
      var jb = DH.JOBS[jk];
      return '<button type="button" class="job-opt ' + (cd.job === jk ? "on" : "") + '" data-job="' + jk + '">' +
        '<span class="job-thumb">' + DH.Avatar.render(cd.look, jk, { still: true }) + '</span>' +
        '<span class="job-text"><b>' + jb.icon + ' ' + jb.name + '</b>' +
        '<span class="job-passive">' + DH.esc(jb.passive) + '</span></span>' +
      '</button>';
    }).join("");
  }

  function tabsBarHtml() {
    return TABS.map(function (t) {
      return '<button type="button" class="cc-tab' + (st.tab === t[0] ? " on" : "") + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join("");
  }

  function refresh(what) {
    var $ = function (id) { return document.getElementById(id); };
    if (!$("ccPreview")) return;
    $("ccPreview").innerHTML = previewHtml();
    $("ccJobInfo").innerHTML = jobInfoHtml();
    $("ccJobs").innerHTML = jobsHtml();
    $("ccTabs").innerHTML = tabsBarHtml();
    $("ccTabBody").innerHTML = TAB_FN[st.tab]();
    var stage = $("ccStage");
    if (what !== "quiet") {
      stage.classList.remove("cc-pop");
      void stage.offsetWidth; // restart the pop animation
      stage.classList.add("cc-pop");
    }
    if (what === "job") playJobDemo(charDraft().job);
  }

  // Selecting a job shows that job's attack once, so players see what they picked.
  function playJobDemo(job) {
    var actor = document.querySelector("#ccPreview .cc-actor");
    if (!actor) return;
    clearTimeout(st.demoTimer);
    actor.className = "cc-actor actor-unit anim-atk atk-" + DH.Avatar.attackStyle(job);
    st.demoTimer = setTimeout(function () {
      if (actor.isConnected) actor.className = "cc-actor";
    }, 1000);
  }

  function resumeBannerHtml() {
    var saved = DH.Game.getSavedRun();
    if (!saved) return "";
    var sg = saved.g;
    var stg = DH.STAGES[sg.stageIdx] || {};
    var mins = Math.max(1, Math.round((Date.now() - saved.savedAt) / 60000));
    var ago = mins < 60 ? mins + " นาทีที่แล้ว" : Math.round(mins / 60) + " ชั่วโมงที่แล้ว";
    return '<div class="resume-banner" id="ccResume">' +
      '<div><b>⏸ มีเกมที่เล่นค้างไว้</b><br><span>ด่าน ' + (sg.stageIdx + 1) + '/' + DH.STAGES.length + ' · ' + DH.esc((stg.name || "").split(" (")[0]) + ' · ⚔️ ' + sg.score + ' · ' + ago + '</span></div>' +
      '<div class="resume-actions">' +
        '<button type="button" class="btn-pri" id="btnResume">▶ เล่นต่อ</button>' +
        '<button type="button" class="btn-sec" id="btnDiscard">ทิ้ง</button>' +
      '</div>' +
    '</div>';
  }

  // ---------------------------------------------------------------- applying choices
  function applyChoice(field, raw) {
    var cd = charDraft();
    var L = cd.look;
    if (field === "preset") {
      var pr = DH.AVATAR.jobPreset[cd.job] || DH.AVATAR.jobPreset.warrior;
      L.outfit = pr.outfit; L.main = pr.main; L.trim = pr.trim;
      return;
    }
    if (field === "blush") { L.blush = raw === "1"; return; }
    if (field === "weapon") { L.weapons = L.weapons || {}; L.weapons[cd.job] = raw; return; }
    var v = NUMERIC[field] ? parseInt(raw, 10) : raw;
    if (field === "race") {
      var r = DH.AVATAR.races.filter(function (x) { return x.id === v; })[0];
      if (L.race !== v) L.raceVar = r && r.variants ? r.variants[0].id : "";
      // suggest a fitting skin the first time you switch into / out of the demon race
      if (v === "demon" && L.skin < 5) L.skin = 5;
      if (v !== "demon" && L.skin >= 5) L.skin = 1;
    }
    L[field] = v;
  }

  function render() {
    var cd = charDraft();
    cd.look = DH.AVATAR.normalize(cd.look, cd.job);
    st.back = false;
    var app = document.getElementById("app");
    app.innerHTML =
      '<div class="rpg-card cc-card">' +
        '<div class="cc-head">' +
          '<h2>🐉 Dragon Hero: ผจญภัยเดี่ยว</h2>' +
          '<span><button type="button" class="btn-sec" id="btnRand">🎲 สุ่มทั้งหมด</button>' + DH.Screens.muteButtonHtml() + '</span>' +
        '</div>' +
        '<p class="cc-intro">ตั้งชื่อ เลือกอาชีพ แล้วปรับแต่งตัวละครของคุณก่อนออกเดินทาง!</p>' +
        resumeBannerHtml() +
        '<div class="cc-top">' +
          '<div class="cc-stage" id="ccStage">' +
            '<img class="cc-stage-bg" src="assets/bg/bg_plaza.webp" alt="">' +
            '<div class="cc-spot"></div>' +
            '<div id="ccPreview" style="--dash:34px"></div>' +
            '<button type="button" class="cc-turn" id="btnTurn" title="หมุนดูด้านหลัง">🔄</button>' +
          '</div>' +
          '<div class="cc-side">' +
            '<label class="cc-lbl" for="inpName">ชื่อนักผจญภัย</label>' +
            '<input id="inpName" class="cc-name" value="' + DH.esc(cd.name) + '" maxlength="18" autocomplete="off">' +
            '<div id="ccJobInfo" class="cc-job-info"></div>' +
          '</div>' +
        '</div>' +
        '<div class="cc-section">1. เลือกอาชีพ <span>แตะเพื่อดูท่าโจมตี</span></div>' +
        '<div class="job-grid" id="ccJobs"></div>' +
        '<div class="cc-section">2. ปรับแต่งตัวละคร</div>' +
        '<div class="cc-tabs" id="ccTabs" role="tablist"></div>' +
        '<div class="cust-box cc-tab-body" id="ccTabBody"></div>' +
        '<label class="cc-timed">' +
          '<input type="checkbox" id="chkTimed" ' + (cd.timed ? "checked" : "") + '> จับเวลาขณะทำโจทย์ (แนะนำ)' +
        '</label>' +
        '<button type="button" class="btn-pri" id="btnStartSolo" style="width:100%">⛲ เข้าลานน้ำพุกลางเมือง ▶</button>' +
      '</div>';

    refresh("quiet");

    if (document.getElementById("btnResume")) {
      document.getElementById("btnResume").onclick = function () { DH.Game.resumeRun(); };
      document.getElementById("btnDiscard").onclick = function () {
        DH.Game.discardSavedRun();
        var b = document.getElementById("ccResume");
        if (b) b.remove();
      };
    }

    var card = app.querySelector(".cc-card");
    card.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !card.contains(b) || b.disabled) return;
      var d = b.dataset;
      if (d.tab) { st.tab = d.tab; refresh("quiet"); return; }
      if (d.job) { cd.job = d.job; DH.Game.saveChar(); refresh("job"); return; }
      if (d.f) { applyChoice(d.f, d.v); DH.Game.saveChar(); refresh(); }
    });
    document.getElementById("btnTurn").onclick = function () { st.back = !st.back; refresh(); };
    document.getElementById("inpName").oninput = function (e) { cd.name = e.target.value; DH.Game.saveChar(); };
    document.getElementById("chkTimed").onchange = function (e) { cd.timed = e.target.checked; DH.Game.saveChar(); };
    document.getElementById("btnRand").onclick = function () {
      // Slot-machine shuffle: flick through a few random looks, then settle.
      var jks = Object.keys(DH.JOBS);
      var ticks = 0;
      clearInterval(st.shuffleTimer);
      st.back = false;
      st.shuffleTimer = setInterval(function () {
        if (!document.getElementById("ccPreview")) { clearInterval(st.shuffleTimer); return; }
        cd.job = jks[Math.floor(Math.random() * jks.length)];
        cd.look = DH.AVATAR.random(cd.job, DH.Unlocks.has);
        ticks++;
        if (ticks >= 8) {
          clearInterval(st.shuffleTimer);
          DH.Game.saveChar();
          refresh("job");
        } else {
          document.getElementById("ccPreview").innerHTML = previewHtml();
        }
      }, 80);
    };
    document.getElementById("btnStartSolo").onclick = function () {
      clearInterval(st.shuffleTimer);
      cd.name = (document.getElementById("inpName").value || "").trim() || "นักผจญภัย";
      DH.Game.saveChar();
      DH.SFX.join();
      DH.Game.enterLobby();
    };
  }

  DH.Creator = { render: render };
})(window);
