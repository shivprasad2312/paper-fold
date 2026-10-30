# Seventy levels taught by a geometry teacher

The physics brief answered *what forces are at work*. This one answers a different question, and for
a geometry teacher it is the more fundamental one:

> **Every level is a construction.** The student is not "drawing a line that works" — they are
> identifying which construction the room is asking for, and executing it between named points.

That reframing is the whole document. Seventy levels, six constructions. If a level cannot be named
as one of the six, it is a level that rewards guessing and I will not ship it.

---

## 0. The reduction: six constructions

Everything the game asks for is one of these, applied to a particular arrangement of objects.

| # | Construction | What it means on the page | Course tool |
|---|---|---|---|
| **C1** | **The chord** | Join two supports with one straight run. The wire is a chord of the polygon formed by the scenery. | Straight line, slope, distance formula |
| **C2** | **The broken chord** | Two runs meeting at a support. A bend is a vertex of a polyline. | Triangle inequality, angle between lines |
| **C3** | **The tangent** | Touch something without crossing it: the wire resting on a ball, a rim, a sill. The contact is the foot of the perpendicular from the centre. | Tangency, perpendicular distance from a point to a line |
| **C4** | **The perpendicular** | Drop straight down onto a target — through a notch, into a chimney, past a ceiling. | Projection, angle with the vertical |
| **C5** | **The mirror** | A bounce. Reflect the target across the surface; the straight line to the image gives the bounce point for free. | Reflection, Heron's shortest path |
| **C6** | **The change of axes** | A tilted frame, so that "down" is no longer straight down. | Rotation of axes, change of basis, vectors |

Chapter 1 is almost entirely **C1** with a bad first attempt at C1 that has one contact (a line through
one point is a pencil of lines, not a line — that is the geometry lesson of L1). Chapter 2 introduces
C2 and C3. Chapter 3 is C3 and C5. Chapter 4 is C6. Chapter 5 is C4 and the toppling-projection test.
Chapter 6 is C2 with an extra vertex. Chapter 7 shuffles the deck.

### The one sentence a student should be able to say

> "I have two points that must be on the line, and one direction that must be its slope. Two points
> determine it; one point and a direction determine it. Anything else is a guess."

That is the entire design discipline of chapter 1 in one line, and every level that breaks it gets
rebuilt.

---

## 1. What "applying geometry" looks like, measurably

Four tests. A level that fails any of them is a level that rewards luck, and I will redesign it rather
than ship it.

### Test 1 — The Construction Test

**The winning line must be describable in one sentence using the names of objects on the page.**

- ✅ *"Extend the top edge of the wedge until it meets the far sill."*
- ✅ *"Join the left edge of the upper plank to the right edge of the lower plank."*
- ❌ *"Start at (412, 258) and end at (795, 341)."*

If the only way to state the answer is with coordinates, the question is not geometric. **A level
whose solution is an arbitrary offset from every named feature is a lottery with a nice picture.**

This is the test I would apply most strictly, because it is the one that catches the levels I am
tempted to keep: the ones where a line "roughly here" works. Those teach that the drawing is made by
feel. It is not.

### Test 2 — The Slope-Read Test

**The angle of the line must be readable from the drawing with a protractor, or derivable from two
visible points.**

If two named features (say the mouth's near rim and the tap's base) determine the intended slope, the
student can *measure* it and confirm before drawing. If the intended slope sits between every pair of
features, the level is asking for a feel that only repetition gives.

### Test 3 — The Symmetry Test

**If the scene is symmetric, the solution must be symmetric.**

A mirrored room with an asymmetric answer is a room that lies to the eye. This matters most in the
fork levels (54) and the split-sill levels (20). A student who spots the symmetry should be *rewarded*
with half the work, because that is exactly what symmetry is for.

### Test 4 — The Triangle-Inequality Test (the ink meter)

**A straight path is shorter than a bent one, and the budget must make that matter.**

