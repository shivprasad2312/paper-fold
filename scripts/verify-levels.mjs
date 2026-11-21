// Verifies every level (and the daily generator): start/goal valid, goal
// reachable, every shard reachable, no soft-locks, crumble/block-aware route
// exists, and — the check that caught the Fault Line bug — no sentinel
// spawns on top of the player or patrols the goal.
//   node scripts/verify-levels.mjs
import { LEVELS, VAULT_LEVELS } from '../src/levels.js';
import { getDailyLevel } from '../src/daily.js';
import { VAULT_PAR_BAND } from '../src/vault.js';
import {
  parseLevel,
  reachable,
  canStillFinish,
  solveHazards,
  spawnProblems,
  timingProblems,
  rollTargets,
  shortestRoute as provenRoute,
  rescueTile,
  fairReachSet,
  windTarget,
  windLockProblems,
  shortestPath,
  freePathProblems,
  key,
} from '../src/rules.js';
import { experienceProblems } from './experience.mjs';
import { scaleAudit } from './scale-audit.mjs';

/** Shortest number of rolls from start to goal (ignores hazards). */
function shortestRoute(level) {
  const seen = new Set([key(level.start.x, level.start.z)]);
  let frontier = [level.start];
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const tile of frontier) {
      if (tile === level.goal) return d;
      // the verified route is the one the PRESS law yields, so a cling
      // edge (Phase B, ADR-037) — which spans a void crevice in one press
      // — counts here exactly as it counts in the proofs
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

let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`  ✗ ${msg}`);
};
// proven pars by level id, reused by the experience-diversity audit below
const cataloguePars = new Map();

// ---------------------------------------------------------------------------
// ADR-051 backlog — the free-path law (no level finishable by walking
// around its obstacles) landed with 35 shipped offenders. They are listed
// here BY ID so the law can be law from day one; each content wave removes
// its ids, and the ratchet has teeth both ways: an offender NOT listed
// fails, and a listed level that no longer offends fails as stale. When
// this set is empty the law stands alone. (Engine audit, counting whole
// patrol lines as engagement: 9 finishable at par without touching a
// mechanic, 26 more within +6 rolls; the wheel levels and all 10 Vault
// rooms already comply.)
// ---------------------------------------------------------------------------
const FREE_PATH_BACKLOG = new Set([]); // ADR-051: emptied by wave 3 — the law now stands alone

function checkLevel(label, def) {
  console.log(`\n${label}`);
  let level;
  try {
    level = parseLevel(def);
  } catch (err) {
    fail(err.message);
    return;
  }

  const reach = reachable(level);
  const finish = canStillFinish(level);

  // 0. spawn safety: nothing lethal or blocking may sit on the start/goal
  for (const p of spawnProblems(level)) fail(p);

  // 0b. sentinel timing fairness: a start→goal route must exist where every
  // patrol-line crossing has a safe window of at least TIMING_FLOOR
  for (const p of timingProblems(level)) fail(`timing: ${p}`);

  // 0c. rescue bench: if the level has a mid-path second-chance tile, a
  // timing-fair route bench→goal must exist too (the "at least one path"
  // invariant extended to the bench — ADR-014)
  const bench = rescueTile(level);
  if (bench && !fairReachSet(level, bench).has(key(level.goal.x, level.goal.z))) {
    fail(`rescue: no fair route from the bench (${bench.x},${bench.z}) to the goal`);
  }

  // 1. goal reachable
  if (!reach.has(key(level.goal.x, level.goal.z))) fail('goal is unreachable');

  // 2. no soft-locks among reachable tiles
  for (const k of reach) {
    if (!finish.has(k)) {
      const [x, z] = k.split(',').map(Number);
      fail(`soft-lock at ${x},${z} (height ${level.tiles.get(k).h})`);
    }
  }

  // 3. shards reachable
  for (const s of level.shards) {
    if (!reach.has(s.id)) fail(`shard at ${s.x},${s.z} unreachable`);
  }

  // 4. crumble + block aware route exists (nudges included)
  const solve = solveHazards(level);
  if (!solve.ok) fail('no route survives crumble slabs / blocks (not enough pushes)');
  if (solve.capped) fail('hazard search exceeded the state budget');

  // 5. orbs must patrol over real slabs
  for (const orb of level.orbs) {
    for (const [x, z] of orb.path) {
      if (!level.tiles.has(key(Math.round(x), Math.round(z)))) {
        fail(`orb path point ${x},${z} is over the void`);
      }
    }
  }

  // 6. the gate key must be reachable
  if (level.gateKey && !reach.has(key(level.gateKey.x, level.gateKey.z))) {
    fail(`key at ${level.gateKey.x},${level.gateKey.z} unreachable`);
  }

  // 7. wind (ADR-039): a diagonal unit vector, a breeze that actually
  // moves the proven route (never decoration), and no drift that strands
  // the cube — a player may stand still anywhere the route can reach
  if (level.wind) {
    if (Math.abs(level.wind.x) !== 1 || Math.abs(level.wind.z) !== 1) {
      fail('wind direction must be a diagonal unit vector');
    }
    const path = shortestPath(level) || [];
    const moved = path.filter((t) => windTarget(level, t)).length;
    if (moved < 2) fail(`wind only moves the cube at ${moved} route tile(s) — decoration, not a mechanic`);
    for (const p of windLockProblems(level)) fail(p);
  }

  // 8. clinging (Phase B, ADR-037): a declared grip crevice must SHORTEN
  // the proven route — a crevice the optimal line walks around is
  // decoration, and decoration is not allowed to ship
  if ((def.clings || []).length) {
    const p1 = provenRoute(level);
    const p0 = provenRoute(parseLevel({ ...def, clings: undefined }));
    if (!(p1 > 0) || !(p0 > p1)) fail(`cling does not shorten the proven route (${p0} → ${p1})`);
  }

  // 9. the free-path law (ADR-051): no obstacle-free route at par or
  // within FREE_PATH_SLACK of it — the mirror of check 1's "a path
  // exists". Backlog ids are the shrink-only ratchet above.
  {
    const problems = freePathProblems(level);
    if (FREE_PATH_BACKLOG.has(def.id)) {
      if (!problems.length) {
        fail(`free-path backlog: L${def.id} no longer breaks the law — remove it from FREE_PATH_BACKLOG (ADR-051 ratchet)`);
      }
    } else {
      for (const p of problems) fail(p);
    }
  }

  const shardsOk = level.shards.filter((s) => reach.has(s.id)).length;
  const route = shortestRoute(level);
  if (Number.isInteger(def.id)) cataloguePars.set(def.id, provenRoute(level));
  console.log(
    `  tiles ${level.tiles.size} · route ${route} rolls · shards ${shardsOk}/${level.shards.length}` +
      (level.def.crumble ? ` · crumble ${level.def.crumble.length}` : '') +
      (level.orbs.length ? ` · orbs ${level.orbs.length}` : '') +
      (level.blocks.length ? ` · blocks ${level.blocks.length} (pushes ${level.nudge})` : '') +
      (level.sliders.length ? ` · sliders ${level.sliders.reduce((a, g) => a + g.tileSet.size, 0)} tiles` : '') +
      (level.gateKey ? ' · key' : '') +
      (level.wind ? ' · wind' : '') +
      (level.def.clings ? ` · cling ${level.def.clings.length}` : ''),
  );
}

