/* ==========================================================================
   tools/room-plan/traps.js — the trap-first rooms, and what they measured.

   Round 22, second attempt at rebuilding 16-40. The first attempt (rooms.js,
   in this folder) failed 0/8 for a reason that turned out to be structural: it
   put the ball over the cup's mouth and the tap over the same cup, so the one
   stroke that stopped the ball also caught the water.

   This file is the trap-first answer the user picked: the ball is scenery that
   must never reach the glass, and the puzzle is the WATER's route past a
   hazard. Two rooms proved here; both play through the headless sim.

   What the measurements say about hazards, since it decides every room:

     - A HOT PAD only bites water that lands on it. Water already riding a
       stroke passes over it untouched, so the pad belongs under the FALL
       (or on the shelf the tap drains onto), never beside it.
     - A FAN only bites water that is slow or airborne. At force 2.0 a fast
       chute still fills the cup (0.50) while a slow one is blown off it
       (0.00). Stronger forces start stealing water from a good route, which
       reads as unfair rather than as a puzzle, so force stays low.
     - Water that reaches the floor pools, spreads, and drains off the left
       end. A room whose water ends up on the floor is a room with no route.

   The one shape that reliably carries water from an elevated shelf to a mouth
   240 px away is a chute whose END sits just LEFT of the mouth and just ABOVE
   the rim: the water leaves the line with speed, arcs, and drops in. Sweeping
   five end points x four heights around this room, 6 of 60 chutes won; every
   winner ended between x 760 and 780 at y 480-520. A chute that ends over the
   middle of the mouth overshoots; one that ends short lands on the floor.
   ========================================================================== */
'use strict';

const FLOOR = { x: 640, y: 690, w: 1300, h: 24, kind: 'teal' };
const SHELF = { x: 520, y: 420, w: 200, h: 24, kind: 'teal' };
const CUP = { x: 820, y: 619, w: 108, h: 118, need: 0.5 };

