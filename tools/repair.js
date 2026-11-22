/* ==========================================================================
   tools/repair.js — re-prove an existing reference stroke after the game's
   glass or water changed, and find a nearby one if it no longer works.

   The reference strokes in tools/solutions.js were drawn when the cup was
   smaller and the droplets bigger. Moving the cup or halving the droplet does
   not invalidate the PUZZLE, only the exact line: so this tool starts from the
   line that used to work, measures it, and searches in a narrow neighbourhood
   of it (a few px at a time, then coarser) for a line that still wins. Ink is
   the room's own budget, because that is what a player has.

   node tools/repair.js <id> [id ...]
   node tools/repair.js --all
   node tools/repair.js --emit            -> writes tools/solutions.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const SOLUTIONS = require('./solutions');
const STEP = 1000 / 60;
const CACHE = '/tmp/repair';
if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

const args = process.argv.slice(2);
const EMIT = args.includes('--emit');
const ALL = args.includes('--all');
const ids = ALL ? Object.keys(SOLUTIONS).map(Number).sort((a, b) => a - b)
  : args.filter((a) => /^\d+$/.test(a)).map(Number);

const score = (id, strokes) => {
  const r = play(HG, id, strokes.map((s) => poly(s)), { frames: 60 * 26 });
  const fills = r.fills || [];
  const worst = fills.length ? Math.min(...fills.map((f) => f.fill / f.need)) : 0;
  const total = fills.length ? fills.reduce((a, f) => a + f.fill / f.need, 0) / fills.length : 0;
  return { won: r.won, sc: r.won ? 2 : worst * 0.9 + total * 0.1, fills, ink: r.inkUsed, budget: r.budget };
};

function repair(id) {
  const file = path.join(CACHE, 'R' + id + '.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const start = JSON.parse(JSON.stringify(SOLUTIONS[id] || []));
  let best = { strokes: start, r: score(id, start) };
  const record = () => {
    // one entry per room = a LIST of strokes, each stroke a list of [x, y]
    const out = { id, won: best.r.won, sc: +best.r.sc.toFixed(3),
      strokes: best.strokes.map((s) => s.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)])),
      ink: Math.round(best.r.ink), budget: best.r.budget };
    fs.writeFileSync(file, JSON.stringify(out));
    return out;
  };
  if (!start.length) return record();          // nothing to move: not a stroke answer
  // The mouth is what moved (the shared glass is wider and taller), so the
  // cheapest question is where the LAST point of each stroke should be: sweep it
  // over a grid around the cup's mouth and keep the best, before any climbing.
  const lv = HG.levelById(id);
  const cups = lv.glasses || [];
  for (const cup of cups) {
    for (const dy of [-30, -12, 6, 26, 46]) {
      for (const dx of [-50, -30, -12, 6, 26, 50]) {
        for (let s = 0; s < best.strokes.length; s++) {
          const cand = best.strokes.map((str, k) => str.map((p) => p.slice()));
          const last = cand[s].length - 1;
          cand[s][last] = [cup.x + dx, cup.y - 59 + dy];
          const r = score(id, cand);
          if (r.sc > best.r.sc + 1e-9) best = { strokes: cand, r };
        }
        if (best.r.won) return record();
      }
    }
  }
  for (const step of [2, 5, 9, 14, 20, 28]) {
    if (best.r.won) break;
    let improved = true, guard = 0;
    while (improved && guard++ < 8 && !best.r.won) {
      improved = false;
      for (let s = 0; s < best.strokes.length; s++) {
        for (let i = 0; i < best.strokes[s].length; i++) {
          for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step],
            [step, step], [-step, -step], [step, -step], [-step, step]]) {
            const cand = best.strokes.map((str, k) =>
              (k === s ? str.map((p, j) => (j === i ? [p[0] + dx, p[1] + dy] : p.slice())) : str.map((p) => p.slice())));
            const r = score(id, cand);
            if (r.sc > best.r.sc + 1e-9) { best = { strokes: cand, r }; improved = true; }
          }
        }
      }
    }
  }
  return record();
}

if (require.main === module) {
  const rows = ids.map(repair);
  const won = rows.filter((r) => r.won);
  console.log(won.length + '/' + rows.length + ' reference strokes re-proved');
  console.log('not proved:', rows.filter((r) => !r.won).map((r) => r.id + ' (' + r.sc.toFixed(2) + ')').join(' ') || 'none');
  if (EMIT) {
    const src = fs.readFileSync(path.join(__dirname, 'solutions.js'), 'utf8');
    const head = src.slice(0, src.indexOf('module.exports'));
    const obj = {};
    for (const r of won) obj[r.id] = r.strokes;
    for (const id of Object.keys(SOLUTIONS).map(Number)) {
      if (!obj[id] && !won.length) continue;
      if (!obj[id]) obj[id] = SOLUTIONS[id];
    }
    fs.writeFileSync(path.join(__dirname, 'solutions.js'),
      head + 'module.exports = ' + JSON.stringify(obj, null, 0).replace(/","/g, '", "') + ';\n');
    console.log('wrote tools/solutions.js with', Object.keys(obj).length, 'entries');
  }
}
module.exports = { repair, score };
