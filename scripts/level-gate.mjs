// KUBIK — the shared level gate (ADR-043).
//
// One definition of "a shippable level", used by both generators:
// gen-campaign2.mjs (levels 51–200) and gen-vault.mjs (the Vault, 201–210).
// Extracted verbatim from the campaign generator when the Vault arrived, so
// the bonus set is proved by exactly the checks the campaign is proved by —
// there is no second, softer gate for content that ships as "bonus".
//
// Ordered CHEAP→EXPENSIVE: par and reachability are cheap BFS and must run
// before the sentinel-timing model (a full state-space search), or a dense
// act-end level burns minutes on candidates that fail their par.

import {
  parseLevel,
  reachable,
  canStillFinish,
  solveHazards,
  spawnProblems,
  timingProblems,
  shortestRoute,
  shortestPath,
  freePathProblems,
  rescueTile,
  fairReachSet,
  fairPlayable,
  windTarget,
  windLockProblems,
  key,
  ROLL_TIME,
} from '../src/rules.js';
import { mechanicSignature, MECH_CAP } from './experience.mjs';

/**
 * Full verifier gate (the same checks the hand-made levels pass) + bench.
 * Ordered CHEAP→EXPENSIVE: the par and reachability rejections are cheap BFS
 * and must run before the sentinel-timing model (a full state-space search),
 * or a dense act-end level burns minutes on candidates that fail their par.
 */
export function verify(def, b, minOrbs) {
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
  // the free-path law (ADR-051): a candidate whose obstacles can all be
  // walked around is rejected like any other unfair layout — cheap BFS,
  // so it runs here with the other route checks, before the timing model
  for (const p of freePathProblems(level, par)) problems.push(p);
  // clinging (Phase B, ADR-037): a declared grip crevice must SHORTEN the
  // proven route — a crevice the optimal line walks around is decoration,
  // rejected like a lift that joins no two banks. Two BFS runs, only on
  // defs that carry clings.
  if ((def.clings || []).length) {
    const p0 = shortestRoute(parseLevel({ ...def, clings: undefined }));
    if (!(par > 0) || !(p0 > par)) problems.push(`cling does not shorten the route (${p0} → ${par})`);
  }
  // the complexity ceiling (ADR-040): candidates over the cap are rejected
  // here, while the generator still has a choice — the file-level audit is
  // the backstop, this is what keeps the density carves readable
  const mechN = mechanicSignature(def).length;
  if (mechN > MECH_CAP) problems.push(`${mechN} distinct mechanics (cap ${MECH_CAP})`);
  for (const orb of level.orbs) {
    for (const [x, z] of orb.path) {
      if (!level.tiles.has(key(Math.round(x), Math.round(z)))) problems.push(`orb over void ${x},${z}`);
    }
  }
  // the breeze (ADR-039): it must actually move the proven route (never
  // decoration) and it may never strand the cube — the same audit the
  // file-level verifier runs, so a generated level cannot outrun it
  if (level.wind) {
    const pth = shortestPath(level) || [];
    const moved = pth.filter((t) => windTarget(level, t)).length;
    if (moved < 2) problems.push(`wind only moves the cube at ${moved} route tile(s) — decoration`);
    for (const p of windLockProblems(level)) problems.push(p);
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
    // THE COMPOSED LAW (Phase G, 2026-11-20): reachability, sentinel fairness
    // and the block solver each passed on their own for L118 and the level was
    // unplayable in the hand. A level that carries blocks must show ONE play
    // that satisfies all three at once. Only levels with blocks pay for it.
    if ((level.blocks || []).length && (level.orbs || []).length) {
      const play = fairPlayable(level);
      if (play.capped) problems.push('composed fair-play search capped');
      else if (!play.ok) problems.push('no single play satisfies fairness AND the blocks (boxes the goal off)');
    }
  }
  return { ok: problems.length === 0, problems, par };
}

