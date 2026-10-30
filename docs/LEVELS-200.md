# Two hundred levels, designed by four teachers at once

A design document. No code.

Four people sit at this table and none of them can be ignored, because each one catches a different
kind of bad level:

| Role | What they bring | The failure only they catch |
|---|---|---|
| **Game designer** | pacing, readability, the first ten seconds | a level that is correct but boring |
| **Physics teacher** | the law being tested, and the misconception it kills | a level where the answer does not follow from physics |
| **Geometry teacher** | the construction and its tolerance | a level whose only solution is a coordinate |
| **Civil engineer** | structures, supports, load paths | an arrangement no builder would ever accept as stable |

**The rule of four:** a level ships only when all four sign it. Written as a checklist:

1. **Designer:** a stranger understands the goal in 3 seconds and the obstacle in 10.
2. **Physicist:** exactly one law decides the answer, and it is on the 12th-class syllabus.
3. **Geometer:** the winning line is statable in one sentence using named features.
4. **Engineer:** the structure stands up for a reason a builder could name — no magic, no wishful
   contact.

Anything that passes three of four gets rebuilt. That is what happened to the nine levels that
currently fail: they all failed the engineer.

---

## Part 0 — What "intelligence" means here, so it can be marked

Four measurable tests, applied to every one of the 200:

| Test | Pass condition | Why |
|---|---|---|
| **Blind-tap** | random legal lines win **< 5 %** | if flailing works, physics is not in the loop |
| **Calculable** | the line from a hand calculation lands within one glass-width of the known answer | the intended path must be findable by reasoning |
| **Construction sentence** | the answer can be said in one sentence with named features | otherwise it is a coordinate lottery |
| **Economy** | budget ≈ 1.1× the shortest proved line | the ink meter is the triangle inequality; it must bite |

And one more that is specific to this document:

| **Newness** | no level may reuse another's asset set *and* construction *and* fault | 200 levels must not feel like 20 levels repeated |

---

## Part 1 — Six levels designed level by level

Written out in full, in order of difficulty, each one seen by all four roles. This is the method;
the remaining 194 follow the same shape and are tabulated in Part 3.

---

### Level 1 — "First Pour"

**The page.** A tap high left. A glass on the right, sitting on a small stone pedestal. Two teal
planks at a shallow angle, one under the tap, one past it, with a gap between them.

**Physics teacher.** The lesson is not the projectile yet — it is *support*. A body with one contact
is free to rotate about that contact; with two, it is held. I want the student to feel that a line
resting on one plank is not a chute, it is a see-saw with an invisible pivot. The projectile comes
from the fact that the water leaves at the end, but I will not say so until Level 4.

**Geometry teacher.** This is the first and most important construction of the course: **two points
determine a line.** The two points are the inner edge of the near plank and the outer edge of the far
plank. A line through one point is a pencil of lines — infinitely many, none of them decided. I want
the failure mode to be visible: draw from the tap down to one plank, and the line swings.

**Civil engineer.** No builder puts a beam on a single bearing. A single bearing is a hinge. There is
no such thing as a one-support span in a real structure, and there should not be one here.

**Game designer.** The first level must be winnable in under a minute and must not look like a
tutorial. Two planks, one gap, a glass. The gap is where the pen goes, so the composition does the
teaching.

**Intended line.** From the near plank's inner edge to the far plank's outer edge; the water runs the
chord, leaves at the far edge, and drops into the mouth.

**Trap.** Resting only on the near plank. The line pivots, its far end swings down, and the water
falls short — and because the student *sees* the swing, the lesson lands without a word of text.

**Wrong idea being killed.** *"A line touching something is fixed."*

**Stars.** 1★ win; 2★ within budget; 3★ within 1.1× of the straight chord — which means resisting the
urge to extend the far end "just in case".

---

### Level 2 — "Two Points"

**The page.** No second plank. Under the tap there is a plank; past it, a stack: **a crate** with a
flat top. The glass sits beyond the crate.

**Physics teacher.** Same law as Level 1, deliberately. I do not introduce a second law until the
first has been used twice. What is new is that the two supports *look* different — one is a long bar,
one is a box — and the student must recognise the same physics in a different shape.

**Geometry teacher.** Same construction, different assets: **C1, chord**. But now I teach the second
half of the sentence: *a support is an upward-facing surface, and the usable part of it is its
top.* The crate's top edge is a segment; its corner is an endpoint of that segment. This is where a
student learns to see a box as a *set of segments*.

**Civil engineer.** A bearing on masonry is a bearing on masonry. The crate is just a pier with a
square profile. The engineer's contribution to this level is that the pier's top is flat, so the
contact is a *line*, not a *point* — which means a little tolerance. That tolerance is the level's
fairness.

**Game designer.** Repeating the construction with new furniture is how a game teaches without a text
box. The crate also gives the level a silhouette that reads instantly: bar, box, glass.

**Intended line.** From the plank's inner edge, across the gap, onto the crate's top near corner.

**Trap.** Aiming the line *at the glass* rather than at the crate. The glass is not the target — the
release point is.

**Wrong idea being killed.** *"Support means a plank."*

---

### Level 3 — "The Staircase"

**The page.** Three short teal planks descending left to right like steps. Tap above the first.
Glass beyond the third.

**Physics teacher.** Now the *slope* is the decision variable rather than the endpoints. Water
accelerates down the first run and flies; the steeper it is, the faster and flatter-and-further it
goes. A three-step staircase invites the wrong answer (follow the steps) and rewards the right one
(join step 1 to step 3, a chord shallower than either).

**Geometry teacher.** The chord of two points on a staircase is **shallower than either step** — this
is a real statement about chords and I want it demonstrated physically, not asserted. It is also the
first level where the student *chooses* which two points to join, out of three: the construction is
not given, it is selected.

**Civil engineer.** A staircase is a series of bearings. The engineer's note: three bearings and one
beam is **statically indeterminate** — more supports than equations. That is why this level is the
first with a *choice*: a real beam spanning three supports can lift off one of them, and so can this
line.

**Game designer.** First level with a real decision inside the construction, and still cheap to
retry. The stairs are also the first "shape joke": the obvious path follows the stairs and loses.

**Intended line.** Step 1's outer edge to step 3's outer edge.

**Trap.** Following the staircase — three short strokes, or one stroke with two bends both on stairs.
It works mechanically but the release is steeper and the water overshoots.

**Wrong idea being killed.** *"Follow the given path."*

---

### Level 4 — "The Wedge"  *(the level that teaches the trajectory)*

**The page.** A short plank under the tap, then a **large teal wedge** whose long face runs down to
the right at about 20°. Glass at the bottom right, past the wedge's toe.

**Physics teacher.** Here is where I finally teach the projectile, and I teach it as a *surprise*:
the water does not run off the wedge's toe and fall — it **flies**. The release direction is along the
wedge face, so the water leaves at 20° below horizontal with the speed it built on the face. That is
the chapter's central fact and this level exists to deliver it.

**Geometry teacher.** The construction is **reuse**: the wedge already supplies a slope, and I want
the student to *read its angle off the page* and land their line **on** it, not parallel to it. This
is congruence made physical — the free face is an edge of the polygon, and using it is cheaper than
drawing it. The honest way to say the solution: *"extend the plank to meet the wedge's face."*

**Civil engineer.** A wedge is the oldest structure there is: an inclined plane in compression. It
also has a discrete *toe* — and the toe is where the water leaves, so the toe is a geometric feature
the student must locate. That is the engineer's gift to this level: **the release point is a named
corner.**

**Game designer.** The wedge is the biggest object yet, and it does the most work. This is the level
where the game starts looking *designed* rather than assembled — one large mass, one small feeder.

