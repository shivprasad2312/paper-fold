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
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
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
  faucet: { x: 420, y: 200, rate: 26, total: 140 },
  glasses: [G(660, 600)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[290, 690], [290, 450], [550, 450], [550, 690]] },
    { kind: 'teal', poly: [[770, 690], [770, 450], [1030, 450], [1030, 690]] },
    { x: 660, y: 620, w: 260, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
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
  faucet: { x: 700, y: 200, rate: 26, total: 140 },
  glasses: [G(1010, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[520, 690], [860, 690], [690, 470]] },
    { x: 1010, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 32 THE CLIFF (spill). A big trapezoid whose flat top ends at a near-vertical
// face: the water walks to the edge and drops. Proved: idle 0.00, 0.50 / 350 ink.
const THE_CLIFF = {
  id: 104, slot: 32, name: 'The Cliff', verb: 'spill', intent: 'chute',
  answer: [[705, 422], [860, 372], [1014, 478]],
  tip: 'It runs to the edge and falls. Catch it as it goes over.',
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 140 },
  glasses: [G(1010, 650)],
  stage: [FLOOR,
    { kind: 'stone', poly: [[480, 430], [780, 430], [820, 690], [560, 690]] },
    { x: 1010, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 33 THE SPIRE (divert). A tall narrow spike between the pour and the cup: it
// splits the stream and throws it the wrong way, so the answer has to go over
// the top. (Replaced "Two Steps", which never solved.) Proved: 0.50 / 277 ink.
const THE_SPIRE = {
  id: 105, slot: 33, name: 'The Spire', verb: 'divert', intent: 'chute',
  answer: [[600, 480], [920, 483]],
  tip: 'The spire splits it. Go over the top and down the far side.',
  delay: 0.4,
  faucet: { x: 620, y: 200, rate: 26, total: 140 },
  glasses: [G(940, 650)],
  stage: [FLOOR,
    { kind: 'stone', poly: [[620, 690], [700, 690], [660, 430]] },
    { x: 940, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 34 THE TENT (settle). Two prisms making a valley; the cup stands on a raised
// pad inside it, so only a delivered stream can fill it.
// Proved: idle 0.00, 0.50 / 237 ink.
const THE_TENT = {
  id: 106, slot: 34, name: 'The Tent', verb: 'settle', intent: 'chute',
  answer: [[413, 487], [650, 476]],
  tip: 'Two roofs and a valley. The cup sits in the middle of it.',
  delay: 0.4,
  faucet: { x: 430, y: 200, rate: 26, total: 140 },
  glasses: [G(690, 610)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[300, 690], [600, 690], [450, 430]] },
    { kind: 'teal', poly: [[1080, 690], [780, 690], [930, 430]] },
    { x: 690, y: 629, w: 220, h: 36, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 35 THE LONG SHELF (carry). One wide, thick slab high up and nothing else: the
// whole lower half of the screen is open air. Proved: idle 0.00, 0.50 / 355 ink.
const THE_LONG_SHELF = {
  id: 107, slot: 35, name: 'The Long Shelf', verb: 'carry', intent: 'chute',
  answer: [[635, 412], [778, 362], [920, 508]],
  tip: 'One shelf, a long drop. Carry it out and let it fall.',
  delay: 0.4,
  faucet: { x: 620, y: 200, rate: 26, total: 140 },
  glasses: [G(960, 680)],
  // poly, not a rect platform: a rect is centred on (x,y), this mass has its
  // TOP at y and its base at y+h. Transcribing it as a rect moved it 32 px and
  // the proved answer stopped working.
  stage: [FLOOR, { kind: 'teal', poly: [[410, 420], [410, 356], [710, 356], [710, 420]] }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 36 THE OVERHANG (shelter). A big block hanging over open space; the cup sits
// well out from under it, so the water has to be carried across the drop.
// Proved: idle 0.00, 0.50 / 461 ink — the room the block actually earns.
const THE_OVERHANG = {
  id: 108, slot: 36, name: 'The Overhang', verb: 'shelter', intent: 'chute',
  answer: [[905, 302], [490, 502]],
  tip: 'The block sheds it away from the cup. Carry it across.',
  delay: 0.4,
  faucet: { x: 900, y: 200, rate: 26, total: 140 },
  glasses: [G(480, 680)],
  // poly, top at y = 400 (see the Long Shelf note above)
  stage: [FLOOR, { kind: 'teal', poly: [[650, 400], [650, 310], [990, 310], [990, 400]] }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 38 THE BUTTRESS (console). A right triangle propped against nothing — its long
// face is the slope the pour lands on. Wave 3 kept the mass and moved the cup
// out and below its lip, which is the only arrangement a mass pays for.
// Proved: idle 0.00, answer 0.50 / 408 ink.
const THE_BUTTRESS = {
  id: 109, slot: 38, name: 'The Buttress', verb: 'console', intent: 'chute',
  answer: [[522, 500], [930, 512]],
  tip: 'It lands on the slope and runs off the end. Take it from there.',
  delay: 0.4,
  faucet: { x: 510, y: 200, rate: 26, total: 140 },
  glasses: [G(960, 650)],
  stage: [FLOOR, { kind: 'stone', poly: [[420, 690], [420, 430], [760, 690]] },
    { x: 960, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 41 THE KEEL (true). An inverted trapezoid — wide shoulders, narrow footing —
// so the pour splits and both lips shed away from the cup. The stroke has to
// come back up over the shoulder, which is why it is three points, not two.
// Proved: idle 0.00, answer 0.50 / 448 ink.
const THE_KEEL = {
  id: 110, slot: 16, promoted: true, name: 'The Keel', verb: 'true', intent: 'bounce',
  answer: [[640, 672], [810, 412], [980, 462]],
  tip: 'Wide at the top, narrow at the base: it sheds both ways.',
  delay: 0.4,
  faucet: { x: 640, y: 200, rate: 26, total: 140 },
  glasses: [G(1010, 650)],
  stage: [FLOOR, { kind: 'stone', poly: [[520, 380], [880, 380], [790, 690], [610, 690]] },
    { x: 1010, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 43 THE STACK (ladder). Two shelves at different heights, overlapping in plan:
// the pour lands on the high one, falls past the near edge, is caught on the
// lower one and carried out. Two masses, one continuous route.
// Proved: idle 0.00, answer 0.50 / 368 ink.
const THE_STACK = {
  id: 111, slot: 23, promoted: true, name: 'The Stack', verb: 'ladder', intent: 'chute',
  answer: [[620, 532], [800, 482], [980, 546]],
  tip: 'High shelf to low shelf to cup. Do not skip a step.',
  delay: 0.4,
  faucet: { x: 620, y: 200, rate: 26, total: 140 },
  glasses: [G(1020, 680)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[420, 400], [420, 320], [700, 320], [700, 400]] },
    { kind: 'teal', poly: [[620, 560], [620, 480], [860, 480], [860, 560]] }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 16 THE TOWER — mass grammar, single shed face.
// Proved: idle 0.00, answer 0.50 / 449 ink.
const THE_TOWER = {
  id: 112, slot: 0, retired: true, name: "The Tower", verb: 'reach', intent: 'chute',
  answer: [[620, 322], [776, 272], [932, 511]],
  tip: "It lands on the shoulder and sheds off the corner.",
  delay: 0.4,
  faucet: { x: 620, y: 200, rate: 26, total: 140 },
  glasses: [G(960, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[560, 690],[560, 330],[660, 330],[720, 420],[720, 690]] },
    { x: 960, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 17 THE ANVIL — mass grammar, single shed face.
// Proved: idle 0.00, answer 0.50 / 437 ink.
const THE_ANVIL = {
  id: 113, slot: 17, name: "The Anvil", verb: 'hedge', intent: 'bounce',
  answer: [[652, 352], [816, 302], [980, 511]],
  tip: "Read the hexagon: one shoulder faces the cup.",
  delay: 0.4,
  faucet: { x: 660, y: 200, rate: 26, total: 140 },
  glasses: [G(980, 650)],
  stage: [FLOOR,
    { kind: 'metal', poly: [[500, 690],[480, 430],[580, 360],[700, 360],[800, 430],[780, 690]] },
    { x: 980, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 18 THE WEDGE — mass grammar, single shed face.
// Proved: idle 0.00, answer 0.50 / 266 ink.
const THE_WEDGE = {
  id: 114, slot: 18, name: "The Wedge", verb: 'mirror', intent: 'chute',
  answer: [[727, 494], [392, 539]],
  tip: "The slope runs the other way here. Use it.",
  delay: 0.4,
  faucet: { x: 760, y: 200, rate: 26, total: 140 },
  glasses: [G(420, 650)],
  stage: [FLOOR,
    { kind: 'wood', poly: [[860, 690],[860, 400],[480, 690]] },
    { x: 420, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 20 THE PILLAR — mass grammar, single shed face.
// Proved: idle 0.00, answer 0.50 / 282 ink.
const THE_PILLAR = {
  id: 116, slot: 20, name: "The Pillar", verb: 'cap', intent: 'chute',
  answer: [[644, 372], [940, 567]],
  tip: "A narrow cap, a narrow shed. Catch it at the lip.",
  delay: 0.4,
  faucet: { x: 645, y: 200, rate: 26, total: 140 },
  glasses: [G(940, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[620, 690],[620, 380],[660, 380],[700, 470],[700, 690]] },
    { x: 940, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 23 THE TOTEM — mass grammar, single shed face.
// Proved: idle 0.00, answer 0.50 / 426 ink.
const THE_TOTEM = {
  id: 119, slot: 0, retired: true, name: "The Totem", verb: 'stack', intent: 'bounce',
  answer: [[628, 386], [1060, 539]],
  tip: "Off the cap, onto the plinth, then across.",
  delay: 0.4,
  faucet: { x: 630, y: 200, rate: 26, total: 140 },
  glasses: [G(1060, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[600, 690],[600, 380],[680, 420],[680, 690]] },
    { kind: 'teal', poly: [[460, 690],[460, 620],[820, 620],[820, 690]] },
    { x: 1060, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 24 THE CRATE WALL — mass grammar, single shed face.
// Proved: idle 0.00, answer 0.50 / 375 ink.
const THE_CRATE_WALL = {
  id: 120, slot: 24, name: "The Crate Wall", verb: 'shelter', intent: 'bounce',
  answer: [[696, 409], [848, 359], [1000, 511]],
  tip: "The crate is not the answer. The slab is.",
  delay: 0.4,
  faucet: { x: 690, y: 200, rate: 26, total: 140 },
  glasses: [G(1000, 650)],
  stage: [FLOOR,
    { kind: 'wood', poly: [[600, 690],[600, 400],[760, 428],[760, 690]] },
    { x: 1000, y: 670, w: 200, h: 40, kind: 'teal' }],
    crates: [{ x: 880, y: 624, w: 96, h: 96, kind: 'wood' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};


// 21 THE CHUTE — mass grammar.
// Proved: idle 0.00, answer 0.50 / 397 ink.
const THE_CHUTE = {
  id: 117, slot: 21, name: "The Chute", verb: 'tilt', intent: 'chute',
  answer: [[587, 374], [438, 324],[288, 511]],
  tip: "A slab on the slant. Let it run downhill.",
  delay: 0.4,
  faucet: { x: 560, y: 200, rate: 26, total: 140 },
  glasses: [G(260, 650)],
  stage: [FLOOR,
    { kind: 'wood', poly: [[440, 470],[440, 410],[860, 330],[860, 390]] },
    { x: 260, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 1060, y: 640, r: 26, kind: 'heavy' }],
};

// 22 THE CHOCK — mass grammar.
// Proved: idle 0.00, answer 0.50 / 343 ink.
const THE_CHOCK = {
  id: 118, slot: 22, name: "The Chock", verb: 'trim', intent: 'chute',
  answer: [[664, 422], [807, 367], [950, 488]],
  tip: "One corner is cut. The cut is the exit.",
  delay: 0.4,
  faucet: { x: 660, y: 200, rate: 26, total: 165 },
  glasses: [G(980, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[520, 690],[520, 430],[680, 430],[780, 520],[780, 690]] },
    { x: 980, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 25 THE DOORSTEP — mass grammar.
// Proved: idle 0.00, answer 0.50 / 397 ink.
const THE_DOORSTEP = {
  id: 121, slot: 25, name: "The Doorstep", verb: 'step', intent: 'bounce',
  answer: [[711, 372], [326, 480]],
  tip: "Two heights, one pour. Step it down.",
  delay: 0.4,
  faucet: { x: 700, y: 200, rate: 26, total: 140 },
  glasses: [G(290, 650)],
  stage: [FLOOR,
    { kind: 'stone', poly: [[420, 690],[420, 480],[640, 480],[640, 690]] },
    { kind: 'stone', poly: [[620, 690],[620, 380],[860, 380],[860, 690]] },
    { x: 290, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 27 THE STUMP — mass grammar.
// Proved: idle 0.00, answer 0.50 / 217 ink.
const THE_STUMP = {
  id: 123, slot: 27, name: "The Stump", verb: 'tip', intent: 'chute',
  answer: [[768, 462], [990, 456]],
  tip: "Pour near the edge and the block gives it up.",
  delay: 0.4,
  faucet: { x: 780, y: 200, rate: 26, total: 140 },
  glasses: [G(1020, 650)],
  stage: [FLOOR,
    { kind: 'wood', poly: [[560, 690],[560, 470],[820, 470],[820, 690]] },
    { x: 1020, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 39 THE STEP — mass grammar.
// Proved: idle 0.00, answer 0.50 / 253 ink.
const THE_STEP = {
  id: 126, slot: 39, name: "The Step", verb: 'climb', intent: 'bounce',
  answer: [[758, 392], [990, 456]],
  tip: "Climb the step, then drop to the glass.",
  delay: 0.4,
  faucet: { x: 750, y: 200, rate: 26, total: 140 },
  glasses: [G(1020, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[400, 690],[400, 520],[620, 520],[620, 690]] },
    { kind: 'teal', poly: [[560, 690],[560, 400],[780, 400],[780, 690]] },
    { x: 1020, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 40 THE ISLAND — mass grammar.
// Proved: idle 0.00, answer 0.50 / 135 ink.
const THE_ISLAND = {
  id: 127, slot: 40, name: "The Island", verb: 'island', intent: 'chute',
  answer: [[815, 512], [1028, 539]],
  tip: "The block splits the pour. Both sides are yours.",
  delay: 0.4,
  faucet: { x: 820, y: 200, rate: 26, total: 140 },
  glasses: [G(1000, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[560, 690],[560, 520],[860, 520],[860, 690]] },
    { x: 1000, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 42 THE WALL — mass grammar.
// Proved: idle 0.00, answer 0.50 / 238 ink.
const THE_WALL = {
  id: 128, slot: 0, retired: true, name: "The Wall", verb: 'block', intent: 'chute',
  answer: [[721, 452], [952, 511]],
  tip: "A thin wall, a thin lip. Take it from the top.",
  delay: 0.4,
  faucet: { x: 720, y: 200, rate: 26, total: 140 },
  glasses: [G(980, 650)],
  stage: [FLOOR,
    { kind: 'teal', poly: [[700, 690],[700, 460],[760, 460],[760, 690]] },
    { x: 980, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};


// 19 THE LEDGE — mass grammar.
// Proved: idle 0.00, answer 0.50 / 200 ink.
const THE_LEDGE = {
  id: 115, slot: 19, name: "The Ledge", verb: 'edge', intent: 'chute',
  answer: [[848, 452], [1042, 509]],
  tip: "Pour at the edge and the block hands it over.",
  delay: 0.4,
  faucet: { x: 840, y: 200, rate: 26, total: 140 },
  glasses: [G(1070, 650)],
  stage: [FLOOR,
    { kind: 'stone', poly: [[560, 690],[560, 470],[880, 470],[880, 690]] },
    { x: 1070, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 26 THE BENCH — mass grammar.
// Proved: idle 0.00, answer 0.50 / 160 ink.
const THE_BENCH = {
  id: 122, slot: 26, name: "The Bench", verb: 'lean', intent: 'chute',
  answer: [[824, 462], [1048, 567]],
  tip: "The bench is wide. Work the near end.",
  delay: 0.4,
  faucet: { x: 820, y: 200, rate: 26, total: 140 },
  glasses: [G(1020, 650)],
  stage: [FLOOR,
    { kind: 'wood', poly: [[500, 690],[500, 470],[860, 470],[860, 690]] },
    { x: 1020, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};

// 28 THE BLUFF — mass grammar.
// Proved: idle 0.00, answer 0.50 / 320 ink.
const THE_BLUFF = {
  id: 124, slot: 28, name: "The Bluff", verb: 'shed', intent: 'chute',
  answer: [[792, 482], [412, 539]],
  tip: "It sheds away from the glass. Go and get it.",
  delay: 0.4,
  faucet: { x: 800, y: 200, rate: 26, total: 140 },
  glasses: [G(440, 650)],
  stage: [FLOOR,
    { kind: 'stone', poly: [[760, 690],[760, 490],[1080, 490],[1080, 690]] },
    { x: 440, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 320, r: 26, kind: 'heavy' }],
};

// 29 THE CAP — mass grammar.
// Proved: idle 0.00, answer 0.50 / 202 ink.
const THE_CAP = {
  id: 125, slot: 29, name: "The Cap", verb: 'shelter', intent: 'bounce',
  answer: [[800, 352], [1016, 462]],
  tip: "A cap on a stem. The cap is the high route.",
  delay: 0.4,
  faucet: { x: 800, y: 200, rate: 26, total: 140 },
  glasses: [G(1040, 650)],
  stage: [FLOOR,
    { kind: 'metal', poly: [[480, 420],[480, 360],[820, 360],[820, 420]] },
    { kind: 'metal', poly: [[600, 420],[600, 690],[700, 690],[700, 420]] },
    { x: 1040, y: 670, w: 200, h: 40, kind: 'teal' }],
  balls: [{ x: 160, y: 654, r: 26, kind: 'heavy' }],
};


module.exports = { G, BALL, FLOOR, trap, THE_PLATEAU, THE_VALLEY,
  THE_PRISM, THE_CLIFF, THE_SPIRE, THE_TENT, THE_LONG_SHELF, THE_OVERHANG,
  THE_BUTTRESS, THE_KEEL, THE_STACK,
  THE_TOWER, THE_ANVIL, THE_WEDGE, THE_PILLAR, THE_TOTEM, THE_CRATE_WALL,
  THE_CHUTE, THE_CHOCK, THE_DOORSTEP, THE_STUMP, THE_STEP, THE_ISLAND, THE_WALL,
  THE_LEDGE, THE_BENCH, THE_BLUFF, THE_CAP };
