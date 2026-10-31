/* ==========================================================================
   tools/solve-hero.js — find and prove a reference stroke for an authored room.

   The old solver (tools/solve.js) answers one question: "which downhill run
   from near the tap reaches the mouth?" That vocabulary is why seventy rooms
   came out as seventy diagonals. This one is built for the hero set, where the
   demanded stroke is a *structure*:

     beam     a straight piece spanning two anchors (a shelf, a bridge)
     roof     a bent piece from one anchor up over and down to another
     chute    a straight piece from one anchor aimed at a mouth
     bracket  a short piece at the cup's rim (stopper, cage, deflector)

   Every family is enumerated from the room's real anchors, then each candidate
   is PLAYED — not predicted — and scored on what actually lands in the glass.
   The best are then refined by moving their control points, and the winner has
   to survive a twitchy hand and a wavy hand before it ships.

   node tools/solve-hero.js <id|all>     -> /tmp/hero/R<id>.json
   node tools/solve-hero.js --emit       -> writes js/levels.js + tools/solutions.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const ROMS = require('./hero-rooms');
const ONLY = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const EMIT = process.argv.includes('--emit');
const CACHE = '/tmp/hero';
if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

// The same two hands tools/solve.js proves against: a twitch (±3 px on
// alternate points) and a slow wave (±2.4 px). A room only ships if both hold.
const JITTER = [[3, 1], [-3, 1], [2, 3], [-2, -2], [4, 0], [0, 4]];
const WAVY = [0, 1, 2, 3];
const WAVE_AMP = 2.4;
const wavy = (pts, k) => poly(pts.map((p, i) => [
  p.x + Math.cos(k * 2.1 + i * 0.7) * WAVE_AMP,
  p.y + Math.sin(k * 1.3 + i * 0.5) * WAVE_AMP,
]), 8);

const num = (n) => Math.round(n * 10) / 10;

function levelOf(room) {
  return {
    id: room.id,
    name: room.name,
    tip: room.tip,
    ink: 900,
    faucets: (room.faucets || [room.faucet]).map((f) => ({
      x: f.x, y: f.y, rate: f.rate || 26, total: f.total || 110,
      spread: f.spread == null ? 0.55 : f.spread,
    })),
    glasses: room.glasses.map((g) => Object.assign({ w: 104, h: 118, need: 0.5 }, g)),
    platforms: (room.stage || []).map((p) => Object.assign({ kind: 'teal', angle: 0 }, p)),
    crates: (room.crates || []).map((c) => Object.assign({ kind: 'wood', angle: 0 }, c)),
    balls: room.balls || [],
    hots: room.hots || [],
    fans: (room.fans || []).map((f) => Object.assign({ angle: 0, force: 0.12, dir: 1 }, f)),
    spinners: [], seesaws: [], pins: [],
  };
}

// ---------------------------------------------------------------- anchors
// A place a hand could rest a stroke: the top face of a plank, a block, a
// slab, or the tap plate itself.
function anchorsOf(lv) {
  const out = [];
  const add = (x, y, tag) => out.push({ x, y, tag });
  const LIFTS = [8, 3, 1];
  (lv.platforms || []).forEach((p) => {
    for (const f of [0.06, 0.5, 0.94]) {
      const c = Math.cos(p.angle || 0), s = Math.sin(p.angle || 0);
      const lx = (f - 0.5) * p.w, ly = -p.h / 2;
      for (const lift of LIFTS) add(p.x + lx * c - ly * s, p.y + lx * s + ly * c - lift, 'plank');
    }
  });
  (lv.crates || []).forEach((c) => {
    const w = c.w || c.size, h = c.h || c.size;
    for (const f of [0.1, 0.5, 0.9]) {
      for (const lift of LIFTS) add(c.x + (f - 0.5) * w, c.y - h / 2 - lift, 'block');
    }
  });
  (lv.faucets || []).forEach((f) => add(f.x, f.y + 40, 'tap'));
  // A glass rim is an anchor too, and in the reference game it is one of the
  // most-used ones: the stroke is laid across the two mouths so it feeds both
  // cups it is resting on. Without these the split and funnel shapes have
  // nowhere to sit and the search can only build slides again.
  (lv.glasses || []).forEach((g) => {
    const top = g.y - g.h / 2, half = g.w / 2;
    for (const dx of [-half, -half / 2, 0, half / 2, half]) add(g.x + dx, top - 8, 'rim');
  });
  return out;
}

// ---------------------------------------------------------------- families
// Candidate control points, in the vocabulary of the game's reference levels.
function families(lv, room) {
  const A = anchorsOf(lv);
  const out = [];
  const push = (pts, tag) => out.push({ pts, tag });

  // beam: any two anchors, roughly level
  for (let i = 0; i < A.length; i++) {
    for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j];
      const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
      if (dx < 90 || dx > 640) continue;
      if (dy > 90) continue;
      for (const lift of [0, -14, 14]) {
        push([{ x: a.x, y: a.y + lift }, { x: b.x, y: b.y + lift }], 'beam');
      }
    }
  }
  // roof: one anchor up over the middle and down to another
  for (let i = 0; i < A.length; i++) {
    for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j];
      const dx = Math.abs(b.x - a.x);
      if (dx < 160 || dx > 520) continue;
      const mx = (a.x + b.x) / 2;
      for (const rise of [40, 70, 100, 140, 180]) {
        for (const lean of [0, -30, 30]) {
          push([{ x: a.x, y: a.y }, { x: mx + lean, y: (a.y + b.y) / 2 - rise }, { x: b.x, y: b.y }], 'roof');
        }
      }
    }
  }
  // ledge: a straight piece drawn just under a glass. Ink is a rigid body with
  // mass, so a piece drawn in mid-air FALLS and lands on whatever is beneath
  // it — that is the reference game's "build the cup a floor" move, and it is
  // the reason this family is first in the vocabulary.
  (lv.glasses || []).forEach((g) => {
    const y = g.y + g.h / 2 + 8;
    for (const reach of [90, 140, 200, 260, 340, 420]) {
      push([{ x: g.x - reach, y }, { x: g.x + reach, y }], 'ledge');
    }
    for (const dy of [-40, -80]) {
      for (const reach of [140, 220, 300]) {
        push([{ x: g.x - reach, y: y + dy }, { x: g.x + reach, y: y + dy }], 'ledge');
      }
    }
  });

  // roofdrop: a roof whose two ends turn down, so the run-off is aimed at a
  // mouth instead of rolling off a lip and flying sideways
  for (let i = 0; i < A.length; i++) {
    for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j];
      const dx = Math.abs(b.x - a.x);
      if (dx < 200 || dx > 520) continue;
      if (Math.abs(b.y - a.y) > 80) continue;
      const mx = (a.x + b.x) / 2;
      for (const rise of [60, 90, 120, 150]) {
        for (const lip of [30, 60, 90]) {
          push([
            { x: a.x, y: a.y + lip }, { x: a.x, y: a.y },
            { x: mx, y: (a.y + b.y) / 2 - rise },
            { x: b.x, y: b.y }, { x: b.x, y: b.y + lip },
          ], 'roofdrop');
        }
      }
    }
  }

  // arch: from an anchor, up over a tall obstacle, down to a mouth. This is the
  // "get the water over the wall" shape; the apex has to sit above the prop, so
  // the apex is generated from the props, not from the midpoint.
  for (const a of A) {
    (lv.platforms || []).forEach((w) => {
      if (w.w > 60 || w.h < 120) return;                 // only tall, narrow things
      const apexY = w.y - w.h / 2 - 40;
      (lv.glasses || []).forEach((g) => {
        const rim = { x: g.x - g.w / 2, y: g.y - g.h / 2 - 8 };
        if (Math.abs(a.x - w.x) < 40) return;
        if (a.x > w.x === rim.x > w.x) return;            // both on the same side
        // the apex has to clear the wall on the destination side, or the
        // descent is a stroke drawn through solid scenery (the pen refuses it)
        const side = (rim.x > w.x) ? 1 : -1;
        for (const out of [w.w / 2 + 40, w.w / 2 + 90]) {
          for (const lift of [0, 30, 60]) {
            push([{ x: a.x, y: a.y }, { x: w.x + side * out, y: apexY - lift }, { x: rim.x, y: rim.y }], 'arch');
          }
        }
      });
    });
  }

  // vsplit: a V hung between two anchors with its apex BELOW them — the shape
  // that splits one stream into two cups when it is laid over a pedestal.
  for (let i = 0; i < A.length; i++) {
    for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j];
      const dx = Math.abs(b.x - a.x);
      if (dx < 150 || dx > 460) continue;
      if (Math.abs(b.y - a.y) > 60) continue;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      for (const drop of [16, 24, 34, 46, 60]) {
        for (const lean of [0, -20, 20]) {
          push([{ x: a.x, y: a.y }, { x: mx + lean, y: my + drop }, { x: b.x, y: b.y }], 'vsplit');
        }
      }
    }
  }

  // tent: both ends over a mouth, apex resting on a support between them
  {
    const mids = A.filter((q) => q.tag === 'plank' || q.tag === 'block');
    const rims = A.filter((q) => q.tag === 'rim' || q.tag === 'tap');
    for (const m of mids) {
      for (const a of rims) {
        for (const b of rims) {
          if (a.x >= b.x) continue;
          if (!(m.x > a.x + 40 && m.x < b.x - 40)) continue;
          if (Math.abs(a.x - m.x) > 300 || Math.abs(b.x - m.x) > 300) continue;
          if (m.y > a.y + 4 || m.y > b.y + 4) continue;      // the apex must be above them
          if (a.y - m.y < 4 || a.y - m.y > 130) continue;
          push([{ x: a.x, y: a.y }, { x: m.x, y: m.y }, { x: b.x, y: b.y }], 'tent');
        }
      }
    }
  }

  // chute: from one anchor, aimed at each glass mouth
  for (const a of A) {
    (lv.glasses || []).forEach((g) => {
      const mouthY = g.y - g.h / 2;
      for (const endY of [mouthY - 60, mouthY - 20, mouthY + 20]) {
        for (const off of [-70, -30, 0, 30, 70]) {
          push([{ x: a.x, y: a.y }, { x: g.x + off, y: endY }], 'chute');
        }
      }
    });
  }
  // bracket: a short piece beside or under a glass
  (lv.glasses || []).forEach((g) => {
    const top = g.y - g.h / 2, bot = g.y + g.h / 2;
    for (const [dx, y0, y1] of [[-g.w / 2 - 10, top, bot], [g.w / 2 + 10, top, bot],
      [0, bot + 8, bot + 8], [-g.w / 2 - 30, top + 20, bot + 10], [g.w / 2 + 30, top + 20, bot + 10]]) {
      for (const w of [0, 18, 36]) {
        push([{ x: g.x + dx - w, y: y0 }, { x: g.x + dx + w, y: y1 }], 'bracket');
      }
    }
  });
  return out;
}

// ---------------------------------------------------------------- drawing
// A control point list is what a hand actually draws; the game samples it into
// ink. Keep the CONTROL points (2-5 of them) all the way through the search —
// the twitchy hand and the wavy hand are applied to those, exactly as they are
// in tools/solve.js. Waving a densely sampled stroke turns it into a corrugated
// sheet, which is not a hand and which no water will run down.
function controlPoints(pts) {
  return pts.map((q) => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) }));
}

function drawable(scene, pts) {
  const sampled = poly(pts.map((q) => [q.x, q.y]));
  if (!sampled.length) return null;
  for (const q of sampled) if (scene.inkPointBlocked(q.x, q.y)) return null;
  return controlPoints(pts);
}

const asStroke = (ctrl) => poly(ctrl.map((q) => [q.x, q.y]));

function score(r) {
  if (r.won) return 100;             // an actual win beats any part-filled room
  let m = 0;
  (r.fills || []).forEach((f) => { m += Math.min(1, (f.count || 0) / Math.max(1, f.needCount || 1)); });
  return m;
}

function len(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

// ---------------------------------------------------------------- per room
function solve(room) {
  const lv = levelOf(room);
  const penScene = new HG.Scene(JSON.parse(JSON.stringify(lv)));
  const idle = play(HG, room.id, [], { frames: 60 * 26, level: lv });
  if (idle.won) { penScene.destroy(); return { id: room.id, failed: true, reason: 'the room solves itself' }; }

  let SEEDS = {};
  try { SEEDS = require('./hero-seeds'); } catch (e) { SEEDS = {}; }
  const raw = families(lv, room);
  if (SEEDS[room.name]) raw.unshift({ pts: SEEDS[room.name].map((q) => ({ x: q[0], y: q[1] })), tag: room.intent || 'seed' });
  const cands = [];
  const seen = new Set();
  for (const c of raw) {
    const key = c.pts.map((q) => Math.round(q.x / 12) + ',' + Math.round(q.y / 12)).join('>');
    if (seen.has(key)) continue;
    seen.add(key);
    if (len(c.pts) > 760) continue;
    const pts = drawable(penScene, c.pts);
    if (!pts) continue;
    cands.push({ pts, tag: c.tag });
  }
  if (!cands.length) { penScene.destroy(); return { id: room.id, failed: true, reason: 'nothing drawable between the anchors' }; }

  // Screen cheaply (8 s of pour) — enough to separate "some water arrives" from
  // "nothing arrives". Ordering, not proof.
  // 610 candidates x 8 s of pour is ten minutes for one room. Keep the search
  // to a screening budget and rely on the families being generated in a
  // meaningful order (intended shape first) rather than on brute force.
  const want = room.intent || '';
  cands.sort((x, y) => (y.tag === want) - (x.tag === want) || len(x.pts) - len(y.pts));
  const shortlist = cands.slice(0, 150);
  const scored = shortlist.map((c) => ({ c, sc: score(play(HG, room.id, [asStroke(c.pts)], { frames: 60 * 5, level: lv })) }));
  // A screen winner is the only thing worth a full play; the rest is a waste of
  // ten minutes. Intent breaks ties so the room ships the shape it was built for.
  scored.sort((x, y) => y.sc - x.sc || (y.c.tag === want) - (x.c.tag === want) || len(x.c.pts) - len(y.c.pts));

  // Full play, in that order. The first line that wins *and* survives both
  // hands ships — which is why a room's proved answer is the shape the room was
  // designed around, not whatever the search stumbled into first.
  // A room should ship the answer it was designed around, not whichever line
  // happened to win first. So the intended family is played before everything
  // else — and a line that "wins" by splashing is only the answer if nothing of
  // the intended shape works.
  const order = [
    ...scored.filter((q) => q.sc >= 100 && q.c.tag === want),
    ...scored.filter((q) => q.sc >= 100 && q.c.tag !== want),
    ...scored.filter((q) => q.sc < 100),
  ];
  const tried = new Set();
  for (const { c, sc } of order) {
    if (tried.size >= 16) break;
    if (sc <= 0 && tried.size > 0) break;      // nothing lands: stop paying for it
    const key = c.pts.map((q) => Math.round(q.x) + ',' + Math.round(q.y)).join('>');
    if (tried.has(key)) continue;
    tried.add(key);
    const r = play(HG, room.id, [asStroke(c.pts)], { frames: 60 * 30, level: lv });
    if (!r.won) continue;

    // Refine: nudge one control point at a time and KEEP the best winner, which
    // is the shortest line that still wins. (An earlier version kept the last
    // winner, and the shipped answer was a line nobody had designed.)
    let best = { pts: c.pts, ink: len(c.pts) };
    for (const pi of c.pts.keys()) {
      for (const [dx, dy] of [[0, -10], [0, 10], [-10, 0], [10, 0], [-18, -8], [18, -8]]) {
        const moved = c.pts.map((q, i) => (i === pi ? { x: q.x + dx, y: q.y + dy } : q));
        const sc = drawable(penScene, moved);
        if (!sc) continue;
        const L = len(sc);
        if (L >= best.ink) continue;
        if (play(HG, room.id, [asStroke(sc)], { frames: 60 * 30, level: lv }).won) best = { pts: sc, ink: L };
      }
    }

    const pts2 = controlPoints(best.pts);
    let twitch = 0;
    for (let k = 0; k < JITTER.length; k++) {
      const d = JITTER[k];
      const v = poly(pts2.map((q, i) => [q.x + (i % 2 ? -d[0] : d[0]), q.y + d[1]]), 8);
      if (play(HG, room.id, [v], { frames: 60 * 30, level: lv }).won) twitch++;
    }
    let wave = 0;
    for (const k of WAVY) if (play(HG, room.id, [wavy(pts2, k)], { frames: 60 * 30, level: lv }).won) wave++;
    if (process.env.HG_DEBUG) console.log('   tried', c.tag, 'hands', twitch, 'wavy', wave, 'ink', Math.round(len(pts2)));
    if (twitch < 4 || wave < 3) continue;
    const proof = play(HG, room.id, [asStroke(pts2)], { frames: 60 * 30, level: lv });
    const settled = proof.inkSegs;
    lv.ink = Math.max(120, Math.round((len(pts2) * 1.25) / 10) * 10);
    penScene.destroy();
    return {
      id: room.id, tag: c.tag, intent: room.intent || null, level: lv,
      strokes: [pts2.map((q) => [q.x, q.y])],
      ink: lv.ink, used: Math.round(len(pts2)),
      twitch, wave, fill: proof.fills, inkSegs: settled,
    };
  }
  const bestSc = scored.length ? scored[0].sc : 0;
  penScene.destroy();
  return { id: room.id, failed: true,
    reason: 'no stroke in the vocabulary wins (best fill ' + bestSc.toFixed(2) + ', ' +
      cands.length + ' candidates, ' + tried.size + ' played)' };
}

// ------------------------------------------------------------- bearing
// A room is only a puzzle if the line has to LEAN on the room. This asks the
// physical question directly: which pieces of scenery does the proved stroke
// touch? A room whose answer touches nothing (or one thing) is a slide again.
function bearing(lv, segs) {
  const pts = [];
  (segs || []).forEach((q) => {
    pts.push({ x: q.x1, y: q.y1 });
    pts.push({ x: (q.x1 + q.x2) / 2, y: (q.y1 + q.y2) / 2 });
    pts.push({ x: q.x2, y: q.y2 });
  });
  const solids = [];
  (lv.platforms || []).forEach((p) => solids.push({ x: p.x, y: p.y, w: p.w, h: p.h, a: p.angle || 0 }));
  (lv.crates || []).forEach((c) => solids.push({ x: c.x, y: c.y, w: c.w || c.size, h: c.h || c.size, a: c.angle || 0 }));
  const hit = new Set();
  pts.forEach((q) => {
  {
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      const ca = Math.cos(-s.a), sa = Math.sin(-s.a);
      const dx = q.x - s.x, dy = q.y - s.y;
      const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
      if (Math.abs(lx) <= s.w / 2 + 6 && Math.abs(ly) <= s.h / 2 + 6) hit.add(i);
    }
  }
  });
  return hit.size;
}

// ---------------------------------------------------------------- emit
if (EMIT) {
  const rows = ROMS.map((r) => {
    const f = path.join(CACHE, 'R' + r.id + '.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { id: r.id, failed: true };
  });
  const bad = rows.filter((r) => r.failed);
  if (bad.length) {
    console.log('refusing to emit: ' + bad.map((b) => 'R' + b.id).join(' '));
    bad.forEach((b) => console.log('  R' + b.id, b.reason || 'no data'));
    process.exitCode = 1;
  } else {
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
      lv.glasses.forEach((g) => L.push('        { x: ' + num(g.x) + ', y: ' + num(g.y) + ', w: ' + g.w + ', h: ' + g.h +
        ', need: ' + g.need + (g.hanging ? ', hanging: true' : '') + (g.fixed ? ', fixed: true' : '') + ' },'));
      L.push('      ],');
      const P = (p) => p.poly
        ? 'P({ poly: [' + p.poly.map((q) => '[' + num(q[0]) + ', ' + num(q[1]) + ']').join(', ') + '], kind: \'' + (p.kind || 'teal') + '\' })'
        : 'P({ x: ' + num(p.x) + ', y: ' + num(p.y) + ', w: ' + p.w + ', h: ' + p.h + ', kind: \'' + (p.kind || 'teal') + '\'' +
          (p.angle ? ', angle: ' + ang(p.angle) : '') + ' })';
      if (lv.platforms.length) {
        L.push('      platforms: [');
        lv.platforms.forEach((p) => L.push('        ' + P(p) + ','));
        L.push('      ],');
      }
      if (lv.crates.length) {
        L.push('      crates: [');
        lv.crates.forEach((c) => L.push('        { x: ' + num(c.x) + ', y: ' + num(c.y) + ', ' +
          (c.w ? 'w: ' + num(c.w) + ', h: ' + num(c.h) : 'size: ' + c.size) + ', kind: \'' + c.kind + '\'' +
          (c.angle ? ', angle: ' + ang(c.angle) : '') + ' },'));
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
        lv.fans.forEach((f) => L.push('        { x: ' + num(f.x) + ', y: ' + num(f.y) + ', w: ' + f.w + ', h: ' + f.h +
          ', angle: ' + ang(f.angle || 0) + ', force: ' + (f.force || 0.13) + ', dir: ' + (f.dir || 1) + ' },'));
        L.push('      ],');
      }
      L.push('    },');
      return L.join('\n');
    };

    const file = fs.readFileSync('js/levels.js', 'utf8');
    const head = file.split('  const LEVELS = [')[0];
    const tailFrom = file.indexOf('  // ------------------------------------------------------------- normalising');
    if (tailFrom < 0) throw new Error('js/levels.js is not the file this tool expects');
    fs.writeFileSync('js/levels.js',
      head + '  const LEVELS = [\n' + rows.map((r) => one(r.level)).join('\n') + '\n  ];\n\n' + file.slice(tailFrom));

    const solHead = fs.readFileSync('tools/solutions.js', 'utf8').split('module.exports = {')[0];
    const solBody = rows.map((r) => '  ' + r.id + ': [[[' +
      r.strokes[0].map((p) => (Math.round(p[0] * 1e4) / 1e4) + ', ' + (Math.round(p[1] * 1e4) / 1e4)).join('], [') + ']]],').join('\n');
    fs.writeFileSync('tools/solutions.js', solHead + 'module.exports = {\n' + solBody + '\n};\n');
    console.log('wrote js/levels.js and tools/solutions.js (' + rows.length + ' rooms)');
  }
} else {
  const rows = [];
  for (const room of ROMS) {
    if (ONLY.length && !ONLY.includes(room.id)) continue;
    const t0 = Date.now();
    const res = solve(room);
    const secs = ((Date.now() - t0) / 1000).toFixed(0) + 's';
    if (!res.failed) {
      res.verb = room.verb;
      res.bearing = bearing(res.level, res.inkSegs);
    }
    rows.push(res);
    if (res.failed) {
      console.log('R' + String(room.id).padStart(2), room.name.padEnd(20), 'FAILED', res.reason, secs);
    } else {
      console.log('R' + String(room.id).padStart(2), room.name.padEnd(20), 'ok', String(res.tag).padEnd(8),
        'ink', res.used + '/' + res.ink, 'fill', res.fill.map((f) => f.fill.toFixed(2)).join('/'),
        'hands', res.twitch + '/6', 'wavy', res.wave + '/4', 'bearing', res.bearing, secs);
      fs.writeFileSync(path.join(CACHE, 'R' + room.id + '.json'), JSON.stringify(res, null, 1));
    }
  }
  console.log(rows.filter((r) => !r.failed).length + '/' + rows.length + ' rooms proved');
}
