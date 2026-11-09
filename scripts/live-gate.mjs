// ---------------------------------------------------------------------------
// KUBIK — stratified live-play gate (ADR-015, M2)
//
// At 200 levels the full live suite is ~30–45 min — right for a nightly,
// too long for every commit. The stratification (the plan, kept):
//
//   per commit  = CHANGED levels + a ROTATING 50-level window
//   nightly CI  = the FULL 200 (test:play:all)
//
// CHANGED: level ids whose content files are in the diff (staged for a
// pre-commit hook, or HEAD~1..HEAD for CI). Game-code changes (rules.js,
// game.js, …) change no level data — the rotating window samples them, and
// the nightly full run is the backstop.
//
// The rotation window advances only after a green run, and only by one of
// four 50-level quarters — every level is live-played at least once per
// four commits, and immediately if its content changed.
//
//   node scripts/live-gate.mjs            (used by `npm run test:play`)
//   KUBIK_CHANGED_REF=HEAD~1..HEAD node scripts/live-gate.mjs   (CI)
// ---------------------------------------------------------------------------
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const statePath = join(root, '.kubik-rotation.json');

/** Level ids present in the staged (or diff-ref) changes to content files. */
async function changedLevelIds() {
  let files = [];
  const ref = process.env.KUBIK_CHANGED_REF;
  try {
    if (ref) {
      files = execSync(`git diff --name-only ${ref}`, { cwd: root, encoding: 'utf8' })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      files = execSync('git diff --cached --name-only', { cwd: root, encoding: 'utf8' })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!files.length) {
        // not inside a commit: fall back to the last commit
        files = execSync('git diff --name-only HEAD~1..HEAD', { cwd: root, encoding: 'utf8' })
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  } catch {
    return []; // no git context (fresh clone) — the window still covers it
  }
  const ids = new Set();
  const contentFiles = new Set(files);
  if (contentFiles.has('src/campaign.js')) {
    const { CAMPAIGN } = await import(pathToFileURL(join(root, 'src/campaign.js')).href);
    CAMPAIGN.forEach((d) => ids.add(d.id));
  }
  if (contentFiles.has('src/campaign2.js')) {
    const { CAMPAIGN2 } = await import(pathToFileURL(join(root, 'src/campaign2.js')).href);
    CAMPAIGN2.forEach((d) => ids.add(d.id));
  }
  if (contentFiles.has('src/levels.js')) {
    for (let id = 1; id <= 13; id++) ids.add(id); // the hand-made set is inline
  }
  return [...ids].sort((a, b) => a - b);
}

/** One of four 50-level quarters; advances only on a green run. */
function rotationWindow() {
  let start = 0;
  if (existsSync(statePath)) {
    try {
      start = Math.floor(readFileSync(statePath, 'utf8')) || 0;
    } catch {
      start = 0;
    }
  }
  start = ((start % 200) + 200) % 200;
  const q = Math.floor(start / 50) * 50; // snap to a quarter boundary
  const window = Array.from({ length: 50 }, (_, i) => q + i + 1);
  return { window, next: q + 50 <= 200 ? q + 50 : 0 };
}

// top-level await is fine in .mjs
const changed = await changedLevelIds();
const { window, next } = rotationWindow();
const set = [...new Set([...changed, ...window])].sort((a, b) => a - b);

console.log(
  `▶ live gate: ${set.length} levels ` +
    `(changed ${changed.length}${changed.length ? ': ' + changed.join(',') : ''}, window ${window[0]}–${window[window.length - 1]})`,
);

const { execFileSync } = await import('node:child_process');
try {
  execFileSync(
    process.execPath,
    [join(root, 'scripts/test-levels-playable.mjs')],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, KUBIK_LEVELS: set.join(',') },
    },
  );
} catch (err) {
  // a red run keeps the window — the next commit replays the same quarter
  console.error('✗ live gate failed — rotation window kept for the next commit');
  process.exit(1);
}
writeFileSync(statePath, String(next % 200), { encoding: 'utf8' });
const nq = next % 200;
console.log(`✓ live gate passed — rotation window advanced to ${nq + 1}–${nq + 50}`);
