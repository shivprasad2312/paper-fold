// ---------------------------------------------------------------------------
// Unit tests — the free-path law (ADR-051)
//
// "At least one path exists" has a mirror: the path must be EARNED. A level
// whose obstacles can all be walked around — never landing on a single
// mechanic tile, at par or within a few rolls of it — ships decoration,
// not obstacles. What must hold:
//
//   · ENGAGEMENT is the game's own inventory: hazard tiles, patrol LINES
//     (whole segments, not just waypoints — the first audit draft marked
//     endpoints only and accused 30 levels falsely), movement-kit tiles,
//     gates, size decisions. Shards never count (they are the detour,
//     not the toll);
//   · the LAW: no mechanic-free route, or one costing > FREE_PATH_SLACK
//     beyond par. A costly detour is a legitimate route choice; a cheap
//     one is a bypass;
//   · EXEMPTIONS are structural, not discretionary: wind levels (the
//     breeze touches every tile) and boards with no mechanics at all;
//   · the ENGINE never lies about par: a free route is a route, so it can
//     never be shorter than par — checked over the whole catalogue.
// ---------------------------------------------------------------------------
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLevel, key, shortestRoute, mechanicTiles, freeRouteLength,
  freePathProblems, FREE_PATH_SLACK,
} from '../../src/rules.js';
import { LEVELS, ALL_LEVELS } from '../../src/levels.js';

const plate = (w, h) => Array(h).fill('0'.repeat(w));
const base = (extra = {}) => ({
  id: 999, name: 'Free Path Test',
  map: plate(9, 7),
  start: [0, 3], goal: [8, 3],
  shards: [[1, 1], [7, 1], [1, 5]],
  ...extra,
});

test('free path: engagement is the whole mechanic inventory, patrol lines included', () => {
  const lv = parseLevel(base({
    crumble: [[2, 3]],
    orbs: [{ path: [[4, 1], [4, 5]], speed: 2 }],
    shrink: [[6, 5]],
    low: [[6, 3]],
  }));
  const mech = mechanicTiles(lv);
  assert.ok(mech.has(key(2, 3)), 'crumble tile engages');
  // the whole segment (4,1)..(4,5), not just the two waypoints
  for (let z = 1; z <= 5; z++) assert.ok(mech.has(key(4, z)), `patrol tile 4,${z} engages`);
  assert.ok(mech.has(key(6, 5)), 'shrink pad engages (a size decision)');
  assert.ok(!mech.has(key(0, 3)), 'start never engages');
  assert.ok(!mech.has(key(8, 3)), 'goal never engages');
  assert.ok(!mech.has(key(1, 1)), 'a shard is a detour, not a toll');
  assert.ok(!mech.has(key(3, 3)), 'plain floor does not engage');
});

test('free path: an open board with no mechanics is exempt (teach boards)', () => {
  const lv = parseLevel(base());
  assert.equal(mechanicTiles(lv).size, 0);
  assert.equal(freeRouteLength(lv), shortestRoute(lv));
  assert.deepEqual(freePathProblems(lv), []);
});

test('free path: walking around everything AT PAR breaks the law', () => {
  // a two-tile patrol stub in the north — the direct route never meets it
  const lv = parseLevel(base({ orbs: [{ path: [[4, 0], [4, 1]], speed: 2 }] }));
  assert.equal(freeRouteLength(lv), shortestRoute(lv));
  const problems = freePathProblems(lv);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /obstacle-free route of 8 rolls vs par 8/);
});

test('free path: a patrol line across the only crossing covers the level', () => {
  const lv = parseLevel(base({ orbs: [{ path: [[4, 0], [4, 6]], speed: 2 }] }));
  assert.equal(freeRouteLength(lv), -1, 'every route must cross the line');
  assert.deepEqual(freePathProblems(lv), []);
});

test('free path: a detour beyond the slack is a route choice, not a bypass', () => {
  const lv = parseLevel(base({
    map: [
      '0000000000000',
      '0000000000000',
      '0000000000000',
      '0000000000000',
      '0.....0.....0',
      '0000000000000',
      '0000000000000',
      '0000000000000',
      '0000000000000',
    ],
    start: [6, 8], goal: [6, 0],
    shards: [[1, 1], [11, 1], [6, 2]],
    crumble: [[6, 4]],
  }));
  // par crosses the crumble bridge (8); the free way round the moat is 20
  assert.equal(shortestRoute(lv), 8);
  assert.equal(freeRouteLength(lv), 20);
  assert.ok(freeRouteLength(lv) - shortestRoute(lv) > FREE_PATH_SLACK);
  assert.deepEqual(freePathProblems(lv), []);
});

test('free path: a detour inside the slack is a bypass', () => {
  const lv = parseLevel(base({
    map: [
      '00000',
      '00000',
      '00000',
      '0.0.0',
      '00000',
      '00000',
      '00000',
    ],
    start: [2, 6], goal: [2, 0],
    shards: [[0, 1], [4, 1], [2, 1]],
    crumble: [[2, 3]],
  }));
  assert.equal(shortestRoute(lv), 6);
  assert.equal(freeRouteLength(lv), 10); // round either edge: +4
  assert.equal(freePathProblems(lv).length, 1);
});

test('free path: wind levels are exempt — the breeze is on every tile', () => {
  const lv = parseLevel(base({
    wind: { x: 1, z: 1 },
    ice: [[4, 0], [4, 1]],
  }));
  assert.ok(mechanicTiles(lv).size > 0, 'the ice still counts as a mechanic');
  assert.equal(freeRouteLength(lv), shortestRoute(lv), 'a free route exists…');
  assert.deepEqual(freePathProblems(lv), [], '…but the wind exempts the level');
});

test('free path: a sealed gate can never be bypassed — the key is the toll', () => {
  const lv = parseLevel(base({ key: [4, 3] }));
  assert.equal(freeRouteLength(lv), -1, 'the key tile is a mechanic tile: fetching it IS engaging');
  assert.deepEqual(freePathProblems(lv), []);
});

test('free path: the shipped catalogue obeys the engine (and the wheel levels comply)', () => {
  for (const def of ALL_LEVELS) {
    const lv = parseLevel(def);
    const par = shortestRoute(lv);
    const free = freeRouteLength(lv);
    // a free route is a route: it can never beat par
    assert.ok(free === -1 || free >= par, `L${def.id}: free ${free} < par ${par}?!`);
    // the law is exactly "no free route, or a costly one"
    const problems = freePathProblems(lv, par);
    const expect = !lv.wind && mechanicTiles(lv).size > 0 && free >= 0 && free - par <= FREE_PATH_SLACK;
    assert.equal(problems.length > 0, expect, `L${def.id}: law verdict mismatch`);
  }
  // the two hand-built wheel boards: every route ducks under an arm
  for (const id of [192, 196]) {
    const lv = parseLevel(LEVELS.find((d) => d.id === id));
    assert.equal(freeRouteLength(lv), -1, `L${id} must be covered`);
  }
});
