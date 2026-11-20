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
19. **Experience diversity is a gate, not a hope.** The local curation
    score ranked proven candidates inside one slot, but nothing audited
    the *sequence* the player experiences. `scripts/experience.mjs`
    fingerprints each level by mechanic set, sentinel count/speed band,
    crumble load, par band, travel direction and map scale, and the
    verifier now fails the catalogue on: three consecutive identical
    fingerprints; six consecutive levels with one mechanic signature;
    an act with fewer than five signatures or one signature above 60%;
    a missing act-identity mechanic (`gen.force`, or a key act below
    40% keyed levels); and an intra-act par jump over 16 (boss spikes
    and act boundaries exempt). The shipped catalogue passes unchanged
    (audit measured first: worst signature run 5, worst intra-act jump
    15, every act ≥ 6 signatures). `gen-campaign2` consults the same
    sequence law while selecting candidates, seeded from the levels
    before the run, so future regenerations avoid local repetition by
    construction; a slot that can only settle repetitively logs a
    `diversity exhausted` warning beside the uniqueness one.

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

## ADR-020 — Conveyors enter as a resolved-press law, one proven slot at a time (2026-11-14)
**Context:** M3 wave-1's first new mechanic. The standing doctrine is
that a mechanic is not a special case in the game loop — it is part of
the one law, `resolveRoll` (one press → landing after follow-through),
consumed identically by the solver, the fairness model, the rescue
bench and the live bot. Ice and springs already work this way.

**Decision:** a conveyor is follow-through: rolling onto a belt tile
carries the cube one tile in the belt's own direction, chaining along
consecutive belt tiles; the belt direction becomes the travel
direction for the next follow-through (ice after a belt slides the
belt's way, a pad fires the belt's way); a blocked belt step leaves the
cube resting on the belt tile. `resolveRoll` is restructured into a
single follow-through loop (spring → ice → belt hand-overs), which
also closes a latent L68-class hole: a spring launch landing on a
second pad used to REST on it in the model while the game auto-fires
every landing — the loop now fires pads in chains exactly like
`autoContinue`. Belts are parse-validated (unit axis; never on
start/goal/ice/springs/docks; cycles rejected), sentinel-clearance is
audited along the whole carried path (`spawnProblems`), belts are
excluded from the rescue bench's safe-rest assumption, and the
mechanic signature/fingerprint learns `C` (`scripts/experience.mjs`).

**Introduction law:** new mechanics enter the shipped campaign ONE
proven slot at a time, not by campaign-wide regeneration (a global
re-roll re-opens every proven slot to new randomness for zero player
benefit). The generator gains the env-gated knob
`KUBIK_FORCE_MECH=<id>=<mechanic>` (sibling of `KUBIK_FORCE_ARCH`;
inert by default): L175 "Strainpoint" (The Pressure, act 9) is
regenerated with a forced 2-tile belt and re-proven through the full
gate. Organic carve budgets stay armed for future regenerations
(campaign-14–50 shuttle bands 0.35–0.5; acts 9–10 `gen.mech.conveyor`
0.5/0.6).

**Gate:** unit 73/73 (7 new conveyor tests); verifier 200 + 14
dailies green incl. the experience-diversity audit; FULL live run
201/201 playable (5538 s), page errors none, L175 completed by the
bot in 48 moves against par 40.

## ADR-021 — Pressure plate + door is a directed edge, not a state machine (2026-11-14)
**Context:** M3 wave-1's second mechanic. A naive plate+door is a state
machine (door open/closed over time, blocks holding plates), which
would fork the one-law model: every solver would need door state in
its search nodes, and block-on-plate state on top of the telekinesis
search. The catalogue's proofs stay cheap precisely because a press's
legality depends only on where the press starts.

