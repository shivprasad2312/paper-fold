# KUBIK — Algorithms & Data Structures

_Phase 4 deliverable. Every non-trivial algorithm in the codebase, its
complexity, and why it was chosen over the obvious alternative._

## 1. Tile grid — `Map<"x,z", tile>`

**Data:** flat heightfield; `tile = {x, z, h, crumble}`.
**Lookup:** O(1) string-keyed `Map` (`key(x,z) = "x,z"`).
**Why a Map and not a 2D array:** levels are sparse (void is the norm —
floating slabs), so a sparse index avoids both bounds checks and dead
cells; string keys cost nothing at this scale (levels ≤ 144 tiles) and
make solver state signatures trivial (`"x,z"` concatenation).
**Scale note:** O(1) per move at any realistic level size; if levels ever
exceed ~10⁴ tiles the string-key cost would matter — they won't (the
generator caps at 12×12).

## 2. Roll legality — `checkRoll`

```
legal(from → to)  ⇔  to exists ∧ to is a slab (not void, not broken,
                      slider up if a slider) ∧
                      (from.h − to.h) ≤ 2      (max drop)
                      (to.h − from.h) ≤ 1      (max climb)
```
O(1). These two constants (`MAX_DROP=2`, `MAX_CLIMB=1`) are the entire
"physics law" of the game (ADR-002): discrete, total, decidable in one
lookup. Chosen over a physics sim because the law must be *the same
function* the verifier uses (ADR-005) — a simulator can be queried, a law
can be *proved with*.

## 3. Reachability & soft-lock proof — BFS / reverse-BFS

- `reachable(level)`: standard BFS from start over `legalNeighbours`.
  O(V+E), V = slab count, E ≤ 4V.
- `canStillFinish(level)`: builds the **reverse** adjacency (who can roll
  *onto* each tile) and BFSes backward from the goal. A tile that is in
  `reachable` but not in `canStillFinish` is a **soft-lock** (you can get
  there and never finish). The verifier requires the set difference to be
  empty.
- **Why two BFSes instead of one:** forward reachability answers "can I
  get there?"; only the *reverse* walk answers "can I still finish from
  there?" — a forward-only check passes levels where a side pocket is a
  dead end. This is the check that makes "zero soft-locks" a *property*,
  not a playtest hope.
- `shortestRoute`: BFS distance — because every move costs 1 roll, BFS is
  exactly Dijkstra on unit weights, without the heap. **This number is
  par** (the theoretical minimum). O(V+E).

## 4. Hazard solver — `solveHazards` (the interesting one)

**Problem:** does a route from start to goal exist that (a) survives
crumble one-way slabs (a slab breaks when you *leave* it, so backtracking
over it is impossible) and (b) uses ≤ `nudge` block pushes?

**State:** `(cubeTile, brokenSet, blocksPositions, nudgeLeft)`.
**Search:** BFS with a visited set over state signatures
(`"cubeTile|sortedBlocks|nudgeLeft"`; crumble state is implied by the
path — *why*: a crumble slab's fate is determined by whether you've left
it, which the path encodes; including `brokenSet` in the signature would
explode states needlessly, because you can never un-break a slab, so
"broken" is monotone and the search only ever *adds* to it).
**Transitions:**
- roll to `to` if `checkRoll` ok and not already broken → add
  `from` to broken set if `from.crumble`;
- block in the way & `nudgeLeft > 0` & `canPushBlock` → block slides one
  tile, `nudgeLeft−1`, cube stays.
**Termination:** goal tile ⇒ `{ok:true}`; queue exhausted ⇒ `{ok:false}`;
`guard > 400 000` states ⇒ `{ok:false, capped:true}` (budget — a level
whose survival question costs more than that is a design smell; the
verifier treats `capped` as a failure).
**Complexity:** worst-case O(V · 2^C · B!·… ) in theory, but in practice
crumble counts are small (≤ ~10 per level) and pushes are scarce, so real
runs are < 10⁴ states (< 50 ms for the hardest level). The budget makes
the worst case *explicitly fail* instead of hang.
**Deliberate simplification (documented in the source):** sentinels and
sliders are modelled as **absent / always-solid**. Rationale: a route
that survives with sentinels absent and sliders always up is the *hardest
*route question* (fewest resources to cross gaps); timing hazards add
*waiting*, which never removes a route. So this solver proves route
existence under the strictest static reading; timing fairness is
separately guaranteed because hazard motion is periodic and deterministic
(§7) and the playable bot plays the level live.

## 5. Push legality — `canPushBlock`

A block at `b` can be pushed along `d` iff the tile ahead of the block is
a slab (not void) and the *pushed* block doesn't land on another block,
the start/goal/key, or a crumble slab. O(1). Blocks are indistinguishable
except by position, so the solver tracks positions only.
**Why blocks push at all (vs. being walls):** it creates the
"enough push left?" planning resource (GDD §5); the nudge counter is the
level's economy.

