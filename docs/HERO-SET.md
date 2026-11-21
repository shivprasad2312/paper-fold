# The hero set — 40 rooms, 40 strokes, 40 proofs

This document replaces the seventy-room set. It says what changed, why the old set could not be
fixed, and how every room in the new one is proved. The design grammar it follows comes from a
teardown of a competitor's levels: **[COMPETITOR-GRAMMAR.md](COMPETITOR-GRAMMAR.md)**.

The set ships in two halves. **Rooms 1–15** have no balls: the original eight pilot rooms, plus seven
new water rooms on assets the pilot never used (a hot pad that evaporates the pour, a narrow mouth, a
shade over the cup, a wall, two taps, a low wall, a deep sill). **Rooms 16–40** are the ball rooms:
every one puts a loose ball on its way into the glass, and the drawing has to stop it without
stealing the pour. The full plan, room by room, is in **[LEVEL-PLAN-40.md](LEVEL-PLAN-40.md)**.

The old set is not deleted history — it is the commit `7a5e29c` on this branch, and `tools/scenes.js`
still holds it. It was **beatable**, which is what it had been asked for, but fifty of its seventy
rooms were the same room with a different prop in the middle.

---

## 1. Why the old set had to be replaced rather than tuned

Measured from `tools/scenes.js` at `7a5e29c`:

| Measurement | Old set |
|---|---|
| Rooms where the cup is to the **right** of the tap | **70 / 70** |
| Rooms where the cup is left of, above, or under the tap | 0 |
| Distinct tap positions | 9 (57 rooms at exactly `x = 430`) |
| Rooms with more than one glass | 0 — including the room *named* "Two Glasses" |
| Rooms where a glass is unsupported | 0 |
| Distinct stroke shapes ever demanded | **1** — a downhill run to the right |

Two mechanical causes, not just taste:

1. **The solver's answer vocabulary was a downhill run.** Any idea that did not admit one was
   rejected as unsolvable or bent until it did. That funnel is why levels 15+ felt harder *and*
   identical: the only dial left was the corridor width.
2. **The layout audit forbade the best idea in the genre.** It required every standing glass to start
   with a base under it, so a room whose whole question is *"the cup is hanging — build it a floor"*
   could not pass the build. I wrote a rule against the game's best move and reported "70/70 clean".

---

## 2. What the new set is

Each room states its verb and the shape its answer is *meant* to be (`intent`), and the solver
proves that shape rather than whatever it stumbles on. Rooms 1–8 (the water pilot):

| # | Room | Verb | The question | The stroke |
|---|---|---|---|---|
| 1 | The Pit | support | the cup hangs over a hole | a **ledge** drawn under it, landing on the two blocks |
| 2 | Sharing | split | one stream, two cups | a **tent** over the pedestal, one run-off per cup |
| 3 | Two Heights | span | the blocks are unequal | a **ledge** across them, at the height that lets the cup rest |
| 4 | Twin Taps | funnel | two taps, one mouth, neither aims at it | a **shelf** across the two blocks with the cup between them |
| 5 | The Shelf | route | the shelf under the tap eats the stream | a **chute** from the shelf's edge into the cup |
| 6 | The Hook | latch | nothing under the cup, something beside it | a **ledge** reaching the cup from the far plank |
| 7 | Cascade | cascade | the top cup fills first, then overflows | a short **shelf** that fills the top cup first |
| 8 | Under The Ledge | overhang | the cup is *under* the shelf | a **roof** that brings the stream in low |

Two further water verbs were designed and **would not prove**, so they are not in the set — that is
the honest part of this document:

* **arch** (get the water over a tall wall). The wall has to be short enough to arch over and tall
  enough that the stream cannot simply fall past it; every geometry I tried either solved itself or
  had no drawable answer. Kept in `tools/hero-rooms.js` history, not shipped.
* **protect a cup from its own pour**. Every version either knocked the cup over on its own or filled
  it fine, which is no puzzle at all.

### 2a. The ball rooms (9–33)

The rule the user set for this half is exactly one sentence: **a ball may not end up in the glass.**
It is not decoration, so it is enforced twice:

* **In the engine.** `js/scene.js` tests each ball's circle against the glass mouth every frame. A
  ball that so much as dips into the mouth — including one riding the water surface — sets
  `glass.spoiled`, which cancels the fill and fails the room after 0.35 s. A cup with a ball in it
  can never be won.
* **In the authoring.** Every ball room is built so that, with an empty pen, the ball reaches the
  mouth before the glass fills. `solve-hero` refuses any room that solves itself, so "the ball
  lands in the cup" is the *starting* condition of all 25 rooms.

What the ink can actually do about a ball is narrow, and the whole half is built on it. **It is the
delivery that varies first**, then the stop — see [LEVEL-PLAN-40.md](LEVEL-PLAN-40.md) for the room
by room breakdown.

| Delivery | Rooms | The ball… | What the line has to do |
|---|---|---|---|
| **thrown** | 16–20, 22–27 | flies in from off-screen at 7–16 px/frame — flat, lobbed, sinking, or backhanded from the right | stop it in its lane or catch it under the arc, then let the pour through |
| **sill** | 21, 28–40 | perches on the far edge of a wooden sill and tips off, falling ~60 px across | catch it in the air, beside the mouth or on the rim line |
| **slope** | none | — | the ramp delivery is gone, and `hero-audit` fails the set if it returns |

