/* ==========================================================================
   tools/autotune.js — searches for a working stroke for a level.

   Used while designing levels: start from the authored solution and hill-climb
   the stroke endpoints until the level is actually won in the simulation.

   node tools/autotune.js <levelId> [--budget sims]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
const id = parseInt(process.argv[2], 10);
const level = HG.levelById(id);
const bi = process.argv.indexOf('--budget');
const MAX_SIMS = bi > 0 ? parseInt(process.argv[bi + 1], 10) : 260;

let sims = 0;

function score(strokes) {
  sims++;
  const r = play(HG, id, strokes.map((pl) => poly(pl)), { frames: 60 * 26 });
  let s = 0;
  for (const f of r.fills) s += Math.min(f.fill, f.need) / f.need;
  s = (s / Math.max(1, r.fills.length)) * 100;
  if (r.won) s += 1000 - r.inkUsed * 0.05;
  return { s, r };
}

// deep copy of the authored solution
let best = JSON.parse(JSON.stringify(SOLUTIONS[id] || []));
if (!best.length) {
  const tap = level.faucets[0];
  const g = level.glasses[0];
  best = [[[tap.x - 40, tap.y + 140], [g.x - 40, g.y - 120]]];
}

var clampPt = (p, isFirst) => {
  const tap = level.faucets[0];
  if (isFirst && tap) {
    p[0] = Math.max(tap.x - 150, Math.min(tap.x + 150, p[0]));
    p[1] = Math.max(tap.y + 30, Math.min(tap.y + 420, p[1]));
  }
  p[0] = Math.max(24, Math.min(HG.W - 24, p[0]));
  p[1] = Math.max(24, Math.min(HG.H - 24, p[1]));
  return p;
};

let cur = score(best);
console.log(`${id}. ${level.name} — start score ${cur.s.toFixed(0)}`);

// ---- multi-start: jitter the authored solution to escape local optima
const START_SIMS = 70;
if (process.argv.indexOf('--no-random') < 0) {
  let bestRand = null;
  for (let i = 0; i < START_SIMS && !cur.r.won; i++) {
    const cand = JSON.parse(JSON.stringify(best));
    for (const stroke of cand) {
      for (const p of stroke) {
        p[0] += (Math.random() - 0.5) * 220;
        p[1] += (Math.random() - 0.5) * 150;
      }
    }
    cand.forEach((stroke) => stroke.forEach((p) => clampPt(p, false)));
    const res = score(cand);
    if (!bestRand || res.s > bestRand.s) { bestRand = { s: res.s, cand, r: res.r }; }
    if (res.s > cur.s) { cur = res; best = cand; }
  }
  if (bestRand && bestRand.s > cur.s) { cur = { s: bestRand.s, r: bestRand.r }; best = bestRand.cand; }
  console.log('after random starts: score', cur.s.toFixed(0), 'won:', !!(cur.r && cur.r.won), 'sims', sims);
}

const steps = [70, 40, 22, 12, 6];
for (const step of steps) {
  for (let pass = 0; pass < 2; pass++) {
    for (let si = 0; si < best.length; si++) {
      for (let pi = 0; pi < best[si].length; pi++) {
        for (let axis = 0; axis < 2; axis++) {
          for (const dir of [-1, 1]) {
            if (sims > MAX_SIMS) break;
            const cand = JSON.parse(JSON.stringify(best));
            cand[si][pi][axis] += step * dir;
            clampPt(cand[si][pi], pi === 0 && si === 0);
            const res = score(cand);
            if (res.s > cur.s + 0.01) {
              cur = res;
              best = cand;
            }
          }
        }
      }
    }
  }
  if (cur.r && cur.r.won) break;
}

console.log('final score', cur.s.toFixed(0), 'sims', sims);
console.log('result:', JSON.stringify({ won: cur.r.won, ink: Math.round(cur.r.inkUsed), fills: cur.r.fills.map((f) => f.fill.toFixed(2)) }));
console.log('strokes:', JSON.stringify(best));
