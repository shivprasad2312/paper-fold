// ---------------------------------------------------------------------------
// KUBIK — archetype library (ADR-015)
//
// 24 named layout builders. Each takes (rand, b) — b carries W/H and the act
// budget — and returns a LAYOUT: { W, H, map, path, start, goal, forceIce? }.
// `map[z][x]` is the slab height (0 = void); `path` is the ordered route
// (consecutive tiles adjacent, climb ≤ 1, fall ≤ 2, no revisits); the
// generator then dresses the layout with the shared hazard stage
// (scripts/hazards.mjs) and the full verifier stays the backstop.
//
// The variety budget: acts 3–10 each unlock a fresh slice of this library
// (src/acts.js `arch:` pools), so level 60 looks structurally different from
// level 150. The old single-archetype generator (descent walks) was what
// made repetition show around level 60 — this is the fix.
// ---------------------------------------------------------------------------

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const range = (a, b) => {
  const out = [];
  const d = b >= a ? 1 : -1;
  for (let v = a; d > 0 ? v <= b : v >= b; v += d) out.push(v);
  return out;
};

function blank(W, H) {
  return Array.from({ length: H }, () => Array(W).fill(0));
}

function put(map, x, z, h) {
  map[z][x] = h;
}

/**
 * Finalize a layout: validate the route (solid, adjacent, legal height
 * steps, no revisits) and stamp start/goal. Returns null when broken — the
 * generator simply draws the next candidate.
 */
export function finish(W, H, map, path, opts = {}) {
  if (!path || path.length < 5) return null;
  const seen = new Set();
  for (let i = 0; i < path.length; i++) {
    const [x, z] = path[i];
    if (x < 0 || z < 0 || x >= W || z >= H) return null;
    if (map[z][x] === 0) return null; // route tile must be solid
    const k = `${x},${z}`;
    if (seen.has(k)) return null;
    seen.add(k);
    if (i > 0) {
      const [px, pz] = path[i - 1];
      if (Math.abs(x - px) + Math.abs(z - pz) !== 1) return null;
      const dh = map[z][x] - map[pz][px];
      if (dh > 1 || -dh > 2) return null; // climb ≤ 1, fall ≤ 2
    }
  }
  const [sx, sz] = path[0];
  const [gx, gz] = path[path.length - 1];
  if (sx === gx && sz === gz) return null;
  return {
    W,
    H,
    map,
    path,
    start: [sx, sz],
    goal: [gx, gz],
    ...(opts.forceIce ? { forceIce: opts.forceIce } : {}),
  };
}

/**
 * A random walk biased upward, constrained to solid tiles inside [x0,x1]×[z0,z1],
 * from (sx,sz) until z ≤ targetZ (or `maxSteps`). Returns the tile list
 * (start included) or null. Never revisits.
 */
export function driftWalk(rand, W, H, map, sx, sz, x0, x1, targetZ, maxSteps) {
  const path = [[sx, sz]];
  const seen = new Set([`${sx},${sz}`]);
  let x = sx;
  let z = sz;
  for (let s = 0; s < maxSteps && z > targetZ; s++) {
    const opts = [];
    // genuinely biased pool: 3× up, 2× sideways, 1× down
    for (const dz of [-1, -1, -1, 0, 0, 1]) {
      for (const dx of [0, 0, rand() < 0.5 ? 1 : -1, rand() < 0.5 ? -1 : 1]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < x0 || nx > x1 || nz < 0 || nz > H - 1) continue;
        if (map[nz][nx] === 0) continue;
        if (seen.has(`${nx},${nz}`)) continue;
        const dh = map[nz][nx] - map[z][x];
        if (dh > 1 || -dh > 2) continue;
        opts.push([nx, nz]);
      }
    }
    if (!opts.length) return null; // boxed in
    const [nx, nz] = opts[Math.floor(rand() * opts.length)];
    x = nx;
    z = nz;
    seen.add(`${x},${z}`);
    path.push([x, z]);
  }
  if (z > targetZ) return null;
  return path;
}

/**
 * A random walk from (sx,sz) to a SPECIFIC target tile (tx,tz), constrained
 * to solid tiles inside [x0,x1], biased toward the target. Never revisits.
 * Returns the tile list (start included, target last) or null.
 */
export function walkTo(rand, W, H, map, sx, sz, tx, tz, x0, x1, maxSteps) {
  const path = [[sx, sz]];
  const seen = new Set([`${sx},${sz}`]);
  let x = sx;
  let z = sz;
  for (let s = 0; s < maxSteps; s++) {
    if (x === tx && z === tz) return path;
    const opts = [];
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < x0 || nx > x1 || nz < 0 || nz > H - 1) continue;
      if (map[nz][nx] === 0) continue;
      if (seen.has(`${nx},${nz}`)) continue;
      const dh = map[nz][nx] - map[z][x];
      if (dh > 1 || -dh > 2) continue;
      opts.push([nx, nz]);
    }
    if (!opts.length) return null;
    // prefer tiles that reduce the Manhattan distance to the target
    const scored = opts.map(([nx, nz]) => ({
      t: [nx, nz],
      d: Math.abs(nx - tx) + Math.abs(nz - tz),
    }));
    const best = Math.min(...scored.map((o) => o.d));
    const near = scored.filter((o) => o.d <= best + 1).map((o) => o.t);
    const [nx, nz] = near[Math.floor(rand() * near.length)];
    x = nx;
    z = nz;
    seen.add(`${x},${z}`);
    path.push([x, z]);
  }
  return x === tx && z === tz ? path : null;
}

