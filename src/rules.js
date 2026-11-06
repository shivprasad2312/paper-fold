// ---------------------------------------------------------------------------
// Pure game rules — no rendering, no DOM. Shared by the game and the level
// verifier so a level can never ship unsolvable.
// ---------------------------------------------------------------------------

export const DIRS = {
  up: { dx: 0, dz: -1 },
  down: { dx: 0, dz: 1 },
  left: { dx: -1, dz: 0 },
  right: { dx: 1, dz: 0 },
};

/** Maximum height difference you are allowed to fall in one roll. */
export const MAX_DROP = 2;
/** Maximum height difference you are allowed to climb in one roll. */
export const MAX_CLIMB = 1;

export const key = (x, z) => `${x},${z}`;

/**
 * Turn a level definition into a playable model.
 * `tiles` is a Map of "x,z" -> { x, z, h, crumble }
 */
export function parseLevel(def) {
  const tiles = new Map();
  const width = Math.max(...def.map.map((r) => r.length));
  const depth = def.map.length;

  def.map.forEach((row, z) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch >= '0' && ch <= '9') {
        tiles.set(key(x, z), { x, z, h: Number(ch), crumble: false });
      }
    }
  });

  for (const [x, z] of def.crumble || []) {
    const t = tiles.get(key(x, z));
    if (t) t.crumble = true;
  }

  const startTile = tiles.get(key(...def.start));
  const goalTile = tiles.get(key(...def.goal));
  if (!startTile) throw new Error(`[${def.name}] start ${def.start} is not a slab`);
  if (!goalTile) throw new Error(`[${def.name}] goal ${def.goal} is not a slab`);

  const shards = (def.shards || []).map(([x, z]) => {
    if (!tiles.has(key(x, z))) throw new Error(`[${def.name}] shard ${x},${z} is not a slab`);
    return { x, z, id: key(x, z) };
  });

  // ---- obstacle blocks (telekinesis) ---------------------------------------
  const blocks = (def.blocks || []).map(([x, z]) => {
    if (!tiles.has(key(x, z))) throw new Error(`[${def.name}] block ${x},${z} is not a slab`);
    return { x, z };
  });
  const blockTiles = new Set(blocks.map((b) => key(b.x, b.z)));
  if (blockTiles.has(key(startTile.x, startTile.z))) throw new Error(`[${def.name}] block on the start tile`);
  if (blockTiles.has(key(goalTile.x, goalTile.z))) throw new Error(`[${def.name}] block on the goal tile`);

  // ---- sliding bridge tiles -------------------------------------------------
  const sliderTiles = new Set();
  const sliders = (def.sliders || []).map((g) => {
    const tileSet = new Set(
      g.tiles.map(([x, z]) => {
        if (!tiles.has(key(x, z))) throw new Error(`[${def.name}] slider tile ${x},${z} is not a slab`);
        sliderTiles.add(key(x, z));
        return key(x, z);
      }),
    );
    return { tileSet, period: g.period || 3.2, phase: g.phase || 0 };
  });

  // ---- gate key -------------------------------------------------------------
  let gateKey = null;
  if (def.key) {
    const [kx, kz] = def.key;
    if (!tiles.has(key(kx, kz))) throw new Error(`[${def.name}] key ${kx},${kz} is not a slab`);
    if (kx === goalTile.x && kz === goalTile.z) throw new Error(`[${def.name}] key sits on the goal`);
    gateKey = { x: kx, z: kz };
  }

  const wind = def.wind || null;
  const nudge = def.nudge || 0;

  return {
    def,
    tiles,
    width,
    depth,
    start: startTile,
    goal: goalTile,
    shards,
    orbs: def.orbs || [],
    blocks,
    blockTiles,
    sliders,
    sliderTiles,
    gateKey,
    wind,
    nudge,
  };
}

/**
 * Can the cube roll from tile `from` to tile `to`?
 * You may fall up to MAX_DROP, or climb up to MAX_CLIMB.
 * Returns { ok, kind } where kind is 'flat' | 'drop' | 'climb' | 'void' | 'blocked'.
 */
export function checkRoll(level, from, to) {
  if (!to) return { ok: false, kind: 'void' };
  const delta = to.h - from.h;
  if (delta > MAX_CLIMB) return { ok: false, kind: 'blocked' };
  if (-delta > MAX_DROP) return { ok: false, kind: 'blocked' };
  return { ok: true, kind: delta === 0 ? 'flat' : delta > 0 ? 'climb' : 'drop' };
}

