# KUBIK — Technical Architecture

_Phase 3 deliverable. Module map of the shipped codebase (line counts at
v1.0.0). The design goal: a ~7,800-line game in which **the rules of the
game are 334 lines of pure, dependency-free JavaScript** that run in Node,
in the browser, and in CI without modification._

## 1. Layer map

```
┌────────────────────────────────────────────────────────────────────┐
│ PRESENTATION                                                        │
│  index.html · src/style.css   — DOM shell + 2 theme skins           │
│  src/stage.js (346)           — renderer, 4-seat orbit camera,      │
│                                  lights, shadows, starfield        │
│  src/levelView.js (844)       — level → 3D scene graph: merged slab │
│                                  mesh, rims, orbs, crumbles,       │
│                                  sliders, key/lock, wind, blocks   │
│  src/textures.js (52)         — generated glow/beam textures        │
│  src/audio.js (430)           — synthesized music + SFX (Web Audio) │
├────────────────────────────────────────────────────────────────────┤
│ GAMEPLAY (per-level simulation)                                     │
│  src/game.js (808)            — Game: state machine, input queue,   │
│                                  move resolution, animation        │
│                                  scheduler, events                 │
├────────────────────────────────────────────────────────────────────┤
│ RULES (pure, deterministic, no DOM, no three.js)                    │
│  src/rules.js (334)           — parseLevel, checkRoll, BFS          │
│                                  reachability, soft-lock proof,     │
│                                  push/crumble solver, par, spawn   │
│                                  safety audit                       │
├────────────────────────────────────────────────────────────────────┤
│ DATA                                                                  │
│  src/levels.js (293)          — 13 hand-designed level defs         │
│  src/campaign.js (2157)       — 37 generated+proven level defs      │
│  src/daily.js (182)           — date-seeded daily generator+par     │
├────────────────────────────────────────────────────────────────────┤
│ APP GLUE + PERSISTENCE                                                │
│  src/main.js (797)            — menus, HUD, minimap, input (kb +    │
│                                  touch + hold), pause, win flow,   │
│                                  ghost replay, save flow            │
│  src/save.js (109)            — localStorage schema + medal logic   │
├────────────────────────────────────────────────────────────────────┤
│ TOOLCHAIN (Node, no browser needed except where noted)              │
│  scripts/verify-levels.mjs     — 7-check solvability proof          │
│  scripts/test-levels-playable  — bot PLAYS every level to `won`     │
│  scripts/playtest.mjs          — 64 browser mechanic checks         │
│  scripts/gen-campaign.mjs      — seeded generator (proves its out)  │
│  scripts/autoplay.mjs, shoot.mjs, mobile-shots.mjs                 │
│  tests/unit · tests/regression · tests/gameplay · tests/performance │
└────────────────────────────────────────────────────────────────────┘
```

## 2. Responsibilities & interfaces

### `rules.js` — the only authority on "can I move there"
- `parseLevel(def) → level` — validates a level def, builds the tile
  `Map<"x,z",{x,z,h,crumble}>`, start/goal, shards, blocks, orbs, sliders,
  gateKey, nudge, wind. **Throws on malformed data** (off-slab objects,
  bad wind vector) — bad data fails at parse, not at 3 am in a level.
- `checkRoll(level, from, to)` — the roll law: `drop ≤ 2`, `climb ≤ 1`,
  target must be a slab.
- `legalNeighbours(level, tile)` — roll law + slider "is it up now" +
  crumble "is it broken".
- `reachable / canStillFinish` — forward/reverse BFS. A tile reachable
  from start but NOT in `canStillFinish`'s set is a **soft-lock**; the
  verifier requires zero.
- `shortestRoute` — BFS distance start→goal; this is **par**.
- `solveHazards` — state-space BFS over
  `(cubeTile, brokenSet, blocksPositions, nudgeLeft)` proving a route
  survives crumble one-way slabs and uses ≤ nudge pushes (state budget
  400k).
- `sentinelClearance / spawnProblems` — spawn-safety audit (the
  Fault Line bug-class detector).

Every function is a pure function of its arguments. No `Date.now()`, no
`Math.random()`, no DOM. This is what makes the verifier, the generator,
and the unit tests possible.

### `game.js` — one level, one instance
`class Game` owns the in-level simulation:
- state: `playing | won | dead` (+ `paused` flag for presentation),
- `input(dir)` — remaps screen direction through the camera quadrant,
  buffers up to 2 moves during an animation (deduped), else resolves
  immediately via `doMove`,
- `doMove` — telekinesis push (block slide, nudge−1) → roll check →
  death/wall/roll; wind nudges on their 0.62 s clock;
