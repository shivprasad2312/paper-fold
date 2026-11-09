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
  timingProblems,
  shortestRoute,
  key,
  ROLL_TIME,
} from '../src/rules.js';
import { applyHazards } from './hazards.mjs';
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

const FIRST = Number(process.argv[2]) || 14;
const LAST = Number(process.argv[3]) || 50;
// the output file IS this range — a partial run would truncate the shipped
// campaign, so only the full 14–50 span is allowed
if (FIRST !== 14 || LAST !== 50) {
  console.error('gen-campaign writes src/campaign.js in full: run with 14 50 (or no args)');
  process.exit(1);
}
// exactly 37 names, one per level 14–50 (the last is the finale)
const NAMES = [
  'The Descent', 'Stone Hills', 'Tumbledown', 'The Stair', 'Undercut', // 14-18
  'The Long Drop', 'Glass Meadow', 'Shatterpoint', 'The Switchback', 'Crossfire', // 19-23
  'The Weave', 'Highwire', 'The Breakline', 'Twin Falls', 'The Ascent', // 24-28
  'Deadfall', 'The Lattice', 'Windscar', 'The Deep', 'Shrapnel', // 29-33
  'The Spiral', 'The Vault', 'Coldbridge', 'The Chasm', 'Fracture', // 34-38
  'The Meridian', 'The Crucible', 'Blacklight', 'The Undertow', 'Razorfield', // 39-43
  'The Apex', 'The Longest Night', 'The Last Stair', 'The Threshold', 'The Broken Crown', // 44-48
  'The Final Approach', 'Summit: The Broken Spire', // 49-50
];

