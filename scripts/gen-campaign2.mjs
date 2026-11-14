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
import { experienceFingerprint, sequenceProblems } from './experience.mjs';
import { ACTS, actForId, isActEnd } from '../src/acts.js';
import { CAMPAIGN } from '../src/campaign.js';
import { writeFileSync } from 'node:fs';

const FIRST = Number(process.argv[2]) || 51;
const LAST = Number(process.argv[3]) || 200;
// 300 (was 220, 2026-11-13): the corrected fair-route model (roll-law
// fair-reach, carve candidate source, slide-lands-on-spring) rejects more
// candidates than M2's, so sparse slots' winners sit deeper in the stream.
// Sparse ACTS can raise it via the gen band's `attempts` field (act 10:
// 450 — its vault slot needs >300 under the final model); a global bump
// would make every gauntlet pay for one sparse slot. Under the fast timing
// model a full-budget level costs ~30–45 s, so the caps bound worst case
// without slowing the run.
const MAX_ATTEMPTS = Number(process.env.KUBIK_MAX_ATTEMPTS) || 300;

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
function pickArchetype(id, act, recent, forcedArch) {
  const g = act.gen;
  if (isActEnd(id)) return { arch: 'boss-arena', force: {} };
  // rotate through the act's pool, never repeating the last two
  const pool = g.arch.filter((a) => !recent.includes(a));
  const list = pool.length ? pool : g.arch;
  const arch = forcedArch || list[(id * 7 + act.id * 3) % list.length];
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

/** Fairness-only failures: sentinel-timing windows and the bench route are
 *  both a function of patrol speed, so the speed-tuning ladder may rescue
 *  both. (M2.5, 2026-11-12: the bench gate was missing from this trigger,
 *  so a candidate whose ONLY fairness problem was the bench route never got
 *  slowed down — L82 died there 17/26 times.) */
function timingOnly(rep) {
  return rep.problems.length > 0 && rep.problems.every((p) =>
    p.startsWith('timing:') || p.startsWith('no fair route'));
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
  if (def.conveyors) s += 1.5;
  if (def.doors) s += 1.5;
  if (def.timed) s += 1;
  if (def.freeze) s += 1;
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

/**
 * Mirror a PROVEN level def about the 'x' (east-west) or 'z' (north-south)
 * axis — the M2.5 orientation rotation (acts.js `flip`). Every move rule is
 * mirror-symmetric (climb 1 / drop 2, patrols, spring/ice resolves, shuttle
 * docks, the sealed goal), so the verifier's proof carries over unchanged;
 * the file-level verifier (scripts/verify-levels.mjs) re-proves it anyway.
 */
function mirrorDef(def, axis) {
  const H = def.map.length;
  const W = def.map[0].length;
  const T = ([x, z]) => (axis === 'x' ? [W - 1 - x, z] : [x, H - 1 - z]);
  const mirrorPts = (pts) => pts.map(([x, z]) => T([x, z]));
  const out = {
    ...def,
    map: axis === 'z' ? [...def.map].reverse() : def.map.map((row) => [...row].reverse().join('')),
    start: T(def.start),
    goal: T(def.goal),
  };
  if (def.shards) out.shards = mirrorPts(def.shards);
  if (def.crumble) out.crumble = mirrorPts(def.crumble);
  if (def.orbs) out.orbs = def.orbs.map((o) => ({ ...o, path: mirrorPts(o.path) }));
  if (def.shuttles) out.shuttles = def.shuttles.map((s) => ({ ...s, a: T(s.a), b: T(s.b) }));
  if (def.springs) out.springs = mirrorPts(def.springs);
  if (def.ice) out.ice = mirrorPts(def.ice);
  if (def.conveyors) {
    // belt directions mirror with the board: an x-flip reverses dx, a
    // z-flip reverses dz (the belt still points along the mirrored run)
    out.conveyors = def.conveyors.map(([x, z, dx, dz]) => {
      const [mx, mz] = T([x, z]);
      return [mx, mz, axis === 'x' ? -dx : dx, axis === 'z' ? -dz : dz];
    });
  }
  if (def.doors) {
    // plate and doorway mirror together — the pairing is positional, so
    // the mirrored plate still sits beside the mirrored doorway
    out.doors = def.doors.map((d) => ({ plate: T(d.plate), at: T(d.at) }));
  }
  if (def.timed) out.timed = mirrorPts(def.timed);
  if (def.freeze) out.freeze = mirrorPts(def.freeze);
  if (def.key) out.key = T(def.key);
  return out;
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

// Experience-diversity sequence state (M2.5 curation gate): fingerprints of
// the levels immediately before this run (the shipped file for a partial
// run, levels 46–50 for a full one), so candidate selection can avoid
// creating a repetitive run instead of leaving it to the verifier to catch.
const recentExperience = [];
{
  let shipped2 = [];
  try {
    ({ CAMPAIGN2: shipped2 } = await import(new URL('../src/campaign2.js', import.meta.url)));
  } catch {
    /* no shipped file yet — the run starts the sequence */
  }
  const seedDefs = [...CAMPAIGN, ...shipped2.filter((d) => d.id < FIRST)]
    .sort((a, b) => a.id - b.id)
    .slice(-5);
  for (const d of seedDefs) {
    try {
      recentExperience.push(experienceFingerprint(d));
    } catch {
      /* an unparseable seed level simply does not constrain the sequence */
    }
  }
}
const rememberExperience = (fp) => {
  if (!fp) return;
  recentExperience.push(fp);
  if (recentExperience.length > 12) recentExperience.shift();
};

// per-act name pools: consumed in level-id order, boss gets the last name
const nameQueue = {};
for (const act of ACTS) {
  if (!act.gen) continue;
  nameQueue[act.id] = [...act.gen.names];
  // a partial run starts mid-act: the earlier levels already took their
  // names. The act's generated range starts at max(act.start, 51) — acts
  // 3's first ten levels (41–50) live in campaign.js with their own NAMES
  // list, so act 3's pool only covers 51–60. (The previous
  // `FIRST - act.gen.start` was NaN — act.gen has no start — which
  // silently skipped the slice and reused already-consumed names.)
  const drop = Math.max(0, Math.min(nameQueue[act.id].length, FIRST - Math.max(act.start, 51)));
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
    if (Number(fId) === id) ({ arch, force } = pickArchetype(id, act, archRecent[act.id] || [], fArch));
  }

  // key archetypes are key levels, guaranteed
  let bEff = b;
  if (arch === 'key-detour' || arch === 'vault') bEff = { ...b, keyP: 1 };
  // spring-field: never also a shuttle
  if (force.noShuttle) bEff = { ...bEff, mech: { ...bEff.mech, shuttle: 0 } };
  // gauntlet/undertow (the same long spiral under two names): forced
  // mechanics on it are already dense, and the act's 2–3 patrols on top
  // starve sentinel-timing fairness (L82: 29/220 candidates reached the
  // expensive checks and every one failed a timing or bench-fairness gate;
  // L101 the same with forced ice only). Relax the sentinel FLOOR for the
  // archetype — the identity mechanics stay forced. M2.5, 2026-11-12.
  if (arch === 'undertow' || arch === 'gauntlet') bEff = { ...bEff, orbs: [0, 1] };
  // the act's IDENTITY mechanics (acts.js `force` — e.g. the ice act, the
  // shuttle act) merge under the archetype's own force; the archetype wins
  // a conflict. Must be wrapped as { force } — applyHazards' opts shape
  // (fixed 2026-11-12: passing the force object bare made opts.force
  // undefined, so no forced carve ever happened and the mechanic acts
  // silently shipped mechanic-free).
  const allForce = { ...(act.gen.force || {}), ...force };
  // introduction knob (sibling of KUBIK_FORCE_ARCH): force a mechanic
  // carve on ONE slot, e.g. KUBIK_FORCE_MECH=175=conveyor — how a new
  // mechanic enters the shipped campaign: one proven slot at a time,
  // through the full gate, instead of a campaign-wide regeneration.
  if (process.env.KUBIK_FORCE_MECH) {
    const [fId, fMech] = process.env.KUBIK_FORCE_MECH.split('=');
    if (Number(fId) === id && fMech) allForce[fMech] = (allForce[fMech] || 0) + 1;
  }
  // per-act attempt budget (acts.js gen band `attempts`); the act's slot
  // density sets it — see the MAX_ATTEMPTS note above.
  const slotBudget = (act.gen && act.gen.attempts) || MAX_ATTEMPTS;

  let def = null;
  let report = null;
  // best: proven AND unique; bestAny: proven but NOT unique. The rolling
  // 40-level uniqueness window can starve a level when the earlier levels
  // of the act settle on candidates that resemble every good candidate
  // here, so the END-OF-ATTEMPTS settle may relax to bestAny — with a
  // warning (the file-level gate does not enforce cross-level similarity).
  let best = null;
  let bestAny = null;
  // Single-pass candidate loop (M2.5, fixed 2026-11-12): the old 3-phase
  // loop re-ran the same rand stream under orb budgets [orbs0, ceil/2, 0],
  // so an early "proven but low-orb" candidate was verified only under the
  // STRICT budget and could never pass — the relaxed phases saw only later
  // (and worse) candidates. L82 had exactly 4 proven candidates in 660
  // attempts, all orbs=0, all in the phase-3 window, so it failed at 220
  // attempts yet passed at 60. Now: verify once with minOrbs=0 and PREFER
  // full-orb candidates explicitly (rank = orb count, then score).
  const wantOrbs = bEff.orbs[0];
  const rankOf = (c, s) => (c.orbs || []).length * 100000 + s;
  for (let attempt = 0; attempt < slotBudget && !def; attempt++) {
    const layout = ARCHETYPES[arch](rand, bEff);
    if (!layout) continue;
    let cand = applyHazards(layout, bEff, rand, { force: allForce });
    if (!cand) continue;
    cand = { ...cand, id, name: '', hint: act.gen.hint };
    let rep = verify(cand, bEff, 0);
    if (process.env.KUBIK_PROBE && rep && !rep.ok && attempt < 4) {
      console.error(`  probe L${id} attempt ${attempt}: orbs=${(cand.orbs||[]).length} ${JSON.stringify((rep.problems||[]).slice(0,3))}`);
    }
    if (!rep.ok && timingOnly(rep) && (cand.orbs || []).length) {
      for (const m of [0.9, 0.8, 0.68, 0.56, 0.45]) {
        const tuned = tuneOrbSpeeds(cand, m);
        const r2 = verify(tuned, bEff, 0);
        if (r2.ok) {
          cand = tuned;
          rep = r2;
          break;
        }
      }
    }
    if (!rep.ok) continue;
    const uniq = isUnique(cand, seenSigs, recentTileSets);
    const s = score(cand, rep.par, bEff);
    const o = (cand.orbs || []).length;
    // experience fingerprint of the level as the player will meet it
    // (post-mirror), and whether it keeps the local sequence diverse
    const expFp = experienceFingerprint(act.gen.flip ? mirrorDef(cand, act.gen.flip) : cand, rep.par);
    const expOk = sequenceProblems(expFp, recentExperience).length === 0;
    if (uniq && expOk && (!best || rankOf(cand, s) > rankOf(best.cand, best.s))) best = { cand, rep, s, uniq, expFp };
    if (!bestAny || rankOf(cand, s) > rankOf(bestAny.cand, bestAny.s)) bestAny = { cand, rep, s, uniq, expFp };
    // full orb budget met: take the best after a short exploration window
    if (best && (best.cand.orbs || []).length >= wantOrbs && attempt >= 24) {
      def = best.cand;
      report = best.rep;
      seenSigs.add(best.uniq.sig);
      recentTileSets.push(best.uniq.ts);
      allTileSets.push(best.uniq.ts);
      rememberExperience(best.expFp);
      break;
    }
    // end of attempts: settle for the best proven candidate
    if ((best || bestAny) && attempt >= slotBudget - 40) {
      const pick = best || bestAny;
      if (!best) console.error(`⚠ level ${id} (${arch}): uniqueness exhausted — settled non-unique`);
      if (pick.expFp && sequenceProblems(pick.expFp, recentExperience).length) {
        console.error(`⚠ level ${id} (${arch}): diversity exhausted — settled repetitive (${pick.expFp.label})`);
      }
      if ((pick.cand.orbs || []).length < wantOrbs) {
        console.error(`⚠ level ${id} (${arch}): relaxed sentinels to ${(pick.cand.orbs || []).length}`);
      }
      def = pick.cand;
      report = pick.rep;
      if (pick.uniq) {
        seenSigs.add(pick.uniq.sig);
        recentTileSets.push(pick.uniq.ts);
        allTileSets.push(pick.uniq.ts);
      }
      rememberExperience(pick.expFp);
    }
  }
  if (!def) {
    console.error(`✗ level ${id} (${arch}): no candidate passed ${slotBudget} attempts`);
    process.exit(1);
  }

  // name from the act pool (boss takes the act's last name automatically)
  def.name = nameQueue[act.id].shift();
  if (!def.name) {
    console.error(`✗ level ${id}: act ${act.id} name pool exhausted`);
    process.exit(1);
  }

  // orientation rotation (M2.5): mirror the proven level per act budget
  if (act.gen.flip) def = mirrorDef(def, act.gen.flip);

  // remember the archetype (rotation window: last 2 in this act)
  archRecent[act.id] = [...(archRecent[act.id] || []), arch].slice(-2);
  if (recentTileSets.length > 40) recentTileSets.shift();

  out.push(def);
  const mech =
    (def.shuttles ? 'S' : '') + (def.springs ? 'P' : '') + (def.ice ? 'I' : '') + (def.conveyors ? 'C' : '') + (def.doors ? 'D' : '') + (def.timed ? 'T' : '') + (def.freeze ? 'F' : '') + (def.key ? 'K' : '');
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
