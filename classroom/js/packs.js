// Question packs offered when creating a room. The built-in packs are slices of the
// single-player bank (js/data/questions.js) by topic; teacher-made packs come later (milestone 5).
(function () {
  var DH = window.DH;

  var BUILT_IN = [
    { id: "std_all", name: "ครบทุกเรื่อง (มาตรฐาน)", recommended: true,
      desc: "ไล่จาก FBD พื้นฐานถึงแตกแรง cos/sin ครบ 5 เรื่อง",
      topics: ["flat", "rope", "multi", "incline", "decompose"] },
    { id: "basics", name: "FBD พื้นฐาน",
      desc: "พื้นราบ เชือก การแขวน หลายวัตถุ ยังไม่ต้องแตกแรง",
      topics: ["flat", "rope", "multi"] },
    { id: "incline", name: "พื้นเอียง & แตกแรง",
      desc: "สำหรับห้องที่เรียนเรื่องพื้นเอียงและการแตกแรงแล้ว",
      topics: ["incline", "decompose"] }
  ];

  function summarise(pack) {
    var qs = DH.QUESTIONS.filter(function (q) { return pack.topics.indexOf(q.topic) >= 0; });
    var lv = { "ง่าย": 0, "กลาง": 0, "ยาก": 0 };
    var tm = 0;
    qs.forEach(function (q) { lv[q.lv] = (lv[q.lv] || 0) + 1; tm += q.tm || 30; });
    return {
      id: pack.id, name: pack.name, desc: pack.desc, recommended: !!pack.recommended, topics: pack.topics,
      questions: qs, count: qs.length, levels: lv, avgTime: qs.length ? tm / qs.length : 30
    };
  }

  DH.PACKS = BUILT_IN.map(summarise);
})();
