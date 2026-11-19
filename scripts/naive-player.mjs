// ---------------------------------------------------------------------------
// KUBIK — the greedy-player proxy (Phase F, ADR-044)
//
//   node scripts/naive-player.mjs [--trials 64] [--json out.json] [ids…]
//
// A playtest cohort is the real measurement, but it takes humans and a week.
// This is the cheap stand-in the protocol asks for alongside the bot: a player
// who does NOT plan — at every step they look at their four legal rolls, pick
// the one that takes them closer to the gate in a straight line, break ties at
// random, and never deliberately backtrack. That is how a first-time player
// actually moves: the route is discovered by feel, not by search.
//
// It models NAVIGATION ONLY. It ignores sentinels, crumble and every clocked
// hazard, so it never dies — it understates difficulty on purpose, and its
// number means one thing: "does following the obvious line get you there?"
// A low rate on a tutorial level is a design alarm (the level asks a first-
// time player to do something the game has not taught yet); a low rate deep
// in the campaign is usually the point (detours, keys, towers).
//
// The output is a reading, not a verdict — the report tool (playtest-report)
// replaces it the moment real sessions exist.
// ---------------------------------------------------------------------------
import { LEVELS, VAULT_LEVELS } from '../src/levels.js';
import { parseLevel, rollTargets, key } from '../src/rules.js';
import { actForId } from '../src/acts.js';

const args = process.argv.slice(2);
// flags that take a value; their values must not be mistaken for level ids
const VALUE_FLAGS = new Set(['--trials', '--json']);
const flagValues = new Set();
args.forEach((a, i) => {
  if (VALUE_FLAGS.has(a) && i + 1 < args.length) flagValues.add(i + 1);
});
const num = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const TRIALS = num('--trials', 64);
const jsonIdx = args.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const only = args.filter((a, i) => !flagValues.has(i) && !a.startsWith('--') && /^\d+$/.test(a)).map(Number);

/**
 * The proven route length under the PRESS law — BFS over `rollTargets`, the
 * same definition scripts/verify-levels.mjs uses. Using the plain roll-law
 * BFS here instead would credit the walker with fewer steps than "par" on
 * every level whose route takes a cling edge or a launch, and every ratio
 * in the report would sit below 1.
 */
function pressRoute(level) {
  const seen = new Set([key(level.start.x, level.start.z)]);
  let frontier = [level.start];
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const tile of frontier) {
      if (tile === level.goal) return d;
      for (const to of rollTargets(level, tile)) {
        const k = key(to.x, to.z);
        if (!seen.has(k)) { seen.add(k); next.push(to); }
      }
    }
    frontier = next;
    d++;
  }
  return -1;
}

/** Deterministic per-level RNG: the proxy's numbers must reproduce. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * One greedy walk. Returns { reached, steps, stuckAt, gaveUp }.
 *
 * `budget` is generous (4× par + 40): the question is whether the player can
 * find the gate at all, not whether they are efficient. A player who exceeds
 * it has stopped making progress — in a real session that is the quit.
 */
function walk(level, rand, budget) {
  const goal = level.goal;
  let cur = level.start;
  let prev = null;
  let steps = 0;
  const visits = new Map([[key(cur.x, cur.z), 1]]);

  while (steps < budget) {
    if (cur === goal) return { reached: true, steps };
    const options = rollTargets(level, cur);
    if (!options.length) return { reached: false, steps, stuckAt: [cur.x, cur.z] };

    let best = [];
    let bestScore = Infinity;
    for (const n of options) {
      const k = key(n.x, n.z);
      const seen = visits.get(k) || 0;
      // straight-line pull, a nudge away from re-walking old ground, and a
      // strong (but not absolute) refusal to reverse
      const score =
        Math.abs(n.x - goal.x) + Math.abs(n.z - goal.z) +
        seen * 0.35 +
        (prev && n.x === prev.x && n.z === prev.z ? 1000 : 0) +
        // a light random jitter: two identical openings should not produce
        // the same walk in every trial, exactly as two players differ
        rand() * 0.2;
      if (score < bestScore - 1e-9) { bestScore = score; best = [n]; }
      else if (Math.abs(score - bestScore) < 1e-9) best.push(n);
    }
    const next = best[Math.floor(rand() * best.length)] || options[0];
    prev = cur;
    cur = next;
    steps++;
    const k = key(cur.x, cur.z);
    const n = (visits.get(k) || 0) + 1;
    visits.set(k, n);
    // a player who has stood on the same tile four times has given up on
    // the room — real sessions show this as a slow drift to the quit button
    if (n >= 4) return { reached: false, steps, stuckAt: [cur.x, cur.z], gaveUp: true };
  }
  return { reached: false, steps, stuckAt: [cur.x, cur.z] };
}

