// Lightweight QR Code Generator (Byte mode, ECC Level L, Versions 1..6)
// Outputs an SVG string for offline classroom LAN join links.
(function (global) {
  // Version specs for ECC-L: [size, dataCodewords, ecCodewordsPerBlock, numBlocks]
  var VERSIONS = [
    null,
    [21, 19, 7, 1],
    [25, 34, 10, 1],
    [29, 55, 15, 1],
    [33, 80, 20, 1],
    [37, 108, 26, 1],
    [41, 136, 18, 2],
  ];
  var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

  // GF(256) tables with primitive polynomial 0x11d
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
  }

  function rsGenerator(deg) {
    var poly = [1];
    for (var i = 0; i < deg; i++) {
      var next = new Array(poly.length + 1).fill(0);
      var factor = EXP[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    var gen = rsGenerator(ecLen);
    var res = data.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  function encodeBits(text, ver) {
    var bytes = new TextEncoder().encode(text);
    var cap = VERSIONS[ver][1];
    var bits = [];
    function pushBits(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    pushBits(0b0100, 4); // Byte mode
    pushBits(bytes.length, 8);
    for (var i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
    var maxBits = cap * 8;
    var term = Math.min(4, maxBits - bits.length);
    for (var i = 0; i < term; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    var pad = [0xec, 0x11], pi = 0;
    while (bits.length < maxBits) {
      pushBits(pad[pi++ % 2], 8);
    }
    var cw = [];
    for (var i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw.push(b);
    }
    return cw;
  }

  function buildCodewords(text) {
    var bytesLen = new TextEncoder().encode(text).length;
    var ver = 1;
    while (ver < VERSIONS.length && VERSIONS[ver][1] < bytesLen + 2) ver++;
    if (ver >= VERSIONS.length) ver = VERSIONS.length - 1;

    var spec = VERSIONS[ver];
    var data = encodeBits(text, ver);
    var ecPerBlock = spec[2], blocks = spec[3];
    var blockLen = Math.floor(data.length / blocks);
    var rem = data.length % blocks;
    var dBlocks = [], eBlocks = [], idx = 0;
    for (var b = 0; b < blocks; b++) {
      var len = blockLen + (b >= blocks - rem ? 1 : 0);
      var slice = data.slice(idx, idx + len);
      idx += len;
      dBlocks.push(slice);
      eBlocks.push(rsEncode(slice, ecPerBlock));
    }
    var finalCw = [];
    var maxD = blockLen + (rem > 0 ? 1 : 0);
    for (var i = 0; i < maxD; i++) {
      for (var b = 0; b < blocks; b++) if (i < dBlocks[b].length) finalCw.push(dBlocks[b][i]);
    }
    for (var i = 0; i < ecPerBlock; i++) {
      for (var b = 0; b < blocks; b++) finalCw.push(eBlocks[b][i]);
    }
    return { ver: ver, size: spec[0], cw: finalCw };
  }

  function makeMatrix(text) {
    var info = buildCodewords(text);
    var n = info.size, ver = info.ver;
    var mat = Array.from({ length: n }, function () { return new Array(n).fill(null); });
    var res = Array.from({ length: n }, function () { return new Array(n).fill(false); });

    function setFunc(r, c, v) {
      if (r >= 0 && r < n && c >= 0 && c < n) {
        mat[r][c] = v ? 1 : 0;
        res[r][c] = true;
      }
    }

    function finder(r0, c0) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var v = false;
          if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
            v = dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
          }
          setFunc(r0 + dr, c0 + dc, v);
        }
      }
    }

    finder(0, 0);
    finder(0, n - 7);
    finder(n - 7, 0);

    // Timing patterns
    for (var i = 8; i < n - 8; i++) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    var al = ALIGN[ver];
    for (var i = 0; i < al.length; i++) {
      for (var j = 0; j < al.length; j++) {
        var r = al[i], c = al[j];
        if (res[r][c]) continue;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            setFunc(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
          }
        }
      }
    }

    // Reserve format info + dark module
    for (var i = 0; i < 9; i++) {
      if (!res[8][i]) { mat[8][i] = 0; res[8][i] = true; }
      if (!res[i][8]) { mat[i][8] = 0; res[i][8] = true; }
    }
    for (var i = 0; i < 8; i++) {
      if (!res[8][n - 1 - i]) { mat[8][n - 1 - i] = 0; res[8][n - 1 - i] = true; }
      if (!res[n - 1 - i][8]) { mat[n - 1 - i][8] = 0; res[n - 1 - i][8] = true; }
    }
    setFunc(n - 8, 8, true);

    // Place data bits (using mask 0: (r + c) % 2 === 0 for simplicity + format ECC)
    var bits = [];
    info.cw.forEach(function (b) {
      for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    });
    var bi = 0, up = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var step = 0; step < n; step++) {
        var r = up ? n - 1 - step : step;
        for (var dc = 0; dc < 2; dc++) {
          var c = col - dc;
          if (!res[r][c]) {
            var bit = bi < bits.length ? bits[bi++] : 0;
            if ((r + c) % 2 === 0) bit ^= 1; // Mask 0
            mat[r][c] = bit;
          }
        }
      }
      up = !up;
    }

    // Format string for ECC-L (01) + Mask 0 (000) -> 111011111000100
    var fmt = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
    for (var i = 0; i <= 5; i++) mat[8][i] = fmt[i];
    mat[8][7] = fmt[6];
    mat[8][8] = fmt[7];
    mat[7][8] = fmt[8];
    for (var i = 9; i < 15; i++) mat[14 - i][8] = fmt[i];
    for (var i = 0; i < 8; i++) mat[8][n - 1 - i] = fmt[14 - i];
    for (var i = 0; i < 7; i++) mat[n - 1 - i][8] = fmt[i];

    return mat;
  }

  function toSvg(text, sizePx) {
    sizePx = sizePx || 180;
    var mat = makeMatrix(text);
    var n = mat.length;
    var pad = 2;
    var total = n + pad * 2;
    var rects = "";
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (mat[r][c]) rects += '<rect x="' + (c + pad) + '" y="' + (r + pad) + '" width="1" height="1" fill="#0f172a"/>';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + sizePx + '" height="' + sizePx + '" shape-rendering="crispEdges"><rect width="' + total + '" height="' + total + '" fill="#fff" rx="1"/>' + rects + '</svg>';
  }

  global.QRGen = { makeMatrix: makeMatrix, toSvg: toSvg };
})(window);