// Proved: idle loses (0.00, hole in the route), answer fills 0.52, ball static.
// Re-proved on its own frame so it is not a copy of Crosswind below: this shelf
// is 260 wide and 60 px lower, and the answer is a single 164-ink chute.
const HOT_CINDER = {
  id: 16, name: 'Hot Cinder', verb: 'carry', intent: 'chute',
  answer: [[642, 461], [780, 510]],
  tip: 'The shelf under the tap is hot. Catch the water before it lands, then carry it across.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 115 },
  // y 621, not the 619 of CUP above: 2 px is the whole difference here.
  glasses: [{ x: 820, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [{ x: 640, y: 690, w: 1300, h: 24, kind: 'teal' },
          { x: 520, y: 480, w: 260, h: 24, kind: 'teal' }],
  hots: [{ x: 520, y: 460, w: 270, h: 26 }],
  balls: [{ x: 300, y: 640, r: 26, kind: 'heavy' }],
};

// Proved: idle 0.00, answer 0.50, and a fan that costs a slow route but not a
// fast one (force 0.3). Same shelf-and-cup frame, deliberately: this is a pair
// of probes, not two shipped levels — a shipped pair would be one structure
// twice, which the room rules forbid.
const CROSSWIND = {
  id: 17, name: 'Crosswind', verb: 'carry', intent: 'chute',
  answer: [[604, 395], [778, 528]],
  tip: 'The wind takes anything that leaves the line slowly.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 115 },
  glasses: [CUP],
  stage: [FLOOR, SHELF],
  fans: [{ x: 1000, y: 480, w: 60, h: 300, angle: Math.PI, dir: 1, force: 0.3 }],
  balls: [{ x: 320, y: 640, r: 26, kind: 'heavy' }],
};

// Proved: idle 0.00, answer 0.50. The tap pours onto a ramp that runs AWAY
// from the cup, so the water's first move is the wrong one and the stroke has
// to make the turn. Intended shape: a bent line (deflect), not a straight chute.
const DOWNHILL = {
  id: 27, name: 'Downhill', verb: 'deflect', intent: 'chute',
  answer: [[640, 412], [812, 357], [984, 506]],
  tip: 'It pours onto a slope that runs the wrong way. Make the turn.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 115 },
  glasses: [{ x: 980, y: 621, w: 108, h: 118, need: 0.5 }],
  // Geometry copied from the skeleton that proved it: the floor is 2 px
  // higher here than FLOOR above, and that 2 px is the difference between
  // 0.50 and 0.45. Do not "tidy" this to FLOOR.
  stage: [{ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
          { x: 640, y: 430, w: 320, h: 20, kind: 'teal', angle: -0.2 }],
  balls: [{ x: 200, y: 640, r: 26, kind: 'heavy' }],
};

// Proved: idle 0.00/0.00, answer fills 0.52 and 0.78. Two cups 240 px apart
// with the tap in the middle: no chute can serve both, so the line has to sit
// in the stream and let it break over the edge. 6 of 120 screened candidates
// won, all of them beams rather than chutes.
const TWO_WELLS = {
  id: 21, name: 'Two Wells', verb: 'split', intent: 'beam',
  answer: [[640, 672], [966, 506]],
  tip: 'One stream, two cups. Give it an edge to break over.',
  delay: 0.4,
  faucet: { x: 820, y: 200, rate: 30, total: 170 },
  glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 },
            { x: 940, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [{ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }],
  balls: [{ x: 200, y: 640, r: 26, kind: 'heavy' }],
};

// ---- batch 2: six more frames, none of them a rerun of the four above ----
// Each entry keeps the exact numbers that proved; see PLAN.md rule 6.

const T_FLOOR = { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' };

// 18 MOAT (carry). A hot gap splits the floor and the cup sits on a plinth
// across it. The anchor is a tall column whose top is ABOVE the mouth: water
// only runs downhill, so a raised cup needs something higher to start from.
// This is the fix for the frame that failed 0/192 in batch 1.
// Proved: idle 0.00, answer 0.50 on 340 ink.
const THE_MOAT = {
  id: 18, name: 'The Moat', verb: 'carry', intent: 'chute',
  answer: [[538, 346], [830, 500]],
  tip: 'The gap is hot and the cup is up on the far side. Start from the column.',
  delay: 0.4,
  faucet: { x: 600, y: 200, rate: 26, total: 120 },
  glasses: [{ x: 880, y: 569, w: 108, h: 118, need: 0.5 }],
  stage: [ T_FLOOR,
    { x: 300, y: 690, w: 520, h: 20, kind: 'teal' },
    { x: 940, y: 690, w: 520, h: 20, kind: 'teal' },
    { x: 520, y: 520, w: 40, h: 340, kind: 'wood' },
    { x: 880, y: 640, w: 200, h: 24, kind: 'teal' } ],
  hots: [{ x: 620, y: 682, w: 130, h: 26 }],
  balls: [{ x: 250, y: 640, r: 26, kind: 'heavy' }],
};

// 19 FURNACE FLOOR (catch). The floor under the tap is hot: every drop that
// lands is gone. The only rest is a small shelf beside the pour.
// Proved: idle 0.00, answer 0.50 on 369 ink.
const FURNACE_FLOOR = {
  id: 19, name: 'Furnace Floor', verb: 'catch', intent: 'chute',
  answer: [[486, 364], [810, 540]],
  tip: 'The floor it lands on is hot. Catch it while it is still falling.',
  delay: 0.4,
  faucet: { x: 520, y: 200, rate: 26, total: 120 },
  glasses: [{ x: 860, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ T_FLOOR, { x: 440, y: 380, w: 120, h: 20, kind: 'wood' } ],
  hots: [{ x: 520, y: 676, w: 260, h: 28 }],
  balls: [{ x: 1080, y: 640, r: 26, kind: 'heavy' }],
};

// 20 THE NECK (cross). A wall stands between the pour and the cup, so the
// water has to go OVER it and come down the far side. The wall also shields
// the cup from splash — a cup within ~20 px of a ledge edge drinks for free.
// Proved: idle 0.02, answer 0.50.
const THE_NECK = {
  id: 20, name: 'The Neck', verb: 'cross', intent: 'chute',
  answer: [[824, 326], [615, 271], [406, 546]],
  tip: 'The wall is in the way, not in the answer. Go over it.',
  delay: 0.4,
  faucet: { x: 800, y: 200, rate: 26, total: 120 },
  glasses: [{ x: 450, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ T_FLOOR,
    { x: 620, y: 470, w: 150, h: 26, kind: 'wood' },
    { x: 800, y: 340, w: 160, h: 22, kind: 'teal' } ],
  balls: [{ x: 1080, y: 640, r: 26, kind: 'heavy' }],
};

// 22 ROOF RUN (overhang). The slab ends short of the mouth, so the pour sheds
// past the cup. The slab is the only anchor at the right height, so the answer
// hangs off the obstacle itself.
// Proved: idle 0.00, answer 0.50 on 279 ink — the cheapest line in the set.
const ROOF_RUN = {
  id: 22, name: 'Roof Run', verb: 'overhang', intent: 'chute',
  answer: [[595, 405], [836, 546]],
  tip: 'The roof sends it past the cup. Use the roof.',
  delay: 0.4,
  faucet: { x: 560, y: 200, rate: 26, total: 120 },
  glasses: [{ x: 880, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ T_FLOOR, { x: 550, y: 420, w: 300, h: 24, kind: 'teal' } ],
  balls: [{ x: 260, y: 640, r: 26, kind: 'heavy' }],
};

// 23 THE SILL (climb). The mouth sits 118 px above its ledge, which is higher
// than anything the pour reaches on its own. The answer is nearly level — a
// bridge across, not a slide down.
// Proved: idle 0.00, answer 0.52 on 354 ink.
const THE_SILL = {
  id: 23, name: 'The Sill', verb: 'climb', intent: 'beam',
  answer: [[444, 309], [796, 354]],
  tip: 'That mouth is higher than the pour will ever reach. Level is not enough — go across.',
  delay: 0.4,
  faucet: { x: 600, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 840, y: 429, w: 108, h: 118, need: 0.5 }],
  stage: [ T_FLOOR,
    { x: 840, y: 500, w: 180, h: 24, kind: 'teal' },
    { x: 420, y: 330, w: 160, h: 20, kind: 'wood' } ],
  balls: [{ x: 200, y: 640, r: 26, kind: 'heavy' }],
};

// 25 THE CAGE (drop). The cup is boxed in with an open top. The shelf sheds
// wide of the opening, and the funnel lips above the mouth catch what comes in
// at an angle. Without the lips this frame tops out at 0.47 and never wins.
// Proved: idle 0.00, answer 0.50.
const THE_CAGE = {
  id: 25, name: 'The Cage', verb: 'drop', intent: 'chute',
  answer: [[1007, 401], [820, 360], [640, 520]],
  tip: 'Boxed in, open at the top. Get it above the mouth and let it fall in.',
  delay: 0.4,
  faucet: { x: 980, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ T_FLOOR,
    { x: 540, y: 600, w: 24, h: 180, kind: 'wood' },
    { x: 740, y: 600, w: 24, h: 180, kind: 'wood' },
    { x: 980, y: 420, w: 180, h: 22, kind: 'teal' },
    { x: 570, y: 520, w: 84, h: 14, kind: 'wood', angle: 0.4 },
    { x: 710, y: 520, w: 84, h: 14, kind: 'wood', angle: -0.4 } ],
  balls: [{ x: 260, y: 640, r: 26, kind: 'heavy' }],
};

// ---- batch 3: five more frames, again with no shared structure ----

// 24 DROP SHAFT (drop). The cup sits between two short walls. The deck above
// sheds onto the floor either side of the shaft, so nothing walks in sideways:
// it has to be dropped down the gap. Proved: idle 0.00, answer 0.50 / 284 ink.
const DROP_SHAFT = {
  id: 24, name: 'Drop Shaft', verb: 'drop', intent: 'chute',
  answer: [[560, 411], [810, 546]],
  tip: 'It only takes water from above. Get over the gap and let it fall.',
  delay: 0.4,
  faucet: { x: 560, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 850, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 740, y: 630, w: 24, h: 140, kind: 'wood' },
    { x: 960, y: 630, w: 24, h: 140, kind: 'wood' },
    { x: 560, y: 430, w: 180, h: 22, kind: 'teal' } ],
  balls: [{ x: 200, y: 640, r: 26, kind: 'heavy' }],
};

// 26 LONG CARRY (carry). Two shelves and a hot floor between them. A single
// stroke has to span both, which takes 671 of the 700 ink — the tightest room
// in the set. Proved: idle 0.00, answer 0.50.
const LONG_CARRY = {
  id: 26, name: 'Long Carry', verb: 'carry', intent: 'beam',
  answer: [[310, 361], [734, 451], [960, 528]],
  tip: 'Land is scarce and the floor is hot. One line, both shelves.',
  delay: 0.4, ink: 700,
  faucet: { x: 220, y: 200, rate: 26, total: 130 },
  glasses: [{ x: 1000, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 220, y: 380, w: 200, h: 22, kind: 'teal' },
    { x: 640, y: 470, w: 180, h: 22, kind: 'teal' } ],
  hots: [{ x: 480, y: 676, w: 520, h: 28 }],
  balls: [{ x: 1150, y: 640, r: 26, kind: 'heavy' }],
};

// 29 THE STEP (climb). The cup stands on a step 88 px above the deck that feeds
// it, so the line cannot simply run downhill: it stays near level and drops
// over the step edge. Proved: idle 0.00, answer 0.52 / 302 ink.
const THE_STEP = {
  id: 29, name: 'The Step', verb: 'climb', intent: 'beam',
  answer: [[561, 411], [860, 456]],
  tip: 'The cup is up on the step. Level beats downhill here.',
  delay: 0.4,
  faucet: { x: 480, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 900, y: 531, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 900, y: 640, w: 300, h: 100, kind: 'teal' },
    { x: 480, y: 430, w: 180, h: 22, kind: 'teal' } ],
  balls: [{ x: 200, y: 640, r: 26, kind: 'heavy' }],
};

// 31 THE LIP (clear). A tall thin lip stands between the deck and the mouth. A
// chute that runs straight at the cup hits the lip, so the line has to rise over
// it and come back down. Proved: idle 0.00, answer 0.50 / 517 ink.
const THE_LIP = {
  id: 31, name: 'The Lip', verb: 'clear', intent: 'chute',
  answer: [[299, 381], [510, 331], [720, 546]],
  tip: 'The lip is taller than the cup. Rise over it, then come down.',
  delay: 0.4,
  faucet: { x: 380, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 760, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 640, y: 600, w: 26, h: 160, kind: 'wood' },
    { x: 380, y: 400, w: 180, h: 22, kind: 'teal' } ],
  balls: [{ x: 1080, y: 640, r: 26, kind: 'heavy' }],
};

// 30 TWIN TAPS (split). Two taps pour into the middle, two cups wait at the
// sides, and no single line serves both — the set's second two-stroke room,
// and the only one with two sources. Two strokes cost 731 ink of 850.
// Proved: idle 0.00/0.00, answer 0.50/0.69.
const TWIN_TAPS = {
  id: 30, name: 'Twin Taps', verb: 'split', intent: 'chute',
  answers: [[[530, 416], [405, 366], [280, 528]], [[590, 416], [791, 415], [960, 546]]],
  tip: 'Two taps, two cups, one hand at a time.',
  delay: 0.4, ink: 850,
  faucets: [{ x: 560, y: 200, rate: 26, total: 110 },
            { x: 720, y: 200, rate: 26, total: 110 }],
  glasses: [{ x: 320, y: 621, w: 108, h: 118, need: 0.5 },
            { x: 1000, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 560, y: 430, w: 150, h: 22, kind: 'teal' },
    { x: 720, y: 430, w: 150, h: 22, kind: 'teal' } ],
  balls: [{ x: 160, y: 640, r: 26, kind: 'heavy' }],
};

// ---- batch 4: six more frames, then four that would not prove ----

// 28 THE HANGER (reach). The cup dangles instead of standing (hanging: true —
// a primitive the hero set had never used), so it swings when water reaches it.
// Proved: idle 0.00, answer 0.50 / 238 ink.
const THE_HANGER = {
  id: 28, name: 'The Hanger', verb: 'reach', intent: 'chute',
  answer: [[506, 311], [610, 246], [714, 296]],
  tip: 'It hangs, so it gives. Feed it from above and let it swing.',
  delay: 0.4,
  faucet: { x: 380, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 700, y: 371, w: 108, h: 118, need: 0.5, hanging: true }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 420, y: 330, w: 190, h: 22, kind: 'teal' } ],
  balls: [{ x: 1080, y: 640, r: 26, kind: 'heavy' }],
};

// 32 HOT WALL (cross). The hot pad stands on its edge and acts as a WALL: water
// pooling on the floor dies against it, so the floor route is closed. The line
// crosses above it. Proved: idle 0.00, answer 0.50 / 262 ink.
const HOT_WALL = {
  id: 32, name: 'Hot Wall', verb: 'cross', intent: 'chute',
  answer: [[600, 501], [860, 530]],
  tip: 'The wall is hot. Never let the water reach the floor.',
  delay: 0.4,
  faucet: { x: 590, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 460, y: 520, w: 300, h: 22, kind: 'teal' } ],
  hots: [{ x: 760, y: 620, w: 26, h: 80 }],
  balls: [{ x: 160, y: 640, r: 26, kind: 'heavy' }],
};