/**
 * Sprinkle fill slabs one step off `path` (key placement + looks).
 * Never stacks: a fill slab beside two solid neighbours in the same column
 * would be a ladder the player climbs to skip a corridor row — that quietly
 * collapses the par.
 */
function sideFill(rand, W, H, map, path, count) {
  const pathSet = new Set(path.map(([x, z]) => `${x},${z}`));
  for (let t = 0; t < 80 && count > 0; t++) {
    const [px, pz] = path[Math.floor(rand() * path.length)];
    const nx = px + (rand() < 0.5 ? 1 : -1);
    if (nx < 0 || nx >= W) continue;
    if (map[pz][nx] !== 0 || pathSet.has(`${nx},${pz}`)) continue;
    for (const dz of [-1, 1]) {
      const az = pz + dz;
      if (az < 0 || az >= H) continue;
      // a solid non-path slab directly above/below = a shortcut ladder
      if (map[az][nx] !== 0 && !pathSet.has(`${nx},${az}`)) continue;
    }
    put(map, nx, pz, clamp(map[pz][px] + (rand() < 0.4 ? (rand() < 0.5 ? 1 : -1) : 0), 1, 4));
    count--;
  }
}


/**
 * A serpentine of `n` rows separated by VOID gap rows, linked by a single
 * connector tile at each turn edge. Without the gaps the rows would fuse
 * into a solid block the player climbs straight up (par collapse) — the gap
 * + edge connector is what makes the zigzag the only line.
 * Returns { map, path } (caller adds fill / finishes).
 */
function serpentine(rand, W, H, w, n, hOf) {
  const cx = int(rand, 0, W - w);
  const map = blank(W, H);
  const path = [];
  let r = 0;
  while (r < n) {
    const z = H - 1 - 2 * r;
    if (z < 2) break;
    const h = clamp(hOf(r), 1, 4);
    const xs = r % 2 === 0 ? range(cx, cx + w - 1) : range(cx + w - 1, cx);
    for (const x of xs) {
      put(map, x, z, h);
      path.push([x, z]);
    }
    if (z - 2 >= 1) {
      const ex = r % 2 === 0 ? cx + w - 1 : cx;
      put(map, ex, z - 1, h); // the connector (same height: always a legal step)
      path.push([ex, z - 1]);
    }
    r++;
  }
  return { map, path, cx };
}

// ---------------------------------------------------------------------------
// ARCHETYPES
// ---------------------------------------------------------------------------

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const int = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// 1. DESCENT — the original random walk (bottom → top, side steps).
export function descent(rand, b) {
  const { W, H } = b;
  const map = blank(W, H);
  const path = [];
  const seen = new Set();
  const addTile = (px, pz, ph) => {
    const k = `${px},${pz}`;
    if (seen.has(k)) return;
    seen.add(k);
    put(map, px, pz, ph);
    path.push([px, pz]);
  };
  let x = int(rand, 1, W - 2);
  let z = H - 1;
  let h = int(rand, 1, 3);
  addTile(x, z, h);
  const goalZ = int(rand, 0, 1);
  while (z > goalZ) {
    const side = int(rand, 0, 3);
    const d0 = pick(rand, [-1, 1]);
    for (let s = 0; s < side && z > goalZ; s++) {
      const d = rand() < 0.8 ? d0 : -d0;
      const nx = x + d;
      if (nx < 0 || nx > W - 1 || seen.has(`${nx},${z}`)) continue;
      x = nx;
      h = clamp(h + pick(rand, [-1, 0, 0, 1]), 1, 3);
      addTile(x, z, h);
    }
    z -= 1;
    h = clamp(h + pick(rand, [-1, 0, 0, 1]), 1, 3);
    addTile(x, z, h);
  }
  sideFill(rand, W, H, map, path, int(rand, 3, 6));
  return finish(W, H, map, path);
}

// 2. SWITCHBACK — a serpentine corridor (gap rows + edge connectors).
export function switchback(rand, b) {
  const { W, H } = b;
  const w = int(rand, 3, 4);
  const n = int(rand, 4, Math.floor((H - 1) / 2));
  let h = int(rand, 1, 2);
  const { map, path } = serpentine(rand, W, H, w, n, (r) => {
    h = clamp(h + pick(rand, [-1, 0, 0, 1]), 1, 3);
    return h;
  });
  sideFill(rand, W, H, map, path, int(rand, 3, 6));
  return finish(W, H, map, path);
}

