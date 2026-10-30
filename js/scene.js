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
  const INK_W = 6;              // ink line thickness (40% of the original 15 px)
  const INK_MIN_STEP = 4;       // simplified point spacing (finer: thin rods need it)
  const PHYS_SUBSTEPS = 4;      // solver passes per rendered frame (see physics())
  const CONTACT_TOL = 1.5;      // px of overlap that counts as "touching"
  // water clings to a wet rod: fraction of the sliding velocity removed per
  // substep of contact. Tuned so a stream leaves the wire where it always did.
  const WATER_TANGENT = 0.005;
  const INK_DENSITY = 0.0018;   // ink is iron wire, not paint: it has real mass
  const MAX_STROKE_PARTS = 90;  // safety cap for a single falling stroke
  const GLASS_INERTIA = 2.0;    // rotational cheat, see the physics audit in README
  const MAX_DROP_SPEED = 16;    // px/frame: 4 px per solver step, under the 6 px rod

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
      this.frozen = true;          // the world only runs once the player draws
      this.freezeTimer = 0;
      this.fell = false;
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
        // deterministic nudge (no Math.random): the same level must play the
        // same way every time, otherwise "won" becomes a coin flip
        const seed = Math.sin((s.x + s.y) * 0.017) * 0.01;
        Body.setAngularVelocity(b, (s.speed || 0) + seed);
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

    // A stroke ends either in mid-air or against something solid. Where the pen
    // was stopped by a surface, the ink was stopped by it too — so the drawn end
    // is notched a hair into that surface. This is what makes the weld honest:
    // the wire's own geometry overlaps the thing it is nailed to, instead of
    // relying on being "near enough".
    pressStrokeEnds(st) {
      const SNAP_REACH = 10;    // px: only ends that were essentially pressed on
      const SINK = 1.2;         // px inside the surface
      const anchors = this.anchorBodies().filter((b) => b.label !== 'ink');
      if (!anchors.length) return;
      const nearest = (x, y) => {
        let best = null;
        for (const b of anchors) {
          const vs = b.vertices;
          for (let i = 0; i < vs.length; i++) {
            const a = vs[i], c = vs[(i + 1) % vs.length];
            const dx = c.x - a.x, dy = c.y - a.y;
            const L2 = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L2));
            const px = a.x + dx * t, py = a.y + dy * t;
            const d = M.dist(px, py, x, y);
            if (!best || d < best.d) best = { d, x: px, y: py, body: b };
          }
        }
        return best;
      };
      const press = (seg, atStart) => {
        const px = atStart ? seg.x1 : seg.x2;
        const py = atStart ? seg.y1 : seg.y2;
        const near = nearest(px, py);
        if (!near || near.d > SNAP_REACH || near.d < 0.01) return;
        const ox = px - near.x, oy = py - near.y;
        const L = Math.hypot(ox, oy) || 1;
        const nx = near.x + (ox / L) * SINK;
        const ny = near.y + (oy / L) * SINK;
        this.reshapeSeg(seg, atStart, nx, ny);
      };
      press(st.segs[0], true);
      if (st.segs.length > 1) press(st.segs[st.segs.length - 1], false);
    }

    // replace one end of a segment's geometry (the collider is rebuilt from it)
    reshapeSeg(seg, atStart, nx, ny) {
      const x1 = atStart ? nx : seg.x1;
      const y1 = atStart ? ny : seg.y1;
      const x2 = atStart ? seg.x2 : nx;
      const y2 = atStart ? seg.y2 : ny;
      seg.x1 = x1; seg.y1 = y1; seg.x2 = x2; seg.y2 = y2;
      const len = M.dist(x1, y1, x2, y2);
      if (len < 0.5) return;
      seg.angle = Math.atan2(y2 - y1, x2 - x1);
      seg.len = len + INK_W * 0.9;
      seg.mx = (x1 + x2) / 2;
      seg.my = (y1 + y2) / 2;
      if (seg.body && seg.body.isProvisional) {
        Composite.remove(this.world, seg.body);
        const body = Bodies.rectangle(seg.mx, seg.my, seg.len, INK_W, {
          isStatic: true, angle: seg.angle, label: 'ink',
          friction: 0.6, restitution: 0.03,
          collisionFilter: { category: HG.CAT_INK, mask: HG.MASK_INK },
          chamfer: { radius: INK_W * 0.44 },
        });
        body.isProvisional = true;
        body.strokeRef = seg.stroke;
        Composite.add(this.world, body);
        seg.body = body;
      }
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

    // A finished stroke is a piece of iron wire: heavy, rigid, and only held up
    // where it is actually hooked onto something. One nail = it swings from that
    // point. Two or more nails = it is locked, like wire bent around two hooks.
    // No nails = it is loose wire and it falls.
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

      // ---- press the ends into whatever they were drawn against
      this.pressStrokeEnds(st);

      // ---- where does the wire actually touch something solid?
      const contacts = this.inkContacts(st);

      // ---- the wire itself: one rigid body, real mass, always dynamic
      st.segs.forEach((seg) => Composite.remove(this.world, seg.body));
      const parts = st.segs.slice(0, MAX_STROKE_PARTS).map((seg) =>
        Bodies.rectangle(seg.mx, seg.my, seg.len, INK_W, {
          angle: seg.angle,
          density: INK_DENSITY,
          chamfer: { radius: INK_W * 0.44 },
        })
      );
      const body = Body.create({
        parts,
        friction: 0.5,
        frictionStatic: 0.7,
        frictionAir: 0.008,
        restitution: 0.02,
        label: 'ink',
        collisionFilter: { category: HG.CAT_INK, mask: HG.MASK_INK },
      });
      body.strokeRef = st;
      // Matter pairs *parts* with water, not the compound: every part needs the
      // same filter, or water would crawl through the segments individually.
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

      // ---- nail it where it touches. A nail is a weld, not a hinge: the wire
      // keeps exactly the shape you drew and holds the load. Wire that touches
      // nothing is only held by gravity, so it drops.
      st.pins = [];
      st.pinSupports = [];
      const seen = new Set();
      for (const c of contacts) {
        if (st.pins.length >= 4) break;
        const key = c.body.id + ':' + Math.round(c.x / 14) + ',' + Math.round(c.y / 14);
        if (seen.has(key)) continue;
        seen.add(key);
        st.pins.push({ x: c.x, y: c.y });
        st.pinSupports.push(c.body);
      }
      // One nail is a nail, not a bracket: the wire hangs from it and rotates
      // about it under its own weight (see solveHinge). Two or more nails means
      // the wire was bent around them, and that really is rigid — so it is
      // welded. No nails, no support: it drops.
      if (st.pins.length >= 2) {
        Body.setStatic(body, true);
      } else if (st.pins.length === 1) {
        const p = st.pins[0];
        const dx = p.x - body.position.x;
        const dy = p.y - body.position.y;
        const c = Math.cos(-body.angle), sn = Math.sin(-body.angle);
        st.hinge = {
          x: p.x, y: p.y,                    // world anchor
          lx: dx * c - dy * sn,              // same point, in the body's frame
          ly: dx * sn + dy * c,
          support: st.pinSupports[0] || null,
        };
      }

      st.anchored = st.pins.length > 0;
      this._anchors = null;      // a new (possibly anchored) stroke exists
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
        // the tap itself is solid; leave a 6 px skirt so a line can be hooked
        // just under the nozzle plate, exactly where the stream comes out
        if (Math.abs(x - f.x) < 48 && y > f.y - 96 && y < f.y + 9) return true;
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
          const sx = f.x + M.rand(-1, 1) * (f.def.spread * 10 + 2);
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

      // ---- movers (kinematic blocks)
      for (const m of this.movers) {
        const d = m.def;
        const t = (this.time / 1000 / d.period + d.phase) * Math.PI * 2;
        const x = d.x + Math.sin(t) * d.dx;
        const y = d.y + Math.sin(t) * d.dy;
        // NOTE: only the position is moved. Giving a static "kinematic" body a
        // velocity makes Matter fire water into orbit on contact.
        Body.setPosition(m.body, { x, y });
      }

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
      for (const p of this.water.particles) {
        const b = p.body;
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp > MAXV) Body.setVelocity(b, { x: (b.velocity.x / sp) * MAXV, y: (b.velocity.y / sp) * MAXV });
      }
      const n = PHYS_SUBSTEPS;
      const h = dt / n;
      this.buildInkGrid();
      for (let i = 0; i < n; i++) {
        for (const p of this.water.particles) {
          p._px = p.body.position.x;
          p._py = p.body.position.y;
        }
        Engine.update(this.engine, h);
        this.resolveWaterInk();
        this.solveHinge();
      }
      this.holdAnchoredInk();
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
        if (Math.abs(b.velocity.x) < EPS && Math.abs(b.velocity.y) < EPS
            && Math.abs(b.angularVelocity) < 0.002) {
          Body.setVelocity(b, { x: 0, y: 0 });
          Body.setAngularVelocity(b, 0);
        }
      }
    }

    // A nailed wire stays nailed while the thing it is nailed to is still
    // there. If that support moves away (a crate slides off, a block is knocked
    // over) the nails have nothing to grip and the wire drops — physics, not a
    // permanent freeze.
    // ------------------------------------------------- water cannot move ink
    // Drawn ink is iron. A droplet weighs a few hundredths of the wire, and a
    // real wire does not shiver when water lands on it — so water is simply not
    // allowed to touch the wire as far as Matter is concerned (see HG.CAT_*).
    // The contact is resolved here instead, and only on the *droplet*: it is
    // pushed back out of the rod and its inward velocity is cancelled. The wire
    // never receives an impulse, in any state — braced, hinged, or falling.
    // ------------------------------------------------- water cannot move ink
    // Drawn ink is iron. A droplet weighs a few hundredths of the wire, and a
    // real wire does not shiver when water lands on it, so water is not in the
    // ink's collision mask at all (see HG.CAT_WATER / HG.CAT_INK). The contact
    // is resolved here instead, and only on the *droplet*: it is pushed back out
    // of the rod and its inward velocity is cancelled. The wire never receives
    // an impulse, so it cannot vibrate — braced, hinged, or falling.
    //
    // Shape maths is done once per frame (buildInkGrid); the per-substep pass
    // (resolveWaterInk) then only walks the cells the droplets are actually in.
    buildInkGrid() {
      const segs = this.inkWorldSegments();
      const CELL = 64;
      const ROD = INK_W / 2;
      const pad = HG.Water.R + ROD + 1;
      const rods = [];
      const grid = new Map();
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        const ex = seg.x2 - seg.x1, ey = seg.y2 - seg.y1;
        const L2 = ex * ex + ey * ey;
        if (L2 < 1e-6) continue;
        const L = Math.sqrt(L2);
        const rod = {
          x1: seg.x1, y1: seg.y1, ex, ey, L2,
          ux: ex / L, uy: ey / L,
          lox: Math.min(seg.x1, seg.x2), hix: Math.max(seg.x1, seg.x2),
          loy: Math.min(seg.y1, seg.y2), hiy: Math.max(seg.y1, seg.y2),
        };
        rods.push(rod);
        bx0 = Math.min(bx0, rod.lox); by0 = Math.min(by0, rod.loy);
        bx1 = Math.max(bx1, rod.hix); by1 = Math.max(by1, rod.hiy);
        const x0 = Math.floor((rod.lox - pad) / CELL), x1 = Math.floor((rod.hix + pad) / CELL);
        const y0 = Math.floor((rod.loy - pad) / CELL), y1 = Math.floor((rod.hiy + pad) / CELL);
        for (let cx = x0; cx <= x1; cx++) {
          for (let cy = y0; cy <= y1; cy++) {
            const k = cx * 4096 + cy;      // numeric key: this runs every substep
            let arr = grid.get(k);
            if (!arr) grid.set(k, (arr = []));
            arr.push(rod);
          }
        }
      }
      this._inkGrid = rods.length
        ? { grid, CELL, rods, bx0: bx0 - pad, by0: by0 - pad, bx1: bx1 + pad, by1: by1 + pad }
        : null;
    }

    resolveWaterInk() {
      const g = this._inkGrid;
      const parts = this.water.particles;
      if (!g || !parts.length) return;
      const ROD = INK_W / 2;
      const REST = 0.02;                      // water barely rebounds off iron
      const TANGENT = Scene.WATER_TANGENT;    // sliding drag of the water film
      const MAXPUSH = 2.5;                    // px per substep: no teleporting
      const CELL = g.CELL, bx0 = g.bx0, by0 = g.by0, bx1 = g.bx1, by1 = g.by1;
      for (let n = 0; n < parts.length; n++) {
        const p = parts[n];
        if (p.dead) continue;
        const b = p.body;
        const r = b.circleRadius || HG.Water.R;
        const reach = r + ROD;
        const px = b.position.x, py = b.position.y;
        if (px < bx0 || px > bx1 || py < by0 || py > by1) continue;   // nowhere near ink
        const bucket = g.grid.get(Math.floor((px - 0.5) / CELL) * 4096 + Math.floor((py - 0.5) / CELL));
        if (!bucket) continue;
        const p0x = p._px === undefined ? px : p._px;
        const p0y = p._py === undefined ? py : p._py;
        for (let k = 0; k < bucket.length; k++) {
          const rod = bucket[k];
          let t = ((px - rod.x1) * rod.ex + (py - rod.y1) * rod.ey) / rod.L2;
          const clamped = t < 0 || t > 1;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = rod.x1 + rod.ex * t, qy = rod.y1 + rod.ey * t;
          const dx = px - qx, dy = py - qy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= reach) continue;

          let nx, ny;
          if (clamped) {
            // past an end: the cap behaves like a circle around that endpoint
            if (d > 1e-4) { nx = dx / d; ny = dy / d; }
            else { nx = -rod.uy; ny = rod.ux; }
          } else {
            // Along the rod, use the side the droplet came from, not the
            // direction it happens to be off-centre in: a droplet landing hard
            // can sit on the centreline for a substep, and a radial normal there
            // is a coin toss that can push it through the wire.
            let side = (p0x - qx) * -rod.uy + (p0y - qy) * rod.ux;
            if (Math.abs(side) < 0.35 && d > 1e-4) side = dx * -rod.uy + dy * rod.ux >= 0 ? 1 : -1;
            const sgn = side >= 0 ? 1 : -1;
            nx = -rod.uy * sgn; ny = rod.ux * sgn;
          }

          const vx = b.velocity.x, vy = b.velocity.y;
          const vn = vx * nx + vy * ny;
          const push = Math.min(reach - d, MAXPUSH);
          if (push < 0.05 && vn >= 0) continue;  // in the film, drifting off: leave it
          this.inkSpills = (this.inkSpills || 0) + 1;   // droplet/wire contacts resolved

          if (push > 0) Body.translate(b, { x: nx * push, y: ny * push });
          let v2x = vx, v2y = vy;
          if (vn < 0) {                          // kill only the inward component
            v2x = vx - vn * (1 + REST) * nx;
            v2y = vy - vn * (1 + REST) * ny;
          }
          // water clings: the film on a wet rod drags, so a droplet does not
          // slingshot down the wire and overshoot the glass it was aimed at.
          const vt = v2x * -ny + v2y * nx;
          if (vt !== 0) {                        // v' = v - TANGENT * (v.t) t
            v2x += TANGENT * vt * ny;
            v2y -= TANGENT * vt * nx;
          }
          if (v2x !== vx || v2y !== vy) Body.setVelocity(b, { x: v2x, y: v2y });
        }
      }
    }

    solveHinge() {
      for (const st of this.ink.strokes) {
        const b = st.body, h = st.hinge;
        if (!b || st.gone || !h || b.isStatic) continue;
        const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
        // nail -> centre of mass, in world space
        const rx = h.lx * cos - h.ly * sin;
        const ry = h.lx * sin + h.ly * cos;

        // A nail has friction. Near its rest angle a heavy wire simply does not
        // creep: without this the projection leaves a hundredth of a pixel of
        // noise every substep, which reads as a shimmer on a dead-still wire.
        const armX = -rx;                 // COM relative to the nail, x
        const arm = Math.hypot(rx, ry) || 1;
        if (Math.abs(armX) < 0.02 * arm && Math.abs(b.angularVelocity) < 0.004) {
          Body.setVelocity(b, { x: 0, y: 0 });
          Body.setAngularVelocity(b, 0);
          continue;
        }

        // positional projection: put the nail point back on its nail
        const px = b.position.x + rx;
        const py = b.position.y + ry;
        Body.translate(b, { x: h.x - px, y: h.y - py });
        // velocity at the nail point (v + w x r) must be zero
        const vx = b.velocity.x - b.angularVelocity * ry;
        const vy = b.velocity.y + b.angularVelocity * rx;
        const r2 = rx * rx + ry * ry;
        const m = b.mass, I = b.inertia || 1;
        const meff = 1 / (1 / m + r2 / I);
        const jx = -meff * vx, jy = -meff * vy;
        Body.setVelocity(b, { x: b.velocity.x + jx / m, y: b.velocity.y + jy / m });
        Body.setAngularVelocity(b, b.angularVelocity + (rx * jy - ry * jx) / I);
        // a little hinge friction so a hanging wire settles instead of
        // swinging forever (air drag alone takes ~20 s)
        Body.setAngularVelocity(b, b.angularVelocity * 0.994);
      }
    }
    holdAnchoredInk() {
      for (const st of this.ink.strokes) {
        const b = st.body;
        if (!b || st.gone || !b.isStatic || !st.pins.length) continue;
        let held = 0;
        for (let i = 0; i < st.pinSupports.length; i++) {
          const sup = st.pinSupports[i];
          const pin = st.pins[i];
          if (!sup || !pin) continue;
          if (sup.isStatic) { held++; continue; }
          const probe = Bodies.circle(pin.x, pin.y, 3, { isStatic: true });
          let hit = null;
          try { hit = Collision.collides(probe, sup); } catch (e) { hit = null; }
          if (hit && hit.collided) held++;
        }
        if (!held) {
          Body.setStatic(b, false);
          st.anchored = false;
          st.pins = [];
          this._anchors = null;
        }
      }
    }

    destroy() {
      if (this._onCollide) Events.off(this.engine, 'collisionStart', this._onCollide);
      this.water.clear();
      Composite.clear(this.world, false);
      Engine.clear(this.engine);
    }
  }

  Scene.WATER_TANGENT = WATER_TANGENT;   // fractional slide drag per contact substep
  Scene.WALL = WALL;
  Scene.INK_W = INK_W;
  Scene.SUBSTEPS = PHYS_SUBSTEPS;
  HG.Scene = Scene;
  HG.Glass = Glass;
})(window);
