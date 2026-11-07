# Assets — one object, one size

Reported: *"why long assets are getting shorter when fall, like wood, & other — check they
should stay in same size all over all levels"*, and *"use these"* with a sheet of wood,
stone, metal, hay and barrel sprites.

## What was actually wrong

Nothing resized. I measured **1,316 solid-frames across all 40 levels** (every platform and
crate, every 20 frames for 240 frames) and compared each body's *local* extent — vertices with
the body's own rotation undone — against the size it was declared at: **zero bodies changed
size**. The drawn stroke is stable too (a 504 px line stays 504 px while it falls), and polygon
masses survive decomposition exactly (400×8 in, 400×8 out).

The bugs were both in the *drawing*:

1. **Every solid used one artwork.** `drawPlatform` and `drawCrate` drew a rounded box, plus an
   X brace for wood. A 240 × 18 plank, a 100 × 180 column, a 22 × 150 post and a 96 × 96 crate
   were the same picture at four sizes — so the same "wood asset" was a different size in every
   level, which is exactly what the report describes.
2. **The corner radius ate thin pieces.** The radius was `min(8, h/2)`, so an 18 px plank lost
   8 px *off each end*: it painted 16 px shorter than the length it physically had, and a 22 px
   post became a rounded stick. That is the "getting shorter" — it was always that length on
   screen, never in the physics.

## What is there now

`js/assets.js` is a catalogue. A solid names its asset, and the asset owns the look **and** the
footprint:

| asset | look | ships at |
|---|---|---|
| `plank` / `beam_wood` / `nub` | plank: grain along the length, bolts, square ends | 240×18 / 260×18 / 60×20 |
| `crate` | framed crate, slats, cross brace | 96×96 |
| `column` | stacked planks, staggered seams | 100×180 |
| `post` | vertical grain, capped ends | 22×150 |
| `bench` | plank, shorter | 120×60 |
| `barrel` | staves and three hoops | 76×92 |
| `block` / `pillar` | coursed masonry | 110×56 / 100×180 |
| `rock` | faceted boulder with a crack | 72×64 |
| `rubble` | small coursed masonry | 56×44 |
| `beam` | steel: rivets and a centre line | 220×20 |
| `hay` | straw and two straps | 104×72 |
| `ice` | clean ice | 96×60 |
| `slab` | structural teal/grey/stone, highlight only | any (cut to the room) |

Two rules in the code:

* **square ends on long pieces** — radius is `min(3, thin/5)` for planks and posts, so a plank
  paints its whole length (measured: 240×18 → 244×22 painted, which is the shape plus a
  2 px outline all round, on every asset);
* **teal is structure, not furniture** — every teal box in a room is cut to that room, so the
  teal entries are canonical by name but free in length.

## The gate

    node tools/asset-audit.js [--verbose]

* every solid maps to a catalogue asset
* every solid is the size that asset ships at (teal structure excepted)
* one footprint never means two different assets

Current state: **109 solids, 13 assets, 30 distinct footprints, all checks pass.**

## Material variety

Poly masses are no longer all teal: `terrain.js` now carries a `kind` per room, and the emitter
passes it through, so the second half of the set is teal, stone, wood and metal masses (15 / 8 /
5 / 3). Wood, stone and metal draw their own texture inside the mass (planking, courses,
rivets) — same physics, different object.

Props from the sheet were added where the floor had room and the level still proved: hay bales,
barrels, rubble, rocks and a masonry block on levels 9–15, 26, 30 and 36.

## The trap this cost

Adding those props with a script inserted a **second `crates:` key** into each hero-room
literal. The later key silently wins in JavaScript, so the block each answer leaned on vanished
from the prover while still being in the game — 8 rooms "failed" that were fine. Fixed by
`tools/sync-hero.js`, which regenerates stage / crates / balls / glasses / faucets in
`tools/hero-rooms.js` from `js/levels.js` and never touches an answer:

    node tools/sync-hero.js --check     # report drift
    node tools/sync-hero.js             # rewrite the structure

Run it after any level edit; `--check` is the fast way to catch prover/game drift.
