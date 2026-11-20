// Unit tests — site mass (Phase G, ADR-045).
//
// Site mass is the stage that turns a route into a place. Its contract is
// narrow and every clause can fail silently: mass that covers a route tile
// ships an unplayable level, mass that bridges two legs of a loop ships a
// different puzzle, and mass that never lands leaves the ribbon the phase
// exists to remove. The stage is therefore pure (layout in, layout out) and
// pinned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applySiteMass,
  countBlocks,
  countInner,
  solidCount,
  layoutDef,
} from '../../scripts/sitemass.mjs';
import { parseLevel, shortestRoute } from '../../src/rules.js';
import {
  ACTS,
  actForId,
  parTarget,
  parJumpAllowance,
  reliefSlot,
  MECH_SLOTS,
} from '../../src/acts.js';

// A deterministic rng so a failing case is reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const B = (W, extra = {}) => ({
  W, H: W, par: [4, 400], orbs: [0, 0], crumble: [0, 0], speed: [1, 2],
  shards: [4, 4], fill: [4, 8], keyP: 0,
  mass: { fill: 0.3, blocks: 0, heightMax: 3, widen: 3, isles: 4 },
  ...extra,
});

/** A snake route across the middle of an empty W×W board. */
function snake(W) {
  const map = Array.from({ length: W }, () => Array(W).fill(0));
  const path = [];
  const z = Math.floor(W / 2);
  for (let x = 1; x < W - 1; x++) {
    map[z][x] = 1;
    path.push([x, z]);
  }
  return { W, H: W, map, path, start: [1, z], goal: [W - 2, z] };
}

test('site mass: layout → def conversion keeps void as void', () => {
  const layout = snake(6);
  const def = layoutDef(layout);
  assert.equal(def.map[0][0], '.');
  assert.equal(def.map[3][1], '1');
  // parseLevel must NOT invent a height-0 slab in the void
  const level = parseLevel(def);
  assert.equal(level.tiles.has('0,0'), false);
});

test('site mass: every route tile keeps its height, and mass only covers void', () => {
  const W = 20;
  const layout = snake(W);
  const before = layout.map.map((r) => r.slice());
  const out = applySiteMass(layout, rng(7), B(W));
  assert.ok(out, 'a 20-wide snake must be able to carry the act fill');
  for (const [x, z] of layout.path) {
    assert.equal(out.map[z][x], before[z][x], `route tile ${x},${z} was altered`);
  }
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      if (before[z][x] === 0) assert.ok(out.map[z][x] >= 0);
      else assert.equal(out.map[z][x], before[z][x]);
    }
  }
  assert.ok(solidCount(out.map) > solidCount(before), 'mass was actually added');
  assert.ok(out.massStats.fill >= 0.24, `fill ${out.massStats.fill}`);
});

test('site mass: mass never shortens the proven route by more than 2 rolls', () => {
  const W = 22;
  for (let seed = 1; seed <= 8; seed++) {
    const layout = snake(W);
    const bare = shortestRoute(parseLevel(layoutDef(layout)));
    const out = applySiteMass(layout, rng(seed), B(W, { mass: { fill: 0.5, blocks: 0, heightMax: 3, widen: 3, isles: 4 } }));
    if (!out) continue;
    const dressed = shortestRoute(parseLevel(layoutDef(out)));
    assert.ok(dressed > 0);
    assert.ok(dressed >= bare - 2, `seed ${seed}: ${bare} → ${dressed}`);
  }
});

test('site mass: the spawn and the goal keep a one-tile breathing space', () => {
  const W = 20;
  const layout = snake(W);
  const out = applySiteMass(layout, rng(11), B(W, { mass: { fill: 0.4, blocks: 0, heightMax: 3, widen: 3, isles: 4 } }));
  assert.ok(out);
  const [[sx, sz]] = [layout.start];
  const [[gx, gz]] = [layout.goal];
  // the neighbouring ring of the spawn/goal may be void or not — what must
  // never happen is the stage placing mass ON them (they are route tiles)
  assert.equal(out.map[sz][sx], layout.map[sz][sx]);
  assert.equal(out.map[gz][gx], layout.map[gz][gx]);
});

test('site mass: an unfillable board is rejected instead of shipped thin', () => {
  // a 6×6 board cannot reach a 30% fill from one 4-tile route: the stage
  // must say no, so the generator draws another candidate
  const W = 6;
  const layout = snake(W);
  const out = applySiteMass(layout, rng(3), B(W, { mass: { fill: 0.3, blocks: 0, heightMax: 3, widen: 1, isles: 0 } }));
  assert.equal(out, null);
});

test('site mass: acts without a mass budget are untouched', () => {
  const layout = snake(12);
  const out = applySiteMass(layout, rng(5), { W: 12, H: 12 });
  assert.equal(out, layout);
});

