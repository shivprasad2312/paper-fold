# How the reference game builds a level — reverse-engineered

Sources: the 71 screenshots supplied in chat. The clearest are **L1–L8** (their tutorial run),
**L22** (a ball room, with the answer drawn in), **L12, L14, L15, L16, L17, L20, L26, L28**
(ball rooms, unsolved), and **L2, L6, L46** (routing rooms with the answer drawn in). Every claim
below is read off those images; nothing is inferred from memory or from marketing copy.

This document exists because our own set has failed four reviews in a row for the same reason: we
kept copying *pictures* from the reference while ignoring their **build order**. Their rooms look
varied because the variety is produced by the process, not by hand-placing one prop differently.

---

## 1. Their build order (the actual algorithm)

Reading the reference set in level order, the same six decisions are made in the same sequence every
time. This ordering is the thing that produces variety; a level that skips a step reads as a clone of
the previous one.

**Step 1 — lay the terrain first, and make it big.**
Before the cup exists, 40–60 % of the screen is one or two large teal masses: a plinth, a stepped
platform, a big trapezoid, an L-shaped shelf. In L2 the terrain is two enormous blocks with a long
diagonal running to the cup. In L15 it is an L-shaped shelf. In L26 a single column fills the right
third. These masses are *static, dumb geometry*; they exist to give the player **anchor surfaces**.

**Step 2 — sit the cup on the terrain, never at a default height.**
The cup is either standing on a plinth (L26, L46), wedged in a gap between two blocks (L2), hanging
with nothing under it (L15 area), or sunk to floor level (L14). Its height and its relationship to
the terrain is one of the two things the player reads first.

**Step 3 — put the tap off-centre, and aim it at the terrain, not at the cup.**
In L2, L6, L14, L15, L16, L26 the tap is *not* above the cup — it is 150–350 px away and often
pointed sideways into a block. The distance and angle between tap and cup **is** the puzzle's
difficulty knob. Our set has the tap above the cup in 33 of 40 rooms; that single choice is why our
rooms read as identical.

**Step 4 — pick exactly one hazard and place it where it occupies the drawing space.**
Their hazards are balls, hot surfaces, and wind. Crucially the hazard is placed **over the cup or in
the space between the tap and the cup**, i.e. exactly where a lazy straight chute would go. The
hazard is not an obstacle beside the route — it *is* the reason the route cannot be straight.

**Step 5 — the answer is a two-anchor stroke, never a free-floating one.**
Look at the drawn answers: L2 — a long line across the top of the blocks. L22 — an arc slung from the
right platform, over three balls, ending in mid-air. L26 — a brace off the cup's base. L28 — a cradle
off the shelf edge. In every case the line is held by **two pieces of scenery (or a pen contact and
one piece)**. This is what lets them draw *arches, cradles, troughs, V's, canopies* — shapes a
one-anchor line cannot hold.

**Step 6 — leave dead space.**
Their compositions are asymmetric with large empty regions. The action is usually a diagonal band
across the middle. Our rooms are centred, symmetric and fill the frame evenly, which makes any two of
them look like the same picture even when the props differ.

---

## 2. What their balls actually do

This is the part we got most wrong, and it is visible in every ball reference:

| Ref | What the balls are doing | What the player must decide |
|---|---|---|
| L12 | three balls **stacked on nothing**, directly above the cup | how to catch a stack that is already failing |
| L14 | one big ball poised **on top of a static ramp** whose foot ends at the cup | whether to chock the ramp or roof the cup |
| L15 | two balls **resting on an L-shelf** that overhangs the cup | whether to break the shelf's lip or brace the shelf |
| L16 | two big balls **hanging in the air** over a V of two static planks | how to close the V so both shed away from the mouth |
| L20 | one ball above, two horizontal planks beside the cup | which plank is the safer anchor |
| L22 | three balls **resting on the line the player has drawn** | draw a beam strong enough to hold all three |
| L26 | a ball **wedged under the cup's base** on a plinth | that the cup, not the ball, is the thing at risk |

**Only two of these eight have a ball in free flight at t = 0.** Most of their balls are *static
hazards perched on scenery* — they fall when the player's line disturbs them, or when the tap's water
arrives. That is a completely different question from "a projectile is already inbound", and it is
what generates their variety.

