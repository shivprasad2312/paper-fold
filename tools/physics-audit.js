/* ==========================================================================
   tools/physics-audit.js — inspects the *running* simulation instead of the
   intent behind it: masses, colliders, resting contact, tunnelling margins.
   Every line is a measurement, not an opinion.

   node tools/physics-audit.js        (exit code 1 if a check fails)
   ========================================================================== */
'use strict';
const { boot, play, poly, STEP } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const HG = boot();
const Matter = global.Matter;
const INK_W = HG.Scene.INK_W;

const out = [];
const fails = [];
const say = (s) => out.push(s);
const check = (ok, label, detail) => {
  if (!ok) fails.push(label);
  say((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '   [' + detail + ']' : ''));
};

const fresh = (id) => new HG.Scene(HG.levelById(id));
const drawAll = (scene, strokes) => {
  for (const st of strokes) {
    const pts = poly(st);
    if (pts.length < 2) continue;
    scene.beginInk(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) scene.addInkPoint(pts[i].x, pts[i].y);
    scene.endInk();
  }
};

// ---------------------------------------------------------------- 1. world
{
  const sc = fresh(1);
  const g = sc.engine.gravity;
  const accel = g.y * g.scale * 1000;
  say('## 1. World');
  check(Math.abs(accel - 1.4) < 0.05, 'gravity is a single global acceleration',
    accel.toFixed(2) + ' px/step^2 x1e3, scale ' + g.scale);
  check(sc.engine.positionIterations >= 6 && sc.engine.velocityIterations >= 4,
    'solver iterations high enough for stacked droplets',
    sc.engine.positionIterations + '/' + sc.engine.velocityIterations);
  sc.destroy();
}

// --------------------------------------------------------------- 2. masses
{
  const sc = fresh(1);
  drawAll(sc, [[[400, 300], [560, 300]]]);
  const stroke = sc.ink.strokes[0];
  const drop = sc.water.spawn(300, 200, 0, 0);
  const glass = sc.glasses[0];
  const fullWater = glass.capacity * drop.body.mass;
  say('## 2. Mass inventory (Matter mass units)');
  say('     glass ' + glass.body.mass.toFixed(1) +
      ' | droplet ' + drop.body.mass.toFixed(3) +
      ' | 90px ink stroke ' + (stroke.body ? stroke.body.mass.toFixed(2) : 'n/a') +
      ' | a full glass of water ' + fullWater.toFixed(1));
  check(glass.body.mass / drop.body.mass > 100, 'a single droplet cannot shove a glass',
    (glass.body.mass / drop.body.mass).toFixed(0) + ':1');
  check(fullWater / glass.body.mass < 0.25, 'even a full glass of water stays under 25% of the cup',
    (fullWater / glass.body.mass * 100).toFixed(1) + '%');
  check(glass.dynamic && !!glass.body && glass.body.parts.length === 6,
    'every glass is one compound rigid body (heavy base, 5 colliders)',
    glass.body.parts.length - 1 + ' parts, mass ' + glass.body.mass.toFixed(0));
  sc.destroy();
}

// ------------------------------------------------------- 3. resting contact
{
  const sc = fresh(1);
  const glass = sc.glasses[0];
  const x0 = glass.cx, y0 = glass.cy;
  sc.startDelay = 1e9; sc.state = 'pouring';       // "pouring" but no droplets
  for (let i = 0; i < 60 * 6; i++) { sc.step(STEP); sc.physics(STEP); }
  const drift = Math.hypot(glass.cx - x0, glass.cy - y0);
  say('## 3. Resting contact');
  check(drift < 2, 'a supported glass rests without jitter or sinking',
    drift.toFixed(2) + ' px drift in 6 s, angle ' + glass.angle.toFixed(4));
  sc.destroy();
}