**Intended line.** Plank's outer edge onto the wedge's upper face, ending well before the toe.

**Trap.** Drawing a second ramp alongside the wedge. It works, costs double the ink, and produces a
slower release — so the water lands short.

**Wrong idea being killed.** *"I have to draw the whole path myself."*

---

### Level 5 — "The Gap"  *(the level that teaches extension)*

**The page.** Two planks, 300 px apart, at a shallow common angle. The glass is not between them — it
is far to the right, beyond the second plank's end, and *lower*.

**Physics teacher.** The range is now much larger than the visible geometry: the release point is on
the second plank's end and the flight covers more than a glass-width. This is where the student must
internalise that **range grows with the square root of the drop height, and with flight time**. The
temptation is to end the line near the glass; the answer is to end it early and let physics travel.

**Geometry teacher.** The construction is the **extension** — the chord's *direction beyond its
endpoint* is the release vector. The student must draw a segment to a point that is not the target,
and understand why. Geometrically: the target is on a parabola whose tangent at the release point is
the line's direction. That is the first time the parabola appears in the course, and it appears as a
*tangent* — which is the honest way to meet it.

**Civil engineer.** A cantilever: the far end overhangs its support and carries nothing but its own
weight. The engineer's note is that the overhang is a **lever arm** — the longer the free end, the
more the line wants to tip. So there is a maximum useful extension, and finding it is the level.

**Game designer.** The emptiest level so far, and that is the point: a lot of paper, two objects, and
one long confident stroke. This is the level where the game stops looking like a puzzle and starts
looking like a toy you want to play with.

**Intended line.** Near plank's outer edge to the far plank's *inner* edge, or slightly short of its
outer edge — an extension of between 0 and 60 px past the last contact is the family.

**Trap.** Ending at the glass. The water arrives flat and low and smacks the near rim.

**Wrong idea being killed.** *"The line must reach the thing I am aiming at."*

---

### Level 6 — "The Column"  *(the level that teaches which face is a support)*

**The page.** Plank under the tap. A tall thin teal **column** mid-corridor with a flat cap, and the
glass on the far side of it, lower.

**Physics teacher.** The law is the normal reaction: it is **perpendicular to the surface**. On a flat
cap, that is straight up — a support. On the column's vertical side, it is horizontal — a wall, which
pushes sideways and holds nothing up. Two surfaces, same object, opposite usefulness. This is the
cleanest single demonstration of normal reaction I have in the set.

**Geometry teacher.** The construction is again **C1 (chord)**, but the student must *select the
correct segment of the column*: the cap's top edge, not the side edge. Geometrically this is the
first time the page offers two candidate segments of the same object and one of them is a trap. The
sentence: *"rest on the cap, never against the shaft."*

**Civil engineer.** A column is a **compression member** and it works only along its axis. A line
leaning on its shaft is applying a horizontal thrust at mid-height — which in a real column is exactly
the load that makes it buckle. So the trap is not just wrong, it is the classic failure mode. This is
the level I would use to introduce axial load to a class.

**Game designer.** The silhouette is a stick with a hat. It reads instantly, it is the first
"vertical" in a game that has been all horizontal, and the cap gives the eye a landing pad.

**Intended line.** Plank's edge → the column cap's near corner or centre → water flies past the
column into the glass.

**Trap.** Wedging the line against the column's side. It looks held, it holds nothing, and the whole
stroke slides down the shaft.

**Wrong idea being killed.** *"Touching something means being held by it."*

---

### The rest of Chapter 1 (7–10), at a glance

| # | Level | The new question |
|---|---|---|
| 7 | **Short Board** | The support is only 40 px wide — you must extend *past* it. A support is an endpoint, not a destination. |
| 8 | **The Shadow** | A plank's shadow falls on the glass. Aim at the shadow, not the mouth: the release point is where the *extension* lands. |
| 9 | **Two Sills** | Four possible pairs of supports. Three of them work. Choose the cheapest. |
| 10 | **Exam: The Long Drop** | High tap, low glass, an angled second plank. Nothing new, everything at once. |

**Chapter 1 gate.** A student passes the chapter when they can look at any of the ten rooms and say,
before drawing, *"the line joins these two edges, and the water leaves at that end."* If they cannot
say the sentence, they can still win — but they have learned nothing.

---

## Part 2 — The new assets

Six new objects, chosen so that each one carries a *distinct law* and a *distinct construction*. All
six are drawable with the existing visual language: flat silhouette, hard outline, one highlight,
colour = meaning (teal = structure, grey + arrow = machine, orange = loose weight, cream = masonry,
pale silver = reflective, ochre = porous).

### A7 · Masonry blocks and a keystone gap  *(civil)*

**What it is.** Cream sandstone blocks laid in a **semicircular arch**, with one block missing at the
crown. The player's ink can become the missing voussoir.

**The law.** An arch stands in **pure compression**. Each block pushes on its neighbour along the
joint; the *thrust line* must stay inside the masonry. Remove the keystone and the two haunches
rotate outward and the arch collapses. Put the ink in the gap and it works — because the ink is a
wedge being squeezed, and compression is what it is good at.

**The construction.** The arc, its chord, and the tangent at the springing. The student reads the
arch's radius and places the line along the thrust path.

**What it tests.** That a *structure can be held by being squeezed*. Nothing else in the game teaches
this, and it is the single most beautiful idea in civil engineering.

**Looks like.** Cream blocks with visible mortar joints and a faint chisel line; the missing block is
a dark gap that the ink fills.

**Danger.** Never let the arch *look* like it stands without the keystone — the collapse must be
immediate and obvious or the physics reads as a bug.

---

### A8 · Truss frame with a missing brace  *(civil)*

**What it is.** A rectangular bay of thin teal members, riveted at the joints, **missing one
diagonal**. With the diagonal it is rigid; without it, it racks into a parallelogram.

**The law.** A triangle is the only polygon that cannot deform without changing a side length. A
quadrilateral is a four-bar linkage. One diagonal converts a mechanism into a structure.

**The construction.** The diagonal of the quadrilateral — literally, draw the missing line.

**What it tests.** Rigidity, and the idea that **a small member can fix a large frame**. Also economy:
one diagonal, not a cross, unless the load reverses.

**Looks like.** A thin metal frame with rivet dots; the missing brace is a pair of empty rivet holes.

**Danger.** The frame must visibly rack, slowly and comically, or the student will not see what the
diagonal did.

---

### A9 · Elastic membrane  *(physics + geometry)*

**What it is.** A **stretched sheet** pinned along two edges, sagging in a catenary. A ball bounces off
it; water runs along it; load changes its shape.

**The law.** Elastic potential energy in, kinetic out. The surface is a curve, so the release direction
is the **tangent at the contact point**, not the chord.

**The construction.** Tangency to a curve, and — when the ball bounces — reflection about the tangent.

**What it tests.** That the surface *changes when you load it*: the level's answer moves as you play.
And that a curve is not a straight line, so aimed-at-centre is not aimed-at-tangent.

**Looks like.** A blue-green sheet with tension hatching along the edges; it visibly sags and rebounds.

**Danger.** A very bouncy membrane turns levels into pinball. Restitution is tuned to "trampoline",
not "superball".

---

### A10 · Pulley, rope and counterweight  *(civil + physics)*

**What it is.** A grey pulley wheel with a rope over it. One end carries a **bucket**; the other ends
in an orange counterweight.

**The law.** A rope in tension has the *same tension everywhere* (massless, frictionless pulley); a
pulley **changes the direction of a force, not its magnitude**. Two pulleys give mechanical
advantage — the tension halves and the rope length doubles.

**The construction.** Tangents to a circle; and the *balance* of two weights about a pivot.

