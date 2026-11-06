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
| 28 | The Hanger | a cup that dangles instead of standing | feed it from above, it swings | **proved** 0.50 / 238 ink |
| 29 | The Step | cup on a step 88 px above its deck | stay near level and drop over the edge | **proved** 0.52 / 302 ink |
| 30 | Twin Taps | two taps into the middle, two cups at the sides | two strokes, one per cup | **proved** 0.50/0.69 / 731 of 850 |
| 31 | The Lip | tall thin lip between the deck and the mouth | rise over the lip, come back down | **proved** 0.50 / 517 ink |
| 32 | Hot Wall | hot pad stood on its edge as a wall | keep the water off the floor | **proved** 0.52 / 262 ink |
| 33 | Sinkhole | short hot gap with an island in it | a short bridge, not a span | **proved** 0.50 / 360 ink |
| 34 | The Needle | two short columns with a gap between | thread the gap, no sideways entry | **proved** 0.50 / 204 ink |
| 35 | Updraught | fan on the floor blowing up | shelter the fall | **blocked** 0.45 of 0.50, 90 candidates |
| 36 | The S-Bend | two offset slabs | snake twice | **proved** 0.50 / 517 ink |
| 37 | Tipping Point | pivoted bar | balance it | **blocked** 0.17; a moving bar also breaks the no-moving-bars rule |
| 38 | The Pin | push-pin as a mid-air anchor | hang the line from it | **blocked** 0.00: the pour hits the pin and splits |
| 39 | The Underside | roof over the cup plus a lip below | come in under the roof | **proved** 0.50 / 272 ink |
| 40 | Last Drop | deep narrow well | break the fall | **blocked** free win (idle 0.50) or 0.40, no middle |

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
9. **Rank the sweep from the pour outwards.** Sorting candidates by length
   first fills all 80 slots with short junk between neighbouring platforms and
   every room reads 0.00 (ink ~126). Rank by distance from the first point to
   the nearest tap, and use length only as a tie-break.
10. **A stroke has to catch water, so it must start at the lip the tap pours
   onto,** not at the deck's middle: water landing mid-deck spreads both ways
   and half of it never touches the line.
11. **Ranking must prefer the designed line.** With every winner scored 100,
   the tie-break fell through to candidate order and the search shipped a
   blanket across the whole level instead of the intended short chute. Sorting
   winners by ink spent picks the shape the room was built around.

## Where the rebuild stands

**21 of 25 frames proved**, each with a different obstacle and a different
answer shape: hot pad · fan · ramp · two cups one tap · moat · furnace · wall ·
roof · sill · cage · shaft · long span · step · lip · two taps two cups ·
hanging cup · hot wall · sinkhole · needle · S-bend · roofed shelf.

Every proved room is verified on five gates at once: untouched loses, the
authored answer wins, two runs of the same answer agree to three decimals, a
ball is present and never spoils the glass, and no other room shares its
structure.

A structural check over all fifteen — comparing every room's platform list —
reports **no two rooms share a structure**. Two rooms use two strokes (Long
Carry spans two shelves in one line; Twin Taps needs one line per cup), and
Twin Taps is the only room with two sources.

Remaining: **four unproved frames** (35, 37, 38, 40), each with the measurement
that killed it in the table above. They get replaced, not retuned. The Wedge
(0.05, then 0.14) was dropped the same way and is no longer in the list.
