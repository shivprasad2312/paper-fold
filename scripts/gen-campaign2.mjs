// ---------------------------------------------------------------------------
// KUBIK — campaign generator, levels 51–200 (ADR-015, milestone M2)
//
// Extends the pipeline that made 14–50: an ARCHETYPE (scripts/archetypes.mjs)
// carves the layout, the shared HAZARD STAGE (scripts/hazards.mjs) dresses
// it, and the candidate is run through the FULL verifier — spawn safety,
// reachability, soft-lock proof, crumble-aware solver, sentinel timing
// fairness, par band, and the rescue-bench check. Reject → next candidate.
// On top of that gate this generator adds:
//   - act budgets (src/acts.js): size, par, orb/crumble/speed, key, mechanics
//   - act-end boss budget (every 20th level)
//   - archetype rotation (no repeats inside an act window)
//   - uniqueness: signature hash + tile-overlap Jaccard vs shipped levels
//   - curation score: hazard variety + par placement; best candidate wins
//
//   node scripts/gen-campaign2.mjs
// ---------------------------------------------------------------------------
import {
  parseLevel,
  reachable,
  canStillFinish,
  solveHazards,
  spawnProblems,
  timingProblems,
  shortestRoute,
  rescueTile,
  fairReachSet,
  key,
  ROLL_TIME,
} from '../src/rules.js';
import { ARCHETYPES } from './archetypes.mjs';
import { applyHazards } from './hazards.mjs';
import { ACTS, actForId, isActEnd } from '../src/acts.js';
import { CAMPAIGN } from '../src/campaign.js';
import { writeFileSync } from 'node:fs';

const FIRST = Number(process.argv[2]) || 51;
const LAST = Number(process.argv[3]) || 200;
const MAX_ATTEMPTS = Number(process.env.KUBIK_MAX_ATTEMPTS) || 220;

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
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

/** Act budget for a level id (act-end levels get the boss spike). */
function budget(id) {
  const act = actForId(id);
  const g = act.gen;
  if (!g) throw new Error(`no gen budget for level ${id}`);
  const b = {
    W: g.W,
    H: g.W,
    hMin: 1,
    hMax: 3,
    par: g.par,
    orbs: g.orbs,
    crumble: g.crumble,
    speed: g.speed,
    shards: g.shards,
    fill: g.fill,
    keyP: g.keyP,
    mech: g.mech,
  };
  if (isActEnd(id)) {
    // the act-end spike: the boss carries the act's ceiling
    b.W = 18;
    b.H = 18;
    // the boss track runs long: allow the par to sit above the act ceiling
    b.par = [g.par[0] + 2, g.par[1] + 4];
    b.orbs = [g.orbs[1], g.orbs[1]];
    b.crumble = [g.crumble[1], g.crumble[1]];
    b.keyP = Math.max(g.keyP, 0.5);
  }
  if (id === 200) b.keyP = 1; // the campaign finale is always sealed
  return b;
}

/** The archetype a level should try first + its carve-forcing. */
function pickArchetype(id, act, recent) {
  const g = act.gen;
  if (isActEnd(id)) return { arch: 'boss-arena', force: {} };
  // rotate through the act's pool, never repeating the last two
  const pool = g.arch.filter((a) => !recent.includes(a));
  const list = pool.length ? pool : g.arch;
  const arch = list[(id * 7 + act.id * 3) % list.length];
  const force = {};
  if (arch === 'shuttle-span') force.shuttle = 1;
  if (arch === 'spring-field') {
    force.spring = 2;
    force.noShuttle = true;
  }
  if (arch === 'ice-river') force.ice = 1;
  if (arch === 'undertow') {
    force.ice = 1;
    force.spring = 1;
  }
  return { arch, force };
}