The ink meter is not decoration — it is the triangle inequality made visible. Joining two supports
directly is always cheaper than routing through a third, and *that* is the three-star solution. If the
budget is so generous that the bent path also gets three stars, the inequality is not being tested.

Concretely: the budget for a level should be about **1.1× the straight path**, so that a student who
bends without needing to loses a star and feels why.

---

## 2. The three big geometric ideas of the whole set

### 2.1 The trajectory is a conic, and the glass is a target disc

The water's path after it leaves the line is a **parabola**. It has a focus, a directrix, an axis —
the lot. The mouth of the glass is a **disc** in the plane. The question "where do I put the line" is
therefore:

> *Which member of the family of parabolas passing through my release point also passes through the
> target disc?*

The answer is not a point, it is a **family** — and that is the single most important thing a student
learns here. There is not one right answer; there is a range of release directions that work, and the
range is why the level is solvable by a human. A level where the range has collapsed to a single
direction (L35 The Drift, before it is fixed) is a level with no family left — no tolerance, no
learning, just a lottery.

**Design rule that follows:** every level must have a *visible tolerance*. The family should be wide
enough that "right idea, slightly wrong angle" still wins, and narrow enough that "no idea" loses.

### 2.2 The mirror trick — the level that teaches Heron's problem

The bouncy-ball level (23) is the most elegant thing in the set for a geometry teacher, because it has
a one-line construction that a 12th-class student knows from the shortest-path problem:

> To bounce off a line and reach a target, **reflect the target in the line** and draw the straight
> segment from the ball to the reflection. Where it crosses the line is the bounce point — by
> congruent triangles, the two angles are equal, so it *is* the law of reflection.

So the level is not "try a line and see if the ball bounces into the glass". It is: *place the line so
that the straight line from the ball to the mirrored glass crosses it.* That is a construction with a
ruler and a compass, and the student can do it before touching the screen.

**Design rule that follows:** any bounce level must have the mirror construction as its intended
solution, and the tip must never mention it. The reward is for seeing it.

### 2.3 The ellipse — the reachable set of the pen

This is the idea I am proudest of, and it is true of our game in a way it is not true of the original.

A stroke of fixed ink budget, with one end that must rest on a support at A and one at a support at B,
can have its free end anywhere inside an **ellipse with foci A and B** — because a point P is reachable
exactly when AP + PB ≤ budget, which is the definition of an ellipse. The pen's reach is a family of
ellipses, one per budget.

Practically this answers the question a student actually asks: *"can I even reach the glass from
here?"* — and it is a counting question, not a drawing question. It is also the honest way to build
levels: **the glass must lie inside the ellipse of the intended supports at the intended budget, and
outside the ellipse of every cheaper pair.** That is a level-design constraint that can be checked.

**Design rule that follows:** a long-span level (57 Long Arm) is not a *drawing* problem, it is a
*reach* problem — and if no pair of supports puts the mouth inside the budget ellipse, the level is
impossible, not hard. This is exactly why 57 fails today.

### 2.4 And the counter-idea: the water's path does not scale with the drawing

Every student's instinct is that if you double the drawing, everything doubles. It does not, and the
game punishes it immediately.

The release speed goes as √h, so the trajectory's linear term scales with h while its curvature term
scales as 1/h. **A scaled-up copy of a working drawing does not work.** The path is a conic, and the
family of conics from a ramp is not closed under similarity of the *scene*.

That is a beautiful, slightly uncomfortable fact, and it is worth a whole lesson: *similar figures
preserve shape, but the trajectory is not a similar figure of the scene — it is determined by the
scene through a square root.* I would put that on the board the day I introduced chapter 1.

---

## 3. Chapter 1 — The Pour (1–10): the chord, and why one point is not enough

**Geometry taught:** the straight line, slope as tan of an angle, two points determine a line, and the
difference between *touching* and *resting*.

**The lesson of the chapter:** a line through one point is a *pencil* of lines. Nothing is decided. A
line through two points is *determined*. So every working answer in this chapter is C1 — a chord
between two named points — and the whole chapter is about learning to find the two points.

