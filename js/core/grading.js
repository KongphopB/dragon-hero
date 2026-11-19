(function (global) {
  var DH = global.DH = global.DH || {};

  function angDiff(a, b) {
    var d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  }

  function okAng(a, b, tol) {
    return angDiff(a, b) <= (tol || 12);
  }

  function stripSinCos(lbl) {
    if (lbl.indexOf("sin") >= 0) return [lbl.replace("sin", "TRIG"), "sin"];
    if (lbl.indexOf("cos") >= 0) return [lbl.replace("cos", "TRIG"), "cos"];
    return [lbl, null];
  }

  function toAngList(val) {
    if (val === undefined || val === null) return [];
    return Array.isArray(val) ? val.slice() : [val];
  }

  function gradeAnswer(q, place) {
    var qtype = q.type || "A";
    var multi = q.k === "ws" || String(q.k || "")[0] === "b";
    var tol = q.tol || (multi ? 15 : 12);
    place = place || {};
    var codes = [];
    var rows = [];
    var wrongItems = [];
    function addCode(c) { if (c && codes.indexOf(c) < 0) codes.push(c); }

    var views = multi ? ["A", "B"] : ["all"];
    var totalScore = 0;
    if (multi && place.all && (place.all.P != null || place.all.Q != null)) addCode("INTERNAL_FORCE");

    views.forEach(function (v) {
      var expected = Array.isArray(q.ex) ? q.ex : ((q.ex && q.ex[v]) || []);
      var p0 = place[v] || {};
      var hit = 0, extra = 0;
      if (multi) {
        var vn = q.vn || ["ภาพรวม", "โฟกัส A", "โฟกัส B"];
        rows.push({ header: v === "A" ? vn[1] : vn[2] });
      }

      var avail = {};
      Object.keys(p0).forEach(function (k) { avail[k] = toAngList(p0[k]); });

      var fbMap = q.fallbackForces || {};
      var replacedByFallback = {};
      Object.keys(fbMap).forEach(function (fbKey) {
        var fb = fbMap[fbKey];
        var fbAngs = avail[fbKey] || [];
        if (fbAngs.length > 0) {
          var noneDecomposed = (fb.replaces || []).every(function (rk) { return !(avail[rk] && avail[rk].length > 0); });
          if (noneDecomposed && okAng(fbAngs[0], fb.angle, tol)) {
            (fb.replaces || []).forEach(function (rk) { replacedByFallback[rk] = fbKey; });
            hit += (fb.replaces || []).length * (fb.credit || 0.6);
            avail[fbKey] = fbAngs.slice(1);
            rows.push({
              force: fbKey,
              status: "ok",
              msg: "วาง " + fbKey + " ถูกทิศ แต่ยังไม่แตกแรง cos/sin (ได้คะแนน " + Math.round((fb.credit || 0.6) * 100) + "% แทน " + (fb.replaces || []).join(", ") + ")"
            });
          }
        }
      });

      expected.forEach(function (pair) {
        var fk = pair[0], ea = pair[1];
        if (replacedByFallback[fk]) return;
        var list = avail[fk] || [];
        var matchIdx = -1;
        for (var li = 0; li < list.length; li++) {
          if (okAng(list[li], ea, tol)) { matchIdx = li; break; }
        }
        if (matchIdx >= 0) {
          hit += 1;
          list.splice(matchIdx, 1);
          avail[fk] = list;
          rows.push({ force: fk, status: "ok", msg: "ถูกต้อง" });
        } else if (list.length === 0) {
          var se = stripSinCos(fk);
          var swappedKey = se[1] ? (fk.indexOf("sin") >= 0 ? fk.replace("sin", "cos") : fk.replace("cos", "sin")) : null;
          var swList = swappedKey ? (avail[swappedKey] || []) : [];
          var swIdx = -1;
          for (var si = 0; si < swList.length; si++) {
            if (okAng(swList[si], ea, tol)) { swIdx = si; break; }
          }
          if (swIdx >= 0) {
            addCode("SIN_COS_SWAP");
            swList.splice(swIdx, 1);
            avail[swappedKey] = swList;
            rows.push({ force: fk, status: "dir", msg: "ใส่ " + swappedKey + " แทน " + fk + " (สลับ sin/cos)" });
          } else {
            rows.push({ force: fk, status: "miss", msg: "ลืมใส่แรงนี้" });
            if (fk === "W" || fk === "mg" || fk.indexOf("mg") === 0) addCode("MISS_W");
            else if (fk === "N") addCode("MISS_N");
            else if (fk === "T" || fk === "U" || fk.indexOf("T") === 0) addCode("MISS_T");
            else if (fk === "f" || fk === "F" || fk.indexOf("F") === 0) addCode("MISS_F");
            else addCode("MISS_CONTACT");
          }
          wrongItems.push(multi ? (v + ":" + fk) : fk);
        } else {
          var ua = list.shift();
          avail[fk] = list;
          rows.push({ force: fk, status: "dir", msg: "ทิศไม่ถูก (วาง " + Math.round(ua) + "°)" });
          wrongItems.push(multi ? (v + ":" + fk) : fk);
          if (fk === "W" && !okAng(ua, 270, tol)) addCode("W_TILTED");
          else if (fk === "N" && q.ia && okAng(ua, 90, 12)) addCode("N_VERTICAL");
          else if (okAng(ua, (ea + 180) % 360, 15)) addCode(fk === "f" ? "FRICTION_DIR" : (qtype === "D" ? "COMPONENT_SIGN" : "REVERSED"));
          else if (qtype === "D" && (okAng(ua, (ea + 90) % 360, 15) || okAng(ua, (ea + 270) % 360, 15))) {
            addCode("WRONG_AXIS");
            if (stripSinCos(fk)[1]) addCode("SIN_COS_SWAP");
          } else if (fk === "f") addCode("FRICTION_DIR");
          else if (fk === "T" || fk === "U") {
            var ch = ea < 180 ? (180 - ea) % 360 : (540 - ea) % 360;
            var c90 = (90 - (ea % 90)) % 90;
            if (okAng(ua % 90, c90, 10) || okAng(ua, ch, 10)) addCode("ANGLE_COMPLEMENT");
            addCode("T_NOT_ROPE");
          } else addCode("ANGLE_COMPLEMENT");
        }
      });

      Object.keys(avail).forEach(function (uk) {
        (avail[uk] || []).forEach(function (ua) {
          extra += 1;
          if (fbMap[uk]) {
            if (!okAng(ua, fbMap[uk].angle, tol)) {
              if (uk === "W") addCode("W_TILTED");
              rows.push({ force: uk, status: "dir", msg: "วาง " + uk + " ผิดทิศ (" + Math.round(ua) + "°)" });
            } else {
              rows.push({ force: uk, status: "extra", msg: "แตกแรงเป็น cos/sin แล้ว ไม่ต้องใส่ " + uk + " ซ้ำ" });
            }
          } else {
            rows.push({ force: uk, status: "extra", msg: "ไม่มีแรงนี้ (หรือวางเกินจำนวน)" });
            addCode(uk === "N" ? "EXTRA_N" : "EXTRA_FORCE");
          }
          wrongItems.push(multi ? (v + ":" + uk) : uk);
        });
      });

      if (expected.length > 0) totalScore += Math.max(0, hit - 0.5 * extra) / expected.length;
    });

    var acc = Math.round((totalScore / views.length) * 1000) / 1000;
    var outcome = acc >= 0.999 ? "correct" : (acc >= 0.5 ? "partial" : "wrong");
    if (outcome === "correct") acc = 1;
    return { acc: acc, outcome: outcome, codes: codes, rows: rows, wrongItems: wrongItems };
  }

  DH.Grading = {
    gradeAnswer: gradeAnswer,
    okAng: okAng
  };
})(window);
