# KUBIK — Technical Decision Log

ADR-style. Status: all **Accepted** and implemented (v1.0.0).

## ADR-001 — three.js + Vite, no app framework
**Decision:** three.js for 3D; Vite for dev/build; plain ES modules
elsewhere; zero other runtime dependencies.
**Why:** the game is one 3D scene + one DOM overlay. A framework (React,
Vue, Svelte) would own the HUD for no benefit — the HUD is 90 lines of
direct DOM. three.js is the only library that earns its bundle size.
**Consequences:** +tiny bundle, +offline-friendly, +readable codebase;
−we hand-write the HUD (fine), −no framework ecosystem for UI (unneeded).

## ADR-002 — Discrete tile-grid movement, NOT a physics engine
**Decision:** the world is a `Map<"x,z", tile>` heightfield; a roll is a
legal-move check + fixed-duration animation (0.243 s roll — see the ADR-012 postscript; 0.17 s at decision time). No gravity integrator, no AABB
solver, no continuous collision detection.
**Why (decisive):** (1) **fairness** — the genre's #1 player value is "I
died because I failed, not because of precision" (research §3); discrete
moves make every death a graph-theoretic fact; (2) **provability** — the
same `checkRoll` powers the verifier that *proves* solvability, soft-lock
freedom, and par; a physics sim can't be proven, only sampled; (3)
**performance** — zero per-frame physics, deterministic on any device;
(4) **feel is recoverable** — the 0.243 s eased roll + bump-back + wind hop
read as physical while being 100% deterministic.
**Trade-offs accepted:** no free-rolling off an edge at an angle (the roll
is always 90° — by design, it's the game's grammar); no stacking of
objects; no momentum. None of these are in the design.
**Complexity:** O(1) per move (Map lookup); O(V) per verifier pass.

## ADR-003 — Zero binary assets
**Decision:** no image/audio/font/level-data files. Slab geometry merged
at load; glow textures generated in `textures.js`; soundtrack + SFX
synthesized in Web Audio; all levels are JS data.
**Why:** (1) offline + private + tiny; (2) every visual/sound is a
function → themeable (2 full skins from one palette table); (3) the
"content = code" model is what lets the generator *prove* levels; (4)
nothing to leak, scrape, or re-licence.
**Trade-offs:** no hand-painted art; sound is generated (deliberate:
calm, metronome-grade, no sample identity issues).

## ADR-004 — Levels are static, proven data — generated offline, not at runtime
**Decision:** 13 hand levels + 37 campaign levels generated *offline* by
`gen-campaign.mjs` (seeded PRNG, rejection sampling until the verifier
passes), committed as static `src/campaign.js`. Dailies are generated at
load (date-seeded) and proven at load by the same verifier.
**Why:** runtime procedural content in a fairness-critical game is
liability (impossible level = unfixable in the field). Offline
generation gives the authoring speed of procedural content with the
guarantee of hand content. Rejection-until-proven means "generator output
is always legal" is a *property*, not a hope.
**Trade-offs:** campaign is fixed until regenerated (fine — it's a
campaign); the generator must stay in the repo (it is) so new levels
follow the same proof.

## ADR-005 — Pure-Node rule core (`rules.js`) as the testability boundary
**Decision:** every legality question lives in `rules.js`, free of
`three.js`, DOM, timers, and RNG.
**Why:** the verifier (50+14 levels, 7 checks), the unit tests, the
generator, and the playable-route bot all compose it. It is the single
source of truth for "is this move legal" — `game.js` and the in-page BFS
in tests import the *same* constants (`MAX_DROP`, `MAX_CLIMB`), so the
proof and the play can't disagree about the rules.
**Consequence:** if a rule changes, every consumer updates through one
file and the full gate must pass.

## ADR-006 — Headless-Chromium QA via puppeteer-core + @sparticuz/chromium
**Decision:** all browser tests (playable-route, playtest, stress,
regression, perf) run in headless Chromium with SwiftShader
software rendering.
**Why:** real input path + real render path, no display, no GPU, CI-safe.
@sparticuz/chromium ships a self-contained headless shell;
`puppeteer-core` adds no browser download. In the sandbox we point it at
locally-built NSS libs (auto in the test scripts; no-op on CI where the
OS provides them).
**Trade-offs:** SwiftShader numbers understate real-GPU performance —
perf budgets are set with that in mind (see performance_report.md);
software-rendered headless can't validate aesthetics → screenshot review
in `docs/` is the visual gate.

## ADR-007 — localStorage save with defaults-merge migration
**Decision:** one JSON blob in localStorage; `loadSave()` merges over
`DEFAULTS` and catches parse failure → fresh save. New fields default
automatically; no version field.
**Why:** zero-backend, per-device, and the failure mode (corrupt save)
must never crash the game — a reflex game that eats your progress at the
wrong moment is dead. Defaults-merge makes every schema extension
backwards-compatible by construction (`unlocked` became an inert legacy
field this way when all levels opened).
**Trade-offs:** no cross-device sync, no anti-cheat (irrelevant offline;
medals are local mastery, not competition).

## ADR-008 — Synthesized Web Audio (no samples)
**Decision:** `AudioEngine` builds pad/arp/SFX from oscillators +
noise + filters at runtime; per-level seed so each level sounds distinct.
**Why:** ADR-003 consistency; Web Audio latency is fine for this game
(SFX are non-critical); zero files.
**Trade-offs:** CPU cost of synthesis (measured negligible, see
performance_report.md); no "signature" sound identity (acceptable).

## ADR-009 — Presentation clocks for slider bridges
**Decision:** rising-bridge "is it up now?" is computed from the view's
animation clock (`levelView.sliderUp`), which `game.js::isSolid` queries.
**Why:** sliders are *visual* timing hazards — the player's reference is
what the slabs do on screen. The clock starts at level load and the game
reads it, so logic and presentation share one time base (no drift, no
"the slab looked up but the logic said no").
**Trade-off (accepted, documented):** one place where presentation owns a
gameplay clock. It is pure math (sin of time, period, phase) and is
verified: the verifier models sliders as *always solid* (worst case for
route existence) while the playable bot plays them frozen — together they
bound both failure modes (a route that needs a timing window exists in
the always-solid proof; a timing window that doesn't exist can't hide a
dead level).

