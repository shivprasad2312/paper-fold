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
const HOT_CINDER = {
  id: 16, name: 'Hot Cinder', verb: 'carry', intent: 'chute',
  answer: [[560, 400], [780, 520]],
  tip: 'The shelf under the tap is hot. Catch the water before it lands, then carry it across.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 115 },
  glasses: [CUP],
  stage: [FLOOR, SHELF],
  hots: [{ x: 520, y: 400, w: 210, h: 26 }],
  balls: [{ x: 300, y: 640, r: 26, kind: 'heavy' }],
};

// Proved: idle 0.00, answer 0.50, and a fan that costs a slow route but not a
// fast one (force 0.3). Same shelf-and-cup frame, deliberately: this is a pair
// of probes, not two shipped levels — a shipped pair would be one structure
// twice, which the room rules forbid.
const CROSSWIND = {
  id: 17, name: 'Crosswind', verb: 'carry', intent: 'chute',
  answer: [[500, 400], [760, 480]],
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

module.exports = { FLOOR, SHELF, CUP, HOT_CINDER, CROSSWIND, DOWNHILL, TWO_WELLS };
