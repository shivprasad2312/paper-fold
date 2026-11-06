/* ==========================================================================
   levels.js — hand-authored puzzle layouts.

   World space is 1280 x 720 (y grows downward).

   Shape fields (x,y are the CENTRE of the object unless noted):
     faucet   {x, y, rate, total, spread}       y = mouth of the tap (water spawns here)
     glass    {x, y, w, h, need, tilt}          y = centre, need = 0..1 fill target
     platform {x, y, w, h, angle, kind}         kind: wood | metal | stone | sand | teal | ice
     spinner  {x, y, w, h, speed}               free pin-jointed bar (rotates when hit)
     seesaw   {x, y, w, h}                      long pinned plank
     hot      {x, y, w, h, angle}               heated pad, vaporises water
     fan      {x, y, w, h, angle, force}        blower, pushes water along its angle
     crate    {x, y, size, kind}                static crate (fills space, can't draw over)
     ball     {x, y, r, kind}                   loose weight: 'heavy' (orange, dead,
                                                can plug a gap) or 'light' (teal, bouncy)

   `ink` is the ink budget measured in world pixels of line length.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;

  const P = (o) => Object.assign({ kind: 'wood', angle: 0 }, o);

  const LEVELS = [
    {
      name: "The Pit",
      tip: "The cup hangs over a hole. Draw it a floor before you draw it water.",
      ink: 200,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 430, w: 108, h: 118, need: 0.5, hanging: true },
      ],
      platforms: [
        P({ x: 240, y: 690, w: 480, h: 20, kind: 'teal' }),
        P({ x: 1040, y: 690, w: 480, h: 20, kind: 'teal' }),
      ],
      crates: [
        { x: 520, y: 560, w: 120, h: 60, kind: 'wood' },
        { x: 760, y: 560, w: 120, h: 60, kind: 'wood' },
      ],
    },
    {
      name: "Sharing",
      tip: "One stream, two cups. One stroke has to serve both.",
      ink: 300,
      faucet: { x: 640, y: 170, rate: 30, total: 140 },
      glasses: [
        { x: 500, y: 631, w: 108, h: 118, need: 0.5 },
        { x: 780, y: 631, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 700, w: 960, h: 20, kind: 'teal' }),
        P({ x: 640, y: 615, w: 60, h: 150, kind: 'teal' }),
      ],
    },
    {
      name: "Two Heights",
      tip: "The blocks are not the same height. A shelf across them will not be level.",
      ink: 340,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 430, w: 108, h: 118, need: 0.5, hanging: true },
      ],
      platforms: [
        P({ x: 240, y: 690, w: 480, h: 20, kind: 'teal' }),
        P({ x: 1040, y: 690, w: 480, h: 20, kind: 'teal' }),
      ],
      crates: [
        { x: 470, y: 610, w: 120, h: 100, kind: 'wood' },
        { x: 810, y: 645, w: 120, h: 130, kind: 'wood' },
      ],
    },
    {
      name: "Twin Taps",
      tip: "Two taps, one cup, and neither of them aims at it.",
      ink: 240,
      faucets: [
        { x: 470, y: 170, rate: 24, total: 45 },
        { x: 810, y: 170, rate: 24, total: 45 },
      ],
      glasses: [
        { x: 640, y: 617, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 600, h: 20, kind: 'teal' }),
      ],
      crates: [
        { x: 420, y: 520, w: 100, h: 60, kind: 'wood' },
        { x: 860, y: 520, w: 100, h: 60, kind: 'wood' },
      ],
    },
    {
      name: "The Shelf",
      tip: "The shelf under the tap steals the stream. Bend it back to the cup.",
      ink: 320,
      faucet: { x: 640, y: 170, rate: 28, total: 150 },
      glasses: [
        { x: 430, y: 620, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 690, w: 300, h: 20, kind: 'teal' }),
        P({ x: 720, y: 400, w: 260, h: 16, kind: 'teal' }),
      ],
      crates: [
        { x: 300, y: 560, w: 90, h: 60, kind: 'wood' },
      ],
    },
    {
      name: "The Hook",
      tip: "Nothing under the cup. Something beside it, and a long way to reach.",
      ink: 830,
      faucet: { x: 520, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 600, y: 470, w: 108, h: 118, need: 0.5, hanging: true },
      ],
      platforms: [
        P({ x: 240, y: 700, w: 480, h: 20, kind: 'teal' }),
        P({ x: 1040, y: 700, w: 480, h: 20, kind: 'teal' }),
        P({ x: 880, y: 560, w: 200, h: 16, kind: 'teal' }),
      ],
      crates: [
        { x: 300, y: 640, w: 120, h: 100, kind: 'wood' },
      ],
    },
    {
      name: "Cascade",
      tip: "The top cup fills first, then it overflows. The bottom cup is waiting for that.",
      ink: 150,
      faucet: { x: 600, y: 170, rate: 30, total: 160 },
      glasses: [
        { x: 600, y: 467, w: 108, h: 118, need: 0.5 },
        { x: 810, y: 617, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 600, y: 560, w: 120, h: 60, kind: 'teal' }),
        P({ x: 810, y: 690, w: 300, h: 20, kind: 'teal' }),
      ],
    },
    {
      name: "Under The Ledge",
      tip: "The cup is under the shelf, not beside it. The stream has to come in low.",
      ink: 290,
      faucet: { x: 640, y: 170, rate: 26, total: 150 },
      glasses: [
        { x: 780, y: 631, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 780, y: 700, w: 500, h: 20, kind: 'teal' }),
        P({ x: 640, y: 460, w: 300, h: 18, kind: 'teal' }),
        P({ x: 420, y: 560, w: 120, h: 20, kind: 'teal' }),
      ],
      crates: [
        { x: 460, y: 500, w: 90, h: 60, kind: 'wood' },
      ],
    },
    {
      name: "The Hot Floor",
      tip: undefined,
      ink: 460,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 860, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 640, y: 560, w: 60, h: 20, kind: 'wood' }),
      ],
      crates: [
        { x: 470, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
      hots: [
        { x: 640, y: 676, w: 220, h: 22 },
      ],
    },
    {
      name: "Narrow Neck",
      tip: undefined,
      ink: 180,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      crates: [
        { x: 520, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
    },
    {
      name: "The Shade",
      tip: undefined,
      ink: 430,
      faucet: { x: 640, y: 170, rate: 26, total: 130 },
      glasses: [
        { x: 820, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 820, y: 470, w: 260, h: 18, kind: 'wood' }),
        P({ x: 960, y: 600, w: 16, h: 180, kind: 'wood' }),
      ],
      crates: [
        { x: 520, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
    },
    {
      name: "Mirror Wall",
      tip: undefined,
      ink: 580,
      faucet: { x: 820, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 460, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 620, y: 620, w: 22, h: 150, kind: 'wood' }),
      ],
      crates: [
        { x: 920, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
    },
    {
      name: "Two Taps",
      tip: undefined,
      ink: 290,
      faucets: [
        { x: 460, y: 170, rate: 22, total: 70 },
        { x: 900, y: 170, rate: 22, total: 70 },
      ],
      glasses: [
        { x: 680, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      crates: [
        { x: 420, y: 600, w: 100, h: 180, kind: 'wood' },
        { x: 900, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
    },
    {
      name: "The Low Wall",
      tip: undefined,
      ink: 540,
      faucet: { x: 500, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 860, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 700, y: 620, w: 22, h: 150, kind: 'wood' }),
      ],
      crates: [
        { x: 400, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
    },
    {
      name: "Deep Sill",
      tip: undefined,
      ink: 440,
      faucet: { x: 520, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 820, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 700, y: 544, w: 240, h: 18, kind: 'wood' }),
      ],
      crates: [
        { x: 440, y: 600, w: 100, h: 180, kind: 'wood' },
      ],
    },
    {
      name: "The Keel",
      tip: "Wide at the top, narrow at the base: it sheds both ways.",
      ink: 590,
      faucet: { x: 640, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1010, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[520, 380], [880, 380], [790, 690], [610, 690]] },
        P({ x: 1010, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Anvil",
      tip: "Read the hexagon: one shoulder faces the cup.",
      ink: 530,
      faucet: { x: 660, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 980, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[500, 690], [480, 430], [580, 360], [700, 360], [800, 430], [780, 690]] },
        P({ x: 980, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Wedge",
      tip: "The slope runs the other way here. Use it.",
      ink: 410,
      faucet: { x: 760, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 420, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[860, 690], [860, 400], [480, 690]] },
        P({ x: 420, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Ledge",
      tip: "Pour at the edge and the block hands it over.",
      ink: 250,
      faucet: { x: 840, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1070, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[560, 690], [560, 470], [880, 470], [880, 690]] },
        P({ x: 1070, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Pillar",
      tip: "A narrow cap, a narrow shed. Catch it at the lip.",
      ink: 430,
      faucet: { x: 645, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 940, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[620, 690], [620, 380], [660, 380], [700, 470], [700, 690]] },
        P({ x: 940, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Chute",
      tip: "A slab on the slant. Let it run downhill.",
      ink: 480,
      faucet: { x: 560, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 260, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[440, 470], [440, 410], [860, 330], [860, 390]] },
        P({ x: 260, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 1060, y: 640, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Chock",
      tip: "One corner is cut. The cut is the exit.",
      ink: 410,
      faucet: { x: 660, y: 200, rate: 26, total: 165 },
      glasses: [
        { x: 980, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[520, 690], [520, 430], [680, 430], [780, 520], [780, 690]] },
        P({ x: 980, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Stack",
      tip: "High shelf to low shelf to cup. Do not skip a step.",
      ink: 460,
      faucet: { x: 620, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1020, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[420, 400], [420, 320], [700, 320], [700, 400]] },
        { kind: 'teal', poly: [[620, 560], [620, 480], [860, 480], [860, 560]] },
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Crate Wall",
      tip: "The crate is not the answer. The slab is.",
      ink: 450,
      faucet: { x: 690, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1000, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[600, 690], [600, 400], [760, 428], [760, 690]] },
        P({ x: 1000, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      crates: [
        { x: 880, y: 640, w: 64, h: 64, kind: 'wood' },
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Doorstep",
      tip: "Two heights, one pour. Step it down.",
      ink: 480,
      faucet: { x: 700, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 290, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[420, 690], [420, 480], [640, 480], [640, 690]] },
        { kind: 'teal', poly: [[620, 690], [620, 380], [860, 380], [860, 690]] },
        P({ x: 290, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Bench",
      tip: "The bench is wide. Work the near end.",
      ink: 300,
      faucet: { x: 820, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1020, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[500, 690], [500, 470], [860, 470], [860, 690]] },
        P({ x: 1020, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Stump",
      tip: "Pour near the edge and the block gives it up.",
      ink: 270,
      faucet: { x: 780, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1020, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[560, 690], [560, 470], [820, 470], [820, 690]] },
        P({ x: 1020, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Bluff",
      tip: "It sheds away from the glass. Go and get it.",
      ink: 470,
      faucet: { x: 800, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 440, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[760, 690], [760, 490], [1080, 490], [1080, 690]] },
        P({ x: 440, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Cap",
      tip: "A cap on a stem. The cap is the high route.",
      ink: 300,
      faucet: { x: 800, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1040, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[480, 420], [480, 360], [820, 360], [820, 420]] },
        { kind: 'teal', poly: [[600, 420], [600, 690], [700, 690], [700, 420]] },
        P({ x: 1040, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Plateau",
      tip: "The pour lands on the plateau. Carry it off the lip.",
      ink: 290,
      faucet: { x: 600, y: 200, rate: 26, total: 125 },
      glasses: [
        { x: 900, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[370, 470], [670, 470], [710, 690], [330, 690]] },
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Prism",
      tip: "The prism throws it sideways. Meet it on the way down.",
      ink: 330,
      faucet: { x: 700, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1010, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[520, 690], [860, 690], [690, 470]] },
        P({ x: 1010, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Cliff",
      tip: "It runs to the edge and falls. Catch it as it goes over.",
      ink: 420,
      faucet: { x: 700, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1010, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[480, 430], [780, 430], [820, 690], [560, 690]] },
        P({ x: 1010, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Spire",
      tip: "The spire splits it. Go over the top and down the far side.",
      ink: 390,
      faucet: { x: 620, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 940, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[620, 690], [700, 690], [660, 430]] },
        P({ x: 940, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Tent",
      tip: "Two roofs and a valley. The cup sits in the middle of it.",
      ink: 290,
      faucet: { x: 430, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 690, y: 551, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[300, 690], [600, 690], [450, 430]] },
        { kind: 'teal', poly: [[1080, 690], [780, 690], [930, 430]] },
        P({ x: 690, y: 629, w: 220, h: 36, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Long Shelf",
      tip: "One shelf, a long drop. Carry it out and let it fall.",
      ink: 430,
      faucet: { x: 620, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 960, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[410, 420], [410, 356], [710, 356], [710, 420]] },
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Overhang",
      tip: "The block sheds it away from the cup. Carry it across.",
      ink: 560,
      faucet: { x: 900, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 480, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[650, 400], [650, 310], [990, 310], [990, 400]] },
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Valley",
      tip: "Two walls, one gap. The water only has to come down between them.",
      ink: 240,
      faucet: { x: 420, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 660, y: 541, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[290, 690], [290, 450], [550, 450], [550, 690]] },
        { kind: 'teal', poly: [[770, 690], [770, 450], [1030, 450], [1030, 690]] },
        P({ x: 660, y: 620, w: 260, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Buttress",
      tip: "It lands on the slope and runs off the end. Take it from there.",
      ink: 490,
      faucet: { x: 510, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 960, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[420, 690], [420, 430], [760, 690]] },
        P({ x: 960, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Step",
      tip: "Climb the step, then drop to the glass.",
      ink: 290,
      faucet: { x: 750, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1020, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[400, 690], [400, 520], [620, 520], [620, 690]] },
        { kind: 'teal', poly: [[560, 690], [560, 400], [780, 400], [780, 690]] },
        P({ x: 1020, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 654, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Island",
      tip: "The block splits the pour. Both sides are yours.",
      ink: 260,
      faucet: { x: 820, y: 200, rate: 26, total: 140 },
      glasses: [
        { x: 1000, y: 591, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        { kind: 'teal', poly: [[560, 690], [560, 520], [860, 520], [860, 690]] },
        P({ x: 1000, y: 670, w: 200, h: 40, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 320, r: 26, kind: 'heavy' },
      ],
    },
  ];

  // ------------------------------------------------------------- normalising
  LEVELS.forEach((lv, i) => {
    lv.id = i + 1;
    lv.faucets = lv.faucets || (lv.faucet ? [lv.faucet] : []);
    lv.glasses = (lv.glasses || []).map((g) =>
      Object.assign({ w: 104, h: 118, need: 0.54, tilt: 0, hanging: false }, g)
    );
    lv.platforms = (lv.platforms || []).map((p) => Object.assign({ angle: 0, kind: 'wood' }, p));
    lv.spinners = (lv.spinners || []).map((s) => Object.assign({ speed: 0 }, s));
    lv.seesaws = (lv.seesaws || []).map((s) => Object.assign({}, s));
    lv.hots = (lv.hots || []).map((h) => Object.assign({ angle: 0 }, h));
    lv.fans = (lv.fans || []).map((f) =>
      Object.assign({ angle: 0, force: 0.16, dir: 1 }, f)
    );
    lv.crates = (lv.crates || []).map((c) => Object.assign({ kind: 'wood', angle: 0 }, c));
    lv.balls = (lv.balls || []).map((b) => Object.assign({ r: 22, kind: 'heavy' }, b));
    lv.pins = (lv.pins || []).map((p) => Object.assign({ r: 11 }, p));
    if (!lv.ink) lv.ink = 600;
    lv.faucets.forEach((f) => {
      f.rate = f.rate || 46;
      f.total = f.total || 105;
      f.spread = f.spread == null ? 0.55 : f.spread;
    });
  });

  HG.LEVELS = LEVELS;
  HG.levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
})(window);
