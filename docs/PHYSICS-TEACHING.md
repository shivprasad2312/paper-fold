# Seventy levels taught by a physics teacher

A design brief for the level set, written from the front of a 12th-class classroom rather than from a
level editor. It answers three things:

1. **What am I teaching with this level?** — the physics, stated in syllabus language.
2. **What must the student reason out?** — the thinking, not the drawing.
3. **What misconception does it catch?** — because a level that cannot catch a wrong idea is decoration.

And it decides, for the nine levels that currently fail, whether to **remove** them or **restructure**
the objects.

---

## 0. The principle the whole set is built on

A student should be able to solve a level **before drawing it** — with a pencil, on paper, in about
ninety seconds. If the only way to win is to try lines until one works, the level is not teaching
physics, it is teaching patience.

So every level must pass the **Calculable Test**:

> Predict the landing point from the slope and the drop height, using only things a 12th-class
> student knows. If the drawing that follows from that prediction does not win, the level is broken —
> not hard, broken.

I would rather ship sixty levels a student can *compute* than seventy a student can *guess*.

### The three questions

Every level in the game is one of these three questions, or a combination of two:

| | Question | Physics | What the student does |
|---|---|---|---|
| **Q1** | *Where does the water land?* | Kinematics: inclined plane → projectile | Estimates range from drop height and release angle |
| **Q2** | *Where can the wire stand?* | Statics: supports, equilibrium, moments | Decides where the line touches and whether it will pivot |
| **Q3** | *What else is in the room?* | Forces, energy, momentum, heat | Decides how the hazard changes the answer to Q1 or Q2 |

A level with only Q1 is a chapter-1 exercise. A level with Q1+Q2 is the core of the game. Q3 is what
makes a level an exam.

### What "intelligence" means here, measurably

I want to be able to say "this level rewards thinking" without it being an opinion. Three tests, run
on every level:

| Test | Rule | Why it matters |
|---|---|---|
| **Blind-tap rate** | Random *legal* lines (drawable, resting on something) must win **< 5 %** of the time | If flailing works, the physics is not in the loop |
| **Calculable match** | The line that follows from a hand calculation must be within one glass-width of the known solution | The intended path must be findable by reasoning |
| **Slack check** | The intended line must use **≤ 1.1×** its ink budget | If there is huge slack, nobody has to think about length |

A level that fails any of these gets redesigned, not shipped.

---

## 1. The reasoning ladder

Each level is tagged with the highest rung it demands. Within a chapter the rungs climb; across
chapters the ladder is re-climbed with a new idea added.

| Rung | Name | What the student does |
|---|---|---|
| **1** | **Notice** | Reads the room: where is the tap, where is the mouth, what is between them |
| **2** | **Name the principle** | "This is an inclined plane and a projectile." |
| **3** | **Predict** | Estimates the landing point before drawing |
| **4** | **Choose the support** | Decides which surfaces the wire should touch, and proves it will not pivot |
| **5** | **Handle interference** | Adjusts for a ball, wind, heat, a pivot |
| **6** | **Optimise** | There are two working answers; one costs half the ink |

The stars already reward rung 6 — that is what the ink meter is for. The levels are arranged so that
rungs 1–5 get you a win and one star; rung 6 is what gets you three.

---

## 2. Chapter 1 — The Pour (levels 1–10)

**Taught:** the inclined plane and projectile motion.
**The one idea:** a chute is only a chute if it rests on two things.
**Rungs:** 1–3.

### 2.1 The physics the chapter builds

A droplet released on a slope of height *h* leaves the edge with speed *v = √(2gh)* directed along
the slope. After the edge it is a projectile:

> range from the edge = *x(t)* with *x* along the release direction,
> fall time from *t = (−v_y + √(v_y² + 2g·d))/g*, where *d* is the drop from the edge to the mouth.

The consequence students must feel in their hands: **the water does not fall off the end of the line,
it flies off it.** Doubling the drop height multiplies the release speed by only 1.41, but lengthens
the flight time as well — the total range grows faster than the height. That is why every "obvious"
long ramp overshoots the glass.

### 2.2 The levels

