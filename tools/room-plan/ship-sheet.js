const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP, seed } = require('../simheadless');
const SOL = require('../solutions');
const HG = boot();
require(path.resolve(__dirname, '../../js/render.js'));
try { GlobalFonts.registerFromPath(path.resolve(__dirname, '../../fonts/fredoka-latin-600-normal.woff2'), 'Fredoka'); } catch (e) {}
const CW = 340, CH = 202, COLS = 8, CAP = 20;
const rooms = HG.LEVELS;
const ROWS = Math.ceil(rooms.length / COLS);
const sheet = createCanvas(CW * COLS, (CH + CAP) * ROWS);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#161c24'; sctx.fillRect(0, 0, sheet.width, sheet.height);
const report = [];
rooms.forEach((lv, i) => {
  seed(1234 + lv.id);
  const c = createCanvas(1280, 760);
  const ctx = c.getContext('2d');
  const fake = { clientWidth: 1280, clientHeight: 760, width: 1280, height: 760, getContext: () => ctx };
  const r = new HG.Renderer(fake); r.dpr = 1;
  const level = JSON.parse(JSON.stringify(lv)); delete level.tip;
  const sc = new HG.Scene(level);
  for (const st of (SOL[lv.id] || [])) {
    const pts = poly(st);
    sc.beginInk(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) { if (sc.inkPointBlocked(pts[k].x, pts[k].y)) continue; sc.addInkPoint(pts[k].x, pts[k].y); }
    sc.endInk();
  }
  sc.start();
  for (let f = 0; f < 60 * 26; f++) { sc.step(STEP); sc.physics(STEP); if (sc.state === 'won' || sc.state === 'lost') { if (sc.winTimer > 0.3 || sc.state === 'lost') break; } }
  r.draw({ levelId: lv.id, level, scene: sc, pointer: { active: false }, mode: 'play' }, 16.7);
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * (CH + CAP);
  sctx.drawImage(c, 0, 0, 1280, 760, x, y, CW, CH);
  sctx.fillStyle = '#161c24'; sctx.fillRect(x, y + CH, CW, CAP);
  sctx.fillStyle = sc.state === 'won' ? '#7ee08a' : (sc.state === 'lost' ? '#ff8f8f' : '#ffd166');
  sctx.font = '600 13px Fredoka, sans-serif';
  sctx.fillText(`${String(lv.id).padStart(2)} ${lv.name}  ${sc.state} ${sc.glasses.map(g => g.fill.toFixed(2)).join('/')}`, x + 6, y + CH + 15);
  report.push({ id: lv.id, name: lv.name, state: sc.state, fill: sc.glasses.map(g => +g.fill.toFixed(2)) });
});
fs.mkdirSync(path.resolve(__dirname, '../../shots/verify'), { recursive: true });
fs.writeFileSync('/home/user/paper-fold/shots/verify/shipped-all.png', sheet.toBuffer('image/png'));
console.log('wrote shipped-all.png');
const notWon = report.filter(r => r.state !== 'won');
console.log('levels not won by their own solution:', JSON.stringify(notWon));
