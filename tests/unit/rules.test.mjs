// Unit tests — rules.js (the pure, deterministic core of the game).
// Run: npm run test:unit  (node --test tests/unit/)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLevel,
  checkRoll,
  legalNeighbours,
  reachable,
  canStillFinish,
  shortestRoute,
  solveHazards,
  sentinelClearance,
  spawnProblems,
  canPushBlock,
  sliderUp,
  windTarget,
  windLockProblems,
  rescueTile,
  key,
  MAX_DROP,
  MAX_CLIMB,
} from '../../src/rules.js';

const def = (over = {}) => ({
  name: 'unit',
  map: ['111'],
  start: [0, 0],
  goal: [2, 0],
  shards: [],
  ...over,
});

const tile = (level, x, z) => level.tiles.get(key(x, z));

test('parseLevel: parses heights and void from the map', () => {
  const level = parseLevel(def({ map: ['21.0'], goal: [3, 0] }));
  assert.equal(level.tiles.size, 3); // slab, slab, void at 2,0
  assert.equal(tile(level, 0, 0).h, 2);
  assert.equal(tile(level, 2, 0), undefined);
  assert.equal(tile(level, 3, 0).h, 0);
  assert.equal(level.width, 4);
  assert.equal(level.depth, 1);
});

test('parseLevel: rejects start/goal/shard off the slabs (fail at parse, not in a level)', () => {
  assert.throws(() => parseLevel(def({ goal: [1, 1] })), /goal/);
  assert.throws(() => parseLevel(def({ map: ['1.1'], goal: [1, 0] })), /goal/);
  assert.throws(() => parseLevel(def({ shards: [[1, 1]] })), /shard/);
  assert.throws(() => parseLevel(def({ blocks: [[0, 0]] })), /block on the start tile/);
  assert.throws(() => parseLevel(def({ key: [2, 0] })), /key sits on the goal/);
  // a key ON the start tile is parse-legal but flagged by spawnProblems
  // (defense in depth: parse catches data errors, the audit catches design)
  const keyStart = parseLevel(def({ key: [0, 0] }));
  assert.ok(spawnProblems(keyStart).some((p) => p.includes('key on start')));
});

test('parseLevel: crumble flags, blocks, sliders, nudge all land', () => {
  const level = parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      crumble: [[2, 0]],
      blocks: [[3, 0]],
      nudge: 1,
      sliders: [{ tiles: [[1, 0]], period: 3, phase: 0 }],
    }),
  );
  assert.equal(tile(level, 2, 0).crumble, true);
  assert.equal(level.blocks.length, 1);
  assert.equal(level.nudge, 1);
  assert.equal(level.sliderTiles.has(key(1, 0)), true);
});

test('checkRoll: the roll law (drop ≤ 2, climb ≤ 1, no void)', () => {
  const level = parseLevel(def({ map: ['01234'], goal: [4, 0] }));
  const a = tile(level, 0, 0);
  assert.equal(checkRoll(level, a, tile(level, 1, 0)).ok, true); // climb 1
  assert.equal(checkRoll(level, a, tile(level, 2, 0)).ok, false); // climb 2
  assert.equal(checkRoll(level, tile(level, 4, 0), tile(level, 3, 0)).ok, true); // drop 1
  assert.equal(checkRoll(level, tile(level, 4, 0), tile(level, 2, 0)).ok, true); // drop 2
  assert.equal(checkRoll(level, tile(level, 4, 0), tile(level, 0, 0)).ok, false); // drop 4
  // (checkRoll is the height law only — adjacency is enforced by
  //  legalNeighbours, which the test below covers)
  // a row stepping down one height per tile: drops of 1 and 2 are legal, 3 is not
  const steps = parseLevel(def({ map: ['43210'], goal: [4, 0] }));
  assert.equal(checkRoll(steps, tile(steps, 0, 0), tile(steps, 1, 0)).ok, true); // drop 1
  assert.equal(checkRoll(steps, tile(steps, 0, 0), tile(steps, 2, 0)).ok, true); // drop 2
  assert.equal(checkRoll(steps, tile(steps, 0, 0), tile(steps, 3, 0)).ok, false); // drop 3
  assert.equal(MAX_DROP, 2);
  assert.equal(MAX_CLIMB, 1);
});

test('sliderUp: 55% duty cycle, per-group period/phase', () => {
  const level = parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      sliders: [{ tiles: [[2, 0]], period: 4, phase: 0 }],
    }),
  );
  assert.equal(sliderUp(level, 0, 2, 0), true, 't=0 is up');
  assert.equal(sliderUp(level, 2, 2, 0), true, 'mid-up (50% < 55%)');
  assert.equal(sliderUp(level, 2.2, 2, 0), false, '55% in → sinking');
  assert.equal(sliderUp(level, 4, 2, 0), true, 'full period → up again');
  assert.equal(sliderUp(level, 1, 3, 0), true, 'non-slider tile is always solid');
  // phase shifts the window
  const ph = parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      sliders: [{ tiles: [[2, 0]], period: 4, phase: 0.8 }],
    }),
  );
  assert.equal(sliderUp(ph, 0, 2, 0), false, 'phase 0.8 starts in the sink window');
  assert.equal(sliderUp(ph, 1.2, 2, 0), true, '…and rises again after the window');
});