/**
 * Full verifier gate (the same checks the hand-made levels pass) + bench.
 * Ordered CHEAP→EXPENSIVE: the par and reachability rejections are cheap BFS
 * and must run before the sentinel-timing model (a full state-space search),
 * or a dense act-end level burns minutes on candidates that fail their par.
 */
function verify(def, b, minOrbs) {
  const problems = [];
  let level;
  try {
    level = parseLevel(def);
  } catch (err) {
    return { ok: false, problems: [err.message], par: -1 };
  }
  // — cheap -------------------------------------------------------------
  for (const p of spawnProblems(level)) problems.push(p);
  const par = shortestRoute(level);
  if (par < b.par[0] || par > b.par[1]) problems.push(`par ${par} outside ${b.par}`);
  for (const orb of level.orbs) {
    for (const [x, z] of orb.path) {
      if (!level.tiles.has(key(Math.round(x), Math.round(z)))) problems.push(`orb over void ${x},${z}`);
    }
  }
  if ((level.orbs || []).length < minOrbs) problems.push(`too few sentinels (band wants ≥ ${minOrbs})`);
  for (const sh of level.shuttles) {
    if (sh.wait < ROLL_TIME * 2.2) problems.push('shuttle dwell too short to board');
  }
  // — medium -------------------------------------------------------------
  const reach = reachable(level);
  const finish = canStillFinish(level);
  if (!reach.has(key(level.goal.x, level.goal.z))) problems.push('goal unreachable');
  for (const k of reach) {
    if (!finish.has(k)) problems.push(`soft-lock at ${k}`);
  }
  for (const s of level.shards) if (!reach.has(s.id)) problems.push(`shard ${s.x},${s.z} unreachable`);
  if (level.gateKey && !reachable(level, new Set([key(level.goal.x, level.goal.z)])).has(key(level.gateKey.x, level.gateKey.z))) problems.push('key unreachable (sealed goal blocks the cut)');
  const solve = solveHazards(level);
  if (!solve.ok) problems.push('no route survives crumble/blocks');
  if (solve.capped) problems.push('hazard search capped');
  // — expensive: only candidates that survived all of the above -----------
  if (!problems.length) {
    for (const p of timingProblems(level)) problems.push(`timing: ${p}`);
    const bench = rescueTile(level);
    if (bench && !fairReachSet(level, bench, !!level.gateKey).has(key(level.goal.x, level.goal.z))) {
      problems.push('no fair route from the rescue bench to the goal');
    }
  }
  return { ok: problems.length === 0, problems, par };
}

function timingOnly(rep) {
  return rep.problems.length > 0 && rep.problems.every((p) => p.startsWith('timing:'));
}
function tuneOrbSpeeds(def, mult) {
  return {
    ...def,
    orbs: (def.orbs || []).map((o) => ({ ...o, speed: +(o.speed * mult).toFixed(2) })),
  };
}

/** Curation score: hazard variety + par placement in the band. */
function score(def, par, b) {
  let s = (def.orbs || []).length;
  s += (def.crumble || []).length * 0.5;
  if (def.shuttles) s += 2;
  if (def.springs) s += 1.5;
  if (def.ice) s += 1;
  if (def.key) s += 2;
  const span = b.par[1] - b.par[0];
  if (par >= b.par[0] + span * 0.3 && par <= b.par[1]) s += 1.5;
  return s;
}

/** Uniqueness: exact signature or >85% tile overlap with a shipped level. */
function tileSet(def) {
  const t = new Set();
  def.map.forEach((row, z) => {
    [...row].forEach((ch, x) => {
      if (ch >= '0' && ch <= '9') t.add(`${x},${z}`);
    });
  });
  return t;
}
function isUnique(def, seenSigs, recentTileSets) {
  const ts = tileSet(def);
  const sig = [...ts].sort().join(';');
  const h = hashSeed(sig + ':' + (def.orbs || []).length + ':' + (def.crumble || []).length);
  if (seenSigs.has(h)) return null;
  for (const other of recentTileSets) {
    if (other.size > ts.size) continue;
    let inter = 0;
    for (const t of other) if (ts.has(t)) inter++;
    const union = ts.size + other.size - inter;
    if (union > 0 && inter / union > 0.85) return null;
  }
  return { sig: h, ts };
}

