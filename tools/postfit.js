/* tools/postfit.js — slides each level's prop post sideways until the reference
   solution clears its target comfortably, so a 20 px pillar never dam the flow.
   node tools/postfit.js [write] */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();
function seed(n) { let s = n >>> 0 || 1; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const plan = [];
for (const lv0 of HG.LEVELS) {
  const base = JSON.parse(JSON.stringify(lv0));
  const strokes = (SOL[lv0.id] || []).map(poly);
  if (!strokes.length) continue;
  // candidate posts = the last platform(s) added by tools/props.js (kind stone)
  const idx = base.platforms.map((p, i) => (p.kind === 'stone' ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) continue;
  let best = null;
  for (const dx of [-12, -6, 0, 6, 12]) {
    const lv = JSON.parse(JSON.stringify(base));
    const p = Object.assign({}, lv.platforms[idx[idx.length - 1]]);
    p.x += dx; p.w = 20;
    lv.platforms[idx[idx.length - 1]] = p;
    const fills = [];
    for (const sd of [7, 19]) {
      seed(sd);
      const r = play(HG, lv0.id, strokes, { frames: 60 * 16, level: lv });
      fills.push(...(r.fills || []).map((f) => f.fill));
    }
    const min = Math.min(...fills);
    if (!best || min > best.min) best = { dx, min, fills };
  }
  plan.push({ id: lv0.id, name: lv0.name, lastStone: idx[idx.length - 1], ...best });
  console.log('L' + String(lv0.id).padStart(2), lv0.name.padEnd(17), 'dx', String(best.dx).padStart(3),
    'min', best.min.toFixed(2), JSON.stringify(best.fills.map((f) => +f.toFixed(2))));
}
fs.writeFileSync('/tmp/postfit.json', JSON.stringify(plan, null, 1));