**What it tests.** That force can be **redirected and geared**, not just pushed. And the best version:
*water itself can be the counterweight* — fill the bucket and it does the lifting.

**Looks like.** Grey wheel with a hub; the rope is a thin dark line; the counterweight is an orange
ball in a small cup. The visual language already exists for weights.

**Danger.** Ropes must never stretch or slip invisibly; a rope that does something unexplained reads
as magic.

---

### A11 · Reflector plate  *(geometry)*

**What it is.** A pale silver plate with a sheen line. It **bounces loose balls; it does not bounce
water** (water is not elastic — that distinction is itself a lesson).

**The law.** Angle of incidence equals angle of reflection, about the **normal**.

**The construction.** **C5, the mirror**: reflect the target in the plate and draw the straight line.
Two plates compose to a rotation by *twice the angle between them* — a real theorem, and the basis of
the periscope levels.

**What it tests.** That a bounce can be *solved*, not guessed; and that composition of reflections is a
rotation.

**Looks like.** A slim silver bar with a bright highlight down one edge; a faint dotted normal appears
when a ball is in flight near it (teaching aid, off by default).

**Danger.** Do not let the plate bounce *water*; that would break the honest physics of every other
level.

---

### A12 · Absorbent block  *(civil + physics)*

**What it is.** A pale ochre **sponge** with visible pores, which **fills with water and gains mass**.
It visibly darkens as it soaks.

**The law.** Mass is not constant: a body that takes on water gets heavier, and its equilibrium
changes mid-level. Capacity is finite; past saturation it stops absorbing and passes water on.

**The construction.** The centre of mass **moves** — so the projection test from Chapter 5 becomes
dynamic. The level's answer is a *function of time*, not a fixed line.

**What it tests.** That statics is a snapshot of dynamics. Students who solve the first frame and stop
are wrong when the sponge is full.

**Looks like.** A porous ochre block, darkening toward teal as it fills — a progress bar made of
material, and free feedback.

**Danger.** Must absorb *visibly and monotonically*; a sponge that randomly fails to soak is a bug the
player cannot diagnose.

---

### The six together

| Asset | Law | Construction | First seen |
|---|---|---|---|
| Arch + keystone | compression, thrust line | arc, tangent at springing | 61 |
| Truss frame | triangulation, rigidity | the diagonal | 71 |
| Membrane | elastic energy, tangent release | tangency to a curve | 81 |
| Pulley + counterweight | tension, mechanical advantage | tangents to a circle, balance | 91 |
| Reflector plate | reflection, law of reflection | C5 mirror, composition = rotation | 101 |
| Absorbent block | changing mass, moving centre of mass | projection of a moving CM | 111 |

With the existing set — planks, slabs, wedges, crates (wood/stone/ice), balls (heavy/light), pins
bars, seesaws, blowers, hot plates, taps, glasses — that is **eighteen distinct objects**, which is
more than enough vocabulary for 200 levels without ever repeating a room.

---

## Part 3 — The two hundred levels

Twenty chapters of ten. Each chapter introduces **one law**, works it for eight levels, and examines
it on the ninth and tenth. Within a chapter, exactly one dial moves per level: first the geometry,
then the interference, then the economy.

Reading a row: the **Construction** is what the geometry teacher calls the answer; **Physics** is the
single law the physicist signs off; **Intellect & creativity** is what the designer and engineer
argue about — and it always ends with the trap, which is the same thing as the misconception being
killed.

---

### Chapter 2 · The Obstacle — *constraints can be individually satisfiable and jointly empty*

**Taught:** broken chords, tangency, and recognising an **empty feasible set** before drawing.
**Engineer's frame:** every obstacle is a forbidden region; the answer lives in its complement.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 11 | Over The Wall | wall, 2 planks | C1 over the wall, two contacts | Normal reaction on two bearings | Resting on the wall's top is *one* contact — a hinge. Trap: using the wall as a support. |
| 12 | Under The Shelf | shelf above the corridor | C1 that clears the shelf's span | Projectile under a ceiling | The shelf's projection covers the mouth — read the forbidden region before drawing. Trap: pouring over it. |
| 13 | The Funnel | two converging walls | C4 down the **angle bisector** | Inelastic wall collisions lose energy | Every bounce costs water. Trap: ricochet off one wall to reach the far side. |
| 14 | Crate Stack | 2 crates, different heights | C2, vertex on the lower crate | Two normal reactions | A crate corner is a *point*, two corners are a construction. Trap: treating solids as pure obstacles. |
| 15 | Ice Run | ice block in the fall line | C1 that **spans** the ice | Friction: ice cannot hold water | A surface that cannot be used is a hole in the usable set. Trap: letting water run onto it. |
| 16 | The Sill | 60 px sill | C3, sill as fulcrum | Moments about a contact | A short support is a pivot, not a shelf. Trap: resting only on the sill. |
| 17 | Split Sill | two sills, 60 px gap | C4 through the aperture | Entry angle | The aperture is the target; the glass is not. Trap: aiming at the mouth. |
| 18 | The Trench | two low walls | C4 over the lip, then vertical | Clearance then fall | Two constraints in series. Trap: clearing the wall and forgetting the entry angle. |
| 19 | The Ledge | long ledge | **C1 onto** the ledge, **C1 along** it | Inclined plane gives the speed | The scenery is a free segment of your path. Trap: drawing a ramp parallel to it. |
| 20 | **Exam: The Notch** | slab with aperture | C4 through a point | Range through an aperture | Both earlier lessons at once: choose the surface, then the direction. Trap: the wide glass. |

**Gate.** Can the student, on sight, point at the region where a line is *forbidden* — before drawing?

---

### Chapter 3 · The Weight — *a circle is a set of directions, not an obstacle*

**Taught:** tangency, the foot of the perpendicular, and the **mirror construction** (C5).
**Engineer's frame:** a load is either a threat or a clamp, and the difference is where it sits.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 21 | Dead Weight | planks, heavy ball above | C1 with the chord **tangent** to the ball's drop line | Impulse; normal reaction carries the load | The ball is a support if the line is under it. Trap: avoiding the ball entirely. |
| 22 | Ball And Glass | ball aimed at glass | C1 placed so the ball's *image* misses the mouth | Toppling: CM leaves the base | You are steering the ball, not the water. Trap: catching the ball on the rim. |
| 23 | Rubber Ball | **light ball**, reflector-free | **C5**: reflect the glass in the line | Restitution; angle of incidence = reflection | One reflection solves the bounce — nobody sees it first time. Trap: meeting it head-on. |
| 24 | The Brace | heavy ball resting on the line | C3, two contacts + a ball on top | Friction μN; the ball's weight is a clamp | A hazard can be a fastener. Trap: fighting the ball away. |
| 25 | Ball Run | ball on a sloping plank | C1 onto the plane's face | Rolling: a = 5/7 g sinθ | The ball follows the plane, not the vertical. Trap: treating it as a free fall. |
| 26 | Two Weights | heavy + light ball | C1 tangent to the larger, clear of the smaller's projection | Free fall is mass-independent | They land together, they hit differently. Trap: assuming the light one drifts. |
| 27 | The Plug | ball whose diameter = gap | **C3 at the limit**: parallel tangents | Geometry as a seal | Let the ball wall the gap — it costs no ink. Trap: blocking it with ink instead. |
| 28 | Ball Trap | U-shaped bowl | the bowl's mouth is a chord | Potential well; escape energy | The bowl keeps the ball for free. Trap: rescuing the ball. |
| 29 | Heavy Lid | ball over the mouth | C1 clear of the ball's vertical projection | Interference before entry | The mouth is covered until the ball moves. Trap: pouring into a covered mouth. |
| 30 | **Exam: The Keeper** | two balls, one glass | tangent to one, clear of the other | Combined impulse | Two constraints on one line: one is a contact, one is a clearance. Trap: treating both alike. |

