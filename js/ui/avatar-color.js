(function (global) {
  var DH = global.DH = global.DH || {};

  // Recolours the generated avatar sprites at runtime. Each recolourable pixel in a sprite holds a
  // "key" colour (material + shade level); we swap it for the player's colour ramp.
  // ramp() mirrors tools/avatar/shade.py so the game matches the generator previews.

  var keyLut = {};          // packed rgb -> [material, level]
  Object.keys(DH.AVATAR_KEYS).forEach(function (m) {
    DH.AVATAR_KEYS[m].forEach(function (c, i) { keyLut[(c[0] << 16) | (c[1] << 8) | c[2]] = [m, i]; });
  });

  var sprites = {};         // name -> { w, h, data: Uint8ClampedArray, mats: [...] }
  var cache = {};
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });

  function mod1(x) { return ((x % 1) + 1) % 1; }

  function rgbToHsv(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = mod1((g - b) / d / 6);
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, mx ? d / mx : 0, mx];
  }

  function hsvToRgb(h, s, v) {
    var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    switch (((i % 6) + 6) % 6) {
      case 0: return [v, t, p];
      case 1: return [q, v, p];
      case 2: return [p, v, t];
      case 3: return [p, q, v];
      case 4: return [t, p, v];
      default: return [v, p, q];
    }
  }

  function shiftHue(h, target, amount) {
    var d = mod1(target - h + 0.5) - 0.5;
    return mod1(h + d * amount);
  }

  var STEPS = [[0.22, 0.55, 1.30], [0.10, 0.80, 1.14], [0, 1, 1], [-0.12, 1.10, 0.78], [-0.24, 1.18, 0.58], [-0.30, 1.10, 0.34]];

  function ramp(rgb, kind) {
    var hsv = rgbToHsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    var h = hsv[0], s = hsv[1], v = hsv[2];
    var warm = kind === "skin" ? 0.11 : 0.13, cool = kind === "skin" ? 0.97 : 0.70;
    var grey = s < 0.08;
    return STEPS.map(function (st) {
      var pull = st[0], hh = h;
      if (!grey) hh = shiftHue(h, pull > 0 ? warm : cool, Math.abs(pull));
      var ss = Math.min(1, s * st[1] + (grey && pull < 0 ? 0.06 : 0));
      if (grey && pull < 0) hh = cool;
      var vv = Math.max(0, Math.min(1, v * st[2] + (pull > 0.15 ? 0.04 : 0)));
      var c = hsvToRgb(hh, ss, vv);
      return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
    });
  }

  var ready = new Promise(function (resolve) {
    var names = Object.keys(DH.AVATAR_SPRITES);
    var left = names.length;
    names.forEach(function (name) {
      var img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, img.width, img.height).data;
        var mats = {};
        for (var i = 0; i < data.length; i += 4) {
          if (data[i + 3] !== 255) continue;
          var k = keyLut[(data[i] << 16) | (data[i + 1] << 8) | data[i + 2]];
          if (k) mats[k[0]] = true;
        }
        sprites[name] = { w: img.width, h: img.height, data: data, mats: Object.keys(mats) };
        if (--left === 0) resolve();
      };
      img.onerror = function () { if (--left === 0) resolve(); };
      img.src = DH.AVATAR_SPRITES[name];
    });
  });

  /** Data URL of sprite `name` recoloured with pal = { skin:[r,g,b], hair:[..], main:[..], trim:[..] }. */
  function url(name, pal) {
    var sp = sprites[name];
    if (!sp) return DH.AVATAR_SPRITES[name] || "";
    if (!sp.mats.length) return DH.AVATAR_SPRITES[name];
    var key = name + "|" + sp.mats.map(function (m) { return pal[m] ? pal[m].join(",") : ""; }).join(";");
    if (cache[key]) return cache[key];
    var ramps = {};
    sp.mats.forEach(function (m) { ramps[m] = ramp(pal[m] || [128, 128, 128], m === "skin" ? "skin" : null); });
    canvas.width = sp.w;
    canvas.height = sp.h;
    var out = ctx.createImageData(sp.w, sp.h);
    var d = out.data, s = sp.data;
    for (var i = 0; i < s.length; i += 4) {
      d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
      if (s[i + 3] !== 255) continue;
      var k = keyLut[(s[i] << 16) | (s[i + 1] << 8) | s[i + 2]];
      if (!k) continue;
      var c = ramps[k[0]][k[1]];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
    ctx.putImageData(out, 0, 0);
    cache[key] = canvas.toDataURL();
    return cache[key];
  }

  DH.AvatarColor = { ready: ready, url: url, ramp: ramp, has: function (n) { return !!DH.AVATAR_SPRITES[n]; } };
})(window);