// 3. TWIN-BRIDGE — two vertical corridors joined by a bridge row.
export function twinBridge(rand, b) {
  const { W, H } = b;
  const a = int(rand, 1, 4);
  const bcol = int(rand, W - 5, W - 3);
  const m = int(rand, 3, H - 4);
  const map = blank(W, H);
  const path = [];
  let h = 2;
  for (let z = H - 1; z >= m; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, a, z, h);
    path.push([a, z]);
  }
  for (let x = a + 1; x <= bcol; x++) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, m, h);
    path.push([x, m]);
  }
  for (let z = m - 1; z >= 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, bcol, z, h);
    path.push([bcol, z]);
  }
  // width-2 corridors: the second column is fill
  for (let z = H - 1; z >= m; z--) put(map, a + 1, z, clamp(map[z][a] + pick(rand, [-1, 0]), 1, 3));
  for (let z = m - 1; z >= 1; z--) put(map, bcol - 1, z, clamp(map[z][bcol] + pick(rand, [-1, 0]), 1, 3));
  sideFill(rand, W, H, map, path, int(rand, 2, 5));
  return finish(W, H, map, path);
}

// 4. SPIRAL — an inward square spiral; the route truncates partway in.
export function spiral(rand, b) {
  const { W, H } = b;
  const s = int(rand, 8, Math.min(12, Math.min(W, H) - 2));
  const ox = int(rand, 0, W - s);
  const oz = int(rand, 0, H - s);
  const full = [];
  for (let s0 = 0; s - 2 * s0 >= 3; s0++) {
    const x0 = ox + s0;
    const z0 = oz + s0;
    const x1 = ox + s - 1 - s0;
    const z1 = oz + s - 1 - s0;
    for (let x = x0; x <= x1; x++) full.push([x, z0]);
    for (let z = z0 + 1; z <= z1; z++) full.push([x1, z]);
    for (let x = x1 - 1; x >= x0; x--) full.push([x, z1]);
    for (let z = z1 - 1; z > z0; z--) full.push([x0, z]);
  }
  // truncate to the par budget: keep the first L tiles of the spiral
  const L = clamp(int(rand, Math.floor(b.par[0] * 0.9), Math.ceil(b.par[1] * 1.05)), 8, full.length - 3);
  const path = full.slice(0, L);
  const map = blank(W, H);
  let h = 2;
  for (const [x, z] of path) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, z, h);
  }
  sideFill(rand, W, H, map, path, int(rand, 3, 6));
  return finish(W, H, map, path);
}

// 5. LATTICE — a # grid of strips; the route snakes strip to strip.
export function lattice(rand, b) {
  const { W, H } = b;
  const xmin = int(rand, 1, 3);
  const xmax = W - int(rand, 1, 3);
  const zmin = int(rand, 1, 3);
  const zmax = H - int(rand, 1, 2);
  const dist = (lo, hi, n) => {
    const out = new Set();
    while (out.size < n) out.add(int(rand, lo, hi));
    return [...out].sort((u, v) => u - v);
  };
  const vx = dist(xmin, xmax, 4);
  const hz = dist(zmin, zmax, 4);
  const map = blank(W, H);
  for (const x of vx) for (let z = zmin; z <= zmax; z++) put(map, x, z, 2);
  for (const z of hz) for (let x = xmin; x <= xmax; x++) put(map, x, z, 2);
  // route: random column order, climbing between rows (heights come AFTER:
  // the route must never see a 1→3 step)
  const cols = [...vx].sort(() => rand() - 0.5);
  const path = [];
  let x = cols[0];
  let z = zmax;
  path.push([x, z]);
  for (let ci = 0; ci < 3; ci++) {
    // cross to the next column at a strip row above us (if one exists)
    const upRows = hz.filter((r) => r < z);
    if (upRows.length) {
      const nz = pick(rand, upRows);
      while (z > nz) {
        z--;
        path.push([x, z]);
      }
      const nx = cols[ci + 1];
      const dx = nx > x ? 1 : -1;
      for (let xx = x + dx; ; xx += dx) {
        path.push([xx, nz]);
        if (xx === nx) break;
      }
      x = nx;
    }
  }
  while (z > zmin) {
    z--;
    path.push([x, z]);
  }
  const routeSet = new Set(path.map(([px, pz]) => `${px},${pz}`));
  for (let zz = zmin; zz <= zmax; zz++)
    for (let xx = xmin; xx <= xmax; xx++)
      if (map[zz][xx] && !routeSet.has(`${xx},${zz}`) && rand() < 0.3) map[zz][xx] = 2 + pick(rand, [-1, 1]);
  sideFill(rand, W, H, map, path, int(rand, 2, 5));
  return finish(W, H, map, path);
}

// 6. SPLIT-MERGE — two parallel corridors that merge into one.
export function splitMerge(rand, b) {
  const { W, H } = b;
  const a = int(rand, 1, 3);
  const bc = int(rand, W - 4, W - 2);
  const m = int(rand, 4, H - 4);
  const c = int(rand, a + 3, bc - 3);
  const map = blank(W, H);
  let h = 2;
  for (let z = H - 1; z >= m; z--) {
    put(map, a, z, h);
    put(map, bc, z, clamp(h + pick(rand, [-1, 0]), 1, 3));
  }
  for (let x = a; x <= bc; x++) put(map, x, m, 2);
  for (let z = m - 1; z >= 1; z--) put(map, c, z, 2);
  const path = [];
  for (let z = H - 1; z >= m; z--) path.push([a, z]);
  for (let x = a + 1; x <= c; x++) path.push([x, m]);
  for (let z = m - 1; z >= 1; z--) path.push([c, z]);
  sideFill(rand, W, H, map, path, int(rand, 2, 5));
  return finish(W, H, map, path);
}

