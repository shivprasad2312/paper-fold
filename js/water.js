/* ==========================================================================
   water.js — the fluid. Water is simulated as hundreds of tiny soft circles
   that slide over ink lines and scenery like a real liquid would.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const { Bodies } = global.Matter;

  const R0 = 7;                     // particle radius (world px)
  const R = R0;
  const MAX_PARTICLES = 340;

  class Water {
    constructor(scene) {
      this.scene = scene;
      this.particles = [];
      this.splashes = [];           // cosmetic droplets (not simulated)
      this._plopCd = 0;
      this._spawnJitter = 0;
    }

    spawn(x, y, vx, vy) {
      if (this.particles.length >= MAX_PARTICLES) return null;
      const body = Bodies.circle(x, y, R + Math.random() * 0.9, {
        label: 'water',
        friction: 0.0015,
        frictionAir: 0.004,
        frictionStatic: 0,
        restitution: 0.03,
        density: 0.0016,
        slop: 0.02,
        // Water collides with everything, including drawn ink. A stream leaning
        // on a ramp is the whole mechanic: it holds the ramp down, and if the
        // ramp is badly placed it shoves it off the ledge.
        collisionFilter: { category: HG.CAT_WATER, mask: HG.MASK_WATER },
      });
      const Matter = global.Matter;
      Matter.Body.setVelocity(body, { x: vx || 0, y: vy || 0 });
      Matter.Composite.add(this.scene.world, body);
      const p = { body, born: performance.now(), fade: 1, dead: false };
      this.particles.push(p);
      return p;
    }

    splash(x, y, n, power) {
      for (let i = 0; i < n; i++) {
        this.splashes.push({
          x, y,
          vx: M.rand(-1, 1) * (power || 2.4),
          vy: M.rand(-2.6, -0.4) * (power ? power * 0.6 : 1),
          life: 1,
          r: M.rand(1.6, 3.4),
        });
      }
      if (this.splashes.length > 160) this.splashes.splice(0, this.splashes.length - 160);
    }

    remove(p) {
      if (p.dead) return;
      p.dead = true;
      global.Matter.Composite.remove(this.scene.world, p.body);
    }

    clear() {
      this.particles.forEach((p) => {
        if (!p.dead) global.Matter.Composite.remove(this.scene.world, p.body);
      });
      this.particles.length = 0;
      this.splashes.length = 0;
    }

    // ------------------------------------------------------------- simulation
    // ------------------------------------------------------------ cohesion
    // Droplets are separate circles, so without help a falling stream is a
    // shower of beads and a heap on the line is a bag of marbles: every bead
    // keeps its own rim, nothing packs, and the whole thing shimmers. Real
    // water coheres. This is the cheap version — a spatial hash, then each
    // droplet is nudged a fraction of a pixel toward the average of its
    // neighbours and its velocity is pulled a few percent toward theirs. It
    // costs one pass over the particles, it never moves anything far enough to
    // tunnel, and Matter's solver still resolves every overlap.
    cohere() {
      const ps = this.particles;
      const n = ps.length;
      if (n < 2) return;
      const R = R0;
      const cell = R * 2.4;
      const hash = new Map();
      const key = (x, y) => ((x / cell) | 0) * 73856093 ^ ((y / cell) | 0) * 19349663;
      for (let i = 0; i < n; i++) {
        const b = ps[i].body;
        if (ps[i].dead) continue;
        const k = key(b.position.x, b.position.y);
        let bucket = hash.get(k);
        if (!bucket) { bucket = []; hash.set(k, bucket); }
        bucket.push(i);
      }
      const pull = 0.14;          // px per frame toward the local centre
      const visc = 0.05;          // fraction of a neighbour's velocity taken on
      for (let i = 0; i < n; i++) {
        const p = ps[i];
        if (p.dead) continue;
        const b = p.body;
        const gx = (b.position.x / cell) | 0, gy = (b.position.y / cell) | 0;
        let sx = 0, sy = 0, svx = 0, svy = 0, c = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const bucket = hash.get((gx + dx) * 73856093 ^ (gy + dy) * 19349663);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j === i) continue;
              const q = ps[j].body;
              const ddx = q.position.x - b.position.x, ddy = q.position.y - b.position.y;
              if (ddx * ddx + ddy * ddy > 6.4 * R * R) continue;   // ~2.5 R
              sx += ddx; sy += ddy;
              svx += q.velocity.x; svy += q.velocity.y;
              c++;
            }
          }
        }
        if (!c) continue;
        // pull toward the neighbours, but never far enough to jump a gap
        const mx = sx / c, my = sy / c;
        const m = Math.hypot(mx, my);
        const k2 = m > 0.001 ? Math.min(pull, m) / m : 0;
        global.Matter.Body.setPosition(b, {
          x: b.position.x + mx * k2,
          y: b.position.y + my * k2,
        });
        if (c >= 2) {
          const f = Math.min(0.35, visc * c / 4);
          global.Matter.Body.setVelocity(b, {
            x: b.velocity.x * (1 - f) + (svx / c) * f,
            y: b.velocity.y * (1 - f) + (svy / c) * f,
          });
        }
      }
    }

    step(dt, t) {
      const scene = this.scene;
      const M2 = global.Matter;

      // fans push water that is inside their cone (dir = +1 right, -1 left)
      if (scene.fans.length) {
        for (const f of scene.fans) {
          const c = Math.cos(f.angle), sn = Math.sin(f.angle);
          const dir = f.dir >= 0 ? 1 : -1;
          const ux = c * dir, uy = sn * dir;      // wind direction
          const vx = -sn, vy = c;                 // perpendicular
          const halfH = f.h * 0.5, reach = 700;
          for (const p of this.particles) {
            const b = p.body;
            // water sitting inside a glass is sheltered from the wind
            let sheltered = false;
            for (const g of scene.glasses) {
              if (g.contains(b.position.x, b.position.y)) { sheltered = true; break; }
            }
            if (sheltered) continue;
            const dx = b.position.x - f.x, dy = b.position.y - f.y;
            const along = dx * ux + dy * uy;
            const across = dx * vx + dy * vy;
            const spreadAt = halfH * (0.55 + (along / reach) * 1.6);
            if (along < f.w * 0.35 || along > reach || Math.abs(across) > spreadAt) continue;
            const falloff = 1 - Math.min(1, along / reach);
            const F = f.force * falloff * 0.00026 * b.mass;
            M2.Body.applyForce(b, b.position, { x: F * ux, y: F * uy });
          }
        }
      }

      // bullets / hot pads / out of bounds
      // Matter has no continuous collision detection: a droplet faster than
      // (ink thickness + its radius) can skip straight through a drawn line.
      const MAXV = 22;
      for (const p of this.particles) {
        if (p.dead) continue;
        const b = p.body;
        const x = b.position.x, y = b.position.y;

        // safety net: nothing in this game should move at silly speeds
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp > MAXV && !Number.isNaN(sp)) {
          M2.Body.setVelocity(b, { x: (b.velocity.x / sp) * MAXV, y: (b.velocity.y / sp) * MAXV });
        }
        if (!Number.isFinite(x) || !Number.isFinite(y)) { this.remove(p); continue; }

        if (y > HG.H + 140 || x < -420 || x > HG.W + 420) {
          this.remove(p);
          continue;
        }

        // Water that missed every glass drains away instead of settling into a
        // puddle on the floor. Two reasons: the reference game does the same
        // (a miss is a miss, and the level clears itself), and a stage-sized
        // puddle of 40 droplets is what makes the fluid look like it is boiling
        // — every one of them is still a body being jostled by its neighbours.
        // Only water that has *come to rest* below every glass is drained, so a
        // stream running along the floor into a glass is untouched.
        const floorY = this._floorY !== undefined ? this._floorY : (this._floorY = scene.glasses.reduce(
          (m, g) => Math.max(m, g.cy + g.h * 0.5 + 30), 0));
        if (y > floorY && Math.hypot(b.velocity.x, b.velocity.y) < 0.6) {
          p.drained = (p.drained || 0) + 1;
          if (p.drained > 24) {                    // ~0.4 s of lying there
            this.splash(x, y - 4, 2, 0.8);
            this.remove(p);
            continue;
          }
        } else if (p.drained) {
          p.drained = 0;
        }
        // heated pads vaporise droplets
        for (const h of scene.hots) {
          if (pointInOrientedRect(x, y, h)) {
            this.remove(p);
            this.splash(x, y - 6, 4, 1.6);
            scene.onEvaporate && scene.onEvaporate(x, y);
            break;
          }
        }
      }

      // compact dead particles
      if (this.particles.some((p) => p.dead)) {
        this.particles = this.particles.filter((p) => !p.dead);
      }

      // water, not marbles
      this.cohere();

      // cosmetic splash droplets
      for (let i = this.splashes.length - 1; i >= 0; i--) {
        const s = this.splashes[i];
        s.vy += 0.22;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.045;
        if (s.life <= 0) this.splashes.splice(i, 1);
      }
    }

    // ------------------------------------------------------------------ counts
    countIn(glass) {
      let n = 0;
      for (const p of this.particles) {
        if (glass.contains(p.body.position.x, p.body.position.y)) n++;
      }
      return n;
    }

    // sorted list of droplet heights inside a glass, in the glass's own
    // coordinate space (so a tilted or falling glass still measures correctly)
    levelsIn(glass) {
      glass.syncXf();
      const cos = glass._cos, sin = glass._sin;
      const cx = glass.cx, cy = glass.cy, gx = glass.x, gy = glass.y;
      const ys = [];
      for (const p of this.particles) {
        const b = p.body.position;
        const dx = b.x - cx, dy = b.y - cy;
        const lx = gx + dx * cos + dy * sin;
        const ly = gy - dx * sin + dy * cos;
        if (glass.containsLocal(lx, ly)) ys.push(ly);
      }
      ys.sort((a, b) => a - b);
      return ys;
    }
  }

  function pointInOrientedRect(px, py, r, pad) {
    const m = pad || 0;
    const a = r.angle || 0;
    const cos = Math.cos(-a), sin = Math.sin(-a);
    const dx = px - r.x, dy = py - r.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return Math.abs(lx) <= r.w / 2 + m + 2 && Math.abs(ly) <= r.h / 2 + m + 2;
  }

  const M = HG.M;
  Water.R = R;
  Water.MAX_PARTICLES = MAX_PARTICLES;
  Water.pointInOrientedRect = pointInOrientedRect;
  HG.Water = Water;
})(window);
