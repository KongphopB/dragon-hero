// Classroom landing: students type the room code, teachers go on to room setup.
(function () {
  var DH = window.DH;
  var input = document.getElementById("codeInput");
  var btn = document.getElementById("btnJoin");
  var hint = document.getElementById("codeHint");

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function sync() {
    var v = input.value.replace(/\D/g, "").slice(0, 6);
    if (v !== input.value) input.value = v;
    btn.disabled = v.length !== 6;
    hint.className = "cl-hint";
    hint.innerHTML = v.length && v.length < 6 ? "อีก " + (6 - v.length) + " หลัก" : "&nbsp;";
  }
  input.addEventListener("input", sync);

  // The QR on the teacher screen links to classroom/?code=123456
  var fromQr = (location.search.match(/[?&]code=(\d{6})/) || [])[1];
  if (fromQr) { input.value = fromQr; }
  sync();

  function fail(msg) {
    hint.className = "cl-hint err";
    hint.textContent = msg;
    btn.disabled = false;
    btn.textContent = "เข้าห้อง ▶";
  }

  document.getElementById("joinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    var code = input.value;
    btn.disabled = true;
    btn.textContent = "กำลังหาห้อง…";
    DH.Net.roomInfo(code).then(function (r) {
      if (!r.ok) return fail("ไม่พบห้อง " + code + " ลองดูรหัสบนจอครูอีกครั้ง");
      if (r.phase !== "LOBBY") return fail("ห้องนี้เริ่มเกมไปแล้ว บอกครูให้เปิดห้องใหม่");
      location.href = "play.html?code=" + code;
    }, function () {
      fail("ต่อเซิร์ฟเวอร์ของครูไม่ได้ ต้องเข้าผ่านลิงก์หรือ QR บนจอครู");
    });
  });

  // A few random adventurers wander across the plaza.
  DH.AvatarColor.ready.then(function () {
    var jobs = Object.keys(DH.JOBS);
    var spots = [8, 30, 56, 78];
    document.getElementById("walkers").innerHTML = spots.map(function (left, i) {
      var job = jobs[(i * 2 + 1) % jobs.length];
      var look = DH.AVATAR.random(job, function () { return false; });
      return '<div class="cl-walker" style="left:' + left + '%">' +
        '<div class="anim-patrol" style="animation-delay:-' + (i * 1.7) + 's;animation-duration:' + (5.2 + i * 0.9) + 's">' +
        '<div class="walk-flip" style="animation-delay:-' + (i * 1.7) + 's;animation-duration:' + (5.2 + i * 0.9) + 's">' +
        DH.Avatar.render(look, job, { walking: true, large: true, noPet: i % 2 === 1 }) +
        '</div></div></div>';
    }).join("");
  });

  if (!fromQr) input.focus({ preventScroll: true });
})();