/** Neighbours that are legal destinations from a tile (void excluded). */
export function legalNeighbours(level, tile) {
  const out = [];
  for (const [name, d] of Object.entries(DIRS)) {
    const to = level.tiles.get(key(tile.x + d.dx, tile.z + d.dz));
    const res = checkRoll(level, tile, to);
    if (res.ok) out.push({ name, to, kind: res.kind });
  }
  return out;
}

/** Is a sliding-bridge tile currently up (solid) at time `t`? */
export function sliderUp(level, t, x, z) {
  const k = key(x, z);
  for (const g of level.sliders) {
    if (g.tileSet.has(k)) {
      const ph = (t / g.period + g.phase) % 1;
      return ph < 0.55; // up ~55% of the cycle, sinking the rest
    }
  }
  return true;
}

/**
 * Can the block at (x, z) be pushed by (dx, dz)?
 * Blocks only move onto plain slabs — never onto the goal, other blocks,
 * cracked slabs, sliders, or the key.
 */
export function canPushBlock(level, x, z, dx, dz) {
  const to = level.tiles.get(key(x + dx, z + dz));
  if (!to) return false;
  if (to.x === level.goal.x && to.z === level.goal.z) return false;
  if (level.blockTiles.has(key(to.x, to.z))) return false;
  if (to.crumble) return false;
  if (level.sliderTiles.has(key(to.x, to.z))) return false;
  if (level.gateKey && to.x === level.gateKey.x && to.z === level.gateKey.z) return false;
  return true;
}

/** Every tile reachable from the start, ignoring crumble timers and orbs. */
export function reachable(level) {
  const seen = new Set([key(level.start.x, level.start.z)]);
  const queue = [level.start];
  while (queue.length) {
    const cur = queue.shift();
    for (const { to } of legalNeighbours(level, cur)) {
      const k = key(to.x, to.z);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(to);
      }
    }
  }
  return seen;
}

/**
 * Tiles from which the goal can still be reached (reverse walk).
 * Any reachable tile that is NOT in this set is a soft-lock: the player can
 * get there and never finish. We require zero of those.
 */
export function canStillFinish(level) {
  const prev = new Map();
  for (const tile of level.tiles.values()) {
    for (const { to } of legalNeighbours(level, tile)) {
      if (!prev.has(key(to.x, to.z))) prev.set(key(to.x, to.z), []);
      prev.get(key(to.x, to.z)).push(tile);
    }
  }
  const seen = new Set([key(level.goal.x, level.goal.z)]);
  const queue = [level.goal];
  while (queue.length) {
    const cur = queue.shift();
    for (const from of prev.get(key(cur.x, cur.z)) || []) {
      const k = key(from.x, from.z);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(from);
      }
    }
  }
  return seen;
}

/**
 * Shortest number of rolls from start to goal (BFS over legal moves).
 * Used as the level's "par" — clearing in exactly this many rolls is a par run.
 */
export function shortestRoute(level) {
  const goalKey = key(level.goal.x, level.goal.z);
  const startKey = key(level.start.x, level.start.z);
  if (startKey === goalKey) return 0;
  const dist = new Map([[startKey, 0]]);
  const queue = [level.start];
  while (queue.length) {
    const cur = queue.shift();
    const d = dist.get(key(cur.x, cur.z));
    for (const { to } of legalNeighbours(level, cur)) {
      const k = key(to.x, to.z);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      if (k === goalKey) return d + 1;
      queue.push(to);
    }
  }
  return -1;
}

/**
 * State-space search that models BOTH crumble timers (a crumble slab
 * disappears once you step off it) and obstacle blocks (which can be pushed,
 * spending nudges). Orbs/sentinels and sliders are treated as absent/always
 * solid — timing hazards you can simply wait out.
 * Used to prove the intended route is survivable without dashing.
 */
