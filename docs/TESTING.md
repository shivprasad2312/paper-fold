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

## Tier A — look at these first (6)

Something in the room is doing more than it should, or less.

| # | Level | Why |
|---|---|---|
| 4 | The Wedge | glass moves 10 px, 46 droplets thrown away |
| 28 | Ball Trap | fails a ±1.2 px hand, only 3 of 4 hands |
| 41 | Glass On A Slope | glass moves 11 px |
| 46 | Cup On A Column | glass moves 54 px |
| 50 | The Exam | only 3 of 4 hands, glass moves 10 px |
| 55 | Hands And Pins | fails a ±1.2 px hand |

**28 Ball Trap** should not be on this list twice: it only survives three of four human hands *and*
fails the light hand, which means the ball's resting place is doing the deciding, not the wire. A ball
level should be readable — you should be able to see where it will go.

**50 The Exam** is the one I already rebuilt once (the glass used to slide off its slope entirely; now
it has a lip). It still slides 10 px and leans 0.07 rad before the water arrives. That is inside what I
called fixed, but a person will see the glass moving and wonder.

**46 Cup On A Column** moves the glass 54 px. That is not a slide, that is a fall that did not finish.
It wins, which is why no check caught it — my checks ask "is the glass standing at the end", not "did it
move". This is the one I would look at hardest.

---

## Tier B — needs a steady hand (14)

Not wrong, but they ask for precision. If any of these feels like *tracing* rather than *thinking*, that
is the failure mode to report: the fix is a wider mouth or a gentler approach, never a lower target.

| # | Level | Why |
|---|---|---|
| 3 | The Staircase | zero overshoot margin |
| 6 | The Column | only 3 of 4 hands |
| 12 | Under The Shelf | only 3 of 4 hands, 31 droplets thrown away |
| 16 | The Sill | only 3 of 4 hands |
| 21 | Dead Weight | only 3 of 4 hands |
| 33 | Updraft | only 3 of 4 hands, zero overshoot margin |
| 36 | Two Blowers | zero overshoot margin |
| 40 | Weather | only 3 of 4 hands |
| 42 | Glass In A Gap | zero overshoot margin |
| 51 | Twin Taps | only 3 of 4 hands, 78 droplets thrown away |
| 57 | Long Arm | only 3 of 4 hands |
| 62 | Narrow World | only 3 of 4 hands, 35 droplets thrown away |
| 64 | Needle | only 3 of 4 hands, zero overshoot margin |
| 68 | The Vault | zero overshoot margin, 31 droplets thrown away |

---

## Tier C — wins, but throws most of the water away (4)

The pour arrives with the glass only just full because most of the water missed entirely. It is legal
and it is what the reference line does, but a player who sees 43 of 90 droplets hit the floor may read
the level as broken rather than hard.

* **5 The Gap** — 33 droplets lost
* **11 Over The Wall** — 34 droplets lost
* **60 Halfway Exam** — 73 droplets lost
* **69 Last Light** — 43 droplets lost

---

## Tier D — clean (46)

Wins on all four hands, survives a light hand, the glass does not move, and less than a third of the
water is wasted.

1, 2, 7, 8, 9, 10, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 34, 35, 37, 38, 39, 43, 44, 45, 47, 48, 49, 52, 53, 54, 56, 58, 59, 61, 63, 65, 66, 67, 70

---

## The full table

