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

   `ink` is the ink budget measured in world pixels of line length.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;

  const P = (o) => Object.assign({ kind: 'wood', angle: 0 }, o);

  const LEVELS = [
    {
      name: "First Pour",
      tip: "Lay the line across both rests so it cannot tip. Then let the tap run.",
      ink: 430,
      faucet: { x: 450, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 830, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 830, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 479, y: 286, w: 70, h: 14, kind: 'wood' }),
        P({ x: 687, y: 347, w: 70, h: 14, kind: 'wood' }),
      ],
    },
    {
      name: "A Gentle Slope",
      tip: "A tall tap and a deep glass. Three short rests hold a long line better than two long ones.",
      ink: 700,
      faucet: { x: 400, y: 158, rate: 26, total: 121 },
      glasses: [
        { x: 880, y: 512, w: 112, h: 132, need: 0.56 },
      ],
      platforms: [
        P({ x: 880, y: 587, w: 156, h: 18, kind: 'stone' }),
        P({ x: 350, y: 293, w: 70, h: 14, kind: 'wood' }),
        P({ x: 524, y: 344, w: 70, h: 14, kind: 'wood' }),
        P({ x: 708, y: 397, w: 70, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 640, y: 670, w: 300, h: 26 },
      ],
    },
    {
      name: "Small Step",
      tip: "The glass sits low. Give the line a shallow run and let it finish the drop.",
      ink: 560,
      faucet: { x: 465, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 815, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 815, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 429, y: 320, w: 30, h: 12, kind: 'wood' }),
        P({ x: 703, y: 387, w: 30, h: 12, kind: 'wood' }),
      ],
    },
    {
      name: "Over The Wall",
      tip: "A block stands in the way of a straight ramp. Go over it.",
      ink: 670,
      faucet: { x: 405, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 875, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 875, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 383, y: 290, w: 92, h: 14, kind: 'wood' }),
        P({ x: 713, y: 369, w: 92, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 640, y: 660, size: 92, kind: 'teal' },
      ],
    },
    {
      name: "Twin Falls",
      tip: "One tap, two glasses. Peak the line in the middle and the stream divides itself.",
      ink: 880,
      faucet: { x: 640, y: 150, rate: 26, total: 82 },
      glasses: [
        { x: 310, y: 470, w: 104, h: 118, need: 0.42 },
        { x: 970, y: 470, w: 104, h: 118, need: 0.42 },
      ],
      platforms: [
        P({ x: 310, y: 538, w: 148, h: 18, kind: 'wood' }),
        P({ x: 970, y: 538, w: 148, h: 18, kind: 'wood' }),
        P({ x: 479, y: 326, w: 70, h: 14, kind: 'wood' }),
        P({ x: 801, y: 326, w: 70, h: 14, kind: 'wood' }),
      ],
    },
    {
      name: "Crate & Glass",
      tip: "The crate is a rest as well as an obstacle. Use its top.",
      ink: 610,
      faucet: { x: 440, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 840, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 840, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 453, y: 370, w: 156, h: 20, kind: 'wood' }),
        P({ x: 678, y: 397, w: 156, h: 20, kind: 'wood' }),
      ],
      crates: [
        { x: 640, y: 660, size: 92, kind: 'teal' },
      ],
    },
    {
      name: "Wall Run",
      tip: "A long shallow run. Three rests will hold it better than two.",
      ink: 720,
      faucet: { x: 380, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 900, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 900, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 409, y: 327, w: 100, h: 14, kind: 'wood' }),
        P({ x: 763, y: 394, w: 100, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 640, y: 670, w: 300, h: 26 },
      ],
    },
    {
      name: "Hot Floor",
      tip: "The floor is heated. Keep the water in the air until the glass.",
      ink: 590,
      faucet: { x: 850, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 430, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 837, y: 327, w: 92, h: 14, kind: 'wood' }),
        P({ x: 547, y: 394, w: 92, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 550, y: 660, w: 220, h: 26 },
        { x: 750, y: 690, w: 220, h: 26 },
      ],
    },
    {
      name: "Spinner",
      tip: "The bar below turns whatever misses into spray. Hit the glass instead.",
      ink: 530,
      faucet: { x: 830, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 450, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 450, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 823, y: 358, w: 30, h: 12, kind: 'wood' }),
        P({ x: 557, y: 394, w: 30, h: 12, kind: 'wood' }),
      ],
      spinners: [
        { x: 640, y: 590, w: 150, h: 16, speed: 0 },
      ],
    },
    {
      name: "Tilting Plank",
      tip: "Nothing here is welded. Rest the line on solid timber and it holds.",
      ink: 640,
      faucet: { x: 870, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 410, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 410, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 894, y: 315, w: 96, h: 14, kind: 'wood' }),
        P({ x: 572, y: 350, w: 96, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 640, y: 660, size: 92, kind: 'teal' },
      ],
    },
    {
      name: "The Bridge",
      tip: "Two stone columns stand in the gap. One straight line across them makes a bridge.",
      ink: 570,
      faucet: { x: 425, y: 180, rate: 26, total: 99 },
      glasses: [
        { x: 855, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 855, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 375, y: 476, w: 26, h: 428, kind: 'stone' }),
        P({ x: 532, y: 489, w: 26, h: 403, kind: 'stone' }),
        P({ x: 689, y: 501, w: 26, h: 378, kind: 'stone' }),
      ],
    },
    {
      name: "The Neck",
      tip: "A narrow drop. Get the line inside the mouth, not over the rim.",
      ink: 500,
      faucet: { x: 445, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 835, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 835, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 484, y: 361, w: 70, h: 14, kind: 'wood' }),
        P({ x: 732, y: 397, w: 70, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 640, y: 670, w: 300, h: 26 },
      ],
    },
    {
      name: "Crosswind",
      tip: "The blower pushes the whole stream. Put the line above its reach.",
      ink: 600,
      faucet: { x: 860, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 420, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 420, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 890, y: 279, w: 30, h: 12, kind: 'wood' }),
        P({ x: 592, y: 340, w: 30, h: 12, kind: 'wood' }),
      ],
      fans: [
        { x: 640, y: 630, w: 120, h: 70, angle: 0, force: 0.13, dir: -1 },
      ],
    },
    {
      name: "The Staircase",
      tip: "A low tap and a high glass. Step the line up; do not try to bridge it in one.",
      ink: 720,
      faucet: { x: 890, y: 212, rate: 26, total: 115 },
      glasses: [
        { x: 390, y: 432, w: 108, h: 134, need: 0.55 },
      ],
      platforms: [
        P({ x: 390, y: 508, w: 152, h: 18, kind: 'wood' }),
        P({ x: 937, y: 291, w: 92, h: 14, kind: 'wood' }),
        P({ x: 750, y: 308, w: 92, h: 14, kind: 'wood' }),
        P({ x: 552, y: 326, w: 92, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 570, y: 660, size: 88, kind: 'wood' },
        { x: 700, y: 570, size: 76, kind: 'teal' },
      ],
    },
    {
      name: "Pillar Drop",
      tip: "A narrow glass and a stone block under the gap. Short rests, one straight line.",
      ink: 410,
      faucet: { x: 470, y: 172, rate: 26, total: 90 },
      glasses: [
        { x: 810, y: 486, w: 96, h: 124, need: 0.55 },
      ],
      platforms: [
        P({ x: 810, y: 557, w: 140, h: 18, kind: 'wood' }),
        P({ x: 485, y: 346, w: 74, h: 14, kind: 'wood' }),
        P({ x: 597, y: 370, w: 74, h: 14, kind: 'wood' }),
        P({ x: 709, y: 393, w: 74, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 640, y: 660, size: 92, kind: 'stone' },
      ],
    },
    {
      name: "Gear Works",
      tip: "Two bars spin below. Keep every drop on the line.",
      ink: 620,
      faucet: { x: 440, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 840, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 840, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 412, y: 327, w: 90, h: 14, kind: 'wood' }),
        P({ x: 718, y: 394, w: 90, h: 14, kind: 'wood' }),
      ],
      spinners: [
        { x: 560, y: 580, w: 130, h: 16, speed: 0 },
        { x: 730, y: 620, w: 130, h: 16, speed: 0 },
      ],
    },
    {
      name: "Long Reach",
      tip: "The longest reach in the book. Three rests and the shallowest line that lands.",
      ink: 690,
      faucet: { x: 360, y: 182, rate: 26, total: 93 },
      glasses: [
        { x: 920, y: 496, w: 108, h: 112, need: 0.55 },
      ],
      platforms: [
        P({ x: 920, y: 561, w: 152, h: 18, kind: 'wood' }),
        P({ x: 465, y: 328, w: 70, h: 14, kind: 'wood' }),
        P({ x: 714, y: 385, w: 70, h: 14, kind: 'wood' }),
      ],
    },
    {
      name: "The Long Drop",
      tip: "The longest run in the book. Three rests and a shallow slope.",
      ink: 830,
      faucet: { x: 360, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 920, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 920, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 357, y: 327, w: 104, h: 14, kind: 'wood' }),
        P({ x: 769, y: 394, w: 104, h: 14, kind: 'wood' }),
      ],
    },
    {
      name: "Hot Pipes",
      tip: "Heated pads on the floor. Bridge over them and keep the line high.",
      ink: 750,
      faucet: { x: 390, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 890, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 890, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 377, y: 327, w: 96, h: 14, kind: 'wood' }),
        P({ x: 749, y: 394, w: 96, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 510, y: 660, w: 200, h: 26 },
        { x: 700, y: 680, w: 240, h: 26 },
        { x: 890, y: 640, w: 140, h: 26 },
      ],
    },
    {
      name: "The Sink",
      tip: "The glass sits in a hollow. Land the water inside the mouth.",
      ink: 570,
      faucet: { x: 450, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 830, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 830, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 414, y: 290, w: 70, h: 14, kind: 'wood' }),
        P({ x: 688, y: 369, w: 70, h: 14, kind: 'wood' }),
      ],
      spinners: [
        { x: 640, y: 590, w: 150, h: 16, speed: 0 },
      ],
    },
    {
      name: "Twin Spinners",
      tip: "Two crossed bars. A wide, steady line keeps the stream together.",
      ink: 590,
      faucet: { x: 850, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 430, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 430, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 837, y: 320, w: 30, h: 12, kind: 'wood' }),
        P({ x: 547, y: 387, w: 30, h: 12, kind: 'wood' }),
      ],
      spinners: [
        { x: 560, y: 580, w: 130, h: 16, speed: 0 },
        { x: 730, y: 620, w: 130, h: 16, speed: 0 },
      ],
    },
    {
      name: "Upstream",
      tip: "The blower shoves the stream left. Keep the line above its reach.",
      ink: 660,
      faucet: { x: 875, y: 170, rate: 26, total: 105 },
      glasses: [
        { x: 405, y: 506, w: 108, h: 122, need: 0.55 },
      ],
      platforms: [
        P({ x: 405, y: 576, w: 152, h: 18, kind: 'wood' }),
        P({ x: 873, y: 349, w: 70, h: 14, kind: 'wood' }),
        P({ x: 693, y: 390, w: 70, h: 14, kind: 'wood' }),
        P({ x: 513, y: 431, w: 70, h: 14, kind: 'wood' }),
      ],
      fans: [
        { x: 640, y: 630, w: 120, h: 70, angle: 0, force: 0.08, dir: -1 },
      ],
    },
    {
      name: "The Gauntlet",
      tip: "Hot pad, spinner, long gap. Take it in one careful line.",
      ink: 600,
      faucet: { x: 380, y: 190, rate: 26, total: 106 },
      glasses: [
        { x: 900, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 900, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 430, y: 286, w: 100, h: 14, kind: 'wood' }),
        P({ x: 728, y: 347, w: 100, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 490, y: 660, w: 220, h: 26 },
      ],
      spinners: [
        { x: 710, y: 600, w: 150, h: 16, speed: 0 },
        { x: 860, y: 650, w: 120, h: 16, speed: 0 },
      ],
    },
    {
      name: "Two Storeys",
      tip: "Two taps: one high glass, one low. Each stream needs its own rests.",
      ink: 820,
      faucets: [
        { x: 500, y: 190, rate: 26, total: 87 },
        { x: 780, y: 300, rate: 26, total: 87 },
      ],
      glasses: [
        { x: 850, y: 392, w: 108, h: 112, need: 0.5 },
        { x: 430, y: 534, w: 108, h: 112, need: 0.5 },
      ],
      platforms: [
        P({ x: 850, y: 457, w: 152, h: 18, kind: 'wood' }),
        P({ x: 430, y: 599, w: 152, h: 18, kind: 'wood' }),
        P({ x: 571, y: 280, w: 70, h: 14, kind: 'wood' }),
        P({ x: 747, y: 318, w: 70, h: 14, kind: 'wood' }),
        P({ x: 692, y: 462, w: 70, h: 14, kind: 'wood' }),
        P({ x: 539, y: 467, w: 70, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 675, y: 660, size: 92, kind: 'teal' },
      ],
    },
    {
      name: "Last Drop",
      tip: "A deep glass sitting low. Slope the line and let the water run; do not drop it.",
      ink: 520,
      faucet: { x: 815, y: 204, rate: 26, total: 112 },
      glasses: [
        { x: 465, y: 520, w: 108, h: 138, need: 0.52 },
      ],
      platforms: [
        P({ x: 465, y: 598, w: 152, h: 18, kind: 'wood' }),
        P({ x: 855, y: 375, w: 86, h: 14, kind: 'wood' }),
        P({ x: 597, y: 415, w: 86, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 640, y: 670, w: 300, h: 26 },
      ],
    },
    {
      name: "Hold It Up",
      tip: "A high glass. The line can be almost flat if both ends rest.",
      ink: 620,
      faucet: { x: 440, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 840, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 840, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 412, y: 327, w: 90, h: 14, kind: 'wood' }),
        P({ x: 718, y: 394, w: 90, h: 14, kind: 'wood' }),
      ],
    },
    {
      name: "Two Hands",
      tip: "Two taps at the far edges, two lines, one corridor each. Keep the streams apart.",
      ink: 1070,
      faucets: [
        { x: 1200, y: 200, rate: 26, total: 87 },
        { x: 80, y: 220, rate: 26, total: 87 },
      ],
      glasses: [
        { x: 850, y: 410, w: 108, h: 112, need: 0.5 },
        { x: 430, y: 540, w: 108, h: 112, need: 0.5 },
      ],
      platforms: [
        P({ x: 850, y: 475, w: 152, h: 18, kind: 'wood' }),
        P({ x: 430, y: 605, w: 152, h: 18, kind: 'wood' }),
        P({ x: 1236, y: 289, w: 70, h: 14, kind: 'wood' }),
        P({ x: 962, y: 337, w: 70, h: 14, kind: 'wood' }),
        P({ x: 56, y: 401, w: 94, h: 14, kind: 'wood' }),
        P({ x: 282, y: 446, w: 94, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 1025, y: 660, size: 92, kind: 'teal' },
      ],
    },
    {
      name: "Slippery Shelf",
      tip: "An ice shelf under the gap. Take the line over it and land the water clean.",
      ink: 620,
      faucet: { x: 840, y: 186, rate: 26, total: 99 },
      glasses: [
        { x: 440, y: 452, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 440, y: 520, w: 152, h: 18, kind: 'wood' }),
        P({ x: 895, y: 316, w: 88, h: 14, kind: 'wood' }),
        P({ x: 738, y: 345, w: 88, h: 14, kind: 'wood' }),
        P({ x: 571, y: 377, w: 88, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 640, y: 660, size: 92, kind: 'ice' },
      ],
    },
    {
      name: "Diamond Gap",
      tip: "A short gap between blocks. A straight edge is all you need.",
      ink: 560,
      faucet: { x: 460, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 820, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 820, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 426, y: 358, w: 30, h: 12, kind: 'wood' }),
        P({ x: 708, y: 394, w: 30, h: 12, kind: 'wood' }),
      ],
      crates: [
        { x: 640, y: 660, size: 92, kind: 'teal' },
      ],
    },
    {
      name: "Gap Bridge",
      tip: "The glass dangles beyond a gap. Bridge it, then pour.",
      ink: 370,
      faucet: { x: 805, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 475, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 475, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 782, y: 315, w: 80, h: 14, kind: 'wood' }),
        P({ x: 598, y: 350, w: 80, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 640, y: 670, w: 300, h: 26 },
      ],
    },
    {
      name: "The Wedge",
      tip: "A spinning bar under the line. Keep the water on top of it.",
      ink: 690,
      faucet: { x: 415, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 865, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 865, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 395, y: 327, w: 96, h: 14, kind: 'wood' }),
        P({ x: 733, y: 394, w: 96, h: 14, kind: 'wood' }),
      ],
      spinners: [
        { x: 640, y: 590, w: 150, h: 16, speed: 0 },
      ],
    },
    {
      name: "Falling Weight",
      tip: "Crates stacked in the way. Lay the line over their tops.",
      ink: 550,
      faucet: { x: 435, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 845, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 845, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 442, y: 290, w: 70, h: 14, kind: 'wood' }),
        P({ x: 708, y: 369, w: 70, h: 14, kind: 'wood' }),
      ],
      crates: [
        { x: 570, y: 660, size: 88, kind: 'wood' },
        { x: 700, y: 570, size: 76, kind: 'teal' },
      ],
    },
    {
      name: "Wind Tunnel",
      tip: "A blower with a long reach. Stay above it.",
      ink: 720,
      faucet: { x: 880, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 400, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 400, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 895, y: 361, w: 100, h: 14, kind: 'wood' }),
        P({ x: 531, y: 397, w: 100, h: 14, kind: 'wood' }),
      ],
      fans: [
        { x: 640, y: 630, w: 120, h: 70, angle: 0, force: 0.13, dir: -1 },
      ],
    },
    {
      name: "Juggler",
      tip: "Two bars juggling everything that misses. Do not miss.",
      ink: 480,
      faucet: { x: 450, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 830, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 830, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 450, y: 286, w: 86, h: 14, kind: 'wood' }),
        P({ x: 682, y: 347, w: 86, h: 14, kind: 'wood' }),
      ],
      spinners: [
        { x: 560, y: 580, w: 130, h: 16, speed: 0 },
        { x: 730, y: 620, w: 130, h: 16, speed: 0 },
      ],
    },
    {
      name: "Grand Finale",
      tip: "Everything at once: heat, blades and a long gap. One line, one chance.",
      ink: 730,
      faucet: { x: 370, y: 190, rate: 26, total: 99 },
      glasses: [
        { x: 910, y: 470, w: 108, h: 118, need: 0.55 },
      ],
      platforms: [
        P({ x: 910, y: 538, w: 152, h: 18, kind: 'wood' }),
        P({ x: 355, y: 286, w: 104, h: 14, kind: 'wood' }),
        P({ x: 719, y: 347, w: 104, h: 14, kind: 'wood' }),
      ],
      hots: [
        { x: 490, y: 660, w: 220, h: 26 },
      ],
      spinners: [
        { x: 710, y: 600, w: 150, h: 16, speed: 0 },
        { x: 860, y: 650, w: 120, h: 16, speed: 0 },
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
