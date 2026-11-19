# KUBIK — playtest protocol (Phase F, ADR-044)

_How the game is played by someone who has never seen it, and what that
tells us. The instrument and the report are shipped; the human cohort is
the step this repository cannot run by itself._

## The two hard targets

From the research pass (§2.2, §6). Everything else is a reading.

| target | number | why |
|---|---|---|
| Level 1 is impossible to fail | first-try clear **100%** | onboarding decides whether the other 209 are played |
| No level is a wall | quit rate **≤ 25%** per level | a level a quarter of players walk away from is mispriced, not hard |

A **quit** is a player who *reached* a level and left without clearing it
(restart, level select, menu, closing the tab). It is measured per player
per level, not per attempt: a stubborn player who restarts eight times is
not eight quits, and a patient player is not zero.

## Who

- **Five fresh players per phase** — people who have never played KUBIK
  and have not watched anyone play it. Five is small on purpose: it is
  enough to catch a wall and cheap enough to run at every phase boundary.
  The report flags any cohort under five and tells you to treat the rates
  as a reading.
- Mixed input if possible (keyboard and touch), since the game ships both.
- Nobody is told which level is "hard", what a mechanic does, or that the
  shards matter.

## The sitting

1. Open `…/?playtest=1` — this is the only mode that records anything.
   A normal page writes nothing to storage.
2. Play for **30–45 minutes**, in order, starting from level 1 (the
   campaign is all open, but the protocol rides the designed curve).
3. Do not guide, do not comment, do not answer "am I doing it right?".
   Note *when* the player asks — that question is data.
4. If the player wants to stop a level, let them leave it however they
   would (restart, level select, close the tab). **The leaving is the
   measurement** — a helpful research assistant who says "try the other
   way" destroys the signal.
5. Stop after the session; do not tidy the save.

## Export

On the level select there is a **PLAYTEST chip** (visible only in this
mode) showing the session id and the attempt count. Clicking it downloads
`kubik-playtest-<session>.json`. In the console:

```js
__kubik.playtest.json()      // the same JSON as a string
__kubik.playtest.download()  // the file
```

One file per player. Name them after the player, not the date —
`s-…json` is the session id and sorts chronologically on its own.

## Report

```bash
node scripts/playtest-report.mjs sessions/            # a directory of exports
node scripts/playtest-report.mjs sessions/ --out docs/playtest-cohort.md
```

It prints: cohort size, overall first-try clear, a flag list, an act
table (first-try / quit / deaths per clear / moves over par), the quit
points, and a per-level table. It reads the same numbers the in-game
recorder writes, and its arithmetic is unit-tested against a five-player
fixture cohort (`tests/fixtures/playtest/`).

What the columns mean:

| column | reading |
|---|---|
| **first-try** | did the level teach itself? A low number on an *introduction* level is a teaching bug; on a twist level it is the puzzle. |
| **quit** | the hard target. Above 25% → the level is on the list. |
| **deaths / clear** | hazard calibration — a level that kills twelve times per clear is a different kind of hard than one that kills twice. |
| **moves / par** | the "readability tax": how much longer a human route is than the proven optimal one. 2× is normal for a twist level; 4× means the board is not being read. |
| **median time** vs par | pacing. The export carries real time in the level, so seconds-per-par-roll is the only fair cross-level unit. |

## Decision rules

1. Any level over the quit cap goes on the re-cut list **in order of quit
   rate**, not in order of how hard it feels.
2. L1 failing first-try is a stop-the-line bug: onboarding ships before
   anything else.
3. A level whose moves/par is high *and* whose quit rate is low is
   keepable — slow is not the same as hated.
4. A level whose quit rate is high *and* whose deaths/clear is low is a
   **readability** problem: the player is not dying, they are lost. That
   is a lighting/camera/hint fix before it is a level redesign.
5. Nothing is re-cut on a cohort of five without a second sitting on the
   same level — five players is a detector, not a measurement.

## The proxy (what ships without humans)

Until a cohort exists, `npm run playtest:proxy` runs a **greedy-player
model**: at each step it looks at its four legal rolls, takes the one that
pulls it closer to the gate, never deliberately backtracks, and gives up
after standing on the same tile four times. It models navigation only —
no sentinels, no crumble, no clocks — so it never dies and understates
difficulty. Its one question is: *does following the obvious line get you
there?*

The current reading (32 walks per level):

```
act    greedy reach    median steps / par
1      99%             1.09
2      91%             1.11
3      83%             1.20
4      87%             1.13
5      29%             1.16
6      32%             1.08
7      41%             1.09
8      27%             1.08
9       0%             1.42
10      2%             1.56
VAULT   0%             —
```

- **The onboarding promise holds**: every act-1 level is reachable by the
  obvious line (99% of walks; L11 *Gauntlet* at 84% is the only one under
  90%, and a spiral is where a non-planning player loops).
- **The obvious line first fails at L23 *Crossfire*** (act 2, 28%). That
  is early for a level that asks for a detour — worth watching in the
  first real cohort, though a greedy walker is the worst-case reader.
- **From act 5 the line mostly stops working** (29–41%), and by act 9–10
  it never does. That is the designed escalation — keys, towers, detours
  and multi-mechanic boards are *supposed* to defeat gut-following — but
  it is also the boundary any real cohort should be inspected across: if
  human first-try rates collapse in the same place, the difficulty jump
  between acts 4 and 5 is the thing to re-cut, not the individual levels.

The proxy is a **reading, not a gate**: it is not in the test suite and
no commit is blocked on it.

## Status

- Instrument, report, fixtures and protocol: **shipped** (ADR-044).
- Human cohort: **not yet run** — this repository has no players. The
  targets above are therefore *unmeasured*, and no document in this repo
  claims otherwise. When a cohort runs, its report is committed as
  `docs/playtest-cohort.md` and the before/after table goes into
  `docs/progress.md` (the research pass's own requirement).
