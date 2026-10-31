/* ==========================================================================
   tools/simheadless.js — runs the real game simulation in Node (no browser).

   Used by tools/verify.js to prove that every level actually can be solved
   with a hand-authored stroke, and to catch physics / logic regressions.
   ========================================================================== */
'use strict';
const path = require('path');

// ------------------------------------------------------------------- seeds
// Droplets get a slightly random radius (js/water.js) because identical ones
// look like plastic beads. That one hundredth of a pixel was enough to make a
// proved line lose its own proof on the next run: the proof and the
// verification were playing two different games.
//
// So the headless toolchain runs on a seeded generator. Same level, same seed,
// same strokes -> the same pour, every time. `flaky` deliberately walks the
// seed instead, which is how real variance gets measured instead of hidden.
let _rand = Math.random;
function seed(n) {
  let a = (n >>> 0) || 1;
  _rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
seed(1234);
Math.random = () => _rand();

function boot() {
  // --- tiny browser shims ---------------------------------------------------
  global.window = global;
  global.performance = global.performance || { now: () => Date.now() };
  if (!global.localStorage) {
    const store = {};
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  }
  global.Matter = require(path.resolve(__dirname, '../vendor/matter.min.js'));

  const base = path.resolve(__dirname, '../js');
  require(path.join(base, 'util.js'));
  require(path.join(base, 'levels.js'));
  require(path.join(base, 'water.js'));
  require(path.join(base, 'scene.js'));

  const HG = global.window.HG;
  HG.Sfx = null;
  return HG;
}

const STEP = 1000 / 60;

/**
 * Play one level headlessly.
 * @param {object} HG booted namespace
 * @param {number} id level id
 * @param {Array<Array<{x:number,y:number}>>} strokes ink strokes to draw
 * @param {object} opts { frames, verbose }
 */
function play(HG, id, strokes, opts) {
  opts = opts || {};
  // opts.level lets a design tool play a *modified* layout (a candidate prop,
  // a moved crate) without touching the shipped levels.
  seed(opts.seed === undefined ? 1234 + id : opts.seed);
  const level = opts.level ? JSON.parse(JSON.stringify(opts.level)) : HG.levelById(id);
  const scene = new HG.Scene(level);
  let ok = true;
  const err = [];

  // draw the authored strokes first
  for (const stroke of strokes || []) {
    if (!stroke.length) continue;
    if (!scene.beginInk(stroke[0].x, stroke[0].y)) { err.push('out of ink'); ok = false; }
    for (let i = 1; i < stroke.length; i++) {
      const p = stroke[i];
      if (scene.inkPointBlocked(p.x, p.y)) { err.push('blocked at ' + p.x + ',' + p.y); continue; }
      if (!scene.addInkPoint(p.x, p.y) && scene.inkRemaining() <= 0) { err.push('ran out of ink'); ok = false; }
    }
    scene.endInk();
  }
  const inkUsed = scene.ink.used;

  // trace where every lost droplet left the level
  const removed = [];
  const origRemove = scene.water.remove.bind(scene.water);
  scene.water.remove = (p) => {
    if (!p.dead) removed.push({ x: Math.round(p.body.position.x), y: Math.round(p.body.position.y) });
    origRemove(p);
  };
  scene.start();

  const maxFrames = opts.frames || 60 * 25;
  let frames = 0;
  while (frames < maxFrames) {
    scene.step(STEP);
    scene.physics(STEP);
    frames++;
    if (scene.state === 'won' || scene.state === 'lost') break;
  }

  const poses = scene.glasses.map((g) => ({
    x: Math.round(g.cx), y: Math.round(g.cy), angle: +g.angle.toFixed(2),
    dynamic: !!g.dynamic, lost: !!g.lost,
  }));
  const fills = scene.glasses.map((g) => ({
    fill: +(g.count / g.capacity).toFixed(3),
    need: g.need,
    count: g.count,
    needCount: g.needCount,
    ok: g.satisfied,
  }));
  // where the wire actually ended up, after it fell and settled: the audit
  // needs this to answer "did the line lean on the room, or just hang in it?"
  const inkSegs = scene.inkWorldSegments().map((q) => ({
    x1: +q.x1.toFixed(1), y1: +q.y1.toFixed(1), x2: +q.x2.toFixed(1), y2: +q.y2.toFixed(1),
  }));
  const result = {
    id,
    name: level.name,
    inkSegs,
    state: scene.state,
    won: scene.state === 'won',
    seconds: +(frames / 60).toFixed(1),
    inkUsed: +inkUsed.toFixed(1),
    budget: scene.ink.budget,
    stars: HG.starCount ? HG.starCount(inkUsed, scene.ink.budget) : null,
    fills,
    glasses: poses,
    waterLeft: scene.water.particles.length,
    live: scene.water.particles.map((p) => ({ x: Math.round(p.body.position.x), y: Math.round(p.body.position.y) })),
    removed,
    errors: err,
  };
  scene.destroy();
  return result;
}

/** straight helper: a stroke from a to b sampled every 8px */
function line(x1, y1, x2, y2) {
  const pts = [];
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 8));
  for (let i = 0; i <= n; i++) {
    pts.push({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n });
  }
  return pts;
}

/** polyline helper: [[x,y],[x,y],...] -> sampled stroke */
function poly(points) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const seg = line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    out.push(...(i ? seg.slice(1) : seg));
  }
  return out;
}

module.exports = { boot, play, line, poly, seed, STEP };
