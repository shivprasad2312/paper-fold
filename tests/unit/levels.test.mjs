// Unit tests — the shipped level catalogue (levels.js + campaign.js +
// campaign2.js). Property checks over ALL 200 defs; the per-level
// solvability proof itself is scripts/verify-levels.mjs (`npm run verify`).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS } from '../../src/levels.js';
import { ACTS } from '../../src/acts.js';
import { parseLevel, reachable, canStillFinish, key } from '../../src/rules.js';

const TOTAL = 200;

test('catalogue: exactly 200 levels, ids 1..200, unique names', () => {
  assert.equal(LEVELS.length, TOTAL);
  const ids = LEVELS.map((d) => d.id);
  assert.deepEqual([...ids].sort((a, b) => a - b), Array.from({ length: TOTAL }, (_, i) => i + 1));
  const names = new Set(LEVELS.map((d) => d.name));
  assert.equal(names.size, TOTAL, 'level names are unique');
});

test('catalogue: the 10 acts tile the campaign 1..200', () => {
  assert.equal(ACTS.length, 10);
  let covered = 0;
  for (const a of ACTS) {
    assert.ok(a.end - a.start + 1 === 20, `act ${a.id} spans 20 levels`);
    covered += 20;
  }
  assert.equal(covered, TOTAL);
  // every level belongs to exactly one act
  for (const d of LEVELS) {
    const acts = ACTS.filter((a) => d.id >= a.start && d.id <= a.end);
    assert.equal(acts.length, 1, `level ${d.id} is in exactly one act`);
  }
});

test('catalogue: every def parses; start/goal on slabs; start ≠ goal; 2–5 shards', () => {
  // shard counts by design: 2 in the two teaching levels, 3–5 in the hand
  // set, 4 across the generated campaign
  for (const d of LEVELS) {
    const level = parseLevel(d);
    assert.notDeepEqual(
      [level.start.x, level.start.z],
      [level.goal.x, level.goal.z],
      `${d.id}: start and goal differ`,
    );
    assert.ok(
      level.shards.length >= 2 && level.shards.length <= 5,
      `${d.id}: shard count in [2,5]`,
    );
  }
  assert.equal(LEVELS[0].shards.length, 2, 'L1 (teaching) has 2 shards');
  assert.equal(LEVELS[1].shards.length, 2, 'L2 (teaching) has 2 shards');
});

test('catalogue: every level has a route and NO soft-lock (property check)', () => {
  for (const d of LEVELS) {
    const level = parseLevel(d);
    const reach = reachable(level);
    const finish = canStillFinish(level);
    assert.ok(reach.has(key(level.goal.x, level.goal.z)), `${d.id}: goal reachable`);
    const deadEnds = [...reach].filter((k) => !finish.has(k));
    assert.deepEqual(deadEnds, [], `${d.id}: no soft-lock pockets`);
    for (const s of level.shards) {
      assert.ok(reach.has(s.id), `${d.id}: shard ${s.id} reachable`);
    }
  }
});

test('catalogue: mechanic distribution matches the design doc', () => {
  const has = (d, f) => f(d);
  // teaching spine (hand-made levels 1–13)
  assert.ok(has(LEVELS[3], (d) => d.blocks), 'L4 introduces blocks/nudge');
  assert.ok(has(LEVELS[4], (d) => d.crumble), 'L5 introduces crumble');
  assert.ok(has(LEVELS[5], (d) => d.orbs), 'L6 introduces sentinels');
  assert.ok(has(LEVELS[7], (d) => d.wind), 'L8 introduces wind');
  assert.ok(has(LEVELS[11], (d) => d.key), 'L12 introduces key/lock');
  assert.ok(has(LEVELS[12], (d) => d.sliders), 'L13 introduces sliders');
  // L12 is the FIRST key level (teaching); the finale (L200) is sealed;
  // the generated campaign returns the key in later acts.
  const keyLevels = LEVELS.filter((d) => d.key).map((d) => d.id).sort((a, b) => a - b);
  assert.equal(keyLevels[0], 12, 'L12 is the first key level');
  const finale = LEVELS[TOTAL - 1];
  assert.equal(finale.id, TOTAL);
  assert.ok(finale.key, 'the finale has the sealed gate');
  // the hand-made act (levels ≤ 50) keeps its original key set: 12 + finale-of-act-2.5
  const earlyKeys = keyLevels.filter((k) => k <= 50);
  assert.deepEqual(earlyKeys, [12, 50], 'levels 1–50 keys: L12 + L50 only');
});