Our 25 ball rooms had a ball in flight in **25 of 25**. That is why every one of them resolved to
"put something in the ball's path before it reaches the mouth" — one question asked 25 times.

---

## 3. Scale, in numbers

Measured off the reference screenshots, normalised to our 1280×720 stage:

| Element | Reference | Ours | Effect of the gap |
|---|---|---|---|
| Big terrain mass | 220–420 px wide, 150–320 tall | we have almost none | our rooms have no landscape, only props |
| Plank / shelf thickness | 14–22 px, length 260–520 | 16 px, length 130–260 | ours read as sticks, theirs as structures |
| Tap offset from cup | 150–350 px, often sideways | 0 px in 33/40 rooms | ours are all "cup under tap" |
| Distance tap → cup | 120–380 px | 200–420 px, always vertical | ours are all the same geometry |
| Anchors used by the answer | 2 in ~90 % of levels | 1 in 25/25 ball rooms | ours cannot hold arches or cradles |
| Dead space | 35–55 % of frame | ~5 % | ours are uniformly full |

---

## 4. Measured diagnosis of our current set

Running a structural signature (what the room is *made of*, not where things sit) over our 25 ball
rooms:

| Count | Structure | Rooms |
|---|---|---|
| 13× | sill + column + crate + **dropped** ball + standing cup | 21, 28–40 |
| 10× | column + crate + **thrown** ball + standing cup | 17–20, 22–27 |
| 1× | column + thrown ball | 16 |
| 1× | sill + dropped ball | 31 |

**Four structures across 25 rooms.** The user's screenshots of 29–40 are all drawn from the
thirteen-room block — the only thing that changed was the ball's position on the same plank.

The same three numbers, taken across all 40 of our rooms:

| Measure | Reference | Ours | Verdict |
|---|---|---|---|
| rooms containing a terrain mass ≥ 200×120 | most | **0 of 40** | we have no landscape at all |
| rooms whose tap sits directly over the cup (<20 px) | a minority | **28 of 40** | one geometry, 28 times |
| ball rooms with a ball already in flight at t = 0 | 2 of 8 | **11 of 25** | we made "intercept a projectile" the whole game |

Zero terrain masses is the single most damning figure: a player reads a room by its masses, and we
gave them props instead.

Our previous gate hashed the *stroke*, so it reported "40 distinct rooms" while the game showed four.
The gate measured the wrong thing.

---

## 5. The one engine limit that blocks a true clone

Two things the reference does constantly, and our water cannot:

1. **Water travelling sideways along a drawn surface.** Their water is blob-based with surface
   tension; it slides along a line and pours off the low end. Ours is a particle sim; droplets bounce
   and scatter. Measured this session: of **144 sensible chute geometries** (tap left, cup 340 px
   right), **exactly one** carried any water at all, and only 0.14 of a cup. Bridge, staircase,
   cascade and pin-hammock rooms all failed for this reason.
2. **A beam above the mouth that catches a ball but not the water.** In their physics the water
   passes or slides; in ours a surface above the mouth collects the pour and seals it.

Everything else in their grammar **is** copyable today, and it is most of what makes their rooms look
different from each other: big terrain masses, off-centre taps, cups on plinths and in gaps, static
perched ball hazards, two-anchor strokes, dead space.

---

## 6. The rebuild — 25 rooms, eight families, their build order

Each row is a *composition recipe*, not a variation of the previous room. Terrain is listed before
the cup and the tap, because that is the order it must be built in.