| # | Level | On the page | Principle | What the student must reason | Trap & misconception |
|---|---|---|---|---|---|
| 1 | **First Pour** | Two offset planks, tap above the first, glass beyond the second | Two supports; projectile release | "A line touching one thing swings; it needs two contacts, and it must be almost flat." | Drawing a short line on one plank. *Misconception: the line is attached where I start drawing.* |
| 2 | **The Weight** | Same corridor + heavy ball above the gap | Normal reaction; the line takes the ball's weight and impact | "Both ends must be pinned down, and under the ball, or it will knock the end off." | A line resting only at the near end. *Misconception: the ball will just roll away.* |
| 3 | **The Staircase** | Three descending planks | Three inclined planes; the chord of two steps is shallower than either | "Join step 1 to step 3: the combined slope is gentler and the release is lower." | A line steeper than the steps. *Misconception: steeper is faster, so better.* |
| 4 | **The Wedge** | A free slab with a long 20° face | The slope is already on the page | "Land the water on the wedge's face; I only need a short feeder." | Rebuilding a ramp parallel to the wedge. *Misconception: I must draw the whole path.* |
| 5 | **The Gap** | Two planks 300 px apart | One long inclined plane; long flight | "The far plank is a release point, not a landing point — end short of the glass." | Extending the line to the rim. *Misconception: the line has to reach the glass.* |
| 6 | **The Column** | A vertical column with a flat cap | Normal reaction is perpendicular to the surface | "The cap is a horizontal support; the column's side is a wall, not a support." | Wedging against the column's face. *Misconception: touching something = being held by it.* |
| 7 | **The Chimney** | Two walls with a mouth between them | Free fall into a channel; horizontal velocity is the enemy | "The mouth is the target, and it is narrow — slow the water down." | A fast stream that ricochets off the inner wall. *Misconception: more speed means more water in.* |
| 8 | **Step Down** | A shelf above the glass | Projectile must clear an obstacle | "End the line before the shelf, or the shelf catches everything." | Line ending on the shelf edge. *Misconception: the nearest surface is the best surface.* |
| 9 | **The Notch** | A slab with a hole | Aim through an aperture: the hole is a stricter target than the glass | "Match the range to the hole, then drop straight down." | Aiming at the glass, not at the hole. *Misconception: the target is the glass.* |
| 10 | **The Long Drop** | High tap, low glass, angled second plank | Range grows with √h and with release angle | "Shallow line, long flight; steep line sprays." | Over-steepening on the second plank. *Misconception: a bigger drop gives a shorter flight.* |

### 2.3 The chapter exam question I would set

> *"A droplet leaves a ramp 200 px above the glass rim at 30° below horizontal. Without drawing,
> say whether a ramp ending directly above the glass mouth can ever work. Justify with one equation."*

The answer is no — the release direction carries the water forward, so the ramp must end uphill of
the glass. A student who can say that has understood the chapter; a student who has to try it has
not.

---

## 3. Chapter 2 — The Obstacle (levels 11–20)

**Taught:** friction, normal reactions, and rigid-body equilibrium.
**The one idea:** the room gets a say in where your line may go.
**Rungs:** 3–4.

