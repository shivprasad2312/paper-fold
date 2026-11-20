# KUBIK — Progress Tracker

_Living document (Phase 12). Updated 2026-10-23. The repo is the truth;
this is the map._

## Current status — 2026-10-23

**Build: GREEN. Validation: instrument shipped, human cohort pending.**
That second half is deliberate: every claim below is proved by a machine,
and the one thing a machine cannot measure — whether five people who have
never seen KUBIK enjoy it — is measured by the protocol in
`docs/playtest_protocol.md`, which has not been run yet. No document here
claims otherwise.

- **Content**: 200 campaign levels (10 acts × 20, every one open), 10
  Vault rooms unlocked by shard milestones, 14 daily layouts, four cube
  verbs added since the 50-level era (lift, turntable, cling, shrink),
  and the full mechanic set at density floors (ADR-031…041).
- **Gates** (`npm test`): unit **190/190**, verifier **200 campaign + 10
  Vault + 14 dailies**, live gate **201/201 playable** (200 + today's
  daily), build green. Pre-commit hook + CI run all of them; no commit
  has bypassed them.
- **Progression**: all levels open; grades (SWIFT ≤ par, FLAWLESS = par +
  every shard + no deaths); Par all-clear; streak with a yesterday grace
  (ADR-043).
- **Feel**: mid-path rescue bench (ADR-014), hold-to-roll, four camera
  seats, two themes, juice/audio.
- **Strategy phases** from the research pass: **A–E shipped** (structure
  archetypes, new verbs, teach–test–twist cadence + density curation,
  feel, mastery meta), **F instrument shipped** (ADR-044: opt-in
  recorder, cohort report, greedy-player proxy).
- **Retired by decision**: the 55% crumble/sentinel overuse cap
  (ADR-042) — it was capping the designed escalation, and density is now
  governed by the per-act bands and the experience audit instead.

**What is genuinely not done** (the honest list, unchanged from below
where still true): the human playtest cohort (needs people), packaging
(PWA / Android — a store decision, offered not requested), reduced-motion
accessibility, the difficulty-delta verifier extension, real-device
touch/audio/GPU passes, and the retention candidates from research §7.

## Milestones (shipped, verified)

| Commit | Milestone | Verified by |
|---|---|---|
| — | Scaffold: three.js cube roller, single level | manual |
| — | EDGE-style restyle (neon slabs, rim light, starfield) | screenshots |
| — | Movement polish + score/minimap/par | playtest |
| — | 13 hand levels + 8 mechanics (crumble, sentinels, blocks, wind, key/lock, sliders) | verify + playtest |
| — | 2 themes (dark + high-key light) | screenshots (dark/light pairs in `docs/`) |
| — | 50 levels (13 hand + 37 generated+proven), hold-to-roll, 4 camera seats | verify + autoplay 50/50 |
| `e7aae2d` | All 50 levels open from the start (no gating) | playtest 64/64 + unlock test 6/6 |
| `a19e6bd` | **Playable-route test gate**: bot plays every level on every commit (pre-commit hook + CI) | live gate run (commit blocked a deliberately broken level) |
| this cycle (a) | Studio docs (research, GDD, architecture, ADRs, algorithms, level design, progression), unit tests (29), regression tests (2), stress, perf suite with budgets | all green, exit 0 |
| this cycle (b) | **Timing-fairness gate** (ADR-012): crossing-window model + 0.5 s floor in the verifier, generator + daily regen under the gate, live bot plays the fair-crossing graph with gap-free commit — fixes BUG-003 (L46 blocked), BUG-004 (L12 key), BUG-005 (L15 crumble entry), BUG-006 (ambiguous orb anchor), BUG-007 (illegal entry roll) | verify 8-check all green + live suite 51/51 + timing unit 8/8 |
| this cycle (c) | **EDGE-scale maps + new mechanics** (ADR-013): campaign enlarged 8×8→18×18; three new mechanics — shuttle platform loop (looping bridge between structures, dwell/ride/dwell), ice slide (one press, slides through the ice run), spring pad (launch over a void pit); "one resolved press" rule (`resolveRoll`) + shuttle ride edges in every search; view-as-clock platform, distance-based carry; generator carves mechanics into the route with sentinel corridor clearance; live bot boards rides / plays slides / rides launches; crossing-graph revisit hardening + live-bot route tripwire + stale-snap/mid-burst repairs | unit 52/52 (+14 mechanic tests) + verify 8-check all green + live suite 51/51 ×2 + gate-caught mid-launch pump fix |
| this cycle (d) | **Mid-path second chance** (ADR-014): the rescue bench — dying past halfway offers one resume from the 50%-press safe tile of the proven route (6 s choice window, do-nothing = normal restart); keeps moves/time/shards/crumbles/blocks, resets only sentinels; rescued clears don't enter time/ghost rankings; bench is gate-proven (fair bench→goal route); live bot accepts rescues; + roadmap to ~200 levels (`docs/roadmap-200.md`) | unit 59/59 (+7 rescue tests) + verify 9-check all green + playtest 71/71 (incl. 7 rescue checks) + live suite |

