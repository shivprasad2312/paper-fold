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

## Near-misses logged during this cycle (no code change needed)

- **Test-harness double-invocation** (`bfsEval` IIFE called twice) — a
  test-file bug found when the new suites were written; fixed in the test
  files, not the game. Noted here because it initially looked like a game
  desync.
- **`game.renderer` vs `game.stage.renderer`** — the perf suite's first
  version measured the wrong object; fixed in the suite. The scene-graph
  boundary (Stage owns the renderer) is by design (architecture §2).
