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

// ------------------------------------------------- 3b. settled contact is still
// A braced wire and a pool of settled water must be *perfectly* motionless.
// Anything left moving is what a player reports as "the line is vibrating".
{
  // NB: deep-copy the level — levels are shared objects, and scribbling on one
  // here would corrupt every later check.
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));   // glass on its pedestal
  lv.platforms = lv.platforms.concat([{ x: 640, y: 420, w: 460, h: 20, kind: 'wood', angle: 0 }]);
  const sc = new HG.Scene(lv);
  // a wire lying along the ledge: it is pressed onto it at both ends
  drawAll(sc, [[[420, 408], [860, 408]]]);
  const wire = sc.ink.strokes[0];
  const shape0 = JSON.stringify(sc.inkWorldSegments());
  sc.start();
  for (let i = 0; i < 60 * 5; i++) { sc.step(STEP); sc.physics(STEP); }
  // let the last of the stream land and settle before judging "at rest"
  for (let i = 0; i < 60 * 4; i++) { sc.step(STEP); sc.physics(STEP); }
  const shapeAfterPour = JSON.stringify(sc.inkWorldSegments());
  let worstSpeed = 0, moving = 0, samples = 0;
  for (let i = 0; i < 60 * 2; i++) {
    sc.step(STEP); sc.physics(STEP);
    for (const p of sc.water.particles) {
      const v = Math.hypot(p.body.velocity.x, p.body.velocity.y) / HG.Scene.SUBSTEPS;
      samples++;
      if (v > worstSpeed) worstSpeed = v;
      if (v > 0.2) moving++;
    }
  }
  say('## 3b. Settled contact is motionless');
  check(wire.pins.length >= 2 && wire.body.isStatic, 'a wire resting on a ledge is welded, not simulated',
    (wire.pins.length || 0) + ' anchor(s), static ' + wire.body.isStatic);
  check(shapeAfterPour === shape0, 'the braced wire never moves, even under a 5 s stream',
    shapeAfterPour === shape0 ? 'identical geometry over 5 s of water' : 'geometry drifted');
  check((moving / samples) < 0.005, 'water resting on the wire is asleep, not buzzing',
    'worst ' + worstSpeed.toFixed(3) + ' px/step, ' + moving + '/' + samples + ' samples moving');
  sc.destroy();
}

// ----------------------------------------------- 3c. one contact is a hinge
// The reported bug: a line hooked onto the tap stayed out sideways like a steel
// bracket. A single point contact cannot carry a lever, so the wire must swing
// about that point until its weight hangs under it.
{
  const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
  lv.glasses = [{ x: 150, y: 640, w: 60, h: 60, need: 0.99, hanging: true }];
  lv.faucet = { x: 330, y: 190, rate: 40, total: 400 };
  lv.faucets = [lv.faucet];
  lv.platforms = [];
  lv.crates = []; lv.pins = [];
  const sc = new HG.Scene(lv);
  drawAll(sc, [[[330, 200], [330, 250], [810, 350]]]);   // hooked on the tap only
  const st = sc.ink.strokes[0];
  const nails = st.pins.filter((p) => p && st.pinSupports.some((b) => b && b.label === 'faucet')).length;
  const a0 = st.body.angle;
  const endY0 = st.body.position.y;
  sc.start(); sc.state = 'pouring'; sc.startDelay = 1e9;
  for (let i = 0; i < 60 * 4; i++) { sc.step(STEP); sc.physics(STEP); }
  const swing = Math.abs(((st.body.angle - a0) * 180) / Math.PI);
  say('## 3c. One contact is a hinge, not a bracket');
  check(st.pins.length === 1 && !st.body.isStatic, 'a wire held at a single point is not welded',
    st.pins.length + ' anchor(s), static ' + st.body.isStatic);
  check(swing > 30, 'a cantilevered wire swings down about its anchor',
    'rotated ' + swing.toFixed(1) + '° in 4 s, centre fell ' + (st.body.position.y - endY0).toFixed(1) + ' px');
  check(Math.abs(st.body.angularVelocity) < 0.08, 'and it comes to rest instead of swinging forever',
    'angular velocity ' + st.body.angularVelocity.toFixed(3) + ' rad/step');
  sc.destroy();
}

