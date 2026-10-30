/* ==========================================================================
   scene.js — turns a level definition into a Matter.js world:
   scenery bodies, glasses, taps, hazards, the ink you draw and the water.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const Matter = global.Matter;
  const { Engine, Composite, Bodies, Body, Constraint, Events, Collision } = Matter;
  const M = HG.M;

  const WALL = 7;               // glass wall thickness
  const INK_W = 4;              // ink line thickness: a thin drawn wire
  const INK_MIN_STEP = 4;       // simplified point spacing (finer: thin rods need it)
  const PHYS_SUBSTEPS = 4;      // solver passes per rendered frame (see physics())
  const CONTACT_TOL = 1.5;      // px of overlap that counts as "touching"
  // water clings to a wet rod: fraction of the sliding velocity removed per
  // substep of contact. Tuned so a stream leaves the wire where it always did.
  const WATER_TANGENT = 0.005;
  const INK_DENSITY = 0.020;    // ink is a heavy drawn line: a droplet cannot shake it
  const MAX_STROKE_PARTS = 90;  // safety cap for a single falling stroke
  const GLASS_INERTIA = 2.0;    // rotational cheat, see the physics audit in README
  const MAX_DROP_SPEED = 14;    // px/frame: 3.5 px per solver step, under the 4 px rod

  // ---------------------------------------------------------------- glass ---
  // A glass is a trapezoid cup. Static glasses are just scenery; a *dynamic*
  // glass is one compound rigid body, so it can fall, tip and be propped up by
  // the line you draw — exactly like the real game.
  class Glass {
    constructor(def) {
      this.def = def;
      this.hanging = !!def.hanging;
      // every glass is a real object now; only an explicit `fixed` glass is scenery
      this.dynamic = def.fixed ? false : true;
      this.x = def.x;
      this.y = def.y;
      this.w = def.w;
      this.h = def.h;
      this.need = def.need;
      this.tilt = def.tilt || 0;
      this.wall = this.dynamic ? 10 : WALL;

      this.top = this.y - this.h / 2;
      this.bottom = this.y + this.h / 2;
      this.topHalf = this.w / 2;
      this.botHalf = this.w * 0.36;

      this.parts = [];
      this.body = null;
      this.localCenter = { x: 0, y: 0 };
      this.angle = this.tilt;
      this.cx = this.x;
      this.cy = this.y;
      this._cos = Math.cos(this.tilt);
      this._sin = Math.sin(this.tilt);

      this.count = 0;
      this.fill = 0;
      this.fillSmooth = 0;
      this.satisfied = false;
      this.wobble = 0;
      this.glow = 0;
      this.tipped = 0;
      this.lost = false;

      const W = this.wall;
      const innerTop = 2 * (this.topHalf - W);
      const innerBot = 2 * (this.botHalf - W);
      const innerH = this.h - W * 2;
      const area = ((innerTop + innerBot) / 2) * innerH;
      // droplets squash together, so a "full" glass holds a bit more than the
      // raw area suggests. 1.26 is measured from the simulation itself.
      this.capacity = Math.max(6, Math.round((area * 1.26) / (Math.PI * HG.Water.R * HG.Water.R)));
      this.needCount = Math.max(1, Math.round(this.capacity * this.need));
    }

    // keep the cached world transform in sync with the physics body
    syncXf() {
      if (!this.body) {
        this.angle = this.tilt;
        this.cx = this.x;
        this.cy = this.y;
      } else {
        const b = this.body;
        const a = b.angle;
        const c = Math.cos(a), s = Math.sin(a);
        this.angle = a;
        this.cx = b.position.x + this.localCenter.x * c - this.localCenter.y * s;
        this.cy = b.position.y + this.localCenter.x * s + this.localCenter.y * c;
      }
      this._cos = Math.cos(this.angle);
      this._sin = Math.sin(this.angle);
      return this;
    }

    // world point -> glass local space (glass centre = (this.x, this.y), upright)
    toLocal(px, py) {
      this.syncXf();
      const dx = px - this.cx, dy = py - this.cy;
      return {
        x: this.x + dx * this._cos + dy * this._sin,
        y: this.y - dx * this._sin + dy * this._cos,
      };
    }

    innerHalf(ly) {
      const t = M.clamp((ly - this.top) / this.h, 0, 1);
      return M.lerp(this.topHalf - this.wall, this.botHalf - this.wall, t);
    }

    containsLocal(lx, ly) {
      if (ly < this.top + 3 || ly > this.bottom - 1) return false;
      return Math.abs(lx - this.x) < this.innerHalf(ly) - 1;
    }

    contains(px, py) {
      const l = this.toLocal(px, py);
      return this.containsLocal(l.x, l.y);
    }

    // local y of the dotted fill line
    needY() {
      const innerH = this.h - this.wall * 2;
      return this.bottom - this.wall - innerH * this.need;
    }

    ratio() {
      return this.count / this.capacity;
    }
  }

  // ----------------------------------------------------------------- scene ---
  // Fit the sampled stroke with as few straight bars as the shape allows: a
  // straight line becomes two or three bars, a hook keeps enough bars to keep its
  // hook. tolerance is how far the real stroke may sit from a bar (px).
  const RUN_TOL = 0.9;
  const RUN_MAX = 110;
  function inkRuns(segs) {
    const runs = [];
    if (!segs.length) return runs;
    const head = (g) => ({ x: g.mx - Math.cos(g.angle) * g.len / 2, y: g.my - Math.sin(g.angle) * g.len / 2 });
    const tail = (g) => ({ x: g.mx + Math.cos(g.angle) * g.len / 2, y: g.my + Math.sin(g.angle) * g.len / 2 });
    let i = 0;
    while (i < segs.length) {
      const a = head(segs[i]);
      let j = i;
      let b = tail(segs[i]);
      while (j + 1 < segs.length) {
        const nb = tail(segs[j + 1]);
        const len = Math.hypot(nb.x - a.x, nb.y - a.y);
        if (len > RUN_MAX) break;
        let ok = true;
        for (let k = i + 1; k <= j + 1 && ok; k++) {
          const p = head(segs[k]);
          // perpendicular distance from the candidate bar
          const d = Math.abs((nb.x - a.x) * (p.y - a.y) - (nb.y - a.y) * (p.x - a.x)) / (len || 1);
          if (d > RUN_TOL) ok = false;
        }
        if (!ok) break;
        j++; b = nb;
      }
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len > 0.01) {
        runs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, len,
          angle: Math.atan2(b.y - a.y, b.x - a.x) });
      }
      i = j + 1;
    }
    return runs;
  }

  class Scene {
    constructor(level) {
      this.level = level;
      // Sleeping stays OFF, on purpose. It looks like the fix for a pile that
      // never stops buzzing, but it is not: Matter wakes a whole connected
      // island, so one droplet landing on a sleeping heap wakes all 120 bodies
      // *at once*, the solver corrects their overlap together and the pile
      // erupts — measured, one droplet displaced the heap by a median of 28 px
      // (worst 80 px). That is the "chain reaction" a player sees. The real
      // cure is the contact slop in water.js: let droplets rest slightly into
      // each other and the solver stops fighting, so a pile is still
      // (0.003 px/frame) and an impact stays local (median 0.2 px).
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
      this.frozen = true;          // the world only runs once the player draws
      this.freezeTimer = 0;
      this.fell = false;
      this.onWin = null;
      this.onLose = null;

      this.platforms = [];
      this.crates = [];
      this.spinners = [];
      this.seesaws = [];
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

      // A glass is a loose object, so it needs a ledge to start on. Levels that
      // deliberately leave one dangling set `hanging: true` instead.
      const platforms = lv.platforms.slice();
      this.coasters = [];
      lv.glasses.forEach((g) => {
        if (g.hanging || g.fixed) return;
        const bottom = g.y + g.h / 2;
        const halfW = g.w / 2;
        const already = platforms.concat(lv.crates.map((c) => ({
          x: c.x, y: c.y, w: c.size, h: c.size, angle: c.angle || 0,
        }))).some((p) => {
          const top = p.y - p.h / 2;
          const overlap = Math.min(p.x + p.w / 2, g.x + halfW) - Math.max(p.x - p.w / 2, g.x - halfW);
          return top > bottom - 14 && top < bottom + 34 && overlap > halfW;
        });
        if (already) return;
        const shelf = {
          x: g.x, y: bottom + 7, w: g.w * 1.3, h: 14,
          angle: 0, kind: 'wood', coaster: true,
        };
        // NOTE: never push into lv.platforms — that mutates the level data and
        // every restart would add another phantom ledge
        platforms.push(shelf);
        this.coasters.push(shelf);
      });

      platforms.forEach((p) => {
        if (p.poly) {
          // free-form slab (ramps, wedges, big trapezoids)
          const pts = p.poly.map(([x, y]) => ({ x, y }));
          let sx = 0, sy = 0;
          pts.forEach((v) => { sx += v.x; sy += v.y; });
          const cx = sx / pts.length, cy = sy / pts.length;
          const rel = pts.map((v) => ({ x: v.x - cx, y: v.y - cy }));
          const b = Bodies.fromVertices(cx, cy, [rel], {
            isStatic: true,
            label: 'platform',
            friction: 0.35,
            chamfer: { radius: 2 },
          }, true);
          b.kind = p.kind || 'teal';
          b.isPoly = true;
          Composite.add(this.world, b);
          this.platforms.push({ def: p, body: b, kind: b.kind, poly: b.vertices });
          return;
        }
        const b = mk(p.x, p.y, p.w, p.h, p.angle, p.kind, 'platform');
        this.platforms.push({ def: p, body: b, kind: p.kind });
      });
      lv.crates.forEach((c) => {
        if (c.dynamic) {
          const b = Bodies.rectangle(c.x, c.y, c.size, c.size, {
            angle: c.angle || 0,
            friction: 0.45,
            frictionAir: 0.004,
            restitution: 0.05,
            density: 0.0026,
            label: 'crate',
            chamfer: { radius: 4 },
          });
          b.kind = c.kind || 'wood';
          Composite.add(this.world, b);
          this.crates.push({ def: c, body: b, kind: b.kind });
          return;
        }
        const b = mk(c.x, c.y, c.size, c.size, c.angle || 0, c.kind || 'wood', 'crate');
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
        // A pinned bar hangs still until something hits it. It is scenery, not
        // a machine: no motor, no seeded spin — a bar that drifts on its own is
        // a moving bar, and this game has none.
        Body.setAngularVelocity(b, 0);
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

    }

    buildGlasses() {
      const lv = this.level;
      this.glasses = lv.glasses.map((def) => {
        const g = new Glass(def);
        const cx = g.x, cy = g.y;
        const W = g.wall;

        const topL = { x: cx - g.topHalf, y: g.top };
        const topR = { x: cx + g.topHalf, y: g.top };
        const botL = { x: cx - g.botHalf, y: g.bottom };
        const botR = { x: cx + g.botHalf, y: g.bottom };

        // one chamfered rectangle per wall, bottom and rim lip
        const parts = [];
        const wallAt = (a, b) => {
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.hypot(dx, dy);
          parts.push(Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, W, len, {
            angle: Math.atan2(-dx, dy),
            density: 0.02,        // part-level density: it survives the compound
            chamfer: { radius: 3 },
          }));
        };
        wallAt(topL, botL);
        wallAt(topR, botR);
        const foot = Bodies.rectangle(cx, g.bottom - W / 2, g.botHalf * 2 - 1, W, {
          density: 0.1,           // weighted base = low centre of mass
          chamfer: { radius: 3 },
        });
        parts.push(foot);
        parts.push(Bodies.rectangle(topL.x + 3, g.top + 2, 12, W, { density: 0.02, chamfer: { radius: 3 } }));
        parts.push(Bodies.rectangle(topR.x - 3, g.top + 2, 12, W, { density: 0.02, chamfer: { radius: 3 } }));

        if (g.dynamic) {
          // --- one rigid body: it falls, tips and can rest on drawn ink
          const body = Body.create({
            parts,
            friction: 0.7,
            frictionStatic: 0.9,
            frictionAir: 0.008,
            restitution: 0.02,
            label: 'glassbody',
            sleepThreshold: 40,
          });
          // extra rotational inertia: glasses tip slowly instead of being flicked
          Body.setInertia(body, body.inertia * GLASS_INERTIA);
          body.glass = g;
          body.parts.forEach((pt) => {
            if (pt !== body) { pt.glass = g; pt.label = 'glasswall'; }
          });
          Composite.add(this.world, body);
          g.body = body;
          g.parts = body.parts.slice(1);
          g.localCenter = { x: cx - body.position.x, y: cy - body.position.y };
          g.syncXf();
        } else {
          // --- static scenery (locked in place, cannot be pushed by water)
          parts.forEach((b) => {
            b.isStatic = true;
            b.label = 'glasswall';
            b.glass = g;
            b.friction = 0.2;
            b.restitution = 0.03;
            if (g.tilt) Body.rotate(b, g.tilt, { x: cx, y: cy });
            Composite.add(this.world, b);
            g.parts.push(b);
          });
          g.syncXf();
        }
        return g;
      });
    }

    buildFaucets() {
      // the tap housing is solid: your ink can be pegged to it
      this.level.faucets.forEach((f) => {
        const housing = Bodies.rectangle(f.x, f.y - 47, 62, 62, {
          isStatic: true, label: 'faucet', chamfer: { radius: 8 },
        });
        const plate = Bodies.rectangle(f.x, f.y - 4, 88, 16, {
          isStatic: true, label: 'faucet', chamfer: { radius: 6 },
        });
        Composite.add(this.world, housing);
        Composite.add(this.world, plate);
      });
      this.faucetBodies = Composite.allBodies(this.world).filter((b) => b.label === 'faucet');
      // push-pins: solid furniture you can hook a line onto anywhere in the level
      this.pins = [];
      (this.level.pins || []).forEach((p) => {
        const b = Bodies.circle(p.x, p.y, p.r || 11, {
          isStatic: true, label: 'pin', friction: 0.5,
        });
        Composite.add(this.world, b);
        this.pins.push({ x: p.x, y: p.y, r: p.r || 11, body: b });
      });
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

    // Solid things a wire can actually be hooked onto: scenery, crates, the tap
    // housing and push-pins — plus wire that is already nailed down itself, so
    // lines can be chained. There is no "near enough" padding in this list: the
    // contact test below decides whether the ink really touches it.
    anchorBodies() {
      if (this._anchors) return this._anchors;
      this._anchors = Composite.allBodies(this.world).filter((b) => {
        if (b.label === 'ink') return !!(b.strokeRef && b.strokeRef.anchored);
        if (!b.isStatic) return false;
        return b.label === 'platform' || b.label === 'crate' ||
          b.label === 'faucet' || b.label === 'pin';
      });
      return this._anchors;
    }

    // Real contact test (SAT) between the segments of a stroke and the scenery.
    // A wire only sticks where its own geometry overlaps a solid body: a line
    // that merely passes nearby, or stops a few pixels short, hangs on nothing
    // and therefore falls.
    inkContacts(st) {
      const out = [];
      const anchors = this.anchorBodies();
      for (const seg of st.segs) {
        const sb = seg.body;
        for (const b of anchors) {
          if (b === sb || b.strokeRef === st) continue;
          let hit = null;
          try { hit = Collision.collides(sb, b); } catch (e) { hit = null; }
          if (!hit || !hit.collided) continue;
          let px = seg.mx, py = seg.my;
          if (hit.supports && hit.supports.length) {
            let n = 0; px = 0; py = 0;
            for (const sup of hit.supports) {
              if (!sup) continue;
              px += sup.x; py += sup.y; n++;
            }
            if (n) { px /= n; py /= n; } else { px = seg.mx; py = seg.my; }
          }
          out.push({ body: b, x: px, y: py, seg });
        }
      }
      return out;
    }

    // does a world point touch something solid? (used for hints / diagnostics)
    isAnchorPoint(x, y) {
      const probe = Bodies.circle(x, y, INK_W / 2 + CONTACT_TOL, { isStatic: true });
      for (const b of this.anchorBodies()) {
        let hit = null;
        try { hit = Collision.collides(probe, b); } catch (e) { hit = null; }
        if (hit && hit.collided) return true;
      }
      return false;
    }


    beginInk(x, y) {
      this._anchors = null;
      if (this.inkRemaining() <= 0) return false;
      this.ink.active = { points: [{ x, y }], segs: [], pins: [] };
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

      // drawn as static while the finger is down (no jitter), then re-evaluated
      const angle = Math.atan2(ny - last.y, nx - last.x);
      const len = M.dist(last.x, last.y, nx, ny);
      const body = Bodies.rectangle(
        (last.x + nx) / 2, (last.y + ny) / 2,
        len + INK_W * 0.9, INK_W,
        { isStatic: true, angle, label: 'ink', friction: 0.6, restitution: 0.03,
          collisionFilter: { category: HG.CAT_INK, mask: HG.MASK_INK },
          chamfer: { radius: INK_W * 0.44 } }
      );
      body.isProvisional = true;
      Composite.add(this.world, body);
      body.strokeRef = null;   // set below, once the seg exists
      const seg = {
        x1: last.x, y1: last.y, x2: nx, y2: ny,
        mx: (last.x + nx) / 2, my: (last.y + ny) / 2,
        angle, len: len + INK_W * 0.9,
        body: body, stroke: st, dyn: false,
      };
      body.strokeRef = st;
      st.segs.push(seg);
      this.ink.segments.push(seg);
      st.points.push({ x: nx, y: ny });
      this.ink.used += len;
      if (this.isAnchorPoint(nx, ny) && st.pins.length < 3) {
        st.pins.push({ x: nx, y: ny });
      }
      if (step < d) {
        this.endInk();
        return false;
      }
      return true;
    }

    // A finished stroke is a real object — a short, heavy, stiff line, close to a
    // piece of wire. It is *never* fixed to anything. The moment you lift the
    // pen it becomes a loose body in the world, and the only thing that keeps it
    // up is its own shape resting in, on, or around the scenery. A line drawn in
    // empty air falls out of the level; a line lying on a ledge stays because its
    // weight and friction hold it there; a line whose end curls around a corner
    // stays because it cannot slide off. A running stream leans on it, and if the
    // line is badly placed the water shoves it away — that is the game.
    endInk() {
      const st = this.ink.active;
      if (!st) return false;
      this.ink.active = null;
      if (st.points.length < 2) {
        st.segs.forEach((seg) => Composite.remove(this.world, seg.body));
        this.ink.segments = this.ink.segments.filter((sg) => sg.stroke !== st);
        return false;
      }
      this.ink.strokes.push(st);

      // where does the line actually touch something solid? (diagnostics only —
      // nothing is welded; the audit and the hint system read this)
      const contacts = this.inkContacts(st);

      // ---- the line itself: one rigid, dynamic body with real mass
      st.segs.forEach((seg) => Composite.remove(this.world, seg.body));
      // The pen samples the stroke every few pixels, which is right for drawing
      // and wrong for physics: a body built from ninety short overlapping boxes
      // has ninety seams for the solver to chatter on, and it walks its way off
      // any ledge. So the *collision* shape is the same polyline with the
      // near-collinear stretches merged into a few long bars (the drawn line is
      // still drawn from the original points, so nothing looks different).
      const runs = inkRuns(st.segs);
      const parts = runs.slice(0, MAX_STROKE_PARTS).map((r) =>
        Bodies.rectangle((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, r.len + INK_W * 0.5, INK_W, {
          angle: r.angle,
          density: Scene.INK_DENSITY,
          chamfer: { radius: INK_W * 0.44 },
        })
      );
      const body = Body.create({
        parts,
        friction: 0.7,
        frictionStatic: 0.9,       // a wire lying on wood does not creep
        frictionAir: 0.004,
        restitution: 0.02,
        label: 'ink',
        collisionFilter: { category: HG.CAT_INK, mask: HG.MASK_INK },
      });
      body.strokeRef = st;
      // Matter pairs *parts*, not the compound: every part needs the same filter
      for (const part of body.parts) {
        part.collisionFilter = { category: HG.CAT_INK, mask: HG.MASK_INK, group: 0 };
      }
      Composite.add(this.world, body);
      st.body = body;
      st.segs.forEach((seg) => {
        seg.dyn = true;
        seg.lx = seg.mx - body.position.x;
        seg.ly = seg.my - body.position.y;
        seg.body = body;
      });

      st.pins = [];
      st.pinSupports = [];
      const seen = new Set();
      for (const c of contacts) {
        const key = c.body.id + ':' + Math.round(c.x / 14) + ',' + Math.round(c.y / 14);
        if (seen.has(key)) continue;
        seen.add(key);
        st.pins.push({ x: c.x, y: c.y });
        st.pinSupports.push(c.body);
      }
      st.anchored = st.pins.length > 0;   // "resting on something", not "welded"
      this._anchors = null;
      return true;
    }

    // current world-space endpoints of every ink segment (static or falling)
    inkWorldSegments() {
      const out = this._segCache || (this._segCache = []);
      let n = 0;
      for (const seg of this.ink.segments) {
        let x1, y1, x2, y2;
        if (seg.dyn && seg.stroke && seg.stroke.body && !seg.stroke.gone) {
          const b = seg.stroke.body;
          const c = Math.cos(b.angle), s = Math.sin(b.angle);
          const mx = b.position.x + seg.lx * c - seg.ly * s;
          const my = b.position.y + seg.lx * s + seg.ly * c;
          const a = seg.angle + b.angle;
          const hx = Math.cos(a) * seg.len / 2, hy = Math.sin(a) * seg.len / 2;
          x1 = mx - hx; y1 = my - hy; x2 = mx + hx; y2 = my + hy;
        } else {
          x1 = seg.x1; y1 = seg.y1; x2 = seg.x2; y2 = seg.y2;
        }
        const slot = out[n] || (out[n] = {});
        slot.x1 = x1; slot.y1 = y1; slot.x2 = x2; slot.y2 = y2;
        n++;
      }
      out.length = n;
      return out;
    }

    clearInk() {
      this.ink.segments.forEach((s) => {
        if (s.dyn && s.stroke && s.stroke.body) return;   // handled once below
        Composite.remove(this.world, s.body);
      });
      this.ink.strokes.forEach((st) => { if (st.body) Composite.remove(this.world, st.body); });
      this.ink.segments.length = 0;
      this.ink.used = 0;
      this.ink.strokes.length = 0;
      this.ink.active = null;
      this._anchors = null;
    }

    inkPointBlocked(x, y) {
      // don't allow drawing inside scenery / the glass / the tap
      // The pen stops when the *ink* touches, not when the cursor does: the
      // 2 px sink lets a drawn stroke actually meet the surface (a marker line
      // creeps a hair into the wall it runs into). Without it ink could never
      // reach a surface at all, and a wire could never be nailed to anything.
      const PAD = 2;
      const inRect = (r) =>
        Math.abs(x - r.x) <= r.w / 2 + PAD && Math.abs(y - r.y) <= r.h / 2 + PAD;
      for (const p of this.level.platforms) {
        if (Math.abs(p.angle || 0) < 0.01 && inRect(p)) return true;
      }
      for (const c of this.level.crates) {
        if (Math.abs(x - c.x) <= c.size / 2 + PAD && Math.abs(y - c.y) <= c.size / 2 + PAD) return true;
      }
      for (const g of this.glasses) {
        const l = g.toLocal(x, y);
        if (l.x > g.x - g.topHalf - 2 && l.x < g.x + g.topHalf + 2 &&
            l.y > g.top + 4 && l.y < g.bottom + 4) return true;
      }
      for (const f of this.faucets) {
        // Only the tap *housing* is no-draw. The nozzle plate below it is solid
        // scenery you are meant to hook your line around — that is the whole
        // opening move of the reference game: start at the tap, curl the end
        // over the plate, and the line hangs from it.
        const inHousing = Math.abs(x - f.x) < 33 && y > f.y - 80 && y < f.y - 14;
        if (inHousing) return true;
      }
      return false;
    }

    // The tap stays closed until the first stroke so the player can plan.
    start() {
      if (this.state === 'idle') {
        this.state = 'pouring';
        this.startDelay = 0.3;
      }
    }

    // ---------------------------------------------------------------- update
    step(dt) {
      this.time += dt;
      const sec = dt / 1000;

      // The world waits only for the very first stroke, like the original. After
      // that it keeps running: the tap pours and gravity pulls while you sketch a
      // second line, so a stroke that is not anchored will fall out of the level.
      this.frozen = this.state === 'idle';
      this.glasses.forEach((g) => g.syncXf());

      // ---- taps (only once the player has started drawing)
      let flowing = false;
      for (const f of this.faucets) {
        if (this.state !== 'pouring' || f.remaining <= 0 || this.frozen) {
          f.done = f.remaining <= 0; f.flow = 0; continue;
        }
        if (this.startDelay > 0) { this.startDelay -= sec; continue; }
        f.acc += f.def.rate * sec;
        let spawns = Math.floor(f.acc);
        f.acc -= spawns;
        while (spawns-- > 0 && f.remaining > 0) {
          if (this.water.particles.length >= HG.Water.MAX_PARTICLES) break;
          const sx = f.x + M.rand(-1, 1) * (f.def.spread * 4 + 1);
          // spawn clear of the tap plate collider (its bottom is at f.y + 4): a
          // droplet born inside a static body gets squeezed out sideways
          const sy = f.y + 4 + HG.Water.R + 1.5;
          const p = this.water.spawn(sx, sy, M.rand(-0.55, 0.55), 2.2);
          if (p) f.remaining--;
        }
        f.flow = f.remaining > 0 ? 1 : 0;
        if (f.remaining > 0) flowing = true;
      }
      this.pouringNow = flowing;

      // ---- a swinging wire is a joint chain: keep it inside sane limits
      for (const st of this.ink.strokes) {
        const b = st.body;
        if (!b || st.gone) continue;
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp > 24) Body.setVelocity(b, { x: (b.velocity.x / sp) * 24, y: (b.velocity.y / sp) * 24 });
        if (Math.abs(b.angularVelocity) > 8) Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 8);
      }

      // ---- keep knocked-over glasses from exploding
      for (const g of this.glasses) {
        if (!g.dynamic || !g.body) continue;
        const b = g.body;
        if (Math.abs(b.angularVelocity) > 9) Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 9);
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp > 26) Body.setVelocity(b, { x: (b.velocity.x / sp) * 26, y: (b.velocity.y / sp) * 26 });
      }

      // ---- water hazards & fans
      this.water.step(dt, this.time);

      // ---- glass fill bookkeeping (water surface height inside each glass)
      let allFull = this.glasses.length > 0;
      const innerH = (g) => g.h - g.wall * 2;
      for (const g of this.glasses) {
        const ys = this.water.levelsIn(g);
        g.count = ys.length;
        let surface = g.bottom - g.wall;
        if (ys.length >= 2) {
          // ignore the top ~18% of droplets (a droplet that is still falling in)
          const k = Math.min(ys.length - 1, Math.floor(ys.length * 0.18));
          surface = ys[k];
        }
        const bySurface = M.clamp((g.bottom - g.wall - surface) / innerH(g), 0, 1);
        const byCount = M.clamp(ys.length / g.capacity, 0, 1.2);
        // a couple of stray droplets must never read as "full"
        const raw = Math.min(bySurface, byCount);
        if (raw > g.fill) g.wobble = Math.min(1, g.wobble + (raw - g.fill) * 0.6);
        g.fill = raw;
        g.surfaceY = surface;
        g.fillSmooth = M.approach(g.fillSmooth, raw, 8, sec);
        const wasSatisfied = g.satisfied;
        g.satisfied = g.fill >= g.need;
        if (g.satisfied && !wasSatisfied) g.glow = 1;
        g.glow = M.approach(g.glow, g.satisfied ? 1 : 0, 4, sec);
        if (g.satisfied) g.doneTimer = (g.doneTimer || 0) + sec;
        else g.doneTimer = Math.max(0, (g.doneTimer || 0) - sec * 0.5);
        g.done = g.doneTimer >= 0.5;
        if (!g.satisfied) allFull = false;

        // a dynamic glass can be knocked over or dropped off the level
        if (g.dynamic && g.body) {
          if (g.cy > HG.H + 110 || g.cx < -220 || g.cx > HG.W + 220) g.lost = true;
          if (Math.abs(g.angle) > 1.25) g.tipped += sec;
          else g.tipped = Math.max(0, g.tipped - sec * 1.5);
          if (g.tipped > 1.2) g.lost = true;
          if (g.lost) this.fell = true;
        }
      }
      this.shake = M.approach(this.shake, 0, 6, sec);

      // a stroke that lost its anchor has fallen out of the level — forget it
      for (const st of this.ink.strokes) {
        if (st.gone || !st.body) continue;
        if (st.body.position.y > HG.H + 420) {
          Composite.remove(this.world, st.body);
          st.gone = true;
          st.body = null;
          this.ink.segments = this.ink.segments.filter((sg) => sg.stroke !== st);
          this._segCache = null;
        }
      }

      // ---- win / lose timing
      if (this.state !== 'won' && this.state !== 'lost') {
        if (this.fell) {
          this.glasses.forEach((g) => { if (g.lost) g.lostTimer = (g.lostTimer || 0) + sec; });
          if (this.glasses.some((g) => (g.lostTimer || 0) > 0.6)) this.finish(false);
        } else if (allFull || this.glasses.every((g) => g.done)) {
          this.finish(true);
        }

        const noWaterLeft = this.faucets.every((f) => f.remaining <= 0);
        if (!this.frozen && !this.fell && noWaterLeft && !allFull) {
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
    // The wire is a thin rod now (8 px) and a droplet in free fall covers about
    // 11 px per frame at terminal speed — more than half a rod. Stepping the
    // solver once per frame let a fast droplet straddle the rod in a single
    // step: it would sink in, get shoved out, sink again. On screen that reads
    // exactly like the wire shivering when water lands on it. Three substeps cut
    // the per-step travel to ~3.8 px, well under the rod, so contact is resolved
    // on the surface and stays put.
    physics(dt) {
      if (this.frozen) return;
      // Speed ceiling for the fluid. A droplet is a 14 px ball and the wire is an
      // 8 px rod: above this it would cross the rod inside one solver step and
      // pop through (or, worse, alternately inside and outside it — a shiver).
      const MAXV = MAX_DROP_SPEED;
      const clampDrops = () => {
        for (const p of this.water.particles) {
          const b = p.body;
          const sp = Math.hypot(b.velocity.x, b.velocity.y);
          if (sp > MAXV) Body.setVelocity(b, { x: (b.velocity.x / sp) * MAXV, y: (b.velocity.y / sp) * MAXV });
        }
      };
      clampDrops();
      const n = PHYS_SUBSTEPS;
      const h = dt / n;
      // Water and ink are both ordinary bodies now: the engine resolves their
      // contacts in both directions, so a stream genuinely leans on the line.
      for (let i = 0; i < n; i++) {
        Engine.update(this.engine, h);
        // a blower or a spinner can add velocity *inside* the frame, so the
        // ceiling has to be re-applied per substep, not once per frame
        clampDrops();
      }
      this.calmBodies();
    }

    // Numerical dust: the solver leaves a few hundredths of a pixel per step of
    // residual motion in a stack that has already come to rest. Nothing in the
    // game wants that — it is the "buzzing" look on pooled water — so anything
    // below the visible threshold is snapped to a dead stop. Bodies that are
    // genuinely moving are untouched.
    calmBodies() {
      const EPS = 0.035;
      for (const p of this.water.particles) {
        const b = p.body;
        if (!b || b.isSleeping) continue;
        if (Math.abs(b.velocity.x) < EPS && Math.abs(b.velocity.y) < EPS) {
          Body.setVelocity(b, { x: 0, y: 0 });
          b.angularVelocity = 0;
        }
      }
      for (const st of this.ink.strokes) {
        const b = st.body;
        if (!b || st.gone || b.isStatic) continue;
        if (Math.abs(b.velocity.x) >= EPS || Math.abs(b.velocity.y) >= EPS) continue;
        if (Math.abs(b.angularVelocity) >= 0.002) continue;
        if (!this.inkIsResting(b)) continue;   // a sliding line keeps its motion
        Body.setVelocity(b, { x: 0, y: 0 });
        Body.setAngularVelocity(b, 0);
      }
    }

    // Is this line currently leaning on the world? Only then is sub-pixel
    // residue "noise" rather than a real slow slide.
    inkIsResting(b) {
      const pairs = this.engine.pairs.list;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (!pair || !pair.isActive) continue;
        const a = pair.bodyA, bb = pair.bodyB;
        if (a !== b && bb !== b) continue;
        const other = a === b ? bb : a;
        if (other && other.label !== 'water') return true;
      }
      return false;
    }

    destroy() {
      if (this._onCollide) Events.off(this.engine, 'collisionStart', this._onCollide);
      this.water.clear();
      Composite.clear(this.world, false);
      Engine.clear(this.engine);
    }
  }

  Scene.INK_DENSITY = INK_DENSITY;   // tunable: read at endInk()
  Scene.WALL = WALL;
  Scene.INK_W = INK_W;
  Scene.SUBSTEPS = PHYS_SUBSTEPS;
  HG.Scene = Scene;
  HG.Glass = Glass;
})(window);