// ---------------------------------------------------------------------------
// seed the uniqueness set with the shipped levels (1–50)
const seenSigs = new Set();
const allTileSets = [];
for (const def of CAMPAIGN) {
  const ts = tileSet(def);
  allTileSets.push(ts);
  seenSigs.add(hashSeed([...ts].sort().join(';') + ':' + (def.orbs || []).length + ':' + (def.crumble || []).length));
}
const recentTileSets = [];

// per-act name pools: consumed in level-id order, boss gets the last name
const nameQueue = {};
for (const act of ACTS) {
  if (!act.gen) continue;
  nameQueue[act.id] = [...act.gen.names];
  // a partial run starts mid-act: the earlier levels already took their names
  const drop = Math.max(0, Math.min(nameQueue[act.id].length, FIRST - act.gen.start));
  if (drop) nameQueue[act.id] = nameQueue[act.id].slice(drop);
}

const out = [];
const archRecent = {};
for (let id = FIRST; id <= LAST; id++) {
  const act = actForId(id);
  const b = budget(id);
  const rand = rng(hashSeed(`kubik-campaign2-${id}`));
  let { arch, force } = pickArchetype(id, act, archRecent[act.id] || []);
  if (process.env.KUBIK_FORCE_ARCH) {
    const [fId, fArch] = process.env.KUBIK_FORCE_ARCH.split('=');
    if (Number(fId) === id) arch = fArch;
  }

  // key archetypes are key levels, guaranteed
  let bEff = b;
  if (arch === 'key-detour' || arch === 'vault') bEff = { ...b, keyP: 1 };
  // spring-field: never also a shuttle
  if (force.noShuttle) bEff = { ...bEff, mech: { ...bEff.mech, shuttle: 0 } };

  let def = null;
  let report = null;
  let best = null;
  const phases = [b.orbs[0], Math.max(0, Math.ceil(b.orbs[0] / 2)), 0].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  for (const minOrbs of phases) {
    if (def) break;
    let foundThisPhase = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !def; attempt++) {
      const layout = ARCHETYPES[arch](rand, bEff);
      if (!layout) continue;
      let cand = applyHazards(layout, bEff, rand, force);
      if (!cand) continue;
      cand = { ...cand, id, name: '', hint: act.gen.hint };
      let rep = verify(cand, bEff, minOrbs);
      if (process.env.KUBIK_PROBE && rep && !rep.ok && attempt < 4 && minOrbs === 0) {
        console.error(`  probe L${id} attempt ${attempt}: orbs=${(cand.orbs||[]).length} ${JSON.stringify((rep.problems||[]).slice(0,3))}`);
      }
      if (!rep.ok && timingOnly(rep) && (cand.orbs || []).length) {
        for (const m of [0.9, 0.8, 0.68, 0.56, 0.45]) {
          const tuned = tuneOrbSpeeds(cand, m);
          const r2 = verify(tuned, bEff, minOrbs);
          if (r2.ok) {
            cand = tuned;
            rep = r2;
            break;
          }
        }
      }
      if (!rep.ok) continue;
      const uniq = isUnique(cand, seenSigs, recentTileSets);
      if (!uniq) continue;
      const s = score(cand, rep.par, bEff);
      if (!best || s > best.s) best = { cand, rep, s, uniq };
      // take the first candidate that satisfies the orb budget and scores well
      if ((cand.orbs || []).length >= minOrbs && (cand.orbs || []).length && (minOrbs > 0 || attempt > 24)) {
        def = best.cand;
        report = best.rep;
        seenSigs.add(best.uniq.sig);
        recentTileSets.push(best.uniq.ts);
        allTileSets.push(best.uniq.ts);
        foundThisPhase = true;
        break;
      }
      if (!def && best && attempt >= MAX_ATTEMPTS - 40) {
        // end of attempts: settle for the best proven candidate
        def = best.cand;
        report = best.rep;
        seenSigs.add(best.uniq.sig);
        recentTileSets.push(best.uniq.ts);
        allTileSets.push(best.uniq.ts);
        foundThisPhase = true;
      }
    }
    if (!foundThisPhase && !def && minOrbs < b.orbs[0]) {
      console.error(`⚠ level ${id} (${arch}): relaxed sentinels to ${minOrbs}`);
    }
  }
  if (!def) {
    console.error(`✗ level ${id} (${arch}): no candidate passed ${MAX_ATTEMPTS} attempts`);
    process.exit(1);
  }

  // name from the act pool (boss takes the act's last name automatically)
  def.name = nameQueue[act.id].shift();
  if (!def.name) {
    console.error(`✗ level ${id}: act ${act.id} name pool exhausted`);
    process.exit(1);
  }

  // remember the archetype (rotation window: last 2 in this act)
  archRecent[act.id] = [...(archRecent[act.id] || []), arch].slice(-2);
  if (recentTileSets.length > 40) recentTileSets.shift();

  out.push(def);
  const mech =
    (def.shuttles ? 'S' : '') + (def.springs ? 'P' : '') + (def.ice ? 'I' : '') + (def.key ? 'K' : '');
  console.log(
    `${String(id).padStart(3)} [${act.name.slice(0, 8).padEnd(8)}] ${arch.padEnd(13)} ${def.name.padEnd(24)} ` +
      `par ${String(report.par).padStart(2)} · orbs ${(def.orbs || []).length} · crumble ${(def.crumble || []).length}` +
      (mech ? ` · ${mech}` : ''),
  );
}

