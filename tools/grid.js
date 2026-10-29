/* ==========================================================================
   tools/grid.js — coarse search for a one-stroke solution to a level.
   Used during level design to confirm the layout is beatable.

   node tools/grid.js <levelId> [--top 5]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const HG = boot();
const id = parseInt(process.argv[2], 10);
const ti = process.argv.indexOf('--top');
const TOP = ti > 0 ? parseInt(process.argv[ti + 1], 10) : 5;
const level = HG.levelById(id);
const ai = process.argv.indexOf('--tap');
const tap = level.faucets[ai > 0 ? parseInt(process.argv[ai + 1], 10) : 0];
const gi = process.argv.indexOf('--glass');
const target = level.glasses[gi > 0 ? parseInt(process.argv[gi + 1], 10) : 0];
const span = 320;

const starts = [];
for (const dx of [-70, -35, 0, 35, 70]) {
  for (const dy of [50, 110, 170, 240]) starts.push([tap.x + dx, tap.y + dy]);
}
const ends = [];
for (let x = target.x - span; x <= target.x + span; x += 44) {
  for (let y = target.y - 250; y <= target.y - 40; y += 42) ends.push([x, y]);
}

const results = [];
for (const s of starts) {
  for (const e of ends) {
    const strokes = [[s, e]];
    const r = play(HG, id, strokes.map(poly), { frames: 60 * 22 });
    let score = 0;
    for (const f of r.fills) score += Math.min(f.fill, f.need) / f.need;
    score /= Math.max(1, r.fills.length);
    if (r.won) score += 1;
    results.push({ score, won: r.won, ink: Math.round(r.inkUsed), strokes });
  }
}
results.sort((a, b) => b.score - a.score || a.ink - b.ink);
const seen = new Set();
let printed = 0;
for (const r of results) {
  if (printed >= TOP) break;
  const key = r.won ? 'won' : Math.round(r.score * 10);
  if (!r.won && seen.has(key)) continue;
  seen.add(key);
  printed++;
  console.log(
    (r.won ? 'WON  ' : (r.score * 100).toFixed(0).padStart(3, ' ') + '% ') +
    ' ink ' + String(r.ink).padStart(4, ' ') + '  ' + JSON.stringify(r.strokes)
  );
}
