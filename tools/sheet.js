/* tools/sheet.js — contact sheet of every level (design review aid). */
'use strict';
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();
require(path.resolve(__dirname, '../js/render.js'));
try {
  GlobalFonts.registerFromPath(path.resolve(__dirname, '../fonts/fredoka-latin-500-normal.woff2'), 'Fredoka');
} catch (e) {}

const CW = 420, CH = 236, COLS = 7, ROWS = 5;
const sheet = createCanvas(CW * COLS, CH * ROWS);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#2b3440';
sctx.fillRect(0, 0, sheet.width, sheet.height);

const seconds = parseFloat(process.argv[2] || '2.4');
HG.LEVELS.forEach((lv, i) => {
  const c = createCanvas(CW, CH);
  const ctx = c.getContext('2d');
  const fake = { clientWidth: CW, clientHeight: CH, width: CW, height: CH, getContext: () => ctx };
  const r = new HG.Renderer(fake);
  r.dpr = 1;
  const scene = new HG.Scene(lv);
  const strokes = (SOL[lv.id] || []).map(poly);
  for (const st of strokes) {
    scene.beginInk(st[0].x, st[0].y);
    for (let k = 1; k < st.length; k++) scene.addInkPoint(st[k].x, st[k].y);
    scene.endInk();
  }
  scene.start();
  const frames = Math.round((seconds * 1000) / STEP);
  for (let f = 0; f < frames; f++) {
    scene.step(STEP); scene.physics(STEP);
    if (scene.state === 'won' && scene.winTimer > 0.2) break;
  }
  r.draw({ levelId: lv.id, level: lv, scene, pointer: { active: false }, mode: 'play' }, 16.7);
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
  sctx.drawImage(c, x, y);
  sctx.strokeStyle = '#2b3440';
  sctx.lineWidth = 2;
  sctx.strokeRect(x, y, CW, CH);
  sctx.fillStyle = scene.state === 'won' ? '#a8d641' : '#ef7a63';
  sctx.font = '600 14px Fredoka, sans-serif';
  sctx.fillText(lv.id + ' ' + lv.name + '  ' + scene.state, x + 8, y + CH - 8);
});
const fs = require('fs');
fs.mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });
const out = path.resolve(__dirname, '../shots/all-levels.png');
fs.writeFileSync(out, sheet.toBuffer('image/png'));
console.log('wrote', out);
