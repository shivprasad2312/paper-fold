import test from 'node:test';
import assert from 'node:assert/strict';
import { automaticMove, colorsFor, createGame, gameModeFor, isComputerPlayer, isValidGame, movePiece, randomRoll, rollDice } from './game.js';
import { captureRisk, chooseComputerMove } from './computerPlayer.js';

function position({ count = 4, red, yellow, die }) {
  const game = createGame(count);
  game.current = 'red';
  game.pieces.red = red;
  game.pieces.yellow = yellow;
  const rolled = rollDice(game, die);
  assert.ok(isValidGame(rolled));
  return rolled;
}

test('solo games use one human and computers only on classic boards, and old saves stay local', () => {
  for (const count of [2, 3, 4]) {
    const game = createGame(count, undefined, 'computer');
    assert.equal(gameModeFor(game), 'computer');
    assert.equal(isComputerPlayer(game, colorsFor(count)[0]), false);
    for (const seat of colorsFor(count).slice(1)) assert.equal(isComputerPlayer(game, seat), true);
    const restored = JSON.parse(JSON.stringify(game));
    assert.ok(isValidGame(restored));
    assert.equal(gameModeFor(restored), 'computer');
    assert.ok(isValidGame(movePiece(rollDice(restored, 6), 0)));
  }
  for (const count of [1, 5, 6, 7]) assert.throws(() => createGame(count, undefined, 'computer'));
  for (const count of [5, 6]) assert.equal(isValidGame({ ...createGame(count), mode: 'computer' }), false);
  assert.equal(isValidGame({ ...createGame(4), mode: 'computer', playerCount: undefined }), false);
  assert.equal(gameModeFor(createGame()), 'local');
  assert.equal(isComputerPlayer(createGame(), 'red'), false);
  assert.equal(isValidGame({ ...createGame(), mode: 'invalid' }), false);
});

test('computers use the same dice and required automatic moves as a human', () => {
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  const release = rollDice(game, 6);
  assert.equal(chooseComputerMove(release), 0);
  const active = movePiece(release, 0);
  const onlyOne = rollDice(active, 2);
  assert.equal(chooseComputerMove(onlyOne), 0);
  for (let roll = 0; roll < 6; roll++) {
    const sample = () => roll;
    assert.equal(randomRoll(game, sample), randomRoll({ ...game, current: 'yellow' }, sample));
  }
  game.rollsWithoutSix.yellow = 7;
  game.rollsWithoutSix.blue = 7;
  for (const bucket of [0, 4, 5, 9, 14]) {
    assert.equal(randomRoll(game, () => bucket), randomRoll({ ...game, current: 'yellow' }, () => bucket));
  }
  assert.equal(chooseComputerMove(createGame()), null);
  assert.equal(chooseComputerMove(null), null);
});

test('the computer captures opponents, finishes characters and moves endangered pieces to safety', () => {
  const capture = position({ red: [1, 8, -1, -1], yellow: [16, -1, -1, -1], die: 2 });
  const snapshot = structuredClone(capture);
  assert.equal(chooseComputerMove(capture), 0);
  assert.equal(movePiece(capture, 0).pieces.yellow[0], -1);
  assert.deepEqual(capture, snapshot); // Strategy analysis does not mutate state or dice.
  const finish = position({ red: [54, 8, -1, -1], yellow: [-1, -1, -1, -1], die: 2 });
  assert.equal(chooseComputerMove(finish), 0);
  const escape = position({ red: [4, 8, -1, -1], yellow: [14, -1, -1, -1], die: 4 });
  assert.ok(captureRisk(escape, 'red', 4) > 0);
  assert.equal(chooseComputerMove(escape), 0);
});

test('the computer avoids an exposed landing when a safer alternative exists', () => {
  const game = position({ red: [0, 8, -1, -1], yellow: [12, -1, -1, -1], die: 2 });
  const risky = movePiece(game, 0), safer = movePiece(game, 1);
  assert.ok(captureRisk(risky, 'red', 2) > 0);
  assert.equal(captureRisk(safer, 'red', 10), 0);
  assert.equal(chooseComputerMove(game), 1);
});

test('seeded simulations beat random legal choices across two to four seats', () => {
  for (const count of [2, 3, 4]) {
    let state = 0x8cad1732, wins = 0;
    const random = (max) => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % max; };
    for (let n = 0; n < 100; n++) {
      let game = createGame(count), actions = 0;
      const smartSeat = colorsFor(count)[n % count];
      while (game.phase !== 'won' && actions++ < 3000) {
        if (game.phase === 'roll') game = rollDice(game, randomRoll(game, random));
        else {
          const forced = automaticMove(game);
          const choice = forced ?? (game.current === smartSeat ? chooseComputerMove(game) : game.legal[random(game.legal.length)]);
          assert.ok(game.legal.includes(choice));
          game = movePiece(game, choice);
        }
      }
      assert.equal(game.phase, 'won');
      if (game.winner === smartSeat) wins++;
    }
    assert.ok(wins > 100 / count + 5, `${count}-player strategy won only ${wins} games`);
  }
});
