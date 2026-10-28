import {
  automaticMove, colorsFor, finishFor, isValidGame, movePiece, playerCountFor, rollDice,
  safeIndexesFor, startFor, trackLengthFor,
} from './game.js';

// All analysis uses only the current public position and possible future
// dice. The computer uses the same roll generator and rules as the player.
function trackIndex(seat, progress, count) {
  const length = trackLengthFor(count);
  return progress >= 0 && progress <= length - 2 ? (startFor(seat, count) + progress) % length : null;
}

function onSafeSquare(seat, progress, count) {
  const square = trackIndex(seat, progress, count);
  return square !== null && safeIndexesFor(count).has(square);
}

/** Probability that at least one opposing player can capture this character
 * on their next roll, assuming opponents take a capture when they can. */
export function captureRisk(game, seat, progress) {
  const count = playerCountFor(game);
  const length = trackLengthFor(count);
  const target = trackIndex(seat, progress, count);
  if (target === null || safeIndexesFor(count).has(target)) return 0;
  let survives = 1;
  for (const opponent of colorsFor(count)) {
    if (opponent === seat) continue;
    const dangerousRolls = new Set();
    for (const enemy of game.pieces[opponent]) {
      const square = trackIndex(opponent, enemy, count);
      if (square === null) continue;
      const distance = (target - square + length) % length;
      if (distance >= 1 && distance <= 6 && enemy + distance <= length - 2) dangerousRolls.add(distance);
    }
    survives *= 1 - dangerousRolls.size / 6;
  }
  return 1 - survives;
}

function positionValue(progress, count) {
  const finish = finishFor(count), length = trackLengthFor(count);
  if (progress === -1) return -30;
  if (progress === finish) return 260;
  return 10 + progress * 1.15 + (progress >= length - 1 ? 60 : 0);
}

function dangerCost(game, seat) {
  const count = playerCountFor(game);
  return game.pieces[seat].reduce((total, progress) => {
    if (progress < 0 || progress >= trackLengthFor(count) - 1) return total;
    return total + captureRisk(game, seat, progress) * (65 + progress * 2);
  }, 0);
}

function moveValue(before, index, seat) {
  const after = movePiece(before, index);
  if (after === before) return Number.NEGATIVE_INFINITY;
  const count = playerCountFor(before), finish = finishFor(count);
  if (after.phase === 'won' && after.winner === seat) return 100_000;
  const from = before.pieces[seat][index], to = after.pieces[seat][index];
  let value = positionValue(to, count) - positionValue(from, count);
  if (onSafeSquare(seat, to, count) && !onSafeSquare(seat, from, count)) value += 18;

  for (const opponent of colorsFor(count)) {
    if (opponent === seat) continue;
    const leaderBonus = before.pieces[opponent].filter((progress) => progress === finish).length * 15;
    before.pieces[opponent].forEach((progress, piece) => {
      if (progress >= 0 && progress < finish && after.pieces[opponent][piece] === -1) {
        value += 90 + progress * 1.3 + leaderBonus;
      }
    });
  }
  // A six gives the computer another roll before rivals can act. Discount
  // immediate danger, but still prefer not to leave valuable pieces exposed.
  value += dangerCost(before, seat) - dangerCost(after, seat) * (before.roll === 6 ? 0.55 : 1);
  return value;
}

function bestImmediateValue(game, seat) {
  if (game.phase !== 'choose') return 0;
  const automatic = automaticMove(game);
  const candidates = automatic === null ? game.legal : [automatic];
  return Math.max(...candidates.map((index) => moveValue(game, index, seat)));
}

/** Pick a legal move using captures, safety, progress, finishes and one-roll
 * lookahead after a six. Ties are stable, so restoring a game is predictable. */
export function chooseComputerMove(game) {
  if (!isValidGame(game) || game.phase !== 'choose') return null;
  const automatic = automaticMove(game);
  if (automatic !== null) return automatic;
  const seat = game.current;
  let best = null, bestValue = Number.NEGATIVE_INFINITY;
  for (const index of game.legal) {
    const after = movePiece(game, index);
    let value = moveValue(game, index, seat);
    if (game.roll === 6 && after.phase === 'roll' && after.current === seat) {
      // Average possible next rolls instead of predicting or altering the die.
      let nextValue = 0;
      for (let die = 1; die <= 6; die++) nextValue += bestImmediateValue(rollDice(after, die), seat);
      value += 0.4 * nextValue / 6;
    }
    if (value > bestValue) { bestValue = value; best = index; }
  }
  return best;
}