for (const def of LEVELS) checkLevel(`${String(def.id).padStart(2, '0')} ${def.name}`, def);

// The Vault (Phase E, ADR-043): ten bonus rooms proved by the SAME checks.
// They are outside the campaign's sequence audit, so they get their own —
// a room over the complexity cap or repeating its neighbour back-to-back is
// rejected here exactly as it would be in the campaign.
console.log('\nTHE VAULT (bonus rooms)');
for (const def of VAULT_LEVELS) checkLevel(`V${String(def.id - 200).padStart(2, '0')} ${def.name}`, def);

// Experience-diversity curation gate (M2.5): the per-level proofs above say
// every level can be finished; this says the sequence does not repeat the
// same experience back-to-back or collapse an act into one mechanic.
console.log('\nEXPERIENCE DIVERSITY (curation gate)');
{
  const problems = experienceProblems(LEVELS, cataloguePars);
  for (const p of problems) fail(p);
  if (!problems.length) console.log('  sequence + act diversity ✓');
}

// The Vault's own par band and experience sequence: the rooms escalate from
// par ~40 to the finale's ~80, and no two adjacent rooms may read alike.
console.log('\nVAULT BAND + DIVERSITY');
{
  const vaultPars = new Map();
  for (const def of VAULT_LEVELS) vaultPars.set(def.id, provenRoute(parseLevel(def)));
  for (const def of VAULT_LEVELS) {
    const par = vaultPars.get(def.id);
    if (par < VAULT_PAR_BAND[0] || par > VAULT_PAR_BAND[1]) {
      fail(`V${def.id - 200} par ${par} outside the Vault band [${VAULT_PAR_BAND.join(', ')}]`);
    }
  }
  for (const p of experienceProblems(VAULT_LEVELS, vaultPars)) fail(`vault sequence: ${p}`);
  if (!failed) console.log(`  band [${VAULT_PAR_BAND.join(', ')}] + sequence ✓`);
}

// Scale audit (Phase G, ADR-045): every mass act must hold the size and fill
// it declares. The per-level proof says a level can be played; this says it is
// the KIND of level the act promises — EDGE-scale places, not ribbons.
console.log('\nSCALE (act boards + fill)');
{
  const { rows, problems } = scaleAudit(LEVELS);
  for (const p of problems) fail(p);
  if (!problems.length) {
    console.log('  act means: ' + rows.map((r) => `A${r.act} ${(r.meanFill * 100).toFixed(0)}%/${r.W}`).join(' · ') + ' ✓');
  }
}

// The daily generator must produce a legal level for every day.
for (let i = 0; i < 14; i++) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const { def, par } = getDailyLevel(dateStr);
  checkLevel(`DAILY ${dateStr} (par ${par})`, def);
}

console.log('');
if (failed) {
  console.error(`${failed} problem(s) found`);
  process.exit(1);
}
console.log(`All ${LEVELS.length} levels + ${VAULT_LEVELS.length} Vault rooms + 14 daily layouts verified ✓`);