export function solveHazards(level) {
  const start = level.start;
  const blockSig = (blocks) => blocks.map((b) => key(b.x, b.z)).sort().join(';');
  const startBlocks = level.blocks.map((b) => ({ x: b.x, z: b.z }));
  const startState = `${key(start.x, start.z)}|${blockSig(startBlocks)}|${level.nudge}|`;
  const queue = [[start, new Set(), startBlocks, level.nudge]];
  const seen = new Set([startState]);
  let guard = 0;
  while (queue.length) {
    if (++guard > 400000) return { ok: false, capped: true };
    const [tile, broken, blocks, left] = queue.shift();
    if (tile.x === level.goal.x && tile.z === level.goal.z) return { ok: true };
    for (const [name, d] of Object.entries(DIRS)) {
      const tx = tile.x + d.dx;
      const tz = tile.z + d.dz;
      const bk = key(tx, tz);
      const blockIdx = blocks.findIndex((b) => b.x === tx && b.z === tz);

      if (blockIdx >= 0) {
        // A block is in the way: the cube stays, the block slides (costs a nudge).
        if (left <= 0) continue;
        const b = blocks[blockIdx];
        if (!canPushBlock(level, b.x, b.z, d.dx, d.dz)) continue;
        const nb = blocks.map((p, i) => (i === blockIdx ? { x: b.x + d.dx, z: b.z + d.dz } : p));
        const sig = `${key(tile.x, tile.z)}|${blockSig(nb)}|${left - 1}|`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        queue.push([tile, broken, nb, left - 1]);
        continue;
      }

      const to = level.tiles.get(bk);
      if (!to) continue;
      if (!checkRoll(level, tile, to).ok) continue;
      if (broken.has(bk)) continue;
      const nextBroken = tile.crumble ? new Set([...broken, key(tile.x, tile.z)]) : broken;
      const sig = `${bk}|${blockSig(blocks)}|${left}|`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      queue.push([to, nextBroken, blocks, left]);
    }
  }
  return { ok: false };
}

/** Backwards-compatible name. */
export const solveWithCrumble = (level) => solveHazards(level).ok;

/**
 * Distance (Chebyshev) from tile to the nearest point of a sentinel's path.
 * Exported so level data and the daily generator can be checked for the
 * "hazard spawns on top of the start tile" class of bugs.
 */
export function sentinelClearance(level, tile) {
  let best = Infinity;
  for (const orb of level.orbs) {
    for (const [px, pz] of orb.path) {
      const d = Math.max(Math.abs(px - tile.x), Math.abs(pz - tile.z));
      if (d < best) best = d;
    }
  }
  return best;
}

/**
 * Spawn-safety audit for a parsed level:
 *  - no sentinel path point on the start or goal tile (instant-kill loop),
 *  - every sentinel path point sits on a slab,
 *  - no shard/block/key stacked on start or goal,
 *  - start and goal are on slabs, and the start is not a crumble slab.
 * Returns a list of problem strings (empty = safe).
 */
export function spawnProblems(level) {
  const probs = [];
  const startK = key(level.start.x, level.start.z);
  const goalK = key(level.goal.x, level.goal.z);
  for (const orb of level.orbs) {
    orb.path.forEach(([px, pz], i) => {
      if (!level.tiles.has(key(px, pz))) probs.push(`orb ${i} path point ${px},${pz} is not a slab`);
    });
    // The patrol may cross the start tile (that's timing play), but its
    // SPAWN point must not sit on it — that's the instant-death loop the
    // Fault Line shipped with. Same for the goal.
    const [sx, sz] = orb.path[0];
    if (sx === level.start.x && sz === level.start.z) probs.push(`orb ${level.orbs.indexOf(orb)} spawns on the player spawn tile`);
    if (sx === level.goal.x && sz === level.goal.z) probs.push(`orb ${level.orbs.indexOf(orb)} spawns on the goal tile`);
  }
  if (!level.tiles.has(startK)) probs.push('start tile is not a slab');
  if (!level.tiles.has(goalK)) probs.push('goal tile is not a slab');
  if (level.start.crumble) probs.push('start tile is a crumble slab');
  for (const s of level.shards) if (s.id === startK || s.id === goalK) probs.push(`shard on ${s.id === startK ? 'start' : 'goal'} tile`);
  for (const b of level.blocks) {
    const k = key(b.x, b.z);
    if (k === startK || k === goalK) probs.push(`block on ${k === startK ? 'start' : 'goal'} tile`);
  }
  if (level.gateKey) {
    const k = key(level.gateKey.x, level.gateKey.z);
    if (k === startK || k === goalK) probs.push('key on start/goal tile');
  }
  return probs;
}

