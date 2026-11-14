# KUBIK — Progress Tracker

_Living document (Phase 12). Updated 2026-11-06. The repo is the truth;
this is the map._

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

## Current status: **GREEN**

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

## In progress

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

## Known bugs

None open. History: `bug_tracker.md` — BUG-001…BUG-007, all fixed and
regression-pinned. BUG-003…BUG-007 came out of the player report that
L46 was unfinishable; the fix is the timing-fairness gate (ADR-012),
which now covers every level and future content.

## Performance issues

None open. Measured baseline: `performance_report.md` (frame p95
0.8–1.3 ms under software rendering; budgets enforced by `npm run perf`).

## Architectural decisions

Log: `technical_decisions.md` (ADR-001…022). Latest: ADR-014
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
orb clocks into the proof model; L127 first).

## Blockers

None.
