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
  canPushBlock,
  checkRoll,
  solveHazards,
  timingProblems,
  pulseUp,
  PULSE_PERIOD,
  DIRS,
  resolveRollAt,
  sizeAfter,
  rescueTile,
  pistonExtended,
  PISTON_PERIOD,
  PISTON_EXTENDED_FROM,
  turntablePhase,
  turntableAxis,
  turntableSolid,
  TURNTABLE_PERIOD,
  mechanicTargets,
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

test('twin shuttle: a second platform is a view/game fact, proofs see one shuttle', () => {
  const single = parseLevel(shuttleDef());
  assert.equal(single.shuttles[0].twin, false, 'twin defaults off');
  const twinDef = shuttleDef();
  twinDef.shuttles[0].twin = true;
  const twin = parseLevel(twinDef);
  assert.equal(twin.shuttles[0].twin, true, 'twin parsed');
  assert.equal(twin.shuttles.length, 1, 'still ONE logical shuttle');
  // the proof model is unchanged: same route, same audits, same docks
  assert.equal(shortestRoute(twin), shortestRoute(single), 'same par');
  assert.deepEqual(spawnProblems(twin), spawnProblems(single), 'same spawn audit');
  assert.deepEqual(timingProblems(twin), timingProblems(single), 'same timing audit');
  assert.ok(reachable(twin).has('6,2'), 'goal still reachable via the ride');
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

// --- sentinel-freeze shards (M3 wave-1) -------------------------------------
// A sentinel line the cube must WALK ALONG to cross (4 line tiles) — at
// speed 2.4 its natural safe window is 0, so only a freeze can open it.
const freezeGeo = (freeze, speed = 2.4) => ({
  name: 'freeze-geo',
  map: ['....1', '11111', '11...', '1....', '1....', '1....', '1....'],
  start: [0, 6],
  goal: [4, 0],
  orbs: [{ path: [[0, 1], [4, 1]], speed }],
  ...(freeze ? { freeze } : {}),
});

test('freeze shards parse as flagged pickups with a registry', () => {
  const level = parseLevel({
    name: 'freeze-basic',
    map: ['11111'],
    start: [0, 0],
    goal: [4, 0],
    freeze: [[2, 0]],
  });
  assert.ok(level.tiles.get('2,0').freeze, 'flag on the tile');
  assert.ok(level.freezeTiles.has('2,0'), 'registry');
  assert.equal(level.freezes.length, 1);
});

test('freeze parse rejects stacked pickups and start/goal placement', () => {
  assert.throws(
    () => parseLevel({ name: 'freeze-ice', map: ['111'], start: [0, 0], goal: [2, 0], ice: [[1, 0]], freeze: [[1, 0]] }),
    /another mechanic/,
  );
  assert.throws(
    () => parseLevel({ name: 'freeze-start', map: ['111'], start: [0, 0], goal: [2, 0], freeze: [[0, 0]] }),
    /start tile/,
  );
  assert.throws(
    () => parseLevel({ name: 'freeze-shard', map: ['111'], start: [0, 0], goal: [2, 0], shards: [[1, 0]], freeze: [[1, 0]] }),
    /stacked on a shard/,
  );
  assert.throws(
    () => parseLevel({ name: 'freeze-block', map: ['111'], start: [0, 0], goal: [2, 0], blocks: [[1, 0]], freeze: [[1, 0]] }),
    /under a block/,
  );
});

test('a crossing with no natural window is fair only inside the freeze budget', () => {
  // no freeze at all: sealed
  assert.ok(timingProblems(parseLevel(freezeGeo(null))).length > 0, 'unfair without a freeze');
  // pickup 3 presses before the entry; the burst is 5 presses (4 line
  // tiles + exit): 3 + 5 = 8 = FREEZE_PRESS_BUDGET exactly → fair
  assert.deepEqual(timingProblems(parseLevel(freezeGeo([[0, 4]]))), [], 'budget-exact freeze is fair');
  // one tile farther south: 4 + 5 = 9 > 8 → still sealed
  assert.ok(timingProblems(parseLevel(freezeGeo([[0, 5]]))).length > 0, 'one press over budget stays sealed');
  // right on the crossing entry: trivially inside the budget
  assert.deepEqual(timingProblems(parseLevel(freezeGeo([[1, 2]]))), [], 'pickup on the entry is fair');
});

test('a freeze pickup stranded beyond the crossing cannot save it', () => {
  const beyond = {
    name: 'freeze-beyond',
    map: ['..111', '11111', '11...', '1....', '1....', '1....', '1....'],
    start: [0, 6],
    goal: [4, 0],
    orbs: [{ path: [[0, 1], [4, 1]], speed: 3.6 }],
    freeze: [[3, 0]], // north of the line: reachable only after crossing it
  };
  assert.ok(timingProblems(parseLevel(beyond)).length > 0, 'pickup beyond the line does not count');
  const near = { ...beyond, name: 'freeze-near', freeze: [[0, 4]] };
  assert.deepEqual(timingProblems(parseLevel(near)), [], 'the same pickup on the near side saves it');
});

// --- heavy blocks (M3 wave-1) ------------------------------------------------
// A heavy block pushes level or downhill, never uphill.
const heavyDef = (over = {}) => ({
  name: 'heavy-geo',
  map: ['11111', '11211'],
  start: [0, 0],
  goal: [4, 1],
  heavy: [[2, 0]],
  nudge: 3,
  ...over,
});

test('heavy blocks parse as flagged blocks and reject stacking', () => {
  const level = parseLevel(heavyDef());
  assert.equal(level.blocks.length, 1);
  assert.equal(level.blocks[0].heavy, true, 'flag travels with the block');
  assert.throws(() => parseLevel(heavyDef({ heavy: [[0, 0]] })), /start tile/);
  assert.throws(
    () => parseLevel(heavyDef({ blocks: [[2, 0]], heavy: [[2, 0]] })),
    /stacked on a block/,
  );
  assert.throws(() => parseLevel(heavyDef({ heavy: [[9, 9]] })), /not a slab/);
});

test('a heavy block is never pushed uphill, a light one is', () => {
  const level = parseLevel(heavyDef());
  const heavy = level.blocks[0]; // at (2,0), h1; (2,1) is h2
  assert.equal(canPushBlock(level, heavy, 0, 1, new Set(['2,0'])), false, 'push onto the step climbs → refused');
  assert.equal(canPushBlock(level, heavy, 1, 0, new Set(['2,0'])), true, 'level push along the row is fine');
  const light = parseLevel(heavyDef({ heavy: [], blocks: [[2, 0]] }));
  assert.equal(canPushBlock(light, light.blocks[0], 0, 1, new Set(['2,0'])), true, 'light blocks climb freely');
});

test('solveHazards: a heavy block clears a flat corridor but seals an uphill one', () => {
  // flat: one push frees the corridor tile, the cube detours past
  const flat = parseLevel({
    name: 'heavy-flat', map: ['11111', '11111'], start: [0, 0], goal: [4, 0], heavy: [[2, 0]], nudge: 2,
  });
  assert.equal(solveHazards(flat).ok, true, 'flat push clears the way');
  // the block sits before a step and the side row is cut: the first push
  // climbs, so a heavy block seals the level — a light one opens it
  const uphill = parseLevel({
    name: 'heavy-uphill', map: ['11211', '11.11'], start: [0, 0], goal: [4, 1], heavy: [[1, 0]], nudge: 3,
  });
  assert.equal(solveHazards(uphill).ok, false, 'uphill push refused → no route');
  const lightUp = parseLevel({
    name: 'light-uphill', map: ['11211', '11.11'], start: [0, 0], goal: [4, 1], blocks: [[1, 0]], nudge: 3,
  });
  assert.equal(solveHazards(lightUp).ok, true, 'the same corridor opens for a light block');
});

// --- pulsing gaps (M3 wave-1) -------------------------------------------------
test('pulsing gaps parse onto void cells at the lowest bank height', () => {
  const level = parseLevel({
    name: 'pulse-parse',
    map: ['121', '1.1', '111'],
    start: [0, 0],
    goal: [2, 2],
    pulse: [[1, 1]],
  });
  const t = level.tiles.get('1,1');
  assert.ok(t && t.pulse, 'phantom tile exists');
  assert.equal(t.h, 1, 'rises to the lowest neighbouring bank');
  assert.ok(level.pulseTiles.has('1,1'));
  assert.throws(
    () => parseLevel({ name: 'pulse-slab', map: ['111'], start: [0, 0], goal: [2, 0], pulse: [[1, 0]] }),
    /not void/,
  );
  assert.throws(
    () => parseLevel({ name: 'pulse-void', map: ['.....', '.....', '11111'], start: [0, 2], goal: [4, 2], pulse: [[2, 0]] }),
    /no slab neighbour/,
  );
});

test('pulseUp follows the diagonal sweep', () => {
  const level = parseLevel({
    name: 'pulse-phase',
    map: ['121', '1.1', '111'],
    start: [0, 0],
    goal: [2, 2],
    pulse: [[1, 1]], // (x+z)%4 = 2 → phase offset 0.5
  });
  assert.equal(pulseUp(level, 0, 1, 1), false, 'offset 0.5 starts unsealed');
  assert.equal(pulseUp(level, PULSE_PERIOD * 0.6, 1, 1), true, 'phase 0.1 is sealed');
  assert.equal(pulseUp(level, 0, 0, 0), true, 'non-pulse tiles are always solid');
});

test('blocks never rest on a pulsing gap, and the model treats it as solid', () => {
  const level = parseLevel({
    name: 'pulse-block',
    map: ['11.1'],
    start: [0, 0],
    goal: [3, 0],
    blocks: [[1, 0]],
    nudge: 1,
    pulse: [[2, 0]],
  });
  assert.equal(canPushBlock(level, level.blocks[0], 1, 0, new Set(['1,0'])), false, 'gap refuses the block');
  assert.equal(canPushBlock(level, level.blocks[0], -1, 0, new Set(['1,0'])), true, 'plain slab still takes it');
  const route = parseLevel({
    name: 'pulse-route', map: ['11.11'], start: [0, 0], goal: [4, 0], pulse: [[2, 0]],
  });
  assert.equal(solveHazards(route).ok, true, 'proofs cross it as a wait-out hazard');
});

test('spawn audit flags a pulsing gap inside sentinel clearance', () => {
  const near = parseLevel({
    name: 'pulse-near',
    map: ['11111', '11.11'],
    start: [0, 1],
    goal: [4, 1],
    orbs: [{ path: [[0, 0], [4, 0]], speed: 2 }],
    pulse: [[2, 1]],
  });
  assert.ok(spawnProblems(near).some((p) => p.includes('pulsing gap')), 'flagged beside the line');
  const far = parseLevel({
    name: 'pulse-far',
    map: ['11111', '11111', '11111', '11.11'],
    start: [0, 1],
    goal: [4, 1],
    orbs: [{ path: [[0, 0], [4, 0]], speed: 2 }],
    pulse: [[2, 3]],
  });
  assert.ok(!spawnProblems(far).some((p) => p.includes('pulsing gap')), 'clear of the line is fine');
});

// --- proximity sentinels (M3 wave-1) -------------------------------------------
test('proximity sentinels: wake radius is validated, proofs assume awake', () => {
  assert.throws(
    () => parseLevel({
      name: 'prox-bad', map: ['111'], start: [0, 0], goal: [2, 0],
      orbs: [{ path: [[0, 0], [2, 0]], speed: 2, wake: 0 }],
    }),
    /wake must be/,
  );
  // the freeze-test geometry: a crossing with no natural window is sealed
  // — a sleeping sentinel does NOT open it in the proof model (dormancy
  // only ever helps the player; fairness assumes it is already awake)
  const sealed = parseLevel({
    name: 'prox-sealed',
    map: ['....1', '11111', '11...', '1....', '1....', '1....', '1....'],
    start: [0, 6],
    goal: [4, 0],
    orbs: [{ path: [[0, 1], [4, 1]], speed: 2.4, wake: 3 }],
  });
  assert.ok(timingProblems(sealed).length > 0, 'still sealed with a sleeping sentinel');
  // and a naturally fair crossing stays fair with one
  const fair = parseLevel({
    name: 'prox-fair',
    map: ['111', '111', '111'],
    start: [1, 0],
    goal: [1, 2],
    orbs: [{ path: [[0, 1], [2, 1]], speed: 1.2, wake: 2 }],
  });
  assert.deepEqual(timingProblems(fair), [], 'fair crossing unaffected');
});

// --- boss arenas (M3) ---------------------------------------------------------
test('boss arena: keyed phases validate, proofs assume the boss awake at full speed', () => {
  const base = {
    name: 'boss-x',
    map: ['....1', '11111', '11...', '1....', '1....', '1....', '1....'],
    start: [0, 6],
    goal: [4, 0],
    key: [0, 3],
  };
  const orb = { path: [[0, 1], [4, 1]], speed: 2.4 };
  assert.throws(() => parseLevel({ ...base, key: undefined, boss: {}, orbs: [orb] }), /needs a gate key/);
  assert.throws(() => parseLevel({ ...base, orbs: [{ ...orb, wave: 2 }] }), /need a boss arena/);
  assert.throws(() => parseLevel({ ...base, boss: {}, orbs: [{ ...orb, wave: 3 }] }), /wave must be 2/);
  assert.throws(() => parseLevel({ ...base, boss: {}, orbs: [{ ...orb, wave: 2, wake: 3 }] }), /cannot be both/);
  assert.throws(() => parseLevel({ ...base, boss: { speed: 1 }, orbs: [orb] }), /boss speed/);
  assert.throws(() => parseLevel({ ...base, boss: { speed: 2.5 }, orbs: [orb] }), /boss speed/);
  // the crossing with no natural window stays sealed when the sealing
  // sentinel only wakes at the boss phase: the proof model runs it
  // awake at boss speed, so the trigger cannot unseal a proven wall
  const bossed = parseLevel({ ...base, boss: {}, orbs: [{ ...orb, wave: 2 }] });
  assert.equal(bossed.boss.speed, 1.35, 'boss speed defaults to 1.35');
  assert.ok(timingProblems(bossed).length > 0, 'still sealed with a sleeping wave-2 sentinel');
  const custom = parseLevel({ ...base, boss: { speed: 1.5 }, orbs: [orb] });
  assert.equal(custom.boss.speed, 1.5, 'explicit boss speed kept');
  assert.equal(parseLevel({ ...base, orbs: [orb] }).boss, null, 'no boss, no phase');
});

// --- timed slabs / delayed crumble (M3 wave-1) ------------------------------
test('timed slabs parse as flagged plain slabs with a fuse registry', () => {
  const level = parseLevel({
    name: 'timed-basic',
    map: ['11111'],
    start: [0, 0],
    goal: [4, 0],
    timed: [[1, 0], [2, 0]],
  });
  assert.ok(level.tiles.get('1,0').timed, 'flag on the tile');
  assert.ok(level.timedTiles.has('1,0') && level.timedTiles.has('2,0'), 'registry');
  assert.equal(shortestRoute(level), 4, 'a timed run crosses at a stroll in the press graph');
  assert.equal(solveHazards(level).ok, true, 'and survives the crumble-aware proof');
});

test('timed parse rejects stacked mechanics and start/goal/key placement', () => {
  assert.throws(
    () => parseLevel({ name: 'timed-ice', map: ['111'], start: [0, 0], goal: [2, 0], ice: [[1, 0]], timed: [[1, 0]] }),
    /another mechanic/,
  );
  assert.throws(
    () => parseLevel({ name: 'timed-start', map: ['111'], start: [0, 0], goal: [2, 0], timed: [[0, 0]] }),
    /start tile/,
  );
  assert.throws(
    () => parseLevel({ name: 'timed-goal', map: ['111'], start: [0, 0], goal: [2, 0], timed: [[2, 0]] }),
    /goal tile/,
  );
  assert.throws(
    () => parseLevel({ name: 'timed-void', map: ['1.1'], start: [0, 0], goal: [2, 0], timed: [[1, 0]] }),
    /not a slab/,
  );
});

test('a timed slab is modeled exactly like a crumble (break-on-leave)', () => {
  // the same geometry, once with a timed slab and once with a crumble:
  // the crumble-aware solver must give the identical verdict — proofs
  // never rely on the fuse duration, only real play gets the grace.
  const geo = (field) => ({
    name: `model-equiv-${field}`,
    map: ['11.11', '11111'],
    start: [0, 0],
    goal: [4, 1],
    doors: [{ plate: [2, 1], at: [2, 0] }],
    [field]: [[3, 0]],
  });
  const asTimed = parseLevel(geo('timed'));
  const asCrumble = parseLevel(geo('crumble'));
  assert.equal(solveHazards(asTimed).ok, solveHazards(asCrumble).ok);
});

test('timed spawn audit forbids waiting spots: sentinel clearance and docks', () => {
  const nearLine = parseLevel({
    name: 'timed-near-line',
    map: ['11111', '11111', '11111'],
    start: [0, 2],
    goal: [4, 2],
    timed: [[2, 1]],
    orbs: [{ path: [[0, 0], [4, 0]], speed: 1 }],
  });
  assert.ok(
    spawnProblems(nearLine).some((p) => p.includes('timed slab')),
    'timed slab one tile off a patrol line is flagged (it could be a crossing refuge)',
  );
  const nearDock = parseLevel({
    name: 'timed-near-dock',
    map: ['1111111', '11...11', '1111111'],
    start: [0, 2],
    goal: [6, 2],
    timed: [[1, 0]],
    shuttles: [{ a: [2, 1], b: [4, 1], wait: 2 }],
  });
  assert.ok(
    spawnProblems(nearDock).some((p) => p.includes('timed slab')),
    'timed slab beside a shuttle dock is flagged (boarding is a wait)',
  );
  const clear = parseLevel({
    name: 'timed-clear',
    map: ['11111', '11111', '11111', '11111', '11111'],
    start: [0, 4],
    goal: [4, 4],
    timed: [[2, 2]],
    orbs: [{ path: [[0, 0], [4, 0]], speed: 1 }],
  });
  assert.ok(!spawnProblems(clear).some((p) => p.includes('timed slab')), 'two tiles clear is fine');
});

test('blocks can never be pushed onto a timed slab', () => {
  const level = parseLevel({
    name: 'timed-block',
    map: ['11111'],
    start: [0, 0],
    goal: [4, 0],
    blocks: [[1, 0]],
    nudge: 1,
    timed: [[2, 0]],
  });
  assert.equal(canPushBlock(level, level.blocks[0], 1, 0), false, 'timed slab refuses blocks');
  assert.equal(canPushBlock(level, level.blocks[0], -1, 0), true, 'plain slab still takes blocks');
});

// --- pressure plates + doors (M3 wave-1) ----------------------------------
const doorDef = () => ({
  name: 'door-detour',
  map: [
    '11.11',
    '.111.',
    '.....',
  ],
  start: [0, 0],
  goal: [4, 0],
  doors: [{ plate: [2, 1], at: [2, 0] }],
});

test('a door opens only to a press that starts on its plate', () => {
  const level = parseLevel(doorDef());
  const at = (x, z) => level.tiles.get(`${x},${z}`);
  // from (1,0) — beside the doorway but not on the plate: refused
  assert.equal(resolveRoll(level, at(1, 0), DIRS.right), null);
  // from the plate: through, and the cube rests ON the doorway tile
  const through = resolveRoll(level, at(2, 1), DIRS.up);
  assert.deepEqual([through.x, through.z], [2, 0], 'plate → doorway');
  // from the doorway: out the far side freely
  const out = resolveRoll(level, at(2, 0), DIRS.right);
  assert.deepEqual([out.x, out.z], [3, 0], 'doorway → beyond');
  // ...but coming back is refused: the door closed behind the cube
  assert.equal(resolveRoll(level, at(3, 0), DIRS.left), null);
});

test('the doorway is a full citizen of the route graph (detour par)', () => {
  const level = parseLevel(doorDef());
  // (0,0)→(1,0)→(1,1)→plate(2,1)→door(2,0)→(3,0)→(4,0): 6 presses, and
  // the direct 4-press line through the doorway does not exist
  assert.equal(shortestRoute(level), 6);
});

test('an ice slide stops dead at a closed door', () => {
  const level = parseLevel({
    name: 'door-slide',
    map: ['111.11'],
    start: [0, 0],
    goal: [5, 0],
    ice: [[1, 0], [2, 0]],
    doors: [{ plate: [4, 0], at: [3, 0] }],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.deepEqual([to.x, to.z], [2, 0], 'slide rests on the last ice tile before the door');
});

test('a spring launch flies over a doorway, never lands on it', () => {
  const level = parseLevel({
    name: 'door-launch',
    map: ['1..11'],
    start: [0, 0],
    goal: [4, 0],
    springs: [[0, 0]],
    doors: [{ plate: [3, 0], at: [2, 0] }],
  });
  const to = resolveRoll(level, level.tiles.get('0,0'), DIRS.right);
  assert.equal(to.x, 3, 'launch skips the door tile and lands beyond it');
});

test('door parse rejects non-void doorways, stray plates and stacked mechanics', () => {
  assert.throws(
    () => parseLevel({ name: 'door-on-slab', map: ['111'], start: [0, 0], goal: [2, 0], doors: [{ plate: [1, 0], at: [2, 0] }] }),
    /must be void/,
  );
  assert.throws(
    () => parseLevel({ name: 'door-far-plate', map: ['111', '111'], start: [0, 0], goal: [2, 0], doors: [{ plate: [0, 1], at: [1, 0] }] }),
    /must be void/,
  );
  assert.throws(
    () => parseLevel({
      name: 'door-stray',
      map: ['1.111', '.....'],
      start: [0, 0],
      goal: [4, 0],
      doors: [{ plate: [0, 0], at: [1, 0] }],
    }),
    /start tile/,
  );
  assert.throws(
    () => parseLevel({
      name: 'plate-on-ice',
      map: ['1.1', '111'],
      start: [0, 0],
      goal: [2, 0],
      ice: [[1, 1]],
      doors: [{ plate: [1, 1], at: [1, 0] }],
    }),
    /another mechanic/,
  );
});

test('door parse rejects a plate that is not beside its doorway', () => {
  assert.throws(
    () => parseLevel({
      name: 'door-stray2',
      map: ['11.11', '11111'],
      start: [0, 0],
      goal: [4, 0],
      doors: [{ plate: [4, 1], at: [2, 0] }],
    }),
    /beside its plate/,
  );
});

test('blocks can never be pushed onto a plate or into a doorway', () => {
  const level = parseLevel({
    name: 'door-block',
    map: ['111.1'],
    start: [0, 0],
    goal: [4, 0],
    blocks: [[1, 0]],
    nudge: 1,
    doors: [{ plate: [2, 0], at: [3, 0] }],
  });
  assert.equal(canPushBlock(level, level.blocks[0], 1, 0), false, 'plate refuses blocks');
  assert.equal(canPushBlock(level, level.blocks[0], -1, 0), true, 'plain slab still takes blocks');
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

// --- lifts (Phase B, ADR-033): a shuttle turned vertical --------------------
// Low bank west at h1, high bank east at h4, one shaft cell between them:
// the only way up is the platform.
const liftDef = () => ({
  name: 'lift-test',
  map: [
    '.....',
    '.11.4',
    '.11.4',
    '.....',
  ],
  start: [1, 1],
  goal: [4, 1],
  lifts: [{ at: [3, 1], low: 1, high: 4 }],
});

test('lift docks are solid tiles flagged for the platform, with a cycle', () => {
  const level = parseLevel(liftDef());
  const dock = level.tiles.get('3,1');
  assert.ok(dock.lift, 'dock flagged');
  assert.equal(level.lifts.length, 1);
  const lf = level.lifts[0];
  assert.equal(lf.low, 1);
  assert.equal(lf.high, 4);
  assert.equal(lf.wait, 2, 'dwell defaults to the shuttle dwell');
  assert.equal(lf.travel, 2.4, 'ride time is 0.8s per storey');
  assert.equal(lf.cycle, 2 * lf.wait + 2 * lf.travel);
  assert.ok(level.liftDocks.has('3,1'));
});

test('the proven route rides the lift; without it the high bank is unreachable', () => {
  const level = parseLevel(liftDef());
  assert.equal(shortestRoute(level), 3);
  assert.ok(reachable(level).has('4,1'), 'high bank reachable');
  assert.ok(canStillFinish(level).has('1,1'), 'no soft-lock at the low bank');
  const bare = parseLevel({ ...liftDef(), lifts: [] });
  assert.equal(shortestRoute(bare), -1, 'no lift, no route up');
});

test('checkRoll prices a lift step against either dwell, and nothing else', () => {
  const level = parseLevel(liftDef());
  const lowBank = level.tiles.get('2,1');
  const highBank = level.tiles.get('4,1');
  const dock = level.tiles.get('3,1');
  assert.ok(checkRoll(level, lowBank, dock).ok, 'board at the low dwell');
  assert.ok(checkRoll(level, dock, highBank).ok, 'step off at the high dwell');
  assert.ok(checkRoll(level, highBank, dock).ok, 'board at the high dwell');
  assert.ok(checkRoll(level, dock, lowBank).ok, 'step off at the low dwell');
  // a bank no dwell can serve: an h9 tower beside the shaft
  const tall = parseLevel({
    name: 'lift-tall',
    map: [
      '...9.',
      '.11.4',
      '.11.4',
    ],
    start: [1, 1],
    goal: [4, 1],
    lifts: [{ at: [3, 1], low: 1, high: 4 }],
  });
  const tower = tall.tiles.get('3,0');
  const shaft = tall.tiles.get('3,1');
  assert.equal(checkRoll(tall, tower, shaft).ok, false, 'a drop of 5+ serves no dwell');
  assert.equal(checkRoll(tall, shaft, tower).ok, false, 'a climb of 5+ serves no dwell');
});

test('a press resolves onto and off the lift; a launch flies the shaft over', () => {
  const level = parseLevel(liftDef());
  const lowBank = level.tiles.get('2,1');
  const dock = level.tiles.get('3,1');
  assert.equal(resolveRoll(level, lowBank, DIRS.right), dock, 'press boards the platform');
  assert.equal(resolveRoll(level, dock, DIRS.right).x, 4, 'press leaves at the far bank');
  const sprung = parseLevel({ ...liftDef(), springs: [[2, 1]] });
  const landed = resolveRoll(sprung, sprung.tiles.get('2,1'), DIRS.right);
  assert.equal(landed.x, 4, 'the launch flies over the shaft, never lands in it');
  assert.equal(landed.z, 1);
});

test('solveHazards proves a lift level; blocks never park on the platform', () => {
  const level = parseLevel(liftDef());
  assert.equal(solveHazards(level).ok, true);
  const blocked = parseLevel({ ...liftDef(), blocks: [[2, 1]], nudge: 3 });
  assert.equal(canPushBlock(blocked, blocked.blocks[0], 1, 0), false, 'the platform would ride away under the block');
  assert.equal(canPushBlock(blocked, blocked.blocks[0], 0, 1), true, 'a plain slab still takes it');
});

test('lift parse rejects bad rises, missing banks, and decorative shafts', () => {
  assert.throws(() => parseLevel({ ...liftDef(), lifts: [{ at: [3, 1], low: 1, high: 2 }] }), /rise must be 2-4/);
  assert.throws(() => parseLevel({ ...liftDef(), lifts: [{ at: [3, 1], low: 1, high: 6 }] }), /rise must be 2-4/);
  assert.throws(() => parseLevel({ ...liftDef(), lifts: [{ at: [2, 1], low: 1, high: 4 }] }), /is not void/);
  assert.throws(() => parseLevel({ ...liftDef(), lifts: [{ at: [3, 1], low: 7, high: 9 }] }), /no bank at its low dwell/);
  // every bank serves both dwells: the shaft connects nothing
  assert.throws(() => parseLevel({
    name: 'lift-decorative',
    map: [
      '.....',
      '.44.4',
      '.44.4',
      '.....',
    ],
    start: [1, 1],
    goal: [4, 1],
    lifts: [{ at: [3, 1], low: 2, high: 5 }],
  }), /joins no two banks/);
});

test('lift parse rejects stacked mechanics and platform neighbours', () => {
  assert.throws(() => parseLevel({ ...liftDef(), ice: [[3, 1]] }), /ice on a lift dock/);
  assert.throws(() => parseLevel({ ...liftDef(), key: [3, 1] }), /key sits on a lift dock/);
  assert.throws(() => parseLevel({
    ...liftDef(),
    lifts: [{ at: [3, 1], low: 1, high: 4 }, { at: [3, 2], low: 1, high: 4 }],
  }), /touches another platform dock/);
});

test('spawn audit flags a sentinel on the dock and a slide feeding the shaft', () => {
  const patrolled = parseLevel({
    ...liftDef(),
    orbs: [{ path: [[3, 1], [3, 2]], speed: 1 }],
  });
  assert.ok(spawnProblems(patrolled).some((p) => p.includes('orb patrols a lift dock')));
  const fed = parseLevel({ ...liftDef(), ice: [[2, 1]] });
  assert.ok(spawnProblems(fed).some((p) => p.includes('fed by a slide')));
});

// --- shrink pads + low tunnels (Phase B, ADR-034): size is state ------------
// A corridor the full cube cannot enter: pad -> tunnel -> grow -> goal.
const shrinkDef = () => ({
  name: 'shrink-test',
  map: [
    '.......',
    '0000000',
    '.......',
  ],
  start: [0, 1],
  goal: [6, 1],
  shrink: [[1, 1]],
  low: [[3, 1], [4, 1]],
  grow: [[5, 1]],
});

test('size pads parse as flagged tiles with registries; the level is a size level', () => {
  const level = parseLevel(shrinkDef());
  assert.equal(level.shrinkPads.get('1,1'), 'shrink');
  assert.equal(level.shrinkPads.get('5,1'), 'grow');
  assert.ok(level.lowTiles.has('3,1') && level.lowTiles.has('4,1'));
  assert.ok(level.hasSize);
  assert.equal(level.startMini, false);
  const plain = parseLevel({ name: 'plain', map: ['00'], start: [0, 0], goal: [1, 0] });
  assert.equal(plain.hasSize, false);
});

test('size parse rejects dead decoration and stacked mechanics', () => {
  // pads with nothing to spend them on
  assert.throws(() => parseLevel({ name: 'x', map: ['000'], start: [0, 0], goal: [2, 0], shrink: [[1, 0]] }), /no low tunnel/);
  // a tunnel with no way in
  assert.throws(() => parseLevel({ name: 'x', map: ['000'], start: [0, 0], goal: [2, 0], low: [[1, 0]] }), /no way to shrink/);
  // ...unless the cube starts mini
  assert.doesNotThrow(() => parseLevel({ name: 'x', map: ['000'], start: [0, 0], goal: [2, 0], low: [[1, 0]], startMini: true }));
  assert.throws(() => parseLevel({ ...shrinkDef(), low: [[3, 1], [4, 1], [6, 1]] }), /low tile on the goal tile/);
  assert.throws(() => parseLevel({ ...shrinkDef(), blocks: [[3, 1]], nudge: 1 }), /block inside a low tunnel/);
  assert.throws(() => parseLevel({ ...shrinkDef(), grow: [[1, 1]] }), /stacked/);
});

test('checkRoll prices the size bit: a low tunnel is a wall at full size', () => {
  const level = parseLevel(shrinkDef());
  const mouth = level.tiles.get('2,1');
  const tunnel = level.tiles.get('3,1');
  assert.deepEqual(checkRoll(level, mouth, tunnel), { ok: false, kind: 'blocked' });
  assert.equal(checkRoll(level, mouth, tunnel, true).ok, true);
  // the pre-mechanic API keeps the full-size law
  assert.equal(resolveRoll(level, mouth, DIRS.right), null);
  assert.equal(resolveRollAt(level, mouth, DIRS.right, true), tunnel);
});

test('a pad fires on the landing: the press that steps on it ends small', () => {
  const level = parseLevel(shrinkDef());
  const start = level.tiles.get('0,1');
  const pad = resolveRollAt(level, start, DIRS.right, false);
  assert.equal(pad, level.tiles.get('1,1'));
  assert.equal(sizeAfter(level, pad, false), true);
  assert.equal(sizeAfter(level, level.tiles.get('5,1'), true), false); // grow restores
  assert.equal(sizeAfter(level, level.tiles.get('2,1'), true), true); // plain tiles keep size
});

test('the tunnel route is the par: proofs carry the size bit end to end', () => {
  const level = parseLevel(shrinkDef());
  assert.equal(shortestRoute(level), 6); // pad, step, tunnel x2, grow, goal
  assert.ok(reachable(level).has('6,1'));
  assert.ok(canStillFinish(level).has('0,1'));
  assert.equal(solveHazards(level).ok, true);
  // the same corridor entered small from spawn (no pad needed)
  const born = parseLevel({ ...shrinkDef(), shrink: [], startMini: true });
  assert.equal(shortestRoute(born), 6);
});

test('growing where every exit is a tunnel mouth is a size soft-lock', () => {
  // the grow pad ends a spur off the tunnel: roll in mini, stand up —
  // and the only way out is the low mouth you came through
  const sealed = parseLevel({
    name: 'trap-test',
    map: ['........', '00000000', '....0...'],
    start: [0, 1],
    goal: [7, 1],
    shrink: [[1, 1]],
    low: [[3, 1], [4, 1]],
    grow: [[4, 2]],
  });
  assert.equal(reachable(sealed).has('4,2'), true); // reachable...
  assert.equal(canStillFinish(sealed).has('4,2'), false); // ...but a trap
  assert.equal(canStillFinish(sealed).has('1,1'), true);
});

test('blocks never enter a low tunnel or park on a pad', () => {
  const level = parseLevel({ ...shrinkDef(), blocks: [[2, 1]], nudge: 3 });
  const block = level.blocks[0];
  assert.equal(canPushBlock(level, block, 1, 0), false); // into the tunnel
  assert.equal(canPushBlock(level, block, -1, 0), false); // onto the shrink pad
});

test('spawn audit keeps the patrol line out of tunnels and off pads', () => {
  const wide = parseLevel({
    name: 'shrink-orb',
    map: ['0000000', '0000000', '0000000'],
    start: [0, 0],
    goal: [6, 0],
    shrink: [[1, 1]],
    low: [[3, 1], [4, 1]],
    grow: [[5, 1]],
    orbs: [{ path: [[3, 0], [3, 2]], speed: 1 }],
  });
  assert.ok(spawnProblems(wide).some((p) => p.includes('low tunnel tile 3,1')));
  const onPad = parseLevel({
    name: 'shrink-orb2',
    map: ['0000000', '0000000', '0000000'],
    start: [0, 0],
    goal: [6, 0],
    shrink: [[1, 1]],
    low: [[3, 1], [4, 1]],
    grow: [[5, 1]],
    orbs: [{ path: [[1, 0], [1, 2]], speed: 1 }],
  });
  assert.ok(spawnProblems(onPad).some((p) => p.includes('size pad on a sentinel patrol line')));
});

test('a full-size spring launch flies over the tunnel mouth; a mini launch lands in it', () => {
  const level = parseLevel({
    name: 'shrink-spring',
    map: ['......', '000000', '......'],
    start: [0, 1],
    goal: [5, 1],
    springs: [[1, 1]],
    low: [[2, 1]],
    shrink: [[4, 1]],
    grow: [[3, 1]],
  });
  const spring = level.tiles.get('1,1');
  // full size: the low tile at (2,1) is overflown, landing on (3,1)
  assert.equal(resolveRollAt(level, spring, DIRS.right, false), level.tiles.get('3,1'));
  // mini: the first slab is a legal landing
  assert.equal(resolveRollAt(level, spring, DIRS.right, true), level.tiles.get('2,1'));
});

test('an ice slide rests before the tunnel mouth; the mouth itself prices size', () => {
  const level = parseLevel({
    name: 'shrink-ice',
    map: ['.......', '0000000', '.......'],
    start: [0, 1],
    goal: [6, 1],
    ice: [[1, 1], [2, 1]],
    low: [[4, 1]],
    shrink: [[5, 1]],
    grow: [[3, 1]],
  });
  const start = level.tiles.get('0,1');
  // the slide runs the ice and rests on the first plain tile, (3,1)
  assert.equal(resolveRollAt(level, start, DIRS.right, false), level.tiles.get('3,1'));
  // from that rest tile the tunnel mouth refuses full size and admits mini
  assert.equal(resolveRollAt(level, level.tiles.get('3,1'), DIRS.right, false), null);
  assert.equal(resolveRollAt(level, level.tiles.get('3,1'), DIRS.right, true), level.tiles.get('4,1'));
});

test('the rescue bench never lands on a tunnel tile or a pad', () => {
  const level = parseLevel({
    name: 'shrink-bench',
    map: ['.........', '000000000', '.........'],
    start: [0, 1],
    goal: [8, 1],
    shrink: [[1, 1]],
    low: [[4, 1]],
    grow: [[7, 1]],
  });
  const bench = rescueTile(level);
  assert.ok(bench, 'a bench exists on an 8-press level');
  assert.equal(bench.low, undefined);
  assert.equal(bench.shrink, undefined);
  assert.equal(bench.grow, undefined);
});

// --- piston pushers (Phase B, ADR-035): the timed wall that shoves ---------
// A base beside the route; its arm sweeps the strike cell on the route.
const pistonDef = () => ({
  name: 'piston-test',
  map: [
    '00000',
    '00000',
    '.....',
  ],
  start: [0, 1],
  goal: [4, 1],
  pistons: [{ at: [2, 0], dx: 0, dz: 1 }],
});

test('pistons parse with a registered strike cell and cycle defaults', () => {
  const level = parseLevel(pistonDef());
  assert.equal(level.pistons.length, 1);
  const pn = level.pistons[0];
  assert.deepEqual(pn.strike, { x: 2, z: 1 });
  assert.equal(pn.period, PISTON_PERIOD);
  assert.equal(level.pistonCells.get('2,1'), pn);
  assert.ok(level.tiles.get('2,0').piston, 'base tile flagged');
});

test('piston parse rejects void, stacking, overlap and bad timing', () => {
  assert.throws(() => parseLevel({ ...pistonDef(), pistons: [{ at: [2, 2], dx: 0, dz: -1 }] }), /is not a slab/);
  assert.throws(() => parseLevel({ ...pistonDef(), pistons: [{ at: [2, 0], dx: 1, dz: 1 }] }), /unit axis/);
  assert.throws(() => parseLevel({ ...pistonDef(), pistons: [{ at: [2, 0], dx: 0, dz: 1, period: 1 }] }), /period/);
  assert.throws(() => parseLevel({ ...pistonDef(), pistons: [{ at: [2, 0], dx: 0, dz: 1, phase: 1 }] }), /phase/);
  assert.throws(() => parseLevel({ ...pistonDef(), ice: [[2, 1]] }), /stacked/); // strike on ice
  assert.throws(() => parseLevel({
    ...pistonDef(),
    pistons: [{ at: [2, 0], dx: 0, dz: 1 }, { at: [2, 2 - 2], dx: 0, dz: 1 }],
  }), /stacked|overlap/);
  assert.throws(() => parseLevel({
    name: 'p2',
    map: ['000', '000', '000'],
    start: [0, 0],
    goal: [2, 2],
    pistons: [{ at: [1, 0], dx: 0, dz: 1 }, { at: [1, 2], dx: 0, dz: -1 }],
  }), /overlap/); // two arms, one strike cell
  assert.throws(() => parseLevel({ ...pistonDef(), pistons: [{ at: [4, 0], dx: 0, dz: 1 }] }), /goal tile/);
});

test('the base is a wall in the one roll law; the strike cell stays plain floor', () => {
  const level = parseLevel(pistonDef());
  assert.equal(checkRoll(level, level.tiles.get('1,1'), level.tiles.get('2,0')).ok, false);
  // the proven route walks straight through the strike cell
  assert.equal(shortestRoute(level), 4);
  assert.ok(reachable(level).has('2,1'));
  assert.equal(reachable(level).has('2,0'), false); // the base is never stood on
  // a block can park on the strike cell (it stalls the arm) but never on the base
  assert.equal(canPushBlock(level, { x: 1, z: 1, heavy: false }, 1, 0), true);
  assert.equal(canPushBlock(level, { x: 2, z: 1, heavy: false }, 0, -1), false);
});

test('piston phase law: retracted first, extended for the tail of the cycle', () => {
  const level = parseLevel(pistonDef());
  const pn = level.pistons[0];
  assert.equal(pistonExtended(pn, 0), false);
  assert.equal(pistonExtended(pn, PISTON_PERIOD * PISTON_EXTENDED_FROM - 0.01), false);
  assert.equal(pistonExtended(pn, PISTON_PERIOD * PISTON_EXTENDED_FROM + 0.01), true);
  assert.equal(pistonExtended(pn, PISTON_PERIOD - 0.01), true);
  assert.equal(pistonExtended(pn, PISTON_PERIOD + 0.01), false); // wraps
  const shifted = parseLevel({ ...pistonDef(), pistons: [{ at: [2, 0], dx: 0, dz: 1, phase: 0.6 }] }).pistons[0];
  assert.equal(pistonExtended(shifted, 0), true); // phase offset moves the window
});

test('spawn audit keeps patrols off the machinery and waits off the strike cell', () => {
  const patrolled = parseLevel({
    name: 'piston-orb',
    map: ['00000', '00000', '00000'],
    start: [0, 2],
    goal: [4, 2],
    pistons: [{ at: [2, 0], dx: 0, dz: 1 }],
    orbs: [{ path: [[2, 2], [2, 0]], speed: 1 }],
  });
  const probs = spawnProblems(patrolled);
  assert.ok(probs.some((p) => p.includes('patrols a piston strike cell')), probs.join(';'));
  assert.ok(probs.some((p) => p.includes('waits inside sentinel clearance')), probs.join(';'));
  const basePatrolled = parseLevel({
    name: 'piston-orb2',
    map: ['00000', '00000', '00000'],
    start: [0, 2],
    goal: [4, 2],
    pistons: [{ at: [2, 0], dx: 0, dz: 1 }],
    orbs: [{ path: [[0, 0], [4, 0]], speed: 1 }],
  });
  assert.ok(spawnProblems(basePatrolled).some((p) => p.includes('patrols a piston base')));
});

test('the rescue bench never lands on a strike cell or a piston base', () => {
  const level = parseLevel({
    name: 'piston-bench',
    map: ['000000000', '000000000', '.........'],
    start: [0, 1],
    goal: [8, 1],
    pistons: [{ at: [4, 0], dx: 0, dz: 1 }],
  });
  const bench = rescueTile(level);
  assert.ok(bench, 'a bench exists on an 8-press level');
  assert.equal(level.pistonCells.has(`${bench.x},${bench.z}`), false);
  assert.equal(bench.piston, undefined);
});

// --- turntable bridges (Phase B, ADR-036): the bridge that rewires ---------
// A void crossroads: corridor banks east/west, banks north/south.
const turntableDef = () => ({
  name: 'turntable-test',
  map: [
    '..1..',
    '.....',
    '1...1',
    '.....',
    '..1..',
  ],
  start: [0, 2],
  goal: [4, 2],
  turntables: [{ at: [2, 2] }],
});

test('turntables parse as a five-cell phantom cross at one bank height', () => {
  const level = parseLevel(turntableDef());
  assert.equal(level.turntables.length, 1);
  assert.equal(level.turntableCells.size, 5);
  const pivot = level.tiles.get('2,2');
  assert.ok(pivot.turntablePivot, 'pivot flagged');
  assert.equal(pivot.h, 1);
  assert.equal(parseLevel(turntableDef()).turntables[0].period, TURNTABLE_PERIOD);
});

test('turntable parse rejects slabs, floaters, decoration and bad timing', () => {
  // cross cell on a slab
  assert.throws(() => parseLevel({
    ...turntableDef(),
    map: ['..1..', '..1..', '1.1.1', '..1..', '..1..'],
  }), /is not void/);
  // a one-shore spike is decoration: only the east bank exists here
  assert.throws(() => parseLevel({
    name: 'tt-flat',
    map: ['.....', '.....', '....1', '.....', '....1'],
    start: [4, 4],
    goal: [4, 2],
    turntables: [{ at: [2, 2] }],
  }), /floats free|fewer than two shores/);
  assert.throws(() => parseLevel({ ...turntableDef(), turntables: [{ at: [2, 2], period: 2 }] }), /period/);
  assert.throws(() => parseLevel({ ...turntableDef(), turntables: [{ at: [2, 2], phase: 1 }] }), /phase/);
  assert.throws(() => parseLevel({ ...turntableDef(), wind: { x: 1, z: 0 } }), /never shares/);
});

test('the cross is plain floor in the one roll law, on both axes', () => {
  const level = parseLevel(turntableDef());
  assert.equal(shortestRoute(level), 4); // straight through pivot and arms
  assert.ok(reachable(level).has('2,0'), 'the far north bank is in the proof graph');
  // a block can never park on the bar
  assert.equal(canPushBlock(level, { x: 0, z: 2, heavy: false }, 1, 0), false);
});

test('turntable clock: the bar joins one pair, sweeps, joins the other', () => {
  const level = parseLevel(turntableDef());
  const tt = level.turntables[0];
  assert.equal(turntableAxis(0, tt), 'h');
  assert.equal(turntableAxis(TURNTABLE_PERIOD * 0.5 + 0.01, tt), 'v');
  assert.equal(turntableSolid(level, 0, 2, 2), true); // pivot always floored
  assert.equal(turntableSolid(level, 0, 1, 2), true); // west arm while 'h'
  assert.equal(turntableSolid(level, 0, 2, 1), false); // north arm while 'h'
  assert.equal(turntableSolid(level, TURNTABLE_PERIOD * 0.75, 2, 1), true);
  const shifted = parseLevel({ ...turntableDef(), turntables: [{ at: [2, 2], phase: 0.5 }] });
  assert.equal(turntableAxis(0, shifted.turntables[0]), 'v'); // phase offsets the pairing
});

test('spawn audit keeps patrols and conveyor feeds off the bar', () => {
  const honest = parseLevel({
    name: 'tt-orb',
    map: ['..1..', '.....', '1...1', '.....', '..1..'],
    start: [0, 2],
    goal: [4, 2],
    turntables: [{ at: [2, 2] }],
    orbs: [{ path: [[2, 0], [2, 4]], speed: 1 }],
  });
  assert.ok(spawnProblems(honest).some((p) => p.includes('patrols a turntable cell')), spawnProblems(honest).join(';'));
});

test('the rescue bench never lands on the bar', () => {
  const level = parseLevel({
    name: 'tt-bench',
    map: ['..1......', '.........', '1...11111', '.........', '..1......'],
    start: [0, 2],
    goal: [8, 2],
    turntables: [{ at: [2, 2] }],
  });
  const bench = rescueTile(level);
  assert.ok(bench, 'a bench exists on an 8-press level');
  assert.equal(bench.turntable, undefined);
});

// --- clinging (Phase B, ADR-037): the hang-ledge ---------------------------
// A declared grip crevice: one void cell whose two banks are in reach of a
// catch. The press crosses the crevice in ONE action (roll off, hang, pull
// up), so the whole resolver/search/oracle stack inherits it unchanged.
const clingDef = (row = '11.11', extra = {}) => ({
  name: 'cling-test',
  map: [row],
  start: [0, 0],
  goal: [4, 0],
  clings: [[2, 0]],
  ...extra,
});

test('a cling press spans a declared crevice; without it the crevice is a fall', () => {
  const level = parseLevel(clingDef());
  assert.equal(level.clingCells.size, 1);
  assert.deepEqual([...level.clingBanks].sort(), ['1,0', '3,0']);
  // one press from bank to bank, and the resolver says so
  assert.equal(resolveRoll(level, level.tiles.get('1,0'), DIRS.right), level.tiles.get('3,0'));
  assert.equal(shortestRoute(level), 3); // 0,0 → 1,0 → cling → 3,0 → 4,0
  assert.ok(reachable(level).has('3,0'), 'the far bank is in the proof graph');
  assert.ok(mechanicTargets(level, level.tiles.get('1,0')).some((t) => t.x === 3), 'fair-reach sees the grip');
  assert.deepEqual(solveHazards(level), { ok: true });
  // the same map with the declaration stripped: a press into void is a fall
  const bare = parseLevel(clingDef('11.11', { clings: undefined }));
  assert.equal(resolveRoll(bare, bare.tiles.get('1,0'), DIRS.right), null);
  assert.equal(shortestRoute(bare), -1);
  assert.ok(shortestRoute(level) > 0, 'with the grip the level proves');
  assert.equal(shortestRoute(bare), -1, 'without it the route is gone');
});

test('the grip reaches one storey past the roll law each way — and no further', () => {
  // climb +2 and drop −3 are the reach; the gulf makes both new moves
  assert.equal(shortestRoute(parseLevel(clingDef('11.31'))), 3, 'a 2-storey mantle up');
  assert.equal(shortestRoute(parseLevel(clingDef('44.11'))), 3, 'a 3-storey catch down');
  // a 4-storey gulf is out of reach BOTH ways: no grip exists at all, so
  // the declaration is decoration and the parser refuses it
  assert.throws(() => parseLevel(clingDef('11.51')), /joins no two banks/);
  // a 3-storey gulf: the high bank can still catch DOWN, the low bank
  // cannot climb it — the grip is one-way, and the proof keeps it that way
  const oneWay = parseLevel({ name: 'cling-once', map: ['11.41'], start: [3, 0], goal: [0, 0], clings: [[2, 0]] });
  assert.equal(shortestRoute(oneWay), 2);
  assert.equal(resolveRoll(oneWay, oneWay.tiles.get('3,0'), DIRS.left).x, 1, 'high bank descends');
  assert.equal(resolveRoll(oneWay, oneWay.tiles.get('1,0'), DIRS.right), null, 'low bank cannot climb');
});

test('cling parse rejects stacked slabs, dead crevices and dirty grip faces', () => {
  // the crevice must be void in the map
  assert.throws(() => parseLevel({ name: 'c', map: ['11111'], start: [0, 0], goal: [4, 0], clings: [[2, 0]] }), /is not void/);
  // a dead-end void is no grip (no second bank)
  assert.throws(() => parseLevel({ name: 'c', map: ['11...'], start: [0, 0], goal: [0, 0], clings: [[2, 0]] }), /joins no two banks/);
  // a grip face may not carry another mechanic: ice would fire the slide
  assert.throws(() => parseLevel(clingDef('11.11', { ice: [[3, 0]] })), /carries another mechanic/);
  // nor a crumble slab (it would fall out of the wall)
  assert.throws(() => parseLevel(clingDef('11.11', { crumble: [[3, 0]] })), /joins no two banks/);
  // nor the goal (the seal/reject path owns that tile)
  assert.throws(() => parseLevel({ name: 'c', map: ['11.11'], start: [0, 0], goal: [3, 0], clings: [[2, 0]] }), /goal tile/);
});

test('blocks never park on a grip face; patrols never cross one', () => {
  const level = parseLevel({
    name: 'cling-block',
    map: ['11.11', '11.11'],
    start: [0, 0],
    goal: [4, 0],
    clings: [[2, 1]],
    blocks: [[0, 1]],
    nudge: 2,
  });
  assert.equal(canPushBlock(level, { x: 0, z: 1, heavy: false }, 1, 0), false);
  const patrolled = parseLevel({
    ...clingDef('11.11', { clings: [[2, 0]] }),
    orbs: [{ path: [[1, 0], [3, 0]], speed: 1 }],
  });
  assert.ok(spawnProblems(patrolled).some((p) => p.includes('patrols a cling bank')), spawnProblems(patrolled).join(';'));
});