**Gate.** Can the student say *"reflect the target in the line"* out loud at level 23 — or discover it?

---

### Chapter 4 · The Machine — *a force field you can rotate away*

**Taught:** superposition of constant accelerations; **rotation of axes** (C6); work done by a field.
**Engineer's frame:** a wind is a load; a shadow is where the load is zero.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 31 | Crosswind | blower + planks | **C6**: rotate the frame by arctan(a/g) | Superposition → tilted effective gravity | The parabola is still a parabola, aimed along the tilted axis. Trap: aiming at the glass. |
| 32 | Wind Shadow | block between blower and corridor | leave the **projected region** | Forces act only where the field reaches | You do not oppose a force, you leave its region. Trap: building a wall of ink. |
| 33 | Updraft | blower pointing up | C6 inverted: effective *g* reduced | Reduced effective weight, longer flight | The wind changes the *height*, not the *aim*. Trap: ignoring the extra hang time. |
| 34 | Rotate | strong crosswind, marked plaster | C6, with the tilt large enough to measure | Rotation of axes | The level is solved by turning your head 18°. Trap: correcting by feel. |
| 35 | The Drift | long corridor + wind | C6: shift the release **upwind** by the drift | s = ½at² along the wind | The drift is systematic, not noise — compute it. Trap: compensating a little. |
| 36 | Two Blowers | blowers opposing | the **angle bisector** is the null direction | Superposition of two fields | There is a still column in the middle. Trap: sheltering at one edge. |
| 37 | Hot Plate | heated floor | C1 whose projection clears the plate | Latent heat: evaporation is a budget | Every droplet that touches is spent. Trap: letting spill reach the floor. |
| 38 | Steam Room | two hot plates | stay outside the **union** of two projections | Two budgets | Two forbidden regions make a corridor. Trap: fixing one and failing the other. |
| 39 | The Lid | free pinned bar over the mouth | the bar is a **locus**, not a wall | Torque; Newton's first law | It is still until hit — so it turns. Trap: expecting it to block. |
| 40 | **Exam: Weather** | wind + heat | C6 then clearance | Two mechanisms, ordered | Rotation first, clearance second. Trap: doing both at once. |

**Gate.** Can the student predict the drift with *s = ½at²* and say which way the release must move?

---

### Chapter 5 · The Glass — *the target is a body, and it can fall over*

**Taught:** orthogonal projection of the centre of mass; the toppling test; the disc as a target.
**Engineer's frame:** stability is a *margin* — a distance from a line to a point.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 41 | Glass On A Slope | glass on an incline | margin between the CM's vertical and the base edge | Impending slip vs toppling | It slides before it tips, so the line must also be a chock. Trap: just feeding it. |
| 42 | Glass In A Gap | glass between two walls | the base is the **segment between the walls** | Support reactions from two sides | The walls are its base now; it needs no floor. Trap: adding a floor it does not need. |
| 43 | Edge Of The World | glass near a drop | land centrally; the margin is a distance | Stability margin | Gentle and central beats fast and accurate. Trap: a steep, high-energy stream. |
| 44 | Narrow Neck | tall walls, small mouth | C4 at a tolerance of one glass-width | Aperture + entry angle | The neck is the target, not the glass. Trap: aiming at the body. |
| 45 | Tipping Point | glass on a seesaw | minimise the **moment arm** | Σ moments about the pivot | Land near the pivot, not anywhere on the plank. Trap: ignoring the arm. |
| 46 | Cup On A Column | glass on a narrow pedestal | the CM's vertical must fall inside the pedestal | Narrow base, low stability | The rim is the tipping edge, not a target. Trap: landing on the rim to "help". |
| 47 | Hands Off | nothing under the glass | C3 catch **below** the centre | Impulse applied off-centre → rotation | Catch it low or it spins as it lands. Trap: catching the rim. |
| 48 | Low Ceiling | slab above the mouth | C1 whose projection clears the slab | Clearance | Stop the line short. Trap: pouring through the ceiling. |
| 49 | Deep Cup | tall glass | entry within a **cone** about the vertical | Entry angle vs wall splash | Near-vertical or it sprays off the far wall. Trap: any opening will do. |
| 50 | **Exam: The Base Moves** | glass on a short-lipped slope | margin recomputed as the base moves | Dynamics of a sliding base | The target is not where the drawing says it is. Trap: solving the first frame only. |

**Gate.** Can the student draw the two extreme verticals from the CM and say whether it stands?

---

### Chapter 6 · Two Bodies — *length is the thing you are charged for*

**Taught:** polylines and the triangle inequality; the **ellipse as the reachable locus**.
**Engineer's frame:** long spans need more bearings.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 51 | Twin Taps | two taps, one glass | choose the source whose **ellipse** contains the mouth | Two sources, one sink | Only one can be fed by one line. Trap: trying to serve both. |
| 52 | Second Spout | extra spout in the room | the extra source's projection is forbidden | Unwanted momentum | A second source is a hazard, not a gift. Trap: using it. |
| 53 | Overflow | two glasses, offset | C4 into the upper glass | Conservation of flow | The overflow does the rest for free. Trap: aiming at both. |
| 54 | Two Glasses | one tap, two mouths | the **angle bisector** from the apex | Division of flow | Symmetry halves the work. Trap: two lines fighting at the tap. |
| 55 | Hands And Pins | free bar across corridor | C2 around the bar, or C3 to pin it | Torque turns the bar | Jam it or avoid it. Trap: pouring onto a free bar. |
| 56 | Rejoin | two corridors to one glass | compare two chords **by length** | Two paths, one sink | The shorter path is the answer, and it is not the prettier one. Trap: drawing both. |
| 57 | Long Arm | 400 px span, 2 bearings | **the ellipse test fails** → a third contact is required | Statically determinate vs not | A two-bearing span this long pivots. Trap: one long line. |
| 58 | Lever | seesaw under the drop | moments as **signed distances** | Load × arm | Put the water near the pivot. Trap: anywhere on the beam. |
| 59 | The Pivot | bar pinned at a point | the bar sweeps an **arc** | Energy into rotation | Use it as a deflector, not a floor. Trap: resting water on it. |
| 60 | **Exam: Halfway** | two taps, bar, narrow mouth | choose → aim → clear | Ordering | Nothing new, everything ordered. Trap: solving in the wrong order. |

**Gate.** Can the student draw the reachable ellipse with a string and two pins, and say whether the
mouth is inside it?

---

### Chapter 7 · The Arch — *a structure that stands by being squeezed*

**Taught:** compression, the thrust line, the keystone, the tie. **New asset A7.**
**Engineer's frame:** this is the chapter that only the civil engineer could have designed.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 61 | The Keystone | arch with the crown block missing | the ink **is** the wedge | Compression along the joints | Fill the gap and the arch locks. Trap: propping under the arch instead. |
| 62 | The Haunch | block missing near the springing | ink replacing a spandrel block | Thrust line must stay inside masonry | A missing block low down is worse than one at the top. Trap: assuming symmetry helps. |
| 63 | The Tie | a shallow arch that spreads | a **tie** across the springings (tension) | Horizontal thrust must be reacted | Deep arches need no tie; shallow ones do. Trap: buttressing from outside. |
| 64 | Two Arches | a two-span viaduct | choose which span to complete | Load path through a pier | Only one span needs you. Trap: doing both. |
| 65 | The Thrust Line | a flat arch (lintel) | the line **is** the thrust line | A lintel cannot stand; a curve can | Give the load a curved path and it stands. Trap: laying a straight slab. |
| 66 | Arch And Ball | ball rolling in the culvert | tangent to the invert | Rolling on a concave arc | The arch's curve is a guide. Trap: straight chute inside a curved hole. |
| 67 | The Culvert | semicircular arch over the channel | follow the **intrados** | Curved channel, centripetal | The inside face is a chute. Trap: cutting the corner. |
| 68 | Flying Buttress | arch leaning outward | ink as a **buttress** in compression | Thrust taken to the ground at an angle | Push back along the thrust, not against it. Trap: a vertical prop. |
| 69 | The Spandrel | load above the arch | keep the ink off the dead load | Added mass changes the thrust line | The fill above is heavier than the arch. Trap: resting on the fill. |
| 70 | **Exam: The Bridge** | arch + channel + glass | complete the arch, then feed the culvert | Compression + gravity | Two structures in series. Trap: an arch that works but does not carry water. |

