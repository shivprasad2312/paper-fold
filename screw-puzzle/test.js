// Run with: node screw-puzzle/test.js
// Each level has a scripted solution. The test runs real physics (Matter.js)
// and checks that every piece falls off the board.
const assert = require("assert");
const Matter = require("./vendor/matter.min.js");
const { createGame } = require("./game.js");
const { LEVELS } = require("./levels.js");

const TICKS = 1000 / 60;
function settle(game, ticks = 240) {
  for (let i = 0; i < ticks; i++) game.step(TICKS);
}
function ok(res) {
  assert.ok(res.ok, "action failed: " + res.reason);
  return res;
}

// Scripted solutions, in the order a player would tap.
const SOLUTIONS = [
  // Level 1: tray holds 2, so both screws fit. The plank falls.
  [
    ["screw", "a1"],
    ["screw", "a2"],
    ["settle"],
  ],
  // Level 2: the tray fills after a1/a2. Park them in storage, then free b.
  [
    ["screw", "a1"],
    ["screw", "a2"],
    ["settle"],
    ["screw", "a1"], // pick up from tray
    ["hole", "st1"],
    ["screw", "a2"],
    ["hole", "st2"],
    ["screw", "b1"],
    ["screw", "b2"],
    ["settle"],
  ],
  // Level 3: the lower plank g is removed first, so the upper plank f can fall onto nothing.
  [
    ["screw", "g1"],
    ["screw", "g2"],
    ["settle"],
    ["screw", "g1"], // pick up from tray
    ["hole", "st1"],
    ["screw", "g2"],
    ["hole", "st2"],
    ["screw", "f1"],
    ["screw", "f2"],
    ["settle"],
  ],
];

LEVELS.forEach((def, idx) => {
  const game = createGame(Matter, def);
  assert.strictEqual(game.status, "playing", def.name + " starts playing");
  for (const step of SOLUTIONS[idx]) {
    if (step[0] === "settle") settle(game);
    else if (step[0] === "screw") ok(game.tapScrew(step[1]));
    else if (step[0] === "hole") ok(game.tapHole(step[1]));
  }
  // Give the physics extra time to drop everything.
  for (let i = 0; i < 600 && game.status === "playing"; i++) game.step(TICKS);
  assert.strictEqual(game.status, "won", def.name + " should be cleared by the scripted solution");
  console.log(`${def.name}: cleared`);
});

// Rule checks on level 2.
{
  const game = createGame(Matter, LEVELS[1]);
  ok(game.tapScrew("a1"));
  ok(game.tapScrew("a2"));
  const blocked = game.tapScrew("b1");
  assert.strictEqual(blocked.ok, false, "tray full: cannot unscrew a third screw");
  assert.ok(/tray full/.test(blocked.reason));
  assert.strictEqual(game.tapHole("st1").ok, false, "a hole needs a picked-up screw first");
}

// A screw placed into a hole with no piece under it stays loose.
{
  const game = createGame(Matter, LEVELS[1]);
  ok(game.tapScrew("a1"));
  ok(game.tapScrew("a1"));
  const res = ok(game.tapHole("st1"));
  assert.strictEqual(res.pinned, false, "storage hole is off the planks: no pin");
}

console.log("All tests passed.");
