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

The current reading (32 walks per level), after the Phase G re-scale:

```
act    greedy reach    median steps / par
1      99%             1.08
2      91%             1.10
3      73%             1.21
4      67%             1.25
5      51%             1.22
6      59%             1.23
7      40%             1.21
8      28%             1.30
9      34%             1.14
10     20%             1.02
VAULT   0%             —
```

- **The onboarding promise holds**: act 1 is reachable by the obvious line
  (99% of walks; L11 *Gauntlet* at 80% is the only level under 90%, and a
  spiral is where a non-planning player loops).
- **The obvious line first fails at L23 *Crossfire*** (act 2, 22%). As
  before, that is a detour level doing its job — worth watching in a real
  cohort, since a greedy walker is the worst-case reader.
- **The re-scale made early-mass levels MORE readable, not less** (act 3
  83%→73%, act 4 87%→67%, act 5 29%→51%, act 6 32%→59%). This is the site
  mass doing what it was built for: a route through a plaza has more legal
  lines than a ribbon over a void, so a walker that only looks one roll
  ahead finds a way more often even though the level is twice as long.
- **Acts 9–10 rose as well** (0%→34%, 2%→20%): the old 18×18 boards were
  corridors where one wrong roll was fatal; the EDGE-scale boards have
  negative space to recover in. The finale still defeats gut-following four
  walks in five, which is the intended feel of an endgame puzzle — but this
  is the number to inspect first if the first human cohort reports act 9 as
  *easier* than act 7.
- **Median steps ÷ par stays near 1.0–1.3 everywhere**, i.e. when the
  greedy walker does arrive it takes 20–30% more rolls than the optimum.
  That gap is the planning tax the later acts are built on.

## Status

- Instrument, report, fixtures and protocol: **shipped** (ADR-044).
- Human cohort: **not yet run** — this repository has no players. The
  targets above are therefore *unmeasured*, and no document in this repo
  claims otherwise. When a cohort runs, its report is committed as
  `docs/playtest-cohort.md` and the before/after table goes into
  `docs/progress.md` (the research pass's own requirement).
