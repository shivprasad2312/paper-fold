// ---------------------------------------------------------------------------
// Mid-path second chance (rescue bench) — ADR-014.
//
// The bench is the 50% press of the proven shortest path (key-aware on
// gateKey levels), adjusted to the nearest SAFE tile along that path.
// Proven here: path/par consistency, bench placement & safety, the
// key-aware rule, and the fair-reachability property the verifier relies
// on (bench → goal over fair crossings only). The game-side flow
// (offer window, accept, state kept, no time/ghost recorded) is covered
// by the playtest and the live playable-route suite.
// ---------------------------------------------------------------------------
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../../src/levels.js';
import {
  parseLevel,
  shortestRoute,
  shortestPath,
  rescueTile,
  fairReachSet,
  rollTargets,
  lineRuns,
  key,
} from '../../src/rules.js';

const levelOf = (id) => parseLevel(LEVELS[id - 1]);

test('shortestPath: length - 1 === shortestRoute, and every step is a legal press', () => {
  for (const id of [1, 5, 12, 15, 21, 27, 28, 38, 50]) {
    const level = levelOf(id);
    const par = shortestRoute(level);
    const path = shortestPath(level);
    assert.ok(path, `L${id}: path exists`);
    assert.equal(path.length - 1, par, `L${id}: press count matches par`);
    assert.equal(key(path[0].x, path[0].z), key(level.start.x, level.start.z));
    assert.equal(key(path[path.length - 1].x, path[path.length - 1].z), key(level.goal.x, level.goal.z));
    for (let i = 0; i < path.length - 1; i++) {
      const targets = rollTargets(level, path[i]);
      assert.ok(
        targets.some((t) => key(t.x, t.z) === key(path[i + 1].x, path[i + 1].z)),
        `L${id}: step ${i} (${path[i].x},${path[i].z} → ${path[i + 1].x},${path[i + 1].z}) is a legal press`,
      );
    }
  }
});

test('shortestPath: custom start/goal (the key-aware journey)', () => {
  const level = levelOf(50); // gateKey finale
  const keyTile = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
  const a = shortestPath(level, level.start, keyTile);
  const b = shortestPath(level, keyTile, level.goal);
  assert.ok(a && b, 'both legs exist');
  assert.equal(key(a[a.length - 1].x, a[a.length - 1].z), key(level.gateKey.x, level.gateKey.z));
  assert.equal(key(b[0].x, b[0].z), key(level.gateKey.x, level.gateKey.z));
  assert.equal(key(b[b.length - 1].x, b[b.length - 1].z), key(level.goal.x, level.goal.z));
});

test('the bench sits at ~50% of the path and on it', () => {
  const level = levelOf(27); // par 15, mid = 7, tiles 6..7..8 on the line
  const path = shortestPath(level);
  const rt = rescueTile(level);
  assert.ok(rt, 'bench exists');
  const idx = path.findIndex((t) => key(t.x, t.z) === key(rt.x, rt.z));
  assert.ok(idx > 0 && idx < path.length - 1, 'strictly inside the path');
  const mid = Math.floor((path.length - 1) / 2);
  assert.ok(Math.abs(idx - mid) <= 3, `near the 50% point (idx ${idx}, mid ${mid})`);
});

test('the bench is never a hazard tile (line/crumble/dock/ice/spring)', () => {
  for (const l of LEVELS) {
    const level = parseLevel(l);
    const rt = rescueTile(level);
    if (!rt) continue;
    const { line } = lineRuns(level);
    assert.ok(!line.has(key(rt.x, rt.z)), `L${l.id}: bench on a patrol line`);
    assert.ok(!rt.crumble, `L${l.id}: bench on a crumble`);
    assert.ok(!rt.shuttle, `L${l.id}: bench on a shuttle dock`);
    assert.ok(!rt.ice, `L${l.id}: bench on ice`);
    assert.ok(!rt.spring, `L${l.id}: bench on a spring`);
  }
});

test('gateKey levels: the bench sits strictly PAST the key on the journey', () => {
  for (const id of [12, 50]) {
    const level = levelOf(id);
    assert.ok(level.gateKey, `L${id} has a key`);
    const keyTile = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
    const path = [...shortestPath(level, level.start, keyTile), ...shortestPath(level, keyTile, level.goal).slice(1)];
    const rt = rescueTile(level);
    assert.ok(rt, `L${id}: bench exists`);
    const keyIdx = path.findIndex((t) => key(t.x, t.z) === key(level.gateKey.x, level.gateKey.z));
    const rtIdx = path.findIndex((t) => key(t.x, t.z) === key(rt.x, rt.z));
    assert.ok(rtIdx > keyIdx, `L${id}: bench (${rtIdx}) is past the key (${keyIdx})`);
  }
});

test('very short levels (≤ 4 presses) have no bench — a restart is instant', () => {
  assert.equal(rescueTile(levelOf(1)), null);
  assert.equal(rescueTile(levelOf(2)), null);
});

test('every shipped bench has a timing-fair route to the goal', () => {
  let benches = 0;
  for (const l of LEVELS) {
    const level = parseLevel(l);
    const rt = rescueTile(level);
    if (!rt) continue;
    benches++;
    assert.ok(
      fairReachSet(level, rt).has(key(level.goal.x, level.goal.z)),
      `L${l.id}: fair route bench (${rt.x},${rt.z}) → goal`,
    );
  }
  assert.ok(benches >= 45, `expected most levels to have a bench, got ${benches}`);
});
