// ---------------------------------------------------------------------------
// KUBIK — campaign generator (levels 14–50)
//
// The same pipeline the Daily Challenge uses, scaled up: a seeded random walk
// carves a route, hazards are placed on it, and the candidate is run through
// the FULL verifier (spawn safety, reachability, soft-lock proof, crumble/
// block-aware solver, orb/key checks, par range). Reject → regenerate, until
// the level is proven. The result is written as STATIC level data, so the
// shipped game is deterministic and versioned like the hand-made levels.
//
//   node scripts/gen-campaign.mjs
// ---------------------------------------------------------------------------
import {
  parseLevel,
  reachable,
  canStillFinish,
  solveHazards,
  spawnProblems,
  shortestRoute,
  key,
} from '../src/rules.js';
import { writeFileSync } from 'node:fs';

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

const FIRST = 14;
const LAST = 50;
// exactly 37 names, one per level 14–50 (the last is the finale)
const NAMES = [
  'The Descent', 'Paper Hills', 'Tumbledown', 'The Stair', 'Undercut', // 14-18
  'The Long Drop', 'Glass Meadow', 'Shatterpoint', 'The Switchback', 'Crossfire', // 19-23
  'The Weave', 'Highwire', 'The Foldline', 'Twin Falls', 'The Ascent', // 24-28
  'Deadfall', 'The Lattice', 'Windscar', 'The Deep', 'Shrapnel', // 29-33
  'The Spiral', 'The Vault', 'Coldbridge', 'The Chasm', 'Fracture', // 34-38
  'The Meridian', 'The Crucible', 'Blacklight', 'The Undertow', 'Razorfield', // 39-43
  'The Apex', 'The Longest Night', 'The Last Stair', 'The Threshold', 'The Broken Crown', // 44-48
  'The Final Approach', 'Summit: The Folded Spire', // 49-50
];

// band: difficulty knobs per stretch of the campaign
function band(id) {
  if (id <= 19) return { W: 7, H: 7, hMin: 1, hMax: 2, crumble: [0, 1], orbs: [0, 1], speed: [1.2, 1.7], shards: [2, 3], par: [7, 14], fill: [1, 2] };
  if (id <= 27) return { W: 8, H: 8, hMin: 1, hMax: 3, crumble: [1, 2], orbs: [1, 1], speed: [1.4, 1.9], shards: [3, 3], par: [9, 17], fill: [2, 3] };
  if (id <= 35) return { W: 9, H: 9, hMin: 1, hMax: 3, crumble: [1, 2], orbs: [1, 2], speed: [1.5, 2.1], shards: [3, 4], par: [11, 19], fill: [2, 4] };
  if (id <= 43) return { W: 10, H: 10, hMin: 1, hMax: 3, crumble: [2, 2], orbs: [1, 2], speed: [1.6, 2.2], shards: [3, 4], par: [13, 21], fill: [3, 4] };
  if (id <= 49) return { W: 11, H: 11, hMin: 1, hMax: 3, crumble: [2, 3], orbs: [2, 2], speed: [1.7, 2.3], shards: [4, 4], par: [15, 24], fill: [3, 5] };
  return { W: 12, H: 12, hMin: 1, hMax: 3, crumble: [3, 3], orbs: [2, 2], speed: [1.8, 2.4], shards: [4, 4], par: [17, 27], fill: [4, 6], key: true };
}
function hintFor(id) {
  if (id <= 19) return 'Keep moving — the fall does the thinking';
  if (id <= 27) return 'Read the heights before you roll';
  if (id <= 35) return 'Everything you know, at once';
  if (id <= 43) return 'No safe places left';
  if (id <= 49) return 'The Fold sharpens you';
  return 'The final ascent';
}