**Decision:** a door tile sits in a void cell (parser-solidified at its
plate's height, like a shuttle dock) and is a wall to every press
except one that STARTS on its plate: step onto the plate, the doorway
opens; step through; it closes behind you. The law lives in
`checkRoll` — the single from→to predicate — so `resolveRoll`, the
reachability searches, the crossing graph (its synthetic-tile `rollOk`
re-checks it), the game, and the live bot all inherit the identical
rule. The cube's weight alone presses a plate: `canPushBlock` refuses
plate and doorway tiles, so blocks never hold a door and no search
state grows. Interactions follow the same press law: an ice slide
stops dead at a closed door, a spring launch flies OVER a doorway
(never lands on it), wind cannot drift the cube through one, and the
mid-path bench never sits on a doorway. Plate and doorway are both
tiles the cube may WAIT on, so sentinel fairness stays the ordinary
timing model — no corridor audit (unlike the forced ice/spring/belt
paths). Validation: doorway must be void in the map and beside its
plate; the plate is a plain slab — never start/goal/key/crumble or
another mechanic; one door per plate.

**Introduction:** same law as ADR-020 — one proven slot via
`KUBIK_FORCE_MECH=152=door` (L152 "Iron Seal", Darkwater: plate
[4,3] → doorway [4,4]); organic budgets armed for future regeneration
(campaign bands 0.3–0.4; acts 8–10 `gen.mech.door` 0.4/0.45/0.5).
Curation signature learns `D`.

**Gate:** unit 80/80 (7 new door tests); verifier 200 + 14 dailies
green incl. the experience-diversity audit; live L152 completed by
the bot in 38 moves against par 39, page errors none (the stratified
hook re-runs its rotating window at commit).

## ADR-022 — Delayed crumble is a slow fuse, proven as break-on-leave (2026-11-14)
**Context:** M3 wave-1's third mechanic. Recon found the plain crumble
is already a fast fuse in real play: `breakAt` fires on LANDING and
the slab falls 0.75 s later whether or not the cube has left (the
docs' "breaks on leave" was the model, not the game). So a "delayed
crumble" earns its place as the slow sibling, not a new timer system.

**Decision:** a `timed` slab falls `TIMED_FUSE` = 2.4 s (≈10 presses)
after the cube's FIRST landing — re-landing never resets the fuse —
cracking in visible stages (darkening plate, tremble, hot glow in the
last stretch) before it drops, using the crumble's falling-slab
machinery. The proof model does NOT take the duration on trust:
`solveHazards` treats a timed slab exactly like a crumble (gone once
you step off it), so every proven route survives even if the player
never uses the grace; standing a beat or recrossing inside the window
is pure player margin. That keeps the model on the safe side of the
game (ADR-016 doctrine) with zero new search state. A timed slab must
never be a tile the player may need to WAIT on — the spawn audit
forbids it within sentinel clearance (crossing entries/refuges hug
the line), beside a shuttle dock, or beside a sliding bridge — and
the generator's carve keeps the same Chebyshev-1 distance from all
other mechanic space. Parse law: plain slab only — never stacked,
never start/goal/key; blocks never rest on one; the rescue bench
never sits on one.

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=112=timed` (L112 "The Ice Room", Glasswork: a
2-tile timed run alongside ice, a shuttle and the key). Organic
budgets armed (ice bands 0.35–0.5; acts 5–10 `gen.mech.timed`
0.35–0.55). Curation signature learns `T`.

**Gate:** unit 85/85 (5 new timed tests, incl. timed≡crumble model
equivalence and the waiting-spot audits); verifier 200 + 14 dailies
green incl. the diversity audit; live L112 completed by the bot in
37 moves under real fuse timers, page errors none (the pre-commit
hook re-runs its gate incl. the rotating live window).

## ADR-023 — Sentinel-freeze shard: a consumable freeze, proven in presses (2026-11-14)
**Context:** M3 wave-1's fourth mechanic, and the catalogue's first
consumable: a pickup that stops every sentinel's clock. It is also
the first mechanic whose fairness proof must reason about the orb
clocks themselves — until now a crossing was fair only if a natural
safe window existed (`TIMING_FLOOR`), and sealed crossings made a
level unprovable no matter what tools the level offered.

**Decision:** grabbing a freeze shard sets `FREEZE_TIME` = 3.2 s of
freeze: the view stops advancing every patrol's `dist`, the eyes and
glows go arctic, and `checkOrbs` cannot kill. The proof never trusts
those seconds. Fairness is counted in PRESSES: inside
`buildCrossingGraph`, crossings the natural window rejects are kept
as candidates, and a fixpoint promotes one to a `freeze: true` edge
when a shard is reachable through already-proven-fair crossings and
pickup → entry plus the crossing burst (line tiles + exit) fits
`FREEZE_PRESS_BUDGET` = 8 presses — ≈2.8 s at a hurried cadence
against the 0.243 s roll floor, inside the 3.2 s the game grants.
Each promoted crossing can make further shards reachable, so chained
freezes prove in sequence; a shard stranded beyond the crossing it
would open proves nothing. Press distances run on plain
`resolveRoll` in the "frozen world" (patrol-line tiles walkable,
shuttle rides excluded — a ride burns real seconds, not presses).
Parse law: a shard sits on a plain slab only — never stacked on
shuttle/ice/spring/conveyor/crumble/timed/plate/door, never
start/goal/block/shard/key. The live bot plans in (tile, charge)
state — charge spent per press, refreshed at a pickup — and may
commit a freeze crossing only while the real freeze outlasts the
burst. Death and the rescue bench both clear the freeze and restore
every shard.

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=127=freeze` (L127 "The Drift", Slow Current: a
ring with a shuttle, two sentinels, and the shard at [13,8] before
the guarded run). The generator only places shards on levels that
field sentinels, preferring route tiles a few presses before a
guarded run. Organic budgets armed (shuttle bands 0.3–0.4; acts
6–10 `gen.mech.freeze` 0.35–0.5). Curation signature learns `F`.

**Gate:** unit 89/89 (4 new freeze tests: parse law, the exact
budget boundary — 8 presses fair, 9 sealed — and the stranded-shard
rejection); verifier 200 + 14 dailies green incl. the diversity
audit; live L127 completed by the bot in 39 moves, page errors none
(the pre-commit hook re-runs its gate incl. the rotating live
window).

## ADR-024 — Heavy block: never uphill (2026-11-15)
**Context:** M3 wave-1's fifth mechanic. Obstacle blocks have existed
since the hand levels (L4/L7) but never entered the generated
campaign, and the catalogue's height law (climb 1 / drop 2) had no
counterpart for pushed objects — a block could be shoved onto a tile
any height above its own, which reads wrong and wastes the terrain.

**Decision:** a `heavy` block is an obstacle block with one extra
law in `canPushBlock`: its destination tile must sit at or below its
current tile — level or downhill, never uphill. Everything else is
the block law it inherits (plain slabs only, never
goal/key/crumble/slider/plate/doorway/timed, 1 nudge per tile).
Heaviness is part of the block's identity, not the tile's:
`canPushBlock` now takes the block object plus the live occupied
set, `solveHazards` carries the flag through its state signature,
and the game and view track it per block (denser banded iron, a
slower grinding push). That also retires a latent unsoundness: push
occupancy is now checked against where blocks ARE, not where they
started. A downhill shove is a one-way commitment — the block can
never be shoved back up — which is the puzzle the mechanic sells.
Parse law: slab only, never start/goal, never stacked on a normal
block.

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=144=heavy` (L144 "Keyhole", Darkwater: a gauntlet
with a shuttle, ice and the gate key; the heavy block waits at
[14,7] with 3 nudges). The generator places a heavy block astride
the route only when the natural push-forward (the next route tile)
is level or downhill, clear of the patrol line and all mechanic
space; `solveHazards` proves the level inside the granted budget.
Organic budgets armed (shuttle bands 0.25–0.35; acts 6–10
`gen.mech.heavy` 0.3–0.45). Curation signature learns `H`.

**Gate:** unit 92/92 (3 new heavy tests: parse law, the
uphill-refusal against a light-block control, and the solveHazards
corridor that a heavy block seals but a light one opens); verifier
200 + 14 dailies green incl. the diversity audit; live L144
completed by the bot in 44 moves, page errors none (the pre-commit
hook re-runs its full gate).

## ADR-025 — One time base for every hazard (2026-11-15)
**Context:** the heavy-block gate run failed exactly one level —
L13 "Boss: The Broken Keep" — with repeated `slider` deaths on its
bridge triplets, in a sandbox rendering at ~1 fps. Forensics found
two clocks: cube rolls and sentinel patrols advance on the clamped
frame dt (`Math.min(raw, 0.05)`), but the view's hazard clock
(`clock.t`, driving sliding bridges and shuttle phases) was set
from the raw wall-clock elapsed. At 60 fps the two agree; on any
struggling device the cube slows down while bridges keep cycling
at wall speed — a mixed-time world no proof model (or player) can
beat. The verifier and the live bot both assume one time base.

**Decision:** the hazard clock accumulates the same clamped dt as
everything else (`clock.t += dt`), and the bridges' visual dip
reads that same phase — identical behaviour at ≥20 fps, consistent
slow-motion below it. The live bot also stopped paying settle-wait
round-trips inside a crossing burst (the exit press now queues
behind the running roll via `game.input`), requires a fresh bridge
rise before committing a burst that steps on bridges, and launches
Chromium with background-throttling disabled.

**Gate:** L13 passes deterministically (repeated 3/3 focused runs
with L144); the pre-commit hook re-runs its full gate.

## ADR-026 — Pulsing gap: cross on the blink (2026-11-16)
**Context:** M3 wave-1's sixth mechanic. The floor already has two
timing surfaces — crumble/timed slabs that die after you land, and
sliding bridges that dip on a cycle — so a pulsing gap has to earn
its place as a different decision, not a third timer. The gap is a
hole in the floor: most of the time it is simply VOID, and a
phantom slab seals it briefly on a fixed sweep. You wait beside
it, never on it; the rhythm is read from the diagonal pulse wave,
not from standing on the tile.

**Decision:** `pulse: [[x,z]]` names VOID cells; the parser raises
a phantom tile at the lowest neighbouring bank. The seal holds
for `PULSE_ON` = 40% of `PULSE_PERIOD` = 4.0 s, with phase offset
(x+z)/4 of a cycle so seals sweep diagonally (`pulsePhase`). The
proof model treats a pulse tile exactly like a sliding bridge —
always solid in `solveHazards`, reachability, and the crossing
graph: a timing hazard you wait out beside, which the ADR-025
single hazard clock now guarantees the game agrees with. What
keeps that honest is the waiting-spot law, shared with the timed
slab: a pulsing gap may never sit inside sentinel clearance, beside
a shuttle dock, or beside a sliding bridge (spawn audit), never on
the rescue bench, and blocks can never be pushed onto it. The live
bot treats pulse tiles as phase tiles alongside bridges in every
wait and commit gate, and never waits standing on one.

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=169=pulse` (L169 "Compression", The Pressure: an
aperture with the gate key, a freeze shard, and the gap at
[13,16]). The generator hollows one plain route tile per carve —
both route neighbours stay solid, never two gaps adjacent.
Organic budgets armed (shuttle bands 0.25–0.35; acts 6–10
`gen.mech.pulse` 0.3–0.45). Curation signature learns `U`.

**Gate:** unit 96/96 (4 new pulse tests: parse law and bank
height, the phase sweep, block refusal + solid-in-model, and the
clearance audit); verifier 200 + 14 dailies green incl. the
diversity audit; live L169 completed by the bot in 47 moves, page
errors none (the pre-commit hook re-runs its full gate).

## ADR-027 — Proximity sentinel: it sleeps until you are close (2026-11-16)
**Context:** M3 wave-1's seventh mechanic. Every sentinel so far
patrols from the first frame, so a level's far corner is already
dangerous before the player can see it. A proximity sentinel
inverts that: it is furniture until the cube closes in, which
lets a level stage its threat — quiet approach, then a live
patrol exactly where the fight is.

**Decision:** an orb def may carry `wake: R` (tiles, ≥ 1). The
view parks it at its path start with dark eyes and no glow; it
does not advance, and `checkOrbs` skips it (no kill radius) until
the cube comes within R tiles, after which it patrols normally
for the rest of the attempt; `resetOrbs` re-sleeps it. The proof
model deliberately ignores dormancy — `timingProblems`, the
crossing graph, and every solver treat it as always awake, so
sleep can only ever help the player and no proof needs a wake
state. The live bot mirrors that conservatism: a sleeping
sentinel on the crossed line is predicted to advance for the
whole burst once the path enters its wake radius, and only a
burst that stays entirely outside the radius treats it as a
statue. Eyes are per-orb materials so one sentinel can sleep
while its partner patrols.

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=187=proximity` (L187 "The Last Push", The End:
the [15,12]→[15,2] patrol wakes at 3 tiles). The generator
converts one placed patrol per carve at `wake: 3`; the conversion
roll and choice come from a content hash, never the shared rand
stream — arming a mechanic must not reshuffle the candidate
streams of shipped slots (a shifted stream starved L103 of any
passing candidate). Organic budgets armed (shuttle bands
0.25–0.35; acts 6–10 `gen.mech.proximity` 0.3–0.45). Curation
signature learns `X`.

**Gate:** unit 97/97 (proximity contract: wake validated, a
sealed crossing stays sealed with a sleeping sentinel, a fair
one stays fair); verifier 200 + 14 dailies green incl. the
diversity audit; live L187 completed by the bot in 56 moves,
page errors none (the pre-commit hook re-runs its full gate).

## ADR-028 — Twin-platform shuttle: the ferry comes twice as often (2026-11-16)
**Context:** M3 wave-1's eighth and final mechanic. A shuttle's
cycle is mostly waiting: dwell, drive, dwell, drive back — a
player who just misses a departure waits out nearly a full loop.
A second platform on the same loop, half a cycle out of phase,
halves that wait without touching the route, the docks, or the
proof.

**Decision:** a shuttle def may carry `twin: true`. The parser
keeps ONE logical shuttle (dock tiles + the explicit
`shuttleRide` edge), so `solveHazards`, the timing audits, and
every solver are literally unchanged — a twin can only add
boarding windows, never remove one. The view spawns a second
platform mesh at `cycle / 2` offset; `shuttleDocked` answers for
either platform. The carry is where the twin can bite: the old
spatial grab ("the cube rides whichever platform is within 0.9
tiles") switches rides when the twins pass each other mid-route —
both platforms are inside the grab box at the meeting point, and
one flipped frame carries the cube back the way it came (caught
by the live gate on the first twin level: the bot timed out at
the dock while the cube ping-ponged). The carry now LOCKS onto
the boarded platform (`rideRef`, cleared by any roll, settle,
respawn, or rescue) and ignores the other platform until the
ride ends. The live bot asks `shuttleDocked` for the far dock
instead of watching shuttle #0's platform — true for twins and
for rides on any shuttle.

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=193=twin` (L193 "The Final Angle", The End:
`twin-falls` archetype, the [2,11]→[2,8] ferry runs twin, with
conveyor/freeze/heavy/pulse/proximity company — signature
SCFHUXW). The generator converts one carved shuttle per carve at
the content-hash roll (never the shared rand stream, ADR-027);
organic budgets armed (shuttle bands 0.25–0.35; acts 6–10
`gen.mech.twin` 0.3–0.45). Curation signature learns `W`.

**Gate:** unit 98/98 (twin parses as one logical shuttle; par,
spawn audit, and timing audit byte-identical to the single);
verifier 200 + 14 dailies green incl. the diversity audit; live
L193 completed by the bot in 41 moves after the carry lock
(regression: L109/L121/L196 shuttle levels re-proven same run),
page errors none (the pre-commit hook re-runs its full gate).

## ADR-029 — Boss arenas: the key grab starts phase 2 (2026-11-16)
**Context:** M3's final item — bosses as set pieces. Act-end
levels (every 20th) already get the boss-arena budget (18×18,
ceiling sentinels, a sealed finale at 200), but mechanically
they were just big levels. A boss needs a *turn*: a moment the
arena changes character mid-fight. Any dynamic boss AI would
break the static, provable level contract (ADR-004), so the
turn is a phase trigger on data the proofs already track — the
gate key.

**Decision:** a keyed level may carry `boss: { speed }`
(1 < speed ≤ 2, default 1.35). Grabbing the key starts phase 2:
orbs marked `wave: 2` — parked dark-eyed at their patrol starts
until then, reusing the proximity sentinel's sleeping body —
wake, and every patrol's speed multiplies by `boss.speed`
(view clock; the bot reads the live multiplier for its crossing
predictions). The fairness model is phase-blind by design:
`crossingWindow` runs every patrol at boss speed with wave-2
sentinels awake, so the proven model is at least as hard as
either real phase and both are covered by the one static proof
— no solver state grows a phase bit. Two guards keep the turn
honest: a wave-2 sentinel's spawn (patrol start) must sit ≥ 2
tiles from the key, since the cube is standing on the key at
the trigger (spawn audit); and a sentinel may not be both
proximity (`wake`) and boss (`wave`) woken. Death restarts the
arena at phase 1; a rescue keeps the key but still gets
resetOrbs' clean timing slate (wave-2 sleeps again — the slate
was always player-kind).

**Introduction:** one proven slot (ADR-020 law) —
`KUBIK_FORCE_MECH=200=boss` (L200 "Apex: The Broken Spire":
the [5,3]→[16,3] patrol sleeps until the key, then the arena
runs 1.35×). Generator: act-end budgets roll `boss` at 0.65
(content-hash conversion, never the rand stream; 1–2 wave-2
conversions, proximity sentinels ineligible); signature `B`.

**Rollout (2026-11-17):** the remaining keyed act-end finales
took the same conversion — L120 "The Last Thaw", L140 "High
Crossing", L160 "The Sealed Deep" (two wave-2 sentinels plus a
proximity patrol that is never both), L180 "Maximum Pressure"
— all at `boss.speed` 1.35, names preserved, verifier green,
focused live 56 / 48 / 57 / 60 moves. The first focused gate
failed L160/L180 "key unreachable": the live bot's crossing
model carried `wake` but not `wave`, so it predicted parked
wave-2 statues as live patrols and no window ever satisfied
it. The bot is now wave-aware — a sleeping wave-2 sentinel is
a statue in its model, exactly as `checkOrbs` rules it; the
verifier's phase-blind proof never changed. The same pass
gave bosses their player-facing identity: BOSS/FINALE tags
and act-end card styling in level select, a boss briefing
hint at level start, a `BOSS ASLEEP → BOSS AWAKE` HUD chip,
and a violet ember glow on sleeping wave-2 sentinels that
catches red when the arena wakes.
The slot hunt exposed a latent generator flaw: the
end-of-attempts settle sat after `if (!rep.ok) continue`, so it
only ever ran on attempts whose own candidate also passed — a
slot with a single proven candidate in its whole budget (Apex
under force: 1 in 450, at attempt 91) could never settle and
always reported "no candidate passed". The settle now also
runs as a true post-loop fallback; in-loop behaviour for every
other slot is unchanged.

**Gate:** unit 99/99 (boss validation: key required, wave
law, speed band; a sealed crossing stays sealed with the
sealer asleep at wave 2); verifier 200 + 14 dailies green
incl. the diversity audit; live L200 completed by the bot in
61 moves, page errors none (the pre-commit hook re-runs its
full gate). M3 is complete: eight wave-1 mechanics plus boss
arenas.

## ADR-030 — Structure archetypes: places, not tracks (2026-11-17)
**Context:** the production-design research audit
(`research_production_game_design.md`) measured what players
see: generated levels fill ≈ 0.19 of their board (1-wide
serpentine tracks in void), the board caps at 18×18 from
Act 5, tile mass *falls* after Act 6, and the longest proven
route in the game is 44 rolls. Production references grow the
other way — boards and route *depth* grow act over act while
the opening stays readable (the arrow-puzzle data: boards
~3× first→last, layers 27→57, opening breadth flat), and
EDGE's levels are filled multi-storey structures. The fix is
topological, not cosmetic: the archetype library learns
architecture.

**Decision:** three structure archetypes join the library.
`plaza` — a filled court (fill ≈ 0.6) crossed on chosen lines
while patrols sweep its lanes. `tower` — a terraced massif
(rings 1→2→3) split by one-wide void moats: a roll lands one
tile, so the moat makes each ring's stair the only way up,
and the stairs sit at opposite corners so every ring is
really walked (the first tower draft stacked both stairs at
one corner and played in 11 rolls — caught by the par gate
in smoke tests, before it ever reached a slot). `citadel` —
a court before a tower keep, moat between, the finale-class
composite. Structure slots keep every existing law: the
hazard stage dresses the route, the verifier proves, par
bands gate. Escalation is budgeted, not hoped for: Acts 8–10
generate at W20 (was 18) with par bands grown to [32,50],
[36,58], [40,66], and the act-end board becomes
`max(18, W+2)` — a finale is the biggest room of its act.
Rollout follows the ADR-020 law by hand: forced slots only
(`KUBIK_FORCE_ARCH`), names preserved, batches live-tested;
act pools admit the new archetypes for future natural picks.
**Introduction:** nine spliced slots — plaza L88/L113/L128,
tower L148/L168/L188, citadel L155/L177/L196.

