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
      name: "First Pour",
      tip: "Two planks, one gap. Rest the line across them and let gravity do the rest.",
      ink: 800,
      faucet: { x: 400, y: 160, rate: 26, total: 90 },
      glasses: [
        { x: 880, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 470, y: 330, w: 230, h: 14, kind: 'teal', angle: 0.1 }),
        P({ x: 700, y: 392, w: 190, h: 14, kind: 'teal', angle: 0.1 }),
      ],
    },
    {
      name: "The Weight",
      tip: "A ball hangs over the gap. Whatever you draw, it will land on.",
      ink: 800,
      faucet: { x: 400, y: 160, rate: 26, total: 90 },
      glasses: [
        { x: 880, y: 470, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 470, y: 330, w: 230, h: 14, kind: 'teal', angle: 0.1 }),
        P({ x: 700, y: 392, w: 190, h: 14, kind: 'teal', angle: 0.1 }),
      ],
      balls: [
        { x: 660, y: 250, r: 22, kind: 'heavy' },
      ],
    },
    {
      name: "The Staircase",
      tip: "Three steps down. Join the top step to the bottom one; do not draw a new staircase.",
      ink: 680,
      faucet: { x: 420, y: 150, rate: 26, total: 90 },
      glasses: [
        { x: 1040, y: 500, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 420, y: 250, w: 170, h: 14, kind: 'teal' }),
        P({ x: 700, y: 330, w: 150, h: 14, kind: 'teal' }),
        P({ x: 890, y: 400, w: 130, h: 14, kind: 'teal' }),
      ],
    },
    {
      name: "The Wedge",
      tip: "The slope on the page is free. Get the water onto it.",
      ink: 1020,
      faucet: { x: 470, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1060, y: 540, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 470, y: 300, w: 170, h: 14, kind: 'teal' }),
        P({ poly: [[640, 372], [1010, 452], [1010, 500], [640, 420]], kind: 'teal' }),
      ],
    },
    {
      name: "The Gap",
      tip: "Three hundred pixels of nothing. One line, both ends on wood.",
      ink: 850,
      faucet: { x: 380, y: 160, rate: 26, total: 90 },
      glasses: [
        { x: 1040, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 380, y: 300, w: 190, h: 14, kind: 'teal' }),
        P({ x: 860, y: 372, w: 180, h: 14, kind: 'teal' }),
      ],
    },
    {
      name: "The Column",
      tip: "A column stands between you and the glass. Use its top, not its side.",
      ink: 450,
      faucet: { x: 420, y: 150, rate: 26, total: 90 },
      glasses: [
        { x: 850, y: 500, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 420, y: 280, w: 180, h: 14, kind: 'teal' }),
        P({ x: 700, y: 500, w: 44, h: 260, kind: 'teal' }),
        P({ x: 700, y: 366, w: 96, h: 16, kind: 'teal' }),
      ],
    },
    {
      name: "The Chimney",
      tip: "Two walls and one way in. Deliver the water to the top of the channel.",
      ink: 730,
      faucet: { x: 440, y: 150, rate: 26, total: 90 },
      glasses: [
        { x: 800, y: 600, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 440, y: 260, w: 170, h: 14, kind: 'teal' }),
        P({ x: 750, y: 470, w: 18, h: 180, kind: 'teal' }),
        P({ x: 850, y: 470, w: 18, h: 180, kind: 'teal' }),
      ],
    },
    {
      name: "Step Down",
      tip: "A shelf hangs above the glass. Get the water past it, not through it.",
      ink: 530,
      faucet: { x: 400, y: 160, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 520, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 400, y: 290, w: 180, h: 14, kind: 'teal' }),
        P({ x: 740, y: 380, w: 200, h: 16, kind: 'teal' }),
      ],
    },
    {
      name: "The Notch",
      tip: "A slab with a hole in it, and the glass right underneath. The hole is wide — the approach is the puzzle.",
      ink: 640,
      faucet: { x: 420, y: 150, rate: 26, total: 90 },
      glasses: [
        { x: 740, y: 470, w: 132, h: 112, need: 0.55 },
      ],
      platforms: [
        P({ x: 420, y: 270, w: 170, h: 14, kind: 'teal' }),
        P({ x: 600, y: 360, w: 150, h: 20, kind: 'teal' }),
        P({ x: 900, y: 360, w: 180, h: 20, kind: 'teal' }),
      ],
    },
    {
      name: "The Long Drop",
      tip: "A high tap and a low glass. The steeper the line, the further the water flies.",
      ink: 440,
      faucet: { x: 470, y: 130, rate: 26, total: 90 },
      glasses: [
        { x: 940, y: 560, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 470, y: 250, w: 190, h: 14, kind: 'teal' }),
        P({ x: 760, y: 300, w: 150, h: 14, kind: 'teal', angle: 0.16 }),
      ],
    },
    {
      name: "Over The Wall",
      tip: "A wall stands in the way. Go over it, not into it.",
      ink: 690,
      faucet: { x: 420, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 520, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 420, y: 300, w: 190, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 790, y: 350, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 700, y: 420, w: 26, h: 170, kind: 'teal' }),
      ],
    },
    {
      name: "Under The Shelf",
      tip: "A wide shelf hangs over the approach, not the mouth. Come in low and early.",
      ink: 680,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 950, y: 560, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 790, y: 410, w: 150, h: 14, kind: 'teal', angle: 0.16 }),
        P({ x: 580, y: 265, w: 210, h: 18, kind: 'teal' }),
      ],
    },
    {
      name: "The Funnel",
      tip: "Two angled walls narrowing to a mouth.",
      ink: 480,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 860, y: 600, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 700, y: 360, w: 150, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 860, y: 470, w: 18, h: 150, kind: 'teal', angle: 0.4 }),
      ],
    },
    {
      name: "Crate Stack",
      tip: "Two crates and a plank. The crate tops are rests too.",
      ink: 710,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 560, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 300, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 760, y: 420, w: 150, h: 14, kind: 'teal', angle: 0.1 }),
      ],
      crates: [
        { x: 700, y: 470, size: 96, kind: 'wood' },
        { x: 800, y: 390, size: 80, kind: 'wood' },
      ],
    },
    {
      name: "Ice Run",
      tip: "A slick block sits under the gap. Water cannot run on it, so the line must span it.",
      ink: 810,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 560, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 790, y: 400, w: 150, h: 14, kind: 'teal', angle: 0.15 }),
      ],
      crates: [
        { x: 630, y: 520, size: 120, kind: 'ice' },
      ],
    },
    {
      name: "The Sill",
      tip: "A narrow sill juts out under the pour. One line, two contacts.",
      ink: 740,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 930, y: 560, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 790, y: 380, w: 60, h: 14, kind: 'teal' }),
      ],
    },
    {
      name: "Stone Step",
      tip: "Two stone blocks stand under the run. Their tops are flat rests for the wire.",
      ink: 760,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 960, y: 560, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 880, y: 470, w: 150, h: 14, kind: 'teal', angle: 0.1 }),
      ],
      crates: [
        { x: 600, y: 360, size: 120, kind: 'stone' },
        { x: 760, y: 440, size: 120, kind: 'stone' },
      ],
    },
    {
      name: "The Trench",
      tip: "The glass sits in a trench. Reach over the lip.",
      ink: 560,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 620, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 760, y: 390, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 800, y: 500, w: 20, h: 190, kind: 'teal' }),
        P({ x: 1020, y: 500, w: 20, h: 190, kind: 'teal' }),
      ],
    },
    {
      name: "The Ledge",
      tip: "A long ledge, then nothing. End the line and let the water fly.",
      ink: 710,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 570, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 300, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 760, y: 390, w: 140, h: 14, kind: 'teal', angle: 0.1 }),
      ],
    },
    {
      name: "Split Sill",
      tip: "Two sills with a gap between them. Aim the water through the gap, not at the glass.",
      ink: 530,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 820, y: 620, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 600, y: 430, w: 140, h: 18, kind: 'teal' }),
        P({ x: 1010, y: 430, w: 170, h: 18, kind: 'teal' }),
      ],
    },
    {
      name: "Dead Weight",
      tip: "A heavy ball hangs over the gap. Whatever you draw, it lands on.",
      ink: 750,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 970, y: 540, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 300, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 700, y: 240, r: 22, kind: 'heavy' },
      ],
    },
    {
      name: "Ball And Glass",
      tip: "The ball is aimed at the glass. Stop it.",
      ink: 830,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 980, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 790, y: 390, w: 150, h: 14, kind: 'teal', angle: 0.14 }),
      ],
      balls: [
        { x: 980, y: 230, r: 22, kind: 'heavy' },
      ],
    },
    {
      name: "Rubber Ball",
      tip: "A light ball bounces off whatever you draw. Use the bounce.",
      ink: 700,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 970, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 300, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 780, y: 400, w: 150, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 720, y: 230, r: 17, kind: 'light' },
      ],
    },
    {
      name: "The Brace",
      tip: "A heavy ball sits mid-air. The wire can run over it.",
      ink: 890,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 700, y: 340, r: 20, kind: 'heavy' },
      ],
    },
    {
      name: "Ball Run",
      tip: "A ball on a sloping plank. It is coming down whether you like it or not.",
      ink: 710,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1030, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 760, y: 340, w: 200, h: 14, kind: 'teal', angle: 0.18 }),
      ],
      balls: [
        { x: 770, y: 270, r: 20, kind: 'heavy' },
      ],
    },
    {
      name: "Two Weights",
      tip: "A heavy one and a light one. They behave nothing alike.",
      ink: 810,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 990, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 150, h: 14, kind: 'teal', angle: 0.13 }),
      ],
      balls: [
        { x: 660, y: 230, r: 22, kind: 'heavy' },
        { x: 900, y: 260, r: 16, kind: 'light' },
      ],
    },
    {
      name: "The Plug",
      tip: "The gap under the sill fits a ball exactly.",
      ink: 810,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 930, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 400, w: 150, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 700, y: 300, r: 22, kind: 'heavy' },
      ],
    },
    {
      name: "Ball Trap",
      tip: "A bowl of scenery. The ball falls in, the water goes over.",
      ink: 780,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 390, w: 150, h: 14, kind: 'teal', angle: 0.13 }),
      ],
      balls: [
        { x: 760, y: 250, r: 19, kind: 'light' },
      ],
    },
    {
      name: "Heavy Lid",
      tip: "A heavy ball rests above the plinth. Pour past it — and do not knock it into the glass.",
      ink: 830,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1060, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 390, w: 150, h: 14, kind: 'teal', angle: 0.14 }),
      ],
      crates: [
        { x: 900, y: 500, size: 110, kind: 'stone' },
      ],
      balls: [
        { x: 900, y: 250, r: 22, kind: 'heavy' },
      ],
    },
    {
      name: "The Keeper",
      tip: "Everything loose in this room ends up in the glass. Keep it out.",
      ink: 680,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 980, y: 580, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 770, y: 370, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 680, y: 220, r: 22, kind: 'heavy' },
        { x: 880, y: 230, r: 16, kind: 'light' },
      ],
    },
    {
      name: "Crosswind",
      tip: "The blower pushes the stream sideways. Get above it.",
      ink: 640,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 980, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      fans: [
        { x: 700, y: 250, w: 120, h: 60, angle: 0, force: 0.12, dir: -1 },
      ],
    },
    {
      name: "Wind Shadow",
      tip: "Stand in the lee of the block and the wind cannot touch the water.",
      ink: 860,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 990, y: 570, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 390, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 560, y: 330, w: 90, h: 20, kind: 'teal' }),
      ],
      fans: [
        { x: 640, y: 230, w: 110, h: 60, angle: 0, force: 0.13, dir: -1 },
      ],
    },
    {
      name: "Updraft",
      tip: "This blower points up. It slows the water instead of pushing it aside.",
      ink: 550,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 950, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 760, y: 380, w: 170, h: 14, kind: 'teal', angle: 0.13 }),
      ],
      fans: [
        { x: 650, y: 470, w: 140, h: 70, angle: 0, force: 0.09, dir: 1 },
      ],
    },
    {
      name: "Fan And Ball",
      tip: "Wind and a loose weight, both aimed at the same corridor.",
      ink: 810,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 770, y: 370, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 900, y: 230, r: 19, kind: 'heavy' },
      ],
      fans: [
        { x: 680, y: 220, w: 110, h: 60, angle: 0, force: 0.1, dir: -1 },
      ],
    },
    {
      name: "The Drift",
      tip: "A long corridor with wind across it. The line is the only shelter.",
      ink: 790,
      faucet: { x: 420, y: 140, rate: 26, total: 90 },
      glasses: [
        { x: 1080, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 420, y: 280, w: 170, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 360, w: 220, h: 14, kind: 'teal', angle: 0.11 }),
      ],
      fans: [
        { x: 560, y: 210, w: 120, h: 60, angle: 0, force: 0.085, dir: 1 },
      ],
    },
    {
      name: "Two Blowers",
      tip: "Wind from both sides. There is a still pocket in the middle.",
      ink: 800,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 980, y: 570, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 370, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      fans: [
        { x: 600, y: 220, w: 100, h: 60, angle: 0, force: 0.09, dir: -1 },
        { x: 900, y: 250, w: 100, h: 60, angle: 0, force: 0.09, dir: 1 },
      ],
    },
    {
      name: "Hot Plate",
      tip: "Heat under the gap. Anything that misses is gone, not pooled.",
      ink: 720,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 970, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      hots: [
        { x: 700, y: 650, w: 320, h: 26 },
      ],
    },
    {
      name: "Steam Room",
      tip: "Two hot plates and a short run. Keep every drop in the air.",
      ink: 730,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 570, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 370, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      hots: [
        { x: 620, y: 650, w: 240, h: 26 },
        { x: 920, y: 650, w: 240, h: 26 },
      ],
    },
    {
      name: "The Lid",
      tip: "A pinned bar hangs over the mouth. It turns when hit; your line will not.",
      ink: 720,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 970, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      spinners: [
        { x: 900, y: 330, w: 190, h: 16, speed: 0 },
      ],
    },
    {
      name: "Weather",
      tip: "Wind and heat together. Keep the water off the floor and on course.",
      ink: 730,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 570, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 780, y: 370, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      hots: [
        { x: 760, y: 650, w: 300, h: 26 },
      ],
      fans: [
        { x: 660, y: 220, w: 110, h: 60, angle: 0, force: 0.09, dir: -1 },
      ],
    },
    {
      name: "Glass On A Slope",
      tip: "The glass stands on a slope and it will slide.",
      ink: 800,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 950, y: 540, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 930, y: 600, w: 260, h: 16, kind: 'teal', angle: 0.07 }),
      ],
    },
    {
      name: "Glass In A Gap",
      tip: "The glass hangs in a gap between two walls. Hold it and fill it.",
      ink: 710,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 760, y: 380, w: 170, h: 13, kind: 'teal', angle: 0.12 }),
        P({ x: 790, y: 470, w: 18, h: 180, kind: 'teal' }),
        P({ x: 1130, y: 470, w: 18, h: 180, kind: 'teal' }),
      ],
    },
    {
      name: "Edge Of The World",
      tip: "The glass is one nudge from a long fall.",
      ink: 800,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 540, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 370, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 990, y: 600, w: 180, h: 18, kind: 'teal' }),
      ],
    },
    {
      name: "The Narrow Neck",
      tip: "A mouth the width of a droplet. Aim, do not pour.",
      ink: 580,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 620, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 830, y: 470, w: 22, h: 180, kind: 'teal' }),
        P({ x: 970, y: 470, w: 22, h: 180, kind: 'teal' }),
      ],
    },
    {
      name: "Tipping Point",
      tip: "A glass on a seesaw. Weight on the line tips it.",
      ink: 700,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 960, y: 530, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "Cup On A Column",
      tip: "The glass balances on a column. Anything landing on it is a problem.",
      ink: 670,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 920, y: 470, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 920, y: 540, w: 90, h: 130, kind: 'teal' }),
      ],
    },
    {
      name: "Hands Off",
      tip: "Nothing under the glass but air. Catch it, then fill it.",
      ink: 750,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 980, y: 520, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "Low Ceiling",
      tip: "A slab just above the mouth. The line has to stop short.",
      ink: 610,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 960, y: 600, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 370, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 1160, y: 470, w: 200, h: 18, kind: 'teal' }),
      ],
    },
    {
      name: "Deep Cup",
      tip: "A tall glass and a short drop. Too steep and it sprays past.",
      ink: 680,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 950, y: 560, w: 100, h: 140, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 150, h: 14, kind: 'teal', angle: 0.14 }),
      ],
    },
    {
      name: "The Exam",
      tip: "A glass on a slope, a loose weight, one line. Both have to be handled.",
      ink: 670,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 990, y: 530, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 770, y: 370, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 960, y: 600, w: 280, h: 16, kind: 'teal', angle: 0.07 }),
        P({ x: 1112, y: 570, w: 18, h: 46, kind: 'teal' }),
      ],
      balls: [
        { x: 800, y: 220, r: 19, kind: 'light' },
      ],
    },
    {
      name: "Twin Taps",
      tip: "Two taps, one glass. The line has to serve the one that is running.",
      ink: 750,
      faucets: [
        { x: 430, y: 170, rate: 26, total: 90 },
        { x: 1150, y: 190, rate: 26, total: 90 },
      ],
      glasses: [
        { x: 980, y: 570, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "Second Spout",
      tip: "A second spout pours into the same room. It is not your friend.",
      ink: 690,
      faucets: [
        { x: 430, y: 170, rate: 26, total: 90 },
        { x: 760, y: 170, rate: 26, total: 90 },
      ],
      glasses: [
        { x: 1020, y: 580, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 390, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "Overflow",
      tip: "Fill the first glass and the rest spills into the second.",
      ink: 630,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 540, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 760, y: 390, w: 150, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "Two Glasses",
      tip: "One stream, two mouths. The line decides which one gets fed.",
      ink: 530,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 560, w: 112, h: 112, need: 0.45 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 170, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 760, y: 370, w: 150, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "Hands And Pins",
      tip: "A pinned bar hangs across the corridor. Jam it or go under it.",
      ink: 680,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 390, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      spinners: [
        { x: 720, y: 260, w: 170, h: 16, speed: 0 },
      ],
    },
    {
      name: "Rejoin",
      tip: "Two corridors, one glass. Pick the one the tap can feed.",
      ink: 690,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1020, y: 560, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 930, y: 440, w: 150, h: 16, kind: 'teal' }),
      ],
    },
    {
      name: "Long Arm",
      tip: "Everything is far apart. A span this long needs a bearing in the middle.",
      ink: 980,
      faucet: { x: 420, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1080, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 420, y: 270, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 620, y: 306, w: 110, h: 14, kind: 'teal' }),
        P({ x: 820, y: 330, w: 240, h: 14, kind: 'teal', angle: 0.1 }),
      ],
    },
    {
      name: "Lever",
      tip: "A seesaw under the drop. Put the water on the heavy end.",
      ink: 740,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 560, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "The Pivot",
      tip: "A bar on a pin. It stays still until something hits it, and then it does not.",
      ink: 720,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 940, y: 580, w: 108, h: 118, need: 0.52 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      spinners: [
        { x: 700, y: 470, w: 180, h: 16, speed: 0 },
      ],
    },
    {
      name: "Halfway Exam",
      tip: "Two taps, a pivot and a narrow mouth. Nothing new, everything harder.",
      ink: 520,
      faucets: [
        { x: 430, y: 170, rate: 26, total: 90 },
        { x: 1140, y: 170, rate: 26, total: 90 },
      ],
      glasses: [
        { x: 940, y: 580, w: 116, h: 118, need: 0.38 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 770, y: 370, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      spinners: [
        { x: 700, y: 470, w: 160, h: 16, speed: 0 },
      ],
    },
    {
      name: "The Machine Room",
      tip: "Wind, heat and a weighted ball. One line, all three.",
      ink: 990,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1120, y: 520, w: 104, h: 124, need: 0.48 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 820, y: 360, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 950, y: 220, r: 19, kind: 'heavy' },
      ],
      hots: [
        { x: 800, y: 650, w: 320, h: 26 },
      ],
      fans: [
        { x: 650, y: 220, w: 110, h: 60, angle: 0, force: 0.1, dir: -1 },
      ],
    },
    {
      name: "Narrow World",
      tip: "A chimney, a blower and a glass in the middle of it all.",
      ink: 480,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 620, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 370, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 820, y: 500, w: 18, h: 180, kind: 'teal' }),
        P({ x: 980, y: 500, w: 18, h: 180, kind: 'teal' }),
      ],
      fans: [
        { x: 600, y: 230, w: 110, h: 60, angle: 0, force: 0.1, dir: 1 },
      ],
    },
    {
      name: "Slippery When Wet",
      tip: "Ice everywhere and a glass on a slope. Speed is the enemy.",
      ink: 670,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 960, y: 540, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 770, y: 370, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 950, y: 610, w: 250, h: 16, kind: 'teal', angle: 0.07 }),
      ],
      crates: [
        { x: 1120, y: 470, size: 110, kind: 'ice' },
      ],
    },
    {
      name: "Needle",
      tip: "A mouth the width of your line. Precision only.",
      ink: 570,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 980, y: 590, w: 92, h: 118, need: 0.45 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 380, w: 160, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 1170, y: 460, w: 150, h: 16, kind: 'teal' }),
      ],
    },
    {
      name: "Two Storeys",
      tip: "A shelf above the glass, wind below it. Two problems, one stroke.",
      ink: 580,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1000, y: 600, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 280, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 370, w: 190, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 1180, y: 470, w: 180, h: 18, kind: 'teal' }),
      ],
      fans: [
        { x: 700, y: 470, w: 110, h: 60, angle: 0, force: 0.1, dir: -1 },
      ],
    },
    {
      name: "The Gauntlet",
      tip: "Hot plate, pinned bar, weighted ball. One careful line.",
      ink: 770,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1050, y: 580, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 270, w: 180, h: 14, kind: 'teal', angle: 0.14 }),
        P({ x: 800, y: 360, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 990, y: 210, r: 19, kind: 'heavy' },
      ],
      hots: [
        { x: 700, y: 650, w: 300, h: 26 },
      ],
      spinners: [
        { x: 920, y: 470, w: 170, h: 16, speed: 0 },
      ],
    },
    {
      name: "Uphill",
      tip: "The glass is higher than the last support. The water has to fly.",
      ink: 970,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 470, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 290, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 790, y: 380, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
      ],
    },
    {
      name: "The Vault",
      tip: "A slab overhead with a hole in it. Everything goes through.",
      ink: 580,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 900, y: 620, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 270, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 780, y: 360, w: 170, h: 14, kind: 'teal', angle: 0.12 }),
        P({ x: 660, y: 470, w: 200, h: 18, kind: 'teal' }),
      ],
    },
    {
      name: "Last Light",
      tip: "Wind, a pivot and a glass that will not stand still.",
      ink: 650,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1010, y: 580, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 270, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 790, y: 360, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      fans: [
        { x: 660, y: 470, w: 110, h: 60, angle: 0, force: 0.1, dir: 1 },
      ],
      spinners: [
        { x: 930, y: 450, w: 160, h: 16, speed: 0 },
      ],
    },
    {
      name: "Grand Finale",
      tip: "Everything the game has taught, in one room. One line, one chance.",
      ink: 880,
      faucet: { x: 430, y: 170, rate: 26, total: 90 },
      glasses: [
        { x: 1030, y: 600, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 430, y: 270, w: 180, h: 14, kind: 'teal', angle: 0.13 }),
        P({ x: 800, y: 360, w: 180, h: 14, kind: 'teal', angle: 0.12 }),
      ],
      balls: [
        { x: 930, y: 200, r: 19, kind: 'heavy' },
      ],
      hots: [
        { x: 790, y: 650, w: 280, h: 26 },
      ],
      fans: [
        { x: 650, y: 210, w: 110, h: 60, angle: 0, force: 0.1, dir: -1 },
      ],
      spinners: [
        { x: 870, y: 450, w: 150, h: 14, speed: 0 },
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
