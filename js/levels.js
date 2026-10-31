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
      name: "The Pitch",
      tip: "It comes in high and flat. A post in its lane costs less than a wall.",
      ink: 420,
      delay: 1.6,
      faucet: { x: 410, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 410, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 150, y: 360, r: 26, kind: 'heavy', vx: 10 },
      ],
    },
    {
      name: "Underhand",
      tip: "A slow underhand throw — it drops early. Meet it where it lands, not where it is aimed.",
      ink: 220,
      delay: 1.6,
      faucet: { x: 350, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 350, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 150, y: 470, r: 26, kind: 'heavy', vx: 9 },
      ],
    },
    {
      name: "Flat Throw",
      tip: "Fast and level. The cup is far down its lane; put something in the lane.",
      ink: 240,
      delay: 1.6,
      faucet: { x: 530, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 530, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 160, y: 300, r: 26, kind: 'heavy', vx: 12 },
      ],
    },
    {
      name: "The Lob",
      tip: "It is lobbed. The arc is wide, and the cup sits under the far side of it.",
      ink: 250,
      delay: 1.6,
      faucet: { x: 350, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 350, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 170, y: 520, r: 26, kind: 'heavy', vx: 8, vy: -4 },
      ],
    },
    {
      name: "Long Shot",
      tip: "A long throw crosses the whole room. Height beats strength here.",
      ink: 540,
      delay: 1.6,
      faucet: { x: 545, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 545, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 130, y: 330, r: 26, kind: 'heavy', vx: 14 },
      ],
    },
    {
      name: "Low Pitch",
      tip: "The ball pitches down off the sill. Give it a pocket to sit in.",
      ink: 660,
      delay: 2.2,
      faucet: { x: 665, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 665, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 530, y: 470, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 680, y: 440, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Toss",
      tip: "Tossed straight up and forgotten. It comes down somewhere specific.",
      ink: 250,
      delay: 1.6,
      faucet: { x: 425, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 425, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 200, y: 560, r: 26, kind: 'heavy', vx: 10, vy: -6 },
      ],
    },
    {
      name: "Cross Fire",
      tip: "The throw comes from the right. Learn to draw backwards.",
      ink: 250,
      delay: 1.6,
      faucet: { x: 800, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 800, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 1120, y: 400, r: 26, kind: 'heavy', vx: -10 },
      ],
    },
    {
      name: "Backhand",
      tip: "A backhand, low and flat, with the tap pouring behind you.",
      ink: 220,
      delay: 1.6,
      faucet: { x: 875, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 875, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 1140, y: 470, r: 26, kind: 'heavy', vx: -11 },
      ],
    },
    {
      name: "Backhand Lob",
      tip: "Lobbed from the right. The water starts before the ball has finished falling.",
      ink: 250,
      delay: 1.6,
      faucet: { x: 860, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 860, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 1100, y: 520, r: 26, kind: 'heavy', vx: -8, vy: -4 },
      ],
    },
    {
      name: "Sidearm",
      tip: "A hard sidearm from the right. Stop it high, then let the tap run.",
      ink: 430,
      delay: 1.6,
      faucet: { x: 725, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 725, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 1160, y: 340, r: 26, kind: 'heavy', vx: -13 },
      ],
    },
    {
      name: "Sinker",
      tip: "The sinker drops as it arrives. Flat ground work will not do.",
      ink: 540,
      delay: 1.6,
      faucet: { x: 410, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 410, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
      ],
      balls: [
        { x: 180, y: 300, r: 26, kind: 'heavy', vx: 11, vy: 5 },
      ],
    },
    {
      name: "The Drop",
      tip: "It tips off the sill and falls straight for the mouth. Catch it in the air.",
      ink: 370,
      delay: 2.2,
      faucet: { x: 755, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 755, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 610, y: 300, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 760, y: 270, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Sill",
      tip: "High sill, short drop. The ball is quicker than your line.",
      ink: 350,
      delay: 2.2,
      faucet: { x: 740, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 740, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 590, y: 240, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 740, y: 210, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Low Sill",
      tip: "A low sill, so the fall is short and the ball is on you at once.",
      ink: 660,
      delay: 2.2,
      faucet: { x: 710, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 710, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 570, y: 420, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 720, y: 390, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Narrow Sill",
      tip: "A narrow shelf sheds the ball sideways. Learn the direction first.",
      ink: 380,
      delay: 2.2,
      faucet: { x: 770, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 770, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 660, y: 340, w: 200, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 780, y: 310, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Left Sill",
      tip: "The sill reaches in from the far side. So does the ball.",
      ink: 430,
      delay: 2.2,
      faucet: { x: 455, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 455, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 690, y: 320, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 540, y: 290, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Far Sill",
      tip: "It leaves a distant sill with room to pick up speed.",
      ink: 310,
      delay: 2.2,
      faucet: { x: 815, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 815, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 670, y: 380, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 820, y: 350, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Overhang",
      tip: "The sill overhangs the cup. The ball is already past the rim when you see it.",
      ink: 660,
      delay: 2.2,
      faucet: { x: 785, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 785, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 650, y: 260, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 800, y: 230, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Sill Trap",
      tip: "The sill is set so the ball rides in against the wall. Use the wall.",
      ink: 370,
      delay: 2.2,
      faucet: { x: 695, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 695, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 560, y: 360, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 710, y: 330, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Long Drop",
      tip: "Dropped from a height, well past the cup. Deflect, do not block.",
      ink: 200,
      delay: 2.2,
      faucet: { x: 800, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 800, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 570, y: 210, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 720, y: 180, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "High Drop",
      tip: "The highest sill in the set. You have less time than you think.",
      ink: 260,
      delay: 2.2,
      faucet: { x: 740, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 740, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 490, y: 160, w: 260, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 640, y: 130, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Quick Drop",
      tip: "Low and close: the ball barely falls before it reaches the mouth.",
      ink: 230,
      delay: 2.2,
      faucet: { x: 830, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 830, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 720, y: 450, w: 220, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 850, y: 420, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Left Drop",
      tip: "The sill comes in from the right this time.",
      ink: 240,
      delay: 2.2,
      faucet: { x: 515, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 515, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 770, y: 330, w: 300, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 600, y: 300, r: 26, kind: 'heavy' },
      ],
    },
    {
      name: "Last Drop",
      tip: "The last one falls, the tap opens late, and the mouth is wide open.",
      ink: 310,
      delay: 2.2,
      faucet: { x: 710, y: 210, rate: 24, total: 110 },
      glasses: [
        { x: 710, y: 621, w: 108, h: 118, need: 0.5 },
      ],
      platforms: [
        P({ x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }),
        P({ x: 570, y: 330, w: 240, h: 16, kind: 'wood' }),
      ],
      balls: [
        { x: 710, y: 300, r: 26, kind: 'heavy' },
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
