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
  warrior: { id: "warrior", name: "นักรบ", icon: "⚔️", passive: "ตอบถูก 3 ข้อติดกัน → ดาเมจ +15%", startCard: "double" },
  archer:  { id: "archer",  name: "นักธนู", icon: "🏹", passive: "โบนัสความเร็วสูงสุด ×1.6 (คนอื่น ×1.5)", startCard: "freeze" },
  mage:    { id: "mage",    name: "นักเวท", icon: "🔮", passive: "ได้การ์ดเพิ่มอีก 1 ใบเมื่อปราบมอนสเตอร์", startCard: "magnifier" },
  knight:  { id: "knight",  name: "อัศวิน", icon: "🛡️", passive: "ข้อแรกที่ผิดของแต่ละด่าน ไม่เสียหัวใจและไม่เสียการ์ดดาบคู่", startCard: "shield" },
  priest:  { id: "priest",  name: "นักบวช", icon: "✨", passive: "การ์ดปลุกใจฟื้นพลังและเพิ่มดาเมจได้ดียิ่งขึ้น", startCard: "heal" }
};

window.DH.CARDS = {
  double:        { id: "double",        name: "ดาบคู่ ×2",   icon: "⚔️", desc: "ดาเมจ ×2 เมื่อถูกเต็ม · ถ้าผิดติดลบ -50%!" },
  freeze:        { id: "freeze",        name: "หยุดเวลา",    icon: "❄️", desc: "แช่แข็งนาฬิกาของตัวเอง +10 วินาที" },
  shield:        { id: "shield",        name: "โล่ป้องกัน",   icon: "🛡️", desc: "ผิดไม่เสียหัวใจ ไม่เสีย Streak" },
  magnifier:     { id: "magnifier",     name: "แว่นขยาย",   icon: "🔍", desc: "แอบดูจำนวนแรงทั้งหมดในเฉลย (ดาเมจ ×0.85)" },
  second_chance: { id: "second_chance", name: "โอกาสที่สอง",  icon: "🔁", desc: "ส่งผิดบอกจุดผิดและแก้ได้ 1 ครั้ง (ดาเมจ ×0.7)" },
  heal:          { id: "heal",          name: "ฟื้นฟู & ปลุกใจ", icon: "💚", desc: "ถ้าตอบถูก ฟื้นหัวใจ +1 และเพิ่มดาเมจ +15%" }
};

window.DH.ALL_CARDS = ["double", "freeze", "shield", "magnifier", "second_chance", "heal"];

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
