// Unified FBD & Force Decomposition (cos/sin) Drag-and-Drop Board
(function (global) {
  var T = global.DH.FORCES;
  var svgSeq = 0;

  var BIOMES = {
    slime: {
      id: "slime",
      skyTop: "#0f2942", skyMid: "#194366", skyBot: "#1e5159",
      hillFar: "#143d2b", hillNear: "#1a5233",
      turfTop: "#22c55e", turfHi: "#4ade80", soilDark: "#452712", soilMid: "#6b4423",
      speck: "#855830", wallFill: "#5b3b22", wallLine: "#7c5130", wallHi: "#4ade80",
      tuftKind: "grass", skyFx: "cloud"
    },
    goblin: {
      id: "goblin",
      skyTop: "#241333", skyMid: "#4f2238", skyBot: "#74342b",
      hillFar: "#241e2e", hillNear: "#2c2920",
      turfTop: "#65a30d", turfHi: "#a3e635", soilDark: "#382213", soilMid: "#573720",
      speck: "#784c2c", wallFill: "#4a3222", wallLine: "#6b4831", wallHi: "#84cc16",
      tuftKind: "grass", skyFx: "pine"
    },
    fenrir: {
      id: "fenrir",
      skyTop: "#091324", skyMid: "#10283d", skyBot: "#133b44",
      hillFar: "#0b222e", hillNear: "#112f38",
      turfTop: "#0d9488", turfHi: "#2dd4bf", soilDark: "#16242f", soilMid: "#1e3340",
      speck: "#334e5e", wallFill: "#1e2e3d", wallLine: "#2d4459", wallHi: "#2dd4bf",
      tuftKind: "shroom", skyFx: "spore"
    },
    orc: {
      id: "orc",
      skyTop: "#1a0f14", skyMid: "#36181f", skyBot: "#4b241d",
      hillFar: "#23171b", hillNear: "#2f2224",
      turfTop: "#64748b", turfHi: "#94a3b8", soilDark: "#1e242e", soilMid: "#333c4a",
      speck: "#475569", wallFill: "#2b303a", wallLine: "#475061", wallHi: "#94a3b8",
      tuftKind: "crag", skyFx: "ash"
    },
    dragon: {
      id: "dragon",
      skyTop: "#17070b", skyMid: "#3d0f13", skyBot: "#6b1b15",
      hillFar: "#240d11", hillNear: "#331416",
      turfTop: "#44403c", turfHi: "#f97316", soilDark: "#1c1917", soilMid: "#292524",
      speck: "#ea580c", wallFill: "#292120", wallLine: "#572619", wallHi: "#fb923c",
      tuftKind: "lava", skyFx: "ember"
    }
  };
  var STAGE_TO_BIOME = ["slime", "goblin", "fenrir", "orc", "dragon"];

  function resolveBiome(q, opts) {
    var key = (opts && opts.biome) || STAGE_TO_BIOME[((q && q.stage) || 1) - 1] || "slime";
    return BIOMES[key] || BIOMES.slime;
  }

  function pt(a, r, o) {
    o = o || [180, 135];
    var d = a * Math.PI / 180;
    return [o[0] + r * Math.cos(d), o[1] - r * Math.sin(d)];
  }

  function okA(a, b, tol) {
    var d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d) <= (tol || 12);
  }

  function isMulti(q) {
    return q.k === "ws" || String(q.k || "")[0] === "b";
  }

  function isRepeatable(q, k) {
    return isMulti(q) && k === "P";
  }

  function placedAngles(pl, k) {
    if (!pl || pl[k] === undefined || pl[k] === null) return [];
    return Array.isArray(pl[k]) ? pl[k] : [pl[k]];
  }

  function lab(t, q) {
    if (t === "U") return "T₂";
    if (t === "T" && q && q.two) return "T₁";
    return t;
  }

  function nm(t, q) {
    if (t === "T" && q && q.two) return "แรงตึงเชือก 1 (T₁)";
    return (T[t] && T[t].n) || t;
  }

  function colorOf(key) {
    if (T[key]) return T[key].c;
    if (key.indexOf("mg") === 0 || key === "W") return "#3b82f6";
    if (key.indexOf("N") === 0) return "#22c55e";
    if (key.indexOf("T₁") === 0 || key.indexOf("T") === 0) return "#a855f7";
    if (key.indexOf("T₂") === 0) return "#06b6d4";
    if (key.indexOf("f") === 0) return "#eab308";
    if (key.indexOf("F") === 0) return "#ef4444";
    return "#38bdf8";
  }

  // Assign length tiers for vectors sharing the same direction:
  // solo -> tier -1 (normal 88px); colliding -> tier 0 (long 108px), tier 1 (short 62px), tier 2 (mid 84px)
  function layoutEntries(entries) {
    var items = entries.map(function (e, idx) {
      return { key: e[0], ang: e[1], idx: e[2] != null ? e[2] : 0, uid: idx, tier: -1 };
    });
    for (var i = 0; i < items.length; i++) {
      var group = [items[i]];
      for (var j = 0; j < items.length; j++) {
        if (i !== j && okA(items[i].ang, items[j].ang, 10)) group.push(items[j]);
      }
      if (group.length > 1) {
        group.sort(function (a, b) { return a.uid - b.uid; });
        group.forEach(function (it, gIdx) { it.tier = gIdx % 3; });
      }
    }
    // Draw long (tier 0) first so short (tier 1) sits cleanly on top!
    items.sort(function (a, b) {
      var order = { "-1": 0, "0": 0, "2": 1, "1": 2 };
      return (order[a.tier] || 0) - (order[b.tier] || 0);
    });
    return items;
  }

  function arrowGeom(a, tier, o, k) {
    o = o || [180, 135];
    k = k || 1;
    var tipR = 88, shaftR = 76;
    var lblPos, xPos;
    if (tier === 0) {
      tipR = 108; shaftR = 96;
      var pL = pt(a + 90, 18 * k, [0, 0]);
      var baseLbl = pt(a, 120 * k, o);
      lblPos = [baseLbl[0] + pL[0], baseLbl[1] + pL[1]];
      var pX = pt(a - 90, 16 * k, [0, 0]);
      var baseX = pt(a, 104 * k, o);
      xPos = [baseX[0] + pX[0], baseX[1] + pX[1]];
    } else if (tier === 1) {
      tipR = 60; shaftR = 49;
      var pL1 = pt(a + 90, 22 * k, [0, 0]);
      var baseLbl1 = pt(a, 50 * k, o);
      lblPos = [baseLbl1[0] + pL1[0], baseLbl1[1] + pL1[1]];
      var pX1 = pt(a - 90, 16 * k, [0, 0]);
      var baseX1 = pt(a, 50 * k, o);
      xPos = [baseX1[0] + pX1[0], baseX1[1] + pX1[1]];
    } else if (tier === 2) {
      tipR = 84; shaftR = 72;
      var pL2 = pt(a - 90, 24 * k, [0, 0]);
      var baseLbl2 = pt(a, 78 * k, o);
      lblPos = [baseLbl2[0] + pL2[0], baseLbl2[1] + pL2[1]];
      var pX2 = pt(a + 90, 16 * k, [0, 0]);
      var baseX2 = pt(a, 78 * k, o);
      xPos = [baseX2[0] + pX2[0], baseX2[1] + pX2[1]];
    } else {
      lblPos = pt(a, 110 * k, o);
      xPos = pt(a, 126 * k, o);
    }
    return {
      tip: pt(a, tipR * k, o),
      shaft: pt(a, shaftR * k, o),
      l: pt(a + 90, 7 * k, o),
      w: pt(a - 90, 7 * k, o),
      lblPos: lblPos,
      xPos: xPos
    };
  }

  function arrowSvg(type, a, dash, o, k, q, opacityOverride, tier) {
    o = o || [180, 135];
    k = k || 1;
    var gm = arrowGeom(a, tier != null ? tier : -1, o, k);
    var c = colorOf(type);
    var bl = [gm.shaft[0] + gm.l[0] - o[0], gm.shaft[1] + gm.l[1] - o[1]];
    var br = [gm.shaft[0] + gm.w[0] - o[0], gm.shaft[1] + gm.w[1] - o[1]];
    var op = opacityOverride != null ? opacityOverride : (dash ? 0.9 : 1);
    var lblText = lab(type, q);
    var fSize = lblText.length > 4 ? 12 : 16;
    return '<g opacity="' + op + '">' +
      '<line x1="' + o[0] + '" y1="' + o[1] + '" x2="' + gm.shaft[0] + '" y2="' + gm.shaft[1] + '" stroke="#0f172a" stroke-width="' + (opacityOverride ? 5 : 7.5) + '" stroke-linecap="round"/>' +
      '<line x1="' + o[0] + '" y1="' + o[1] + '" x2="' + gm.shaft[0] + '" y2="' + gm.shaft[1] + '" stroke="' + c + '" stroke-width="' + (opacityOverride ? 3.5 : 5) + '"' + (dash ? ' stroke-dasharray="7 5"' : '') + '/>' +
      '<polygon points="' + gm.tip + ' ' + bl + ' ' + br + '" fill="' + c + '" stroke="#0f172a" stroke-width="0.8"/>' +
      (opacityOverride ? '' : '<text x="' + gm.lblPos[0] + '" y="' + (gm.lblPos[1] + 5) + '" text-anchor="middle" font-weight="800" font-size="' + fSize + '" fill="' + c + '" style="paint-order:stroke;stroke:#0f172a;stroke-width:3px">' + global.DH.esc(lblText) + '</text>') +
      '</g>';
  }

  function compassGuidesSvg(q, view) {
    var s = '<g opacity="0.28">';
    s += '<circle cx="180" cy="135" r="88" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 4"/>';
    for (var a = 0; a < 360; a += 15) {
      var major = (a % 45 === 0);
      var p1 = pt(a, major ? 82 : 85);
      var p2 = pt(a, 91);
      s += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#cbd5e1" stroke-width="' + (major ? 1.5 : 0.8) + '"/>';
    }
    s += '</g>';

    if (isMulti(q) && view !== "all") {
      var g = geo(q);
      var pA = g.b.A, pB = g.b.B;
      if (pA && pB) {
        var angAB = Math.round(((Math.atan2(-(pB[1] - pA[1]), pB[0] - pA[0]) * 180 / Math.PI) % 360 + 360) % 360);
        var ray1 = pt(angAB, 108), ray2 = pt((angAB + 180) % 360, 108);
        s += '<line x1="' + ray2[0] + '" y1="' + ray2[1] + '" x2="' + ray1[0] + '" y2="' + ray1[1] + '" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.55"/>';
      }
      if (q.ia) {
        var n1 = pt(90 + q.ia, 108), n2 = pt(270 + q.ia, 108);
        s += '<line x1="' + n2[0] + '" y1="' + n2[1] + '" x2="' + n1[0] + '" y2="' + n1[1] + '" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.55"/>';
      }
    }
    return s;
  }

  function appliedArrows(q) {
    var s = "";
    (q.fa || []).forEach(function (a) {
      var tail = pt((a + 180) % 360, 118);
      var tip = pt((a + 180) % 360, 52);
      var l = pt(a + 90, 6, tip), w = pt(a - 90, 6, tip), head = pt((a + 180) % 360, 42);
      s += '<line x1="' + tail[0] + '" y1="' + tail[1] + '" x2="' + tip[0] + '" y2="' + tip[1] + '" stroke="#ef4444" stroke-width="4" stroke-dasharray="4 3"/>' +
        '<polygon points="' + head + ' ' + l + ' ' + w + '" fill="#ef4444"/>' +
        '<text x="' + tail[0] + '" y="' + (tail[1] - 6) + '" text-anchor="middle" font-size="13" font-weight="800" fill="#ef4444">F</text>';
    });
    return s;
  }

  function renderBackdropSvg(tm, uid, isCustom) {
    if (isCustom) return "";
    var skyId = "dh_sky_" + uid;
    var defs = '<defs><linearGradient id="' + skyId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + tm.skyTop + '"/>' +
      '<stop offset="55%" stop-color="' + tm.skyMid + '"/>' +
      '<stop offset="100%" stop-color="' + tm.skyBot + '"/>' +
      '</linearGradient></defs>';
    var hills = '<path d="M0,210 Q60,168 125,195 T245,180 T360,198 L360,270 L0,270 Z" fill="' + tm.hillFar + '" opacity="0.85"/>' +
      '<path d="M0,232 Q90,192 175,220 T360,210 L360,270 L0,270 Z" fill="' + tm.hillNear + '" opacity="0.9"/>';
    var fx = "";
    if (tm.skyFx === "cloud") {
      fx = '<g fill="#e2e8f0" opacity="0.1">' +
        '<rect x="28" y="34" width="38" height="10" rx="5"/><rect x="38" y="28" width="20" height="8" rx="4"/>' +
        '<rect x="275" y="44" width="44" height="10" rx="5"/><rect x="286" y="38" width="22" height="8" rx="4"/></g>';
    } else if (tm.skyFx === "pine") {
      fx = '<g fill="#1c1524" opacity="0.65">' +
        '<polygon points="26,225 40,175 54,225"/><polygon points="310,222 326,168 342,222"/><polygon points="285,228 298,186 311,228"/></g>';
    } else if (tm.skyFx === "spore") {
      fx = '<g fill="#2dd4bf" opacity="0.55">' +
        '<circle cx="42" cy="64" r="2"/><circle cx="76" cy="112" r="1.5"/><circle cx="318" cy="72" r="2"/>' +
        '<circle cx="290" cy="138" r="1.5" fill="#c084fc"/><circle cx="52" cy="154" r="1.8" fill="#c084fc"/></g>';
    } else if (tm.skyFx === "ash") {
      fx = '<g fill="#94a3b8" opacity="0.35">' +
        '<polygon points="18,225 45,165 72,225" fill="#23191d" opacity="0.8"/>' +
        '<polygon points="292,225 322,160 350,225" fill="#23191d" opacity="0.8"/>' +
        '<rect x="64" y="70" width="3" height="3"/><rect x="304" y="88" width="3" height="3"/></g>';
    } else if (tm.skyFx === "ember") {
      fx = '<g fill="#fb923c" opacity="0.65">' +
        '<polygon points="14,225 48,158 84,225" fill="#240b0e" opacity="0.85"/>' +
        '<polygon points="280,225 316,154 352,225" fill="#240b0e" opacity="0.85"/>' +
        '<circle cx="46" cy="96" r="2"/><circle cx="312" cy="82" r="2.2"/><circle cx="62" cy="148" r="1.5" fill="#fde047"/></g>';
    }
    // Subtle dark scrim preserves high readability for dashed compass circle & force vectors
    return defs + '<rect x="0" y="0" width="360" height="270" fill="url(#' + skyId + ')"/>' +
      hills + fx + '<rect x="0" y="0" width="360" height="270" fill="#0b1220" opacity="0.28"/>';
  }

  function renderSurfaceSvg(x, y, w, h, tm, iceMode, skipZone) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + tm.soilMid + '"/>' +
      '<rect x="' + x + '" y="' + (y + 22) + '" width="' + w + '" height="' + Math.max(0, h - 22) + '" fill="' + tm.soilDark + '" opacity="0.72"/>';
    if (iceMode) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="11" fill="#0284c7" opacity="0.85"/>' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="4" fill="#bae6fd"/>';
    } else {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="10" fill="' + tm.turfTop + '"/>' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="3" fill="' + tm.turfHi + '"/>';
    }
    var tufts = "";
    for (var tx = x + 16; tx < x + w - 12; tx += 28) {
      if (skipZone && tx > skipZone[0] && tx < skipZone[1]) continue;
      if (!iceMode) {
        if (tm.tuftKind === "grass") {
          tufts += '<path d="M' + tx + ',' + y + ' l-3,-6 l3,4 l2,-7 l2,7 l3,-4 l-2,6 Z" fill="' + tm.turfHi + '"/>';
        } else if (tm.tuftKind === "shroom") {
          tufts += '<rect x="' + (tx - 1) + '" y="' + (y - 4) + '" width="2" height="4" fill="#cbd5e1"/>' +
            '<path d="M' + (tx - 4) + ',' + (y - 4) + ' Q' + tx + ',' + (y - 10) + ' ' + (tx + 4) + ',' + (y - 4) + ' Z" fill="' + tm.turfHi + '"/>';
        } else if (tm.tuftKind === "lava") {
          tufts += '<path d="M' + (tx - 5) + ',' + (y + 12) + ' l4,6 l5,-3" fill="none" stroke="#fb923c" stroke-width="1.6" opacity="0.85"/>';
        } else {
          tufts += '<polygon points="' + (tx - 3) + ',' + y + ' ' + tx + ',' + (y - 5) + ' ' + (tx + 3) + ',' + y + '" fill="' + tm.turfHi + '" opacity="0.8"/>';
        }
      }
      s += '<rect x="' + (tx + 6) + '" y="' + (y + 16 + ((tx % 3) * 7)) + '" width="5" height="3" rx="1" fill="' + tm.speck + '" opacity="0.7"/>';
    }
    s += tufts + '<line x1="' + x + '" y1="' + y + '" x2="' + (x + w) + '" y2="' + y + '" stroke="#f8fafc" stroke-width="2.5" opacity="0.92"/>';
    return s;
  }

  function renderWallSvg(x, y, w, h, tm, edgeX) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + tm.wallFill + '"/>';
    for (var wy = y + 18; wy < y + h; wy += 20) {
      s += '<line x1="' + x + '" y1="' + wy + '" x2="' + (x + w) + '" y2="' + wy + '" stroke="' + tm.wallLine + '" stroke-width="1.5"/>';
    }
    s += '<rect x="' + (edgeX === x ? x : edgeX - 5) + '" y="' + y + '" width="5" height="' + h + '" fill="' + tm.wallHi + '" opacity="0.35"/>' +
      '<line x1="' + edgeX + '" y1="' + y + '" x2="' + edgeX + '" y2="' + (y + h) + '" stroke="#e2e8f0" stroke-width="3.5"/>';
    return s;
  }

  function boxObjSvg(x, y, w, h, isKey) {
    var body = isKey ? "#14532d" : "#854d27";
    var inner = isKey ? "#166534" : "#a16232";
    var plank = isKey ? "#052e16" : "#5c3317";
    var trim = isKey ? "#4ade80" : "#cbd5e1";
    return '<g>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + body + '" stroke="#f8fafc" stroke-width="2.5"/>' +
      '<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (w - 12) + '" height="' + (h - 12) + '" rx="2" fill="' + inner + '" stroke="' + plank + '" stroke-width="2"/>' +
      '<line x1="' + (x + 8) + '" y1="' + (y + 8) + '" x2="' + (x + w - 8) + '" y2="' + (y + h - 8) + '" stroke="' + plank + '" stroke-width="3" opacity="0.65"/>' +
      '<line x1="' + (x + 6) + '" y1="' + (y + h / 2) + '" x2="' + (x + w - 6) + '" y2="' + (y + h / 2) + '" stroke="' + plank + '" stroke-width="2" opacity="0.6"/>' +
      '<circle cx="' + (x + 10) + '" cy="' + (y + 10) + '" r="2.2" fill="' + trim + '"/>' +
      '<circle cx="' + (x + w - 10) + '" cy="' + (y + 10) + '" r="2.2" fill="' + trim + '"/>' +
      '<circle cx="' + (x + 10) + '" cy="' + (y + h - 10) + '" r="2.2" fill="' + trim + '"/>' +
      '<circle cx="' + (x + w - 10) + '" cy="' + (y + h - 10) + '" r="2.2" fill="' + trim + '"/>' +
      '</g>';
  }

  function orbObjSvg(cx, cy, r, isKey, dimmed, label) {
    var fill = dimmed ? "#0f172a" : (isKey ? "#14532d" : "#334155");
    var hi = dimmed ? "#1e293b" : (isKey ? "#22c55e" : "#64748b");
    var lbl = label
      ? '<text x="' + (cx - r * 0.55) + '" y="' + (cy - r * 0.4) + '" font-size="13" font-weight="800" fill="#f8fafc" style="paint-order:stroke;stroke:#0f172a;stroke-width:3px">' + label + '</text>'
      : '';
    return '<g>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '" stroke="#f8fafc" stroke-width="2.5"/>' +
      '<circle cx="' + (cx - r * 0.28) + '" cy="' + (cy - r * 0.28) + '" r="' + (r * 0.36) + '" fill="' + hi + '" opacity="0.45"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 5) + '" fill="none" stroke="' + hi + '" stroke-width="1.2" opacity="0.45" stroke-dasharray="6 4"/>' +
      lbl + '</g>';
  }

  function ropesSvg(q, tm) {
    var s = "";
    (q.rp || []).forEach(function (a, k) {
      var e = pt(a, 120), m = pt(a, 140);
      s += '<line x1="180" y1="135" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#451a03" stroke-width="6.5" stroke-linecap="round"/>' +
        '<line x1="180" y1="135" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#f59e0b" stroke-width="3.6" stroke-linecap="round"/>' +
        '<line x1="180" y1="135" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#92400e" stroke-width="2" stroke-dasharray="4 4"/>';
      s += q.dot
        ? '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="7" fill="#cbd5e1" stroke="#0f172a" stroke-width="2"/>'
        : '<g transform="translate(' + e[0] + ' ' + e[1] + ') rotate(' + (-a) + ')">' +
            '<rect x="0" y="-44" width="54" height="88" fill="' + tm.wallFill + '"/>' +
            '<line x1="0" y1="-22" x2="54" y2="-22" stroke="' + tm.wallLine + '" stroke-width="1.5"/>' +
            '<line x1="0" y1="22" x2="54" y2="22" stroke="' + tm.wallLine + '" stroke-width="1.5"/>' +
            '<line x1="0" y1="-44" x2="0" y2="44" stroke="#e2e8f0" stroke-width="3.5"/>' +
            '<circle cx="0" cy="0" r="5.5" fill="#94a3b8" stroke="#0f172a" stroke-width="2"/>' +
          '</g>';
      if (q.two) s += '<text x="' + m[0] + '" y="' + (m[1] + 4) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#fde68a" style="paint-order:stroke;stroke:#0f172a;stroke-width:4px">เชือก ' + (k + 1) + '</text>';
    });
    return s;
  }

  function geo(q, tm) {
    tm = tm || resolveBiome(q);
    var b = {}, s = "", s2 = "", r = 36;
    if (q.k === "ws") {
      var ox = 40, oy = 250, th = (q.ia || 30) * Math.PI / 180, c = Math.cos(th), n = Math.sin(th), bx, by;
      if (q.wl === "v") { bx = r; by = r * (1 + n) / c; } else { bx = r * (c - n); by = r * (n + c); }
      var lo = [ox + bx, oy - by], up = [ox + bx + 2 * r * c, oy - by - 2 * r * n];
      b = q.sw ? { A: lo, B: up } : { A: up, B: lo };
      s = '<g transform="translate(' + ox + ' ' + oy + ') rotate(-' + (q.ia || 30) + ')">' +
        renderSurfaceSvg(0, 0, 400, 140, tm, false) +
        (q.wl === "p" ? renderWallSvg(-46, -230, 46, 230, tm, 0) : '') + '</g>';
      if (q.wl === "v") s += renderWallSvg(ox - 46, oy - 230, 46, 230, tm, ox);
    } else if (q.k === "b2") {
      r = 40; var fy = 250; b = { A: [110, fy - 40], B: [158, fy - 104] };
      s = renderSurfaceSvg(24, fy, 220, 90, tm, false) +
        renderWallSvg(24, fy - 190, 46, 190, tm, 70) +
        renderWallSvg(198, fy - 190, 46, 190, tm, 198);
    } else {
      var fy = 250; b = { A: [157.5, fy - 79], B: [100, fy - 36], C: [215, fy - 36] };
      s = renderSurfaceSvg(14, fy, 286, 90, tm, false);
      if (q.wlb) {
        s += renderWallSvg(18, fy - 190, 46, 190, tm, 64) +
          renderWallSvg(251, fy - 190, 46, 190, tm, 251);
      }
      if (q.rope) s2 = '<line x1="100" y1="' + (fy - 36) + '" x2="215" y1="' + (fy - 36) + '" stroke="#f59e0b" stroke-width="4.5" stroke-linecap="round"/>';
    }
    return { b: b, s: s, s2: s2, r: r };
  }

  function cen(g, v) {
    var ks = Object.keys(g.b), c = [0, 0];
    if (v === "all") ks.forEach(function (k) { c[0] += g.b[k][0] / ks.length; c[1] += g.b[k][1] / ks.length; });
    else c = g.b[v];
    return c;
  }

  function flattenPlaced(pl) {
    var out = [];
    Object.keys(pl || {}).forEach(function (k) {
      placedAngles(pl, k).forEach(function (ang, idx) {
        out.push([k, ang, idx]);
      });
    });
    return out;
  }

  function renderSceneSvg(q, opts) {
    opts = opts || {};
    var view = opts.view || (isMulti(q) ? "A" : "all");
    var pl = opts.pl || {};
    var pls = opts.pls || { all: pl, A: {}, B: {} };
    var showReveal = !!opts.showReveal;
    var revealMode = opts.revealMode || "key";
    var overlayArrows = opts.overlayArrows || [];
    var showMarks = !!opts.showMarks;

    var multi = isMulti(q);
    var tol = q.tol || (multi ? 15 : 12);
    var isKey = showReveal && revealMode === "key";
    var tm = resolveBiome(q, opts);
    var iceMode = !!(q && q.t && String(q.t).indexOf("น้ำแข็ง") >= 0);
    var backdrop = renderBackdropSvg(tm, ++svgSeq, q.k === "custom" && q.imgUrl);
    var bgSvg = "";

    if (multi) {
      var g = geo(q, tm), ks = Object.keys(g.b), c = cen(g, view);
      bgSvg = '<g transform="translate(' + (180 - c[0]) + ' ' + (135 - c[1]) + ')">' + g.s;
      ks.forEach(function (k) {
        var p = g.b[k];
        var activeObj = (view === "all" || view === k);
        bgSvg += orbObjSvg(p[0], p[1], g.r, isKey, !activeObj, k);
      });
      bgSvg += g.s2 + '</g>' + (view === "all" ? "" : '<circle cx="180" cy="135" r="4" fill="#f8fafc"/>');
    } else if (q.k === "custom" && q.imgUrl) {
      bgSvg = '<image href="' + q.imgUrl + '" x="20" y="10" width="320" height="250" preserveAspectRatio="xMidYMid meet"/>' +
        '<circle cx="180" cy="135" r="5" fill="#fbbf24" stroke="#0f172a" stroke-width="2"/>';
    } else if (q.k === "inc") {
      var ia = q.ia || 30;
      bgSvg = ropesSvg(q, tm) + '<g transform="rotate(-' + ia + ' 180 135)">' +
        renderSurfaceSvg(-120, 175, 600, 110, tm, iceMode, q.dot ? null : [132, 228]) +
        (q.dot ? orbObjSvg(180, 135, 40, isKey, false, "") : boxObjSvg(140, 95, 80, 80, isKey)) +
        '</g><rect x="282" y="238" width="66" height="22" rx="6" fill="rgba(15,23,42,0.85)" stroke="#38bdf8" stroke-width="1"/>' +
        '<text x="315" y="253" text-anchor="middle" font-size="12" font-weight="800" fill="#7dd3fc">θ = ' + ia + '°</text>' +
        appliedArrows(q) + '<circle cx="180" cy="135" r="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>';
    } else if (q.k === "flat") {
      bgSvg = renderSurfaceSvg(-20, 175, 400, 100, tm, iceMode, [132, 228]) +
        boxObjSvg(140, 95, 80, 80, isKey) +
        appliedArrows(q) + '<circle cx="180" cy="135" r="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>';
    } else {
      bgSvg = ropesSvg(q, tm) +
        boxObjSvg(140, 95, 80, 80, isKey) +
        appliedArrows(q) + '<circle cx="180" cy="135" r="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>';
    }

    var axesSvg = "";
    if (q.type === "D") {
      var axMode = q.axisMode || "xy";
      var ang = axMode === "incline" ? (q.axisAngle || q.ia || 30) : 0;
      axesSvg = '<g transform="rotate(' + (-ang) + ' 180 135)" opacity="0.65">' +
        '<line x1="35" y1="135" x2="325" y2="135" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="6 4"/>' +
        '<line x1="180" y1="18" x2="180" y2="252" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="6 4"/>' +
        '<text x="315" y="128" font-size="11" font-weight="800" fill="#fbbf24">' + (axMode === "incline" ? "+∥" : "+X") + '</text>' +
        '<text x="186" y="28" font-size="11" font-weight="800" fill="#38bdf8">' + (axMode === "incline" ? "+⊥" : "+Y") + '</text>' +
        '</g>';
    }

    var guides = (!multi || view !== "all") ? compassGuidesSvg(q, view) : "";

    var ovlRoom = "";
    overlayArrows.forEach(function (oa) {
      ovlRoom += arrowSvg(oa.force, oa.angle, false, [180, 135], 1, q, 0.18, -1);
    });

    var lay = "";
    var activeLayout = [];
    if (multi && view === "all") {
      var g2 = geo(q), c2 = cen(g2, "all");
      ["A", "B"].forEach(function (k) {
        var o = [180 + g2.b[k][0] - c2[0], 135 + g2.b[k][1] - c2[1]];
        var e = (q.ex && q.ex[k]) || [];
        var p0 = pls[k] || {};
        if (showReveal && revealMode === "key") {
          layoutEntries(e).forEach(function (it) {
            lay += arrowSvg(it.key, it.ang, false, o, 0.62, q, null, it.tier);
          });
        } else {
          layoutEntries(flattenPlaced(p0)).forEach(function (it) {
            var bad = showReveal && !e.some(function (x) { return x[0] === it.key && okA(x[1], it.ang, tol); });
            lay += arrowSvg(it.key, it.ang, bad, o, 0.62, q, null, it.tier);
          });
        }
      });
    } else {
      var ex = Array.isArray(q.ex) ? q.ex : ((q.ex && q.ex[view]) || []);
      if (showReveal && revealMode === "key") {
        layoutEntries(ex).forEach(function (it) {
          lay += arrowSvg(it.key, it.ang, false, [180, 135], 1, q, null, it.tier);
        });
      } else {
        activeLayout = layoutEntries(flattenPlaced(pl));
        var fbMap = q.fallbackForces || {};
        activeLayout.forEach(function (it) {
          var isDirectOk = ex.some(function (x) { return x[0] === it.key && okA(x[1], it.ang, tol); });
          var fb = fbMap[it.key];
          var isFallbackOk = fb && okA(fb.angle, it.ang, tol);
          var bad = showReveal && !(isDirectOk || isFallbackOk);
          lay += arrowSvg(it.key, it.ang, bad, [180, 135], 1, q, null, it.tier);
        });
      }
    }

    var marks = "";
    if (showMarks && !(multi && view === "all")) {
      activeLayout.forEach(function (it) {
        var gm = arrowGeom(it.ang, it.tier, [180, 135], 1);
        var col = colorOf(it.key);
        marks += '<circle cx="' + gm.xPos[0] + '" cy="' + gm.xPos[1] + '" r="8" fill="' + col + '" stroke="#0f172a" stroke-width="1.5"/>' +
          '<text x="' + gm.xPos[0] + '" y="' + (gm.xPos[1] + 3.5) + '" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" pointer-events="none">✕</text>' +
          '<circle data-k="' + global.DH.esc(it.key) + '" data-idx="' + it.idx + '" cx="' + gm.xPos[0] + '" cy="' + gm.xPos[1] + '" r="18" fill="transparent" style="cursor:pointer"/>';
      });
    }

    var badge = "";
    if (showReveal) {
      var kv = revealMode === "key";
      badge = '<rect x="236" y="8" width="116" height="26" rx="13" fill="' + (kv ? "#15803d" : "#2563eb") + '"/>' +
        '<text x="294" y="25" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">' + (kv ? "เฉลย ✓" : "คำตอบของฉัน") + '</text>';
    }

    var liveBadge = opts.liveAngle != null
      ? '<rect x="8" y="8" width="84" height="24" rx="12" fill="rgba(15,23,42,0.9)" stroke="#fbbf24" stroke-width="1.5"/>' +
        '<text x="50" y="24" text-anchor="middle" font-size="12" font-weight="800" fill="#fbbf24">มุม ' + opts.liveAngle + '°</text>'
      : '';

    return '<svg viewBox="0 0 360 270" class="fbd-svg">' + backdrop + bgSvg + guides + axesSvg + ovlRoom + '<g class="fbd-lay">' + lay + '</g>' + marks + badge + liveBadge + '</svg>';
  }

  function mount(container, q, opts) {
    opts = opts || {};
    var readOnly = !!opts.readOnly;
    var revealData = opts.revealData || null;
    var onChange = opts.onChange || function () {};
    var qtype = q.type || "A";
    var multi = isMulti(q);

    var state = opts.initialState || { all: {}, A: {}, B: {} };
    var curView = multi ? "A" : "all";
    var selForce = null;
    var revMode = (revealData && revealData.revealMode) || "key";
    var liveAngle = null;

    function currentPl() {
      return state[curView] || (state[curView] = {});
    }

    function getStateForSubmit() {
      return JSON.parse(JSON.stringify(state));
    }

    function snapAngleForQuestion(rawDeg) {
      var targets = [0, 90, 180, 270];
      if (q.ia) {
        targets.push(q.ia, (90 + q.ia) % 360, (180 + q.ia) % 360, (270 + q.ia) % 360);
      }
      if (q.rp && q.rp.length) {
        q.rp.forEach(function (a) { targets.push(a); });
      }
      for (var i = 0; i < targets.length; i++) {
        if (okA(rawDeg, targets[i], 9)) return targets[i];
      }
      return rawDeg;
    }

    function calcAngle(ev) {
      var sv = container.querySelector(".fbd-svg");
      if (!sv) return null;
      var r = sv.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return null;
      var s = r.width / 360;
      var dx = ev.clientX - (r.left + 180 * s);
      var dy = ev.clientY - (r.top + 135 * s);
      if (Math.hypot(dx, dy) < 16 * s) return null;
      var raw = ((Math.round(Math.atan2(-dy, dx) * 36 / Math.PI) * 5) % 360 + 360) % 360;
      return snapAngleForQuestion(raw);
    }

    function placeForce(pl, k, a) {
      if (isRepeatable(q, k)) {
        var arr = placedAngles(pl, k).slice();
        if (!arr.some(function (x) { return okA(x, a, 10); })) arr.push(a);
        pl[k] = arr;
      } else {
        pl[k] = a;
      }
    }

    function removeForce(pl, k, idx) {
      if (Array.isArray(pl[k])) {
        pl[k].splice(idx, 1);
        if (!pl[k].length) delete pl[k];
      } else {
        delete pl[k];
      }
    }

    function startDragForce(e, k) {
      if (readOnly || (multi && curView === "all")) return;
      e.preventDefault();
      var pl = currentPl();
      var rep = isRepeatable(q, k);
      var prev = pl[k] !== undefined ? JSON.parse(JSON.stringify(pl[k])) : undefined;
      var moved = false;
      var g = document.createElement("div");
      g.className = "fbd-ghost";
      g.textContent = nm(k, q);
      g.style.background = colorOf(k);
      g.style.left = e.clientX + "px";
      g.style.top = e.clientY + "px";
      document.body.appendChild(g);
      selForce = k;

      function put(ev) {
        var a = calcAngle(ev);
        liveAngle = a;
        g.textContent = nm(k, q) + (a !== null ? " · " + a + "°" : "");
        if (rep) {
          var base = Array.isArray(prev) ? prev.slice() : (prev !== undefined ? [prev] : []);
          if (a !== null) {
            // Avoid stacking two P arrows at the exact same angle within 10°
            if (!base.some(function (x) { return okA(x, a, 10); })) base.push(a);
          }
          if (base.length) pl[k] = base; else delete pl[k];
        } else {
          if (a === null) {
            if (prev === undefined) delete pl[k]; else pl[k] = prev;
          } else {
            pl[k] = a;
          }
        }
      }
      function mv(ev) {
        moved = true;
        g.style.left = ev.clientX + "px";
        g.style.top = ev.clientY + "px";
        put(ev);
        render();
      }
      function up(ev) {
        window.removeEventListener("pointermove", mv);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        g.remove();
        liveAngle = null;
        if (moved) { put(ev); selForce = null; liveAngle = null; }
        onChange(getStateForSubmit());
        render();
      }
      window.addEventListener("pointermove", mv);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    }

    function render() {
      var html = "";
      if (multi) {
        var vn = q.vn || ["ภาพรวม", "โฟกัส A", "โฟกัส B"];
        html += '<div class="fbd-tabs">' +
          ["all", "A", "B"].map(function (v, idx) {
            return '<button type="button" class="fbd-tab ' + (curView === v ? "on" : "") + '" data-v="' + v + '">' + global.DH.esc(vn[idx]) + '</button>';
          }).join("") + '</div>';
      }

      var pl = currentPl();
      html += '<div class="fbd-board">' + renderSceneSvg(q, {
        biome: opts.biome,
        view: curView,
        pl: pl,
        pls: state,
        showReveal: !!revealData,
        revealMode: revMode,
        overlayArrows: opts.overlayArrows || [],
        showMarks: !readOnly && !(multi && curView === "all"),
        liveAngle: liveAngle
      }) + '</div>';

      if (!readOnly && !(multi && curView === "all")) {
        html += '<p class="fbd-hint">' + (selForce ? 'เลือก <b>' + global.DH.esc(nm(selForce, q)) + '</b> แล้ว แตะรอบวัตถุเพื่อวางลูกศร' : 'ลากปุ่ม' + (qtype === "D" ? 'แรง / cos-sin ' : 'แรง') + 'ขึ้นไปวางรอบวัตถุ · แตะ ✕ เพื่อลบและคืนปุ่ม') + '</p>';
        var palKeys = qtype === "D" ? (q.btComp || []) : (q.bt || ["W", "N", "T", "f"]);
        var visibleButtons = [];
        palKeys.forEach(function (k) {
          if (k === "U" && !q.two) return;
          var countPlaced = placedAngles(pl, k).length;
          // Hide used force buttons everywhere EXCEPT repeatable contact force P on touching-circle questions!
          if (!isRepeatable(q, k) && countPlaced > 0) return;
          var col = colorOf(k);
          var badgeCnt = (isRepeatable(q, k) && countPlaced > 0) ? (" (วางแล้ว " + countPlaced + ")") : "";
          visibleButtons.push('<button type="button" class="fbd-fbtn ' + (selForce === k ? "on" : "") + '" data-fk="' + global.DH.esc(k) + '" style="border-color:' + col + ';' + (selForce === k ? "background:" + col + ";color:#fff" : "") + '">' +
            global.DH.esc(nm(k, q) + badgeCnt) + '</button>');
        });
        html += '<div class="fbd-pal">' + (visibleButtons.length ? visibleButtons.join("") : '<span style="grid-column:1/-1;color:#4ade80;font-size:0.86rem">✓ วางแรงครบทุกปุ่มที่มีแล้ว (แตะ ✕ บนลูกศรหากต้องการแก้ไข)</span>') + '</div>';
        html += '<div class="fbd-actions-row"><button type="button" class="btn-sec fbd-clr">ล้างมุมมองนี้</button></div>';
      } else if (!readOnly && multi && curView === "all") {
        html += '<p class="fbd-hint">มุมมองภาพรวมใช้ดูแรงที่ใส่ไว้ใน A และ B เท่านั้น · กดแท็บโฟกัส A หรือ B เพื่อวางแรง</p>';
      }

      if (revealData && !opts.hideToggle) {
        html += '<button type="button" class="btn-sec fbd-rev-toggle" style="width:100%;margin-top:8px">' +
          (revMode === "key" ? "กำลังแสดง: เฉลย ✓ (แตะเพื่อดูคำตอบของฉัน)" : "กำลังแสดง: คำตอบของฉัน · เส้นประคือผิด (แตะเพื่อดูเฉลย)") +
          '</button>';
      }

      container.innerHTML = html;
      bindEvents();
    }

    function bindEvents() {
      container.querySelectorAll(".fbd-tab[data-v]").forEach(function (btn) {
        btn.onclick = function () { curView = btn.dataset.v; selForce = null; render(); };
      });
      var tog = container.querySelector(".fbd-rev-toggle");
      if (tog) {
        tog.onclick = function () { revMode = revMode === "key" ? "mine" : "key"; render(); };
      }
      if (readOnly) return;

      container.querySelectorAll(".fbd-fbtn").forEach(function (btn) {
        var k = btn.dataset.fk;
        btn.onpointerdown = function (e) { startDragForce(e, k); };
      });
      var board = container.querySelector(".fbd-board");
      if (board) {
        board.onclick = function (e) {
          if (multi && curView === "all") return;
          var pl = currentPl();
          var rm = e.target.getAttribute && e.target.getAttribute("data-k");
          if (rm) {
            var ridx = +(e.target.getAttribute("data-idx") || 0);
            removeForce(pl, rm, ridx);
            onChange(getStateForSubmit());
            render();
            return;
          }
          if (!selForce) return;
          var a = calcAngle(e);
          if (a === null) return;
          placeForce(pl, selForce, a);
          selForce = null;
          onChange(getStateForSubmit());
          render();
        };
      }
      var clr = container.querySelector(".fbd-clr");
      if (clr) {
        clr.onclick = function () {
          state[curView] = {};
          selForce = null;
          onChange(getStateForSubmit());
          render();
        };
      }
    }

    render();
    return {
      getState: getStateForSubmit,
      setState: function (ns) { state = ns; render(); }
    };
  }

  global.FBD = {
    mount: mount,
    renderSceneSvg: renderSceneSvg
  };
})(window);