// ------------------------------------------------- 3b. settled contact is still
// A line lying on scenery, with the tap shut, must be *perfectly* motionless.
// Anything left moving is what a player reports as "the line is vibrating".
{
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.glasses = [{ x: 150, y: 640, w: 60, h: 60, need: 0.99, hanging: true }];
  lv.faucet = { x: 330, y: 190, rate: 0, total: 0 };
  lv.faucets = [lv.faucet];
  lv.platforms = [{ x: 640, y: 420, w: 460, h: 20, kind: 'wood', angle: 0 }];
  lv.crates = []; lv.pins = [];
  const sc = new HG.Scene(lv);
  drawAll(sc, [[[430, 405], [850, 405]]]);      // lying flat along the plank
  const wire = sc.ink.strokes[0];
  sc.start();
  for (let i = 0; i < 60; i++) { sc.step(STEP); sc.physics(STEP); }
  const shape0 = sc.inkWorldSegments().map((v) => [v.x1, v.y1, v.x2, v.y2]);
  let worstStep = 0, prev = shape0.map((v) => v.slice());
  for (let i = 0; i < 60 * 5; i++) {
    sc.step(STEP); sc.physics(STEP);
    const g = sc.inkWorldSegments();
    for (let k = 0; k < g.length; k++) {
      worstStep = Math.max(worstStep, Math.hypot(g[k].x1 - prev[k][0], g[k].y1 - prev[k][1]));
    }
    prev = g.map((v) => [v.x1, v.y1, v.x2, v.y2]);
  }
  const shapeAfter = sc.inkWorldSegments().map((v) => [v.x1, v.y1, v.x2, v.y2]);
  let creep = 0;
  if (shapeAfter.length !== shape0.length) creep = Infinity;
  else for (let k = 0; k < shape0.length; k++) {
    for (let j = 0; j < 4; j++) creep = Math.max(creep, Math.abs(shapeAfter[k][j] - shape0[k][j]));
  }
  say('## 3b. Settled contact is motionless');
  check(!wire.body.isStatic, 'a line that rests on scenery is never welded down',
    'static ' + wire.body.isStatic + ', ' + (wire.pins.length || 0) + ' contact(s)');
  check(creep < 0.01, 'and it does not creep: identical geometry over 5 s',
    'max vertex drift ' + (creep === Infinity ? 'wire removed' : creep.toFixed(4) + ' px'));
  check(worstStep < 0.01, 'no frame-to-frame motion at rest (nothing to call a vibration)',
    'worst ' + worstStep.toFixed(4) + ' px per frame over 300 frames');
  sc.destroy();
}

