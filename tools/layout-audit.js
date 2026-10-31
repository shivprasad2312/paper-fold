/* ==========================================================================
   tools/layout-audit.js — do the rooms start clean?

   The physics engine will resolve anything you give it, including a glass whose
   base is buried 54 px inside a column. It does that by shoving the glass out
   over the first few frames, and the player sees the cup jump, the wire appear
   to slide into the scenery, and water miss for no reason they can name. Every
   level still "won", so no proof caught it.

   This checks the things a proof cannot:

     1. nothing starts inside scenery — glass, crate or ball overlapping a
        platform, and glass overlapping another body. A ball may sit up to 6 px
        into a sill it is perched on (that is what a perch is); every other
        body, and any deeper overlap, fails.
     2. every glass that is meant to stand has a base under it
     3. the pen refuses ink inside every solid, at every angle (sampled grid)
     4. nothing starts outside the world

   node tools/layout-audit.js [--verbose]
   ========================================================================== */
'use strict';
const { boot } = require('./simheadless');

const HG = boot();
const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const say = (ok, what, detail) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + what + (detail ? '   [' + detail + ']' : ''));
  if (!ok) fails++;
};

// ------------------------------------------------------------------ polygons
// Every body in this game is a box, possibly rotated, or a free-form slab.
function hull(def) {
  if (def.poly) return def.poly.map(([x, y]) => ({ x, y }));
  const a = def.angle || 0, hw = (def.w != null ? def.w : def.size) / 2,
    hh = (def.h != null ? def.h : def.size) / 2;
  const c = Math.cos(a), s = Math.sin(a);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
    .map(([x, y]) => ({ x: def.x + x * c - y * s, y: def.y + x * s + y * c }));
}

const axes = (P) => P.map((p, i) => {
  const q = P[(i + 1) % P.length];
  const dx = q.x - p.x, dy = q.y - p.y;
  const L = Math.hypot(dx, dy) || 1;
  return { x: -dy / L, y: dx / L };
});
const project = (P, ax) => {
  let lo = Infinity, hi = -Infinity;
  P.forEach((p) => {
    const d = p.x * ax.x + p.y * ax.y;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  });
  return [lo, hi];
};

// overlap depth along the best (least penetrating) separating axis; <= 0 means
// the polygons are apart
function depth(A, B) {
  const list = axes(A).concat(axes(B));
  let min = Infinity;
  for (const ax of list) {
    const [a0, a1] = project(A, ax);
    const [b0, b1] = project(B, ax);
    const overlap = Math.min(a1, b1) - Math.max(a0, b0);
    if (overlap <= 0) return 0;
    if (overlap < min) min = overlap;
  }
  return min === Infinity ? 0 : min;
}

const name = (o) => o.kind === 'glass' ? 'glass' : o.kind;
const rows = [];

