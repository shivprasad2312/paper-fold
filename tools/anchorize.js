/* ==========================================================================
   tools/anchorize.js — inks solutions must be nailed to something solid now.

   For every authored solution stroke this finds the nearest solid body (tap
   housing, ledge, crate, coaster) and, when the stroke is not already touching
   one, prepends a short connector so the line can be pegged down.

   node tools/anchorize.js          -> prints the rewritten solutions table
   ========================================================================== */
'use strict';
const { boot } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
const R = 14;

const out = {};
for (const level of HG.LEVELS) {
  const scene = new HG.Scene(level);
  const anchors = scene.anchorBodies().map((b) => ({
    bounds: b.bounds, label: b.label, isStatic: b.isStatic,
  }));
  const near = (x, y) =>
    anchors.some((a) => x >= a.bounds.min.x - R && x <= a.bounds.max.x + R &&
                         y >= a.bounds.min.y - R && y <= a.bounds.max.y + R);

  const strokes = (SOLUTIONS[level.id] || []).map((pl) => pl.map((p) => [p[0], p[1]]));
  const fixed = strokes.map((pl) => {
    if (!pl.length) return pl;
    if (pl.some(([x, y]) => near(x, y))) return pl;          // already pinned

    // nearest solid point to either end of the stroke
    let best = null;
    for (const end of [0, pl.length - 1]) {
      const [x, y] = pl[end];
      for (const a of anchors) {
        const bx = Math.max(a.bounds.min.x, Math.min(x, a.bounds.max.x));
        const by = Math.max(a.bounds.min.y, Math.min(y, a.bounds.max.y));
        const d = Math.hypot(x - bx, y - by);
        if (!best || d < best.d) best = { d, point: [bx, by], end };
      }
    }
    if (!best) return pl;
    // step just inside the solid so the contact definitely registers
    const a = anchors
      .filter((an) => best.point[0] >= an.bounds.min.x - 1 && best.point[0] <= an.bounds.max.x + 1 &&
                      best.point[1] >= an.bounds.min.y - 1 && best.point[1] <= an.bounds.max.y + 1)[0];
    const inside = a
      ? [Math.max(a.bounds.min.x + 3, Math.min(best.point[0], a.bounds.max.x - 3)),
         Math.max(a.bounds.min.y + 3, Math.min(best.point[1], a.bounds.max.y - 3))]
      : best.point;
    return best.end === 0 ? [inside, ...pl] : [...pl, inside];
  });
  out[level.id] = fixed;
  scene.destroy();
}

console.log('module.exports = {');
for (const level of HG.LEVELS) {
  const strokes = out[level.id] || [];
  const txt = strokes.length
    ? '[\n       ' + strokes.map((pl) => '[' + pl.map((p) => '[' + Math.round(p[0]) + ', ' + Math.round(p[1]) + ']').join(', ') + ']').join(',\n       ') + ']'
    : '[]';
  const before = SOLUTIONS[level.id] || [];
  const changed = JSON.stringify(before.map((s) => s.map((p) => [Math.round(p[0]), Math.round(p[1])]))) !==
    JSON.stringify(strokes.map((s) => s.map((p) => [Math.round(p[0]), Math.round(p[1])])));
  console.log('  ' + level.id + ': ' + txt + ',' + (changed ? '   // pegged to scenery' : ''));
}
console.log('};');
