/* ==========================================================================
   tools/solve.js — prove an authored scene, and find its reference line.

   The old pipeline invented a corridor and hung brackets in it, which is why
   every level looked like a ramp. This one works the way a level designer
   works: the scene is authored by hand (planks, wedges, blocks, a chimney, a
   loose ball), and the machine's job is to find a line a player could draw
   across that scenery and prove it wins.

   The search:

     1. every upward-facing surface in the scene is an ANCHOR — a place the
        wire can rest (a plank top, a crate top, the long face of a wedge, the
        floor of a chimney)
     2. every pair of anchors is a candidate line: water runs to the low end
        and flies from there, so `landing()` predicts where it lands, and only
        lines that deliver water to the target are kept
     3. a candidate must be drawable — sampled against the game's own pen rules
     4. the best few are played for real, then played three more times with the
        line nudged a pixel or two: a level only passes if a hand could repeat it

   node tools/solve.js [ids...]        -> /tmp/new/L<id>.json
   node tools/solve.js --emit          -> assemble js/levels.js from /tmp/new
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const EMIT = process.argv.includes('--emit');
// Six hands, not one. A pour is chaotic — droplets pack differently every time
// — so a line that wins only because it happened to be drawn exactly is not a
// solution, it is a coincidence. Each variant shifts alternate points the
// opposite way, which is what a slightly unsteady hand does: the wire keeps its
// length and changes shape.
const JITTER = [[3, 1], [-3, 1], [2, 3], [-2, -2], [4, 0], [0, 4]];
// The same unsteady hand `tools/flaky.js` uses: every point drifts ±2.4 px on a
// slow wave. Alternating jitter is a twitchy hand; this one is a *human* hand,
// and a level has to survive three of its four tries before it ships.
const WAVY = [0, 1, 2, 3];
const WAVY_AMP = 2.4;
const wavyLine = (pts, run) => poly(pts.map((p, i) => [
  p.x + Math.cos(run * 2.1 + i * 0.7) * WAVY_AMP,
  p.y + Math.sin(run * 1.3 + i * 0.5) * WAVY_AMP,
]), 8);

const W = HG.W, H = HG.H;
const G = 1381;          // px/s^2, measured in this engine
const DRAG = 0.78;       // what friction and air actually steal on a ramp
const CACHE = '/tmp/new';

if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

const SCENES = require('./scenes');

// ------------------------------------------------------------------ geometry
function rot(x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}

function rectTopEdge(p) {
  const a = p.angle || 0;
  const hl = rot(-p.w / 2 + 10, -p.h / 2, a);
  const hr = rot(p.w / 2 - 10, -p.h / 2, a);
  return [{ x: p.x + hl.x, y: p.y + hl.y }, { x: p.x + hr.x, y: p.y + hr.y }];
}

function insidePoly(px, py, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// any edge of a polygon that faces up, inset so the wire lands on the slab
function polyTops(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 40) continue;
    if (Math.abs(dy / dx) > 0.6) continue;               // too steep to rest on
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (insidePoly(mx, my - 8, pts)) continue;           // inside the shape: not a top
    const ux = dx / len, uy = dy / len;
    for (const t of [0.04, 0.2, 0.38, 0.5, 0.62, 0.8, 0.96]) {
      const x = a[0] + dx * t, y = a[1] + dy * t;
      out.push({ x: x + ux * 0, y: y - 8, slope: uy / ux });
    }
  }
  return out;
}

function anchorsOf(scene) {
  const out = [];
  const push = (x, y, tag) => out.push({ x, y, tag });
  scene.platforms.forEach((pl) => {
    const d = pl.def;
    if (d.poly) {
      polyTops(d.poly).forEach((a) => push(a.x, a.y, 'slab'));
      return;
    }
    // 4 px above the surface: close enough that the wire lands on it, far
    // enough that the pen accepts the stroke (it refuses ink within 2 px).
    // The corners are the important anchors: a wire can only leave a plank
    // downwards from its EDGE, otherwise it is drawn inside the plank.
    const a = d.angle || 0;
    const cr = [
      rot(-d.w / 2 + 2, -d.h / 2, a),
      rot(d.w / 2 - 2, -d.h / 2, a),
    ];
    cr.forEach((c) => push(d.x + c.x, d.y + c.y - 8, 'corner'));
    const [l, r] = rectTopEdge(d);
    push(l.x + (r.x - l.x) * 0.5, l.y + (r.y - l.y) * 0.5 - 8, 'plank');
  });
  scene.crates.forEach((c) => {
    const d = c.def;
    if (d.dynamic) return;
    const [l, r] = rectTopEdge({ x: d.x, y: d.y, w: d.size, h: d.size, angle: d.angle || 0 });
    for (const t of [0.02, 0.3, 0.5, 0.7, 0.98]) push(l.x + (r.x - l.x) * t, l.y + (r.y - l.y) * t - 4, 'crate');
  });
  return out;
}

// ------------------------------------------------------------------ delivery
// Where does water that runs to the low end of a line end up?
function aimFrom(a, b, targetY) {
  const drop = b.y - a.y;
  const dy = targetY - b.y;
  if (dy <= 0) return null;
  const v = DRAG * Math.sqrt(Math.max(0, 2 * G * Math.max(drop, 0.0001)));
  const dx = b.x - a.x, len = Math.hypot(dx, dy * 0 + (b.y - a.y)) || 1;
  const span = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const vx = (dx / span) * v;
  const vy = (drop / span) * v;
  const t = (-vy + Math.sqrt(vy * vy + 2 * G * dy)) / G;
  void len;
  return b.x + vx * t;
}

// --------------------------------------------------------------------- solve
function buildLevel(spec) {
  const id = spec.id;
  const base = {
    id,
    name: spec.name,
    tip: spec.tip,
    ink: 900,
    faucets: (spec.faucets || [spec.faucet]).map((f) => ({
      x: f.x, y: f.y, rate: f.rate || 26,
      total: f.total || 90, spread: f.spread == null ? 0.55 : f.spread,
    })),
    glasses: spec.glasses.map((g) => Object.assign({ w: 108, h: 118, need: 0.55 }, g)),
    platforms: (spec.stage || []).map((p) => Object.assign({ kind: 'teal', angle: 0 }, p)),
    crates: (spec.crates || []).map((c) => Object.assign({ kind: 'teal', angle: 0 }, c)),
    balls: (spec.balls || []),
    hots: (spec.hots || []).map((h) => Object.assign({ angle: 0 }, h)),
    // Every prop needs the defaults the shipped level loader would give it.
    // A fan without an angle made Math.cos(undefined) NaN, and the NaN force
    // silently deleted every droplet it touched — which is why every wind level
    // "failed" until this was found.
    fans: (spec.fans || []).map((f) => Object.assign({ angle: 0, force: 0.12, dir: 1 }, f)),
    spinners: (spec.spinners || []).map((s2) => Object.assign({ speed: 0 }, s2)),
    seesaws: (spec.seesaws || []).map((s2) => Object.assign({}, s2)),
    seesaws: [],
    pins: [],
  };

  // A level that wins without a single stroke is not a puzzle: the scenery has
  // already done the job. Check that first, before spending time on the search.
  const idle = play(HG, id, [], { frames: 60 * 34, level: base });
  if (idle.won) return { id, spec, failed: true, reason: 'the scenery alone wins it' };

  const scene = new HG.Scene(JSON.parse(JSON.stringify(base)));
  const anchors = anchorsOf(scene);
  const glasses = scene.glasses;
  const g0 = glasses[0];
  const targetY = g0.top;
  const targetX = spec.aim ? spec.aim.x : g0.x;
  const tolX = spec.aim ? (spec.aim.w || 40) : g0.topHalf - 6;
  const faucet = base.faucets[0];
  scene.destroy();

  // ---------------------------------------------------------------- lines
  // A hand does not draw infinite straight beams. It lies the wire flat along a
  // plank, then lets it fall away at the plank's edge: a line with a BEND where
  // it leaves a support. So the search is over paths through the anchors — one
  // straight run, or two runs with a bend on a support — and not over segments.
  // one throwaway scene answers every pen question; inkPointBlocked is pure
  const penScene = new HG.Scene(JSON.parse(JSON.stringify(base)));
  const clearRun = (p, q) => {
    const n = Math.max(2, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 5));
    for (let i = 0; i <= n; i++) {
      const x = p.x + (q.x - p.x) * (i / n), y = p.y + (q.y - p.y) * (i / n);
      if (penScene.inkPointBlocked(x, y)) return false;
    }
    return true;
  };

  const edges = [];
  for (let i = 0; i < anchors.length; i++) {
    for (let j = 0; j < anchors.length; j++) {
      if (i === j) continue;
      const a = anchors[i], b = anchors[j];
      const drop = b.y - a.y;
      // A flat run is allowed and it matters: lying the wire along a plank's
      // top is what makes it stable, and the wire then leaves from the edge.
      // Uphill runs are not: water would not go up them.
      if (drop < -3) continue;
      if (Math.abs(b.x - a.x) < 45) continue;
      if (drop / Math.abs(b.x - a.x) > 0.6) continue;
      if (!clearRun(a, b)) continue;
      edges.push([a, b]);
    }
  }

  if (process.env.HG_DEBUG) console.log('   anchors', anchors.length, 'edges', edges.length);
  const paths = [];
  edges.forEach((e) => paths.push(e.slice()));
  edges.forEach((e1) => {
    edges.forEach((e2) => {
      if (e1[1] !== e2[0]) return;                  // must bend ON a support
      if (e2[1].y < e1[1].y - 3) return;            // and never climb
      paths.push([e1[0], e1[1], e2[1]]);
    });
  });

  if (process.env.HG_DEBUG) console.log('   paths', paths.length);
  // Where the water ends up: it runs down the whole line, so it carries the
  // speed of the total fall, and leaves along the LAST run's direction.
  const aimPath = (pts, targetY) => {
    const a = pts[0], b = pts[pts.length - 1], m = pts[pts.length - 2];
    const dy = targetY - b.y;
    if (dy <= 0) return null;
    const drop = b.y - a.y;
    if (drop <= 4) return null;
    const v = DRAG * Math.sqrt(2 * G * drop) * (pts.length > 2 ? 0.86 : 1);  // a bend costs
    const dx = b.x - m.x, dl = Math.hypot(dx, b.y - m.y) || 1;
    const vx = (dx / dl) * v;
    const vy = ((b.y - m.y) / dl) * v;
    const t = (-vy + Math.sqrt(vy * vy + 2 * G * dy)) / G;
    return b.x + vx * t;
  };

  const cands = [];
  for (const path of paths) {
    const a0 = path[0], b0 = path[path.length - 1];
    const lastA = path.length > 2 ? path[path.length - 2] : a0;
    const ux = (b0.x - lastA.x) / (Math.hypot(b0.x - lastA.x, b0.y - lastA.y) || 1);
    const uy = (b0.y - lastA.y) / (Math.hypot(b0.x - lastA.x, b0.y - lastA.y) || 1);
    const ux0 = (path[1].x - a0.x) / (Math.hypot(path[1].x - a0.x, path[1].y - a0.y) || 1);
    const uy0 = (path[1].y - a0.y) / (Math.hypot(path[1].x - a0.x, path[1].y - a0.y) || 1);
    // the wire may start under the tap and hang past the last support
    for (const backExt of [0, 60, 120]) {
      for (const ext of [0, 30, 60, 100, 140]) {
        const pts = path.map((p) => ({ x: p.x, y: p.y }));
        pts[0] = { x: pts[0].x - ux0 * backExt, y: pts[0].y - uy0 * backExt };
        const last = pts[pts.length - 1];
        pts[pts.length - 1] = { x: last.x + ux * ext, y: last.y + uy * ext };
        const span = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
        if (span < 100 || span > 780) continue;
        // the tap has to be over the line, or nothing lands on it
        const lo = Math.min(pts[0].x, pts[1].x) + 6, hi = Math.max(pts[0].x, pts[1].x) - 6;
        if (faucet.x < lo || faucet.x > hi) continue;
        let ok = true;
        for (let k = 1; k < pts.length && ok; k++) if (!clearRun(pts[k - 1], pts[k])) ok = false;
        if (!ok) continue;
        const land = aimPath(pts, targetY);
        const off = land == null ? Math.abs(pts[pts.length - 1].x - targetX) + 140
          : Math.abs(land - targetX);
        cands.push({ pts, off, span });
      }
    }
  }

  if (process.env.HG_DEBUG) console.log('   raw candidates', cands.length);
  cands.sort((x, y) => x.off - y.off || y.span - x.span);
  // a line that is geometrically the same as one already kept adds nothing
  const seenLine = new Set();
  const keep = [];
  for (const c of cands) {
    const k = c.pts.map((p) => Math.round(p.x / 18) + ',' + Math.round(p.y / 18)).join('>');
    if (seenLine.has(k)) continue;
    seenLine.add(k);
    keep.push(c);
  }
  cands.length = 0;
  cands.push(...keep);

  penScene.destroy();

  const toPoly = (pts) => poly(pts.map((p) => [p.x, p.y]), 8);
  const jitter = (pts, k) => {
    const d = JITTER[k % JITTER.length];
    return poly(pts.map((p, i) => [p.x + (i % 2 ? -d[0] : d[0]), p.y + d[1]]), 8);
  };

  // ------------------------------------------------------------- screening
  // Predicting the ballistic landing is a good way to ORDER candidates, but it
  // is not trustworthy enough to throw one away: water can land on a plank,
  // run along it and fall off somewhere the model never considered. So every
  // candidate is played for a few seconds and scored on what actually lands in
  // the glass. It costs a few seconds per level and it stops the tool from
  // discarding the line that works.
  const scoreOf = (r) => {
    if (r.won) return 2;
    let m = 0;
    (r.fills || []).forEach((f) => { m = Math.max(m, f.fill); });
    return m;
  };

  // Screen in two passes so a good level is cheap and a hard one is thorough:
  // the predicted-best candidates first, then the rest.
  const scored = [];
  const screen = (list) => {
    for (const c of list) {
      const r = play(HG, id, [toPoly(c.pts)], { frames: 60 * 12, level: base });
      scored.push({ c, sc: scoreOf(r) });
    }
  };
  screen(cands.slice(0, 70));
  if (!scored.some((q) => q.sc > 0.02)) screen(cands.slice(70, 240));
  scored.sort((a, b) => b.sc - a.sc);
  if (process.env.HG_DEBUG) {
    console.log('   screened', scored.length, 'top:',
      scored.slice(0, 5).map((q) => q.sc.toFixed(2) + ' @' +
        q.c.pts.map((p) => Math.round(p.x) + ',' + Math.round(p.y)).join('>')).join(' | '));
  }

  const tried = new Set();
  for (const { c, sc } of scored) {
    if (sc <= 0) break;                             // nothing is landing anywhere
    const k = c.pts.map((p) => Math.round(p.x) + ',' + Math.round(p.y)).join('>');
    if (tried.has(k)) continue;
    tried.add(k);
    if (tried.size > 18) break;
    // Prove the numbers that will actually ship. The emitter writes four
    // decimals, and this game is chaotic enough that a ten-thousandth of a pixel
    // decided one level: the wire settled a hair differently and 5 % of the
    // water went over the far edge. Quantising first means the proof and the
    // player are drawing the same wire.
    const pts = c.pts.map((p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) }));
    const r = play(HG, id, [toPoly(pts)], { frames: 60 * 34, level: base });
    if (!r.won) continue;
    // No fill margin here, and the reason is worth writing down: the simulation
    // stops the moment the glass is full, so `fill` at the win is `need` plus at
    // most one droplet *by construction*. Asking for need + 0.06 rejects every
    // legal solution in the game. Robustness is measured the only way it can be
    // — the same line nudged three ways (P4), on a pour that is now
    // deterministic whatever the seed (P3).
    let stable = 0;
    for (let k2 = 0; k2 < JITTER.length; k2++) {
      if (play(HG, id, [jitter(pts, k2)], { frames: 60 * 34, level: base }).won) stable++;
    }
    if (stable < 4) continue;                        // four hands out of six
    let wavy = 0;
    for (const run of WAVY) {
      if (play(HG, id, [wavyLine(pts, run)], { frames: 60 * 34, level: base }).won) wavy++;
    }
    if (wavy < 3) continue;                          // three of four steady hands
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    base.ink = Math.max(60, Math.round(len * 1.35 / 10) * 10);
    const again = play(HG, id, [toPoly(pts)], { frames: 60 * 34, level: base });
    return {
      id, spec, level: base,
      strokes: [pts.map((p) => [p.x, p.y])],
      line: pts.map((p) => [Math.round(p.x), Math.round(p.y)]),
      ink: base.ink, inkUsed: Math.round(len), fill: again.fills, off: c.off, stable, wavy,
    };
  }
  const bestSc = scored.length ? scored[0].sc : 0;
  return { id, spec, failed: true, anchors: anchors.length, cands: cands.length,
    reason: cands.length
      ? 'no candidate line won (best fill ' + bestSc.toFixed(2) + ', tried ' + tried.size + ')'
      : 'no drawable line between any two supports' };
}

// -------------------------------------------------------------- signatures
// Two levels may not share a structure. A signature is the scene's shape in
// words: what it is built from, at what angles, and where the glass sits.
function signature(spec) {
  const buckets = [];
  (spec.stage || []).forEach((p) => {
    if (p.poly) buckets.push('poly' + (p.poly.length) + '@' + Math.round(p.poly[0][0] / 40));
    else buckets.push(p.kind + ':' + Math.round((p.w >= p.h ? p.w / p.h : -p.h / p.w)) + '@' +
      Math.round(((p.angle || 0) * 180 / Math.PI) / 10));
  });
  (spec.crates || []).forEach((c) => buckets.push('crate:' + Math.round(c.size / 16) + '@' + Math.round(c.x / 60)));
  (spec.balls || []).forEach((b) => buckets.push('ball:' + (b.kind || 'heavy') + '@' + Math.round(b.x / 60)));
  (spec.fans || []).forEach(() => buckets.push('fan'));
  (spec.hots || []).forEach(() => buckets.push('hot'));
  (spec.spinners || []).forEach(() => buckets.push('spin'));
  const g = spec.glasses[0];
  buckets.push('glass@' + Math.round(g.x / 60) + '/' + Math.round(g.y / 40));
  return buckets.sort().join('|') + '#' + (spec.stage || []).length;
}

// ----------------------------------------------------------------------- run
const results = [];
for (const spec of SCENES) {
  if (EMIT) break;                                  // --emit only assembles
  if (only.length && !only.includes(spec.id)) continue;
  const t0 = Date.now();
  const res = buildLevel(spec);
  const secs = ((Date.now() - t0) / 1000).toFixed(0) + 's';
  results.push(res);
  if (res.failed) {
    console.log('L' + String(spec.id).padStart(2), spec.name.padEnd(18), 'FAILED', res.reason,
      '(' + res.anchors + ' anchors, ' + res.cands + ' candidates, ' + secs + ')');
  } else {
    console.log('L' + String(spec.id).padStart(2), spec.name.padEnd(18), 'ok  line', res.inkUsed + '/' + res.ink,
      ' fill', res.fill.map((f) => f.fill.toFixed(2)).join('/'),
      ' hands', res.stable + '/' + JITTER.length, 'wavy', res.wavy + '/' + WAVY.length, secs);
    fs.writeFileSync(path.join(CACHE, 'L' + spec.id + '.json'), JSON.stringify(res, null, 1));
  }
}

// --------------------------------------------------------------------- emit
if (EMIT) {
  const all = [];
  for (const spec of SCENES) {
    const f = path.join(CACHE, 'L' + spec.id + '.json');
    all.push(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { id: spec.id, failed: true });
  }
  const bad = all.filter((r) => r.failed);
  // structure signature check: no two levels may be built the same way
  const seen = new Map();
  const dupes = [];
  all.forEach((r) => {
    if (r.failed) return;
    const sig = signature(r.spec);
    if (seen.has(sig)) dupes.push('L' + seen.get(sig) + ' and L' + r.id + ' share a structure');
    seen.set(sig, r.id);
  });

  if (bad.length || dupes.length) {
    console.log('refusing to write: ' + bad.length + ' unsolved (' + bad.map((b) => 'L' + b.id).join(' ') + ')' +
      (dupes.length ? '; ' + dupes.join('; ') : ''));
    process.exitCode = 1;
  } else {
    const num = (n) => Math.round(n * 10) / 10;
    // Angles get three decimals. Rounding them to one turned 0.12 rad into 0.1
    // and 0.07 into 0.1 — a five-pixel change of slope over a plank, which is
    // enough to move where the water leaves the edge. The shipped level was not
    // the level that had been proved, and the difference came back as "flaky".
    const ang = (n) => Math.round(n * 1000) / 1000;
    const one = (lv) => {
      const L = [];
      L.push('    {');
      L.push('      name: ' + JSON.stringify(lv.name) + ',');
      L.push('      tip: ' + JSON.stringify(lv.tip) + ',');
      L.push('      ink: ' + lv.ink + ',');
      if (lv.faucets.length === 1) {
        const f = lv.faucets[0];
        L.push('      faucet: { x: ' + f.x + ', y: ' + f.y + ', rate: ' + f.rate + ', total: ' + f.total + ' },');
      } else {
        L.push('      faucets: [');
        lv.faucets.forEach((f) => L.push('        { x: ' + f.x + ', y: ' + f.y + ', rate: ' + f.rate + ', total: ' + f.total + ' },'));
        L.push('      ],');
      }
      L.push('      glasses: [');
      lv.glasses.forEach((g) => L.push('        { x: ' + num(g.x) + ', y: ' + num(g.y) + ', w: ' + g.w + ', h: ' + g.h + ', need: ' + g.need + ' },'));
      L.push('      ],');
      const P = (p) => p.poly
        ? 'P({ poly: [' + p.poly.map((q) => '[' + num(q[0]) + ', ' + num(q[1]) + ']').join(', ') + '], kind: \'' + (p.kind || 'teal') + '\' })'
        : 'P({ x: ' + num(p.x) + ', y: ' + num(p.y) + ', w: ' + p.w + ', h: ' + p.h + ', kind: \'' + (p.kind || 'teal') + '\'' + (p.angle ? ', angle: ' + ang(p.angle) : '') + ' })';
      if (lv.platforms.length) {
        L.push('      platforms: [');
        lv.platforms.forEach((p) => L.push('        ' + P(p) + ','));
        L.push('      ],');
      }
      if (lv.crates.length) {
        L.push('      crates: [');
        lv.crates.forEach((c) => L.push('        { x: ' + num(c.x) + ', y: ' + num(c.y) + ', size: ' + c.size + ', kind: \'' + c.kind + '\'' + (c.angle ? ', angle: ' + ang(c.angle) : '') + ' },'));
        L.push('      ],');
      }
      if (lv.balls.length) {
        L.push('      balls: [');
        lv.balls.forEach((b) => L.push('        { x: ' + num(b.x) + ', y: ' + num(b.y) + ', r: ' + (b.r || 22) + ', kind: \'' + (b.kind || 'heavy') + '\' },'));
        L.push('      ],');
      }
      if (lv.hots.length) {
        L.push('      hots: [');
        lv.hots.forEach((h) => L.push('        { x: ' + num(h.x) + ', y: ' + num(h.y) + ', w: ' + h.w + ', h: ' + h.h + ' },'));
        L.push('      ],');
      }
      if (lv.fans.length) {
        L.push('      fans: [');
        lv.fans.forEach((f) => L.push('        { x: ' + num(f.x) + ', y: ' + num(f.y) + ', w: ' + f.w + ', h: ' + f.h + ', angle: ' + ang(f.angle || 0) + ', force: ' + (f.force || 0.13) + ', dir: ' + (f.dir || 1) + ' },'));
        L.push('      ],');
      }
      if (lv.spinners.length) {
        L.push('      spinners: [');
        lv.spinners.forEach((s) => L.push('        { x: ' + num(s.x) + ', y: ' + num(s.y) + ', w: ' + s.w + ', h: ' + s.h + ', speed: 0 },'));
        L.push('      ],');
      }
      L.push('    },');
      return L.join('\n');
    };

    const file = fs.readFileSync('js/levels.js', 'utf8');
    const head = file.split('  const LEVELS = [')[0];
    const tailFrom = file.indexOf('  // ------------------------------------------------------------- normalising');
    const body = all.map((r) => one(r.level)).join('\n');
    fs.writeFileSync('js/levels.js', head + '  const LEVELS = [\n' + body + '\n  ];\n\n' + file.slice(tailFrom));

    const solHead = fs.readFileSync('tools/solutions.js', 'utf8').split('module.exports = {')[0];
    // The solutions file gets the float endpoints that were actually proved,
    // not their integer rounding: half a pixel at the end of a wire is enough to
    // change where it comes to rest against a plank edge, and a resting wire is
    // the whole solution.
    const solBody = all.map((r) => '  ' + r.id + ': [[[' +
      r.strokes[0].map((p) => (Math.round(p[0] * 1e4) / 1e4) + ', ' + (Math.round(p[1] * 1e4) / 1e4)).join('], [') +
      ']]],').join('\n');
    fs.writeFileSync('tools/solutions.js', solHead + 'module.exports = {\n' + solBody + '\n};\n');
    console.log('wrote js/levels.js and tools/solutions.js (' + all.length + ' levels)');
  }
}
