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
  71/71 incl. 7 rescue checks, live bot accepts rescues). Next: M2
  level generator + difficulty curve, then M3 content 51→200.

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

Log: `technical_decisions.md` (ADR-001…012). Latest: ADR-010 (two-bar
test gate), ADR-011 (all levels open), ADR-012 (timing-fairness
gate — no sentinel crossing may ship without a ≥ 0.5 s window).

## Blockers

None.
