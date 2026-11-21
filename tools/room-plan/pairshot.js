const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP, seed } = require('../simheadless');
const SOL = require('../solutions');
const HG = boot();
require(path.resolve(__dirname, '../../js/render.js'));
try { GlobalFonts.registerFromPath(path.resolve(__dirname, '../../fonts/fredoka-latin-600-normal.woff2'), 'Fredoka'); } catch (e) {}
function shot(id) {
  const lv0 = HG.levelById(id);
  seed(1234 + id);
  const lv = JSON.parse(JSON.stringify(lv0)); delete lv.tip;
  const c = createCanvas(1280, 760);
  const ctx = c.getContext('2d');
  const r = new HG.Renderer({ clientWidth: 1280, clientHeight: 760, width: 1280, height: 760, getContext: () => ctx });
  r.dpr = 1;
  const sc = new HG.Scene(lv);
  for (const st of (SOL[id] || [])) {
    const pts = poly(st);
    sc.beginInk(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) { if (sc.inkPointBlocked(pts[k].x, pts[k].y)) continue; sc.addInkPoint(pts[k].x, pts[k].y); }
    sc.endInk();
  }
  sc.start();
  for (let f = 0; f < 60 * 26; f++) { sc.step(STEP); sc.physics(STEP); if (sc.state === 'won' || sc.state === 'lost') { if (sc.winTimer > 0.3 || sc.state === 'lost') break; } }
  r.draw({ levelId: id, level: lv, scene: sc, pointer: { active: false }, mode: 'play' }, 16.7);
  return c;
}
const pairs = [[17, 19], [16, 27], [23, 36]];
const CW = 620, CH = 368, CAP = 26;
const sheet = createCanvas(CW * 2, (CH + CAP) * pairs.length);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#161c24'; sctx.fillRect(0, 0, sheet.width, sheet.height);
pairs.forEach((pr, row) => {
  pr.forEach((id, col) => {
    const c = shot(id);
    const x = col * CW, y = row * (CH + CAP);
    sctx.drawImage(c, 0, 0, 1280, 760, x, y, CW, CH);
    sctx.fillStyle = '#161c24'; sctx.fillRect(x, y + CH, CW, CAP);
    sctx.fillStyle = '#e8f0f6'; sctx.font = '600 16px Fredoka, sans-serif';
    sctx.fillText(`${id}  ${HG.levelById(id).name}`, x + 8, y + CH + 18);
  });
});
fs.writeFileSync(path.resolve(__dirname, '../../shots/verify/near-duplicates.png'), sheet.toBuffer('image/png'));
console.log('wrote near-duplicates.png');
