// ---------------------------------------------------------------------------
// KUBIK — site mass (Phase G, ADR-045)
//
// The scale problem was never the grid: an 18×18 frame with 47 solid tiles is
// 15% filled, and a level that is 15% filled IS a ribbon. The archetypes carve
// routes; this stage gives those routes a PLACE to happen in.
//
// The first version scattered independent "islands" of slab beside the route.
// Screenshots said what measurements cannot: a board of separate plates still
// reads as a scatter of small things, not as a place. Place is CONTIGUOUS — a
// wide terrace the route runs through, with mass gathered around it and a few
// holes bitten out of it.
//
// So mass is now grown FROM the route:
//
//   WIDEN   every route tile bushes out perpendicular to travel, at the
//           route's own height, 1–3 tiles each side with ragged edges. This
//           is what turns a one-tile line into a 5–7 tile causeway.
//   CLUBS   some of the new land is raised 1–2 storeys: the stacked blocks
//           that give the reference boards their vertical clutter.
//   ISLES   a few unconnected plates in the void, purely so the space around
//           the causeway is composed instead of empty. Never reachable, never
//           decorative mechanics — scenery only.
//
// Contract:
//   - route tiles keep their heights, exactly;
//   - mass only ever covers void;
//   - the generator re-proves every candidate afterwards, so mass that
//     flattens the par, opens a shortcut or creates a soft-lock is rejected.
// ---------------------------------------------------------------------------

import { parseLevel, shortestRoute } from '../src/rules.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Layout → verifier def. Layouts store slab heights as NUMBERS (0 = void),
 * but `parseLevel` reads characters and treats '0' as a height-0 slab. Feeding
 * a raw layout straight to a proof therefore prices every void tile as a
 * walkable floor, which is how a "par" can be measured on a level nobody can
 * walk. This is the same conversion the hazard stage ships (`0 → '.'`), and
 * every proof in this stage goes through it.
 */
export function layoutDef(layout) {
  return {
    ...layout,
    id: 0,
    name: '',
    hint: '',
    map: layout.map.map((row) => row.map((v) => (v === 0 ? '.' : String(v))).join('')),
  };
}

const inBounds = (map, x, z) =>
  z >= 0 && z < map.length && x >= 0 && x < map[0].length;

/** 2×2 solid groups — the direct measure of "wide platform", not "corridor". */
export function countBlocks(map) {
  const H = map.length;
  const W = map[0].length;
  let n = 0;
  for (let z = 0; z < H - 1; z++) {
    for (let x = 0; x < W - 1; x++) {
      if (map[z][x] > 0 && map[z][x + 1] > 0 && map[z + 1][x] > 0 && map[z + 1][x + 1] > 0) n++;
    }
  }
  return n;
}

/** Tiles with a solid neighbour on all four sides — "places", not ribbons. */
export function countInner(map) {
  const H = map.length;
  const W = map[0].length;
  let n = 0;
  for (let z = 1; z < H - 1; z++) {
    for (let x = 1; x < W - 1; x++) {
      if (map[z][x] > 0 && map[z][x - 1] > 0 && map[z][x + 1] > 0
        && map[z - 1][x] > 0 && map[z + 1][x] > 0) n++;
    }
  }
  return n;
}

export function solidCount(map) {
  let n = 0;
  for (const row of map) for (const c of row) if (c > 0) n++;
  return n;
}

/**
 * Perpendicular directions of travel at each path index.
 * A path corner gets both perpendiculars (the outside of the turn).
 */
