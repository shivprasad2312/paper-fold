import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLORS, FINISH, PLAYERS, SAFE_INDEXES, TRACK, createGame, isValidGame,
  automaticMove, legalMoves, movePiece, nextColor, piecePosition, rollDice,
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

test('any number of consecutive sixes keeps the same player rolling', () => {
  for (const count of [4, 5, 6]) {
    let game = createGame(count);
    for (let n = 1; n <= 8; n += 1) {
      const rolled = rollDice(game, 6);
      assert.equal(rolled.current, 'yellow');
      assert.equal(rolled.phase, 'choose');
      assert.equal(rolled.sixes, n);
      assert.equal(automaticMove(rolled), n === 1 ? 0 : null);
      game = movePiece(rolled, 0);
      assert.equal(game.current, 'yellow');
      assert.equal(game.phase, 'roll');
      assert.equal(game.sixes, n);
      assert.ok(isValidGame(game));
    }
    assert.equal(game.pieces.yellow[0], 42);
    const serialized = JSON.parse(JSON.stringify(game));
    assert.ok(isValidGame(serialized), 'a saved streak longer than two survives reload');
    game = rollDice(serialized, 1);
    game = movePiece(game, 0);
    assert.equal(game.current, 'red');
    assert.equal(game.sixes, 0);
  }
});