// ------------------------------------ 3c. only real contact can hold a line up
// The rule the whole game now rests on: a drawn line is a loose body. It stays
// where you put it only while its own shape is carried by scenery, and it tips
// off or falls when it is not. These are the two failure modes a player sees.
{
  // (a) nothing under it -> it falls out of the level
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.glasses = [{ x: 150, y: 640, w: 60, h: 60, need: 0.99, hanging: true }];
  lv.faucet = { x: 330, y: 190, rate: 0, total: 0 };
  lv.faucets = [lv.faucet];
  lv.platforms = []; lv.crates = []; lv.pins = [];
  const sc = new HG.Scene(lv);
  drawAll(sc, [[[330, 250], [700, 330]]]);
  const st = sc.ink.strokes[0];
  const y0 = st.body.position.y;
  sc.start();
  for (let i = 0; i < 90; i++) { sc.step(STEP); sc.physics(STEP); }
  say('## 3c. Only real contact holds a line up');
  check(!st.body || st.body.position.y > y0 + 40, 'a line drawn in empty air falls away',
    st.body ? 'fell ' + (st.body.position.y - y0).toFixed(0) + ' px' : 'culled below the level');
  sc.destroy();
}
{
  // (b) resting on ONE narrow ledge, the line tips off it
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.glasses = [{ x: 120, y: 660, w: 60, h: 60, need: 0.99, hanging: true }];
  lv.faucet = { x: 330, y: 190, rate: 0, total: 0 };
  lv.faucets = [lv.faucet];
  lv.platforms = [{ x: 620, y: 420, w: 80, h: 16, kind: 'wood', angle: 0 }];
  lv.crates = []; lv.pins = [];
  const sc = new HG.Scene(lv);
  drawAll(sc, [[[480, 300], [660, 408]]]);      // one end on the ledge, the rest cantilevered
  const st = sc.ink.strokes[0];
  sc.start();
  for (let i = 0; i < 120; i++) { sc.step(STEP); sc.physics(STEP); }
  check(!st.body || st.body.position.y > 460, 'a long overhang on one small ledge tips off it',
    st.body ? 'body at y ' + st.body.position.y.toFixed(0) + ', angle ' + st.body.angle.toFixed(2) : 'culled');
  sc.destroy();
}
{
  // (c) resting across TWO supports, it holds - and it is still a loose body
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.glasses = [{ x: 120, y: 660, w: 60, h: 60, need: 0.99, hanging: true }];
  lv.faucet = { x: 330, y: 190, rate: 0, total: 0 };
  lv.faucets = [lv.faucet];
  lv.platforms = [
    { x: 420, y: 332, w: 80, h: 14, kind: 'wood', angle: 0 },
    { x: 760, y: 392, w: 80, h: 14, kind: 'wood', angle: 0 },
  ];
  lv.crates = []; lv.pins = [];
  const sc = new HG.Scene(lv);
  drawAll(sc, [[[380, 320], [800, 385]]]);
  const st = sc.ink.strokes[0];
  sc.start();
  for (let i = 0; i < 60; i++) { sc.step(STEP); sc.physics(STEP); }
  const y1 = st.body.position.y, a1 = st.body.angle;
  for (let i = 0; i < 120; i++) { sc.step(STEP); sc.physics(STEP); }
  const drift = st.body ? Math.hypot(st.body.position.x - 590, st.body.position.y - y1) : Infinity;
  check(!st.body.isStatic && Math.abs(st.body.angle - a1) < 0.02, 'a line lying across two supports stays put',
    'angle ' + (st.body.angle * 180 / Math.PI).toFixed(2) + '°, drift ' + drift.toFixed(2) + ' px, static ' + st.body.isStatic);
  sc.destroy();
}

