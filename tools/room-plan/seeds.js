/* tools/room-plan/seeds.js — does a trap room win under random seeds, or only
   under the one the solver happened to use?

   The proof harness seeds Math.random with 1234 + id before building a scene.
   If a room only wins at that seed, it is not a room: the browser rolls its own
   dice. This replays each room's authored answer at many seeds.

   node tools/room-plan/seeds.js [--runs N] [--id 18,20] */
'use strict';
const { boot, play, poly } = require('../simheadless');
const HG = boot();
const { levelOf } = require('./lib');
const TRAPS = require('./traps');

const args = process.argv.slice(2);
const ri = args.indexOf('--runs');
const RUNS = ri >= 0 ? Number(args[ri + 1]) : 24;
const ii = args.indexOf('--id');
const only = ii >= 0 ? args[ii + 1].split(',').map(Number) : null;

const rooms = Object.keys(TRAPS).filter((k) => TRAPS[k] && TRAPS[k].glasses)
  .map((k) => TRAPS[k]).sort((a, b) => a.id - b.id)
  .filter((r) => !only || only.includes(r.id));

let allOk = true;
for (const room of rooms) {
  const strokes = (room.answers || [room.answer]).filter(Boolean).map(poly);
  let won = 0, spoiled = 0;
  const fills = [];
  for (let s = 0; s < RUNS; s++) {
    const r = play(HG, room.id, strokes, { frames: 60 * 30, level: levelOf(room), seed: 90210 + s * 7717 });
    if (r.won) won++;
    if (r.fills.some((f) => f.spoiled)) spoiled++;
    fills.push(Math.min(...r.fills.map((f) => f.fill)));
  }
  const rate = won / RUNS;
  if (rate < 1) allOk = false;
  const lo = Math.min(...fills).toFixed(2), hi = Math.max(...fills).toFixed(2);
  console.log(`${rate === 1 ? 'SOLID' : 'FLAKY'} ${String(room.id).padStart(2)} ${room.name.padEnd(15)} won ${String(won).padStart(2)}/${RUNS}` +
    `  spoiled ${String(spoiled).padStart(2)}  worst fill ${lo}  best ${hi}`);
}
console.log(allOk ? '\nEVERY room wins at every seed tested' : '\nSOME ROOMS ARE SEED-DEPENDENT');