**Gate.** Can the student explain why the arch collapses *faster* without the keystone than without a
haunch block?

---

### Chapter 8 · The Brace — *triangulation, or why a square is a mechanism*

**Taught:** rigidity, four-bar linkages, load paths, tension vs compression chords. **New asset A8.**
**Engineer's frame:** a small member can fix a large frame — if it is in the right place.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 71 | The Wobble | square bay, one brace missing | **the diagonal** | A quadrilateral is a mechanism | One diagonal makes it a structure. Trap: bracing the corners instead. |
| 72 | Two Diagonals | a tall rectangle | one diagonal is enough | Rigidity, not redundancy | Economy: a cross is twice the ink for the same job. Trap: bracing both ways. |
| 73 | The Cantilever | overhanging bay | brace in the **upper** chord | Tension above, compression below | The top of an overhang is in tension. Trap: bracing underneath. |
| 74 | The Prop | a leaning bay | C1 as a prop at the right angle | Axial load; eccentric load buckles | Prop along the lean, not across it. Trap: a horizontal shove. |
| 75 | Truss Bridge | truss with water on the top chord | diagonal that does not cross the channel | Load path + clearance | The brace must be where water is not. Trap: a diagonal through the stream. |
| 76 | The Kink | a chord bent at a joint | straighten with a short member | A bent chord is a hinge | Small correction, large effect. Trap: rebuilding the whole chord. |
| 77 | Load Path | water's weight, no ground path | complete the path to the ground | Every load needs a route down | The structure must reach a support. Trap: a line that holds water but floats. |
| 78 | Shear Panel | a panel shearing sideways | the **single** diagonal | Shear vs axial | Shear is carried by a diagonal in tension. Trap: horizontal struts. |
| 79 | Over-Braced | a bay that already stands | *remove* the temptation | Redundancy costs ink | The level that teaches you to stop. Trap: adding a brace you do not need. |
| 80 | **Exam: The Viaduct** | truss + arch | diagonal + keystone | Two structures sharing a load | One member must serve both. Trap: solving them separately. |

**Gate.** Can the student point at the *one* member that makes the frame rigid?

---

### Chapter 9 · The Membrane — *the surface changes when you load it*

**Taught:** elastic energy, tangency to a curve, and dynamic geometry. **New asset A9.**
**Engineer's frame:** a tensioned membrane carries load by changing shape.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 81 | The Bounce | light ball + membrane | **C5 reflected about the tangent** | Elastic restitution; tangent at contact | A curved mirror, so the normal is not the chord. Trap: aiming at the centre of the sheet. |
| 82 | The Sag | water on a membrane | aim at the **loaded** shape | Deflection under load | The answer moves as it fills. Trap: solving the empty sheet. |
| 83 | The Launch | water runs onto a membrane | release along the tangent at the rim | Energy stored then returned | A catapult made of water's own weight. Trap: a flat landing. |
| 84 | The Catch | falling ball over a glass | membrane as a soft catcher | Impulse spread over time | Softness is the point. Trap: catching with ink (too stiff). |
| 85 | Two Sheets | two tensions, one gap | choose the sheet by **stiffness** | Spring constant | A stiff sheet throws further. Trap: the nearer one. |
| 86 | The Drum | vibrating sheet | avoid it | Oscillation; water will not settle | A hazard you cannot touch. Trap: pouring onto it. |
| 87 | Pre-Tension | slack sheet | add tension with ink | Tension is a *force*, not a shape | More tension, more launch. Trap: pulling it into a straight line. |
| 88 | The Net | coarse **net** (a membrane with holes) | geometry of apertures again | Balls stop, water passes | A filter made of geometry. Trap: treating it as solid. |
| 89 | The Snare | elastic loop | C3 tangent to the loop | Elastic closure | The loop closes on what it catches. Trap: dropping the ball through it. |
| 90 | **Exam: The Springboard** | membrane + arch | tangent then compression | Energy in, energy out | Two structures, one trajectory. Trap: forgetting the arch carries the load. |

**Gate.** Can the student say why the bounce off a *curve* is not the bounce off a *line*?

---

### Chapter 10 · The Tackle — *force can be redirected and geared*

**Taught:** tension in a rope, the frictionless pulley, mechanical advantage, balance. **New asset A10.**
**Engineer's frame:** the level is a machine with an input and an output, and the input can be water.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 91 | The Counterweight | rope over a pulley, weight, bucket | tangents to the pulley circle | Tension is uniform | The weight holds the line taut for free. Trap: holding it with ink. |
| 92 | The Redirect | pulley at a corner | the rope turns the force 90° | A pulley redirects, it does not multiply | Vertical pull, horizontal load. Trap: believing the corner multiplies force. |
| 93 | Advantage | two pulleys | the moving pulley **halves** the tension | Mechanical advantage = number of supporting strands | Small weight, big load. Trap: counting pulleys instead of strands. |
| 94 | The Drawbridge | hinged deck, rope, weight | balance about the hinge | Moments + tension | The deck's own weight is the load. Trap: ignoring the deck. |
| 95 | The Bucket | bucket on a rope that fills | the water **is** the counterweight | Increasing mass does work | Let the water lift its own glass. Trap: lifting with ink. |
| 96 | The Balance | two weights, one rope | equal tensions either side | Equilibrium | Balance is an equation, not a look. Trap: a heavier weight on the short side. |
| 97 | Clothesline | rope with a load, sags | add a **third** support | Catenary; tension rises as it flattens | Flatter is not stronger. Trap: pulling it straight. |
| 98 | The Winch | drum + rope | wrap to multiply | Torque × turns | Many turns, small force. Trap: a long lever instead. |
| 99 | The Snatch | pulley wheel in the water path | tangent to the wheel | Flow turns a wheel | The water drives the machine. Trap: pouring around it. |
| 100 | **Exam: The Crane** | pulley + truss | tension + rigidity | Load path through a frame | The rope carries, the frame positions. Trap: one member doing both jobs. |

**Gate.** Can the student draw the free-body diagram of the bucket and the counterweight and say which
way the rope moves when one droplet lands in it?

---

### Chapter 11 · The Mirror — *a bounce is a construction, not a guess*

