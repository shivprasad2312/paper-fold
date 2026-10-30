# Physics audit

Run it yourself:

```
npm run audit      # node tools/physics-audit.js — exits 1 if any check fails
```

Everything below is measured from the *running* simulation (`tools/physics-audit.js`
boots the same `scene.js` / `water.js` the browser uses; only `localStorage` is shimmed).

## 1. The rule the whole game is built on

A finished stroke is an **ordinary rigid body**. It is never pinned, welded, hinged
or frozen, and being drawn "on" something does not attach it. It stays in the air
only while **its own shape is carried by scenery**: lying across two ledges, sitting
in a notch, hooked around a corner. Anything else falls out of the level.

The research on the real game says exactly this: *"the moment your finger leaves the
screen the line becomes a solid physical beam affected by gravity"*, *"water's kinetic
energy pushes an unanchored line off screen"*, *"rest your drawn lines heavily on top
of wood blocks"*. That is the mechanic, and the audit checks all three parts of it.

## 2. The world

| Setting | Value | Why |
| --- | --- | --- |
| Engine | Matter.js 0.20 | rigid bodies + soft particle fluid |
| Timestep | fixed 16.667 ms, **4 solver substeps**, max 4 catch-up steps | frame-rate independent *and* sub-rod resolution |
| Gravity | one global vector, `g.y = 1`, `scale = 0.0014` | measured **0.384 px/step² ≈ 1381 px/s²** |
| Solver | 8 position / 6 velocity iterations (per substep) | enough for 300 stacked droplets without sinking |
| Droplet speed ceiling | 14 px/frame → **3.7 px per solver step** | the wire is 4 px, so a droplet can never straddle it |
| Ink line | 4 px, `density 0.020`, friction 0.7 / static 0.9, restitution 0.02 | a heavy iron wire, not paint |
| Ink collision shape | the stroke's polyline, merged into as few straight bars as it fits (0.9 px tolerance) | see §4.1 — a body made of ninety short boxes walks off any ledge |
| Water ↮ ink | **real collision** (`MASK_WATER 0xffff`) | the stream is allowed to push the line |

## 3. Masses (Matter units, measured)

| Body | Mass | Ratio to a droplet |
| --- | --- | --- |
| water droplet (r = 7) | 0.24 – 0.28 | 1 |
| 440 px line (≈ 5 bars) | 36 | ~140 |
| one bar of a line | 6 – 9 | ~30 |
| loose wooden crate (80²) | 16.6 | ~65 |
| glass (5 colliders, weighted base) | 122.8 | ~500 |
| water in a *full* glass (≈ 47 droplets) | 13.6 | — |

A droplet is 1/140 of a line, so a single drop cannot kick it, and a 3 s stream moves
a badly seated line a few pixels, not metres — enough to matter, never enough to shotgun.

## 4. What the audit proves (every number from the current run)

**§3b — a line at rest is dead still, and it is not welded.**
A line lying along a plank, tap shut: `body.isStatic === false`, **max vertex drift
0.0023 px over 5 s**, **0.0000 px of frame-to-frame motion over 300 frames**. Nothing
buzzes, nothing creeps, and nothing is held by a joint.

**§3c — only real contact holds a line up.**

| Scene | Result |
| --- | --- |
| line drawn in empty air | falls out of the level |
| long overhang resting on one small ledge | tips off the ledge and falls |
| line lying across two supports | stays put (angle 1.2°, settles in 1 s) |

**§3d — water pushes the line, smoothly.**
Same scene, same frames, tap shut vs tap running:

| | tap shut | 3 s stream |
| --- | --- | --- |
| line movement | 0.017 px/frame (settling onto its rests) | 0.04 px/frame |
| net drift | — | **2.9 px** |
| ink/water collisions | 0 | **11–16 active pairs** |
| `body.isStatic` | false | false |

That is the reference behaviour: the stream leans on the line, the line barely notices
a good ramp and gets shoved by a bad one.

**§3e — the stream behaves like water.**
The report was *"the droplets look excited, like nuclear fission"*. It was three
things at once: the levels poured 3–8× the water the glass needs (median 3.5×, worst
8.5×), so the surplus had nowhere to go and heaped on the line; droplets had no
cohesion, so a stream fell as a shower of beads; and every droplet was painted as
its own bubble with a 2.6 px rim, which makes a heap read as a cluster of cells.
Now: taps are sized to their glass (1.75–2.4× margin, `tools/delivery.js`), the pour
is a thread (22–32 droplets/s, not a jet), `Water.cohere()` pulls each droplet a
fraction of a pixel toward its neighbours and blends a little of their velocity, and
the rim is 1.5 px. Measured on the same level, same frames:

| | before | now |
| --- | --- | --- |
| water delivered vs. needed | 5.2× | 2.5× |
| droplets alive at the peak | 147 | 26 |
| droplet-frames moving >4 px/frame sideways | — | **0.0 %** |
| droplet-frames moving upward | — | **0.0 %** |
| median peak across all 35 levels | 92 | 49 |

