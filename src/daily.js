// ---------------------------------------------------------------------------
// KUBIK — daily challenge
//
// Every day a new level is generated from the date (YYYY-MM-DD). Generation is
// seeded, then the level is run through the SAME verifiers as the hand-made
// ones (spawn safety, shortest route, crumble/block solver) — so a daily is
// guaranteed solvable, never a spawn-kill, and impossible to soft-lock.
// ---------------------------------------------------------------------------

import { parseLevel, shortestRoute, solveHazards, spawnProblems } from './rules.js';

/** Deterministic string hash → 32-bit seed. */
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. */
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

const W = 7; // grid columns
const H = 9; // grid rows (z 0..8, start at the bottom)

/** Try to build one candidate level from the PRNG. Returns a def or null. */
function generate(rand) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  const map = Array.from({ length: H }, () => Array(W).fill(0));
  const tiles = new Set();
  const add = (x, z, h) => {
    map[z][x] = h;
    tiles.add(`${x},${z}`);
  };

  // --- carve a random walk from the bottom to a goal row at the top -------
  let x = int(1, W - 2);
  let z = H - 1;
  let h = 2;
  const path = [];
  add(x, z, h);
  path.push([x, z]);

  const goalZ = int(0, 1);
  while (z > goalZ) {
    const side = int(1, 3);
    for (let s = 0; s < side && z > goalZ; s++) {
      const d = pick([-1, 1]);
      const nx = x + d;
      if (nx < 0 || nx > W - 1) continue;
      const nh = Math.min(3, Math.max(1, h + pick([-1, 0, 0, 1])));
      x = nx;
      h = nh;
      add(x, z, h);
      path.push([x, z]);
    }
    const nh = Math.min(3, Math.max(1, h + pick([-1, 0, 0, 1])));
    z -= 1;
    h = nh;
    add(x, z, h);
    path.push([x, z]);
  }
  const start = [path[0][0], path[0][1]];
  const goal = [path[path.length - 1][0], path[path.length - 1][1]];
  if (start[0] === goal[0] && start[1] === goal[1]) return null;

  // --- flesh out the floor with a couple of extra slabs --------------------
  for (let i = 0; i < int(2, 4); i++) {
    const [px, pz] = pick(path);
    const d = pick([-1, 1]);
    const nx = px + d;
    if (nx < 0 || nx > W - 1) continue;
    const k = `${nx},${pz}`;
    if (tiles.has(k)) continue;
    add(nx, pz, Math.min(3, Math.max(1, map[pz][px] + pick([-1, 0, 0, 1]))));
  }

  // --- shards on the path (never on start/goal) -----------------------------
  const inner = path.filter(([px, pz]) => !(px === start[0] && pz === start[1]) && !(px === goal[0] && pz === goal[1]));
  const shards = [];
  for (let i = 0; i < Math.min(3, inner.length) && i < 3; i++) {
    const s = inner.splice(Math.floor(rand() * inner.length), 1)[0];
    shards.push(s);
  }

  // --- a couple of crumble slabs (never start/goal) -------------------------
  const crumble = [];
  for (let i = 0; i < inner.length && crumble.length < 2; i++) {
    if (rand() < 0.55) {
      crumble.push(inner.splice(i, 1)[0]);
      i--;
    }
  }

  // --- a sentinel along the longest straight stretch ------------------------
  let orbs = [];
  let bestRun = null;
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i][1] !== path[i + 1][1]) continue; // a straight run stays in one row
    const dx = Math.sign(path[i + 1][0] - path[i][0]);
    if (dx === 0) continue;
    let j = i;
    while (j + 1 < path.length && path[j + 1][1] === path[j][1] && path[j + 1][0] - path[j][0] === dx) j++;
    const len = j - i + 1;
    if (len >= 3 && (!bestRun || len > bestRun.len)) bestRun = { i, j, len };
  }
  if (bestRun) {
    const a = path[bestRun.i];
    const b = path[bestRun.j];
    if (!(a[0] === start[0] && a[1] === start[1]) && !(b[0] === start[0] && b[1] === start[1]) &&
        !(a[0] === goal[0] && a[1] === goal[1]) && !(b[0] === goal[0] && b[1] === goal[1])) {
      orbs = [{ path: [a, b], speed: 1.6 + rand() * 0.9 }];
    }
  }

  const rows = map.map((row) => row.map((v) => (v === 0 ? '.' : String(v))).join(''));
  return {
    id: 'daily',
    name: 'Daily Challenge',
    hint: 'Generated for today — the same layout for everyone, solvable by design',
    map: rows,
    start,
    goal,
    shards,
    crumble,
    orbs,
  };
}

/** A last-resort hand-written level, only used if every seeded attempt fails. */
const FALLBACK = {
  id: 'daily',
  name: 'Daily Challenge',
  hint: 'Generated for today — the same layout for everyone, solvable by design',
  map: [
    '..000..',
    '..000..',
    '..111..',
    '..111..',
    '..222..',
    '..222..',
  ],
  start: [3, 5],
  goal: [3, 0],
  shards: [[2, 2], [4, 2], [3, 4]],
};

/**
 * The daily level for `dateStr` (YYYY-MM-DD).
 * Deterministic: same date → same level, on every device.
 */
export function getDailyLevel(dateStr) {
  for (let attempt = 0; attempt < 48; attempt++) {
    const rand = rng(hashSeed(`${dateStr}#${attempt}`));
    const def = generate(rand);
    if (!def) continue;
    const level = parseLevel(def); // throws on malformed data
    const probs = spawnProblems(level);
    const route = shortestRoute(level); // number of rolls, or -1
    if (route < 0) continue;
    const solve = solveHazards(level);
    if (!solve.ok) continue;
    if (probs.length) continue;
    return { def, par: route };
  }
  const level = parseLevel(FALLBACK);
  const route = shortestRoute(level);
  return { def: FALLBACK, par: route };
}
