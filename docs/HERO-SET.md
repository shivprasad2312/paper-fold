# The hero set — eight rooms, eight verbs, eight proofs

This document replaces the seventy-room set. It says what changed, why the old set could not be
fixed, and how every room in the new one is proved. The design grammar it follows comes from a
teardown of a competitor's opening levels: **[COMPETITOR-GRAMMAR.md](COMPETITOR-GRAMMAR.md)**.

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

Ten verbs were designed; eight are proved. Each room states its verb and the shape its answer is
*meant* to be (`intent`), and the solver tries that family first — the set's variety is authored, not
stumbled into.

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

Two further verbs were designed and **would not prove**, so they are not in the set — that is the
honest part of this document:

* **arch** (get the water over a tall wall). The wall has to be short enough to arch over and tall
  enough that the stream cannot simply fall past it; every geometry I tried either solved itself or
  had no drawable answer. Kept in `tools/hero-rooms.js` history, not shipped.
* **deflect around rolling beads**. The balls never reached the cup — the cup filled anyway, so the
  room had no puzzle. A prop that the water ignores is decoration, and `hero-audit` now fails it.

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
verify        8/8 rooms solvable with their reference line
layout        8 rooms clean, 0 pen leaks, every glass supported
physics       all checks pass (greedy taps resized so a room is not a flood)
hero-audit    all checks pass — 8 verbs, 6 distinct cup offsets, 3 rooms that need the line
              to bridge two or more pieces of scenery
flaky         firm hand ±2.4 px: 8/8   light hand ±1.2 px: 8/8   replay clean: 8/8
smoke         no runtime errors, unlock button and query string still work
build         8 rooms, one self-contained html
```

![All eight rooms](levels.png)

---

## 5. Known rough edges, stated plainly

* **Two rooms still slide their glass**: 3 Two Heights (87 px) and 1 The Pit (37 px). They win, and
  the slide is the point — the cup is supposed to settle onto the ledge you draw — but a player sees
  movement, so it is in `docs/TESTING.md` for a human look.
* **No room yet has a moving prop** (ball, fan, hot plate, seesaw). The machinery is in the engine and
  in the level format; the verbs that need it are the next chapter, not this one.
* **Eight rooms is not a game.** Six more verbs are designed (weigh, dam, protected target, two
  streams merge, invert, stack) and each needs a solver family before it can ship — that is the next
  body of work, and it is why this document calls the set a pilot.
