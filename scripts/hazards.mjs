// ---------------------------------------------------------------------------
// KUBIK — shared hazard stage (ADR-015)
//
// Takes a carved LAYOUT ({ W, H, map, path, start, goal }) from any archetype
// and dresses it: mechanics carved into the route (shuttle / spring / ice),
// shards on the route, sentinels on straight runs, crumble slabs, and the
// optional key. This is the exact logic that generated levels 14–50,
// extracted so every archetype in scripts/archetypes.mjs shares one
// placement law — and the full verifier stays the backstop.
//
//   applyHazards(layout, band, rand, { force })  →  level def  (or null)
//
// band: { W, H, hMin, hMax, par, orbs, crumble, speed, shards, fill, keyP,
//         mech: { ice, spring, shuttle, conveyor, door, timed, freeze,
//         heavy, blocks, pulse, proximity, twin, boss, lift } (per-mech. prob.) }
// force: { shuttle?: n, spring?: n, ice?: n, conveyor?: n, door?: n,
//         timed?: n, freeze?: n, heavy?: n, blocks?: n, pulse?: n,
//         proximity?: n, twin?: n, boss?: n, lift?: n }
//         (archetypes that ARE a mechanic); missing one fails the candidate.
// ---------------------------------------------------------------------------

export function applyHazards(layout, b, rand, opts = {}) {
  const { W, H, map, path, start, goal } = layout;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const force = opts.force || {};

  const tiles = new Set();
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) if (map[z][x] > 0) tiles.add(`${x},${z}`);

  const pathSet = new Set(path.map(([px, pz]) => `${px},${pz}`));
  const solidSlabs = [...tiles].filter((t) => !pathSet.has(t)); // fill slabs

  // --- carve the mechanics into the walk ------------------------------------
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
  const conveyors = [];
  const doors = [];
  const timed = [];

  // straight runs of ≥3 SOLID, consecutive walk tiles — indices into `path`.
  // Both orientations: sentinels patrol any straight line (tile-position
  // based, orientation-agnostic), so vertical corridors get guards too.
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
      for (let a = i; a + 2 <= j; a++) {
        const horiz = path[a][1] === path[a + 1][1];
        const vert = path[a][0] === path[a + 1][0];
        if (!horiz && !vert) continue;
        const dx = path[a + 1][0] - path[a][0];
        const dz = path[a + 1][1] - path[a][1];
        let bb = a;
        while (
          bb + 1 <= j &&
          (horiz ? path[bb + 1][1] === path[bb][1] : path[bb + 1][0] === path[bb][0]) &&
          path[bb + 1][0] - path[bb][0] === dx &&
          path[bb + 1][1] - path[bb][1] === dz
        )
          bb++;
        if (bb - a + 1 >= 3) out.push([a, bb]);
        a = bb - 1;
      }
      i = j + 1;
    }
    return out;
  };

  // SHUTTLE: take a straight run, hollow the first gap tiles into two docks
  // with a void between, and let a platform loop the gap forever.
  const tryShuttle = () => {
    const runs = solidRuns().filter(([i]) => i >= 2);
    if (!runs.length) return false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const [i, j] = runs[Math.floor(rand() * runs.length)];
      for (const gap of rand() < 0.5 ? [2, 3] : [3, 2]) {
        if (j < i + gap + 1) continue;
        // never hollow a tile another mechanic already claimed: the dock
        // must be plain void floor, and the earlier carve's list would keep
        // pointing at it ("ice on a shuttle dock" — L101, M2.5 2026-11-12:
        // ice marks mechSet but not carved, so solidRuns() still offered
        // those tiles to the shuttle).
        let mechInSpan = false;
        for (let t = i; t <= i + gap && !mechInSpan; t++) {
          if (mechSet.has(`${path[t][0]},${path[t][1]}`)) mechInSpan = true;
        }
        if (mechInSpan) continue;
        const Q = path[i + gap + 1];
        if (!Q) continue;
        const P = path[i - 1];
        const dH = Math.abs(map[P[1]][P[0]] - map[Q[1]][Q[0]]);
        if (dH > 2) continue;
        const dockA = path[i];
        const dockB = path[i + gap];
        for (let t = i; t <= i + gap; t++) {
          const [cx, cz] = path[t];
          clearTile(cx, cz);
          carved.add(k(t));
          markMech(cx, cz);
        }
        // no detour around the crossing: clear non-walk side slabs
        for (let gx = dockA[0]; gx <= dockB[0]; gx++) {
          for (const dz of [-1, 1]) {
            const gz = dockA[1] + dz;
            if (gz < 0 || gz > H - 1) continue;
            if (pathSet.has(`${gx},${gz}`)) continue;
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
    // Candidate pads: any position where P-S-A-L run in a straight line.
    // (NOT solidRuns() starts — those are exactly the run-start corners
    // where the approach wraps around the turn; M2.5 L102 (spring-field,
    // runs entered perpendicularly) then had ZERO candidates and every
    // forced spring failed the candidate. M2.5, fixed 2026-11-12.)
    const cands = [];
    for (let i = 1; i + 2 <= path.length - 2; i++) {
      if (carved.has(k(i)) || carved.has(k(i + 1)) || carved.has(k(i + 2))) continue;
      const S = path[i];
      const A = path[i + 1];
      const L = path[i + 2];
      const P = path[i - 1];
      if (!P || carved.has(k(i - 1))) continue;
      if (k(i) === `${start[0]},${start[1]}`) continue;
      if (k(i + 2) === `${goal[0]},${goal[1]}`) continue;
      // The launch fires in the direction of TRAVEL — the approach — so the
      // approach must continue straight into S->A. A run-start corner would
      // launch along the turn instead: M2.5 L82 (gauntlet) had the pad at a
      // corner of the spiral and every press launched 10 rows into the void
      // gap (fall on every pass, par -1). Mid-run the approach IS the run
      // direction, so the launch flies over the pit to the landing.
      if (S[0] - P[0] !== A[0] - S[0] || S[1] - P[1] !== A[1] - S[1]) continue;
      let badSide = false;
      for (const dz of [-1, 1]) {
        const az = A[1] + dz;
        if (az < 0 || az > H - 1) continue;
        const side = `${A[0]},${az}`;
        if (tiles.has(side) && !pathSet.has(side)) { badSide = true; break; }
      }
      if (badSide) continue;
      cands.push(i);
    }
    if (!cands.length) return false;
    const i = cands[Math.floor(rand() * cands.length)];
    const S = path[i];
    const A = path[i + 1];
    for (const dz of [-1, 1]) {
      const az = A[1] + dz;
      if (az < 0 || az > H - 1) continue;
      const side = `${A[0]},${az}`;
      if (tiles.has(side) && !pathSet.has(side)) clearTile(A[0], az);
    }
    clearTile(A[0], A[1]);
    carved.add(`${A[0]},${A[1]}`);
    markMech(S[0], S[1]);
    markMech(A[0], A[1]);
    markMech(path[i + 2][0], path[i + 2][1]);
    springs.push([S[0], S[1]]);
    return true;
  };

  // ICE: an ice tile on the route; a roll onto it carries the cube one more
  // tile in the same press (the slide stops at the first non-ice slab).
  const tryIce = () => {
    // Candidate tiles: any mid-run position where P-I-N run in a straight
    // line (same candidate source as trySpring — solidRuns() starts would
    // be exactly the corners the collinearity check exists to exclude).
    // M2.5, fixed 2026-11-12 (L102: spring-field's perpendicular run
    // entries left the run-start-only source with no ice candidates).
    const cands = [];
    for (let i = 1; i + 1 <= path.length - 2; i++) {
      if (carved.has(k(i)) || carved.has(k(i + 1))) continue;
      const I = path[i];
      const N = path[i + 1];
      const P = path[i - 1];
      if (!P || carved.has(k(i - 1))) continue;
      if (k(i) === `${start[0]},${start[1]}`) continue;
      if (k(i + 1) === `${goal[0]},${goal[1]}`) continue;
      // The slide carries one extra tile in the direction of TRAVEL. At a
      // run-start corner the approach comes around the turn, so a slide
      // entering from the run side is fine but one entering from the turn
      // shoots off the run (M2.5 L82: ice at a spiral corner slid the cube
      // onto a side slab and sealed the rest of the level). Require the
      // approach to be collinear so both entry directions stay on the run.
      if (I[0] - P[0] !== N[0] - I[0] || I[1] - P[1] !== N[1] - I[1]) continue;
      if (Math.abs(map[N[1]][N[0]] - map[I[1]][I[0]]) > 1) continue;
      cands.push(i);
    }
    if (!cands.length) return false;
    const i = cands[Math.floor(rand() * cands.length)];
    const I = path[i];
    const N = path[i + 1];
    ice.push([I[0], I[1]]);
    markMech(I[0], I[1]);
    markMech(N[0], N[1]);
    return true;
  };

  // CONVEYOR (M3 wave-1): a belt segment on a straight run, pointing along
  // the path. Stepping onto it carries the cube along the run — it cannot
  // stop mid-belt to take a side branch, which is the puzzle. Same
  // candidate law as ice/springs: mid-run only, collinear approach (the
  // belt direction must be the travel direction on entry), never on
  // start/goal, never stacked on another mechanic. The tile AFTER the
  // belt (the carried landing) is marked as mechanic space too, so
  // sentinels/crumble/key keep their radius-1 clearance from the whole
  // carried path (the rules-side spawn audit checks the same corridor).
  const tryConveyor = () => {
    const cands = [];
    for (let i = 1; i + 2 <= path.length - 1; i++) {
      const dx = path[i][0] - path[i - 1][0];
      const dz = path[i][1] - path[i - 1][1];
      if (!dx && !dz) continue;
      // segment of 2–3 belt tiles from i, all in the approach direction
      for (let len = 2; len <= 3; len++) {
        if (i + len > path.length - 1) break; // the carried landing must exist
        let okSeg = true;
        for (let t = i; t < i + len; t++) {
          const kk = k(t);
          if (carved.has(kk) || mechSet.has(kk)) { okSeg = false; break; }
          if (kk === `${start[0]},${start[1]}` || kk === `${goal[0]},${goal[1]}`) { okSeg = false; break; }
          if (t > i && (path[t][0] - path[t - 1][0] !== dx || path[t][1] - path[t - 1][1] !== dz)) { okSeg = false; break; }
        }
        if (okSeg) cands.push([i, len, dx, dz]);
      }
    }
    if (!cands.length) return false;
    const [i, len, dx, dz] = cands[Math.floor(rand() * cands.length)];
    for (let t = i; t < i + len; t++) {
      conveyors.push([path[t][0], path[t][1], dx, dz]);
      markMech(path[t][0], path[t][1]);
    }
    markMech(path[i + len][0], path[i + len][1]); // the carried landing
    return true;
  };

  // DOOR (M3 wave-1): a route tile becomes a doorway and a FILL slab
  // beside it becomes its pressure plate. The walk detours off the route
  // onto the plate, steps through the doorway from the plate, and cannot
  // come back the same way — the plate is the puzzle. Candidates need:
  // the doorway mid-route (never carved/mechanic/start/goal), the plate
  // a still-solid fill slab beside the doorway, and the plate touching
  // the route BEFORE the doorway (so the detour is reachable without
  // crossing it). Heights are NOT checked here — the door stands at the
  // plate's height, and the level proof (shortest route under the door
  // law) accepts or rejects the candidate as a whole.
  const tryDoor = () => {
    const cands = [];
    for (let i = 2; i <= path.length - 3; i++) {
      const kk = k(i);
      if (carved.has(kk) || mechSet.has(kk)) continue;
      if (kk === `${start[0]},${start[1]}` || kk === `${goal[0]},${goal[1]}`) continue;
      const [dx, dz] = [path[i][0], path[i][1]];
      for (const slabKey of solidSlabs) {
        if (!tiles.has(slabKey)) continue; // an earlier carve may have cleared it
        if (mechSet.has(slabKey) || carved.has(slabKey)) continue;
        const [sx, sz] = slabKey.split(',').map(Number);
        if (Math.abs(sx - dx) + Math.abs(sz - dz) !== 1) continue; // beside the doorway
        // the plate must touch the pre-door route (reachable detour)
        let touches = false;
        for (let j = 0; j < i && !touches; j++) {
          if (Math.abs(path[j][0] - sx) + Math.abs(path[j][1] - sz) === 1) touches = true;
        }
        if (touches) cands.push([i, sx, sz]);
      }
    }
    if (!cands.length) return false;
    const [i, px, pz] = cands[Math.floor(rand() * cands.length)];
    const [dx, dz] = path[i];
    clearTile(dx, dz);
    carved.add(k(i));
    markMech(dx, dz);
    markMech(px, pz);
    doors.push({ plate: [px, pz], at: [dx, dz] });
    return true;
  };

  // TIMED (delayed crumble, M3 wave-1): a run of 1–3 route tiles gets a
  // 2.4 s fuse (TIMED_FUSE) — crossable at a stroll, fatal to dawdle on.
  // The run must sit clear of ALL other mechanic space (Chebyshev 1):
  // the spawn audit forbids timed slabs anywhere the player might need
  // to wait (sentinel clearance, shuttle docks, sliding bridges), so the
  // carve keeps the same distance from everything already carved. The
  // tile after the run is the safe landing and stays plain.
  const tryTimed = () => {
    const cands = [];
    for (let i = 1; i + 1 <= path.length - 1; i++) {
      for (let len = 1; len <= 3; len++) {
        if (i + len > path.length - 1) break; // the landing after the run must exist
        let okSeg = true;
        for (let t = i; t < i + len && okSeg; t++) {
          const kk = k(t);
          if (carved.has(kk) || mechSet.has(kk)) { okSeg = false; break; }
          if (kk === `${start[0]},${start[1]}` || kk === `${goal[0]},${goal[1]}`) { okSeg = false; break; }
          for (let ox = -1; ox <= 1 && okSeg; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
              if (mechSet.has(`${path[t][0] + ox},${path[t][1] + oz}`)) { okSeg = false; break; }
            }
          }
        }
        if (okSeg) cands.push([i, len]);
      }
    }
    if (!cands.length) return false;
    const [i, len] = cands[Math.floor(rand() * cands.length)];
    for (let t = i; t < i + len; t++) {
      timed.push([path[t][0], path[t][1]]);
      markMech(path[t][0], path[t][1]);
    }
    return true;
  };

  // PULSE (pulsing gap, M3 wave-1): hollow one plain route tile into a
  // void cell that a phantom slab seals on a cycle — cross on the blink.
  // Both route neighbours stay solid; proofs treat the tile as solid
  // (a wait-out timing hazard, like a sliding bridge), and the spawn
  // audit keeps it out of sentinel clearance. Never two gaps adjacent.
  const pulses = [];
  const tryPulse = () => {
    const cands = [];
    for (let i = 1; i < path.length - 1; i++) {
      const kk = k(i);
      if (carved.has(kk) || mechSet.has(kk)) continue;
      if (carved.has(k(i - 1)) || carved.has(k(i + 1))) continue;
      const [x, z] = path[i];
      if (pulses.some(([px, pz]) => Math.abs(px - x) <= 1 && Math.abs(pz - z) <= 1)) continue;
      cands.push(i);
    }
    if (!cands.length) return false;
    const i = pick(cands);
    const [x, z] = path[i];
    clearTile(x, z);
    carved.add(k(i));
    markMech(x, z);
    pulses.push([x, z]);
    return true;
  };

  // forced mechanics first (archetypes that ARE a mechanic), then the act
  // budget's probabilities
  //
  // layout.forceIce: tiles the archetype itself designated as ice (e.g. the
  // ice bridge over a void river) — they must lie on the solid route and are
  // ice regardless of the random carving.
  if (layout.forceIce) {
    for (const [fx, fz] of layout.forceIce) {
      if (map[fz][fx] === 0) return null; // the ice tile must be floor
      if (!pathSet.has(`${fx},${fz}`)) return null; // must be on the route
      ice.push([fx, fz]);
      markMech(fx, fz);
    }
  }
  const carvePlan = [
    ['shuttle', force.shuttle || 0, (b.mech || {}).shuttle || 0],
    ['spring', force.spring || 0, (b.mech || {}).spring || 0],
    ['ice', Math.max(force.ice || 0, (layout.forceIce || []).length), (b.mech || {}).ice || 0],
    ['conveyor', force.conveyor || 0, (b.mech || {}).conveyor || 0],
    ['door', force.door || 0, (b.mech || {}).door || 0],
    ['timed', force.timed || 0, (b.mech || {}).timed || 0],
    ['pulse', force.pulse || 0, (b.mech || {}).pulse || 0],
  ];
  const carveByName = { shuttle: tryShuttle, spring: trySpring, ice: tryIce, conveyor: tryConveyor, door: tryDoor, timed: tryTimed, pulse: tryPulse };
  // Carve law (fixed 2026-11-12, M2.5 — the mechanic blackout): the FORCED
  // quota (n < forced) is always attempted — a forced mechanic that cannot
  // be carved fails the candidate (return null below). Extra carves beyond
  // the quota are probabilistic, up to 4 total, with the probability
  // HALVING per extra tile (a level with one ice slab reads as a detail;
  // four changes the character — the old hand schedule ran I1–I2). The
  // previous gate broke on `p < 1` BEFORE rolling, so best-effort carves
  // never happened at any probability < 1 — the whole 14–200 campaign
  // shipped with effectively no ice/springs/shuttles.
  const got = { shuttle: 0, spring: 0, ice: (layout.forceIce || []).length, conveyor: 0, door: 0, timed: 0, pulse: 0 };
  for (const [m, forced, p] of carvePlan) {
    let n = got[m];
    for (let t = 0; t < 4; t++) {
      if (n >= forced) {
        const pExtra = p * Math.pow(0.5, n - forced);
        if (pExtra <= 0 || rand() >= pExtra) break;
      }
      const ok = carveByName[m]();
      if (!ok) break;
      n++;
    }
    got[m] = n;
    if (n < forced) return null; // the archetype promised the mechanic
  }
  // best-effort EXTRA carves (e.g. the double-shuttle finale): a probability
  // per extra mechanic, never a hard requirement
  for (const [m, p] of Object.entries(opts.extra || {})) {
    if (rand() < p) {
      const ok = carveByName[m]();
      if (ok) got[m]++;
    }
  }

  // --- twin shuttles (M3 wave-1): one carved shuttle gains a second
  // platform half a cycle out of phase. Proofs model the one logical
  // shuttle, so the conversion can only add boarding windows. Like the
  // proximity conversion, the roll comes from a content hash — never
  // the shared rand stream — so arming it cannot reshuffle the
  // candidate streams of already-shipped levels.
  if (shuttles.length) {
    const wantTwin = force.twin || 0;
    const pTwin = (b.mech || {}).twin || 0;
    const twinSeed = shuttles.map((s) => `${s.a};${s.b}`).join('|');
    const twinRoll = (salt) => {
      let h = 2166136261;
      const s = salt + twinSeed;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0) / 4294967296;
    };
    const convertTwin = () => {
      const cand = shuttles.filter((s) => !s.twin);
      if (!cand.length) return false;
      cand[Math.floor(twinRoll('#pick') * cand.length)].twin = true;
      return true;
    };
    let placedTwin = 0;
    while (placedTwin < wantTwin) {
      if (!convertTwin()) return null; // a forced twin must land
      placedTwin++;
    }
    if (!placedTwin && pTwin > 0 && twinRoll('#roll') < pTwin) convertTwin();
  } else if (force.twin) {
    return null; // no shuttle carved: nothing can twin
  }

  // --- lifts (Phase B, ADR-033): the shuttle carve turned vertical — the
  // middle tile of a two-storey stair run on the route is hollowed into a
  // shaft, and the platform dwells at the two path heights it joins, so
  // the ride replaces the stair. Like the twin/boss conversions, the pick
  // comes from a content hash — never the shared rand stream — so arming
  // the carve cannot reshuffle already-shipped candidate streams.
  const lifts = [];
  {
    const wantLift = force.lift || 0;
    const pLift = (b.mech || {}).lift || 0;
    const liftSeed = path.map((pt) => pt.join(',')).join(';') + '|' + start + '|' + goal;
    const liftRoll = (salt) => {
      let h = 2166136261;
      const str = salt + liftSeed;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0) / 4294967296;
    };
    const findLiftCells = () => {
      // class 1 — stair shafts: the middle tile of a two-storey stair
      // run on the route (the ride replaces the stair)
      // class 2 — band shafts: a void or clearable fill cell whose
      // neighbours span two storeys (the tower/citadel geometry: the
      // lift skips the middle band the stamped stairs climb through)
      const stairs = [];
      const bands = [];
      for (let i = 1; i + 1 < path.length; i++) {
        const [ax, az] = path[i - 1];
        const [bx, bz] = path[i];
        const [cx, cz] = path[i + 1];
        const ha = map[az][ax];
        const hc = map[cz][cx];
        if (ha === 0 || hc === 0 || Math.abs(hc - ha) !== 2) continue; // a two-storey stair
        const bk = `${bx},${bz}`;
        if (carved.has(bk) || mechSet.has(bk)) continue;
        // the banks and every other neighbour must be unclaimed floor:
        // slides/belts/launches never feed the shaft, no platform dock
        // touches another, and a claimed neighbour would fail the parse
        let claimed = false;
        for (const [nx, nz] of [[bx - 1, bz], [bx + 1, bz], [bx, bz - 1], [bx, bz + 1]]) {
          if (carved.has(`${nx},${nz}`) || mechSet.has(`${nx},${nz}`)) claimed = true;
        }
        if (claimed) continue;
        stairs.push({
          at: [bx, bz],
          low: Math.min(ha, hc),
          high: Math.max(ha, hc),
        });
      }
      const serves = (nh, Hh) => Hh - nh <= 1 && nh - Hh <= 2;
      for (let z = 1; z < H - 1; z++) {
        for (let x = 1; x < W - 1; x++) {
          const kk = `${x},${z}`;
          if (pathSet.has(kk) || carved.has(kk) || mechSet.has(kk)) continue;
          const ns = [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .map(([dx, dz]) => ({ x: x + dx, z: z + dz, h: map[z + dz][x + dx], kk: `${x + dx},${z + dz}` }))
            .filter((n) => n.h > 0);
          if (ns.length < 2) continue;
          if (ns.some((n) => carved.has(n.kk) || mechSet.has(n.kk))) continue;
          const heights = [...new Set(ns.map((n) => n.h))];
          const maxH = Math.max(...heights);
          for (const lo of heights) {
            // the high dwell may overshoot the tallest bank by one
            // storey (the platform rises past the far bank and the cube
            // drops off — how a lift crosses a one-storey moat in the
            // concentric tower/citadel rings, whose bands sit 1 apart)
            for (let hi = lo + 2; hi <= Math.min(lo + 3, maxH + 1); hi++) {
              if (!ns.some((n) => serves(n.h, lo)) || !ns.some((n) => serves(n.h, hi))) continue;
              if (!ns.some((n) => serves(n.h, lo) !== serves(n.h, hi))) continue;
              bands.push({ at: [x, z], low: lo, high: hi });
            }
          }
        }
      }
      return { stairs, bands };
    };
    const convertLift = () => {
      const { stairs, bands } = findLiftCells();
      const pool = stairs.length ? stairs : bands;
      if (!pool.length) return false;
      const c = pool[Math.floor(liftRoll('#pick') * pool.length)];
      clearTile(c.at[0], c.at[1]);
      carved.add(`${c.at[0]},${c.at[1]}`);
      lifts.push({ at: c.at, low: c.low, high: c.high, wait: 2.0 });
      markMech(c.at[0], c.at[1]);
      return true;
    };
    let placedLift = 0;
    while (placedLift < wantLift) {
      if (!convertLift()) return null; // a forced lift must land
      placedLift++;
    }
    if (!placedLift && pLift > 0 && liftRoll('#roll') < pLift) convertLift();
  }

  // --- shards on the route (never start/goal, never on a carved tile) -------
  const inner = path.filter(([x, z]) => !carved.has(`${x},${z}`)).slice(1, -1);
  const shards = [];
  for (let i = 0; i < Math.min(b.shards[1], inner.length); i++) {
    const s = inner.splice(Math.floor(rand() * inner.length), 1)[0];
    shards.push(s);
  }

  // --- sentinels along straight runs (3+ tiles, never over start/goal) ------
  // (both orientations — see solidRuns above)
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
      if (j - i !== 1) continue;
      const horiz = path[i][1] === path[j][1];
      const vert = path[i][0] === path[j][0];
      if (!horiz && !vert) continue;
      const dx = path[j][0] - path[i][0];
      const dz = path[j][1] - path[i][1];
      let kk = a;
      while (
        kk + 1 < solid.length &&
        solid[kk + 1] - solid[kk] === 1 &&
        (horiz ? path[solid[kk + 1]][1] === path[solid[kk]][1] : path[solid[kk + 1]][0] === path[solid[kk]][0]) &&
        path[solid[kk + 1]][0] - path[solid[kk]][0] === dx &&
        path[solid[kk + 1]][1] - path[solid[kk]][1] === dz
      )
        kk++;
      if (kk - a + 1 >= 3) {
        runs.push([i, solid[kk]]);
        a = kk; // only maximal runs: one run per straight stretch
      }
    }
  }
  runs.sort((a, c) => (c[1] - c[0]) - (a[1] - a[0]));
  // REFUGES: the timing model forbids moving along a patrol line — a
  // sentinel on a long run is only fair if the player can slip off it.
  // For every run of 5+ tiles, ensure a dead-end refuge slab beside at
  // least every 3rd tile. Dead-end rule: the run tile is the ONLY solid
  // neighbour — a refuge that touches any other slab would be a bridge
  // (the serpentine shortcut, again). Skips silently when a neighbour is
  // already solid (the line is escapable that way).
  for (const [i, j] of runs) {
    if (j - i + 1 < 5) continue;
    for (let t = i; t <= j; t += 3) {
      const [x, z] = path[t];
      const horiz = t + 1 <= j && path[t][1] === path[t + 1][1];
      const sides = horiz ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (const [dx, dz] of sides) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      if (map[nz][nx] !== 0) continue;
      // a hollowed mechanic span (shuttle dock, spring pit) is a void by
      // design — filling it re-solidifies the dock and parseLevel rejects
      // the whole level ("shuttle dock is not void"). M2.5, 2026-11-12:
      // this was what starved the forced shuttle+spring undertow levels
      // (L82 0/220): the span clearing removes the side slabs, so a dock
      // tile has zero solid neighbours and passed the dead-end test.
      if (mechSet.has(`${nx},${nz}`)) continue;
      let otherSolid = 0;
        for (const [ax, az] of [[nx - 1, nz], [nx + 1, nz], [nx, nz - 1], [nx, nz + 1]]) {
          if (ax < 0 || az < 0 || ax >= W || az >= H) continue;
          if (ax === x && az === z) continue;
          if (map[az][ax] !== 0) otherSolid++;
        }
        if (otherSolid > 0) continue;
        map[nz][nx] = 2;
        tiles.add(`${nx},${nz}`);
        break;
      }
    }
  }
  const orbs = [];
  const orbCount = int(b.orbs[0], b.orbs[1]);
  const usedRuns = new Set();
  for (let o = 0; o < orbCount; o++) {
    for (let ri = 0; ri < runs.length; ri++) {
      if (usedRuns.has(ri)) continue;
      const [i, j] = runs[ri];
      const a = path[i];
      const c = path[j];
    // A sentinel cannot patrol within a tile of a mechanic: the sweep
    // would ride the spring pad / ice slide / shuttle dock, and the
    // timing model has no safe-window notion for a patrol that shares
    // space with a launch. (M2.5, 2026-11-12: shrinking this to same-run
    // only let sentinels sit adjacent to forced mechanics and L42 — the
    // forced shuttle+spring — went 0/600 proven; radius-1 it stays.)
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
      break; // only the run loop — the next sentinel takes the next run
    }
  }

  // --- freeze shards (M3 wave-1): a consumable that locks every sentinel
  // for FREEZE_TIME. Placed after the sentinels exist: on a plain route
  // tile off the patrol line, preferring tiles a few presses BEFORE a
  // guarded run so the shard reads as the tool for that crossing. Only
  // placed when the level actually has sentinels. The tile joins mechSet
  // so crumble and the key keep their distance, like every mechanic.
  const freezes = [];
  if (orbs.length) {
    const wantFreeze = force.freeze || 0;
    const pFreeze = (b.mech || {}).freeze || 0;
    const lineIdx = new Set();
    path.forEach(([x, z], i) => { if (lineSet.has(`${x},${z}`)) lineIdx.add(i); });
    const shardSet = new Set(shards.map(([sx, sz]) => `${sx},${sz}`));
    const placeFreeze = () => {
      const cands = [];
      for (let i = 1; i < path.length - 1; i++) {
        const kk = k(i);
        if (carved.has(kk) || mechSet.has(kk) || lineSet.has(kk) || shardSet.has(kk)) continue;
        if (kk === `${start[0]},${start[1]}` || kk === `${goal[0]},${goal[1]}`) continue;
        if (freezes.some(([fx, fz]) => `${fx},${fz}` === kk)) continue;
        let lead = Infinity; // presses from here to the next guarded tile
        for (let j = i + 1; j < path.length; j++) if (lineIdx.has(j)) { lead = j - i; break; }
        cands.push([i, lead]);
      }
      if (!cands.length) return false;
      const near = cands.filter(([, lead]) => lead >= 1 && lead <= 7);
      const [i] = pick(near.length ? near : cands);
      freezes.push([path[i][0], path[i][1]]);
      markMech(path[i][0], path[i][1]);
      return true;
    };
    let placed = 0;
    while (placed < wantFreeze) {
      if (!placeFreeze()) return null; // a forced freeze must land
      placed++;
    }
    while (placed < 2 && pFreeze > 0 && rand() < pFreeze * Math.pow(0.5, placed)) {
      if (!placeFreeze()) break;
      placed++;
    }
  } else if (force.freeze) {
    return null; // no sentinels: a freeze shard would be a dead pickup
  }

  // --- proximity sentinels (M3 wave-1): one placed patrol sleeps until
  // the cube comes within 3 tiles, then patrols normally. The fairness
  // model treats it as always awake, so the conversion can only make a
  // proven level kinder — never invalid.
  if (orbs.length) {
    const wantProx = force.proximity || 0;
    const pProx = (b.mech || {}).proximity || 0;
    // the conversion roll + choice come from a content hash, never the
    // shared rand stream: arming a new mechanic must not reshuffle the
    // candidate streams of already-shipped levels (a shifted stream once
    // starved a shipped slot of any passing candidate)
    const proxSeed = map.join('/') + '|' + orbs.map((o) => o.path.flat().join(',')).join(';');
    const proxRoll = (salt) => {
      let h = 2166136261;
      const s = salt + proxSeed;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0) / 4294967296;
    };
    const convertProx = () => {
      const cand = orbs.filter((o) => !o.wake);
      if (!cand.length) return false;
      cand[Math.floor(proxRoll('#pick') * cand.length)].wake = 3;
      return true;
    };
    let placedProx = 0;
    while (placedProx < wantProx) {
      if (!convertProx()) return null; // a forced proximity sentinel must land
      placedProx++;
    }
    if (!placedProx && pProx > 0 && proxRoll('#roll') < pProx) convertProx();
  } else if (force.proximity) {
    return null; // no sentinels: nothing can sleep
  }

  // --- heavy blocks (M3 wave-1): one heavy block astride the route whose
  // natural push-forward (the next route tile) is level or downhill — the
  // one-way shove is the lesson, and solveHazards proves the level still
  // completes inside the nudge budget granted here. Off the patrol line
  // and clear of every mechanic, like the freeze shard.
  const heavies = [];
  {
    const wantHeavy = force.heavy || 0;
    const pHeavy = (b.mech || {}).heavy || 0;
    const placeHeavy = () => {
      const shardSet = new Set(shards.map(([sx, sz]) => `${sx},${sz}`));
      const cands = [];
      for (let i = 1; i + 1 < path.length - 1; i++) {
        const kk = k(i);
        if (carved.has(kk) || mechSet.has(kk) || lineSet.has(kk) || shardSet.has(kk)) continue;
        if (kk === `${start[0]},${start[1]}` || kk === `${goal[0]},${goal[1]}`) continue;
        const nk = k(i + 1);
        if (carved.has(nk) || mechSet.has(nk) || lineSet.has(nk) || shardSet.has(nk)) continue;
        const [x, z] = path[i];
        const [nx, nz] = path[i + 1];
        if (map[nz][nx] > map[z][x]) continue; // the push-forward must not climb
        cands.push([i, map[nz][nx] < map[z][x]]); // prefer a downhill shove
      }
      if (!cands.length) return false;
      const down = cands.filter(([, isDown]) => isDown);
      const [i] = pick(down.length ? down : cands);
      heavies.push([path[i][0], path[i][1]]);
      markMech(path[i][0], path[i][1]);
      return true;
    };
    let placed = 0;
    while (placed < wantHeavy) {
      if (!placeHeavy()) return null; // a forced heavy block must land
      placed++;
    }
    if (!placed && pHeavy > 0 && rand() < pHeavy) placeHeavy();
  }

  // --- light blocks (Phase C, ADR-032): the telekinesis cube from the
  // hand-authored campaign (L4/L7) joins the generator. Same placement
  // law as the heavy block — astride the route, off the patrol line,
  // clear of every mechanic — but a light block pushes level, downhill
  // AND uphill, so there is no climb restriction on the push-forward;
  // solveHazards proves the level still completes inside the budget.
  const blocks = [];
  {
    const wantBlocks = force.blocks || 0;
    const pBlocks = (b.mech || {}).blocks || 0;
    const placeBlock = () => {
      const shardSet = new Set(shards.map(([sx, sz]) => `${sx},${sz}`));
      const cands = [];
      for (let i = 1; i + 1 < path.length - 1; i++) {
        const kk = k(i);
        if (carved.has(kk) || mechSet.has(kk) || lineSet.has(kk) || shardSet.has(kk)) continue;
        if (kk === `${start[0]},${start[1]}` || kk === `${goal[0]},${goal[1]}`) continue;
        const nk = k(i + 1);
        if (carved.has(nk) || mechSet.has(nk) || lineSet.has(nk) || shardSet.has(nk)) continue;
        cands.push(i);
      }
      if (!cands.length) return false;
      const i = pick(cands);
      blocks.push([path[i][0], path[i][1]]);
      markMech(path[i][0], path[i][1]);
      return true;
    };
    let placed = 0;
    while (placed < wantBlocks) {
      if (!placeBlock()) return null; // a forced block must land
      placed++;
    }
    if (!placed && pBlocks > 0 && rand() < pBlocks) placeBlock();
  }

  // --- crumble slabs on the route (solver proves the route survives) --------
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

  // --- the key: an off-route deck slab (fill), off the patrol line ----------
  let keyPos = null;
  if (b.keyP != null && rand() < b.keyP) {
    const candidates = solidSlabs.filter((t) => {
      const [fx, fz] = t.split(',').map(Number);
      if (crumbleSet.has(t)) return false;
      if (lineSet.has(t)) return false;
      if (mechSet.has(t)) return false;
      return true;
    });
    if (candidates.length) keyPos = pick(candidates).split(',').map(Number);
  }

  const rows = map.map((row) => row.map((v) => (v === 0 ? '.' : String(v))).join(''));
  const def = {
    map: rows,
    start,
    goal,
    shards,
  };
  if (crumble.length) def.crumble = crumble;
  if (orbs.length) def.orbs = orbs;
  if (keyPos) def.key = keyPos;
  if (shuttles.length) def.shuttles = shuttles;
  if (lifts.length) def.lifts = lifts;
  if (springs.length) def.springs = springs;
  if (ice.length) def.ice = ice;
  if (conveyors.length) def.conveyors = conveyors;
  if (doors.length) def.doors = doors;
  if (timed.length) def.timed = timed;
  if (freezes.length) def.freeze = freezes;
  if (pulses.length) def.pulse = pulses;
  if (heavies.length) {
    def.heavy = heavies;
    def.nudge = 3; // telekinesis charges for shoving it clear (solver-proven)
  }
  if (blocks.length) {
    def.blocks = blocks;
    // three charges per block in play (solver proves sufficiency)
    def.nudge = Math.max(def.nudge || 0, 3 * (blocks.length + heavies.length));
  }

  // --- boss arena (M3): on a keyed level the key grab starts phase 2 —
  // some sentinels sleep until then (wave: 2) and every patrol speeds
  // up 1.35×. Proofs model phase 2 throughout (wave-2 awake at boss
  // speed), so the conversion is safe by construction; the verifier's
  // spawn audit keeps wave-2 spawns off the key tile. Roll + choice
  // come from a content hash, never the shared rand stream (ADR-027).
  {
    const wantBoss = force.boss || 0;
    const pBoss = (b.mech || {}).boss || 0;
    const bossSeed = (keyPos ? keyPos.join(',') : 'nokey') + '|' + orbs.map((o) => o.path.flat().join(',')).join(';');
    const bossRoll = (salt) => {
      let h = 2166136261;
      const s = salt + bossSeed;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0) / 4294967296;
    };
    const convertBoss = () => {
      // a proximity sentinel (wake) can never also be a boss sleeper —
      // the parser rejects the combo, so those orbs are not eligible
      const eligible = orbs.filter((o) => !o.wake && !o.wave);
      if (!keyPos || !eligible.length) return false;
      def.boss = { speed: 1.35 };
      const n = Math.min(eligible.length, orbs.length >= 3 ? 2 : 1); // keep a wave-1 patrol
      const order = eligible.sort((x, y) => bossRoll('#o' + x.path) - bossRoll('#o' + y.path));
      for (const o of order.slice(0, n)) o.wave = 2;
      return true;
    };
    if (wantBoss) {
      if (!convertBoss()) return null; // a forced boss needs a key + sentinels
    } else if (pBoss > 0 && bossRoll('#roll') < pBoss) {
      convertBoss();
    }
  }
  return def;
}