## 6. Sentinel (orb) model

**Data:** closed tile loop `path`, `speed` (tiles/s), `phase`.
**Position at time t:** `s = (t·speed + phase) mod pathLen` → segment +
lerp. O(1) per orb per frame (dozens of orbs max).
**Collision:** the game checks orb-vs-cube only during/after moves that
enter the orb's *clearance* — `sentinelClearance(level, tile)` is the
Chebyshev distance from a tile to the nearest path point, precomputable
per tile, so "can this orb ever reach this tile?" is O(pathLen) once, not
per frame.
**Spawn safety (the Fault Line bug-class):** `spawnProblems` rejects any
orb whose **spawn point** (path[0]) sits on the start or goal tile — the
patrol may *cross* the start (that's timing play) but must never *spawn*
there (instant-death loop). This check is what caught BUG-002.

## 7. Determinism & seeded generation

**RNG:** `hashSeed(str)` (FNV-1a → 32-bit) + mulberry-style
`rng(seed)` (32-bit state, 4 outputs/step). No `Math.random()` in any
gameplay path.
**Dailies:** `getDailyLevel(dateStr)` seeds from `'kubik-daily-'+date`,
generates a level, and **proves it with the verifier at load** (the same
7 checks) — an unprovable daily is regenerated from the next seed
variant, never shipped.
**Campaign:** `gen-campaign.mjs` seeds per level id
(`'kubik-campaign-'+id`), proposes layouts (act-conditioned: size,
mechanic mix, difficulty budget), runs the full verifier, and **rejects
until proven**; output is committed as static data (ADR-004). Rejection
sampling + proof = "the generator can only emit legal levels" is a
property of the pipeline.
**Complexity:** generation ≈ (attempts) × O(V+E) verification; observed
attempts/level < 30 (campaign built in 159 ms).

## 8. Input & animation

**Input queue:** during a roll animation, `input` appends to a 2-deep
queue (deduping repeats) instead of dropping the press — a fast player's
4th press during roll #1 lands on roll #2. O(1); cap 2 keeps the
"feel" bounded (no teleport-queue).
**Camera remap:** screen direction → world direction through
`camQuadrant` (0..3): `world = order[(screen − quadrant + 8) % 4]`.
O(1) — the 4-seat camera is a *permutation* of input, never a new rule.
**Animation scheduler:** exactly one `cube.anim` at a time
(`{type, t, dur, …}`); `tick(dt)` advances `t`; `t ≥ dur` →
`finishMove`. Durations are constants (roll 0.17 s, push 0.22 s, hop
0.24 s, wind period 0.62 s). Easing is a `sin(π·t)`-shaped curve for
rolls/hops (fast start, soft landing). This is *not* physics — it's a
deterministic presentation clock that logic ignores (logic commits the
move at `input`, not at animation end).
**Ghost replay:** win records samples `(t, x, z, rot…)`; replay
interpolates between samples by run-time. O(samples) storage per level,
written only on wins.

## 9. Rendering strategy

- **Merged slab geometry:** all slabs of a level are built into **one
  BufferGeometry** (positions/normals/colors concatenated) → 1 draw call
  for the entire terrain, 1 material. Rim outlines: one line geometry.
  Why: at 12×12 levels that's the difference between ~144 draw calls and
  ~6 total — overdraw and state-change cost dominated the old approach;
  merging is the single biggest perf win in the codebase.
- **Static-by-construction scene:** meshes are built once per level load;
  per-frame work is only: camera matrix, orb/slider transforms, cube
  transform, minimap redraw *on move* (not per frame).
- **Shadows:** one directional light, 1024² map, tight frustum — the only
  per-pixel effect; disabled cost is a flat look, so it stays on.
- **No per-frame allocations** in the hot path (temp vectors cached).
  Measured: see `performance_report.md`.

## 10. Solvability proof pipeline (the meta-algorithm)

```
level def ──parseLevel──▶ level
     │
     ├─ 7 checks (verify-levels.mjs):
     │   1. parse (data well-formed)
     │   2. spawn safety (spawnProblems)
     │   3. goal reachable (BFS)
     │   4. no soft-lock (reachable ∖ canStillFinish = ∅)
     │   5. all shards reachable
     │   6. crumble/push route survives (solveHazards, budgeted)
     │   7. hazard data sane (orb paths on slabs, key reachable, wind legal)
     ▼
 proven level ──bot plays it (test-levels-playable.mjs)──▶ won
```
Two independent proofs (logical + empirical), two independent
environments (Node + real browser), one rule core. A level that passes
both is, for all practical purposes, *guaranteed* completable — which is
why the pipeline is a commit blocker (ADR-010).
