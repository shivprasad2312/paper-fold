// LEVEL VALIDATION — the full gate over the level catalogue.
// The validators themselves live in scripts/ (they are the single source of
// truth, used by the pre-commit hook and CI); this runner composes them:
//   1. unit property checks over all 200 defs        (tests/unit/levels.test.mjs)
//   2. 9-check solvability proof, 200 levels + 14 dailies (scripts/verify-levels.mjs)
//   3. bot PLAYS the stratified selection to `won` — changed levels +
//      rotating 50-level quarter (scripts/live-gate.mjs, ADR-015);
//      the full 200 runs nightly in CI
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const steps = [
  ['unit properties (node --test)', 'node', ['--test', 'tests/unit/levels.test.mjs']],
  ['verifier (9 checks × 200 levels + 14 dailies)', 'node', ['scripts/verify-levels.mjs']],
  ['playable-route (stratified: changed + rotating 50 + daily)', 'node', ['scripts/live-gate.mjs']],
];

for (const [label, cmd, args] of steps) {
  process.stdout.write(`▶ ${label}\n`);
  try {
    const out = execFileSync(cmd, args, { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
    console.log(`  ✓ ${label}\n`);
  } catch (e) {
    console.error(`\n✗ level validation FAILED at: ${label}`);
    process.exit(e.status ?? 1);
  }
}
console.log('✓ LEVEL VALIDATION passed — every level is proven AND playable');