// 7. RING — around a central void; the near side is a void gap, so the only
// line is the long way round.
export function ring(rand, b) {
  const { W, H } = b;
  const s = int(rand, 10, Math.min(12, Math.min(W, H)));
  const ox = int(rand, 0, W - s);
  const oz = int(rand, 0, H - s);
  const x0 = ox;
  const z0 = oz;
  const x1 = ox + s - 1;
  const z1 = oz + s - 1;
  const gapL = x0 + int(rand, 2, 3);
  const gapR = x1 - int(rand, 2, 3);
  const map = blank(W, H);
  const path = [];
  let h = 2;
  const add = (x, z) => {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, z, h);
    path.push([x, z]);
  };
  // start bottom-left of the gap, go the long way: left, up, across, down
  add(gapL, z1);
  for (let x = gapL - 1; x >= x0; x--) add(x, z1);
  for (let z = z1 - 1; z >= z0; z--) add(x0, z);
  for (let x = x0 + 1; x <= x1; x++) add(x, z0);
  for (let z = z0 + 1; z <= z1; z++) add(x1, z);
  for (let x = x1 - 1; x > gapR; x--) add(x, z1);
  sideFill(rand, W, H, map, path, int(rand, 2, 5));
  return finish(W, H, map, path);
}

// 8. KEY-DETOUR — a two-column serpentine spine with a walled chamber
// off-route (the key's home; the generator forces keyP=1 on this one).
export function keyDetour(rand, b) {
  const { W, H } = b;
  // a TRUE serpentine spine (void gap rows, one connector per turn) — the
  // old 2-column "spine" was a solid pillar the cube climbed straight up
  // (par 7-17 vs mid-act bands 19+). The chamber is a necked detour: the
  // key's home, never a shortcut.
  const w = int(rand, 3, 5);
  const n = int(rand, 4, Math.floor((H - 1) / 2));
  let h = 2; // walk form: consecutive rows must stay ≤ 1 apart
  const { map, path, cx } = serpentine(rand, W, H, w, n, () => {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    return h;
  });
  const rCh = int(rand, 1, n - 2);
  const zCh = H - 1 - 2 * rCh;
  const rowXs = rCh % 2 === 0 ? range(cx, cx + w - 1) : range(cx + w - 1, cx);
  const rowEnd = rowXs[rowXs.length - 1];
  const side = rowEnd + 1 + w < W ? 1 : -1; // chamber on the roomier side
  const c0 = side > 0 ? rowEnd + 2 : rowEnd - 3;
  if (c0 >= 0 && c0 + 3 < W) {
    for (let x = c0; x < c0 + 3; x++)
      for (let z = zCh - 1; z <= zCh + 1; z++) put(map, x, z, 2);
    put(map, rowEnd + side, zCh, 2); // the neck: one tile, detour only
  }
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 9. VAULT — the same serpentine spine with TWO chambers (the key hides in
// one of them; the generator forces keyP=1).
export function vault(rand, b) {
  const { W, H } = b;
  // the serpentine spine with TWO necked chambers (the key hides in one —
  // the generator forces keyP=1); true gap rows keep the par honest
  const w = int(rand, 3, 5);
  const n = int(rand, 4, Math.floor((H - 1) / 2));
  let h = 2; // walk form: consecutive rows must stay ≤ 1 apart
  const { map, path, cx } = serpentine(rand, W, H, w, n, () => {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    return h;
  });
  for (const rCh of [int(rand, 1, Math.max(1, n - 2)), int(rand, 1, Math.max(1, n - 2))]) {
    const zCh = H - 1 - 2 * rCh;
    const rowXs = rCh % 2 === 0 ? range(cx, cx + w - 1) : range(cx + w - 1, cx);
    const rowEnd = rowXs[rowXs.length - 1];
    const side = rowEnd + 1 + w < W ? 1 : -1;
    const c0 = side > 0 ? rowEnd + 2 : rowEnd - 3;
    if (c0 >= 0 && c0 + 3 < W) {
      for (let x = c0; x < c0 + 3; x++)
        for (let z = zCh - 1; z <= zCh + 1; z++) put(map, x, z, 2);
      put(map, rowEnd + side, zCh, 2);
    }
  }
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 10. SHUTTLE-SPAN — one long straight corridor with a stem up each end.
export function shuttleSpan(rand, b) {
  const { W, H } = b;
  // an S of TWO spans (each a 2-row corridor): a single straight bend caps
  // par at ~30, but the late acts need 30-48. The straight runs stay long —
  // that is what the shuttle carves need.
  const x0 = int(rand, 1, 3) + int(rand, 0, 3);
  const x1 = W - 1 - int(rand, 1, 3) - int(rand, 0, 3);
  const m1 = int(rand, 3, Math.floor(H / 2) - 2); // lower span (path row m1+1)
  const m2 = int(rand, Math.floor(H / 2) + 1, H - 4); // upper span (path row m2+1)
  const map = blank(W, H);
  const path = [];
  let h = 2;
  for (let z = H - 1; z >= m2 + 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x0, z, h);
    path.push([x0, z]);
  }
  // lower span: x0 -> x1
  for (let x = x0 + 1; x <= x1; x++) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, m2 + 1, h);
    put(map, x, m2, clamp(h + pick(rand, [-1, 0]), 1, 3));
    path.push([x, m2 + 1]);
  }
  // middle stem: x1 up
  for (let z = m2; z >= m1 + 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x1, z, h);
    path.push([x1, z]);
  }
  // upper span: x1 -> x0
  for (let x = x1 - 1; x >= x0; x--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, m1 + 1, h);
    put(map, x, m1, clamp(h + pick(rand, [-1, 0]), 1, 3));
    path.push([x, m1 + 1]);
  }
  // top stem: x0 up
  for (let z = m1; z >= 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x0, z, h);
    path.push([x0, z]);
  }
  sideFill(rand, W, H, map, path, int(rand, 2, 4));
  return finish(W, H, map, path);
}

