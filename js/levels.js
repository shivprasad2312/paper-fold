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
        { x: 700, y: 621, w: 90, h: 118, need: 0.45 },
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
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
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
      name: "First Blood",
      tip: undefined,
      ink: 120,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 523, y: 461.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
      ],
      balls: [
        { x: 518, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Long Run",
      tip: undefined,
      ink: 190,
      faucet: { x: 480, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 480, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 285.6, y: 449.8, w: 340, h: 16, kind: 'teal', angle: 0.3 }),
      ],
      balls: [
        { x: 298, y: 385.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Wedge",
      tip: undefined,
      ink: 190,
      faucet: { x: 900, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 900, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 731.4, y: 469.4, w: 280, h: 16, kind: 'teal', angle: 0.22 }),
      ],
      balls: [
        { x: 718, y: 398.3, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Steep Gate",
      tip: undefined,
      ink: 120,
      faucet: { x: 940, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 940, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 795.3, y: 458.9, w: 240, h: 16, kind: 'teal', angle: 0.35 }),
      ],
      balls: [
        { x: 758, y: 376.7, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Off The Sill",
      tip: undefined,
      ink: 120,
      faucet: { x: 780, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 780, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 603, y: 400.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
      ],
      balls: [
        { x: 598, y: 330.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Ladle",
      tip: undefined,
      ink: 280,
      faucet: { x: 560, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 560, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 414.9, y: 460, w: 240, h: 16, kind: 'teal', angle: 0.34 }),
      ],
      balls: [
        { x: 378, y: 378.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Straight Face",
      tip: undefined,
      ink: 190,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 433.2, y: 457.2, w: 360, h: 16, kind: 'teal', angle: 0.24 }),
      ],
      balls: [
        { x: 458, y: 395.1, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Ball",
      tip: undefined,
      ink: 120,
      faucet: { x: 860, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 860, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 684.7, y: 394.7, w: 300, h: 16, kind: 'teal', angle: 0.3 }),
      ],
      balls: [
        { x: 678, y: 324.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Short Drop",
      tip: undefined,
      ink: 120,
      faucet: { x: 420, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 420, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 274.5, y: 461.1, w: 240, h: 16, kind: 'teal', angle: 0.33 }),
      ],
      balls: [
        { x: 238, y: 380.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Pin Trick",
      tip: undefined,
      ink: 190,
      faucet: { x: 560, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 560, y: 580, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 383, y: 420.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
      ],
      balls: [
        { x: 378, y: 350.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Twin Glasses",
      tip: undefined,
      ink: 480,
      faucet: { x: 610, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 460, y: 621, w: 108, h: 118, need: 0.5 },
        { x: 760, y: 621, w: 104, h: 118, need: 0.35 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 283, y: 461.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
      ],
      crates: [
        { x: 258, y: 605, w: 100, h: 190, kind: 'wood' },
      ],
      balls: [
        { x: 278, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Spout Left",
      tip: undefined,
      ink: 540,
      faucet: { x: 480, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 780, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 957, y: 461.4, w: 300, h: 16, kind: 'teal', angle: -0.26 }),
      ],
      crates: [
        { x: 480, y: 590, w: 100, h: 180, kind: 'wood' },
      ],
      balls: [
        { x: 962, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Spout Right",
      tip: undefined,
      ink: 540,
      faucet: { x: 800, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 500, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 323, y: 461.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
      ],
      crates: [
        { x: 800, y: 590, w: 100, h: 180, kind: 'wood' },
      ],
      balls: [
        { x: 318, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Spout Wire",
      tip: undefined,
      ink: 610,
      faucet: { x: 960, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 660, y: 580, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 483, y: 420.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
        P({ x: 660, y: 673, w: 180, h: 70, kind: 'wood' }),
      ],
      crates: [
        { x: 960, y: 590, w: 100, h: 180, kind: 'wood' },
      ],
      balls: [
        { x: 478, y: 350.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Two Mouths",
      tip: undefined,
      ink: 560,
      faucet: { x: 770, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 620, y: 621, w: 108, h: 118, need: 0.5 },
        { x: 920, y: 621, w: 104, h: 118, need: 0.35 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 443, y: 461.4, w: 300, h: 16, kind: 'teal', angle: 0.26 }),
      ],
      balls: [
        { x: 438, y: 391.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Long Chute",
      tip: undefined,
      ink: 130,
      faucet: { x: 640, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 640, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 412.4, y: 458.3, w: 400, h: 16, kind: 'teal', angle: 0.21 }),
      ],
      balls: [
        { x: 458, y: 399.8, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Plinth",
      tip: undefined,
      ink: 190,
      faucet: { x: 700, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 700, y: 500, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 523.8, y: 337.5, w: 300, h: 16, kind: 'teal', angle: 0.28 }),
      ],
      balls: [
        { x: 518, y: 267.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Hanging Low",
      tip: undefined,
      ink: 190,
      faucet: { x: 460, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 460, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 294.7, y: 396.3, w: 280, h: 16, kind: 'teal', angle: 0.31 }),
      ],
      balls: [
        { x: 278, y: 322.6, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Left Wedge",
      tip: undefined,
      ink: 120,
      faucet: { x: 300, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 300, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 475.3, y: 455.7, w: 300, h: 16, kind: 'teal', angle: -0.3 }),
      ],
      balls: [
        { x: 482, y: 385.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Hanging Pin",
      tip: undefined,
      ink: 120,
      faucet: { x: 820, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 820, y: 540, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 644.3, y: 376.1, w: 300, h: 16, kind: 'teal', angle: 0.29 }),
      ],
      balls: [
        { x: 638, y: 305.9, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Trough Run",
      tip: undefined,
      ink: 190,
      faucet: { x: 760, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 760, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 553.6, y: 455.5, w: 360, h: 16, kind: 'teal', angle: 0.25 }),
      ],
      balls: [
        { x: 578, y: 393.4, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "The Rim",
      tip: undefined,
      ink: 190,
      faucet: { x: 1000, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 1000, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 823.8, y: 458.5, w: 300, h: 16, kind: 'teal', angle: 0.28 }),
      ],
      balls: [
        { x: 818, y: 388.5, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Far Wedge",
      tip: undefined,
      ink: 140,
      faucet: { x: 240, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 240, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 405.3, y: 457.3, w: 280, h: 16, kind: 'teal', angle: -0.31 }),
      ],
      balls: [
        { x: 422, y: 383.6, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Hanging Rim",
      tip: undefined,
      ink: 130,
      faucet: { x: 900, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 900, y: 540, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 713.8, y: 376.3, w: 320, h: 16, kind: 'teal', angle: 0.27 }),
      ],
      balls: [
        { x: 718, y: 309.2, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Last Light",
      tip: undefined,
      ink: 190,
      faucet: { x: 600, y: 170, rate: 26, total: 110 },
      glasses: [
        { x: 600, y: 600, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 423.8, y: 437.5, w: 300, h: 16, kind: 'teal', angle: 0.28 }),
        P({ x: 600, y: 693, w: 180, h: 70, kind: 'wood' }),
      ],
      balls: [
        { x: 418, y: 367.5, r: 26, kind: 'heavy' },
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