function perpsAt(path, i) {
  const [x, z] = path[i];
  const prev = path[Math.max(0, i - 1)];
  const next = path[Math.min(path.length - 1, i + 1)];
  const dx = Math.sign(next[0] - prev[0]) || 0;
  const dz = Math.sign(next[1] - prev[1]) || 0;
  if (dx !== 0 && dz !== 0) return [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (dx === 0 && dz === 0) return [];
  return dx !== 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
}

/**
 * Grow the route into a place.
 *
 * @param {object} layout { W, H, map, path, start, goal }
 * @param {Function} rand seeded rng
 * @param {object} b act budget with `mass`:
 *        { fill: target solid fraction, blocks: 2x2 floor, heightMax,
 *          widen: max tiles each side, isles: max scenery plates }
 * @returns {object|null} layout with mass, or null when the contract misses
 */
export function applySiteMass(layout, rand, b) {
  const m = (b && b.mass) || null;
  if (!m || !layout) return layout;
  const { W, H } = layout;
  const map = layout.map.map((row) => row.slice());
  const pathSet = new Set(layout.path.map(([x, z]) => `${x},${z}`));
  // path index per tile: mass may never create a NEW adjacency between two
  // route tiles more than a few steps apart, because that is a shortcut the
  // puzzle was not designed around (a ring that gains a bridge through its
  // own court is no longer a ring).
  const pathIndex = new Map(layout.path.map(([x, z], i) => [`${x},${z}`, i]));
  // A mass tile may touch only route tiles immediately around its seed. Any
  // other contact is a bridge: it joins two stretches of the route that the
  // level's design keeps apart (a ring's moat, a hairpin's inner corner), and
  // the finished board would then be a straight line through the puzzle —
  // measured: a tower's par collapsed 107 → 27 when moats could be filled.
  const legalFill = (x, z, i) => {
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = pathIndex.get(`${x + ax},${z + az}`);
      if (j !== undefined && Math.abs(j - i) > 1) return false;
    }
    return true;
  };
  const spawnClear = (x, z) => {
    for (const [px, pz] of [layout.start, layout.goal]) {
      if (Math.abs(px - x) <= 1 && Math.abs(pz - z) <= 1) return false;
    }
    return true;
  };
  // the level's own ground is immutable: only mass this stage added may be
  // bitten away, or a hole would delete a shortcut the design shipped with
  const origSolid = new Set();
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) if (map[z][x] > 0) origSolid.add(`${x},${z}`);
  }
  const fillTarget = m.fill || 0.32;
  const target = Math.ceil(W * H * fillTarget);
  const maxWiden = m.widen || 3;
  const heightMax = m.heightMax || 3;
  // how much mass the causeway may add; the rest of the target becomes isles
  const causewayCap = Math.ceil(target * 0.86);

  // ---- WIDEN: bush out perpendicular to travel, at the route's height ----
  const grown = []; // { x, z, h } candidates for clubs
  for (let i = 0; i < layout.path.length; i++) {
    const [px, pz] = layout.path[i];
    const h = map[pz][px];
    if (!(h > 0)) continue;
    // raggedness: not every tile bushes out the same distance
    const reach = 1 + Math.floor(rand() * maxWiden);
    for (const [dx, dz] of perpsAt(layout.path, i)) {
      for (let d = 1; d <= reach; d++) {
        const x = px + dx * d;
        const z = pz + dz * d;
        if (!inBounds(map, x, z) || map[z][x] > 0) break; // hit structure: stop this arm
        if (!spawnClear(x, z) || !legalFill(x, z, i)) break;
        if (solidCount(map) >= causewayCap) break;
        map[z][x] = h;
        grown.push({ x, z, h });
        // a ragged edge: sometimes stop early so the causeway is not a slab
        // with square corners everywhere
        if (rand() < 0.18) break;
      }
    }
  }

  // ---- COURTS: the big decks. If the causeway alone cannot reach the
  // act's fill target, widen a stretch of the route into a real court —
  // a deck up to 7 tiles deep on one side of the path. This is the piece
  // that turns "a wide path" into "a place with an edge", and it is where
  // the reference boards' open expanses come from. Courts are attached to
  // the route along their whole face, so they are reachable by design.
  for (let t = 0; t < 120 && solidCount(map) < target; t++) {
    const i = Math.floor(rand() * layout.path.length);
    const [px, pz] = layout.path[i];
    const h = map[pz][px];
    if (!(h > 0)) continue;
    const perps = perpsAt(layout.path, i);
    if (!perps.length) continue;
    const [dx, dz] = perps[Math.floor(rand() * perps.length)];
    // along the face: how far the court runs beside the route
    const len = 3 + Math.floor(rand() * 5);
    const deep = 2 + Math.floor(rand() * 6);
    // the court rectangle starts one tile off the route
    const ax = px + dx;
    const az = pz + dz;
    let filledAny = false;
    for (let s2 = 0; s2 < len; s2++) {
      // run along the perpendicular-to-face axis (i.e. along the route)
      const rx = dz !== 0 ? 1 : 0;
      const rz = dx !== 0 ? 1 : 0;
      const bx = ax + rx * s2;
      const bz = az + rz * s2;
      if (!inBounds(map, bx, bz)) break;
      for (let d = 0; d < deep; d++) {
        const x = bx + dx * d;
        const z = bz + dz * d;
        if (!inBounds(map, x, z) || !spawnClear(x, z) || !legalFill(x, z, i)) break;
        if (map[z][x] > 0) continue; // leave existing structure alone
        map[z][x] = h;
        filledAny = true;
        if (solidCount(map) >= target) break;
      }
      if (solidCount(map) >= target) break;
    }
    if (!filledAny) continue;
  }

  // ---- BITE: holes in the courts. A solid deck is a floor; a deck with
  // holes is architecture, and the holes are what make a player pick a
  // line across it. Never on the route, never at the spawn.
  for (let t = 0; t < 60; t++) {
    const i = 2 + Math.floor(rand() * Math.max(1, layout.path.length - 4));
    const [px, pz] = layout.path[i];
    const ox = px + (rand() < 0.5 ? 1 : -1) * (1 + Math.floor(rand() * 3));
    const oz = pz + (rand() < 0.5 ? 1 : -1) * (1 + Math.floor(rand() * 3));
    // a bite may never take the route, the spawn or the goal — the route's
    // tiles are law, and a hole in it is an unshippable level
    if (!inBounds(map, ox, oz) || map[oz][ox] <= 0 || !spawnClear(ox, oz)) continue;
    if (pathSet.has(`${ox},${oz}`) || origSolid.has(`${ox},${oz}`)) continue;
    // never bite a tile that is the only connection between two parts
    let solidN = 0;
    for (const [ax2, az2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inBounds(map, ox + ax2, oz + az2) && map[oz + az2][ox + ax2] > 0) solidN++;
    }
    if (solidN < 4) continue;
    map[oz][ox] = 0;
  }

  // ---- CLUBS: raise blocks on the new land, never on the route ----------
  const clubTries = Math.ceil(grown.length / 7);
  for (let t = 0; t < clubTries; t++) {
    const seed = grown[Math.floor(rand() * grown.length)];
    if (!seed) break;
    const w = 1 + Math.floor(rand() * 2);
    const hgt = 1 + Math.floor(rand() * Math.min(2, heightMax - 1));
    let ok = true;
    for (let dz = 0; dz < w && ok; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const x = seed.x + dx;
        const z = seed.z + dz;
        if (!inBounds(map, x, z) || map[z][x] <= 0 || pathSet.has(`${x},${z}`)) { ok = false; break; }
        // never sit next to the route at a height the route cannot climb
        for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${x + ax},${z + az}`;
          if (pathSet.has(k)) {
            const [rx, rz] = k.split(',').map(Number);
            if (map[rz][rx] + 1 < map[z][x] + hgt) { ok = false; break; }
          }
        }
        if (!ok) break;
      }
    }
    if (!ok) continue;
    for (let dz = 0; dz < w; dz++) {
      for (let dx = 0; dx < w; dx++) {
        map[seed.z + dz][seed.x + dx] = clamp(seed.h + hgt, 1, heightMax + 1);
      }
    }
  }

  // ---- ISLES: scenery plates in the void, never touching the causeway ----
  const isleTarget = Math.min(m.isles ?? 4, 6);
  let isles = 0;
  for (let t = 0; t < 220 && isles < isleTarget; t++) {
    const w = 2 + Math.floor(rand() * 3);
    const hgt = 2 + Math.floor(rand() * 3);
    const x0 = Math.floor(rand() * (W - w));
    const z0 = Math.floor(rand() * (H - hgt));
    let ok = true;
    // the plate plus a one-tile moat must be void: an isle touching the
    // causeway is a shortcut the proofs never priced
    for (let z = z0 - 1; z <= z0 + hgt && ok; z++) {
      for (let x = x0 - 1; x <= x0 + w; x++) {
        if (!inBounds(map, x, z)) continue;
        if (map[z][x] > 0) { ok = false; break; }
      }
    }
    if (!ok) continue;
    const lvl = 1 + Math.floor(rand() * 2);
    for (let z = z0; z < z0 + hgt; z++) {
      for (let x = x0; x < x0 + w; x++) map[z][x] = lvl;
    }
    isles++;
  }

  // ---- the contract ----------------------------------------------------
  //
  // Three things must hold, and the fill TARGET is not one of them: how much
  // of the frame a board can fill is a property of its route (a ring walks a
  // loop; a lattice covers a grid), so a single per-level fill floor would
  // either reject every compact archetype or be so low it enforces nothing.
  // Fill is instead a generator SCORE input plus a file-level act audit —
  // the act must average its scale, individual boards may breathe.
  const solid = solidCount(map);
  const fill = solid / (W * H);
  if (fill < 0.24) return null; // below this it is still a ribbon
  if (countBlocks(map) < (m.blocks || 0)) return null;
  for (const k of pathSet) {
    const [x, z] = k.split(',').map(Number);
    if (map[z][x] <= 0) return null;
  }
  // The finished board must still be traversable, and mass may not DISSOLVE
  // the design. A route archetype is a puzzle about the way round (a spiral
  // you must walk out of, a ring whose moat you must respect); filling the
  // space beside it turns the way round into a straight line. Measured on a
  // 24×24 board: a gauntlet's route went 74 → 30 rolls, a ring 34 → 21, a
  // shuttle span 44 → 34 — all three would ship as different puzzles than
  // the ones the hooks, bands and experience audit were set for.
  // So the guard is: mass may shorten the proven route by at most 2 rolls.
  const barePar = shortestRoute(parseLevel(layoutDef(layout)));
  const dressed = shortestRoute(parseLevel(layoutDef({ ...layout, map })));
  if (!(dressed > 0)) return null;
  if (barePar > 0 && dressed < barePar - 2) return null;
  return { ...layout, map, massStats: { fill, blocks: countBlocks(map), inner: countInner(map) } };
}