// ---------------------------------------------- 3d. water pushes the line
// The other half of the rule: a stream is allowed to lean on the line. This is
// the mechanic the reference game is built on — a badly placed ramp gets shoved
// off its rests — and it must happen without the line buzzing frame to frame.
{
  const build = (water, stroke, plank) => {
    const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
    lv.glasses = [{ x: 150, y: 640, w: 60, h: 60, need: 0.99, hanging: true }];
    lv.faucet = { x: 520, y: 190, rate: 70, total: water ? 900 : 0, spread: 0.55 };
    lv.faucets = [lv.faucet];
    lv.platforms = plank ? [
      { x: 420, y: 332, w: 80, h: 14, kind: 'wood', angle: 0 },
      { x: 760, y: 392, w: 80, h: 14, kind: 'wood', angle: 0 },
    ] : [];
    lv.crates = []; lv.pins = [];
    const sc = new HG.Scene(lv);
    drawAll(sc, [stroke]);
    sc.start();
    return sc;
  };
  const geo = (sc) => sc.inkWorldSegments().map((s) => [s.x1, s.y1, s.x2, s.y2]);
  const run = (water, stroke, plank, frames) => {
    const sc = build(water, stroke, plank);
    for (let i = 0; i < 120; i++) { sc.step(STEP); sc.physics(STEP); }  // settle onto the rests
    const g0 = geo(sc).map((v) => v.slice());
    let prev = geo(sc), worstStep = 0, drift = 0, moving = 0;
    const drops0 = sc.water.particles.length;
    for (let i = 0; i < frames; i++) {
      sc.step(STEP); sc.physics(STEP);
      const g = geo(sc);
      if (!g.length) { sc.destroy(); return { fell: true, worstStep: Infinity, drift: Infinity, moving: frames }; }
      let step = 0;
      for (let k = 0; k < Math.min(g.length, prev.length); k++) {
        step = Math.max(step, Math.hypot(g[k][0] - prev[k][0], g[k][1] - prev[k][1]));
      }
      worstStep = Math.max(worstStep, step); if (step > 0.05) moving++;
      for (let k = 0; k < Math.min(g.length, g0.length); k++) {
        drift = Math.max(drift, Math.hypot(g[k][0] - g0[k][0], g[k][1] - g0[k][1]));
      }
      prev = g;
    }
    const drops = sc.water.particles.length;
    sc.destroy();
    return { fell: false, worstStep, drift, moving, drops: Math.max(drops, drops0) };
  };
  const F = 180;
  const line = [[380, 318], [800, 392]];
  say('## 3d. Water pushes the line (and does not make it buzz)');
  const dry = run(false, line, true, F);
  const wet = run(true, line, true, F);
  check(!dry.fell && dry.worstStep < 0.02, 'a line lying across two rests is dead still with the tap shut',
    'worst frame-to-frame move ' + dry.worstStep.toFixed(3) + ' px');
  check(!wet.fell, 'and the stream does not knock it out of the level on its own');
  check(wet.drift > 0.2, 'a running stream really does lean on the line and move it',
    'line drifted ' + wet.drift.toFixed(2) + ' px over 3 s of water');
  check(wet.worstStep < 0.5 && wet.moving < F * 0.25,
    'but the push is smooth: no frame-to-frame rattle',
    'worst step ' + wet.worstStep.toFixed(2) + ' px, moving in ' + wet.moving + '/' + F + ' frames');
  // and water and ink must actually be colliding bodies, not a special case
  {
    const sc = build(true, line, true);
    for (let i = 0; i < 60; i++) { sc.step(STEP); sc.physics(STEP); }
    const st = sc.ink.strokes[0];
    const parts = new Set(st.body.parts);
    let pairs = 0;
    for (const q of sc.engine.pairs.list) {
      if (!q || !q.isActive) continue;
      const a = parts.has(q.bodyA), b = parts.has(q.bodyB);
      if (a === b) continue;
      const other = a ? q.bodyB : q.bodyA;
      if (other.label === 'water') pairs++;
    }
    check(pairs > 0, 'droplets are in real contact with the drawn line', pairs + ' active ink/water pairs');
    check(sc.water.particles.length && !st.body.isStatic, 'the line is an ordinary dynamic body',
      'static ' + st.body.isStatic + ', mass ' + st.body.mass.toFixed(1) + ', droplets ' + sc.water.particles.length);
    sc.destroy();
  }
}

