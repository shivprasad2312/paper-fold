# Testing the 70 rooms — where the risk is

Written for a human reviewer, not for the toolchain. Every number below comes from `tools/report.js`,
which plays each room six to nine times: the reference line, four hands that wobble ±2.4 px, one hand at
±1.2 px, a stroke that stops early, and a stroke that overshoots.

**All 70 win.** The list below is not "broken levels", it is *where a room is likely to feel wrong to a
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

While unlocked, a yellow `TEST · n/70 · ← → step · R retry · Esc levels` badge sits at the bottom of the
screen. In play: **← →** step a level, **R** retry, **Esc** back to the grid. The setting is stored so a
reload does not lose it, and one tap turns it off — the label is what keeps an unlocked build from ever
being mistaken for real progress.

---

## Tier A — look at these first (12)

These are the rooms where a *fair* hand, not a careless one, can still lose: a stroke that wanders 1.2 px,
an answer that has to end within 8 px of the right place, or a glass that is pushed along its own base
before the water arrives.

| # | Level | Why |
|---|---|---|
| 3 | The Staircase | no overshoot margin at all |
| 14 | Crate Stack | fails a 1 px wobble |
| 20 | Split Sill | glass slides 42 px |
| 24 | The Brace | no overshoot margin at all |
| 28 | Ball Trap | fails a 1 px wobble |
| 40 | Weather | fails a 1 px wobble |
| 41 | Glass On A Slope | no overshoot margin at all; glass slides 9 px; glass leans 0.07 rad |
| 50 | The Exam | glass slides 9 px; glass leans 0.07 rad |
| 55 | Hands And Pins | fails a 1 px wobble |
| 58 | Lever | fails a 1 px wobble |
| 68 | The Vault | fails a 1 px wobble; 48 droplets lost |
| 70 | Grand Finale | fails a 1 px wobble |

The movement is the thing no other check looks at. A room "wins" if the glass is standing at the end; a
glass that slid 42 px first (**20 Split Sill**) or 9 px (**41**, **50**) still counts, and a player sees it
slide. **41** and **50** also lean 0.07 rad when they stop.

Zero overshoot margin (**3 The Staircase**, **24 The Brace**, **41**) means the stroke must stop within
8 px of the reference end — the water leaves the wire at that point, so there is nowhere to go past it.
That is the shape of the game, not a bug, but it is the first place a hand will fail.

---

## Tier B — three of four hands (10)

These survive their own reference line and a light hand, but one of the four ±2.4 px hands misses. Nothing
in the room is wrong; the approach is narrow.

| # | Level | Why |
|---|---|---|
| 6 | The Column | three of four hands |
| 29 | Heavy Lid | three of four hands |
| 30 | The Keeper | three of four hands |
| 33 | Updraft | three of four hands |
| 36 | Two Blowers | three of four hands |
| 38 | Steam Room | three of four hands; 31 droplets lost |
| 57 | Long Arm | three of four hands |
| 63 | Slippery When Wet | three of four hands; glass leans 0.07 rad |
| 64 | Needle | three of four hands |
| 67 | Uphill | three of four hands; 42 droplets lost |

---

## Tier C — clean (48)

Four hands, a light hand, the glass does not slide, and the pour is not wasteful.

1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 31, 32, 34, 35, 37, 39, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 56, 59, 60, 61, 62, 65, 66, 69

---

## The thirsty rooms

Wins with a lot of water on the floor. If one of these is reported as "it nearly worked", this is why.

* **51 Twin Taps** — 107 droplets lost
* **60 Halfway Exam** — 73 droplets lost
* **68 The Vault** — 48 droplets lost
* **4 The Wedge** — 48 droplets lost
* **67 Uphill** — 42 droplets lost
* **12 Under The Shelf** — 38 droplets lost
* **11 Over The Wall** — 34 droplets lost
* **5 The Gap** — 33 droplets lost
* **38 Steam Room** — 31 droplets lost

---

## The full table

Sorted worst-first, as `node tools/report.js --md` prints it. "stops early" is not shown: the end of the
stroke is what aims the water in every room of this game, so a stroke cut 1.5% short loses in all 70 and
the column says nothing.

