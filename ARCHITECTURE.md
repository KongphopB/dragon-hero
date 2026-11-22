# Dragon Hero: FBD Quest — Architecture & Project Rules

## Tech Stack
- **Single-Player (Current Focus):** Pure HTML5 + CSS3 + Vanilla JavaScript (`window.DH` namespace, classic `<script>` tags—NO ES modules or `fetch()` on `file://` so double-clicking `index.html` works offline in any browser).
- **Art Style:** 16-bit Pixel Art (`image-rendering: pixelated`).
  - Clean empty backgrounds (`assets/bg/`).
  - Independent transparent monster sprites (`assets/monsters/`).
  - Option C Layered Paper-Doll Character Parts on a shared `48×48` pixel grid (`assets/characters/parts/`).
- **Multiplayer (Deferred to `multiplayer/`):** Python 3.12 stdlib HTTP + SSE server (`multiplayer/server.py`). Will be integrated after single-player gameplay is finalized.

## Directory Structure
```
dragon hero/
├─ index.html              # Single-player entry point (loads CSS & JS in order)
├─ ARCHITECTURE.md         # This file
├─ css/
│  ├─ theme.css            # Colors, buttons, cards, FBD board
│  ├─ creator.css          # Character creator: live preview stage, hair/hat pickers, job cards
│  ├─ animation-rig.css    # Character idle/attack/hurt, monster rigs, impact effects
│  ├─ systems.css          # Mute, exhausted state, boss phase-up, resume banner, send-to-teacher, tutorial
│  ├─ tactics.css          # Monster intent bar, card hand, ultimate gauge, card draft, card/ultimate battle effects
│  └─ scenes.css           # Stage, layered pixel avatar, monster sprite, animations
├─ js/
│  ├─ data/                # Static game data (no logic, no DOM)
│  │  ├─ characters.js     # FORCES, JOBS, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, HATS
│  │  ├─ tactics.js        # CARDS, CARD_MULT, INTENTS, MONSTER_INTENTS, ULTIMATES (numbers and words only)
│  │  ├─ mistakes.js       # MISTAKE_META, TOPIC_LABELS
│  │  ├─ stages.js         # STAGES (5 stages -> Slime, Goblin, Fenrir, Orc, Dragon Boss)
│  │  ├─ monster-rigs.js   # Per monster: body/part sprites (assets/monsters/parts), pivots, attack frame sequence
│  │  └─ questions.js      # QUESTIONS stock (Types A, B, C, D cos/sin)
│  ├─ core/                # Pure game logic (no DOM rendering)
│  │  ├─ grading.js        # gradeAnswer(q, place) -> acc, outcome, codes, rows
│  │  ├─ adaptive.js       # Picks next question weighted toward the player's frequent mistakes
│  │  └─ game.js           # State machine, timers, tactic cards, damage, hearts
│  ├─ ui/                  # DOM & SVG rendering only
│  │  ├─ avatar.js         # Composes layered 48x48 PNG character parts (Option C)
│  │  ├─ fbd-board.js      # Drag-and-drop FBD & cos/sin vector board
│  │  ├─ screens.js        # Renders each game phase screen
│  │  └─ tutorial.js       # First-time guided practice (2 boards + cards/hearts explainer)
│  ├─ sfx.js               # 8-bit Web Audio synthesizer
│  └─ main.js              # Bootstraps Game + UI
├─ assets/
│  ├─ bg/                  # Empty pixel-art backgrounds
│  ├─ monsters/            # Transparent pixel-art monster sprites
│  ├─ characters/parts/    # 48x48 transparent PNG parts (body, outfits, hair, hats, weapons)
│  └─ original/            # Original reference mockups and prototype HTML
└─ multiplayer/            # Classroom server & host/play/editor prototype (for Part 2)
```

## Editing Conventions
1. **Add or edit questions:** Edit `js/data/questions.js` only.
2. **Adjust monster HP / stage count / base damage:** Edit `js/data/stages.js` only.
3. **Adjust grading rules or mistake codes:** Edit `js/core/grading.js` (and `js/data/mistakes.js` for labels/tips).
4. **Update character visuals:** Swap/add 48×48 transparent PNGs in `assets/characters/parts/` (layer order in `js/ui/avatar.js`: `weapons/*_back` → `body` → `outfits` → `hair` → `hats` → `weapons/*`).
5. **Keep `file://` compatibility:** Do not introduce `import`/`export` or `fetch()` for local files in the single-player game.
6. **Backgrounds & monster sprites are WebP** (`assets/bg/*.webp`, `assets/monsters/*.webp`, quality 95) to keep the page light on phones. Convert new art to WebP before adding it; character parts stay 48×48 PNG.
7. **Hosting:** the single-player game is a static site published with GitHub Pages from `main` (repo root). Every push to `main` updates the live link, so keep `main` playable.
8. **Cache-busting:** every `css/` and `js/` link in `index.html` ends in `?v=N`. Bump `N` whenever you push a change, otherwise phones that already opened the GitHub Pages link may mix old and new files.
9. **Monster animation rigs:** each monster is a body sprite plus separate part sprites (`assets/monsters/parts/`) and an optional attack frame sequence (`atkSeq`), all listed in `js/data/monster-rigs.js`. Idle motion lives in `css/animation-rig.css` (`.rig-<id>`). `preview.html` is a debug lab for checking them. `js/main.js` preloads every file listed in the rigs, so new parts/frames only need adding to the rig list.
10. **Character blink:** `assets/characters/parts/body/blink_<skin>.png` are eyelid overlays generated from the skin sprites (eyes at x 19–20 & 26–27, y 16–21). Regenerate them if the face changes.
11. **Saved runs:** an in-progress solo run is saved to `localStorage` (`dh_solo_run`) on every screen change and about once a second while a timer runs, and offered back on the start screen for 3 days. Keep any new fields on the game state `g` JSON-serialisable.
12. **Hearts:** wrong answers (<50%) cost a heart; at 0 hearts the hero is exhausted and deals ×0.5 damage (`EXHAUSTED_MULT` in `js/core/game.js`) until healed or the next stage.
13. **Tactic system:** each question the monster rolls an intent (`MONSTER_INTENTS` weights per monster, shown before answering). The player may play one card and, when the gauge is full, the job ultimate. All rules resolve in `submitAnswer` in `js/core/game.js`; add or rebalance cards/intents/ultimates in `js/data/tactics.js`. Cards are gained only from the pick-one draft after a monster falls (mage sees 4). Study cards (x-ray, cut, protractor) work through `FBD.mount` options `overlayArrows`, `hideDecoys`, `angleGuides`.