| # | Level | On the page | Principle | Reasoning | Trap & misconception |
|---|---|---|---|---|---|
| 11 | **Over The Wall** | Vertical wall mid-corridor | Clearance; two supports either side | "Over, and rested on both sides — landing on the wall top alone gives one contact." | Resting on the wall. *Misconception: a wide flat top is a good support.* |
| 12 | **Under The Shelf** | A wide shelf below the corridor, glass behind it | Projectile under a ceiling | "I need a flat, low release so the water travels under the shelf's lip and still reaches the mouth." | Aiming over the shelf. *Misconception: always go over obstacles.* |
| 13 | **The Funnel** | Two angled walls narrowing to a mouth | Inelastic collisions with walls; energy lost per bounce | "Aim down the axis; every wall bounce costs water." | Bouncing off one wall to reach the other side. |
| 14 | **Crate Stack** | Two crates of different heights | Multiple normal reactions; a staircase of surfaces | "Use the lower crate as a rest and the upper as a deflector." | Treating the crates as pure obstacles. *Misconception: everything solid is in the way.* |
| 15 | **Ice Run** | Ice block under the gap | Coefficient of friction; angle of repose; water on ice barely resists sliding | "Ice cannot hold water — it must be the *line* that carries the water past it." | Letting water run onto the ice. *Misconception: a solid surface supports anything on it.* |
| 16 | **The Sill** | A narrow sill juts out | Contact point; a short rest is a fulcrum | "A 60 px sill is a pivot, not a shelf — the line will tip around it unless the far end is held." | Resting only on the sill. |
| 17 | **Stone Step** | A stone block below the mouth | Momentum transfer and splash | "Stone is dead: the water will not slide from it, it will splash — end the line before the block." | Expecting a rebound. *Misconception: hard surfaces bounce water.* |
| 18 | **The Trench** | Glass between two low walls | Entry angle; clearing the lip | "Get over the lip, then straight down." | Hitting the inner wall. |
| 19 | **The Ledge** | A long ledge then nothing | Long run = high release speed = long flight | "The ledge does the accelerating; the line only needs to deliver water onto it." | Drawing a full ramp parallel to the ledge. *Misconception: more line = more control.* |
| 20 | **Split Sill** | Two sills with a gap between | Aperture aiming | "The gap is the target. Line up the release with the gap, not the glass." | Aiming at the glass. |

**Chapter exam:** *"Two supports hold a heavy wire. One is a 60 px sill, the other a 200 px plank.
Which end should be uphill, and why?"* (The short one: it is a fulcrum, so it must not carry the
overhang.)

---

## 4. Chapter 3 — The Weight (levels 21–30)

**Taught:** momentum, impulse, collisions, coefficient of restitution, rolling.
**The one idea:** something else is using the same space, and it has mass.
**Rungs:** 4–5.

| # | Level | On the page | Principle | Reasoning | Trap & misconception |
|---|---|---|---|---|---|
| 21 | **Dead Weight** | Heavy ball above the gap | Impulse; the line must survive a sudden load | "Support both ends and put a rest directly under the ball's fall line." | One-ended line. |
| 22 | **Ball And Glass** | Ball dropping toward the glass | Toppling: CM leaves the base | "The ball must land on the line, not on the rim." | Catching the ball on the glass rim. *Misconception: a heavy glass cannot tip.* |
| 23 | **Rubber Ball** | Light ball, high bounce | Coefficient of restitution; elastic vs inelastic | "It will bounce off my line — so put the line where the bounce goes to the glass." | Meeting it head-on. |
| 24 | **The Brace** | Ball resting on the wire | Friction μN: the ball's weight *increases* the friction that holds the wire | "Let the ball sit on the line; its weight is a clamp, not a threat." | Fighting the ball. *Misconception: every loose object is a hazard.* |
| 25 | **Ball Run** | Ball on a sloping plank | Rolling: *a = g·sinθ* for sliding, *5/7 g·sinθ* for a rolling sphere | "It arrives slowly; it is not a projectile — it will follow the plank, then roll." | Treating it as falling straight down. |
| 26 | **Two Weights** | One heavy, one light, same start height | Free fall is mass-independent; momentum is not | "They land together but hit differently — the heavy one must land on the line, the light one can be deflected." | Assuming the light one drifts. *Misconception: heavier falls faster.* |
| 27 | **The Plug** | A gap a ball fits exactly | Geometry; jamming | "Drop the ball into the gap and it becomes a wall for free." | Blocking the gap with ink instead. |
| 28 | **Ball Trap** | A bowl of scenery | Potential well; energy to escape | "The bowl keeps the ball; I only need to keep the water out of it." | Rescuing the ball. |
| 29 | **Heavy Lid** | Ball directly above the mouth | Interference; sequence | "The ball covers the mouth. Let it settle to one side first, or take the ball away from the mouth." | Pouring into a covered mouth. |
| 30 | **The Keeper** | Two balls, one glass | Combined impulse | "Both must be stopped or deflected, but only one line." | Chasing both. |

**Chapter exam:** *"A 20 g ball and a 5 g ball are released together above a line. Which one will
displace the line more, and by what factor?"* (Four times, by momentum; equal speeds by Galileo.)

---

## 5. Chapter 4 — The Machine (levels 31–40)