## ADR-010 — Two-bar test gate on every commit (verifier + playable bot)
**Decision:** `npm test` = unit tests + pure-Node verifier (route,
push/crumble survival, soft-lock, spawn safety, shard reachability, par)
+ a bot that *plays* all 50 levels + today's daily to `won` through real
keyboard input. Wired as a git pre-commit hook and GitHub Actions CI.
**Why:** the genre's recurring shipped defects (EDGE: crash on a moving-
block level; janky block interactions; unresponsive swipes — research
§6) are exactly the defects a play-to-completion gate catches. Making it
a *commit blocker* (not a nightly check) means a broken level cannot
exist on the branch at all.
**Trade-offs:** commit time ≈ 4 min (accepted: the alternative is
shipping broken levels); CI cost ≈ 5 min per push (accepted).

## ADR-011 — All 50 levels open from the start
**Decision (2026-11-06, player-directed):** no progression gating.
`save.unlocked` retained in schema (inert). Reverting = 2 lines in
`openLevels()`.
**Why:** player preference for mastery-routing over lockout; also removes
an entire failure surface (unreachable-card bugs) and simplifies the
playtest (every card must be open).
**Trade-offs:** no enforced difficulty curve (mitigated by level-select
ordering + act structure; curve is now a suggestion, not a wall).

## ADR-012 — Timing-fairness gate: every sentinel crossing must have a ≥ 0.5 s window (2026-11-06)
**Context:** the player reported L46 "The Wall Walks" was unfinishable —
the moving sentinel on the only corridor left no time to cross
(BUG-003). The verifier modelled sentinels *absent* and the live bot had
never been run against every level, so a periodic hazard could seal the
sole route and nothing caught it. Pre-fix, **22 of 50** campaign levels
had at least one crossing window below 0.5 s.

**Decision:** add a crossing-window model to `src/rules.js` (algorithms
§6.1) and make it a **third bar** of the commit gate:
- `candidateCrossings` — BFS over the line graph, depth ≤ 4: straight
  runs, L-shapes and 2-row patrol bands (the L12 geometry) are all
  enumerable candidates.
- `crossingWindow` — fine-grained simulation over one joint orb period;
  an orb counts only if its patrol is within Chebyshev 1 of the path.
- `TIMING_FLOOR = 0.5 s` — a window is *fair* iff it is at least this
  long (≈ one roll of reaction margin; the old L46 measured 0.36 s).
- `fairCrossingGraph` + `timingProblems` — the verifier (check 8)
  requires a fair path start→goal, and for `gateKey` levels proves
  start→key and key→goal **separately** via `keyNode` graph waypoints
  (BUG-004: L12's key sat behind a crossing the old generator could not
  even see). Crossing candidates are additionally filtered by the roll
  law — a burst whose entry/exit roll is a blocked climb (or a void
  step) is not a route, even with a wide window (BUG-007: L39).
- The generator (`gen-campaign`, `gen-daily`) retries layouts until the
  gate is green; crumble slabs are placed **after** sentinels and never
  on a patrol line or adjacent to one (BUG-005: L15's crumble sat on the
  only crossing entry — waiting there was a slab-break gamble).
- The live playable bot plans over the **same** `fairCrossingGraph` and
  commits each line run as one gap-free burst (pre-queued continuation
  rolls, no pause on the patrol line).

**Why 0.5 s and not "any positive window":** the cube's crossing speed
is fixed by `ROLL_TIME`; a positive but tiny window is only fair for
frame-perfect input, which the player cannot reliably produce (EDGE's
own reviews cite control jank — research §6). 0.5 s is the smallest
margin a human can hold across one roll at the slowest shipped orb
speed.

**Postscript (2026-11-07):** the player directed a 30% cube speed
reduction (`ROLL_TIME` 0.17 → 0.243 s). Slower bursts are wider in time,
so the gate re-scored every crossing; exactly one level (L37) lost its
fair window and was re-rolled by the generator — proof the gate tracks
the constant, not a frozen level set.

**Trade-offs:**
- verify time: 12.1 s (was <1 s) — accepted, it is the core promise of
  "no unfinishable level"; the relevant-orb filter keeps multi-orb
  levels cheap.
- generated levels re-rolled under the gate (37 layouts regenerated,
  all re-verified + spot-checked live); hand-authored L1–L13 untouched
  (L12 passed as authored once band crossings became visible).
- the bot is now stricter than a human: it plays the *verified* route
  with perfect window reads, so "bot passes" is a necessary-not-sufficient
  reading of "human can finish" — the verifier's exhaustive-in-time
  windows are the actual fairness claim; the bot proves the game's
  *runtime* (render clock, input queue, crumble timers) agrees with the
  sim at frame rate.

## ADR-013 — One resolved press, platform-as-clock: the 2026-11-07 mechanic set
**Context:** the player asked for (a) EDGE-scale maps (the campaign top
out at 12×12) and (b) a platform that "moves from one structure to
another in a loop… acting as a bridge", plus "some other new features".
The heightfield has one tile per (x,z), so a vertical lift/elevator is
impossible (no floor to exist *below*); the shuttle was designed as a
horizontal looping platform between two structures, and two cheap,
provable mechanics rounded the set: **ice** (a press onto ice keeps
sliding in the same direction) and **spring** (a press on/onto a pad
launches up to 3 tiles over void).

**Decision:**
- **One press = one resolved landing.** `resolveRoll(level, from, d)`
  returns the tile a single press lands on, *after* all automatic
  follow-through (ice slide, spring launch, and their composition). The
  solver, the soft-lock proof, the route planner and the playable bot
  all expand moves through this one function (plus an explicit
  dock↔dock **ride edge** for shuttles), so a multi-tile follow-through
  is one graph edge with one press of par — fairness stays provable.
- **The view is the shuttle clock** (ADR-009 extended):
  `levelView.shuttlePos(i)` / `shuttleDocked(x,z)` are pure functions of
  the shared render clock (dwell 2.0 s / dock, travel 0.8 s / gap tile,
  loop forever). `game.isSolid` solidifies a dock only while its
  platform dwells; `updateShuttleCarry` is the only carrier: a settled
  cube on the driving platform is grabbed (dock-side, frame-rate
  independent) and tracked by **mesh distance**, never by the
  platform's rounded tile — at low frame rates the rounded tile jumps a
  tile per frame and the tile-based version killed carried cubes
  (caught by the live gate, 2026-11-07).
- **The generator carves the mechanic into the route** (the pit/dock is
  *the* crossing — no detour box left solid), keeps every sentinel line
  one tile clear of mechanic corridors (spawns rejected otherwise), and
  the verifier re-checks corridor clearance, ride edges, dwell ≥ 2.2
  rolls, and spring/ice landings in the static proof.
