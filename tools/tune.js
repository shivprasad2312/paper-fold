/* tools/tune.js — quick single-level experiment tool.
   node tools/tune.js <levelId> '<json: [[[x,y],...], ...]>'
*/
'use strict';
const { boot, play, poly } = require('./simheadless');
const HG = boot();
const id = parseInt(process.argv[2], 10);
const raw = process.argv[3];
const strokes = raw ? JSON.parse(raw).map((pl) => poly(pl)) : [];
const r = play(HG, id, strokes, { frames: 60 * 30 });
const stars = HG.starCount(r.inkUsed, r.budget);
console.log(`${id}. ${r.name}: ${r.state}  ink ${Math.round(r.inkUsed)}/${r.budget} ${stars}★  ${r.seconds}s`);
r.fills.forEach((f, i) => console.log(`  glass${i}: fill ${f.fill.toFixed(2)} need ${f.need} count ${f.count}`));
console.log('  live droplets:', r.live.length, r.live.slice(0, 12).map((p) => p.x + ',' + p.y).join(' '));
const buckets = {};
for (const p of r.removed) {
  const k = Math.round(p.x / 80) * 80;
  buckets[k] = (buckets[k] || 0) + 1;
}
console.log('  lost x-buckets:', JSON.stringify(buckets));
console.log('  lost y-range:', r.removed.length ? Math.min(...r.removed.map(p => p.y)) + '..' + Math.max(...r.removed.map(p => p.y)) : '-');
if (r.errors.length) console.log('  errors:', r.errors.slice(0, 3).join(' | '));
