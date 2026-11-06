/* tools/room-plan/mass-shots.js — one full-size frame per mass level (16-40),
   drawn with the proved answer already on the board and the water in it.

     node tools/room-plan/mass-shots.js [outDir]
   ========================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP, seed } = require('../simheadless');
const SOL = require('../solutions');
const HG = boot();
require(path.resolve(__dirname, '../../js/render.js'));
try { GlobalFonts.registerFromPath(path.resolve(__dirname, '../../fonts/fredoka-latin-600-normal.woff2'), 'Fredoka'); } catch (e) {}

const outDir = path.resolve(__dirname, '../../shots/mass');
fs.mkdirSync(outDir, { recursive: true });
const W = 1280, H = 760;

for (const lv of HG.LEVELS.filter((l) => l.id >= 16 && l.id <= 40)) {
  seed(1234 + lv.id);
  const level = JSON.parse(JSON.stringify(lv)); delete level.tip;
  const sc = new HG.Scene(level);
  for (const st of (SOL[lv.id] || [])) {
    const pts = poly(st);
    sc.beginInk(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) {
      if (sc.inkPointBlocked(pts[k].x, pts[k].y)) continue;
      sc.addInkPoint(pts[k].x, pts[k].y);
    }
    sc.endInk();
  }
  sc.start();
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  const fake = { clientWidth: W, clientHeight: H, width: W, height: H, getContext: () => ctx };
  const r = new HG.Renderer(fake); r.dpr = 1;
  // run the room until the glass is full (or the tap is dry), so the shot shows
  // the level actually playing, not an empty board
  let t = 0;
  while (t < 60 * 22 && !sc.glasses.every((g) => g.fill >= g.need)) { sc.step(STEP); sc.physics(STEP); t++; }
  for (let i = 0; i < 6; i++) { sc.step(STEP); sc.physics(STEP); }
  r.draw({ levelId: lv.id, level, scene: sc, pointer: { active: false }, mode: 'play' }, 16.7);
  const file = path.join(outDir, 'level-' + String(lv.id).padStart(2, '0') + '.png');
  fs.writeFileSync(file, c.toBuffer('image/png'));
  console.log('wrote', path.relative(process.cwd(), file), 'fill', sc.glasses.map((g) => g.fill.toFixed(2)).join('/'));
}