- **Gameplay fix found by the gate:** a queued input pumped mid-spring-
  launch fired the press *from the pad* and dropped the cube in the
  pit. `finishMove` now defers `pumpQueue` until the auto-continue chain
  has fully settled (`if (!this.cube.anim) this.pumpQueue()`).

- **Crossing-graph hardening (found while stabilising the live gate):**
  `candidateCrossings`' line-walk BFS could emit self-revisiting candidate
  paths (e.g. `…3,5→2,5→3,5→4,5…`), which produced duplicate and
  back-and-forth crossing edges. They were mostly harmless (higher cost,
  so Dijkstra avoided them) but a revising seq reconstructs to a
  multi-tile "press" — a desync in the making. The BFS now refuses to
  revisit a line tile within one candidate. In the same pass the live
  bot's planner gained a route tripwire (every planned press must be a
  legal `resolveRoll` landing) and two load-related repairs: the retry
  loop re-snaps after a death auto-restart (it used to plan from the
  stale pre-restart position), and a commit no longer abandons the cube
  mid-burst when a roll outlives its settle wait under throttling.

**Trade-offs (accepted, documented):** dailies intentionally stay
classic-mechanic (the daily generator is a separate, smaller pipeline —
new mechanics there would re-open the daily proof surface for little
player-visible value); the shuttle's ride is treated as timing-free in
the static proof (the dwell is ≥ 2.2 rolls wide, so the window exists by
construction — the live bot still boards it against the real clock);
the spring flight is a fixed-arc presentation (0.18 s + 0.08 s/tile),
not a physics sim — consistent with the no-physics contract (ADR-002).

## ADR-014 — Mid-path second chance (the rescue bench) (2026-11-07)
**Context:** the player asked for relief on big levels: "if [they] get out
after passing more than half path, give [them] one more chance directly
from the middle of the path, instead of restarting". At 18×18 finale maps
(~30+ presses) a late death costing a full restart is a rage-quit, and
rage-quits in short-session puzzle games track 3+ consecutive deaths.

**Decision:**
- **The bench** is a pure function of the level (`rescueTile`): the
  50% press of the proven shortest press-path, adjusted to the nearest
  *safe* tile along that path — safe = not on a sentinel line, not a
  crumble, not a shuttle dock, not ice, not a spring (a bench must be a
  place the cube can simply *stand*). On gateKey levels the journey is
  measured through the key (start → key → goal) and the bench must sit
  strictly past the key — a player 50% along that journey has the key.
  Levels ≤ 4 presses ship without a bench (a restart is instant).
- **One rescue per attempt.** Dying with more than half the par spent
  turns the 1 s instant restart into a 6 s choice window: resume from
  the bench (R / Enter / tap) or do nothing and the normal restart
  happens — the muscle memory is preserved.
- **What a rescue keeps:** moves, elapsed time, collected shards, broken
  crumbles, pushed blocks, the key. **What it resets:** only the
  sentinels (to their start phase — a clean timing slate, deterministic).
  Commitments stay real; hazards don't.
- **Medal purity:** a rescued clear counts as a clear, but its time and
  route are **not recorded** (no best time, no ghost). Rankings are
  clean-run rankings; the assist-mode tier (M5) will generalise this.
- **The fairness gate extends to the bench:** verifier check 0c proves a
  timing-fair route bench → goal exists for every level that has one —
  the "at least one path exists" invariant now covers the second chance
  too. 48 of 50 shipped levels carry a bench (only the 2-press warm-ups
  don't).
- **The live bot accepts rescues** in its retry loop, so the flow is
  exercised live on any level where the bot ever dies past halfway.

**Trade-offs (accepted, documented):** the bench is at the 50% press of
the *proven* path, not the player's actual route (the player's route is
not known to the solver; the bench is a fixed, provable location — the
Hollow-Knight-bench pattern). The settings toggle ships later with the
assist mode (M5); the save key (`rescue`, default on) is already wired.

## ADR-015 — The 200-level campaign: archetype library + shared hazard stage + stratified gate (2026-11-07)
**Context:** the level target scaled from 50 to ~200 (10 acts × 20). The
14–50 pipeline is a *single* walk-based template with inline hazard carving;
it cannot vary enough to fill 150 new levels without them feeling like the
same room, and its hand-rolled sentinel placement hid a real bug (a labelled
`break outer` capped every level at one orb — the shipped [2,2] finale band
was never met). Hand-authoring 150 levels is not the use of the team's time;
a *proving* generator is.

**Decision:**
- **Content stays static and version-controlled (ADR-004).** A script
  (`scripts/gen-campaign2.mjs`) generates *once*; the result is committed as
  plain JS data (`src/campaign2.js`). No runtime RNG, no fetched levels —
  the shipped game stays deterministic and every level is provable on a
  plain clone.
- **An ARCHETYPE LIBRARY carves the topology** (`scripts/archetypes.mjs`,
  24 builders: descent, switchback, twin-bridge, spiral, lattice, split-merge,
  ring, key-detour, vault, shuttle-span, spring-field, ice-river, gauntlet,
  bridge-chain, staircase, crossroads, aperture, twin-falls, fork, long-drop,
  meridian, undertow, canyon, boss-arena). Each is a small walk/row/turn
  routine that returns `{map, path, start, goal}`. The serpentine family
  separates rows with VOID gap rows and a single connector per turn — two
  touching rows would fuse into one climbable block and collapse par
  (measured: 220/220 candidates failed at par 5–17 until the gap rows).
- **One SHARED HAZARD STAGE dresses every layout** (`scripts/hazards.mjs`
  `applyHazards`), and 14–50 were re-pointed at it too. Mechanics are only
  ever carved along MAXIMAL straight runs (a run detector that emits nested
  sub-runs is what produced 31 "sentinel lines" out of one 12-tile stem).
  **The refuge law** is the load-bearing piece: a sentinel is fair only if
  the player can step OFF its patrol line, so the stage places a dead-end
  fill slab beside every run ≥ 5 tiles (every 3rd tile, both sides tried).
  The slab must be a true dead end — otherwise it becomes a shortcut that
  recreates the par collapse it was meant to fix.