/** One candidate. Returns a def (or null if the walk died). */
function generate(rand, id, b) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  const map = Array.from({ length: b.H }, () => Array(b.W).fill(0));
  const tiles = new Set();
  const add = (x, z, h) => {
    map[z][x] = h;
    tiles.add(`${x},${z}`);
  };

  // --- carve a random walk from the bottom row to the top ------------------
  let x = int(1, b.W - 2);
  let z = b.H - 1;
  let h = int(b.hMin, b.hMax);
  const path = [];
  const seen = new Set();
  const addTile = (px, pz, ph) => {
    const k = `${px},${pz}`;
    if (seen.has(k)) return; // the walk never revisits a tile
    seen.add(k);
    add(px, pz, ph);
    path.push([px, pz]);
  };
  addTile(x, z, h);
  const goalZ = int(0, 1);
  while (z > goalZ) {
    const side = int(0, 2);
    for (let s = 0; s < side && z > goalZ; s++) {
      const d = pick([-1, 1]);
      const nx = x + d;
      if (nx < 0 || nx > b.W - 1) continue;
      const k = `${nx},${z}`;
      if (seen.has(k)) continue;
      const nh = Math.min(b.hMax, Math.max(b.hMin, h + pick([-1, 0, 0, 1])));
      x = nx;
      h = nh;
      addTile(x, z, h);
    }
    const nh = Math.min(b.hMax, Math.max(b.hMin, h + pick([-1, 0, 0, 1])));
    z -= 1;
    h = nh;
    addTile(x, z, h);
  }
  if (path.length < 5) return null;
  const start = path[0];
  const goal = path[path.length - 1];

  // --- flesh out the floor: side slabs one step off the walk ---------------
  // height within 1 of the neighbour so a side slab can never be a dead end
  const pathSet = new Set(path.map(([px, pz]) => `${px},${pz}`));
  const wantFill = int(b.fill[0], b.fill[1]);
  const fillSlabs = [];
  let guard = 0;
  while (fillSlabs.length < wantFill && guard++ < 80) {
    const [px, pz] = pick(path);
    const d = pick([-1, 1]);
    const nx = px + d;
    if (nx < 0 || nx > b.W - 1) continue;
    const k = `${nx},${pz}`;
    if (tiles.has(k)) continue;
    // within 1 of the neighbouring path slab, so a side deck can't be a dead end
    const nh = Math.min(b.hMax, Math.max(b.hMin, map[pz][px] + pick([-1, 0, 1])));
    add(nx, pz, nh);
    fillSlabs.push([nx, pz]);
  }

  // --- shards on the route (never start/goal) -------------------------------
  const inner = path.slice(1, -1);
  const shards = [];
  for (let i = 0; i < Math.min(b.shards[1], inner.length); i++) {
    const s = inner.splice(Math.floor(rand() * inner.length), 1)[0];
    shards.push(s);
  }

  // --- crumble slabs on the route (solver proves the route survives) --------
  const wantCrumble = int(b.crumble[0], b.crumble[1]);
  const crumble = [];
  for (let i = 0; i < inner.length && crumble.length < wantCrumble; i++) {
    if (rand() < 0.6) {
      crumble.push(inner.splice(i, 1)[0]);
      i--;
    }
  }
  const crumbleSet = new Set(crumble.map(([cx, cz]) => `${cx},${cz}`));

  // --- sentinels along straight runs (3+ tiles, never over crumble/start/goal)
  const runs = [];
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i][1] !== path[i + 1][1]) continue;
    const dx = Math.sign(path[i + 1][0] - path[i][0]);
    if (dx === 0) continue;
    let j = i;
    while (j + 1 < path.length && path[j + 1][1] === path[j][1] && path[j + 1][0] - path[j][0] === dx) j++;
    if (j - i + 1 >= 3) runs.push([i, j]);
  }
  runs.sort((a, c) => (c[1] - c[0]) - (a[1] - a[0]));
  const orbs = [];
  const orbCount = int(b.orbs[0], b.orbs[1]);
  const usedRuns = new Set();
  outer: for (let o = 0; o < orbCount; o++) {
    for (let ri = 0; ri < runs.length; ri++) {
      if (usedRuns.has(ri)) continue;
      const [i, j] = runs[ri];
      const a = path[i];
      const c = path[j];
      if (`${a[0]},${a[1]}` === `${start[0]},${start[1]}` || `${c[0]},${c[1]}` === `${start[0]},${start[1]}`) continue;
      if (`${a[0]},${a[1]}` === `${goal[0]},${goal[1]}` || `${c[0]},${c[1]}` === `${goal[0]},${goal[1]}`) continue;
      let overCrumble = false;
      for (let t = i; t <= j; t++) if (crumbleSet.has(`${path[t][0]},${path[t][1]}`)) { overCrumble = true; break; }
      if (overCrumble) continue;
      const speed = +(b.speed[0] + rand() * (b.speed[1] - b.speed[0])).toFixed(2);
      orbs.push({ path: [a, c], speed, ...(o > 0 ? { phase: +(rand() * 0.8).toFixed(2) } : {}) });
      usedRuns.add(ri);
      break outer;
    }
  }

  // --- the finale's key: an off-route deck slab ------------------------------
  let keyPos = null;
  if (b.key) {
    const candidates = fillSlabs.filter(([fx, fz]) => !crumbleSet.has(`${fx},${fz}`) && !pathSet.has(`${fx},${fz}`));
    if (candidates.length) keyPos = pick(candidates);
  }

  const rows = map.map((row) => row.map((v) => (v === 0 ? '.' : String(v))).join(''));
  const def = {
    id,
    name: NAMES[id - FIRST],
    hint: hintFor(id),
    map: rows,
    start,
    goal,
    shards,
  };
  if (crumble.length) def.crumble = crumble;
  if (orbs.length) def.orbs = orbs;
  if (keyPos) def.key = keyPos;
  return def;
}

