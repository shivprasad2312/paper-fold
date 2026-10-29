/* ==========================================================================
   scene.js — turns a level definition into a Matter.js world:
   scenery bodies, glasses, taps, hazards, the ink you draw and the water.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const Matter = global.Matter;
  const { Engine, Composite, Bodies, Body, Constraint, Events } = Matter;
  const M = HG.M;

  const WALL = 7;               // glass wall thickness
  const INK_W = 15;             // ink line thickness
  const INK_MIN_STEP = 9;       // simplified point spacing

  // ---------------------------------------------------------------- glass ---
  class Glass {
    constructor(def) {
      this.def = def;
      this.x = def.x;
      this.y = def.y;
      this.w = def.w;
      this.h = def.h;
      this.need = def.need;
      this.tilt = def.tilt || 0;
      this.top = this.y - this.h / 2;
      this.bottom = this.y + this.h / 2;
      this.topHalf = this.w / 2;
      this.botHalf = this.w * 0.36;
      this.parts = [];
      this.count = 0;
      this.fill = 0;
      this.fillSmooth = 0;
      this.satisfied = false;
      this.wobble = 0;
      this.glow = 0;

      const innerTop = 2 * (this.topHalf - WALL);
      const innerBot = 2 * (this.botHalf - WALL);
      const innerH = this.h - WALL * 2;
      const area = ((innerTop + innerBot) / 2) * innerH;
      // droplets squash together, so a "full" glass holds a bit more than the
      // raw area suggests. 1.26 is measured from the simulation itself.
      this.capacity = Math.max(6, Math.round((area * 1.26) / (Math.PI * HG.Water.R * HG.Water.R)));
      this.needCount = Math.max(1, Math.round(this.capacity * this.need));
    }

    innerHalf(y) {
      const t = M.clamp((y - this.top) / this.h, 0, 1);
      return M.lerp(this.topHalf - WALL, this.botHalf - WALL, t);
    }

    contains(x, y) {
      if (y < this.top + 3 || y > this.bottom - 1) return false;
      return Math.abs(x - this.x) < this.innerHalf(y) - 1;
    }

    // world y of the dotted fill line
    needY() {
      const innerH = this.h - WALL * 2;
      return this.bottom - WALL - innerH * this.need;
    }

    ratio() {
      return this.count / this.capacity;
    }
  }

  // ----------------------------------------------------------------- scene ---
  class Scene {
    constructor(level) {
      this.level = level;
      this.engine = Engine.create({ enableSleeping: false });
      this.world = this.engine.world;
      this.engine.gravity.y = 1;
      this.engine.gravity.scale = 0.0014;
      this.engine.positionIterations = 8;
      this.engine.velocityIterations = 6;
      this.engine.constraintIterations = 3;

      this.time = 0;
      this.state = 'idle';           // idle | pouring | settled | won | lost
      this.holdTimer = 0;
      this.settleTimer = 0;
      this.endTimer = 0;
      this.winTimer = 0;
      this.evapPuffs = [];
      this.shake = 0;
      this.onWin = null;
      this.onLose = null;

      this.platforms = [];
      this.crates = [];
      this.spinners = [];
      this.seesaws = [];
      this.movers = [];
      this.hots = [];
      this.fans = [];
      this.glasses = [];
      this.faucets = [];

      this.buildStatics();
      this.buildGlasses();
      this.buildFaucets();
      this.initInk();
      this.water = new HG.Water(this);

      this._onCollide = (ev) => this.onCollide(ev);
      Events.on(this.engine, 'collisionStart', this._onCollide);
    }

    // ---------------------------------------------------------------- build
    buildStatics() {
      const lv = this.level;
      const mk = (x, y, w, h, angle, kind, label, opts) => {
        const b = Bodies.rectangle(x, y, w, h, Object.assign({
          isStatic: true,
          angle: angle || 0,
          label,
          friction: 0.4,
          chamfer: { radius: Math.min(7, Math.min(w, h) / 3) },
        }, opts || {}));
        b.kind = kind || 'wood';
        b.defW = w; b.defH = h;
        Composite.add(this.world, b);
        return b;
      };

      lv.platforms.forEach((p) => {
        const b = mk(p.x, p.y, p.w, p.h, p.angle, p.kind, 'platform');
        this.platforms.push({ def: p, body: b, kind: p.kind });
      });
      lv.crates.forEach((c) => {
        const b = mk(c.x, c.y, c.size, c.size, 0, c.kind || 'wood', 'crate');
        this.crates.push({ def: c, body: b, kind: c.kind || 'wood' });
      });
      lv.hots.forEach((h) => this.hots.push(Object.assign({}, h)));
      lv.fans.forEach((f) => this.fans.push(Object.assign({}, f)));

      lv.spinners.forEach((s) => {
        const b = Bodies.rectangle(s.x, s.y, s.w, s.h, {
          frictionAir: 0.006,
          density: 0.0022,
          restitution: 0.1,
          label: 'spinner',
          chamfer: { radius: 6 },
        });
        Composite.add(this.world, b);
        Composite.add(this.world, Constraint.create({
          pointA: { x: s.x, y: s.y },
          bodyB: b,
          pointB: { x: 0, y: 0 },
          stiffness: 1,
          length: 0,
          damping: 0.1,
          render: { visible: false },
        }));
        if (s.speed) Body.setAngularVelocity(b, s.speed);
        // tiny asymmetry so a resting bar starts to turn when hit
        Body.setAngularVelocity(b, (s.speed || 0) + (Math.random() - 0.5) * 0.02);
        this.spinners.push({ def: s, body: b });
      });

      lv.seesaws.forEach((s) => {
        const b = Bodies.rectangle(s.x, s.y, s.w, s.h, {
          frictionAir: 0.012,
          density: 0.004,
          friction: 0.6,
          label: 'seesaw',
          chamfer: { radius: 5 },
        });
        Composite.add(this.world, b);
        Composite.add(this.world, Constraint.create({
          pointA: { x: s.x, y: s.y },
          bodyB: b,
          pointB: { x: 0, y: 0 },
          stiffness: 0.9,
          length: 0,
          damping: 0.08,
          render: { visible: false },
        }));
        this.seesaws.push({ def: s, body: b });
      });

      lv.movers.forEach((m) => {
        const b = Bodies.rectangle(m.x, m.y, m.w, m.h, {
          isStatic: true,
          label: 'mover',
          chamfer: { radius: 6 },
        });
        Composite.add(this.world, b);
        this.movers.push({ def: m, body: b });
      });
    }

    buildGlasses() {
      const lv = this.level;
      this.glasses = lv.glasses.map((def) => {
        const g = new Glass(def);
        const cx = g.x, cy = g.y;

        const wallAt = (ax, ay, bx, by, thick) => {
          const dx = bx - ax, dy = by - ay;
          const len = Math.hypot(dx, dy);
          const b = Bodies.rectangle((ax + bx) / 2, (ay + by) / 2, thick, len, {
            isStatic: !def.dynamic,
            angle: Math.atan2(-dx, dy),
            label: 'glasswall',
            friction: 0.06,
            restitution: 0.04,
            density: 0.005,
            chamfer: { radius: 3 },
          });
          b.glass = g;
          Composite.add(this.world, b);
          g.parts.push(b);
          return b;
        };

        const topL = { x: cx - g.topHalf, y: g.top };
        const topR = { x: cx + g.topHalf, y: g.top };
        const botL = { x: cx - g.botHalf, y: g.bottom };
        const botR = { x: cx + g.botHalf, y: g.bottom };
        wallAt(topL.x, topL.y, botL.x, botL.y, WALL);
        wallAt(topR.x, topR.y, botR.x, botR.y, WALL);
        // bottom plate
        const bb = Bodies.rectangle(cx, g.bottom - WALL / 2, g.botHalf * 2 - 1, WALL, {
          isStatic: !def.dynamic,
          label: 'glasswall',
          friction: 0.5,
          restitution: 0.02,
          density: 0.005,
          chamfer: { radius: 3 },
        });
        bb.glass = g;
        Composite.add(this.world, bb);
        g.parts.push(bb);
        // rounded rim lips
        [[topL.x + 4, 1], [topR.x - 4, -1]].forEach(([lx, sgn]) => {
          const lip = Bodies.rectangle(lx + sgn * 3, g.top + 2, 12, WALL, {
            isStatic: !def.dynamic, angle: 0, label: 'glasswall',
            friction: 0.06, restitution: 0.05, chamfer: { radius: 3 },
          });
          lip.glass = g;
          Composite.add(this.world, lip);
          g.parts.push(lip);
        });
        if (g.tilt) {
          g.parts.forEach((b) => Body.rotate(b, g.tilt, { x: cx, y: cy }));
        }
        return g;
      });
    }

    buildFaucets() {
      this.faucets = this.level.faucets.map((f) => ({
        def: f,
        x: f.x,
        y: f.y,
        remaining: f.total,
        acc: 0,
        done: false,
        flow: 0,
      }));
    }

    initInk() {
      this.ink = {
        segments: [],
        strokes: [],           // {points:[{x,y}], lastCost}
        used: 0,
        budget: this.level.ink,
        active: null,
      };
    }

    // ------------------------------------------------------------------ ink
    inkRemaining() {
      return Math.max(0, this.ink.budget - this.ink.used);
    }

    beginInk(x, y) {
      if (this.inkRemaining() <= 0) return false;
      this.ink.active = { points: [{ x, y }], body: null };
      return true;
    }

    addInkPoint(x, y) {
      const st = this.ink.active;
      if (!st) return false;
      const last = st.points[st.points.length - 1];
      const d = M.dist(last.x, last.y, x, y);
      if (d < INK_MIN_STEP) return false;
      const budgetLeft = this.inkRemaining();
      if (budgetLeft <= 0.5) {
        this.endInk();
        return false;
      }
      const step = Math.min(d, budgetLeft);
      const nx = last.x + ((x - last.x) / d) * step;
      const ny = last.y + ((y - last.y) / d) * step;

      // solid static segment
      const angle = Math.atan2(ny - last.y, nx - last.x);
      const len = M.dist(last.x, last.y, nx, ny);
      const body = Bodies.rectangle(
        (last.x + nx) / 2, (last.y + ny) / 2,
        len + INK_W * 0.9, INK_W,
        { isStatic: true, angle, label: 'ink', friction: 0.05, restitution: 0.04,
          chamfer: { radius: INK_W / 2 } }
      );
      Composite.add(this.world, body);
      const seg = { x1: last.x, y1: last.y, x2: nx, y2: ny, body };
      this.ink.segments.push(seg);
      st.points.push({ x: nx, y: ny });
      this.ink.used += len;
      if (step < d) {
        this.endInk();
        return false;
      }
      return true;
    }

    endInk() {
      const st = this.ink.active;
      if (!st) return;
      if (st.points.length > 1) this.ink.strokes.push(st);
      this.ink.active = null;
    }

    clearInk() {
      this.ink.segments.forEach((s) => Composite.remove(this.world, s.body));
      this.ink.segments.length = 0;
      this.ink.used = 0;
      this.ink.strokes.length = 0;
      this.ink.active = null;
    }

    inkPointBlocked(x, y) {
      // don't allow drawing inside scenery / the glass / the tap
      const inRect = (r) =>
        Math.abs(x - r.x) <= r.w / 2 + 4 && Math.abs(y - r.y) <= r.h / 2 + 4;
      for (const p of this.level.platforms) {
        if (Math.abs(p.angle || 0) < 0.01 && inRect(p)) return true;
      }
      for (const c of this.level.crates) {
        if (Math.abs(x - c.x) <= c.size / 2 + 4 && Math.abs(y - c.y) <= c.size / 2 + 4) return true;
      }
      for (const g of this.glasses) {
        if (x > g.x - g.topHalf - 2 && x < g.x + g.topHalf + 2 &&
            y > g.top + 4 && y < g.bottom + 4) return true;
      }
      for (const f of this.faucets) {
        if (Math.abs(x - f.x) < 54 && y > f.y - 96 && y < f.y + 16) return true;
      }
      for (const m of this.level.movers) {
        if (Math.abs(x - m.x - 0) < m.w / 2 + 6 && Math.abs(y - m.y) < m.h / 2 + 6) return true;
      }
      return false;
    }

    // The tap stays closed until the first stroke so the player can plan.
    start() {
      if (this.state === 'idle') {
        this.state = 'pouring';
        this.startDelay = 0.35;
      }
    }

    // ---------------------------------------------------------------- update
    step(dt) {
      this.time += dt;
      const sec = dt / 1000;

      // ---- taps (only once the player has started drawing)
      let flowing = false;
      for (const f of this.faucets) {
        if (this.state !== 'pouring' || f.remaining <= 0) { f.done = f.remaining <= 0; f.flow = 0; continue; }
        if (this.startDelay > 0) { this.startDelay -= sec; continue; }
        f.acc += f.def.rate * sec;
        let spawns = Math.floor(f.acc);
        f.acc -= spawns;
        while (spawns-- > 0 && f.remaining > 0) {
          if (this.water.particles.length >= HG.Water.MAX_PARTICLES) break;
          const sx = f.x + M.rand(-1, 1) * (f.def.spread * 10 + 2);
          const p = this.water.spawn(sx, f.y + 4, M.rand(-0.55, 0.55), 2.2);
          if (p) f.remaining--;
        }
        f.flow = f.remaining > 0 ? 1 : 0;
        if (f.remaining > 0) flowing = true;
      }
      this.pouringNow = flowing;

      // ---- movers (kinematic blocks)
      for (const m of this.movers) {
        const d = m.def;
        const t = (this.time / 1000 / d.period + d.phase) * Math.PI * 2;
        const x = d.x + Math.sin(t) * d.dx;
        const y = d.y + Math.sin(t) * d.dy;
        const prev = m.body.position;
        const vx = (x - prev.x) / Math.max(0.001, sec);
        const vy = (y - prev.y) / Math.max(0.001, sec);
        Body.setVelocity(m.body, { x: vx, y: vy });
        Body.setPosition(m.body, { x, y });
      }

      // ---- water hazards & fans
      this.water.step(dt, this.time);

      // ---- glass fill bookkeeping (water surface height inside each glass)
      let allFull = this.glasses.length > 0;
      const innerH = (g) => g.h - WALL * 2;
      for (const g of this.glasses) {
        const ys = this.water.levelsIn(g);
        g.count = ys.length;
        let surface = g.bottom - WALL;
        if (ys.length >= 2) {
          // ignore the top ~18% of droplets (a droplet that is still falling in)
          const k = Math.min(ys.length - 1, Math.floor(ys.length * 0.18));
          surface = ys[k];
        }
        const bySurface = M.clamp((g.bottom - WALL - surface) / innerH(g), 0, 1);
        const byCount = M.clamp(ys.length / g.capacity, 0, 1.2);
        // a couple of stray droplets must never read as "full"
        const raw = Math.min(bySurface, byCount);
        if (raw > g.fill) g.wobble = Math.min(1, g.wobble + (raw - g.fill) * 0.6);
        g.fill = raw;
        g.surfaceY = surface;
        g.fillSmooth = M.approach(g.fillSmooth, raw, 8, sec);
        const wasSatisfied = g.satisfied;
        g.satisfied = g.fillSmooth >= g.need - 0.03;
        if (g.satisfied && !wasSatisfied) g.glow = 1;
        g.glow = M.approach(g.glow, g.satisfied ? 1 : 0, 4, sec);
        if (g.satisfied) g.doneTimer = (g.doneTimer || 0) + sec;
        else g.doneTimer = Math.max(0, (g.doneTimer || 0) - sec * 0.5);
        g.done = g.doneTimer >= 0.5;
        if (!g.satisfied) allFull = false;
      }
      this.shake = M.approach(this.shake, 0, 6, sec);

      // ---- win / lose timing
      if (this.state !== 'won' && this.state !== 'lost') {
        if (allFull || this.glasses.every((g) => g.done)) {
          this.finish(true);
        }

        const noWaterLeft = this.faucets.every((f) => f.remaining <= 0);
        if (noWaterLeft && !allFull) {
          this.endTimer += sec;
          const anyMoving = this.water.particles.some((p) => {
            const v = p.body.velocity;
            return Math.abs(v.x) + Math.abs(v.y) > 0.35;
          });
          const fewLeft = this.water.particles.length < 3;
          if (fewLeft) this.settleTimer += sec;
          else if (!anyMoving) this.settleTimer += sec;
          else this.settleTimer = 0;
          if (this.settleTimer > 1.1 || this.endTimer > 22) this.finish(false);
        }
      }

      if (this.state === 'won') this.winTimer += sec;

      // evaporation puffs
      for (let i = this.evapPuffs.length - 1; i >= 0; i--) {
        const p = this.evapPuffs[i];
        p.y -= 0.9 * (dt / 16.7);
        p.x += p.vx;
        p.life -= 0.02 * (dt / 16.7);
        if (p.life <= 0) this.evapPuffs.splice(i, 1);
      }
    }

    finish(won) {
      if (this.state === 'won' || this.state === 'lost') return;
      this.state = won ? 'won' : 'lost';
      this.resultTimer = 0;
      if (won) {
        this.glasses.forEach((g) => (g.glow = 1));
        if (this.onWin) this.onWin(this);
      } else if (this.onLose) this.onLose(this);
    }

    onEvaporate(x, y) {
      for (let i = 0; i < 3; i++) {
        this.evapPuffs.push({
          x: x + M.rand(-5, 5), y: y - 4,
          vx: M.rand(-0.4, 0.4), life: 1, r: M.rand(3, 7),
        });
      }
      if (this.evapPuffs.length > 60) this.evapPuffs.splice(0, this.evapPuffs.length - 60);
    }

    onCollide(ev) {
      for (const pair of ev.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        const w = a.label === 'water' ? a : b.label === 'water' ? b : null;
        if (!w) continue;
        const other = w === a ? b : a;
        if (other.label === 'water') continue;
        // little splash when a droplet lands
        if (Math.random() < 0.10) {
          this.water.splash(w.position.x, w.position.y + 4, 1, 1.2);
          if (HG.Sfx) HG.Sfx.plop();
        }
        // fill the glass splash a bit
        if (other.label === 'glasswall') {
          const g = other.glass;
          if (g) g.wobble = Math.min(1, g.wobble + 0.05);
        }
      }
    }

    // --------------------------------------------------------------- physics
    physics(dt) {
      Engine.update(this.engine, dt);
    }

    destroy() {
      if (this._onCollide) Events.off(this.engine, 'collisionStart', this._onCollide);
      this.water.clear();
      Composite.clear(this.world, false);
      Engine.clear(this.engine);
    }
  }

  Scene.WALL = WALL;
  Scene.INK_W = INK_W;
  HG.Scene = Scene;
  HG.Glass = Glass;
})(window);