- **The verifier IS the generator's acceptance gate.** A candidate is
  rejected until it passes the full 9-check verifier (spawn safety,
  reachability, soft-lock proof, crumble-aware solver, sentinel timing
  fairness, par band, shard/key reachability) plus the rescue-bench
  fairness check. Checks run CHEAP→EXPENSIVE (BFS before the state-space
  timing search) or dense act-end levels burn minutes on candidates that
  fail their par. Timing-only failures get a speed-tuning ladder (0.9 →
  0.45×) before the candidate is discarded.
- **Act budgets live in `src/acts.js`** — width, par band, orb/crumble/
  speed/shard/fill ranges, mechanic probabilities, key probability, and a
  name pool per act. Every 20th level is an ACT-END BOSS (boss-arena
  archetype, 18×18, forced 2+ orbs, par band nudged +2/+4). Archetypes
  rotate inside an act and never repeat the last two.
- **Uniqueness + curation:** a candidate is rejected if its tile signature
  hash repeats or it overlaps > 85% (Jaccard) with a recently shipped
  level; among the proven candidates the best *curation score* (hazard
  variety + par placement in the band) wins. Two invariants the
  generators are held to: (1) **no fixed skeleton** — an archetype whose
  layout is the same on every seed (the first boss-arena was one 54-tile
  track, Jaccard 0.93 with itself) makes every second instance of it
  inside the 40-level uniqueness window a guaranteed rejection; each
  archetype therefore varies its geometry per seed (columns, rows,
  arm lengths, 50% mirror). (2) **par fit** — an archetype whose natural
  par range does not overlap an act's par band (e.g. the pillar-spine
  vault at par 7-17 vs Darkwater's 30-46) can never pass that act's gate;
  the pool in `src/acts.js` is curated so every archetype in a pool
  overlaps the band (checked by `scripts/` probes), and layouts that were
  structurally too short for the late acts (shuttle-span, twin-falls,
  vault, key-detour) were extended (S-corridors, a third platform, true
  gap-row serpentine spines) rather than the bands being widened.
- **The live gate is STRATIFIED at 200.** The full in-browser bot suite is
  ~30–45 min — fine for a nightly, too long for every commit. Per commit the
  pre-commit gate (`npm test`) plays the CHANGED levels plus a ROTATING
  50-level quarter (`scripts/live-gate.mjs`, state in the git-ignored
  `.kubik-rotation.json`); a green run advances the quarter by 50, so every
  level is live-played at least once per four commits and *immediately* if
  its content changed. A scheduled GitHub job
  (`nightly-full-play.yml`) plays all 200 daily. Unit + the pure-Node
  verifier still run in full on every commit.
- **The level select became an ACT MAP** (10 acts × 20 slots) — the flat
  50-tile grid would not scale, and acts give the campaign its structure.

**Why a proving generator beats hand-authoring at this scale:** (1) the
"every level has at least one path" invariant is *enforced at build time*,
not re-checked by a human per level; (2) 150 levels × (verify + a live bot
pass) would be many hours of a person's time that a 220-attempt search
spends unattended; (3) the archetype+hazard split means a new layout idea is
~40 lines, and a new hazard rule applies to all 24 layouts at once — the
single-orb bug is exactly the kind of shared-defect the split eliminates.

**Trade-offs (accepted, documented):** the generator is ~1000 LOC and a full
run takes ~30 min (mitigated: per-act budgets are data, and partial runs
`51 60` splice into the existing file instead of truncating it); generated
levels share an author (the pipeline) and the uniqueness gate is what keeps
them from sharing a face; the rotating live gate means a level whose
neighbours changed may wait up to ~4 commits for a full-window bot pass
(backstopped by the nightly full run and by the changed-level set, which
always includes the level itself); regeneration is a content change, so a
re-run is a deliberate, reviewed diff — not a silent rebuild.

**Postscript — M2.5 variety pass: the mechanic blackout and its fixes
(2026-11-12).** The M2 regeneration shipped 200 levels with **zero
shuttles and springs, and ice only where an act probability was exactly
1.0** — a silent feature removal of the EDGE-scale mechanic set (pre-M2
14–50 had 21 ice / 6 spring / 4 shuttle levels). A chain of independent
defects conspired, each verified with per-attempt traces before fixing:

1. **The carve gate swallowed best-effort mechanics.** The hazard stage's
   carve loop broke on `p < 1` *before rolling the probability*, so a
   mechanic with probability < 1 never carved — deterministic 300/300
   gate-breaks at probability 0.95. The law is now: the **forced quota is
   always attempted** (up to 4 tries; a failed forced carve rejects the
   candidate) and **extras decay geometrically** (`p·0.5^(n−forced)`), so a
   level gets its identity mechanic plus at most a whisper more.
2. **The force envelope was wrong in the 51–200 call.** `gen-campaign2`
   passed the force object bare where `applyHazards` expects an
   `{force}` envelope — traced as `force={}` at the carve stage for every
   level. Now merged explicitly: the act's identity force (the ice act,
   the shuttle act) under the archetype's own force.
3. **The 3-phase orb loop could not relax.** It re-ran the *same* candidate
   stream under budgets [orbs0, ceil/2, 0], so an early "proven but
   low-orb" candidate was only ever verified under the strict budget, and
   the relaxed phases saw worse candidates (L82: 4 proven candidates in
   660 attempts, all in the last phase's window — the level failed at 220
   attempts yet passed at 60). The loop is now **single-pass**: verify
   once at minOrbs=0, rank by (orb count, then curation score), settle on
   the best proven candidate — unique, or non-unique with a logged warning
   when the rolling 40-level uniqueness window has starved the level.
4. **The gauntlet's shortcut starved its own par.** The start and goal
   share the spiral's outer column; when sideFill doesn't fill the gap
   rows between the two column segments, the shortest route runs straight
   up the start column — 41/60 measured walks at par 16–20 against a band
   floor of 24 (L92: 0/220 proven). The archetype now **clears those gap
   rows by construction** (deterministic, no rand — an internal resample
   loop consumed a variable amount of the per-level rand stream and
   shifted every downstream carve, fixing one level while breaking the
   next) so the route takes the spiral detour (par ~36–44); a par-gate
   backstop rejects the rare over-long walk, and verify re-checks
   post-carve drift.
5. **The refuge slab re-solidified hollowed mechanic spans.** The slab
   placer filled any void neighbour of a ≥5-tile run that passed the
   dead-end test — without consulting the mechanic set. A shuttle span
   clearing removes the side slabs on purpose, so a dock tile has zero
   solid neighbours, passes the dead-end test, and gets refilled:
   `parseLevel` then throws "shuttle dock is not void" and rejects the
   whole candidate (L82: every shuttle candidate, 0/220). Slab placement
   now skips mechanic-marked tiles.
