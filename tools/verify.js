/* ==========================================================================
   tools/verify.js — headless playthrough of every level.

   npm run verify        checks all levels with tools/solutions.js
   npm run verify -- 7    checks a single level and prints droplet detail
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
const only = process.argv[2] ? parseInt(process.argv[2], 10) : null;
const verbose = !!only;

let fails = 0;
const rows = [];

for (const level of HG.LEVELS) {
  if (only && level.id !== only) continue;
  const strokes = (SOLUTIONS[level.id] || []).map((pl) => poly(pl));
  const r = play(HG, level.id, strokes, { frames: 60 * 30 });
  rows.push(r);
  if (!r.won) fails++;
  const fillStr = r.fills.map((f) => f.fill.toFixed(2) + '/' + f.need).join(' ');
  const stars = HG.starCount(r.inkUsed, r.budget);
  const line =
    String(r.id).padStart(2, ' ') + '. ' +
    r.name.padEnd(18, ' ') +
    (r.won ? 'WON ' : 'FAIL') +
    '  fill[' + fillStr + ']' +
    '  ink ' + String(Math.round(r.inkUsed)).padStart(4, ' ') + '/' + r.budget +
    '  ' + stars + '★' +
    '  ' + r.seconds + 's' +
    (r.errors.length ? '  ' + r.errors.join(',') : '');
  console.log(line);
  if (verbose || !r.won) {
    console.log('     water left in world:', r.waterLeft, ' state:', r.state);
    r.fills.forEach((f) => console.log('     glass:', JSON.stringify(f)));
  }
}

console.log('\n' + (rows.length - fails) + '/' + rows.length + ' levels solvable');
process.exit(fails ? 1 : 0);
