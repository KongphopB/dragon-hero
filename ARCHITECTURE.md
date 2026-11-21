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
│  └─ scenes.css           # Stage, layered pixel avatar, monster sprite, animations
├─ js/
│  ├─ data/                # Static game data (no logic, no DOM)
│  │  ├─ characters.js     # FORCES, JOBS, CARDS, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, HATS
│  │  ├─ mistakes.js       # MISTAKE_META, TOPIC_LABELS
│  │  ├─ stages.js         # STAGES (5 stages -> Slime, Goblin, Fenrir, Orc, Dragon Boss)
│  │  ├─ monster-rigs.js   # Which rectangle of each monster sprite moves (wings, tail, blade...) and its pivot
│  │  └─ questions.js      # QUESTIONS stock (Types A, B, C, D cos/sin)
│  ├─ core/                # Pure game logic (no DOM rendering)
│  │  ├─ grading.js        # gradeAnswer(q, place) -> acc, outcome, codes, rows
│  │  ├─ adaptive.js       # Picks next question weighted toward the player's frequent mistakes
│  │  └─ game.js           # State machine, timers, tactic cards, damage, hearts
│  ├─ ui/                  # DOM & SVG rendering only
│  │  ├─ avatar.js         # Composes layered 48x48 PNG character parts (Option C)
│  │  ├─ fbd-board.js      # Drag-and-drop FBD & cos/sin vector board
│  │  └─ screens.js        # Renders each game phase screen
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
9. **Monster animation rigs:** each monster sprite is drawn several times, each copy clipped to one region (`js/data/monster-rigs.js`). If a monster's art changes, re-check the clip rectangles against a 10% grid overlay of the new sprite. Idle motion per monster lives in `css/animation-rig.css` (`.rig-<id>`).
10. **Character blink:** `assets/characters/parts/body/blink_<skin>.png` are eyelid overlays generated from the skin sprites (eyes at x 19–20 & 26–27, y 16–21). Regenerate them if the face changes.
