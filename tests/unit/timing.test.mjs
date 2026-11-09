// ---------------------------------------------------------------------------
// Sentinel timing fairness — regression (BUG-003)
//
// Pins the L46 bug class: a sentinel patrols the ONLY way across the level
// and its safe window never opens, so no player can finish. The static gate
// (rules.timingProblems / fairCrossingGraph) must:
//   1. REJECT the actual L46 layout that shipped in 8eba34e (provably no
//      start→goal route with a fair crossing),
//   2. ACCEPT the fair L46 the gate now ships (1-tile crossing, wide window),
//   3. expose directed fair-crossing edges on fairCrossingGraph (both
//      directions when both are fair), and never advertise a sealed
//      crossing as fair,
//   4. treat a start ON the patrol line as an escape-window problem.
//
// The LIVE half (a player actually catching the window) is pinned by
// scripts/test-levels-playable.mjs playing every level with hazards on.
// ---------------------------------------------------------------------------
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLevel,
  timingProblems,
  fairCrossingGraph,
  crossingWindow,
  TIMING_FLOOR,
  key,
  orbLineTiles,
  orbTable,
  orbPosition,
  orbPositionFromDist,
  orbDistAlong,
} from '../../src/rules.js';

/**
 * The exact L46 "The Last Stair" layout from commit 8eba34e — the level a
 * player reported impossible: the sentinel's patrol line is the only
 * crossing and no safe window opens in any direction (BUG-003). The cube
 * must traverse the sentinel's whole patrol span at 5.88 tiles/s — no
 * sentinel speed can clear that, so the geometry itself was the bug.
 */
const L46_BLOCKED = {
  id: 46,
  name: 'The Last Stair (blocked, 8eba34e)',
  map: [
    '.3.........',
    '.3.........',
    '33.........',
    '12.........',
    '12.........',
    '.21........',
    '.11........',
    '.2212......',
    '....1......',
    '...11......',
    '.2112......',
  ],
  start: [2, 10],
  goal: [1, 0],
  shards: [[2, 7], [4, 8], [4, 7], [1, 6]],
  crumble: [[3, 9], [4, 9]],
  orbs: [{ path: [[4, 7], [2, 7]], speed: 1.91 }],
};

/**
 * The L46 the timing gate now ships: the sentinel guards a 1-tile crossing
 * near the goal — the window opens ~0.74 s every patrol under the
 * press-schedule BAND model (the cube's possible positions between the
 * fastest and the slowest plausible commit both clear the sentinel,
 * ADR-018), which a player can catch. (Layout from the regenerated
 * campaign; kept here as the "after". Speed chosen so the window clears
 * the 0.5 s floor with margin under the band — the cramped 2-tile patrol
 * leaves little margin, so the sentinel is slow.)
 */
const L46_FAIR = {
  id: 46,
  name: 'The Last Stair (fair)',
  map: [
    '.......211.',
    '......111..',
    '.....222...',
    '....32.....',
    '...22......',
    '..211......',
    '.22........',
    '12.........',
    '11.........',
    '.1.........',
    '.2.........',
  ],
  start: [1, 10],
  goal: [8, 0],
  shards: [[8, 1], [0, 7], [7, 1], [1, 6]],
  crumble: [[1, 8], [1, 7], [2, 6]],
  orbs: [{ path: [[6, 1], [8, 1]], speed: 0.5 }],
};

/** Off-line tiles reachable from `from` without crossing the patrol line. */
function offLineSide(lvl, line, from) {
  const seen = new Set([key(from.x, from.z)]);
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    for (const [dx, dz] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const to = lvl.tiles.get(key(cur.x + dx, cur.z + dz));
      if (!to || line.has(key(to.x, to.z))) continue;
      const k = key(to.x, to.z);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push(to);
    }
  }
  return seen;
}

