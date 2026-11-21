# What the competitor level set does, and what our 70 rooms do instead

Sources: nine screenshots supplied by the user of *Happy Glass* (Lion Studios) levels 1–8 and 24.
These are **not** our levels. They are used here as a design reference only.

Nothing in this document is a claim about our own rooms being "creative". Section 4 is the audit of
our own set, and it is the part that matters.

---

## 1. Teardown — one row per reference level

| Ref | Props on screen | State of the cup | Stroke the level demands | Skill tested | The trap (the plausible wrong answer) |
|---|---|---|---|---|---|
| 1 | two cups on stands, a dividing wall between them | standing — **and there are two of them** | an inverted **T / roof** with a run-off each side | splitting one stream into two | pouring into one cup and starving the other |
| 2 | two small floating platforms, one big ramp that is pure scenery | **unsupported, hanging in mid-air** | one flat **shelf** spanning both platforms, right under the cup | build a floor for the cup | routing the water — it falls straight past the cup |
| 3 | one long tilted plank | standing at the top of a slope | a short **wedge** behind the cup | bracing against a slide | drawing a trough across the slope; the cup slides away first |
| 4 | four small blocks in a diamond around the cup | **unsupported**, in a gap | one **bridge** across the *lower* pair | bridging, and choosing the height | bridging the *upper* pair — inviting, and the cup sits too low |
| 5 | one wide block and one small block at different heights | **unsupported** | a **shelf** spanning two anchors at different heights, nearly level | spanning at unequal heights | a steep shelf — the cup slides off the high end |
| 6 | cup on the floor, one block at rim height beside it | standing, **knockable** | a **cage / hook** around the cup | protecting the cup from its own water | filling it: the pour knocks it over |
| 7 | two planks at different heights | **in mid-air** | a **hook** that ties the cup to the plank | latching to fixed scenery | building a floor so low the cup can never be filled |
| 8 | cup on the floor, two shelves above, a gap between them | standing | a **funnel** that bends the stream past the shelves | routing around an obstacle overhead | pouring straight down — the shelf eats the stream |
| 24 | cup on the floor, three round beads in a diagonal above it | standing | a **deflector** around fixed curved obstacles | guiding around shapes you cannot use as rests | trying to knock the beads away |

Read the column "state of the cup". In **six of nine**, the glass is not simply standing on the floor.
In four it is unsupported, in one it is on a slope, in one it can be knocked over. **The cup is the
puzzle, not the destination.**

Read the column "stroke the level demands". Roof, shelf, wedge, bridge, cage, hook, funnel, deflector.
Every one of those is a *structure* that carries load. Not one is a long ramp across the screen.

---

## 2. The ten rules this set follows

1. **The tap is top-centre and the fall is vertical.** The player reasons about the middle of the
   screen. Aiming is not the skill; construction is.
2. **The cup's state is a design parameter** — standing / unsupported / on a slope / knockable / in a
   gap / in mid-air. Each state is a different question, so one tap position can carry eight rooms.
