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
    answer: [[570, 497], [730, 497]],
    tip: 'The cup hangs over a hole. Draw it a floor before you draw it water.',
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 430, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [{ x: 240, y: 690, w: 480, h: 20 }, { x: 1040, y: 690, w: 480, h: 20 }],
    crates: [{ x: 520, y: 560, w: 120, h: 60 }, { x: 760, y: 560, w: 120, h: 60 }],
  },
  {
    id: 2, name: 'Sharing', verb: 'split', intent: 'tent',
    answer: [[500, 564], [640, 532], [732, 556]],
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
    answer: [[510, 497], [780, 497]],
    tip: 'The blocks are not the same height. A shelf across them will not be level.',
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 430, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [{ x: 240, y: 690, w: 480, h: 20 }, { x: 1040, y: 690, w: 480, h: 20 }],
    crates: [{ x: 470, y: 610, w: 120, h: 100 }, { x: 810, y: 645, w: 120, h: 130 }],
  },
  {
    id: 4, name: 'Twin Taps', verb: 'funnel', intent: 'beam',
    answer: [[802, 474], [692, 556]],
    tip: 'Two taps, one cup, and neither of them aims at it.',
    faucets: [{ x: 470, y: 170, rate: 24, total: 42 }, { x: 810, y: 170, rate: 24, total: 42 }],
    glasses: [{ x: 640, y: 620, w: 104, h: 112, need: 0.55 }],
    stage: [{ x: 640, y: 690, w: 600, h: 20 }],
    crates: [{ x: 420, y: 520, w: 100, h: 60 }, { x: 860, y: 520, w: 100, h: 60 }],
  },
  {
    id: 5, name: 'The Shelf', verb: 'route', intent: 'chute',
    answer: [[605.6, 384], [690, 344], [798.4, 368]],
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
    answer: [[280, 537], [940, 537]],
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
    answer: [[652.8, 522], [766, 548]],
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
    answer: [[982, 674], [873.5, 553], [807, 564]],
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
  // ---------------------------------------------------------------- 16-40
  // The ball rooms. Every one of them: a ball is on its way into the glass
  // before a single drop falls, and the ink has to stop it without stealing
  // the pour. `answers` is a list of strokes where the room needs two hands.

  // ------------------------------------------------------- 9-15 water rooms
  // New water rooms on assets the first eight never used: a hot pad that eats
  // the pour, a narrow mouth, a shade over the cup, walls in the way.
  {
    id: 9, name: "The Hot Floor", verb: undefined,
    answer: [[470,500],[700,470],[820,540]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 860, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 640, y: 560, w: 60, h: 20, kind: 'wood' },
    ],
    crates: [{ x: 470, y: 600, w: 100, h: 180, kind: 'wood' }],
    hots: [{ x: 640, y: 676, w: 220, h: 22 }],
  },
  {
    id: 10, name: "Narrow Neck", verb: undefined,
    answer: [[540,488],[670,548]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 90, h: 118, need: 0.45 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
    ],
    crates: [{ x: 520, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 11, name: "The Shade", verb: undefined,
    answer: [[472,486],[812,552]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 820, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 820, y: 470, w: 260, h: 18, kind: 'wood' },
      { x: 960, y: 600, w: 16, h: 180, kind: 'wood' },
    ],
    crates: [{ x: 520, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 12, name: "Mirror Wall", verb: undefined,
    answer: [[920,508],[460,548]],
    faucet: { x: 820, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 460, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 620, y: 620, w: 22, h: 150, kind: 'wood' },
    ],
    crates: [{ x: 920, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 13, name: "Two Taps", verb: undefined,
    answer: [[420,508],[650,548]],
    faucets: [{ x: 460, y: 170, rate: 22, total: 70 }, { x: 900, y: 170, rate: 22, total: 70 }],
    glasses: [{ x: 680, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
    ],
    crates: [{ x: 420, y: 600, w: 100, h: 180, kind: 'wood' }, { x: 900, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 14, name: "The Low Wall", verb: undefined,
    answer: [[400,508],[830,548]],
    faucet: { x: 500, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 860, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 700, y: 620, w: 22, h: 150, kind: 'wood' },
    ],
    crates: [{ x: 400, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 15, name: "Deep Sill", verb: undefined,
    answer: [[440,508],[790,548]],
    faucet: { x: 520, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 820, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 700, y: 544, w: 240, h: 18, kind: 'wood' },
    ],
    crates: [{ x: 440, y: 600, w: 100, h: 180, kind: 'wood' }],
  },

  // ------------------------------------------------------- 16-40 ball rooms
  // Every one starts with a ball already on its way into the glass. The stop is
  // always a stroke that RESTS on the room — a bar standing on the chute, a
  // brace off a crate, a V, a trough, or a line hung from a push-pin.
  {
    id: 16, name: "First Blood", verb: "CH",
    answer: [[566,462.6],[566,372.6]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 523, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 518, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 17, name: "The Brace", verb: "BR",
    answer: [[278,536.8],[378,461.1]],
    faucet: { x: 480, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 480, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 303, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    crates: [{ x: 278, y: 605, w: 100, h: 190, kind: 'wood' }],
    balls: [{ x: 298, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 18, name: "The Wedge", verb: "VG",
    answer: [[740,462.6],[766,392.6],[792,462.6]],
    faucet: { x: 900, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 723, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 718, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 19, name: "Steep Gate", verb: "CH",
    answer: [[806,452.3],[806,362.3]],
    faucet: { x: 940, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 940, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 795.3, y: 458.9, w: 240, h: 16, angle: 0.35, kind: 'teal' },
    ],
    balls: [{ x: 758, y: 376.7, r: 26, kind: 'heavy' }],
  },
  {
    id: 20, name: "Hooked", verb: "PH",
    answer: [[646,344.6],[646,460.6]],
    faucet: { x: 780, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 780, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 603, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    pins: [{ x: 646, y: 344.6, r: 11 }],
    balls: [{ x: 598, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 21, name: "The Ladle", verb: "LD",
    answer: [[396,442.8],[396,398.8],[456,420],[456,464]],
    faucet: { x: 560, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 414.9, y: 460, w: 240, h: 16, angle: 0.34, kind: 'teal' },
    ],
    balls: [{ x: 378, y: 378.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 22, name: "Straight Face", verb: "BR",
    answer: [[438,536.8],[538,461.1]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 463, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    crates: [{ x: 438, y: 605, w: 100, h: 190, kind: 'wood' }],
    balls: [{ x: 458, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 23, name: "High Ball", verb: "VG",
    answer: [[700,397.1],[726,327.1],[752,397.1]],
    faucet: { x: 860, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 860, y: 560, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 684.7, y: 394.7, w: 300, h: 16, angle: 0.3, kind: 'teal' },
      { x: 860, y: 653, w: 180, h: 70, kind: 'wood' },
    ],
    balls: [{ x: 678, y: 324.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 24, name: "Short Drop", verb: "LD",
    answer: [[238,438.2],[238,394.2],[298,414.7],[298,458.7]],
    faucet: { x: 420, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 420, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 274.5, y: 461.1, w: 240, h: 16, angle: 0.33, kind: 'teal' },
    ],
    balls: [{ x: 238, y: 380.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 25, name: "Pin Trick", verb: "PH",
    answer: [[426,303.6],[426,419.6]],
    faucet: { x: 560, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 580, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 383, y: 420.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
      { x: 560, y: 673, w: 180, h: 70, kind: 'wood' },
    ],
    pins: [{ x: 426, y: 303.6, r: 11 }],
    balls: [{ x: 378, y: 350.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 26, name: "Twin Glasses", verb: "CH+split",
    answers: [[[480, 560], [610, 488], [740, 560]], [[326, 462.6], [326, 372.6]]],
    faucet: { x: 610, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 460, y: 621, w: 108, h: 118, need: 0.5 }, { x: 760, y: 621, w: 104, h: 118, need: 0.35 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 283, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    crates: [{ x: 258, y: 605, w: 100, h: 190, kind: 'wood' }],
    balls: [{ x: 278, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 27, name: "Spout Left", verb: "CH+spout",
    answers: [[[432,486],[772,550]],[[914,462.6],[914,372.6]]],
    faucet: { x: 480, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 780, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 957, y: 461.4, w: 300, h: 16, angle: -0.26, kind: 'teal' },
    ],
    crates: [{ x: 480, y: 590, w: 100, h: 180, kind: 'wood' }],
    balls: [{ x: 962, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 28, name: "Spout Right", verb: "CH+spout",
    answers: [[[848, 486], [508, 550]], [[366, 462.6], [366, 372.6]]],
    faucet: { x: 800, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 500, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 323, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    crates: [{ x: 800, y: 590, w: 100, h: 180, kind: 'wood' }],
    balls: [{ x: 318, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 29, name: "Spout Wire", verb: "VG+spout",
    answers: [[[1008,486],[668,509]],[[500,421.6],[526,351.6],[552,421.6]]],
    faucet: { x: 960, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 660, y: 580, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 483, y: 420.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
      { x: 660, y: 673, w: 180, h: 70, kind: 'wood' },
    ],
    crates: [{ x: 960, y: 590, w: 100, h: 180, kind: 'wood' }],
    balls: [{ x: 478, y: 350.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 30, name: "Two Mouths", verb: "VG+split",
    answers: [[[640,560],[770,488],[900,560]],[[460,462.6],[486,392.6],[512,462.6]]],
    faucet: { x: 770, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 620, y: 621, w: 108, h: 118, need: 0.5 }, { x: 920, y: 621, w: 104, h: 118, need: 0.35 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 443, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 438, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 31, name: "Long Chute", verb: "CH",
    answer: [[506,467],[506,377]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 422.6, y: 458.5, w: 380, h: 16, angle: 0.22, kind: 'teal' },
    ],
    balls: [{ x: 458, y: 398.3, r: 26, kind: 'heavy' }],
  },
  {
    id: 32, name: "The Plinth", verb: "PH",
    answer: [[586, 244.2], [586, 360.2]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 500, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 533, y: 358.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
      { x: 700, y: 601, w: 190, h: 84, kind: 'wood' },
    ],
    pins: [{ x: 586, y: 244.2, r: 11 }],
    balls: [{ x: 528, y: 288.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 33, name: "Hanging Low", verb: "BR",
    answer: [[258,475.8],[358,400.1]],
    faucet: { x: 460, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 460, y: 560, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 283, y: 400.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    crates: [{ x: 258, y: 570.8, w: 100, h: 190, kind: 'wood' }],
    balls: [{ x: 278, y: 330.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 34, name: "Hanging Ladle", verb: "LD",
    answer: [[376,364.8],[376,320.8],[436,340.7],[436,384.7]],
    faucet: { x: 540, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 540, y: 540, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 365.6, y: 371.8, w: 300, h: 16, angle: 0.32, kind: 'teal' },
    ],
    balls: [{ x: 358, y: 300.9, r: 26, kind: 'heavy' }],
  },
  {
    id: 35, name: "Hanging Pin", verb: "PH",
    answer: [[696, 281.6], [696, 397.6]],
    faucet: { x: 820, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 820, y: 540, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 653, y: 398.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    pins: [{ x: 696, y: 281.6, r: 11 }],
    balls: [{ x: 648, y: 328.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 36, name: "Trough Run", verb: "LD",
    answer: [[596,454.6],[596,410.6],[656,426.6],[656,470.6]],
    faucet: { x: 760, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 760, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 563.7, y: 456.3, w: 340, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 578, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 37, name: "The Rim", verb: "CH",
    answer: [[874,462.6],[874,372.6]],
    faucet: { x: 1000, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 1000, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 823.8, y: 458.5, w: 300, h: 16, angle: 0.28, kind: 'teal' },
    ],
    balls: [{ x: 818, y: 388.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 38, name: "Left Wedge", verb: "VG",
    answer: [[460,458.1],[434,388.1],[408,458.1]],
    faucet: { x: 300, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 300, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 475.3, y: 455.7, w: 300, h: 16, angle: -0.3, kind: 'teal' },
    ],
    balls: [{ x: 482, y: 385.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 39, name: "Hanging Rim", verb: "CH",
    answer: [[786,362.8],[786,262.8]],
    faucet: { x: 900, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 900, y: 500, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 731, y: 358.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 726, y: 288.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 40, name: "Last Light", verb: "LD",
    answer: [[436,430.7],[436,386.7],[496,404],[496,448]],
    faucet: { x: 600, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 600, y: 600, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
      { x: 423.8, y: 437.5, w: 300, h: 16, angle: 0.28, kind: 'teal' },
      { x: 600, y: 680.0, w: 180, h: 40.0, kind: 'wood' },
    ],
    balls: [{ x: 418, y: 367.5, r: 26, kind: 'heavy' }],
  },
];

module.exports = S;