**Taught:** the law of reflection, the mirror construction (C5) made explicit, and **composition of
reflections = rotation by twice the angle**. **New asset A11.**
**Engineer's frame:** a reflector is a device that changes a direction without changing a speed.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 101 | First Reflection | plate + light ball + glass | reflect the glass in the plate | Angle in = angle out about the normal | The straight line to the image crosses the plate at the bounce point. Trap: aiming at the plate. |
| 102 | The Corner | two plates at 90° | a **corner reflector** returns the ball parallel | Two reflections | Retroreflection: it comes back the way it went. Trap: expecting a scatter. |
| 103 | The Angle Bisector | one plate, free to be placed | place the plate on the **bisector** of in and out | The normal bisects the angle | One line places the plate. Trap: trying plate angles one by one. |
| 104 | The Periscope | two parallel plates | two reflections, one translation | Composition of reflections | The beam steps sideways. Trap: one plate at 45° and guessing the rest. |
| 105 | Reflection Off A Slope | plate mounted on a wedge | reflect in the plate's **line**, not the wedge's face | The normal belongs to the plate | The plate is what reflects; the wedge is scenery. Trap: aligning to the wedge. |
| 106 | The Chute | plate that must **not** reflect water | water is inelastic; the plate is a chute for it | Elastic vs inelastic impact | Same object, two behaviours, chosen by material. Trap: expecting water to bounce. |
| 107 | Two Mirrors | two plates at angle θ | the exit direction is rotated by **2θ** | Composition of two reflections | A theorem you can see. Trap: adding the angles. |
| 108 | The Mirror Maze | three plates | choose the pair that works | Multiple reflections | Only one path survives; economy decides. Trap: using all three. |
| 109 | The Caustic | a **curved** reflector | aim at the focal region | A circular arc focuses approximately | A curve collects; a line redirects. Trap: treating the arc as a mirror with one normal. |
| 110 | **Exam: The Light Well** | two plates + arch | reflect, then compress | Reflection inside a structure | The ball must bounce through a masonry opening. Trap: a path that fits the plates but not the arch. |

**Gate.** Can the student use a set square to find the bounce point without watching the ball?

---

### Chapter 12 · The Soak — *mass is not constant*

**Taught:** changing mass, moving centre of mass, finite capacity, and statics as a snapshot of
dynamics. **New asset A12.**
**Engineer's frame:** a load that arrives after you have finished designing.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 111 | The Sponge | sponge on a plank | the whole answer, but for the **loaded** state | Mass gain shifts the CM | Solve frame 1, then frame 400. Trap: solving the dry sponge. |
| 112 | The Counterweight Sponge | sponge on a lever | moments with a **growing** load | Variable moment | It lifts something once it is heavy enough. Trap: adding weight with ink instead. |
| 113 | The Dam | sponge in a channel | let it fill, then it blocks | Saturation → impermeable | A gate that closes itself. Trap: damming with ink. |
| 114 | The Sump | sponge below a spill | position it to **save** water | Absorption as storage | Catch the overflow and give it back. Trap: letting the spill drain. |
| 115 | Dry Run | empty sponge is light | wet it **first** | Sequence: mass before use | Order matters more than the line. Trap: using it dry. |
| 116 | Weight Gain | sponge on the glass's platform | the platform tips when the sponge is full | Equilibrium on a moving base | The glass falls over from a change you caused. Trap: filling the sponge over the glass. |
| 117 | The Filter | a saturated sponge | work **around** it | Capacity exhausted | A dead weight, not a tool. Trap: expecting it to keep absorbing. |
| 118 | Saturation | sponge at capacity | the overflow is a second stream | Conservation beyond saturation | Plan for the water the sponge refuses. Trap: assuming it takes everything. |
| 119 | The Load | sponge on a truss | the brace must carry the **added** mass | Load path with variable load | Brace before it fills, not after. Trap: a brace sized for the dry sponge. |
| 120 | **Exam: The Waterworks** | sponge + pulley | lift water with water | Mass, tension, and time | Three systems, one sequence. Trap: any order. |

**Gate.** Can the student predict *at what fill level* the platform tips?

---

### Chapter 13 · Flow — *water is not a point mass*

**Taught:** conservation of flow, division, head and pressure, backwater. No new asset.
**Engineer's frame:** hydraulic works — weirs, culverts, syphons.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 121 | The Split | two mouths, symmetric | the **apex** under the tap | Division of flow | Symmetry does the work; make the split even. Trap: two separate lines. |
| 122 | The Syphon | a wall higher than the glass | over the wall, outlet **lower** than inlet | Pressure head, not suction-by-magic | It only works downhill. Trap: a syphon whose outlet is high. |
| 123 | The Head | a column of water above a hole | height sets the speed | Torricelli: v = √(2gh) | More head, further jet. Trap: a bigger hole for more range. |
| 124 | The Weir | a notched barrier | notch geometry meters the flow | Flow over a notch | The notch is a calibration. Trap: an oversized notch. |
| 125 | The Vortex | circular chamber | **tangential** entry | Angular momentum | Enter tangentially and it spirals in. Trap: head-on entry. |
| 126 | The Chute | curved channel | follow the inner wall | Centripetal squeeze | Water climbs the outside of a bend. Trap: the outer edge. |
| 127 | The Merge | two streams joining | aim both at a common point | Momentum addition | Two streams can make one. Trap: letting them collide. |
| 128 | Backwater | a constriction downstream | raise the level behind it | Flow restriction raises upstream head | The problem is caused downstream. Trap: fixing upstream. |
| 129 | Overflow | a glass that spills | accept the spill, direct it | Conservation | The spill is a feature. Trap: trying to stop it. |
| 130 | **Exam: The Works** | syphon + split + weir | a sequence of hydraulic devices | Conservation at each stage | Designed like a real waterworks. Trap: making any one stage perfect and the rest arbitrary. |

**Gate.** Can the student say where the water is *lost* on this page, and count it?

---

### Chapter 14 · Structures — *the chapter only an engineer could write*

**Taught:** cantilever action, overhang, buckling, footing, retaining. Uses existing assets.
**Engineer's frame:** every level is a load path with a failure mode.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 131 | The Cantilever | overhanging slab | a **tie** at the top chord | Tension above, compression below | An overhang is held from above. Trap: propping from below. |
| 132 | The Overhang | stacked blocks leaning out | find the maximum lean | The **harmonic series** limits a stack | How far can it lean before it falls? Trap: assuming symmetry is safest. |
| 133 | The Prop | a leaning wall | prop at the correct angle | Axial vs eccentric load | A prop along the lean is twice as effective. Trap: a horizontal shove. |
| 134 | Buckling | a slender column | brace at **mid-height** | Euler buckling: P ∝ 1/L² | Halving the free length quadruples the strength. Trap: bracing near the base. |
| 135 | Portal Frame | a rigid frame with square corners | a **knee brace** | Rigid joints carry moment | A small diagonal at the corner does the work. Trap: bracing mid-span. |
| 136 | The Beam | a simply supported beam | strengthen **mid-span** | Bending moment is largest at the centre | The middle is where it breaks. Trap: reinforcing the ends. |
| 137 | The Tie | an arch wanting to spread | a tie rod at the springing | Horizontal thrust | Ties in tension, buttresses in compression — pick by space. Trap: a buttress where there is no room. |
| 138 | Retaining Wall | water pressing a wall | prop the **back** | Overturning moment from fluid pressure | Pressure acts at a third of the depth. Trap: propping at the top. |
| 139 | The Footing | a narrow pedestal | **widen** the base with ink | Bearing pressure distributed over area | Widen, do not heighten. Trap: adding height for stability. |
| 140 | **Exam: The Deck** | deck on two piers + a cantilever | all of the above | Combined load path | Find the one member that fixes the whole frame. Trap: reinforcing everything. |

**Gate.** Can the student mark, on the drawing, which member is in tension and which in compression?

---

### Chapter 15 · Sequence — *the answer is a schedule*