// ------------------------------------- 3e. the stream is water, not a spray
// The reported symptom: droplets flying about, "like fission". Three numbers
// separate a stream from a shower — how many droplets exist at once (a heap
// has nowhere to go and jostles), how fast the whole population is moving, and
// whether the tap is delivering more water than the glass can take.
{
  const run = (id, strokes) => {
    const lv = JSON.parse(JSON.stringify(HG.levelById(id)));
    const sc = new HG.Scene(lv);
    drawAll(sc, strokes.map((pl) => poly(pl)));
    const need = sc.glasses.reduce((a, g) => a + g.needCount, 0);
    const total = lv.faucets.reduce((a, f) => a + f.total, 0);
    sc.start();
    let peak = 0, fast = 0, samples = 0, up = 0;
    for (let i = 0; i < 60 * 14; i++) {
      sc.step(STEP); sc.physics(STEP);
      let n = 0;
      for (const p of sc.water.particles) {
        if (p.dead) continue;
        n++;
        const v = p.body.velocity;
        if (Math.abs(v.x) > 4) fast++;      // sideways = spray; falling is allowed
        if (v.y < -1.5) up++;
        samples++;
      }
      if (n > peak) peak = n;
    }
    sc.destroy();
    return { need, total, peak, fast: fast / samples, up: up / samples, samples };
  };
  say('## 3e. The stream behaves like water');
  const a = run(4, SOLUTIONS[4] || []);
  check(a.total <= a.need * 3.2, 'a level does not deliver a flood: the tap is sized to the glass',
    'tap ' + a.total + ' droplets for a glass that needs ' + a.need + ' (' + (a.total / a.need).toFixed(1) + 'x)');
  check(a.peak <= 90, 'the water column stays a stream, not a standing heap',
    'peak ' + a.peak + ' droplets alive at once');
  check(a.fast < 0.10, 'the stream falls, it does not spray sideways',
    (a.fast * 100).toFixed(1) + '% of droplet-frames moving more than 4 px/frame sideways');
  check(a.up < 0.02, 'droplets are not being flung back up out of the liquid',
    (a.up * 100).toFixed(1) + '% of droplet-frames moving upward');
}

// ------------------------------------------------------------ 4. tap spawn
{
  const sc = fresh(1);
  sc.startDelay = 0; sc.state = 'pouring';
  let first = null;
  for (let i = 0; i < 6 && !first; i++) {
    sc.step(STEP);
    if (sc.water.particles.length) first = sc.water.particles[0].body;
    sc.physics(STEP);
  }
  const plate = sc.faucetBodies[1];
  const overlap = plate.bounds.max.y - (first.position.y - first.circleRadius);
  say('## 4. Emitter');
  check(overlap <= 0.5, 'droplets are born outside the tap collider',
    'plate bottom y ' + plate.bounds.max.y + ', droplet top y ' +
    (first.position.y - first.circleRadius).toFixed(1) + ' (overlap ' + overlap.toFixed(1) + 'px)');
  sc.destroy();
}

// ------------------------------------------------------------- 5. tunnelling
{
  let maxV = 0;
  for (const id of [5, 15, 21, 27]) {
    const sc = fresh(id);
    drawAll(sc, SOLUTIONS[id] || []);
    sc.start();
    for (let i = 0; i < 60 * 8; i++) {
      sc.step(STEP); sc.physics(STEP);
      for (const p of sc.water.particles) {
        const v = Math.hypot(p.body.velocity.x, p.body.velocity.y);
        if (v > maxV) maxV = v;
      }
      if (sc.state === 'won' || sc.state === 'lost') break;
    }
    sc.destroy();
  }
  // The solver runs SUBSTEPS passes per rendered frame, so what matters is the
  // distance a droplet covers in one *solver* step, measured against the rod it
  // has to land on. Above the rod thickness the contact is resolved mid-air on
  // one step and mid-rod on the next — the flicker that reads as a shivering
  // wire. Above rod + droplet diameter it tunnels outright.
  const sub = HG.Scene.SUBSTEPS;
  const perStep = maxV / sub;
  const contactSafe = INK_W;
  const tunnelSafe = INK_W + 2 * HG.Water.R;
  say('## 5. Continuous collision');
  check(perStep < contactSafe, 'a droplet moves less than a rod-thickness per solver step',
    'fastest ' + perStep.toFixed(1) + ' px/step (' + maxV.toFixed(1) + ' px/frame / ' + sub +
    ' substeps) vs ' + contactSafe + ' px rod');
  check(maxV < tunnelSafe, 'no droplet is fast enough to tunnel through a drawn line',
    'fastest ' + maxV.toFixed(1) + ' px/frame vs ' + tunnelSafe + ' px of rod + droplet');
}

