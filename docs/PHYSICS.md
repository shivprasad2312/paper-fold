# Physics audit

Run it yourself:

```
npm run audit      # node tools/physics-audit.js — exits 1 if any check fails
```

Everything below is measured from the *running* simulation (`tools/physics-audit.js`
boots the same `scene.js` / `water.js` the browser uses, only `localStorage` is shimmed).

## 1. The world

| Setting | Value | Why |
| --- | --- | --- |
| Engine | Matter.js 0.20 | rigid bodies + soft particle fluid |
| Timestep | fixed 16.667 ms, **4 solver substeps**, max 4 catch-up steps | frame-rate independent *and* sub-rod resolution |
| Gravity | one global vector, `g.y = 1`, `scale = 0.0014` | measured **0.384 px/step² ≈ 1381 px/s²** |
| Solver | 8 position / 6 velocity iterations (per substep) | enough for 300 stacked droplets without sinking |
| Droplet speed ceiling | 14 px/frame → **3.7 px per solver step**, wire is 4 px | a droplet can never straddle the rod |
| Rest floor | bodies under 0.035 px/step are snapped to a dead stop | settled water and welded ink cannot buzz |
| Sleeping | off for the glass (it must react to a single hit) | |

## 2. Masses (Matter units, measured)

| Body | Mass | Ratio to a droplet |
| --- | --- | --- |
| water droplet (r = 7) | 0.24 – 0.28 | 1 |
| 90 px ink stroke (10 sub-bodies) | 2.5 – 3.5 | ~12 |
| loose wooden crate (80²) | 16.6 | ~65 |
| glass (5 colliders, weighted base) | 122.8 | ~500 |
| water in a *full* glass (≈ 47 droplets) | 13.6 | — |

Consequences that are intentional:

* A droplet can never shove the glass around (**500:1**), so the glass does not jitter while it fills.
* The base of the cup is 5× denser than its walls, so the centre of mass sits low and a glass tips
  slowly instead of flicking over the instant water lands.
* A full glass of water is only **12 %** of the cup's mass — the cup is holding water, not being
  held up by it.

## 3. What each element obeys

| Element | Body type | Gravity? | Collides with |
| --- | --- | --- | --- |
| glass | one **compound dynamic** body (5 chamfered colliders) | yes | ink, crates, platforms, spinners, water |
| drawn line (wire), 4 px, 2+ contacts | one rigid body, welded by real contact query | no, while its support exists | water, glass, crates, loose ink |
| drawn line (wire), 1 anchor contact | one rigid body on a projected revolute joint | yes — it swings about that point | all of the above |
| drawn line (wire), loose | **one rigid compound** body, parts kept as sub-bodies | yes, and it leaves the level | everything, including other ink |
| crate | dynamic or static depending on the level | yes (if dynamic) | all |
| spinner / seesaw | dynamic body on a pin constraint | yes, rotates freely | water, ink, glass |
| mover | static body, **position** driven | no | all (speed is not faked through velocity) |
| water | 340 max circles, `friction 0.0015`, `restitution 0.03` | yes | each other, ink, glass, scenery |
| hot pad | a sensor region that deletes droplets + puffs | — | — |
| blower | force field, `F = k · falloff · mass` | — | — |

## 4. Findings from this audit (all fixed)

0. **The wire was glued to thin air.** The old anchor test was a bounding-box test with a 16 px
   tolerance, so a line drawn *near* the tap — or ending 3 px short of a ledge — counted as attached
   and hung in the sky. That is the reported "why is this drawn line not falling?". Anchoring is now
   a real `Collision.collides()` query between each 9 px segment and the scenery, with a 1.5 px
   tolerance: no overlap, no anchor, no hanging.
1. **Ink anchored itself to itself.** `anchorBodies()` collected every static `ink` body, which
   included the provisional segments of the stroke still under your finger. Every line was therefore
   "anchored" and hung in mid-air — the exact bug reported as *"why are both wires not drawing /
   not falling"*. Anchor candidates are now filtered by `strokeRef.anchored`, so only a **finished**
   line can hold another line.
2. **Droplets were born inside the tap.** The emitter sat at `f.y + 4`, which is exactly the bottom
   edge of the 88×16 plate collider, so every droplet started life 7.5 px embedded in a static body
   and got squeezed out sideways (measured: 9 of 15 droplets drifting > 3 px). They now spawn
   `plate.bottom + r + 1.5`, i.e. **3–4 px clear**.
3. **The tap opened on pointer-down.** Gravity and the pour started the instant you touched the
   screen, while the first line was still half-drawn. Now the level stays frozen while you plan;
   `endInk()` on **lift** calls `scene.start()`. Later strokes never pause anything.
4. **Tunnelling window.** Droplets were clamped at 30 px/step, but Matter has no continuous
   collision detection and a line is only a few px thick (+7 px droplet radius of travel).
   The clamp is now **14 px/frame**, i.e. 3.7 px per solver step — less than the 4 px rod.
5. **The line "vibrated".** Reported twice: while it hung there, and again when water hit it. The
   measurement said the *body* was perfectly still — but a droplet free-falls 6–11 px per frame and
   the solver ran once per frame, so a landing droplet alternated between "above the rod" and
   "inside the rod" every frame: the contact point jumped, water squirted sideways and pooled water
   shimmered. Fixed by (a) four substeps per frame, (b) the 14 px/frame ceiling, (c) a rest floor
   that zeroes sub-0.035 px/step residue. Audit §3b and §5 now measure all three: **identical wire
   geometry over 5 s of pouring, 0 of 3 360 resting water samples moving.** That killed the
   *visible* shimmer caused by a stale contact point, but not the impulse itself: the wire was still
   being pushed by every droplet that landed on it. See item 9.