// ---------------------------------------------------------------------------
// Sentinel timing fairness
//
// A sentinel patrols a closed loop forever. If its patrol line is the only
// way across the level, the player must cross the line while the orb is far
// away — and that safe window is a property of the level data, not of the
// player's luck. This block computes it exactly:
//
//   * every candidate crossing (any contiguous run of patrol-line tiles with
//     off-line neighbours at both ends, in either direction) is simulated
//     roll-by-roll against the orb's exact position,
//   * a crossing is FAIR when its safe-start window is at least TIMING_FLOOR,
//   * the level is FAIR when a start→goal route exists in which every
//     line crossing is fair (graph reachability with crossing edges).
//
// The cube's real interpolated position is checked (sub-stepped), so a
// crossing proven fair here is fair in the game.
// ---------------------------------------------------------------------------

/** One roll takes this long — the law the crossing simulation must respect. */
export const ROLL_TIME = 0.17;
/** Horizontal kill radius of a sentinel — the law of the game's collision. */
export const ORB_KILL_RADIUS = 0.62;
/**
 * The smallest safe-start window a crossing may offer. Below this, a human
 * cannot reliably catch the gap (it reads as a trap, not a challenge).
 */
export const TIMING_FLOOR = 0.5;

/** Closed-loop length of a sentinel path, in tiles. */
export function orbPathLength(path) {
  let total = 0;
  for (let s = 0; s < path.length; s++) {
    const a = path[s];
    const b = path[(s + 1) % path.length];
    total += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }
  return total;
}

/** Full patrol period (seconds) for one sentinel. */
export function orbPeriod(path, speed) {
  return orbPathLength(path) / speed;
}

/**
 * Exact sentinel position at time `t` (same law as levelView.js:
 * dist = phase·total + speed·t, walked along the closed loop).
 */
/** Precomputed segment table for a closed loop (avoids per-call rebuilds). */
export function orbTable(path) {
  const segs = [];
  let total = 0;
  for (let s = 0; s < path.length; s++) {
    const a = path[s];
    const b = path[(s + 1) % path.length];
    const len = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (len > 1e-4) {
      segs.push({ a, b, len, start: total });
      total += len;
    }
  }
  return { segs, total: Math.max(total, 1e-4) };
}

/** Exact sentinel position at time `t` (same law as levelView.js). */
export function orbPosition(path, speed, phase, t) {
  const { segs, total } = orbTable(path);
  const d = (((phase || 0) * total + t * speed) % total + total) % total;
  for (const s of segs) {
    if (d >= s.start && d < s.start + s.len) {
      const f = (d - s.start) / s.len;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * f, z: s.a[1] + (s.b[1] - s.a[1]) * f };
    }
  }
  return { x: path[0][0], z: path[0][1] };
}

/** Sentinel position at a given arc distance along the loop (drift-free anchor). */
export function orbPositionFromDist(table, dist) {
  const d = ((dist % table.total) + table.total) % table.total;
  for (const s of table.segs) {
    if (d >= s.start && d < s.start + s.len) {
      const f = (d - s.start) / s.len;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * f, z: s.a[1] + (s.b[1] - s.a[1]) * f };
    }
  }
  return { x: table.segs[0].a[0], z: table.segs[0].a[1] };
}

/** Same as orbPosition but from a precomputed table (hot path). */
export function orbPositionT(table, speed, phase, t) {
  const d = (((phase || 0) * table.total + t * speed) % table.total + table.total) % table.total;
  for (const s of table.segs) {
    if (d >= s.start && d < s.start + s.len) {
      const f = (d - s.start) / s.len;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * f, z: s.a[1] + (s.b[1] - s.a[1]) * f };
    }
  }
  return { x: table.segs[0].a[0], z: table.segs[0].a[1] };
}

/** Arc distance of a point along the closed path (anchors prediction to real state). */
/**
 * Distance along the patrol loop nearest to (px,pz).
 * CAUTION: on an out-and-back patrol (e.g. a 2-point path) two different
 * distances map to the SAME point — the forward and return leg. This
 * returns the first (smallest) match, i.e. the forward leg. Consumers that
 * need the orb's TRUE directed position (live play) must read the
 * game view's own `dist` instead — see test-levels-playable.mjs.
 */
export function orbDistAlong(path, px, pz) {
  let total = 0;
  const segs = [];
  for (let s = 0; s < path.length; s++) {
    const a = path[s];
    const b = path[(s + 1) % path.length];
    const len = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (len > 1e-4) {
      segs.push({ a, b, len, start: total });
      total += len;
    }
  }
  let best = 1e9;
  let bestD = 0;
  for (const s of segs) {
    const abx = s.b[0] - s.a[0];
    const abz = s.b[1] - s.a[1];
    const l2 = abx * abx + abz * abz;
    let f = l2 > 0 ? ((px - s.a[0]) * abx + (pz - s.a[1]) * abz) / l2 : 0;
    f = Math.max(0, Math.min(1, f));
    const cx = s.a[0] + abx * f;
    const cz = s.a[1] + abz * f;
    const d = Math.hypot(px - cx, pz - cz);
    if (d < best) {
      best = d;
      bestD = s.start + f * s.len;
    }
  }
  return bestD % total;
}

