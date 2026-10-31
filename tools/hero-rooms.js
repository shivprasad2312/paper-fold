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
  {
    id: 9, name: "The Chute", verb: "chock", intent: "bar",
    // one stroke: the chock
    answer: [[590,468.9720882021777],[590,378.9720882021777]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 523, y: 461.4, w: 300, h: 16, angle: 0.26, kind: 'teal' },
        { x: 384, y: 555, w: 26, h: 249, kind: 'wood' },
    ],
    crates: [{ x: 590, y: 640, w: 90, h: 80, kind: 'wood' }],
    balls: [{ x: 540, y: 397.7, r: 26, kind: 'heavy' }],
  },
  {
    id: 10, name: "Steep Drop", verb: "brake", intent: "bar",
    // one stroke: the chock
    answer: [[390, 471.7], [390, 361.7]],
    faucet: { x: 480, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 480, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[221.1, 421.4], [450.4, 492.3], [221.1, 487.4]], kind: 'wood' },
        { x: 225, y: 559, w: 26, h: 243, kind: 'wood' },
    ],
    balls: [{ x: 340, y: 398.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 11, name: "The Queue", verb: "queue", intent: "bar",
    // one stroke: the chock
    answer: [[693,466.515851019583],[693,376.515851019583]],
    faucet: { x: 820, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 820, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 632.6, y: 462, w: 320, h: 16, angle: 0.24, kind: 'teal' },
        { x: 483, y: 556, w: 26, h: 248, kind: 'wood' },
    ],
    balls: [{ x: 638, y: 395.1, r: 26, kind: 'heavy' }, { x: 575, y: 379.6, r: 26, kind: 'heavy' }],
  },
  {
    id: 12, name: "The Ladle", verb: "ladle", intent: "trough",
    // one stroke: the chock
    answer: [[485,463.4072491593668],[513,463.4072491593668],[513,389.4072491593668],[543,383.4072491593668]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[301.7, 406.9], [610.1, 492.3], [301.7, 472.9]], kind: 'wood' },
        { x: 306, y: 551, w: 26, h: 257, kind: 'wood' },
    ],
    balls: [{ x: 458, y: 390.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 13, name: "Spout And Chock", verb: "pour", intent: "chock",
    // two strokes: the spout, then the chock
    answers: [[[372,486],[710,552]],[[827,460.23904347478117],[827,370.23904347478117]]],
    faucet: { x: 450, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 875.3, y: 455.7, w: 300, h: 16, angle: -0.3, kind: 'teal' },
        { x: 1025, y: 550, w: 26, h: 261, kind: 'wood' },
    ],
    crates: [{ x: 420, y: 590, w: 100, h: 180, kind: 'wood' }],
    balls: [{ x: 882, y: 385.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 14, name: "Long Fall", verb: "eave", intent: "chock",
    // two strokes: the spout, then the chock
    answers: [[[372,486],[710,552]],[[827,466.515851019583],[827,376.515851019583]]],
    faucet: { x: 450, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 916.6, y: 454.8, w: 380, h: 16, angle: -0.24, kind: 'wood' },
        { x: 1107, y: 549, w: 26, h: 262, kind: 'wood' },
    ],
    crates: [{ x: 420, y: 590, w: 100, h: 180, kind: 'wood' }],
    balls: [{ x: 882, y: 395.1, r: 26, kind: 'heavy' }],
  },
  {
    id: 15, name: "High Cup", verb: "lift", intent: "chock",
    // one stroke: the chock
    answer: [[573,363.4497219928312],[573,273.4497219928312]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 520, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[380.1, 314.1], [670.0, 391.2], [380.1, 380.1]], kind: 'teal' },
        { x: 384, y: 505, w: 26, h: 350, kind: 'wood' },
    ],
    balls: [{ x: 518, y: 290.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 16, name: "The Pedestal", verb: "tower", intent: "chock",
    // one stroke: the chock
    answer: [[433,385.515851019583],[433,295.515851019583]],
    faucet: { x: 560, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 540, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 372.6, y: 381, w: 320, h: 16, angle: 0.24, kind: 'wood' },
        { x: 223, y: 515, w: 26, h: 329, kind: 'wood' },
        { x: 560, y: 606, w: 160, h: 14, kind: 'wood' },
    ],
    balls: [{ x: 378, y: 314.1, r: 26, kind: 'heavy' }],
  },
  {
    id: 17, name: "Right Bank", verb: "bank", intent: "chock",
    // one stroke: the chock
    answer: [[547,460.2390434747811],[547,370.2390434747811]],
    faucet: { x: 420, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 420, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 614.4, y: 449.8, w: 340, h: 16, angle: -0.3, kind: 'teal' },
        { x: 783, y: 544, w: 26, h: 272, kind: 'wood' },
    ],
    balls: [{ x: 602, y: 385.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 18, name: "Steep Bank", verb: "stem", intent: "chock",
    // one stroke: the chock
    answer: [[987,455.9092257993347],[987,365.9092257993347]],
    faucet: { x: 860, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 860, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[889.4, 492.4], [1134.5, 405.7], [889.4, 558.4]], kind: 'wood' },
        { x: 1143, y: 551, w: 26, h: 259, kind: 'wood' },
    ],
    balls: [{ x: 1042, y: 378.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 19, name: "Cross Pour", verb: "cross", intent: "chock",
    // two strokes: the spout, then the chock
    answers: [[[232,486],[570,552]],[[687,464.4497219928312],[687,374.4497219928312]]],
    faucet: { x: 320, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 737, y: 461.4, w: 300, h: 16, angle: -0.26, kind: 'teal' },
        { x: 888, y: 555, w: 26, h: 249, kind: 'wood' },
    ],
    crates: [{ x: 280, y: 590, w: 100, h: 180, kind: 'wood' }],
    balls: [{ x: 742, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 20, name: "Low Dish", verb: "cradle", intent: "chock",
    // one stroke: the chock
    answer: [[513,447.55857230450744],[513,357.55857230450744]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 600, w: 108, h: 118, need: 0.45 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 442.1, y: 441.9, w: 340, h: 16, angle: 0.22, kind: 'wood' },
        { x: 282, y: 546, w: 26, h: 267, kind: 'wood' },
        { x: 640, y: 666, w: 170, h: 14, kind: 'wood' },
    ],
    balls: [{ x: 458, y: 377.3, r: 26, kind: 'heavy' }],
  },
  {
    id: 21, name: "High Pour", verb: "drop", intent: "chock",
    // one stroke: the chock
    answer: [[827,399.23904347478117],[827,309.23904347478117]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 560, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[729.6, 431.4], [1016.2, 342.7], [729.6, 497.4]], kind: 'teal' },
        { x: 1025, y: 519, w: 26, h: 322, kind: 'wood' },
    ],
    balls: [{ x: 882, y: 324.2, r: 26, kind: 'heavy' }],
  },
  {
    id: 22, name: "Long Ledge", verb: "ledge", intent: "chock",
    // one stroke: the chock
    answer: [[827,464.4497219928312],[827,374.4497219928312]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 925.3, y: 448.6, w: 400, h: 16, angle: -0.26, kind: 'wood' },
        { x: 1125, y: 543, w: 26, h: 275, kind: 'wood' },
    ],
    balls: [{ x: 882, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 23, name: "Low Run", verb: "skim", intent: "chock",
    // one stroke: the chock
    answer: [[773,469.57176724498385],[773,379.57176724498385]],
    faucet: { x: 900, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 682.2, y: 460.4, w: 380, h: 16, angle: 0.21, kind: 'teal' },
        { x: 502, y: 554, w: 26, h: 251, kind: 'wood' },
    ],
    balls: [{ x: 718, y: 399.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 24, name: "Wide Glass", verb: "gather", intent: "chock",
    // one stroke: the chock
    answer: [[513,465.48583729212646],[513,375.48583729212646]],
    faucet: { x: 640, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 640, y: 621, w: 140, h: 118, need: 0.45 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[319.3, 418.0], [610.0, 492.3], [319.3, 484.0]], kind: 'wood' },
        { x: 323, y: 557, w: 26, h: 246, kind: 'wood' },
    ],
    balls: [{ x: 458, y: 393.4, r: 26, kind: 'heavy' }],
  },
  {
    id: 25, name: "High Left", verb: "tilt", intent: "chock",
    // one stroke: the chock
    answer: [[607,401.3581574505233],[607,311.3581574505233]],
    faucet: { x: 480, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 480, y: 560, w: 108, h: 118, need: 0.5, hanging: true }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 656.2, y: 397.5, w: 300, h: 16, angle: -0.28, kind: 'teal' },
        { x: 806, y: 522, w: 26, h: 316, kind: 'wood' },
    ],
    balls: [{ x: 662, y: 327.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 26, name: "Deep Cup", verb: "settle", intent: "chock",
    // one stroke: the chock
    answer: [[633,414.9092257993347],[633,324.9092257993347]],
    faucet: { x: 760, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 760, y: 580, w: 108, h: 118, need: 0.45 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 596, y: 412.3, w: 280, h: 16, angle: 0.34, kind: 'wood' },
        { x: 470, y: 527, w: 26, h: 306, kind: 'wood' },
    ],
    balls: [{ x: 578, y: 337.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 27, name: "The Rim", verb: "rim", intent: "chock",
    // one stroke: the chock
    answer: [[873,462.3581574505233],[873,372.3581574505233]],
    faucet: { x: 1000, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 1000, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[681.9, 409.4], [970.2, 492.3], [681.9, 475.4]], kind: 'teal' },
        { x: 686, y: 553, w: 26, h: 255, kind: 'wood' },
    ],
    balls: [{ x: 818, y: 388.5, r: 26, kind: 'heavy' }],
  },
  {
    id: 28, name: "Narrow Neck", verb: "narrow", intent: "chock",
    // one stroke: the chock
    answer: [[493,466.51585101958307],[493,376.51585101958307]],
    faucet: { x: 620, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 620, y: 621, w: 92, h: 118, need: 0.55 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 422.9, y: 459.6, w: 340, h: 16, angle: 0.24, kind: 'wood' },
        { x: 264, y: 554, w: 26, h: 253, kind: 'wood' },
    ],
    balls: [{ x: 438, y: 395.1, r: 26, kind: 'heavy' }],
  },
  {
    id: 29, name: "The Long Walk", verb: "trudge", intent: "chock",
    // one stroke: the chock
    answer: [[573,467.5400140253591],[573,377.5400140253591]],
    faucet: { x: 700, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 463.5, y: 452.1, w: 420, h: 16, angle: 0.23, kind: 'teal' },
        { x: 265, y: 546, w: 26, h: 268, kind: 'wood' },
    ],
    balls: [{ x: 518, y: 396.7, r: 26, kind: 'heavy' }],
  },
  {
    id: 30, name: "Harrow", verb: "harrow", intent: "chock",
    // one stroke: the chock
    answer: [[740,461.30217986924833],[740,371.30217986924833]],
    faucet: { x: 600, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 600, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { poly: [[642.7, 492.4], [978.1, 392.3], [642.7, 558.4]], kind: 'wood' },
        { x: 986, y: 544, w: 26, h: 272, kind: 'wood' },
    ],
    balls: [{ x: 795, y: 386.9, r: 26, kind: 'heavy' }],
  },
  {
    id: 31, name: "The Stall", verb: "stall", intent: "chock",
    // one stroke: the chock
    answer: [[685,459.1684690831962],[685,369.1684690831962]],
    faucet: { x: 820, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 820, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 632.4, y: 452.7, w: 310, h: 16, angle: 0.31, kind: 'teal' },
        { x: 491, y: 547, w: 26, h: 267, kind: 'wood' },
    ],
    balls: [{ x: 630, y: 383.6, r: 26, kind: 'heavy' }],
  },
  {
    id: 32, name: "Gantry", verb: "gantry", intent: "chock",
    // one stroke: the chock
    answer: [[420,464.4497219928312],[420,374.4497219928312]],
    faucet: { x: 560, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 560, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 321.7, y: 448.6, w: 400, h: 16, angle: 0.26, kind: 'wood' },
        { x: 134, y: 543, w: 26, h: 275, kind: 'wood' },
    ],
    balls: [{ x: 365, y: 391.8, r: 26, kind: 'heavy' }],
  },
  {
    id: 33, name: "Last Light", verb: "ward", intent: "chock",
    // one stroke: the chock
    answer: [[1045,468.55857230450744],[1045,378.55857230450744]],
    faucet: { x: 900, y: 170, rate: 26, total: 110 },
    glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
        { x: 640, y: 690, w: 1100, h: 20 },
        { x: 1122.2, y: 445.1, w: 360, h: 16, angle: -0.22, kind: 'teal' },
        { x: 1307, y: 555, w: 26, h: 251, kind: 'wood' },
    ],
    balls: [{ x: 1100, y: 398.3, r: 26, kind: 'heavy' }],
  },
];

module.exports = S;