## ADR-031 — Density floors and teach–test–twist arcs (2026-11-17)
**Context:** the research audit (§4.3) found debuts instead of
design: M3 mechanics shipped at densities where an arc is
impossible (doors 2, pulse 3, twin 3, conveyor 6, timed 6,
proximity 7, heavy 8, freeze 11). A mechanic seen twice is a
gimmick; seen a dozen times in growing contexts it becomes
vocabulary. Phase C raises floors without new systems — the
generator learns scheduling.
**Decision:** (1) Every generator-placeable mechanic targets
≥12 appearances. (2) New appearances are scheduled as arcs in
level order: teach (earliest, solo force), test (mid-campaign,
in act context), twist (late, paired force — `KUBIK_FORCE_MECH`
now accepts `a+b` lists). (3) A density ratchet
(`tests/unit/density.test.mjs`) records shipped counts per
mechanic and fails the build if any drops below — floors rise
only in the commit that raises the count, so a splice can
never silently strip a mechanic. (4) Rollout follows the
forced-slot law: one slot at a time, names preserved, diff
against the pre-batch file proves only the scheduled slots
changed. Batch 1 (22 slots incl. a par-cliff repair at L156): door 2→8 (teach L92 … twist
L172), pulse 3→14, twin 3→10, conveyor 6→11, timed 6→14
(incidental co-carves included). (5) Two `ring` slots (185,
195) starved under their forced mechanics — ring geometry
cannot admit a door/twin carve, so the archetype was
re-forced (gauntlet/meridian) under the same mechanic force;
the mechanic schedule, not the tile layout, is the contract.
**Not in this batch:** sliders/wind/light blocks (hand-authored
campaign-1 mechanics; the generator has no carve for them yet),
the ≤55% density caps for crumble/sentinels (requires removal,
a separate decision), and sawtooth relief slots — batch 2.

