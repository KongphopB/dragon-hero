window.DH = window.DH || {};

// Layered overlapping rigs using clean transparent part sprites (assets/monsters/parts/*)
// so animated parts never slice or tear gaps across body outlines.
window.DH.MONSTER_RIGS = {
  slime: {
    baseSrc: "assets/monsters/parts/slime_body.webp",
    parts: [
      { name: "blink", src: "assets/monsters/parts/slime_blink.webp", pivot: "50% 50%", z: 3 },
      { name: "crown", src: "assets/monsters/parts/slime_crown.webp", pivot: "50% 27%", z: 4 }
    ],
    fx: [
      { name: "bubble bubble-1", left: "16%", top: "36%" },
      { name: "bubble bubble-2", left: "84%", top: "44%" },
      { name: "bubble bubble-3", left: "72%", top: "22%" }
    ]
  },
  goblin: {
    baseSrc: "assets/monsters/parts/goblin_body.webp",
    atkSeq: [
      "assets/monsters/parts/goblin_coil.webp",
      "assets/monsters/parts/goblin_windup.webp",
      "assets/monsters/parts/goblin_mid.webp",
      "assets/monsters/parts/goblin_strike.webp",
      "assets/monsters/parts/goblin_follow.webp"
    ],
    parts: [
      { name: "head",  src: "assets/monsters/parts/goblin_head.webp",  pivot: "56% 32%", z: 3 },
      { name: "blade", src: "assets/monsters/parts/goblin_blade.webp", pivot: "36% 63%", z: 4 }
    ],
    fx: [
      { name: "gob-eye gob-eye-l", left: "50%", top: "26%" },
      { name: "gob-eye gob-eye-r", left: "60.5%", top: "26.5%" },
      { name: "blade-glint", left: "14%", top: "36%" }
    ]
  },
  fenrir: {
    baseSrc: "assets/monsters/parts/fenrir_body.webp",
    atkSeq: [
      "assets/monsters/parts/fenrir_coil.webp",
      "assets/monsters/parts/fenrir_windup.webp",
      "assets/monsters/parts/fenrir_leap.webp",
      "assets/monsters/parts/fenrir_strike.webp",
      "assets/monsters/parts/fenrir_recoil.webp"
    ],
    parts: [
      { name: "tail", src: "assets/monsters/parts/fenrir_tail.webp", pivot: "79% 43%", z: 3 },
      { name: "head", src: "assets/monsters/parts/fenrir_head.webp", pivot: "28% 36%", z: 4 }
    ],
    fx: [
      { name: "eye-glow", left: "15.5%", top: "33%" },
      { name: "eye-glow eye-glow-2", left: "6%", top: "32%" },
      { name: "mist mist-1", left: "5%", top: "48%" },
      { name: "mist mist-2", left: "2%", top: "43%" }
    ]
  },
  orc: {
    baseSrc: "assets/monsters/parts/orc_body.webp",
    atkSeq: [
      "assets/monsters/parts/orc_brace.webp",
      "assets/monsters/parts/orc_windup.webp",
      "assets/monsters/parts/orc_mid.webp",
      "assets/monsters/parts/orc_strike.webp",
      "assets/monsters/parts/orc_follow.webp"
    ],
    parts: [
      { name: "plume", src: "assets/monsters/parts/orc_plume.webp", pivot: "58% 10%", z: 1 },
      { name: "head",  src: "assets/monsters/parts/orc_head.webp",  pivot: "51% 27%", z: 3 },
      { name: "club",  src: "assets/monsters/parts/orc_club.webp",  pivot: "39% 62%", z: 4 }
    ],
    fx: [
      { name: "orc-eye orc-eye-l", left: "53.5%", top: "21%" },
      { name: "orc-eye orc-eye-r", left: "60%", top: "21%" },
      { name: "spark spark-1", left: "28%", top: "42%" },
      { name: "spark spark-2", left: "82%", top: "34%" }
    ]
  },
  dragon: {
    baseSrc: "assets/monsters/parts/dragon_body.webp",
    atkSeq: [
      "assets/monsters/parts/dragon_coil.webp",
      "assets/monsters/parts/dragon_charge.webp",
      "assets/monsters/parts/dragon_charge_peak.webp",
      "assets/monsters/parts/dragon_breath.webp",
      "assets/monsters/parts/dragon_breath_2.webp",
      "assets/monsters/parts/dragon_recoil.webp"
    ],
    parts: [
      { name: "wing-back",  src: "assets/monsters/parts/dragon_wing_back.webp",  pivot: "40% 34%", z: 1 },
      { name: "wing-front", src: "assets/monsters/parts/dragon_wing_front.webp", pivot: "54% 35%", z: 3 },
      { name: "head",       src: "assets/monsters/parts/dragon_head.webp",       pivot: "30% 62%", z: 4 }
    ],
    fx: [
      { name: "fire-glow", left: "17.5%", top: "70%" },
      { name: "dragon-eye", left: "20%", top: "59.5%" },
      { name: "ember ember-1", left: "14%", top: "66%" },
      { name: "ember ember-2", left: "24%", top: "70%" },
      { name: "ember ember-3", left: "44%", top: "42%" }
    ]
  }
};