| # | Level | Geometry on the page | The construction | Misconception it catches |
|---|---|---|---|---|
| 1 | **First Pour** | Two offset planks, one tap, one glass | C1: chord from the near plank's inner edge to the far plank's outer edge | *"A line touching one thing is fixed."* — a pencil of lines is not a line |
| 2 | **The Weight** | Same chord, plus a circle above it | C1 + C3: the chord must also be tangent to the ball's fall line | *"The ball will roll away."* — the contact is the foot of the perpendicular |
| 3 | **The Staircase** | Three parallel-ish planks, descending | C1 between step 1 and step 3; the chord is shallower than either step | *"Follow the steps."* — the chord of two edges is not either edge |
| 4 | **The Wedge** | A slab with a long top face at ~20° | C1 from the plank's edge **onto** the wedge face; congruence lets you read the wedge's slope and reuse it | *"I must draw the whole path."* — an existing edge is a free construction |
| 5 | **The Gap** | Two planks 300 px apart, glass off to the side | C1 with an off-page vertex: the chord's extension is the release direction | *"The line must reach the glass."* — the answer is a direction, not a segment to the target |
| 6 | **The Column** | A column with a horizontal cap | C1 resting on the cap; the column's *side* is a line, not a support | *"Touching = held."* — a vertical face offers no upward reaction |
| 7 | **The Chimney** | Two walls, parallel, a mouth between | C4: the release must be near-perpendicular to the mouth | *"Aim at the gap."* — you aim the *direction* through the gap |
| 8 | **Step Down** | A shelf overhanging the glass | C1 ending before the shelf's near edge | *"The nearest surface is the best surface."* |
| 9 | **The Notch** | A slab with an aperture | C4 through a point; the aperture is a stricter target than the glass | *"The glass is the target."* — the target is the narrowest constraint |
| 10 | **The Long Drop** | High tap, angled second plank | C1 where the second plank's **angle** is chosen to match the release direction | *"Extend everything."* — sometimes you shorten to steer |

**The board work I would set:** *"Two planks, one at 7° and one at 9°, 230 px apart. Is the chord
between them steeper or shallower than either?"* (Shallower — and that is why the staircase level is
easier than it looks.)

---

## 4. Chapter 2 — The Obstacle (11–20): broken chords, tangents, and degenerate cases

**Geometry taught:** the broken chord and the triangle inequality; tangency and the foot of the
perpendicular; angle of repose (tan θ = μ); and — the important one — recognising when an intersection
is **empty**.

**The lesson of the chapter:** constraints can be satisfied individually and still have no common
solution. A shelf above the mouth and a stream that must arrive vertically cannot both be true. The
student must learn to check for an empty set *before* drawing. That is not a physics skill, it is a
geometry skill, and it is the one most often missing.

| # | Level | Geometry | The construction | Misconception |
|---|---|---|---|---|
| 11 | **Over The Wall** | A vertical wall crossing the corridor | C1 over the wall with **two** contacts, one either side | *"A wide flat top is a good support."* — resting on the wall alone gives one contact |
| 12 | **Under The Shelf** | A wide shelf *directly above the mouth* | — | The constraint set is **empty**: no chord clears the shelf and reaches the mouth. This level teaches nothing because there is no solution to find |
| 13 | **The Funnel** | Two converging walls | C4 down the **axis** (the angle bisector of the two walls) | *"Bounce off one wall."* — each bounce is a reflection that costs energy you did not budget |
| 14 | **Crate Stack** | Two square crates, different heights | C2: one vertex on the lower crate, one end on the upper | *"Solid things are obstacles."* — a corner is a point; two corners are a construction |
| 15 | **Ice Run** | An ice block under the gap | C1 that *clears* the ice — the ice is a hole in the usable set | *"A solid surface supports anything."* — support depends on friction, not existence |
| 16 | **The Sill** | A 60 px sill jutting out | C3: the sill is a fulcrum, so the chord must be tangent-and-balanced | *"Short and wide are the same thing."* — a short support is a pivot |
| 17 | **Stone Step** | A stone block under the mouth | C1 ending *before* the block's near face | *"Hard surfaces bounce usefully."* |
| 18 | **The Trench** | Two vertical walls, glass between | C4 over the lip, then vertical | *"Get over the wall and you are done."* — the entry angle is the second constraint |
| 19 | **The Ledge** | A 260 px ledge | C1 onto the ledge, then C1 along it: a **two-chord** path, and the second chord is the ledge itself | *"More line = more control."* — the scenery is a free segment |
| 20 | **Split Sill** | Two sills, a gap between | C4 through the gap; the gap is a chord-endpoint, not a region | *"Aim at the middle of the glass."* — aim at the narrowest aperture |