// --------------------------------------------- 3d. water cannot move the wire
// The reported bug: the wire shivered when droplets bounced off it. Ink and
// water now live in separate collision categories, and the contact is resolved
// on the droplet alone (Scene.resolveWaterInk). The proof is an A/B run: the
// same wire, same frames, one with a stream over it and one with the tap shut.
// If water transferred any impulse at all the two traces would drift apart.
{
  const build = (water, stroke, plank) => {
    const lv = JSON.parse(JSON.stringify(HG.levelById(1)));
    lv.glasses = [{ x: 150, y: 640, w: 60, h: 60, need: 0.99, hanging: true }];
    lv.faucet = { x: 330, y: 190, rate: 70, total: water ? 900 : 0, spread: 0.55 };
    lv.faucets = [lv.faucet];
    lv.platforms = plank ? [{ x: 430, y: 420, w: 380, h: 20, kind: 'wood', angle: 0 }] : [];
    lv.crates = []; lv.pins = [];
    const sc = new HG.Scene(lv);
    drawAll(sc, [stroke]);
    sc.start();
    return sc;
  };
  const geo = (sc) => sc.inkWorldSegments().map((s) => [s.x1, s.y1, s.x2, s.y2]);
  const run = (water, stroke, plank, frames) => {
    const sc = build(water, stroke, plank);
    const frames_ = [];
    for (let i = 0; i < frames; i++) { sc.step(STEP); sc.physics(STEP); frames_.push(geo(sc)); }
    const drops = sc.water.particles.length;
    const contacts = sc.inkSpills || 0;
    sc.destroy();
    return { frames_: frames_, drops, contacts };
  };
  const F = 180;
  say('## 3d. Water cannot move the wire (A/B: stream vs dry)');
  for (const c of [
    { label: 'hinged wire (one contact) in a stream', stroke: [[330, 200], [330, 250], [560, 300]], plank: true, mustMove: true },
    { label: 'braced wire on a plank in a stream', stroke: [[300, 406], [560, 406]], plank: true, mustMove: false },
  ]) {
    const wet = run(true, c.stroke, c.plank, F);
    const dry = run(false, c.stroke, c.plank, F);
    let worst = 0, shape = false;
    for (let f = 0; f < F; f++) {
      const a = wet.frames_[f], b = dry.frames_[f];
      if (a.length !== b.length) { shape = true; break; }
      for (let i = 0; i < a.length; i++) for (let k = 0; k < 4; k++) worst = Math.max(worst, Math.abs(a[i][k] - b[i][k]));
    }
    const g0 = wet.frames_[0], gN = wet.frames_[F - 1];
    let travel = 0;
    for (let i = 0; i < g0.length; i++) travel = Math.max(travel, Math.hypot(gN[i][0] - g0[i][0], gN[i][1] - g0[i][1]));
    check(wet.contacts > 20, c.label + ': water really is landing on it',
      wet.contacts + ' droplet/wire contacts resolved, ' + wet.drops + ' droplets in flight');
    check(!shape && worst === 0, c.label + ': zero impulse from water (stream vs no stream are identical)',
      shape ? 'wire geometry changed shape' : 'max divergence ' + worst.toFixed(5) + ' px over ' + F + ' frames');
    check(c.mustMove ? travel > 1 : travel < 0.01,
      c.mustMove ? c.label + ': and the wire is still a free physical body, not frozen'
                 : c.label + ': a braced wire stays exactly put',
      'wire moved ' + travel.toFixed(3) + ' px over 3 s');
  }
  // the mechanism itself: the two categories must not intersect, on every part
  {
    const sc = build(true, [[330, 200], [330, 250], [560, 300]], true);
    for (let i = 0; i < 40; i++) { sc.step(STEP); sc.physics(STEP); }
    const st = sc.ink.strokes[0];
    const parts = st.body.parts.map((x) => x.collisionFilter);
    const wf = sc.water.particles.length ? sc.water.particles[0].body.collisionFilter : null;
    check(!!wf, 'droplets exist and are made of water', wf ? 'sampled one' : 'no droplet to sample');
    const okParts = parts.every((f) => (f.mask & HG.CAT_WATER) === 0 && f.category === HG.CAT_INK);
    check(okParts, 'every part of a compound wire excludes the water category',
      parts.length + ' parts, category ' + parts[0].category + ', mask 0x' + parts[0].mask.toString(16));
    check(!wf || (wf.mask & HG.CAT_INK) === 0 && wf.category === HG.CAT_WATER,
      'and droplets neither see nor are seen by ink', wf ? 'droplet category ' + wf.category + ', mask 0x' + wf.mask.toString(16) : 'no droplet to sample');
    sc.destroy();
  }
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
    st.segs.length + ' segments, ' + st.pins.length + ' contact(s)');
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

// ------------------------------------------- 7b. iron-wire semantics
{
  // (a) wire that touches the tap is nailed; check it is solved as a body that
  //     still exists after 3 s (it must not evaporate, and it must not drift)
  const sc = fresh(2);
  const pts = poly([[400, 200], [400, 300], [700, 372]]);
  sc.beginInk(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) sc.addInkPoint(pts[i].x, pts[i].y);
  sc.endInk();
  const held = sc.ink.strokes[0];
  const p0 = { x: held.body.position.x, y: held.body.position.y };
  sc.start();
  for (let i = 0; i < 180; i++) { sc.step(STEP); sc.physics(STEP); }
  const moved = Math.hypot(held.body.position.x - p0.x, held.body.position.y - p0.y);
  check(held.anchored && moved < 12,
    'wire hooked onto the tap stays where it was drawn',
    held.pins.length + ' contact(s), moved ' + moved.toFixed(1) + ' px in 3 s');

  sc.destroy();

  // (b) the same wire with no scenery in reach must fall, not hover
  const sc2 = fresh(2);
  const pts2 = poly([[200, 300], [330, 300]]);
  sc2.beginInk(pts2[0].x, pts2[0].y);
  for (let i = 1; i < pts2.length; i++) sc2.addInkPoint(pts2[i].x, pts2[i].y);
  sc2.endInk();
  const loose = sc2.ink.strokes[0];
  sc2.start();
  for (let i = 0; i < 60; i++) { sc2.step(STEP); sc2.physics(STEP); }
  check(!loose.anchored && (!loose.body || loose.body.position.y > 340),
    'the same drawing in mid-air falls instead of hanging',
    'y 300 -> ' + (loose.body ? loose.body.position.y.toFixed(0) : 'gone'));
  sc2.destroy();
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