const pool = [...LEVELS, ...VAULT_LEVELS];
const rows = [];
for (const def of pool) {
  if (only.length && !only.includes(def.id)) continue;
  const level = parseLevel(def);
  const par = pressRoute(level);
  const budget = Math.max(par * 4 + 40, 60);
  const rand = rng(hashSeed(`kubik-greedy-${def.id}`));

  let reached = 0;
  let gaveUp = 0;
  const steps = [];
  const stuck = new Map();
  for (let t = 0; t < TRIALS; t++) {
    const r = walk(level, rand, budget);
    if (r.reached) { reached++; steps.push(r.steps); }
    else {
      if (r.gaveUp) gaveUp++;
      if (r.stuckAt) stuck.set(r.stuckAt.join(','), (stuck.get(r.stuckAt.join(',')) || 0) + 1);
    }
  }
  const median = (xs) => {
    const a = [...xs].sort((x, y) => x - y);
    if (!a.length) return null;
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const hot = [...stuck.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  rows.push({
    id: def.id,
    name: def.name,
    act: actForId(def.id)?.id ?? null,
    vault: def.id > 200,
    par,
    trials: TRIALS,
    reached,
    rate: reached / TRIALS,
    gaveUp,
    medianSteps: median(steps),
    stepsOverPar: median(steps) != null ? +(median(steps) / par).toFixed(2) : null,
    stuckAt: hot ? hot[0] : null,
    stuckCount: hot ? hot[1] : 0,
  });
}

// ---------------------------------------------------------------- output --
const pct = (x) => `${Math.round(x * 100)}%`;
const pad = (s, n) => String(s).padEnd(n);

console.log(`KUBIK greedy-player proxy — ${TRIALS} walks per level, navigation only (no hazards)\n`);

const acts = new Map();
for (const r of rows) {
  const k = r.vault ? 'V' : r.act;
  if (!acts.has(k)) acts.set(k, []);
  acts.get(k).push(r);
}
console.log('act   levels  greedy reach   median steps / par');
for (const [k, list] of acts) {
  const rate = list.reduce((n, r) => n + r.rate, 0) / list.length;
  const over = list.filter((r) => r.stepsOverPar != null);
  const med = over.length ? over.reduce((n, r) => n + r.stepsOverPar, 0) / over.length : null;
  console.log(
    `${pad(k === 'V' ? 'VAULT' : k, 6)}${pad(list.length, 8)}${pad(pct(rate), 15)}${med == null ? '—' : med.toFixed(2)}`,
  );
}

// Where does the obvious line stop working? That boundary is a design
// statement: the onboarding promise is that a first-time player can follow
// the visible route, and detours become the lesson only after it.
const firstFail = rows.filter((r) => !r.vault && r.rate < 0.5).sort((a, b) => a.id - b.id)[0];
if (firstFail) {
  console.log(`\nthe obvious line first fails at L${firstFail.id} ${firstFail.name} (act ${firstFail.act}, ${pct(firstFail.rate)}, par ${firstFail.par})`);
} else {
  console.log('\nthe obvious line reaches every campaign gate');
}

const act1 = rows.filter((r) => !r.vault && r.act === 1);
const act1Rate = act1.reduce((n, r) => n + r.rate, 0) / act1.length;
const act1Weak = act1.filter((r) => r.rate < 0.9);
console.log(`\nonboarding (act 1, ${act1.length} levels): greedy reach ${pct(act1Rate)}`);
for (const r of act1Weak) {
  console.log(`  ⚠ L${r.id} ${r.name} — ${pct(r.rate)} (the obvious line fails more than one walk in ten)`);
}
if (!act1Weak.length) console.log('  ✓ every act-1 level is reachable by the obvious line');

// Outside the onboarding arc, a failed obvious line is the DESIGN (keys,
// detours, towers) — list the count per act, not per level, so the noise
// stays out of the reading.
console.log('\nlevels under 50% by act: ' + [...acts.entries()]
  .map(([k, list]) => `${k === 'V' ? 'VAULT' : 'act ' + k} ${list.filter((r) => r.rate < 0.5).length}/${list.length}`)
  .join(' · '));

if (jsonOut) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(jsonOut, JSON.stringify({ v: 1, trials: TRIALS, rows }, null, 2));
  console.log(`\nwrote ${jsonOut}`);
}