**Taught:** non-conservative forces, work done by a field, superposition, and latent heat.
**The one idea:** forces you cannot see still have a direction, and the arrow tells you which.
**Rungs:** 5.

This is the chapter I would teach most carefully, because it contains the best analogy in the game:

> **A blower is a uniform field.** Gravity is a constant downward acceleration; the gate applies a
> constant sideways one. Add them and you get a single **effective gravity** that is tilted. The
> trajectory is still a parabola — just aimed along the tilted axis. A student who sees that can
> predict the drift; a student who does not will fight the wind forever.

| # | Level | On the page | Principle | Reasoning | Trap & misconception |
|---|---|---|---|---|---|
| 31 | **Crosswind** | Grey blower, arrow pointing left, mid-air | Superposition of constant fields → tilted effective gravity | "The water falls along a diagonal — aim as if gravity pointed down-left." | Aiming straight down. |
| 32 | **Wind Shadow** | A block between blower and corridor | Field shadow; no force inside the lee | "Put the line in the shadow and the wind costs nothing." | Building a wall of ink. *Misconception: you must oppose a force with a force.* |
| 33 | **Updraft** | Blower pointing up from the floor | Opposing field; effective *g* reduced; longer flight time | "The water falls more slowly, so it drifts further — shorten the line." | Ignoring the extra flight time. |
| 34 | **Fan And Ball** | Wind + one heavy ball | Two independent perturbations | "The ball is a *support* problem, the wind is a *flight* problem — solve them in that order." | Trying to solve both at once. |
| 35 | **The Drift** | Long corridor, strong crosswind | Displacement under constant acceleration: *s = ½at²* | "Time aloft is fixed by the drop; the drift is fixed by the time. My release point must be shifted upwind." | Aiming at the glass instead of upwind of it. |
| 36 | **Two Blowers** | Blowers left and right | Superposition; a null point between opposed fields | "There is a still column in the middle — put the water in it." | Seeking shelter at one edge. |
| 37 | **Hot Plate** | Heated floor under the gap | Latent heat: energy needed to evaporate; a budget | "Every droplet that touches the plate is spent. The line must not deliver water to the floor at all." | Letting spill reach the floor. |
| 38 | **Steam Room** | Two heated plates | Same, twice; the safe corridor is narrower | "There are two budgets to respect, so the stream must stay high the whole way." | Slowing down near the second plate. |
| 39 | **The Lid** | A pinned bar above the mouth | Newton's first law; torque and moment of inertia | "It is stationary until something hits it — so water will rotate it out of the way, and my line will not." | Expecting the bar to stay still under a stream. |
| 40 | **Weather** | Wind + heat (+ ball) | Combined | "Attack in order: keep it off the floor, then correct for wind." | Fixing both at once. |

**Chapter exam:** *"A droplet spends 0.8 s in the air and the wind gives it 300 px/s² sideways. How
far does it drift, and in which direction must the release point move?"* (96 px downwind; release
must move upwind by that much.)

---

## 6. Chapter 5 — The Glass (levels 41–50)

**Taught:** equilibrium of a rigid body, centre of mass, and toppling.
**The one idea:** the target is a physical object, and it can be knocked over.
**Rungs:** 5–6.

The condition I want students to state without being told:

> A body topples when the vertical through its centre of mass falls **outside its base**. A glass on a
> narrow base is stable only while the load stays over that base — so where the water lands matters
> as much as whether it lands.

