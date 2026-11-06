# KUBIK — Testing Strategy

_Phase 8 deliverable. What exists, what it proves, when it runs, and the
honest gaps._

## 1. The test pyramid (all implemented)

```
                    ┌─────────────────────────────┐
                    │  BROWSER GAMEPLAY (slow)     │  play everything, real input
                    │  test:play · playtest ·      │  CI + pre-commit (test:play)
                    │  stress · regression(b)      │
        ┌──────────────────────────────────────────────┐
        │  INTEGRATION / PROOF (fast, pure Node)        │  rules × levels composition
        │  verify-levels (7 checks × 64 level instances)│  CI + pre-commit
        │  unit/levels.test.mjs (catalogue properties)  │  CI + pre-commit
   ┌────────────────────────────────────────────────────────┐
   │  UNIT (fastest, pure Node — node:test, zero deps)       │  the rules of the game
   │  rules · save · daily                                   │  every commit (pre-commit)
   └────────────────────────────────────────────────────────┘
```

## 2. Unit (`tests/unit/`, `npm run test:unit`)

`node:test` + `node:assert`, no framework, no browser, <1 s:

| File | What it pins |
|---|---|
| `rules.test.mjs` | the roll law (drop ≤2 / climb ≤1 / void); slider 55% duty cycle + phase; `canPushBlock` (never onto goal/crumble/slider/key/block/void); shortestRoute = BFS = par; **soft-lock proof** (`reachable ∖ canStillFinish`); hazard solver push economy (nudge budget) + crumble one-way crossings; sentinel clearance; the full spawn-problem audit (orb-on-start/goal, crumble start, shard on start, orb over void); parse-time rejection of malformed data |
| `save.test.mjs` | medal math (3 independent criteria → bronze/silver/gold), record merging (best time / most shards / fewest moves / medal only upgrades), daily bookkeeping, ghost = fastest only, **corrupted-save recovery** (garbage JSON → defaults, never throws), cam wrap-around, storage-unavailable survival, `fmtTime` |
| `daily.test.mjs` | date-seeded determinism (same date → identical def), different dates differ, generated dailies are structurally legal + solvable + `par === shortestRoute` |
| `levels.test.mjs` | the shipped catalogue: 50 unique ids 1..50, unique names, all parse, start≠goal, shard counts (2 teaching / 2–5 rule), **every level route + no soft-lock pockets** (property check), mechanic distribution matches the design doc (teaching order, key/lock only in L12 & L50) |

## 3. Integration / proof (`npm run verify`)

`scripts/verify-levels.mjs` — the 7-check solvability proof, run over
**50 levels + 14 recent dailies** in pure Node (<1 s):

1. parse (data well-formed) 2. spawn safety 3. goal reachable 4. no
   soft-lock 5. shards reachable 6. crumble/push route survives (budgeted
   state-space search) 7. hazard data sane (orb paths on slabs, key
   reachable, wind legal).

This is the "impossible level / unreachable objective / overlapping
objects / broken references" detector the studio charter asks for — a
solver, not a spreadsheet.

## 4. Gameplay (browser, real keyboard input)

| Suite | Command | Proves | When |
|---|---|---|---|
| **Playable-route** | `npm run test:play` | every level + today's daily is **played to `won`** through real key presses, with BFS re-planning after every death; zero page errors | **pre-commit + CI (gate)** |
| **Mechanics playtest** | `npm run playtest` | 64 scripted checks: win/death/push/wind/key/bridge/ghost/medal/daily/theme/camera seats/hold-to-roll/… | CI |
| **Stress** | `npm run stress` | 120 mashed inputs, 30 restart spams on L13, win→Next ×3 flow, hold-to-roll through 4 pause/resume cycles — no state corruption, no panel ghosts, no errors | manual / on-request |
| **Perf** | `npm run perf` | frame cost, draw calls, governor behaviour, leak check vs budgets | manual / on-request |

The playable-route suite is the one wired into the gate (with the
verifier): it is fast enough (~4 min) and its failure modes are exactly
the shipped-defect classes from research §6 (dead levels, crash-on-level,
janky interactions).

## 5. Regression (`tests/regression/`, `npm run regression`)

One named test per fixed bug (bug_tracker.md):

- **BUG-001** `win-panel-resurface.mjs` — plays a level to the win panel,
  then exercises every post-win transition (Replay inside the 900 ms
  window — the original repro — Replay after the panel, Next) and watches
  2 s each for a resurface.
- **BUG-002** `fault-line-spawn.mjs` — pure Node: the specific level that
  shipped broken + the general spawn-safety property over all 50 + 7 dailies.

**Rule:** a bug fix is not done until its regression test is green and
named (agent_rules §2.7).

## 6. Level validation composition

`tests/level_validation/run.mjs` (`npm run validate:levels`) composes the
unit catalogue properties + the verifier + the playable bot into one
command — the full "is every level fine?" answer in one invocation. The
validators themselves stay in `scripts/` (single source of truth; the
hook and CI use them directly — no duplicated logic).

## 7. What the tests CANNOT see (honest gaps)

| Gap | Mitigation |
|---|---|
| **Visual correctness** (does it *look* right) | headless SwiftShader can't judge art; screenshot gate in `docs/` (dark + light + mobile), reviewed at content time |
| **Audio** | synthesized output is untested (no audio device in headless); correctness = code review + manual check; volume/latency not asserted |
| **Real touch hardware** | pointer events are exercised via puppeteer; physical thumbs / gesture edge cases need a device pass before store release |
| **Feel** (does the 0.17 s roll feel right) | human judgment; the constant is pinned in code + docs so any change is deliberate and re-testable |
| **Real-GPU perf** | the harness is pessimistic by design; a device pass before release validates the upper bound |

## 8. When everything runs

| Event | Tests |
|---|---|
| `git commit` (pre-commit hook) | unit + verify + **playable-route** (the gate) |
| push / PR (CI) | unit + verify + playable-route + full playtest |
| content work (new level / mechanic) | + `validate:levels`, `regression`, screenshot review |
| performance work | `perf` (budgets enforced) |
| pre-release | + device pass (touch + audio + real GPU), store checklist |