## Status snapshot (2026-11-06 — historical)

- `npm run test:unit` — 59/59 pass (+ `tests/unit/timing.test.mjs`
  BUG-003/004/006/007 regression pins; + `tests/unit/mechanics.test.mjs`
  14 mechanic pins — shuttle ride edges / ice resolved slide / spring
  launch / corridor audits / crossing revisit; + `tests/unit/rescue.test.mjs`
  7 bench pins — path/par consistency, bench placement & safety,
  key-aware placement, fair bench→goal)
- `npm run verify` — 50 levels + 14 dailies, **9 checks** each (route,
  soft-lock, shards, crumble/push survival, spawn safety, data sanity,
  par, **timing fairness** — every sentinel crossing ≥ 0.5 s window;
  key levels proven start→key→goal; **rescue bench** — fair bench→goal
  route for every level that has a second chance)
- `npm run test:play` — 51/51 playable (50 + daily), 0 page errors —
  including the shuttle levels (bot waits for the dwell, boards, rides
  the carry) and the ice/spring levels (bot plans over resolved
  landings)
- `npm run regression` — BUG-001 + BUG-002 pinned
- `npm run stress` — 4/4 scenarios clean
- `npm run perf` — within budgets (0.5 ms p50 frame cost, 22–31 draw
  calls, 0 MB heap growth over 40 loads, governor sheds quality under
  throttling)
- `npm run build` — 655 kB JS (168 kB gzip), 317 ms
- Pre-commit hook + CI gate live on the branch

## Work log, 2026-11-09 → 11-12 (historical — both tracks closed by ADR-031…041)

- **Scale-up to ~200 levels** (plan: `docs/roadmap-200.md`, 7
  milestones). **M1 done — mid-path second chance (ADR-014)**: rescue
  bench shipped and gate-proven (unit 59/59, verify 9-check, playtest
  71/71 incl. 7 rescue checks, live bot accepts rescues).
- **M2 done — the 200-level skeleton (ADR-015, 016, 017, 018, 019;
  closed 2026-11-09)**: 10 acts × 20 in `src/acts.js`; 24-archetype
  library (`scripts/archetypes.mjs`); shared hazard stage
  (`scripts/hazards.mjs`) with the sentinel refuge law — 14–50 and
  51–200 generated through the full 9-check verifier (par band,
  min-orb band, bench fairness, key-aware sealed-goal model,
  **press-schedule-band timing fairness** — the cube's band of
  possible positions under the fastest and slowest plausible commit
  must clear every sentinel) + uniqueness + curation (ADR-019: the
  long-route archetypes are capped below par floor 19 — dropped from
  the act 3–9 pools); act-map level select; stratified live gate
  (`scripts/live-gate.mjs`: changed + rotating 50 per commit, full 200
  nightly in CI). Final live gate 2026-11-09: **201/201 playable**
  (200 campaign + daily, ~102 min, zero page errors) after the band
  model's corner-tile + arc-slack correction (ADR-018 calibration:
  L179 "The Pincer" proved the chord band cut corner tiles; all 200 +
  14 dailies re-verified clean, no slots regenerated). Next: M3
  (the mechanic set, per act).