6. **Mechanic carves at run-start corners fired along the approach, not
   the run.** The spring launch and the ice slide both continue in the
   direction of travel, but the carves validated only the S-A-L geometry.
   At a spiral corner the approach comes around the turn, so the launch
   flew along the turn — 10 rows into the gauntlet's void gap (a fall on
   every press; `shortestRoute` -1, no route at all) — and a corner ice
   slide overshot onto a side slab and sealed the level. `trySpring` and
   `tryIce` now require a collinear approach, so both entry directions
   stay on the run.
7. **A long spiral plus patrols is structurally timing-unfair.**
   undertow (forced ice + spring on the gauntlet) under the act's 2–3
   sentinels: 29/220 candidates reached the expensive checks and every
   one failed sentinel-timing or bench fairness, and the 0.45× speed
   ladder could not rescue any. The sentinel band relaxes to `[0,1]` for
   this archetype (its identity mechanics stay forced — a level that is
   a gauntlet of mechanics rather than of patrols is the point). The
   speed-ladder trigger also now covers bench-fairness failures —
   previously only `timing:`-prefixed problems qualified, so a candidate
   whose sole fairness failure was the bench route never got slowed.
8. **Act-4 pool narrowing + the diagnostic lie.** L82's uniqueness
   window starved when acts 4's pool settled 51–81 on candidates that
   resembled every later candidate (dropping `crossroads` and `lattice`
   from the pool unblocked it; the `bestAny` settle is the fallback).
   And the `KUBIK_FORCE_ARCH` diagnostic swapped the arch **without its
   force**, so an "undertow passes" test silently ran the alias with
   `force:{}` — the override now re-derives the force through
   `pickArchetype`, and no level change was accepted on an override run
   that wasn't force-identical to the natural selection.
9. **`spawnProblems` mis-parsed dock coordinates.** The shuttle-dock
   audit loop destructured each `"x,z"` KEY STRING of `shuttleDocks`
   into `[x, z]` — i.e. took its first two CHARACTERS — so dock
   `"15,14"` was audited as tile (1,5) and false-flagged "ice on a
   shuttle dock 1,5"; the start/goal comparisons mixed strings and
   numbers and could never fire. It now parses the keys, and the dead
   string comparisons were replaced with real ones.
10. **The fair-route model could not cross mechanic spans.**
    `fairReachSet` (the bench-fairness check and the start→goal
    timing check both ride on it) expanded one adjacent tile at a time,
    so a hollowed spring pit or shuttle span with no solid detour —
    the gauntlet spirals, where the span IS the only crossing — made the
    level look unreachable and the gate rejected it (false negative,
    verified with a mechanics-aware BFS before the change). The model
    now adds the mechanic transitions (`mechanicTargets`: shuttle ride,
    spring launches) on top of the plain adjacency. They can never
    introduce an unfair crossing: the radius-1 sentinel exclusion keeps
    every patrol-line tile a full tile away from every mechanic tile,
    so a ride or launch cannot land on or touch a line. This is a step
    in the ADR-016 direction (the timing model mirrors the real cube).
11. **The carve candidates were sampled at the wrong positions.**
    `trySpring`/`tryIce` drew candidates from `solidRuns()` starts, but
    a spring carves the tile AFTER the pad and an ice tile rides in the
    run direction — and the approach-collinearity filter (fix 4) rejects
    exactly the run-start corners, where the approach arrives around a
    turn. On layouts whose runs are entered perpendicularly (L102
    spring-field) the two exclusions removed every candidate, so the
    FORCED mechanic silently failed all 220 attempts (`nullLayout=0,
    nullCand=220` — the layout was fine, the candidate source was not).
    Both now iterate the path for mid-run positions where P–S–A (or
    P–I–N) is a straight line, i.e. the positions where the launch/slide
    actually flies over the pit or along the run.
12. **`fairReachSet` ignored the roll law — a false POSITIVE the other
    checks all share.** The fair-reach set expanded by naive four-neighbour
    adjacency (any solid neighbour), so a +2 climb counted as reachable.
    L20 "Glass Meadow" (regenerated in the M2.5 pass) shipped with the
    start's only legal roll landing on the sentinel line: every start→goal
    route crosses the patrol, and every multi-tile crossing there has a
    0.00 s window (the cube's roll cadence cannot beat the orb's
    0.57 s/tile in either direction — only the single-tile crossing at
    (2,7) is fair, at 0.70 s, and it is unreachable without crossing
    first). The naive set "climbed" +2 off the line, declared the goal
    fair-reachable, and `timingProblems` returned clean; the live bot's
    planner — which mirrors `resolveRoll` — had no route and the level
    failed the gate. The set now expands by `rollTargets` (the game's own
    one-press transitions: roll law + ice carry + spring fire + shuttle
    ride), which also subsumes the separate `mechanicTargets` loop.
    Corrected model surveyed across all 200 + dailies: L20 was the only
    rejection — both ranges were regenerated under it.
13. **The stratified live gate could never go green on a subset.**
    `test-levels-playable.mjs` computed `total = LEVELS.length + 1`
    (always 201) even when `KUBIK_LEVELS` restricted the run to a
    subset, so every stratified run — the per-commit "changed +
    rotating 50" tier of ADR-015 — exited 1 no matter what it passed,
    and the pre-commit gate would have blocked every commit. The 14–50
    gate passed 38/38 with zero page errors and still exited red.
    `total` now counts the requested set. The full-catalogue runs
    (nightly, first commit) are unchanged.
14. **`crossingWindow` paid a full fine scan for a floor decision.**
    The scan tracked the longest safe start-time span across the whole
    horizon, but the edge decision only needs "≥ `TIMING_FLOOR`". The
    fine pass now stops once the run clears the floor, so an above-floor
    window is settled at the coarse pass's first crossing. L87: 196/206
    candidates were above floor — 15.5 s → ~0.5 s per crossing graph,
    ~3 s per gauntlet candidate. The reported `bestWindow` clamps to
    the floor in that case; the failure message it feeds still says
    what it means (a fair window exists but no route reaches it), and
    every below-floor window — the ones that decide failures — is still
    computed exactly. Verdicts verified identical on the shipped
    gauntlets (L82/87/92/101/115/119).
