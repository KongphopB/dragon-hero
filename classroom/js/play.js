// Student phone: join the room from ?code=, make (or reuse) a character, then wait in the plaza
// until the teacher starts. The character is shared with single-player (localStorage dh_solo_char),
// so a student who already made one in solo mode only has to tap "ready".
(function () {
  var DH = window.DH;
  var code = (location.search.match(/[?&]code=(\d{6})/) || [])[1];
  if (!code) { location.replace("index.html"); return; }

  var TOKEN_KEY = "dh_cl_" + code;
  var me = null;            // last "you" from the server
  var count = 0;
  var view = "";            // "create" | "wait" | "started" | "end"
  var editing = false;      // reopened the creator from the waiting screen
  var sent = false;         // a character was just sent and we are waiting for the answer
  var net = null;

  // ---------------------------------------------------------------- character (shared with solo)
  var ch = (function () {
    var c = null;
    try { c = JSON.parse(localStorage.getItem("dh_solo_char") || "null"); } catch (e) { c = null; }
    c = c || { name: "", job: "warrior", look: null, timed: true };
    if (!DH.JOBS[c.job]) c.job = "warrior";
    c.look = DH.AVATAR.normalize(c.look, c.job);
    if (c.name === "นักผจญภัย") c.name = "";   // solo's placeholder name is not a real name
    return c;
  })();
  function saveChar() { try { localStorage.setItem("dh_solo_char", JSON.stringify(ch)); } catch (e) { /* ignore */ } }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return DH.esc(s); }
  function app() { return $("app"); }
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  // ---------------------------------------------------------------- screens
  function showCreator() {
    view = "create";
    var cls = me && me.cls ? " " + esc(me.cls) : "";
    DH.Creator.render({
      getChar: function () { return ch; },
      saveChar: saveChar,
      title: "🏰 เข้าห้อง" + cls,
      intro: editing ? "แก้ไขตัวละคร แล้วกดบันทึก ตัวละครบนจอครูจะเปลี่ยนตามทันที"
                     : "ตั้งชื่อ เลือกอาชีพ และแต่งตัวละคร แล้วกดพร้อม ตัวละครของคุณจะไปเดินในลานบนจอครู",
      startLabel: editing ? "💾 บันทึก แล้วกลับไปลานน้ำพุ" : "✅ พร้อมแล้ว! ไปที่ลานน้ำพุ",
      assetBase: "../",
      showResume: false,
      showTimed: false,
      showMute: false,
      onStart: function (cd) {
        if (!(cd.name || "").trim() || cd.name === "นักผจญภัย") {
          toast("ตั้งชื่อก่อนนะ (ชื่อนี้จะขึ้นบนจอครู)");
          var inp = $("inpName");
          if (inp) { inp.value = ""; inp.focus(); }
          return;
        }
        sent = true;
        net.send({ t: "char", name: cd.name, job: cd.job, look: cd.look });
        var b = $("btnStartSolo");
        if (b) { b.disabled = true; b.textContent = "กำลังส่ง…"; }
      }
    });
    if (!ch.name) { var inp = $("inpName"); if (inp) inp.value = ""; }
  }

  function showWait() {
    view = "wait";
    editing = false;
    var jb = DH.JOBS[me.job] || DH.JOBS.warrior;
    app().innerHTML =
      '<div class="scene-stage pl-stage">' +
        '<img class="scene-bg" src="../assets/bg/bg_plaza.webp" alt="">' +
        '<div class="scene-scrim"></div>' +
        '<div class="actors-row" style="justify-content:center;bottom:10%">' +
          '<div class="actor-unit anim-patrol"><div class="walk-flip">' + DH.Avatar.render(me.look, me.job, { walking: true, large: true }) + '</div>' +
          '<div class="actor-tag">' + esc(me.name) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="rpg-card pl-wait">' +
        '<div class="pl-ok">✅ เข้าห้อง' + (me.cls ? " <b>" + esc(me.cls) + "</b>" : "") + ' แล้ว</div>' +
        '<div class="pl-who">' + jb.icon + ' <b>' + esc(me.name) + '</b> · ' + esc(jb.name) + '</div>' +
        '<div class="pl-count" id="plCount">' + countText() + '</div>' +
        '<div class="pl-waiting">รอครูกดเริ่มผจญภัย<span class="pl-dots"><i></i><i></i><i></i></span></div>' +
        '<div class="pl-tip">ดูตัวละครของคุณเดินอยู่บนจอหน้าห้องได้เลย</div>' +
        '<button type="button" class="btn-sec" id="plEdit" style="width:100%">✏️ แก้ตัวละคร</button>' +
      '</div>';
    $("plEdit").onclick = function () {
      editing = true;
      ch.name = me.name; ch.job = me.job; ch.look = me.look;
      saveChar();
      showCreator();
    };
  }

  function countText() { return count > 1 ? "👥 ในห้องมีนักผจญภัย " + count + " คน" : "👥 คุณเป็นคนแรกในห้อง"; }

  var ENDS = {
    no_room: ["🔍", "ไม่พบห้อง " + code, "ห้องอาจปิดไปแล้ว ลองดูรหัสบนจอครูอีกครั้ง"],
    kicked: ["🚪", "ครูเชิญคุณออกจากห้อง", "ถ้าคิดว่าผิดพลาด บอกครูได้เลย"],
    closed: ["🏁", "ครูปิดห้องแล้ว", "ขอบคุณที่ร่วมผจญภัย!"],
    started: ["⏱", "ห้องนี้เริ่มเกมไปแล้ว", "เข้าห้องหลังเริ่มเกมไม่ได้ บอกครูได้เลย"],
    started_without_you: ["⏱", "ครูเริ่มเกมก่อนคุณสร้างตัวละครเสร็จ", "รอรอบถัดไป หรือบอกครูได้เลย"],
    full: ["👥", "ห้องเต็มแล้ว", "ห้องหนึ่งรับได้สูงสุด 60 คน"],
    busy: ["⚠️", "เซิร์ฟเวอร์ไม่ว่าง", "ลองใหม่อีกครั้งในอีกสักครู่"],
    replaced: ["📱", "เปิดห้องนี้อยู่ในอีกแท็บหนึ่ง", "ใช้แท็บล่าสุดเล่นต่อได้เลย"]
  };
  function showEnd(reason) {
    view = "end";
    if (net) net.close();
    if (reason === "kicked" || reason === "no_room" || reason === "closed") { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }
    var e = ENDS[reason] || ["⚠️", "เกิดข้อผิดพลาด", reason];
    app().innerHTML =
      '<div class="pl-msg rpg-card">' +
        '<div class="pl-big-ico">' + e[0] + '</div><b>' + esc(e[1]) + '</b><span>' + esc(e[2]) + '</span>' +
        '<a class="btn-sec" href="index.html" style="text-decoration:none;text-align:center">← กลับหน้าแรก</a>' +
      '</div>';
  }

  // ---------------------------------------------------------------- server
  function onYou(m) {
    var first = !me;
    me = m;
    count = m.count || count;
    if (m.phase !== "LOBBY") { view = "game"; return; }      // the game view follows right after
    if (DH.PlayGame.active()) { DH.PlayGame.reset(); view = ""; }  // teacher pressed "play again"
    if (!m.ready) { if (view !== "create") showCreator(); return; }
    // Ready: the server accepted (and maybe renamed) the character.
    // (A reconnect while editing must not throw the student out of the creator.)
    if (view === "create" && editing && !sent) return;
    sent = false;
    ch.name = m.name; ch.job = m.job; ch.look = m.look;
    saveChar();
    if (view === "create" && !first && editing) toast("บันทึกตัวละครแล้ว");
    if (view !== "wait" || first) showWait();
  }

  DH.AvatarColor.ready.then(function () {
    net = DH.Net.connect({
      open: function () {
        var tok = null;
        try { tok = localStorage.getItem(TOKEN_KEY); } catch (e) { tok = null; }
        net.send({ t: "join", code: code, token: tok });
      },
      message: function (m) {
        if (m.t === "joined") { try { localStorage.setItem(TOKEN_KEY, m.token); } catch (e) { /* ignore */ } }
        else if (m.t === "you") onYou(m);
        else if (m.t === "game") { view = "game"; DH.PlayGame.show(m, { send: net.send, me: function () { return me; } }); }
        else if (m.t === "progress") DH.PlayGame.progress(m);
        else if (m.t === "count") { count = m.count; if ($("plCount")) $("plCount").textContent = countText(); }
        else if (m.t === "char_error") {
          sent = false;
          toast(m.message);
          var b = $("btnStartSolo");
          if (b) { b.disabled = false; b.textContent = editing ? "💾 บันทึก แล้วกลับไปลานน้ำพุ" : "✅ พร้อมแล้ว! ไปที่ลานน้ำพุ"; }
        }
        else if (m.t === "error") showEnd(m.reason);
        else if (m.t === "kicked" || m.t === "closed" || m.t === "started_without_you") showEnd(m.t);
      },
      ended: function (why) { if (view !== "end") showEnd(why); }
    });
  });
})();