/** Every integer tile a sentinel ever occupies (all tiles of every segment). */
export function orbLineTiles(path) {
  const tiles = new Set();
  for (let s = 0; s < path.length; s++) {
    const a = path[s];
    const b = path[(s + 1) % path.length];
    const dx = Math.sign(b[0] - a[0]);
    const dz = Math.sign(b[1] - a[1]);
    let x = a[0];
    let z = a[1];
    tiles.add(key(x, z));
    while (x !== b[0] || z !== b[1]) {
      x += dx;
      z += dz;
      tiles.add(key(x, z));
    }
  }
  return tiles;
}

const TIMING_SUBSTEPS = 12;

/**
 * Simulate one crossing: the cube rolls entry → seq… → exit at ROLL_TIME per
 * roll while the sentinel(s) patrol. Returns the longest contiguous span of
 * safe start times (seconds) within the scanned horizon. Coarse-to-fine: a
 * candidate whose coarse scan is far below `floor` is rejected without the
 * fine pass (the coarse step is 1/40 of any floor we would accept).
 */
export function crossingWindow(level, entry, seq, exit, floor = TIMING_FLOOR) {
  const allOrbs = level.orbs;
  if (!allOrbs.length || !seq.length) return Infinity;
  const path = [entry, ...seq, exit]; // K+1 rolls

  // An orb can only threaten the crossing if its patrol line comes within
  // one tile of the crossing path (kill radius 0.62 < 1.0). Everything
  // else is filtered out — this is what keeps multi-orb levels fast.
  const orbs = [];
  const tables = [];
  for (const o of allOrbs) {
    let near = false;
    for (const lk of orbLineTiles(o.path)) {
      if (near) break;
      const [lx, lz] = lk.split(',').map(Number);
      for (const pt of path) {
        if (Math.abs(lx - pt.x) <= 1 && Math.abs(lz - pt.z) <= 1) {
          near = true;
          break;
        }
      }
    }
    if (near) {
      orbs.push(o);
      tables.push(orbTable(o.path));
    }
  }
  if (!orbs.length) return Infinity;

  const T = Math.max(...orbs.map((o) => orbPeriod(o.path, o.speed)));
  const HORIZON = orbs.length > 1 ? 2 * T : T; // joint cycle for several sentinels
  const rolls = path.length - 1;
  const R2 = ORB_KILL_RADIUS * ORB_KILL_RADIUS;

  const safeStart = (t0) => {
    const n = rolls * TIMING_SUBSTEPS;
    for (let s = 0; s <= n; s++) {
      const tau = (s / TIMING_SUBSTEPS) * ROLL_TIME;
      const i = Math.min(rolls - 1, Math.floor(tau / ROLL_TIME));
      const f = (tau - i * ROLL_TIME) / ROLL_TIME;
      const px = path[i].x + (path[i + 1].x - path[i].x) * f;
      const pz = path[i].z + (path[i + 1].z - path[i].z) * f;
      const t = t0 + tau;
      for (let oi = 0; oi < orbs.length; oi++) {
        const o = orbs[oi];
        const op = orbPositionT(tables[oi], o.speed, o.phase, t);
        const dx = op.x - px;
        const dz = op.z - pz;
        if (dx * dx + dz * dz < R2) return false;
      }
    }
    return true;
  };

  const scan = (step) => {
    let best = 0;
    let run = 0;
    let prev = null;
    for (let t0 = 0; t0 < HORIZON; t0 += step) {
      if (safeStart(t0)) {
        run = prev === null || t0 - prev > step * 1.5 ? step : run + step;
        if (run > best) best = run;
      } else {
        run = 0;
      }
      prev = t0;
    }
    return best;
  };

  const coarse = scan(0.02);
  if (coarse + 0.06 < floor) return coarse; // hopeless — skip the fine pass
  return scan(0.005); // the fine scan is authoritative (coarse can bridge narrow gaps)
}

