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
| `rules.test.mjs` | the roll law (drop ≤2 / climb ≤1 / void); slider group law (rigid/flat/joined, period & phase bands, the crossing-window law) + 55% duty cycle and phase; the breeze law (`windTarget`: level/down only, door/low-tunnel/block refusals) + the parse ban list + `windLockProblems` (a drift into a pit is a trap, a harmless breeze is clean); the complexity ceiling (`MECH_CAP = 9`, a synthetic crowded def rejected, every shipped level inside it); `canPushBlock` (never onto goal/crumble/slider/key/block/void); shortestRoute = BFS = par; **soft-lock proof** (`reachable ∖ canStillFinish`); hazard solver push economy (nudge budget) + crumble one-way crossings; sentinel clearance; the full spawn-problem audit (orb-on-start/goal, crumble start, shard on start, orb over void); parse-time rejection of malformed data |
| `mechanics.test.mjs` | the 2026-11-07 mechanic set: shuttle docks parsed as platform tiles + ride edges (route/reach/no-soft-lock), straight-line & track-crossing & unreachable-end rejection, transit-corridor sentinel audit; ice resolved-slide (whole run = one press, stops at first non-ice/illegal), spring launch (pit hop, no-landing fall, ±3 height wall fall, spring→ice combo), ice/spring corridor sentinel audits |
| `timing.test.mjs` | … **and the composed law** (Phase G): a goal behind a block in a one-wide lane is refused, the same goal with a second lane is playable, and every shipped block level has one play under `fairPlayable` |
| `meta.test.mjs` | the Phase E meta (ADR-043): grade tiers (CLEAR / SWIFT / FLAWLESS, par + all shards + deathless) and their monotone save merge, corrupt grades reading as none; the daily streak with its unplayed-today grace, gap break, best-ever memory and perfect-week badge; date keys as local calendar days (an impossible date is not a played day); the Vault ladder (60 shards per room, uncapped count, progress to the next seal); and the Vault data itself — ten rooms 201–210 outside the campaign, unique ids/names, every room parses inside the exported `VAULT_PAR_BAND` (50–96 since the Phase G re-scale), under the mechanic cap, carrying its headline mechanic |
| `playtest.test.mjs` | the Phase F instrument (ADR-044): an attempt becomes an event only when it finishes (a double finish cannot mint a second event); the 1500-event cap drops the oldest; storage round-trips and corrupt/foreign-version blobs are discarded, not thrown, and a throwing storage returns false; the export is a self-describing `kubik/playtest` file; the analysis — first-try clear per player-level (a restart is not a first try), quit rate over the players who reached the level, moves/time-vs-par medians over clears only, act roll-up, the L1 / quit-cap / thin-cohort flags, and the markdown; and the CLI end to end over `tests/fixtures/playtest/` (five sessions) with a malformed file skipped and the rest still reported |
| `framing.test.mjs` | the Phase G camera law (ADR-045): small boards fit whole; a campaign board zooms to the follow window but never past the fit, never closer than the plan-area floor, never further than the cap; portrait keeps ≥9 tiles across; the two laws meet at the threshold with no pop; the window is clamped to the board and re-clamped when a smaller board inherits a bigger one's focus; the dead zone swallows sub-tile movement; height compensation lifts the view by exactly the cube's rise; the occlusion ray fires on a close wall, ignores the tile under the cube and passes above a low block |
| `scale.test.mjs` | the site-mass contract (ADR-045): layouts convert to defs with void as void (a raw layout fed to `parseLevel` prices every void tile as a walkable height-0 slab — the bug this test exists to prevent); route tiles keep their heights and mass covers only void; mass never shortens the route by more than 2 rolls; a board that cannot reach the act fill is rejected rather than shipped thin; acts without a mass budget are untouched; the 2×2 and interior metrics count places, not ribbons |
| `mirror.test.mjs` | the axis-mirror law (ADR-041): a conveyor/piston/wind direction reverses on the axis being flipped and is untouched on the other (`rev(0) === 0`, never `-0`); flipping twice on the same axis is the identity; every one of the 150 generated levels mirrors on either axis to the same par and the same mechanic signature — the invariant the generator relies on now that it mirrors before it proves |
| `timing.test.mjs` | the crossing-window gate (BUG-003): the exact old L46 layout is **rejected** (no fair crossing exists), the fair layout **passes**, sealed start-escape **rejected**, key-behind-razor-crossing **rejected** (BUG-004), band-threading candidate **found**, 0.5 s floor boundary, illegal-climb crossing **refused** (BUG-007) |
| `save.test.mjs` | medal math (3 independent criteria → bronze/silver/gold), record merging (best time / most shards / fewest moves / medal only upgrades), daily bookkeeping, ghost = fastest only, **corrupted-save recovery** (garbage JSON → defaults, never throws), cam wrap-around, storage-unavailable survival, `fmtTime` |
| `daily.test.mjs` | date-seeded determinism (same date → identical def), different dates differ, generated dailies are structurally legal + solvable + `par === shortestRoute` |
| `levels.test.mjs` | the shipped catalogue: 50 unique ids 1..50, unique names, all parse, start≠goal, shard counts (2 teaching / 2–5 rule), **every level route + no soft-lock pockets** (property check), mechanic distribution matches the design doc (teaching order, key/lock only in L12 & L50) |

## 3. Integration / proof (`npm run verify`)

`scripts/verify-levels.mjs` — the solvability proof, run over
**200 campaign levels + 10 Vault rooms + 14 recent dailies** in pure Node:

