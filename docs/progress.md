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
| this cycle | Studio docs (research, GDD, architecture, ADRs, algorithms, level design, progression), unit tests (29), regression tests (2), stress, perf suite with budgets | all green, exit 0 |

## Current status: **GREEN**

- `npm run test:unit` — 29/29 pass
- `npm run verify` — 50 levels + 14 dailies, 7 checks each
- `npm run test:play` — 51/51 playable (50 + daily), 0 page errors
- `npm run regression` — BUG-001 + BUG-002 pinned
- `npm run stress` — 4/4 scenarios clean
- `npm run perf` — within budgets (0.5 ms p50 frame cost, 22–31 draw
  calls, 0 MB heap growth over 40 loads, governor sheds quality under
  throttling)
- `npm run build` — 655 kB JS (168 kB gzip), 317 ms
- Pre-commit hook + CI gate live on the branch

## In progress

- Nothing blocking. Docs + test infrastructure complete for v1.0.0.

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

None open. History: `bug_tracker.md` (BUG-001, BUG-002 — both fixed,
regression-pinned).

## Performance issues

None open. Measured baseline: `performance_report.md` (frame p95
0.8–1.3 ms under software rendering; budgets enforced by `npm run perf`).

## Architectural decisions

Log: `technical_decisions.md` (ADR-001…011). Latest: ADR-010 (two-bar
test gate) and ADR-011 (all levels open).

## Blockers

None.
