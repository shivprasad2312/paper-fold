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
      { x: 500, y: 631, w: 108, h: 118, need: 0.5 },
      { x: 780, y: 631, w: 108, h: 118, need: 0.5 },
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
    answer: [[802, 474], [694, 540]],
    tip: 'Two taps, one cup, and neither of them aims at it.',
    faucets: [{ x: 470, y: 170, rate: 24, total: 45 }, { x: 810, y: 170, rate: 24, total: 45 }],
    glasses: [{ x: 640, y: 620, w: 108, h: 118, need: 0.5 }],
    stage: [{ x: 640, y: 690, w: 600, h: 20 }],
    crates: [{ x: 420, y: 520, w: 100, h: 60 }, { x: 860, y: 520, w: 100, h: 60 }],
  },
  {
    id: 5, name: 'The Shelf', verb: 'route', intent: 'chute',
    answer: [[600, 384], [700, 340], [820, 360]],
    tip: 'The shelf under the tap steals the stream. Bend it back to the cup.',
    faucet: { x: 640, y: 170, rate: 28, total: 150 },
    glasses: [{ x: 430, y: 620, w: 108, h: 118, need: 0.5 }],
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
      { x: 600, y: 470, w: 108, h: 118, need: 0.5 },
      { x: 810, y: 620, w: 108, h: 118, need: 0.5 },
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
    faucet: { x: 640, y: 170, rate: 26, total: 150 },
    glasses: [{ x: 780, y: 631, w: 108, h: 118, need: 0.5 }],
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
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    stage: [
      { x: 640, y: 690, w: 1100, h: 20 },
    ],
    crates: [{ x: 520, y: 600, w: 100, h: 180, kind: 'wood' }],
  },
  {
    id: 11, name: "The Shade", verb: "shade",
    answer: [[472,486],[812,552]],
    faucet: { x: 640, y: 170, rate: 26, total: 130 },
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
  {
    id: 16, name: "The Keel", verb: "true", intent: "bounce",
    answer: [[640,672], [810,412], [980,462]],
    tip: "Wide at the top, narrow at the base: it sheds both ways.",
    faucet: { x: 640, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1010, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[520, 380], [880, 380], [790, 690], [610, 690]] },
      { x: 1010, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 17, name: "The Anvil", verb: "hedge", intent: "bounce",
    answer: [[652,352], [816,302], [980,511]],
    tip: "Read the hexagon: one shoulder faces the cup.",
    faucet: { x: 660, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 980, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[500, 690], [480, 430], [580, 360], [700, 360], [800, 430], [780, 690]] },
      { x: 980, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 18, name: "The Wedge", verb: "mirror", intent: "chute",
    answer: [[727,494], [392,539]],
    tip: "The slope runs the other way here. Use it.",
    faucet: { x: 760, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 420, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[860, 690], [860, 400], [480, 690]] },
      { x: 420, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 19, name: "The Ledge", verb: "edge", intent: "chute",
    answer: [[848,452], [1042,509]],
    tip: "Pour at the edge and the block hands it over.",
    faucet: { x: 840, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1070, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[560, 690], [560, 470], [880, 470], [880, 690]] },
      { x: 1070, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 20, name: "The Pillar", verb: "cap", intent: "chute",
    answer: [[644,372], [940,567]],
    tip: "A narrow cap, a narrow shed. Catch it at the lip.",
    faucet: { x: 645, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 940, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[620, 690], [620, 380], [660, 380], [700, 470], [700, 690]] },
      { x: 940, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 21, name: "The Chute", verb: "tilt", intent: "chute",
    answer: [[587,374], [438,324], [288,511]],
    tip: "A slab on the slant. Let it run downhill.",
    faucet: { x: 560, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 260, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[440, 470], [440, 410], [860, 330], [860, 390]] },
      { x: 260, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 1060, y: 640, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 22, name: "The Chock", verb: "trim", intent: "chute",
    answer: [[664,422], [807,367], [950,488]],
    tip: "One corner is cut. The cut is the exit.",
    faucet: { x: 660, y: 200, rate: 26, total: 165 },
    glasses: [{ x: 980, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[520, 690], [520, 430], [680, 430], [780, 520], [780, 690]] },
      { x: 980, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 23, name: "The Stack", verb: "ladder", intent: "chute",
    answer: [[620,532], [800,482], [980,546]],
    tip: "High shelf to low shelf to cup. Do not skip a step.",
    faucet: { x: 620, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1020, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[420, 400], [420, 320], [700, 320], [700, 400]] },
      { kind: 'teal', poly: [[620, 560], [620, 480], [860, 480], [860, 560]] },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 24, name: "The Crate Wall", verb: "shelter", intent: "bounce",
    answer: [[696,409], [848,359], [1000,511]],
    tip: "The crate is not the answer. The slab is.",
    faucet: { x: 690, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1000, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[600, 690], [600, 400], [760, 428], [760, 690]] },
      { x: 1000, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    crates: [
      { x: 880, y: 640, w: 64, h: 64, kind: 'wood' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 25, name: "The Doorstep", verb: "step", intent: "bounce",
    answer: [[711,372], [326,480]],
    tip: "Two heights, one pour. Step it down.",
    faucet: { x: 700, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 290, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[420, 690], [420, 480], [640, 480], [640, 690]] },
      { kind: 'teal', poly: [[620, 690], [620, 380], [860, 380], [860, 690]] },
      { x: 290, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 26, name: "The Bench", verb: "lean", intent: "chute",
    answer: [[824,462], [1048,567]],
    tip: "The bench is wide. Work the near end.",
    faucet: { x: 820, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1020, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[500, 690], [500, 470], [860, 470], [860, 690]] },
      { x: 1020, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 27, name: "The Stump", verb: "tip", intent: "chute",
    answer: [[768,462], [990,456]],
    tip: "Pour near the edge and the block gives it up.",
    faucet: { x: 780, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1020, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[560, 690], [560, 470], [820, 470], [820, 690]] },
      { x: 1020, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 28, name: "The Bluff", verb: "shed", intent: "chute",
    answer: [[792,482], [412,539]],
    tip: "It sheds away from the glass. Go and get it.",
    faucet: { x: 800, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 440, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[760, 690], [760, 490], [1080, 490], [1080, 690]] },
      { x: 440, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 29, name: "The Cap", verb: "shelter", intent: "bounce",
    answer: [[800,352], [1016,462]],
    tip: "A cap on a stem. The cap is the high route.",
    faucet: { x: 800, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1040, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[480, 420], [480, 360], [820, 360], [820, 420]] },
      { kind: 'teal', poly: [[600, 420], [600, 690], [700, 690], [700, 420]] },
      { x: 1040, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 30, name: "The Plateau", verb: "cross", intent: "chute",
    answer: [[625,462], [860,508]],
    tip: "The pour lands on the plateau. Carry it off the lip.",
    faucet: { x: 600, y: 200, rate: 26, total: 125 },
    glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[370, 470], [670, 470], [710, 690], [330, 690]] },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 31, name: "The Prism", verb: "run", intent: "chute",
    answer: [[699,473], [970,478]],
    tip: "The prism throws it sideways. Meet it on the way down.",
    faucet: { x: 700, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1010, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[520, 690], [860, 690], [690, 470]] },
      { x: 1010, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 32, name: "The Cliff", verb: "spill", intent: "chute",
    answer: [[705,422], [860,372], [1014,478]],
    tip: "It runs to the edge and falls. Catch it as it goes over.",
    faucet: { x: 700, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1010, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[480, 430], [780, 430], [820, 690], [560, 690]] },
      { x: 1010, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 33, name: "The Spire", verb: "divert", intent: "chute",
    answer: [[600,480], [920,483]],
    tip: "The spire splits it. Go over the top and down the far side.",
    faucet: { x: 620, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 940, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[620, 690], [700, 690], [660, 430]] },
      { x: 940, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 34, name: "The Tent", verb: "settle", intent: "chute",
    answer: [[413,487], [650,476]],
    tip: "Two roofs and a valley. The cup sits in the middle of it.",
    faucet: { x: 430, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 690, y: 551, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[300, 690], [600, 690], [450, 430]] },
      { kind: 'teal', poly: [[1080, 690], [780, 690], [930, 430]] },
      { x: 690, y: 629, w: 220, h: 36, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 35, name: "The Long Shelf", verb: "carry", intent: "chute",
    answer: [[635,412], [778,362], [920,508]],
    tip: "One shelf, a long drop. Carry it out and let it fall.",
    faucet: { x: 620, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 960, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[410, 420], [410, 356], [710, 356], [710, 420]] },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 36, name: "The Overhang", verb: "shelter", intent: "chute",
    answer: [[905,302], [490,502]],
    tip: "The block sheds it away from the cup. Carry it across.",
    faucet: { x: 900, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 480, y: 621, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[650, 400], [650, 310], [990, 310], [990, 400]] },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 37, name: "The Valley", verb: "settle", intent: "chute",
    answer: [[446,442], [642,448]],
    tip: "Two walls, one gap. The water only has to come down between them.",
    faucet: { x: 420, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 660, y: 541, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[290, 690], [290, 450], [550, 450], [550, 690]] },
      { kind: 'teal', poly: [[770, 690], [770, 450], [1030, 450], [1030, 690]] },
      { x: 660, y: 620, w: 260, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 38, name: "The Buttress", verb: "console", intent: "chute",
    answer: [[522,500], [930,512]],
    tip: "It lands on the slope and runs off the end. Take it from there.",
    faucet: { x: 510, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 960, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[420, 690], [420, 430], [760, 690]] },
      { x: 960, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 39, name: "The Step", verb: "climb", intent: "bounce",
    answer: [[758,392], [990,456]],
    tip: "Climb the step, then drop to the glass.",
    faucet: { x: 750, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1020, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[400, 690], [400, 520], [620, 520], [620, 690]] },
      { kind: 'teal', poly: [[560, 690], [560, 400], [780, 400], [780, 690]] },
      { x: 1020, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 654, r: 26, kind: 'heavy' },
    ],
  },
  {
    id: 40, name: "The Island", verb: "island", intent: "chute",
    answer: [[815,512], [1028,539]],
    tip: "The block splits the pour. Both sides are yours.",
    faucet: { x: 820, y: 200, rate: 26, total: 140 },
    glasses: [{ x: 1000, y: 591, w: 108, h: 118, need: 0.5 }],
    delay: 0.4,
    stage: [
      { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
      { kind: 'teal', poly: [[560, 690], [560, 520], [860, 520], [860, 690]] },
      { x: 1000, y: 670, w: 200, h: 40, kind: 'teal' },
    ],
    balls: [
      { x: 160, y: 320, r: 26, kind: 'heavy' },
    ],
  },

];

module.exports = S;
