# The contract: what every level must do

No code. This is the sheet that sits next to the physics, geometry and 200-level briefs. If a level
breaks a rule here, it does not ship — however pretty it looks.

---

## 1. The one invariant

> **Every level is the same journey: a source of water at one end, a glass at the other, and an empty
> page in between. The player draws the path. The level is won when the glass is full and still
> standing.**

Nothing else changes across all 200 levels. Not the goal, not the win condition, not the scoring. That
is deliberate: a player learns the objective once and never spends another second re-reading the task.

**Why:** the moment you change the goal ("now protect the glass", "now move the glass"), the player's
attention goes to re-reading the rules instead of to the physics. One constant goal, one changing
question.

| Constant | Never changes |
|---|---|
| Source | a tap, fixed in place, pouring at a fixed rate until its budget is spent |
| Sink | a glass on the page — its dotted line is the target |
| The only variable | the ink: where you draw, how long, how many strokes |
| The win | fill + standing + budget |
| The stars | ink economy, 3 / 2 / 1 |

| Changing every chapter | The question the player must answer |
|---|---|
| ch. 1 | *Where does the water land?* |
| ch. 2 | *Where may the line go at all?* |
| ch. 3 | *How do I stop the thing that is also falling?* |
| ch. 4 | *How do I aim when "down" is tilted?* |
| ch. 5 | *How do I keep the target standing?* |
| ch. 7–12 | *How do I build a structure that holds?* |
| ch. 17 | *What is the shortest line that still works?* |

---

## 2. The three win checks

The game reports a win only when **all three** hold. They are separate on purpose.

| # | Check | The rule | What it stops |
|---|---|---|---|
| **W1** | **Fill** | every glass's water surface is at or above its dotted line — measured from real droplet positions *and* cross-checked against droplet count inside the glass | the obvious one |
| **W2** | **Standing** | every glass is still in the level (`y < H + 110`, inside the side bounds) and upright (`|tilt| < ~1.2 rad`) | a glass you filled by drowning it |
| **W3** | **Budget** | the stroke(s) fit inside the ink allowance; stars come from the three-block meter (3 ★ = under a third, 2 ★ = under two thirds, 1 ★ = fits) | the line that works but wastes the page |

**Why W2 is not optional:** without it, "knock the glass over and water it" would count as a win, and
half of chapter 5 (a glass on a slope, a glass on a pedestal) would have no puzzle at all.

**Why W3 is not optional:** without it, every level is "draw a lot of ink near the glass". The ink
meter *is* the puzzle in chapters 16–17.

### The loss conditions, stated once

| Loss | Cause | Message |
|---|---|---|
| **Spilled** | the tap ran out and the glass is still under its line | "not enough water reached the glass" |
| **Fell** | a glass left the level | "the glass fell out of the level" |
| **Tipped** | a glass passed ~70° | "the glass fell over" |

A loss must always be attributable to something the player can see. If a student cannot say *why*
they lost, the level's feedback is broken, not the student.

---

## 3. The water is a budget, not a pipe

| Number | Rule | Why |
|---|---|---|
| Tap delivery | **2.9–3.2×** the droplets the glass needs | enough slack for a line that "drinks" a little water; not enough to flood |
| Miss | a droplet that reaches the floor outside every glass is **spent** | a sloppy path loses water permanently — that is what makes the path matter |
| Drain | water at rest outside every glass is drained after ~0.6 s | a puddle that never settles reads as a bug |
| Cohesion | droplets gently pull together | a stream, not a spray |
| Ceiling | no droplet exceeds the speed where it would tunnel through the line | 4 px line vs 3.7 px/step droplets |

The hard limit: **no level may be passable only by a path that drinks more than the slack.** If the
arithmetic says the tap cannot fill the glass by any path, the level is broken, not hard.

---

## 4. The seven goal variants

All seven are still "fill the glass and keep it standing". They exist because the *middle* is where
the design lives.

| Variant | How the goal is still the same | Example |
|---|---|---|
| **One glass** | the default | 1–52 |
| **Two glasses** | *every* glass must pass W1 — so one stream must divide, or the scenery must divide it | 53, 54 |
| **Floating glass** | the glass starts with nothing beneath it; it is falling *while* it fills | 47 |
| **Two taps** | one is supply, one is a hazard; the player chooses which to feed | 51, 52 |
| **Reversed** | the tap is below the glass; water must be thrown upward | design ch. 18 |
| **Overflow** | fill the high glass; the spill fills the second — the glass is the pipe | 53 |
| **Loaded target** | the glass sits on something that changes when loaded (a sponge, a seesaw) | 58, 116 |