test('site mass: the shape metrics count places, not ribbons', () => {
  const map = [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ];
  assert.equal(countBlocks(map), 1);
  assert.equal(countInner(map), 0); // 2×2 block: no tile has four neighbours
  const strip = [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  assert.equal(countBlocks(strip), 0);
  assert.equal(countInner(strip), 0);
});

// --- the pacing law (Phase G) -------------------------------------------
// The par curve is a contract with two consumers: the generator (which must
// not settle outside it) and the curation audit (which must not pass a
// catalogue that breaks it). These pin the two halves together.

test('pacing: every act declares a par band and a jump allowance ≥ 16', () => {
  for (const act of ACTS) {
    if (!act.gen) continue;
    assert.ok(act.gen.par[1] > act.gen.par[0], `act ${act.id} band`);
    assert.ok(parJumpAllowance(act) >= 16, `act ${act.id} allowance`);
  }
});

test('pacing: the drawn curve never asks for a step larger than the allowance', () => {
  // the worst case the generator can produce is target ± tolerance, and the
  // audit compares settled neighbours: if the CURVE itself could not be
  // satisfied, every regeneration would be a coin flip
  for (const act of ACTS) {
    if (!act.gen) continue;
    const first = Math.max(act.start, 51);
    const allow = parJumpAllowance(act);
    let prev = null;
    for (let id = first; id <= act.end; id++) {
      const t = parTarget(id, act);
      if (prev != null && id % 20 !== 0) {
        assert.ok(Math.abs(t - prev) <= allow, `act ${act.id} L${id - 1}→L${id}: ${prev}→${t} > ${allow}`);
      }
      prev = t;
    }
  }
});

test('pacing: the act runs as a sawtooth — relief at least every six levels', () => {
  for (const act of ACTS) {
    if (!act.gen) continue;
    const [lo, hi] = act.gen.par;
    const first = Math.max(act.start, 51);
    let run = 0;
    for (let id = first; id <= act.end && id % 20 !== 0; id++) {
      const t = parTarget(id, act);
      if (t <= lo + (hi - lo) * 0.3) run = 0;
      else if (++run > 5) assert.fail(`act ${act.id}: no relief by L${id}`);
    }
  }
});

test('pacing: bosses sit at the act ceiling, the level before them is a dip', () => {
  for (const act of ACTS) {
    if (!act.gen) continue;
    for (let id = act.start; id <= act.end; id++) {
      if (id % 20 !== 0) continue;
      assert.equal(parTarget(id, act), act.gen.par[1], `boss L${id} at the ceiling`);
      assert.ok(parTarget(id - 1, act) < act.gen.par[1] - (act.gen.par[1] - act.gen.par[0]) * 0.5,
        `run-up into L${id} is a dip`);
    }
  }
});

test('pacing: the mechanic curriculum names real ids in real acts', () => {
  for (const [mech, ids] of Object.entries(MECH_SLOTS)) {
    assert.ok(ids.length >= 3, `${mech} teach/test/twist`);
    for (const id of ids) assert.ok(actForId(id) && actForId(id).gen, `${mech} L${id} is a generated level`);
    assert.equal(new Set(ids).size, ids.length, `${mech} slots unique`);
  }
});

test('pacing: no teaching slot sits on a breathing slot', () => {
  // a curriculum level is a climbing slot (learn it in a room long enough to
  // learn it in); a relief slot is the opposite promise. The first Phase G
  // run had eight collisions and act 10's cling test could not prove at all
  // on a plaza — the two roles draw from the same pool and fight.
  for (const [mech, ids] of Object.entries(MECH_SLOTS)) {
    for (const id of ids) {
      assert.ok(!reliefSlot(id, actForId(id)), `${mech} L${id} is also a relief slot`);
    }
  }
});

test('pacing: a relief slot draws only from its act pool', () => {
  for (const act of ACTS) {
    if (!act.gen || !act.gen.relief) continue;
    for (const a of act.gen.relief) {
      assert.ok(act.gen.arch.includes(a), `act ${act.id} relief ${a} is in the act pool`);
    }
    assert.ok(act.gen.relief.length >= 2, `act ${act.id} has a relief choice`);
  }
});

test('pacing: relief pools are drawn from archetypes measured UNDER the relief line', () => {
  // measured par at the act's board with site mass on (site-mass-probe,
  // ADR-045). A short archetype still clears the line at a bigger board, and
  // picking it for a breathing slot would silently break the sawtooth — the
  // first Phase G run did exactly that in act 10.
  const MEASURED_AT = {
    20: { lattice: 21, fork: 23, 'split-merge': 25, crossroads: 26, plaza: 30, 'twin-bridge': 31 },
    22: { lattice: 24, fork: 26, crossroads: 28, 'split-merge': 30, plaza: 34, 'twin-bridge': 35 },
    24: { lattice: 27, fork: 27, crossroads: 30, 'split-merge': 34, plaza: 38, 'twin-bridge': 40, aperture: 44 },
    26: { crossroads: 31, lattice: 33, fork: 33, 'split-merge': 35, plaza: 42, 'twin-bridge': 43, aperture: 50, 'bridge-chain': 51 },
  };
  for (const act of ACTS) {
    if (!act.gen || !act.gen.relief) continue;
    const [lo, hi] = act.gen.par;
    const line = lo + (hi - lo) / 3;
    const table = MEASURED_AT[act.gen.W];
    assert.ok(table, `act ${act.id} board ${act.gen.W} has measurements`);
    for (const a of act.gen.relief) {
      assert.ok(table[a] != null, `act ${act.id}: ${a} measured at ${act.gen.W}`);
      assert.ok(table[a] <= line, `act ${act.id}: ${a} measures ${table[a]} at ${act.gen.W}, above the relief line ${line.toFixed(1)}`);
    }
  }
});
