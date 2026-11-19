// Unit tests — experience-diversity curation gate (M2.5).
// The fingerprint/audit law lives in scripts/experience.mjs; the shipped
// catalogue must pass it (scripts/verify-levels.mjs enforces the same law
// in the commit gate).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS } from '../../src/levels.js';
import {
  mechanicSignature,
  experienceFingerprint,
  sequenceProblems,
  experienceProblems,
  MECH_CAP,
} from '../../scripts/experience.mjs';

const def = (id, extra = {}) => ({
  id,
  name: `synthetic ${id}`,
  map: ['0000', '0000', '0000', '0000'],
  start: [0, 3],
  goal: [3, 0],
  shards: [[1, 1]],
  ...extra,
});

test('curation: mechanic signature reads the presented mechanic set', () => {
  assert.equal(mechanicSignature(def(1)), '-');
  assert.equal(mechanicSignature(def(2, { ice: [[1, 1]], springs: [[2, 2]], key: [3, 3] })), 'IPK');
  assert.equal(mechanicSignature(def(3, { shuttles: [{ a: [0, 0], b: [2, 0] }], wind: { x: 1, z: 1 } })), 'SA');
  // one char per mechanic: the breeze is 'A' (air), a twin platform is 'W'
  assert.equal(mechanicSignature(def(4, { shuttles: [{ a: [0, 0], b: [2, 0], twin: true }] })), 'SW');
});

test('curation: fingerprint bands par, sentinel speed and direction', () => {
  const fp = experienceFingerprint(
    def(190, { ice: [[1, 1]], orbs: [{ path: [[0, 0], [3, 0]], speed: 2.3 }], crumble: [[1, 2], [2, 2]] }),
    41,
  );
  assert.equal(fp.mech, 'I');
  assert.equal(fp.par, 41);
  assert.match(fp.label, /^I\|o1\|c2\|pXL\|s3\|d1,-1\|m4$/);
});

test('curation: sequence law flags a third identical experience', () => {
  const fp = experienceFingerprint(def(1, { ice: [[1, 1]] }), 20);
  assert.deepEqual(sequenceProblems(fp, [fp, fp]).length, 1);
  assert.deepEqual(sequenceProblems(fp, [fp]), []);
});

test('curation: sequence law flags a sixth level with one mechanic signature', () => {
  const mk = (par) => experienceFingerprint(def(1, { ice: [[1, 1]] }), par);
  const recent = [mk(10), mk(14), mk(18), mk(22), mk(26)];
  const problems = sequenceProblems(mk(30), recent);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /sixth consecutive/);
});

test('curation: audit flags an intra-act par cliff (boss spikes exempt)', () => {
  const defs = [def(181), def(182)];
  const pars = new Map([[181, 20], [182, 40]]);
  const problems = experienceProblems(defs, pars);
  assert.ok(problems.some((p) => /par jump of 20/.test(p)), problems.join(' | '));
  const bossPars = new Map([[181, 20], [182, 20], [183, 20], [184, 20], [185, 20], [186, 20], [187, 20], [188, 20], [189, 20], [190, 20], [191, 20], [192, 20], [193, 20], [194, 20], [195, 20], [196, 20], [197, 20], [198, 20], [199, 20], [200, 40]]);
  const bossDefs = Array.from({ length: 20 }, (_, i) => def(181 + i));
  assert.ok(!experienceProblems(bossDefs, bossPars).some((p) => /par jump/.test(p)));
});

test('curation: the shipped 200-level catalogue passes the diversity audit', () => {
  assert.deepEqual(experienceProblems(LEVELS), []);
});

test('curation: the complexity ceiling is 9 and the shipped catalogue obeys it', () => {
  assert.equal(MECH_CAP, 9);
  // one board may not present every mechanic at once: the density carves
  // score variety, and without a ceiling a re-cut slot stacks ten
  const crowded = def(900, {
    ice: [[1, 1]],
    springs: [[2, 2]],
    conveyors: [[1, 2, 1, 0]],
    doors: [{ plate: [0, 1], at: [2, 1] }],
    shuttles: [{ a: [0, 0], b: [2, 0] }],
    lifts: [{ at: [3, 3], low: 0, high: 2 }],
    shrink: [[1, 0]],
    grow: [[2, 3]],
    low: [[1, 3]],
    pistons: [{ at: [0, 2], dx: 1, dz: 0 }],
    turntables: [{ at: [3, 1] }],
    timed: [[0, 0]],
    freeze: [[2, 0]],
    heavy: [[3, 2]],
    pulse: [[3, 0]],
  });
  assert.ok(mechanicSignature(crowded).length > MECH_CAP);
  const problems = experienceProblems([crowded]);
  assert.ok(problems.some((p) => /over the complexity cap/.test(p)), problems.join(' / '));
  // the real catalogue never trips it — the ceiling was set at the shipped
  // maximum, so it can only ever reject NEW drift
  for (const lvl of LEVELS) {
    const n = mechanicSignature(lvl).length;
    assert.ok(n <= MECH_CAP, `L${lvl.id} presents ${n} mechanics (cap ${MECH_CAP})`);
  }
});
