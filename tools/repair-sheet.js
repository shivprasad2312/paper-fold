/* ==========================================================================
   tools/repair-sheet.js — re-prove the copied rooms' reference strokes.

   The sheet rooms were solved against a cup sized from the drawing. Every room
   now uses the game's own glass — wider and taller — so a stroke that used to
   land in the small cup can miss the big one. This tool takes the stored
   stroke, sweeps its end point over the mouth of the real glass, and keeps a
   stroke only if it is actually replayed and wins. A room that cannot be
   re-proved is reported, not invented.

   node tools/repair-sheet.js <first> <last> <outfile>
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
require('../js/levels-pdf.js');
const STORED = require('./solutions-sheet');

const lo = Number(process.argv[2]);
const hi = Number(process.argv[3]);
const OUT = process.argv[4] || '/tmp/sheet-repaired.json';

const score = (id, strokes) => {
  const r = play(HG, id, strokes.map((s) => poly(s)), { frames: 60 * 26 });
  const fills = r.fills || [];
  const worst = fills.length ? Math.min(...fills.map((f) => f.fill / f.need)) : 0;
  return { won: r.won, sc: r.won ? 2 : worst, fills };
};

const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(done));

for (let n = lo; n <= hi; n++) {
  if (done[n]) continue;
  const id = 40 + n;
  const lv = HG.levelById(id);
  if (!lv) continue;
  // where the cup ACTUALLY stands in the built scene: the shared glass is
  // placed, not sized, and it is nudged a little to sit squarely on its ledge
  const pen = new HG.Scene(JSON.parse(JSON.stringify(lv)));
  const cupAt = pen.glasses.map((g) => ({ x: g.x, y: g.y }));
  pen.destroy();
  const strokes = JSON.parse(JSON.stringify(STORED[n] || []));
  const out = { won: false, strokes: [] };

  if (!strokes.length) {
    // the room is meant to need no ink at all: check that it still does not
    const r = score(id, []);
    out.won = r.won;
    out.strokes = [];
    out.noInk = true;
  } else {
    let best = { strokes, r: score(id, strokes) };
    const cups = cupAt;
    if (!best.r.won) {
      for (const cup of cups) {
        for (const dy of [-26, -8, 10, 30, 52]) {
          for (const dx of [-46, -26, -8, 8, 26, 46]) {
            for (let s = 0; s < strokes.length && !best.r.won; s++) {
              const cand = strokes.map((str, k) => str.map((p) => p.slice()));
              cand[s][cand[s].length - 1] = [cup.x + dx, cup.y - 59 + dy];
              const r = score(id, cand);
              if (r.sc > best.r.sc + 1e-9) best = { strokes: cand, r };
            }
            if (best.r.won) break;
          }
          if (best.r.won) break;
        }
        if (best.r.won) break;
      }
    }
    out.won = best.r.won;
    out.sc = +best.r.sc.toFixed(3);
    out.strokes = best.won
      ? best.strokes.map((s) => s.map((p) => [+(+p[0]).toFixed(1), +(+p[1]).toFixed(1)]))
      : [];
  }
  done[n] = out;
  save();
  const tag = out.won ? (out.noInk ? 'no-ink' : 'stroke') : 'FAIL ' + (out.sc || 0).toFixed(2);
  console.log(n, tag);
}
console.log('slice ' + lo + '-' + hi + ' done');