test('sliders (ADR-038): a rigid bridge must be flat, joined and crossable', () => {
  // one group, one height, contiguous — the shipped law
  const ok = parseLevel(
    def({ map: ['11111'], goal: [4, 0], sliders: [{ tiles: [[1, 0], [2, 0], [3, 0]], period: 3.2 }] }),
  );
  assert.equal(ok.sliders.length, 1);
  assert.equal(ok.sliders[0].h, 1); // the map digit IS the bridge height
  assert.equal(ok.sliders[0].period, 3.2);
  assert.equal(ok.sliders[0].phase, 0);
  assert.equal(ok.sliders[0].tileSet.size, 3);
  // a bridge may not step height mid-span
  assert.throws(
    () => parseLevel(def({ map: ['1211'], goal: [3, 0], sliders: [{ tiles: [[1, 0], [2, 0]] }] })),
    /not at the bridge height/,
  );
  // …nor leave an island behind
  assert.throws(
    () => parseLevel(def({ map: ['11111'], goal: [4, 0], sliders: [{ tiles: [[0, 0], [3, 0]] }] })),
    /is not joined to the bridge/,
  );
  // period/phase bands
  assert.throws(() => parseLevel(def({ map: ['111'], goal: [2, 0], sliders: [{ tiles: [[1, 0]], period: 2 }] })), /period/);
  assert.throws(() => parseLevel(def({ map: ['111'], goal: [2, 0], sliders: [{ tiles: [[1, 0]], period: 9 }] })), /period/);
  assert.throws(() => parseLevel(def({ map: ['111'], goal: [2, 0], sliders: [{ tiles: [[1, 0]], phase: 1 }] })), /phase/);
});

test('sliders (ADR-038): a span must fit inside the up window', () => {
  // 3 tiles at the minimum period: 3 rolls + the reaction floor still fit
  assert.doesNotThrow(() =>
    parseLevel(def({ map: ['11111'], goal: [4, 0], sliders: [{ tiles: [[1, 0], [2, 0], [3, 0]], period: 2.4 }] })),
  );
  // 4 tiles at the minimum period do not — widen the period or lose a tile
  assert.throws(
    () => parseLevel(def({ map: ['111111'], goal: [5, 0], sliders: [{ tiles: [[1, 0], [2, 0], [3, 0], [4, 0]], period: 2.4 }] })),
    /needs .*s to cross but the bridge is up only/,
  );
  assert.doesNotThrow(() =>
    parseLevel(def({ map: ['111111'], goal: [5, 0], sliders: [{ tiles: [[1, 0], [2, 0], [3, 0], [4, 0]], period: 3.2 }] })),
  );
});

test('sliders (ADR-038): a bridge tile carries nothing and benches nobody', () => {
  assert.throws(
    () => parseLevel(def({ map: ['11111'], goal: [4, 0], sliders: [{ tiles: [[2, 0]] }], shards: [[2, 0]] })),
    /sliding bridge under a shard/,
  );
  assert.throws(
    () => parseLevel(def({ map: ['11111'], goal: [4, 0], sliders: [{ tiles: [[2, 0]] }], freeze: [[2, 0]] })),
    /stacked on another mechanic/,
  );
  const lvl = parseLevel(def({ map: ['11111'], goal: [4, 0], sliders: [{ tiles: [[2, 0]] }] }));
  assert.notEqual(rescueTile(lvl), key(2, 0), 'the rescue bench never sits on a sinking bridge');
});

