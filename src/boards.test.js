import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_COLORS, getRadialBoard } from './boards.js';
import { colorsFor, finishFor, piecePosition, trackLengthFor } from './game.js';

const distance = (a, b) => Math.hypot(a.row - b.row, a.col - b.col);
// Separating-axis test, including the rendered cell's half-stroke.
function overlaps(a, b, size = 0.845) {
  const first = a.rotation * Math.PI / 180, second = b.rotation * Math.PI / 180;
  const dx = b.col - a.col, dy = b.row - a.row;
  for (const axis of [first, first + Math.PI / 2, second, second + Math.PI / 2]) {
    const separation = Math.abs(dx * Math.cos(axis) + dy * Math.sin(axis));
    const extent = (angle) => size / 2 * (Math.abs(Math.cos(angle - axis)) + Math.abs(Math.sin(angle - axis)));
    if (separation >= extent(first) + extent(second) - 0.0001) return false;
  }
  return true;
}

test('five and six use separate symmetric boards with a full yard and lane per team', () => {
  assert.equal(getRadialBoard(4), null); // the original cross is never replaced
  for (const count of [5, 6]) {
    const board = getRadialBoard(count);
    const length = count * 10;
    assert.deepEqual(board.colors, ALL_COLORS.slice(0, count));
    assert.deepEqual(colorsFor(count), board.colors);
    assert.equal(board.track.length, length);
    assert.equal(trackLengthFor(count), length);
    assert.equal(finishFor(count), length + 4);
    assert.equal(board.safeIndexes.size, count * 2);
    assert.equal(new Set(board.track.map(({ row, col }) => `${row},${col}`)).size, length);
    for (const [index, color] of board.colors.entries()) {
      assert.equal(board.starts[color], index * 10 + 5);
      assert.ok(board.safeIndexes.has(board.starts[color]));
      assert.ok(board.safeIndexes.has((board.starts[color] + 5) % length));
      assert.equal(board.yards[color].slots.length, 4);
      assert.equal(board.lanes[color].length, 5);
      assert.deepEqual(piecePosition(color, 0, -1, count), board.yards[color].slots[0]);
      const start = board.track[board.starts[color]];
      assert.deepEqual(piecePosition(color, 0, 0, count), [start.row, start.col]);
      const lastTrack = board.track[(board.starts[color] + length - 2) % length];
      assert.ok(distance(lastTrack, board.lanes[color][0]) < 1.1);
      for (let lane = 0; lane < 5; lane += 1) {
        const cell = board.lanes[color][lane];
        assert.deepEqual(piecePosition(color, 0, length - 1 + lane, count), [cell.row, cell.col]);
      }
      assert.deepEqual(piecePosition(color, 0, finishFor(count), count), [7.5, 7.5]);
      for (const [row, col] of board.yards[color].slots) {
        assert.ok(row > 0.8 && row < 14.2 && col > 0.8 && col < 14.2);
        assert.ok(board.track.every((cell) => Math.hypot(row - cell.row, col - cell.col) > 1));
      }
    }
    for (let i = 0; i < length; i += 1) {
      const next = board.track[(i + 1) % length];
      assert.ok(distance(board.track[i], next) >= 0.89 && distance(board.track[i], next) <= 1.4);
      for (let j = i + 1; j < length; j += 1) assert.equal(overlaps(board.track[i], board.track[j]), false, `track overlap ${i}, ${j} on ${count}`);
      for (const color of board.colors) for (const lane of board.lanes[color]) {
        assert.equal(overlaps(board.track[i], lane), false, `track ${i} crosses the ${color} lane on ${count}`);
      }
    }
  }
});
