# Dragon Hero: FBD Quest — Architecture & Project Rules

## Tech Stack
- **Single-Player (current focus):** pure HTML5 + CSS3 + vanilla JavaScript (`window.DH` namespace, classic `<script>` tags — no ES modules or `fetch()` for local files, so double-clicking `index.html` works offline in any browser).
- **Art style:** 16-bit pixel art (`image-rendering: pixelated`).
  - Clean empty backgrounds (`assets/bg/`), transparent monster sprites + rig parts (`assets/monsters/`).
  - Characters are **generated** 64×64 layered parts (`tools/avatar/`), embedded in `js/data/avatar-sprites.js` and recoloured in the browser.
- **Multiplayer (deferred, `multiplayer/`):** Python stdlib HTTP + SSE prototype. To be rewritten after single-player is finished.

## Where do I edit…? (แก้อะไร เปิดไฟล์ไหน)

| I want to… | Open | Then |
|---|---|---|
| Add / fix a question (เพิ่ม-แก้โจทย์) | `js/data/questions.js` | — |
| Change a mistake label or tip (ข้อความจุดที่พลาด) | `js/data/mistakes.js` | — |
| Change grading rules (เกณฑ์ตรวจคำตอบ) | `js/core/grading.js` | — |
| Monster HP, question count, damage, stage order (ค่าพลังมอน/ด่าน) | `js/data/stages.js` | — |
| Card, monster intent or ultimate numbers/text (การ์ด/ท่าไม้ตาย) | `js/data/tactics.js` | rules live in `submitAnswer`, `js/core/game.js` |
| Job names, icons, passives (อาชีพ) | `js/data/characters.js` | — |
| Game flow, hearts, damage maths, save/resume (กติกาเกม) | `js/core/game.js` | — |
| One screen's layout or buttons (หน้าตาฉาก) | `js/ui/screens/<scene>.js` (table below) | — |
| HUD strip, monster rig HTML, HP panel, damage target line (ส่วนที่ใช้ร่วมกันหลายฉาก) | `js/ui/screens/common.js` | — |
| Character creator tabs (หน้าสร้างตัวละคร) | `js/ui/creator.js`, `css/creator.css` | — |
| Creator options: names, order, unlocks (รายการผม/ชุด/อาวุธ) | `js/data/avatar-catalog.js` | — |
| Draw a new hairstyle (วาดทรงผมใหม่) | `tools/avatar/shapes/hair.py` | regenerate, add id to `avatar-catalog.js` |
| Draw a new outfit (วาดชุดใหม่) | `tools/avatar/shapes/outfits.py` (+ `OUTFITS` at the bottom) | regenerate, add id to `avatar-catalog.js` |
| Draw a new weapon (วาดอาวุธใหม่) | `tools/avatar/shapes/weapons.py` | regenerate, add id to `avatar-catalog.js` |
| Race extras, beards (เผ่า/หนวด) | `tools/avatar/shapes/races.py` | regenerate |
| Hats / scarf, cape, wings (หมวก/เครื่องประดับ) | `tools/avatar/shapes/hats.py`, `accessories.py` | regenerate |
| Eyes, mouths, glasses, eyepatch, flower, pets (หน้า/สัตว์เลี้ยง) | `tools/avatar/pixel_parts.py` | regenerate |
| Colour choices for skin / hair / eyes / clothes (สี) | `build_palettes()` in `tools/avatar/build_parts.py` | regenerate |
| Hero idle / attack / hurt motion (ท่าตัวละคร) | `css/anim-hero.css` | — |
| Monster idle loop, attacks, death (ท่ามอนสเตอร์) | `css/anim-monsters.css` (`.rig-<id>`), parts in `js/data/monster-rigs.js` | check in `preview.html` |
| Hit flash, slashes, sparks, projectiles, screen shake (เอฟเฟกต์โจมตี) | `css/anim-fx.css` | — |
| Card / intent / ultimate visuals (หน้าตาการ์ด) | `css/tactics.css` | — |
| Sound effects (เสียง) | `js/sfx.js` | — |
| Tutorial (ฝึกเล่น) | `js/ui/tutorial.js` | — |
| FBD drag-and-drop board (กระดานวาดแรง) | `js/ui/fbd-board.js` | — |

**Regenerate** = `python tools/avatar/build_parts.py` (≈40 s; add `--preview` to also write `tools/avatar/preview.png`).

**Before every push** = `python tools/stamp.py` (updates every `?v=` and warns about missing or unloaded files).