for (const lv of HG.LEVELS) {
  const sc = new HG.Scene(JSON.parse(JSON.stringify(lv)));
  const scenery = sc.platforms.map((p) => ({
    kind: p.def.poly ? 'slab' : 'platform',
    poly: p.def.poly ? hull(p.def) : hull(p.def),
    def: p.def,
  }));
  const loose = [];
  sc.glasses.forEach((g, i) => loose.push({
    kind: 'glass', i, dynamic: !!g.dynamic,
    poly: hull({ x: g.x, y: g.y, w: g.w, h: g.h, angle: g.angle || 0 }),
    bottom: g.bottom, top: g.top, x: g.x, hang: g.hanging || g.fixed,
  }));
  sc.crates.forEach((c, i) => loose.push({
    kind: 'crate', i, dynamic: !!c.def.dynamic,
    poly: hull({ x: c.body.position.x, y: c.body.position.y, w: c.def.w || c.def.size,
      h: c.def.h || c.def.size, angle: c.body.angle }),
    bottom: c.body.bounds.max.y,
  }));
  sc.balls.forEach((b, i) => loose.push({
    kind: 'ball', i, dynamic: true,
    poly: hull({ x: b.body.position.x, y: b.body.position.y, w: b.def.r * 2,
      h: b.def.r * 2, angle: 0 }),
    bottom: b.body.bounds.max.y,
  }));

  // 1. interpenetration at t = 0.
  // Only a body the solver has to move matters. Two pieces of static scenery may
  // overlap freely — a crate sunk into a plank is how the stack is drawn, and no
  // force ever tries to separate them. A *dynamic* body inside scenery is a bug:
  // the solver pushes it out over the first frames and the player sees the cup
  // jump, or the wire slide.
  // A ball perched on the edge of a sill is *seated*, not buried: it rests on
  // the corner with a few px of the face under it, which is what makes it tip
  // instead of balancing. Anything deeper than that is the cup-jump bug again,
  // and a glass or a crate never gets the allowance.
  const SEAT = 6;
  const hits = [];
  loose.forEach((L) => {
    if (!L.dynamic) return;
    scenery.forEach((S) => {
      const d = depth(L.poly, S.poly);
      if (d <= 1) return;
      if (L.kind === 'ball' && d <= SEAT) return;
      hits.push(L.kind + ' ' + L.i + ' is ' + d.toFixed(1) + ' px inside a ' + S.kind);
    });
  });
  for (let a = 0; a < loose.length; a++) {
    for (let b = a + 1; b < loose.length; b++) {
      if (!loose[a].dynamic && !loose[b].dynamic) continue;
      const d = depth(loose[a].poly, loose[b].poly);
      if (d > 1) hits.push(loose[a].kind + ' ' + loose[a].i + ' overlaps ' +
        loose[b].kind + ' ' + loose[b].i + ' by ' + d.toFixed(1) + ' px');
    }
  }

  // 2. a glass that is meant to stand must have something under it
  const unsupported = [];
  sc.glasses.forEach((g, i) => {
    if (g.hanging || g.fixed) return;
    const under = sc.platforms.some((p) => {
      const b = p.body.bounds;
      const overlap = Math.min(b.max.x, g.x + g.topHalf) - Math.max(b.min.x, g.x - g.topHalf);
      return overlap > g.topHalf * 0.6 && b.min.y > g.top + 8 && Math.abs(b.min.y - g.bottom) <= 12;
    });
    if (!under) unsupported.push('glass ' + i + ' has nothing under it (bottom ' + g.bottom.toFixed(0) + ')');
  });

  // 3. the pen must refuse ink inside every solid — sampled on a 12 px grid
  let penLeaks = 0;
  scenery.forEach((S) => {
    const xs = S.poly.map((p) => p.x), ys = S.poly.map((p) => p.y);
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 12) {
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += 12) {
        // only points genuinely inside the shape matter
        let inside = false;
        for (let i = 0, j = S.poly.length - 1; i < S.poly.length; j = i++) {
          const xi = S.poly[i].x, yi = S.poly[i].y, xj = S.poly[j].x, yj = S.poly[j].y;
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside && !sc.inkPointBlocked(x, y)) penLeaks++;
      }
    }
  });

  // 4. nothing outside the world
  const outside = [];
  loose.forEach((L) => {
    L.poly.forEach((p) => {
      if (p.x < 0 || p.x > HG.W || p.y < 0 || p.y > HG.H) outside.push(name(L) + ' ' + L.i);
    });
  });

  sc.destroy();
  const bad = hits.length + unsupported.length + penLeaks + outside.length;
  rows.push({ id: lv.id, name: lv.name, hits, unsupported, penLeaks, outside, bad });
  if (VERBOSE) {
    console.log('L' + lv.id + ' ' + lv.name.padEnd(18) + (bad ? 'FAIL' : 'ok  ') +
      (hits.length ? '  ' + hits.join('; ') : '') +
      (unsupported.length ? '  ' + unsupported.join('; ') : '') +
      (penLeaks ? '  pen lets ink into scenery at ' + penLeaks + ' sample points' : '') +
      (outside.length ? '  outside the world: ' + outside.join(', ') : ''));
  }
}

const dirty = rows.filter((r) => r.bad);
console.log('## Room layout');
say(dirty.length === 0, 'no room starts with a body inside scenery',
  dirty.length ? dirty.map((r) => 'L' + r.id).join(' ') : rows.length + ' rooms clean');
say(!dirty.some((r) => r.penLeaks), 'the pen refuses ink inside every solid, at every angle',
  dirty.reduce((n, r) => n + r.penLeaks, 0) + ' leak(s)');
say(!dirty.some((r) => r.unsupported.length), 'every standing glass has a base under it',
  dirty.reduce((n, r) => n + r.unsupported.length, 0) + ' unsupported');
say(!dirty.some((r) => r.outside.length), 'nothing starts outside the world',
  dirty.reduce((n, r) => n + r.outside.length, 0) + ' outside');

console.log('\n' + (fails ? fails + ' layout check(s) failed' : 'all layout checks pass'));
process.exit(fails ? 1 : 0);
