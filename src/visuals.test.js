import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, movePiece } from './game.js';
import { getMoveEffects, getVisualPieces, headingBetween, headingForProgress, returnPath } from './visuals.js';

test('headings follow the board direction in all four directions', () => {
  assert.equal(headingBetween([1, 1], [2, 1]), 0); // down
  assert.equal(headingBetween([1, 1], [1, 2]), Math.PI / 2); // right
  assert.equal(Math.abs(headingBetween([1, 1], [0, 1])), Math.PI); // up
  assert.equal(headingBetween([1, 1], [1, 0]), -Math.PI / 2); // left
  assert.equal(headingForProgress('yellow', 0, 0), Math.PI / 2);
  assert.equal(headingForProgress('red', 0, 0), 0);
  assert.equal(headingForProgress('blue', 0, 0), -Math.PI / 2);
  assert.equal(Math.abs(headingForProgress('green', 0, 0)), Math.PI);
});

test('heading follows the current step through corners and the home lane', () => {
  const game = createGame();
  game.pieces.yellow[0] = 3;
  const walking = getVisualPieces(game, { color: 'yellow', index: 0, fromProgress: 4, progress: 5, phase: 'walk', duration: 400 }, [], true);
  const piece = walking.find((item) => item.color === 'yellow' && item.index === 0);
  assert.equal(piece.pose, 'walk');
  assert.equal(piece.heading, 3 * Math.PI / 4); // diagonal around the corner
  assert.equal(piece.selectable, false);
  // Yellow's last lane cell points right into the center.
  assert.equal(headingForProgress('yellow', 0, 55), Math.PI / 2);
});

test('move effects distinguish captures, safe squares, and a finish', () => {
  const base = createGame();
  const capture = { ...base, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0], pieces: { ...base.pieces, yellow: [1, -1, -1, -1], red: [42, -1, -1, -1] } };
  assert.deepEqual(getMoveEffects(capture, movePiece(capture, 0), 'yellow', 0), {
    reachedHome: false, captured: [{ color: 'red', index: 0, fromProgress: 42 }],
  });
  const safe = { ...capture, pieces: { ...capture.pieces, yellow: [6, -1, -1, -1], red: [47, -1, -1, -1] } };
  assert.deepEqual(getMoveEffects(safe, movePiece(safe, 0), 'yellow', 0).captured, []);
  const finish = { ...capture, roll: 1, pieces: { ...capture.pieces, yellow: [55, -1, -1, -1] } };
  assert.equal(getMoveEffects(finish, movePiece(finish, 0), 'yellow', 0).reachedHome, true);
});

test('finished pieces remain visible while dancing and captured pieces walk sadly home', () => {
  const game = createGame();
  game.pieces.yellow[0] = 55;
  game.pieces.red[0] = 42;
  const moving = { color: 'yellow', index: 0, fromProgress: 55, progress: 56, phase: 'celebrate' };
  const reactions = [{ color: 'red', index: 0, fromProgress: 42, progress: 41, phase: 'return', duration: 140 }];
  const visuals = getVisualPieces(game, moving, reactions, true);
  assert.equal(visuals.find((p) => p.color === 'yellow' && p.index === 0).pose, 'dance');
  const red = visuals.find((p) => p.color === 'red' && p.index === 0);
  assert.equal(red.pose, 'sad-walk');
  assert.equal(red.progress, 41);
  assert.equal(red.heading, headingBetween([3.5, 5.5], [3.5, 4.5]));
  assert.equal(red.duration, 140);
  const inYard = getVisualPieces(game, moving, [{ color: 'red', index: 0, fromProgress: 0, progress: -1, phase: 'return', duration: 500 }], true);
  assert.equal(inYard.find((p) => p.color === 'red' && p.index === 0).progress, -1);
});


test('captured characters retrace every square in reverse before returning to their yard', () => {
  assert.deepEqual(returnPath(3), [
    { fromProgress: 3, progress: 2 }, { fromProgress: 2, progress: 1 },
    { fromProgress: 1, progress: 0 }, { fromProgress: 0, progress: -1 },
  ]);
  assert.deepEqual(returnPath(0), [{ fromProgress: 0, progress: -1 }]);
  assert.equal(returnPath(50).length, 51);
  assert.deepEqual(returnPath(51), []);
  assert.deepEqual(returnPath(-1), []);
});

test('extra teams face their own routes, celebrate and retrace their longer tracks', async () => {
  const { finishFor, piecePosition, trackLengthFor } = await import('./game.js');
  for (const count of [5, 6]) {
    const game = createGame(count), color = count === 5 ? 'purple' : 'orange';
    const finish = finishFor(count), length = trackLengthFor(count);
    const first = piecePosition(color, 0, 0, count), next = piecePosition(color, 0, 1, count);
    assert.equal(headingForProgress(color, 0, 0, count), headingBetween(first, next));
    const moving = { color, index: 0, fromProgress: finish - 1, progress: finish, phase: 'celebrate' };
    assert.equal(getVisualPieces(game, moving, [], true).find((p) => p.color === color && p.index === 0).pose, 'dance');
    const returnSteps = returnPath(length - 2, length);
    assert.equal(returnSteps.length, length - 1);
    assert.deepEqual(returnSteps.at(-1), { fromProgress: 0, progress: -1 });
    assert.deepEqual(returnPath(length - 1, length), []);
  }
});