- animation scheduler — one `cube.anim` object at a time; `tick(dt)`
  advances it (roll 0.243 s, push 0.22 s, hop 0.24 s); events emitted
  (`move`, `push`, `roll`, `shard`, `death`, `win`, `bump`, `key`) so the
  UI and audio react without the game knowing they exist;
- ghost capture — appends `(t, x, z, …)` samples to a log for `save.js`.

`Game` imports **only `rules.js`** for legality; three.js objects live in
`levelView.js`. The game can run headless (the bot test drives it through
real input; the verifier runs `rules.js` with no `Game` at all).

### `stage.js` / `levelView.js` — presentation that can't break logic
- `buildLevelView(level)` constructs meshes **once** per level load: all
  slabs are merged into **one BufferGeometry** (single draw call for the
  terrain), rim outlines are one line-segment geometry, orbs/crumbles/
  sliders/key/lock are small separate nodes (they animate).
- `Stage` renders the scene, owns the 4-seat orbit camera (quadrant +
  distance + pitch per seat), lights, shadow map (single 1024 map),
  starfield, and theme application (material palette swap).
- Presentation reads game state via getters; it never writes game logic
  state. The one exception is documented in `game.js::isSolid`: slider
  "up?" is a *clock* and the view holds the clock (deliberate — see
  technical_decisions ADR-009).

### `main.js` — app glue
Menus (menu/levels/playing), HUD (timer, moves/par, shards, mechanic
chips, minimap canvas), input (keyboard, pointer swipes, hold-to-roll),
pause flow, win panel (medal via `save.medalFor`), ghost replay
interpolation, save load/write, camera & theme settings. It is the only
file that touches DOM *and* `save.js`.

### `save.js` — persistence
`localStorage` JSON with a **defaults-merge migration** (unknown shapes →
safe defaults, corrupt JSON → fresh save; never throws into the app).
`medalFor` (3 criteria), `recordWin/recordGhost/recordDaily`, `fmtTime`.
Pure except for the two localStorage calls — unit-tested with a stub.

## 3. State machine (app level)

```
menu ──Play──▶ playing ◀──resume── paused
  ▲              │  ▲                      ▲
  │              ▼  │ death (auto)         │ P/Esc/⏸/tab-hide
  │            dead ──▶ playing           │
  │              │ win                    │
  │              ▼                        │
  │           won ──Next──▶ playing(next) │
  │              │                        │
  └──Menu────────┴────────────────────────┘
levels ──card──▶ playing(i)
```
All transitions go through exactly one function each
(`startLevel / startDaily / restartLevel / pauseGame / resumeGame /
openMenu / openLevels`); every transition clears timers (`winShowTimer`
etc.) — the win-panel-resurface bug (BUG-001) was a missing clear, and the
regression test now pins it.

## 4. Data flow for a roll (happy path)

```
keydown → main.js (screen dir) → game.input (quadrant remap, queue)
→ doMove → checkRoll (rules.js) → legal
→ cube.anim = {type:'roll', …} → emit('roll')
→ audio SFX · HUD moves++
→ tick(dt) advances anim (0.243 s)
→ finishMove: new tile → emit('move') → shard? gate? crumble-leave?
```

## 5. Determinism rules (contract)

1. `rules.js` is a pure function of `(level, …)` — same input, same output,
   always, everywhere.
2. Level data is **static and proven** (hand or generator; the generator
   rejects any layout its own verifier fails). No runtime RNG affects
   gameplay.
3. The daily is seeded by date string (`hashSeed('kubik-daily-'+date)`) —
   everyone's 2026-11-06 is the same level.
4. Hazards are periodic with fixed period/phase — a given run is
   reproducible from the input sequence.
5. Consequence: the verifier's proof and the bot's play are statements
   about *the game*, not about a build.

## 6. Extensibility points (what to touch to add X)

| Add | Touch |
|---|---|
| New level | `src/levels.js` (hand) or extend `gen-campaign.mjs`; run `npm test`; nothing else |
| New mechanic | `rules.js` (laws) → `parseLevel` (data) → `levelView.js` (look) → `game.js` (behaviour) → verifier check → docs. The gate forces the whole chain |
| New theme | `style.css` (UI) + palette table in `stage.js`/`levelView.js` |
| New camera seat | seats array in `stage.js` + `game.camQuadrant` remap |
| New save field | `save.js` DEFAULTS (auto-migrating) |

## 7. What is deliberately NOT here

- No ECS, no scene manager, no plugin system — one game, one level at a
  time; ECS overhead buys nothing at this object count (dozens of nodes).
- No physics engine — see ADR-002.
- No i18n, no backend, no analytics — offline, private, by design.
- No build-time code generation — the campaign is generated *offline* and
  committed as static, verified data (ADR-004).