**Board work:** *"Draw two parallel sills 140 px apart with a 60 px gap. Mark the region of release
directions that pass through the gap and reach the floor 200 px below."* The region is a cone; the
student who draws the cone has the answer.

---

## 5. Chapter 3 — The Weight (21–30): circles, tangency, and the mirror

**Geometry taught:** the circle and its tangents; the foot of the perpendicular; **reflection** and
Heron's shortest path; and congruence of the two triangles formed by a tangent.

**The lesson of the chapter:** a circle is not an obstacle, it is a *set of directions*. Everything a
ball can do to your line happens along a radius, and the contact point is the foot of the
perpendicular from the centre to the line. Once a student sees that, every ball level becomes a
one-line construction.

| # | Level | Geometry | The construction | Misconception |
|---|---|---|---|---|
| 21 | **Dead Weight** | A circle above the chord | C1 with a **tangent** circle sitting on it: the chord must be tangent to the ball's drop line | *"The weight is a threat."* — a tangent point is a support |
| 22 | **Ball And Glass** | A circle above the mouth | C1 through the ball's drop point, so the ball's *image* falls short of the glass | *"Aim at the mouth."* — you steer the ball, not the water |
| 23 | **Rubber Ball** | A light circle, a glass, a bounce | **C5, the mirror**: reflect the glass in the line; the straight segment from the ball to the mirror image is the answer | *"Meet it head on."* — the reflection construction is a one-liner nobody sees |
| 24 | **The Brace** | A circle resting on a chord | C3: the perpendicular from the circle's centre meets the chord at the contact; two contacts make it stable | *"Every loose object is a hazard."* — a resting circle is a clamp |
| 25 | **Ball Run** | A circle on an inclined plane | C1 onto the plane's face: the plane decides the path, the circle only gives the offset | *"The ball falls straight down."* — it follows the incline's direction |
| 26 | **Two Weights** | Two circles of different sizes | C1 sized so both tangents fit; the *smaller* circle sets the tighter constraint | *"Bigger is the problem."* — the smaller circle is the tighter tangency |
| 27 | **The Plug** | A circle and a gap of the same width | C3 at the limit: the gap's two edges are **parallel tangents** to the circle | *"Block the gap with ink."* — a circle that fits a gap is a free wall |
| 28 | **Ball Trap** | A U-shaped bowl | The bowl is a **potential well** in a picture sense: its mouth is a chord, and the chord is the water's path | *"Rescue the ball."* — you only need to keep the water out |
| 29 | **Heavy Lid** | A circle directly over the mouth | C1 that misses the circle's vertical projection: the **orthogonal projection** of the ball onto the floor is forbidden | *"Pour into a covered mouth."* |
| 30 | **The Keeper** | Two circles, one constraint | C1 tangent to the larger, clear of the smaller's projection | *"Both are equally in the way."* — one is a tangency, one is a clearance |

**Board work:** *"A ball 30 px above a line is to be deflected so it lands 120 px left of the glass.
Where must the line be?"* With the mirror construction this is a one-step reflection. Without it, it
is invisible.

---

## 6. Chapter 4 — The Machine (31–40): change of axes

**Geometry taught:** **rotation of axes.** This chapter is the geometry teacher's favourite, because
it has a single, clean, teachable construction.