1. parse (data well-formed) 2. spawn safety 3. goal reachable 4. no
   soft-lock 5. shards reachable 6. crumble/push route survives (budgeted
   state-space search) 7. hazard data sane (orb paths on slabs, key
   reachable, wind legal) 8. **timing fairness**: a fair path must exist
   start→goal over the `fairCrossingGraph` (every crossing window ≥ 0.5 s;
   for `gateKey` levels, start→key and key→goal are proven separately —
   BUG-003/BUG-004) 9. **rescue bench**: if the level has a mid-path
   second-chance tile, a timing-fair route bench→goal must also exist
   (ADR-014) 10. **scale** (Phase G): every mass act holds its declared
   board size and fill (mean within 6 points of target, every level ≥ 20%
   filled with at least half the act's 2×2 floor, bosses +2) — the per-level
   proof says a level can be played, this says it is the *kind* of level the
   act promises 11. **composed play** (Phase G): a level carrying both
   blocks and patrols must show ONE play that satisfies reachability,
   sentinel fairness and the block law at once (`fairPlayable`) — three
   separate green proofs are not a playable level (L118).

The catalogue-wide versions of 10 and 11 live in the unit suite too
(`scale.test.mjs`, `timing.test.mjs`), so a regression fails in seconds
instead of only in the verifier.

This is the "impossible level / unreachable objective / overlapping
objects / broken references" detector the studio charter asks for — a
solver, not a spreadsheet.

## 4. Gameplay (browser, real keyboard input)

| Suite | Command | Proves | When |
|---|---|---|---|
| **Playable-route** | `npm run test:play` | the selected levels (+ today's daily) are **played to `won`** through real key presses: the bot plans over the same `fairCrossingGraph` as the verifier **plus the mechanic edges** — resolved ice/spring landings are single edges (`resolveRoll`), a shuttle ride is a wait-and-board edge (the bot waits for the platform dwell, boards, and lets the carry run — the ride is two-phase: platform dwell at the far dock, then cube settle); waits for the crossing window at the *off-line* entry — the wait runs the commit's press-schedule BAND (ADR-018: the whole path polyline between the earliest and the human-slow press schedules, ± the mesh arc slack, must clear every sentinel — the same model the verifier's window gate runs), then commits the whole line run as one gap-free burst (queue topped with up to 2 continuation rolls, no pauses on the patrol line, and never pre-queues a roll into a shuttle dock or onto a dipping slider bridge — a slider-bound roll waits for the bridge to rise, same rule as the main loop, and never waits on a crumble slab); the commit's anim waits bail on ANY non-playing state so a death surfaces to the attempt loop before the game's 1 s respawn window elapses (a swallowed death desyncs the commit from a stale position — L13, 2026-11-09); the crossing wait anchors the simulation on the view's directed `orb.dist`, never on position (out-and-back patrols are ambiguous by position — BUG-006); 8 attempts per level, zero page errors. At 210 playable levels the selection is **stratified** (ADR-015): a commit that touches `src/vault.js` plays all ten Vault rooms; `scripts/live-gate.mjs` plays the **changed levels** (diffed content files) plus a **rotating 50-level quarter** — state in the git-ignored `.kubik-rotation.json`, advanced only on a green run, so every level is live-played at least once per four commits and immediately when its content changes. `npm run test:play:all` plays all 210 (the nightly job) | **pre-commit + CI (gate)** |
| **Mechanics playtest** | `npm run playtest` | 64 scripted checks: win/death/push/wind/key/bridge/ghost/medal/daily/theme/camera seats/hold-to-roll/… | CI |
| **Stress** | `npm run stress` | 120 mashed inputs, 30 restart spams on L13, win→Next ×3 flow, hold-to-roll through 4 pause/resume cycles — no state corruption, no panel ghosts, no errors | manual / on-request |
| **Perf** | `npm run perf` | frame cost, draw calls, governor behaviour, leak check vs budgets | manual / on-request |

The playable-route suite is the one wired into the gate (with the
verifier): the stratified selection stays ~10 min (50-level quarter +
changed levels), its failure modes are exactly the shipped-defect classes
from research §6 (dead levels, crash-on-level, janky interactions), and
the nightly full run (`.github/workflows/nightly-full-play.yml`, all 210,
~30–45 min) is the backstop for anything the rotation has not reached.

## 5. Regression (`tests/regression/`, `npm run regression`)

One named test per fixed bug (bug_tracker.md):

- **BUG-001** `win-panel-resurface.mjs` — plays a level to the win panel,
  then exercises every post-win transition (Replay inside the 900 ms
  window — the original repro — Replay after the panel, Next) and watches
  2 s each for a resurface.
- **BUG-002** `fault-line-spawn.mjs` — pure Node: the specific level that
  shipped broken + the general spawn-safety property over all 200 + 7 dailies.

- **BUG-003** `tests/unit/timing.test.mjs` — the crossing-window gate as
  unit tests: exact old-L46 layout rejected, fair layout passes, sealed
  start-escape rejected, key-behind-razor-crossing rejected (BUG-004),
  band-threading candidates discovered, floor boundary.
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
| **Feel** (does the 0.243 s roll feel right) | human judgment; the constant is pinned in code + docs so any change is deliberate and re-testable |
| **Real-GPU perf** | the harness is pessimistic by design; a device pass before release validates the upper bound |

## 8. When everything runs

| Event | Tests |
|---|---|
| `git commit` (pre-commit hook) | unit + verify + **live gate** (changed + rotating 50) |
| push / PR (CI) | unit + verify + live gate (changed + rotating 50) + full playtest |
| nightly (02:00 UTC, `nightly-full-play.yml`) | verify (200 + Vault) + **playable-route ALL 210** |
| content work (new level / mechanic) | + `validate:levels`, `regression`, screenshot review |
| performance work | `perf` (budgets enforced) |
| pre-release | + device pass (touch + audio + real GPU), store checklist |
