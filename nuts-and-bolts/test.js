// Run with: node nuts-and-bolts/test.js
const assert = require("assert");
const L = require("./logic.js");

// 1. Basic move rules
const s = [[0, 1], [1], []];
assert.strictEqual(L.canMove(s, 0, 1), true, "top nut matches target top");
assert.strictEqual(L.canMove([[0, 1], [2]], 0, 1), false, "mismatched colours rejected");
assert.strictEqual(L.canMove([[0, 1], []], 0, 1), true, "single nut onto empty allowed");
assert.strictEqual(L.canMove([[0, 0, 0, 0], []], 0, 1), false, "full-colour bolt not moved to empty");
assert.strictEqual(L.canMove([[0, 0, 0, 0], [0, 0, 0, 0]], 0, 1), false, "full target rejected");

// 2. Solved detection
assert.ok(L.isSolved([[1, 1, 1, 1], [0, 0, 0, 0], []]));
assert.ok(!L.isSolved([[1, 1, 1, 0], [0, 0, 0, 1], []]));

// 3. Solver finds a valid solution for a small hand-made level
const tiny = [[0, 1, 0, 1], [1, 0, 1, 0], []];
const sol = L.solve(tiny);
assert.ok(sol, "tiny level solvable");
let cur = tiny;
for (const [f, t] of sol) {
  cur = L.applyMove(cur, f, t);
  assert.ok(cur, "every solver move is legal");
}
assert.ok(L.isSolved(cur), "solver path ends solved");

// 4. Generated levels are unsolved, well-formed, and solvable
for (let level = 1; level <= 12; level++) {
  const lv = L.generateLevel(level);
  assert.strictEqual(lv.state.length, lv.bolts);
  const nuts = lv.state.flat();
  assert.strictEqual(nuts.length, lv.colors * L.CAPACITY, "nut count matches colours");
  for (let c = 0; c < lv.colors; c++) {
    assert.strictEqual(nuts.filter((x) => x === c).length, L.CAPACITY, "each colour appears CAPACITY times");
  }
  assert.ok(!L.isSolved(lv.state), `level ${level} not pre-solved`);
  const solution = L.solve(lv.state, 500000);
  assert.ok(solution, `level ${level} solvable`);
  console.log(`level ${String(level).padStart(2)}: ${lv.colors} colours, ${lv.bolts} bolts, solver path ${solution.length} moves`);
}

// 5. Determinism: same seed -> same level
assert.deepStrictEqual(L.generateLevel(3, 42).state, L.generateLevel(3, 42).state);

console.log("All tests passed.");
