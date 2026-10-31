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
    id: 9, name: "The Hot Floor", verb: "evaporate",
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
    id: 10, name: "Narrow Neck", verb: "funnel",
    answer: [[540,488],[670,548]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 90, h: 118, need: 0.45 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
    ],
    crates: [{ x: 520, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 11, name: "The Shade", verb: "shade",
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
    id: 12, name: "Mirror Wall", verb: "mirror",
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
    id: 13, name: "Two Taps", verb: "merge",
    answer: [[420,508],[650,548]],
    faucets: [{ x: 460, y: 170, rate: 22, total: 70 }, { x: 900, y: 170, rate: 22, total: 70 }],
    glasses: [{ x: 680, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
    ],
    crates: [{ x: 420, y: 600, w: 100, h: 180, kind: 'wood' }, { x: 900, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 14, name: "The Low Wall", verb: "over",
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
    id: 15, name: "Deep Sill", verb: "catch",
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

  // ------------------------------------------------------------ 16-40 ball rooms
  // Built so no two rooms ask for the same line: the stop rotates through a bar on
  // the chute, a V, a trough and a diagonal, and the writer rejects any room whose
  // stroke matches one already in the set (tools/hero-check.js re-proves that).
  {
    id: 16, name: "First Blood", verb: "chock",
    answer: [[544,456.7],[544,386.7]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 523, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 518, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 17, name: "The Long Run", verb: "wedge",
    answer: [[298,451.3],[324,381.3],[350,451.3]],
    faucet: { x: 480, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 480, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 285.6, y: 449.8, w: 340, h: 16, angle: 0.3, kind: 'teal' },
    ],
    balls: [{ x: 298, y: 385.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 18, name: "The Wedge", verb: "ladle",
    answer: [[728,465.2],[728,421.2],[788,421.2],[788,465.2]],
    faucet: { x: 900, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 731.4, y: 469.4, w: 280, h: 16, angle: 0.22, kind: 'teal' },
    ],
    balls: [{ x: 718, y: 398.3, r: 26, kind: 'heavy' }],
  },
  {
    id: 19, name: "Steep Gate", verb: "brace",
    answer: [[744,444.2],[794,374.2]],
    faucet: { x: 940, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 940, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 795.3, y: 458.9, w: 240, h: 16, angle: 0.35, kind: 'teal' },
    ],
    balls: [{ x: 758, y: 376.7, r: 26, kind: 'heavy' }],
  },
  {
    id: 20, name: "Off The Sill", verb: "sill",
    answer: [[624,395.7],[624,325.7]],
    faucet: { x: 780, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 780, y: 560, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 603, y: 400.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 598, y: 330.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 21, name: "The Ladle", verb: "cradle",
    answer: [[378, 436.4], [404, 336.4], [430, 454.8]],
    faucet: { x: 560, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 414.9, y: 460, w: 240, h: 16, angle: 0.34, kind: 'teal' },
    ],
    balls: [{ x: 378, y: 378.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 22, name: "Straight Face", verb: "trough",
    answer: [[468,462.8],[468,418.8],[528,418.8],[528,462.8]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 433.2, y: 457.2, w: 360, h: 16, angle: 0.24, kind: 'teal' },
    ],
    balls: [{ x: 458, y: 395.1, r: 26, kind: 'heavy' }],
  },
  {
    id: 23, name: "High Ball", verb: "drop",
    answer: [[664,390.3],[714,320.3]],
    faucet: { x: 860, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 860, y: 560, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 684.7, y: 394.7, w: 300, h: 16, angle: 0.3, kind: 'teal' },
    ],
    balls: [{ x: 678, y: 324.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 24, name: "Short Drop", verb: "beam",
    answer: [[264,447.1],[264,377.1]],
    faucet: { x: 420, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 420, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 274.5, y: 461.1, w: 240, h: 16, angle: 0.33, kind: 'teal' },
    ],
    balls: [{ x: 238, y: 380.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 25, name: "Pin Trick", verb: "vault",
    answer: [[378,415.7],[404,345.7],[430,415.7]],
    faucet: { x: 560, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 580, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 383, y: 420.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
    ],
    balls: [{ x: 378, y: 350.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 26, name: "Twin Glasses", verb: "split",
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
    id: 27, name: "Spout Left", verb: "spout",
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
    id: 28, name: "Spout Right", verb: "carry",
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
    id: 29, name: "Spout Wire", verb: "sling",
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
    id: 30, name: "Two Mouths", verb: "divide",
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
    id: 31, name: "Long Chute", verb: "longrun",
    answer: [[484,463.4],[484,363.4]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 412.4, y: 458.3, w: 400, h: 16, angle: 0.21, kind: 'teal' },
    ],
    balls: [{ x: 458, y: 399.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 32, name: "The Plinth", verb: "plinth",
    answer: [[518,333],[544,263],[570,333]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 500, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 523.8, y: 337.5, w: 300, h: 16, angle: 0.28, kind: 'teal' },
    ],
    balls: [{ x: 518, y: 267.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 33, name: "Hanging Low", verb: "hanglow",
    answer: [[274,388.9],[274,344.9],[334,344.9],[334,388.9]],
    faucet: { x: 460, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 460, y: 560, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 294.7, y: 396.3, w: 280, h: 16, angle: 0.31, kind: 'teal' },
    ],
    balls: [{ x: 278, y: 322.6, r: 26, kind: 'heavy' }],
  },
  {
    id: 34, name: "Left Wedge", verb: "flank",
    answer: [[496,451.3],[446,381.3]],
    faucet: { x: 300, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 300, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 475.3, y: 455.7, w: 300, h: 16, angle: -0.3, kind: 'teal' },
    ],
    balls: [{ x: 482, y: 385.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 35, name: "Hanging Pin", verb: "hangpin",
    answer: [[664,371.6],[664,301.6]],
    faucet: { x: 820, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 820, y: 540, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 644.3, y: 376.1, w: 300, h: 16, angle: 0.29, kind: 'teal' },
    ],
    balls: [{ x: 638, y: 305.9, r: 26, kind: 'heavy' }],
  },
  {
    id: 36, name: "Trough Run", verb: "runout",
    answer: [[578,458.1],[604,388.1],[630,458.1]],
    faucet: { x: 760, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 760, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 553.6, y: 455.5, w: 360, h: 16, angle: 0.25, kind: 'teal' },
    ],
    balls: [{ x: 578, y: 393.4, r: 26, kind: 'heavy' }],
  },
  {
    id: 37, name: "The Rim", verb: "rim",
    answer: [[828,458],[828,414],[888,414],[888,458]],
    faucet: { x: 1000, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 1000, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 823.8, y: 458.5, w: 300, h: 16, angle: 0.28, kind: 'teal' },
    ],
    balls: [{ x: 818, y: 388.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 38, name: "Far Wedge", verb: "far",
    answer: [[436,449.9],[386,349.9]],
    faucet: { x: 240, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 240, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 405.3, y: 457.3, w: 280, h: 16, angle: -0.31, kind: 'teal' },
    ],
    balls: [{ x: 422, y: 383.6, r: 26, kind: 'heavy' }],
  },
  {
    id: 39, name: "Hanging Rim", verb: "hangrim",
    answer: [[744,374.4],[744,274.4]],
    faucet: { x: 900, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 900, y: 540, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 713.8, y: 376.3, w: 320, h: 16, angle: 0.27, kind: 'teal' },
    ],
    balls: [{ x: 718, y: 309.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 40, name: "Last Light", verb: "finish",
    answer: [[418,433],[444,363],[470,433]],
    faucet: { x: 600, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 600, y: 600, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 423.8, y: 437.5, w: 300, h: 16, angle: 0.28, kind: 'teal' },
      { x: 600, y: 693, w: 180, h: 70, kind: 'wood' },
    ],
    balls: [{ x: 418, y: 367.5, r: 26, kind: 'heavy' }],
  },
];

module.exports = S;
