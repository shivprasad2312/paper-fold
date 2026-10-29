// Run with: node screw-puzzle/test.js
const assert = require("assert");
const S = require("./logic.js");

// Two pieces side by side in a 3x3 board.
// A (red) at row 1 col 0-1, screwed at (1,0). B (blue) at row 0 col 2, free.
const board = {
  cols: 3,
  rows: 3,
  pieces: [
    { id: "A", color: "red", cells: [[1, 0], [1, 1]], screws: [[1, 0]] },
    { id: "B", color: "blue", cells: [[0, 2]], screws: [] },
  ],
};

// 1. Screws: unscrew removes one screw, not the piece.
assert.strictEqual(S.unscrew(board, "A", 5), null, "bad screw index rejected");
const b1 = S.unscrew(board, "A", 0);
assert.strictEqual(b1.pieces.find((p) => p.id === "A").screws.length, 0, "screw removed");
assert.strictEqual(board.pieces[0].screws.length, 1, "original board untouched");

// 2. Screwed pieces cannot slide.
assert.strictEqual(S.slide(board, "A", "left"), null, "screwed piece cannot slide");

// 3. Free piece B at (0,2): row 0 and column 2 are clear, so every direction is open.
assert.ok(S.canSlide(board, board.pieces[1], "up"));
assert.ok(S.canSlide(board, board.pieces[1], "right"));
assert.ok(S.canSlide(board, board.pieces[1], "down") === true, "B path down is col 2 rows 1-2: empty");
assert.ok(S.canSlide(board, board.pieces[1], "left"), "left along row 0 is clear");

// 4. Once A is free, it can slide left off the board.
const freeA = S.unscrew(board, "A", 0);
assert.ok(S.canSlide(freeA, freeA.pieces[0], "left"), "free A slides left");
const after = S.slide(freeA, "A", "left");
assert.strictEqual(after.pieces.length, 1, "A removed");
assert.ok(S.isSolved(S.slide(after, "B", "up")), "solved after clearing both");

// 5. A piece blocked on every side cannot slide.
const boxed = {
  cols: 3,
  rows: 3,
  pieces: [
    { id: "X", color: "x", cells: [[1, 1]], screws: [] },
    { id: "L", color: "l", cells: [[0, 1]], screws: [] },
    { id: "R", color: "r", cells: [[2, 1]], screws: [] },
    { id: "U", color: "u", cells: [[1, 0]], screws: [] },
    { id: "D", color: "d", cells: [[1, 2]], screws: [] },
  ],
};
assert.deepStrictEqual(S.exitDirs(boxed, boxed.pieces[0]), [], "fully boxed piece has no exits");
assert.strictEqual(S.solvable(boxed), true, "boxed cluster is still solvable (outer pieces leave first)");

// 6. A genuinely unsolvable board is detected: two pieces that block each other.
const deadlock = {
  cols: 2,
  rows: 1,
  pieces: [
    { id: "P", color: "p", cells: [[0, 0]], screws: [] },
    { id: "Q", color: "q", cells: [[0, 1]], screws: [] },
  ],
};
// P can slide left (clear) and Q can slide right, so this one IS solvable.
assert.strictEqual(S.solvable(deadlock), true);
const tight = {
  cols: 3,
  rows: 1,
  pieces: [
    { id: "P", color: "p", cells: [[0, 1]], screws: [] },
    { id: "Q", color: "q", cells: [[0, 0]], screws: [] },
    { id: "R", color: "r", cells: [[0, 2]], screws: [] },
  ],
};
assert.strictEqual(S.solvable(tight), true, "row of three: outer pieces leave, then middle");

// 7. Generated levels are valid, unsolved, solvable, and reproducible.
for (let level = 1; level <= 15; level++) {
  const lv = S.generateLevel(level);
  assert.ok(!S.isSolved(lv), `level ${level} not already solved`);
  assert.ok(S.solvable(lv), `level ${level} solvable`);
  // no overlapping cells, all cells on the board, every piece has >= 1 screw
  const seen = new Set();
  for (const p of lv.pieces) {
    assert.ok(p.screws.length >= 1, "piece has a screw");
    for (const [r, c] of p.cells) {
      assert.ok(r >= 0 && r < lv.rows && c >= 0 && c < lv.cols, "cell in bounds");
      const k = r + "," + c;
      assert.ok(!seen.has(k), "no overlapping cells");
      seen.add(k);
    }
  }
  console.log(`level ${String(level).padStart(2)}: ${lv.rows}x${lv.cols} board, ${lv.pieces.length} pieces`);
}
assert.deepStrictEqual(S.generateLevel(4, 99), S.generateLevel(4, 99), "same seed, same level");

console.log("All tests passed.");
