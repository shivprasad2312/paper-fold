import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLORS, FINISH, PLAYERS, SAFE_INDEXES, TRACK, createGame, isValidGame,
  legalMoves, movePiece, nextColor, piecePosition, rollDice,
} from './game.js';

function choosing(color, die, pieces, legal = [0]) {
  const game = createGame();
  return { ...game, current: color, phase: 'choose', roll: die, lastRollBy: color, legal,
    pieces: { ...game.pieces, ...pieces } };
}

test('board has one continuous 52-square track and eight safe squares', () => {
  assert.equal(TRACK.length, 52);
  assert.equal(new Set(TRACK.map(String)).size, 52);
  assert.equal(SAFE_INDEXES.size, 8);
  TRACK.forEach(([row, col], index) => {
    const [nextRow, nextCol] = TRACK[(index + 1) % TRACK.length];
    assert.equal(Math.max(Math.abs(row - nextRow), Math.abs(col - nextCol)), 1);
  });
  COLORS.forEach((color) => {
    assert.ok(SAFE_INDEXES.has(PLAYERS[color].start));
    assert.ok(SAFE_INDEXES.has((PLAYERS[color].start + 8) % 52));
    const [entryRow, entryCol] = TRACK[(PLAYERS[color].start + 50) % 52];
    const [homeRow, homeCol] = PLAYERS[color].lane[0];
    assert.equal(Math.abs(entryRow - homeRow) + Math.abs(entryCol - homeCol), 1);
    assert.deepEqual(piecePosition(color, 0, 51), [homeRow + 0.5, homeCol + 0.5]);
  });
});

test('a character needs a six to leave and an exact roll to finish', () => {
  assert.deepEqual(legalMoves([-1, 50, 55, 56], 6), [0, 1]);
  assert.deepEqual(legalMoves([-1, 50, 55, 56], 2), [1]);
  assert.deepEqual(legalMoves([-1, 50, 55, 56], 1), [1, 2]);
  assert.deepEqual(legalMoves([-1, -1, -1, -1], 5), []);
});

test('a non-six with everyone in the yard passes the turn', () => {
  const start = createGame();
  const game = rollDice(start, 4);
  assert.equal(game.current, 'red');
  assert.equal(game.phase, 'roll');
  assert.equal(game.roll, 4);
  assert.equal(game.lastRollBy, 'yellow');
  assert.deepEqual(start.pieces.yellow, [-1, -1, -1, -1]);
  assert.ok(isValidGame(game));
});

test('six opens the yard and grants another turn after the move', () => {
  const rolled = rollDice(createGame(), 6);
  assert.deepEqual(rolled.legal, [0, 1, 2, 3]);
  assert.equal(rolled.phase, 'choose');
  const moved = movePiece(rolled, 2);
  assert.deepEqual(moved.pieces.yellow, [-1, -1, 0, -1]);
  assert.equal(moved.current, 'yellow');
  assert.equal(moved.sixes, 1);
  assert.equal(moved.phase, 'roll');
  assert.ok(isValidGame(moved));
});

test('third consecutive six forfeits the turn without undoing earlier moves', () => {
  let game = rollDice(createGame(), 6);
  game = movePiece(game, 0);
  game = rollDice(game, 6);
  game = movePiece(game, 1);
  assert.equal(game.sixes, 2);
  game = rollDice(game, 6);
  assert.equal(game.current, 'red');
  assert.equal(game.sixes, 0);
  assert.equal(game.phase, 'roll');
  assert.deepEqual(game.pieces.yellow, [0, 0, -1, -1]);
  assert.ok(isValidGame(game));
});

test('landing on an opponent on an unsafe square sends them to the yard', () => {
  // Yellow progress 3 and red progress 42 both land on track index 4.
  const game = choosing('yellow', 2, { yellow: [1, -1, -1, -1], red: [42, -1, -1, -1] });
  const moved = movePiece(game, 0);
  assert.equal(moved.pieces.yellow[0], 3);
  assert.equal(moved.pieces.red[0], -1);
  assert.equal(moved.current, 'red');
  assert.match(moved.message, /capture/i);
});

test('opponents on a safe star cannot be captured', () => {
  // Yellow progress 8 and red progress 47 both occupy safe track index 9.
  const game = choosing('yellow', 2, { yellow: [6, -1, -1, -1], red: [47, -1, -1, -1] });
  const moved = movePiece(game, 0);
  assert.equal(moved.pieces.yellow[0], 8);
  assert.equal(moved.pieces.red[0], 47);
});

test('a piece enters its own lane and wins only when all four finish', () => {
  const lane = movePiece(choosing('yellow', 1, { yellow: [50, -1, -1, -1] }), 0);
  assert.equal(lane.pieces.yellow[0], 51);
  const win = movePiece(choosing('blue', 1, { blue: [55, 56, 56, 56] }), 0);
  assert.equal(win.pieces.blue[0], FINISH);
  assert.equal(win.phase, 'won');
  assert.equal(win.winner, 'blue');
  assert.ok(isValidGame(win));
});

test('illegal actions leave the game unchanged', () => {
  const start = createGame();
  assert.equal(rollDice(start, 0), start);
  assert.equal(rollDice(start, 7), start);
  assert.equal(movePiece(start, 0), start);
  const choosingGame = rollDice(start, 6);
  assert.equal(rollDice(choosingGame, 2), choosingGame);
  assert.equal(movePiece(choosingGame, 4), choosingGame);
});

test('persisted game validation rejects corrupted or inconsistent state', () => {
  const start = createGame();
  assert.ok(isValidGame(start));
  assert.ok(isValidGame(rollDice(start, 6)));
  assert.equal(isValidGame(null), false);
  assert.equal(isValidGame({ ...start, pieces: { ...start.pieces, yellow: [-2, -1, -1, -1] } }), false);
  assert.equal(isValidGame({ ...start, phase: 'choose', roll: 6, lastRollBy: 'yellow', legal: [] }), false);
  assert.equal(isValidGame({ ...start, phase: 'won', winner: 'yellow' }), false);
  assert.equal(isValidGame({ ...start, roll: 3, lastRollBy: null }), false);
  assert.equal(nextColor('green'), 'yellow');
});

test('complete simulated games remain valid and eventually produce a winner', () => {
  for (let initialSeed = 1; initialSeed <= 10; initialSeed += 1) {
    let seed = initialSeed;
    const random = (max) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    };
    let game = createGame();
    let actions = 0;
    while (game.phase !== 'won' && actions < 5000) {
      game = game.phase === 'roll'
        ? rollDice(game, random(6) + 1)
        : movePiece(game, game.legal[random(game.legal.length)]);
      assert.ok(isValidGame(game), `invalid state in game ${initialSeed}, action ${actions}`);
      actions += 1;
    }
    assert.equal(game.phase, 'won', `game ${initialSeed} did not finish`);
  }
});
