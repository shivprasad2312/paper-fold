# KUBIK — Bug Tracker

Every bug: ID, repro, expected vs actual, severity, root cause, fix,
regression test. Fixed bugs keep their entries forever (they are the
regression-test index).

---

## BUG-001 — Win panel resurfaced over a fresh run — FIXED

- **Severity:** high (broke the core retry loop's readability)
- **Repro:** win any level → click **Replay** (or otherwise restart) within
  the 900 ms delayed-panel window → the win panel faded back over the new
  run 900 ms after the win.
- **Expected:** restarting clears the pending win-panel display; a fresh
  run shows no panel until it actually wins.
- **Actual:** the stale 900 ms `winShowTimer` fired mid-run and re-showed
  `#win`.
- **Root cause:** `winShowTimer` was cleared in `startLevel`, `startDaily`,
  `openMenu`, `openLevels` — but **not** in `restartLevel`, the one restart
  path reachable from the win panel itself.
- **Fix:** `clearTimeout(winShowTimer)` at the top of `restartLevel()`
  (`src/main.js`).
- **Regression test:** `tests/regression/win-panel-resurface.mjs`
  (`npm run regression`) — replays the original repro (Replay inside the
  900 ms window) plus the panel-shown Replay and Next paths, watching 2 s
  each for a resurface.

## BUG-002 — Fault Line (L9) sentinel spawned on the player's start tile — FIXED

- **Severity:** critical (instant-death loop: the level was unplayable on
  arrival)
- **Repro:** load level 9 "Fault Line" → first frame → death → respawn →
  death (repeat).
- **Expected:** a sentinel may patrol across the start tile (timing play),
  but never spawn on it.
- **Actual:** the orb's path began at the start tile, so its spawn
  position coincided with the player's spawn → guaranteed first-frame hit.
- **Root cause:** hand-authored orb path data; nothing validated spawn
  positions at the time (the level shipped because early tooling only
  checked reachability, not spawn safety).
- **Fix:** (1) level data corrected; (2) `spawnProblems()` added to
  `rules.js` auditing every level for the bug class (orb spawn on
  start/goal, shard/block/key on start/goal, orb paths over void, crumble
  start); (3) the verifier runs it on all 50 levels + 14 dailies, so the
  class cannot ship again.
- **Regression test:** `tests/regression/fault-line-spawn.mjs`
  (`npm run regression`) — the specific level + the general property over
  all 50 levels + 7 sampled dailies.

---

## BUG-003 — Level 46: sentinel orb made the only route impossible — FIXED

**Reported by the player** (screenshot, 2026-11-06): on L46 "The Wall
Walks" the moving sentinel on the sole corridor left *no* time to cross
— "no option to reach destination".

**Root cause (two layers):**
1. **Layout:** the corridor crossing spanned the orb's full patrol
   length. At roll speed (5.88 tiles/s) the cube needs ~2.6 s to clear
   the span; the orb returns faster than the clearance opens. The best
   crossing window measured **0.36 s** — below human reaction at
   in-game scale. No speed value could fix it (proven by sweep: @2.0 →
   2.195 s fair, @8.0 → 0.360 s; the span itself is the killer).
2. **Validation gap (the class of bug):** the verifier proved route
   existence with hazards modelled *absent*, and the live bot had never
   been run against every level — so a periodically-moving hazard could
   seal the only route and nothing in the pipeline caught it.
   Pre-fix, **22 of 50** campaign levels had at least one crossing
   window below 0.5 s.

**Fix (systemic, not a one-off patch):**
- New **crossing-window model** in `src/rules.js` (algorithms §6.1):
  `candidateCrossings` (line-graph BFS, depth ≤ 4 — straight runs,
  L-shapes, 2-row bands), `crossingWindow` (fine-grained periodic
  simulation, relevant-orb filter), `TIMING_FLOOR = 0.5 s`.
- `timingProblems` gate in the verifier: every level must have a fair
  path start→goal (and, for `gateKey` levels, start→key→goal, see
  BUG-004). Wired into `npm run verify`, the generator
  (`gen-campaign` rejects layouts without a fair path and retries) and
  `gen-daily`.
- Campaign + dailies **regenerated** under the gate; the live playable
  bot now plans over the same `fairCrossingGraph` and replays the whole
  51-level suite headlessly (`npm run test:play`).
- Regression pinned in `tests/unit/timing.test.mjs` (7 tests): the
  exact old L46 layout is **rejected**, the fair layout **passes**,
  sealed start-escape **rejected**.

**Status: FIXED.** All 50 levels + 14 dailies pass the gate; the full
live suite completes every level against real hazard motion.

---

## BUG-004 — Level 12: gate key reachable only through an unfair crossing — FIXED

**Discovered by the BUG-003 key-reachability work** (no player report —
the new check found it): on L12 "The Fold" (hand-authored) the key sits
*on* a patrol row of the 2-row band. The only approach threads
vertically between the two rows; the old candidate generator only
enumerated *straight sub-runs* of a line, so the band-threading crossing
was invisible to the verifier — and the key-check did not exist at all.

**Root causes:** (a) straight-run candidate generation cannot express
L/U-shaped or band crossings; (b) even with the crossing visible, a
`gateKey` level only proved start→goal, not start→*key* and key→goal.

**Fix:**
- `candidateCrossings` rewritten as BFS over the line graph — any
  simple path of ≤ 4 line tiles between off-line neighbours is a
  candidate (straight, L, U-turn, 2-row band).
- **Key-link model** in `fairCrossingGraph`: fair crossings whose seq
  steps on the key tile gain `from → keyNode` (pickup prefix) and
  `keyNode → to` (escape suffix) edges; the BFS identifies the
  key-node by `"key:x,z"` (a graph waypoint, not a tile).
- `timingProblems` now requires, for `gateKey` levels: fair
  start→keyNode **and** fair keyNode→goal.

L12's own data needed no change — with the band crossings visible, its
windows measure ≥ 4.3 s and the level is fair as authored.
**Status: FIXED** (unit-pinned + full verify + live pass).

---

## BUG-005 — Level 15: crumble slab on the only crossing entry — FIXED

**Discovered by the live playable bot** after BUG-003/004: L15's sole
sentinel crossing started on a crumble slab, so the player had to wait
for the crossing window *on a slab that breaks in 1.2 s* — a blind
gamble at bad orb phases (the live bot died mid-commit in ~9 of 10
attempts).

**Root cause:** the generator placed crumble slabs before the sentinels,
with no rule against putting one on a crossing entry (any off-line tile
adjacent to a patrol line). 12 generated levels had crumbles adjacent
to a line; L15's was the one that sat on the *only* crossing.

**Fix (generator rule, then regenerate):** crumble placement now runs
**after** sentinel placement and rejects any route tile that is on the
patrol line or adjacent to it. Campaign regenerated; L15's crumble now
sits 2 tiles off its line. Hand-authored L9–L13 keep their authored
crumbles (design intent, verified fair by the gate).
**Status: FIXED** (L15 live-passes; all regenerated levels re-verified
+ spot-checked live).

---

## BUG-006 — Live crossing wait anchored on an AMBIGUOUS orb position (L21/L26 deaths) — FIXED

**Discovered instrumenting the live bot** after BUG-003/004/005 were fixed:
L21 "Shatterpoint" and L26 "The Foldline" still died mid-crossing even
though the static gate measured wide fair windows and the wait's own
probe said "safe" on the first poll.

**Root cause:** on an out-and-back patrol (a 2-point orb path), two
different distances along the loop map to the *same* point — the forward
and the return leg. The bot's wait converts the orb's live (x,z) back to
a distance via `orbDistAlong`, which returns the *first* (forward-leg)
match. When the orb was on the return leg, the wait simulated a mirrored
future (orb approaching from the other side), declared the burst safe,
and the real orb then swept through the cube's line tile — the sampler
caught the kill at orb distance 0.25 on (2,3) with the exit roll never
pumped.

**Fix:** the game view already advances each orb's own directed
`o.dist` every frame — the bot now reads `view.orbs[i].dist` and anchors
the crossing simulation on it (position is only a fallback). The
ambiguity is documented on `orbDistAlong` itself, and pinned by
`tests/unit/timing.test.mjs` (BUG-006: position→dist→position roundtrip
on a return-leg point predicts a future >0.3 tiles away from the true
future).

**Status: FIXED** (L21 + L26 live-pass; full suite re-run green).

---

## BUG-007 — "Fair" crossing with an ILLEGAL entry roll (L39 unfinishable, gate blind) — FIXED

**Discovered by the live playable suite** after BUG-003/004/005/006 were
fixed: L39 "The Meridian" still failed live while the static gate passed
it. Its only timing-fair crossing (a wide window) entered the patrol
line with a **2-tile climb** — illegal under the roll law — while the
level's only *legal* crossing was timing-unfair. Unfinishable, and the
gate had no way to see it: `fairCrossingGraph` filtered candidates by
window width only, never by roll legality.

**Root cause:** crossing candidates are simulated as pure geometry
(entry → line tiles → exit); nothing checked `checkRoll` on the burst's
rolls. A second trap lurked: candidate seq tiles are synthetic `{x,z}`
objects without `.h`, so a naive `checkRoll` call compared `NaN` heights
and (falsely) passed.

**Fix:** `fairCrossingGraph` now resolves heights from the parsed tiles
and drops any candidate (and start/goal boundary escape) whose burst
contains a blocked climb/drop or a void step. The generator re-rolled
L39 under the stricter gate; the legacy layout is regression-pinned in
`tests/unit/timing.test.mjs` (BUG-007: no edge from the illegal-climb
side, layout rejected).

**Also found while here:** the generator's phased search printed
"relaxed to 0 sentinels" for levels that had *already* found a fair
layout in the stricter phase (the warning fired per phase, not per
outcome). The phase loop now stops at the first found layout and warns
only on a genuine relaxation — **no content changed** (all 37 generated
levels keep their sentinels; distribution verified).

**Status: FIXED** (L39 live-passes; verify 8-check green; full suite
re-run green).

---

## Near-misses logged during this cycle (no code change needed)

- **Test-harness double-invocation** (`bfsEval` IIFE called twice) — a
  test-file bug found when the new suites were written; fixed in the test
  files, not the game. Noted here because it initially looked like a game
  desync.
- **`game.renderer` vs `game.stage.renderer`** — the perf suite's first
  version measured the wrong object; fixed in the suite. The scene-graph
  boundary (Stage owns the renderer) is by design (architecture §2).
