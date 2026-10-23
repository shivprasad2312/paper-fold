// Verifies every level: start/goal valid, goal reachable, every shard reachable,
// no soft-locks, and the crumble-aware search still finds a route.
//   node scripts/verify-levels.mjs
import { LEVELS } from '../src/levels.js';
import {
  parseLevel,
  reachable,
  canStillFinish,
  solveWithCrumble,
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

for (const def of LEVELS) {
  console.log(`\n${String(def.id).padStart(2, '0')} ${def.name}`);
  let level;
  try {
    level = parseLevel(def);
  } catch (err) {
    fail(err.message);
    continue;
  }

  const reach = reachable(level);
  const finish = canStillFinish(level);

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

  // 4. crumble-aware route exists
  if ((def.crumble || []).length && !solveWithCrumble(level)) {
    fail('no route survives the crumble slabs');
  }

  // 5. orbs must patrol over real slabs
  for (const orb of level.orbs) {
    for (const [x, z] of orb.path) {
      if (!level.tiles.has(key(Math.round(x), Math.round(z)))) {
        fail(`orb path point ${x},${z} is over the void`);
      }
    }
  }

  const shardsOk = level.shards.filter((s) => reach.has(s.id)).length;
  const route = shortestRoute(level);
  console.log(
    `  tiles ${level.tiles.size} · route ${route} rolls · shards ${shardsOk}/${level.shards.length}` +
      (level.def.crumble ? ` · crumble ${level.def.crumble.length}` : '') +
      (level.orbs.length ? ` · orbs ${level.orbs.length}` : ''),
  );
}

console.log('');
if (failed) {
  console.error(`${failed} problem(s) found`);
  process.exit(1);
}
console.log(`All ${LEVELS.length} levels verified ✓`);
