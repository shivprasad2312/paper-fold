# The 40-room plan — assets, traps, and the stroke each room demands

Written before a single room was built. The rule this plan exists to enforce is the one the last
set broke: **no two rooms may demand the same stroke.** The previous 25 ball rooms were 21 copies of
one 90 px vertical bar; `hero-audit` called them 25 distinct pictures because it measured the verb
*word* I typed into each room, not what the player's hand does. Every row below therefore names the
stroke shape, not just the idea.

## What the engine actually allows

Checked against `js/scene.js`, `js/water.js` and `js/render.js` before designing — this is the whole
asset vocabulary, and nothing in this plan uses anything outside it.

| Asset | What it does | Can it trap the player? |
|---|---|---|
| **platform** (`teal`) | static ledge, box or free-form `poly` slab (ramp, wedge, trapezoid) | yes — geometry |
| **crate** (`wood`) | static block; `dynamic: true` makes it a loose weight | yes — it can be knocked into a cup |
| **glasses** | the target; `hanging`, `dynamic`, `fixed` variants | yes — a loose glass can be knocked off |
| **balls** | heavy (dead) or light (bouncy), pure physics, no motor | **yes — the whole of 16–40** |
| **hot pad** (`hots`) | deletes any droplet that enters it — water evaporates | yes, brutally |
| **fan** (`fans`) | pushes droplets inside a cone sideways | yes |
| **push-pin** (`pins`) | a permanent anchor in mid-air you can hook ink onto | enables strokes no ledge allows |
| **spinner** | free-rotating bar on a pin, passive, no motor | yes — it swings away from your pour |
| **seesaw** | sprung bar that tips under weight | yes |
| **ink** | one rigid dynamic body; sticks only where it actually touches scenery | — |

Hard physics facts, learned by probing, that constrain every design below:

1. **Water cannot move a heavy ball.** A full spout into a ball nudges it a few pixels. So "wash the
   ball away" is not a verb — it is not in this plan.
2. **A ball can only be stopped, not steered.** Ball moving right + cup on the right means every
   drawn surface in its path is a brake. This is why the last set collapsed into one room.
3. **A free-standing stroke topples.** A vertical bar in mid-air is not a wall; the ball leans on it
   and rolls over the top. A stroke only holds where it rests on scenery.
4. **A ball cannot be lifted.** No drawn ramp raises a ball's centre of mass more than a few pixels.
5. **A ball landing on a sloped *wire* wedges and stops dead** rather than rolling off.
6. **A ball rolling on the floor cannot reach a cup under the tap** — the falling stream pushes it back.

So the variety has to come from **where the ball is stopped, what the stop is made of, and what
else the same stroke has to do.** That gives five genuinely different strokes and five water
problems, and 25 rooms is their cross product — each room a different picture, a different trap,
and a different thing for the hand to draw.

### The five stop-strokes (what the hand draws)

| Code | Stroke | Shape | Why it differs |
|---|---|---|---|
| **CH** | chock | short vertical bar standing on the ball's ramp | 2 points, ~90 px, vertical |
| **BR** | brace | long diagonal from a crate top up to the ramp's underside | 2 points, ~140 px, diagonal |
| **VG** | wedge | V standing on the ramp, ball drops into the crook | 3 points, ~120 px |
| **SP** | span | horizontal bar laid across two crates in the ball's path | 2 points, ~150 px, level |
| **PH** | pin-hook | diagonal hung from a push-pin down to the ramp | 2 points, hangs from a pin |
| **LD** | ladle | U that catches the ball, drawn across the ramp | 4 points, concave |

Proven this round: CH, BR, VG, SP, PH all stop a ball on a 0.26 rad ramp and still let the cup fill.
LD was proven in the previous set.

### The five water problems (what else is going on)

| Code | Water problem | The trick |
|---|---|---|
| **W1** | tap over the cup | none — the ball is the whole puzzle |
| **W2** | tap far to the side, cup off-axis | you need a second stroke (spout off a crate) |
| **W3** | two cups, one tap | split, and only one cup is threatened by the ball |
| **W4** | cup hanging, nothing under it | the ball and the cup both need the stroke |
| **W5** | hot pad or fan | the pour itself is being taken away |

---

## Levels 1–15 — water only, no balls

