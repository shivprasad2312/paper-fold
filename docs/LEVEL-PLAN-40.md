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

| # | Room | Trap / trick | Assets | Stop | Water | Stroke |
|---|---|---|---|---|---|---|
| 16 | **First Blood** | a ball rolls down a chute straight into the mouth. Teach the verb: you must stop it. | chute (plank), 1 ball | CH | W1 | short vertical bar on the chute |
| 17 | **The Brace** | same idea but no room to stand a bar on the chute — the answer leans on the crate behind it | chute + low crate at its back | BR | W1 | long diagonal, crate-top → chute |
| 18 | **The Wedge** | a bar standing alone tips; the ball has to be dropped into a crook | chute, 1 ball, open ground | VG | W1 | V standing on the chute |
| 19 | **The Gate** | two crates already stand in the chute's path — but the gap between them is 44 px too wide | chute + two crates with a gap | SP | W1 | bar laid across the two crates |
| 20 | **Hooked** | nothing to build from on the ramp side; a push-pin hangs overhead | chute + push-pin above it | PH | W1 | diagonal pin → chute |
| 21 | **The Ladle** | the chute is short and steep: a bar would be jumped | steep short chute | LD | W1 | U drawn across the chute |
| 22 | **Two Balls** | two balls nose to tail on one chute; stopping the front one is not enough | chute, 2 balls | CH | W1 | longer bar, further upstream |
| 23 | **The Queue** | three balls, one chute, and the stroke has to be drawn before the first arrives | chute, 3 balls | BR | W1 | diagonal brace |
| 24 | **Off The Sill** | the cup hangs and the ball comes from a sill above it | hanging cup + sill | CH | W4 | bar on the sill |
| 25 | **Two Glasses** | two cups, one tap; the ball only threatens the near one | 2 cups, chute over the near cup | VG | W3 | V + split for the far cup |
| 26 | **Shaded Cup** | the ball is on the far side of a shelf that shades the tap's stream | shelf + chute + ball | SP | W2 | bar across crates + spout |
| 27 | **The Hot Chute** | the ball rolls across a hot pad; the only support for a stroke is the pad's cold rim | chute through a hot zone | BR | W5 | diagonal that also keeps the pour off the pad |
| 28 | **Crosswind Ball** | a fan pushes the pour left; the ball comes from the right | fan + right-hand chute | CH | W5 | bar + a shelter for the stream |
| 29 | **Drop Zone** | the ball falls from a shelf edge straight down into the mouth | shelf edge over the mouth | SP | W1 | bar spanning two crates under the drop |
| 30 | **High Ball** | the cup is high on a ledge and the ball rolls off the same ledge | raised cup + ledge | PH | W1 | pin-hook |
| 31 | **The Long Fall** | the ball starts high and arrives fast; a short bar is jumped | tall steep chute | LD | W1 | ladle |
| 32 | **Twin Threats** | two balls, two different chutes, both aimed at the same cup | two chutes, 2 balls | SP | W1 | one span that blocks both mouths |
| 33 | **The Shelf Above** | a shelf over the cup catches the pour *and* the ball | shelf over cup + ball | BR | W2 | diagonal + spout around the shelf |
| 34 | **Pinned High** | the cup is under a pin, the ball comes along the floor | floor-level ball + pin | PH | W1 | hook |
| 35 | **The Narrows** | narrow mouth; the ball can barely fit, so it must be stopped at the lip | narrow cup + chute | VG | W1 | V |
| 36 | **Split And Stop** | two cups, tap in the middle, ball aimed at the right cup | 2 cups, centre tap, ball | CH | W3 | bar + tent |
| 37 | **The Staircase** | two chutes at different heights, ball arrives on the lower one | 2 static chutes | BR | W1 | diagonal |
| 38 | **The Vault** | the cup is behind a low wall; the ball comes over the wall | static wall + chute | SP | W2 | span + spout over the wall |
| 39 | **Last Light** | far cup, long stage, ball from the far end, tap far left | long stage | LD | W2 | ladle + spout |
| 40 | **The Finale** | a hanging cup, a ball from a pinned chute, a fan pushing the pour | hanging cup + pin + fan + ball | PH | W4+W5 | hook + windbreak |

---

## The gate this plan has to pass

Beyond the existing checks (wins, leans on scenery, budget, no body inside scenery), this set adds
the one the last set lacked:

* **no two rooms may share a stroke signature** — every answer is normalised to its cup, quantised,
  and compared. Two rooms with the same normalised strokes fail the audit.
* **every room must state its trap in one sentence**, and the trap must be real: the idle play (no
  ink) must lose. A room that wins untouched is not a room.
* **the ball must be dangerous at t = 0** — an untouched ball must reach the mouth.

Status tracking lives at the bottom of this file as rooms are proved.

## Build status — measured, not claimed

All 40 rooms are built and proved with `tools/solve-hero.js`, emitted with `--emit`, and replayed by
`tools/hero-check.js --hands`.

```
verify        40/40 levels solvable with their reference line
layout        40 rooms clean, 0 pen leaks, every glass supported, nothing outside the world
physics       all checks pass
hero-check    40/40 won; hands 4–6 of 6, wavy 3–4 of 4 on every room
hero-audit    FAILS  <- and it is right to
```

**The variety gate fails, and that is the honest result of this round.**

```
hero-audit    only 7 distinct strokes across 40 rooms
              18 different verbs
              rooms 17,19,20,22,25,31,32,33,35,37,39 demand exactly the same stroke as room 1
              rooms 24,34,36,40 demand exactly the same stroke as room 21
```

What that means in plain terms: after normalising each answer to its cup, the 40 rooms collapse into
**seven distinct lines**:

1. a vertical bar ~110 px left of the cup, ~90 px tall (11 rooms)
2. the same bar, longer or at a different offset (the VG/PH variants fall into the same hash)
3. a diagonal brace from a crate (4 rooms)
4. a V (5 rooms)
5. a trough / ladle (5 rooms)
6. a tent splitter over two cups (2 rooms)
7. a spout off a crate (5 rooms)

The five stop-strokes in this plan **are** five different hand actions, and the water problems do
differ room to room — but three of the five stop-strokes are the same *idea* ("put something on the
chute that the ball cannot pass") and, once translated to the cup, several drew literally the same
polyline.

This is the physics limit from §"What the engine actually allows" made explicit: a right-moving ball
with the cup on the right can only be **stopped**, and every way of stopping it leaves the same few
shapes. The previous 25-room set was 21 copies of one bar; this set is 40 rooms across 7 lines. That
is better, and it is not yet the "no two rooms the same" bar.

### What was added this round

| Rooms | Built | Proved | Note |
|---|---|---|---|
| 1–8 | yes | yes | unchanged |
| 9–15 | yes | yes | hot pad, narrow mouth, shade, wall, two taps, low wall, deep sill |
| 16–40 | yes | yes | ball rooms on five stop-strokes and four water problems |

New trap assets actually used: **hot pad** (room 9 — the pour evaporates), **push-pin** (20, 25, 32,
35), two cups (26, 30), spout + stop (27, 28, 29), raised cups (23, 32, 40).

### What it would take to pass the gate

Not more rooms — a different mechanism. The only ways a ball can end up somewhere other than the cup
are: it is stopped (all of the above), or it never reaches the cup because *the level* puts it
elsewhere. That means ball rooms whose puzzle is **not** "stop the ball": a ball that must be kept
from knocking a *loose block* into the cup, a ball whose weight must be used (a see-saw), or a cup
that must be moved out of the ball's path. Those need new level pieces and new proofs, and they are
the next body of work — not another pass over these 25.
