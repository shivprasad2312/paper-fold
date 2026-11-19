// ---------------------------------------------------------------------------
// KUBIK — playtest report (Phase F, ADR-044)
//
//   node scripts/playtest-report.mjs sessions/*.json
//   node scripts/playtest-report.mjs exports/ --out docs/playtest-cohort.md
//
// Reads one or more exported session files (the JSON the game writes from
// `?playtest=1` → "Export session"), pools them into one cohort and prints
// the report: first-try clear rate, deaths per level, time and moves against
// par, quit points, and the hard-target flags.
//
// The arithmetic lives in src/playtestStats.js (unit-tested); this file only
// does file handling and presentation. A malformed file is reported and
// skipped, never silently dropped — a cohort is only as honest as its inputs.
// ---------------------------------------------------------------------------
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

import { analyseSessions, renderMarkdown } from '../src/playtestStats.js';
import { actForId } from '../src/acts.js';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const inputs = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));

if (!inputs.length) {
  console.error('usage: node scripts/playtest-report.mjs <file-or-dir...> [--out report.md]');
  process.exit(2);
}

/** Every .json under a path (one level of directories is enough). */
function filesUnder(path) {
  const st = statSync(path);
  if (st.isFile()) return [path];
  return readdirSync(path)
    .filter((f) => extname(f) === '.json')
    .map((f) => join(path, f))
    .sort();
}

const sessions = [];
const problems = [];
for (const path of inputs) {
  for (const file of filesUnder(path)) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      const session = data.session || (data.events ? data : null);
      if (!session || data.kind !== 'playtest' && data.app !== 'kubik' && !data.events) {
        problems.push(`${file}: not a KUBIK playtest export`);
        continue;
      }
      if (!Array.isArray(session.events)) {
        problems.push(`${file}: session has no events array`);
        continue;
      }
      sessions.push(session);
    } catch (err) {
      problems.push(`${file}: ${err.message}`);
    }
  }
}

if (!sessions.length) {
  console.error('no readable sessions — nothing to report');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

const report = analyseSessions(sessions, { actFor: actForId });
const markdown = renderMarkdown(report);

console.log(markdown);
if (problems.length) {
  console.error(`\n⚠ ${problems.length} file(s) skipped:`);
  for (const p of problems) console.error(`  - ${p}`);
}
if (outFile) {
  writeFileSync(outFile, markdown + '\n');
  console.log(`\nwrote ${outFile}`);
}