## ADR-032 — Floors completed, light-block carve, sawtooth relief (2026-11-17)
**Context:** Phase C batch 2 (ADR-031 follow-up): door (8),
conveyor (11) and twin (10) sat below the ≥12 floor; light
blocks existed only in two hand-authored levels (L4/L7); and
the par curve had no designed breathing slots — density alone
makes a wall, not a staircase.
**Decision:** (1) Floors completed by forced slots (door →14,
conveyor →14, twin →15; every generator-placeable mechanic now
≥12, and the density ratchet records the shipped counts —
pulse 18, timed 17, freeze 18, heavy 17, proximity 21).
(2) The generator learns light blocks: a `blocks` carve
in the hazard stage mirrors the heavy placement law without
the climb restriction (a light block pushes uphill), nudge
budget 3 per block in play, solver-proven; Acts 6–10 carry
blocks probabilities; count 2→10. First arc: teach L58,
test L77/L115, twist L171. (The mirror law gained `def.blocks`
in the same batch: the first L58 candidate shipped its block at
the unmirrored coordinate — in the void after the act's z-flip.
Every def field that carries coordinates must mirror; the
heavy list already did.) (3) Sawtooth relief is law, not luck: a relief
slot settles on its shortest proven candidate
(`KUBIK_RELIEF=<id>`, ranked −par), and the experience audit
fails any generated act with 6+ consecutive levels above the
relief line (bottom third of the act's par band). A relief
re-cut strips a slot's scheduled mechanic like any re-cut, so
relief landed where it cost nothing: L94 + L97 (Act 5; L92's
stripped door was restored by re-forcing, at natural par),
L136 (Act 7; L135's stripped conveyor likewise restored, its
relief ceded to L136), and an Act 8 cascade — L147 relief
(par 33) exposed an 18-point cliff to the Phase A tower slot
L148 (par 50), repaired in the neighbourhood rather than by
weakening either audit: L148 re-cut to 39, relief at L149
and L151 (32), L146 took a forced twin test slot (49; the
49→33 step is exactly the intra-act cliff limit), L152 relief
at 37. The cliff and relief audits both stand as written.
**Not yet:** wind and sliders remain hand-authored-only —
neither has a generator carve, and wind has no static proof
model at all (the verifier cannot yet prove a drift level);
they get carve + proof work or stay rare, decided with
Phase B. The ≤55% caps for crumble/sentinels still await a
removal decision.

## ADR-033 — Lift platforms: the shuttle turned vertical (2026-11-17)
**Context:** Phase B opens with the verb the Phase A structures were
built for (research §5, gap G5): towers and citadels are stacks of
one-storey bands crossed by stamped stairs, and the route language
had no way to *change storeys* as a timed, readable event. EDGE's
answer is the moving platform; KUBIK's shuttles already move the
cube horizontally between docks — the missing axis was height.
**Decision:** A lift is a shuttle turned vertical: `lifts:
[{at, low, high, wait}]` — one dock cell (void in the map) whose
platform dwells at `low`, rides to `high` (0.8 s per storey, the
shuttle's per-tile rate), dwells, and returns. Board at the low
bank, ride, step off high — or the reverse. (1) *Proof law:* the
parser solidifies the dock at `low`; `checkRoll` prices any step
against EITHER dwell — a proof may ask the cube to wait for the
platform (on the bank or riding it), never to climb — the same
abstraction a shuttle dock has always had, so every search
(shortest route, soft-lock, hazard solver, fair-reach) inherits
lift crossings from the one predicate. The live game never prices
a lift-flagged tile: `isSolid` hands the roll law the platform's
actual dwell height (from the view clock) and the cube's `h`
tracks the platform while it rides, so real presses are priced
against the height truly shown. (2) *Parse law:* rise 2–4
storeys; each dwell needs a serving bank (roll law, priced at that
dwell); the shaft must join two height worlds (some bank serving
exactly one dwell — a decorative shaft is rejected); no platform
dock touches another (the dock-to-dock law); no wind. Ice,
springs, conveyors, plates, keys, timed and freeze never stack on
the dock, and the spawn audit adds: no sentinel patrols the dock,
no slide/belt/launch tile feeds the shaft — a lift is only ever
entered by a deliberate press. Blocks never park on the platform
(`canPushBlock`). (3) *Generator:* a content-hash conversion in
the hazard stage (never the shared rand stream) hollows either
the middle tile of a two-storey stair run on the route (dwells =
the two path heights; the ride replaces the stair — the teach
geometry) or a void/clearable band cell whose neighbours span
two storeys, the high dwell overshooting the tallest bank by at
most one storey (how a lift crosses the one-storey moats in the
concentric tower/citadel rings). Acts 7–10 carry `lift`
probabilities; `KUBIK_FORCE_MECH=lift` plus a generator rule — a
forced lift must be *ridden by the proven route* — ships the
first slots: teach L131 "The Wait" (Act 7 ring, 1→3, par 33) and
test L173 "Over the Edge" (Act 9 tower, 2→4 over the core,
par 43), names preserved. The live bot prices lift steps with the
same two-dwell mirror and waits for the serving dwell before
boarding or stepping off (commit bursts hand lift steps back to
the main loop, like dock boardings). `mirrorDef` mirrors
`lifts[].at`; the experience fingerprint learns 'V'; the density
ratchet tracks lifts at their shipped count (2).
**Not yet:** lift *density* (a teach→test→twist arc at 12+, the
Phase C treatment) waits for a later cadence pass; twin lifts and
mid-shaft exits to a third bank are deliberately unmodelled; the
next Phase B verb is the shrink pad (mini-cube).

## ADR-034 — Shrink pads: size is one more bit of cube state (2026-11-18)
**Context:** Phase B item 2 (research §5, gap G4/G5). Lifts (ADR-033)
gave towers a vertical verb; the horizontal structures still had no
way to *gate by body* — EDGE's resizer pads make the same corridor
two different levels depending on the cube's size, and KUBIK's flat
route graph had no state to express that.
**Decision:** `shrink: [[x,z]]` / `grow: [[x,z]]` pads and
`low: [[x,z]]` tunnel tiles (plus `startMini: true`). Landing on a
pad flips the cube's size — permanently, re-fireable on every
landing, never a pickup — and a `low` tile is a tunnel mouth only
the mini cube (0.55 scale) may stand on. (1) *One-law resolver:*
`checkRoll(level, from, to, mini)` refuses a full-size roll into a
low tile ('blocked', a bump), and `resolveRollAt(level, from, d,
mini)` threads the size through ice/belt/spring follow-through,
re-reading it after every landing (`sizeAfter`); a full-size spring
launch flies over the tunnel mouth like it flies a doorway.
`resolveRoll` keeps the full-size law, so every shipped level
prices identically. (2) *Size is search state:* on `hasSize`
levels, reachable / canStillFinish / shortest route+path /
solveHazards / fairReachSet all carry (tile, size) states seeded
from `startMini`, and key legs hand their arrival size to the goal
leg (`fairReachStates` returns arrival sizes; timingProblems
composes the join). Pad tiles prune phantom states (a shrink pad
is only ever stood on mini, a grow pad only ever full) so growing
inside a low room is caught as the size soft-lock it is. The
rescue bench never lands on a low tile or a pad (the rescue
re-places the cube at full size), and sentinel kills stay
size-blind x/z geometry exactly as proven (the game compensates
the mini mesh's floor-glue drop out of the kill height). (3)
*Parse law:* pads stack on no other mechanic, never on
start/goal/key/block/shard; low tiles are plain slabs only (a
shard may end a tunnel niche, a block may never enter); pads and
tunnels must co-occur (a shrink pad with nowhere to spend it, or a
tunnel with no way to shrink, is rejected like a decorative
lift); blocks never enter a tunnel or park on a pad
(`canPushBlock`); no patrol line runs over a low tile or a pad
(spawn audit — crossing bursts are size-blind geometry). (4)
*Generator:* a content-hash carve in the hazard stage turns a
straight, flat five-tile route run into pad → low → low → exit →
grow and claims the segment in carved+mechSet; Acts 7–10 carry
`shrink` probabilities; a forced shrink must be *ducked through*
by the proven route. First slots, names preserved: teach L126
"Tidegate" (Act 7 plaza, par 28), test L161 "Full Tide" (Act 9
tower, with a lift, par 50) and twist L193 "The Final Angle" (Act
10 citadel — shrink + lift + key + freeze + proximity, par 48;
re-rolled with the freeze+proximity it replaced forced back in,
so no Phase C ratchet floor moved). `mirrorDef` mirrors
shrink/grow/low; the experience fingerprint learns 'M'; the
density ratchet tracks shrink at 3. The live bot carries the
size bit in its planner state (seeded from the real cube) and
prices presses with resolveRollAt.
**Not yet:** the shrink density arc (12+ teach→test→twist, the
Phase C treatment) is deferred like the lift arc; low-ceiling
*height* play (a mini cube under a high bank) is unmodelled — a
low tile is a flat gate, not a clearance volume; the next Phase B
verb is the piston pusher.

## ADR-035: Piston pushers — the timed wall that shoves (Phase B, item 3)

**Decision.** `pistons: [{ at: [x, z], dx, dz, period?, phase? }]` (period
defaults to 3.2 s, phase to 0). A piston is machinery on a base slab:
its arm sweeps the neighbouring *strike cell* (`at + (dx,dz)`) for the
tail of every cycle (`PISTON_EXTENDED_FROM = 0.55` onward, shared
`pistonExtended` in rules.js), and the crossing is a timing beat:
retracted for the first 55% of the cycle — cross then.

*One law, priced like the sliding bridges.* The strike cell is plain
floor in **every** proof — `checkRoll`/`resolveRollAt` price it as the
slab it is, so shortest-route, soft-lock, hazard and fair-reach
solvers inherit piston crossings from the one predicate with zero new
machinery (the timed-slab/sliding-bridge doctrine: a wait-out timing
hazard is proven by the act of waiting beside it, never by modelling
phase in the search). The base is the only hard geometry: a wall to
every press (`checkRoll` blocked, any size) and to blocks
(`canPushBlock`), never a standpoint. *Live, the phase law prices
exactly two moments:* entry into the strike cell is refused (a bump)
while the arm is extended, and a cube resting on the strike cell when
the arm fires is **shoved**.

*Pistons displace; they never crush.* The shove is the wind-drift law
with a steel accent: legal exactly when the drift would be (solid
landing by the live `isSolid`, no door breach, no climb, no deep drop
— priced by `checkRoll` itself), and then it reuses the drift
animation, `finishDrift` landing (crumble/timed/pad effects included)
and the move log, so ghosts replay shoves faithfully. An illegal
shove **stalls** — the arm holds flat against the cube and nothing
happens. There is no placement a player can stand in that a piston
can kill from: being somewhere the arm wants to be is a displacement,
never a death. One drift force per level: wind and pistons never
co-occur (parser-enforced).

*Fairness fences* mirror the patience audit: the strike cell may never
be a tile a proof can make the player wait on — the spawn audit keeps
every patrol line off the base and strike cell, and keeps the strike
cell's whole neighbourhood clear of patrol lines, shuttle docks, lift
docks and sliding bridges (patience spots all). The rescue bench never
lands on a strike cell or a base. Parse law: footprints never overlap;
base and strike stack on no other mechanic, never on start/goal/key/
block/shard; period ∈ [1.6, 8], phase ∈ [0, 1).

*Generator:* a content-hash carve in the hazard stage finds a straight,
flat route corridor with a standing flank slab and a flat slab across —
housing on the flank, arm sweeping the route tile, the shove knocking
the cube onto the slab beyond — claims strike+base in carved+mechSet,
and never runs on a wind level. Acts 7–10 carry `piston`
probabilities; a forced piston must be *crossed* by the proven route.
First slots, names preserved: teach L137 "The Turnaround" (Act 7
shuttle-span, with a freeze shard as long-known support), test L169
"Compression" (Act 9 aperture, piston + timed + ice) and twist L187
"The Last Push" (Act 10 citadel — piston + pulse + timed + conveyor +
ice + spring + heavy). The re-cuts cost freeze (restored on the teach
slot) and proximity (restored by a repair re-cut of L183 "The
Breakline Crossed", the L156 pattern) — no Phase C ratchet floor
moved. `mirrorDef` mirrors pistons with the push reversed; the
fingerprint learns 'Y'; the ratchet tracks piston at 3. The live bot
needs no planner change (strike cells are plain floor to the fair
graph); its executor waits beside an imminent strike cell
(`pistonImminent`, margin 0.5 s) and treats a shove as a replan.
View: plinth + gauge on the base, a flat arm with a pusher pad, and
the amber telegraph the sliding bridges taught — the last fifth
before the sweep.

**Not yet:** the piston density arc (12+ teach→test→twist) is deferred
like the lift and shrink arcs; piston-pushed *blocks* (an arm that
shoves cargo) are unmodelled — blocks stall the arm where they park,
never ride it; turntable bridges are the next Phase B verb, the
hang-ledge last.

## ADR-036: Turntable bridges — the bridge that rewires (Phase B, item 4)

**Decision.** `turntables: [{ at: [x, z], period?, phase? }]` (period
defaults to 5.6 s, phase to 0). A rigid bar three tiles long turns on a
centre pivot over a cross of five void cells (the pulsing-gap phantom
idiom): the bar joins one pair of opposite banks for half of every
cycle, sweeps 90°, and joins the other pair — the route graph rewires
itself over time. The pivot is always floored: it is the mid-crossing
refuge where a player (and the bot) waits out the sweep.

*Slider-family proofs.* All five cross cells are plain floor in every
search — `checkRoll` prices them as slabs, so route, soft-lock,
hazard and fair-reach solvers inherit turntables with zero new
machinery; the wait-out doctrine says the timing is proven by waiting
beside the bar, never by modelling phase in the graph. The phase law
is shared (`turntablePhase`, `turntableAxis`, `turntableSolid`,
`turntableDwellLeft`) so view, game and bot read one clock. *Live:*
entry onto an arm the bar has not joined reads as a step into void
(`isSolid` gate), and standing on an arm when the bar sweeps away
drops the cube — the slider/pulse sunk-ground law, telegraphed by the
same amber warning the sliders taught, in the last beat of the dwell.
A legal-value refinement cost nothing: `turntableDwellLeft` lets the
bot require ≥0.9 s of dwell before stepping on, and the crossing then
re-checks step by step (bank → arm → pivot refuge → arm → bank).

*Parse law.* The cross cells must be void in the map and register
FIRST — before shuttles, lifts, doors and every other mechanic — so
docking/bank/boarding checks everywhere else price the bar as the
floor it is (a late registration left shuttle docks "boardless" over
cleared arms; the one-law resolver now literally sees the bar first).
The bar has one height, the lowest bank it touches (pulse rule), and
must reach at least two of its four beyond-banks (a full cross, a T,
or a corner junction — each dwell joins a different shore subset
through the pivot); an arm floating free of every bank, a one-shore
spike, stacking on any cross cell (start/goal/key/block/shard
included, audited after all parses), a block parked on the bar
(`canPushBlock`), wind sharing the level, period outside [3.2, 10] or
phase outside [0, 1) are all rejected. Spawn audits keep patrol lines
off every cross cell (a crossing burst cannot price the sweep) and
forbid conveyor feeds into the bar (a belt landing must be provably
solid); the rescue bench never lands on the cross.

*Generator:* a content-hash carve in the hazard stage — a straight
spine triple becomes pivot + route-side arms (cleared like shuttle
docks), and the perpendicular arms reach banks within one storey,
clearing one layer of non-route fill where the terrain offers no
void (the lift shaft's terrain surgery; a clear may never strand a
shuttle/lift dock's boarding slab). The junction must reach at least
three banks counting the route's own shores. Cross cells claim
carved + mechSet, and `mechSet` doubles as the carrier registry that
keeps the carve from clearing a tile an earlier mechanic's def still
points at. Finding the carve also exposed a latent hazard-stage bug:
the gate-key pick read a start-of-stage slab snapshot that carve
stages could have voided; it now filters on the current map. A forced
turntable must be crossed by the proven route. Acts 7–10 carry
`turntable` probabilities; `mirrorDef` mirrors the pivot (the bar is
axis-symmetric); the fingerprint learns 'R'; the ratchet tracks
turntable at 3. The bot's planner is untouched (cross cells are plain
floor); its executor waits for alignment + dwell, never waits on an
arm, and hands commit bursts back at the bar.

*First slots (names preserved):* teach L129 "The Crossing" (Act 7
shuttle-span), test L164 "The Crunch" (Act 9, tower re-forced — plaza
ran paradox-short beneath the act's par band), twist L189 "The
Unwinding" (Act 10 tower). No ratchet floor moved down (conveyor
15→14 is its floor; twin 18→17 above its floor). Page-level smokes:
a cube parked on the pivot survives repeated sweeps; a cube parked
on an arm is dropped by the sweep, cause 'turntable'.

**Not yet:** the turntable density arc (12+ teach→test→twist) is
deferred like the lift/shrink/piston arcs; a cube is never CARRIED
by the bar (rotation displaces nothing — stepping off before the
sweep is the player's job, as with sliders); plate-pressed rotation
(the research's alternative trigger) is unmodelled — cycles only.
The hang-ledge ("clinging") is the last Phase B verb.

### ADR-037 — Phase B item 5: clinging (the hang-ledge), the last verb

**Context.** Phase B's last research item (G4, the verb gap) was the
"expressive one": EDGE's signature hang lets a cube drop off a ledge,
catch a face and cross gaps no roll can span. The plan called it the
biggest resolver change of the phase and gated it behind a prototype.
KUBIK's roll law is the one predicate every consumer shares (`checkRoll`),
so a new edge kind had to enter *there* or be re-derived six times.

**Decision — declared grip crevices, one press, one landing.**
`clings: [[x,z]]` declares a crevice: ONE void cell between two plain
slabs. Pressing into it from either bank resolves to the far bank in a
single action (roll off → hang → mantle), and the reach is one storey
past the roll law each way — climb +2, drop −3, constants `CLING_UP`/
`CLING_DOWN`. Everything else about the law is unchanged, and the reach
is *only* at a declared crevice: elsewhere a press into void still falls.

**Why declared, not inferred.** An inferred hang (any void gap with a
reachable face) would silently rewrite 200 shipped levels — every
accidental crevice in the catalogue would become a shortcut, and every
par would move. Declaring the crevice keeps the mechanism local, makes
the geometry auditable at parse (banks in reach, both banks real map
structure, no mechanic/block/patrol on a grip face, never start/goal),
and makes the generator's job explicit. It also mirrors how the
turntable reuse worked in ADR-036: a new mechanic rides an existing
predicate rather than introducing a second resolver.

**Proof model.** The cling edge lives in `resolveRollAt`'s `step()`, the
single primitive every search expands, so `rollTargets`, `reachable`,
`canStillFinish`, `shortestRoute`/`shortestPath`, `solveHazards`, the
rescue bench and the fair-crossing graph all inherit it with no new
code paths — the same argument ADR-033 used for lifts. `mechanicTargets`
gains the cling moves so the fair-reach model (which expands adjacent
tiles one at a time) can cross a crevice too. The audit is strict about
one thing: **a cling may never be decoration** — `verify-levels.mjs`
and the generator both compare the proven par with the clings against
the par with them stripped and fail the level unless the declared grips
make the route shorter. That is the same "joins no two banks" spirit the
lift and turntable pars enforce, moved into the proof itself.

**Live law.** The game resolves a press into a declared crevice into a
`cling` animation (`startCling`): off the ledge, a hang beat pressed
against the far face, then a mantle onto it; the cube's logical tile
changes only at the end, so every rule keeps reading the takeoff tile
until the landing is real. A block parked on the far bank occupies the
handhold, so that press bumps instead of hanging. The view cuts a grip
into both banks' crevice-facing sides — a dark slot with three amber
rungs, static (the hang is the cube's, not the world's).

**Generator.** A content-hash carve (never the shared rand stream) that
converts only EXISTING void cells sitting at a fold of the proven walk:
both banks within the cling reach, at least one bank on (or within two
steps of) the walk, and the two banks at least four presses apart on
that walk's clock. Adding a crevice slightly deepens the route graph;
the generator then rejects the candidate unless the cling actually
shortens the proven par. Pivots mirror with the board (`mirrorPts`), the
fingerprint learns 'G', and the density ratchet tracks `cling` at 3.

**First slots (names preserved).** Teach **L176 "The Wall of It"**
(Act 9 citadel; one crevice at 6,6 cutting the switchback, par 41);
test **L186 "Loose Ends"** (Act 10 citadel, par 42); twist **L191 "The
Last Seam"** (Act 10 citadel, par 42). Each was landed through the full
gate on a forced slot; no ratchet floor moved down. Census after
landing: cling 0→3 (door 16, pulse 21→20, timed 23→22, conveyor 14→15,
freeze 19→21, blocks 12→14, heavy 20→22, turntable 3, lift 4,
shrink 3, piston 3 — every tracked mechanic stays at or above its floor).

**Not yet.** The cling density arc (12+ teach→test→twist) is deferred
like the other Phase B arcs. The hang is a fixed beat, not a hold: there
is no player-controlled hang time, no hang-to-sideways transfer (EDGE's
"ride a moving block sideways" use), and the trap use of the verb is
unmodelled on purpose — a crevice the optimal line does not take is
rejected, so what ships is a shortcut, always. Phase B is complete with
this item; the remaining research debt is Phase C's slider/wind carves
and the overuse-cap decision.

### ADR-038 — Phase C: sliding bridges join the generator (the last carve)

**Context.** Sliding bridges are the oldest timing hazard in the
catalogue: L13 (the hand-made boss) ships two groups and the mechanic
has been in every proof model since M1 as a *wait-out* hazard — a
slab that is solid in the route graph and then periodically sinks
under the cube. But the 51–200 generator never placed one: the hazard
stage had no `slider` carve, `acts.js` had no `slider` probability and
the density ratchet did not track it, so the whole 187-level campaign
carried the mechanic on a single hand-authored level. Phase C's job
was to close that gap with proof support, not to invent a mechanic.

**Decision — a rigid group, one clock, one window law.**
`sliders: [{ tiles: [[x,z], …], period?, phase? }]`. A group is a
RIGID bridge: contiguous slabs at ONE height (`sliders[].h` records
it), rising and sinking together. `period` ∈ [2.4, 8] s (default 3.2),
`phase` ∈ [0, 1) (default 0); every tile of a group shares the clock,
so a span can never shear itself apart. Break a group and a crossing
is a staircase of coin flips.

Two laws turned out to be missing, and both matter more than the
carve:

1. **One duty cycle.** `rules.sliderUp` had always said *up for 55%*
   while `levelView.sliderUp` — the clock the game actually draws and
   the cube actually dies to — said *up for 50%*. The proof therefore
   credited the bridge with 5% of the cycle it never had, and the
   drawn sink began a beat before the model expected it. Both sides
   now read `SLIDER_UP_FRACTION = 0.55` from `rules.js`: one constant,
   one cutoff, no second opinion.
2. **The crossing fits the window.** The wait-out doctrine ("cross in
   the up window") is only honest if one crossing fits inside it:
   `tiles × ROLL_TIME + TIMING_FLOOR ≤ period × SLIDER_UP_FRACTION`.
   This is now a *parse* law, so no level can reach a proof leaning on
   an impossible span. A 3-tile span fits at the minimum period
   (1.23 s inside 1.32 s); 4 tiles need period ≥ 2.68 s; the 8 s
   ceiling still allows an 8-tile span. The rule scales instead of
   capping bridge length arbitrarily.

**Proof model.** Unchanged and deliberate: every slider tile is plain
floor in `checkRoll`, so route, soft-lock, hazard, rescue and
fair-crossing searches inherit the bridge with no new node type —
"always solid" is the wait-out doctrine (timing adds waiting, never a
route). The live consequence is what the audits guard: because the
model never *sees* the sink, a level must never force the player to
*stand* on a bridge. The late purity audit therefore rejects a bridge
tile that carries another mechanic (pad, belt, crumble, piston,
turntable…), the start, the goal, the key, a block or a shard — the
same "no trap furniture on a timing hazard" law the pulsing gap and
the turntable cross obey. `canPushBlock` never shoves a block onto a
bridge, and `rescueTile` never benches the cube on one: a second
chance that drops you into the void is worse than no chance.

**Live law.** Already shipped with L13 and untouched: `sliderUp` reads
the hazard clock, a press onto a tile that is down is refused
(`isSolid`), and a cube left standing when the bridge lets go falls
(`checkSunkGround` → cause `slider`, amber telegraph). What changed
is only the clock the view reads (55%) and the parse-time guarantee
that a crossing is physically possible.

**Generator.** A content-hash carve in the hazard stage (never the
shared rand stream, so arming it cannot reshuffle shipped
candidates): a flat 2–3 tile straight run of the *proven walk* is
claimed as one group, off the start and the goal, with plain waiting
banks at both ends (the far bank at the same height, the near bank
within one storey) and no mechanic within one tile of the run or its
banks. Picks and phase come from an FNV hash of the path + start +
goal (salts `#pick#`, `#phase#`, `#roll`); `force: { slider: n }`
guarantees placement and a forced slot must be CROSSED by the proven
route. The claimed tiles enter `mechSet`, which keeps shards, the key,
patrols and every later carve off the bridge; the shard pool also
filters the bridge set explicitly (shards had been landing on spans —
a shard grabbable only in the up window is a trap). `mirrorDef`
mirrors the tile set (`mirrorPts`) — period/phase are
orientation-free; the curation score learns +1.5; the generator log
learns `L`; `scripts/experience.mjs` fingerprints `L` so an act
cannot become a slider monoculture. `acts.js` gives Acts 7–10
probabilities 0.3 / 0.3 / 0.35 / 0.35 and the density ratchet tracks
`slider` at 3 (only wind remains uncarved).

**First slots (names preserved).** Teach **L133 "The Running Bridge"**
(Act 7, shuttle-span, par 38, one sentinel — the bridge is the first
thing the level asks for); test **L163 "Overload"** (Act 9, tower,
par 52, two sentinels); twist **L194 "Overturned"** (Act 10, tower,
par 51, two sentinels). Each landed through the full gate on a forced
slot, and each re-cut is a census event: no ratchet floor moved down
(door 16, pulse 22, timed 22, conveyor 16, twin 15, freeze 22, heavy
22, proximity 23, blocks 14, lift 4, shrink 3, piston 3, turntable 3,
cling 3, slider 3). A 25-seed probe over 12 archetypes confirmed the
carve is not archetype-locked: meridian 24/24 land-and-parse with 23
crossed, switchback 20/20 & 15, descent 19/19 & 14, plaza 19/20 & 8,
lattice 14/15 & 11.

**Not yet.** The slider density arc (12+ teach→test→twist) is
deferred like the lift/shrink/piston/turntable/cling arcs, and wind
remains the one mechanic with no generator carve and no proof
support — do not claim it generator-placeable. The ≤55%
crumble/sentinel overuse cap is still an open removal decision.

### ADR-039 — Phase C: the breeze joins the generator (the last mechanic)

**Context.** Wind has been in KUBIK since the hand-made campaign: a
level-wide diagonal force that nudges the *idle* cube one tile at a
time (L8 "Cascade" is its teaching level). Unlike every other
catalogue mechanic it was never carved by the 51–200 generator and
never priced by a proof, so the density ratchet could not track it and
the research doc had to say so out loud. Phase C's last item was to
either make wind generator-placeable with proof support or keep
declaring it hand-authored. This ADR does the former — and the work
turned up two latent bugs that only a generated population of wind
levels would have surfaced.

**The law that makes a proof possible.** A breeze never touches a
moving cube: the live loop restarts its timer whenever an animation
runs, so only a cube that stands still for `WIND_PERIOD` (0.62 s) is
moved. That single sentence is the whole design space:

- a press route is never invalidated by wind — the player can always
  keep rolling;
- what wind can do is *displace a waiting cube*, and since it only
  carries the cube level or DOWN (`dh ≤ 0`, `dh ≥ -MAX_DROP`), a
  displacement is irreversible in height. Wind's only real hazard is
  therefore a **soft-lock**: being carried into a pocket the press law
  cannot climb out of.

So the proof support has two halves, both in `rules.js`:

1. **One drift predicate.** `windTarget(level, from, opts)` is the
   single law the game and the proofs read (the same doctrine the
   sliders, turntables and clinging follow). It carries a cube only
   when the landing slab exists, is not a doorway the cube cannot
   pass, is not a low tunnel at full size, carries no block, and sits
   at most `MAX_DROP` below. `game.js::updateWind` now calls it (it
   used to inline the same five checks — a second copy that no proof
   could see); the live call adds `solid(x, z)` so a dock, bridge or
   lift is priced by the clock it is actually showing.
2. **The wind-lock audit.** `windLockProblems(level)` walks the
   press-reachable set, follows every tile's drift target and that
   tile's in turn (an idle cube drifts every period), and fails any
   landing the press-only finish proof cannot escape. A player is
   allowed to stand still and think; a mechanic that punishes that
   with an inescapable pocket is a hidden death, which the design
   rules forbid. `scripts/verify-levels.mjs` and the generator both
   run it.

**The identity law — a breeze is a ROLLING hazard.** The static route
proof is exact only while nothing in the level forces the player to
*wait on a particular tile*. So `parseLevel` now refuses a wind level
that carries any clocked hazard (shuttles, lifts, sliding bridges,
pulsing gaps, turntables, pistons), any patrol (sentinels — a crossing
needs its window), any one-way slab a drift could burn (crumble,
timed), any block a drift could shove through, a freeze shard with
nothing to freeze, or a sealed gate a drift could park the cube on.
What remains is the pure movement kit — ice, springs, conveyors,
doorways, size pads, grips, shards — which is exactly L8's identity:
*you move, or the world does.* This is a design law, not a temporary
limitation: the wind carves that also carry a belt or a grip read as
"the river and the breeze", never as "wait here".

**Two bugs the carve surfaced (both fixed here).**

- **The breeze never scored the goal.** `finishDrift` handled pads and
  crumble but never checked the goal tile, so a cube carried onto the
  goal simply stood there and the level never completed. Drift landings
  now win exactly like roll landings, and a drift toward a *sealed*
  goal is refused (the gate refuses presses too).
- **The mirror law skipped the wind vector.** `mirrorDef` mirrors every
  coordinate-carrying field; wind was the one field it quietly dropped,
  so a mirrored wind level would have been proven in the opposite
  direction. The vector now negates its x on an x-flip and its z on a
  z-flip.

**Generator.** The breeze is decided at the top of the hazard stage
from a content hash (salts `#roll`, `#dir`) — never the shared rand
stream — so arming it cannot reshuffle a shipped candidate. Once it
lands the candidate loses every mechanic in the ban list above
(`orbCount` is forced to 0, the carve plan skips shuttle/timed/pulse,
the later blocks are skipped), which is why a wind slot is a
*designed pure-movement exception*: when `KUBIK_FORCE_MECH` names
`wind`, the slot drops the act's identity forces instead of failing
every candidate against them. A forced breeze must move the proven
route at two or more tiles — decoration is rejected, the same
"never decoration" law clinging obeys. `mirrorDef` mirrors the
vector, the curation score learns +1.5, the generator log and the
experience fingerprint use `A` for the breeze (`W` already belongs to
twin platforms — one char per mechanic is what keeps the diversity
audit honest), Acts 7–10 carry a wind probability of 0.15, and the density ratchet tracks wind at 3.

**First slots (names preserved).** Teach **L148 "The Fee"** (Act 8,
citadel, par 39, breeze + doorway); test **L167 "Bottleneck"** (Act 9,
citadel, par 47, breeze + belt + doorway); twist **L184 "Unmaking"**
(Act 10, tower, par 48, breeze + belt + doorway + one grip). Act 7 was
considered for the teach and rejected: its declared identity is the
shuttle, and the experience audit rightly fails an act whose identity
mechanic is missing from one of its levels. No ratchet floor moved
down — the census after landing reads door 18→19, conveyor 16→18,
shrink 3→4, cling 3→4, wind 0→3, every other tracked mechanic
unchanged and above its floor.

**Verification.** Unit: `windTarget` (flat / climb refused / drop 2
carried / drop 3 refused / low tunnel at full size vs mini), the parse
ban list, and `windLockProblems` (a drift into an h0 pit walled by h2
is reported; the same breeze over a walkable floor is clean). File
gate: all 200 levels + 14 dailies re-proven, including the new
"breeze must move the route" and lock audits. Live: L8, L148, L167 and
L184 played to completion with hazards running (5/5 with the daily),
and a page smoke confirmed the idle cube really is carried one tile
per period while a rolling cube is never displaced diagonally.

**Not yet.** The wind density arc (12+ teach→test→twist) is deferred
like the other Phase C arcs. The breeze is not modelled in the
sentinel-crossing timing model — which is why the parse law keeps
patrols off wind levels rather than pretending the crossing proof
handles them; a wind-aware crossing model is the follow-up that would
let the two coexist. Phase C's remaining item is the ≤55%
crumble/sentinel overuse-cap decision, not a carve.

### ADR-040 — Phase C batch 3: the density arcs, and the complexity ceiling

**Context.** ADR-031/032 set density floors for the wave-1 mechanics and
scheduled teach→test→twist triples for them. The Phase B verbs and the
two Phase C carves arrived afterwards with *first slots only* — one
teach, one test, one twist each — so the shipped catalogue carried
lifts on 4 levels, shrinks on 4, pistons on 3, turntables on 3, grips on
4, sliding bridges on 3 and wind on 3. A mechanic the player meets
three times in 200 levels is a curiosity, not a vocabulary. This batch
is the density arc: one **context slot** per scarce mechanic in each of
Acts 7, 9 and 10, so every one of them recurs across three acts in
rising company.

**The slot schedule.** Acts 7/9/10 each received one slot per mechanic,
in ascending level order, each with the mechanic forced through
`KUBIK_FORCE_MECH` and an archetype chosen by probe:

| mechanic | Act 7 | Act 8 | Act 9 | Act 10 |
|---|---|---|---|---|
| lift | L121 The Ferry | — | L162 The Squeeze | L181 The Last Rung |
| piston | L123 The Slow Boat | — | L165 Breaking Strain | L182 Over the Line |
| turntable | L125 The Passage | — | L166 The Load | L183 The Breakline Crossed |
| slider | L127 The Drift | — | L168 The Jam | L185 The Final Weave |
| shrink | L128 Over the Water | — | L170 The Wedge | L188 The Seams |
| cling | L130 Bridgemind | — | L171 All Hands | L190 Edge of the World |
| wind | — | L152 Iron Seal | L172 The Grind | L192 The Quiet Part |

Act 8 took only the wind slot, deliberately: its key ratio sits exactly
on the 40% audit line (8 of 20), and a wind level can never carry a key
(the breeze is banned from sealed gates), so every other Act 8 re-cut
would risk pushing the act under it. The wind slot went to L152, a
non-keyed slot, leaving the ratio untouched.

**Census, before → after (catalogue 51–200).** lift 4→11, shrink 4→13,
piston 3→8, turntable 3→9, cling 4→11, slider 3→8, wind 3→7. The
re-cuts also re-rolled the surrounding hazard stage, so the wave-1
counts moved up with them: door 19→22, pulse 22→24, timed 22→24,
conveyor 18→25, freeze 22→26, heavy 22→25, blocks 14→16. One
fluctuation went the other way — proximity 23→22, a single re-cut
level that no longer spawns a proximity sentinel; the ratchet floor
(21) still holds and the change is recorded here rather than absorbed
silently. Twin platforms are unchanged at 15.

**Two verifier catches, and what they cost.** The first pass failed
three audits, all of them real design conflicts rather than generator
noise:

1. *Act identity.* Act 7's declared identity is a forced shuttle on
   every level (acts.js `gen.force`). Wind can never share a level with
   a shuttle, so a wind slot in Act 7 is not a hard carve — it is a
   contradiction. The slot was restored to its shipped layout and the
   breeze moved to Act 8. This is worth stating as a rule: a forced act
   identity is a *constraint on which mechanics an act can host*, and
   the carve schedule has to respect it before it runs.
2. *The par cliff and the sawtooth.* The first turntable and shrink
   carves landed at par 52 and 56 beside L169's par 39 (a 17-roll jump,
   over the 16 cap), and the run L163–L168 lost its breathing slot
   entirely (six consecutive levels above the act's relief line). Both
   are the ADR-032 sawtooth law doing its job. L166 was re-cut under
   `KUBIK_RELIEF` and settled at par 36 — the act's breathing slot —
   and L170 settled at 46 beside L169's 39 (a 7-roll step).

**The complexity ceiling (the batch's one new law).** Re-cutting slots
with the curation score's +1.5-per-mechanic reward exposed a failure
mode the audit did not cover: a candidate at par 38 collected *eleven*
distinct mechanics (lift + shrink + piston + turntable + grip + slider +
shuttle + conveyor + heavy + springs + blocks). The board was provable,
playable and unique — and completely unreadable as a level. The shipped
catalogue's own maximum is nine distinct mechanics, so the ceiling was
set there: `MECH_CAP = 9` in `scripts/experience.mjs`, enforced in
`experienceProblems` (so the verifier fails any level over it), in the
generator's candidate gate (so a re-cut cannot produce one), and pinned
by a unit test that also asserts every shipped level obeys it. Density
is a property of the *campaign*; a level is a place to learn one thing
and practise two. L127 (10 mechanics) and L170 (11) were re-cut under
the cap; the catalogue maximum is now 9, the same as before the batch.

**Verification.** Unit **158/158** (the new cap test included), file
gate **200 levels + 14 dailies**, live play of all **21 changed levels
(21/21, zero page errors)**, then the full pre-commit gate. Nothing in
this batch touched a level outside the schedule.

**Not yet.** Density still falls short of the 12+ target for the
Phase B verbs: lift 11, turntable 9, piston 8, shrink 13, grip 11,
slider 8, wind 7 (whole-game counts are higher — 24/20/18/26/22/19/15).
A fourth batch schedules the remaining slots; the ceiling makes that
safe to do in bulk. The ≤55% crumble/sentinel overuse-cap decision is
still open.

### ADR-041 — Phase C batch 4: the density arcs close, and the mirror law gets a proof

**Context.** ADR-040 closed batch 3 with the Phase B verbs still short of
the 12+ target: in the catalogue (51–200) lift stood at 11, turntable 9,
piston 8, cling 11, slider 8 and wind 7. Batch 4 schedules the remaining
slots so every scarce mechanic reaches 12 — the point where a mechanic
recurs often enough to be a habit rather than an event.

**The slot schedule (19 re-cuts, one mechanic forced per slot).**

| act | slots | mechanics |
|---|---|---|
| 7 (121–140) | L122 Crossing Time, L124 Ropewalk, L135 The Span, L136 Loosemooring | slider, turntable, lift, piston |
| 8 (141–160) | L141 The Toll, L142 Lockbox, L145 The Ransom, L149 Lockpick Alley, L150 The Vault Door, L154 Custody, L155 The Gatehouse | wind ×3, piston, turntable, slider, cling |
| 9 (161–180) | L174 The Pileup, L175 Strainpoint, L177 Crammed, L178 The Bottleneck | wind, piston, slider, turntable |
| 10 (181–200) | L195 The Last Step, L196 The Ascent Complete, L197 Beyond the Line, L198 The Spire Reclimbed | turntable, piston, wind, slider |

**Census after the batch (catalogue 51–200).** lift 13, shrink 17,
piston 12, turntable 14, cling 15, slider 12, wind 12 — every Phase C
arc at or above 12, up from 11/13/8/9/11/8/7. The surrounding stage
moved with the re-cuts: door 25, pulse 24, timed 26, conveyor 25, twin
15, freeze 24, heavy 27, proximity 21, blocks 16. Whole-game counts
(1–200) are lift 26, shrink 34, piston 24, turntable 28, cling 30,
slider 25, wind 25.

**The ratchet caught the re-rolls, twice.** The first batch-4 pass
stripped *twin* platforms from L195 and dropped *proximity* sentinels
from six re-cut slots; the density ratchet failed at twin 13 (floor 15)
and proximity 18 (floor 21). Neither floor was lowered. The floors name
content the campaign actually had, so the content was re-cut back:
`force.twin` and `force.proximity` are ordinary force keys, and
re-running the affected slots with them — L195 and L150 as
`turntable+twin`, L150/L195/L196/L177 as `…+proximity` — restored twin
15 and proximity 21. This is the ratchet doing exactly what ADR-031
asked: a regeneration that silently removes a mechanic breaks the build
instead of shipping.

**The mirror law (the batch's real find).** L149 would not parse:
`piston 0 strike cell 7,9 is not a slab`. The piston's push direction
was mirrored as `dx: -dx` unconditionally — correct for an x-flip
(east-west), wrong for Act 8's z-flip (north-south), where the arm must
mirror to `dz: -dz` and keep `dx`. The mirrored level therefore pushed
into a void cell. Two consequences, in order of importance:

1. **The generator proved the wrong board.** It verified the
   *pre-mirror* carve and trusted the mirror to be a true symmetry, so a
   mirror bug could ship a level that was never proven. The fix is
   structural: **mirror first, then prove.** `gen-campaign2.mjs` now
   mirrors the candidate immediately after the hazard stage and runs the
   entire verifier gate on the def as shipped. The symmetry argument is
   no longer load-bearing; the generated layout is the verified layout.
   Byte-identical regeneration of L149 confirmed the change is
   behaviour-preserving on the current catalogue while making the
   guarantee sound.
2. **The symmetry is not exact even where it parses.** `parseLevel`
   derives a shuttle dock's platform height from the *first* solid
   neighbour in a fixed order (west, east, north, south). That scan is
   not mirror-invariant: L38's dock has a height-1 neighbour west and a
   height-3 neighbour east, so the platform flies at 2; x-mirrored it
   flies at 3 and the level is unsolvable (par −1). Hand-authored levels
   are never mirrored at runtime, so nothing shipped is broken — but it
   is the standing reason the generator must prove the mirrored board
   rather than reason about it. The parser's dock-height rule is left
   alone deliberately: changing it would re-price every shipped shuttle
   level for a case the game never exercises.

The mirror machinery moved to `scripts/mirror.mjs` so the law can be
tested without importing (and thereby running) the generator:
`tests/unit/mirror.test.mjs` pins the direction law for conveyors,
pistons and wind under both axes, involution (flip twice = identity),
and — over all 150 generated levels — that either mirror parses and
keeps the same par and mechanic signature. Direction negation is
normalised (`rev(0) === 0`) so a mirrored `0` component is not `-0`, a
value that serialises identically to `0` but fails strict equality.

**The par cliff, again.** Re-cutting L149 and L150 pushed the pair to
par 50 and 46; the earlier L150 (par 32) sat 18 rolls below L149, over
the 16-roll intra-act cap. The final pair steps 50→46, and Act 9's band
([36,58]) holds across the batch.

**Verification.** Unit **163/163** (five new mirror tests), file gate
**200 levels + 14 dailies**, live play of all **19 changed levels
(20/20 with the daily, zero page errors)**, then the full pre-commit
gate. The seven density arcs are closed; the ≤55% crumble/sentinel
overuse-cap decision and Phase E meta are what remain in Phase C/E.

### ADR-042 — Retiring the ≤55% crumble/sentinel overuse cap

**Decision.** The ≤55%-of-levels cap on crumble slabs and sentinel
patrols — carried as an open item since ADR-031 and re-stated as
"pending" in ADR-032, ADR-039 and ADR-040 — is **retired, not
enforced**. The catalogue stays as it is: crumble appears on 93 of the
150 generated levels (62%) and patrols on 112 (75%).

**Why it was there.** The cap came out of the research pass, not out of
play: the production-design survey (research §6, Phase C item 1) noted
that a hazard present on more than about half the boards stops reading
as an event and becomes wallpaper, and pencilled 55% as the screening
line. At decision time crumble was on 131 levels, so the line looked
like a serious finding.

**Why it is retired.**

1. *The number was a screening heuristic, not a measured threshold.*
   No playtest or telemetry ever located the point where crumble turns
   into wallpaper; 55% was a round number chosen to start a
   conversation. Shipping a 40-level content cut on it would be
   enforcing a guess with the most expensive tool available.
2. *Crumble and patrols are stage, not verbs.* Every mechanic the
   player can **choose** — lift, shrink, piston, turntable, cling,
   slider, wind — is now governed by the density ratchet (floors) and,
   above it, by `MECH_CAP = 9` (ceiling). Crumble and sentinels are the
   board's weather: the player reacts to them, never selects them. The
   thing the cap was protecting — a level that is a pile of unrelated
   hazards — is what the ceiling and `experienceProblems` now measure
   directly, per level, instead of estimating by catalogue frequency.
3. *Frequency is the teaching mechanism for timing.* Crumble is how a
   player learns to commit to a press; patrols are how they learn to
   read a clock. Cutting a quarter of the boards that carry them would
   remove rehearsal from the two skills the campaign spends 200 levels
   on. The density floors exist because *more* reps is the fix for a
   mechanic that feels rare — the same logic applies here.
4. *The audits that remain are the ones with a proof behind them.*
   `experienceProblems` (par curve, mechanic signature, act diversity,
   the ceiling), the density ratchet, and the timing-fairness gate all
   fail the build on a concrete, checkable claim. The cap was the only
   rule in the level pipeline that could not be proved — only counted.

**What replaces it.** Nothing new: the ceiling plus the per-level
experience audit carry the readability load, and the density ratchet
carries the "does this mechanic recur" load. If a future playtest shows
crumble fatigue at a particular point in the campaign, that is a
targeted level-design fix with a measured number behind it — not a
catalogue-wide quota.

**Consequences.** No content churn, no re-cuts, no gate risk. The
research doc's Phase C checklist marks the item retired rather than
done; the "pending" notes in ADR-031/032/039/040 stay as written (they
are the record of what was open at the time) and this ADR is the
resolution they point to.

### ADR-043 — Phase E: grades, the Vault, the daily streak (mastery meta)

**Context.** Phase E is the retention layer the research pass argued for
last: per-level mastery grades, a ghost to race, bonus content behind a
long climb, and a daily streak. The ghost already shipped in M2.5 (the
fastest win's move log replays as a translucent cube), so this ADR covers
the three that did not.

**Grades — three notches, one axis.** Every level card and every win
panel now carries a three-notch **mastery seal**:

| notch | grade | earned by |
|---|---|---|
| 1 | CLEAR | finishing the level |
| 2 | SWIFT | finishing in at most par presses |
| 3 | FLAWLESS | par, every shard, and **no death** |

This is deliberately *not* the medal. `medalFor` prices speed (a gold
needs a sub-half-par time), which rewards the time-trial player; the
grade prices the route and the damage, which rewards the careful one.
Two axes, two things to chase — and the grade is monotone in the save:
a later sloppy run can never erase a FLAWLESS seal.

Deathless needed a witness, so `game.js` now counts deaths. The count is
reset when a level loads or restarts, **never on respawn**: the whole
point is that the retry after a fall is not a fresh run. A rescued clear
still displays its grade but is not recorded (rescued runs stay out of
every ranking, ADR-014).

**The Vault — ten rooms behind shards.** `src/vault.js` adds rooms
**201–210**, one per headline mechanic, at citadel scale (20×20 up to
24×24 — the size the research approved for finale/Vault slots only).
They live in their own module and their own export: `LEVELS` stays
exactly the campaign (every density, act and experience rule measures
1–200), while `ALL_LEVELS` is the play order. `game.load` indexes
`ALL_LEVELS`; the level select renders a Vault shelf below the acts.

Unlocking is by **total shards**, 60 per room (`VAULT_SHARD_STEP`): the
first room opens after roughly fifteen good levels, the tenth at ~600 of
the ~800 shards the campaign holds. The all-open rule for the campaign
is untouched — the Vault is the only locked content in the game, and it
is bought with play rather than gated by progress.

**The Vault is generated, and proved by the same gate.** The campaign's
verifier was extracted to `scripts/level-gate.mjs` and is imported by
both `gen-campaign2.mjs` and the new `scripts/gen-vault.mjs`, so "bonus"
never means "less verified": reachability, soft-lock freedom,
crumble-aware solving, sentinel-timing fairness, the rescue bench, the
`MECH_CAP` ceiling and the par band all apply. `verify-levels` proves the
ten rooms on every commit, and the live gate plays them on any commit
that touches `vault.js`.

Each room is forced around one mechanic (lift, shrink, piston,
turntable, cling, slider, wind, door, freeze, shuttle) and must be
*crossed* by the proven route, exactly like a campaign slot — the
master-class framing has to survive the proof, not merely the prose.

Two floors had to be written down honestly while tuning the generator:

- *Sentinels are not free at this scale.* A hard "2 sentinels + 2
  crumble" contract made most slots unprovable, because the citadel and
  plaza archetypes rarely expose a clean patrol run once a mechanic is
  carved through them. The contract became a **hazard budget**: at least
  one sentinel, and at least two of (sentinel, crumble cluster). The
  rooms that settle at one sentinel are rich in crumble or length
  instead, and no room is a bare walk.
- *The breeze is a pure-movement level by parse law* (ADR-039): a wind
  level carries no patrol and the stage never carves crumble into it.
  Its contract is therefore the breeze itself, which the gate already
  proves moves the route at two or more tiles. Demanding a hazard quota
  there would have made the room unprovable for a rule the design does
  not have.

**Daily streak.** `streakInfo` counts consecutive played days from the
save's daily keys, with one deliberate grace: if today has not been
played yet, the streak is measured to **yesterday**, so opening the game
in the morning shows a live streak and an invitation rather than a zero.
A whole missed day breaks it. Seven consecutive days lights a *perfect
week* badge (gold) on the daily card; the streak number sits on the card
in cyan. Dates are compared as **calendar days** (`Date.UTC` of the
local Y-M-D), not milliseconds, because a DST day is 23 or 25 hours long
and a millisecond comparison silently breaks streaks twice a year.

**Verification.** Unit **176/176** (13 new meta/Vault pins), file gate
**200 levels + 10 Vault rooms + 14 dailies**, live play of the changed
levels plus V01/V05/V07 (all green, zero page errors), plus a DOM smoke
of the select screen (211 cards, 10 sealed rooms, 200 seals) and the win
panel seal. A new unit test also pins that the Vault's own sequence
obeys the complexity cap and that every room carries its headline
mechanic.

**Not yet.** Phase F (the playtest protocol: five fresh players per
phase, first-try clear rates, quit points) is the remaining planned
work; the ghost could still gain a "race your best" toggle on the win
panel (it arms automatically today).

### ADR-044 — Phase F: the playtest instrument, the report, and the proxy

**Context.** Every phase before this one was proved by machines: the
verifier proves a level can be finished, the bot proves it can be finished
*by pressing keys*, and the density/experience audits prove the sequence
is paced. None of them can say whether a human being enjoys it, where
they stop reading the board, or which level they walk away from. Phase F
is the research pass's answer — five fresh players per phase, measuring
first-try clear rate, deaths, time against par and quit points — and this
ADR ships the half of it that belongs in a repository.

**The instrument.** `src/telemetry.js` records one **attempt** per
level-visit: level id, attempt number, par, outcome (`win` / `abandon`),
cause (`restart` / `leave` / `unload`), moves, deaths, shards, whether a
rescue was used, and the real milliseconds spent in the level.

Four rules keep it honest:

1. **Opt-in.** Recording happens only with `?playtest=1`. A normal player
   writes nothing; the save is untouched.
2. **A separate key** (`kubik.playtest.v1`), so a session can be exported
   or wiped without touching progress, and a quota failure cannot corrupt
   a save.
3. **Bounded** at 1500 attempts, oldest dropped — an all-afternoon session
   must not fill the quota.
4. **An attempt is written when it ENDS, not when it starts.** A
   half-finished attempt has no outcome, and recording one would corrupt
   every rate in the report. The open attempt lives in memory; a
   `pagehide` listener closes it with cause `unload`, because closing the
   tab is the most honest quit signal a session carries.

The recorder is visible only in playtest mode as a chip on the level
select (session id, attempt count, click to export), and the JSON is also
reachable as `__kubik.playtest.json()`.

**The report.** `scripts/playtest-report.mjs` pools one or more exports
into a cohort and prints the protocol's numbers; the arithmetic lives in
`src/playtestStats.js` so it is unit-testable, and the CLI has a
five-player fixture cohort under `tests/fixtures/playtest/` (including a
deliberately malformed file, which must be skipped with a warning rather
than losing the other four sessions).

Three definitions had to be fixed, and each one is a way the report could
have lied:

- **First-try clear is per player-level, not per event.** One player who
  restarts twice and then clears has missed the first try *once*. Counting
  events would make a stubborn player look like two extra attempts and a
  patient one look perfect.
- **The quit rate's denominator is the players who REACHED the level.**
  A level nobody got to is not a level everybody quit. (The alternative —
  dividing by the whole cohort — makes late levels look safe for the
  worst reason.)
- **Moves and time against par are medians over the CLEAR runs.** A quit
  has no clear time; folding its duration into the pacing number mixes
  "slow" with "abandoned", which is exactly the distinction the report
  exists to draw.

Two flags are hard (L1 first-try must be 100%; no level over 25% quit),
and a third warns when the cohort is thinner than five. Everything else is
a reading.

**The proxy.** A human cohort takes a week and people; the loop needs
something today. `scripts/naive-player.mjs` walks every level with a
greedy, non-planning policy — take the legal roll that pulls you closer to
the gate, never deliberately backtrack, give up after four visits to the
same tile — over deterministic seeds. It models navigation only: no
sentinels, no crumble, no clocks, so it never dies and understates
difficulty. Its one question is *does following the obvious line get you
there?*

The reading it produced is a real design statement, and it is the reason
the proxy was worth building:

- act 1: **99%** — the onboarding promise (*a first-time player can
  follow the visible route*) holds, with L11 *Gauntlet* the only level
  under 90%;
- the obvious line **first fails at L23 *Crossfire***, in act 2;
- from act 5 the line mostly stops working (29–41%) and by acts 9–10 it
  never does — which is the designed escalation, and the exact boundary a
  real cohort should be inspected across.

It is deliberately **not** a gate: nothing blocks a commit on a greedy
walk, because a walk is not a player.

**What is NOT claimed.** No human has played this build under the
protocol. The targets are unmeasured, `docs/playtest_protocol.md` says so
in as many words, and the report's cohort flag fires on any cohort under
five so the numbers cannot be mistaken for a result. The honest status is
"instrument shipped, cohort pending" — not "playtested".

**Verification.** Unit **190/190** (14 new recorder/report pins, including
the CLI against the fixture cohort), live browser check of the recorder
path (real key presses → win event with `moves: 2, par: 2` → restart and
leave producing `abandon/restart` and `abandon/leave` → export parsed by
the report), and the full gate.

The "writes nothing" promise is pinned in two separate browser profiles,
because an earlier sighting of the playtest key on a normal page could
have been either a leak or a shared profile. Each profile played level 1
to a win and switched levels: the normal profile ends with
`kubik.save.v1` as its only key, `events: 0`, and the same key set after
a reload; the `?playtest=1` profile ends with both keys, the recorded
events, and a chip reading "1 attempt · 1 level" on the level select —
matching storage exactly. So the key never appears outside playtest mode,
and the chip does not overstate the record.

### ADR-045 — Phase G: EDGE-scale boards (size, mass, and the camera that shows them)

**Context.** The complaint that started this phase was concrete: the game's
play area is too small — not the grid (an 18×18 frame is already EDGE-sized)
but the **walkable surface**. Measured, the old catalogue was 15–21% filled
from act 3 to act 7; a 47-tile route inside a 324-tile frame is a ribbon in a
void, and 31 of 200 levels had *zero* interior tiles — every floor tile was
corridor. The reference boards are the opposite: broad slabs you travel
across, block clusters and terraces to read around, a camera close enough
that the cube is a character and not a dot.

Two coupled changes were needed, because in this renderer a bigger board
alone makes each tile SMALLER (the camera fit the whole board).

**1. Site mass (`scripts/sitemass.mjs`).** The archetypes carve a route; this
stage gives the route a place to happen in, between the archetype and the
hazard stage so every patrol, shard and carve is dressed against the final
geometry. Four moves, in order:

- **WIDEN** — each route tile bushes out perpendicular to travel at the
  route's own height, 1–3 tiles a side, ragged edges;
- **COURTS** — if the causeway cannot reach the act's fill target, a stretch
  of route grows a deck up to 7 tiles deep on one side;
- **BITE** — a few tiles are removed from *new* land for shape (never the
  route, never original ground — a hole that deletes a shortcut lengthens
  the level);
- **CLUBS** — some new land is raised 1–2 storeys; **ISLES** — a few
  unconnected plates float in the void, purely because a board needs
  negative space with things in it.

Contract, all of it enforced per candidate: route tiles keep their heights
exactly; mass covers only void; the spawn and goal keep a one-tile
breathing space; a mass tile may touch only route tiles immediately around
its seed (any other contact is a BRIDGE — measured: a tower's par fell
107 → 27 when its moats could be filled); the finished board must keep the
route within 2 rolls of its bare length (a ring 34 → 21, a shuttle span
44 → 34, a gauntlet 74 → 30 were all shipped as different puzzles by an
earlier, laxer version); fill ≥ 24%; the act's 2×2 floor.

**2. The camera (`src/framing.js`, `src/stage.js`).** A pure framing law,
because a camera that can only be checked by looking at it is a camera that
breaks silently. Boards up to 13 tiles are shown whole, exactly as before —
teaching boards are small *because* reading the whole puzzle is the lesson.
Bigger boards get a follow window: half the whole-board fit, floored at 6.6
world units (a usable plan area) and capped at 10.8 (so a 26×26 finale is not
a postage stamp), widened on portrait phones so the horizontal window never
becomes a slit, clamped to the board so the view never drifts into the void,
dead-zoned at 1.1 tiles so a standing cube does not make the camera breathe,
and height-compensated so a cube on a tower's third ring stays centred.
Two corrections came from looking at the running game rather than the maths:
the board clamp is a *preference* and the subject wins (on the first build a
cube spawning in a far corner was projected outside the frame at L60 and
L166 — the view stopped at the board edge while the player kept walking), and
a level load **snaps** the camera to the cube before the dead zone engages
(otherwise the first second of every board was a pan in from the centre).
Crossing the 13-tile boundary changes nothing on screen: the two laws meet at
the same value. A cube hidden behind geometry is drawn through it: a ghost
mesh with depth testing off, triggered by a ray against the level's own
height map (one draw call, no extra render pass).

**The size ladder and the pools.** Board size now grows every act, and the
archetype pools are chosen from measurement, not taste
(`scripts/site-mass-probe.mjs` is the tool):

| act | board | par band | mass fill | archetypes that survive mass at that size |
|---|---|---|---|---|
| 3 | 20 | 22–36 | 30% | twin-bridge, crossroads, lattice, split-merge, fork, plaza, descent |
| 4 | 22 | 24–40 | 32% | + ice-river |
| 5 | 24 | 26–46 | 34% | twin-bridge, lattice, split-merge, crossroads, fork, plaza, aperture |
| 6 | 24 | 28–50 | 36% | + ice-river, bridge-chain |
| 7 | 26 | 30–60 | 36% | + shuttle-span (its act identity) |
| 8 | 26 | 32–64 | 38% | + citadel, twin-falls, boss-arena |
| 9 | 26 | 34–68 | 40% | + meridian |
| 10 | 26 | 36–84 | 42% | + tower (the finale's set piece) |

Acts 1–2 (levels 1–40, hand-set and the first generator) keep their intimate
boards: onboarding is about reading a small puzzle, and a 20-wide first level
teaches nothing. They were **not** regenerated.

Loop archetypes (ring, spiral, gauntlet, undertow, staircase, switchback) are
deliberately absent from mass acts: they are puzzles about the way round, and
filling their void dissolves them (a gauntlet loses 40+ rolls of route). They
remain available to the daily generator and to acts 1–2's relief.

**The honest cap: 26, not 30.** The plan was 30×30 for acts 9–10. Measurement
stopped it: the sentinel-timing model (ADR-012/018, the gate that caught
L46/L179) costs 5–15 s per candidate at 26–30 with two patrols, and every
candidate is verified. Two fixes landed first, both semantics-preserving:
orb patrol tables and patrol-line tile sets are cached per orb (pure
functions of the path), and the crossing-window scan stops the moment a run
reaches the timing floor instead of always scanning a full patrol cycle —
the graph only ever asks "is a window ≥ floor", and clamps what it stores.
That took a two-patrol graph from ~11 s to ~1.5 s. At 30×30 the remaining
cost would still have put a full regeneration at 7+ hours and the commit hook
at an hour, so the ladder tops out at 26 — 2.3× the area of the old 18×18
with ~2.5× the fill, i.e. roughly 5× the walkable surface at the finale.
Raising the cap is an indexed-timing-model project, recorded here rather than
pretended.

**The Vault moves with the campaign (amends ADR-043).** The Vault is the
top of the game by fiction — ten master-class rooms unlocked by shards — and
Phase G quietly broke that: the campaign now ends at 26×26 with pars to 84,
while the Vault sat at 20–24 boards and par 38–80, i.e. *easier than the
content that unlocks it*. Its ladder now runs 22 → 26, the par band is
50–96 with the finale above the campaign ceiling, and the band is exported
from the generated file (`VAULT_PAR_BAND`) so the verifier and the unit test
read one number instead of three copies. The room contracts are unchanged:
every room still forces its headline mechanic, the proven route must CROSS
it, the hazard floor is still hard, and the experience sequence is still
checked.

**The composed-playability law (added 2026-11-20, found in live play).** The
gate proved three things separately: *reachability* (blocks modelled,
sentinels ignored), *sentinel fairness* (sentinels modelled, blocks ignored)
and the *crumble/block solver* (blocks modelled, fairness ignored). Each can
pass while the composition fails, and one did: L118 "The Thin White" put its
goal behind a one-tile column whose only fair approach ran into a block that
could not be pushed past the goal. The verifier was green on all three
proofs; the live bot settled 25,156 planner states and never arrived. The
lesson is that a level is not the conjunction of three proofs — it is one
play that satisfies all of them at once. `fairPlayable` in `src/rules.js`
is that single search: (tile, block layout, nudges left, size) states over
the game's own press law, with pushes, rides and fair crossings; it runs in
the generator gate only for levels that carry both blocks and patrols, and
it reproduced the L118 failure exactly before the level was re-cut. The bot
now reports the same three-way diagnosis when it cannot plan, instead of the
bare "NO FAIR ROUTE" that made this take a browser run to explain.

**The pacing law.** Widening the par bands to 22–36 … 36–84 made the
catalogue *uneven*: adjacent levels could legitimately differ by any amount
the band allowed, and the first Phase G regeneration shipped 18–31-roll
cliffs (L152→153: 64→33) and acts with no breather at all (act 10 read as a
wall of 60–80-roll levels). Pacing is a design decision, so it is drawn, not
sampled. Each act runs a sawtooth of six: five rising steps (18 / 32 / 46 /
58 / 68 % of the band), then a relief at 22 %, with the level before a boss
dipping to 25 % and the boss itself at the ceiling. Three consequences, all
enforced:

- the **generator ranks** candidates by distance to the drawn target after
  the sentinel count, and **refuses to settle** on a candidate that would
  step further than the act's allowance (`parJumpAllowance`, 70 % of the
  band, floor 16) from the level before it — the same number the curation
  audit fails on, so a settled catalogue cannot fail it afterwards. The law
  has **two ends**: a level may also not climb so high that the breather
  after it cannot be reached, which is how one 37-roll cliff survived the
  first pass (L197 settled at 79 against a target of 69, and L198's shortest
  proven relief was 42). If the attempt budget runs out, a pacing-compliant
  candidate now outranks a unique one — a curve break is worse for the
  player than a board that resembles its neighbour;
- a **relief slot draws from its act's short archetypes** (`gen.relief`),
  because a tower route measures ~82 rolls at 26×26 and can never land under
  the band's bottom third — the slot would silently break the sawtooth;
- the **mechanic curriculum is data** (`MECH_SLOTS`) and was re-homed off
  every relief slot: a teaching slot is a climbing slot (a room long enough
  to learn in) and a relief slot is the opposite promise. Eight slots moved
  (L92→93, L98→97, L112→111, L126→127, L152→151, L158→157, L186→185,
  L192→190); before that, act 10's cling test could not prove at all on a
  plaza.

**Verification.** `scripts/scale-audit.mjs` is a new gate inside
`verify-levels`: every mass act must average its declared fill (6-point
tolerance), every level must be ≥ 20% filled with at least half its act's 2×2
floor, and every board must be the size the act declares (bosses +2). Unit
tests pin the mass contract (route heights, void-only, bridge rule, dissolve
rule, unfillable-board rejection), the framing law (the two laws meeting,
the zoom band, the portrait guard, edge clamping, subject containment, the
dead zone, the snap on level load, height compensation, occlusion ray) and
the pacing law (curve inside the allowance, relief at least every six, bosses
at the ceiling with a dip before them, no curriculum slot on a breathing
slot, relief pools drawn from the act pool). Every regenerated level still passes the full
nine-check proof — the verifier is the backstop mass is layered under.

### ADR-046 — Reduced motion: a presentation mode that cannot touch a clock

**Context.** The game is a cube rolling through a void, and the genre sells
that roll. But the accessibility list in the GDD has carried one honest gap
since Phase 12: there was no way to ask KUBIK for less motion. The old code
had a stub — `@media (prefers-reduced-motion: reduce) { * {
animation-duration: 0.01ms } }` — which stopped six CSS keyframes and left
everything else running: every `transition`, the camera's glide between the
four seats, the death shake, the cube's 90° tumble on every single move, a
breathing glow, tumbling shards, a spinning goal ring and a 2.2 Hz strobe on
the win.

The naive fix — "turn off the animation" — cannot be shipped here. KUBIK's
motion is not a skin: sentinels patrol on a clock, bridges rise and dip,
pistons strike, shuttles carry, freeze shards run a 3.2 s timer, and
**every level in the catalogue is proven against those numbers**
(ADR-012/018/025). A setting that shortened a roll, froze a patrol or hid a
hazard's travel would silently invalidate 200 proofs and, worse, make levels
unreadable for the player who asked for less motion.

**Decision.** Reduced motion is a **presentation mode**, and its law is one
line: *a presentation setting may never change when the world advances.*

- `src/motion.js` owns the policy, with no renderer in it: a preference of
  `auto` (default), `reduced` or `full`; `auto` follows
  `prefers-reduced-motion`; an explicit choice always wins over the OS and is
  remembered in the save (`save.motion`, sanitised on load like every other
  field). The menu row sits beside Theme and reads the live state —
  `Motion: Auto (reduced)` — with the tooltip explaining what Auto means. A
  system change re-resolves `auto` on the spot; it never overrides a choice.
- The mode is applied **before the first frame**, beside `applyTheme`, so a
  player who asked for it never sees the opening camera settle.
- `Stage` owns the camera half: seat changes snap (no yaw easing), the
  follow target is copied instead of lerped, the death shake is a no-op, and
  the starfield stops drifting.
- `Game` owns the cube: the tumble becomes a **flat linear slide to the same
  landing point**, over the **same `ROLL_TIME`** (243 ms), with no rotation at
  all; the drop after a fall still runs on `DROP_TIME`; the intro pop and the
  spring arc become linear; the glow stops breathing; the win celebration
  (spin + rise + strobe) becomes a still cube, because the win panel already
  carries the news.
- `LevelView` owns the idle world: shard and freeze-shard tumble/bob,
  sentinel bob and glow pulse, and the goal pad's spin/breath all stop.
  **Hazard travel does not**: patrols, pistons, shuttles, bridges, sliding
  tiles and conveyors keep their clocks, because they are the puzzle.
- The CSS gets **two doors to the same room** — the OS media query *and*
  `body.reduce-motion`, for players whose system setting is off who still
  want the calmer presentation. Both now collapse `transition` as well as
  `animation`.
- The animation's mode is **bound when the move starts** (`a.reduced`), not
  read live in the frame, so toggling the setting mid-roll cannot swap the
  drawing halfway and pop the cube.

**What was deliberately kept.** The cube still moves a tile per press, and a
hazard still moves on its clock: the mode removes decoration and strong
whole-object rotation, not the game's language. No level was regenerated, no
timing constant was touched, and the verifier is unchanged.

**Verification.** `tests/unit/motion.test.mjs` pins the policy (the cycle,
the OS-vs-override precedence, sanitisation, the label) and the promise —
that `ROLL_TIME`, `FREEZE_TIME`, `WIND_PERIOD` and `TIMING_FLOOR` still hold
their values, that no `dur:` field can consult the mode, and that no code
path reassigns a gameplay clock; it also pins the split of ownership
(stage/camera, view/idle) and the two CSS doors. The level-play gate can run
in the mode (`KUBIK_MOTION=reduced`), which makes "presentation changes
nothing about play" executable rather than asserted: 12 timing-tight and
mechanically varied levels played to `won` under reduced motion — the same
routes and the same par as full motion — with sentinel patrol travel measured
still advancing (≈2 tiles in 400 ms) while the cube's glow measured
perfectly static. A live probe measured the roll's own clock at 243 ms in
both modes, confirmed the reduced landing point is identical to the tumble's
to six decimals, and confirmed the system-follow, the explicit override, its
persistence across a reload, and a mid-roll toggle with no stuck animation
and zero page errors. Eight of those checks are now permanent in
`npm run playtest` (85/85 green), so the setting is exercised on every run
of the mechanics suite: the Auto label, the cycle through Reduced and Full
and back, the collapsed CSS transition, the camera snap, the slide with a
measured 0.000° of rotation, and the choice surviving a reload.

### ADR-047 — The difficulty delta: a plateau law calibrated to the shipped curve

**Context.** `level_progression` §6 has carried an honest risk since the
50-level era: *"the generator's per-act budget can produce two adjacent
levels of equal difficulty (observed in Lattice)"*, with a difficulty-delta
verifier check logged as a possible future gate. Three gates already defend
the curve from the other side — the experience audit stops repeated
*character* (three identical fingerprints, a six-level mechanic
monoculture), and the par-jump law stops *cliffs* (a step larger than the
act's own bandwidth). None of them stops a stretch of levels that is varied,
cliff-free and **equally hard**.

Nobody had measured whether the shipped 200 actually had one. So the first
decision was to measure before building, because a threshold invented after
the content is just a regeneration order.

**Measurement** (`npm run difficulty`, the audit this ADR ships):

- the longest run of levels inside a **two-roll** band is **five** in the
  campaign proper (L24–L28: 13,13,12,13,13); every other run is four or less;
- the only long flat stretch is **act 1's teaching band** — L13–L20 (eight
  levels inside par 9–11) and L3–L8 (six inside 5–7), where par is not an
  effort axis at all;
- three adjacent pairs share both par and mechanic signature: L1→L2 (par 2)
  and L5→L6 (par 5) are teaching beats; **L18→L19** (par 10, both ice) is
  the single genuine mid-act match;
- the Vault (par 57–90) has no plateau.

So §6's risk is real but materially smaller than the note implied, and it
is concentrated where the game is deliberately teaching.

**Decision.** Add the **plateau law** to the sequence audit
(`scripts/experience.mjs:curveProblems`, enforced by `verify-levels`):

> Inside one act, across a boss-free stretch, every **six** consecutive
> levels must span at least **two** rolls of par.

The threshold is not a preference — it is the **strictest law the shipped
content already passes**, with zero slack:

| window | flattest shipped span | verdict |
|---|---|---|
| 4 | 1 (L13–L16) | would fail 5 windows |
| 5 | 1 (L15–L19) | would fail 2 windows |
| **6** | **2 (L3–L8)** | **passes everywhere — the law** |
| 7 | 2 | passes, but looser for no reason |

Act boundaries (a designed reset) and boss levels (a designed spike) are
excluded, exactly as the measurement excludes them. The law reads only pars
the other checks already computed, so it costs nothing in the gate. A unit
test asserts that the flattest shipped window meets the threshold *exactly*,
which is what makes the law non-vacuous: it cannot be loosened without a
shipped level changing.

**What was deliberately not done.** No level was re-cut. L18→L19 is
reported, not "fixed": re-cutting a shipped, live-played level to satisfy an
audit is a content decision with a real cost (a full 200-level gate run) and
no player-visible gain, because the pair shares a par *number* while playing
a different board. The law is a regression ratchet on future content, not a
retroactive standard for content that already shipped.

**Verification.** `curveProblems` is pinned by four unit tests (a flat run is
rejected; a single dip satisfies it; act boundaries, bosses and unknown pars
are exempt; and the calibration/no-slack assertion above). The full
`experienceProblems` audit still returns `[]` for the shipped 200 and the
Vault, so the commit gate is unchanged in outcome — it now simply also
refuses a future regeneration that flattens the curve. `npm run difficulty`
prints the measurement (per-act range/mean/longest climb, the law, the flat
stretches, the flat pairs, the Vault) and takes `--strict` for a CI job that
wants the curve watched separately from the content gates.