/**
 * All candidate crossings of the combined sentinel patrol lines: every short
 * path through the line graph (line tiles adjacent to line tiles) from an
 * off-line slab neighbour to another. Straight runs, L-shaped detours and
 * vertical steps through a two-row band are all covered. Paths longer than
 * MAX_CROSS_DEPTH line tiles are not player-reasonable and are skipped.
 */
export const MAX_CROSS_DEPTH = 4;

export function candidateCrossings(level) {
  const { line } = lineRuns(level);
  if (!line.size) return [];

  const offLineNbrs = (t) =>
    DIRS_OBJ.flatMap(([dx, dz]) => {
      const nt = level.tiles.get(key(t.x + dx, t.z + dz));
      return nt && !line.has(key(nt.x, nt.z)) ? [nt] : [];
    });
  const lineNbrs = (t) =>
    DIRS_OBJ.flatMap(([dx, dz]) => {
      const k2 = key(t.x + dx, t.z + dz);
      return line.has(k2) ? [{ x: t.x + dx, z: t.z + dz }] : [];
    });

  const cands = [];
  const dedupe = new Set();
  const push = (seq, entry, exit) => {
    const id = `${key(entry.x, entry.z)}|${seq.map((t) => key(t.x, t.z)).join('|')}|${key(exit.x, exit.z)}`;
    if (dedupe.has(id)) return;
    dedupe.add(id);
    cands.push({ seq, entry, exit });
  };

  // BFS from every line tile that an off-line slab touches
  for (const k of line) {
    const [ax, az] = k.split(',').map(Number);
    const a = { x: ax, z: az };
    if (!offLineNbrs(a).length) continue;
    const q = [[a]];
    const seenPaths = new Set([k]);
    while (q.length) {
      const path = q.shift();
      const last = path[path.length - 1];
      for (const N of offLineNbrs(last)) {
        for (const NE of offLineNbrs(path[0])) {
          if (N.x === NE.x && N.z === NE.z) continue; // must enter and exit differently
          push(path, NE, N);
        }
      }
      if (path.length < MAX_CROSS_DEPTH) {
        for (const nx of lineNbrs(last)) {
          const np = [...path, nx];
          const id = np.map((t) => key(t.x, t.z)).join('|');
          if (seenPaths.has(id)) continue;
          seenPaths.add(id);
          q.push(np);
        }
      }
    }
  }
  return cands;
}

/** Maximal straight runs of patrol-line tiles (used by the boundary checks). */
export function lineRuns(level) {
  const line = new Set();
  for (const o of level.orbs) for (const t of orbLineTiles(o.path)) line.add(t);
  if (!line.size) return { line, runs: [] };
  const runs = [];
  const seenRuns = new Set();
  for (const k of line) {
    const [x0, z0] = k.split(',').map(Number);
    for (const [dx, dz] of DIRS_OBJ) {
      const run = [];
      let x = x0;
      let z = z0;
      while (line.has(key(x, z))) {
        run.push({ x, z });
        x += dx;
        z += dz;
      }
      if (run.length < 2) continue;
      const id = run.map((t) => key(t.x, t.z)).join('|');
      if (seenRuns.has(id)) continue;
      seenRuns.add(id);
      runs.push(run);
    }
  }
  return { line, runs };
}

const DIRS_OBJ = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/**
 * The fair-crossing graph: every off-line tile as a node; normal adjacency
 * plus directed crossing edges (entry → exit) for every sentinel-line
 * crossing whose safe window is at least TIMING_FLOOR. Start/goal tiles that
 * sit ON the line get their boundary (escape/approach) edges here too.
 *
 * This is the single source of truth for "is there a fair route" — the
 * verifier runs BFS over it, and the live playable bot plans its drives
 * over it, so the gate and the play contract can never disagree.
 */
