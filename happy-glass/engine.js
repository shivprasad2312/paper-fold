/* engine.js -- Happy-Glass-style physics, no DOM.
 *
 * Water is a pool of soft circular particles recycled through a pipe. Ink lines
 * become static capsule colliders. The glass is three capsules. Victory is a
 * water height inside the glass, derived from how many particles it holds.
 *
 * Kept renderer-free so tests/sim-solve.mjs can run whole levels headless.
 */

export const R = 5;                 // particle radius
export const GRAVITY = 2100;
const MAX_SPEED = 1600;
const MIN_D = R * 2;
const STIFF = 0.55;
const ITER = 2;

export const GLASS_T = 8;           // glass wall thickness

export function createWorld(level) {
  const w = {
    level,
    time: 0,
    inkUsed: 0,
    particles: [],
    segments: [],
    win: false,
    winTime: 0,
  };

  for (let i = 0; i < level.total; i++) {
    w.particles.push({ x: 0, y: -9999, vx: 0, vy: 0, alive: false });
  }
  spawn(w, 0);

  // glass: three capsules (left wall, right wall, floor)
  const g = level.glass;
  const t = GLASS_T;
  addSegment(w, g.x - t, g.y, g.x - t, g.y + g.h, t, "glass");
  addSegment(w, g.x + g.w + t, g.y, g.x + g.w + t, g.y + g.h, t, "glass");
  addSegment(w, g.x - t, g.y + g.h + t, g.x + g.w + t, g.y + g.h + t, t, "glass");

  for (const o of level.obstacles || []) {
    addSegment(w, o.x1, o.y1, o.x2, o.y2, o.r || 9, o.kind || "rock");
  }
  return w;
}

export function addSegment(world, x1, y1, x2, y2, r = 7, kind = "ink") {
  world.segments.push({ x1, y1, x2, y2, r, kind });
}

export function addInkStroke(world, pts, radius = 7) {
  for (let i = 1; i < pts.length; i++) {
    addSegment(world, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, radius, "ink");
  }
}

/* ------------------------------------------------------------------ emission */

function spawn(world, startIndex) {
  const { x, y, w: pw } = world.level.pipe;
  let n = startIndex;
  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[(n + i) % world.particles.length];
    if (p.alive) continue;
    p.x = x + (Math.random() - 0.5) * pw + ((n + i) % 7 - 3) * (R * 2);
    p.y = y - 26 - i * R * 2.1;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = 60;
    p.alive = true;
  }
}

function recycle(p, world) {
  const { x, w: pw } = world.level.pipe;
  p.x = x + (Math.random() - 0.5) * pw;
  p.y = world.level.pipe.y - 30 - Math.random() * 120;
  p.vx = 0;
  p.vy = 60;
}

/* ------------------------------------------------------------------ physics */

function collideSegments(world) {
  const segs = world.segments;
  for (const p of world.particles) {
    if (!p.alive) continue;
    for (let s = 0; s < segs.length; s++) {
      const g = segs[s];
      const dx = g.x2 - g.x1, dy = g.y2 - g.y1;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((p.x - g.x1) * dx + (p.y - g.y1) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = g.x1 + dx * t, cy = g.y1 + dy * t;
      let nx = p.x - cx, ny = p.y - cy;
      const minD = R + g.r;
      let d2 = nx * nx + ny * ny;
      if (d2 >= minD * minD) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-6) { nx = 0; ny = -1; d = 1e-6; }
      else { nx /= d; ny /= d; }
      p.x = cx + nx * minD;
      p.y = cy + ny * minD;
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) {
        const rest = g.kind === "ink" ? 0.05 : 0.12;
        p.vx -= nx * vn * (1 + rest);
        p.vy -= ny * vn * (1 + rest);
        // friction along the surface
        p.vx *= 0.965;
        p.vy *= 0.965;
      }
    }
  }
}

function collideParticles(world) {
  const ps = world.particles;
  const cell = MIN_D * 2;
  const grid = new Map();
  const key = (x, y) => ((x / cell) | 0) * 10007 + ((y / cell) | 0);
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (!p.alive) continue;
    const k = key(p.x, p.y);
    let bucket = grid.get(k);
    if (!bucket) { bucket = []; grid.set(k, bucket); }
    bucket.push(i);
  }
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i];
    if (!a.alive) continue;
    const gx = (a.x / cell) | 0, gy = (a.y / cell) | 0;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = grid.get((gx + ox) * 10007 + (gy + oy));
        if (!bucket) continue;
        for (const j of bucket) {
          if (j <= i) continue;
          const b = ps[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= MIN_D * MIN_D || d2 < 1e-9) continue;
          const d = Math.sqrt(d2);
          const push = (MIN_D - d) * 0.5 * STIFF;
          dx /= d; dy /= d;
          a.x -= dx * push; a.y -= dy * push;
          b.x += dx * push; b.y += dy * push;
          // weak velocity mixing keeps the pool from jittering forever
          const rel = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
          if (rel < 0) {
            const j2 = rel * 0.25;
            a.vx += dx * j2; a.vy += dy * j2;
            b.vx -= dx * j2; b.vy -= dy * j2;
          }
        }
      }
    }
  }
}

function integrate(world, h) {
  const W = 720, H = 1080;
  for (const p of world.particles) {
    if (!p.alive) continue;
    p.vy += GRAVITY * h;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAX_SPEED) { p.vx *= MAX_SPEED / sp; p.vy *= MAX_SPEED / sp; }
    p.x += p.vx * h;
    p.y += p.vy * h;
    if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx) * 0.3; }
    if (p.x > W - R) { p.x = W - R; p.vx = -Math.abs(p.vx) * 0.3; }
    if (p.y > H + 80) recycle(p, world);
  }
}

export function step(world, dt) {
  if (dt > 0.05) dt = 0.05;
  const substeps = 4;
  const h = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    integrate(world, h);
    for (let it = 0; it < ITER; it++) collideParticles(world);
    collideSegments(world);
  }
  world.time += dt;
  if (!world.win && fillState(world).win) {
    world.win = true;
    world.winTime = world.time;
  }
}

/* ------------------------------------------------------------------ scoring */

export function fillState(world) {
  const g = world.level.glass;
  let inside = 0;
  for (const p of world.particles) {
    if (!p.alive) continue;
    if (p.x > g.x && p.x < g.x + g.w && p.y > g.y && p.y < g.y + g.h) inside++;
  }
  const innerW = g.w;
  const height = (inside * (MIN_D * MIN_D)) / innerW;   // packing estimate
  const target = world.level.targetH ?? g.h * 0.5;
  const ratio = Math.min(1, height / target);
  return {
    inside,
    height,
    target,
    ratio,
    waterY: g.y + g.h - height,
    win: height >= target,
  };
}
