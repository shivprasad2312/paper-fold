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

  // --- carve the new mechanics into the walk --------------------------------
  // A mechanic replaces solid route tiles with a hazard (void pit, dock,
  // spring) so the only way across is the mechanic itself. `carved` marks
  // tiles that are no longer solid; `mechSet` is every tile a sentinel must
  // keep its clearance from.
  const carved = new Set();
  const mechSet = new Set();
  const markMech = (x, z) => mechSet.add(`${x},${z}`);
  const clearTile = (x, z) => {
    map[z][x] = 0;
    tiles.delete(`${x},${z}`);
  };
  const shuttles = [];
  const springs = [];
  const ice = [];

  // straight runs of ≥3 SOLID, consecutive walk tiles — indices into `path`
  const k = (i) => `${path[i][0]},${path[i][1]}`;
  const solidRuns = () => {
    const out = [];
    let i = 0;
    while (i < path.length) {
      if (carved.has(k(i))) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < path.length && !carved.has(k(j + 1))) j++;
      // solid consecutive block path[i..j]
      for (let a = i; a + 2 <= j; a++) {
        if (path[a][1] !== path[a + 1][1]) continue;
        const dx = path[a + 1][0] - path[a][0];
        if (dx === 0) continue;
        let b = a;
        while (b + 1 <= j && path[b + 1][1] === path[b][1] && path[b + 1][0] - path[b][0] === dx) b++;
        if (b - a + 1 >= 3) out.push([a, b]);
        a = b - 1;
      }
      i = j + 1;
    }
    return out;
  };

  // SHUTTLE: take a straight run, hollow the first gap tiles into two docks
  // with a void between, and let a platform loop the gap forever. P (before
  // dock a) and Q (after dock b) are the structure ends: the platform flies
  // at the rounded average of their heights (board/alight are single rolls).
  // The whole crossing box is cleared of side slabs — no detour around.
  const tryShuttle = () => {
    const runs = solidRuns().filter(([i, j]) => i >= 2);
    if (!runs.length) return false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const [i, j] = runs[Math.floor(rand() * runs.length)];
      for (const gap of rand() < 0.5 ? [2, 3] : [3, 2]) {
        // the run must carry the whole crossing: dockB on the run, and the
        // alight tile Q on it too (the platform drives in a straight line)
        if (j < i + gap + 1) continue;
        const Q = path[i + gap + 1];
        if (!Q) continue;
        const P = path[i - 1];
        const dH = Math.abs(map[P[1]][P[0]] - map[Q[1]][Q[0]]);
        if (dH > 2) continue;
        const dockA = path[i];
        const dockB = path[i + gap];
        // clear the crossing span (docks + gap): it becomes void, and the
        // platform is the only way across
        for (let t = i; t <= i + gap; t++) {
          const [cx, cz] = path[t];
          clearTile(cx, cz);
          carved.add(k(t));
          markMech(cx, cz);
        }
        // remove non-walk side slabs beside the crossing so there is no
        // detour around the gap (the walk itself is never touched)
        for (let gx = dockA[0]; gx <= dockB[0]; gx++) {
          for (const dz of [-1, 1]) {
            const gz = dockA[1] + dz;
            if (gz < 0 || gz > b.H - 1) continue;
            if (pathSet.has(`${gx},${gz}`)) continue; // never break the walk
            if (tiles.has(`${gx},${gz}`)) clearTile(gx, gz);
          }
        }
        shuttles.push({ a: [dockA[0], dockA[1]], b: [dockB[0], dockB[1]], wait: 2.0 });
        return true;
      }
    }
    return false;
  };

  // SPRING PIT: on a straight run S-A-L, hollow out A and put a spring pad
  // on S: the only way across the pit is the launch.
  const trySpring = () => {
    const cands = solidRuns().map(([i, j]) => i).filter((i) => {
      const S = path[i];
      const A = path[i + 1];
      const L = path[i + 2];
      if (!L || i < 1 || i + 2 > path.length - 2) return false;
      if (k(i) === `${start[0]},${start[1]}`) return false;
      if (k(i + 2) === `${goal[0]},${goal[1]}`) return false;
      for (const dz of [-1, 1]) {
        const az = A[1] + dz;
        if (az < 0 || az > b.H - 1) continue;
        const side = `${A[0]},${az}`;
        if (tiles.has(side) && !pathSet.has(side)) return false; // detour around the pit
      }
      return true;
    });
    if (!cands.length) return false;
    const i = cands[Math.floor(rand() * cands.length)];
    const S = path[i];
    const A = path[i + 1];
    const L = path[i + 2];
    for (const dz of [-1, 1]) {
      const az = A[1] + dz;
      if (az < 0 || az > b.H - 1) continue;
      const side = `${A[0]},${az}`;
      if (tiles.has(side) && !pathSet.has(side)) clearTile(A[0], az);
    }
    clearTile(A[0], A[1]);
    carved.add(`${A[0]},${A[1]}`);
    markMech(S[0], S[1]);
    markMech(A[0], A[1]);
    markMech(L[0], L[1]);
    springs.push([S[0], S[1]]);
    return true;
  };

  // ICE: an ice tile on the route; a roll onto it carries the cube one more
  // tile in the same press (the slide stops at the first non-ice slab).
  const tryIce = () => {
    const cands = solidRuns().map(([i, j]) => i).filter((i) => {
      const I = path[i];
      const N = path[i + 1];
      if (!N || i < 1 || i + 1 > path.length - 2) return false;
      if (k(i) === `${start[0]},${start[1]}`) return false;
      if (k(i + 1) === `${goal[0]},${goal[1]}`) return false;
      return Math.abs(map[N[1]][N[0]] - map[I[1]][I[0]]) <= 1;
    });
    if (!cands.length) return false;
    const i = cands[Math.floor(rand() * cands.length)];
    const I = path[i];
    const N = path[i + 1];
    ice.push([I[0], I[1]]);
    markMech(I[0], I[1]);
    markMech(N[0], N[1]);
    return true;
  };

  const has = (m) => (b.mech || []).includes(m);
  if (has('shuttle') && rand() < 0.7) tryShuttle();
  if (has('shuttle') && id === 50 && rand() < 0.6) tryShuttle(); // the finale rides twice
  if (has('spring') && rand() < 0.5) trySpring();
  if (has('spring') && b.W >= 16 && rand() < 0.3) trySpring();
  if (has('ice') && rand() < 0.6) tryIce();
  if (has('ice') && b.W >= 12 && rand() < 0.35) tryIce();

  // --- shards on the route (never start/goal, never on a carved tile) -------
  const inner = path.filter(([x, z]) => !carved.has(`${x},${z}`)).slice(1, -1);
  const shards = [];
  for (let i = 0; i < Math.min(b.shards[1], inner.length); i++) {
    const s = inner.splice(Math.floor(rand() * inner.length), 1)[0];
    shards.push(s);
  }

  // --- sentinels along straight runs (3+ tiles, never over start/goal) ------
  // runs are taken over the SOLID walk: a patrol line never crosses a carved
  // pit, a dock, or the clearance of an ice/spring mechanic
  const lineSet = new Set();
  const runs = [];
  {
    const solid = [];
    path.forEach(([x, z], i) => {
      if (!carved.has(`${x},${z}`)) solid.push(i);
    });
    for (let a = 0; a < solid.length - 1; a++) {
      const i = solid[a];
      const j = solid[a + 1];
      if (j - i !== 1) continue; // not consecutive in the walk
      if (path[i][1] !== path[j][1]) continue;
      const dx = Math.sign(path[j][0] - path[i][0]);
      if (dx === 0) continue;
      let k = a;
      while (
        k + 1 < solid.length &&
        solid[k + 1] - solid[k] === 1 &&
        path[solid[k + 1]][1] === path[solid[k]][1] &&
        path[solid[k + 1]][0] - path[solid[k]][0] === dx
      ) {
        k++;
      }
      if (k - a + 1 >= 3) runs.push([i, solid[k]]);
    }
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
      // a patrol line must keep its clearance off every new mechanic
      let nearMech = false;
      for (let t = i; t <= j && !nearMech; t++) {
        const [tx, tz] = path[t];
        for (let ox = -1; ox <= 1 && !nearMech; ox++) {
          for (let oz = -1; oz <= 1; oz++) {
            if (mechSet.has(`${tx + ox},${tz + oz}`)) {
              nearMech = true;
              break;
            }
          }
        }
      }
      if (nearMech) continue;
      if (`${a[0]},${a[1]}` === `${start[0]},${start[1]}` || `${c[0]},${c[1]}` === `${start[0]},${start[1]}`) continue;
      if (`${a[0]},${a[1]}` === `${goal[0]},${goal[1]}` || `${c[0]},${c[1]}` === `${goal[0]},${goal[1]}`) continue;
      const speed = +(b.speed[0] + rand() * (b.speed[1] - b.speed[0])).toFixed(2);
      orbs.push({ path: [a, c], speed, ...(o > 0 ? { phase: +(rand() * 0.8).toFixed(2) } : {}) });
      for (let t = i; t <= j; t++) lineSet.add(`${path[t][0]},${path[t][1]}`);
      usedRuns.add(ri);
      break outer;
    }
  }

  // --- crumble slabs on the route (solver proves the route survives) --------
  // NEVER on the patrol line or adjacent to it: a crumble on a crossing entry
  // would force the player to gamble the crossing (the slab breaks while they
  // wait for the window), and crumble on the line is decorative noise for the
  // timing validator.
  const wantCrumble = int(b.crumble[0], b.crumble[1]);
  const crumble = [];
  const crumbleCands = inner.filter(([cx, cz]) => {
    if (lineSet.has(`${cx},${cz}`)) return false;
    if (mechSet.has(`${cx},${cz}`)) return false;
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (lineSet.has(`${cx + dx},${cz + dz}`)) return false;
      if (mechSet.has(`${cx + dx},${cz + dz}`)) return false;
    }
    return true;
  });
  while (crumbleCands.length && crumble.length < wantCrumble && rand() < 0.6) {
    crumble.push(crumbleCands.splice(Math.floor(rand() * crumbleCands.length), 1)[0]);
  }
  const crumbleSet = new Set(crumble.map(([cx, cz]) => `${cx},${cz}`));

  // --- the finale's key: an off-route deck slab ------------------------------
  let keyPos = null;
  if (b.key) {
    const candidates = fillSlabs.filter(
      ([fx, fz]) => tiles.has(`${fx},${fz}`) && !crumbleSet.has(`${fx},${fz}`) && !pathSet.has(`${fx},${fz}`),
    );
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
  if (shuttles.length) def.shuttles = shuttles;
  if (springs.length) def.springs = springs;
  if (ice.length) def.ice = ice;
  return def;
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
  if (level.gateKey && !reach.has(key(level.gateKey.x, level.gateKey.z))) problems.push('key unreachable');
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
