/* tools/trace.js — step a level and print what happens every N frames. */
'use strict';
const fs = require('fs');
const { boot, poly, STEP } = require('./simheadless');
const HG = boot();
const id = parseInt(process.argv[2], 10);
let raw = process.argv[3];
if (raw && raw.endsWith('.json')) raw = fs.readFileSync(raw, 'utf8');
const strokesRaw = raw ? JSON.parse(raw) : [];
const level = HG.levelById(id);
const scene = new HG.Scene(level);
const draw = (pts) => {
  const st = poly(pts);
  scene.beginInk(st[0].x, st[0].y);
  for (let i = 1; i < st.length; i++) scene.addInkPoint(st[i].x, st[i].y);
  scene.endInk();
};
strokesRaw.forEach(draw);
scene.start();
for (let f = 0; f <= 60 * 12; f++) {
  scene.step(STEP); scene.physics(STEP);
  if (f % 30 === 0) {
    const g = scene.glasses[0];
    const ps = scene.water.particles;
    const inside = ps.filter((p) => g.contains(p.body.position.x, p.body.position.y)).length;
    console.log(
      String(f).padStart(4) + 'f  glass ' + Math.round(g.cx) + ',' + Math.round(g.cy) + '@' + g.angle.toFixed(2) +
      '  fill ' + g.fill.toFixed(2) + '  water ' + ps.length + ' inside ' + inside +
      '  ink ' + Math.round(scene.ink.used) + '  state ' + scene.state + (scene.frozen ? ' (frozen)' : '')
    );
    const sample = ps.slice(0, 6).map((p) => Math.round(p.body.position.x) + ',' + Math.round(p.body.position.y)).join(' ');
    console.log('       at ' + sample);
  }
  if (scene.state === 'won' || scene.state === 'lost') break;
}
