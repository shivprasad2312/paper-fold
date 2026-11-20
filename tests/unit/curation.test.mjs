// Unit tests — experience-diversity curation gate (M2.5).
// The fingerprint/audit law lives in scripts/experience.mjs; the shipped
// catalogue must pass it (scripts/verify-levels.mjs enforces the same law
// in the commit gate).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS } from '../../src/levels.js';
import { actForId } from '../../src/acts.js';
import {
  mechanicSignature,
  experienceFingerprint,
  sequenceProblems,
  experienceProblems,
  curveProblems,
  MECH_CAP,
  CURVE_WINDOW,
  CURVE_MIN_SPAN,
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
  // act 10 declares par 36–84 (Phase G): its own bandwidth is 48, so the
  // allowance is ~34 rolls. A 20-roll step is the act reading as designed;
  // a 40-roll step inside one act is still a cliff.
  const defs = [def(181), def(182)];
  const mild = experienceProblems(defs, new Map([[181, 20], [182, 40]]));
  assert.ok(!mild.some((p) => /par jump/.test(p)), '20 inside act 10 is within the band');
  const steep = experienceProblems(defs, new Map([[181, 10], [182, 60]]));
  assert.ok(steep.some((p) => /par jump of 50/.test(p)), steep.join(' | '));
  const bossPars = new Map([[181, 20], [182, 20], [183, 20], [184, 20], [185, 20], [186, 20], [187, 20], [188, 20], [189, 20], [190, 20], [191, 20], [192, 20], [193, 20], [194, 20], [195, 20], [196, 20], [197, 20], [198, 20], [199, 20], [200, 40]]);
  const bossDefs = Array.from({ length: 20 }, (_, i) => def(181 + i));
  // the boss spike itself: L199 → L200 steps 20 → 80, exempt because 200 % 20 === 0
  const spike = new Map(bossPars);
  spike.set(200, 80);
  assert.ok(!experienceProblems(bossDefs, spike).some((p) => /par jump/.test(p)));
});

test('curation: the shipped 200-level catalogue passes the diversity audit', () => {
  assert.deepEqual(experienceProblems(LEVELS), []);
});

// --- the plateau law (Phase H, ADR-047) ------------------------------------
// level_progression §6's risk, made measurable: a stretch of levels can be
// diverse in fingerprint, free of cliffs, and still all be equally hard.

const fp = (id, par, mech = 'I') => ({ id, par, mech, label: `${mech}|o1|c2|pM|s1|d1,0|m18` });

test('curation: the plateau law rejects a flat stretch', () => {
  // six levels inside a one-roll band is exactly the §6 failure mode
  const flat = [fp(21, 30), fp(22, 31), fp(23, 30), fp(24, 31), fp(25, 30), fp(26, 31)];
  const problems = curveProblems(flat);
  assert.equal(problems.length, 1, problems.join(' | '));
  assert.match(problems[0], /plateau/);
  assert.match(problems[0], /spans only 1/);
});

test('curation: a single real dip inside the window satisfies the law', () => {
  const dipped = [fp(21, 30), fp(22, 31), fp(23, 26), fp(24, 31), fp(25, 30), fp(26, 31)];
  assert.deepEqual(curveProblems(dipped), []);
  // ... and so does a climb, because the law measures MOVEMENT, not relief
  const climbed = [fp(21, 28), fp(22, 31), fp(23, 30), fp(24, 31), fp(25, 30), fp(26, 31)];
  assert.deepEqual(curveProblems(climbed), []);
});

test('curation: an act boundary and a boss spike are not plateaus', () => {
  // six identical pars straddling the act 1 | act 2 boundary (L18–L23)
  const boundary = [18, 19, 20, 21, 22, 23].map((id) => fp(id, 30));
  assert.deepEqual(curveProblems(boundary), [], 'an act break is a designed reset');
  // six identical pars ending on the act-end boss (L15–L20)
  const boss = [15, 16, 17, 18, 19, 20].map((id) => fp(id, 30));
  assert.deepEqual(curveProblems(boss), [], 'the boss is a designed spike');
  // a window with an unknown par says nothing about the curve
  const unknown = [fp(21, 30), fp(22, -1), fp(23, 30), fp(24, 30), fp(25, 30), fp(26, 30)];
  assert.deepEqual(curveProblems(unknown), []);
});

test('curation: the plateau law is calibrated to the shipped curve, with no slack', () => {
  // A law invented after the content is either a regeneration order or a
  // no-op. This one is neither: the shipped catalogue passes it, and every
  // window is at least the threshold — while the SAME threshold one level
  // shorter is already broken by shipped stretches (L15–L19, L24–L28),
  // so the law cannot be loosened without the content noticing.
  const pars = new Map();
  for (const d of LEVELS) {
    const fpObj = experienceFingerprint(d);
    pars.set(d.id, fpObj.par);
  }
  const fps = LEVELS.map((d) => ({ id: d.id, par: pars.get(d.id), mech: experienceFingerprint(d, pars.get(d.id)).mech }));
  assert.deepEqual(curveProblems(fps), [], 'the shipped catalogue must satisfy its own law');
  // the same windows the law measures: inside one act, never across a boss
  const spans = [];
  for (let i = 0; i + CURVE_WINDOW <= fps.length; i++) {
    const w = fps.slice(i, i + CURVE_WINDOW);
    const act = actForId(w[0].id);
    if (!act || w.some((f) => (actForId(f.id) || {}).id !== act.id)) continue;
    if (w.some((f) => f.id % 20 === 0)) continue;
    const p = w.map((f) => f.par);
    spans.push(Math.max(...p) - Math.min(...p));
  }
  assert.equal(Math.min(...spans), CURVE_MIN_SPAN, 'the law must be tight: the flattest shipped window meets it exactly');
  assert.equal(CURVE_WINDOW, 6);
  assert.equal(CURVE_MIN_SPAN, 2);
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
