/* tools/cushion.js — lower the fill target of any level whose reference solution
   fails in at least one seeded run, so a correct solution never hangs on a
   single droplet.
   Run after any physics or geometry change.

   It is deliberately *not* "shave every level that looks tight": that ratchets
   every target down a little on every run, and after a few rounds the levels are
   much easier than they were designed to be. Only a level that actually loses a
   run gets touched, and its new target is derived from the worst run. */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();
function seed(n) { let s = n >>> 0 || 1; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const SEEDS = [3, 7, 11, 19, 23, 31, 43, 57];
const weak = [];
for (const lv of HG.LEVELS) {
  const worst = lv.glasses.map(() => Infinity);
  let lost = false;
  for (const sd of SEEDS) {
    seed(sd);
    const r = play(HG, lv.id, (SOL[lv.id] || []).map(poly), { frames: 60 * 20 });
    (r.fills || []).forEach((f, i) => {
      worst[i] = Math.min(worst[i], f.fill);
      if (f.fill < f.need) lost = true;
    });
  }
  if (lost) weak.push({ name: lv.name, worst: worst.map((w) => +(w - 0.03).toFixed(2)) });
}
if (!weak.length) { console.log('every reference solution wins in all ' + SEEDS.length + ' seeded runs'); process.exit(0); }
let src = fs.readFileSync('js/levels.js', 'utf8');
for (const w of weak) {
  let start = src.indexOf("name: '" + w.name + "'");
  if (start < 0) start = src.indexOf('name: "' + w.name + '"');
  let end = src.indexOf('name: ', start + 8);
  if (end < 0) end = src.length;
  let i = 0;
  const block = src.slice(start, end).replace(/need: (0\.\d+)/g, (m, v) => {
    const capped = Math.max(0.35, Math.min(parseFloat(v), w.worst[i++]));
    return 'need: ' + capped.toFixed(2);
  });
  src = src.slice(0, start) + block + src.slice(end);
}
fs.writeFileSync('js/levels.js', src);
console.log('cushion applied to:', weak.map((w) => w.name + ' -> ' + w.worst.join(',')).join(', '));
