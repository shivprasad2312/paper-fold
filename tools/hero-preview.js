/* ==========================================================================
   tools/hero-preview.js — render one room + one stroke to a PNG, and print
   what happened. The design loop for a room that does not exist yet:

     node tools/hero-preview.js <room.json> '<strokes json>' <out.png> [secs]

   <strokes json> is [[[x,y],[x,y],...]] — the same shape tools/solutions.js
   uses. Nothing is proved here; this is for looking at a room before the
   solver is asked to believe in it.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP } = require('./simheadless');

const HG = boot();
require(path.resolve(__dirname, '../js/render.js'));
try {
  for (const w of [400, 500, 600, 700]) {
    GlobalFonts.registerFromPath(path.resolve(__dirname, '../fonts/fredoka-latin-' + w + '-normal.woff2'), 'Fredoka');
  }
} catch (e) { /* fonts are optional */ }

const [specFile, strokesJson, outFile, secArg] = process.argv.slice(2);
if (!specFile || !outFile) {
  console.log('usage: node tools/hero-preview.js room.json \'[[[x,y],...]]\' out.png [seconds]');
  process.exit(2);
}
const level = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const strokes = JSON.parse(strokesJson || '[]');
const seconds = parseFloat(secArg || '3');

const CW = 1280, CH = 760;
const canvas = createCanvas(CW, CH);
const ctx = canvas.getContext('2d');
const fake = { clientWidth: CW, clientHeight: CH, width: CW, height: CH, getContext: () => ctx };
const renderer = new HG.Renderer(fake);
renderer.dpr = 1;

const scene = new HG.Scene(JSON.parse(JSON.stringify(level)));
for (const st of strokes) {
  const pts = poly(st);
  if (pts.length < 2) continue;
  scene.beginInk(pts[0].x, pts[0].y);
  for (const q of pts) scene.addInkPoint(q.x, q.y);
  scene.endInk();
}
const inkUsed = scene.ink.used;
scene.start();
const frames = Math.round((seconds * 1000) / STEP);
for (let i = 0; i < frames; i++) {
  scene.step(STEP);
  scene.physics(STEP);
  if ((scene.state === 'won' || scene.state === 'lost') && scene.winTimer > 0.35) break;
}
renderer.draw({ levelId: level.id, level, scene, pointer: { active: false }, mode: 'play' }, 16.7);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, canvas.toBuffer('image/png'));
console.log(outFile, '|', scene.state,
  '| fill', scene.glasses.map((g) => g.fill.toFixed(2)).join(','),
  '| spoiled', scene.glasses.some((g) => g.spoiled),
  '| ink', Math.round(inkUsed),
  '| glass', JSON.stringify(scene.glasses.map((g) => [Math.round(g.cx), Math.round(g.cy), +g.angle.toFixed(2), g.lost])));
