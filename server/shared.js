// Loads the single-player game data and logic (js/data, js/core) into Node, so the classroom
// server uses exactly the same questions, grading, jobs and avatar catalogue as the browser game.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  "js/data/characters.js",
  "js/data/tactics.js",
  "js/data/avatar-sprites.js",     // only the palettes are used here (colour counts for validation)
  "js/data/avatar-catalog.js",
  "js/data/mistakes.js",
  "js/data/stages.js",
  "js/data/questions.js",
  "js/core/grading.js",
  "js/core/adaptive.js"
];

function load() {
  const ctx = { console, Math, JSON, Date };
  ctx.window = ctx;
  vm.createContext(ctx);
  FILES.forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  });
  // The sprites themselves are big and never needed on the server.
  delete ctx.DH.AVATAR_SPRITES;
  return ctx.DH;
}

module.exports = { DH: load(), ROOT };
