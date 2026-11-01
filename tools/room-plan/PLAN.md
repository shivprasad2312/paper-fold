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
| 24 | Drop Shaft | cup at the bottom of a shaft | funnel into the shaft mouth | planned |
| 25 | The Cage | cup boxed in, open at the top, funnel lips above | get above the mouth and drop in | **proved** 0.50 / 432 ink |
| 26 | Long Carry | tap far left, cup far right, hot floor between | span two anchors in one line | **blocked** 0/164: one straight line cannot turn |
| 27 | Downhill | a ramp running away from the cup | bend the stream back | **proved** 0.50 / 408 ink |
| 28 | The Pockets | three pockets, one leads to the cup | choose the pocket | planned |
| 29 | The Wedge | cup behind a wedge | carry over the wedge | planned |
| 30 | Twin Taps | two taps, two cups | one line serving both | planned |
| 31 | The Lip | a low lip in front of the mouth | clear the lip into the mouth | planned |
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

10 of 25 frames proved, all with different obstacles and different answer
shapes: hot pad · fan · ramp · two cups · moat · furnace · wall · roof ·
sill · cage. A structural check over the ten (comparing every room's platform
list) confirms **no two share a structure**, and Hot Cinder was re-framed onto
its own shelf when it turned out to be a copy of Crosswind.

Remaining: 24, 26, 28-40. Their frames are listed above; each needs its own
sweep, and the three blocked batch-1 frames were replaced rather than retuned.