test('windTarget (ADR-039): the breeze carries level or down, never up', () => {
  const flat = parseLevel(
    def({ map: ['111', '111'], start: [0, 0], goal: [2, 0], wind: { x: 1, z: 1 } }),
  );
  assert.equal(key(...Object.values(windTarget(flat, tile(flat, 0, 0))).slice(0, 2)), key(1, 1), 'flat step is a drift');
  // a climb is refused: the breeze carries, it never lifts
  const up = parseLevel(def({ map: ['11', '12'], start: [0, 0], goal: [1, 0], wind: { x: 1, z: 1 } }));
  assert.equal(windTarget(up, tile(up, 0, 0)), null, 'no drift uphill');
  // a drop of 2 is a drift; a drop of 3 is a fall the breeze will not do
  const d2 = parseLevel(def({ map: ['20', '11'], start: [0, 0], goal: [1, 0], wind: { x: 1, z: 1 } }));
  assert.ok(windTarget(d2, tile(d2, 0, 0)), 'drop 2 is carried');
  const d3 = parseLevel(def({ map: ['41', '11'], start: [0, 0], goal: [1, 0], wind: { x: 1, z: 1 } }));
  assert.equal(windTarget(d3, tile(d3, 0, 0)), null, 'drop 3 is not carried');
  // a low tunnel admits only the mini cube
  const low = parseLevel({
    name: 'unit', map: ['111', '111'], start: [0, 0], goal: [2, 0], shards: [],
    shrink: [[0, 1]], grow: [[2, 1]], low: [[1, 1]], wind: { x: 1, z: 1 },
  });
  assert.equal(windTarget(low, tile(low, 0, 0)), null, 'full size cannot be blown into a tunnel');
  assert.ok(windTarget(low, tile(low, 0, 0), { mini: true }), 'the mini cube can');
});

test('wind (ADR-039): the breeze never shares a level with a waiting mechanic', () => {
  const base = { name: 'unit', map: ['111', '111'], start: [0, 0], goal: [2, 0], shards: [], wind: { x: 1, z: 1 } };
  assert.doesNotThrow(() => parseLevel(base));
  for (const [over, what] of [
    [{ orbs: [{ path: [[1, 0], [1, 1]], speed: 2 }] }, /sentinels/],
    [{ crumble: [[1, 0]] }, /crumble/],
    [{ blocks: [[1, 0]] }, /blocks/],
    [{ key: [1, 1] }, /sealed gate/],
    [{ freeze: [[1, 0]] }, /freeze|sentinels/],
  ]) {
    assert.throws(() => parseLevel({ ...base, ...over }), what);
  }
});

test('windLockProblems (ADR-039): a drift into a dead pocket is a trap', () => {
  // the breeze drops the cube from (1,0) into an h0 pit walled by h2 —
  // it can never climb out, so thinking on the route is a lock
  const trap = parseLevel({
    name: 'unit', map: ['2222', '2202'], start: [0, 0], goal: [3, 0], shards: [],
    wind: { x: 1, z: 1 },
  });
  const problems = windLockProblems(trap);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /breeze carries the cube from 1,0 to 2,1/);
  // make the pit floor walkable and the same breeze is harmless
  const safe = parseLevel({
    name: 'unit', map: ['2222', '2222'], start: [0, 0], goal: [3, 0], shards: [],
    wind: { x: 1, z: 1 },
  });
  assert.deepEqual(windLockProblems(safe), []);
  // a level without wind can never have a wind lock
  assert.deepEqual(windLockProblems(parseLevel(def({ map: ['111'], goal: [2, 0] }))), []);
});

test('canPushBlock: blocks only slide onto plain slabs', () => {
  const base = (over = {}) => parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      blocks: [[1, 0]],
      nudge: 3,
      ...over,
    }),
  );
  const lvl = base();
  assert.equal(canPushBlock(lvl, lvl.blocks[0], 1, 0), true, 'onto a plain slab');
  const voided = base({ map: ['11.11'], blocks: [[1, 0]] });
  assert.equal(canPushBlock(voided, voided.blocks[0], 1, 0), false, 'into the void');
  assert.equal(canPushBlock(voided, { x: 3, z: 0, heavy: false }, 1, 0), false, 'never onto the goal');
  const c = base({ crumble: [[2, 0]] });
  assert.equal(canPushBlock(c, c.blocks[0], 1, 0), false, 'never onto a crumble slab');
  const s = base({ sliders: [{ tiles: [[2, 0]], period: 3 }] });
  assert.equal(canPushBlock(s, s.blocks[0], 1, 0), false, 'never onto a slider tile');
  const k = base({ key: [2, 0] });
  assert.equal(canPushBlock(k, k.blocks[0], 1, 0), false, 'never onto the key');
  const two = base({ blocks: [[1, 0], [2, 0]] });
  assert.equal(canPushBlock(two, two.blocks[0], 1, 0), false, 'never onto another block');
});

test('legalNeighbours: honours the roll law from a tile', () => {
  const level = parseLevel(def({ map: ['012'] }));
  const ns = legalNeighbours(level, tile(level, 0, 0));
  assert.equal(ns.length, 1); // only up to h1 (climb 1); h2 is climb 2
  assert.deepEqual(ns[0].to, tile(level, 1, 0));
});

test('shortestRoute: BFS distance is the par (unit weights)', () => {
  const level = parseLevel(def({ map: ['11111'], goal: [4, 0] }));
  assert.equal(shortestRoute(level), 4); // straight line
  const l2 = parseLevel(def({ map: ['1.1', '111'], start: [0, 0], goal: [2, 0] }));
  assert.equal(shortestRoute(l2), 4); // must detour under the void
  const l3 = parseLevel(def({ map: ['111'], goal: [1, 0] }));
  assert.equal(shortestRoute(l3), 1); // adjacent
});

