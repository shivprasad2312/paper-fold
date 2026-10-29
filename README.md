# Happy Glass — Draw. Pour. Smile.

A browser clone of **[Happy Glass](https://poki.com/en/g/happy-glass)** (Lion Studios): you draw a
line, the tap opens, and water has to end up **inside the sad glass** so it smiles again. Draw less
ink → more stars.

Glasses are **physical objects**. Many levels hang the glass in mid-air with nothing under it — the
moment the world starts moving it drops — so half of the puzzle is *building a shelf or ledge for it*
before you even think about the water.

Vanilla JS + [Matter.js](https://brm.io/matter-js/) physics. No frameworks, no build step required,
no runtime dependencies. 35 hand-tuned levels, three-star ink scoring, sound synthesised with the
WebAudio API (no audio files), and a fully offline single-file build.

```
npm start            # http://localhost:4173
npm run build        # dist/happy-glass.html  (one self-contained file, open it anywhere)
npm run verify       # headless playthrough of all 35 levels
npm run smoke        # boots the built file in jsdom and plays a level end to end
npm run shots        # renders canvas screenshots to shots/
```

![All 35 levels](docs/levels.png)

| A floating glass must be propped up | …then it fills like any other |
| --- | --- |
| ![support](docs/screenshot-support.png) | ![wedge](docs/screenshot-wedge.png) |

---

## 1. How the real game works (research summary)

Sources consulted while designing this: Lionsharp/Lion Studios' original, the Poki web port, and
long-form guides (supercheats, spacewaves, yuppiy, onelinedraw, plays.org).

| Topic | Original behaviour | What this clone does |
| --- | --- | --- |
| **Core loop** | A tap/faucet pours water; you draw one or more solid ink lines that act as ramps, funnels and walls; the glass must fill above its dotted line. | Identical. The tap stays closed until you start drawing, so you can plan first. |
| **Win condition** | Fill the glass to the dotted line; the glass smiles. | Fill ratio is measured from the real water surface **and** droplet count inside the glass. Every glass in a level must be filled. |
| **Stars** | Stars come from **ink economy, not water saved**: the green meter is split into three blocks, every block you eat costs a star (3 / 2 / 1). | Identical 3-block meter, measured in pixels of line length against a per-level budget. |
| **Draw rules** | You draw on the level, but not *through* scenery, glass or into no-draw zones; the stroke becomes a physical object that water flows over. | Blocked inside planks, crates, the tap and inside the glass (you *may* draw right above the rim, which is what makes tight levels solvable). |
| **Hazards** | Hot pads evaporate water, gears/spinners scatter it, moving blocks obstruct it, some levels need multiple glasses filled at once, fans/escalators push water. | All of the above are implemented: heated pads, spinning bars (free pin joints), tilting planks, patrolling blocks, blowers (the grey arrow box), crates and diamonds, tilted and polygon shelves, 1–3 glasses and 1–2 taps. |
| **The glass itself** | The cup is not scenery: it falls, tips and can be caught with your ink. Later levels drop it, wedge it between blocks or leave it hanging over a gap. | Same. A glass is either *static scenery* or a single **compound rigid body** with a weighted base (so a splash will not knock it over, but an unsupported glass really does fall). Drawing is paused while your finger is down, so you can sketch a shelf under a falling glass calmly. Knock it over and the level fails with "the glass fell over". |
| **Retry** | Retry is free and instant; you keep trying until the water runs out. | Restart button (or `R`), plus automatic fail detection once the tap is empty and the water has settled. |
| **Feel** | Hand-drawn look, thick dark outlines, pastel palette, paper grid, wooden HUD, bouncy UI, happy glass face. | Same art direction, drawn procedurally on a canvas (no image assets at all). |

Design takeaways that shaped the level list:

* **Aim at the middle of the stream**, not every drop — lines that try to catch everything are expensive.
* **Short hooks/wedges anchored on scenery beat long bridges** — both cheaper and more stable.
* Water has momentum: it slides, piles up and pushes; a shallow ramp can stall water, a steep one overshoots.
* Every element in a level should be *needed* — so no decorative-only obstacles here.

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
"floating glass" set, where support comes first and the pour comes second:

| # | Name | Idea |
| --- | --- | --- |
| 1 | First Pour | falls straight in — teaches "draw to open the tap" |
| 2 | A Gentle Slope | first ramp |
| 3 | Small Step | short drop, offset glass |
| 4 | Over The Wall | arc over a wall |
| 5 | Double Trouble | split one stream into two glasses |
| 6 | Crate & Glass | the stream clips the rim (nod to the reference screenshot) |
| 7 | Wall Run | tall wall, arc over it |
| 8 | Hot Floor | heated pad vaporises water |
| 9 | Spinner | rotating bar scatters water — jam it with a line |
| 10 | Tilting Plank | free-turning plank you have to run over |
| 11 | Two Taps | two taps, two glasses |
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
* **Ink**: every ~9 px of pointer travel becomes a static chamfered rectangle. Ink is measured in
  world pixels and never refunded, exactly like the original meter.
* **Water**: small circles on one collision layer, low friction so they shuffle over each other like a
  liquid, mild air friction so they don't slingshot. Water level in a glass is computed from the
  sorted droplet heights (top 18 % ignored so an incoming droplet can't fake a full glass) and
  cross-checked against droplet count.
* **Pausing**: the world is frozen until the first stroke and again while a stroke is in progress
  (`scene.drawDown`), which is what makes propping up a falling glass feel fair.
* **Win**: every glass above its line for ~0.5 s → stars from ink left → dialog. A dynamic glass that
  has dropped out of the level or tipped past ~70° counts as lost.
* **Fail**: tap empty *and* the water has settled (or 22 s grace) → "not enough water" dialog.

## 4. Testing without a browser

This repo ships a headless harness so level design isn't guesswork:

* `tools/simheadless.js` boots the real `scene.js`/`water.js` in Node (the only shim is
  `localStorage`), so the *exact* simulation that runs in the browser can be played from the CLI.
* `tools/solutions.js` holds one human-style reference solution per level.
* `npm run verify` plays all 35 levels and reports fill ratios, ink used and stars. Current state:
  **35/35 levels solvable**, stable across repeated runs.
* `tools/grid.js` brute-forces one-stroke solutions (used to confirm each new layout is beatable),
  `tools/probe.js` / `tools/trace.js` print per-frame glass pose, fill and droplet paths.
* `tools/autotune.js` hill-climbs a stroke until a level is won.
* `tools/shot.js` renders the actual game canvas through `@napi-rs/canvas` to a PNG, and
  `tools/sheet.js` builds the contact sheet in `docs/levels.png`.
* `tools/smoke.js` boots the built single-file game in jsdom, clicks Play, draws with pointer events,
  waits for a win, checks the dialog opens and the star was saved, then repeats the whole flow on a
  floating-glass level and asserts the glass stayed supported and got filled.

## 5. Controls

| Input | Action |
| --- | --- |
| Drag (mouse / touch / pen) | draw ink |
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
