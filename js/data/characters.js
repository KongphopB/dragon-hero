window.DH = window.DH || {};

window.DH.FORCES = {
  W: { n: "น้ำหนัก W (mg)", short: "W", c: "#3b82f6" },
  N: { n: "แรงตั้งฉาก N", short: "N", c: "#22c55e" },
  R: { n: "แรงจากผนัง R", short: "R", c: "#f97316" },
  S: { n: "แรงจากผนัง R", short: "R", c: "#f97316" },
  P: { n: "แรงสัมผัสวัตถุ P", short: "P", c: "#ec4899" },
  Q: { n: "แรงสัมผัสวัตถุ P", short: "P", c: "#ec4899" },
  T: { n: "แรงตึงเชือก T", short: "T", c: "#a855f7" },
  U: { n: "แรงตึงเชือก 2 (T₂)", short: "T₂", c: "#06b6d4" },
  f: { n: "แรงเสียดทาน f", short: "f", c: "#eab308" },
  F: { n: "แรงดึง/ผลัก F", short: "F", c: "#ef4444" }
};

window.DH.JOBS = {
  warrior: { id: "warrior", name: "นักรบ",  icon: "⚔️", passive: "ตอบถูก 3 ข้อติดกัน → ดาเมจ +15%", startCard: "double" },
  archer:  { id: "archer",  name: "นักธนู", icon: "🏹", passive: "โบนัสความเร็วสูงสุด ×1.6 (คนอื่น ×1.5)", startCard: "freeze" },
  mage:    { id: "mage",    name: "นักเวท", icon: "🔮", passive: "เลือกการ์ดรางวัลจาก 4 ใบ (คนอื่น 3 ใบ)", startCard: "protractor" },
  knight:  { id: "knight",  name: "อัศวิน", icon: "🛡️", passive: "ข้อแรกที่ผิดของแต่ละด่าน ไม่เสียหัวใจ", startCard: "shield" },
  priest:  { id: "priest",  name: "นักบวช", icon: "✨", passive: "การ์ดฟื้นฟูฟื้น 2 หัวใจ (คนอื่น 1)", startCard: "heal" }
};

// Cards, intents and ultimates: js/data/tactics.js

window.DH.SKIN_TONES   = ["#fde2c8", "#f0be93", "#d18f5e", "#945a38"];
window.DH.HAIR_COLORS  = ["#1e293b", "#78350f", "#eab308", "#dc2626", "#4f46e5", "#e2e8f0"];
window.DH.OUTFIT_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#7c3aed", "#d97706", "#0891b2", "#db2777", "#475569"];
window.DH.HATS         = ["ไม่มี", "หมวกแม่มด", "มงกุฎเล็ก", "ผ้าคาดหัว", "ฮู้ดนักเดินทาง", "หมวกเหล็ก"];

window.DH.esc = function (s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};