// ------------------------------------------------------- 6. ink obeys gravity
{
  const sc = fresh(1);
  drawAll(sc, [[[400, 300], [560, 300]]]);           // touches nothing
  const st = sc.ink.strokes[0];
  const y0 = st.body.position.y;
  sc.start();
  for (let i = 0; i < 60; i++) { sc.step(STEP); sc.physics(STEP); }
  const fell = !st.body || st.body.position.y > y0 + 30;
  say('## 6. Ink');
  check(st.anchored === false, 'a stroke that touches nothing has no support');
  check(fell, 'an unanchored stroke falls under gravity',
    'y ' + y0.toFixed(0) + ' -> ' + (st.body ? st.body.position.y.toFixed(0) : 'culled'));
  sc.destroy();
}

{
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.glasses = [{ x: 150, y: 640, w: 60, h: 60, need: 0.99, hanging: true }];
  lv.faucet = { x: 330, y: 190, rate: 0, total: 0 };
  lv.faucets = [lv.faucet];
  lv.platforms = [{ x: 640, y: 420, w: 460, h: 20, kind: 'wood', angle: 0 }];
  lv.crates = []; lv.pins = [];
  const sc = new HG.Scene(lv);
  drawAll(sc, [[[430, 402], [850, 402]]]);           // just above the plank top
  const st = sc.ink.strokes[0];
  const y0 = st.body.position.y;
  sc.start();
  for (let i = 0; i < 90; i++) { sc.step(STEP); sc.physics(STEP); }
  check(!!st.body && st.body.position.y < y0 + 14, 'a stroke laid on scenery stays on it',
    'y ' + y0.toFixed(0) + ' -> ' + (st.body ? st.body.position.y.toFixed(0) : 'culled'));
  check(!!st.body && !st.body.isStatic, 'but touching scenery never freezes the line — it stays a loose body',
    st.segs.length + ' segments, ' + st.pins.length + ' reported contact(s), static ' + (st.body && st.body.isStatic));
  sc.destroy();
}

// ------------------------------------------------ 7. ink collides with glass
{
  const sc = fresh(1);
  const glass = sc.glasses[0];
  // a stroke that is only *partly* over the rim: it must land on the glass, not
  // fall through it, and it must stay on the rim
  drawAll(sc, [[[glass.x - 75, 260], [glass.x + 75, 260]]]);   // wider than the mouth
  const st = sc.ink.strokes[0];
  sc.start();
  for (let i = 0; i < 150; i++) { sc.step(STEP); sc.physics(STEP); }
  const restY = st.body ? st.body.position.y : null;
  say('## 7. Rigid-body collisions');
  check(restY !== null && restY < glass.top + 4,
    'a falling stroke lands on the glass rim instead of passing through it',
    'stroke rest y ' + (restY === null ? 'culled' : restY.toFixed(0)) + ', rim y ' + glass.top.toFixed(0));
  sc.destroy();
}

// ------------------------------------------- 7b. a line is never pinned
{
  // (a) the exact drawing that used to be "nailed to the tap": from under the
  //     nozzle down to the glass. Nothing holds it now, so it must fall.
  //     Tested in an empty room: the level's own brackets must not be able to
  //     rescue the stroke, or the check would silently pass on scenery.
  const bare = {
    id: 998, name: 'bare', ink: 900,
    faucets: [{ x: 400, y: 190, rate: 26, total: 60 }],
    glasses: [{ x: 700, y: 372, w: 108, h: 118, need: 0.5 }],
    platforms: [], crates: [], spinners: [], seesaws: [], hots: [], fans: [], pins: [],
  };
  const sc = new HG.Scene(JSON.parse(JSON.stringify(bare)));
  const pts = poly([[400, 200], [400, 300], [700, 372]]);
  sc.beginInk(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) sc.addInkPoint(pts[i].x, pts[i].y);
  sc.endInk();
  const held = sc.ink.strokes[0];
  const p0 = { x: held.body.position.x, y: held.body.position.y };
  sc.start();
  for (let i = 0; i < 120; i++) { sc.step(STEP); sc.physics(STEP); }
  check(!held.body || Math.hypot(held.body.position.x - p0.x, held.body.position.y - p0.y) > 40,
    'a line that only leans under the tap is not held by it — it falls away',
    held.body ? 'moved ' + Math.hypot(held.body.position.x - p0.x, held.body.position.y - p0.y).toFixed(0) + ' px' : 'culled');
  sc.destroy();
}

