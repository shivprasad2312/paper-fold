// Unit tests — mechanic density ratchet (Phase C, ADR-031).
//
// Phase C raises every generator-placeable mechanic to a floor of 12+
// appearances in teach → test → twist arcs. Until all floors land, this
// test is the ratchet: it records the counts batch 1 shipped and fails
// if any tracked mechanic ever drops below them — a regeneration or a
// splice that silently strips a mechanic (the M2 regression class)
// breaks the build here instead of shipping unnoticed. Raise a floor
// only in the commit that raises the mechanic's actual count.
//
// Not tracked: sliders / wind / light blocks (hand-authored campaign-1
// mechanics the generator cannot carve yet) and boss (act finales only,
// by design).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS } from '../../src/levels.js';

const TRACKED = {
  door: { count: (d) => (d.doors || []).length, floor: 8 },
  pulse: { count: (d) => (d.pulse || []).length, floor: 12 },
  timed: { count: (d) => (d.timed || []).length, floor: 12 },
  conveyor: { count: (d) => (d.conveyors || []).length, floor: 11 },
  twin: { count: (d) => (d.shuttles || []).some((s) => s.twin) ? 1 : 0, floor: 10 },
  freeze: { count: (d) => (d.freeze || []).length, floor: 12 },
  heavy: { count: (d) => (d.heavy || []).length, floor: 12 },
  proximity: { count: (d) => (d.orbs || []).some((o) => o.wake) ? 1 : 0, floor: 12 },
};

for (const [name, { count, floor }] of Object.entries(TRACKED)) {
  test(`density: ${name} appears in at least ${floor} levels (Phase C ratchet)`, () => {
    const n = LEVELS.filter((d) => count(d) > 0).length;
    assert.ok(n >= floor, `${name} appears in ${n} levels, below the ratchet floor ${floor}`);
  });
}

test('density: the shipped catalogue is the full 200', () => {
  assert.equal(LEVELS.length, 200);
});