// 11. SPRING-FIELD — a long corridor with spring pits carved into it (forced).
export function springField(rand, b) {
  return shuttleSpan(rand, b); // identical geometry; the generator forces 2 springs
}

// 12. ICE-RIVER — two land masses, a void river, one ice bridge.
export function iceRiver(rand, b) {
  const { W, H } = b;
  const c = int(rand, 4, W - 5);
  const m = int(rand, 3, H - 3);
  const map = blank(W, H);
  // land masses: near-flat floor (2) with a few 1/3 tiles, river void
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      if (x >= c && x <= c + 1) continue; // the river stays void
      put(map, x, z, rand() < 0.85 ? 2 : pick(rand, [1, 3]));
    }
  // void channels carved into each mass: the flat slab alone made every
  // ice-river the same 292-tile layout (Jaccard 0.986) AND let the walk
  // cut straight across (par 20-29). Deeper channels break the slab into a
  // different floor plan every seed AND lengthen the crossing approach.
  for (const [xlo, xhi] of [[0, c - 2], [c + 3, W - 1]]) {
    const n = int(rand, 2, Math.max(2, Math.floor((xhi - xlo) / 3)));
    for (let i = 0; i < n; i++) {
      const pw = int(rand, 2, 3);
      const px = int(rand, xlo + 1, xhi - pw);
      const zTop = int(rand, 2, 4);
      const zBot = int(rand, Math.max(zTop + 3, H - 5), H - 2);
      for (let z = zTop; z <= zBot; z++)
        for (let x = px; x < px + pw; x++) put(map, x, z, 0);
    }
  }
  // the ice bridge row (flat 2, so the crossing is a clean slide)
  for (let x = c - 1; x <= c + 2; x++) put(map, x, m, 2);
  // route: walk to the bridge head, cross, walk to a chosen goal tile
  const sx = int(rand, 0, c - 1);
  if (map[H - 1][sx] === 0) return null;
  const left = walkTo(rand, W, H, map, sx, H - 1, c - 1, m, 0, c - 1, 260);
  if (!left) return null;
  // goal tile: a solid tile on the right mass's top rows
  let rx = -1;
  outer: for (let z = 0; z <= 3; z++)
    for (let x = c + 2; x < W; x++)
      if (map[z][x] > 0) {
        rx = x;
        break outer;
      }
  if (rx < 0) return null;
  const right = walkTo(rand, W, H, map, c + 2, m, rx, 0, c + 2, W - 1, 260);
  if (!right) return null;
  const path = [...left, [c, m], [c + 1, m], [c + 2, m], ...right.slice(1)];
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path, { forceIce: [[c, m], [c + 1, m]] });
}

// 13. GAUNTLET — a long U of two parallel rows (sentinel-dense budget).
export function gauntlet(rand, b) {
  const { W, H } = b;
  const len = int(rand, W - 8, W - 4);
  const x1 = int(rand, len + 1, W - 2);
  const x0 = x1 - len;
  const mb = int(rand, 5, H - 3);
  const ma = int(rand, 1, mb - 3);
  const map = blank(W, H);
  const path = [];
  let h = 2;
  for (let z = H - 1; z >= mb; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x0, z, h);
    path.push([x0, z]);
  }
  for (let x = x0 + 1; x <= x1; x++) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, mb, h);
    path.push([x, mb]);
  }
  for (let z = mb - 1; z >= ma; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x1, z, h);
    path.push([x1, z]);
  }
  for (let x = x1 - 1; x >= x0; x--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, ma, h);
    path.push([x, ma]);
  }
  for (let z = ma - 1; z >= 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x0, z, h);
    path.push([x0, z]);
  }
  sideFill(rand, W, H, map, path, int(rand, 2, 4));
  return finish(W, H, map, path);
}

// 14. BRIDGE-CHAIN — two columns linked at the top, with floating bridge
// bands (canyon void) at three rows on each.
export function bridgeChain(rand, b) {
  const { W, H } = b;
  const a = int(rand, 1, 6);
  const bc = int(rand, Math.max(a + 5, W - 9), W - 2);
  const zTop = int(rand, 1, 3);
  const top2 = int(rand, Math.floor(H / 2) - 1, Math.floor(H / 2) + 2);
  const map = blank(W, H);
  const path = [];
  let h = 2;
  for (let z = H - 1; z >= zTop; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, a, z, h);
    path.push([a, z]);
  }
  for (let x = a + 1; x <= bc; x++) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, zTop, h);
    path.push([x, zTop]);
  }
  for (let z = zTop + 1; z <= top2; z++) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, bc, z, h);
    path.push([bc, z]);
  }
  // canyon bands: sparse side slabs only near the top, none on the columns'
  // middle rows — the columns read as floating bridges
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 15. STAIRCASE — a serpentine whose height climbs one step per row.
export function staircase(rand, b) {
  const { W, H } = b;
  const w = int(rand, 3, 4);
  const n = int(rand, 4, Math.floor((H - 1) / 2));
  const { map, path } = serpentine(rand, W, H, w, n, (r) => 1 + Math.min(3, r));
  sideFill(rand, W, H, map, path, int(rand, 3, 6));
  return finish(W, H, map, path);
}

