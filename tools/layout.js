/* ==========================================================================
   tools/layout.js — give a level a corridor.

   Every level in this game is one puzzle: get water from the tap to the glass
   using a line that can only rest on scenery. That needs a corridor — a gap
   wide enough for a line, a drop deep enough that the line can slope, and room
   under the line for the supports it will stand on. Some levels were drawn
   before the rule existed: their glass sits almost under the tap (nothing to
   draw), or so close that no line fits (nothing you can draw works).

   This moves the *glass* — and, in the tutorial, the pedestal it stands on —
   to a corridor width that the physics can actually solve, trying a per-level
   order so the levels do not all end up looking the same.

   node tools/layout.js [--apply] [id...]
   writes /tmp/layout.json  { id: { glasses: [{x,y}], platforms?: [...] } }
   with --apply it also rewrites js/levels.js directly.
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot } = require('./simheadless');
const HG = boot();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);

// Corridor shapes, in the order each level tries them: width of the run, and
// how far the rim sits below the tap. Order is rotated per level, so the set
// does not share one silhouette.
const SHAPES = [
  [420, 225], [500, 255], [380, 200], [470, 240],
  [540, 270], [400, 250], [460, 210], [520, 235],
];

const rect = (g) => ({ x0: g.x - g.w / 2, x1: g.x + g.w / 2, y0: g.y - g.h / 2, y1: g.y + g.h / 2 });
const hits = (a, b, pad) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

function scenery(lv, skip) {
  const out = [];
  for (const p of lv.platforms) if (p !== skip) out.push({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2, src: 'platform' });
  for (const c of lv.crates) out.push({ x0: c.x - c.size / 2, x1: c.x + c.size / 2, y0: c.y - c.size / 2, y1: c.y + c.size / 2, src: 'crate' });
  for (const p of (lv.pins || [])) out.push({ x0: p.x - 12, x1: p.x + 12, y0: p.y - 12, y1: p.y + 12, src: 'pin' });
  for (const h of (lv.hots || [])) out.push({ x0: h.x - h.w / 2, x1: h.x + h.w / 2, y0: h.y - h.h / 2, y1: h.y + h.h / 2, src: 'hot' });
  return out;
}

const out = {};
const targets = ids.length ? ids : HG.LEVELS.map((l) => l.id);
for (const id of targets) {
  const lv = HG.levelById(id);
  const f = lv.faucets[0];
  const g = lv.glasses[0];
  const rot = (id * 3) % SHAPES.length;
  const order = SHAPES.slice(rot).concat(SHAPES.slice(0, rot));
  // a pedestal directly under the glass travels with it
  const pedestal = lv.platforms.filter((p) => Math.abs(p.x - g.x) < 60 && p.y - p.h / 2 > g.y && p.y - p.h / 2 < g.y + g.h + 40);
  const others = lv.platforms.filter((p) => pedestal.indexOf(p) < 0);
  let chosen = null;
  for (const [dx, drop] of order) {
    for (const side of [Math.sign(g.x - f.x) || 1, -(Math.sign(g.x - f.x) || 1)]) {
      const nx = Math.round(f.x + side * dx);
      const ny = Math.round(f.y + drop + g.h / 2);
      const probe = { x: nx, y: ny, w: g.w, h: g.h };
      if (probe.x - g.w / 2 < 26 || probe.x + g.w / 2 > HG.W - 26) continue;
      if (probe.y + g.h / 2 > HG.H - 16) continue;
      const box = rect(probe);
      let bad = false;
      for (const s of scenery(Object.assign({}, lv, { platforms: others }))) if (hits(box, s, 20)) { bad = true; break; }
      if (bad) continue;
      // every hazard must still sit inside the new corridor, or it becomes decoration
      const lo = Math.min(f.x, nx), hi = Math.max(f.x, nx);
      const keep = [];
      for (const h of (lv.hots || [])) keep.push([h.x - h.w / 2, h.x + h.w / 2]);
      for (const h of (lv.fans || [])) keep.push([h.x - h.w / 2, h.x + h.w / 2]);
      for (const h of (lv.saws || [])) keep.push([h.x - 40, h.x + 40]);
      for (const h of (lv.pins || [])) keep.push([h.x, h.x]);
      if (keep.some(([a, b]) => b < lo - 20 || a > hi + 20)) continue;
      chosen = { nx, ny, move: nx - g.x, dy: ny - g.y };
      break;
    }
    if (chosen) break;
  }
  if (!chosen) { console.log('L' + id, 'no corridor found'); continue; }
  const glasses = lv.glasses.map((q, i) => (i === 0 ? Object.assign({}, q, { x: chosen.nx, y: chosen.ny }) : q));
  const platforms = lv.platforms.map((p) => (pedestal.indexOf(p) >= 0
    ? Object.assign({}, p, { x: p.x + chosen.move, y: p.y + chosen.dy }) : p));
  out[id] = { glasses, platforms, move: chosen.move, dy: chosen.dy, pedestal: pedestal.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h })) };
  console.log('L' + String(id).padStart(2), lv.name.padEnd(17), 'glass', g.x + ',' + g.y, '->', chosen.nx + ',' + chosen.ny,
    pedestal.length ? '(' + pedestal.length + ' pedestal pieces move too)' : '');
}
fs.writeFileSync('/tmp/layout.json', JSON.stringify(out, null, 1));
console.log('wrote /tmp/layout.json for', Object.keys(out).length, 'levels');

if (apply) {
  const src0 = fs.readFileSync('js/levels.js', 'utf8');
  const blocks = [];
  const re = /^    \{\n      name: '[^']*',/gm;
  let m;
  while ((m = re.exec(src0))) blocks.push(m.index);
  blocks.push(src0.length);
  let src = src0, done = 0;
  for (const key of Object.keys(out)) {
    const id = +key, lay = out[id];
    const before = HG.levelById(id);
    const g0 = before.glasses[0];
    const from = blocks[id - 1], to = blocks[id];
    let chunk = src.slice(from, to);
    const oldGlass = 'glasses: [{ x: ' + g0.x + ', y: ' + g0.y;
    if (chunk.indexOf(oldGlass) < 0) { console.log('L' + id + ': could not find the glasses line, skipped'); continue; }
    chunk = chunk.replace(oldGlass, 'glasses: [{ x: ' + lay.glasses[0].x + ', y: ' + lay.glasses[0].y);
    lay.pedestal.forEach((p, i) => {
      const np = lay.platforms[before.platforms.indexOf(before.platforms.filter((q) => q.x === p.x && q.y === p.y && q.w === p.w)[0])];
      const o = 'P({ x: ' + p.x + ', y: ' + p.y + ', w: ' + p.w + ', h: ' + p.h;
      const n = 'P({ x: ' + (p.x + lay.move) + ', y: ' + (p.y + lay.dy) + ', w: ' + p.w + ', h: ' + p.h;
      if (chunk.indexOf(o) >= 0) chunk = chunk.replace(o, n);
      void np; void i;
    });
    src = src.slice(0, from) + chunk + src.slice(to);
    done++;
  }
  fs.writeFileSync('js/levels.js', src);
  console.log('patched', done, 'levels');
}