6. **A single anchor point was acting like a steel bracket.** With one contact the wire was welded outright, so
   a ramp hooked on the tap hung out sideways, dead still, holding water — physically impossible, since
   a point contact cannot resist a lever. One contact is now a **hinge**: that point is projected back
   onto its anchor every substep and the velocity *at that point* is cancelled, which is exactly a
   revolute joint. The wire swings down about that point and settles (audit §3c: 64° in 4 s, ends at
   rest). Two or more contacts is still a weld — that is wire bent around two hooks, and it is genuinely
   rigid. Every ramp that used to hang off the tap alone now stands on a stone bracket (level
   furniture, placed by `tools/props.js`), so nothing in the game hangs on a single point.
7. **The wire was only "attached" by being fat.** With a 15 px rod, ink drawn 1.5 px short of a
   surface still overlapped it by 6 px, so anchoring worked by accident; at 8 px the same drawing
   missed and 19 of 35 levels failed. Ink can now be drawn until it *touches* (2 px sink) and a
   finished stroke presses its ends 1.2 px into whatever stopped the pen — the weld is a real
   overlap of the wire's own geometry, and thin rods anchor exactly like fat ones.
8. **Glass inertia was multiplied ×3.5** to stop flicking. With the weighted base already in place,
   ×2 is stable in 4 consecutive full playthroughs and tips more believably, so it is now ×2.

9. **Water was still allowed to push the wire.** After item 5 the contact was stable, but Matter
   still solved `droplet | ink` as a real collision: every drop in a stream applied an impulse to the
   rod, so a wire hanging from one point kept rocking for as long as the tap ran (measured: up to
   0.58 px of wire movement per frame, 175 of 180 frames in motion, i.e. visible vibration). A droplet
   is 0.254 mass units against a 90 px wire's 2.6 — a real iron wire does not shiver under a tap.
   Water and ink are now in **separate collision categories** (`0x0004` / `0x0002`, masks
   `0xfffb` / `0xfffd`) so Matter never pairs them, and every *part* of a compound wire carries the
   ink filter — `Body.create({ parts })` resets each part's filter to the default, which is the
   detail that lets water fall straight through a wire. The contact is resolved instead by
   `Scene.resolveWaterInk()`, a one-way pass that runs after each substep and only ever moves the
   **droplet**: it is pushed back out of the rod capsule, its inward velocity is cancelled
   (restitution 0.02) and its sliding velocity is damped by a 0.5 %/substep film drag, which keeps a
   stream leaving the wire where it always did. The wire can therefore not receive an impulse at all.
   Audit §3d proves it as an A/B experiment: the same scene, same frames, once with a stream landing
   on the wire (2 000–10 000 droplet/wire contacts resolved) and once with the tap shut.
   **Wire geometry diverges by 0.00000 px over 180 frames in both the hinged and the braced case**,
   while the hinged wire still swings 132 px under its own weight — the wire is still a free physical
   body, it is simply deaf to water.

   The wire itself now *looks* like the reference: one clean thin line, 4 px wide, dark, with no
   drawn decorations. The nail dots that used to be painted at every anchor point were game
   furniture that the player never asked for — an anchor is where the wire's own geometry overlaps
   solid scenery, and drawing a stud there implied the game had pinned the line for you. It is
   removed. The line is also thinner (4 px, from 6) precisely so it reads as a drawn wire and not as
   a plank; the droplet ceiling dropped to 14 px/frame to keep the same margin over the rod.

## 5. Deliberate deviations (documented cheats)

| Cheat | Why it is there | Effect |
| --- | --- | --- |
| anchored ink is static (infinite mass) | a drawn line is "ink that dried"; the level must not sag under water | an anchored line cannot be pushed by anything |
| no world floor | a glass or line that falls off the level is removed | failing is unambiguous, and it matches the reference game |
| the glass starts on a small wooden ledge ("coaster") | a loose cup on nothing at all is a design bug, not a puzzle | every non-hanging glass has a real supporting body |
| terminal-velocity clamp (14 px/frame) | no CCD in Matter | water never tunnels through ink |
| 4 physics substeps per frame | 4 px wire vs 3.7 px/step droplets | contact is resolved on the rod, not inside it |
| water ↮ ink: separate collision categories | a stream must not be able to move the wire, but must still run along it | `resolveWaterInk()` stops the droplet on the rod and never lets it touch the wire's body |
| water has a 0.5 %/substep drag on wet ink | without it a droplet slingshots down the wire and overshoots the glass | streams leave the wire on the same path they always did |
| a single contact is a hinge, not a weld | a point contact cannot carry a cantilever | a wire held at one point swings down and settles |
| hot pads delete droplets instead of boiling them | 300-particle budget | ~2 % water loss per touch, plus steam puffs |
| movers are kinematic (`Body.setPosition`) | giving a static body velocity launched water into orbit | obstacles push water by sweeping through it |

## 6. Objective function the levels are verified against

`tools/verify.js` + `tools/flaky.js` replay one reference solution per level and check, in order:

1. **water level** — every glass above its dotted line (`fill >= need`, measured from real droplet
   positions and cross-checked against droplet count);
2. **glass stability** — the glass is still in the level and upright (`|angle| < 1.25 rad`);
3. **ink efficiency** — stars from the 3-block meter, so the reference solutions stay well inside
   the budget (2–3 stars).