15. **The attempt cap rose 220 → 300, and act 10 got a per-act 450.**
    The model corrections (fix 12 roll-law fair-reach, fix 11 carve
    candidate source, fix 16 slide-lands-on-spring) each reject more
    candidates, pushing sparse slots' winners deeper in the stream.
    L199 "The Long Way Up" (vault, act 10 — par band 34–50) is the
    sparsest slot in the campaign: 220/220 rejected under the corrected
    fair-reach model (mostly soft-locks/crumble sealing in the goal
    row), passed at ≤300 (par 36, 2 sentinels, key), and the spring
    fix then removed that ≤300 winner (it was one of the seven
    slide-to-pad levels) so the final model needs ≤450 (par 39, 3
    sentinels, key). The vault archetype is not unbuildable at the band
    (the M2-era L199 at par 39 still verifies under the corrected
    model); the passing candidates are simply sparse in that slot's
    layout space. A global 450 cap was tried first and rejected: it
    made every gauntlet (expensive crossing graphs) pay for one sparse
    slot. Instead the gen band carries an optional `attempts` field
    (acts.js — the same per-act data that sets par/orbs/crumble), and
    act 10 sets 450; the generator uses `act.gen.attempts || 300`.
    Worst case stays ~30–45 s per level under the fast timing model
    (fix 14).
16. **An ice slide landing on a spring pad fires the spring — the model
    did not.** `resolveRoll` fired a spring when a press's direct step
    landed on a pad, but the ice-slide follow-through loop stopped the
    cube on the pad. The game's `autoContinue` launches on ANY landing,
    slides included, so L68 "The Lost Stair" shipped with its only
    route crossing an ice run that ends on a pad aimed at the void: the
    verifier saw a safe landing, the live bot launched the cube into the
    void on every attempt (3/3 deaths, "goal not reached"), and the full
    200-level live run caught it. The slide loop now resolves the launch
    (same landing law; a launch with no landing is a fall, `null`, the
    same convention as a roll into the void), and the bot's fast-mode
    inline mirror got the same line. A survey found slide-to-pad
    geometry in 7 levels (52/68/105/131/164/178/199); only the two whose
    launch is fatal (68, 199) fail the corrected verifier — 51–200 was
    regenerated under it.
17. **Dock-to-dock rolls do not exist.** `resolveRoll` treated shuttle
    dock tiles as ordinary slabs, so a route could step from one
    shuttle's dock onto an adjacent dock of a different shuttle. In real
    play that step needs the second platform docked there in the same
    instant the first platform's dwell ends — a phase coincidence.
    L196 "The Ascent Complete" shipped two shuttles with adjacent docks
    (16,9 / 16,8) and identical cycles (wait 2 s, travel 1.6 s), so the
    transfer window never opened: the cube was carried back, stepped
    into the void, and the full live run failed the level while the
    verifier stayed green. `resolveRoll`'s step now refuses
    dock→dock moves (a cube on a platform rides — `shuttleRide` — or
    steps onto a slab), and the bot's fast-mode planner mirror got the
    same line. Only L196 in the whole catalogue relied on the phantom
    step; its slot was regenerated (shuttle-span, par 38).
18. **The bot replanned from mid-shuttle positions.** Two harness fixes
    from the same L196 investigation: (a) the drive loop's position
    gate returned 'replan' the moment a departing platform carried the
    cube off the dock tile — before the ride branch could own the
    transit — and the planner then reported NO FAIR ROUTE from a
    mid-track position that is not a tile; rides are now exempt from
    the gate. (b) When planning finds no route, the bot now waits for
    the cube to settle onto a real tile (mid-slide, mid-ride) and
    plans again before declaring a level unplayable.

**Restoration + identity.** 14–50 carry the approved mechanic INTRO
schedule as *forced* levels (`INTRO_MECH`: first spring L25; shuttles
L28/34/36/42; the double-shuttle finale L50) over best-effort probabilities
tuned so a shuttle still reads as a set piece (0.2). Acts 6 and 7 force
their identity mechanic on every level (`force: {ice: 1}` / `{shuttle: 1}`
in `src/acts.js`). Two further M2.5 variety layers ride the same gate: a
per-act **orientation rotation** (acts.js `flip`, mirrored after the proof
— every rule is mirror-symmetric and the file-level verifier re-proves)
and a per-act **light palette** (stage + slab tint from the act's `hue`,
subtle by design so patrol lines and elevation stay readable). The
sentinel exclusion stays **radius-1** around mechanics: shrinking it to
same-run-only let patrols sit beside forced launches and took the forced
shuttle+spring level from proven to 0/600.

## ADR-016 — The timing model must mirror the real (eased) cube, and a burst ends at the crossing (2026-11-07)
**Context:** after the 200-level regeneration, the live playable bot died on
gate-fair levels (L19/L31/L36 class) even though the 9-check verifier
proved a route. Two independent model gaps were found:

1. **Linear-cube bias.** Both the verifier (`rules.crossingWindow`) and the
   live bot (`crossingSafe`) simulated the crossing cube as moving
   *linearly* between tiles at `ROLL_TIME` per roll. The real cube rolls
   with the game's `easeInOut` (game.js), which lingers near each tile
   centre and rushes the midpoint. A linear cube underestimates how long
   it sits inside the sentinel's 0.62 kill radius, so the gate advertised
   windows a real player dies in. This is the same failure family as
   BUG-003/ADR-012 but at the trajectory level, not the window level.
2. **Burst ran past the crossing.** `driveCommit` drove "the line run plus
   the exit roll" but kept pressing as long as the *next* tile was on the
   patrol line — so a zig-zag route that re-enters the line immediately
   (cross, hop off, cross back) had its second crossing driven with no
   sentinel check at all: the cube re-entered on the old burst's momentum
   and died. The commit also let its catch-up index run past the exit
   mid-iteration and then pressed the next segment's first roll.

**Decision:**
- **Both timing models now ease.** `crossingWindow` (rules.js) and
  `crossingSafe` (the live bot) interpolate the crossing cube with the
  same `easeInOut` the game uses, so the gate and the play contract agree
  with the *real* trajectory — not a faster idealised one. The L46 fair
  fixture in `tests/unit/timing.test.mjs` was re-pinned (sentinel speed
  1.35→1.15) so it clears the 0.5 s floor with margin under the eased
  cube.
- **A burst ends at its crossing's exit tile.** `driveCommit` takes an
  explicit `exitIdx` and returns the moment the catch-up index reaches it;
  it never pre-queues or presses past the exit. Every further route
  segment (including a re-entry into the line) is owned by the main loop,
  which re-runs `crossingSafe` before each re-entry. Terminal crossings
  (route ends on the line, e.g. at the key) set `exitIdx` to the last line
  tile.