/** Full verifier gate — the same seven checks the hand-made levels pass. */
function verify(def, b) {
  const problems = [];
  let level;
  try {
    level = parseLevel(def);
  } catch (err) {
    return { ok: false, problems: [err.message], par: -1 };
  }
  for (const p of spawnProblems(level)) problems.push(p);
  const reach = reachable(level);
  const finish = canStillFinish(level);
  if (!reach.has(key(level.goal.x, level.goal.z))) problems.push('goal unreachable');
  for (const k of reach) {
    if (!finish.has(k)) problems.push(`soft-lock at ${k}`);
  }
  for (const s of level.shards) if (!reach.has(s.id)) problems.push(`shard ${s.x},${s.z} unreachable`);
  const solve = solveHazards(level);
  if (!solve.ok) problems.push('no route survives crumble/blocks');
  if (solve.capped) problems.push('hazard search capped');
  for (const orb of level.orbs) {
    for (const [x, z] of orb.path) {
      if (!level.tiles.has(key(Math.round(x), Math.round(z)))) problems.push(`orb over void ${x},${z}`);
    }
  }
  if (level.gateKey && !reach.has(key(level.gateKey.x, level.gateKey.z))) problems.push('key unreachable');
  const par = shortestRoute(level);
  if (par < b.par[0] || par > b.par[1]) problems.push(`par ${par} outside ${b.par}`);
  return { ok: problems.length === 0, problems, par };
}

// ---------------------------------------------------------------------------
const out = [];
for (let id = FIRST; id <= LAST; id++) {
  const b = band(id);
  const rand = rng(hashSeed(`kubik-campaign-${id}`));
  let def = null;
  let report = null;
  for (let attempt = 0; attempt < 600 && !def; attempt++) {
    const cand = generate(rand, id, b);
    if (!cand) continue;
    const rep = verify(cand, b);
    if (rep.ok) {
      def = cand;
      report = rep;
    }
  }
  if (!def) {
    console.error(`✗ level ${id}: no candidate passed 600 attempts`);
    process.exit(1);
  }
  out.push(def);
  console.log(
    `${String(id).padStart(2)} ${def.name.padEnd(26)} tiles ${String(levelTiles(def)).padStart(2)} · par ${report.par} · ` +
      `crumble ${def.crumble?.length || 0} · orbs ${def.orbs?.length || 0} · shards ${def.shards.length}` +
      (def.key ? ' · key' : ''),
  );
}

function levelTiles(def) {
  return def.map.join('').split('').filter((ch) => ch >= '0' && ch <= '9').length;
}

const js = `// ---------------------------------------------------------------------------
// KUBIK — campaign levels 14–50
//
// Generated by scripts/gen-campaign.mjs: seeded random routes, each candidate
// run through the full verifier (spawn safety, reachability, soft-lock proof,
// crumble-aware solver, par range) and rejected until proven. Static data on
// purpose: the shipped game stays deterministic and version-controlled.
// ---------------------------------------------------------------------------

export const CAMPAIGN = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(new URL('../src/campaign.js', import.meta.url), js);
console.log(`\nWrote src/campaign.js with ${out.length} proven levels (${FIRST}–${LAST}) ✓`);