Rooms 1–8 keep their existing designs unchanged (The Pit, Sharing, Two Heights, Twin Taps, The
Shelf, The Hook, Cascade, Under The Ledge). Seven new rooms follow, built on assets that set never
used: hot pads, fans, pins, narrow mouths, and the loose-block trap.

| # | Room | Trap / trick | Assets on stage | The stroke it demands |
|---|---|---|---|---|
| 9 | **The Hot Floor** | a hot pad is bolted under the tap: every droplet that lands on it is deleted. Pour straight and the cup stays bone dry. | hot pad on a shelf directly under the tap, cup on the floor beside it | **carry** — a chute resting on a crate that catches the stream *above* the pad and runs it off the pad's edge |
| 10 | **Crosswind** | a blower on the left shoves the whole stream sideways; the cup sits where the water is *supposed* to land | fan left, cup right, nothing between | **shelter** — a chute that delivers the water under the cone, low and to the right |
| 11 | **The Lid** | the cup is inside a box with one side open; anything dropped from above lands on the lid | a static roof over the mouth, a side opening, cup inside | **thread** — a stroke from the opening's lip to the rim, feeding the cup from the side |
| 12 | **Narrow Neck** | the mouth is 84 px, the stream is 70 px of spray: most of the pour bounces off the lip | narrow glass under a wide tap | **funnel** — a V whose throat sits inside the mouth |
| 13 | **The Loose Block** | a heavy crate sits on a lip above the cup; the pour knocks it loose and it lands in the mouth | dynamic crate on a ledge over the cup | **cage** — a bar that pins the block back against its ledge before the water arrives |
| 14 | **The Pin** | the cup hangs at the far end of the stage with nothing to build from — only a push-pin in mid-air | one push-pin high left, hanging cup far right | **hammock** — a stroke from the pin down to the cup's rim, catching the fall |
| 15 | **Two Taps, One Shade** | two taps, two cups, and a shelf shades the right cup from the left tap | two taps, two cups, one shelf | **split** — a tent that feeds both and is blocked from the shading shelf |

## Levels 16–40 — the ball rooms

Every one of these has a ball already on its way into the glass at t = 0. A ball that touches the
mouth spoils the cup and the room can no longer be won (`js/scene.js`, circle-vs-mouth, every
frame). The answer must stop the ball *and* still let the water in.

### The correction this round is built on

The first 40-room set failed for a reason no gate was measuring: **the ball arrived down a tilted
plank in all 25 ball rooms.** A player does not read a room as "a wall, a V, a trough, a brace" —
they read *a ball rolling down a ramp into a cup*, and the stop shape is the small print. Twenty-five
different stops on twenty-five ramps is still one room drawn twenty-five times.

So this round varies the **delivery** first and the stop second:

| Delivery | How it works | Rooms |
|---|---|---|
| **thrown** | the ball flies in from off-screen at 7–16 px/frame, flat, lobbed, sinking or backhanded from the right | 16–27 |
| **sill** | a ball perched on the far edge of a wooden sill, tipped off so it falls 60 px across into the mouth | 21, 28–40 |
| ~~chute~~ | the old ramp delivery. **None left.** A tilted plank aimed at the cup is gone from the set. | — |

That is 11 thrown and 14 tipped. `hero-audit` now measures it: it walks each ball room, works out how
the ball is arriving, and **fails the set if more than 6 of the 25 arrive down a slope**, or if every
ball arrives the same way. The "slope in every level" complaint cannot come back silently.

The tap had to change to make this physical. Because the ball now arrives *first*, the water would
otherwise win the race in 1.7 s — so a level may hold the tap shut for a beat (`delay` in
`js/levels.js`, honoured by `Scene.start()`). Thrown rooms open after 1.6 s, sill rooms after 2.2 s:
the ball lands, spoils the cup if you did nothing, and only then does the pour begin. Same player
rule as before — the tap never opens until you have drawn something.

### The rooms

