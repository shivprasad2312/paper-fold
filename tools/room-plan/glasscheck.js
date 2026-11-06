const { boot, STEP, seed } = require('/home/user/paper-fold/tools/simheadless');
const { createCanvas } = require('@napi-rs/canvas');
const path = require('path');
const HG = boot();
require(path.resolve('/home/user/paper-fold/js/render.js'));
// sample the same pixel row of an empty glass across 40 frames: if it is steady
// the row is identical frame to frame.
function frameRow(id, f) {
  seed(1234 + id);
  const lv = JSON.parse(JSON.stringify(HG.levelById(id))); delete lv.tip;
  const sc = new HG.Scene(lv);
  const c = createCanvas(1280, 760); const ctx = c.getContext('2d');
  const r = new HG.Renderer({ clientWidth: 1280, clientHeight: 760, width: 1280, height: 760, getContext: () => ctx });
  r.dpr = 1;
  r.t = f * 16.7;
  for (let i = 0; i < f; i++) { sc.step(STEP); sc.physics(STEP); }
  r.draw({ levelId: id, level: lv, scene: sc, pointer: { active: false }, mode: 'play' }, 16.7);
  const g = sc.glasses[0];
  const d = ctx.getImageData(Math.round(g.x) - 20, Math.round(g.top) - 30, 40, 1).data;
  return Array.from(d).join(',');
}
for (const id of [1, 12]) {
  const a = frameRow(id, 2), b = frameRow(id, 20), c2 = frameRow(id, 38);
  console.log('R' + id, 'identical across frames?', a === b && b === c2 ? 'YES (steady)' : 'NO (still moving)');
}
