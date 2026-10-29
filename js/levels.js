/* ==========================================================================
   levels.js — hand-authored puzzle layouts.

   World space is 1280 x 720 (y grows downward).

   Shape fields (x,y are the CENTRE of the object unless noted):
     faucet   {x, y, rate, total, spread}       y = mouth of the tap (water spawns here)
     glass    {x, y, w, h, need, tilt}          y = centre, need = 0..1 fill target
     platform {x, y, w, h, angle, kind}         kind: wood | metal | stone | sand | teal | ice
     spinner  {x, y, w, h, speed}               free pin-jointed bar (rotates when hit)
     seesaw   {x, y, w, h}                      long pinned plank
     mover    {x, y, w, h, dx, dy, period, phase}  kinematic block sliding on a path
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
      name: 'First Pour',
      tip: 'The water falls straight in — just watch it fill up.',
      ink: 650,
      faucet: { x: 640, y: 168, rate: 46, total: 105 },
      glasses: [{ x: 640, y: 470, w: 104, h: 118, need: 0.8 }],
    },
    {
      name: 'A Gentle Slope',
      tip: 'Draw a downhill ramp under the stream and let gravity carry the water right.',
      ink: 1190,
      faucet: { x: 400, y: 150, rate: 46, total: 105 },
      glasses: [{ x: 760, y: 470, w: 104, h: 118, need: 0.8 }],
    },
    {
      name: 'Small Step',
      tip: 'The glass sits a little lower than the stream. A short ramp is enough.',
      ink: 690,
      faucet: { x: 520, y: 150, rate: 46, total: 105 },
      glasses: [{ x: 700, y: 430, w: 104, h: 118, need: 0.8 }],
      platforms: [P({ x: 940, y: 300, w: 200, h: 24 })],
    },
    {
      name: 'Over The Wall',
      tip: 'The wall blocks a straight ramp. Send the water over the top of it.',
      ink: 920,
      faucet: { x: 420, y: 132, rate: 46, total: 112 },
      platforms: [P({ x: 620, y: 332, w: 180, h: 26 })],
      glasses: [{ x: 880, y: 470, w: 108, h: 118, need: 0.8 }],
    },
    {
      name: 'Double Trouble',
      tip: 'Split the stream: a shallow inverted-V sends water to both sides.',
      ink: 1420,
      faucet: { x: 640, y: 130, rate: 52, total: 130 },
      glasses: [
        { x: 430, y: 480, w: 100, h: 112, need: 0.75 },
        { x: 850, y: 480, w: 100, h: 112, need: 0.75 },
      ],
    },
    {
      name: 'Crate & Glass',
      tip: 'The stream clips the rim — a small slide above the glass centres it.',
      ink: 650,
      faucet: { x: 556, y: 216, rate: 46, total: 105 },
      glasses: [{ x: 630, y: 452, w: 96, h: 112, need: 0.82 }],
      crates: [{ x: 722, y: 448, size: 68, kind: 'teal' }],
    },
    {
      name: 'Wall Run',
      tip: 'The tall wall stands between tap and glass. Arc a line over the top.',
      ink: 1710,
      faucet: { x: 330, y: 150, rate: 46, total: 112 },
      glasses: [{ x: 900, y: 500, w: 112, h: 118, need: 0.8 }],
      platforms: [P({ x: 620, y: 445, w: 26, h: 170, kind: 'stone' })],
    },
    {
      name: 'Hot Floor',
      tip: 'Water evaporates on the heated pad. Keep the stream in the air.',
      ink: 1710,
      faucet: { x: 420, y: 140, rate: 46, total: 108 },
      glasses: [{ x: 900, y: 430, w: 104, h: 118, need: 0.8 }],
      hots: [{ x: 600, y: 560, w: 420, h: 28, angle: 0 }],
      platforms: [P({ x: 1000, y: 520, w: 190, h: 24 })],
    },
    {
      name: 'Spinner',
      tip: 'The spinning bar scatters water. A line through its path jams it solid.',
      ink: 670,
      faucet: { x: 480, y: 140, rate: 46, total: 112 },
      glasses: [{ x: 790, y: 520, w: 104, h: 118, need: 0.8 }],
      spinners: [{ x: 620, y: 320, w: 250, h: 18 }],
    },
    {
      name: 'Tilting Plank',
      tip: 'The plank swings when water hits it. Run your line just over the top.',
      ink: 1620,
      faucet: { x: 400, y: 130, rate: 46, total: 112 },
      glasses: [{ x: 900, y: 460, w: 104, h: 118, need: 0.78 }],
      seesaws: [{ x: 700, y: 300, w: 320, h: 16 }],
    },
    {
      name: 'Two Taps',
      tip: 'Both glasses must be filled. Solve one tap at a time.',
      ink: 1490,
      faucets: [
        { x: 250, y: 140, rate: 46, total: 120 },
        { x: 1030, y: 140, rate: 46, total: 120 },
      ],
      glasses: [
        { x: 470, y: 470, w: 108, h: 112, need: 0.65 },
        { x: 810, y: 470, w: 108, h: 112, need: 0.65 },
      ],
    },
    {
      name: 'The Neck',
      tip: 'The gap between the blocks is narrow. Funnel the water into it.',
      ink: 650,
      faucet: { x: 520, y: 120, rate: 48, total: 118 },
      glasses: [{ x: 640, y: 540, w: 104, h: 118, need: 0.75 }],
      platforms: [
        P({ x: 407, y: 330, w: 320, h: 30, kind: 'stone' }),
        P({ x: 877, y: 330, w: 320, h: 30, kind: 'stone' }),
      ],
    },
    {
      name: 'Crosswind',
      tip: 'The blower pushes the stream sideways — use it, or shield against it.',
      ink: 1840,
      faucet: { x: 380, y: 140, rate: 46, total: 110 },
      glasses: [{ x: 900, y: 460, w: 112, h: 118, need: 0.8 }],
      fans: [{ x: 175, y: 330, w: 46, h: 170, angle: 0, force: 0.16 }],
    },
    {
      name: 'Crate Stack',
      tip: 'Climb over the crates, or use them to anchor your line.',
      ink: 1810,
      faucet: { x: 400, y: 130, rate: 46, total: 112 },
      glasses: [{ x: 960, y: 430, w: 104, h: 118, need: 0.8 }],
      crates: [
        { x: 620, y: 560, size: 90 }, { x: 620, y: 470, size: 90 },
        { x: 620, y: 380, size: 90 }, { x: 710, y: 560, size: 90 },
        { x: 1000, y: 610, size: 76, kind: 'teal' },
      ],
    },
    {
      name: "Three Is A Crowd",
      tip: 'One stream, three glasses. Divide it carefully.',
      ink: 1230,
      faucet: { x: 640, y: 120, rate: 58, total: 240 },
      glasses: [
        { x: 380, y: 500, w: 92, h: 104, need: 0.6 },
        { x: 640, y: 500, w: 92, h: 104, need: 0.6 },
        { x: 900, y: 500, w: 92, h: 104, need: 0.6 },
      ],
    },
    {
      name: 'Gear Works',
      tip: 'Two spinning bars. Pin one down with ink and guide the water past.',
      ink: 650,
      faucet: { x: 640, y: 116, rate: 46, total: 112 },
      glasses: [{ x: 880, y: 470, w: 104, h: 118, need: 0.8 }],
      spinners: [{ x: 520, y: 280, w: 210, h: 16 }, { x: 760, y: 380, w: 190, h: 16 }],
    },
    {
      name: 'Moving Block',
      tip: 'The block patrols the middle of the screen. Slide your line underneath it.',
      ink: 1250,
      faucet: { x: 500, y: 130, rate: 46, total: 112 },
      glasses: [{ x: 900, y: 500, w: 104, h: 118, need: 0.8 }],
      movers: [{ x: 650, y: 360, w: 170, h: 26, dx: 0, dy: 180, period: 3.4, phase: 0 }],
    },
    {
      name: 'The Long Drop',
      tip: 'A very long way across. Keep the line shallow and let it run.',
      ink: 2150,
      faucet: { x: 250, y: 118, rate: 46, total: 112 },
      glasses: [{ x: 980, y: 520, w: 112, h: 118, need: 0.8 }],
      crates: [{ x: 1150, y: 600, size: 76 }, { x: 1150, y: 520, size: 76, kind: 'teal' }],
    },
    {
      name: 'Hot Pipes',
      tip: 'Two heated pipes on the way down. Bridge over both of them.',
      ink: 2250,
      faucet: { x: 300, y: 120, rate: 46, total: 112 },
      glasses: [{ x: 1020, y: 540, w: 104, h: 118, need: 0.8 }],
      hots: [
        { x: 520, y: 320, w: 300, h: 26, angle: 0 },
        { x: 820, y: 440, w: 300, h: 26, angle: 0 },
      ],
      platforms: [P({ x: 1000, y: 620, w: 260, h: 26 })],
    },
    {
      name: 'The Sink',
      tip: 'Draw a bowl to catch the stream, then tip it with a slope into the glass.',
      ink: 2040,
      faucet: { x: 380, y: 130, rate: 50, total: 125 },
      glasses: [{ x: 900, y: 520, w: 104, h: 118, need: 0.78 }],
      platforms: [P({ x: 900, y: 620, w: 320, h: 26, kind: 'metal' })],
      spinners: [{ x: 700, y: 300, w: 140, h: 16 }],
    },
    {
      name: 'Twin Spinners',
      tip: 'Two crossed spinners make a mess. A wide funnel keeps the stream together.',
      ink: 650,
      faucet: { x: 640, y: 112, rate: 48, total: 120 },
      glasses: [{ x: 420, y: 540, w: 104, h: 118, need: 0.78 }],
      platforms: [P({ x: 420, y: 640, w: 300, h: 26, kind: 'metal' })],
      spinners: [{ x: 600, y: 245, w: 230, h: 16 }, { x: 500, y: 350, w: 200, h: 16 }],
      crates: [{ x: 900, y: 560, size: 80, kind: 'teal' }, { x: 260, y: 640, size: 76 }],
    },
    {
      name: 'Upstream',
      tip: 'Blow the water the other way — the wind is your friend here.',
      ink: 1290,
      faucet: { x: 900, y: 130, rate: 46, total: 112 },
      glasses: [{ x: 420, y: 500, w: 104, h: 118, need: 0.8 }],
      fans: [{ x: 1080, y: 380, w: 46, h: 190, angle: 0, force: 0.2, dir: -1 }],
      platforms: [P({ x: 420, y: 600, w: 300, h: 26, kind: 'metal' })],
    },
    {
      name: 'The Gauntlet',
      tip: 'Hot pad, spinner and a moving block. Take it step by step.',
      ink: 2190,
      faucet: { x: 300, y: 110, rate: 46, total: 118 },
      glasses: [{ x: 1000, y: 520, w: 104, h: 118, need: 0.78 }],
      hots: [{ x: 640, y: 620, w: 420, h: 28, angle: 0 }],
      spinners: [{ x: 520, y: 330, w: 220, h: 16 }],
      movers: [{ x: 820, y: 240, w: 140, h: 24, dx: 0, dy: 60, period: 3.2, phase: 0.5 }],
      platforms: [P({ x: 1000, y: 620, w: 280, h: 26 })],
    },
    {
      name: 'Two Storeys',
      tip: 'Two taps, two glasses, one shared space. Keep the paths apart.',
      ink: 1610,
      faucets: [
        { x: 340, y: 120, rate: 46, total: 115 },
        { x: 940, y: 300, rate: 46, total: 115 },
      ],
      glasses: [
        { x: 640, y: 470, w: 104, h: 112, need: 0.63 },
        { x: 200, y: 560, w: 104, h: 112, need: 0.63 },
      ],
      platforms: [P({ x: 1130, y: 430, w: 200, h: 24, kind: 'metal' })],
    },
    {
      name: 'Last Drop',
      tip: 'Everything at once. Stay calm, use short lines and aim for the centre.',
      ink: 1520,
      faucet: { x: 640, y: 104, rate: 54, total: 175 },
      glasses: [
        { x: 300, y: 540, w: 96, h: 108, need: 0.7 },
        { x: 980, y: 540, w: 96, h: 108, need: 0.7 },
      ],
      platforms: [
        P({ x: 300, y: 630, w: 240, h: 24, kind: 'metal' }),
        P({ x: 980, y: 630, w: 240, h: 24, kind: 'metal' }),
      ],
      hots: [{ x: 640, y: 660, w: 300, h: 26, angle: 0 }],
      crates: [{ x: 640, y: 430, size: 64 }],
    },
  ];

  // ------------------------------------------------------------- normalising
  LEVELS.forEach((lv, i) => {
    lv.id = i + 1;
    lv.faucets = lv.faucets || (lv.faucet ? [lv.faucet] : []);
    lv.glasses = (lv.glasses || []).map((g) =>
      Object.assign({ w: 104, h: 118, need: 0.8, tilt: 0, dynamic: false }, g)
    );
    lv.platforms = (lv.platforms || []).map((p) => Object.assign({ angle: 0, kind: 'wood' }, p));
    lv.spinners = (lv.spinners || []).map((s) => Object.assign({ speed: 0 }, s));
    lv.seesaws = (lv.seesaws || []).map((s) => Object.assign({}, s));
    lv.movers = (lv.movers || []).map((m) =>
      Object.assign({ phase: 0, period: 3.4, dx: 0, dy: 0 }, m)
    );
    lv.hots = (lv.hots || []).map((h) => Object.assign({ angle: 0 }, h));
    lv.fans = (lv.fans || []).map((f) =>
      Object.assign({ angle: 0, force: 0.16, dir: 1 }, f)
    );
    lv.crates = (lv.crates || []).map((c) => Object.assign({ kind: 'wood' }, c));
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