**Rule:** a variant may appear only after the base goal has been taught three times. No level in
chapter 1 has two glasses.

---

## 5. The scene contract — what may be on the page

| Rule | Statement |
|---|---|
| **Object count** | 3–4 objects in chapter 1, rising to 7–9 by chapter 19. Never more than 9. |
| **Nothing decorative** | every prop must change the solution. A prop that can only sit there is a bug. |
| **Nothing driven** | no moving bars, no patrols, no motors. Pinned bars and seesaws are *reactive*: they start at rest and only turn when something hits them. |
| **Physics everywhere** | the wire is heavy; an unsupported line falls; water pushes it; a glass with nothing under it drops. |
| **Supply high, glass low, the interesting band between** | the tap above the mouth, the glass on something, the puzzle in between. |
| **The glass always has a base** | a coaster, a slab, a column's cap, two walls — or it is deliberately hanging (flagged, and then the puzzle is catching it). |
| **Readable colour language** | teal = structure · grey + arrow = machine · orange = loose weight · cream = masonry · silver = reflective · ochre = porous · black = your ink · dotted = the target. |

---

## 6. The proof contract — what must be true before a level ships

Run in this order. A failure at any step means the level does not ship.

| # | Proof | The rule |
|---|---|---|
| **P1** | **Not free** | the scene must **lose** with no ink at all. If the room already wins, it is not a puzzle. |
| **P2** | **Drawable** | the reference line is sampled against the pen's own rules (2 px sink; no ink inside scenery, glass or tap housing). A line the player cannot draw is not a solution. |
| **P3** | **Wins** | played for **longer than the verifier runs** — the proof horizon must exceed `verify`'s, or the number drifts between runs. |
| **P4** | **Repeatable — six hands** | the wire is kept the same length and its shape nudged six ways (±2 to ±4 px on alternate points): **at least four of the six must win**. A pour is chaotic — droplets pack differently, and a level that only works when the wire is drawn to the exact pixel is not a puzzle, it is a coincidence. |
| **P5** | **Economical** | budget ≈ 1.35× the proved line, and no cheaper line exists that also wins (three stars must be an achievement). |
| **P6** | **Unique** | no two levels may share an asset set *and* construction *and* fault. A structure signature is compared across the whole set. |
| **P7** | **Nothing moves by itself** | the physics audit confirms: an unsupported line falls, a leaning line is not held, a free glass drops, a pile of water settles, a pinned bar starts at rest. |

### The shipped level must be the proved level

Two rounding habits in the emitter meant it was not:

| Emitted as | Turned 0.12 rad into | Effect |
|---|---|---|
| `Math.round(angle * 10) / 10` | 0.1 rad, and 0.07 rad into 0.1 | a 5 px change of slope over a plank — enough to move where the water leaves the edge |
| endpoints rounded to whole pixels | ±0.5 px at each end | the wire came to rest in a place it had never been proved to rest |

Both are fixed: angles go out with three decimals, stroke endpoints with four. A level is proved on the
same numbers the player's game loads, or the proof means nothing.

### Determinism, and why it is part of the proof

For a whole round the level count drifted between 61 and 68 out of 70 while every individual check
said "passed". The cause was not the levels. The pour itself was random:

| Random thing | Where it was | What it did |
|---|---|---|
| droplet radius, ±0.9 px | `js/water.js` | changed how the stream packed and where it slid |
| spawn offset, ±(4·spread + 1) px | `js/scene.js` | sent the same line a different stream every run |
| spawn lateral speed, ±0.55 px/frame | `js/scene.js` | the same |

So a *proved* line did not pour the same way as its own verification. Both are fixed, not hidden:

- droplets take their radius from a fixed three-value cycle — same organic look, same result;
- the stream wobbles on two sine waves at unrelated rates instead of on `Math.random` — it still
  breathes, and it is identical on every play.

The headless toolchain also runs the whole world on a seeded generator (`tools/simheadless.js`), so
`solve` and `verify` replay the same pour.

Reproducibility alone is not enough, though — a chaotic system can be perfectly reproducible and still
be a lottery for a human hand. That is what P4's six hands are for, and why `flaky` now walks the
*hand* rather than the seed: same wire, same length, shape nudged a few pixels, six times.