- **`crossingSafe` gained a `tail` cushion (0.18 s).** The anchor sentinel
  distance is read a poll ago, so the real sentinels are ahead of the
  model's future; the crossing must also stay safe `tail` seconds after the
  ideal finish. `lead` (0.22 s) already covered the cube's real rolls
  trailing the model.

**Consequence:** any level whose only safe window was fair for a *linear*
cube but lethal for the *eased* cube is now rejected at generation and
regenerated. The 200-level set was re-gated and the affected slots
re-rolled; every shipped level is now provable for the cube the player
actually gets.

## ADR-017 — A sealed goal is a wall until the key, and planners must seed from real tiles (2026-11-07)
**Context:** the campaign-2 (51–200) generation introduced sealed-goal
levels, where the goal tile rejects the cube until its key is picked up
(game.js seals the goal, restores state on a rejected landing). Two
independent defects followed, in opposite directions:

1. **The verifier ignored the seal.** Its graph models — par routes
   (`shortestRoute`/`bfsRolls`), `shortestPath`, `reachable`,
   `fairReachSet`, `timingProblems`, `rescueTile` — all treated the goal
   tile as a normal landing, so a par that only worked by approaching the
   goal from the sealed side, or a fair-reach set that only connected
   through it, passed every gate. L120 was the live symptom: the bot's
   planner also found the equal-length sealed approach, the game rejected
   the landing (restore + bounce), and the cube fell into a crumble below
   the goal — a level the verifier had certified clean. L133 was a
   *genuine* defect of the same class (no key-aware route at all) and was
   the first level the sealed gate correctly rejected.
2. **The bot's planner seeded its Dijkstra with a bare `{x, z}` object.**
   `checkRoll` computes `delta = to.h - from.h`; with `from.h ===
   undefined` the delta is `NaN`, every NaN comparison is false, and
   *every* height change — including an illegal two-tile climb — looked
   legal. The route then carried an impossible roll, the tripwire (the
   lock-step guard that replans every planned roll through `checkRoll`
   and `resolveRoll`) correctly refused it, and the bot reported
   "NO FAIR ROUTE" on completable levels (L48, L99). The tripwires did
   their job: the bug was in the planner, not the levels.

**Decision:**
- **The seal is first-class in every verifier model.** The sealed goal
  tile is added to a `blocked` set until the key is taken:
  `shortestRoute`/`bfsRolls` and `shortestPath` skip it, `reachable` and
  `fairReachSet` take the blocked set, `timingProblems` carries a
  `gateKey` branch (a sealed approach may only count once the key is
  provably in hand), and `rescueTile` honours the seal. Both generators
  (`gen-campaign.mjs`, `gen-campaign2.mjs`) run the key-aware check: a
  sealed-goal level must expose a fair route *and* a fair par with the
  goal blocked before the key. The bot's `planRoute` takes the same
  `sealed` state and drops the goal edge while `!st.hasKey`, so
  planner, verifier, and game agree on what is legal.
- **Route planners seed from real tile objects.** `planRoute` seeds its
  queue with `model.tiles.get(startK) || cube` — the actual tile, not a
  coordinate stub. Rule: anything passed to `resolveRoll`/`checkRoll`
  must carry real tile fields (`.h`, `.spring`, …); a stub makes height
  checks compare against `NaN` and silently accept every climb.

**Consequence:** sealed-goal levels are provable under the sealed model —
L120 is accepted (a fair left-corridor route exists; passes live play,
55 moves) and L133 was rejected and re-rolled. The 51–200 campaign was
regenerated end-to-end under the sealed gate. Verifier-clean implies
playable again: any future planner change that touches tile objects must
keep the tripwire lock-step, because the tripwire caught both a
planner-side `NaN` and (in L133) a genuinely unbuildable level.