// 33 SINKHOLE (bridge). A short hot gap with a small island in it. Unlike Long
// Carry the span is short and the island is the far landing.
// Proved: idle 0.00, answer 0.50 / 360 ink.
const SINKHOLE = {
  id: 33, name: 'Sinkhole', verb: 'bridge', intent: 'beam',
  answer: [[416, 416], [571, 366], [726, 488]],
  tip: 'Short gap, hot bottom. Bridge it, do not span the room.',
  delay: 0.4,
  faucet: { x: 420, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 700, y: 581, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 340, y: 690, w: 480, h: 20, kind: 'teal' },
    { x: 1010, y: 690, w: 380, h: 20, kind: 'teal' },
    { x: 700, y: 660, w: 200, h: 40, kind: 'teal' },
    { x: 380, y: 430, w: 180, h: 22, kind: 'teal' } ],
  hots: [{ x: 580, y: 676, w: 120, h: 28 }],
  balls: [{ x: 1150, y: 640, r: 26, kind: 'heavy' }],
};

// 34 THE NEEDLE (thread). Two short columns with a gap between them, and the
// cup at the bottom of the gap. Nothing can be drawn through a column, so the
// line has to stop above the gap and drop the water through.
// Proved: idle 0.00, answer 0.50 / 204 ink.
const THE_NEEDLE = {
  id: 34, name: 'The Needle', verb: 'thread', intent: 'chute',
  answer: [[840, 368], [660, 478]],
  tip: 'Thread the gap. There is no room to come in from the side.',
  delay: 0.4,
  faucet: { x: 780, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 900, y: 400, w: 180, h: 22, kind: 'teal' },
    { x: 560, y: 570, w: 24, h: 220, kind: 'wood' },
    { x: 720, y: 570, w: 24, h: 220, kind: 'wood' } ],
  balls: [{ x: 160, y: 640, r: 26, kind: 'heavy' }],
};

