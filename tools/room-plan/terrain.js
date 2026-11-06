/* ==========================================================================
   tools/room-plan/terrain.js — rooms built around BIG SOLID MASSES.

   This is the reference app's defining grammar (see the 71 harvested frames):
   a big teal wedge, plateau, staircase or funnel wall, 200-400 px across, with
   the tap and the cup arranged around it. Our levels 16-40 are thin 16-24 px
   bars over a flat floor, which is why they all read as one room moved about.

   The engine already supported this and nothing used it: a platform may be
   `{ poly: [[x,y], ...], kind }`, built with Bodies.fromVertices and drawn with
   a gradient. `terrain-sweep.js` solves a room in this grammar.

   Uniform glass: 108 x 118, need 0.5, base on terrain.
   Ids here are local (101+) so they cannot collide with the trap rooms; `slot`
   is the level number each one is meant to become.
   ========================================================================== */
'use strict';

const G = (x, top) => ({ x, y: top - 59, w: 108, h: 118, need: 0.5 });   // base sits on `top`
const BALL = (x, y) => ({ x, y: y == null ? 640 : y, r: 26, kind: 'heavy' });
const FLOOR = { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' };
// a plateau: flat top at topY, splaying out to botW at the floor
const trap = (cx, topY, bottomY, topW, botW) => ({ kind: 'teal', poly: [
  [cx - topW / 2, topY], [cx + topW / 2, topY], [cx + botW / 2, bottomY], [cx - botW / 2, bottomY]] });

// 30 THE PLATEAU (cross). A big flat-topped mass under the pour; the water runs
// off its lip and the cup waits below. The mass is the whole level: there is no
// flat floor to walk along, the top of the plateau is the only usable route.
// Proved: idle 0.00, answer 0.50 / 240 ink.
const THE_PLATEAU = {
  id: 101, slot: 30, name: 'The Plateau', verb: 'cross', intent: 'chute',
  answer: [[625, 462], [860, 508]],
  tip: 'The pour lands on the plateau. Carry it off the lip.',
  delay: 0.4,
  faucet: { x: 600, y: 200, rate: 26, total: 125 },
  glasses: [G(900, 680)],
  stage: [FLOOR, trap(520, 470, 690, 300, 380)],
  balls: [BALL(160)],
};

// 35 THE VALLEY (settle). Two big masses with a raised shelf between them. The
// cup stands in the gap, so the answer is short and the room is about where the
// water lands, not how far it goes.
// Proved: idle 0.00, answer 0.50 / 196 ink — the cheapest room in the set.
const THE_VALLEY = {
  id: 102, slot: 37, name: 'The Valley', verb: 'settle', intent: 'chute',
  answer: [[446, 442], [642, 448]],
  tip: 'Two walls, one gap. The water only has to come down between them.',
  delay: 0.4,
  faucet: { x: 420, y: 200, rate: 26, total: 130 },
  glasses: [G(660, 600)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[290, 690], [290, 450], [550, 450], [550, 690]] },
    { kind: 'teal', poly: [[770, 690], [770, 450], [1030, 450], [1030, 690]] },
    { x: 660, y: 610, w: 260, h: 40, kind: 'teal' }],
  balls: [BALL(160)],
};

/* ---- attempted and NOT proved: kept with the reason ----------------------

  STAIRCASE (slot 31) - three big steps, tap over the top step, cup to the
    right. Water cascades down the step tops and pools in the corners; no
    stroke from the top step's lip reached the cup (0 wins in 9 arrangements).

  CANYON (slot 32) - two walls with a slot between and the cup at the bottom.
    The deck over the slot (180 wide) cannot catch a 26-rate pour: water misses
    it on both sides and hits the floor beside the walls.

  LONG SLOPE (slot 33) - one long diagonal mass. Its own slope delivers water
    to the cup with no stroke at all: a free win, so the mass had to go.

  MESA (slot 34) - cup standing ON a plateau, tap on a shelf to the left.
    Traced: the pour spreads and runs off the shelf's LEFT edge, falls to the
    floor at x 27-627 and never gets within 200 px of the mesa. Reaching the
    mesa top needs a beam from the shelf to the mesa lip, which the sweep never
    found; the mesa's top corner blocks the straight line.

  FUNNEL WALLS (slot 36) - two big wedges over the cup. The pour fell straight
    between them into the cup with no stroke: idle 0.50, a free win.

  UNDERPASS (slot 37) - big overhang block, cup tucked under it. No stroke from
    the overhang's lip reached the cup.

  THE RULE LEARNED: a big mass POOLS what lands on it. Water runs off the
  nearest edge and, with a 26-rate pour, that edge is wherever the tap is
  off-centre - usually the wrong way. A mass only works as a level when the tap
  pours AT its lip, so the water leaves the mass immediately, and the cup sits
  out and below that lip. Plateau and Valley both follow that and both proved
  first time; every failure above breaks it.
--------------------------------------------------------------------------- */

/* ---- wave 2: six more mass SHAPES, each obeying the lip rule ------------- */