## ADR-018 — The crossing model must run on a press-schedule BAND, not a trajectory (2026-11-09)
**Context:** a live commit does not run on one ideal timeline. Its press
schedule varies with load (bot loop latency, a human's swipe rhythm),
and the game's queue rules make the fast and the slow cases different,
not one schedule shifted:
- **L185 "The Final Weave"** (2026-11-08) died on a certified-safe
  sentinel: the real cube trailed the ideal timeline by press +
  roll-start latency. First fix: a flat `CUBE_LAG = ROLL_TIME` on both
  trajectories.
- **L60 "Below the Cloudline"** then died the same way with the lag
  still unmodelled: the lag is *structural* — the commit pre-queues each
  continuation press during the previous roll, but the game DEDUPES
  consecutive same-direction queue entries, so straight continuation
  rolls cost a re-press loop (~0.2 s) the pre-queue can't hide. Second
  fix: a single "commit-timeline" trajectory (`commitTimeline`/
  `commitCubePos`) with a re-press gap per straight continuation.
- **L7 "Weave"** then died on a *certified-safe* crossing — with the
  timeline model. The timeline was wrong in the OTHER direction: the
  pre-queue actually WORKS for one continuation roll (the queue is
  empty while the previous roll animates, so the next press is
  accepted even same-direction), so the real cube reached the patrol
  line ~0.25 s EARLIER than the model had it. The model checked the
  sentinel against a cube that was still one tile off the line; the
  real cube was already on it (death: orb 0.55 tiles from the cube at
  (4,3), the model's position was 0.64 away — safe). A single
  trajectory is always wrong on one edge: too late (L60) or too early
  (L7). Neither edge is exotic — throttling produces both.

**Decision:** model the commit as a BAND. `commitSchedules(dirs)`
returns the fastest and slowest plausible press schedules (rules.js):
- **Fast bound** (`COMMIT_FAST_PRESS/LOOP = 0.0/0.0 s`): the EARLIEST
  the path can be covered — the press executes synchronously (roll
  creation in the same frame as the safety poll), a pre-queued roll
  starts on the frame the previous roll finishes, a re-pressed roll
  needs a full bot loop (≥ 0 game time under any throttle, since the
  bot's real loop is 0.04–0.6 s of game time and ARC_SLACK absorbs the
  sub-frame residual). Pre-queue state machine: every press
  pre-queues the next roll (free), and also the roll after that when
  the direction changes (queue cap 2); a roll is un-pre-queued — needs
  one loop — only when the press that would have covered it was itself
  pre-queued and the direction repeats.
- **Slow bound** (`COMMIT_SLOW_PRESS/LOOP = 0.35/0.40 s`): a somewhat
  slow human's commit — decision to first swipe, then a swipe rhythm
  after each roll (humans have no queue to ride).
Soundness: the true logical progress `p(u)` always lies between
`slowProgress(u)` and `fastProgress(u)` (each roll takes ≥ ROLL_TIME,
presses are ≥ 0 apart, and a pre-queued roll can only start LATER
than the ideal). The MESH, which the kill test actually reads, sits up
to `ARC_SLACK = 0.12` tiles ahead of or behind its logical progress
(pivot-arc lead and lag on the roll axis, measured over the eased 90°
pivot), so both bounds are extended by ARC_SLACK
(`commitBandProgress`). A crossing is safe only if the whole band of
possible cube positions clears every sentinel at every substep — and
the band is the PATH POLYLINE between its progress endpoints
(`commitBandDistR2`), not a straight chord: when the fast edge is on a
later roll than the slow edge, a chord cuts across the corner tile the
cube can actually be sitting on. Both models run it — `crossingWindow`
(verifier/gate) and `crossingSafe` (live bot) — keeping planner,
verifier and game in lock-step (ADR-016 doctrine, Option A).

**Consequence for the catalogue:** the band is strictly wider than the
timeline, so windows shrink. One full re-prove of the 200-level
catalogue (deterministic per-slot seeds: passing slots regenerate
byte-identical, failing slots advance to their next candidate). The L46
fair fixture was re-pinned to speed 0.5 (window 0.74 s under the
band). The band also exposed a curation defect: the long-route
archetypes are capped below par floor 19 yet sat in the act 3-9 pools
(ADR-019); the pools are corrected and the affected acts re-proven.
**Consequence for play:** a window that only one specific press rhythm
could catch is a pixel-timing trap — rejected at generation, not
discovered at the player's death. The band is what a real player
actually experiences: the cube may be anywhere in the band, and the
sentinel must be clear of the whole thing.

**Calibration (2026-11-09, L7 + L179 headless forensics):** the initial
0.06 s fast constants were ~4× the measured delays. Instrumented runs
(same game frame for poll → press → roll creation: `doMove` runs
synchronously inside the press evaluate, ε ≈ 0) caught a certified-safe
L7 commit dying 0.15–0.22 tiles AHEAD of the un-shifted fast edge,
inside the sentinel's kill radius (real orb distance 0.58, model's
minimum 0.671). First correction: `COMMIT_FAST_PRESS = 0.0`,
`COMMIT_FAST_LOOP = 0.05` (a re-pressed roll needs one full bot loop).
Then L179 "The Pincer" — passing all 9 verify checks — still died live,
EVERY attempt, on the same sentinel: at the crossing's second-to-last
roll the cube sat on a CORNER tile while the model's fast edge had
already moved onto the next roll, and the band's straight chord cut
0.31 tiles past that corner (real orb distance 0.59, model's minimum
0.729 — "safe"). Two more corrections, all in `rules.js`:
- `commitBand`'s fast edge is now the bare ideal (the +0.05 frame lead
  was removed): it had DOUBLE-counted quantization — the true logical
  progress never exceeds the ideal schedule, so the lead pushed the
  fast edge up to 0.5 tiles ahead of the real cube and widened exactly
  the corner gap the chord was cutting.
- The band distance is the PATH POLYLINE between the progress endpoints
  (`commitBandDistR2`), corner tiles included, and both endpoints are
  extended by `ARC_SLACK = 0.12` (mesh arc lead/lag — the kill test
  reads mesh positions, not logical tiles). `COMMIT_FAST_LOOP` is 0.0
  (the bot's real re-press gap is ≥ 0 and usually ≥ 0.04 s of game
  time; the sub-frame residual is inside ARC_SLACK).
Catalogue re-prove under the corrected model: all 200 levels + 14
dailies re-verified clean with NO slot regenerating (the corrected band
is wider on corners but the earlier +0.05 lead had already consumed
the equivalent margin elsewhere); L7 (7 moves) and L179 (60 moves)
both pass live.

## ADR-019 — The long-route archetypes are capped below par floor 19 (2026-11-09)
**Context:** under the press-schedule band (ADR-018) the generator could
not build the long-route archetypes — `switchback`, `staircase`,
`long-drop`, `canyon` — anywhere at or above act 3's par floor of 19.
Every dead slot exhausted 220 candidates × 3 orb-relaxation phases;
rejections were of two kinds: the short variants miss the par band
(observed max par 13–23, below floors 19–34) and the rare par-fitting
variants fail the timing gate ("a fair window exists but no route can
reach it" — the band widens ~0.37 s per line tile and these archetypes
cross the patrol line in long runs). Structural, not seed flukes: each
slot's deterministic candidate space is exhausted, and the same
archetypes die at different slots and different acts.

**The rule (probed at one slot per act, 2026-11-09):** the four
long-route archetypes cap at par ~23 on both W16 and W18 maps, so no
par band with a floor ≥ 19 can use them — AND their par-fitting
crossings are band-infeasible. Act 3 (L54/55, floor 19): switchback,
staircase, long-drop dead. Act 4 (L61, floor 22): all four dead.
Act 5 (L81, floor 24): switchback, canyon, long-drop dead (max
observed par 23 — par-fitting variants don't exist). Acts 6–10
(L101/121/141/161/181): every OTHER archetype in those pools proves
within 60 attempts.

**Decision:** acts 3–9 drop the long-route archetypes from their pools
— act 3: −switchback/−staircase/−long-drop, +crossroads (its short
2-tile-crossing geometry fits the band and the par band, par 22–25);
act 4: −all four; act 5: −switchback/−canyon/−long-drop; act 6:
−switchback/−long-drop/−canyon; acts 7–9: −switchback. The archetypes
stay in the library for acts 1–2 (floors ≤ 16, where their short
variants fit — campaign 14–50 re-proved clean under the band the same
day).

**Consequence:** acts 3–9 are re-proven (slots shift archetype because
the pool's modulo base moves); all 200 levels remain proven by the
full verifier under the band model. Curation is visible: the per-act
archetype mix changes; the level count, order and names are untouched.
The generator gains three inert, env-gated diagnostic knobs for slot
forensics: `KUBIK_FORCE_ARCH=<id>=<archetype>` (pin one slot's
archetype), `KUBIK_PROBE=1` (log the first rejections per attempt) and
`KUBIK_MAX_ATTEMPTS=n` (attempt budget override).