// -------------------------------------------- 8. unsupported things drop
{
  // a glass with nothing at all under it must drop out of the level, not hover
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.platforms = [];
  lv.glasses = [{ x: 640, y: 380, w: 104, h: 118, need: 0.5, hanging: true }];
  const sc = new HG.Scene(lv);
  const g = sc.glasses[0];
  sc.startDelay = 1e9; sc.state = 'pouring';
  const y0 = g.cy;
  for (let i = 0; i < 60 * 4; i++) { sc.step(STEP); sc.physics(STEP); }
  check(g.cy > y0 + 150, 'an unsupported glass falls out of the level',
    'glass y ' + y0.toFixed(0) + ' -> ' + g.cy.toFixed(0) + ', lost ' + g.lost);
  sc.destroy();

  // the same for a loose crate
  const lv2 = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv2.crates = [{ x: 300, y: 260, size: 80, dynamic: true }];
  const sc2 = new HG.Scene(lv2);
  const cy0 = sc2.crates[0].body.position.y;
  sc2.startDelay = 1e9; sc2.state = 'pouring';
  for (let i = 0; i < 60; i++) { sc2.step(STEP); sc2.physics(STEP); }
  check(sc2.crates[0].body.position.y > cy0 + 40, 'an unsupported crate falls under gravity',
    'y ' + cy0.toFixed(0) + ' -> ' + sc2.crates[0].body.position.y.toFixed(0));
  sc2.destroy();
}

// ------------------------------------------- 9. water is held by rigid bodies
{
  // a glass that has been filled must keep its water: the level reads the real
  // droplet positions, so any leak shows up as a falling fill ratio
  const sc = fresh(1);
  drawAll(sc, SOLUTIONS[1]);
  sc.start();
  let peak = 0, after = 0;
  for (let i = 0; i < 60 * 10; i++) {
    sc.step(STEP); sc.physics(STEP);
    const g = sc.glasses[0];
    peak = Math.max(peak, g.fill);
    after = g.fill;
  }
  check(after > peak - 0.12, 'water stays pooled inside the glass once it lands',
    'peak fill ' + peak.toFixed(2) + ' -> ' + after.toFixed(2) + ' after 10 s');
  sc.destroy();
}

// --------------------------------------------------- 10. nothing goes NaN
{
  let bad = 0;
  const r = play(HG, 22, (SOLUTIONS[22] || []).map(poly), { frames: 60 * 20 });
  for (const p of r.live) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) bad++;
  for (const g of r.glasses) if (!Number.isFinite(g.x) || !Number.isFinite(g.y)) bad++;
  check(bad === 0, 'no body ends up with a NaN / infinite transform', 'checked ' + r.live.length + ' droplets');
}

// ----------------------------------------------------- 11. determinism/steps
{
  // droplets get a random radius (R .. R+0.9) on purpose, so runs are not
  // bit-identical; what matters is that the outcome does not swing
  const counts = [];
  for (let i = 0; i < 5; i++) {
    const r = play(HG, 6, (SOLUTIONS[6] || []).map(poly), { frames: 60 * 20 });
    counts.push(r.fills[0].count);
  }
  const lo = Math.min(...counts), hi = Math.max(...counts);
  check(hi - lo <= 2,
    'the same strokes always resolve the same way (fixed 60 Hz step)',
    'droplets in the glass over 5 runs: ' + counts.join('/'));
}

console.log(out.join('\n'));
console.log('\n' + (fails.length ? fails.length + ' check(s) failed' : 'all physics checks pass'));
process.exit(fails.length ? 1 : 0);