export function fairCrossingGraph(level) {
  const { line, runs } = lineRuns(level);
  const edges = new Map(); // "x,z" -> [{ to: {x,z}, seq: [{x,z}...] }]
  let bestWindow = 0;
  let anyCandidate = false;
  if (line.size) {
    const addEdge = (from, to, seq) => {
      const k = key(from.x, from.z);
      if (!edges.has(k)) edges.set(k, []);
      edges.get(k).push({ to, seq });
    };
    const note = (w) => {
      anyCandidate = true;
      if (w > bestWindow) bestWindow = w;
    };
    const offLineNbrs = (t) =>
      DIRS_OBJ.flatMap(([dx, dz]) => {
        const nt = level.tiles.get(key(t.x + dx, t.z + dz));
        return nt && !line.has(key(nt.x, nt.z)) ? [nt] : [];
      });

    // BUG-007: a crossing is only usable if every roll of the burst obeys
    // the roll law — a timing window does not make a 2-tile climb legal.
    // (L39 shipped a "fair" crossing whose entry roll was a blocked climb;
    // its only LEGAL crossing was timing-unfair → unfinishable.)
    // heights are resolved from the parsed tiles — candidate seq tiles are
    // synthetic {x,z} (no .h), and checkRoll would treat a NaN delta as ok
    const H = (t) => (typeof t.h === 'number' ? t.h : (level.tiles.get(key(t.x, t.z)) || {}).h);
    const rollOk = (a, b) => {
      const ha = H(a);
      const hb = H(b);
      if (typeof ha !== 'number' || typeof hb !== 'number') return false; // void
      const delta = hb - ha;
      return delta <= MAX_CLIMB && -delta <= MAX_DROP;
    };
    const seqLegal = (from, seq, to) => {
      let a = from;
      for (const t of seq) {
        if (!rollOk(a, t)) return false;
        a = t;
      }
      return to ? rollOk(a, to) : true;
    };

    for (const c of candidateCrossings(level)) {
      const wFwd = crossingWindow(level, c.entry, c.seq, c.exit);
      const wRev = crossingWindow(level, c.exit, [...c.seq].reverse(), c.entry);
      note(wFwd);
      note(wRev);
      if (wFwd >= TIMING_FLOOR && seqLegal(c.entry, c.seq, c.exit)) addEdge(c.entry, c.exit, c.seq);
      if (wRev >= TIMING_FLOOR && seqLegal(c.exit, [...c.seq].reverse(), c.entry)) addEdge(c.exit, c.entry, [...c.seq].reverse());
    }

    // a START on the line: the first roll(s) must slip out while the orb is far
    if (line.has(key(level.start.x, level.start.z))) {
      for (const run of runs) {
        const si = run.findIndex((t) => t.x === level.start.x && t.z === level.start.z);
        if (si < 0) continue;
        for (const slice of [run.slice(si), run.slice(0, si + 1).reverse()]) {
          for (let k = 0; k < slice.length; k++) {
            const t = slice[k];
            for (const N of offLineNbrs(t)) {
              const w = crossingWindow(level, level.start, slice.slice(0, k + 1), N);
              note(w);
              if (w >= TIMING_FLOOR && seqLegal(level.start, slice.slice(0, k + 1), N)) addEdge(level.start, N, slice.slice(0, k + 1));
            }
          }
        }
      }
    }

    // a GOAL on the line: the final roll must arrive while the orb is far
    if (line.has(key(level.goal.x, level.goal.z))) {
      for (const run of runs) {
        const gi = run.findIndex((t) => t.x === level.goal.x && t.z === level.goal.z);
        if (gi < 0) continue;
        for (const slice of [run.slice(gi), run.slice(0, gi + 1).reverse()]) {
          for (let k = 0; k < slice.length; k++) {
            const t = slice[k];
            for (const N of offLineNbrs(t)) {
              const seq = slice.slice(0, k + 1).reverse(); // travel order: t … goal
              const w = crossingWindow(level, N, seq, level.goal);
              note(w);
              if (w >= TIMING_FLOOR && seqLegal(N, seq, level.goal)) addEdge(N, level.goal, seq);
            }
          }
        }
      }
    }

    // KEY COLLECTION LINKS: any crossing whose path steps on the key tile
    // lets the player collect it mid-crossing. The key node is not a tile —
    // a graph-only waypoint ("key:x,z") — so the verifier can require
    // start→key and key→goal to both be fair routes.
    if (level.gateKey) {
      const keyK = key(level.gateKey.x, level.gateKey.z);
      const keyNode = { x: level.gateKey.x, z: level.gateKey.z, isKeyNode: true };
      const nodeK = `key:${keyK}`;
      const all = [];
      for (const [fromK, es] of edges) {
        const [fx, fz] = fromK === nodeK ? [level.gateKey.x, level.gateKey.z] : fromK.split(',').map(Number);
        for (const e of es) all.push({ from: { x: fx, z: fz }, to: e.to, seq: e.seq });
      }
      for (const e of all) {
        const m = e.seq.findIndex((t) => key(t.x, t.z) === keyK);
        if (m < 0) continue;
        const inSeq = e.seq.slice(0, m + 1);
        const outSeq = e.seq.slice(m);
        // pickup: from → … → key
        if (!edges.has(key(e.from.x, e.from.z))) edges.set(key(e.from.x, e.from.z), []);
        if (!edges.get(key(e.from.x, e.from.z)).some((x) => x.to === keyNode && x.seq === inSeq)) {
          edges.get(key(e.from.x, e.from.z)).push({ to: keyNode, seq: inSeq });
        }
        // departure: key → … → to
        if (!edges.has(nodeK)) edges.set(nodeK, []);
        if (!edges.get(nodeK).some((x) => x.to === e.to && x.seq === outSeq)) {
          edges.get(nodeK).push({ to: e.to, seq: outSeq });
        }
      }
    }
  }
  return { line, edges, bestWindow, anyCandidate };
}

