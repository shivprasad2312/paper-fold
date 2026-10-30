/* tools/cushion.js — lower every fill target that the reference solution only
   clears by ~1 droplet, so a correct solution never hangs on a single particle.
   Run after any physics or geometry change. */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();
function seed(n) { let s = n >>> 0 || 1; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const weak = [];
for (const lv of HG.LEVELS) {
  const margins = [];
  for (const sd of [7, 19, 31]) {
    seed(sd);
    const r = play(HG, lv.id, (SOL[lv.id] || []).map(poly), { frames: 60 * 16 });
    (r.fills || []).forEach((f, i) => margins.push(f.fill - lv.glasses[i].need));
  }
  // one droplet is ~0.018 of a glass; insist on a two-droplet cushion
  if (Math.min(...margins) < 0.035) weak.push(lv.name);
}
if (!weak.length) { console.log('every level already has a 2-droplet cushion'); process.exit(0); }
let src = fs.readFileSync('js/levels.js', 'utf8');
for (const name of weak) {
  let start = src.indexOf("name: '" + name + "'");
  if (start < 0) start = src.indexOf('name: "' + name + '"');
  let end = src.indexOf('name: ', start + 8);
  if (end < 0) end = src.length;
  const block = src.slice(start, end).replace(/need: (0\.\d+)/g, (m, v) => {
    const n = Math.max(0.35, +(parseFloat(v) - 0.04).toFixed(2));
    return 'need: ' + n.toFixed(2);
  });
  src = src.slice(0, start) + block + src.slice(end);
}
fs.writeFileSync('js/levels.js', src);
console.log('cushion applied to:', weak.join(', '));