// 16. CROSSROADS — four arms meeting at a 2×2 center; bottom→top is the
// route, left/right arms are fill (alternate lines + a key spot).
export function crossroads(rand, b) {
  const { W, H } = b;
  // jittered center + arm lengths: the fixed center made every crossroads
  // the same 59-tile X (Jaccard 0.97)
  const cx = int(rand, Math.floor(W / 2) - 2, Math.floor(W / 2) + 1);
  const cz = int(rand, Math.floor(H / 2) - 2, Math.floor(H / 2) + 1);
  const leftEnd = int(rand, 0, Math.max(0, cx - 5)); // left arm start (length varies)
  const rightEnd = int(rand, cx + 3, W - 1); // right arm end (length varies)
  const zBot = H - 1 - int(rand, 0, 2); // bottom arm length varies
  const poff = int(rand, 0, 1); // goal-platform offset (0 keeps the path row solid)
  const map = blank(W, H);
  // center 2×2
  for (let x = cx; x <= cx + 1; x++) for (let z = cz; z <= cz + 1; z++) put(map, x, z, 2);
  // bottom arm (route, with a fill shadow), top arm (route + goal platform)
  for (let z = cz + 1; z <= zBot; z++) {
    put(map, cx - 3, z, 2);
    put(map, cx - 4, z, 2);
  }
  for (let x = cx - 2; x <= cx; x++) put(map, x, cz + 1, 2);
  for (let z = 0; z <= cz - 1; z++) {
    put(map, cx + 1, z, 2);
    put(map, cx + 2, z, 2);
  }
  for (let x = cx + 2 + poff; x <= cx + 4 + poff; x++) put(map, x, 0, 2); // goal platform
  // left + right arms (fill)
  for (let x = leftEnd; x < cx; x++) put(map, x, cz, 2);
  for (let x = cx + 2; x <= rightEnd; x++) put(map, x, cz + 1, 2);
  let path = [];
  for (let z = zBot; z >= cz + 1; z--) path.push([cx - 3, z]);
  for (let x = cx - 2; x <= cx; x++) path.push([x, cz + 1]);
  path.push([cx + 1, cz + 1]);
  path.push([cx + 1, cz]);
  for (let z = cz - 1; z >= 1; z--) path.push([cx + 1, z]);
  for (let x = cx + 1; x <= cx + 4 + poff; x++) path.push([x, 0]);
  if (rand() < 0.5) {
    for (let z = 0; z < H; z++) map[z] = map[z].slice().reverse();
    path = path.map(([x, z]) => [W - 1 - x, z]);
  }
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 17. APERTURE — a big central void; the only floor is the far-side
// corridor (bottom band → left column → top band). The near side is void,
// so the corridor IS the route: a full floor slab would let the cube run
// straight up the open side and collapse par (measured 16–21 vs band 24+).
export function aperture(rand, b) {
  const { W, H } = b;
  const vw = int(rand, 6, 8);
  const vh = int(rand, 4, 6);
  const vx0 = int(rand, 3, W - vw - 3);
  const vz0 = int(rand, 2, H - vh - 2);
  const map = blank(W, H);
  const xL = Math.max(1, vx0 - int(rand, 2, 3));
  const zB = int(rand, 0, 1) ? H - 1 : H - 2; // bottom band row varies
  const sx = int(rand, Math.min(W - 2, vx0 + vw), W - 1);
  const gx = int(rand, Math.min(W - 2, vx0 + vw), W - 1);
  // the corridor: bottom band (start → left column), left column (up),
  // top band (→ goal). Flat 2: a height step beside a 1-wide corridor
  // would read as a wall
  for (let x = xL; x <= sx; x++) put(map, x, zB, 2);
  for (let z = 1; z <= zB - 1; z++) put(map, xL, z, 2);
  for (let x = xL; x <= gx; x++) put(map, x, 1, 2);
  let path = [];
  for (let x = sx; x >= xL; x--) path.push([x, zB]);
  for (let z = zB - 1; z >= 1; z--) path.push([xL, z]);
  for (let x = xL + 1; x <= gx; x++) path.push([x, 1]);
  if (rand() < 0.5) {
    for (let z = 0; z < H; z++) map[z] = map[z].slice().reverse();
    path = path.map(([x, z]) => [W - 1 - x, z]);
  }
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 18. TWIN-FALLS — bottom platform, shaft up, mid deck, shaft up, goal.
export function twinFalls(rand, b) {
  const { W, H } = b;
  // three platforms, three shafts (the extra stage pushes par from 25-28
  // to ~33-42 — the late acts need it). Shifted platforms/shafts + 50%
  // mirror (fixed x made Jaccard 0.97).
  const d1 = int(rand, Math.floor(H / 2) + 1, H - 3); // lower deck
  const d2 = int(rand, 3, Math.floor(H / 2) - 1); // upper deck
  const flip = rand() < 0.5;
  const x0 = int(rand, 0, 2); // left edge of the bottom platform
  const x1 = W - 1 - int(rand, 1, 2); // right edge of the top platform
  const map = blank(W, H);
  // bottom platform
  for (let x = x0; x <= x0 + 4; x++) for (let z = H - 2; z <= H - 1; z++) put(map, x, z, 2);
  // shaft A (left): bottom -> lower deck
  for (let z = d1; z <= H - 3; z++) {
    put(map, x0 + 1, z, 2);
    put(map, x0 + 2, z, 2);
  }
  // lower deck (reaches shaft B's column — the path climbs there)
  for (let x = x0 + 1; x <= x1 - 1; x++) put(map, x, d1, 2);
  // shaft B (right): lower deck -> upper deck
  for (let z = d2; z <= d1 - 1; z++) {
    put(map, x1 - 1, z, 2);
    put(map, x1 - 2, z, 2);
  }
  // upper deck
  for (let x = x0 + 1; x <= x1 - 1; x++) put(map, x, d2, 2);
  // shaft C (left): upper deck -> top platform
  for (let z = 2; z <= d2 - 1; z++) {
    put(map, x0 + 1, z, 2);
    put(map, x0 + 2, z, 2);
  }
  // top platform
  for (let x = x0; x <= x0 + 4; x++) for (let z = 0; z <= 1; z++) put(map, x, z, 1);
  let path = [];
  path.push([x0 + 2, H - 1]);
  path.push([x0 + 1, H - 1]);
  for (let z = H - 2; z >= d1; z--) path.push([x0 + 1, z]);
  for (let x = x0 + 2; x <= x1 - 1; x++) path.push([x, d1]);
  for (let z = d1 - 1; z >= d2; z--) path.push([x1 - 1, z]);
  for (let x = x1 - 2; x >= x0 + 1; x--) path.push([x, d2]);
  for (let z = d2 - 1; z >= 2; z--) path.push([x0 + 1, z]);
  if (flip) {
    for (let z = 0; z < H; z++) map[z] = map[z].slice().reverse();
    path = path.map(([x, z]) => [W - 1 - x, z]);
  }
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 19. FORK — a stem that T's into two arms, both reaching a shared goal row.
// The route arm is a two-column serpentine (long enough for the late-act
// par bands); the other arm is a fill alternate that also reaches the goal.
export function fork(rand, b) {
  const { W, H } = b;
  const c = int(rand, 5, W - 6);
  const m = int(rand, 10, H - 2);
  const a = int(rand, 1, c - 3);
  const bc = int(rand, c + 3, W - 2);
  if (a + 1 >= c || bc - 2 <= c || m < 4) return null;
  const map = blank(W, H);
  // stem
  for (let z = m; z <= H - 1; z++) put(map, c, z, 2);
  // route arm: approach row + two-column serpentine up to the goal row
  for (let x = a; x <= c; x++) put(map, x, m, 2);
  for (let z = 1; z <= m - 1; z++) put(map, a + 1, z, 2);
  for (let z = 1; z <= m - 2; z++) put(map, a, z, 2);
  // alternate arm (fill): approach row + two-column serpentine
  for (let x = c; x <= bc; x++) put(map, x, m - 1, 2);
  for (let z = 1; z <= m - 1; z++) {
    put(map, bc, z, 2);
    put(map, bc - 1, z, 2);
  }
  // shared goal row
  for (let x = a; x <= bc; x++) put(map, x, 1, 1);
  // route: up the stem, across the approach row, serpentine up
  const path = [];
  for (let z = H - 1; z >= m; z--) path.push([c, z]);
  for (let x = c - 1; x >= a + 1; x--) path.push([x, m]);
  for (let z = m - 1; z >= m - 2; z--) path.push([a + 1, z]);
  path.push([a, m - 2]);
  for (let z = m - 3; z >= 1; z--) path.push([a, z]);
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 20. LONG-DROP — a gap-row serpentine that descends as it climbs the map.
export function longDrop(rand, b) {
  const { W, H } = b;
  const n = int(rand, 4, Math.floor((H - 1) / 2));
  const { map, path } = serpentine(rand, W, H, 3, n, (r) => 4 - Math.min(3, r));
  sideFill(rand, W, H, map, path, int(rand, 2, 4));
  return finish(W, H, map, path);
}

// 21. MERIDIAN — two full-width rows in a U (the long straight of the act).
export function meridian(rand, b) {
  const { W, H } = b;
  const ma = int(rand, 1, 3);
  const mb = int(rand, H - 5, H - 3);
  // variable row extents: full-width rows made every meridian the same
  // U (Jaccard 0.92) — the long straight stays long, but where it starts
  // and ends moves
  const xa1 = int(rand, 1, 3); // bottom stem
  const xR1 = W - 1 - int(rand, 1, 3); // bottom row far end / mid stem
  const xa2 = int(rand, 1, 3); // top row far end / top stem (goal)
  const map = blank(W, H);
  const path = [];
  let h = 2;
  for (let z = H - 1; z >= mb; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, xa1, z, h);
    path.push([xa1, z]);
  }
  for (let x = xa1 + 1; x <= xR1; x++) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, mb, h);
    path.push([x, mb]);
  }
  for (let z = mb - 1; z >= ma; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, xR1, z, h);
    path.push([xR1, z]);
  }
  for (let x = xR1 - 1; x >= xa2; x--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, ma, h);
    path.push([x, ma]);
  }
  for (let z = ma - 1; z >= 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, xa2, z, h);
    path.push([xa2, z]);
  }
  sideFill(rand, W, H, map, path, int(rand, 2, 4));
  return finish(W, H, map, path);
}