3. **One to four props.** Each is either an *anchor* (a place to rest a stroke), an *obstacle* (a thing
   to route around), or *scenery* (never used at all — level 2's big ramp).
4. **The demanded stroke is structural**: roof, shelf, bridge, wedge, hook, cage, funnel.
5. **One new verb per level**, then the next three reuse it with a twist before the next is introduced.
6. **The trap is visible.** The wrong pair of blocks is the inviting one. Nothing is hidden; the level
   is a disagreement between the obvious answer and the correct one.
7. **Ink is a budget, stars are the grade.** A short structural answer wins; flourish costs stars, not
   the level. This is what keeps "draw a giant funnel around everything" from being the answer.
8. **Failure is legible**: the water misses, the cup slides, the cup tips. The player can always say
   *why* it failed.
9. **Nothing moves on its own** in this band of levels. The answer is spatial logic, not timing.
10. **Level 1 already teaches the twist**: two cups, so your very first stroke has to do more than one
    thing at once.

---

## 3. What the set tests, in order (the actual difficulty curve)

Difficulty rises by **adding a verb**, never by narrowing a corridor.

| Band | Verb | What the player must reason about | Our 70 rooms |
|---|---|---|---|
| 1 | split | one stroke, two destinations | absent |
| 2 | support | the cup has no floor; make one | impossible by our audit rule |
| 3 | brace | hold something that wants to slide | absent |
| 4 | bridge | pick the right anchors, and the right height | absent |
| 5 | span | two anchors at different heights | absent |
| 6 | protect | keep the cup standing while filling it | absent |
| 7 | latch | tie a loose object to the fixed world | absent |
| 8 | route | bend a falling stream around an obstacle | absent |
| 9+ | combine | two verbs in one room, then timing | absent |

That table is the whole difference. We have seventy rooms of band 0.

---

## 4. Our own set, measured

Numbers from `tools/scenes.js` (the generator input), current branch:

| Measurement | Ours |
|---|---|
| Rooms where the cup is to the **right** of the tap | **70 / 70** |
| Rooms where the cup is left of, above, or under the tap | **0** |
| Distinct tap positions | **9** (57 rooms use exactly `x = 430`) |
| Rooms with more than one glass | **0** — including the room *named* "Two Glasses" |
| Rooms where a glass is unsupported (`hanging`) | **0** |
| Rooms where the glass is fixed (`fixed`) | **0** |
| Rooms where the glass starts on a slope | 0 (every glass is snapped onto a flat shelf) |
| Average props per room | 2.5, and nearly all of them are tilted planks on the water's route |
| Distinct stroke shapes ever demanded | **1** — a downhill run from near the tap to the mouth |

And the cause is not only taste. **Our own audit forbids the best idea in the reference set.** The
layout check asserts *"every standing glass has a base under it"*, so a room whose whole question is
"the cup is hanging — build it a floor" fails the build before it can be played. I wrote a rule against
creativity, then reported "70/70 clean" as if that were the goal.

Second cause, equally mechanical: the solver's answer vocabulary is a downhill run. Any room that does
not admit one either got rejected as unsolvable or got bent until it did. That funnel is why 15+ felt
harder and identical — the only dial left was margin.

---

## 5. What our engine already supports (and never uses)

This is the encouraging part: the physics is not the problem.

| Capability | In the engine | Used by our levels |
|---|---|---|
| several taps in one room (`lv.faucets` array) | yes | no |
| an unsupported cup that must be given a floor (`hanging`) | yes | **no room uses it** |
| a fixed cup (`fixed`) | yes | no |
| two or more cups, win when all are full | yes | no |
| a per-room ink budget (`lv.ink`, 600–900) | yes | never tight enough to matter |
| balls, pins, seesaws, crates, hot plates, fans | yes | a few rooms, each as a different slide |
| a cup that can slide, tip, fall and be lost | yes | never the point of a room |

So the work is **authoring vocabulary + proving vocabulary**, not new physics.

---

## 6. What has to change to inherit the grammar

1. **Composition convention.** Tap at the top centre (`x ≈ 640`, `y ≈ 150`), cup on or near the centre
   column, play band between. The fall is vertical; the drawing space is the middle.
2. **Cup states become level data.** `standing` (default), `hanging` (needs a floor), `sloped`,
   `knockable`, `gapped`. The existing `hanging` flag is the first of these and is already wired.
3. **The audit rule is re-scoped**, from *"a glass has a base under it"* to *"a glass has a base under
   it **or** the reference stroke provides one, proved by simulation"*. Otherwise stand-building rooms
   cannot exist.
4. **Win condition gains a second clause**: the cup must still be on its mark and standing when filled.
   We already track tipping, falling and displacement — it was never a gate.
5. **Win modes**: all cups full (split rooms) or any one cup (choice rooms).
6. **Tight ink budgets**, about 1.3× the reference stroke. Without this the structural answer is not
   forced.
7. **A second kind of proof: stillness.** For support, brace, cage and hook rooms, the proof is *not*
   the pour. It is: place the reference stroke, run three seconds with no water, and require the cup to
   move less than 6 px and lean less than 0.05 rad. That is cheaper than what we already run.
8. **New stroke shapes in the solver**, because a shelf, a wedge and a hook are not downhill runs:
   level shelf between two anchors; wedge behind a cup; hook from a loose cup to a fixed anchor; cage
   bracket; funnel (V); deflector around a ball.
9. **A diversity gate measured on the picture, not the parts list**: within a chapter, no two rooms may
   share the tap position, the cup position, or the silhouette of their props. The old check compared
   prop *names*, which is why seventy identical rooms passed it.
10. **Acceptance stays the same**: every room proved with a reference stroke that wins under jitter,
    no pen leaks, no body buried in scenery, nothing moving on its own.

---

## 7. The eight pilot rooms

Coordinates for our 1280 × 720 stage. Each one is a verb from §3, not a variation of a slide.

| # | Working name | Verb | Layout | The stroke it should demand | Proof | The trap |
|---|---|---|---|---|---|---|
| R1 | The Floor | support | cup **hanging** at (640, 430); two blocks at (450, 545) and (830, 545), 90 px | a flat shelf between the two block tops | stillness | funnelling water down to it; it falls past |
| R2 | Sharing | split | two cups at (500, 560) and (780, 560); wall between them (640, 500, 20, 130) | a roof with a run-off to each side | both filled | feeding one and losing the other |
| R3 | Wedged | brace | cup standing on a 0.1 rad slope; nothing behind it | a wedge behind the cup | stillness, cup < 6 px | drawing a trough; the cup leaves before the water lands |
| R4 | Two Heights | span | blocks at (450, 570, 110, 40) and (800, 485, 90, 40); cup hanging at (620, 430) | a shelf between two unequal anchors | stillness at both ends | a steep shelf; the cup slides to the low end |
| R5 | Keep It Standing | protect | cup on the floor under the tap; a block at rim height beside it | a cage that keeps the cup upright | cup < 8 px **with water** | filling it and watching the pour push it over |
| R6 | On The Hook | latch | cup hanging at (560, 470); a fixed plank at (790, 480, 150, 14) | a hook from the cup to the plank | stillness | a floor too low to ever fill |
| R7 | The Ceiling | route | cup on the floor; two shelves above it with a gap between | a funnel that bends the stream past the shelves | pour | pouring straight down into the shelf |
| R8 | Beads | deflect | cup on the floor; three balls in a diagonal above it | a deflector that guides around curved props | pour | trying to use the balls as rests; they roll |

Eight rooms, eight different questions, one tap position. If these eight feel like the reference set,
the grammar transfers; if they do not, the plan is wrong before I touch the other 62.

---

## 8. What happens to the existing 70

They are *beatable* — that was the last request and it is true — but roughly fifty of them are the same
room with a different prop in the middle, and no amount of re-solving changes that. The plan is a
rewrite in chapters, one verb per chapter, keeping what already works: the physics, the ink, the pen,
the UI, the proving pipeline.

What I will not do again: retune the same room, or lower a target to make a room provable.

---

## 9. The ball chapter — what the reference does with a loose ball, and what we shipped

Read off thirteen screenshots of the reference's mobile and web builds (levels 2, 6, 12, 14, 15, 16,
18, 19, 20, 22, 26, 28): a ball in that game is never scenery. It is a **second failure condition**
competing with the pour. The cup can be perfectly fed and still lose.