### Screens: one file per game phase (`js/ui/screens/`)

| File | Phase(s) | What it shows |
|---|---|---|
| `core.js` | — | Router: picks the scene for `g.phase`, adds the HUD strip, runs its `bind` and `timer` |
| `common.js` | — | Shared pieces: HUD strip, mute button, monster rig HTML, mini HP panel, target line, dash distance |
| `lobby.js` | `LOBBY` | Hero patrolling the plaza; start, edit character, tutorial |
| `journey.js` | `INTRO`, `ENCOUNTER` | Departure cutscene; monster appears |
| `question.js` | `QUESTION` | Intent bar, ultimate gauge, card hand, FBD board, study-card helpers |
| `reveal.js` | `REVEAL` | Answer key, damage, tactic log, explanation |
| `battle.js` | `BATTLE` | Attack / counter-attack animation and effects |
| `stage-end.js` | `MON_DEFEAT`, `MON_ESCAPE` | Monster falls (card draft) or flees |
| `finale.js` | `VICTORY`, `DEFEAT` | Dragon ending |
| `summary.js` | `SUMMARY` | Medal, mistakes, progress, unlocks, send result to teacher |

Each scene file registers itself:
```js
DH.Screens.scene("PHASE", {
  html:  function (g, charDraft) { return "...markup..."; },   // HUD strip is added automatically
  bind:  function (g, charDraft) { /* wire buttons after the markup is on the page */ },
  timer: function (g, charDraft, txt, bar) { /* optional: countdown text/bar each tick */ }
});
```
To add a new phase: create `js/ui/screens/<name>.js`, add its `<script>` tag to `index.html` (after `common.js`, before `creator.js`), and run `python tools/stamp.py`.

## Directory Structure
```
dragon hero/
├─ index.html               # Single-player entry point (loads CSS & JS in order)
├─ preview.html             # Debug lab for monster rigs / battle animations
├─ ARCHITECTURE.md          # This file
├─ css/
│  ├─ theme.css             # Colours, buttons, cards, FBD board
│  ├─ scenes.css            # Stage, actors row, monster HUD, cutscenes
│  ├─ anim-hero.css         # Hero idle / attacks / hurt / block
│  ├─ anim-monsters.css     # Monster rigs, idle personality, enter / attack / hurt / die / flee
│  ├─ anim-fx.css           # Projectiles, dragon fire, impact effects, shake; reduced-motion + small-screen overrides (keep last of the three)
│  ├─ creator.css           # Character creator
│  ├─ systems.css           # Mute, exhausted state, boss phase-up, resume, send-to-teacher, tutorial, unlock banner
│  ├─ tactics.css           # Intent bar, card hand, ultimate gauge, card draft, card/ultimate effects
│  └─ avatar.css            # Avatar extras: tail/cape/wing motion, pet
├─ js/
│  ├─ data/                 # Static game data (no logic, no DOM)
│  │  ├─ characters.js      # FORCES, JOBS
│  │  ├─ tactics.js         # CARDS, CARD_MULT, INTENTS, MONSTER_INTENTS, ULTIMATES
│  │  ├─ avatar-sprites.js  # GENERATED by tools/avatar/build_parts.py — never edit by hand
│  │  ├─ avatar-catalog.js  # Creator options, unlocks, old-look migration, random look
│  │  ├─ mistakes.js        # MISTAKE_META, TOPIC_LABELS
│  │  ├─ stages.js          # STAGES (Slime, Goblin, Fenrir, Orc, Dragon boss)
│  │  ├─ monster-rigs.js    # Per monster: body/part sprites, pivots, attack frame sequence
│  │  └─ questions.js       # Question bank (types A, B, C, D cos/sin)
│  ├─ core/                 # Pure game logic (no DOM rendering)
│  │  ├─ grading.js         # gradeAnswer(q, place) -> acc, outcome, codes, rows
│  │  ├─ adaptive.js        # Picks the next question, weighted toward frequent mistakes
│  │  ├─ unlocks.js         # Cosmetic unlocks earned at the end of a run
│  │  └─ game.js            # State machine, timers, tactic cards, damage, hearts, save/resume
│  ├─ ui/                   # DOM & SVG rendering only
│  │  ├─ avatar-color.js    # Recolours avatar sprites (same ramp maths as tools/avatar/shade.py)
│  │  ├─ avatar.js          # Stacks the recoloured avatar layers (+ pet)
│  │  ├─ creator.js         # Tabbed character creator
│  │  ├─ fbd-board.js       # Drag-and-drop FBD & cos/sin vector board
│  │  ├─ screens/           # One file per game phase (see table above)
│  │  └─ tutorial.js        # First-time guided practice
│  ├─ sfx.js                # 8-bit Web Audio synthesizer
│  └─ main.js               # Bootstraps Game + UI, mute toggle, asset preloading
├─ tools/
│  ├─ stamp.py              # Cache-busting ?v= stamps (run before every push)
│  └─ avatar/               # Character art generator (Python + Pillow + NumPy)
│     ├─ build_parts.py     # Entry point: palettes, writes js/data/avatar-sprites.js
│     ├─ shapes/            # Smooth-shape parts: common, body, hair, outfits, races, accessories, hats, weapons
│     ├─ pixel_parts.py     # Hand-pixelled parts: eyes, mouths, blush, glasses, eyepatch, flower, pets
│     ├─ hires.py           # Smooth-shape renderer (8x supersample -> lit pixel art)
│     ├─ shade.py           # Colour ramps and key colours
│     ├─ preview.py         # --preview contact sheet
│     └─ preview.png        # Last contact sheet
├─ assets/
│  ├─ bg/                   # Pixel-art backgrounds (WebP)
│  ├─ monsters/             # Monster sprites + parts/ + attack frames (WebP)
│  └─ original/             # Original reference mockups and prototype HTML
└─ multiplayer/             # Classroom server & host/play/editor prototype (for Part 2)
```

