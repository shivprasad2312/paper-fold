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
  const safe = INK_W + HG.Water.R;
  say('## 5. Continuous collision');
  check(maxV < safe, 'no droplet is fast enough to tunnel through a drawn line',
    'fastest ' + maxV.toFixed(1) + ' px/step vs ' + safe + ' px of line+droplet');
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
  check(st.anchored === false, 'a stroke that touches nothing is not anchored');
  check(fell, 'an unanchored stroke falls under gravity',
    'y ' + y0.toFixed(0) + ' -> ' + (st.body ? st.body.position.y.toFixed(0) : 'culled'));
  sc.destroy();
}

{
  const sc = fresh(1);
  drawAll(sc, [[[400, 536], [900, 536]]]);           // along the coaster top
  const st = sc.ink.strokes[0];
  check(st.anchored === true, 'a stroke that touches scenery is anchored');
  check(st.segs.every((sg) => sg.body.isStatic), 'anchored ink is solved as static contact',
    st.segs.length + ' segments, ' + st.pins.length + ' nail(s)');
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
