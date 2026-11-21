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

const canvas = createCanvas(CW, CH);
const ctx = canvas.getContext('2d');
const fake = {
  clientWidth: CW,
  clientHeight: CH,
  width: CW,
  height: CH,
  getContext: () => ctx,
};
const renderer = new HG.Renderer(fake);
renderer.dpr = 1;

const level = HG.levelById(id);
const scene = new HG.Scene(level);

// draw the reference solution, then let the water run
const strokes = noSol ? [] : (SOLUTIONS[id] || []).map(poly);
for (const st of strokes) {
  scene.beginInk(st[0].x, st[0].y);
  for (let i = 1; i < st.length; i++) scene.addInkPoint(st[i].x, st[i].y);
  scene.endInk();
}
scene.start();

const frames = Math.round((seconds * 1000) / STEP);
for (let i = 0; i < frames; i++) {
  scene.step(STEP);
  scene.physics(STEP);
  if (scene.state === 'won' || scene.state === 'lost') {
    // keep animating a beat so the win state is visible
    if (scene.winTimer > 0.4) break;
  }
}

const game = { levelId: id, level, scene, pointer: { active: false }, mode: 'play' };
renderer.draw(game, 16.7);

const fs = require('fs');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('wrote', out, 'state:', scene.state,
  'fill:', scene.glasses.map((g) => g.fill.toFixed(2)).join(','));