## Project Rules
1. **Keep `file://` compatibility:** no `import`/`export` or `fetch()` for local files in the single-player game.
2. **Hosting:** the single-player game is a static site published with GitHub Pages from `main` (repo root). Every push to `main` updates the live link, so keep `main` playable.
3. **Cache-busting:** every `css/` and `js/` link in `index.html` / `preview.html` ends in `?v=<content hash>`. Run `python tools/stamp.py` before every push (`--check` only reports). Never edit the stamps by hand.
4. **Backgrounds & monster sprites are WebP** (quality 95) to keep the page light on phones. Convert new art to WebP before adding it.
5. **Monster animation rigs:** each monster is a body sprite plus part sprites (`assets/monsters/parts/`) and an optional attack frame sequence (`atkSeq`), all listed in `js/data/monster-rigs.js`. Idle motion lives in `css/anim-monsters.css` (`.rig-<id>`). `js/main.js` preloads every file in the rigs, so new parts/frames only need adding to the rig list. Check them in `preview.html`.
6. **Saved runs:** an in-progress run is saved to `localStorage` (`dh_solo_run`) on every screen change and about once a second while a timer runs, and offered back for 3 days. Keep every field on the game state `g` JSON-serialisable.
7. **Hearts:** wrong answers (<50%) cost a heart; at 0 hearts the hero is exhausted and deals ×0.5 damage (`EXHAUSTED_MULT` in `js/core/game.js`) until healed or the next stage.
8. **Tactic system:** each question the monster rolls an intent (`MONSTER_INTENTS` weights, shown before answering). The player may play one card and, when the gauge is full, the job ultimate. All rules resolve in `submitAnswer` in `js/core/game.js`; numbers and text live in `js/data/tactics.js`. Cards come only from the pick-one draft after a monster falls (mage sees 4). Study cards (x-ray, cut, protractor) work through the `FBD.mount` options `overlayArrows`, `hideDecoys`, `angleGuides` (set up in `js/ui/screens/question.js`).
9. **Avatar art pipeline:** characters are generated, not hand-drawn. `python tools/avatar/build_parts.py` draws every part as smooth shapes at 8x (`shapes/`, `hires.py`) or as small pixel art (`pixel_parts.py`), lights them with colour-key pixels (`shade.py`), and writes them all into `js/data/avatar-sprites.js`. The game swaps the key colours for the player's choices in `js/ui/avatar-color.js`, whose `ramp()` must stay in step with `tools/avatar/shade.py`. Sprites are embedded as data URLs so recolouring also works from `file://`. The generator is deterministic: rerunning it without art changes leaves `avatar-sprites.js` byte-for-byte the same, so any diff in that file is a real art change.
10. **localStorage keys:** `dh_solo_char` (character), `dh_solo_run` (saved run), `dh_tut_done` (tutorial finished), `dh_sfx` (sound on/off), `dh_unlocks` (cosmetic unlocks).