// 36 THE S-BEND (turn). Two offset slabs so the route has to snake twice.
// Proved: idle 0.00, answer 0.50 / 517 ink.
const S_BEND = {
  id: 36, name: 'The S-Bend', verb: 'turn', intent: 'chute',
  answer: [[443, 342], [694, 346], [940, 486]],
  tip: 'Two slabs, two turns. Straight will not reach.',
  delay: 0.4,
  faucet: { x: 480, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 980, y: 621, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 560, y: 360, w: 260, h: 20, kind: 'teal' },
    { x: 760, y: 520, w: 260, h: 20, kind: 'teal' } ],
  balls: [{ x: 160, y: 640, r: 26, kind: 'heavy' }],
};

// 39 THE UNDERSIDE (shelter). A roof over the cup and a lip on the shelf below,
// so water cannot arrive from above or across the shelf: the line enters the
// gap sideways and stays under the roof the whole way.
// Proved: idle 0.00, answer 0.50 / 272 ink.
const THE_UNDERSIDE = {
  id: 39, name: 'The Underside', verb: 'shelter', intent: 'chute',
  answer: [[460, 451], [730, 485]],
  tip: 'Roofed, and the shelf has a lip. Come in under the roof.',
  delay: 0.4,
  faucet: { x: 470, y: 200, rate: 26, total: 125 },
  glasses: [{ x: 760, y: 550, w: 108, h: 118, need: 0.5 }],
  stage: [ { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    { x: 760, y: 380, w: 300, h: 22, kind: 'teal' },
    { x: 760, y: 620, w: 320, h: 22, kind: 'teal' },
    { x: 660, y: 585, w: 20, h: 50, kind: 'wood' },
    { x: 380, y: 470, w: 180, h: 22, kind: 'teal' } ],
  balls: [{ x: 160, y: 640, r: 26, kind: 'heavy' }],
};

// ---- these four did NOT prove and are not shipped ----
// 35 Updraught  : the updraught takes the last 5% no matter where the line goes
//                 (best 0.45 of 0.50 across 90 candidates, three fan settings).
// 37 Tipping Pt : a pivoted bar tips with the water and dumps it (best 0.17).
//                 A moving bar also sits badly with the no-moving-bars rule.
// 38 The Pin    : best 0.00. A line hanging from a pin is a real anchor, but the
//                 pour lands on the pin itself and splits: no candidate caught
//                 it, with the pin left, right or in the stream.
// 40 Last Drop  : the well either lets floor water walk in (idle 0.50, a free
//                 win) or keeps it out and takes none of the delivery
//                 (best 0.40 of 0.50). There is no middle.

module.exports = { FLOOR, SHELF, CUP, HOT_CINDER, CROSSWIND, DOWNHILL, TWO_WELLS,
  THE_MOAT, FURNACE_FLOOR, THE_NECK, ROOF_RUN, THE_SILL, THE_CAGE,
  DROP_SHAFT, LONG_CARRY, THE_STEP, THE_LIP, TWIN_TAPS,
  THE_HANGER, HOT_WALL, SINKHOLE, THE_NEEDLE, S_BEND, THE_UNDERSIDE };