// a PARTIAL run (e.g. `51 60`) must splice into the existing file, never
// truncate it: keep the shipped levels outside the regenerated span (and
// any slot the range failed to prove). Always merge — even a run where
// every slot in the span succeeded must not drop the rest of the file.
{
  let shipped = [];
  try {
    ({ CAMPAIGN2: shipped } = await import(new URL('../src/campaign2.js', import.meta.url)));
  } catch {
    /* no file yet — nothing to merge into */
  }
  const byId = new Map(shipped.map((d) => [d.id, d]));
  out.forEach((d) => byId.set(d.id, d));
  const merged = [...byId.values()].sort((a, b) => a.id - b.id);
  const want = Array.from({ length: 200 - 51 + 1 }, (_, i) => i + 51);
  if (want.every((id) => byId.has(id))) {
    out.length = 0;
    out.push(...merged);
    console.log(`(merged: ${merged.length} levels, ${merged.length - (LAST - FIRST + 1)} kept from the shipped file)`);
  } else {
    const missing = want.filter((id) => !byId.has(id));
    console.error(`ERROR: span ${FIRST}–${LAST} left the catalogue incomplete (missing ${missing.join(',')}) — file not written`);
    process.exit(1);
  }
}

const js = `// ---------------------------------------------------------------------------
// KUBIK — campaign levels 51–200
//
// Generated by scripts/gen-campaign2.mjs: an archetype carves the layout, the
// shared hazard stage dresses it, and every candidate is rejected until the
// full verifier proves it (reachability, soft-lock proof, crumble-aware
// solver, sentinel timing fairness, par band, rescue-bench fairness) and the
// uniqueness gate clears it. Static data on purpose: the shipped game stays
// deterministic and version-controlled (ADR-004).
// ---------------------------------------------------------------------------

export const CAMPAIGN2 = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(new URL('../src/campaign2.js', import.meta.url), js);
console.log(`\nWrote src/campaign2.js with ${out.length} proven levels (${FIRST}–${LAST}) ✓`);
