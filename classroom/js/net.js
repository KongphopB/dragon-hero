// Live connection to the classroom server (WebSocket /ws on the same host).
// Reconnects by itself after Wi-Fi hiccups and shows a small "reconnecting" banner meanwhile.
//   var net = DH.Net.connect({ open: fn(), message: fn(msg), ended: fn(code) });
//   net.send({ t: "..." });
(function () {
  var DH = window.DH = window.DH || {};
  // Close codes the server uses on purpose: don't reconnect after these.
  var FINAL = { 4000: "replaced", 4001: "replaced", 4002: "kicked", 4003: "closed" };

  function banner(show) {
    var b = document.getElementById("netBanner");
    if (!b) {
      b = document.createElement("div");
      b.id = "netBanner";
      b.className = "net-banner";
      b.textContent = "📶 การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่…";
      document.body.appendChild(b);
    }
    b.hidden = !show;
  }

  function connect(h) {
    var ws = null, stopped = false, tries = 0, offlineTimer = 0, queue = [];
    var url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

    function open() {
      ws = new WebSocket(url);
      ws.onopen = function () {
        tries = 0;
        clearTimeout(offlineTimer);
        offlineTimer = 0;
        banner(false);
        if (h.open) h.open();
        while (queue.length) ws.send(queue.shift());
      };
      ws.onmessage = function (e) {
        var m;
        try { m = JSON.parse(e.data); } catch (err) { return; }
        if (h.message) h.message(m);
      };
      ws.onclose = function (e) {
        if (stopped) return;
        if (FINAL[e.code]) { stopped = true; banner(false); if (h.ended) h.ended(FINAL[e.code]); return; }
        // Start the banner countdown once per outage (retries must not keep pushing it back).
        if (!offlineTimer) offlineTimer = setTimeout(function () { banner(true); }, 1200);
        var wait = Math.min(5000, 400 * Math.pow(2, tries++));
        setTimeout(function () { if (!stopped) open(); }, wait);
      };
    }

    open();
    return {
      send: function (obj) {
        var s = JSON.stringify(obj);
        if (ws && ws.readyState === 1) ws.send(s); else queue.push(s);
      },
      close: function () { stopped = true; banner(false); if (ws) ws.close(); }
    };
  }

  // Ask the server whether a room exists (used on the landing page before leaving it).
  function roomInfo(code) {
    return fetch("/api/room/" + encodeURIComponent(code), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  DH.Net = { connect: connect, roomInfo: roomInfo };
})();
