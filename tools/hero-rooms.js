/* ==========================================================================
   tools/hero-rooms.js — the hero set: one verb per room.

   Written after tearing down nine levels of the reference game (see
   docs/COMPETITOR-GRAMMAR.md). The rule this file follows is the one our old
   seventy rooms broke: the tap is top-centre, the water falls, and the puzzle
   is the CUP and the structure around it — not the shape of the slide.

   Every room names the verb it teaches (`verb`) and the shape its answer is
   meant to be (`intent`). `intent` is not decoration: tools/solve-hero.js tries
   that family first, and tools/hero-audit.js fails the room if the proved line
   does not actually rest on the scenery — a room whose blocks are not
   load-bearing is a room that solved itself.

   Verbs: support · split · span · carry · funnel · route · latch · cascade ·
   arch · overhang.
   ========================================================================== */
'use strict';

const S = [
  {
    id: 1, name: 'The Pit', verb: 'support', intent: 'ledge',
    tip: 'The cup hangs over a hole. Draw it a floor before you draw it water.',
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 430, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [{ x: 240, y: 690, w: 480, h: 20 }, { x: 1040, y: 690, w: 480, h: 20 }],
    crates: [{ x: 520, y: 560, w: 120, h: 60 }, { x: 760, y: 560, w: 120, h: 60 }],
  },
  {
    id: 2, name: 'Sharing', verb: 'split', intent: 'tent',
    tip: 'One stream, two cups. One stroke has to serve both.',
    faucet: { x: 640, y: 170, rate: 30, total: 140 },
    glasses: [
      { x: 500, y: 631, w: 120, h: 118, need: 0.35 },
      { x: 780, y: 631, w: 120, h: 118, need: 0.35 },
    ],
    stage: [{ x: 640, y: 700, w: 960, h: 20 }, { x: 640, y: 615, w: 60, h: 150 }],
  },
  {
    id: 3, name: 'Two Heights', verb: 'span', intent: 'ledge',
    tip: 'The blocks are not the same height. A shelf across them will not be level.',
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 430, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [{ x: 240, y: 690, w: 480, h: 20 }, { x: 1040, y: 690, w: 480, h: 20 }],
    crates: [{ x: 470, y: 610, w: 120, h: 100 }, { x: 810, y: 645, w: 120, h: 130 }],
  },
  {
    id: 4, name: 'Twin Taps', verb: 'funnel', intent: 'beam',
    tip: 'Two taps, one cup, and neither of them aims at it.',
    faucets: [{ x: 470, y: 170, rate: 24, total: 42 }, { x: 810, y: 170, rate: 24, total: 42 }],
    glasses: [{ x: 640, y: 620, w: 104, h: 112, need: 0.55 }],
    stage: [{ x: 640, y: 690, w: 600, h: 20 }],
    crates: [{ x: 420, y: 520, w: 100, h: 60 }, { x: 860, y: 520, w: 100, h: 60 }],
  },
  {
    id: 5, name: 'The Shelf', verb: 'route', intent: 'chute',
    tip: 'The shelf under the tap steals the stream. Bend it back to the cup.',
    faucet: { x: 640, y: 170, rate: 28, total: 130 },
    glasses: [{ x: 430, y: 620, w: 108, h: 118, need: 0.45 }],
    stage: [
      { x: 430, y: 690, w: 300, h: 20 },
      { x: 720, y: 400, w: 260, h: 16 },
    ],
    crates: [{ x: 300, y: 560, w: 90, h: 60 }],
  },
  {
    id: 6, name: 'The Hook', verb: 'latch', intent: 'ledge',
    tip: 'Nothing under the cup. Something beside it, and a long way to reach.',
    faucet: { x: 520, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 600, y: 470, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
      { x: 240, y: 700, w: 480, h: 20 },
      { x: 1040, y: 700, w: 480, h: 20 },
      { x: 880, y: 560, w: 200, h: 16 },
    ],
    crates: [{ x: 300, y: 640, w: 120, h: 100 }],
  },
  {
    id: 7, name: 'Cascade', verb: 'cascade', intent: 'beam',
    tip: 'The top cup fills first, then it overflows. The bottom cup is waiting for that.',
    faucet: { x: 600, y: 170, rate: 30, total: 160 },
    glasses: [
      { x: 600, y: 470, w: 100, h: 112, need: 0.3 },
      { x: 810, y: 620, w: 104, h: 112, need: 0.3 },
    ],
    stage: [
      { x: 600, y: 560, w: 120, h: 60 },
      { x: 810, y: 690, w: 300, h: 20 },
    ],
  },
  {
    id: 8, name: 'Under The Ledge', verb: 'overhang', intent: 'chute',
    tip: 'The cup is under the shelf, not beside it. The stream has to come in low.',
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 780, y: 631, w: 108, h: 118, need: 0.45 }],
    stage: [
      { x: 780, y: 700, w: 500, h: 20 },
      { x: 640, y: 460, w: 300, h: 18 },
      { x: 420, y: 560, w: 120, h: 20 },
    ],
    crates: [{ x: 460, y: 500, w: 90, h: 60 }],
  },
];

module.exports = S;
