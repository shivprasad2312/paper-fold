// ---------------------------------------------------------------------------
// Unit tests — the wheel (ADR-050)
//
// A two-armed capstan over a pit. What must hold, and why each one matters:
//
//   · the CLOCK: the bar turns one full turn per period, coverage folds mod π
//     (a bar is symmetric), and opposite pairs are covered together — the
//     read the level design leans on ("the bar points at you" is always true);
//   · the FAIRNESS LAW: every ring tile is clear for at least TIMING_FLOOR
//     seconds per pass. A hazard you cannot cross on purpose is not a
//     hazard, it is a coin flip;
//   · the GAP: the arms hang between the mini cube's top and the full cube's
//     top. That number IS the mechanic — if it drifts, the mechanic silently
//     becomes "nobody can pass" or "everybody can";
//   · the PLANNING LAW: proofs route through the ring only while MINI, while
//     the simulation still lets a full-size cube roll in and die. The two
//     must not be the same function, or either the level becomes unprovable
//     or the dare disappears;
//   · the PARSE LAWS: a wheel needs a void hub, a full ring at one height,
//     a clean ring, and a way to be small.
// ---------------------------------------------------------------------------
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLevel, key, TIMING_FLOOR, WHEEL_PERIOD, WHEEL_ARM_HALF, WHEEL_GAP,
  wheelSafeWindow, wheelSwept, wheelProximity, wheelPhase, wheelArmAngle,
  wheelBlocksPlan, rollTargetsAt, shortestRoute, rescueTile,
  canStillFinish, reachable, resolveRollAt, DIRS,
} from '../../src/rules.js';
import { ALL_LEVELS } from '../../src/levels.js';

// a 7x7 plate with a pit at (3,3); the ring is (3,2) (4,3) (3,4) (2,3)
const map = [
  '0000000',
  '0000000',
  '0000000',
  '000.000',
  '0000000',
  '0000000',
  '0000000',
];
const base = (extra = {}) => ({
  id: 999, name: 'Wheel Test', map,
  start: [3, 6], goal: [3, 0],
  shards: [[1, 3], [5, 3], [1, 5]],
  wheels: [{ at: [3, 3], period: 6.0, phase: 0 }],
  shrink: [[3, 5]],
  ...extra,
});

test('wheel: the bar turns one full turn per period', () => {
  const lv = parseLevel(base());
  const w = lv.wheels[0];
  assert.equal(wheelPhase(0, w), 0);
  assert.equal(wheelPhase(w.period, w), 0);
  assert.ok(Math.abs(wheelPhase(w.period / 4, w) - 0.25) < 1e-12);
  assert.ok(Math.abs(wheelArmAngle(w.period / 2, w) - Math.PI) < 1e-12);
});

test('wheel: coverage folds mod π — a bar has two ends', () => {
  const lv = parseLevel(base());
  const w = lv.wheels[0];
  // at phase 0 the bar lies N-S: N and S are swept, E and W are clear
  assert.equal(wheelSwept(w, 0, 3, 2), true, 'north swept');
  assert.equal(wheelSwept(w, 0, 3, 4), true, 'south swept');
  assert.equal(wheelSwept(w, 0, 4, 3), false, 'east clear');
  assert.equal(wheelSwept(w, 0, 2, 3), false, 'west clear');
  // half a turn later the pair swaps, because the bar is symmetric
  assert.equal(wheelSwept(w, w.period / 2, 3, 2), true);
  assert.equal(wheelSwept(w, w.period / 2, 4, 3), false);
  // a quarter turn: the other pair, and only that pair
  assert.equal(wheelSwept(w, w.period / 4, 4, 3), true);
  assert.equal(wheelSwept(w, w.period / 4, 3, 2), false);
});

test('wheel: a tile is never covered for longer than its sector', () => {
  const lv = parseLevel(base());
  const w = lv.wheels[0];
  const steps = 720;
  let covered = 0;
  for (let i = 0; i < steps; i++) {
    if (wheelSwept(w, (i / steps) * w.period, 3, 2)) covered++;
  }
  // each end passes the tile once per period: 2 * 2*ARM_HALF/2π of the time
  const expect = (2 * (2 * WHEEL_ARM_HALF)) / (2 * Math.PI);
  assert.ok(Math.abs(covered / steps - expect) < 0.01, `covered ${covered / steps}, expected ~${expect}`);
});

test('wheel: the fairness law guarantees TIMING_FLOOR of clearance', () => {
  const lv = parseLevel(base());
  assert.ok(wheelSafeWindow(lv.wheels[0]) >= TIMING_FLOOR);
  // and the law is enforced: a fast wheel is refused at parse time
  assert.throws(
    () => parseLevel(base({ wheels: [{ at: [3, 3], period: 2.5, phase: 0 }] })),
    /period must be a number in \[3, 10\]/,
  );
});