test('soft-lock proof: reachable ∖ canStillFinish = dead-end tiles', () => {
  // A 3-wide h0 floor inside a ring of h2: you can fall in (drop 2) but
  // never climb out (climb 2) — a textbook soft-lock pocket.
  const level = parseLevel(
    def({
      map: ['22222', '20002', '22222'],
      start: [0, 0],
      goal: [4, 0],
    }),
  );
  const reach = reachable(level);
  const finish = canStillFinish(level);
  for (const x of [1, 2, 3]) {
    const k = key(x, 1);
    assert.ok(reach.has(k), `pocket ${x},1 must be reachable`);
    assert.ok(!finish.has(k), `pocket ${x},1 must NOT be able to finish`);
  }
  assert.ok(finish.has(key(4, 0)), 'goal can finish');
});

test('solveHazards: push economy (nudge budget is the level economy)', () => {
  // Two-lane corridor sealed by one block in each lane.
  const d = (nudge) => def({
    map: ['1111', '1111'],
    start: [0, 0],
    goal: [3, 1],
    blocks: [[1, 0], [1, 1]],
    nudge,
  });
  assert.equal(solveHazards(parseLevel(d(0))).ok, false, 'no nudges → sealed');
  assert.equal(solveHazards(parseLevel(d(1))).ok, false, 'one nudge → one lane left sealed');
  assert.equal(solveHazards(parseLevel(d(2))).ok, true, 'two nudges → both lanes open');
});

test('solveHazards: crumble slabs break when left — single forced crossings survive', () => {
  // The crumble slab at (1,1) is the ONLY connection between the two sides:
  // (1,0) and (1,2) are void, so any route must step on it exactly once.
  const forced = def({
    map: ['1.1', '111', '1.1'],
    start: [0, 0],
    goal: [2, 2],
    crumble: [[1, 1]],
  });
  assert.equal(solveHazards(parseLevel(forced)).ok, true, 'one forced crossing survives');

  // Goal ON the crumble slab: winning happens on arrival, before the slab
  // would break on leaving — still solvable.
  const goalOnCrumble = def({
    map: ['1.1', '111', '1.1'],
    start: [0, 0],
    goal: [1, 1],
    crumble: [[1, 1]],
  });
  assert.equal(solveHazards(parseLevel(goalOnCrumble)).ok, true);

  // Note: a "must cross the same crumble slab twice" layout is not a real
  // failure mode here — a roll graph is effectively undirected for the
  // re-entry question (a tile's exits depend only on its own height and
  // its neighbours' heights, not on entry direction), and crumble breakage
  // is monotone, so re-entering a broken slab can only remove options.
  // The nudge test above covers the solver's negative path.
});

test('sentinelClearance: Chebyshev distance to the nearest patrol point', () => {
  const level = parseLevel(
    def({
      map: ['11111'],
      orbs: [{ path: [[2, 0], [3, 0]], speed: 1 }],
    }),
  );
  assert.equal(sentinelClearance(level, tile(level, 2, 0)), 0); // on the path
  assert.equal(sentinelClearance(level, tile(level, 0, 0)), 2);
});

test('spawnProblems: the Fault Line bug-class (orb spawns on start/goal)', () => {
  const bad = parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      orbs: [{ path: [[0, 0], [1, 0], [2, 0]], speed: 1 }], // spawns on start
    }),
  );
  assert.ok(spawnProblems(bad).some((p) => p.includes('spawns on the player spawn tile')));

  const badGoal = parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      orbs: [{ path: [[4, 0], [3, 0], [2, 0]], speed: 1 }], // spawns on goal
    }),
  );
  assert.ok(spawnProblems(badGoal).some((p) => p.includes('spawns on the goal tile')));

  const good = parseLevel(
    def({
      map: ['11111'],
      goal: [4, 0],
      orbs: [{ path: [[2, 0], [3, 0], [4, 0], [2, 0]], speed: 1 }], // may cross, not spawn
    }),
  );
  assert.deepEqual(spawnProblems(good), []);
});

test('spawnProblems: crumble start, shard-on-start, orb-over-void', () => {
  assert.ok(
    spawnProblems(parseLevel(def({ map: ['111'], crumble: [[0, 0]] }))).some((p) =>
      p.includes('crumble'),
    ),
  );
  assert.ok(
    spawnProblems(parseLevel(def({ shards: [[0, 0]] }))).some((p) => p.includes('shard on start')),
  );
  assert.ok(
    spawnProblems(parseLevel(def({ orbs: [{ path: [[1, 0], [1, 5]], speed: 1 }] }))).some((p) =>
      p.includes('not a slab'),
    ),
  );
});