// 22. BOSS-ARENA — a long serpentine track in open void, with a walled
// side deck (the key's home) off the middle stem. NO arena floor: any solid
// ground beside the track becomes a straight-line shortcut that collapses
// the par (learned the hard way — the first version parred 17 on a 38).
// The boss budget (orb/crumble/key ceiling) does the rest.
export function bossArena(rand, b) {
  const { W, H } = b;
  const map = blank(W, H);
  // Per-seed geometry: a fixed skeleton made EVERY boss the same 54-tile
  // track, so the uniqueness gate rejected the second boss in any 40-level
  // window (and ten identical arenas would be a bad finale). Vary the
  // columns, the top row, and the mirror — the constraints stay: the track
  // is the ONLY floor (an open arena is a straight-line par shortcut), the
  // goal platform sits only in rows 0-1, and the side deck is reachable
  // through one neck tile (a detour, never a shortcut).
  const flip = rand() < 0.5;
  const xaRaw = int(rand, 1, 3); // bottom + goal stem column
  const xbRaw = W - int(rand, 5, 8); // middle stem column (leaves deck room)
  const xa = flip ? W - 1 - xaRaw : xaRaw;
  const xb = flip ? W - 1 - xbRaw : xbRaw;
  const step = xb > xa ? 1 : -1;
  const mb = H - int(rand, 3, 5); // bottom track row (start platform below it)
  const ma = int(rand, 2, 5); // top track row
  const path = [];
  let h = 2;
  // the track (a serpentine): stem up, row, stem up, row, stem to the goal
  for (let z = H - 1; z >= mb; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, xa, z, h);
    path.push([xa, z]);
  }
  for (let x = xa + step; x !== xb + step; x += step) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, mb, h);
    path.push([x, mb]);
  }
  for (let z = mb - 1; z >= ma; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, xb, z, h);
    path.push([xb, z]);
  }
  for (let x = xb - step; x !== xa - step; x -= step) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, x, ma, h);
    path.push([x, ma]);
  }
  for (let z = ma - 1; z >= 1; z--) {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    put(map, xa, z, h);
    path.push([xa, z]);
  }
  // the goal platform: the only solid in rows 0..1, above the top stem
  put(map, xa - step, 0, 1);
  put(map, xa + step, 0, 1);
  put(map, xa, 1, 1);
  // the side deck: a walled pocket off the middle stem (key home), on the
  // side of the track away from the goal stem. One neck = detour only.
  const mid = Math.floor((ma + mb) / 2);
  const deckSide = step; // the outer side of the track, away from the goal stem
  if (xb + 2 * deckSide >= 0 && xb + 4 * deckSide < W) {
    for (let z = mid - 1; z <= mid + 1; z++)
      for (let x = xb + 2 * deckSide; x !== xb + 5 * deckSide; x += deckSide)
        put(map, x, z, 2);
    put(map, xb + deckSide, mid, 2); // the neck
  }
  // the start platform at the bottom of the first stem; the stem base is
  // flattened so the entry step is always legal
  map[H - 1][xa] = 2;
  put(map, xa + step, H - 1, 1);
  put(map, xa - step, H - 1, 2);
  path.unshift([xa - step, H - 1]);
  // long-run sentinel refuge slabs come from the shared hazard stage
  sideFill(rand, W, H, map, path, 2);
  return finish(W, H, map, path);
}

