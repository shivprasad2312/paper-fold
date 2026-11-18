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
// Not tracked: sliders / wind (hand-authored campaign-1 mechanics the
// generator cannot carve yet) and boss (act finales only, by design).
// Light blocks joined the generator in ADR-032 and lifts in ADR-033;
// both are tracked below at their shipped counts. Shrink pads (ADR-034)
// enter at their three teach/test/twist slots; the 12+ density arc for
// the Phase B mechanics is the deferred follow-up, as it was for lifts.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS } from '../../src/levels.js';

const TRACKED = {
  door: { count: (d) => (d.doors || []).length, floor: 14 },
  pulse: { count: (d) => (d.pulse || []).length, floor: 18 },
  timed: { count: (d) => (d.timed || []).length, floor: 17 },
  conveyor: { count: (d) => (d.conveyors || []).length, floor: 14 },
  twin: { count: (d) => (d.shuttles || []).some((s) => s.twin) ? 1 : 0, floor: 15 },
  freeze: { count: (d) => (d.freeze || []).length, floor: 18 },
  heavy: { count: (d) => (d.heavy || []).length, floor: 17 },
  proximity: { count: (d) => (d.orbs || []).some((o) => o.wake) ? 1 : 0, floor: 21 },
  blocks: { count: (d) => (d.blocks || []).length, floor: 10 },
  lift: { count: (d) => (d.lifts || []).length, floor: 2 },
  shrink: { count: (d) => (d.shrink || []).length, floor: 3 },
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
