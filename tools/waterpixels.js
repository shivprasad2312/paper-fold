/* ==========================================================================
   tools/waterpixels.js — is anything foreign drawn *inside* the water?

   The report: "there is something inside the water droplets, dark blue, moving
   around inside them". It was the renderer. A droplet is a circle of radius R,
   and two circles whose centres are 2R apart touch tangentially — which leaves
   an ~8 px² hole at every triple junction and shows each circle's own rim
   wherever its neighbour does not cover it. Where particles were packed, that
   painted a lattice of paper shards and dark blue crescents *inside* the
   liquid, and because the particles jostle, the lattice crawled around: dark
   shapes moving inside the droplets.

   How this measures it: flood the page colour from outside the frame, walking
   only over page and grid colours, stopping at water, ink and scenery. Any page
   pixel the flood cannot reach is *sealed inside* the water — that is a hole in
   the liquid, not a gap between two drops at the surface. Then count the water
   pixels whose colour is the outline's dark blue, since a rim inside the mass is
   the other half of the same bug.

   node tools/waterpixels.js [levelId] [seconds]
   ========================================================================== */
'use strict';
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { boot, poly, STEP } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
require(path.resolve(__dirname, '../js/render.js'));

const ids = process.argv[2] ? [parseInt(process.argv[2], 10)] : [4, 18, 24, 10];
const seconds = parseFloat(process.argv[3] || '3.6');
const W = 1280, H = 760;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const renderer = new HG.Renderer({ clientWidth: W, clientHeight: H, width: W, height: H, getContext: () => ctx });
renderer.dpr = 1;

const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
// the page: C.paper #f6f5ef plus the two grid colours drawn on it
const isPage = (c) => lum(c) > 216 && Math.abs(c[0] - c[1]) < 22 && c[0] >= c[2] - 4;
const isWater = (c) => c[2] > 170 && c[2] - c[0] > 40 && c[1] > 120;
const RIM_LUM = 165;                     // #4bb2e6 is 153; the liquid starts at 175

let bad = 0;
for (const id of ids) {
  const level = HG.levelById(id);
  const scene = new HG.Scene(level);
  for (const pl of (SOLUTIONS[id] || [])) {
    const st = poly(pl);
    if (st.length < 2) continue;
    scene.beginInk(st[0].x, st[0].y);
    for (let i = 1; i < st.length; i++) scene.addInkPoint(st[i].x, st[i].y);
    scene.endInk();
  }
  scene.start();
  for (let i = 0; i < Math.round(seconds * 1000 / STEP); i++) { scene.step(STEP); scene.physics(STEP); }
  renderer.draw({ levelId: id, level, scene, pointer: { active: false }, mode: 'play' }, 16.7);

  const img = ctx.getImageData(0, 0, W, H).data;
  const at = (x, y) => { const k = (y * W + x) * 4; return [img[k], img[k + 1], img[k + 2]]; };

  // Label the non-water regions. Anything not 4-connected to the frame border
  // is a hole sealed inside the liquid. No colour guessing: the only thing this
  // needs to know is "is this pixel water".
  const isW = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isWater(at(x, y))) isW[y * W + x] = 1;
  }
  const outside = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { stack.push(0, y, W - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = y * W + x;
    if (outside[k] || isW[k]) continue;
    outside[k] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  let water = 0, rimPx = 0, holes = 0, holePaper = 0, holeOther = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      const c = at(x, y);
      if (isW[k]) {
        water++;
        // count the dark blue only where it is *interior*: the outermost 2 px of
        // the silhouette is supposed to be the rim
        // the water rim is a saturated blue (#4bb2e6: b - g = 52). Where the
        // drawn line passes under the liquid the pixels blend to a teal
        // (#62a9af: b - g = 6) — that is the player's own line showing through,
        // not a defect, so the two are told apart by saturation.
        if (lum(c) < RIM_LUM && c[2] - c[1] > 25) {
          let deep = true;
          for (let dy = -2; dy <= 2 && deep; dy++) for (let dx = -2; dx <= 2; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H || !isW[yy * W + xx]) { deep = false; break; }
          }
          if (deep) rimPx++;
        }
        continue;
      }
      if (outside[k]) continue;
      holes++;
      if (isPage(c)) holePaper++; else holeOther++;
    }
  }
  // A hole showing the page is a hole in the liquid. A hole showing ink or
  // scenery is just the drawn line lying under a pool — that is meant to be
  // there, so it is reported but not counted against the level.
  const holePct = holePaper / Math.max(1, water) * 100;
  const rimPct = rimPx / Math.max(1, water) * 100;
  const ok = holePct < 0.15 && rimPct < 3.5;
  console.log((ok ? 'PASS ' : 'FAIL ') + 'L' + String(id).padStart(2) +
    '  water ' + String(water).padStart(6) + ' px' +
    '   page showing through ' + holePct.toFixed(3) + '% (' + holePaper + ' px)' +
    '   rim-blue inside ' + rimPct.toFixed(2) + '%' +
    '   [' + (holes - holePaper) + ' px of ink/scenery enclosed, expected]');
  if (!ok) bad++;
}
if (bad) { console.log('\n' + bad + ' level(s) with artefacts inside the water'); process.exitCode = 1; }
else console.log('\nnothing foreign inside the water');
