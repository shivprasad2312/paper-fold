/* tools/room-plan/distinct.js — are these rooms actually DIFFERENT ROOMS?

   The first distinctness check compared each room's platform list as numbers.
   That is not the same as looking different: two rooms can share a signature
   and still play differently, and (worse) two rooms can differ in the data and
   still look like the same room with the props nudged.

   So this does both:
     1. a perceptual fingerprint (64-bit dHash) of each room rendered untouched,
        compared pairwise by Hamming distance;
     2. a geometry signature — what furniture the room has and where, bucketed
        to 40 px, so "same room, moved 10 px" is caught.

   node tools/room-plan/distinct.js [--shipped|--trap] [--max N] */
'use strict';
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { boot, STEP, seed } = require('../simheadless');
const HG = boot();
require(path.resolve(__dirname, '../../js/render.js'));
const { levelOf } = require('./lib');

// ---- render one room untouched and return a 9x8 grayscale fingerprint
function fingerprint(level, id) {
  seed(1234 + id);
  const lv = JSON.parse(JSON.stringify(level));
  delete lv.tip;
  const sc = new HG.Scene(lv);
  sc.start();
  for (let i = 0; i < 2; i++) { sc.step(STEP); sc.physics(STEP); }   // tap just open, no water yet
  // Draw at the renderer's real size and then sample it down. Drawing into a
  // small canvas while claiming a 1280x760 client clips everything away and
  // every room fingerprints as a blank page.
  const W = 1280, H = 760, STEPPX = 4;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  const fake = { clientWidth: W, clientHeight: H, width: W, height: H, getContext: () => ctx };
  const r = new HG.Renderer(fake);
  r.dpr = 1;
  r.draw({ levelId: id, level: lv, scene: sc, pointer: { active: false }, mode: 'play' }, 16.7);
  const img = ctx.getImageData(0, 0, W, H).data;
  // A flat grayscale raster, not a coarse hash: a 9x8 grid of a mostly-empty
  // play area collapses to the same bits for every room and cannot tell them
  // apart. Keep the pixels and compare them directly.
  const GW = Math.floor(W / STEPPX), GH = Math.floor(H / STEPPX);
  const g = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let sum = 0, n = 0;
    for (let dy = 0; dy < STEPPX; dy += 2) for (let dx = 0; dx < STEPPX; dx += 2) {
      const i = (((y * STEPPX + dy) * W) + (x * STEPPX + dx)) * 4;
      sum += img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114; n++;
    }
    g[y * GW + x] = sum / n;
  }
  return g;
}

// Fraction of pixels that differ by more than a visible step. 0 = identical
// picture; small numbers mean "the same room with something nudged".
function pixelDiff(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 16) n++;
  return n / a.length;
}

// ---- geometry signature: furniture present and where (40 px buckets)
function geometry(level) {
  const b = (v) => Math.round(v / 40);
  const parts = [];
  (level.platforms || []).forEach((p) => parts.push(`P${b(p.x)},${b(p.y)},${b(p.w)},${b(p.h)},${Math.round((p.angle || 0) * 10)}`));
  (level.crates || []).forEach((c) => parts.push(`C${b(c.x)},${b(c.y)},${b(c.w || c.size)},${b(c.h || c.size)}`));
  (level.hots || []).forEach((h) => parts.push(`H${b(h.x)},${b(h.y)},${b(h.w)},${b(h.h)}`));
  (level.fans || []).forEach((f) => parts.push(`F${b(f.x)},${b(f.y)},${b(f.w)},${b(f.h)}`));
  (level.pins || []).forEach((p) => parts.push(`N${b(p.x)},${b(p.y)}`));
  (level.glasses || []).forEach((g) => parts.push(`G${b(g.x)},${b(g.y)}${g.hanging ? 'h' : ''}`));
  (level.faucets || []).forEach((f) => parts.push(`T${b(f.x)}`));
  (level.balls || []).forEach((x) => parts.push(`B${b(x.x)},${b(x.y)}`));
  return parts.sort().join('|');
}
module.exports = { fingerprint, geometry, pixelDiff };

if (require.main === module) {
  const args = process.argv.slice(2);
  const set = args.includes('--trap') ? 'trap' : 'shipped';
  let rooms;
  if (set === 'trap') {
    const T = require('./traps');
    rooms = Object.keys(T).filter((k) => T[k] && T[k].glasses).map((k) => T[k]).sort((a, b) => a.id - b.id)
      .map((r) => ({ id: r.id, name: r.name, level: levelOf(r) }));
  } else {
    rooms = HG.LEVELS.map((lv) => ({ id: lv.id, name: lv.name, level: lv }));
  }
  const fp = new Map(), geo = new Map();
  for (const r of rooms) { fp.set(r.id, fingerprint(r.level, r.id)); geo.set(r.id, geometry(r.level)); }

  // geometry collisions (same furniture, same places)
  const byGeo = new Map();
  for (const r of rooms) { const g = geo.get(r.id); if (!byGeo.has(g)) byGeo.set(g, []); byGeo.get(g).push(r.id); }
  const geoDupes = [...byGeo.values()].filter((v) => v.length > 1);

  // visual near-duplicates
  const pairs = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    pairs.push({ a: rooms[i].id, b: rooms[j].id, d: pixelDiff(fp.get(rooms[i].id), fp.get(rooms[j].id)) });
  }
  pairs.sort((x, y) => x.d - y.d);
  const nameOf = (id) => (rooms.find((r) => r.id === id) || {}).name;

  console.log(`== ${set}: ${rooms.length} rooms ==`);
  const pct = (v) => (v * 100).toFixed(1) + '%';
  const same = pairs.filter((p) => p.d < 0.02);
  console.log(`\nvisually near-identical (under 2% of pixels differ): ${same.length} pairs`);
  for (const p of same.slice(0, 20)) console.log(`   ${String(p.a).padStart(2)} ${nameOf(p.a).padEnd(16)} ~ ${String(p.b).padStart(2)} ${nameOf(p.b).padEnd(16)} ${pct(p.d)}`);
  const close = pairs.filter((p) => p.d >= 0.02 && p.d < 0.05);
  console.log(`\nclose (2-5% of pixels differ): ${close.length} pairs, nearest 6:`);
  for (const p of close.slice(0, 6)) console.log(`   ${String(p.a).padStart(2)} ${nameOf(p.a).padEnd(16)} ~ ${String(p.b).padStart(2)} ${nameOf(p.b).padEnd(16)} ${pct(p.d)}`);
  console.log(`\ngeometry collisions (same furniture to 40 px): ${geoDupes.length}`);
  for (const g of geoDupes.slice(0, 10)) console.log('   ', g.join(', '));
  const d = pairs.map((p) => p.d).sort((a, b) => a - b);
  console.log(`\npixel-difference spread: min ${pct(d[0])}  median ${pct(d[Math.floor(d.length / 2)])}  max ${pct(d[d.length - 1])}`);
}
