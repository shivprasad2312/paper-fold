/* ==========================================================================
   tools/reanchor.js — the wires now obey the lever law, so a ramp that hangs
   off a single nail is gone. This tool finds a *second* real support for every
   reference stroke that only has one: it tries pressing the stroke's far end
   onto nearby scenery, and, if nothing is close enough, records a push-pin to
   be added to that level at the exact point the stroke ends.

   node tools/reanchor.js [report|json]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();

function seed(n) { let s = n >>> 0 || 1; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// closest point on a polygon's boundary
function closestOnBody(b, x, y) {
  let best = null;
  const vs = b.vertices;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i], c = vs[(i + 1) % vs.length];
    const dx = c.x - a.x, dy = c.y - a.y;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L2));
    const px = a.x + dx * t, py = a.y + dy * t;
    const d = Math.hypot(px - x, py - y);
    if (!best || d < best.d) best = { d, x: px, y: py, body: b };
  }
  return best;
}

function supportsOf(scene) {
  return scene.anchorBodies().filter((b) => b.label !== 'ink');
}

function drawAll(scene, strokes) {
  for (const st of strokes) {
    const pts = poly(st);
    scene.beginInk(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) if (!scene.inkPointBlocked(pts[i].x, pts[i].y)) scene.addInkPoint(pts[i].x, pts[i].y);
    scene.endInk();
  }
}

function evaluate(id, strokes) {
  seed(7);
  const r = play(HG, id, strokes.map(poly), { frames: 60 * 14 });
  const worst = Math.min(...(r.fills || [{ fill: 0 }]).map((f) => f.fill - f.need));
  return { state: r.state, worst, fills: (r.fills || []).map((f) => +f.fill.toFixed(2)) };
}

const report = [];
for (const lv of HG.LEVELS) {
  const sc = new HG.Scene(lv);
  drawAll(sc, SOL[lv.id] || []);
  const pins = sc.ink.strokes.map((st) => st.pins.length);
  const singles = sc.ink.strokes.map((st, i) => ({ st, i })).filter((s) => s.st.pins.length === 1);
  const sup = supportsOf(sc);
  sc.destroy();
  if (!singles.length) { report.push({ id: lv.id, needs: null }); continue; }

  const row = { id: lv.id, level: lv.name, tries: [] };
  for (const { st, i } of singles) {
    const pts = SOL[lv.id][i];
    const end = pts[pts.length - 1];
    // candidate supports, nearest first
    const cands = sup
      .map((b) => closestOnBody(b, end[0], end[1]))
      .filter((c) => c && c.d >= 2 && c.d <= 220)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
    for (const c of cands) {
      const ux = (c.x - end[0]) / c.d, uy = (c.y - end[1]) / c.d;
      const strokes = SOL[lv.id].map((s) => s.map((p) => p.slice()));
      strokes[i][pts.length - 1] = [+(c.x + ux * 1.2).toFixed(1), +(c.y + uy * 1.2).toFixed(1)];
      const r = evaluate(lv.id, strokes);
      row.tries.push({ kind: 'surface', label: c.body.label, at: [+c.x.toFixed(0), +c.y.toFixed(0)], d: +c.d.toFixed(0), ...r, strokes });
    }
    // fallback: a push-pin at the end
    const strokes = SOL[lv.id].map((s) => s.map((p) => p.slice()));
    const r = evaluate(lv.id, strokes);
    row.tries.push({ kind: 'pin', at: end, ...r, strokes });
    row.strokeIndex = i;
  }
  report.push(row);
  const best = row.tries.slice().sort((a, b) => b.worst - a.worst)[0];
  if (process.argv[2] !== 'json') {
    console.log('L' + String(lv.id).padStart(2), row.level.padEnd(17),
      'pins', pins.join('/'), '| best', best.kind, JSON.stringify(best.at),
      'fills', JSON.stringify(best.fills), best.worst >= 0 ? 'OK' : 'SHORT ' + best.worst.toFixed(2));
  }
}
if (process.argv[2] === 'json') require('fs').writeFileSync('/tmp/reanchor.json', JSON.stringify(report, null, 1));