**Taught:** ordering, delay, two-phase systems. No new asset.
**Engineer's frame:** construction sequencing — you cannot pour the slab before the formwork.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 141 | Wait For It | tap first, ball later | solve in **time order** | Kinematics with a start delay | The line must work at t₁ and at t₂. Trap: solving the steady state. |
| 142 | The Timer | ball rolling down a ramp | use the roll as a **delay line** | Constant acceleration gives an interval | A mechanical timer. Trap: a longer ramp for a longer delay (it is √). |
| 143 | Two Pours | one tap, two glasses | the stream is diverted **mid-pour** | Momentum change by a moving body | A falling weight redirects the stream. Trap: two lines. |
| 144 | The Queue | three events in a row | each unlocks the next | Cause and effect chains | Design the order, not the objects. Trap: solving the last event first. |
| 145 | The Cascade | a chain of small events | a chain of chords | Energy handed down | Small inputs, large outputs. Trap: one big stroke. |
| 146 | The Catch | something arrives at time t | meet it **at** t | Kinematics of two bodies | Intercept, don't wait. Trap: catching at the wrong height. |
| 147 | The Race | two droplets, two paths | equalise the arrival | Time of flight along different paths | The longer path must be the faster one. Trap: the shortest path (it is not always first). |
| 148 | The Delay Line | a long, slow path | trade length for time | Drag and slope | Deliberately waste speed. Trap: making it fast. |
| 149 | The Trigger | a weight that releases a latch | one small mass, one big consequence | Leverage and release | The level turns on a single event. Trap: continuous pushing. |
| 150 | **Exam: The Machine** | five stages | a designed sequence | Combined | This is a Rube Goldberg level and it must still be *calculable*. Trap: luck disguised as cleverness. |

**Gate.** Can the student draw a timeline before drawing a line?

---

### Chapter 16 · Precision — *the tolerance is the lesson*

**Taught:** sensitivity, tolerance, and the narrow end of every earlier chapter.
**Engineer's frame:** a tolerance is a specification, and a level is a tolerance you must meet.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 151 | The Needle | a mouth one droplet wide | C4 exactly | Aperture | Precision without a trick. Trap: speed (it makes you miss). |
| 152 | The Thread | three apertures in a row | C1 through three collinear points | Collinearity | Three points, one line — if they really are collinear. Trap: two points and hope. |
| 153 | The Gap Line | a 6 px slot | C1 through the slot at the right angle | Clearance | The angle matters more than the position. Trap: a perpendicular entry too slow. |
| 154 | The Long Shot | 600 px flight, 40 px mouth | predict the **range** | Range vs drop | Long flights are calculated, not aimed. Trap: overhang guesswork. |
| 155 | Steep Entry | must enter within 10° of vertical | C4 | Entry cone | Vertical entry needs the way to be clear. Trap: a shallow, fast arrival. |
| 156 | The Rim | land within 10 px of centre | the **margin** again | Stability margin | Central landing is a stability choice. Trap: anywhere in the mouth. |
| 157 | Thin Edge | rest on a 4 px edge | C3 at the limit | Contact on a knife edge | Balance, not placement. Trap: a wide support nearby. |
| 158 | Three Surfaces | touch exactly three | C2 with a set of contacts | Statical determinacy | Three contacts is the sweet spot. Trap: four (over-constrained). |
| 159 | The Silhouette | must not cross a marked line | stay inside a region | Constrained optimisation | The shape of the answer is the constraint. Trap: touching the boundary. |
| 160 | **Exam: The Eye** | a needle's eye in an arch | C4 through masonry | Combined | Everything at 1 px. Trap: the level that punishes a good idea badly timed. |

**Gate.** Can the student state the tolerance of their own solution?

---

### Chapter 17 · Economy — *the ink meter is the triangle inequality*

**Taught:** shortest path, reuse, and minimal structure. No new asset.
**Engineer's frame:** value engineering — the cheapest structure that does the job.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 161 | One Stroke | one continuous line only | the chord | Single-body dynamics | No second chance. Trap: two strokes. |
| 162 | The Shortest Chord | two fixed bearings | the straight line between | Geometry only | Literally the shortest path. Trap: a graceful curve. |
| 163 | The Detour | the obvious path is longer | compare lengths | Path length vs speed | The short path is not always the fast one — but sometimes it is both. Trap: the scenic route. |
| 164 | Reuse | scenery is part of the path | let the room carry | Free support | The cheapest member is the one already there. Trap: drawing everything. |
| 165 | Brace Economy | a bay needing one diagonal | one, not two | Rigidity | Redundancy is waste. Trap: a cross. |
| 166 | The Minimal Fork | one line, two mouths | the shortest symmetric fork | Division | Symmetry plus economy. Trap: two long arms. |
| 167 | The Tie | a spreading arch | the shortest tie | Horizontal thrust | The tie can be very short if placed low. Trap: a tall prop. |
| 168 | The Trim | 10 px over budget loses a star | measure before drawing | Precision of length | The first level that punishes *good enough*. Trap: "close" |
| 169 | The Budget | 1.02× the optimum | exact | Everything | Only a calculated line fits. Trap: every guess. |
| 170 | **Exam: The Frugal Bridge** | arch + truss, tight ink | minimal structure | Combined | The exam is a cost estimate. Trap: over-building. |

**Gate.** Can the student predict their ink use to within 10 px before drawing?

---

### Chapter 18 · Reversal — *when the obvious direction is wrong*

**Taught:** inverting assumptions; negative drops; lifting; and the limits of the model.
**Engineer's frame:** pumping, backflow, and structures that must be un-loaded.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 171 | Uphill | glass above the release | the release direction points **up** | Projectile with a positive vertical component | Rare, and it works. Trap: assuming water cannot rise. |
| 172 | The Lift | bucket + pulley | lift water with water | Work done against gravity | The input is the same fluid. Trap: lifting with ink. |
| 173 | Syphon Up | a wall higher than the source | pressure, not suction | Head difference | It works if the outlet is lower — even over a higher wall. Trap: "water cannot go up". |
| 174 | Backflow | water arrives from the wrong side | turn the stream around | Momentum reversal | A deflector can send it back. Trap: catching it. |
| 175 | The Fallen Glass | a glass already tipped | catch it **away** from the mouth | Toppling is not always fatal | A tipped glass can still be filled? No — but it can be caught and righted by a line. Trap: pouring into a fallen glass. |
| 176 | Tap Below | the tap is under the glass | the water must be thrown up | Projectile launched upward | The hardest launch in the game. Trap: a vertical chute. |
| 177 | The Wrong Way Slope | a slope that fights the flow | use it as a brake | Energy loss, not gain | A slope can slow water down usefully. Trap: avoiding it. |
| 178 | The Empty Room | nothing but tap, glass, floor | the floor is a support | Normal reaction on the ground | The simplest possible room is not the easiest. Trap: looking for a prop. |
| 179 | The Weighted Glass | a glass that starts heavy | make it **lighter** | Mass removal via the sponge or the spill | Remove before you add. Trap: more water. |
| 180 | **Exam: The Inverted Works** | everything reversed | inversion as a method | Combined | The final conceptual exam. Trap: every habit you have built. |

**Gate.** Can the student name a case where water goes *up* and explain it?

---

### Chapter 19 · Compound — *two new assets, one line*

**Taught:** composition with no new law. Each level pairs two of the six new assets.
**Engineer's frame:** interfaces — most real failures happen where two systems meet.

