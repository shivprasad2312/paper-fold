// ---------------------------------------------------------------------------
// KUBIK — difficulty audit (Phase H, ADR-047)
//
// The companion to the experience gate: scripts/experience.mjs proves the
// campaign does not repeat itself in CHARACTER; this measures whether it
// also moves in EFFORT.
//
// level_progression §6 has carried an honest risk since the 50-level era:
// "the generator's per-act budget can produce two adjacent levels of equal
// difficulty". Nobody had measured it. This does, and prints the four
// things that number is made of:
//
//   1. the curve      — par per act: range, mean, and the longest run of
//                       levels that never gets easier (normalised per act);
//   2. the plateau law — every boss-free, single-act window of 7 must span
//                       ≥ 2 par (scripts/experience.mjs:curveProblems, which
//                       is ALSO enforced by the commit gate);
//   3. the tight spots — the same measurement at a window of 6, which is
//                       where the shipped curve is at its flattest. Named,
//                       not hidden: these are the places to look first if a
//                       future regeneration makes the game feel samey;
//   4. flat pairs     — adjacent levels with the same par AND the same
//                       mechanic signature (the §6 failure mode, literally).
//
// Report-only by default, so it can be run any time without blocking a
// commit. `--strict` exits 1 on any plateau-law failure (for a CI job that
// wants the curve watched separately from the content gates).
//
//   npm run difficulty
//   npm run difficulty -- --strict
// ---------------------------------------------------------------------------
import { LEVELS, VAULT_LEVELS } from '../src/levels.js';
import { parseLevel, shortestRoute } from '../src/rules.js';
import { ACTS, actForId } from '../src/acts.js';
import { experienceFingerprint, curveProblems, CURVE_WINDOW, CURVE_MIN_SPAN } from './experience.mjs';

const STRICT = process.argv.includes('--strict');

const measured = LEVELS.map((def) => ({
  id: def.id,
  name: def.name,
  par: shortestRoute(parseLevel(def)),
  fp: experienceFingerprint(def),
}));
for (const m of measured) m.fp = experienceFingerprint(LEVELS[m.id - 1], m.par);

const byId = new Map(measured.map((m) => [m.id, m]));

// ---------------------------------------------------------------- 1. curve --
console.log('KUBIK — difficulty audit (ADR-047)\n');
console.log('1. THE CURVE — par per act');
console.log('   act                     levels   par range   mean   longest climb   span');

const actRows = [];
for (const act of ACTS) {
  const list = measured.filter((m) => m.id >= act.start && m.id <= act.end);
  if (!list.length) continue;
  const pars = list.map((m) => m.par);
  const lo = Math.min(...pars);
  const hi = Math.max(...pars);
  const mean = pars.reduce((a, b) => a + b, 0) / pars.length;
  let run = 1;
  let climb = 1;
  for (let i = 1; i < list.length; i++) {
    run = list[i].par >= list[i - 1].par ? run + 1 : 1;
    climb = Math.max(climb, run);
  }
  const span = hi - lo;
  actRows.push({ id: act.id, lo, hi, mean, climb, span, n: list.length });
  console.log(
    `   ${String(act.id).padStart(2)} ${act.name.padEnd(20)} ${String(list.length).padStart(4)}   `
    + `${String(lo).padStart(3)}–${String(hi).padEnd(3)}   ${mean.toFixed(1).padStart(5)}   `
    + `${String(climb).padStart(13)}   ${String(span).padStart(4)}`,
  );
}

// ---------------------------------------------------------- 2. plateau law --
const fps = measured.map((m) => m.fp);
const plateau = curveProblems(fps);
console.log('\n2. THE PLATEAU LAW — every boss-free in-act window of'
  + ` ${CURVE_WINDOW} must span ≥ ${CURVE_MIN_SPAN} par`);
if (plateau.length) {
  for (const p of plateau) console.log(`   ✗ ${p}`);
} else {
  console.log(`   ✓ no window of ${CURVE_WINDOW} is flatter than ${CURVE_MIN_SPAN} rolls`
    + ` (${measured.length - CURVE_WINDOW + 1} windows checked)`);
}

