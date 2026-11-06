// Unit tests — the shipped level catalogue (levels.js + campaign.js).
// These are property checks over ALL 50 defs; the per-level solvability
// proof itself is scripts/verify-levels.mjs (run by `npm run verify`).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS } from '../../src/levels.js';
import { parseLevel, reachable, canStillFinish, key } from '../../src/rules.js';

test('catalogue: exactly 50 levels, ids 1..50, unique names', () => {
  assert.equal(LEVELS.length, 50);
  const ids = LEVELS.map((d) => d.id);
  assert.deepEqual([...ids].sort((a, b) => a - b), Array.from({ length: 50 }, (_, i) => i + 1));
  const names = new Set(LEVELS.map((d) => d.name));
  assert.equal(names.size, 50, 'level names are unique');
});

test('catalogue: every def parses; start/goal on slabs; start ≠ goal; 2–5 shards', () => {
  // shard counts by design: 2 in the two teaching levels, 3 for most hand
  // levels, 4 across the campaign, 5 in the pre-boss L12/L13
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
  // teaching spine
  assert.ok(has(LEVELS[3], (d) => d.blocks), 'L4 introduces blocks/nudge');
  assert.ok(has(LEVELS[4], (d) => d.crumble), 'L5 introduces crumble');
  assert.ok(has(LEVELS[5], (d) => d.orbs), 'L6 introduces sentinels');
  assert.ok(has(LEVELS[7], (d) => d.wind), 'L8 introduces wind');
  assert.ok(has(LEVELS[11], (d) => d.key), 'L12 introduces key/lock');
  assert.ok(has(LEVELS[12], (d) => d.sliders), 'L13 introduces sliders');
  // key/lock is taught in L12 and returns for the L50 finale — nowhere else
  const keyLevels = LEVELS.filter((d) => d.key).map((d) => d.id);
  assert.deepEqual(keyLevels.sort((a, b) => a - b), [12, 50]);
  const finale = LEVELS[49];
  assert.equal(finale.id, 50);
  assert.ok(finale.key, 'L50 has the sealed gate');
});