What the reference actually does with them:

| Reference idea | What it teaches | What we could build |
|---|---|---|
| a ball sits *in* a cup or a triangular trough and has to be tipped out | the ball is a body the player can move indirectly | no — our ink cannot lift a ball, and a ball already in the mouth spoils the glass on frame one |
| a ball rolls down a fixed slope into the cup; a drawn wall stops it | the answer is a **structure resting on the level**, not a shield in mid-air | **yes** — this is the whole chock family (17 of the 25 ball rooms) |
| a ball bounces off an orange bumper and is redirected | deflection beats blocking | partial — a drawn ramp redirects a ball that is already moving, but a ball that lands *on* a sloped wire wedges there and stops dead |
| two balls, one chute, one answer | one stroke can serve two bodies | **yes** — room 11, the queue |
| a ball must be kept out while the cup fills from the far side | the ball and the water are two separate routes | **yes** — rooms 13, 14, 19 (spout + chock) |

The one thing the reference does that we cannot: **decorative danger that resolves itself.** In the
reference a ball often rolls harmlessly into a hole and the level is still about the water. In our
engine a ball that is not dangerous at t = 0 makes the room solve itself, and `solve-hero` refuses to
ship it. Every ball in our set is a live threat on the first frame.

Numbers, for the next person:

* the mouth is 108 px wide and a ball is 52 px, so a ball leaving a ramp anywhere between `cup.x − 40`
  and `cup.x − 20` falls in; `cup.x + 0` mostly bounces off the far rim and is *not* a threat;
* a ball set down on a slope under about 0.25 rad does not start moving — it has to be dropped onto
  the ramp (we place it 34 px above the surface), or the ramp has to be steep;
* a straight stroke needs roughly 90 px of length to hold a 26 px ball rolling at 3 px/frame; 70 px
  holds on a 0.26 rad ramp but not on a 0.34 one;
* a free-standing vertical stroke never holds — it topples and the ball rolls over it.
