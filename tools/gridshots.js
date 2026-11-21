/* ==========================================================================
   tools/shot.js — renders the real game canvas to a PNG without a browser.

   node tools/shot.js <levelId> <seconds> [outfile] [--nosolution] [--size WxH]
   ========================================================================== */
'use strict';
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
require(path.resolve(__dirname, '../js/render.js'));

const id = parseInt(process.argv[2] || '1', 10);
const seconds = parseFloat(process.argv[3] || '2');
const outIdx = process.argv.findIndex((a) => a.endsWith('.png'));
const out = outIdx > 0 ? process.argv[outIdx] : path.resolve(__dirname, `../shots/level${id}.png`);
const noSol = process.argv.includes('--nosolution');
const sizeArg = process.argv.find((a) => /^\d+x\d+$/.test(a)) || '1280x760';
const [CW, CH] = sizeArg.split('x').map(Number);

// fonts (used by the HUD)
try {
  for (const w of [400, 500, 600, 700]) {
    GlobalFonts.registerFromPath(
      path.resolve(__dirname, `../fonts/fredoka-latin-${w}-normal.woff2`),
      'Fredoka'
    );
  }
} catch (e) { /* fonts are optional for screenshots */ }

const W = 720, H = 450, COLS = 3;
const ids = process.argv.slice(2).map(Number);
const rows = Math.ceil(ids.length / COLS);
const sheet = createCanvas(W * COLS, H * rows);
const sctx = sheet.getContext('2d');
const fs = require('fs');

ids.forEach((id, i) => {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const fake = { clientWidth: W, clientHeight: H, width: W, height: H, getContext: () => ctx };
  const renderer = new HG.Renderer(fake);
  renderer.dpr = 1;
  const level = HG.levelById(id);
  const scene = new HG.Scene(level);
  for (const st of (SOLUTIONS[id] || []).map(poly)) {
    scene.beginInk(st[0].x, st[0].y);
    for (let k = 1; k < st.length; k++) scene.addInkPoint(st[k].x, st[k].y);
    scene.endInk();
  }
  scene.start();
  for (let f = 0; f < 60 * 3; f++) {
    scene.step(STEP); scene.physics(STEP);
    if (scene.state === 'won' || scene.state === 'lost') break;
  }
  renderer.draw({ levelId: id, level, scene, pointer: { active: false }, mode: 'play' }, 16.7);
  sctx.drawImage(canvas, (i % COLS) * W, Math.floor(i / COLS) * H);
  console.log('cell', id, scene.state, scene.glasses.map(g => g.fill.toFixed(2)).join(','));
});
fs.writeFileSync('/home/user/paper-fold/shots/grid.png', sheet.toBuffer('image/png'));
console.log('wrote shots/grid.png');