// 23. UNDERTOW — a long U of two parallel rows (like a gauntlet) that the
// generator carves with forced ice AND springs: the wave-level of the acts.
export function undertow(rand, b) {
  return gauntlet(rand, b);
}

// 24. CANYON — a gap-row serpentine in open void (sparse fill only).
export function canyon(rand, b) {
  const { W, H } = b;
  const n = int(rand, 4, Math.floor((H - 1) / 2));
  let h = 2;
  const { map, path } = serpentine(rand, W, H, 3, n, () => {
    h = clamp(h + pick(rand, [-1, 0, 1]), 1, 3);
    return h;
  });
  sideFill(rand, W, H, map, path, int(rand, 1, 3));
  return finish(W, H, map, path);
}

export const ARCHETYPES = {
  descent,
  switchback,
  'twin-bridge': twinBridge,
  spiral,
  lattice,
  'split-merge': splitMerge,
  ring,
  'key-detour': keyDetour,
  vault,
  'shuttle-span': shuttleSpan,
  'spring-field': springField,
  'ice-river': iceRiver,
  gauntlet,
  'bridge-chain': bridgeChain,
  staircase,
  crossroads,
  aperture,
  'twin-falls': twinFalls,
  fork,
  'long-drop': longDrop,
  meridian,
  'boss-arena': bossArena,
  undertow,
  canyon,
};
