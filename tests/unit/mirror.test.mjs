// Unit tests — the axis-mirror law (M2.5 orientation rotation, ADR-041).
//
// act.gen.flip mirrors a carved layout about the x (east-west) or z
// (north-south) axis. The generator now mirrors FIRST and proves the
// MIRRORED def, so the only thing this law must guarantee is that the
// mirror is a faithful board transform: directions reverse with the axis
// being flipped (never both, never the wrong one), and applying the same
// flip twice is the identity.
//
// Why it matters: the piston law used to negate dx unconditionally. On
// act 8's z-flip that turned a south-pushing arm into a north-pushing one
// over a void cell and the level would not parse; the generator's old
// proof ran on the PRE-mirror def, so nothing caught it until L149.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mirrorDef } from '../../scripts/mirror.mjs';
import { parseLevel, shortestRoute } from '../../src/rules.js';
import { CAMPAIGN2 } from '../../src/campaign2.js';
import { mechanicSignature } from '../../scripts/experience.mjs';

const base = () => ({
  name: 'mirror-probe',
  map: [
    '........',
    '..1..1..',
    '....2...',
    '..1.....',
    '........',
  ],
  start: [1, 4],
  goal: [6, 0],
  shards: [[2, 2]],
  conveyors: [[2, 2, -1, 0]],
  pistons: [{ at: [3, 3], dx: 0, dz: 1, period: 3.2, phase: 0 }],
  wind: { x: -1, z: 1 },
  orbs: [{ path: [[2, 2], [4, 2]], speed: 1 }],
  doors: [{ plate: [1, 2], at: [5, 2] }],
  clings: [[2, 3]],
  sliders: [{ tiles: [[3, 1], [4, 1]], period: 4, phase: 0 }],
});

test('mirror: an x-flip reverses dx and leaves dz alone', () => {
  const m = mirrorDef(base(), 'x');
  assert.deepEqual(m.conveyors[0], [5, 2, 1, 0]);
  assert.equal(m.pistons[0].dx, 0);
  assert.equal(m.pistons[0].dz, 1);
  assert.deepEqual(m.wind, { x: 1, z: 1 });
});

test('mirror: a z-flip reverses dz and leaves dx alone', () => {
  const m = mirrorDef(base(), 'z');
  assert.deepEqual(m.conveyors[0], [2, 2, -1, 0]);
  // the shipped bug: a z-push must become a north-push, and dx must NOT
  // change (the old law negated dx here and the level stopped parsing)
  assert.equal(m.pistons[0].dx, 0);
  assert.equal(m.pistons[0].dz, -1);
  assert.deepEqual(m.wind, { x: -1, z: -1 });
});

test('mirror: a piston that pushes east reverses only under an x-flip', () => {
  const def = { ...base(), pistons: [{ at: [3, 3], dx: 1, dz: 0, period: 3.2, phase: 0 }] };
  assert.equal(mirrorDef(def, 'x').pistons[0].dx, -1);
  assert.equal(mirrorDef(def, 'x').pistons[0].dz, 0);
  assert.equal(mirrorDef(def, 'z').pistons[0].dx, 1);
  assert.equal(mirrorDef(def, 'z').pistons[0].dz, 0);
});

test('mirror: flipping twice on the same axis is the identity', () => {
  const def = base();
  for (const axis of ['x', 'z']) {
    assert.deepEqual(mirrorDef(mirrorDef(def, axis), axis), def, `${axis} is not an involution`);
  }
});

test('mirror: every generated level mirrors to the same par on either axis', () => {
  // The shipped population is what the law serves: 51–200 are the levels
  // the generator may re-cut and mirror. (The hand-authored 1–50 are never
  // mirrored at runtime; L38 x-mirrored is in fact unsolvable, which is
  // exactly why the generator now PROVES the mirrored def instead of
  // trusting the symmetry.)
  assert.equal(CAMPAIGN2.length, 150);
  for (const def of CAMPAIGN2) {
    const par = shortestRoute(parseLevel(def));
    assert.ok(par > 0, `L${def.id} has no route`);
    for (const axis of ['x', 'z']) {
      const m = mirrorDef(def, axis);
      assert.deepEqual(mechanicSignature(m), mechanicSignature(def), `L${def.id} ${axis}-flip changes mechanics`);
      assert.equal(shortestRoute(parseLevel(m)), par, `L${def.id} ${axis}-flip changes par`);
    }
  }
});
