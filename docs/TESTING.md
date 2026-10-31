# Testing the rooms — where the risk is

Written for a human reviewer, not for the toolchain. The set is eight rooms now (see
[HERO-SET.md](HERO-SET.md)); this file is about playing them. Every number below comes from
`tools/report.js`, which plays each room six to nine times: the reference line, four hands that wobble ±2.4 px, one hand at
±1.2 px, a stroke that stops early, and a stroke that overshoots.

**All 8 win.** The list below is not "broken levels", it is *where a room is likely to feel wrong to a
person even though a machine could solve it*. Sorted into what I would look at first.

---

## How to open all of them

**Open the game, tap "Levels", and press the yellow `🔓 Unlock all levels (testing)` button at the
bottom of the grid.** That is the route that needs no address bar and survives a reload. It turns into
`🔒 Lock levels again` once it is on.

Three ways in, because a query string survives neither a preview frame nor a reload:

| Way | Where |
|---|---|
| **Button** | Levels screen, under the grid |
| **`U` key** | anywhere in the game |
| **URL** | `?unlock=all` (every level open), `?unlock=all&level=37` (jump to 37), `?unlock=reset` (lock again) |

While unlocked, a yellow `TEST · n/8 · ← → step · R retry · Esc levels` badge sits at the bottom of the
screen. In play: **← →** step a level, **R** retry, **Esc** back to the grid. The setting is stored so a
reload does not lose it, and one tap turns it off — the label is what keeps an unlocked build from ever
being mistaken for real progress.

---

## The eight rooms, worst-first

Every room wins with its own reference line. This table is the risk profile from `node tools/report.js`
— where a room may feel wrong to a person even though a machine proves it.

| # | Level | fill / need | hands /4 | 1 px | stops early | overshoot | glass | lost | verdict |
|---|---|---|---|---|---|---|---|---|---|
| 4 | Twin Taps | 0.56 / 0.55 | 3 | ok | **0%** | **0** | 12 px | 4 | no overshoot margin at all; glass slides 12 px |
| 6 | The Hook | 0.50 / 0.5 | 3 | ok | **0%** | 80 px | 52 px | 1 | glass slides 52 px; glass leans 0.07 rad |
| 8 | Under The Ledge | 0.47 / 0.45 | 4 | ok | **0%** | **0** | 1 px | 55 | no overshoot margin at all; 55 droplets lost |
| 1 | The Pit | 0.50 / 0.5 | 4 | ok | **0%** | 80 px | 37 px | 0 | glass slides 37 px |
| 3 | Two Heights | 0.50 / 0.5 | 4 | ok | **0%** | 80 px | 87 px | 1 | glass slides 87 px; glass leans 0.08 rad |
| 5 | The Shelf | 0.47 / 0.45 | 4 | ok | **0%** | 80 px | 7 px | 39 | 39 droplets lost |
| 2 | Sharing | 0.36 / 0.35 | 4 | ok | **0%** | 80 px | 3 px | 0 | clean |
| 7 | Cascade | 0.78 / 0.3 | 4 | ok | **0%** | 80 px | 4 px | 11 | clean |

8 levels, 6 flagged for a human look

**What each flag means**

* **no overshoot margin** — the stroke has to end within 8 px of the proved end, because that endpoint
  is what aims the water. Two rooms (4 Twin Taps, 8 Under The Ledge) are like that; the fix would be a
  wider mouth, never a lower target.
* **glass slides N px** — the cup settles onto the ledge you draw. In rooms 1 and 3 that is the whole
  point of the verb, and 87 px in room 3 means the ledge lands and the cup shuffles along it. A player
  will see it move, so it is listed.
* **droplets lost** — 8 Under The Ledge throws 55 of them away: the top surface of the ledge catches
  some. It wins, but it is the untidiest room in the set.

The one check that matters most is not in this table: `npm run hero-audit` proves that **the drawn
line actually touches the room**. A room whose answer floats free of its own scenery is a slide
wearing a costume, and that is what the old seventy rooms were.

---

## What I would do with a report from you

* **"the line cannot be drawn"** — the pen refuses ink inside scenery or the glass; the level's corridor
  is too narrow. That is a scene bug, not a difficulty bug.
* **"it wins without me drawing"** — the scenery alone solves it; the room is not a puzzle.
* **"the glass moves"** — the base is inadequate. Tier A above is where I expect these.
* **"the water never reaches the mouth no matter what"** — the feasible set is empty; the geometry is
  wrong, and the room has to be rebuilt rather than tuned.
* **"it is just pixel-tracing"** — Tier B; the mouth or the approach needs to be wider.