| # | Level | fill / need | hands /4 | ±1 px | overshoot | glass | water lost | what to check |
|---|---|---|---|---|---|---|---|---|
| 41 | Glass On A Slope | 0.53 / 0.52 | 3 | ok | **0** | 9 px | 8 | no overshoot margin at all; glass slides 9 px; glass leans 0.07 rad |
| 40 | Weather | 0.50 / 0.5 | 3 | **miss** | 80 px | 5 px | 24 | fails a 1 px wobble |
| 58 | Lever | 0.50 / 0.5 | 3 | **miss** | 80 px | 2 px | 20 | fails a 1 px wobble |
| 14 | Crate Stack | 0.57 / 0.55 | 3 | **miss** | 80 px | 2 px | 7 | fails a 1 px wobble |
| 28 | Ball Trap | 0.53 / 0.52 | 3 | **miss** | 80 px | still | 6 | fails a 1 px wobble |
| 67 | Uphill | 0.50 / 0.5 | 3 | ok | 80 px | 5 px | 42 | 42 droplets lost |
| 38 | Steam Room | 0.53 / 0.52 | 3 | ok | 80 px | 1 px | 31 | 31 droplets lost |
| 68 | The Vault | 0.50 / 0.5 | 4 | **miss** | 80 px | 1 px | 48 | fails a 1 px wobble; 48 droplets lost |
| 6 | The Column | 0.55 / 0.55 | 3 | ok | 80 px | 2 px | 24 | clean |
| 29 | Heavy Lid | 0.50 / 0.5 | 3 | ok | 80 px | 1 px | 8 | clean |
| 30 | The Keeper | 0.50 / 0.5 | 3 | ok | 80 px | 5 px | 8 | clean |
| 36 | Two Blowers | 0.50 / 0.5 | 3 | ok | 80 px | still | 4 | clean |
| 57 | Long Arm | 0.50 / 0.5 | 3 | ok | 80 px | 2 px | 24 | clean |
| 63 | Slippery When Wet | 0.50 / 0.5 | 3 | ok | 80 px | 7 px | 6 | glass leans 0.07 rad |
| 33 | Updraft | 0.53 / 0.52 | 3 | ok | 80 px | 1 px | 12 | clean |
| 64 | Needle | 0.47 / 0.45 | 3 | ok | 80 px | 2 px | 11 | clean |
| 70 | Grand Finale | 0.50 / 0.5 | 4 | **miss** | 80 px | 1 px | 29 | fails a 1 px wobble |
| 55 | Hands And Pins | 0.53 / 0.52 | 4 | **miss** | 80 px | 1 px | 12 | fails a 1 px wobble |
| 20 | Split Sill | 0.50 / 0.5 | 4 | ok | 80 px | 42 px | 16 | glass slides 42 px |
| 50 | The Exam | 0.50 / 0.5 | 4 | ok | 80 px | 9 px | 9 | glass slides 9 px; glass leans 0.07 rad |
| 3 | The Staircase | 0.55 / 0.55 | 4 | ok | **0** | 1 px | 6 | no overshoot margin at all |
| 4 | The Wedge | 0.55 / 0.55 | 4 | ok | 80 px | 3 px | 48 | 48 droplets lost |
| 5 | The Gap | 0.55 / 0.55 | 4 | ok | 80 px | still | 33 | 33 droplets lost |
| 11 | Over The Wall | 0.55 / 0.55 | 4 | ok | 80 px | still | 34 | 34 droplets lost |
| 12 | Under The Shelf | 0.55 / 0.55 | 4 | ok | 80 px | still | 38 | 38 droplets lost |
| 24 | The Brace | 0.53 / 0.52 | 4 | ok | **0** | 1 px | 22 | no overshoot margin at all |
| 51 | Twin Taps | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 107 | 107 droplets lost |
| 60 | Halfway Exam | 0.39 / 0.38 | 4 | ok | 80 px | 1 px | 73 | 73 droplets lost |
| 1 | First Pour | 0.55 / 0.55 | 4 | ok | 80 px | 2 px | 8 | clean |
| 2 | The Weight | 0.50 / 0.5 | 4 | ok | 80 px | 3 px | 5 | clean |
| 7 | The Chimney | 0.55 / 0.55 | 4 | ok | 80 px | still | 20 | clean |
| 8 | Step Down | 0.55 / 0.55 | 4 | ok | 80 px | still | 23 | clean |
| 9 | The Notch | 0.56 / 0.55 | 4 | ok | 80 px | 1 px | 26 | clean |
| 10 | The Long Drop | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 21 | clean |
| 13 | The Funnel | 0.55 / 0.55 | 4 | ok | 80 px | 8 px | 24 | clean |
| 15 | Ice Run | 0.55 / 0.55 | 4 | ok | 80 px | 2 px | 7 | clean |
| 16 | The Sill | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 6 | clean |
| 17 | Stone Step | 0.55 / 0.55 | 4 | ok | 80 px | 2 px | 4 | clean |
| 18 | The Trench | 0.55 / 0.55 | 4 | ok | 80 px | still | 12 | clean |
| 19 | The Ledge | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 18 | clean |
| 26 | Two Weights | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 12 | clean |
| 34 | Fan And Ball | 0.50 / 0.5 | 4 | ok | 80 px | 6 px | 13 | clean |
| 45 | Tipping Point | 0.50 / 0.5 | 4 | ok | 80 px | 2 px | 11 | clean |
| 47 | Hands Off | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 15 | clean |
| 49 | Deep Cup | 0.51 / 0.5 | 4 | ok | 80 px | still | 14 | clean |
| 52 | Second Spout | 0.50 / 0.5 | 4 | ok | 80 px | 2 px | 0 | clean |
| 53 | Overflow | 0.50 / 0.5 | 4 | ok | 80 px | 2 px | 7 | clean |
| 54 | Two Glasses | 0.46 / 0.45 | 4 | ok | 80 px | 1 px | 4 | clean |
| 62 | Narrow World | 0.50 / 0.5 | 4 | ok | 80 px | 4 px | 28 | clean |
| 65 | Two Storeys | 0.50 / 0.5 | 4 | ok | 80 px | still | 5 | clean |
| 66 | The Gauntlet | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 11 | clean |
| 69 | Last Light | 0.50 / 0.5 | 4 | ok | 80 px | 3 px | 9 | clean |
| 21 | Dead Weight | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 1 | clean |
| 22 | Ball And Glass | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 13 | clean |
| 23 | Rubber Ball | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 19 | clean |
| 27 | The Plug | 0.53 / 0.52 | 4 | ok | 80 px | 3 px | 11 | clean |
| 31 | Crosswind | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 8 | clean |
| 32 | Wind Shadow | 0.53 / 0.52 | 4 | ok | 80 px | 5 px | 15 | clean |
| 35 | The Drift | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 26 | clean |
| 37 | Hot Plate | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 13 | clean |
| 39 | The Lid | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 13 | clean |
| 42 | Glass In A Gap | 0.53 / 0.52 | 4 | ok | 80 px | still | 15 | clean |
| 43 | Edge Of The World | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 10 | clean |
| 44 | The Narrow Neck | 0.53 / 0.52 | 4 | ok | 80 px | still | 7 | clean |
| 46 | Cup On A Column | 0.52 / 0.5 | 4 | ok | 80 px | still | 9 | clean |
| 48 | Low Ceiling | 0.53 / 0.52 | 4 | ok | 80 px | still | 17 | clean |
| 56 | Rejoin | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 19 | clean |
| 59 | The Pivot | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 9 | clean |
| 61 | The Machine Room | 0.49 / 0.48 | 4 | ok | 80 px | 1 px | 13 | clean |
| 25 | Ball Run | 0.55 / 0.52 | 4 | ok | 80 px | 1 px | 18 | clean |

---

## What I would do with a report from you

* **"the line cannot be drawn"** — the pen refuses ink inside scenery or the glass; the level's corridor
  is too narrow. That is a scene bug, not a difficulty bug.
* **"it wins without me drawing"** — the scenery alone solves it; the room is not a puzzle.
* **"the glass moves"** — the base is inadequate. Tier A above is where I expect these.
* **"the water never reaches the mouth no matter what"** — the feasible set is empty; the geometry is
  wrong, and the room has to be rebuilt rather than tuned.
* **"it is just pixel-tracing"** — Tier B; the mouth or the approach needs to be wider.
