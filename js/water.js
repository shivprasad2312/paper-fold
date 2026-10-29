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
        collisionFilter: { category: 0x0002, mask: 0xffff },
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

      // fans push water that is inside their cone
      if (scene.fans.length) {
        for (const f of scene.fans) {
          const cos = Math.cos(f.angle), sin = Math.sin(f.angle);
          const halfH = f.h / 2, reach = 640;
          for (const p of this.particles) {
            const b = p.body;
            const dx = b.position.x - f.x, dy = b.position.y - f.y;
            // local coordinates: x along the wind direction
            const lx = dx * cos + dy * sin;
            const ly = -dx * sin + dy * cos;
            if (lx < f.w * 0.3 || lx > reach || Math.abs(ly) > halfH * (0.4 + lx / reach * 1.2)) continue;
            const falloff = 1 - Math.min(1, lx / reach);
            const F = f.force * f.dir * falloff * 0.00022 * b.mass;
            M2.Body.applyForce(b, b.position, { x: F * cos, y: F * sin });
          }
        }
      }

      // bullets / hot pads / out of bounds
      for (const p of this.particles) {
        if (p.dead) continue;
        const b = p.body;
        const x = b.position.x, y = b.position.y;

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

    // sorted list of the y positions of every droplet inside a glass
    levelsIn(glass) {
      const ys = [];
      for (const p of this.particles) {
        if (glass.contains(p.body.position.x, p.body.position.y)) ys.push(p.body.position.y);
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
