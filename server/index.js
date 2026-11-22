// Dragon Hero classroom server.
//   node server/index.js          (or: npm start, or double-click start_classroom.bat)
// Serves the game files and the classroom pages, and runs live rooms over WebSocket at /ws.
// No npm packages needed. PORT env var picks the port (default 8080).
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ws = require("./ws");
const rooms = require("./rooms");
const { ROOT } = require("./shared");

const PORT = Number(process.env.PORT) || 8080;
const PUBLIC = ["classroom", "js", "css", "assets"];   // folders the browser may load
const PUBLIC_FILES = ["index.html", "preview.html"];
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

function lanAddresses() {
  const out = [];
  Object.values(os.networkInterfaces()).forEach((list) => (list || []).forEach((a) => {
    if (a.family === "IPv4" && !a.internal) out.push(a.address);
  }));
  // Usual home/school ranges first.
  return out.sort((a, b) => (/^192\.168\./.test(b) - /^192\.168\./.test(a)) || (/^10\./.test(b) - /^10\./.test(a)));
}

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function serveFile(req, res, rel) {
  const top = rel.split("/")[0];
  if (!(PUBLIC.includes(top) || PUBLIC_FILES.includes(rel))) { res.writeHead(404); return res.end("Not found"); }
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    if (st.isDirectory()) {
      if (!req.url.split("?")[0].endsWith("/")) { res.writeHead(301, { Location: "/" + rel + "/" }); return res.end(); }
      return serveFile(req, res, rel.replace(/\/$/, "") + "/index.html");
    }
    const ext = path.extname(file).toLowerCase();
    // Pages always revalidate; versioned js/css (?v=) and art can be cached.
    const cache = ext === ".html" ? "no-cache" : (req.url.includes("?v=") || top === "assets" ? "public, max-age=86400" : "no-cache");
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }

  if (url === "/") { res.writeHead(302, { Location: "/classroom/" }); return res.end(); }
  if (url === "/api/info") return sendJson(res, 200, { lan: lanAddresses(), port: PORT });
  const m = url.match(/^\/api\/room\/(\d{6})$/);
  if (m) return sendJson(res, 200, rooms.roomInfo(m[1]));
  const c = url.match(/^\/api\/room\/(\d{6})\/results\.csv$/);
  if (c) {
    const key = new URLSearchParams((req.url || "").split("?")[1] || "").get("key");
    const out = rooms.resultsCsv(c[1], key);
    if (!out) { res.writeHead(403); return res.end("Not allowed"); }
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(out.name)
    });
    return res.end(out.csv);
  }
  if (url === "/healthz") return sendJson(res, 200, { ok: true, rooms: rooms.rooms.size });

  const rel = path.posix.normalize(url).replace(/^\/+/, "");
  if (rel.includes("..")) { res.writeHead(403); return res.end(); }
  serveFile(req, res, rel);
});

ws.attach(server, "/ws", (sock) => {
  sock.on("message", (text) => rooms.handle(sock, text));
  sock.on("close", () => rooms.onClose(sock));
});

// Keep connections alive through school Wi-Fi / proxies and drop dead phones.
setInterval(() => {
  rooms.rooms.forEach((room) => {
    const all = [room.host];
    room.players.forEach((p) => all.push(p.sock));
    all.forEach((s) => {
      if (!s || !s.open) return;
      if (Date.now() - s.lastSeen > 70000) s.close(1001);
      else s.ping();
    });
  });
}, 25000).unref();

server.listen(PORT, () => {
  const lan = lanAddresses();
  console.log("\n  🐉 Dragon Hero classroom server is running\n");
  console.log("  Teacher (this computer):  http://localhost:" + PORT + "/classroom/");
  lan.forEach((ip) => console.log("  Students (same Wi-Fi):    http://" + ip + ":" + PORT + "/classroom/"));
  console.log("\n  Keep this window open during the lesson. Press Ctrl+C to stop.\n");
});
