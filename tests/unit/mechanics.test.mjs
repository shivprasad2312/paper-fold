// ---------------------------------------------------------------------------
// New mechanics: shuttle platforms, ice slides, spring pads.
//
// Rules-level contract: the resolved-roll model (one press → landing after
// slide/launch follow-through), shuttle ride edges in the route/search
// functions, and the spawn audit that keeps sentinels out of mechanic
// corridors. The game side (carry, launch animation) is covered by the
// live playable-route test, which plays every shuttle/ice/spring level.
// ---------------------------------------------------------------------------
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLevel,
  shortestRoute,
  reachable,
  canStillFinish,
  resolveRoll,
  shuttleRide,
  spawnProblems,
  candidateCrossings,
  fairCrossingGraph,
  DIRS,
} from '../../src/rules.js';

// --- shuttle ---------------------------------------------------------------
const shuttleDef = () => ({
  name: 'shuttle-test',
  map: [
    '11...11',
    '11...11',
    '11...11',
  ],
  start: [0, 0],
  goal: [6, 2],
  shuttles: [{ a: [2, 1], b: [4, 1], wait: 2 }],
});

test('shuttle docks are solid tiles flagged for the platform', () => {
  const level = parseLevel(shuttleDef());
  const dockA = level.tiles.get('2,1');
  const dockB = level.tiles.get('4,1');
  assert.ok(dockA.shuttle, 'dock a flagged');
  assert.ok(dockB.shuttle, 'dock b flagged');
  assert.equal(level.shuttles.length, 1);
  const sh = level.shuttles[0];
  assert.equal(sh.gap, 2);
  assert.equal(sh.wait, 2);
  assert.ok(sh.travel > 0);
});

test('shuttle ride edge connects the docks for route/search', () => {
  const level = parseLevel(shuttleDef());
  const dockA = level.tiles.get('2,1');
  const ride = shuttleRide(level, dockA);
  assert.equal(ride.x, 4);
  assert.equal(ride.z, 1);
  assert.ok(reachable(level).has('4,1'), 'far dock reachable via ride');
  assert.ok(reachable(level).has('6,2'), 'goal reachable via ride');
  const par = shortestRoute(level);
  assert.ok(par > 0, 'route exists');
  assert.ok(canStillFinish(level).has('2,1'), 'no soft-lock on the dock');
});

test('shuttle parse rejects a track crossing a slab', () => {
  assert.throws(
    () =>
      parseLevel({
        name: 'bad-track',
        map: ['11.11', '11...'],
        start: [0, 0],
        goal: [4, 0],
        shuttles: [{ a: [2, 0], b: [4, 0], wait: 2 }],
      }),
    /crosses a slab/,
  );
});

test('shuttle parse rejects a mismatch that no board roll can reach', () => {
  assert.throws(
    () =>
      parseLevel({
        name: 'bad-heights',
        map: ['1111....33', '1111....33', '1111....33'],
        start: [0, 0],
        goal: [9, 2],
        shuttles: [{ a: [4, 1], b: [8, 1], wait: 2 }],
      }),
    /shuttle/,
  );
});

test('shuttle spawn audit flags a sentinel in the transit corridor', () => {
  const level = parseLevel({
    name: 'orb-near-shuttle',
    map: [
      '111111111',
      '11.....11',
      '111111111',
    ],
    start: [0, 1],
    goal: [8, 1],
    shuttles: [{ a: [2, 1], b: [6, 1], wait: 2 }],
    orbs: [{ path: [[3, 0], [5, 0]], speed: 1 }],
  });
  assert.ok(spawnProblems(level).some((p) => p.includes('shuttle')));
});

// --- ice -------------------------------------------------------------------
const iceDef = () => ({
  name: 'ice-test',
  map: ['11111'],
  start: [0, 0],
  goal: [4, 0],
  ice: [[2, 0], [3, 0]],
});

test('a press onto ice rides the whole run and stops at the first non-ice', () => {
  const level = parseLevel(iceDef());
  const from = level.tiles.get('1,0');
  const to = resolveRoll(level, from, DIRS.right);
  assert.equal(to.x, 4, 'slide carries through both ice tiles');
  assert.equal(to.z, 0);
});