test('BUG-003: the shipped L46 layout has no fair route and is rejected', () => {
  const lvl = parseLevel(L46_BLOCKED);
  const problems = timingProblems(lvl);
  assert.ok(problems.length > 0, 'the blocked L46 must fail the timing gate');
  assert.match(problems[0], /no start→goal route|seals every crossing/);
});

test('BUG-003 fix: the fair L46 passes the timing gate', () => {
  const lvl = parseLevel(L46_FAIR);
  assert.deepEqual(timingProblems(lvl), []);
  // and the crossing it uses is genuinely fair (≥ floor), not a lucky edge
  const { line, edges } = fairCrossingGraph(lvl);
  const via = (a, b) => (edges.get(key(a[0], a[1])) || []).some((e) => e.to.x === b[0] && e.to.z === b[1]);
  assert.ok(via([7, 2], [7, 0]) || via([7, 0], [7, 2]), 'the (7,1) crossing must be advertised as fair');
  void line;
});

test('fairCrossingGraph: a fair 1-tile crossing is directed both ways', () => {
  const lvl = parseLevel(L46_FAIR);
  const { line, edges } = fairCrossingGraph(lvl);
  assert.ok(line.has(key(7, 1)));
  // enter from the approach deck (7,2), exit onto the goal slab (7,0) — and
  // the reverse must be equally fair (the window is direction-symmetric)
  const fwd = (edges.get(key(7, 2)) || []).find((e) => key(e.to.x, e.to.z) === key(7, 0));
  const rev = (edges.get(key(7, 0)) || []).find((e) => key(e.to.x, e.to.z) === key(7, 2));
  assert.ok(fwd, 'forward crossing edge (7,2)→(7,0) missing');
  assert.ok(rev, 'reverse crossing edge (7,0)→(7,2) missing');
  assert.deepEqual(fwd.seq.map((t) => key(t.x, t.z)), [key(7, 1)]);
  assert.ok(
    crossingWindow(lvl, { x: 7, z: 2 }, fwd.seq, { x: 7, z: 0 }) >= TIMING_FLOOR,
    'advertised edge must clear the timing floor',
  );
});

test('fairCrossingGraph: the sealed L46 never advertises a route-side crossing', () => {
  const lvl = parseLevel(L46_BLOCKED);
  const { line, edges } = fairCrossingGraph(lvl);
  const startSide = offLineSide(lvl, line, lvl.start);
  const goalSide = offLineSide(lvl, line, lvl.goal);
  for (const [fromK, es] of edges) {
    for (const e of es) {
      const toK = key(e.to.x, e.to.z);
      assert.ok(
        !(startSide.has(fromK) && goalSide.has(toK)) && !(goalSide.has(fromK) && startSide.has(toK)),
        `edge ${fromK}→${toK} connects the two sides — the sealed line is being advertised as fair`,
      );
    }
  }
});

test('a start on the patrol line is an escape-window problem (fair case)', () => {
  // 5-wide deck, sentinel patrols the middle row; the start sits ON the line.
  // At speed 2.0 the direct escape window is ~2.2 s — comfortably fair.
  const def = {
    id: 'esc-fair',
    name: 'Escape (fair)',
    map: ['11111', '11111', '11111'],
    start: [1, 1],
    goal: [1, 0],
    orbs: [{ path: [[0, 1], [4, 1]], speed: 2.0 }],
  };
  const lvl = parseLevel(def);
  assert.deepEqual(timingProblems(lvl), []);
  const { edges } = fairCrossingGraph(lvl);
  const esc = edges.get(key(1, 1)) || [];
  assert.ok(esc.some((e) => key(e.to.x, e.to.z) === key(1, 0)), 'a fair escape edge from the start must exist');
});