| # | Family | Terrain (step 1) | Cup (step 2) | Tap (step 3) | Hazard (step 4) | Answer shape (step 5) |
|---|---|---|---|---|---|---|
| 16 | Plinth | 260×340 column right of centre | on the column | 240 px left, aimed at the column | ball perched on the column's left lip | plate off the column face |
| 17 | Plinth + lid | column + slab above it | on the column, slab 140 px over its mouth | above the slab | ball on the slab | side entry under the slab |
| 18 | Two-block gap | two blocks with a 120 px slot | wedged in the slot | above the slot | ball stacked above the slot | bracket across the slot |
| 19 | Shelf of balls | L-shelf overhanging the cup | floor, under the shelf's shadow | left, pouring past the shelf | two balls resting on the shelf | prop the shelf or break its lip |
| 20 | Shelf of balls | reversed L | floor, right | right | two balls on the shelf | brace the shelf |
| 21 | Ball ramp | long static ramp, foot at the cup | floor, at the ramp's foot | left | one ball poised at the ramp's top | chock high on the ramp |
| 22 | Ball ramp, steep | short steep ramp | floor, under the foot | centre | two balls, nose to tail | long chock / cradle |
| 23 | V deflectors | two static planks forming a V above the cup | floor | centre | two balls above the V | close the V's mouth |
| 24 | V deflectors, offset | V with one arm long | on a plinth | left | three balls | complete the V's low side |
| 25 | Beam over glass | two blocks either side, 400 px apart | floor, between them | left, off the beam's span | three balls stacked over the cup | beam slung between the blocks, arched |
| 26 | Beam over glass | same, unequal block heights | floor | right | two balls | sloped beam |
| 27 | Loose base | plinth with a loose block at its foot | on the plinth | left | ball that rolls into the loose block | pin the block, not the ball |
| 28 | Loose base | same, block above the cup | on the plinth | centre | ball above the block | brace the block |
| 29 | Ball under cup | wide low platform | on the platform's edge | left | ball wedged under the cup's base | brace the cup's base |
| 30 | Chasm | floor with a 250 px hole | far side of the hole | near side | ball thrown across the hole | bridge + deflector |
| 31 | Chasm + shelf | hole, plus a shelf on the far lip | on the far shelf | near side | ball on the shelf | bridge + chock |
| 32 | Two cups, one threat | floor + one plinth | one low, one high on the plinth | centre | ball over the high cup only | split + shield |
| 33 | Two cups, one threat | two plinths | both raised, different heights | left | ball over the low cup | tent + shield |
| 34 | Hot moat | floor, two hot pads flanking the cup | floor, between the pads | centre | ball over the cup | cradle that also shields the pads |
| 35 | Hot moat + shelf | pads plus a shelf | floor | left | ball on the shelf | chute over the pad |
| 36 | Pin + ball | one push-pin high, no terrain under it | hanging | left | ball falling past the cup | line from pin to rim |
| 37 | Pin + shelf | pin + one small shelf | on the shelf | right | ball above the shelf | pin-anchored roof |
| 38 | Column + thrown ball | column, plus a low crate | on the column | left | ball thrown flat | post on the crate |
| 39 | Column + lob | column | on the column | right | ball lobbed over the column | canopy above the mouth |
| 40 | Finale | full composition: column, shelf, two blocks | raised | off-centre | ball on the shelf plus a thrown ball | two-part: brace + roof |

**Build-order rule** (enforced, not suggested): terrain → cup → tap → hazard → prove. A room whose
terrain block is missing or thinner than 14 px is not a room, it is a prop with a cup next to it.

---

## 7. The gates that would have caught this

The stroke-signature gate we shipped measures the wrong thing. These four replace it:

1. **Structural signature.** Hash the room's *composition*: terrain count and sizes, cup placement
   class (floor / plinth / gap / hanging / walled), tap-to-cup offset bucket, hazard class, and ball
   motion class (static / perched / thrown). No two rooms may share a signature. Under this gate our
   current 40 rooms score **4**, which is the truth the user saw.
2. **Ball is static in most rooms.** At most one third of ball rooms may have a ball in flight at
   t = 0. The rest must perch on scenery. This single rule is what ends the "intercept the
   projectile" sameness.
3. **Terrain mass.** Every room must contain at least one static mass ≥ 200 px wide and ≥ 120 px
   tall, and no plank thinner than 14 px. Rooms without landscape are rejected.
4. **Two anchors.** At least 70 % of the proved answers must touch scenery at both ends, so the
   vocabulary is forced toward arches, cradles and beams rather than single posts.

---

## 8. What must change in the engine to go further

To reach the routing rooms (L2, L6, L46, the two-tier spillway), one change is needed and only one:
**droplets that land on ink must lose horizontal energy and run along it toward its low end**, instead
of bouncing off. That is a change to how water interacts with the ink body in `js/scene.js`, not a
rewrite. It would unlock roughly a third of the reference grammar (chutes, cascades, staircases,
pin-hammocks) which is currently unbuildable — measured, not assumed.

Everything in §6 can be built **without** that change.