> A blower is a force with a direction. Gravity is a force with a direction. Their resultant is a
> single direction. **Rotate the axes so that the resultant points straight down** — and the problem
> becomes chapter 1 again.

If the wind is 1/3 of gravity, the new "down" is tilted by arctan(1/3) ≈ 18°. Every parabola in that
room is simply a parabola in a rotated frame. The student who rotates the sheet 18° solves the level
on paper; the student who does not fights it.

That is the strongest single idea in the game for geometry, and it is worth this whole chapter.

| # | Level | Geometry | The construction | Misconception |
|---|---|---|---|---|
| 31 | **Crosswind** | A constant sideways force | **C6**: rotate by arctan(a/g); solve as C1 in the new frame | *"Aim at the glass."* — aim along the tilted axis |
| 32 | **Wind Shadow** | A block shadowing a region | The shadow is a **projection**: the forbidden set is the block projected along the wind | *"Oppose the wind with a wall."* — leave the projected region |
| 33 | **Updraft** | An upward force from the floor | C6 the other way: the effective drop is smaller, so the family of parabolas is **flatter** | *"The wind does not change the drop."* — it changes the effective height |
| 34 | **Fan And Ball** | A force and a circle | C6 first (rotate), then C3 (tangent) — two steps, in that order | *"Solve both at once."* |
| 35 | **The Drift** | A long corridor, strong crosswind | C6 with an **18°+ tilt**: the release must move upwind by the drift | *"Compensate a little."* — the drift is a systematic offset, not noise |
| 36 | **Two Blowers** | Opposed forces | C6 twice: the null direction is the **angle bisector** of the two force directions | *"Shelter at one edge."* — the still line is in the middle |
| 37 | **Hot Plate** | A heated floor | The plate is a forbidden region; the chord must project **clear** of it | *"Spill is harmless."* |
| 38 | **Steam Room** | Two forbidden regions | The chord must lie **outside the union** of two projections | *"One clean pass is enough."* |
| 39 | **The Lid** | A free bar (a rotating line) | The bar's axis is a line that **rotates about a point** — a locus, not a wall | *"The bar will stop the water."* — it turns instead |
| 40 | **Weather** | Wind + heat (+ a circle) | C6, then clearance, then tangency — an ordered composition | *"Fix everything at once."* |

**Board work:** *"The wind is a third of gravity. By what angle does the trajectory's axis tilt, and
does the range increase or decrease?"* (Theorem: rotating the frame leaves the parabola a parabola;
the range along the tilted axis is what changes.)

---

## 7. Chapter 5 — The Glass (41–50): projection, and the stability test

**Geometry taught:** **orthogonal projection** — specifically, the projection of a centre of mass onto
the base. This is the geometric statement of toppling:

> A body stands while the **vertical projection of its centre of mass falls inside its base**. It tips
> when the projection leaves. Nothing else in the chapter matters more than that sentence.

And the second idea: **the target is a disc, not a point.** Landing on the rim is landing on the
boundary of the base — the worst possible place, because it is the edge of stability.

| # | Level | Geometry | The construction | Misconception |
|---|---|---|---|---|
| 41 | **Glass On A Slope** | A base on an inclined line | The projection of the CM must stay inside the base as the base tips: a **margin** question | *"Feed it and it will stay."* |
| 42 | **Glass In A Gap** | A base formed by two walls | The base is the **segment between the walls**, not the floor | *"It needs a floor."* — the walls are its base now |
| 43 | **Edge Of The World** | A base ending at an edge | The margin is a **distance from a line**; the answer is "land centrally" | *"Anywhere in the mouth is fine."* |
| 44 | **Narrow Neck** | A narrow aperture above a disc | C4 (perpendicular) at a tolerance of about 30 px | *"The glass is the target."* — the neck is |
| 45 | **Tipping Point** | A seesaw: a line rotating about a pivot | **Moments as areas**: the load's distance to the pivot is the arm; putting water near the pivot is minimising the arm | *"Anywhere on the plank."* |
| 46 | **Cup On A Column** | A disc balanced on a narrow base | Projection test: the CM's vertical must fall inside the column's width | *"The rim is a good target."* — the rim is the tipping edge |
| 47 | **Hands Off** | Nothing under the disc | C3: catch it below its centre, tangentially, or it rotates | *"Catch the rim."* |
| 48 | **Low Ceiling** | A horizontal line above the disc | The chord must **project outside** the ceiling's span | *"Pour through it."* |
| 49 | **Deep Cup** | A tall disc | The entry direction must be within a **cone** about the vertical | *"Any opening in the top."* |
| 50 | **The Exam** | A slope, a disc, a circle | Composition: projection test + tangency | *"Protect the line."* — the glass is what breaks |

