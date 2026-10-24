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
