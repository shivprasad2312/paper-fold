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
  id: 102, slot: 35, name: 'The Valley', verb: 'settle', intent: 'chute',
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

module.exports = { G, BALL, FLOOR, trap, THE_PLATEAU, THE_VALLEY };
