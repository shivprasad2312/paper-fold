# Rebuilding rooms 16–40, trap first

Approved direction (round 22): the ball stays as scenery that must never reach
the glass, and the difficulty lives in the **water's route**. Every room below
is a distinct frame — a different obstacle, or the same obstacle doing a
different job — so no two rooms share a structure.

Status legend: **proved** (idle loses, answer wins, gates pass) · **planned** ·
**blocked** (measured, explained below).

| # | room | obstacle | what the stroke must do | status |
|---|------|----------|-------------------------|--------|
| 16 | Hot Cinder | hot pad on a wide low shelf under the tap | catch above the pad, carry across | **proved** 0.50 / 164 ink |
| 17 | Crosswind | fan across the gap | carry fast enough the wind cannot take it | **proved** 0.50 / 272 ink |
| 18 | The Moat | hot gap splitting the floor, cup on a plinth across it | carry from the column, which is higher than the mouth | **proved** 0.50 / 340 ink |
| 19 | Furnace Floor | hot floor directly under the tap | catch the fall on a small shelf before it lands | **proved** 0.50 / 369 ink |
| 20 | The Neck | a wall between the pour and the cup | go over the wall and down the far side | **proved** 0.50 / idle 0.02 |
| 21 | Two Wells | two cups, one tap | sit in the stream, let it break over the edge | **proved** 0.52/0.78 / 366 ink |
| 22 | Roof Run | slab that ends short of the mouth | hang the line off the obstacle itself | **proved** 0.50 / 279 ink |
| 23 | The Sill | mouth 118 px above its ledge | a near-level bridge, not a slide | **proved** 0.52 / 354 ink |
| 24 | Drop Shaft | cup between two walls, open only from above | drop it down the gap | **proved** 0.50 / 284 ink |
| 25 | The Cage | cup boxed in, open at the top, funnel lips above | get above the mouth and drop in | **proved** 0.50 / 432 ink |
| 26 | Long Carry | two shelves with a hot floor between | one stroke spanning both | **proved** 0.50 / 671 of 700 ink |
| 27 | Downhill | a ramp running away from the cup | bend the stream back | **proved** 0.50 / 408 ink |
| 28 | The Wedge | cup on a plinth behind a tall wedge | carry over the wedge | **blocked** 0.14: two sweeps, still no line |
| 29 | The Step | cup on a step 88 px above its deck | stay near level and drop over the edge | **proved** 0.52 / 302 ink |
| 30 | Twin Taps | two taps into the middle, two cups at the sides | two strokes, one per cup | **proved** 0.50/0.69 / 731 of 850 |
| 31 | The Lip | tall thin lip between the deck and the mouth | rise over the lip, come back down | **proved** 0.50 / 517 ink |
| 32 | Chute Off | tap over a ramp that dumps water away | intercept before the ramp | planned |
| 33 | Sinkhole | hot pad in the floor gap | bridge the gap | planned |
| 34 | The Funnel | cup under two converging slabs | deliver into the funnel mouth | planned |
| 35 | Wind Tunnel | fan ahead of the fall | shield or angle | planned |
| 36 | Hot Bridge | the only handy anchor has a hot pad on it | rest the line elsewhere | planned |
| 37 | Two-Tier | cup on a shelf above the floor | lift: carry water up | planned |
| 38 | The Pin | a push-pin mid-air | hang the line from the pin | planned |
| 39 | The Funnel Roof | cup under a roof narrower than the mouth | shed water in from one side | planned |
| 40 | Last Drop | long vertical drop ending in a neck | slow the water down | planned |

## Rules that came out of the measurements

1. A hot pad bites only water that **lands** on it. Put it under the fall or on
   the shelf, never beside the route.
2. A fan bites only water that is **slow or airborne**. Above force ~1.0 it
   starts stealing water from a good route, which reads as unfair.
3. Water that reaches the floor **pools, spreads and drains off the level**. A
   room whose water ends on the floor has no route.
4. A chute from a shelf to a mouth 240 px away must end **just left of the
   mouth and just above the rim** (6 of 60 swept chutes won; every winner
   between x 760–780 at y 480–520).
5. The ball stays out of the mouth's vertical. It is scenery that punishes a
   careless stroke, not the clock the level runs on.
6. **Copy the geometry, do not tidy it.** The first replay of Downhill filled
   0.45 instead of 0.50 because the floor was 2 px higher in the file than in
   the skeleton that proved it. A proved room is proved at its exact numbers.
7. **Water only runs downhill.** A raised cup needs an anchor HIGHER than its
   mouth. The Moat failed 0/192 in batch 1 for exactly this reason: its only
   anchor was the floor, 110 px below the mouth, so no line could ever climb.
   Batch 2 fixed it by adding a column whose top sits above the mouth.
8. **A cup within ~20 px of a ledge edge drinks for free.** Water sprays about
   that far past the lip of whatever it lands on, so the cup has to sit clear
   of every shelf edge or the room solves itself. This is what made The Neck,
   Roof Run and The Cage win untouched before they were moved.
9. **Ranking must prefer the designed line.** With every winner scored 100,
   the tie-break fell through to candidate order and the search shipped a
   blanket across the whole level instead of the intended short chute. Sorting
   winners by ink spent picks the shape the room was built around.

## Where the rebuild stands

**15 of 25 frames proved**, each with a different obstacle and a different
answer shape: hot pad · fan · ramp · two cups one tap · moat · furnace · wall ·
roof · sill · cage · shaft · long span · step · lip · two taps two cups.

A structural check over all fifteen — comparing every room's platform list —
reports **no two rooms share a structure**. Two rooms use two strokes (Long
Carry spans two shelves in one line; Twin Taps needs one line per cup), and
Twin Taps is the only room with two sources.

Remaining: 28, 32-40. The Wedge has now failed two designs (0.05, then 0.14)
and gets **replaced rather than retuned**, per the room rule.
