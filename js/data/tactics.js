window.DH = window.DH || {};

// =====================================================================
// Tactic system data: cards, monster intents, job ultimates.
// Logic lives in js/core/game.js; this file is numbers and words only.
// =====================================================================

// One card per question. Every card has a clear trade-off or a situation it answers.
window.DH.CARDS = {
  double:        { id: "double",        name: "ดาบคู่ ×2",      icon: "⚔️", kind: "attack",  desc: "ถูกครบ ดาเมจ ×2 · ถ้าไม่ครบ คะแนนติดลบ!" },
  breaker:       { id: "breaker",       name: "ทุบเกราะ",       icon: "🔨", kind: "attack",  desc: "ทะลุการ์ดของมอน · ปกติดาเมจ +20%" },
  shield:        { id: "shield",        name: "โล่ป้องกัน",      icon: "🛡️", kind: "defense", desc: "ผิดก็ไม่เสียหัวใจ ไม่เสีย streak · กันท่าโจมตีหนักและการขโมย" },
  heal:          { id: "heal",          name: "ฟื้นฟู",          icon: "💚", kind: "defense", desc: "ฟื้นหัวใจทันที · ถ้าตอบถูก ดาเมจ +15%" },
  freeze:        { id: "freeze",        name: "หยุดเวลา",       icon: "❄️", kind: "defense", desc: "แช่แข็งนาฬิกา 10 วินาที · ลบผลเร่งเวลาของมอน" },
  xray:          { id: "xray",          name: "เอ็กซ์เรย์",       icon: "🔍", kind: "study",   desc: "เผยลูกศรที่ถูก 1 เส้นบนกระดาน · ดาเมจ ×0.7" },
  cut:           { id: "cut",           name: "ตัดตัวหลอก",      icon: "✂️", kind: "study",   desc: "ซ่อนปุ่มแรงที่ไม่มีในข้อนี้ · ดาเมจ ×0.8" },
  protractor:    { id: "protractor",    name: "ไม้โปรแทรกเตอร์", icon: "📐", kind: "study",   desc: "แสดงเส้นแกนและมุมบนกระดาน · ดาเมจ ×0.9" },
  second_chance: { id: "second_chance", name: "โอกาสที่สอง",     icon: "🔁", kind: "study",   desc: "ส่งผิดจะบอกจุดผิดให้แก้ 1 ครั้ง · ดาเมจ ×0.7" }
};
window.DH.ALL_CARDS = Object.keys(window.DH.CARDS);

// Damage multipliers for study cards (the price of the help).
window.DH.CARD_MULT = { xray: 0.7, cut: 0.8, protractor: 0.9, second_chance: 0.7, breaker: 1.2, heal: 1.15 };

window.DH.HAND_MAX = 5;

// What the monster will do this question. Shown before the player answers, so the card choice matters.
// counter: cards that answer this intent (highlighted in the hand as "แก้ทาง").
window.DH.INTENTS = {
  open:   { icon: "😴", name: "เปิดช่อง",   desc: "ตานี้ดาเมจของคุณ ×1.5",                         counter: ["double", "breaker"], good: true },
  heavy:  { icon: "💢", name: "โจมตีหนัก",  desc: "ถ้าตอบผิดเกินครึ่ง เสีย 2 หัวใจ",                   counter: ["shield"] },
  guard:  { icon: "🛡️", name: "ตั้งการ์ด",   desc: "ดาเมจของคุณเหลือครึ่ง (ยกเว้นใช้ทุบเกราะ)",          counter: ["breaker"] },
  haste:  { icon: "⏩", name: "เร่งเวลา",   desc: "เวลาทำโจทย์ลดลง 30%",                            counter: ["freeze"] },
  charge: { icon: "🔥", name: "ชาร์จพลัง",  desc: "ถ้าตีไม่ถึง {X} ดาเมจ มอนจะฟื้นเลือด 15%",          counter: ["double", "breaker"] },
  regen:  { icon: "💧", name: "ฟื้นตัว",     desc: "ถ้าตอบไม่ถูกครบ มอนฟื้นเลือด 15%",                 counter: ["xray", "cut"] },
  steal:  { icon: "🫳", name: "จ้องขโมย",   desc: "ถ้าตอบผิดเกินครึ่ง มอนขโมยการ์ดคุณ 1 ใบ",            counter: ["shield"] }
};

// Each monster has a signature move (highest weight) so stages feel different.
window.DH.MONSTER_INTENTS = {
  slime:  { regen: 3, open: 2, heavy: 1 },
  goblin: { steal: 3, open: 1, haste: 1, heavy: 1 },
  fenrir: { haste: 3, heavy: 2, open: 1 },
  orc:    { guard: 3, heavy: 2, open: 1 },
  dragon: { charge: 3, heavy: 2, guard: 1, haste: 1, open: 1 }
};

// Job ultimates: the gauge fills +1 per fully correct answer (+0.5 partial); 3 = ready.
window.DH.ULT_MAX = 3;
window.DH.ULTIMATES = {
  warrior: { name: "ฟันทะลวง",        icon: "🗡️", color: "#f97316", desc: "ถ้าตอบถูกเกินครึ่ง ดาเมจ ×3 และทะลุการ์ด" },
  archer:  { name: "ฝนธนู",           icon: "🏹", color: "#22c55e", desc: "ได้โบนัสความเร็วเต็มเสมอ ดาเมจ ×1.6 และทะลุการ์ด" },
  mage:    { name: "อุกกาบาต",        icon: "☄️", color: "#38bdf8", desc: "อุกกาบาตตกใส่มอน 2 เท่าของดาเมจพื้นฐาน แม้ตอบผิด!" },
  knight:  { name: "ป้อมปราการ",       icon: "🏰", color: "#60a5fa", desc: "ตอบผิดได้อีก 2 ข้อโดยไม่เสียหัวใจ · ตานี้ดาเมจ ×1.5" },
  priest:  { name: "แสงศักดิ์สิทธิ์",    icon: "🌟", color: "#fde047", desc: "ฟื้นหัวใจเต็ม หายหมดแรง · ตานี้ดาเมจ ×1.5" }
};