| # | Room | Delivery | Trap | The stroke it demands |
|---|---|---|---|---|
| 16 | **The Pitch** | thrown, flat, left | it crosses the room before your line is dry | a post far out in its lane (2 pts) |
| 17 | **Underhand** | thrown, slow, low | it drops early — aim where it lands, not at the cup | a low post near the mouth |
| 18 | **Flat Throw** | thrown, fast | the fastest flat ball in the set | a short slanted plate |
| 19 | **The Lob** | thrown, lobbed | it sails over a post standing in front of the cup | a post set back under the far side of the arc |
| 20 | **Long Shot** | thrown, very fast | the arc is long, the cup is far down its lane | a V trap in the lane |
| 21 | **Low Pitch** | sill, low | the sill sits low: the ball is on you at once | a V crook at the drop line |
| 22 | **High Toss** | thrown, tossed | it goes up before it comes down, and the cup is under the descent | a tall post |
| 23 | **Cross Fire** | thrown, from the right | everything you have learned is mirrored | a post to the right |
| 24 | **Backhand** | thrown, from the right, low | the water starts while the ball is still crossing | a low dam to the right |
| 25 | **Backhand Lob** | thrown, from the right, lobbed | a lob from the right clears a right-hand post | a post under the left side of the arc |
| 26 | **Sidearm** | thrown, from the right, fast | it arrives level with the rim | an L canopy |
| 27 | **Sinker** | thrown, downward | it drops as it arrives; flat ground work fails | a V |
| 28 | **The Drop** | sill | tips off the sill straight for the mouth | a cradle just off the rim |
| 29 | **High Sill** | sill, high | the shortest fall in the set | an L bracket hung high |
| 30 | **Low Sill** | sill, low | barely falls before it is at the rim | a V |
| 31 | **Narrow Sill** | sill, narrow | a narrow shelf sheds the ball sideways | a slanted plate |
| 32 | **Left Sill** | sill, from the far side | the shelf reaches in from the right | a cradle facing the other way |
| 33 | **Far Sill** | sill, distant | it leaves a far sill and has room to speed up | a long slant |
| 34 | **Overhang** | sill, overhanging the cup | it is past the rim before you see it | a V under the overhang |
| 35 | **Sill Trap** | sill, close to the wall | the ball rides in against the wall | a cradle that uses the wall |
| 36 | **Long Drop** | sill, very high | a long fall with time to draw | a plate hung off the sill itself |
| 37 | **High Drop** | sill, highest | the least time in the whole set | a plate hung high off the sill |
| 38 | **Quick Drop** | sill, low and close | no time at all | a plate under the sill |
| 39 | **Left Drop** | sill, reaching from the right | the shelf comes in backwards | a slanted plate |
| 40 | **Last Drop** | sill | the last ball, the widest open mouth | a short slant at the drop line |

Every room is one stroke, proved by `tools/solve-hero.js`, and every stroke has a different shape
after translation to the cup — 25 signatures, none repeated.

## The gate this plan has to pass

Beyond the existing checks (wins, leans on scenery, budget, no body inside scenery), this set adds
the one the last set lacked:

* **no two rooms may share a stroke signature** — every answer is normalised to its cup, quantised,
  and compared. Two rooms with the same normalised strokes fail the audit.
* **every room must state its trap in one sentence**, and the trap must be real: the idle play (no
  ink) must lose. A room that wins untouched is not a room.
* **the ball must be dangerous at t = 0** — an untouched ball must reach the mouth.
* **the ball must not arrive the same way every time** — `hero-audit` classifies each ball room's
  delivery (thrown / tipped off a sill / dropped / rolled down a slope) and fails the set if more
  than 6 of 25 are slope-delivered, or if every ball arrives identically. This is the gate the
  previous set would have failed.

Status tracking lives at the bottom of this file as rooms are proved.

## Build status — measured, not claimed

All 40 rooms are built, proved with `tools/solve-hero.js`, emitted, and replayed by
`tools/hero-check.js --hands`.

```
verify        40/40 levels solvable with their reference line
layout        40 rooms clean, 0 pen leaks, every glass supported, nothing outside the world
physics       all checks pass
hero-check    40/40 won; hands 4-6 of 6, wavy 3-4 of 4 on every room
hero-audit    all checks pass — stroke gate and delivery gate
              deliveries: 11 thrown, 14 tipped off a sill, 0 slopes
smoke         no runtime errors, unlock button and query string still work
```

### The stroke gate — how it was made honest

The first version of this set was 25 rooms that all asked for the same 90 px vertical bar, and the
old audit passed it because it hashed the **verb word** I typed into each room. The audit now hashes
what the hand does: every reference stroke is translated so its room's cup sits at the origin, then
rounded to 10 px, and two rooms with the same polyline fail.

