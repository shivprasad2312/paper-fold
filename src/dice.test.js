import test from 'node:test';
import assert from 'node:assert/strict';
import { colorsFor, createGame, finishFor, isValidGame, movePiece, randomRoll, rollDice } from './game.js';

function withMisses(game, color, misses) {
  return { ...game, current: color, rollsWithoutSix: { ...game.rollsWithoutSix, [color]: misses } };
}

test('opening assistance uses the seventh through tenth personal attempts', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const game = createGame(count);
    for (const color of colorsFor(count)) {
      for (let misses = 0; misses < 6; misses += 1) {
        const state = withMisses(game, color, misses);
        const faces = Array.from({ length: 6 }, (_, index) => randomRoll(state, (size) => {
          assert.equal(size, 6, `normal distribution at ${misses} misses`);
          return index;
        }));
        assert.deepEqual(faces, [1, 2, 3, 4, 5, 6]);
      }
      for (const [misses, buckets, nonSixWeight] of [[6, 20, 3], [7, 15, 2], [8, 10, 1]]) {
        const state = withMisses(game, color, misses);
        const counts = Array(7).fill(0);
        for (let index = 0; index < buckets; index += 1) {
          const die = randomRoll(state, (size) => { assert.equal(size, buckets); return index; });
          counts[die] += 1;
        }
        assert.equal(counts[6], 5);
        assert.deepEqual(counts.slice(1, 6), Array(5).fill(nonSixWeight));
      }
      for (const misses of [9, 10, 50]) {
        assert.equal(randomRoll(withMisses(game, color, misses), () => { throw new Error('a guaranteed result needs no random draw'); }), 6);
      }
    }
  }
});

test('assistance is limited to the current player with no active piece and a piece in the yard', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const game = withMisses(createGame(count), 'yellow', 20);
    const finish = finishFor(count);
    // Another team's active piece does not affect yellow's opening.
    game.pieces[colorsFor(count)[1]][0] = 4;
    assert.equal(randomRoll(game, () => { throw new Error('yellow is guaranteed a six'); }), 6);
    // Finished pieces are not active, but there must still be a yard piece to release.
    game.pieces.yellow = [finish, -1, -1, -1];
    assert.equal(randomRoll(game, () => { throw new Error('yellow is guaranteed a six'); }), 6);
    game.pieces.yellow = [finish, finish, finish, finish];
    assert.equal(randomRoll(game, (size) => { assert.equal(size, 6); return 2; }), 3);
    // Even if the player has many previous misses, one active piece restores normal odds.
    for (const progress of [0, 8, finish - 1]) {
      game.pieces.yellow = [progress, -1, -1, -1];
      const faces = Array.from({ length: 6 }, (_, value) => randomRoll(game, (size) => { assert.equal(size, 6); return value; }));
      assert.deepEqual(faces, [1, 2, 3, 4, 5, 6]);
    }
  }
});

test('misses belong to each player, persist across turns and reset on a six', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const colors = colorsFor(count);
    let game = createGame(count);
    for (let turn = 0; turn < 6; turn += 1) {
      for (const color of colors) {
        assert.equal(game.current, color);
        game = rollDice(game, 1);
        assert.equal(game.rollsWithoutSix[color], turn + 1);
        assert.ok(isValidGame(game));
      }
    }
    assert.deepEqual(game.rollsWithoutSix, Object.fromEntries(colors.map((color) => [color, 6])));
    game = JSON.parse(JSON.stringify(game));
    assert.ok(isValidGame(game));
    const result = randomRoll(game, (size) => { assert.equal(size, 20); return 0; });
    assert.equal(result, 6);
    const rolled = rollDice(game, result);
    assert.equal(rolled.rollsWithoutSix.yellow, 0);
    for (const color of colors.slice(1)) assert.equal(rolled.rollsWithoutSix[color], 6);
    const moved = movePiece(rolled, 0);
    assert.equal(moved.pieces.yellow[0], 0);
    assert.equal(randomRoll(moved, (size) => { assert.equal(size, 6); return 3; }), 4);
  }
});

test('a player’s counter follows their rolls but never biases an active piece', () => {
  const game = withMisses(createGame(), 'yellow', 8);
  game.pieces.yellow[0] = 1;
  assert.equal(randomRoll(game, (size) => { assert.equal(size, 6); return 0; }), 1);
  const moved = movePiece(rollDice(game, 1), 0);
  assert.equal(moved.rollsWithoutSix.yellow, 9);
  assert.equal(moved.current, 'red');
  // The count is per player; if yellow later has no piece out, it can help again.
  const captured = { ...moved, current: 'yellow', pieces: { ...moved.pieces, yellow: [-1, -1, -1, -1] } };
  assert.equal(randomRoll(captured, () => { throw new Error('the tenth attempt is guaranteed'); }), 6);
});

test('old saves receive independent zeroed counters, while corrupt counters are rejected', () => {
  const legacy = createGame(6);
  delete legacy.rollsWithoutSix;
  legacy.current = 'purple';
  legacy.pieces.orange[0] = 10;
  assert.ok(isValidGame(legacy));
  assert.equal(randomRoll(legacy, (size) => { assert.equal(size, 6); return 1; }), 2);
  const continued = rollDice(legacy, 2);
  assert.equal(continued.rollsWithoutSix.purple, 1);
  assert.equal(continued.rollsWithoutSix.orange, 0);
  assert.equal(continued.pieces.orange[0], 10);
  assert.ok(isValidGame(continued));
  for (const bad of [null, [], {}, { ...continued.rollsWithoutSix, purple: -1 }, { ...continued.rollsWithoutSix, purple: 1.5 }]) {
    assert.equal(isValidGame({ ...continued, rollsWithoutSix: bad }), false);
  }
});

test('secure randomness discards biased byte ranges and the fallback remains usable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const originalRandom = Math.random;
  try {
    const values = [255, 252, 251, 255, 239];
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
      getRandomValues(array) { array[0] = values.shift(); return array; },
    } });
    assert.equal(randomRoll(), 6); // 255 and 252 are rejected; 251 maps to six.
    assert.equal(randomRoll(withMisses(createGame(), 'yellow', 6)), 5); // 255 rejected for 20 buckets.
    assert.equal(values.length, 0);
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    Math.random = () => 0.99;
    assert.equal(randomRoll(), 6);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
    Math.random = originalRandom;
  }
});
