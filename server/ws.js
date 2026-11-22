// Minimal WebSocket server (RFC 6455): text messages, ping/pong, close.
// Written by hand so the classroom server needs no npm packages — a teacher only needs Node.
"use strict";
const crypto = require("crypto");

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE = 64 * 1024;   // our JSON messages are tiny; anything bigger is dropped

class Socket {
  constructor(raw, req) {
    this.raw = raw;
    this.req = req;
    this.open = true;
    this.buf = Buffer.alloc(0);
    this.fragments = [];
    this.lastSeen = Date.now();
    this.handlers = { message: [], close: [] };
    raw.setNoDelay(true);
    raw.on("data", (d) => this._onData(d));
    raw.on("close", () => this._closed());
    raw.on("error", () => this._closed());
  }

  on(ev, fn) { this.handlers[ev].push(fn); }

  send(text) {
    if (!this.open) return;
    const payload = Buffer.from(text, "utf8");
    const n = payload.length;
    let head;
    if (n < 126) head = Buffer.from([0x81, n]);
    else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(n, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
    this.raw.write(Buffer.concat([head, payload]));
  }

  sendJson(obj) { this.send(JSON.stringify(obj)); }

  ping() { if (this.open) this.raw.write(Buffer.from([0x89, 0])); }

  close(code = 1000) {
    if (!this.open) return;
    const b = Buffer.alloc(4);
    b[0] = 0x88; b[1] = 2; b.writeUInt16BE(code, 2);
    try { this.raw.write(b); } catch (e) { /* ignore */ }
    this.raw.end();
    this._closed();
  }

  _closed() {
    if (!this.open) return;
    this.open = false;
    try { this.raw.destroy(); } catch (e) { /* ignore */ }
    this.handlers.close.forEach((fn) => fn());
  }

  _onData(d) {
    this.lastSeen = Date.now();
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.open) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0;
      const op = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) {
        if (b.length < 10) return;
        const big = b.readBigUInt64BE(2);
        if (big > BigInt(MAX_MESSAGE)) return this.close(1009);
        len = Number(big); off = 10;
      }
      if (len > MAX_MESSAGE) return this.close(1009);
      if (!masked) return this.close(1002);            // clients must mask
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4);
      const data = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);

      if (op === 0x8) return this.close();
      if (op === 0x9) { this._pong(data); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x0) {
        this.fragments.push(data);
        const total = this.fragments.reduce((a, f) => a + f.length, 0);
        if (total > MAX_MESSAGE) return this.close(1009);
        if (fin) {
          const text = Buffer.concat(this.fragments).toString("utf8");
          this.fragments = [];
          this.handlers.message.forEach((fn) => fn(text));
        }
        continue;
      }
      // binary or unknown opcodes: ignore
    }
  }

  _pong(data) {
    if (!this.open || data.length > 125) return;
    this.raw.write(Buffer.concat([Buffer.from([0x8A, data.length]), data]));
  }
}

// Attach to an http.Server: calls onConnect(socket, req) for upgrades on `path`.
function attach(server, path, onConnect) {
  server.on("upgrade", (req, raw) => {
    const url = (req.url || "").split("?")[0];
    const key = req.headers["sec-websocket-key"];
    if (url !== path || !key || (req.headers.upgrade || "").toLowerCase() !== "websocket") {
      raw.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }
    const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
    raw.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
    onConnect(new Socket(raw, req), req);
  });
}

module.exports = { attach };