That gate was itself buggy on the first run — it read `q.x` on `[[x, y]]` arrays, so every signature
came out `NaN,NaN` and it reported "7 distinct strokes" for the whole set. A gate that reports a
constant is not a gate; it was fixed and re-run before any of these numbers were believed.

**Result: 40 rooms, 40 distinct stroke signatures.** The ball rooms use nine different stroke
topologies — post, low post, far post, slanted plate, V, cradle, L canopy, bracket, and a plate hung
off the sill — with no shape used more than four times:

| Stop family | Rooms | What the hand draws |
|---|---|---|
| post (short, tall, far) | 16, 17, 19, 22, 23, 24, 25 | a vertical bar standing on the floor in the ball's lane |
| slanted plate | 18, 31, 33, 39, 40 | two points, leaning across the drop line |
| V / crook | 20, 21, 27, 30, 34 | three points, a pocket the ball drops into |
| cradle / basket | 28, 32, 35 | an L that catches the ball beside the mouth |
| L canopy / bracket | 26, 29 | a post with an arm over the mouth |
| plate hung off the sill | 36, 37, 38 | two points, anchored on the sill itself |

### What the delivery gate found that the stroke gate could not

Rebuilding the ball rooms took three attempts, and the first two were rejected by measurement, not
by taste:

1. **The stop-stroke search wrote one picture.** With a fixed vocabulary screened per room, the
   solver kept choosing the same post; twenty rooms' worth of candidates collapsed to one shape.
   Fixed by enumerating *every* working stroke for every room and then matching rooms to shapes
   globally, so a room cannot take a shape that another room needs more.
2. **A ball dropped into the mouth cannot be stopped without blocking the pour** — unless the tap
   sits *below* the catch. That is why the tap delay exists, and why the sill rooms catch the ball
   in the air rather than fencing the mouth.

### What did not work, and is not in the set

Probed this round and rejected, because they would have been fiction:

* **The chute itself.** A ball leaving a 0.22–0.34 rad plank at 62 px above the rim overshoots the
  mouth every time (it crosses the rim line at y ≈ 457 and lands 130 px past the cup). Every chute
  room had to be converted to a throw or a sill.
* **Deflecting a ball on the floor.** A ball that has left its chute moves slowly and a drawn
  deflector only nudges it.
* **Ramming a dropped ball out of the air with a swinging ink body.** The ball wins every time.
* **A ball that must be stopped by water.** A full spout moves a heavy ball ~6 px.
* **Moving a perched ball by 6 px.** The tip off a sill edge is knife-edge: 6 px either way flips
  whether it lands in the mouth. The sill geometry is set once and proved; the ball may sit up to
  6 px into the sill it is perched on, and `layout-audit` allows exactly that and no more.

### What this set is not

The 25 ball rooms still share one question — *the glass is being spoiled, stop it* — and the props
are thinner than the previous plan promised: no hot pads, fans, pins or second cups in the ball
rooms. What differs is where the ball comes from, how fast, which side, when the tap opens, where
the cup stands, and what the line has to be. Adding the trap props back on top of the delivery
variety is the next body of work, not another pass over the delivery.

### What did not work, and is not in the set

Probed this round and rejected, because they would have been fiction:

* **Deflecting a ball on the floor.** A ball that has left its chute moves at ~0.5 px/frame and a
  drawn deflector only nudges it; it never turns it away from the cup.
* **Ramming a dropped ball out of the air with a swinging ink body.** The ball wins every time.
* **Floor-level balls generally.** Our speck solver's floor friction is too high for a ball to cross
  the stage horizontally; a ball that reaches a cup must arrive from above.
* **A ball that must be stopped by water.** A full spout moves a heavy ball ~6 px.

Every one of those is why the whole ball half comes down to *arrival from above, stopped by a
structure that rests on the room* — and why the variety had to come from the stop shape, the cup's
height and width, the tap's position, and the number of cups, rather than from new physics.

### What this set is not

The 25 ball rooms still share one question — *the glass is being spoiled, stop it* — and differ in
the trap around it. Rooms 1–15 carry the water-side variety (a hot pad, a narrow mouth, a shade, a
wall, two taps, a deep sill). A ball room whose puzzle is not "stop the ball" would need a new
mechanism: a loose block the ball must not knock in, or a cup that has to be moved out of its path.
That is the next body of work, not another pass over these 25.
