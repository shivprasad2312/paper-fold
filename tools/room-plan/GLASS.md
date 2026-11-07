# One glass, and it does not shake

Two rules the whole set now follows, taken from the reference app.

## Same glass everywhere

Every level, 1-40, uses the same cup:

    w: 108   h: 118   need: 0.5

Before this it was five widths (90, 100, 104, 108, 120), two heights (112,
118) and five targets (0.30, 0.35, 0.45, 0.50, 0.55). A cup that changes size
between levels reads as a different object, and it made "how full" mean a
different thing on every screen. `hanging` stays as a *support* variant - the
cup is identical, it is just held up instead of standing.

Two levels had to be repaired rather than retuned, because a glass that
demands 0.5 exposed answers that never actually delivered:

- **5 The Shelf** - the stored answer bent to the right while the cup sits to
  the left; it topped out at 0.47 no matter how much water was poured. It now
  uses a solved chute from the shelf lip down to the mouth ([[595,388],
  [390,515]], 241 ink).
- **8 Under The Ledge** - water supply was sized for a 0.45 target; raised from
  110 to 140.

Gate: `hero-check` 40/40, `verify` 40/40, `layout-audit`, `hero-audit` and
`physics-audit` all pass.

## The cup must not shake

`js/render.js` gave **every** glass a permanent `sin(t) * 1.2 px` vertical bob,
drawn whether the cup was empty or full. The physics was perfectly still (0.000
px drift over 6 s on every level) - the whole wobble was the renderer adding
motion of its own. Removed: the renderer now follows the glass body, and the
body only moves when something hits it.

Verified by sampling the same pixel row across 40 frames of an empty cup:
identical frame to frame on levels 1 and 12.

## What the reference does that we still do not

The defining element of the reference levels is a **big solid teal mass** -
wedges, plateaus, funnel walls, 200-400 px across - with the tap and the cup
arranged around it. Our levels are thin bars (16-24 px) over a flat floor,
which is why 16-40 all read as the same room moved around.

The engine supports this already: a platform can be `{ poly: [[x,y],...] }`,
built with `Bodies.fromVertices` and drawn with a gradient. **No level used it.**
**Wave 2 proved 6 of 6** once the lip rule was applied deliberately, after 2 of
8 in wave 1. Eight mass rooms are now proved:

| slot | room | mass shape | ink |
|---|---|---|---|
| 30 | The Plateau | flat-topped trapezoid | 240 |
| 31 | The Prism | apex-up triangle | 271 |
| 32 | The Cliff | trapezoid with a near-vertical face | 350 |
| 33 | The Spire | tall narrow spike | 277 |
| 34 | The Tent | two prisms making a valley | 237 |
| 35 | The Long Shelf | one wide thick slab, open air below | 355 |
| 36 | The Overhang | big block hanging over open space | 461 |
| 37 | The Valley | two big walls, raised shelf between | 196 |

Every one has idle 0.00 - no water reaches the cup unaided - and every one
uses a different mass shape, which is the variation the reference levels show
(trapezoid ramps, triangle prisms, paired blades, cup-in-a-notch).

**Transcription trap, hit again:** two rooms were copied into the file as rect
platforms when the sweep proved them as polygons. A rect is *centred* on (x,y);
the poly masses have their *top* at y and base at y+h, so both moved 32 px and
both stopped working. Copy the geometry verbatim, never "tidy" it.

The rule that came out of it, and it decides every mass room from here:

> A big mass pools what lands on it. Water leaves by the nearest edge, and with
> an off-centre pour that edge is usually the wrong one. A mass only works as a
> level when **the tap pours at its lip**, so water leaves immediately and the
> cup sits out and below that lip.

Both proved rooms obey it. Every failure breaks it: the Mesa's pour ran off the
shelf's left edge and died at x 27-627 while its cup stood 200 px away on the
mass top; the Staircase pooled in its corners; the Long Slope and the Funnel
Walls delivered water to the cup with no stroke at all, i.e. free wins.

## Visual distinctness, measured

`distinct.js` compares rendered rooms pixel by pixel. Current state:

- trap rooms: 0 near-identical pairs (spread 2.6-10.3% of pixels)
- shipped 1-40: **10 pairs under 2%** - the ball-delivery ladder in 16-40,
  worst 17 Underhand ~ 19 The Lob and 16 The Pitch ~ 27 Sinker at 0.6%.

Replacing 16-36 with terrain-mass rooms clears 9 of those 10 pairs; the last
(10 Narrow Neck ~ 11 The Shade) needs one of the two re-cut.