| # | Level | Assets | Construction | Physics | Intellect & creativity |
|---|---|---|---|---|---|
| 181 | Arch + Membrane | keystone gap under a sheet | compression then tangent | Two structures | The sheet catches what the arch delivers. Trap: treating them as one system. |
| 182 | Truss + Pulley | braced frame carrying a rope | diagonal + tangent | Load path into tension | The frame positions, the rope carries. Trap: rope through the brace. |
| 183 | Mirror + Arch | reflector inside a vault | reflection through masonry | Two reflections of the same law | The ball must leave the arch as it entered. Trap: a bounce that fits the plate but not the opening. |
| 184 | Sponge + Truss | growing load on a braced bay | brace sized for the wet state | Variable load path | Design for the end state. Trap: the dry design. |
| 185 | Membrane + Mirror | bounce off a sheet onto a plate | tangent then mirror | Elasticity then reflection | Two bounces, two different laws. Trap: one law for both. |
| 186 | Arch + Soak | a sponge dam under an arch | compression + saturation | Two time scales | Fast water, slow absorbency. Trap: assuming they are simultaneous. |
| 187 | Pulley + Mirror | a lifted reflector | balance + reflection | Tension moves the mirror | The mirror's position is a function of fill. Trap: a fixed mirror. |
| 188 | Truss + Soak | a wet load on a frame | rigidity + mass gain | Load path with a changing load | The frame must be right before the load arrives. Trap: sizing for the dry case. |
| 189 | Membrane + Pulley | a sheet that lifts a weight | tangent + tension | Energy through a rope | Water does work twice. Trap: losing it at the interface. |
| 190 | **Exam: Four** | arch + truss + pulley + soak | all four | Combined | The hardest structural level in the game. Trap: any component solved in isolation. |

**Gate.** Can the student draw the *interfaces* — the two points where one system hands load to the
next?

---

### Chapter 20 · The Finals — *nothing new, nothing signposted*

Ten levels, each combining three known mechanics, each with a tip that says nothing about physics.
One star is a win. These exist so that the last thing a student does is *think*, not learn.

| # | Level | Assets | What it demands | The reasoning that wins | The habit it punishes |
|---|---|---|---|---|---|
| 191 | The Long Game | wind + long span + narrow mouth | rotate, then reach, then aim | Predict the drift before choosing the span | reacting to the first failure |
| 192 | Two Rooms | truss + two taps | choose the source and brace the frame | Solve the structure before the water | solving the fluid first |
| 193 | The Undercroft | arch + heat | compression, then a budget | The arch carries; the plate costs | pouring first, building later |
| 194 | Pendulum Line | pulley + bar | tension + rotation | Let the bar swing the rope into place | holding everything still |
| 195 | The Sump | sponge + trench | catch, then deliver | Absorb the miss, release it later | accepting loss |
| 196 | Wrong Window | mirror + precision | reflect through an aperture | Two constraints, one line | aiming at the glass |
| 197 | The Weir Wall | flow + arch | meter the flow, carry the wall | Control quantity before direction | controlling the wrong variable |
| 198 | Cold Bridge | membrane + ice | elastic and frictionless | Two surfaces that behave differently | one rule for all surfaces |
| 199 | The Keystone Run | arch + truss + water | the full structure test | Load path first, water second | drawing before understanding |
| 200 | **Finale** | everything | all of it | Attack in a fixed order: rotate, clear, compress, tangent, aim | improvising |

**Gate.** A student who finishes 200 can look at the final room and *narrate* the solution before
touching the pen. That is the whole course.

---

## Part 4 — The progression, stated as a dial

| Chapter | Levels | New law | New assets | Objects per room | Hazards | Ink budget | Tolerances |
|---|---|---|---|---|---|---|---|
| 1 The Chord | 1–10 | support, projectile | — | 3–4 | 0 | 1.6× | wide |
| 2 The Obstacle | 11–20 | friction, normal, empty sets | — | 4–5 | 0–1 | 1.5× | wide |
| 3 The Weight | 21–30 | momentum, restitution | light/heavy balls | 5 | 1–2 | 1.4× | medium |
| 4 The Machine | 31–40 | fields, latent heat | blower, hot plate | 5–6 | 1–2 | 1.35× | medium |
| 5 The Glass | 41–50 | toppling, projection | movable bases | 6 | 2 | 1.3× | medium |
| 6 Two Bodies | 51–60 | systems, reach | second tap/glass | 6 | 2 | 1.25× | tight |
| 7 The Arch | 61–70 | **compression** | **A7 arch** | 5–7 | 1 | 1.25× | medium |
| 8 The Brace | 71–80 | **rigidity** | **A8 truss** | 6–7 | 1–2 | 1.2× | tight |
| 9 The Membrane | 81–90 | **elasticity** | **A9 sheet** | 5–6 | 1–2 | 1.2× | tight |
| 10 The Tackle | 91–100 | **tension** | **A10 pulley** | 6–7 | 1–2 | 1.2× | tight |
| 11 The Mirror | 101–110 | **reflection** | **A11 plate** | 6–7 | 2 | 1.15× | tight |
| 12 The Soak | 111–120 | **variable mass** | **A12 sponge** | 6–7 | 2 | 1.15× | tight |
| 13 Flow | 121–130 | conservation | — | 6–7 | 2 | 1.15× | tight |
| 14 Structures | 131–140 | load paths | — | 7 | 1–2 | 1.1× | tight |
| 15 Sequence | 141–150 | ordering | — | 7 | 2 | 1.1× | tight |
| 16 Precision | 151–160 | tolerance | — | 6–7 | 2–3 | 1.1× | very tight |
| 17 Economy | 161–170 | optimality | — | 6 | 0–2 | 1.05× | very tight |
| 18 Reversal | 171–180 | inversion | — | 5–7 | 1–2 | 1.1× | tight |
| 19 Compound | 181–190 | interfaces | all six | 7–9 | 2–3 | 1.1× | tight |
| 20 Finals | 191–200 | — | all | 7–9 | 2–3 | 1.1× | very tight |

**The single dial that matters most:** ink. It falls from 1.6× to 1.05× across the 200 levels, and
that fall is what turns "draw something that works" into "draw the right thing". It is the triangle
inequality, applied to the whole curriculum.

---

## Part 5 — What happens to the current 70

| Current | Fate | Reason |
|---|---|---|
| Chapters 1–6 (levels 1–60) | **kept and re-proved** under the new chapter order | their constructions are the first six of the 200 |
| 9 failing levels (12, 15, 17, 19, 20, 35, 40, 50, 57) | **8 restructured, 1 removed** | diagnosed in the physics and geometry briefs |
| 6 levels eased by lowering `need` (11, 20, 38, 51, 69, 70) | **`need` restored**, geometry fixed | fixing the measurement was the wrong instinct |
| Level 2 "The Weight" | moved from ch.1 to ch.3 | it teaches momentum-adjacent ideas; it belongs with the balls |
| The 6 new assets | **built next** | A7 and A8 first: they unlock 40 levels between them |

---

## Part 6 — Build order, if this were being made

1. **A7 arch and A8 truss** — engineering assets, conceptually richest, and they unlock chapters 7 and
   8 (20 levels) with the least new physics modelling.
2. **A10 pulley** — one constraint and one wheel; unlocks chapter 10 and half of chapter 19.
3. **A11 reflector** — only needs the ball's restitution path; unlocks chapter 11.
4. **A9 membrane** — the most delicate: a soft body with a changing shape, and the biggest risk of
   looking wrong.
5. **A12 sponge** — simplest to build (mass ramp plus tint), unlocks chapter 12.

Each asset ships with three things: its law, its **failure mode** (how it looks when it goes wrong),
and **two levels that prove it** before any level is allowed to lean on it.

---

## Part 7 — The four roles, one last time

The whole document is the argument that these four cannot be separated:

- The **game designer** asks whether a stranger wants to draw on this page in the first ten seconds.
- The **physics teacher** asks which single law decides the answer, and which misconception dies.
- The **geometry teacher** asks whether the answer can be *said in one sentence with named features*.
- The **civil engineer** asks whether a builder would accept the structure, and what it fails at.

A level that only one of them likes is a bad level. A level all four sign is a level that a student
can solve with a pencil, and then enjoy proving on screen.
