window.DH = window.DH || {};

window.DH.STAGES = [
  {
    stage: 1,
    monsterId: "slime",
    name: "ราชาสไลม์ (King Slime)",
    subtitle: "ทุ่งหญ้าริมหมู่บ้าน · พื้นราบและเชือกพื้นฐาน",
    bg: "assets/bg/bg_slime.webp",
    sprite: "assets/monsters/spr_slime.webp",
    count: 2,
    baseDmg: 100,
    hpFactor: 0.65
  },
  {
    stage: 2,
    monsterId: "goblin",
    name: "ราชาก๊อบลิน (Goblin King)",
    subtitle: "ป่าสนยามอัสดง · เชือก 2 เส้นและพื้นเอียงเบื้องต้น",
    bg: "assets/bg/bg_gob.webp",
    sprite: "assets/monsters/spr_gob.webp",
    count: 2,
    baseDmg: 120,
    hpFactor: 0.65
  },
  {
    stage: 3,
    monsterId: "fenrir",
    name: "หมาป่าเฟนริล (Fenrir)",
    subtitle: "ป่าเห็ดเรืองแสง · พื้นเอียงฝืดและหลายวัตถุ",
    bg: "assets/bg/bg_fen.webp",
    sprite: "assets/monsters/spr_fen.webp",
    count: 2,
    baseDmg: 140,
    hpFactor: 0.65
  },
  {
    stage: 4,
    monsterId: "orc",
    name: "จอมทัพออร์ค (Orc Warlord)",
    subtitle: "ทุ่งกระดูกเถ้าถ่าน · แตกแรง sin/cos และระบบท่อ",
    bg: "assets/bg/bg_orc.webp",
    sprite: "assets/monsters/spr_orc.webp",
    count: 3,
    baseDmg: 160,
    hpFactor: 0.65
  },
  {
    stage: 5,
    monsterId: "dragon",
    name: "มังกรเพลิงบรรพกาล (Boss)",
    subtitle: "หน้าผาปากถ้ำมังกร · บททดสอบสมดุลกลขั้นสูงสุด",
    bg: "assets/bg/bg_dragon.webp",
    sprite: "assets/monsters/spr_dragon.webp",
    count: 4,
    baseDmg: 200,
    hpFactor: 0.65,
    isBoss: true
  }
];