| # | Level | On the page | Principle | Reasoning | Trap & misconception |
|---|---|---|---|---|---|
| 41 | **Glass On A Slope** | Glass standing on an inclined slab | Impending slip vs toppling; μ and the CM condition | "At this angle it slides before it tips — so the line must also be a chock." | Just feeding it. |
| 42 | **Glass In A Gap** | Glass between two walls | Support reactions from both sides; jamming | "The walls are its base now; the line only needs to feed it." | Adding a floor it does not need. |
| 43 | **Edge Of The World** | Glass near a drop | Stability margin | "Any nudge off the edge is fatal — land the water centrally and gently." | A steep, high-energy stream. |
| 44 | **Narrow Neck** | Tall walls, small mouth | Aperture + entry angle | "The mouth is a third of a glass wide; the range must match the neck, not the glass." | Aiming at the body of the glass. |
| 45 | **Tipping Point** | Glass on a seesaw | Moments about a pivot: Στ = 0 | "Water landing on the far arm tips it; land near the pivot instead." | Putting the water anywhere on the plank. |
| 46 | **Cup On A Column** | Glass balanced on a pedestal | Small base → easy toppling | "The pedestal is narrow, so the load must come in over the pedestal, not the rim." | Landing on the rim to "help" it in. |
| 47 | **Hands Off** | Nothing under the glass | Impulse; catching a falling body below its CM | "Catch it low and centrally, or it rotates as it lands." | Catching the rim. |
| 48 | **Low Ceiling** | A slab above the mouth | Entry clearance | "Stop the line short — otherwise the slab deflects everything away." | Pouring through the ceiling. |
| 49 | **Deep Cup** | A tall glass | Entry angle; wall splash | "It must enter near-vertically or it sprays off the far wall." | A fast, shallow entry. *Misconception: any hole in the top will do.* |
| 50 | **The Exam** | A glass on a slope, a ball | Combined: CM + impulse | "The glass is the fragile thing here; the ball is a threat to the glass, not to the line." | Protecting the line at the glass's expense. |

**Chapter exam:** *"A glass 100 px wide on a 60 px base is loaded 30 px off centre. Will it tip?
What is the smallest shift of the load that makes it tip?"* (It stays while the CM is inside the
base; the margin is what the level is teaching.)

---

## 7. Chapter 6 — Two Bodies (levels 51–60)

**Taught:** systems of particles, coupled bodies, and division of flow.
**The one idea:** sometimes one line has to serve two of something.
**Rungs:** 5–6.

| # | Level | On the page | Principle | Reasoning | Trap & misconception |
|---|---|---|---|---|---|
| 51 | **Twin Taps** | Two taps, one glass | Two sources, one sink; the line serves the one that matters | "Only one of them can be fed by one line — choose." | Trying to serve both. |
| 52 | **Second Spout** | An extra spout pouring into the room | Unwanted source | "Treat the second spout as a hazard, not a supply." | Ignoring it. |
| 53 | **Overflow** | A glass that overflows into another | Conservation of mass flow | "Fill the high one; the overflow does the rest." | Aiming at both glasses separately. |
| 54 | **Two Glasses** | One stream, two mouths | Division of flow; the apex splits the stream | "Peak the line under the tap; the stream divides itself." | Two separate lines fighting near the tap. |
| 55 | **Hands And Pins** | A pinned bar across the corridor | Torque; a bar turns instead of blocking | "Jam it with the line, or go under it — do not pour onto it." | Pouring onto a free bar. |
| 56 | **Rejoin** | Two corridors, one glass | Two paths; one is cheaper | "Choose the path whose geometry needs less ink." | Drawing both. |
| 57 | **Long Arm** | A very long span | Sag and the need for a mid-support; a long rigid body is a lever | "A span this long needs a third contact, or it pivots about its ends." | One line across the whole span. |
| 58 | **Lever** | A seesaw under the drop | Moments: load × arm | "Water landing far from the pivot turns the beam; land near it." | Ignoring the arm length. |
| 59 | **The Pivot** | A bar on a pin below the mouth | Moment of inertia; energy into rotation | "The bar will spin away with some of the energy — use it as a deflector, not a floor." | Resting water on a free bar. |
| 60 | **Halfway Exam** | Two taps, a pivot, a narrow mouth | Nothing new, everything harder | "Order the problems: choose the source, then the flight, then the mouth." | Solving in the wrong order. |

---

## 8. Chapter 7 — The Exams (levels 61–70)

No new teaching. Each level combines **exactly two** chapter ideas, and the tip tells you nothing
about the physics — that is the point.