test('a start on the patrol line is an escape-window problem (sealed case)', () => {
  // Same geometry, four times faster: the escape window drops to ~0.36 s,
  // below the floor, so the level must be rejected.
  const def = {
    id: 'esc-sealed',
    name: 'Escape (sealed)',
    map: ['11111', '11111', '11111'],
    start: [1, 1],
    goal: [1, 0],
    orbs: [{ path: [[0, 1], [4, 1]], speed: 8.0 }],
  };
  const lvl = parseLevel(def);
  const probs = timingProblems(lvl);
  assert.ok(probs.length > 0, 'a sealed escape must fail the timing gate');
  const { edges } = fairCrossingGraph(lvl);
  const esc = edges.get(key(1, 1)) || [];
  assert.equal(esc.length, 0, 'no escape edge may be advertised when the window is below the floor');
  void orbLineTiles;
});

test('TIMING_FLOOR is the documented fairness floor', () => {
  assert.equal(TIMING_FLOOR, 0.5);
});

test('BUG-006: out-and-back patrols are ambiguous by POSITION — the live wait must anchor on directed dist', () => {
  // The live playable bot reads the orb's real position every wait-poll and
  // must convert it back to a distance along the patrol to simulate the
  // burst. On an out-and-back patrol (2-point path) TWO distances map to the
  // same point — forward and return leg — and `orbDistAlong` returns the
  // forward leg (the first match). Anchoring a crossing decision on that
  // mirrored position predicts the orb moving the wrong way and calls a
  // lethal moment safe (this is exactly how L21/L26 died in live play).
  const path = [[3, 3], [1, 3]];
  const speed = 1.44;
  const total = 4; // 2 out + 2 back
  const t = 1.511; // the moment of the L21 kill
  const dTrue = (t * speed) % total; // the game view's own law: return leg
  const pos = orbPosition(path, speed, 0, t);
  assert.ok(Math.abs(pos.x - 1.176) < 0.01, `orb sits on the return leg at t=${t}`);
  const dFromPos = orbDistAlong(path, pos.x, pos.z);
  assert.ok(Math.abs(dFromPos - (total - dTrue)) < 0.01, 'position alone maps to the FORWARD leg');
  assert.ok(Math.abs(dFromPos - dTrue) > 0.2, 'the two legs are genuinely distinct');
  // and the predicted futures diverge by more than the kill radius:
  const lead = 0.34; // two rolls into the burst
  const pTrue = orbPositionFromDist(orbTable(path), dTrue + speed * lead);
  const pWrong = orbPositionFromDist(orbTable(path), dFromPos + speed * lead);
  assert.ok(Math.abs(pTrue.x - pWrong.x) > 0.3, 'mirrored anchor predicts the wrong future');
});

test('BUG-007: a timing-fair crossing with an ILLEGAL entry roll is not a route', () => {
  // L39 "The Meridian" shipped with a crossing the timing sim called fair
  // (wide window) whose entry roll was a 2-tile climb — illegal under the
  // roll law. The level's only LEGAL crossing was timing-unfair, so the
  // level was unfinishable even though the old gate said "fair path exists".
  // fairCrossingGraph must refuse to advertise bursts whose rolls are
  // blocked, and timingProblems must reject the layout.
  const def = {
    id: 'l39-legacy',
    name: 'Meridian (legacy)',
    map: [
      '........1.',
      '.......22.',
      '.....232..',
      '...111....',
      '...122....',
      '..3322....',
      '...33.....',
      '..233.....',
      '..111.....',
      '...121....',
    ],
    start: [4, 9],
    goal: [8, 0],
    orbs: [{ path: [[2, 7], [4, 7]], speed: 1.77 }],
  };
  const lvl = parseLevel(def);
  const { edges } = fairCrossingGraph(lvl);
  // the (4,8)→(4,7) roll is a 2-climb (h1→h3): no crossing edge may use it
  const from48 = edges.get(key(4, 8)) || [];
  assert.equal(from48.length, 0, 'no crossing edge may start with an illegal climb');
  // (a legal descent out of the line may exist — but it faces the wrong
  // direction for the start, so it cannot create a route)
  const probs = timingProblems(lvl);
  assert.ok(probs.length > 0, 'the layout must fail the timing gate once illegal crossings are removed');
});
