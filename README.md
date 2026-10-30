# Happy Glass — Draw. Pour. Smile.

A browser clone of **[Happy Glass](https://poki.com/en/g/happy-glass)** (Lion Studios): you draw a
line, the tap opens, and water has to end up **inside the sad glass** so it smiles again. Draw less
ink → more stars.

Glasses are **physical objects**. Many levels hang the glass in mid-air with nothing under it — the
moment the world starts moving it drops — so half of the puzzle is *building a shelf or ledge for it*
before you even think about the water. Your ink obeys gravity too: a stroke that is not hooked onto
scenery (ledges, crates, the tap housing, or the push-pins dotted around later levels) falls out of
the level the instant you release it.

Vanilla JS + [Matter.js](https://brm.io/matter-js/) physics. No frameworks, no build step required,
no runtime dependencies. 35 hand-tuned levels, three-star ink scoring, sound synthesised with the
WebAudio API (no audio files), and a fully offline single-file build.

```
npm start            # http://localhost:4173
npm run build        # dist/happy-glass.html  (one self-contained file, open it anywhere)
npm run verify       # headless playthrough of all 35 levels
npm run audit        # physics audit: masses, colliders, tunnelling, resting contact
npm run flaky        # plays every level 4x and fails if any run loses
npm run smoke        # boots the built file in jsdom and plays a level end to end
npm run shots        # renders canvas screenshots to shots/
```

![All 35 levels](docs/levels.png)

| A floating glass must be propped up | …then it fills like any other |
| --- | --- |
| ![support](docs/screenshot-support.png) | ![wedge](docs/screenshot-wedge.png) |

| Ink hung from the tap splits one stream in two | Falling ink is real ink: unsupported lines drop out |
| --- | --- |
| ![split](docs/screenshot-split.png) | ![levels](docs/levels.png) |

---

## 1. How the real game works (research summary)

Sources consulted while designing this: Lionsharp/Lion Studios' original, the Poki web port, and
long-form guides (supercheats, spacewaves, yuppiy, onelinedraw, plays.org).

| Topic | Original behaviour | What this clone does |
| --- | --- | --- |
| **Core loop** | A tap/faucet pours water; you draw one or more solid ink lines that act as ramps, funnels and walls; the glass must fill above its dotted line. | Identical. The tap stays shut and the world is frozen while you plan; **lifting the pencil after your first line opens the tap**, and any line you draw later is added to the same running world. |
| **Win condition** | Fill the glass to the dotted line; the glass smiles. | Fill ratio is measured from the real water surface **and** droplet count inside the glass. Every glass in a level must be filled. |
| **Stars** | Stars come from **ink economy, not water saved**: the green meter is split into three blocks, every block you eat costs a star (3 / 2 / 1). | Identical 3-block meter, measured in pixels of line length against a per-level budget. |
| **Draw rules** | You draw on the level, but not *through* scenery, glass or into no-draw zones; the stroke becomes a physical object that water flows over, and it can only hang where it is anchored to something. | Blocked inside planks, crates, the tap and inside the glass (you *may* draw right under the nozzle and just above the rim). On release every segment is tested against the scenery with a real collision query: each place it actually touches becomes an **anchor** and the wire is welded there — the drawing itself is never decorated, it stays the plain line you drew. A line that touches one thing only swings from that point; no contact at all → the whole line stays one rigid body and falls. If an anchoring support later moves away, the line comes off and drops. |
| **Hazards** | Hot pads evaporate water, gears/spinners scatter it, moving blocks obstruct it, some levels need multiple glasses filled at once, fans/escalators push water. | All of the above are implemented: heated pads, spinning bars (free pin joints), tilting planks, patrolling blocks, blowers (the grey arrow box), crates and diamonds, tilted and polygon shelves, 1–3 glasses and 1–2 taps. |
| **The glass itself** | The cup is not scenery: it falls, tips and can be caught with your ink. Later levels drop it, wedge it between blocks or leave it hanging over a gap. | Same. Every glass is a single **compound rigid body** with a weighted base (a splash will not knock it over, but an unsupported glass really does fall). A glass that is meant to stand starts on a small wooden ledge; a glass that is meant to hang has nothing under it and *will* drop unless your ink catches it. Knock it over and the level fails with "the glass fell over". |
| **Retry** | Retry is free and instant; you keep trying until the water runs out. | Restart button (or `R`), plus automatic fail detection once the tap is empty and the water has settled. |
| **Feel** | Hand-drawn look, thick dark outlines, pastel palette, paper grid, wooden HUD, bouncy UI, happy glass face. | Same art direction, drawn procedurally on a canvas (no image assets at all). |

Design takeaways that shaped the level list:

* **Aim at the middle of the stream**, not every drop — lines that try to catch everything are expensive.
* **Short hooks/wedges anchored on scenery beat long bridges** — both cheaper and more stable.
* Water has momentum: it slides, piles up and pushes; a shallow ramp can stall water, a steep one overshoots.
* Every element in a level should be *needed* — so no decorative-only obstacles here.
* **Ink is heavy**: a line that is not pegged to scenery drops out of the world, so a good level gives
  you a pin, a ledge or a wall near where the line has to start.

---

## 2. What's in the box

```
index.html          the game shell + DOM UI (menu, level select, how to play, result dialogs)
css/style.css       all UI styling (fonts, buttons, sheets, dialogs, rotate hint)
js/util.js          helpers, palette, save data (localStorage), star maths
js/audio.js         WebAudio sfx: pour bed, plops, draw scribble, star chime, win/fail jingles
js/levels.js        35 hand-authored levels (data only, easy to extend)
js/scene.js         level → Matter.js world: scenery, glasses, taps, ink strokes, win/lose logic
js/water.js         the fluid: up to 300 soft droplets, fans, hazards, cosmetic splashes
js/render.js        the whole look: paper grid, platforms, glasses + faces, water, HUD, overlays
js/ui.js            DOM screens, level grid, dialogs, sound toggle
js/game.js          fixed-step loop, pointer input, level flow, scoring, keyboard shortcuts
vendor/matter.min.js Matter.js 0.20.0 (MIT)
fonts/              Fredoka woff2 subsets (OFL)
tools/              dev server, single-file builder, headless simulator, verifier, screenshots
```

### Levels

35 levels, hand-placed, each introducing or combining one idea. Levels 26–35 are the
"floating glass" set, where support comes first and the pour comes second. From level 12 onward
most layouts also carry **push-pins** (small tacks on the scenery): a stroke that touches one is
anchored in place, which is now the intended way to build a shelf — a free-floating bridge will fall:

| # | Name | Idea |
| --- | --- | --- |
| 1 | First Pour | no scenery at all — just tap, glass and a stone pedestal |
| 2 | A Gentle Slope | first ramp, drawn around a wooden crate |
| 3 | Small Step | step the water down onto a hanging metal shelf |
| 4 | Over The Wall | arc over a wall |
| 5 | Double Trouble | split one stream into two glasses around a teal wedge |
| 6 | Crate & Glass | the stream clips the rim (nod to the reference screenshot) |
| 7 | Wall Run | tall wall, arc over it |
| 8 | Hot Floor | heated pad vaporises water |
| 9 | Spinner | rotating bar scatters water — jam it with a line |
| 10 | Tilting Plank | free-turning plank you have to run over |
| 11 | Two Taps | a stone column splits the room: two taps, two glasses |
| 12 | The Neck | narrow gap between two ledges |
| 13 | Crosswind | blower pushes the stream |
| 14 | Crate Stack | climb over crates |
| 15 | Three Is A Crowd | three-way split |
| 16 | Gear Works | two spinners |
| 17 | Moving Block | patrolling block, slide underneath |
| 18 | The Long Drop | long shallow run |
| 19 | Hot Pipes | two hot pads |
| 20 | The Sink | spinner in the way, metal shelf below |
| 21 | Twin Spinners | two spinners, catch the spray |
| 22 | Upstream | wind blows the other way |
| 23 | The Gauntlet | hot pad + spinner + patrol |
| 24 | Two Storeys | two taps at different heights |
| 25 | Last Drop | everything at once |
| 26 | Hold It Up | a glass with nothing under it, over two diamonds |
| 27 | Two Hands | two floating glasses, two taps |
| 28 | Blow Dry | blower vs. a floating glass |
| 29 | Diamond Gap | straight edge between two diamonds |
| 30 | Gap Bridge | the glass dangles in a gap |
| 31 | The Wedge | build a flat ledge on a sloped slab |
| 32 | Falling Weight | a loose crate tries to smash the glass |
| 33 | Wind Tunnel | one blower, one stream, one glass to catch |
| 34 | Juggler | loose glass + spinning bar |
| 35 | Grand Finale | floating glass, blower and hot pad |

---

## 3. How the simulation works

* **World**: fixed 1280×720 stage, letterboxed to any screen size (the camera never crops the level).
* **Physics**: Matter.js at a fixed 60 Hz step, decoupled from rendering (`requestAnimationFrame`,
  max 4 catch-up steps).
* **Ink is iron wire, not paint.** Every ~9 px of pointer travel becomes a chamfered rectangle.
  Ink is measured in world pixels and never refunded, exactly like the original meter. On release
  the stroke is rebuilt as **one rigid compound body with real mass** (`density 0.0018`, so a 90 px
  line weighs about 3.5 mass units against a droplet's 0.25). Its segments are then tested against
  the scenery with Matter's collision query: every genuine overlap becomes an anchor (max 4) and the
  wire is rigid *at that pose*. A wire that touches nothing is
  left dynamic and falls out of the level. A wire whose support later moves is released too — the
  anchor is a joint, not a permanent freeze. Nothing is painted onto the line: no nail heads, no
  studs — the stroke renders exactly as drawn, a thin dark wire.
* **Water**: small circles on one collision layer, low friction so they shuffle over each other like a
  liquid, mild air friction so they don't slingshot. Water level in a glass is computed from the
  sorted droplet heights (top 18 % ignored so an incoming droplet can't fake a full glass) and
  cross-checked against droplet count.
* **Pausing**: the world does not run at all until you lift your pencil after the first line — that
  gesture is the "start" button, and it is also the moment gravity is switched on for every dynamic
  body. After that nothing pauses: the tap keeps pouring while you sketch a second, third, tenth
  line, and a stroke you cannot support falls out of the level while you watch. Restart is free.
* **Win**: every glass above its line for ~0.5 s → stars from ink left → dialog. A dynamic glass that
  has dropped out of the level or tipped past ~70° counts as lost.
* **Fail**: tap empty *and* the water has settled (or 22 s grace) → "not enough water" dialog.

### Physics audit

`npm run audit` measures the live simulation rather than trusting the code comments. What it
checks, and what it found the last time it was run:

| Check | Result |
| --- | --- |
| gravity is one global acceleration | 0.384 px/step² (≈ 1381 px/s²) |
| a droplet cannot shove a glass | 501 : 1 mass ratio, full glass of water = 11 % of the cup |
| a supported glass rests without jitter | 0.91 px drift over 6 s |
| droplets are born outside the tap collider | 3.3 px clear of the plate |
| a droplet moves less than a rod-thickness per solver step | 3.7 px/step (14.9 px/frame ÷ 4 substeps) vs a 4 px rod |
| no droplet can tunnel through a drawn line | 14.9 px/frame vs 18 px of rod + droplet |
| a braced wire never moves, even under a 5 s stream | identical geometry, 2 contacts, `isStatic` |
| water resting on the wire is asleep, not buzzing | worst 0.000 px/step, 0 of 3 240 samples moving |
| **water cannot move the wire at all** | stream vs no stream: wire geometry differs by **0.00000 px** over 180 frames, 2 685 droplet/wire contacts resolved |
| ...and the wire is not frozen | the same hinged wire still swings 134 px on its own weight |
| a wire held at one point is **not** welded | 1 contact, dynamic, on a revolute joint |
| a cantilevered wire swings down about its anchor | rotated 64° in 4 s, centre fell 160 px, then rest |
| ink that touches nothing falls | y 300 → 894 in 1 s, culled when it leaves the level |
| ink that touches scenery is static | 63 segments, up to 4 anchor contacts |
| a falling line lands on the glass rim | rests at y 404 on a rim at y 411 |
| unsupported glass / crate fall | glass leaves the level, crate drops 660 px |
| water stays pooled once it lands | fill 0.73 → 0.73 after 10 s |
| same strokes, same result | 27/27/27/27/28 droplets over 5 runs |

Fixes that came out of that audit: ink was anchoring to *its own* half-drawn segments (so every
line hung in mid-air), droplets spawned 7.5 px inside the tap plate, the pour started on
pointer-*down* instead of on lift, a once-per-frame solver let fast droplets straddle the wire (the
"vibrating line" report), the glass carried an unnecessary ×3.5 rotational cheat, and — the last
one — **a single anchor point was welded like a steel bracket**, so a ramp hooked on the tap hung out
sideways holding water. One contact is now a revolute joint: the wire swings down about it and settles;
two or more contacts is a weld, because that is wire bent around two hooks. Last is the *vibration*:
Matter was still solving `droplet | ink` as a collision, so a running stream rocked the wire (0.58 px
per frame, moving in 175 of 180 frames). Water and ink are now separate collision categories and the
contact is a **one-way** resolver that only moves the droplet, so the wire is provably deaf to water:
audit §3d runs the same scene with and without a stream and the wire's geometry diverges by
0.00000 px. The wire is 4 px and drawn as one clean
line — no nail dots, no studs, nothing the player did not draw — physics runs four substeps per frame
under a 14 px/frame droplet ceiling, and every ramp stands
on a stone bracket. Full report, including the intentional shortcuts (braced ink is static,
no world floor, kinematic movers) is in [`docs/PHYSICS.md`](docs/PHYSICS.md).

## 4. Testing without a browser

This repo ships a headless harness so level design isn't guesswork:

* `tools/simheadless.js` boots the real `scene.js`/`water.js` in Node (the only shim is
  `localStorage`), so the *exact* simulation that runs in the browser can be played from the CLI.
* `tools/physics-audit.js` (`npm run audit`) measures the running world: masses, collider overlap at
  spawn, tunnelling margins, resting-contact drift, whether unsupported bodies actually fall, and —
  the §3d A/B run — whether a stream can move a drawn wire at all (same scene with and without the
  tap open; the two wire traces must be identical).
* `tools/flaky.js` (`npm run flaky`) replays every reference solution four times and fails the build
  if a level wins only sometimes.
* `tools/solutions.js` holds one human-style reference solution per level.
* `tools/margins.js` reports, per level, how far the reference solution clears its target — the
  number that decides whether a level is comfortable or knife-edge.
* `tools/cushion.js` lowers any target the reference solution only clears by one droplet, so a win
  never hangs on a single particle.
* `tools/props.js` stands a stone bracket under every ramp that would otherwise hang on one contact;
  `tools/postfit.js` slides it until the water clears it cleanly, `tools/reanchor.js` reports which
  strokes have a real second support and which do not.
* `npm run verify` plays all 35 levels and reports fill ratios, ink used and stars. Current state:
  **35/35 levels solvable**, confirmed by `tools/flaky.js` over four full passes. Targets are
  re-cushioned whenever the reference solution wins by less than two droplets, so a win never hangs
  on a single particle.
* `tools/grid.js` brute-forces one-stroke solutions (used to confirm each new layout is beatable),
  `tools/probe.js` / `tools/trace.js` print per-frame glass pose, fill and droplet paths.
* `tools/autotune.js` hill-climbs a stroke until a level is won; `tools/anchorize.js` reports which
  ink strokes of a solution landed on an anchor and which ones fell (a diagnostic, not a solver).
* `tools/shot.js` renders the actual game canvas through `@napi-rs/canvas` to a PNG, and
  `tools/sheet.js` builds the contact sheet in `docs/levels.png`.
* `tools/smoke.js` boots the built single-file game in jsdom, clicks Play, draws with pointer events,
  waits for a win, checks the dialog opens and the star was saved, then repeats the whole flow on a
  floating-glass level and asserts the glass stayed supported and got filled.

## 5. Controls

| Input | Action |
| --- | --- |
| Drag (mouse / touch / pen) | draw ink |
| Lift the pencil | open the tap and switch gravity on (first time only) |
| `R` / ↻ button | restart level |
| `Esc` | back to level select |
| `?` button | how to play (pauses the level) |
| 🔊 button | sound on/off (saved) |

## 6. Notes & credits

* This is an **homage / re-implementation for learning purposes**, not a copy of Lion Studios'
  assets. All art is drawn procedurally, and all level layouts are original. Happy Glass is a
  trademark of its owners.
* Physics: [Matter.js](https://brm.io/matter-js/) © Liam Brummitt, MIT (see `vendor/MATTER-LICENSE`).
* Font: [Fredoka](https://fonts.google.com/specimen/Fredoka) by Hafontia, SIL OFL (see
  `fonts/FREDOKA-LICENSE`).
* Progress (stars, unlocked levels, sound) is stored in `localStorage` under `happyglass.save.v1`.