**A margin test was tried first and it was wrong.** `fill` at the moment of the win is `need` plus at
most one droplet *by construction*, because the simulation stops when the glass fills. Requiring
`need + 0.06` rejected all seventy levels. Robustness has to be tested as reproducibility and hand
error, not as spare water.

### The four human tests (from the teaching briefs)

| Test | Rule |
|---|---|
| **Blind-tap** | random legal lines win < 5 % of the time |
| **Calculable** | the line from a hand calculation lands within one glass-width of the answer |
| **Construction sentence** | the answer is statable in one sentence with named features |
| **Economy** | budget ≈ 1.1–1.35× the shortest proved line, so the triangle inequality bites |

---

## 7. The nine failing levels — the exact fix list

Status: **done** — all nine were rebuilt in the scene file, re-solved and re-proved. The last column records what was actually built, which differs from the plan in one place (17).

| # | Level | Rule broken | Fix |
|---|---|---|---|
| 12 | Under The Shelf | P3 + the scene contract (the shelf's projection contains the mouth: the feasible set is empty) | move the shelf 120 px left, 60 px up |
| 15 | Ice Run | "nothing decorative" — the ice cannot be used, so it does nothing | put the ice in the fall line; the chord must span it |
| 17 | Stone Step | redundant idea (heat already teaches the same loss) | **remove**; replace with a stone-rest variant of the crate-stack level |
| 19 | The Ledge | P3 — the ledge launches the water past the glass for every line | shorten the ledge to 140 px, lower the far edge |
| 20 | Split Sill | P4 — fails by 0.03; a knife-edge | widen the aperture by 30 px |
| 35 | The Drift | P3 — the wind exceeds the corridor; the solution family has collapsed | cut the blower force 30 %, move it 80 px closer |
| 40 | Weather | "one law per level" — three mechanics in a chapter that just introduced them | drop the ball; it returns in 61 |
| 50 | The Exam | W2 — the glass slides off its slope before the water arrives | add a lip so it can slide only 20 px |
| 57 | Long Arm | P5 — the ellipse test fails: with two bearings the mouth is outside the budget | add a third mid-span rest |

Plus, undoing my own shortcut:

| Fix | Detail |
|---|---|
| **Restore `need`** | levels 11, 20, 38, 51, 69, 70 were to be restored to their intended fill target. Checked: **the cut was never in the scene file.** Every one of the seventy scenes carries its chapter's intended `need` (0.55 in ch. 1–2, 0.52 in ch. 3–5, 0.50 in ch. 6–7) and `js/levels.js` matches `tools/scenes.js` line for line. The temporary reduction lived only in the throwaway solve cache, so there was nothing to revert — the levels pass at the honest target, which is the point the fix was making. |

### What was actually built

Every row is a line that has since been proved on the strict test: six twitchy hands (four must win) plus
four human hands at ±2.4 px (three must win).

| # | Built | Line / budget | Fill | Hands | Wavy |
|---|---|---|---|---|---|
| 9 | the notch widened and the glass moved under it — a chapter-1 room was asking the player to thread | 477/640 | 0.56 | 6/6 | 4/4 |
| 11 | unchanged room, re-proved at the honest target | 513/690 | 0.55 | 5/6 | — |
| 12 | shelf moved to `(580, 265)`, clear of the mouth's projection | 501/680 | 0.55 | 4/6 | — |
| 15 | ice block moved from `(760, 470)` into the fall line at `(630, 520)` | 600/810 | 0.55 | 6/6 | — |
| 17 | **not** the crate-stack clone: two stone blocks standing in the run, their flat tops as wire rests, and a lower, closer glass | 566/760 | 0.55 | 6/6 | — |
| 19 | ledge 180 → 140 px, far edge dropped, second plank pulled in | 529/710 | 0.55 | 6/6 | 4/4 |
| 20 | aperture widened 30 px by moving the sills apart | 394/530 | 0.50 | 5/6 | — |
| 29 | stone plinth under the falling ball, lower and further glass | 615/830 | 0.50 | 6/6 | — |
| 35 | blower force 0.12 → 0.085 and 80 px closer to the corridor | 587/790 | 0.53 | 4/6 | — |
| 40 | ball removed (it returns in 61) | 541/730 | 0.50 | 5/6 | 3/4 |
| 50 | lip added at the low end of the slope: the glass can slide 20 px and no more | 496/670 | 0.50 | 4/6 | 3/4 |
| 57 | third rest added mid-span, so the mouth is back inside the budget ellipse | 725/980 | 0.52 | 4/6 | — |

Two of the three structure collisions died with the restructures above: 40 no longer carries a ball, so
40/61 are no longer the same idea, and 44/64 were already separated by mouth width and approach. The
third was real and was fixed on merit rather than by nudging a coordinate: **29 "Heavy Lid"** now has a
stone plinth under the falling ball and a lower, further glass — the ball can be deflected onto the
plinth instead of into the glass, which is the lesson the name promises. 22 "Ball And Glass" stays as
it was: a ball aimed straight at the mouth is a defence problem, a ball that can be laid on a plinth is
a placement problem. Every one of the seventy signatures is unique.

### Where the seventy stand now

| Check | Result |
|---|---|
| `solve` | 70/70 with a line that survives six twitchy hands (≥4) **and** four human hands (≥3) |
| `verify` | **70/70** solved on the shipped level with the shipped coordinates |
| `flaky` | firm hand ±2.4 px: **70/70**; reference line replays clean: 70/70 |
| `physics-audit` | all checks pass (one check was moved: it had been measuring a wire resting on a plank) |
| `smoke` | all checks pass — both demo levels now draw their *reference* line instead of a line typed in an earlier round |
| build · sheet | 346 kB single file; 70-panel sheet regenerated |

## 7b. The keystone experiment — a negative result, kept

The 200-level design proposes a masonry arch whose missing keystone the player's ink replaces. I built
it and it does not work. The result is recorded because it is the kind of thing that otherwise gets
re-attempted every few months.

**What was built.** `buildArch()` in `js/scene.js`: *n* tangent voussoirs of a given radius and
thickness, radial joints, a configurable number of missing blocks, springing on two static piers whose
tops were measured off the lowest voussoir rather than computed from the nominal radius (the first
version left a few pixels of daylight under the springing and the whole ring dropped before the player
drew anything).

**What was measured** — maximum displacement of any voussoir after 4 s:

| Configuration | Variants tried | Result |
|---|---|---|
| full ring, loose blocks, 9–17 voussoirs | 12 | collapses (`>14 000 px`, out of the level) |
| ring with one gap at the crown | 12 | collapses |
| gap at a haunch (`at` = 1, 2) | 24 | collapses |
| ink rod in the gap: 5 heights × 4 widths × 2 gap positions | 40 | collapses, **exactly like the no-ink control** |
| springing voussoirs fixed into the abutment | 8 | collapses |
| voussoirs packed (`press` 0.5–3 px of pre-compression) | 24 | collapses |

**Why it cannot work here.**

1. **Geometry.** Two rectangles cut on radial joints meet at a *point*, not along a face. A ring of them
   is a chain of hinges, not an arch.
2. **Time.** A dry arch develops its thrust over a load path that needs a static problem solved; a
   1/60 s rigid-body step with `slop 0.04` gives the blocks one frame to press on each other before they
   are already moving. Once a ring is a mechanism it is a mechanism — you cannot un-drop it.
3. **Shape.** This is the one that decides it: **a keystone is a wedge; the ink is a uniform rod.** In a
   crown gap with parallel faces, a rod has nothing to grip and slides out. Every alternative needed the
   ink to be a special shape in one level, which breaks the first rule of the game.

**What was shipped instead.** Loose masonry: rectangular stone blocks (`kind: 'stone'`, any `w × h`),
released by the level, caught on the player's wire, and laid flat as a plug. Same chapter, same civil
voice, and it is true — the player does not move the stone, they build the chute.

The lesson for the remaining assets: **test the asset in isolation before designing levels on it**, and
report the negative result rather than tuning until something merely passes.

---

## 8. Definition of done

A chapter is done when:

- [ ] all ten levels pass P1–P7
- [ ] `verify` reports 10/10 with the horizon longer than the proof horizon
- [ ] `flaky` reports 10/10 across four replays
- [ ] the physics audit passes
- [ ] the level sheet regenerates and every panel shows a real pour
- [ ] each level's construction can be said in one sentence with named features
- [ ] nothing on the page is decorative

The whole 200-level game is done when that is true, twenty times, with no two rooms built the same way.
