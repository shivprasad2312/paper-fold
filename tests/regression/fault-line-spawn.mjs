// REGRESSION — BUG-002: "Fault Line" shipped with a sentinel SPAWNING on the
// player's start tile: first frame → instant death → respawn → instant death.
// The patrol may CROSS the start tile (timing play); it may never SPAWN there.
// Root cause: the hand level's orb path began at the start tile.
// Fix: the level data was corrected AND spawnProblems() (rules.js) now rejects
// this class for every level; the verifier runs it on all 50 + 14 dailies.
// This test pins both the specific level and the general property.
import assert from 'node:assert/strict';
import { LEVELS } from '../../src/levels.js';
import { getDailyLevel } from '../../src/daily.js';
import { parseLevel, spawnProblems } from '../../src/rules.js';

let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`  ✗ ${msg}`);
};

// 1. The original bug: level 9 "Fault Line" — no sentinel spawns on start/goal.
const faultLine = LEVELS.find((d) => d.id === 9);
assert.ok(faultLine, 'level 9 exists');
assert.equal(faultLine.name, 'Fault Line');
const fl = parseLevel(faultLine);
const flProbs = spawnProblems(fl).filter((p) => /spawn/i.test(p));
if (flProbs.length) fail(`Fault Line still has spawn problems: ${flProbs.join('; ')}`);
else console.log('  ✓ Fault Line (L9): no sentinel spawns on start/goal');

// 2. The general property: no level in the catalogue has ANY spawn problem.
let checked = 0;
for (const d of LEVELS) {
  const probs = spawnProblems(parseLevel(d)).filter((p) => /spawn|spawns|on the start|on the goal/.test(p));
  if (probs.length) fail(`L${d.id} ${d.name}: ${probs.join('; ')}`);
  checked++;
}
console.log(`  ✓ all ${checked} catalogue levels spawn-safe`);

// 3. The same for the daily generator's output (fresh data, 7 dates).
for (const date of ['2026-11-06', '2026-11-07', '2026-12-25', '2027-02-28', '2026-06-15', '2025-12-31', '2026-01-01']) {
  const { def } = getDailyLevel(date);
  const probs = spawnProblems(parseLevel(def)).filter((p) => /spawn|spawns/.test(p));
  if (probs.length) fail(`DAILY ${date}: ${probs.join('; ')}`);
}
console.log('  ✓ 7 sampled dailies spawn-safe');

if (failed) {
  console.error(`\n✗ BUG-002 regression FAILED (${failed} problem(s))`);
  process.exit(1);
}
console.log('\n✓ BUG-002 regression passed — sentinel spawn-safety holds');