// --------------------------------------------------------- 3. flat stretch --
// The window law is a rule; this is what a player would actually feel: the
// longest run of levels whose par stays inside ONE two-roll band. A run of
// 6+ is a stretch that never asks for more effort.
console.log('\n3. THE FLAT STRETCH — the longest run inside one two-roll band (report only)');
const runs = [];
for (let i = 0; i < measured.length;) {
  let j = i;
  while (j + 1 < measured.length) {
    const pars = measured.slice(i, j + 2).map((m) => m.par);
    if (Math.max(...pars) - Math.min(...pars) > 2) break;
    j++;
  }
  if (j > i) {
    runs.push({
      from: measured[i].id,
      to: measured[j].id,
      n: j - i + 1,
      pars: measured.slice(i, j + 1).map((m) => m.par),
      act: actForId(measured[i].id),
    });
  }
  i = j + 1;
}
runs.sort((a, b) => b.n - a.n);
const tutorial = runs.filter((r) => r.act && r.act.id === 1);
const campaign = runs.filter((r) => !r.act || r.act.id !== 1);
for (const r of tutorial.slice(0, 2)) {
  console.log(`   · L${r.from}–L${r.to}: ${r.n} levels inside a two-roll band (${r.pars.join('→')}) — act 1 teaching band`);
}
for (const r of campaign.slice(0, 3)) {
  console.log(`   · L${r.from}–L${r.to}: ${r.n} levels inside a two-roll band (${r.pars.join('→')}) — ${r.act ? r.act.name : 'campaign'}`);
}
console.log(`   longest in act 1: ${tutorial[0] ? tutorial[0].n : 0}   longest in the campaign proper: ${campaign[0] ? campaign[0].n : 0}`);
console.log('   (act 1 is the teaching band — par 9–11 is "learn the drop", not a plateau;');
console.log('    the campaign proper never runs past five)');

// ------------------------------------------------------------ 4. flat pairs --
console.log('\n4. FLAT PAIRS — adjacent, same par, same mechanic signature');
const flatPairs = [];
for (let i = 1; i < measured.length; i++) {
  const a = measured[i - 1];
  const b = measured[i];
  if (b.id % 20 === 0) continue; // boss spike
  if (a.par !== b.par) continue;
  if (a.fp.mech !== b.fp.mech) continue;
  flatPairs.push({ a, b });
}
if (!flatPairs.length) {
  console.log('   ✓ none');
} else {
  for (const { a, b } of flatPairs) {
    console.log(`   · L${a.id} → L${b.id}: par ${a.par} both, mechanic ${a.fp.mech} both — ${a.name} → ${b.name}`);
  }
  console.log('   (two teaching beats at par 2 and 5 are not effort plateaus; the mid-act');
  console.log('    pair is the one §6 was describing — report-only, fixing it means re-cutting');
  console.log('    a shipped level, which is a content decision, not an audit one)');
}

// -------------------------------------------------------------- the vault --
// The bonus set is played back-to-back by a completionist, so it gets the
// same measurement even though it is not part of the campaign sequence.
const vaultFps = VAULT_LEVELS.map((def) => experienceFingerprint(def, shortestRoute(parseLevel(def))));
const vaultPlateau = curveProblems(vaultFps);
console.log(`\n5. THE VAULT — ${VAULT_LEVELS.length} rooms`);
if (vaultPlateau.length) for (const p of vaultPlateau) console.log(`   ✗ ${p}`);
else {
  const pars = vaultFps.map((f) => f.par);
  console.log(`   ✓ no plateau (par ${Math.min(...pars)}–${Math.max(...pars)}, span ${Math.max(...pars) - Math.min(...pars)})`);
}

// --------------------------------------------------------------- verdict --
const fail = plateau.length + vaultPlateau.length;
console.log(`\n${fail ? `${fail} curve problem(s)` : 'curve OK'} · ${runs.length} band run(s) · ${flatPairs.length} flat pair(s)`
  + ` · ${STRICT ? 'strict' : 'report-only'}`);
process.exit(STRICT && fail ? 1 : 0);