**Board work:** *"A base is 60 px wide, the CM is 25 px off centre. Draw the two extreme verticals and
state whether it stands."* That is the exam question, and it is pure geometry.

---

## 8. Chapter 6 — Two Bodies (51–60): more vertices, and the reach ellipse

**Geometry taught:** polylines and the triangle inequality (properly this time), the **ellipse as a
locus of constant path length**, and the angle bisector as the split direction.

**The lesson of the chapter:** two constraints on one curve means the curve must be *longer*, and
length is the thing you are being charged for. This is where the ink meter becomes a geometric
instrument rather than a score.

| # | Level | Geometry | The construction | Misconception |
|---|---|---|---|---|
| 51 | **Twin Taps** | Two sources, one target | Choose the source whose **ellipse** contains the mouth within budget | *"Serve both."* |
| 52 | **Second Spout** | Two sources, one of them unwanted | The unwanted source's projection is a forbidden region | *"It is a bonus."* |
| 53 | **Overflow** | Two discs, one above/behind the other | C4 into the upper disc; the overflow is a **translation** of the answer | *"Aim at both."* |
| 54 | **Two Glasses** | One source, two discs, symmetric | The **angle bisector** of the two directions; the apex sits beneath the tap | *"Two separate lines."* |
| 55 | **Hands And Pins** | A free bar crossing the corridor | C2 around the bar, or C3 to pin it | *"Pour onto the bar."* |
| 56 | **Rejoin** | Two paths to one target | The shorter path is the chord: compare the two by **length**, not by looks | *"Draw both."* |
| 57 | **Long Arm** | A 400 px span, two foci | **The ellipse test fails**: with two contacts the mouth lies outside the budget ellipse, so a third contact is *required* | *"One long line is fine."* — long spans need more vertices |
| 58 | **Lever** | A beam pivoting on a point | Moments as **signed distances** from the pivot | *"Put the water on the beam."* |
| 59 | **The Pivot** | A bar pinned at a point | The bar sweeps an **arc** — a locus, and the water meets it tangentially | *"The bar is a floor."* |
| 60 | **Halfway Exam** | Two taps, a pivot, a narrow mouth | Composition, with the order: choose, then aim, then clear | *"Solve in any order."* |

**Board work (the best one in the set):** *"A pen has 800 px of ink and must touch supports at
(400, 290) and (780, 380). Draw the boundary of the region it can reach."* They will discover, with a
ruler and a piece of string, that it is an ellipse. Pin the string at the two foci and it draws
itself.

---

## 9. Chapter 7 — The Exams (61–70): composition, with the order stated nowhere

No new constructions. Each level composes two, and the *order* of composition is the exam.

| # | Level | Constructions composed | The order that works |
|---|---|---|---|
| 61 | **The Machine Room** | C6 + C3 | Rotate the axes, then place the tangent |
| 62 | **Narrow World** | C6 + C4 | Rotate, then aim through the neck |
| 63 | **Slippery When Wet** | C1 + projection test | Chord first, then check the glass's base |
| 64 | **Needle** | C4 + long C1 | Perpendicular through the neck, chord for the reach |
| 65 | **Two Storeys** | clearance + C6 | Clear the ceiling, then rotate |
| 66 | **The Gauntlet** | clearance + C5 + C3 | Budget, mirror, tangent |
| 67 | **Uphill** | C1 with a **negative** drop | The release direction must point *up*: the chord's extension crosses the mouth's level |
| 68 | **The Vault** | C4 + C1 | Through the aperture, then fall |
| 69 | **Last Light** | C6 + arc | Rotate, then meet the bar's arc |
| 70 | **Grand Finale** | all four | Rotate, clear, tangent, aim |

