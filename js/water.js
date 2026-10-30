/* ==========================================================================
   water.js — the fluid. Water is simulated as hundreds of tiny soft circles
   that slide over ink lines and scenery like a real liquid would.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const { Bodies } = global.Matter;

  const R = 7;                      // particle radius (world px)
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
