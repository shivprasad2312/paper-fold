/* ==========================================================================
   tools/flaky.js — plays every reference solution N times and reports any
   level that fails even once. A level that only sometimes works is a bug.

   node tools/flaky.js [runs]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const runs = parseInt(process.argv[2] || '4', 10);
const HG = boot();
const fails = {};
const worst = {};

for (let run = 0; run < runs; run++) {
  for (const lv of HG.LEVELS) {
    const r = play(HG, lv.id, (SOLUTIONS[lv.id] || []).map(poly), { frames: 60 * 26 });
    r.fills.forEach((f, i) => {
      const key = lv.id + ':' + i;
      worst[key] = Math.min(worst[key] === undefined ? 9 : worst[key], f.fill);
      if (f.fill < f.need) fails[key] = (fails[key] || 0) + 1;
    });
  }
}

const failed = Object.keys(fails);
if (!failed.length) {
  console.log('stable: every level won in all ' + runs + ' runs');
} else {
  for (const k of failed) {
    const [id, i] = k.split(':');
    console.log('FLAKY level ' + id + ' glass ' + i + ': lost ' + fails[k] + '/' + runs +
      ' runs, worst fill ' + worst[k].toFixed(2));
  }
}
process.exit(failed.length ? 1 : 0);
