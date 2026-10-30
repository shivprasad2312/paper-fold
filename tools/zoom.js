/* tools/zoom.js — render one level at high scale, cropped, so individual
   droplets can be inspected. A debugging aid, not part of the build.

   node tools/zoom.js <levelId> <seconds> <x> <y> <w> <h> [scale] [out.png]
*/
'use strict';
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { boot, poly, STEP } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
require(path.resolve(__dirname, '../js/render.js'));

const id = parseInt(process.argv[2] || '1', 10);
const seconds = parseFloat(process.argv[3] || '2');
const [cx, cy, cw, chh] = process.argv.slice(4, 8).map(Number);
const scale = parseFloat(process.argv[8] || '3');
const out = process.argv[9] || path.resolve(__dirname, `../shots/zoom-${id}.png`);

const W = 1280, H = 760;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const fake = { clientWidth: W, clientHeight: H, width: W, height: H, getContext: () => ctx };
const renderer = new HG.Renderer(fake);
renderer.dpr = 1;

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
const frames = Math.round((seconds * 1000) / STEP);
for (let i = 0; i < frames; i++) { scene.step(STEP); scene.physics(STEP); }
renderer.draw({ levelId: id, level, scene, pointer: { active: false }, mode: 'play' }, 16.7);

const crop = createCanvas(Math.round(cw * scale), Math.round(chh * scale));
const cctx = crop.getContext('2d');
cctx.imageSmoothingEnabled = false;
cctx.drawImage(canvas, cx, cy, cw, chh, 0, 0, crop.width, crop.height);
require('fs').writeFileSync(out, crop.toBuffer('image/png'));
console.log('wrote', out, 'scale', scale);
