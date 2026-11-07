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
