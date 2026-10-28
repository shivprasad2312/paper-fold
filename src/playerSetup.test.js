import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, colorsFor, isValidGame, movePiece, nextColor, piecePosition, rollDice, startFor, teamColorFor } from './game.js';
import { charactersFromSetup, colorsFromSetup, createPlayerSetup, isValidPlayerSetup, swapPlayerColor } from './playerSetup.js';

test('two and three players use the classic board with fair distinct routes', () => {
  assert.deepEqual(colorsFor(2), ['yellow', 'blue']);
  assert.deepEqual(colorsFor(3), ['yellow', 'red', 'blue']);
  assert.equal((startFor('blue', 2) - startFor('yellow', 2)), 26);
  assert.deepEqual(piecePosition('yellow', 0, -1, 2), [1.75, 1.75]);
  assert.deepEqual(piecePosition('blue', 0, -1, 2), [10.75, 10.75]);
  for (const count of [2, 3]) {
    const seats = colorsFor(count);
    let game = createGame(count);
    for (const seat of seats) {
      assert.equal(game.current, seat);
      game = rollDice(game, 1);
      assert.ok(isValidGame(game));
    }
    assert.equal(game.current, seats[0]);
    assert.equal(nextColor(seats.at(-1), count), seats[0]);
    const rolled = rollDice(game, 6);
    assert.equal(movePiece(rolled, 0).current, seats[0]);
    assert.equal(movePiece(rolled, 0).pieces[seats[0]][0], 0);
  }
});

test('every setup uses distinct colors and can share the same character', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const players = createPlayerSetup(count, { yellow: 'dog', blue: 'dog' });
    assert.equal(players.length, count);
    assert.ok(isValidPlayerSetup(players));
    assert.equal(players[0].character, 'dog');
    assert.equal(players.find((player) => player.seat === 'blue').character, 'dog');
    assert.equal(new Set(players.map((player) => player.color)).size, count);
    assert.deepEqual(Object.keys(colorsFromSetup(players)), colorsFor(count));
    assert.equal(charactersFromSetup(players, null).blue, 'dog');
  }
});

test('choosing another player’s color swaps it rather than making teams ambiguous', () => {
  const players = createPlayerSetup(6, null);
  const swapped = swapPlayerColor(players, 0, 'purple');
  assert.equal(swapped[0].color, 'purple');
  assert.equal(swapped[4].color, 'yellow');
  assert.equal(players[0].color, 'yellow'); // The editable draft is immutable.
  assert.ok(isValidPlayerSetup(swapped));
  assert.strictEqual(swapPlayerColor(swapped, 0, 'purple'), swapped);
  assert.strictEqual(swapPlayerColor(swapped, 0, 'not-a-color'), swapped);
});

test('chosen colors survive saves while seat positions and game rules stay the same', () => {
  const players = swapPlayerColor(createPlayerSetup(3, null), 0, 'orange');
  const teamColors = colorsFromSetup(players);
  let game = createGame(3, teamColors);
  assert.equal(teamColorFor(game, 'yellow'), 'orange');
  assert.deepEqual(piecePosition('yellow', 0, -1, 3), [1.75, 1.75]);
  game = rollDice(game, 1);
  assert.match(game.history[0], /Orange rolled 1/);
  assert.match(game.message, /Red is up/);
  const restored = JSON.parse(JSON.stringify(game));
  assert.ok(isValidGame(restored));
  assert.deepEqual(createPlayerSetup(3, null, restored).map((player) => player.color), ['orange', 'red', 'blue']);
  assert.ok(!isValidGame({ ...restored, teamColors: { ...teamColors, red: 'orange' } }));
  assert.ok(!isValidGame({ ...restored, teamColors: { ...teamColors, red: 'invalid' } }));
  assert.ok(!isValidGame({ ...restored, teamColors: { yellow: 'orange' } }));
  assert.throws(() => createGame(3, { yellow: 'red', red: 'red', blue: 'blue' }));
  assert.ok(isValidGame(createGame(4))); // Existing saves have no teamColors field.
});
