// Unit tests — daily.js (date-seeded determinism + proven structure).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getDailyLevel } from '../../src/daily.js';
import { parseLevel, shortestRoute, spawnProblems, reachable, key } from '../../src/rules.js';

test('getDailyLevel: deterministic per date (everyone gets the same level)', () => {
  const a = getDailyLevel('2026-11-06');
  const b = getDailyLevel('2026-11-06');
  assert.deepEqual(a.def, b.def, 'same date → identical level def');
  assert.equal(a.par, b.par);
});

test('getDailyLevel: different dates give different layouts', () => {
  const a = getDailyLevel('2026-11-06');
  const b = getDailyLevel('2026-11-07');
  assert.notDeepEqual(a.def.map, b.def.map, 'adjacent days are different levels');
});

test('getDailyLevel: the generated level is structurally legal and solvable', () => {
  for (const date of ['2026-11-06', '2026-01-01', '2027-12-31']) {
    const { def, par } = getDailyLevel(date);
    const level = parseLevel(def); // throws on malformed data
    assert.equal(spawnProblems(level).length, 0, `${date}: spawn-safe`);
    const reach = reachable(level);
    assert.ok(reach.has(key(level.goal.x, level.goal.z)), `${date}: goal reachable`);
    for (const s of level.shards) assert.ok(reach.has(s.id), `${date}: shard reachable`);
    assert.equal(par, shortestRoute(level), `${date}: par is the BFS shortest route`);
    assert.ok(par >= 1);
  }
});