| # | Level | fill / need | hands /4 | ±1 px | overshoot | glass | water lost | what to check |
|---|---|---|---|---|---|---|---|---|
| 1 | First Pour | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 1 | clean |
| 2 | The Weight | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 0 | clean |
| 3 | The Staircase | 0.55 / 0.55 | 4 | ok | **0** | 1 px | 6 | zero overshoot margin |
| 4 | The Wedge | 0.55 / 0.55 | 4 | ok | 80 px | 10 px | 46 | glass moves 10 px; 46 droplets thrown away |
| 5 | The Gap | 0.55 / 0.55 | 4 | ok | 80 px | still | 33 | 33 droplets thrown away |
| 6 | The Column | 0.55 / 0.55 | 3 | ok | 80 px | 2 px | 24 | only 3 of 4 hands |
| 7 | The Chimney | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 27 | clean |
| 8 | Step Down | 0.55 / 0.55 | 4 | ok | 80 px | still | 23 | clean |
| 9 | The Notch | 0.56 / 0.55 | 4 | ok | 80 px | 1 px | 26 | clean |
| 10 | The Long Drop | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 21 | clean |
| 11 | Over The Wall | 0.55 / 0.55 | 4 | ok | 80 px | still | 34 | 34 droplets thrown away |
| 12 | Under The Shelf | 0.55 / 0.55 | 3 | ok | 80 px | 2 px | 31 | only 3 of 4 hands; 31 droplets thrown away |
| 13 | The Funnel | 0.55 / 0.55 | 4 | ok | 80 px | 6 px | 9 | clean |
| 14 | Crate Stack | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 30 | clean |
| 15 | Ice Run | 0.55 / 0.55 | 4 | ok | 80 px | 2 px | 7 | clean |
| 16 | The Sill | 0.55 / 0.55 | 3 | ok | 80 px | 1 px | 19 | only 3 of 4 hands |
| 17 | Stone Step | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 27 | clean |
| 18 | The Trench | 0.55 / 0.55 | 4 | ok | 80 px | 4 px | 8 | clean |
| 19 | The Ledge | 0.55 / 0.55 | 4 | ok | 80 px | 1 px | 3 | clean |
| 20 | Split Sill | 0.50 / 0.5 | 4 | ok | 80 px | 4 px | 0 | clean |
| 21 | Dead Weight | 0.53 / 0.52 | 3 | ok | 80 px | 7 px | 15 | only 3 of 4 hands |
| 22 | Ball And Glass | 0.53 / 0.52 | 4 | ok | 80 px | still | 3 | clean |
| 23 | Rubber Ball | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 0 | clean |
| 24 | The Brace | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 1 | clean |
| 25 | Ball Run | 0.55 / 0.52 | 4 | ok | 80 px | 1 px | 18 | clean |
| 26 | Two Weights | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 5 | clean |
| 27 | The Plug | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 9 | clean |
| 28 | Ball Trap | 0.53 / 0.52 | 3 | **miss** | 80 px | still | 6 | fails a ±1.2 px hand; only 3 of 4 hands |
| 29 | Heavy Lid | 0.50 / 0.5 | 4 | ok | 80 px | 4 px | 0 | clean |
| 30 | The Keeper | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 0 | clean |
| 31 | Crosswind | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 11 | clean |
| 32 | Wind Shadow | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 0 | clean |
| 33 | Updraft | 0.53 / 0.52 | 3 | ok | **0** | 1 px | 12 | only 3 of 4 hands; zero overshoot margin |
| 34 | Fan And Ball | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 8 | clean |
| 35 | The Drift | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 26 | clean |
| 36 | Two Blowers | 0.50 / 0.5 | 4 | ok | **0** | 2 px | 16 | zero overshoot margin |
| 37 | Hot Plate | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 0 | clean |
| 38 | Steam Room | 0.53 / 0.52 | 4 | ok | 80 px | 4 px | 27 | clean |
| 39 | The Lid | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 0 | clean |
| 40 | Weather | 0.50 / 0.5 | 3 | ok | 80 px | 4 px | 21 | only 3 of 4 hands |
| 41 | Glass On A Slope | 0.53 / 0.52 | 4 | ok | 80 px | 11 px | 5 | glass moves 11 px |
| 42 | Glass In A Gap | 0.55 / 0.52 | 4 | ok | **0** | 1 px | 8 | zero overshoot margin |
| 43 | Edge Of The World | 0.53 / 0.52 | 4 | ok | 80 px | 8 px | 15 | clean |
| 44 | The Narrow Neck | 0.53 / 0.52 | 4 | ok | 80 px | 2 px | 2 | clean |
| 45 | Tipping Point | 0.50 / 0.5 | 4 | ok | 80 px | 2 px | 11 | clean |
| 46 | Cup On A Column | 0.50 / 0.5 | 4 | ok | 80 px | 54 px | 9 | glass moves 54 px |
| 47 | Hands Off | 0.50 / 0.5 | 4 | ok | 80 px | 3 px | 14 | clean |
| 48 | Low Ceiling | 0.53 / 0.52 | 4 | ok | 80 px | still | 17 | clean |
| 49 | Deep Cup | 0.51 / 0.5 | 4 | ok | 80 px | 3 px | 0 | clean |
| 50 | The Exam | 0.50 / 0.5 | 3 | ok | 80 px | 10 px | 16 | only 3 of 4 hands; glass moves 10 px |
| 51 | Twin Taps | 0.53 / 0.52 | 3 | ok | 80 px | 1 px | 78 | only 3 of 4 hands; 78 droplets thrown away |
| 52 | Second Spout | 0.50 / 0.5 | 4 | ok | 80 px | 7 px | 14 | clean |
| 53 | Overflow | 0.50 / 0.5 | 4 | ok | 80 px | 2 px | 0 | clean |
| 54 | Two Glasses | 0.46 / 0.45 | 4 | ok | 80 px | still | 4 | clean |
| 55 | Hands And Pins | 0.53 / 0.52 | 4 | **miss** | 80 px | 1 px | 12 | fails a ±1.2 px hand |
| 56 | Rejoin | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 18 | clean |
| 57 | Long Arm | 0.50 / 0.5 | 3 | ok | 80 px | 2 px | 24 | only 3 of 4 hands |
| 58 | Lever | 0.50 / 0.5 | 4 | ok | 80 px | 2 px | 19 | clean |
| 59 | The Pivot | 0.53 / 0.52 | 4 | ok | 80 px | 1 px | 9 | clean |
| 60 | Halfway Exam | 0.39 / 0.38 | 4 | ok | 80 px | 1 px | 73 | 73 droplets thrown away |
| 61 | The Machine Room | 0.49 / 0.48 | 4 | ok | 80 px | 1 px | 13 | clean |
| 62 | Narrow World | 0.50 / 0.5 | 3 | ok | 80 px | 2 px | 35 | only 3 of 4 hands; 35 droplets thrown away |
| 63 | Slippery When Wet | 0.50 / 0.5 | 4 | ok | 80 px | 8 px | 0 | clean |
| 64 | Needle | 0.47 / 0.45 | 3 | ok | **0** | 2 px | 11 | only 3 of 4 hands; zero overshoot margin |
| 65 | Two Storeys | 0.50 / 0.5 | 4 | ok | 80 px | still | 5 | clean |
| 66 | The Gauntlet | 0.52 / 0.5 | 4 | ok | 80 px | still | 16 | clean |
| 67 | Uphill | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 5 | clean |
| 68 | The Vault | 0.50 / 0.5 | 4 | ok | **0** | 1 px | 31 | zero overshoot margin; 31 droplets thrown away |
| 69 | Last Light | 0.50 / 0.5 | 4 | ok | 80 px | still | 43 | 43 droplets thrown away |
| 70 | Grand Finale | 0.50 / 0.5 | 4 | ok | 80 px | 1 px | 18 | clean |

---

## What I would do with a report from you

* **"the line cannot be drawn"** — the pen refuses ink inside scenery or the glass; the level's corridor
  is too narrow. That is a scene bug, not a difficulty bug.
* **"it wins without me drawing"** — the scenery alone solves it; the room is not a puzzle.
* **"the glass moves"** — the base is inadequate. Tier A above is where I expect these.
* **"the water never reaches the mouth no matter what"** — the feasible set is empty; the geometry is
  wrong, and the room has to be rebuilt rather than tuned.
* **"it is just pixel-tracing"** — Tier B; the mouth or the approach needs to be wider.