## Levels 16-40 are now mass rooms (25 of 25 proved)

Every one is a big teal silhouette with the tap at a lip and the cup out and
below it. Proved from `terrain.js`: idle 0.00, answer wins at 0.50, no free win.
`terrain-emit.js` writes them into `js/levels.js`, `tools/hero-rooms.js` and
`tools/solutions.js`; `terrain-splice.js` does the replacing in place, so no
number is ever retyped.

| # | room | silhouette | ink |
|---|------|------------|-----|
| 16 | The Keel | wide-top trapezoid, narrow footing | 448 |
| 17 | The Anvil | hexagon, one shoulder to the cup | 437 |
| 18 | The Wedge | right triangle, slope runs left | 266 |
| 19 | The Ledge | block with the pour at its edge | 200 |
| 20 | The Pillar | tall pillar with a cut cap | 282 |
| 21 | The Chute | slab on the slant | 397 |
| 22 | The Chock | block with one corner cut | 341 |
| 23 | The Stack | two shelves, two heights | 368 |
| 24 | The Crate Wall | slab with a bevel and a crate | 375 |
| 25 | The Doorstep | two blocks, one step | 400 |
| 26 | The Bench | wide bench, work the near end | 160 |
| 27 | The Stump | low thick block | 222 |
| 28 | The Bluff | tall block on the right, cup left | 320 |
| 29 | The Cap | cap on a stem (T) | 242 |
| 30 | The Plateau | flat-topped trapezoid | 240 |
| 31 | The Prism | apex-up triangle | 271 |
| 32 | The Cliff | trapezoid with a near-vertical face | 350 |
| 33 | The Spire | tall narrow spike | 320 |
| 34 | The Tent | two prisms, valley between | 237 |
| 35 | The Long Shelf | wide thick slab, open air below | 355 |
| 36 | The Overhang | block over open space, cup across | 461 |
| 37 | The Valley | two walls, raised shelf | 196 |
| 38 | The Buttress | right triangle, console | 408 |
| 39 | The Step | two blocks, stepped | 241 |
| 40 | The Island | block mid-floor, both sides open | 135 |

### The three rules these 25 cost

1. **Tap at the lip.** Water leaves a mass by an edge; if the pour lands in the
   middle of the top it pools and dribbles off both sides. Keep the tap within
   ~60 px of the lip that faces the cup.
2. **The lip has to be steep.** A flat top with a shallow cap (9 deg) sheds
   nothing — Tower, Pillar, Sill and Shield all failed as rectangles before they
   were given a 40-60 deg shoulder.
3. **The cup sits ON its plinth, not in it.** `G(x, top)` puts the cup's base at
   `top`; with the plinth's own top 10 px higher the cup is a *dynamic* body
   embedded in static scenery, and the solver pushes it out on frame one —
   measured: cup centre moves 10.2 px in the first 40 frames. That is the jump
   the player sees, and it is what `layout-audit` was failing on. Every plinth in
   this set is flush with the cup's base.

### What the sweeps missed, and why

Coarse anchor sampling (5 points per edge, 16 candidates, sorted by distance to
the tap) left eleven rooms "unsolvable" that were solvable. Dense sampling (9
points per edge, 20 candidates) plus not moving the *floor* while moving the cup
found them. Two harness bugs cost most of a session: a rect `{x,y,w,h}` moved
together with the mass it was meant to sit beside, and a search that only ever
started its stroke *on* a mass face when the winning line starts in the air
above it.

### Still open

- 10 Narrow Neck ~ 11 The Shade are 1.8% apart on the render. Every other pair in
  the set is >= 2.7% (median 10.7%). Level 11's answer depends on its crate at
  x 520, so re-cutting that room means re-proving it.
- Level 16's proved line is a transient chute: `inkWorldSegments()` reports no
  settled ink for it even though the stroke is drawn, counted, and wins. Worth a
  proper re-solve so the shot shows the line.

## Fixed since: the "long assets get shorter" report

Measured and answered in `docs/ASSETS.md`. Short version: nothing resized — 1,316 solid-frames
across the set, zero size changes, and a falling drawn stroke holds its length. The defect was in
the drawing: every solid used one crate artwork (so one "wood asset" appeared at twelve sizes),
and the corner radius `min(8, h/2)` cut 8 px off each end of a thin plank. Long pieces now have
square ends and their own art; `node tools/asset-audit.js` enforces one asset, one size.
