# Dragon Hero: FBD Quest — Architecture & Project Rules

## Tech Stack
- **Single-Player:** pure HTML5 + CSS3 + vanilla JavaScript (`window.DH` namespace, classic `<script>` tags — no ES modules or `fetch()` for local files, so double-clicking `index.html` works offline in any browser).
- **Art style:** 16-bit pixel art (`image-rendering: pixelated`).
  - Clean empty backgrounds (`assets/bg/`), transparent monster sprites + rig parts (`assets/monsters/`).
  - Characters are **generated** 64×64 layered parts (`tools/avatar/`), embedded in `js/data/avatar-sprites.js` and recoloured in the browser.
- **Classroom mode (in progress):** Node server (`server/`, no npm packages) + pages in `classroom/`. The server loads the same `js/data` and `js/core` files as single-player, so questions, grading and the avatar catalogue exist only once. `multiplayer/` is the old Python prototype, kept for reference until the classroom mode replaces it.

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
| Classroom landing page (หน้าแรกห้องเรียน) | `classroom/index.html`, `classroom/js/landing.js` | — |
| Teacher room setup: packs, mode, length (หน้าตั้งค่าห้อง) | `classroom/js/setup.js`, packs in `classroom/js/packs.js` | — |
| Teacher lobby: plaza, code bar, kick (หน้าล็อบบี้ครู) | `classroom/js/lobby.js` | — |
| Student phone: join, character, waiting (หน้ามือถือนักเรียน) | `classroom/js/play.js` | — |
| Room rules on the server: join, names, kick, bots (กติกาห้อง) | `server/rooms.js` | `npm test` |
| Class game rules: monster HP per class size, damage, who attacks, boss, order of phases (กติกาเกมทั้งห้อง) | `server/game.js` | `npm test` |
| Cards / intents / hearts / ultimates / class shield in class mode (การ์ดในห้องเรียน) | `server/tactics.js` (rules), `classroom/js/play/tactics.js` (phone UI) | `npm test` |
| Self-paced mode: each student's own run and when the game ends (โหมดต่างคนต่างทำ) | `server/selfpaced.js`, teacher ranking `classroom/js/host/selfpaced.js` | `npm test` |
| Phone battlefield scene (ฉากบนมือถือ) | `classroom/js/play/scene.js` | — |
| Teacher game screen: one file per phase (จอครูระหว่างเกม) | `classroom/js/host/` (`game.js` = world + top bar, `story.js`, `question.js`, `battle.js`, `board.js`, `summary.js`) | — |
| Student phone during the game (มือถือระหว่างเกม) | `classroom/js/play/game.js` | — |
| Game screen styles (หน้าตาจอเกม) | `classroom/css/host-game.css` (teacher), `classroom/css/play-game.css` (phone) | — |
| Classroom page styles (หน้าตาห้องเรียน) | `classroom/css/classroom.css` | — |
| Teacher question packs editor: pack list, bank picker (หน้าแต่งชุดโจทย์) | `classroom/editor.html`, `classroom/js/editor/editor.js`, styles `classroom/css/editor.css` | — |
| Writing one question: scene, forces, answer arrows, try-it (ฟอร์มแต่งโจทย์) | `classroom/js/editor/qform.js` | — |
| Where teacher packs are saved, export/import file (ที่เก็บชุดโจทย์ครู) | `classroom/js/editor/store.js` | — |
| Server check of a teacher pack (ตรวจชุดโจทย์ครูฝั่งเซิร์ฟเวอร์) | `server/packs.js` | `npm test` |

**Regenerate** = `python tools/avatar/build_parts.py` (≈40 s; add `--preview` to also write `tools/avatar/preview.png`).

**Before every push** = `python tools/stamp.py` (updates every `?v=` and warns about missing or unloaded files).

