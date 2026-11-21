window.DH = window.DH || {};

// Cut-out rigs for the single-image monster sprites.
// Each moving part is the same sprite clipped to a rectangle (`clip`, CSS inset: top right bottom left)
// and animated around `pivot`. `base` clips the hole out of the body copy so a moving part never shows
// a ghost of itself underneath. Percentages are of the sprite box; check them against a 10% grid
// overlay of the sprite if the art changes.
window.DH.MONSTER_RIGS = {
  slime: {
    base: "inset(27% 0 0 0)",
    parts: [
      { name: "crown", clip: "inset(0 0 73% 0)", pivot: "50% 27%" }
    ],
    fx: []
  },
  goblin: {
    base: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 72%, 36% 72%, 36% 15%, 0 15%)",
    parts: [
      { name: "blade", clip: "inset(15% 64% 28% 0)", pivot: "34% 64%" }
    ],
    fx: []
  },
  fenrir: {
    base: "polygon(30% 0, 78% 0, 78% 45%, 100% 45%, 100% 100%, 0 100%, 0 62%, 30% 62%)",
    parts: [
      { name: "tail", clip: "inset(0 0 55% 78%)", pivot: "80% 42%" },
      { name: "head", clip: "inset(0 70% 38% 0)", pivot: "30% 45%" }
    ],
    fx: [{ name: "eye-glow", left: "14%", top: "31%" }]
  },
  orc: {
    base: "polygon(0 0, 100% 0, 100% 100%, 38% 100%, 38% 62%, 0 62%)",
    parts: [
      { name: "club", clip: "inset(62% 62% 0 0)", pivot: "40% 64%" }
    ],
    fx: []
  },
  dragon: {
    base: "inset(40% 0 0 0)",
    parts: [
      { name: "wings", clip: "inset(0 0 60% 0)", pivot: "55% 40%" }
    ],
    fx: [{ name: "fire-glow", left: "17%", top: "71%" }]
  }
};
