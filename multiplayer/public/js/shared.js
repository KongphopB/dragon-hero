(function (global) {
  var FORCES = {
    W: { n: "น้ำหนัก W (mg)", short: "W", c: "#3b82f6" },
    N: { n: "แรงตั้งฉาก N", short: "N", c: "#22c55e" },
    R: { n: "แรงจากผนัง R", short: "R", c: "#f97316" },
    S: { n: "แรงจากผนัง R", short: "R", c: "#f97316" },
    P: { n: "แรงสัมผัสวัตถุ P", short: "P", c: "#ec4899" },
    Q: { n: "แรงสัมผัสวัตถุ P", short: "P", c: "#ec4899" },
    T: { n: "แรงตึงเชือก T", short: "T", c: "#a855f7" },
    U: { n: "แรงตึงเชือก 2 (T₂)", short: "T₂", c: "#06b6d4" },
    f: { n: "แรงเสียดทาน f", short: "f", c: "#eab308" },
    F: { n: "แรงดึง/ผลัก F", short: "F", c: "#ef4444" },
  };

  var JOBS = {
    warrior: {
      id: "warrior", name: "นักรบ", icon: "⚔️", color: "#dc2626",
      passive: "ตอบถูก 3 ข้อติดกัน → ดาเมจ +15%",
      weaponDesc: "ดาบใหญ่", startCard: "double"
    },
    archer: {
      id: "archer", name: "นักธนู", icon: "🏹", color: "#16a34a",
      passive: "โบนัสความเร็วสูงสุด ×1.6 (คนอื่น ×1.5)",
      weaponDesc: "ธนูยาว", startCard: "freeze"
    },
    mage: {
      id: "mage", name: "นักเวท", icon: "🔮", color: "#7c3aed",
      passive: "ได้การ์ดเพิ่มอีก 1 ใบเมื่อปราบมอนสเตอร์",
      weaponDesc: "คทาเวทมนตร์", startCard: "magnifier"
    },
    knight: {
      id: "knight", name: "อัศวิน", icon: "🛡️", color: "#2563eb",
      passive: "ข้อแรกที่ผิดของแต่ละด่าน ไม่บาดเจ็บและไม่เสียการ์ดดาบคู่",
      weaponDesc: "หอกและโล่", startCard: "shield"
    },
    priest: {
      id: "priest", name: "นักบวช", icon: "✨", color: "#d97706",
      passive: "เมื่อตอบถูก เพื่อนทั้งห้องได้ดาเมจ +2% (ซ้อนสูงสุด +20%)",
      weaponDesc: "คทาแสง", startCard: "heal"
    }
  };

  var CARDS = {
    double: { id: "double", name: "ดาบคู่ ×2", icon: "⚔️", desc: "ดาเมจ ×2 เมื่อถูกเต็ม · ถ้าผิดติดลบ -50%!", color: "#dc2626" },
    freeze: { id: "freeze", name: "หยุดเวลา", icon: "❄️", desc: "แช่แข็งนาฬิกาของตัวเอง +10 วินาที", color: "#0284c7" },
    shield: { id: "shield", name: "โล่ป้องกัน", icon: "🛡️", desc: "ผิดไม่บาดเจ็บ ไม่เสีย Streak", color: "#2563eb" },
    magnifier: { id: "magnifier", name: "แว่นขยาย", icon: "🔍", desc: "แอบดูจำนวนแรงทั้งหมดในเฉลย (ดาเมจ ×0.85)", color: "#7c3aed" },
    second_chance: { id: "second_chance", name: "โอกาสที่สอง", icon: "🔁", desc: "ส่งผิดบอกจุดผิดและแก้ได้ 1 ครั้ง (ดาเมจ ×0.7)", color: "#059669" },
    heal: { id: "heal", name: "ปลุกใจทีม", icon: "💚", desc: "ถ้าตอบถูก ทั้งห้องได้ดาเมจ +5%", color: "#16a34a" }
  };

  var SKIN_TONES = ["#fde2c8", "#f3c59f", "#d99b6c", "#9c623e"];
  var HAIR_COLORS = ["#1e293b", "#78350f", "#b45309", "#dc2626", "#4f46e5", "#e2e8f0"];
  var OUTFIT_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#7c3aed", "#d97706", "#0891b2", "#db2777", "#334155"];
  var HATS = ["ไม่มี", "หมวกแม่มด", "มงกุฎเล็ก", "ผ้าคาดหัว", "ฮู้ดนักเดินทาง", "หมวกเหล็ก"];

  var TOPIC_LABELS = {
    flat: "พื้นราบ & แรงเสียดทาน",
    rope: "เชือก & การแขวน",
    incline: "พื้นเอียง",
    multi: "หลายวัตถุ & แรงภายใน",
    decompose: "แตกแรง sin/cos",
    equation: "สมการสมดุล"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function heroAvatarSvg(look, job, opts) {
    opts = opts || {};
    look = look || {};
    if (opts.masked) {
      return '<svg viewBox="0 0 96 96" class="hero-svg">' +
        '<ellipse cx="48" cy="86" rx="22" ry="6" fill="rgba(0,0,0,0.35)"/>' +
        '<rect x="34" y="64" width="10" height="18" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>' +
        '<rect x="52" y="64" width="10" height="18" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>' +
        '<path d="M26 68 L32 38 L64 38 L70 68 Z" fill="#334155" stroke="#0f172a" stroke-width="3"/>' +
        '<path d="M26 38 Q48 8 70 38 L64 46 L32 46 Z" fill="#1e293b" stroke="#0f172a" stroke-width="3"/>' +
        '<circle cx="48" cy="30" r="12" fill="#0f172a"/>' +
        '<circle cx="43" cy="31" r="2" fill="#94a3b8"/><circle cx="53" cy="31" r="2" fill="#94a3b8"/>' +
        '<text x="48" y="60" text-anchor="middle" font-size="14" font-weight="800" fill="#cbd5e1">?</text>' +
        '</svg>';
    }
    var skin = SKIN_TONES[(look.skin || 0) % SKIN_TONES.length];
    var hCol = HAIR_COLORS[(look.hairColor || 0) % HAIR_COLORS.length];
    var oCol = OUTFIT_COLORS[(look.outfit || 0) % OUTFIT_COLORS.length];
    var hairIdx = (look.hair || 0) % 6;
    var hatIdx = (look.hat || 0) % 6;

    // Weapon SVG behind/beside body
    var weapon = "";
    if (job === "warrior") {
      weapon = '<line x1="66" y1="54" x2="88" y2="18" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/>' +
        '<line x1="62" y1="48" x2="74" y2="56" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>';
    } else if (job === "archer") {
      weapon = '<path d="M68 24 Q84 46 68 68" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="68" y1="24" x2="68" y2="68" stroke="#e2e8f0" stroke-width="1.5"/>' +
        '<line x1="58" y1="46" x2="86" y2="46" stroke="#cbd5e1" stroke-width="2.5"/>';
    } else if (job === "mage") {
      weapon = '<line x1="72" y1="22" x2="72" y2="82" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="72" cy="19" r="7" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>' +
        '<circle cx="70" cy="17" r="2" fill="#fff"/>';
    } else if (job === "knight") {
      weapon = '<line x1="74" y1="14" x2="74" y2="82" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>' +
        '<polygon points="74,6 68,18 80,18" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>' +
        '<path d="M18 42 L34 42 L34 58 Q26 68 18 58 Z" fill="#94a3b8" stroke="#1e293b" stroke-width="2.5"/>';
    } else { // priest
      weapon = '<line x1="72" y1="24" x2="72" y2="82" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="72" cy="20" r="6" fill="#fef08a" stroke="#d97706" stroke-width="2"/>';
    }

    // Hair styles
    var hair = "";
    if (hairIdx === 0) hair = '<path d="M33 26 Q48 10 63 26 L61 20 Q48 14 35 20 Z" fill="' + hCol + '"/>';
    else if (hairIdx === 1) hair = '<path d="M32 28 Q36 10 48 12 Q60 10 64 28 L58 21 L48 18 L38 21 Z" fill="' + hCol + '"/>';
    else if (hairIdx === 2) hair = '<path d="M32 28 Q30 12 48 11 Q66 12 64 28 L65 44 L59 44 L58 24 L38 24 L37 44 L31 44 Z" fill="' + hCol + '"/>';
    else if (hairIdx === 3) hair = '<circle cx="29" cy="24" r="6" fill="' + hCol + '"/><path d="M33 26 Q48 11 63 26 Z" fill="' + hCol + '"/>';
    else if (hairIdx === 4) hair = '<polygon points="34,24 40,8 46,20 52,7 58,20 64,12 62,26" fill="' + hCol + '"/>';
    else hair = '<path d="M33 25 Q48 14 63 25" fill="none" stroke="' + hCol + '" stroke-width="5" stroke-linecap="round"/>';

    // Hats
    var hat = "";
    if (hatIdx === 1) {
      hat = '<polygon points="48,2 30,22 66,22" fill="#4c1d95" stroke="#1e1b4b" stroke-width="2"/>' +
        '<ellipse cx="48" cy="22" rx="22" ry="4" fill="#5b21b6" stroke="#1e1b4b" stroke-width="2"/>';
    } else if (hatIdx === 2) {
      hat = '<polygon points="36,18 39,8 44,14 48,6 52,14 57,8 60,18" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>';
    } else if (hatIdx === 3) {
      hat = '<rect x="33" y="19" width="30" height="5" rx="2" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>';
    } else if (hatIdx === 4) {
      hat = '<path d="M30 32 Q48 6 66 32 L62 20 Q48 12 34 20 Z" fill="#334155" stroke="#0f172a" stroke-width="2"/>';
    } else if (hatIdx === 5) {
      hat = '<path d="M32 28 Q32 10 48 10 Q64 10 64 28 Z" fill="#94a3b8" stroke="#1e293b" stroke-width="2.5"/>';
    }

    // Cape for warrior / priest / mage
    var cape = (job === "warrior" || job === "mage" || job === "priest")
      ? '<path d="M34 40 L24 72 L40 68 Z" fill="' + (job === "priest" ? "#f8fafc" : oCol) + '" opacity="0.85" stroke="#0f172a" stroke-width="2"/>'
      : "";

    return '<svg viewBox="0 0 96 96" class="hero-svg">' +
      '<ellipse cx="48" cy="86" rx="20" ry="5" fill="rgba(0,0,0,0.35)"/>' +
      cape +
      '<rect x="35" y="66" width="9" height="17" rx="3" fill="#334155" stroke="#0f172a" stroke-width="2"/>' +
      '<rect x="50" y="66" width="9" height="17" rx="3" fill="#334155" stroke="#0f172a" stroke-width="2"/>' +
      '<rect x="33" y="39" width="28" height="29" rx="6" fill="' + oCol + '" stroke="#0f172a" stroke-width="2.5"/>' +
      '<rect x="33" y="54" width="28" height="5" fill="#78350f" stroke="#0f172a" stroke-width="1.5"/>' +
      '<rect x="44" y="53" width="6" height="7" rx="1" fill="#fbbf24"/>' +
      weapon +
      '<circle cx="47" cy="27" r="14" fill="' + skin + '" stroke="#0f172a" stroke-width="2.5"/>' +
      '<circle cx="42" cy="28" r="2.2" fill="#0f172a"/>' +
      '<circle cx="53" cy="28" r="2.2" fill="#0f172a"/>' +
      '<path d="M44 34 Q48 37 51 34" fill="none" stroke="#7c2d12" stroke-width="2" stroke-linecap="round"/>' +
      hair +
      hat +
      '</svg>';
  }

  function formatSec(ms) {
    return Math.max(0, Math.ceil(ms / 1000));
  }

  global.DH = {
    FORCES: FORCES,
    JOBS: JOBS,
    CARDS: CARDS,
    SKIN_TONES: SKIN_TONES,
    HAIR_COLORS: HAIR_COLORS,
    OUTFIT_COLORS: OUTFIT_COLORS,
    HATS: HATS,
    TOPIC_LABELS: TOPIC_LABELS,
    esc: esc,
    heroAvatarSvg: heroAvatarSvg,
    formatSec: formatSec
  };
})(window);