// 31 THE PRISM (run). An apex-up prism; the pour lands on its right slope and
// runs off the base-right, so the mass itself does the carrying and the stroke
// only bridges the last gap. Proved: idle 0.00, answer 0.52 / 271 ink.
const THE_PRISM = {
  id: 103, slot: 31, name: 'The Prism', verb: 'run', intent: 'chute',
  answer: [[699, 473], [970, 478]],
  tip: 'The prism throws it sideways. Meet it on the way down.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 130 },
  glasses: [G(1010, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[520, 690], [860, 690], [690, 470]] },
    { x: 1010, y: 660, w: 200, h: 40, kind: 'teal' }],
  balls: [BALL(160)],
};

// 32 THE CLIFF (spill). A big trapezoid whose flat top ends at a near-vertical
// face: the water walks to the edge and drops. Proved: idle 0.00, 0.50 / 350 ink.
const THE_CLIFF = {
  id: 104, slot: 32, name: 'The Cliff', verb: 'spill', intent: 'chute',
  answer: [[705, 422], [860, 372], [1014, 478]],
  tip: 'It runs to the edge and falls. Catch it as it goes over.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 130 },
  glasses: [G(1010, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[480, 430], [780, 430], [820, 690], [560, 690]] },
    { x: 1010, y: 660, w: 200, h: 40, kind: 'teal' }],
  balls: [BALL(160)],
};

// 33 THE SPIRE (divert). A tall narrow spike between the pour and the cup: it
// splits the stream and throws it the wrong way, so the answer has to go over
// the top. (Replaced "Two Steps", which never solved.) Proved: 0.50 / 277 ink.
const THE_SPIRE = {
  id: 105, slot: 33, name: 'The Spire', verb: 'divert', intent: 'chute',
  answer: [[620, 450], [900, 560]],
  tip: 'The spire splits it. Go over the top and down the far side.',
  delay: 0.4,
  faucet: { x: 620, y: 200, rate: 26, total: 130 },
  glasses: [G(940, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[620, 690], [700, 690], [660, 430]] },
    { x: 940, y: 660, w: 200, h: 40, kind: 'teal' }],
  balls: [BALL(160)],
};

// 34 THE TENT (settle). Two prisms making a valley; the cup stands on a raised
// pad inside it, so only a delivered stream can fill it.
// Proved: idle 0.00, 0.50 / 237 ink.
const THE_TENT = {
  id: 106, slot: 34, name: 'The Tent', verb: 'settle', intent: 'chute',
  answer: [[413, 487], [650, 476]],
  tip: 'Two roofs and a valley. The cup sits in the middle of it.',
  delay: 0.4,
  faucet: { x: 430, y: 200, rate: 26, total: 130 },
  glasses: [G(690, 610)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[300, 690], [600, 690], [450, 430]] },
    { kind: 'teal', poly: [[1080, 690], [780, 690], [930, 430]] },
    { x: 690, y: 620, w: 220, h: 36, kind: 'teal' }],
  balls: [BALL(160)],
};

// 35 THE LONG SHELF (carry). One wide, thick slab high up and nothing else: the
// whole lower half of the screen is open air. Proved: idle 0.00, 0.50 / 355 ink.
const THE_LONG_SHELF = {
  id: 107, slot: 35, name: 'The Long Shelf', verb: 'carry', intent: 'chute',
  answer: [[635, 412], [778, 362], [920, 508]],
  tip: 'One shelf, a long drop. Carry it out and let it fall.',
  delay: 0.4,
  faucet: { x: 620, y: 200, rate: 26, total: 130 },
  glasses: [G(960, 680)],
  // poly, not a rect platform: a rect is centred on (x,y), this mass has its
  // TOP at y and its base at y+h. Transcribing it as a rect moved it 32 px and
  // the proved answer stopped working.
  stage: [FLOOR, { kind: 'teal', poly: [[410, 420], [410, 356], [710, 356], [710, 420]] }],
  balls: [BALL(160)],
};

// 36 THE OVERHANG (shelter). A big block hanging over open space; the cup sits
// well out from under it, so the water has to be carried across the drop.
// Proved: idle 0.00, 0.50 / 461 ink — the room the block actually earns.
const THE_OVERHANG = {
  id: 108, slot: 36, name: 'The Overhang', verb: 'shelter', intent: 'chute',
  answer: [[905, 302], [490, 502]],
  tip: 'The block sheds it away from the cup. Carry it across.',
  delay: 0.4,
  faucet: { x: 900, y: 200, rate: 26, total: 130 },
  glasses: [G(480, 680)],
  // poly, top at y = 400 (see the Long Shelf note above)
  stage: [FLOOR, { kind: 'teal', poly: [[650, 400], [650, 310], [990, 310], [990, 400]] }],
  balls: [BALL(160)],
};

module.exports = { G, BALL, FLOOR, trap, THE_PLATEAU, THE_VALLEY,
  THE_PRISM, THE_CLIFF, THE_SPIRE, THE_TENT, THE_LONG_SHELF, THE_OVERHANG };