/**
 * The gate: does a start→goal route exist in which every sentinel-line
 * crossing has a safe window of at least TIMING_FLOOR?
 * Returns a list of problem strings (empty = fair).
 */
export function timingProblems(level) {
  if (!level.orbs.length) return [];
  const { line, edges, bestWindow, anyCandidate } = fairCrossingGraph(level);

  const startK = key(level.start.x, level.start.z);
  const goalK = key(level.goal.x, level.goal.z);

  // fair reachability: BFS over off-line tiles + fair crossing edges.
  // Nodes are identified by "x,z" for tiles and "key:x,z" for the key node
  // (a graph-only waypoint that sits on a line tile).
  const idOf = (t) => (t.isKeyNode ? `key:${t.x},${t.z}` : key(t.x, t.z));
  const fairReach = (from, keySeed = false) => {
    const seen = new Set();
    const q = [];
    const seed = (t) => {
      const k = idOf(t);
      if (!seen.has(k)) {
        seen.add(k);
        q.push(t);
      }
    };
    const entryK = keySeed ? `key:${from.x},${from.z}` : idOf(from);
    if (!from.isKeyNode && line.has(key(from.x, from.z))) {
      // a start (or the key) sitting on the line seeds only through fair
      // escape edges
      for (const e of edges.get(entryK) || []) seed(e.to);
    } else {
      seed(from);
    }
    while (q.length) {
      const ct = q.shift();
      const targets = new Set((edges.get(idOf(ct)) || []).map((e) => idOf(e.to)));
      if (!ct.isKeyNode) {
        for (const [dx, dz] of DIRS_OBJ) {
          const to = level.tiles.get(key(ct.x + dx, ct.z + dz));
          if (!to || line.has(key(to.x, to.z))) continue; // off-line neighbours only
          targets.add(key(to.x, to.z));
        }
      }
      for (const tk of targets) {
        if (seen.has(tk)) continue;
        seen.add(tk);
        const [tx, tz] = (tk.startsWith('key:') ? tk.slice(4) : tk).split(',').map(Number);
        q.push(tk.startsWith('key:') ? { x: tx, z: tz, isKeyNode: true } : { x: tx, z: tz });
      }
    }
    return seen;
  };

  const reach = fairReach(level.start);
  if (!reach.has(goalK)) {
    // fall through to the descriptive errors below
  } else if (level.gateKey) {
    // the key must be collectible on a fair route, and the goal must still
    // be reachable after picking it up (fair route from the key)
    const keyK = key(level.gateKey.x, level.gateKey.z);
    const keyOnLine = line.has(keyK);
    if (!reach.has(keyOnLine ? `key:${keyK}` : keyK)) {
      return ['gate key is only reachable through an unfair sentinel crossing'];
    }
    if (!fairReach(level.gateKey, keyOnLine).has(goalK)) {
      return ['goal is only reachable from the key through an unfair sentinel crossing'];
    }
    return [];
  } else {
    return [];
  }
  if (line.has(startK) && !(edges.get(startK) || []).length) {
    return [`start tile sits on the sentinel patrol line with no fair escape window (best ${bestWindow.toFixed(2)} s)`];
  }
  if (!anyCandidate) return ['sentinel line has no enterable crossing at all'];
  if (bestWindow < TIMING_FLOOR) {
    return [
      `sentinel patrol seals every crossing (best safe window ${bestWindow.toFixed(2)} s < ${TIMING_FLOOR.toFixed(2)} s)`,
    ];
  }
  return [
    `no start→goal route uses only fair sentinel crossings (best window ${bestWindow.toFixed(2)} s exists but no route can reach it)`,
  ];
}
