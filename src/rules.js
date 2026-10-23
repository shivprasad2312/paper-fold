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

  return {
    def,
    tiles,
    width,
    depth,
    start: startTile,
    goal: goalTile,
    shards,
    orbs: def.orbs || [],
  };
}

/**
 * Can the cube roll from tile `from` to tile `to`?
 * Returns { ok, kind } where kind is 'flat' | 'drop' | 'void' | 'blocked'.
 */
export function checkRoll(level, from, to) {
  if (!to) return { ok: false, kind: 'void' };
  const drop = from.h - to.h;
  if (drop < 0) return { ok: false, kind: 'blocked' };
  if (drop > MAX_DROP) return { ok: false, kind: 'blocked' };
  return { ok: true, kind: drop === 0 ? 'flat' : 'drop' };
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
 * State-space search that DOES model the crumble timers (a crumble slab
 * disappears once you step off it) and treats orbs as absent.
 * Used to prove the intended route is survivable without dashing.
 */
export function solveWithCrumble(level) {
  const start = level.start;
  const startState = `${key(start.x, start.z)}|`;
  const queue = [[start, new Set()]];
  const seen = new Set([startState]);
  while (queue.length) {
    const [tile, broken] = queue.shift();
    if (tile === level.goal) return true;
    for (const { to } of legalNeighbours(level, tile)) {
      if (broken.has(key(to.x, to.z))) continue;
      const nextBroken = new Set(broken);
      if (tile.crumble) nextBroken.add(key(tile.x, tile.z));
      const sig = `${key(to.x, to.z)}|${[...nextBroken].sort().join(';')}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      queue.push([to, nextBroken]);
    }
  }
  return false;
}
