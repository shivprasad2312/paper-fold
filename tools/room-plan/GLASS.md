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
`tools/room-plan/terrain.js` holds the first six rooms in that grammar (wedge,
plateau, funnel, long ramp, twin peaks, island) and `terrain-sweep.js` solves
them. First pass: two of six geometry problems found (a cup sitting inside its
own wedge; a ramp that fed the cup untouched), so this is a per-room job like
every other batch, not a bulk fill.

## Visual distinctness, measured

`distinct.js` compares rendered rooms pixel by pixel. Current state:

- trap rooms: 0 near-identical pairs (spread 2.6-10.3% of pixels)
- shipped 1-40: **10 pairs under 2%** - the ball-delivery ladder in 16-40,
  worst 17 Underhand ~ 19 The Lob and 16 The Pitch ~ 27 Sinker at 0.6%.

Replacing 16-36 with terrain-mass rooms clears 9 of those 10 pairs; the last
(10 Narrow Neck ~ 11 The Shade) needs one of the two re-cut.
