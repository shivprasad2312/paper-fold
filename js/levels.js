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
        { x: 500, y: 631, w: 120, h: 118, need: 0.35 },
        { x: 780, y: 631, w: 120, h: 118, need: 0.35 },
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
      ink: 170,
      faucets: [
        { x: 470, y: 170, rate: 24, total: 42 },
        { x: 810, y: 170, rate: 24, total: 42 },
      ],
      glasses: [
        { x: 640, y: 620, w: 104, h: 112, need: 0.55 },
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
      ink: 260,
      faucet: { x: 640, y: 170, rate: 28, total: 130 },
      glasses: [
        { x: 430, y: 620, w: 108, h: 118, need: 0.45 },
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
        { x: 600, y: 470, w: 100, h: 112, need: 0.3 },
        { x: 810, y: 620, w: 104, h: 112, need: 0.3 },
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
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 780, y: 631, w: 108, h: 118, need: 0.45 },
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
      name: "The Chute",
      tip: undefined,
      ink: 120,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 523, y: 461.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
        P({ x: 384, y: 555, w: 26, h: 249, kind: 'wood' }),
      ],
      crates: [
        { x: 590, y: 640, w: 90, h: 80, kind: 'wood' },
      ],
      balls: [
        { x: 540, y: 397.7, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Steep Drop",
      tip: undefined,
      ink: 140,
      faucet: { x: 480, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 480, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[221.1, 421.4], [450.4, 492.3], [221.1, 487.4]], kind: 'wood' }),
        P({ x: 225, y: 559, w: 26, h: 243, kind: 'wood' }),
      ],
      balls: [
        { x: 340, y: 398.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Queue",
      tip: undefined,
      ink: 120,
      faucet: { x: 820, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 820, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 632.6, y: 462, w: 320, h: 16, kind: 'teal', angle: 0.24 }),
        P({ x: 483, y: 556, w: 26, h: 248, kind: 'wood' }),
      ],
      balls: [
        { x: 638, y: 395.1, r: 26, kind: 'heavy' },
        { x: 575, y: 379.6, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Ladle",
      tip: undefined,
      ink: 170,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[301.7, 406.9], [610.1, 492.3], [301.7, 472.9]], kind: 'wood' }),
        P({ x: 306, y: 551, w: 26, h: 257, kind: 'wood' }),
      ],
      balls: [
        { x: 458, y: 390.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Spout And Chock",
      tip: undefined,
      ink: 540,
      faucet: { x: 450, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 875.3, y: 455.7, w: 300, h: 16, kind: 'teal', angle: -0.3 }),
        P({ x: 1025, y: 550, w: 26, h: 261, kind: 'wood' }),
      ],
      crates: [
        { x: 420, y: 590, w: 100, h: 180, kind: 'wood' },
      ],
      balls: [
        { x: 882, y: 385.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Long Fall",
      tip: undefined,
      ink: 540,
      faucet: { x: 450, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 916.6, y: 454.8, w: 380, h: 16, kind: 'wood', angle: -0.24 }),
        P({ x: 1107, y: 549, w: 26, h: 262, kind: 'wood' }),
      ],
      crates: [
        { x: 420, y: 590, w: 100, h: 180, kind: 'wood' },
      ],
      balls: [
        { x: 882, y: 395.1, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Cup",
      tip: undefined,
      ink: 120,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 520, w: 108, h: 118, need: 0.5, hanging: true },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[380.1, 314.1], [670, 391.2], [380.1, 380.1]], kind: 'teal' }),
        P({ x: 384, y: 505, w: 26, h: 350, kind: 'wood' }),
      ],
      balls: [
        { x: 518, y: 290.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Pedestal",
      tip: undefined,
      ink: 120,
      faucet: { x: 560, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 560, y: 540, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 372.6, y: 381, w: 320, h: 16, kind: 'wood', angle: 0.24 }),
        P({ x: 223, y: 515, w: 26, h: 329, kind: 'wood' }),
        P({ x: 560, y: 606, w: 160, h: 14, kind: 'wood' }),
      ],
      balls: [
        { x: 378, y: 314.1, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Right Bank",
      tip: undefined,
      ink: 120,
      faucet: { x: 420, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 420, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 614.4, y: 449.8, w: 340, h: 16, kind: 'teal', angle: -0.3 }),
        P({ x: 783, y: 544, w: 26, h: 272, kind: 'wood' }),
      ],
      balls: [
        { x: 602, y: 385.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Steep Bank",
      tip: undefined,
      ink: 120,
      faucet: { x: 860, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 860, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[889.4, 492.4], [1134.5, 405.7], [889.4, 558.4]], kind: 'wood' }),
        P({ x: 1143, y: 551, w: 26, h: 259, kind: 'wood' }),
      ],
      balls: [
        { x: 1042, y: 378.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Cross Pour",
      tip: undefined,
      ink: 540,
      faucet: { x: 320, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 560, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 737, y: 461.4, w: 300, h: 16, kind: 'teal', angle: -0.26 }),
        P({ x: 888, y: 555, w: 26, h: 249, kind: 'wood' }),
      ],
      crates: [
        { x: 280, y: 590, w: 100, h: 180, kind: 'wood' },
      ],
      balls: [
        { x: 742, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Low Dish",
      tip: undefined,
      ink: 120,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 600, w: 108, h: 118, need: 0.45 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 442.1, y: 441.9, w: 340, h: 16, kind: 'wood', angle: 0.22 }),
        P({ x: 282, y: 546, w: 26, h: 267, kind: 'wood' }),
        P({ x: 640, y: 666, w: 170, h: 14, kind: 'wood' }),
      ],
      balls: [
        { x: 458, y: 377.3, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Pour",
      tip: undefined,
      ink: 120,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 560, w: 108, h: 118, need: 0.5, hanging: true },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[729.6, 431.4], [1016.2, 342.7], [729.6, 497.4]], kind: 'teal' }),
        P({ x: 1025, y: 519, w: 26, h: 322, kind: 'wood' }),
      ],
      balls: [
        { x: 882, y: 324.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Long Ledge",
      tip: undefined,
      ink: 120,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 925.3, y: 448.6, w: 400, h: 16, kind: 'wood', angle: -0.26 }),
        P({ x: 1125, y: 543, w: 26, h: 275, kind: 'wood' }),
      ],
      balls: [
        { x: 882, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Low Run",
      tip: undefined,
      ink: 120,
      faucet: { x: 900, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 900, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 682.2, y: 460.4, w: 380, h: 16, kind: 'teal', angle: 0.21 }),
        P({ x: 502, y: 554, w: 26, h: 251, kind: 'wood' }),
      ],
      balls: [
        { x: 718, y: 399.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Wide Glass",
      tip: undefined,
      ink: 120,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 621, w: 140, h: 118, need: 0.45 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[319.3, 418], [610, 492.3], [319.3, 484]], kind: 'wood' }),
        P({ x: 323, y: 557, w: 26, h: 246, kind: 'wood' }),
      ],
      balls: [
        { x: 458, y: 393.4, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Left",
      tip: undefined,
      ink: 120,
      faucet: { x: 480, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 480, y: 560, w: 108, h: 118, need: 0.5, hanging: true },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 656.2, y: 397.5, w: 300, h: 16, kind: 'teal', angle: -0.28 }),
        P({ x: 806, y: 522, w: 26, h: 316, kind: 'wood' }),
      ],
      balls: [
        { x: 662, y: 327.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Deep Cup",
      tip: undefined,
      ink: 120,
      faucet: { x: 760, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 760, y: 580, w: 108, h: 118, need: 0.45 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 596, y: 412.3, w: 280, h: 16, kind: 'wood', angle: 0.34 }),
        P({ x: 470, y: 527, w: 26, h: 306, kind: 'wood' }),
      ],
      balls: [
        { x: 578, y: 337.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Rim",
      tip: undefined,
      ink: 120,
      faucet: { x: 1000, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 1000, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[681.9, 409.4], [970.2, 492.3], [681.9, 475.4]], kind: 'teal' }),
        P({ x: 686, y: 553, w: 26, h: 255, kind: 'wood' }),
      ],
      balls: [
        { x: 818, y: 388.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Narrow Neck",
      tip: undefined,
      ink: 120,
      faucet: { x: 620, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 620, y: 621, w: 92, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 422.9, y: 459.6, w: 340, h: 16, kind: 'wood', angle: 0.24 }),
        P({ x: 264, y: 554, w: 26, h: 253, kind: 'wood' }),
      ],
      balls: [
        { x: 438, y: 395.1, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Long Walk",
      tip: undefined,
      ink: 120,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 463.5, y: 452.1, w: 420, h: 16, kind: 'teal', angle: 0.23 }),
        P({ x: 265, y: 546, w: 26, h: 268, kind: 'wood' }),
      ],
      balls: [
        { x: 518, y: 396.7, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Harrow",
      tip: undefined,
      ink: 120,
      faucet: { x: 600, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 600, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ poly: [[642.7, 492.4], [978.1, 392.3], [642.7, 558.4]], kind: 'wood' }),
        P({ x: 986, y: 544, w: 26, h: 272, kind: 'wood' }),
      ],
      balls: [
        { x: 795, y: 386.9, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Stall",
      tip: undefined,
      ink: 120,
      faucet: { x: 820, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 820, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 632.4, y: 452.7, w: 310, h: 16, kind: 'teal', angle: 0.31 }),
        P({ x: 491, y: 547, w: 26, h: 267, kind: 'wood' }),
      ],
      balls: [
        { x: 630, y: 383.6, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Gantry",
      tip: undefined,
      ink: 120,
      faucet: { x: 560, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 560, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 321.7, y: 448.6, w: 400, h: 16, kind: 'wood', angle: 0.26 }),
        P({ x: 134, y: 543, w: 26, h: 275, kind: 'wood' }),
      ],
      balls: [
        { x: 365, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Last Light",
      tip: undefined,
      ink: 120,
      faucet: { x: 900, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 900, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 1122.2, y: 445.1, w: 360, h: 16, kind: 'teal', angle: -0.22 }),
        P({ x: 1307, y: 555, w: 26, h: 251, kind: 'wood' }),
      ],
      balls: [
        { x: 1100, y: 398.3, r: 26, kind: 'heavy' },
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
