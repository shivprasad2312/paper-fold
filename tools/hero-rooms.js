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
    id: 2, name: 'Sharing', verb: 'divide', intent: 'tent',
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
    id: 16, name: "The Pitch", verb: "screen", intent: "bracket",
    answer: [[150, 676], [150, 340]],
    tip: "It comes in high and flat. A post in its lane costs less than a wall.",
    faucet: { x: 410, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 410, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    balls: [
      { x: 150, y: 360, r: 26, kind: 'heavy', vx: 10 },
    ],
  },
  {
    id: 17, name: "Underhand", verb: "chock", intent: "bracket",
    answer: [[270, 676], [270, 500]],
    tip: "A slow underhand throw — it drops early. Meet it where it lands, not where it is aimed.",
    faucet: { x: 350, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 350, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 120, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 150, y: 470, r: 26, kind: 'heavy', vx: 9 },
    ],
  },
  {
    id: 18, name: "Flat Throw", verb: "block", intent: "bracket",
    answer: [[435, 676], [505, 500]],
    tip: "Fast and level. The cup is far down its lane; put something in the lane.",
    faucet: { x: 530, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 530, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 120, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 160, y: 300, r: 26, kind: 'heavy', vx: 12 },
    ],
  },
  {
    id: 19, name: "The Lob", verb: "post", intent: "bracket",
    answer: [[280, 676], [280, 480]],
    tip: "It is lobbed. The arc is wide, and the cup sits under the far side of it.",
    faucet: { x: 350, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 350, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 120, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 170, y: 520, r: 26, kind: 'heavy', vx: 8, vy: -4 },
    ],
  },
  {
    id: 20, name: "Long Shot", verb: "hurdle", intent: "bracket",
    answer: [[395, 676], [465, 470], [535, 676]],
    tip: "A long throw crosses the whole room. Height beats strength here.",
    faucet: { x: 545, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 545, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 120, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 130, y: 330, r: 26, kind: 'heavy', vx: 14 },
    ],
  },
  {
    id: 21, name: "Low Pitch", verb: "trap", intent: "bracket",
    answer: [[555, 676], [625, 420], [695, 676]],
    tip: "The ball pitches down off the sill. Give it a pocket to sit in.",
    faucet: { x: 665, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 665, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 530, y: 470, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 428, y: 579, w: 44, h: 202, kind: 'wood' },
    ],
    balls: [
      { x: 680, y: 440, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 22, name: "High Toss", verb: "mast", intent: "bracket",
    answer: [[330, 676], [330, 480]],
    tip: "Tossed straight up and forgotten. It comes down somewhere specific.",
    faucet: { x: 425, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 425, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 130, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 200, y: 560, r: 26, kind: 'heavy', vx: 10, vy: -6 },
    ],
  },
  {
    id: 23, name: "Cross Fire", verb: "picket", intent: "bracket",
    answer: [[895, 676], [895, 480]],
    tip: "The throw comes from the right. Learn to draw backwards.",
    faucet: { x: 800, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 800, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 1160, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 1120, y: 400, r: 26, kind: 'heavy', vx: -10 },
    ],
  },
  {
    id: 24, name: "Backhand", verb: "dam", intent: "bracket",
    answer: [[955, 676], [955, 500]],
    tip: "A backhand, low and flat, with the tap pouring behind you.",
    faucet: { x: 875, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 875, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 1160, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 1140, y: 470, r: 26, kind: 'heavy', vx: -11 },
    ],
  },
  {
    id: 25, name: "Backhand Lob", verb: "stanchion", intent: "bracket",
    answer: [[980, 676], [980, 480]],
    tip: "Lobbed from the right. The water starts before the ball has finished falling.",
    faucet: { x: 860, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 860, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 1160, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 1100, y: 520, r: 26, kind: 'heavy', vx: -8, vy: -4 },
    ],
  },
  {
    id: 26, name: "Sidearm", verb: "canopy", intent: "roof",
    answer: [[810, 676], [810, 440], [920, 440]],
    tip: "A hard sidearm from the right. Stop it high, then let the tap run.",
    faucet: { x: 725, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 725, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 1160, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 1160, y: 340, r: 26, kind: 'heavy', vx: -13 },
    ],
  },
  {
    id: 27, name: "Sinker", verb: "snare", intent: "bracket",
    answer: [[280, 676], [350, 470], [420, 676]],
    tip: "The sinker drops as it arrives. Flat ground work will not do.",
    faucet: { x: 410, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 410, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 1.6,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
    ],
    crates: [
      { x: 120, y: 640, w: 96, h: 80, kind: 'wood' },
    ],
    balls: [
      { x: 180, y: 300, r: 26, kind: 'heavy', vx: 11, vy: 5 },
    ],
  },
  {
    id: 28, name: "The Drop", verb: "cradle", intent: "bracket",
    answer: [[635, 676], [635, 480], [735, 480]],
    tip: "It tips off the sill and falls straight for the mouth. Catch it in the air.",
    faucet: { x: 755, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 755, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 610, y: 300, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 508, y: 494, w: 44, h: 372, kind: 'wood' },
    ],
    balls: [
      { x: 760, y: 270, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 29, name: "High Sill", verb: "barb", intent: "bracket",
    answer: [[810, 676], [810, 460], [765, 415]],
    tip: "High sill, short drop. The ball is quicker than your line.",
    faucet: { x: 740, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 740, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 590, y: 240, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 488, y: 464, w: 44, h: 432, kind: 'wood' },
    ],
    balls: [
      { x: 740, y: 210, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 30, name: "Low Sill", verb: "net", intent: "bracket",
    answer: [[580, 676], [650, 420], [720, 676]],
    tip: "A low sill, so the fall is short and the ball is on you at once.",
    faucet: { x: 710, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 710, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 570, y: 420, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 468, y: 554, w: 44, h: 252, kind: 'wood' },
    ],
    balls: [
      { x: 720, y: 390, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 31, name: "Narrow Sill", verb: "tilt", intent: "bracket",
    answer: [[655, 676], [725, 380]],
    tip: "A narrow shelf sheds the ball sideways. Learn the direction first.",
    faucet: { x: 770, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 770, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 660, y: 340, w: 200, h: 16, kind: 'wood' },
    ],
    balls: [
      { x: 780, y: 310, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 32, name: "Left Sill", verb: "basket", intent: "bracket",
    answer: [[505, 676], [505, 430], [605, 430]],
    tip: "The sill reaches in from the far side. So does the ball.",
    faucet: { x: 455, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 455, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 690, y: 320, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 792, y: 504, w: 44, h: 352, kind: 'wood' },
    ],
    balls: [
      { x: 540, y: 290, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 33, name: "Far Sill", verb: "skid", intent: "bracket",
    answer: [[680, 676], [750, 440]],
    tip: "It leaves a distant sill with room to pick up speed.",
    faucet: { x: 815, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 815, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 670, y: 380, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 568, y: 534, w: 44, h: 292, kind: 'wood' },
    ],
    balls: [
      { x: 820, y: 350, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 34, name: "Overhang", verb: "cusp", intent: "bracket",
    answer: [[635, 676], [705, 420], [775, 676]],
    tip: "The sill overhangs the cup. The ball is already past the rim when you see it.",
    faucet: { x: 785, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 785, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 650, y: 260, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 548, y: 474, w: 44, h: 412, kind: 'wood' },
    ],
    balls: [
      { x: 800, y: 230, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 35, name: "Sill Trap", verb: "hammock", intent: "bracket",
    answer: [[745, 676], [745, 480], [845, 480]],
    tip: "The sill is set so the ball rides in against the wall. Use the wall.",
    faucet: { x: 695, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 695, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 560, y: 360, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 458, y: 524, w: 44, h: 312, kind: 'wood' },
    ],
    balls: [
      { x: 710, y: 330, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 36, name: "Long Drop", verb: "scoop", intent: "chute",
    answer: [[650, 218], [800, 280]],
    tip: "Dropped from a height, well past the cup. Deflect, do not block.",
    faucet: { x: 800, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 800, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 570, y: 210, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 468, y: 449, w: 44, h: 462, kind: 'wood' },
    ],
    balls: [
      { x: 720, y: 180, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 37, name: "High Drop", verb: "chute", intent: "chute",
    answer: [[530, 168], [680, 310]],
    tip: "The highest sill in the set. You have less time than you think.",
    faucet: { x: 740, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 740, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 490, y: 160, w: 260, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 388, y: 424, w: 44, h: 512, kind: 'wood' },
    ],
    balls: [
      { x: 640, y: 130, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 38, name: "Quick Drop", verb: "shunt", intent: "chute",
    answer: [[800, 458], [950, 560]],
    tip: "Low and close: the ball barely falls before it reaches the mouth.",
    faucet: { x: 830, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 830, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 720, y: 450, w: 220, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 638, y: 569, w: 44, h: 222, kind: 'wood' },
    ],
    balls: [
      { x: 850, y: 420, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 39, name: "Left Drop", verb: "deflect", intent: "bracket",
    answer: [[550, 676], [620, 500]],
    tip: "The sill comes in from the right this time.",
    faucet: { x: 515, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 515, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 770, y: 330, w: 300, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 892, y: 509, w: 44, h: 342, kind: 'wood' },
    ],
    balls: [
      { x: 600, y: 300, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 40, name: "Last Drop", verb: "kick", intent: "bracket",
    answer: [[595, 676], [665, 440]],
    tip: "The last one falls, the tap opens late, and the mouth is wide open.",
    faucet: { x: 710, y: 210, rate: 24, total: 110 },
    glasses: [{ x: 710, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 2.2,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { x: 570, y: 330, w: 240, h: 16, kind: 'wood' },
    ],
    crates: [
      { x: 478, y: 509, w: 44, h: 342, kind: 'wood' },
    ],
    balls: [
      { x: 710, y: 300, r: 26, kind: 'heavy' },
    ],
  },

];

module.exports = S;
