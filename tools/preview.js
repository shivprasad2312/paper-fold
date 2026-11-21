/* ==========================================================================
   tools/preview.js — draw the newly solved scenes as a contact sheet, without
   touching the shipped levels. Reads /tmp/new/L<id>.json from tools/solve.js.

   node tools/preview.js [outfile] [ids...]
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
    GlobalFonts.registerFromPath(path.resolve(__dirname, `../fonts/fredoka-latin-${w}-normal.woff2`), 'Fredoka');
  }
} catch (e) { /* fonts optional */ }

const out = process.argv[2] || path.resolve(__dirname, '../shots/new-levels.png');
const only = process.argv.slice(3).map(Number).filter(Boolean);
const COLS = 5, CW = 384, CH = 216;
const ids = [];
for (let i = 1; i <= 70; i++) {
  if (fs.existsSync('/tmp/new/L' + i + '.json')) ids.push(i);
}
const pick = only.length ? ids.filter((i) => only.includes(i)) : ids;
const rows = Math.ceil(pick.length / COLS);
const canvas = createCanvas(CW * COLS, CH * rows);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#f6f3ec';
ctx.fillRect(0, 0, canvas.width, canvas.height);

pick.forEach((id, k) => {
  const res = JSON.parse(fs.readFileSync('/tmp/new/L' + id + '.json', 'utf8'));
  const lv = res.level;
  const scene = new HG.Scene(JSON.parse(JSON.stringify(lv)));
  for (const st of (res.line ? [res.line] : [])) {
    const pts = poly(st);
    scene.beginInk(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) scene.addInkPoint(pts[i].x, pts[i].y);
    scene.endInk();
  }
  scene.start();
  for (let i = 0; i < Math.round((7 * 1000) / STEP); i++) {
    scene.step(STEP); scene.physics(STEP);
    if ((scene.state === 'won' || scene.state === 'lost') && scene.winTimer > 0.4) break;
  }
  // draw this scene into its cell
  const cell = createCanvas(1280, 720);
  const cctx = cell.getContext('2d');
  const fake = { clientWidth: 1280, clientHeight: 720, width: 1280, height: 720, getContext: () => cctx };
  const r = new HG.Renderer(fake);
  r.dpr = 1;
  r.draw({ levelId: id, level: lv, scene, pointer: { active: false }, mode: 'play' }, 16.7);
  const cx = (k % COLS) * CW, cy = Math.floor(k / COLS) * CH;
  ctx.drawImage(cell, cx, cy, CW, CH);
  ctx.strokeStyle = '#c9c2b2';
  ctx.strokeRect(cx + 0.5, cy + 0.5, CW - 1, CH - 1);
  ctx.fillStyle = '#4a4238';
  ctx.font = '12px Fredoka, sans-serif';
  ctx.fillText(id + '. ' + lv.name + '  (' + scene.state + ')', cx + 6, cy + CH - 6);
});

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('wrote', out, pick.length + ' levels');