- **M2.5 in progress — the variety pass (user "proceed" 2026-11-12)**:
  EDGE-scale mechanics re-injected campaign-wide — the fair-route
  rescue model now spans mechanic gaps (`mechanicTargets` extends
  `fairReachSet` with shuttle rides + spring launches, so a
  bench→goal route crossing a shuttle/spring span is judged fair), and
  the hazard carve candidates are sampled at the real carve position
  (mid-straight-run) instead of solid-run starts — the run-start
  corners were exactly what the approach-collinearity filter exists to
  exclude (L82 gauntlet / L102 spring-field: zero candidates → forced
  mechanics silently failed); `fairReachSet` now expands by the game's
  own one-press transitions instead of naive adjacency (it had blessed
  L20 "Glass Meadow", whose only legal first roll lands on the sentinel
  line — a false positive caught by the live bot's planner); an ice
  slide landing on a spring pad now fires the pad in the model (the
  game's autoContinue launches on any landing — L68 "The Lost Stair"
  shipped with its only route sliding into a pad aimed at the void,
  caught by the full 200-level live run); dock-to-dock shuttle steps
  are refused by the model (L196's two shuttles had identical cycles,
  so the adjacent-dock transfer window never opened in real play);
  per-act orientation rotation; per-act palettes. 14–50 and 51–200
  were fully regenerated under the final model and re-gated before
  commit: verify (all 200 levels + 14 dailies), unit 60/60, and the
  live bot at 201/201 playable with zero page errors — the run that
  caught the spring-slide and dock-to-dock model holes above is now
  part of the standing nightly gate (ADR-015). The experience-diversity
  curation gate followed: levels are fingerprinted by mechanic set,
  sentinel/par/crumble bands, direction and scale, and the verifier
  now rejects repetitive sequences and mechanic-monoculture acts
  (ADR-015 item 19; the shipped catalogue passes unchanged, and
  `gen-campaign2` selects candidates under the same sequence law).
  Remaining M2.5 scope: the M3 wave-1 mechanics, and bosses as set
  pieces (M3).

## Remaining (honest list — NOT done)

| Item | Why not now |
|---|---|
| PWA manifest + installability | store decision pending (TWA vs WebView AAB — see research §5); offered, not requested |
| `android/` WebView AAB scaffold | same — packaging decision first |
| Reduced-motion accessibility mode | a11y gap (GDD §14); cosmetic-motion toggle, small but unbuilt |
| Difficulty-delta level check | the generator can produce adjacent same-difficulty levels (level_progression §6); a verifier extension, not a defect |
| Real-device pass (touch, audio, GPU) | needs hardware; headless covers logic + input path only |
| Audio correctness tests | no audio device in headless; manual check only |
| Weekly event / share-codes / local leaderboards | retention candidates (research §7) — scope, not defects |
| Human playtest cohort (Phase F) | needs five fresh players; the instrument, report and runbook are shipped and the proxy reading is in `docs/playtest_protocol.md` |

## Known bugs

None open. History: `bug_tracker.md` — BUG-001…BUG-007, all fixed and
regression-pinned. BUG-003…BUG-007 came out of the player report that
L46 was unfinishable; the fix is the timing-fairness gate (ADR-012),
which now covers every level and future content.

## Performance issues

None open. Measured baseline: `performance_report.md` (frame p95
0.8–1.3 ms under software rendering; budgets enforced by `npm run perf`).

## Architectural decisions

Log: `technical_decisions.md` (ADR-001…030). Latest: ADR-014
(mid-path second chance — the rescue bench), ADR-015 (the 200-level
campaign: archetype library + shared hazard stage + stratified live
gate), ADR-016 (the crossing models run the game's real easeInOut
trajectory), ADR-017 (the sealed goal: impassable until the key),
ADR-018 (the press-schedule BAND — no single press rhythm may be the
only one that can catch a window), ADR-019 (the long-route archetypes
are capped below par floor 19 — the act 3–9 pools are corrected),
ADR-020 (M3 wave-1 begins: conveyor/current tiles as a resolved-press
law; new mechanics enter one proven slot at a time — L175 first),
ADR-021 (pressure plate + door as a directed edge in `checkRoll` —
the cube's weight alone, no door state in any search; L152 first),
ADR-022 (delayed crumble: a 2.4 s slow-fuse slab, proven as
break-on-leave so the fuse is pure player grace; L112 first),
ADR-023 (sentinel-freeze shard: a consumable 3.2 s freeze, proven
in presses — an 8-press budget from pickup to crossing exit puts
orb clocks into the proof model; L127 first),
ADR-024 (heavy block: pushable level or downhill, never uphill —
heaviness travels with the block through every search state; L144
first),
ADR-025 (one time base for every hazard: the view's hazard clock
accumulates the clamped frame dt, so slow devices get consistent
slow-motion instead of wall-speed bridges),
ADR-026 (pulsing gap: a phantom slab seals a void cell for 40% of
a 4.0 s diagonal sweep — cross on the blink; modeled as a wait-out
timing hazard like a sliding bridge; L169 first),
ADR-027 (proximity sentinel: a patrol that sleeps until the cube
comes within `wake` tiles; proofs assume it awake, so dormancy is
a pure gift; L187 first),
ADR-028 (twin-platform shuttle: a second platform half a cycle
out of phase; proofs model the one logical shuttle, and the carry
locks onto the boarded platform so twins passing mid-route never
switch the ride; L193 first. M3 wave-1 mechanics complete.),
ADR-029 (boss arenas: the key grab starts phase 2 — wave-2
sentinels wake and every patrol runs at boss speed; proofs are
phase-blind at the hardest settings; a wave-2 spawn keeps 2
tiles from the key; L200 Apex first. The hunt for this slot also
found and fixed a latent generator flaw: the end-of-attempts
settle only ran on passing attempts, so a slot with a single
proven candidate could never settle. M3 complete. Rolled out
2026-11-17 to the remaining keyed finales L120/L140/L160/L180,
with boss identity in level select, a start briefing, a
BOSS ASLEEP/AWAKE HUD chip, violet sleeping-sentinel embers,
and a wave-aware crossing model in the live bot.),
ADR-030 (structure archetypes — plaza/tower/citadel make places
instead of tracks, fill ≈ 0.6 vs 0.19; Acts 8–10 escalate to
20×20 boards with par bands [32,50]/[36,58]/[40,66] and act-end
boards at W+2; first spliced slots plaza L88/L113/L128, tower
L148/L168/L188, citadel L155/L177/L196. Phase A of the
production-design strategy.) Live proof of the nine slots
(2026-11-17) forced two live-bot planner fixes: block pushes are
now first-class plan state (live block positions + remaining
nudges from the snapshot, pushes replayed with
rules.canPushBlock — planning through a block's spawn tile
bump-looped L113/L148/L196), and resolved presses record their
direction instead of re-deriving it from endpoints (a conveyor
turn made L196's key route unplayable on paper). Occupancy
mirrors the game exactly: only a press's immediate step is
block-aware, so ice slides may land on a pushed block's tile
(L144's crossing depends on it).
ADR-031 (density floors + teach–test–twist arcs, Phase C
batch 1: 22 forced slots (21 scheduled + neighbour
L156 absorbed by an act par-cliff repair) lift door 2→8, pulse 3→14, twin 3→10,
conveyor 6→11, timed 6→14, scheduled teach→test→twist in level
order with paired twist forces; `KUBIK_FORCE_MECH` accepts
`a+b`; a unit-test density ratchet fails the build if any
tracked mechanic drops below its shipped count. Ring slots
185/195 could not admit door/twin carves and were re-forced to
gauntlet/meridian under the same mechanic force.)
ADR-032 (Phase C batch 2: floors completed — door 2→14,
conveyor 6→14, twin 3→15, every generator-placeable mechanic
now ≥12 and the ratchet records shipped counts; light blocks
join the generator (hazard-stage carve, teach L58 → twist
L171, count 2→10); sawtooth relief becomes law — `KUBIK_RELIEF`
settles a slot on its shortest proven candidate and the
experience audit fails any act with 6+ consecutive levels
above the relief line; relief landed at L94/L97 (Act 5),
L136 (Act 7) and L147/L149/L151 (Act 8, with the L148 tower
slot re-cut to repair the relief cliff — audits unweakened);
21 slots re-cut, names preserved.)
ADR-038 (Phase C: sliding bridges join the generator — the last
carve. `sliders: [{tiles, period?, phase?}]` is a RIGID group:
contiguous slabs at one height, period in [2.4, 8] (default 3.2),
phase in [0, 1), every tile on one clock. Two missing laws were
found and fixed before the carve could be trusted: the view drew the
bridge up for 50% of the cycle while the rules model priced 55%
(a 5% window the player never got), so both sides now read
`SLIDER_UP_FRACTION` from `rules.js`; and "cross in the up window"
is only honest if a crossing fits, so parse now rejects a span whose
`tiles × ROLL_TIME + TIMING_FLOOR` exceeds the up window (3 tiles fit
at the 2.4 s floor; 4 need ≥ 2.68 s). Proofs keep the bridge always
solid (the wait-out doctrine), which is exactly why the late purity
audit may not let anything stand on one: no second mechanic,
start/goal/key/block/shard, `canPushBlock` refuses the span and
`rescueTile` never benches there. Generator: a content-hash carve
claims a flat 2–3 tile run of the proven walk with clean waiting
banks and no mechanic within a tile, forced slots must be crossed by
the proven route, shards are filtered off the bridge, mirrors carry
the tile set, curation +1.5, log char `L`, fingerprint `L`, Act 7–10
probabilities 0.3/0.3/0.35/0.35, ratchet tracks slider at 3. First
slots, names preserved: teach L133 'The Running Bridge' (Act 7,
shuttle-span, par 38), test L163 'Overload' (Act 9, tower, par 52),
twist L194 'Overturned' (Act 10, tower, par 51). Census after
landing: every tracked mechanic at or above its floor (door 16,
pulse 22, timed 22, conveyor 16, twin 15, freeze 22, heavy 22,
proximity 23, blocks 14, lift 4, shrink 3, piston 3, turntable 3,
cling 3, slider 3). Slider density arc deferred; wind is the only
mechanic still without a generator carve.)
ADR-045 (Phase G: EDGE-scale boards — the camera follows, the generator
builds places. The user's report was that the play area is too small;
measured, the catalogue was 15–21% filled from act 3 to act 7 and 31 of
200 levels had zero interior tiles — ribbons in a void. Two coupled
changes. **Site mass** (`scripts/sitemass.mjs`) grows each generated
route into a place before hazards are dressed: causeways widened
perpendicular to travel at the route's own height, courts up to 7 deep,
raised clubs, a few floating isles — under a contract that keeps every
route tile's height, fills only void, forbids mass touching two route
legs (a tower's par fell 107→27 when moats could be filled), forbids
shortening the route by more than 2 rolls (a gauntlet lost 44 at 30×30),
and rejects a board that cannot carry the act's fill. **The framing
law** (`src/framing.js`, pure maths, unit-pinned) shows boards up to 13
tiles whole and follows bigger ones through a window: half the
whole-board fit, floored at 6.6 and capped at 10.8, portrait-widened,
board-clamped but always subject-first, dead-zoned at 1.1 tiles, and
height-compensated; a cube hidden behind geometry is echoed through it
by a ray against the level's own height map. The two laws meet at the
threshold with no pop. Boards now run 20×20 → 26×26 (acts 3–10; acts
1–2 stay intimate for onboarding and were not regenerated), fill targets
30 → 42%, bands rebuilt to 22–36 → 36–84, and the generator ranks
candidates against a drawn sawtooth (five rising steps then a relief,
per six levels) so adjacent pars cannot cliff — the curation audit had
caught 18–31-roll jumps. Mechanic teaching slots became DATA
(`MECH_SLOTS`) after the first regeneration silently dropped door
14→9, conveyor, shrink, piston, turntable, cling and wind below their
ratchet floors. Sentinels: two semantics-preserving speedups (orb table
+ patrol-line caching — the timing model rebuilt them millions of
times — and an early-exit crossing scan) took a two-patrol graph from
~11 s to ~1.5 s, which is what makes the bigger boards affordable in
the gate; 30×30 was measured and rejected on that cost, recorded rather
than pretended. New gate: `scripts/scale-audit.mjs` inside the
verifier (act mean fill within 6 points, every level ≥ 20% filled with
≥ half the act's 2×2 floor, declared board size, boss +2).

The first full regeneration then taught the rest, all of it found by
the gates rather than by eye. (1) **Pacing is enforced at both ends.**
The generator refused to settle off-curve, but a level could still
climb so high the breather after it could not reach it (L197 79 → L198
42, a 37-roll cliff): the jump law now also caps a level against the
NEXT slot's target when that slot is a relief, and a pacing-compliant
candidate outranks a unique one when the budget runs out. (2) **A relief
slot must draw from short archetypes** — a tower measures ~82 rolls at
26×26 and can never land under the band's bottom third, so acts 8–10
declare `gen.relief` pools measured under the audit's own relief line.
(3) **The curriculum is a constraint, not a preference**: eight teaching
slots collided with breathing slots and act 10's cling test would not
prove at all until the slots moved off them — a teaching slot is a
climbing slot, a relief slot is the opposite promise. (4) **The mirror
law is proved per candidate** after a legal Phase G level shipped whose
x-mirror could only reach its key by crossing its own sealed gate (L72,
28 vs no route) — two BFS runs at accept time. (5) **The Vault had to
move up**: the campaign now ends at 26×26/par 84 while the Vault sat at
20–24/par 38–80, i.e. easier than the content that unlocks it. It is
re-cut on a 22→26 ladder at par 50–96 (57, 60, 69, 66, 70, 82, 82, 87,
77, 90 — a climb with a breather before the spike), and the band is
exported from the generated file so the verifier and the unit test read
one number. Final census: 217 unit tests green, verifier green on 200 +
10 Vault + 14 dailies, every pacing/scale/density/mirror gate green, and
the greedy proxy re-read: the obvious line now reaches further in the
mass acts (act 5 29%→51%, act 6 32%→59%) because a place has more legal
lines than a ribbon, while the finale still defeats it four walks in
five.)
ADR-044 (Phase F: the playtest instrument, the report, the proxy.
Phase F is the research pass's human step — five fresh players per
phase, first-try clear rate, deaths per level, time to clear vs par and
quit points — and this ships the half of it that belongs in a repo.
`src/telemetry.js` records one attempt per level-visit (outcome
win/abandon, cause restart/leave/unload, moves, deaths, shards, rescue,
real ms) under its own key and only with `?playtest=1`, so a normal
player writes nothing; attempts are written when they END, and a
`pagehide` closes an in-flight one because closing the tab is the
honest quit. `scripts/playtest-report.mjs` + `src/playtestStats.js`
pool exports into a cohort: first-try rate per player-level, quit rate
over the players who REACHED the level, medians over clears only, an
act table, quit points, and three flags (L1 must be 100% first-try, no
level over 25% quit, cohort under five warns). A five-player fixture
cohort and a malformed file pin the CLI. The proxy —
`scripts/naive-player.mjs`, a greedy non-planning walker over
deterministic seeds — gives the pre-human reading: act 1 99%
(onboarding holds, L11 84% the only wobble), the obvious line first
fails at L23 Crossfire in act 2, and from act 5 it mostly stops
working (29–41%) until acts 9–10 where it never does — the designed
escalation, and the boundary a real cohort should be inspected across.
The proxy is a reading, not a gate. Status: instrument shipped, human
cohort pending — the targets are unmeasured and the docs say so.
Unit 190/190, live recorder check (real presses → win/restart/leave
events → export → report), full gate.)
ADR-043 (Phase E: mastery meta. Three quarters shipped. Grades are
a three-notch seal — CLEAR / SWIFT (≤ par) / FLAWLESS (par, every
shard, no death) — on every level card and the win panel, a separate
axis from the speed medal and monotone in the save; deathless needed
a witness, so game.js counts deaths per run (reset by a level load or
restart, never by a respawn), and rescued clears show a grade but stay
out of the records. The Vault adds rooms 201–210 in `src/vault.js`,
one per headline mechanic, at 20×20→24×24, unlocked at 60 total
shards per room (the first after ~15 good levels, the last at ~600 of
~800); the campaign's 200 stay open from the start, `LEVELS` stays
exactly 200 and `ALL_LEVELS` is the play order. The Vault is
generated by `scripts/gen-vault.mjs` and proved by the campaign's own
verifier, now extracted to `scripts/level-gate.mjs` — two tuning
lessons are recorded: a hard two-sentinel contract made most rooms
unprovable (it became a hazard budget: ≥1 sentinel and ≥2 of
sentinel/crumble), and the breeze is a pure-movement level by parse
law so its only contract is the gate's own "the wind moves the
route". The daily streak counts consecutive calendar days with
today-unplayed grace, lights a perfect-week badge at seven, and
compares dates as UTC day numbers so DST cannot break a streak.
Unit 176/176, verify 200 + 10 Vault + 14 dailies, live V01/V05/V07
+ changed levels, DOM smoke of the select and win panel.)
ADR-042 (Retiring the ≤55% crumble/sentinel overuse cap. The cap had
been an open removal decision since ADR-031: crumble sits on 93 of the
150 generated levels (62%) and patrols on 112 (75%), both over the
line. It is retired rather than enforced. The 55% figure was a
screening heuristic from the research pass, never a measured
threshold; crumble and patrols are stage hazards the player reacts to,
never chosen verbs, so the readability risk the cap stood in for is
now measured per level by `MECH_CAP = 9` and the experience audit;
and frequency is precisely how those two skills are rehearsed across
200 levels. No content churn, no re-cuts.)
ADR-041 (Phase C batch 4: the density arcs close, and the mirror law
gets a proof. Nineteen slots re-cut across Acts 7/8/9/10 — the seven
scarce mechanics reach 12+ in the catalogue: lift 13, shrink 17,
piston 12, turntable 14, cling 15, slider 12, wind 12, every one up
from ADR-040's 11/13/8/9/11/8/7. The ratchet caught the re-rolls
first: twin fell 15→13 and proximity 21→18, and neither floor was
lowered — the affected slots were re-cut with `force.twin` /
`force.proximity` (L195, L150 as turntable+twin; L150/L195/L196/L177
with +proximity), restoring twin 15 and proximity 21. L149 exposed the
batch's real bug: the piston mirror negated `dx` unconditionally, so
under Act 8's z-flip the arm pushed into a void cell and the level
would not parse. The generator had been proving the PRE-mirror carve
and trusting the symmetry, so the fix is structural — the candidate is
now mirrored FIRST and the whole verifier gate runs on the shipped
def (byte-identical regeneration of L149 confirms no content churn).
The symmetry is not exact anyway: shuttle dock height comes from an
ordered neighbour scan, so L38 x-mirrored is unsolvable (par −1);
hand-authored levels are never mirrored, which is precisely why the
mirrored def must be proven, not reasoned about. The mirror law moved
to `scripts/mirror.mjs` and is pinned by `tests/unit/mirror.test.mjs`
(direction law per axis, involution, and equal par for both mirrors
of all 150 generated levels); direction negation normalises −0.
Unit 163/163, verify 200 + 14, live 20/20 changed levels + daily.)
ADR-040 (Phase C batch 3: the density arcs, and the complexity
ceiling. The Phase B verbs and the two Phase C carves shipped with
first slots only — lifts on 4 levels, shrinks 4, pistons 3,
turntables 3, grips 4, sliders 3, wind 3 — so every one of them
received one CONTEXT SLOT per act in Acts 7, 9 and 10: lift
L121/L162/L181, piston L123/L165/L182, turntable L125/L166/L183,
slider L127/L168/L185, shrink L128/L170/L188, cling L130/L171/L190,
wind L152 (Act 8) /L172/L192. Act 8 took only the breeze: its key
ratio sits on the 40% audit line and a wind level can never carry a
key. Census 51–200 before→after: lift 4→11, shrink 4→13, piston 3→8,
turntable 3→9, cling 4→11, slider 3→8, wind 3→7; the re-rolls also
lifted door 19→22, pulse 22→24, timed 22→24, conveyor 18→25, freeze
22→26, heavy 22→25, blocks 14→16, while proximity drifted 23→22 (one
re-cut lost its proximity sentinel; floor 21 holds, recorded not
absorbed). The verifier caught three real conflicts: Act 7's forced
shuttle identity makes wind impossible in that act (the slot was
restored, the breeze moved to Act 8); the first turntable/shrink
carves landed at par 52/56 beside L169's 39 (a 17-roll jump over the
16 cap) and erased Act 9's breathing slot, fixed by re-cutting L166
under KUBIK_RELIEF (par 36) and settling L170 at 46. The batch's one
new law: MECH_CAP = 9 in experience.mjs — a level may present at most
nine distinct mechanics, enforced in the verifier, in the generator's
candidate gate and by a unit test. It was needed because the curation
score's +1.5-per-mechanic reward built an eleven-mechanic par-38
board: provable, playable, unique, and unreadable. L127 and L170 were
re-cut under the cap; the catalogue maximum is 9, as before the batch.
Unit 158/158, verify 200 + 14, live 21/21 changed levels.)
ADR-039 (Phase C: the breeze joins the generator — the last mechanic.
Wind only ever moves a cube that STANDS STILL (the live loop restarts
its timer on every animation), so a press route is never invalidated
and wind's only real hazard is a displacement that cannot be undone in
height — a soft-lock. Proof support is two rules-side pieces: the ONE
drift predicate `windTarget` (slab exists, door law, low tunnel at
full size, no block, level or ≤2 down), now called by the live game
too, and `windLockProblems`, which walks the press-reachable set and
its drift closure and fails any landing the finish proof cannot
escape (a player may think for a second without being trapped).
`parseLevel` also makes wind a ROLLING hazard by law: it never shares
a level with clocked hazards, patrols, crumble/timed slabs, blocks,
freeze shards or a sealed gate — what ships is L8's identity, "you
move or the world does". The carve surfaced two latent bugs, both
fixed: a drift onto the goal never scored (finishDrift had no goal
check), and `mirrorDef` silently dropped the wind vector (a mirrored
wind level would have been proven backwards). Generator: content-hash
breeze (`#roll`/`#dir`), candidates lose the banned mechanics, a
forced wind slot drops the act's identity forces by design, the
breeze must move the proven route at ≥2 tiles (never decoration),
`A` (air) in the log and the experience fingerprint (`W` is twin platforms'), wind 0.15 in Acts 7–10,
ratchet tracks wind at 3. First slots, names preserved: teach L148
'The Fee' (Act 8 citadel, par 39), test L167 'Bottleneck' (Act 9
citadel, par 47), twist L184 'Unmaking' (Act 10 tower, par 48, +grip).
Census after landing: door 18→19, conveyor 16→18, shrink 3→4,
cling 3→4, wind 0→3; every floor holds. Wind density arc deferred;
the remaining Phase C item is the crumble/sentinel overuse-cap
decision, not a carve — later retired by ADR-042.)
ADR-037 (Phase B item 5, the last verb: clinging — the hang-ledge.
`clings: [[x,z]]` declares ONE void crevice between two plain slabs; a
press INTO it from either bank catches the far face, hangs a beat and
mantles up, so one press crosses the crevice and a height step one
storey past the roll law each way (climb +2, drop −3; `CLING_UP`/
`CLING_DOWN`). Declared, never inferred: an inferred hang would rewrite
every accidental crevice in the 200 shipped levels, so the crevice is
audited at parse (banks in reach, real map structure, no
mechanic/block/patrol on a grip face, never start/goal) and the edge
rides `resolveRollAt`'s step so `rollTargets`, `reachable`,
`canStillFinish`, both shortest-path engines, `solveHazards` and the
fair-crossing graph inherit it with no new search. Never decoration:
the verifier and the generator both fail a level whose clings do not
SHORTEN the proven route (par with clings vs par stripped). Live: a
`cling` animation (off the ledge → hang pressed to the far face →
mantle), logical tile unchanged until the landing, block-on-the-bank
bumps instead of hanging; the view cuts a dark notch with three amber
rungs into both crevice-facing banks. Generator: content-hash carve
over EXISTING void cells at a fold of the walk (one bank on/beside the
walk, banks ≥4 presses apart), candidate rejected unless the cling
shortens the par; pivots mirror, fingerprint 'G', ratchet tracks cling
at 3. First slots teach L176 'The Wall of It' (Act 9 citadel, par 41),
test L186 'Loose Ends' (Act 10, par 42), twist L191 'The Last Seam'
(Act 10, par 42) — census after landing: cling 0→3, conveyor 14→15,
freeze 19→21, blocks 12→14, heavy 20→22; every ratchet floor holds.
Density arc deferred like the rest of Phase B. **Phase B is complete.**)
ADR-036 (Phase B item 4: turntable bridges — the bridge that
rewires. `turntables: [{at, period?, phase?}]`; a rigid 3-tile bar
over a void cross joins alternate bank pairs each half-cycle, the
pivot always floored as the crossing refuge. Cross cells are plain
floor in every proof (the slider wait-out doctrine); live, entry
onto an unjoined arm is a step into void and loitering on an arm
through the sweep drops the cube (slider law, amber telegraph).
Cross tiles register before every other mechanic so dock/bank
checks price the bar; one height (the lowest bank), at least two
shores (cross, T or corner), nothing else on the cross, no wind.
Generator gains a content-hash carve (spine triple cleared like
shuttle docks, perpendicular arms may clear one layer of fill;
`mechSet` doubles as the carrier registry), which also exposed and
fixed a latent key-pick bug (a start-of-stage slab snapshot could
be voided by later carves). First slots teach L129 'The Crossing'
(Act 7), test L164 'The Crunch' (Act 9 tower), twist L189 'The
Unwinding' (Act 10 tower) — no ratchet floor moved; ratchet tracks
turntable at 3. Bot waits for alignment + 0.9 s dwell, refuge on
the pivot. Next and last Phase B verb: clinging (the hang-ledge).)
ADR-035 (Phase B item 3: piston pushers — the timed wall that
shoves. `pistons: [{at, dx, dz, period?, phase?}]`; the strike cell
is plain floor in every proof (the sliding-bridge doctrine) while
the base is a wall to presses and blocks; live, an extended arm
refuses entry and a resting cube is shoved one tile under the
wind-drift law — legal shoves ride the drift machinery (ghost-log
included), illegal ones stall; pistons displace, never crush, and
never share a level with wind. Spawn audits keep the strike cell
and its neighbourhood clear of every patience spot; the rescue
bench never lands on the machinery. Generator gains a content-hash
flank carve on straight flat corridors (forced pistons must be
crossed by the proven route); first slots teach L137 'The
Turnaround' (Act 7, freeze shard as support), test L169
'Compression' (Act 9, +timed+ice) and twist L187 'The Last Push'
(Act 10 citadel braid); the census cost (freeze, proximity) was
restored on the teach slot and by a repair re-cut of L183 — no
ratchet floor moved; ratchet tracks piston at 3. A page-level
smoke test parked the cube on a strike cell: shoved exactly one
tile, still playing, no page errors. Next Phase B verb: turntable
bridges, then the hang-ledge last.)
ADR-034 (Phase B item 2: shrink pads — size is one more bit of cube
state. `shrink`/`grow` pads flip the cube mini/full on every landing;
`low` tiles are tunnel mouths only the mini cube may enter;
`checkRoll`/`resolveRollAt` price the size bit and every search
carries (tile, size) states with the key-leg size join; phantom pad
states pruned so grow-in-a-low-room is a proven soft-lock; rescue
bench never lands low/pad and sentinel kills stay size-blind.
Generator gains a content-hash five-tile tunnel carve (forced
shrink must be ducked through by the proven route); first slots
teach L126 'Tidegate' (Act 7 plaza, par 28), test L161 'Full Tide'
(Act 9 tower, par 50) and twist L193 'The Final Angle' (Act 10
citadel, par 48 — re-rolled with its freeze+proximity restored, no
ratchet floor moved); ratchet tracks shrink at 3; bot plans with
the size bit. Next Phase B verb: piston pushers.)
ADR-033 (Phase B opens: lift platforms — a shuttle turned vertical.
`lifts: [{at, low, high, wait}]`; `checkRoll` prices steps against
either dwell so every proof inherits lift crossings, while live
presses price against the view clock's actual dwell; rise 2–4
storeys, two-bank parse law, no slide/belt/launch feed, no wind.
Generator gains a content-hash shaft conversion (stair-hollow on
the route, or band shaft with ≤1-storey overshoot in the
tower/citadel rings); first slots teach L131 'The Wait' (Act 7,
1→3) and test L173 'Over the Edge' (Act 9 tower, 2→4), a forced
lift must be ridden by the proven route; bot waits for the serving
dwell; ratchet tracks lifts at 2. Next Phase B verb: shrink pads.)

## Blockers

None.

## Research

`research_production_game_design.md` (2026-11-17): production
level/game-design research + EDGE reference teardown + a measured
audit of the shipped 200 (tracks-not-places: fill ≈ 0.19, route cap
44 rolls, M3 mechanics at density 1–5). Strategy phases A–F
(structure archetypes, new cube verbs, teach–test–twist cadence,
feel, mastery meta, validation) with decisions D1–D4 pending.