test('an unplayable six still grants another roll without a consecutive-six cap', async () => {
  const { finishFor } = await import('./game.js');
  for (const count of [4, 5, 6]) {
    const game = createGame(count), finish = finishFor(count);
    game.pieces.yellow = [finish - 1, finish, finish, finish];
    let blocked = game;
    for (let n = 1; n <= 5; n += 1) {
      blocked = rollDice(blocked, 6);
      assert.equal(blocked.current, 'yellow');
      assert.equal(blocked.phase, 'roll');
      assert.equal(blocked.sixes, n);
      assert.deepEqual(blocked.legal, []);
      assert.match(blocked.message, /another roll/i);
      assert.ok(isValidGame(blocked));
    }
    assert.equal(movePiece(rollDice(blocked, 1), 0).winner, 'yellow');
  }
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


test('automatic moves release only when none of the current player’s characters are active', () => {
  const empty = createGame();
  assert.equal(automaticMove(empty), null);
  assert.equal(automaticMove(rollDice(empty, 6)), 0);
  const anotherTeamIsOut = { ...empty, pieces: { ...empty.pieces, red: [12, -1, -1, -1] } };
  assert.equal(automaticMove(rollDice(anotherTeamIsOut, 6)), 0);
  const someFinished = { ...empty, pieces: { ...empty.pieces, yellow: [56, 56, -1, -1] } };
  assert.equal(automaticMove(rollDice(someFinished, 6)), 2);
  const oneOut = { ...empty, pieces: { ...empty.pieces, yellow: [3, -1, -1, -1] } };
  assert.equal(automaticMove(rollDice(oneOut, 4)), 0);
  assert.equal(automaticMove(rollDice(oneOut, 6)), null); // On a six, let the player choose.
  const oneOutNoYard = { ...empty, pieces: { ...empty.pieces, yellow: [3, 56, 56, 56] } };
  assert.deepEqual(rollDice(oneOutNoYard, 6).legal, [0]);
  assert.equal(automaticMove(rollDice(oneOutNoYard, 6)), null); // Even a sole legal piece waits for a tap on six.
  const cannotMove = { ...empty, pieces: { ...empty.pieces, yellow: [55, -1, -1, -1] } };
  assert.equal(automaticMove(rollDice(cannotMove, 6)), null); // Yard pieces remain a manual choice.
  const twoOut = { ...empty, pieces: { ...empty.pieces, yellow: [3, 9, -1, -1] } };
  assert.equal(automaticMove(rollDice(twoOut, 6)), null);
  const onlyOneLegal = { ...empty, pieces: { ...empty.pieces, yellow: [50, 55, -1, -1] } };
  assert.deepEqual(rollDice(onlyOneLegal, 2).legal, [0]);
  assert.equal(automaticMove(rollDice(onlyOneLegal, 2)), null); // Two are still on the board.
  const thirdSix = rollDice({ ...oneOut, sixes: 2 }, 6);
  assert.equal(thirdSix.current, 'yellow');
  assert.equal(thirdSix.sixes, 3);
  assert.equal(automaticMove(thirdSix), null);
});

test('legacy games without a player count remain classic and invalid mode data is rejected', async () => {
  const { playerCountFor } = await import('./game.js');
  const legacy = createGame();
  delete legacy.playerCount;
  delete legacy.rollsWithoutSix;
  legacy.pieces.red[0] = 51;
  assert.equal(playerCountFor(legacy), 4);
  assert.ok(isValidGame(legacy));
  const continued = rollDice(legacy, 2);
  assert.equal(continued.current, 'red');
  assert.equal(continued.rollsWithoutSix.yellow, 1);
  assert.equal(continued.pieces.red[0], 51);
  assert.ok(isValidGame(continued));
  assert.equal(isValidGame({ ...legacy, playerCount: 7 }), false);
  assert.equal(isValidGame({ ...legacy, playerCount: null }), false);
  assert.equal(isValidGame({ ...legacy, playerCount: 5 }), false); // Missing fifth team.
  assert.equal(isValidGame({ ...createGame(5), current: 'orange' }), false);
  assert.equal(isValidGame({ ...createGame(5), pieces: { ...createGame(5).pieces, purple: [55, -1, -1, -1] } }), false);
});

test('five and six players take turns, capture, use safe cells and finish with the same rules', async () => {
  const { colorsFor, finishFor, startFor, trackLengthFor, safeIndexesFor } = await import('./game.js');
  for (const count of [5, 6]) {
    const colors = colorsFor(count), length = trackLengthFor(count), finish = finishFor(count);
    let game = createGame(count);
    assert.ok(isValidGame(game));
    assert.deepEqual(Object.keys(game.pieces), colors);
    for (const color of colors) {
      assert.equal(game.current, color);
      game = rollDice(game, 1);
    }
    assert.equal(game.current, 'yellow');
    assert.equal(nextColor(colors.at(-1), count), 'yellow');
    const opponent = colors.at(-1);
    // Yellow's progress 2 is an unprotected cell; the last team is there too.
    const target = (startFor('yellow', count) + 2) % length;
    const enemyProgress = (target - startFor(opponent, count) + length) % length;
    assert.ok(!safeIndexesFor(count).has(target));
    const capture = { ...createGame(count), phase: 'choose', roll: 1, lastRollBy: 'yellow', legal: [0],
      pieces: { ...createGame(count).pieces, yellow: [1, -1, -1, -1], [opponent]: [enemyProgress, -1, -1, -1] } };
    assert.ok(isValidGame(capture));
    assert.equal(movePiece(capture, 0).pieces[opponent][0], -1);
    const safeTarget = (startFor('yellow', count) + 5) % length;
    const safeEnemy = (safeTarget - startFor(opponent, count) + length) % length;
    const safe = { ...capture, pieces: { ...capture.pieces, yellow: [4, -1, -1, -1], [opponent]: [safeEnemy, -1, -1, -1] } };
    assert.ok(safeIndexesFor(count).has(safeTarget));
    assert.equal(movePiece(safe, 0).pieces[opponent][0], safeEnemy);
    const lane = { ...capture, pieces: { ...capture.pieces, yellow: [length - 2, -1, -1, -1] } };
    assert.equal(movePiece(lane, 0).pieces.yellow[0], length - 1);
    const win = { ...capture, current: opponent, lastRollBy: opponent,
      pieces: { ...createGame(count).pieces, [opponent]: [finish - 1, finish, finish, finish] } };
    const won = movePiece(win, 0);
    assert.equal(won.winner, opponent);
    assert.equal(won.pieces[opponent][0], finish);
    assert.ok(isValidGame(won));
    assert.deepEqual(legalMoves([-1, finish - 1, finish, finish], 2, finish), []);
    assert.deepEqual(legalMoves([-1, finish - 1, finish, finish], 1, finish), [1]);
    const empty = createGame(count);
    assert.equal(automaticMove(rollDice(empty, 6)), 0);
    const oneOut = { ...empty, pieces: { ...empty.pieces, yellow: [finish - 1, -1, -1, -1] } };
    assert.equal(automaticMove(rollDice(oneOut, 6)), null);
    assert.equal(automaticMove(rollDice(oneOut, 1)), 0);
    const thirdSix = rollDice({ ...oneOut, sixes: 2 }, 6);
    assert.equal(thirdSix.current, 'yellow');
    assert.equal(thirdSix.sixes, 3);
    assert.equal(thirdSix.phase, 'choose');
  }
});

test('simulated two- through six-player games stay valid through a win', () => {
  for (const count of [2, 3, 4, 5, 6]) for (let initialSeed = 11; initialSeed <= 15; initialSeed += 1) {
    let seed = initialSeed;
    const random = (max) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    let game = createGame(count), actions = 0;
    while (game.phase !== 'won' && actions < 10000) {
      game = game.phase === 'roll' ? rollDice(game, random(6) + 1) : movePiece(game, game.legal[random(game.legal.length)]);
      assert.ok(isValidGame(game), `invalid ${count}-player state at action ${actions}`);
      actions += 1;
    }
    assert.equal(game.phase, 'won', `${count}-player game ${initialSeed} did not finish`);
  }
});
