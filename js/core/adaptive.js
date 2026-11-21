(function (global) {
  var DH = global.DH = global.DH || {};

  // Which forces a question's answer key contains, reduced to base letters (W, N, T, F, f, R, P).
  function forceSet(q) {
    var lists = Array.isArray(q.ex) ? [q.ex] : [(q.ex && q.ex.A) || [], (q.ex && q.ex.B) || [], (q.ex && q.ex.all) || []];
    var set = {};
    lists.forEach(function (list) {
      list.forEach(function (item) {
        var key = String(item[0] || "");
        if (key.indexOf("mg") === 0) key = "W";
        else if (key[0] === "T" || key[0] === "U") key = "T";
        else if (key[0] === "S") key = "R";
        else if (key[0] === "Q") key = "P";
        else key = key[0];
        set[key] = true;
      });
    });
    return set;
  }

  function isMulti(q) { return q.k === "ws" || String(q.k || "")[0] === "b"; }
  function isIncline(q) { return q.k === "inc"; }
  function isRope(q) { return q.k === "r" || !!forceSet(q).T; }
  function isDecompose(q) { return q.type === "D"; }
  function hasAngledForce(q) {
    if (isIncline(q) || isDecompose(q)) return true;
    var list = Array.isArray(q.ex) ? q.ex : [];
    return list.some(function (it) {
      var a = Array.isArray(it[1]) ? it[1][0] : it[1];
      return typeof a === "number" && a % 90 !== 0;
    });
  }

  // How well a question trains each mistake code (0 = not at all).
  var TRAINS = {
    MISS_W:           function () { return 0.5; }, // every question has W

    MISS_N:           function (q) { return forceSet(q).N ? 1 : 0; },
    MISS_T:           function (q) { return isRope(q) ? 1 : 0; },
    MISS_F:           function (q) { var s = forceSet(q); return (s.F || s.f) ? 1 : 0; },
    MISS_CONTACT:     function (q) { var s = forceSet(q); return (isMulti(q) || s.R || s.P) ? 1 : 0; },
    EXTRA_N:          function (q) { return (isRope(q) && !forceSet(q).N) ? 1 : 0; },
    EXTRA_FORCE:      function () { return 0.5; },
    INTERNAL_FORCE:   function (q) { return isMulti(q) ? 1 : 0; },
    N_VERTICAL:       function (q) { return isIncline(q) ? 1 : 0; },
    W_TILTED:         function (q) { return isIncline(q) ? 1 : 0; },
    T_NOT_ROPE:       function (q) { return isRope(q) ? 1 : 0; },
    REVERSED:         function () { return 0.5; },
    ANGLE_COMPLEMENT: function (q) { return hasAngledForce(q) ? 1 : 0; },
    FRICTION_DIR:     function (q) { return forceSet(q).f ? 1 : 0; },
    SIN_COS_SWAP:     function (q) { return isDecompose(q) ? 1 : 0; },
    WRONG_AXIS:       function (q) { return isDecompose(q) ? 1 : 0; },
    COMPONENT_SIGN:   function (q) { return isDecompose(q) ? 1 : 0; }
  };

  // Each weakness adds this much weight per past mistake, so a question that drills
  // the player's top mistake is several times likelier than a neutral one, yet any
  // question in the pool can still appear.
  var WEIGHT_PER_MISTAKE = 1.5;

  /**
   * Pick the next question from `pool`, preferring ones that drill the player's mistakes.
   * @param pool      questions allowed for this stage
   * @param usedIds   ids already asked this run (avoided while unused ones remain)
   * @param mistakes  { CODE: count } accumulated this run
   * @returns { q, focusCode } — focusCode is the mistake this question was chosen to drill, or null
   */
  function pick(pool, usedIds, mistakes) {
    var unused = pool.filter(function (q) { return usedIds.indexOf(q.id) < 0; });
    if (!unused.length) unused = pool.slice();

    var codes = Object.keys(mistakes || {}).filter(function (c) { return TRAINS[c] && mistakes[c] > 0; });
    var scored = unused.map(function (q) {
      var w = 1;
      var best = null;
      var bestGain = 0;
      codes.forEach(function (c) {
        var gain = TRAINS[c](q) * mistakes[c] * WEIGHT_PER_MISTAKE;
        w += gain;
        // Only name a focus for codes the question fully drills (not the 0.5 generic ones).
        if (TRAINS[c](q) >= 1 && gain > bestGain) { bestGain = gain; best = c; }
      });
      return { q: q, w: w, focus: best };
    });

    var total = scored.reduce(function (s, x) { return s + x.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < scored.length; i++) {
      r -= scored[i].w;
      if (r <= 0) return { q: scored[i].q, focusCode: scored[i].focus };
    }
    var last = scored[scored.length - 1];
    return { q: last.q, focusCode: last.focus };
  }

  DH.Adaptive = { pick: pick, forceSet: forceSet };
})(window);