test('wheel: the gap clears the mini cube and catches the full one', () => {
  // the cube is one unit tall standing on a slab; mini is 0.55 (src/game.js)
  const MINI = 0.55;
  assert.ok(WHEEL_GAP > MINI, `gap ${WHEEL_GAP} must clear a ${MINI} mini cube`);
  assert.ok(WHEEL_GAP < 1.0, `gap ${WHEEL_GAP} must be low enough to catch a 1.0 cube`);
});

test('wheel: proofs may only plan the ring while mini; the sim allows both', () => {
  const lv = parseLevel(base());
  const below = lv.tiles.get(key(3, 5)); // shrink pad, one south of the ring
  const full = rollTargetsAt(lv, below, false).map((s) => key(s.to.x, s.to.z));
  const mini = rollTargetsAt(lv, below, true).map((s) => key(s.to.x, s.to.z));
  assert.equal(full.includes('3,4'), false, 'full size must not plan onto the ring');
  assert.equal(mini.includes('3,4'), true, 'mini must plan onto the ring');
  // the simulation still lets a full-size cube roll in — that is the dare
  assert.ok(resolveRollAt(lv, below, DIRS.up, false), 'the game must allow the doomed roll');
  assert.equal(wheelBlocksPlan(lv, lv.tiles.get(key(3, 4)), false), true);
  assert.equal(wheelBlocksPlan(lv, lv.tiles.get(key(3, 4)), true), false);
  assert.equal(wheelBlocksPlan(lv, lv.tiles.get(key(3, 5)), false), false, 'plain tiles are not blocked');
});

test('wheel: the safe route exists — mini through the ring', () => {
  const lv = parseLevel(base());
  assert.ok(shortestRoute(lv) > 0, 'a route must exist');
  assert.ok(reachable(lv).has(key(3, 0)), 'the goal must be reachable while ducking');
  assert.ok(canStillFinish(lv).has(key(3, 6)), 'the start must not be a soft lock');
});

test('wheel: the rescue bench never lands on a ring, and must be able to finish', () => {
  const lv = parseLevel(base());
  const bench = rescueTile(lv);
  if (bench) {
    assert.equal(lv.wheelCells.has(key(bench.x, bench.z)), false, 'bench on a ring');
    // and from the bench, at the FULL size the rescue restores, the goal must
    // still be reachable — otherwise the second chance is a dead end
    const seen = new Set();
    const queue = [{ tile: bench, mini: false }];
    let ok = false;
    while (queue.length && !ok) {
      const { tile, mini } = queue.shift();
      const sk = `${key(tile.x, tile.z)}|${mini}`;
      if (seen.has(sk)) continue;
      seen.add(sk);
      if (tile.x === 3 && tile.z === 0) { ok = true; break; }
      for (const s of rollTargetsAt(lv, tile, mini)) queue.push({ tile: s.to, mini: s.mini });
    }
    assert.equal(ok, true, 'bench cannot reach the goal at full size');
  }
});

test('wheel: parse laws — void hub, full ring, one height, a way to shrink', () => {
  // hub on a slab
  assert.throws(() => parseLevel(base({ map: map.map((r, i) => (i === 3 ? '0000000' : r)) })), /must be void/);
  // a missing ring tile
  const gap = map.map((r, i) => (i === 2 ? '000.000' : r));
  assert.throws(() => parseLevel(base({ map: gap })), /has no ring tile/);
  // a ring at two heights
  const split = map.map((r, i) => (i === 2 ? '0002000' : r)); // (3,2) at height 2
  assert.throws(() => parseLevel(base({ map: split })), /different heights/);
  // no way to be small
  assert.throws(() => parseLevel(base({ shrink: undefined })), /no way to shrink/);
  // a shard on the ring
  assert.throws(
    () => parseLevel(base({ shards: [[3, 4], [5, 3], [1, 5]] })),
    /wheel ring tile stacked on a shard/,
  );
  // a sentinel patrolling the ring
  assert.throws(
    () => parseLevel(base({ orbs: [{ path: [[3, 2], [3, 4]], speed: 2 }] })),
    /sentinel patrols the wheel ring/,
  );
});

test('wheel: a wind level never carries one', () => {
  assert.throws(
    () => parseLevel(base({ wind: { x: 1, z: 1 } })),
    /wind never shares a level with wheels/,
  );
});

test('wheel: every shipped wheel level has a proven safe route', () => {
  const wheelLevels = ALL_LEVELS.filter((d) => (d.wheels || []).length);
  assert.ok(wheelLevels.length >= 2, 'the mechanic must ship in real content');
  for (const def of wheelLevels) {
    const lv = parseLevel(def);
    assert.ok(lv.wheels.length > 0);
    assert.ok(shortestRoute(lv) > 0, `L${def.id} has no route`);
    assert.ok(reachable(lv).has(key(lv.goal.x, lv.goal.z)), `L${def.id} goal unreachable`);
    // the ring is only crossable small: the level must offer a shrink pad
    assert.ok([...lv.shrinkPads.values()].includes('shrink'), `L${def.id} has no shrink pad`);
  }
});
