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
