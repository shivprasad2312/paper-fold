// Dependency-free logic tests: `npm test`
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WORLD, pickSpawnTier } from '../src/game.js';
import { FRUITS, SPAWN_WEIGHTS } from '../src/fruits.js';
import Matter from 'matter-js';

const STEP = 1000 / 60;

function run(game, ms) {
  for (let t = 0; t < ms; t += STEP) game.update(STEP);
}

test('a drop creates one fruit of the announced next tier', () => {
  const game = new Game();
  const expected = game.nextTier;
  const record = game.drop(WORLD.width / 2, 0);
  assert.ok(record);
  assert.equal(record.tier, expected);
  assert.equal(game.fruits.length, 1);
});

test('aim is clamped so fruit can never spawn inside a wall', () => {
  const game = new Game();
  game.nextTier = 4; // kiwi, the widest of the droppable tiers
  const r = FRUITS[4].r;
  assert.equal(game.clampAim(-500, 4), r + 4);
  assert.equal(game.clampAim(5000, 4), WORLD.width - r - 4);
});

test('two of a kind fold into the next tier and score', () => {
  const game = new Game();
  let merged = null;
  game.on('merge', (payload) => (merged = payload));

  game.nextTier = 0;
  const a = game.drop(150, 0);
  run(game, 400);
  game.nextTier = 0;
  const b = game.drop(150, 1000);
  run(game, 1200);

  assert.equal(a.tier, 0);
  assert.equal(b.tier, 0);
  assert.ok(merged, 'merge event fired');
  assert.equal(merged.tier, 1);
  assert.ok(game.score > 0);
  assert.ok(
    game.fruits.some((f) => f.tier === 1),
    'a tier-1 fruit exists after the fold'
  );
  const worldBodies = Matter.Composite.allBodies(game.world);
  assert.ok(!worldBodies.includes(a.body), 'first merged body was removed from physics');
  assert.ok(!worldBodies.includes(b.body), 'second merged body was removed from physics');
  assert.equal(
    worldBodies.length,
    game.statics.length + game.fruits.length,
    'no invisible merged bodies remain in the physics world'
  );
});

test('the two largest fruits politely refuse to fold', () => {
  const game = new Game();
  const last = FRUITS.length - 1;
  const a = { body: null, tier: last, merged: false };
  const b = { body: null, tier: last, merged: false };
  let fired = false;
  game.on('merge', () => (fired = true));
  game.tryMerge(a, b);
  assert.equal(fired, false);
});

test('a full jar ends the run', () => {
  const game = new Game();
  let over = null;
  game.on('gameover', (payload) => (over = payload));

  let t = 0;
  for (let i = 0; i < 400 && !game.over; i++) {
    t += 500;
    game.drop(60 + ((i * 37) % 240), t);
    run(game, 500);
  }

  assert.ok(game.over, 'the run ends once the pile overflows');
  assert.ok(over);
  assert.equal(over.score, game.score);
  assert.ok(over.merges >= 0);
});

test('spawn tiers stay inside the droppable range', () => {
  const total = SPAWN_WEIGHTS.length;
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const tier = pickSpawnTier();
    assert.ok(tier >= 0 && tier < total);
    seen.add(tier);
  }
  assert.equal(seen.size, total, 'every droppable fruit shows up');
});

test('a fresh game is clean', () => {
  const game = new Game();
  game.nextTier = 2;
  game.drop(120, 0);
  run(game, 300);
  game.newGame();
  assert.equal(game.fruits.length, 0);
  assert.equal(game.pending.length, 0);
  assert.equal(game.score, 0);
  assert.equal(game.over, false);
  assert.ok(game.best >= 0);
});
