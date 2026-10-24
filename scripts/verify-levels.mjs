// Verifies every level (and the daily generator): start/goal valid, goal
// reachable, every shard reachable, no soft-locks, crumble/block-aware route
// exists, and — the check that caught the Fault Line bug — no sentinel
// spawns on top of the player or patrols the goal.
//   node scripts/verify-levels.mjs
import { LEVELS } from '../src/levels.js';
import { getDailyLevel } from '../src/daily.js';
import {
  parseLevel,
  reachable,
  canStillFinish,
  solveHazards,
  spawnProblems,
  legalNeighbours,
  key,
} from '../src/rules.js';

/** Shortest number of rolls from start to goal (ignores hazards). */
function shortestRoute(level) {
  const seen = new Set([key(level.start.x, level.start.z)]);
  let frontier = [level.start];
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const tile of frontier) {
      if (tile === level.goal) return d;
      for (const { to } of legalNeighbours(level, tile)) {
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

  // 7. wind direction must be a diagonal unit vector
  if (level.wind && (Math.abs(level.wind.x) !== 1 || Math.abs(level.wind.z) !== 1)) {
    fail('wind direction must be a diagonal unit vector');
  }

  const shardsOk = level.shards.filter((s) => reach.has(s.id)).length;
  const route = shortestRoute(level);
  console.log(
    `  tiles ${level.tiles.size} · route ${route} rolls · shards ${shardsOk}/${level.shards.length}` +
      (level.def.crumble ? ` · crumble ${level.def.crumble.length}` : '') +
      (level.orbs.length ? ` · orbs ${level.orbs.length}` : '') +
      (level.blocks.length ? ` · blocks ${level.blocks.length} (pushes ${level.nudge})` : '') +
      (level.sliders.length ? ` · sliders ${level.sliders.reduce((a, g) => a + g.tileSet.size, 0)} tiles` : '') +
      (level.gateKey ? ' · key' : '') +
      (level.wind ? ' · wind' : ''),
  );
}

for (const def of LEVELS) checkLevel(`${String(def.id).padStart(2, '0')} ${def.name}`, def);

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
console.log(`All ${LEVELS.length} levels + 14 daily layouts verified ✓`);