---

## 10. The nine failing levels, read as geometry

Same nine as the physics brief, same decisions — but the diagnosis is geometric, and it is sharper.

| # | Level | Geometric diagnosis | Decision |
|---|---|---|---|
| 12 | **Under The Shelf** | The shelf's span **contains the mouth's orthogonal projection**. Every chord that clears the shelf misses the target. The feasible set is empty. | **Restructure** — shift the shelf 120 px left, 60 px up: the forbidden region stops covering the target |
| 15 | **Ice Run** | The ice is inside the *useful* region, not the forbidden one — a surface that cannot be used is a hole in the set, and the chord must bridge it | **Restructure** — put the ice under the fall line so the chord must span it |
| 17 | **Stone Step** | The block sits under the *only* release direction that reaches the mouth: it does not narrow the family, it deletes it | **Remove** — the idea is better carried by 37 |
| 19 | **The Ledge** | The chord along a 260 px ledge has a slope so shallow that its extension leaves the target disc entirely; the family of solutions is empty | **Restructure** — shorten to 140 px and lower the far edge |
| 20 | **Split Sill** | The aperture is 10 px wide against a 30 px tolerance: the family has collapsed | **Restructure** — widen the gap 30 px |
| 35 | **The Drift** | The tilt is ~25°, so the drift exceeds the corridor: the family of parabolas misses the disc for all but one direction | **Restructure** — reduce the force so the tilt is ~12° |
| 40 | **Weather** | Composition of three; the order is not discoverable, so the level rewards a lucky ordering | **Restructure** — drop the ball; composition of two is the teachable size |
| 50 | **The Exam** | The base moves before the water arrives: the target is not where the geometry says it is | **Restructure** — add a lip so the base translates only 20 px |
| 57 | **Long Arm** | **The ellipse test fails.** With two foci and the budget, the mouth is outside the reachable ellipse. The level asks for something the pen cannot do | **Restructure** — add a third contact, which is exactly the lesson (long spans need more vertices) |

---

## 11. A proposal: a geometry mode (teaching aid, not a cheat)

If this is to be used in a classroom, the most valuable addition is a **toggle that shows what a
geometry student would measure**:

- the **angle of every surface**, in degrees, drawn on the surface;
- the **release direction** of the water as an arrow at the end of the line, with its angle;
- a **protractor** the player can drag between two points;
- the **trace** of the last pour, as a dotted parabola — so the student can see that it *is* a conic.

It changes nothing about the physics or the solutions; it just makes the drawing measurable, the way
a ruler on a worksheet does. Off by default, one button, and only after the level has been failed
once — otherwise it gives the answer away.

I would also print, for the teacher, a one-page **answer key of constructions**: for each of the 70
levels, the construction in one sentence (C1 through C6) and the two named points it joins. That is
the worksheet, and the game is the marking scheme.

---

## 12. How I would mark a student's solution

Four questions, in order — all of them geometric:

1. **Did they find two points?** Or did they draw from one and hope?
2. **Did they read an angle before drawing?** A correct line drawn first time means they measured; a
   correct line found on the sixth attempt means they searched.
3. **Did they use an existing edge?** A student who reuses the wedge's slope understands congruence;
   one who draws parallel to it does not.
4. **Did they take the shortest path?** The ink meter is the triangle inequality, and three stars
   means they took the chord instead of the detour.

A student who wins with one star has solved the level. A student who wins with three has solved the
*geometry* of the level. Those are different achievements, and the score already distinguishes them —
which is the only reason the three-star scale is worth having.
