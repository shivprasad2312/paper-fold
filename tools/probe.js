/* tools/probe.js — try a set of strokes against a level and print the result.

   node tools/probe.js 26 '[[[400,250],[660,330]],[[630,470],[790,470]]]'
   node tools/probe.js 26 solutions.json
*/
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const id = parseInt(process.argv[2], 10);
let raw = process.argv[3];
if (raw && raw.endsWith('.json')) raw = fs.readFileSync(raw, 'utf8');
const strokesRaw = raw ? JSON.parse(raw) : [];
const strokes = strokesRaw.map(poly);

// a single-stroke list is accepted too
const list = Array.isArray(strokesRaw[0]) && Array.isArray(strokesRaw[0][0]) ? strokes : [strokes];
const r = play(HG, id, list, { frames: 60 * 26 });
console.log(`${id}. ${r.name}: ${r.state}  ink ${Math.round(r.inkUsed)}/${r.budget}  ${HG.starCount(r.inkUsed, r.budget)}★  ${r.seconds}s`);
r.fills.forEach((f, i) => console.log(`  glass${i}: fill ${f.fill.toFixed(2)} / need ${f.need}   count ${f.count}`));
if (r.glasses) r.glasses.forEach((g, i) => console.log(`  glass${i} pose: x ${g.x} y ${g.y} angle ${g.angle}`));
console.log('  lost droplets:', r.removed.length, ' live:', r.live.length);
if (r.errors.length) console.log('  errors:', r.errors.slice(0, 3).join(' | '));