| # | Level | Combination | The reasoning I want to see |
|---|---|---|---|
| 61 | **The Machine Room** | Wind (ch. 4) + ball (ch. 3) | Correct for drift first, then place the rest under the ball's fall line |
| 62 | **Narrow World** | Wind + aperture (ch. 4 + 5) | The mouth is fixed; the wind sets the release point |
| 63 | **Slippery When Wet** | Friction (ch. 2) + toppling (ch. 5) | The glass is the fragile thing; ice is the fast thing |
| 64 | **Needle** | Aperture + long flight | Range precision, not aim |
| 65 | **Two Storeys** | Clearance + wind | Two constraints, one line — find the corridor that satisfies both |
| 66 | **The Gauntlet** | Heat + pivot + ball | Budget the water first, then the shape |
| 67 | **Uphill** | Release above the target | The water must fly up-ish; only a fast release does it |
| 68 | **The Vault** | Aperture above + drop below | Aim the aperture, then let gravity finish |
| 69 | **Last Light** | Wind + pivot | Solve the flight, then accept the bar as a deflector |
| 70 | **Grand Finale** | Wind + heat + ball + pivot | Attack in a fixed order and trust it |

---

## 9. The nine failing levels: remove or restructure

Rule I am applying: **if the level's idea is already taught better elsewhere, remove it. If the idea
is unique, restructure the objects until the geometry is honest.**

| # | Level | Why it fails today | Decision | What changes |
|---|---|---|---|---|
| 12 | **Under The Shelf** | The shelf sits directly above the mouth, so *no* line can deliver water into it — the level is not hard, it is impossible | **Restructure** | Move the shelf 120 px left and 60 px up so it shades the *approach* but not the mouth. Idea kept: projectile under a ceiling. |
| 15 | **Ice Run** | Water landing on the ice slides straight past; the only fix is not to use the ice, which makes the block decoration | **Restructure** | Put the ice *in the fall line* as a hazard the line must bridge over, with the plank ends either side of it. Idea kept: friction cannot be relied on. |
| 17 | **Stone Step** | The stone block is too close to the mouth; the splash kills the stream and removing the block changes nothing | **Remove** | The "hard surface splashes" idea is already taught by 37 (Hot Plate) more clearly. Replace with a *stone* version of 14's stacked rests so the chapter still has a stone level. |
| 19 | **The Ledge** | The ledge is 260 px long and launches the water far past the glass; any line on it overshoots | **Restructure** | Shorten the ledge to 140 px and lower the glass's far edge so the release is at a shallow angle. Idea kept: let the scenery do the accelerating. |
| 20 | **Split Sill** | Fails by 0.03 — a knife-edge, not a puzzle | **Restructure** | Widen the gap between the sills by 30 px so the aperture is a real target with tolerance. |
| 35 | **The Drift** | Fails by 0.004. The wind is so strong that only one line in the whole space works | **Restructure** | Reduce the blower force by 30 % and move the blower 80 px closer, so the drift is a correction, not a lottery. |
| 40 | **Weather** | Three mechanics at once in a chapter that has just introduced them — it fails because it is an exam placed before the exam | **Restructure** | Drop the ball. Chapter 4's exam tests chapter 4; the ball returns in 61 where it belongs. |
| 50 | **The Exam** | The glass slides off its slope before the water arrives, so the level is lost before it is played | **Restructure** | Give the slope a lip so the glass can only slide 20 px, not off the edge. The instability stays; the unfairness goes. |
| 57 | **Long Arm** | A 400 px span with two contacts pivots about its ends; the ink budget makes a mid-height support impossible | **Restructure** | Add a third, mid-span rest as scenery. Idea kept: long spans need three contacts. |

### Also reverting a shortcut I took

Six levels (11, 20, 38, 51, 69, 70) were made passable earlier by **lowering their fill target**. That
is fixing the measurement instead of the level. All six go back to their intended `need`, and if they
cannot be made honest they will be restructured like the nine above.

---

## 10. How I would mark a student's solution

Not "did it win". Three questions, in order:

1. **Did they name the principle?** ("This is a projectile from a tilted release.")
2. **Did they predict before drawing?** If the first line wins, they predicted. If the fifth line
   wins, they were searching.
3. **Did they use the room?** A solution that ignores the wedge, the shadow or the crate is a
   solution that treats the level as a blank page. Those get one star, deservedly.

That is what the ink meter is for, and it is why the three-star scale is honest: it is not measuring
luck, it is measuring whether the student thought about length before drawing.