test('ice slide is one press (par counts the press, not the tiles)', () => {
  const level = parseLevel(iceDef());
  assert.equal(shortestRoute(level), 2, '(0,0)→(1,0)→slide→(4,0)');
});

test('ice slide refuses to continue over the edge or a step too high', () => {
  const level = parseLevel({
    name: 'ice-stop',
    map: ['111..', '....1', '.....'],
    start: [0, 0],
    goal: [4, 1],
    ice: [[1, 0]],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  // 0,0 → 1,0 (ice) → 2,0 (non-ice, stops)
  assert.equal(to.x, 2);
  assert.equal(to.z, 0);
});

// --- springs ---------------------------------------------------------------
test('a spring on the departure tile launches over a void pit', () => {
  const level = parseLevel({
    name: 'spring-pit',
    map: ['1..1'],
    start: [0, 0],
    goal: [3, 0],
    springs: [[0, 0]],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.equal(to.x, 3, 'launches over the 2-tile gap');
  assert.equal(shortestRoute(level), 1, 'the launch is a single press');
});

test('a spring with no slab within 3 tiles is a fall', () => {
  const level = parseLevel({
    name: 'spring-void',
    map: ['1..'],
    start: [0, 0],
    goal: [0, 0],
    springs: [[0, 0]],
  });
  assert.equal(resolveRoll(level, level.tiles.get('0,0'), DIRS.right), null);
});

test('a spring landing on ice continues the slide (combo)', () => {
  const level = parseLevel({
    name: 'spring-ice',
    map: ['1..11'],
    start: [0, 0],
    goal: [4, 0],
    springs: [[0, 0]],
    ice: [[3, 0]],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.equal(to.x, 4, 'spring lands on ice, slide carries one more');
});

test('crossing candidates never revisit a line tile within one path', () => {
  // a 4-tile line: the old BFS could emit back-and-forth candidates like
  // a→b→a→b, whose reconstruction turns into multi-tile "presses"
  const level = parseLevel({
    name: 'revisit-crossing',
    map: [
      '11111',
      '.....',
      '11111',
    ],
    start: [0, 2],
    goal: [4, 2],
    orbs: [{ path: [[0, 0], [4, 0]], speed: 1 }],
  });
  for (const c of candidateCrossings(level)) {
    const seen = new Set();
    for (const t of c.seq) {
      const k = t.x + ',' + t.z;
      assert.ok(!seen.has(k), `candidate revisits ${k}: ${JSON.stringify(c)}`);
      seen.add(k);
    }
    // entry and exit must differ and sit adjacent to the path ends
    assert.ok(
      !(c.entry.x === c.exit.x && c.entry.z === c.exit.z),
      'entry === exit',
    );
  }
  // and the graph edges carry the same property
  const g = fairCrossingGraph(level);
  for (const [, edges] of g.edges) {
    for (const e of edges) {
      const seen = new Set();
      for (const t of e.seq) {
        const k = t.x + ',' + t.z;
        assert.ok(!seen.has(k), `edge revisits ${k}`);
        seen.add(k);
      }
    }
  }
});

test('a spring landing on a too-steep wall is a fall', () => {
  const level = parseLevel({
    name: 'spring-cliff',
    map: ['1..5'],
    start: [0, 0],
    goal: [3, 0],
    springs: [[0, 0]],
  });
  // the first slab in range is a wall 4 above the pad — beyond launch height
  assert.equal(resolveRoll(level, level.tiles.get('0,0'), DIRS.right), null);
});

// --- conveyors (M3 wave-1) ---------------------------------------------------
test('a press onto a belt is carried in the BELT direction, not the press direction', () => {
  const level = parseLevel({
    name: 'belt-turn',
    map: [
      '111',
      '111',
      '111',
    ],
    start: [0, 0],
    goal: [2, 2],
    conveyors: [[1, 0, 0, 1], [1, 1, 0, 1]],
  });
  // press right from start lands on belt (1,0); the belt carries south
  // through (1,1) and rests on plain (1,2)
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.deepEqual([to.x, to.z], [1, 2], 'belt redirected the press south');
  assert.equal(shortestRoute(level), 2, 'the whole belt ride is one press');
});

test('a belt blocked by a wall or the void leaves the cube resting on the belt', () => {
  const level = parseLevel({
    name: 'belt-blocked',
    map: ['111'],
    start: [0, 0],
    goal: [2, 0],
    conveyors: [[1, 0, 0, -1]],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.deepEqual([to.x, to.z], [1, 0], 'belt points off the map: cube stays on the belt');
});

test('a belt can carry the cube across a span a plain roll cannot stop on', () => {
  const level = parseLevel({
    name: 'belt-span',
    map: ['11111'],
    start: [0, 0],
    goal: [4, 0],
    conveyors: [[1, 0, 1, 0], [2, 0, 1, 0], [3, 0, 1, 0]],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.equal(to.x, 4, 'chained belts carry to the goal tile in one press');
  assert.equal(shortestRoute(level), 1);
});

test('belt → ice hands over: the slide continues in the belt direction', () => {
  const level = parseLevel({
    name: 'belt-ice',
    map: [
      '1111',
      '1111',
    ],
    start: [0, 0],
    goal: [3, 1],
    conveyors: [[1, 0, 0, 1]],
    ice: [[1, 1], [2, 1]],
  });
  // press right onto belt (1,0) → carried south onto ice (1,1) → slide
  // continues SOUTH (belt dir), step (1,2) is off-map, so it rests on ice
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.deepEqual([to.x, to.z], [1, 1], 'ice after a belt slides the belt way and stops at the edge');
});

test('belt → spring fires the launch in the belt direction', () => {
  const level = parseLevel({
    name: 'belt-spring',
    map: ['111.1'],
    start: [0, 0],
    goal: [4, 0],
    conveyors: [[1, 0, 1, 0]],
    springs: [[2, 0]],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.equal(to.x, 4, 'belt carried onto the pad; the pad launched over the pit');
});

test('conveyor parse rejects cycles, start/goal belts and stacked mechanics', () => {
  assert.throws(
    () => parseLevel({
      name: 'belt-cycle',
      map: ['111', '111', '111'],
      start: [0, 0],
      goal: [0, 2],
      conveyors: [[2, 0, 0, 1], [2, 1, -1, 0], [1, 1, 0, -1], [1, 0, 1, 0]],
    }),
    /conveyor cycle/,
  );
  assert.throws(
    () => parseLevel({
      name: 'belt-start',
      map: ['11'],
      start: [0, 0],
      goal: [1, 0],
      conveyors: [[0, 0, 1, 0]],
    }),
    /start tile/,
  );
  assert.throws(
    () => parseLevel({
      name: 'belt-on-ice',
      map: ['111'],
      start: [0, 0],
      goal: [2, 0],
      ice: [[1, 0]],
      conveyors: [[1, 0, 1, 0]],
    }),
    /conveyor on ice/,
  );
});

test('conveyor spawn audit flags a belt carrying through sentinel clearance', () => {
  const level = parseLevel({
    name: 'belt-near-orb',
    map: [
      '11111',
      '11111',
      '11111',
    ],
    start: [0, 2],
    goal: [4, 2],
    conveyors: [[1, 1, 1, 0], [2, 1, 1, 0]],
    orbs: [{ path: [[3, 0], [4, 0]], speed: 1 }],
  });
  const probs = spawnProblems(level);
  assert.ok(probs.some((p) => p.includes('conveyor')), 'belt corridor flagged');
});

test('spring/ice spawn audit flags a sentinel in the corridor', () => {
  const level = parseLevel({
    name: 'spring-near-orb',
    map: [
      '1..11',
      '11111',
      '11111',
    ],
    start: [0, 0],
    goal: [4, 0],
    springs: [[0, 0]],
    ice: [[1, 2]],
    orbs: [{ path: [[2, 1], [4, 1]], speed: 1 }],
  });
  const probs = spawnProblems(level);
  assert.ok(probs.some((p) => p.includes('spring')), 'spring corridor flagged');
  assert.ok(probs.some((p) => p.includes('ice')), 'ice corridor flagged');
});