There is no chain reaction to begin with: one droplet is born per unit of tap
budget, the population is capped at 340, and it only grows while the tap runs. What
looked like fission was a heap of static-pose beads being jostled by the solver.

**§3f — nothing foreign is drawn inside the water.**
Reported as *"there is something inside the water droplets, dark blue, moving around
inside them"*. It was the renderer, not the simulation. Two circles of radius 7 whose
centres are 14 px apart touch tangentially, which leaves an **8 px² hole at every
triple junction**, and each circle's own dark rim shows wherever its neighbour does not
cover it. In a packed mass — a stream running down a line, a heap in a corner — that
painted a lattice of paper shards and dark blue crescents *inside* the liquid, and
because the particles jostle, the lattice crawled. Fixed by drawing the body fatter
than the collision circle (R+5.0 rim, R+4.2 liquid) so the junctions close, and only
highlighting droplets that really are on the surface. Measured over four levels: page
showing through the liquid **0.30–0.85 % → 0.003–0.07 %**, interior rim blue
**1.4–2.4 % → 0.6–1.4 %** (what remains is the thin edge of the silhouette at the
surface). `tools/waterpixels.js` is the check: it labels the non-water regions and
counts the ones the frame border cannot reach, so a sealed hole in the liquid fails the
build.

## 5. Findings from this audit (all fixed)

0. **The wire was glued to thin air.** A bounding-box anchor test with a 16 px tolerance
   counted a line drawn *near* the tap as attached. Removed entirely in round 9b: there is
   no anchor query left in the code path — the line is a body, and the only thing that
   holds it up is Matter's own contact solver.
1. **Water could not push the line.** Rounds 8–9a put water and ink in separate collision
   categories and resolved the contact by hand, so the wire was deaf to the stream. That is
   not the reference game and the user rejected it. Both masks are `0xffff` again; water and
   ink are ordinary colliding bodies (§3d).
2. **Ink "anchored" itself to itself.** Anchoring collected every static ink body, including
   the provisional segments of the stroke still under your finger. Gone with the anchoring
   system.
3. **Droplets were born inside the tap.** They now spawn `plate.bottom + r + 1.5`, i.e. 3–4 px
   clear (audit §4).
4. **Tunnelling.** 14 px/frame = 3.7 px per solver step, less than the 4 px rod and the 7 px
   droplet radius, so a droplet cannot pass through a line (audit §5).
5. **The line "vibrated".** Fixed with four substeps, the speed ceiling and a rest floor. The
   remaining creep had a different cause — see 4.1.
6. **A line made of ninety little boxes walks off its own support.** This is the finding that
   made round 9b possible. The pen samples a stroke every few pixels, which is right for
   drawing and wrong for physics: a compound body of ~90 chamfered 4 px boxes has ninety
   seams for the solver to chatter on, and it slowly *walks* — measured at 0.46 px/frame with
   no water at all, sliding 71 px and finally tumbling off a two-support bridge it had been
   sitting on perfectly. The collision shape is now the same polyline fitted with as few
   straight bars as the shape allows (`inkRuns()`, 0.9 px tolerance, 110 px bars): a straight
   drawn line is 3–5 bars. Identical test after the fix: **0.11 px/frame, 0.1 px of net
   drift.** Nothing about how the line *looks* changed — it is still drawn from the original
   sampled points.
7. **Ink density.** `0.020` (was 0.006): a 440 px line is 36 mass against a droplet's 0.25,
   so a stream guides a line instead of machine-gunning it.

## 6. Deliberate deviations (documented cheats)

| Cheat | Why it is there | Effect |
| --- | --- | --- |
| no world floor | a glass or line that falls off the level is removed | failing is unambiguous, and it matches the reference game |
| the glass starts on a small wooden ledge ("coaster") | a loose cup on nothing at all is a design bug, not a puzzle | every non-hanging glass has a real supporting body |
| terminal-velocity clamp (14 px/frame) | no CCD in Matter | water never tunnels through ink |
| 4 physics substeps per frame | 4 px line vs 3.7 px/step droplets | contact is resolved on the line, not inside it |
| the pen refuses to draw inside scenery (2 px pad) | a stroke drawn through a wall would explode on the next step | you cannot draw *into* a ledge; you draw onto it |
| hot pads delete droplets instead of boiling them | 300-particle budget | ~2 % water loss per touch, plus steam puffs |
| movers are kinematic (`Body.setPosition`) | giving a static body velocity launched water into orbit | obstacles push water by sweeping through it |

## 7. Objective function the levels are verified against

`tools/verify.js` + `tools/flaky.js` replay one reference solution per level and check, in order:

1. **water level** — every glass above its dotted line (`fill >= need`, measured from real droplet
   positions and cross-checked against droplet count);
2. **glass stability** — the glass is still in the level and upright (`|angle| < 1.25 rad`);
3. **ink efficiency** — stars from the 3-block meter, so the reference solutions stay inside
   the budget.

The reference solutions are *authored*, not hand-drawn: `tools/author3.js` searches for a
ramp and the supports that carry it, then confirms every candidate with a second, independent
pour. `tools/apply-authored.js` writes the supports into `js/levels.js` and the drawing into
`tools/solutions.js`.