| Stop shape | Rooms | What the hand draws |
|---|---|---|
| post | 16, 17, 19, 22, 23, 24, 25 | a bar standing on the floor in the ball's lane |
| slanted plate | 18, 31, 33, 39, 40 | two points, leaning across the drop line |
| V / crook | 20, 21, 27, 30, 34 | three points, a pocket the ball drops into |
| cradle | 28, 32, 35 | an L that catches the ball beside the mouth |
| L canopy / bracket | 26, 29 | a post with an arm over the mouth |
| plate hung off the sill | 36, 37, 38 | two points, anchored on the sill itself |

Because the ball now arrives *before* the water, a ball room can hold its tap shut for a beat
(`delay`): 1.6 s for thrown rooms, 2.2 s for sill rooms. The ball lands and spoils the cup if you do
nothing; then the tap opens and the pour is the second half of the puzzle.

Measured limits, all of them found the hard way:

* A **free-standing stroke does not stop a ball.** A stroke is a loose rigid body; a ball leaning on
  one that touches nothing topples it. Every stop in the set rests its foot on the floor or on a
  sill.
* A ball cannot be **lifted** over a glass. Drawn ramps can redirect a ball that is already moving and
  can stop one dead; they cannot raise its centre of mass more than a few pixels.
* A ball that merely **falls short** of the glass is not a ball room. It has to be dangerous at t = 0.
* The mouth is 108 px wide and the ball is 52, so where the ball *crosses the rim line* decides
  everything. A thrown ball must be aimed at a cup placed where its arc descends, and a tipped ball
  falls ~60 px across from the sill edge — `edgeX ≈ cup.x + 60`.
* A ball rolling along the **floor** cannot reach a cup that stands under the tap: the falling stream
  pushes it back. Balls arrive from above or not at all.

---

## 3. How a room is proved

`node tools/solve-hero.js <id>` — the search is over **structures**, not over ramps:

1. **Anchors.** Every upward face of every plank and block, at 8 px, 3 px and 1 px above it (a wire
   whose centre sits on a face still overlaps it by half its thickness and rests; 8 px up it does
   not), the tap plate, and every glass rim.
2. **Families.** `ledge` (under a cup, any width), `beam` (between two anchors), `tent` (ends over the
   cups, apex resting on a prop), `roof`/`roofdrop`, `vsplit`, `chute` (anchor → mouth), `bracket`,
   `arch`. A handful of control points each — the shape a hand draws, not a pixel trace.
3. **Screen, then play.** Up to 150 candidates get a five-second pour; the ones that land water, the
   room's own `intent` family first, get a full 30-second play.
4. **Refine to the shortest winner.** Nudge one control point at a time and keep any nudge that still
   wins with *less* ink. (An earlier version kept the last winner, and shipped a line nobody had
   designed.)
5. **Prove the hands.** The line must survive six twitchy hands (±3 px on alternate points) and four
   wavy hands (±2.4 px on a slow wave), exactly as `tools/solve.js` does.
6. **Budget.** The room's ink is set to 1.25× the proved line, so a bigger scaffold costs stars.

Everything is quantised to four decimals before it is written, so the proof and the player are
drawing the same line.

`node tools/solve-hero.js --emit` writes `js/levels.js` and `tools/solutions.js` — the only supported
way to change a room. `tools/solve.js --emit` now refuses to run, so the old generator cannot
overwrite the new rooms by accident.

---

## 4. What is checked before it ships

`npm run audit` runs three audits. The new one, `tools/hero-audit.js`, asks the questions the old
audit could not:

| Check | Why it exists |
|---|---|
| every room wins with its own line | the baseline |
| **the line has to lean on the room** | the wire's *settled* position is tested against every solid. A room whose answer touches nothing is a slide in a costume — this is the check that would have caught all seventy old rooms |
| no two rooms are the same picture | signature = verb + taps + cups + cup offset + hanging + prop count. The old check compared the parts list, which is why seventy identical rooms passed it |
| the ink budget means something | more than 2.2× the needed ink is a room that does not care what you draw |
| the set spans the grammar | at least 75 % distinct verbs |

Current state:

```
verify        40/40 levels solvable with their reference line
layout        40 rooms clean, 0 pen leaks, every glass supported
physics       all checks pass (greedy taps resized so a room is not a flood)
hero-audit    all checks pass — 40 distinct stroke signatures, 39 verbs, every ball room lethal
              when played untouched, and 11 thrown / 14 sill / 0 slope deliveries
hero-check    40/40 won; hands 4–6 of 6, wavy 3–4 of 4 on every room
smoke         no runtime errors, unlock button and query string still work
build         40 rooms, one self-contained html
```

![All eight rooms](levels.png)

---

## 5. Known rough edges, stated plainly

* **Two rooms still slide their glass**: 3 Two Heights (87 px) and 1 The Pit (37 px). They win, and
  the slide is the point — the cup is supposed to settle onto the ledge you draw — but a player sees
  movement, so it is in `docs/TESTING.md` for a human look.
* **The 25 ball rooms share one question** — *stop the ball before the glass*. What differs is how
  the ball arrives (thrown from either side, flat, lobbed, sinking; or tipped off a sill at a dozen
  heights and distances), when the tap opens, where the cup stands, and the shape of the line. The
  ramp delivery that every ball room used to share is gone: `hero-audit` fails the set if more than
  6 of 25 arrive down a slope. The props are still thin, though — no hot pads, fans, pins or second
  cups in the ball rooms yet — so the next pass adds traps on top of this variety rather than
  rebuilding the delivery again.
* **Fans, hot plates and seesaws are still unused.** The machinery is in the engine and the level
  format; none of the current 33 rooms needs it.
* **Cup slides**: the two pilot rooms that move their glass (3 Two Heights, 1 The Pit) still do. They
  win, and the slide is the point, but a player sees movement — it stays in `docs/TESTING.md` for a
  human look.