// band: difficulty knobs per stretch of the campaign
function band(id) {
  // EDGE-scale maps: 8 → 18 tiles across. New mechanics introduce
  // gradually: ice (band 1), spring pits (band 2), shuttles (band 3+).
  if (id <= 19) return { W: 8, H: 8, hMin: 1, hMax: 2, crumble: [0, 1], orbs: [0, 1], speed: [1.2, 1.7], shards: [2, 3], par: [9, 16], fill: [2, 3], mech: ['ice'] };
  if (id <= 27) return { W: 10, H: 10, hMin: 1, hMax: 3, crumble: [1, 2], orbs: [1, 1], speed: [1.4, 1.9], shards: [3, 3], par: [11, 19], fill: [3, 5], mech: ['ice', 'spring'] };
  if (id <= 35) return { W: 12, H: 12, hMin: 1, hMax: 3, crumble: [1, 2], orbs: [1, 2], speed: [1.5, 2.1], shards: [3, 4], par: [13, 23], fill: [4, 6], mech: ['ice', 'spring', 'shuttle'] };
  if (id <= 43) return { W: 14, H: 14, hMin: 1, hMax: 3, crumble: [2, 2], orbs: [1, 2], speed: [1.6, 2.2], shards: [3, 4], par: [16, 28], fill: [5, 8], mech: ['ice', 'spring', 'shuttle'] };
  if (id <= 49) return { W: 16, H: 16, hMin: 1, hMax: 3, crumble: [2, 3], orbs: [2, 2], speed: [1.7, 2.3], shards: [4, 4], par: [19, 32], fill: [6, 10], mech: ['ice', 'spring', 'shuttle'] };
  return { W: 18, H: 18, hMin: 1, hMax: 3, crumble: [3, 3], orbs: [2, 2], speed: [1.8, 2.4], shards: [4, 4], par: [22, 36], fill: [8, 12], key: true, mech: ['ice', 'spring', 'shuttle'] };
}
function hintFor(id) {
  if (id <= 19) return 'Keep moving — the fall does the thinking';
  if (id <= 27) return 'Read the heights before you roll';
  if (id <= 35) return 'Everything you know, at once';
  if (id <= 43) return 'No safe places left';
  if (id <= 49) return 'The roll sharpens you';
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
    // hold one direction across the row's side steps: long straight runs are
    // the campaign's backbone (sentinel lines, shuttles, springs, ice)
    const side = int(0, 3);
    const d0 = pick([-1, 1]);
    for (let s = 0; s < side && z > goalZ; s++) {
      const d = rand() < 0.8 ? d0 : -d0;
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

  // --- dress the walk with the SHARED hazard stage (ADR-015) ---------------
  // mechanics carved into straight runs, shards, sentinels (+ refuge slabs),
  // crumble, key — the exact placement law every archetype uses.
  const mech = { ice: 0, spring: 0, shuttle: 0 };
  if ((b.mech || []).includes('ice')) mech.ice = b.W >= 12 ? 0.95 : 0.6;
  if ((b.mech || []).includes('spring')) mech.spring = b.W >= 16 ? 0.8 : 0.5;
  if ((b.mech || []).includes('shuttle')) mech.shuttle = 0.7;
  const def = applyHazards(
    { W: b.W, H: b.H, map, path, start, goal },
    {
      W: b.W,
      H: b.H,
      par: b.par,
      orbs: b.orbs,
      crumble: b.crumble,
      speed: b.speed,
      shards: b.shards,
      fill: b.fill,
      keyP: b.key ? 1 : 0,
      mech,
    },
    rand,
    id === 50 ? { extra: { shuttle: 0.6 } } : {}, // the finale rides twice
  );
  if (!def) return null;
  return {
    ...def,
    id,
    name: NAMES[id - FIRST],
    hint: hintFor(id),
  };
}

/**
 * A candidate whose ONLY problems are sentinel timing: slow every sentinel
 * (window width scales with period) instead of throwing away the layout —
 * keeps the endgame's hazard density intact.
 */
function timingOnly(rep) {
  return rep.problems.length > 0 && rep.problems.every((p) => p.startsWith('timing:'));
}

function tuneOrbSpeeds(def, mult) {
  return {
    ...def,
    orbs: (def.orbs || []).map((o) => ({ ...o, speed: +(o.speed * mult).toFixed(2) })),
  };
}

/** Full verifier gate — the same seven checks the hand-made levels pass. */
function verify(def, b, minOrbs = b.orbs[0]) {
  const problems = [];
  let level;
  try {
    level = parseLevel(def);
  } catch (err) {
    return { ok: false, problems: [err.message], par: -1 };
  }
  for (const p of spawnProblems(level)) problems.push(p);
  for (const p of timingProblems(level)) problems.push(`timing: ${p}`);
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
  if ((level.orbs || []).length < minOrbs) {
    problems.push(`too few sentinels (band wants ≥ ${minOrbs})`);
  }
  if (level.gateKey && !reachable(level, new Set([key(level.goal.x, level.goal.z)])).has(key(level.gateKey.x, level.gateKey.z))) problems.push('key unreachable (sealed goal blocks the cut)');
  for (const sh of level.shuttles) {
    if (sh.wait < ROLL_TIME * 2.2) problems.push('shuttle dwell too short to board');
  }
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
  // Phased search: full band spec first, then relaxed sentinel counts, so a
  // level is never shipped without its sentinels unless no fair layout with
  // them exists at all.
  const phases = [b.orbs[0], Math.max(0, Math.ceil(b.orbs[0] / 2)), 0].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  for (const minOrbs of phases) {
    if (def) break; // an earlier (stricter) phase already found a fair layout
    let foundThisPhase = false;
    let fallback = null; // first fair orb-free candidate of this phase
    let sinceFallback = 0;
    for (let attempt = 0; attempt < 300 && !def; attempt++) {
      let cand = generate(rand, id, b);
      if (!cand) continue;
      let rep = verify(cand, b, minOrbs);
      if (!rep.ok && timingOnly(rep) && (cand.orbs || []).length) {
        for (const m of [0.9, 0.8, 0.68, 0.56, 0.45]) {
          const tuned = tuneOrbSpeeds(cand, m);
          const r2 = verify(tuned, b, minOrbs);
          if (r2.ok) {
            cand = tuned;
            rep = r2;
            break;
          }
        }
      }
      if (!rep.ok) continue;
      if ((cand.orbs || []).length >= minOrbs && (cand.orbs || []).length) {
        def = cand;
        report = rep;
        foundThisPhase = true;
      } else if (!fallback) {
        fallback = { cand, rep };
        sinceFallback = 0;
      } else {
        sinceFallback++;
        if (sinceFallback >= 30) {
          def = fallback.cand;
          report = fallback.rep;
          foundThisPhase = true;
        }
      }
    }
    // the phase consumed its attempts without a layout: the level genuinely
    // relaxes to a lower sentinel count (reported once, when it happens)
    if (!foundThisPhase && !def && minOrbs < b.orbs[0]) {
      console.error(`⚠ level ${id}: no fair layout with ${b.orbs[0]} sentinels — relaxed to ${minOrbs}`);
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