**Classroom mode** = double-click `start_classroom.bat` (or `npm start`). It opens `http://localhost:8080/classroom/host.html`; students join with the address the window prints (same Wi-Fi) or by scanning the QR. Needs Node.js 18+. `npm test` drives the server with 30 simulated phones (Node 22+).

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
├─ start_classroom.bat      # Teacher double-clicks this to run the classroom server
├─ package.json            # npm start / npm test (no dependencies)
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
├─ classroom/               # Classroom mode pages (served by server/, loads ../js and ../css)
│  ├─ index.html            # Landing: student code entry / teacher "create room"
│  ├─ host.html             # Teacher: room setup, then the lobby (later: the game on the projector)
│  ├─ play.html             # Student phone: character, waiting (later: answering)
│  ├─ editor.html           # Teacher question packs: pick from the bank or write new questions
│  ├─ css/                  # classroom.css (landing/setup/lobby), host-game.css, play-game.css, editor.css
│  └─ js/                   # landing, setup, packs, lobby, play, net (WebSocket), qr
│     ├─ editor/            # question pack editor: store (localStorage + file), qform (one question), editor (page)
│     ├─ host/              # teacher game screen: game (router, world, top bar), story, question, battle, board, summary, selfpaced (live ranking)
│     └─ play/              # student phone during the game: game.js, scene.js (hero vs monster), tactics.js (hand, hearts, ultimate, reward)
├─ server/                  # Node classroom server, no npm packages
│  ├─ index.js              # HTTP (serves classroom/ js/ css/ assets/ only) + WebSocket at /ws
│  ├─ ws.js                 # Minimal WebSocket implementation
│  ├─ shared.js             # Loads js/data + js/core into Node (single source of truth)
│  ├─ rooms.js              # Rooms, players, validation, kick, reconnect, bots
│  ├─ game.js               # Class game loop: questions, grading, damage, battles, boss, ranking, CSV
│  ├─ tactics.js            # Class tactics: intents, cards, hearts, ultimates, class shield, card reward
│  ├─ selfpaced.js          # Self-paced mode: per-student runs, ending when all are done
│  ├─ packs.js              # Rebuilds a teacher pack sent with a new room (never trusts the page)
│  └─ test.js               # npm test: end-to-end test over real WebSockets
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
7. **Hearts:** wrong answers (<50%) cost a heart; at 0 hearts the hero is exhausted and deals ×0.5 damage (`EXHAUSTED_MULT` in `js/core/game.js`) until healed. Hearts carry over between stages; only the heal card and the priest's ultimate restore them.
8. **Tactic system:** each question the monster rolls an intent (`MONSTER_INTENTS` weights, shown before answering). The player may play one card and, when the gauge is full, the job ultimate. All rules resolve in `submitAnswer` in `js/core/game.js`; numbers and text live in `js/data/tactics.js`. Cards come only from the pick-one draft after a monster falls (mage sees 4). Study cards (x-ray, cut, protractor) work through the `FBD.mount` options `overlayArrows`, `hideDecoys`, `angleGuides` (set up in `js/ui/screens/question.js`).
9. **Avatar art pipeline:** characters are generated, not hand-drawn. `python tools/avatar/build_parts.py` draws every part as smooth shapes at 8x (`shapes/`, `hires.py`) or as small pixel art (`pixel_parts.py`), lights them with colour-key pixels (`shade.py`), and writes them all into `js/data/avatar-sprites.js`. The game swaps the key colours for the player's choices in `js/ui/avatar-color.js`, whose `ramp()` must stay in step with `tools/avatar/shade.py`. Sprites are embedded as data URLs so recolouring also works from `file://`. The generator is deterministic: rerunning it without art changes leaves `avatar-sprites.js` byte-for-byte the same, so any diff in that file is a real art change.
10. **Classroom server rules:** the server never trusts a phone — names are trimmed and filtered, looks are rebuilt from `js/data/avatar-catalog.js` (`cleanLook` in `server/rooms.js`), only the teacher's socket may send `host:*` messages, and each connection is rate-limited. Rooms live in memory: restarting the server ends every room (pages handle this with a message). Students reconnect with a per-room token (`localStorage` `dh_cl_<code>`); the teacher page reconnects with `sessionStorage` `dh_host_room`. Classroom pages share the student's character with single-player (`dh_solo_char`).
11. **Class game loop (sync mode):** `INTRO → ENCOUNTER → QUESTION → REVEAL → BATTLE → BOARD → …`, a stage ends in `MON_DEFEAT` / `MON_ESCAPE`, the dragon in `VICTORY` / `DEFEAT`, then `FINAL` (podium) and `SUMMARY`. The server owns the clock (`endsAt` timestamps; clients correct for clock skew), grades with `js/core/grading.js`, and picks questions with `js/core/adaptive.js` using the whole class's mistakes. Monster HP = questions × base damage × 0.65 × number of players. A question closes early once every connected student has answered. Phones never receive the answer key before REVEAL (`publicQuestion`). The BATTLE shows the 3 fastest full-marks answers and up to 2 wrong ones (topped up with more correct answers).
12. **Class tactics (room option "cards", on by default):** one monster intent per question for the whole class (same weights as single-player); every student has their own hand (starts with their job's card), 3 hearts kept across stages, and an ultimate gauge. **Class shield (feature 4):** if at least 70% of the class answers at least half right, the monster's move fails for everyone that turn (no hearts lost, no stealing, no healing) and wrong attackers block instead of getting hit. Charge heals the monster 15% if the class deals less than half its possible base damage; regen heals 15% if fewer than half get full marks. In class the server owns the clock, so ❄️ freeze gives the full speed bonus instead of stopping time; x-ray / cut hints are sent by the server because phones never hold the key. After each monster every student picks 1 of 3 cards (mage 4); the teacher can move on and the rest get a random card.
13. **Self-paced mode (room setting mode "self"):** the room stays in phase `SELF`; each student has `p.run` with their own phase (`ENCOUNTER → QUESTION → REVEAL → BATTLE → … → MON_DEFEAT / MON_ESCAPE → next stage → … → their own dragon → VICTORY / DEFEAT → DONE`) and moves on with the phone's own button, like single-player: their own monsters with single-player HP (escaped monsters strengthen *their* dragon), questions from their own mistakes, no class shield. **A student finishing early ends nothing:** the game moves to FINAL (podium) only when every connected student is DONE or the teacher presses ⏹ จบเกม. While it runs the teacher screen shows only the live damage ranking (with a ✅ for who has finished). FINAL / SUMMARY are shared with the class game; the podium counts how many beat their dragon.
14. **Teacher question packs:** a pack is `{id: "my:…", name, desc, items}`; each item is either `{ref: <bank question id>}` or `{q: <written question>}` (scenes `flat`, `inc`, `r` with one object; key `ex = [[force, angle]]`). Packs live only in the teacher's browser (`localStorage` `dh_packs`) and move between computers as a `.json` file (kind `dragon-hero-pack`). When a room is created with a `my:` pack the page sends the whole pack as `settings.customPack`; `server/packs.js` (`cleanPack`) rebuilds every written question field by field (known forces only, numbers clamped, no HTML) and drops anything invalid. If nothing usable is left the room falls back to `std_all`. Both class and self-paced modes take questions through `packQuestions(room)` in `server/game.js`. Bank questions in a pack are references, so fixes to the bank reach old packs; to change one, the editor copies it into a written question.
15. **localStorage keys:** `dh_solo_char` (character), `dh_solo_run` (saved run), `dh_tut_done` (tutorial finished), `dh_sfx` (sound on/off), `dh_unlocks` (cosmetic unlocks), `dh_host_setup` (teacher's last room settings), `dh_packs` (teacher question packs), `dh_cl_<code>` (student's token for one room).
