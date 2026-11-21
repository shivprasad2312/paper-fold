/* ==========================================================================
   tools/props.js — a wire with a single nail swings (correct lever law), so a
   drawn ramp needs a second, real support. This finds one per level: a short
   stone bracket standing under the ramp, with a foot so it reads as furniture
   rather than a stick. The ramp keeps its winning shape; it simply rests on the
   bracket instead of hanging off the tap like a steel shelf.

   node tools/props.js [write]
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();
const INK_W = HG.Scene.INK_W;

function seed(n) { let s = n >>> 0 || 1; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function drawAll(scene, strokes) {
  for (const st of strokes) {
    const pts = poly(st);
    scene.beginInk(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) if (!scene.inkPointBlocked(pts[i].x, pts[i].y)) scene.addInkPoint(pts[i].x, pts[i].y);
    scene.endInk();
  }
}
const overlaps = (a, b, pad) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + pad;

// a bracket = thin post + foot, both stone
function bracket(px, top) {
  const H = 96, FW = 56, FH = 14;
  return [
    { x: Math.round(px), y: Math.round(top + H / 2), w: 20, h: H, kind: 'stone' },
    { x: Math.round(px), y: Math.round(top + H + FH / 2), w: FW, h: FH, kind: 'stone' },
  ];
}
function bracketBox(px, top) {
  return { x: px, y: top + (96 + 14) / 2, w: 56, h: 96 + 14 };
}

const out = [];
for (const lv of HG.LEVELS) {
  const base = SOL[lv.id] || [];
  if (!base.length) continue;
  const probe = new HG.Scene(JSON.parse(JSON.stringify(lv)));
  drawAll(probe, base);
  const singles = probe.ink.strokes.map((st, i) => ({ n: st.pins.length, i })).filter((s) => s.n === 1);
  probe.destroy();
  if (!singles.length) continue;

  const allPosts = [];
  let worstAll = null;
  for (const { i } of singles) {
    const pts = base[i];
    const end = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = end[0] - prev[0], dy = end[1] - prev[1];
    const L = Math.hypot(dx, dy) || 1;
    let best = null;
    for (const back of [20, 40, 60, 80, 100, 120]) {
      const px = end[0] - (dx / L) * back;
      const py = end[1] - (dy / L) * back;
      const top = py + INK_W / 2 - 1;
      const box = bracketBox(px, top);
      const solid = []
        .concat((lv.glasses || []).map((g) => ({ x: g.x, y: g.y, w: g.w, h: g.h })))
        .concat((lv.crates || []).map((c) => ({ x: c.x, y: c.y, w: c.size, h: c.size })))
        .concat((lv.platforms || []).filter((p) => p.w))
        .concat((lv.hots || []).map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h })));
      if (solid.some((b) => overlaps(box, b, 8))) continue;
      const posts = allPosts.concat(bracket(px, top));
      seed(7);
      const scene = new HG.Scene(Object.assign(JSON.parse(JSON.stringify(lv)), { platforms: (lv.platforms || []).concat(posts) }));
      drawAll(scene, base);
      const nails = scene.ink.strokes.map((s) => s.pins.length);
      scene.destroy();
      const r = play(HG, lv.id, base.map(poly), { frames: 60 * 14, level: Object.assign(JSON.parse(JSON.stringify(lv)), { platforms: (lv.platforms || []).concat(posts) }) });
      const fills = (r.fills || []).map((f) => f.fill - f.need);
      const m = Math.min(...fills);
      if (!best || m > best.m) best = { posts, m, nails, fills: (r.fills || []).map((f) => +f.fill.toFixed(2)) };
    }
    if (best) { allPosts.push(...best.posts); worstAll = best; }
  }
  if (!allPosts.length) continue;
  seed(7);
  const final = play(HG, lv.id, base.map(poly), { frames: 60 * 14, level: Object.assign(JSON.parse(JSON.stringify(lv)), { platforms: (lv.platforms || []).concat(allPosts) }) });
  const fills = (final.fills || []).map((f) => +f.fill.toFixed(2));
  const margins = (final.fills || []).map((f) => f.fill - f.need);
  out.push({ id: lv.id, name: lv.name, posts: allPosts, fills, margin: +Math.min(...margins).toFixed(3) });
  console.log('L' + String(lv.id).padStart(2), lv.name.padEnd(17), 'brackets', allPosts.length / 2,
    'fills', JSON.stringify(fills), 'margin', Math.min(...margins).toFixed(2));
}
fs.writeFileSync('/tmp/props.json', JSON.stringify(out, null, 1));
