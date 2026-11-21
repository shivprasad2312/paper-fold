/* ==========================================================================
   tools/solve-sheet.js — find a stroke that wins each room copied off the
   reference sheet.

   The rooms are copied exactly, so the solver is not allowed to move anything:
   it only draws ink. It tries a handful of structured shapes anchored to the
   tap and the cup (ramps, funnels, walls, shelves) and then a seeded random
   search. A room it cannot solve is reported, not faked.

   node tools/solve-sheet.js <first> <last> [outfile]   one slice
   node tools/solve-sheet.js [outfile]                   every room
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
require('../js/levels-pdf.js');

const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const outFile = process.argv.slice(2).find((a) => a.endsWith('.json')) || null;
const lo = nums.length >= 2 ? Math.min(nums[0], nums[1]) : 1;
const hi = nums.length >= 2 ? Math.max(nums[0], nums[1]) : (nums[0] || 135);

let found = outFile && fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const save = () => { if (outFile) fs.writeFileSync(outFile, JSON.stringify(found)); };

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ink shapes a player would plausibly draw, pinned to the tap and the cups */
function structured(lv) {
  const out = [];
  const f = lv.faucets[0];
  if (!f) return out;
  const dir = f.dir || 'down';
  const ox = dir === 'left' ? f.x - 34 : dir === 'right' ? f.x + 34 : f.x;
  const oy = dir === 'up' ? f.y - 8 : f.y + 8;
  lv.glasses.forEach((g) => {
    const mouth = g.y - g.h / 2;
    const top = mouth - 30;
    for (const dx of [0, -60, 60, -120, 120]) {
      out.push([[ox, oy + 26], [g.x + dx * 0.5, top]]);
      out.push([[ox, oy + 14], [g.x + dx, top - 30]]);
    }
    out.push([[ox - 80, oy + 40], [ox + 30, oy + 40], [g.x, top]]);
    out.push([[ox + 80, oy + 40], [ox - 30, oy + 40], [g.x, top]]);
    out.push([[g.x - 110, top - 40], [g.x - 26, mouth - 10]]);
    out.push([[g.x + 110, top - 40], [g.x + 26, mouth - 10]]);
    out.push([[g.x - 110, top - 40], [g.x - 26, mouth - 10],
              [g.x + 26, mouth - 10], [g.x + 110, top - 40]]);
  });
  const g = lv.glasses[0];
  const bottom = g ? g.y - g.h / 2 - 40 : oy + 200;
  out.push([[ox + 46, oy + 40], [ox + 46, bottom]]);
  out.push([[ox - 46, oy + 40], [ox - 46, bottom]]);
  return out;
}

const tryStroke = (lv, pts, frames) => {
  const r = play(HG, lv.id, [poly(pts)], { frames: frames || 60 * 30 });
  return r.won ? r : null;
};

HG.PDF_LEVELS.forEach((lv, i) => {
  const n = i + 1;
  if (n < lo || n > hi) return;
  if (!lv.faucets.length) { console.log(n, 'no tap'); return; }
  const base = play(HG, lv.id, [], { frames: 60 * 24 });
  if (base.won) { found[n] = []; console.log(n, 'no ink needed'); save(); return; }

  for (const c of structured(lv)) {
    if (tryStroke(lv, c)) {
      found[n] = [c];
      console.log(n, 'structured', JSON.stringify(c.map((p) => p.map(Math.round))));
      save();
      return;
    }
  }

  const g = lv.glasses[0];
  const f = lv.faucets[0];
  const R = rand(1000 + n);
  for (let k = 0; k < 260; k++) {
    const ax = f.x + (R() - 0.5) * 220;
    const ay = f.y + 10 + R() * 120;
    const bx = g ? g.x + (R() - 0.5) * 200 : f.x + (R() - 0.5) * 300;
    const by = g ? g.y - g.h / 2 - 10 - R() * 120 : f.y + 200 + R() * 200;
    const mid = R() < 0.35
      ? [[(ax + bx) / 2 + (R() - 0.5) * 120, (ay + by) / 2 + (R() - 0.5) * 80]]
      : [];
    const c = [[ax, ay]].concat(mid, [[bx, by]]);
    if (tryStroke(lv, c, 60 * 26)) {
      found[n] = [c];
      console.log(n, 'random', JSON.stringify(c.map((p) => p.map(Math.round))));
      save();
      return;
    }
  }
  console.log(n, 'NONE');
  save();
});
