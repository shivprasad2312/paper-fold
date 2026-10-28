import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, movePiece, rollDice, STORAGE_KEY } from './game.js';
import { canStoreGame, clearPendingMove, loadSavedGame, PENDING_MOVE_KEY, pendingMoveMatches, saveGame, savePendingMove } from './gamePersistence.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function chosenGame(count = 4) {
  const game = createGame(count);
  game.pieces.yellow = [1, 8, -1, -1];
  return rollDice(game, 2);
}

test('an interrupted selected move is applied once and the journal is cleared', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const storage = memoryStorage(), before = chosenGame(count);
    const expected = movePiece(before, 1);
    assert.equal(saveGame(storage, before), true);
    assert.equal(savePendingMove(storage, before, 1), true);
    assert.deepEqual(loadSavedGame(storage), expected);
    assert.equal(storage.getItem(PENDING_MOVE_KEY), null);
    assert.deepEqual(loadSavedGame(storage), expected);
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), expected);
  }
});

test('computer games preserve mode and recover a selected computer move exactly once', () => {
  for (const count of [2, 3, 4]) {
    const storage = memoryStorage(), game = createGame(count, undefined, 'computer');
    game.current = count === 2 ? 'blue' : 'red';
    game.pieces[game.current] = [1, 8, -1, -1];
    const before = rollDice(game, 2), expected = movePiece(before, 1);
    saveGame(storage, before);
    savePendingMove(storage, before, 1);
    assert.deepEqual(loadSavedGame(storage), expected);
    assert.equal(loadSavedGame(storage).mode, 'computer');
    assert.equal(storage.getItem(PENDING_MOVE_KEY), null);
  }
});

test('a completed or unrelated save never receives a stale move twice', () => {
  const storage = memoryStorage(), before = chosenGame();
  const completed = movePiece(before, 0);
  savePendingMove(storage, before, 0);
  saveGame(storage, completed); // A previous session saved the outcome before removing the journal.
  assert.deepEqual(loadSavedGame(storage), completed);
  assert.equal(storage.getItem(PENDING_MOVE_KEY), null);
  savePendingMove(storage, before, 0);
  const newGame = createGame(6);
  saveGame(storage, newGame);
  assert.deepEqual(loadSavedGame(storage), newGame);
  assert.equal(storage.getItem(PENDING_MOVE_KEY), null);
});

test('corrupt journals and invalid choices do not change a valid game', () => {
  const storage = memoryStorage(), before = chosenGame();
  saveGame(storage, before);
  for (const pending of ['not json', JSON.stringify({ version: 1, before, index: 3 }), JSON.stringify({ version: 2, before, index: 0 }), JSON.stringify({ version: 1, before: null, index: 0 })]) {
    storage.setItem(PENDING_MOVE_KEY, pending);
    assert.deepEqual(loadSavedGame(storage), before);
    assert.equal(storage.getItem(PENDING_MOVE_KEY), null);
  }
  assert.equal(pendingMoveMatches({ version: 1, before, index: 0 }, before), true);
  assert.equal(pendingMoveMatches({ version: 1, before, index: 1 }, createGame()), false);
});

test('blocked storage degrades safely and never breaks gameplay', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(canStoreGame(memoryStorage()), true);
  assert.equal(canStoreGame(blocked), false);
  assert.equal(canStoreGame(null), false);
  assert.equal(loadSavedGame(blocked), null);
  assert.equal(saveGame(blocked, createGame()), false);
  assert.equal(savePendingMove(blocked, chosenGame(), 0), false);
  assert.doesNotThrow(() => clearPendingMove(blocked));
});
