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
/**
 * Seconds a TIMED slab (delayed crumble, M3 wave-1) holds after the
 * cube's first landing before it falls. The plain crumble's fuse is
 * 0.75 s (view-side); the timed slab is the slow sibling — roughly ten
 * presses of grace, read from its staged cracking. Proofs never rely
 * on the duration: solveHazards models a timed slab as break-on-leave,
 * exactly like a crumble, so the timed window is pure player margin.
 */
export const TIMED_FUSE = 2.4;

/**
 * Pulsing gaps (M3 wave-1): a void cell sealed by a phantom slab for
 * PULSE_ON of every PULSE_PERIOD, sweeping diagonally (phase offset
 * (x+z)/4 of a cycle). Cross on the blink — the seal never holds long
 * enough to wait on. Proofs treat a pulse tile exactly like a sliding
 * bridge (a timing hazard you wait out beside, always solid in the
 * model), and the waiting-spot audit keeps it out of sentinel
 * clearance, away from docks and bridges, like the timed slab.
 */
export const PULSE_PERIOD = 4.0;
export const PULSE_ON = 0.4;

/**
 * Piston pushers (Phase B, ADR-035): a machinery base whose arm sweeps
 * the neighbouring strike cell for the tail of every cycle — retracted
 * for the first 55% (cross then), extended for the rest. Proofs model
 * the strike cell as the plain floor it is (a wait-out timing hazard,
 * the sliding-bridge doctrine); the phase law lives here so the view,
 * the game and the live bot all read the same clock.
 */
export const PISTON_PERIOD = 3.2;
export const PISTON_EXTENDED_FROM = 0.55;

/**
 * Turntable bridges (Phase B, ADR-036): a rigid bar three tiles long
 * turning on a centre pivot over void cells. The bar joins one pair of
 * opposite banks for half of every cycle, then sweeps 90 degrees and
 * joins the other pair — the route graph rewires itself over time.
 * Proofs use the slider-family wait-out model: all five cross cells are
 * plain floor in every search, and the phase law lives here so the
 * view, the game and the live bot read the same clock.
 */
export const TURNTABLE_PERIOD = 5.6;

/** Cycle phase (0..1) of a turntable at time `t`. */
export function turntablePhase(t, tt) {
  return ((t / tt.period + tt.phase) % 1 + 1) % 1;
}

/** Which bank pair the bar joins at time `t`: 'h' (x axis) or 'v' (z axis). */
export function turntableAxis(t, tt) {
  return turntablePhase(t, tt) < 0.5 ? 'h' : 'v';
}

/** Is the turntable cell (x, z) floored at time `t`? (Pivot: always.) */
/** Seconds until the bar at (x, z) next sweeps (Infinity: pivot/plain). */
export function turntableDwellLeft(level, t, x, z) {
  const tt = level.turntableCells.get(key(x, z));
  if (!tt) return Infinity;
  if (tt.at[0] === x && tt.at[1] === z) return Infinity;
  const ph = turntablePhase(t, tt);
  return (Math.ceil(ph * 2) / 2 - ph) * tt.period || 0;
}

export function turntableSolid(level, t, x, z) {
  const tt = level.turntableCells.get(key(x, z));
  if (!tt) return true;
  if (tt.at[0] === x && tt.at[1] === z) return true;
  return (turntableAxis(t, tt) === 'h') === (z === tt.at[1]);
}

/**
 * Clinging (Phase B, ADR-037): the hang-ledge. A `clings` entry is a
 * declared grip crevice — ONE void cell between two plain slabs. A press
 * into the crevice from either bank makes the cube catch the far face,
 * hang a beat, and settle on top of it, so the press crosses the crevice
 * and climbs/drops ONE storey beyond the roll law (the law the gulf
 * already forbids: you cannot walk it, and the plain press falls in).
 * The edge is declared, audited against geometry, and never inferred:
 * cling move = strictly new reachability, never a quieter roll.
 */
export const CLING_UP = 2;
export const CLING_DOWN = 3;

/** Cycle phase (0..1) of a piston at time `t`. */
export function pistonPhase(t, piston) {
  const ph = ((t / piston.period + piston.phase) % 1 + 1) % 1;
  return ph;
}

/** Is the piston's arm extended at time `t`? */
export function pistonExtended(piston, t) {
  return pistonPhase(t, piston) >= PISTON_EXTENDED_FROM;
}

export const key = (x, z) => `${x},${z}`;

/**
 * Turn a level definition into a playable model.
 * `tiles` is a Map of "x,z" -> { x, z, h, crumble }
 */
export function parseLevel(def) {
  const tiles = new Map();
  const width = Math.max(...def.map.map((r) => r.length));
  const depth = def.map.length;
  // the raw map slabs, before any mechanic adds phantom tiles: cling
  // banks must be real structure, never a dock or a bar cell (ADR-037)
  const mapSlabs = new Set();

  def.map.forEach((row, z) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch >= '0' && ch <= '9') {
        tiles.set(key(x, z), { x, z, h: Number(ch), crumble: false });
        mapSlabs.add(key(x, z));
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
    return { x, z, heavy: false };
  });
  // ---- heavy blocks (M3 wave-1): pushable level or downhill, never up -----
  for (const [x, z] of def.heavy || []) {
    if (!tiles.has(key(x, z))) throw new Error(`[${def.name}] heavy block ${x},${z} is not a slab`);
    if (blocks.some((b) => b.x === x && b.z === z)) throw new Error(`[${def.name}] heavy block stacked on a block at ${x},${z}`);
    blocks.push({ x, z, heavy: true });
  }
  const blockTiles = new Set(blocks.map((b) => key(b.x, b.z)));
  if (blockTiles.has(key(startTile.x, startTile.z))) throw new Error(`[${def.name}] block on the start tile`);
  if (blockTiles.has(key(goalTile.x, goalTile.z))) throw new Error(`[${def.name}] block on the goal tile`);

  // ---- turntable bridges (Phase B, ADR-036): a rigid 3-tile bar turning
  // on a pivot, all five cross cells void in the map (the pulsing-gap
  // phantom idiom). The bar has ONE height — the lowest bank it touches —
  // and must join two opposite shores on at least one axis, or it is
  // decoration. In every proof the cross cells are plain floor (the
  // wait-out doctrine); only the live clock decides which pair is joined.
  const turntables = [];
  const turntableCells = new Map(); // cross cell "x,z" -> turntable
  for (const [i, td] of (def.turntables || []).entries()) {
    const [px, pz] = td.at || [];
    const cross = [[px, pz], [px + 1, pz], [px - 1, pz], [px, pz + 1], [px, pz - 1]];
    for (const [cx, cz] of cross) {
      if (tiles.has(key(cx, cz))) throw new Error(`[${def.name}] turntable ${i} cell ${cx},${cz} is not void`);
    }
    let h = Infinity;
    for (const [cx, cz] of cross) {
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const n = tiles.get(key(cx + dx, cz + dz));
        if (n && !cross.some(([ax, az]) => ax === cx + dx && az === cz + dz)) h = Math.min(h, n.h);
      }
    }
    if (!Number.isFinite(h)) throw new Error(`[${def.name}] turntable ${i} touches no bank`);
    for (const [cx, cz] of cross.slice(1)) {
      const touches = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dz]) => {
        const nx = cx + dx;
        const nz = cz + dz;
        return tiles.has(key(nx, nz)) && !cross.some(([ax, az]) => ax === nx && az === nz);
      });
      if (!touches) throw new Error(`[${def.name}] turntable ${i} arm cell ${cx},${cz} floats free of every bank`);
    }
    // the bar must actually reach shores: at least two of the four
    // beyond-banks exist (a full cross, a T, or a corner junction —
    // each dwell joins a different subset through the pivot)
    const banks = [[px - 2, pz], [px + 2, pz], [px, pz - 2], [px, pz + 2]]
      .filter(([bx, bz]) => tiles.has(key(bx, bz))).length;
    if (banks < 2) throw new Error(`[${def.name}] turntable ${i} reaches fewer than two shores`);
    const period = td.period === undefined ? TURNTABLE_PERIOD : td.period;
    if (typeof period !== 'number' || !(period >= 3.2) || period > 10) {
      throw new Error(`[${def.name}] turntable ${i} period must be a number in [3.2, 10] (got ${td.period})`);
    }
    const phase = td.phase === undefined ? 0 : td.phase;
    if (typeof phase !== 'number' || !(phase >= 0) || phase >= 1) {
      throw new Error(`[${def.name}] turntable ${i} phase must be a number in [0, 1) (got ${td.phase})`);
    }
    const tt = { at: [px, pz], period, phase, h, id: i };
    tiles.set(key(px, pz), { x: px, z: pz, h, turntable: tt, turntablePivot: true });
    for (const [cx, cz] of cross.slice(1)) tiles.set(key(cx, cz), { x: cx, z: cz, h, turntable: tt });
    for (const [cx, cz] of cross) turntableCells.set(key(cx, cz), tt);
    turntables.push(tt);
  }
  // ---- clinging (Phase B, ADR-037): declared grip crevices ----------------
  // Each entry is ONE void cell between two plain map slabs. A press into
  // the crevice from either bank catches the far face and lands on it when
  // the height step is within [−CLING_DOWN, +CLING_UP] — one storey beyond
  // the roll law each way. The crevice is the only thing that carries the
  // edge: elsewhere a press into void is still a fall. Banks must be real
  // structure (mapSlabs), never a dock/bar cell; the audit below rejects
  // banks that carry another mechanic.
  const clingCells = new Map(); // crevice "x,z" -> { at, id }
  const clingPairs = new Map(); // "fromKey|dx,dz" -> far bank tile
  const clingBanks = new Set();
  for (const [i, c] of (def.clings || []).entries()) {
    const [ax, az] = c;
    if (tiles.has(key(ax, az))) throw new Error(`[${def.name}] cling ${i} crevice ${ax},${az} is not void`);
    let grips = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const g = tiles.get(key(ax - dx, az - dz)); // the bank you press from
      const f = tiles.get(key(ax + dx, az + dz)); // the face you catch
      if (!g || !f) continue;
      if (!mapSlabs.has(key(g.x, g.z)) || !mapSlabs.has(key(f.x, f.z))) continue;
      if (g.crumble || f.crumble) continue;
      const dh = f.h - g.h;
      if (dh > CLING_UP || dh < -CLING_DOWN) continue;
      grips++;
      clingPairs.set(`${key(g.x, g.z)}|${dx},${dz}`, f);
      clingBanks.add(key(g.x, g.z));
      clingBanks.add(key(f.x, f.z));
    }
    if (!grips) throw new Error(`[${def.name}] cling ${i} at ${ax},${az} joins no two banks within reach`);
    clingCells.set(key(ax, az), { at: [ax, az], id: i });
  }

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

  // ---- shuttle platforms (moving bridges between structures) ---------------
  // A shuttle dwells `wait` seconds on each dock tile (a/b — void in the map,
  // solidified by the platform), drives across the gap, dwells, and returns.
  // The dock tiles are added to `tiles` so route/solver logic sees them; the
  // view renders the moving platform and is the clock for solidness.
  const shuttles = (def.shuttles || []).map((sh, i) => {
    const [ax, az] = sh.a;
    const [bx, bz] = sh.b;
    const dx = Math.sign(bx - ax);
    const dz = Math.sign(bz - az);
    const straight = (dx !== 0) === (dz === 0);
    const gap = Math.abs(bx - ax) + Math.abs(bz - az);
    if (!straight) throw new Error(`[${def.name}] shuttle ${i} must drive in a straight line`);
    if (gap < 2 || gap > 5) throw new Error(`[${def.name}] shuttle ${i} gap must be 2-5 tiles`);
    // the gap interior must be pure void — the platform flies through it
    let gx = ax + dx;
    let gz = az + dz;
    while (gx !== bx || gz !== bz) {
      if (tiles.has(key(gx, gz))) throw new Error(`[${def.name}] shuttle ${i} track crosses a slab at ${gx},${gz}`);
      gx += dx;
      gz += dz;
    }
    // each dock needs at least one solid neighbour — the tile the player
    // stands on to board (the walk may meet the dock from any side)
    const neighbour = (x, z) =>
      [
        tiles.get(key(x - 1, z)),
        tiles.get(key(x + 1, z)),
        tiles.get(key(x, z - 1)),
        tiles.get(key(x, z + 1)),
      ].find(Boolean);
    const endA = neighbour(ax, az);
    const endB = neighbour(bx, bz);
    if (!endA) throw new Error(`[${def.name}] shuttle ${i} dock a has no boarding tile`);
    if (!endB) throw new Error(`[${def.name}] shuttle ${i} dock b has no boarding tile`);
    const ends = [endA.h, endB.h];
    // the platform flies at the rounded average of the two ends: boarding
    // and alighting are then single legal rolls (climb/drop at most 1)
    if (Math.abs(ends[0] - ends[1]) > 2) throw new Error(`[${def.name}] shuttle ${i} end structures differ by more than 2`);
    const h = Math.round((ends[0] + ends[1]) / 2);
    if (Math.abs(h - ends[0]) > 1 || Math.abs(h - ends[1]) > 1) {
      throw new Error(`[${def.name}] shuttle ${i} dock height unreachable from a structure`);
    }
    for (const [x, z] of [[ax, az], [bx, bz]]) {
      if (tiles.has(key(x, z))) throw new Error(`[${def.name}] shuttle dock ${x},${z} is not void`);
      tiles.set(key(x, z), { x, z, h, crumble: false, shuttle: true, shuttleId: i });
    }
    const travel = +(gap * 0.8).toFixed(2); // seconds for the drive across
    const wait = sh.wait || 2;
    // twin (M3 wave-1): a second platform on the same loop, half a cycle
    // out of phase. Purely a view/game fact — every proof model in this
    // file sees the ONE logical shuttle (dock tiles + the explicit ride),
    // so a twin can only add boarding windows, never remove one.
    return { a: [ax, az], b: [bx, bz], dx, dz, gap, h, wait, travel, cycle: 2 * wait + 2 * travel, twin: !!sh.twin, id: i };
  });
  const shuttleDocks = new Set(
    shuttles.flatMap((sh) => [key(sh.a[0], sh.a[1]), key(sh.b[0], sh.b[1])]),
  );

  // ---- lift platforms (Phase B, ADR-033): a shuttle turned vertical ------
  // One dock cell (void in the map) whose platform dwells at `low`, rides
  // to `high`, dwells, and returns: board at the low bank, ride up, step
  // off at the high bank — or the reverse. The dock tile is solidified at
  // `low` and carries the lift; checkRoll prices any step against EITHER
  // dwell (waiting for the platform is free in every proof, the same
  // abstraction a shuttle dock gets), while the game prices live presses
  // against the dwell the view's clock actually shows. A lift is only
  // ever entered or left by a deliberate press (spawnProblems keeps
  // slides, belts and launches away from the shaft).
  const lifts = [];
  const liftDocks = new Set();
  for (const [i, lf] of (def.lifts || []).entries()) {
    const [ax, az] = lf.at || [];
    if (def.wind) throw new Error(`[${def.name}] lift ${i}: wind would shove a cube mid-ride — no wind level carries a lift`);
    if (tiles.has(key(ax, az))) throw new Error(`[${def.name}] lift ${i} dock ${ax},${az} is not void`);
    const { low, high } = lf;
    if (!Number.isInteger(low) || !Number.isInteger(high) || high - low < 2 || high - low > 4) {
      throw new Error(`[${def.name}] lift ${i} rise must be 2-4 storeys (got ${low}->${high})`);
    }
    // the banks: orthogonal slab neighbours. A bank serves a dwell when
    // the plain roll law could step between the bank and a platform
    // standing at that height.
    const banks = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dz]) => tiles.get(key(ax + dx, az + dz)))
      .filter(Boolean);
    const serves = (n, h) => h - n.h <= MAX_CLIMB && n.h - h <= MAX_DROP;
    if (!banks.some((n) => serves(n, low))) throw new Error(`[${def.name}] lift ${i} has no bank at its low dwell`);
    if (!banks.some((n) => serves(n, high))) throw new Error(`[${def.name}] lift ${i} has no bank at its high dwell`);
    // the shaft must join two height worlds: at least one bank reachable
    // from only one of the dwells — otherwise the platform connects
    // nothing a plain roll could not already reach.
    if (!banks.some((n) => serves(n, low) !== serves(n, high))) {
      throw new Error(`[${def.name}] lift ${i} joins no two banks (every neighbour serves both dwells)`);
    }
    // no machinery-to-machinery steps (the dock-to-dock law, L196): a
    // platform dock never touches another platform's dock.
    for (const n of banks) {
      if (n.shuttle || n.lift) throw new Error(`[${def.name}] lift ${i} dock touches another platform dock`);
    }
    const wait = lf.wait || 2;
    const travel = +((high - low) * 0.8).toFixed(2); // 0.8s per storey, as shuttles per tile
    const lift = { at: [ax, az], low, high, wait, travel, cycle: 2 * wait + 2 * travel, id: i };
    tiles.set(key(ax, az), { x: ax, z: az, h: low, crumble: false, lift });
    lifts.push(lift);
    liftDocks.add(key(ax, az));
  }

  // ---- ice slabs: a roll onto ice keeps sliding one tile per step ----------
  const iceTiles = new Set();
  for (const [x, z] of def.ice || []) {
    const t = tiles.get(key(x, z));
    if (!t) throw new Error(`[${def.name}] ice ${x},${z} is not a slab`);
    if (t.shuttle) throw new Error(`[${def.name}] ice on a shuttle dock`);
    if (t.lift) throw new Error(`[${def.name}] ice on a lift dock`);
    t.ice = true;
    iceTiles.add(key(x, z));
  }

  // ---- spring pads: a roll onto a spring launches up to 3 tiles in the -----
  // direction of travel, flying over void, landing on the first slab it finds
  // (height change up to 3). One press, one landing.
  const springTiles = new Set();
  for (const [x, z] of def.springs || []) {
    const t = tiles.get(key(x, z));
    if (!t) throw new Error(`[${def.name}] spring ${x},${z} is not a slab`);
    if (t.shuttle) throw new Error(`[${def.name}] spring on a shuttle dock`);
    if (t.lift) throw new Error(`[${def.name}] spring on a lift dock`);
    t.spring = true;
    springTiles.add(key(x, z));
  }

  // ---- conveyor belts (M3 wave-1): a roll ONTO a belt tile is carried one
  // tile in the belt's own direction, chaining along the belt, whatever
  // direction the press was travelling. Data: [x, z, dx, dz] (unit axis).
  const conveyorTiles = new Set();
  for (const [x, z, dx, dz] of def.conveyors || []) {
    const t = tiles.get(key(x, z));
    if (!t) throw new Error(`[${def.name}] conveyor ${x},${z} is not a slab`);
    if (t.shuttle) throw new Error(`[${def.name}] conveyor on a shuttle dock`);
    if (t.lift) throw new Error(`[${def.name}] conveyor on a lift dock`);
    if (t.ice) throw new Error(`[${def.name}] conveyor on ice at ${x},${z}`);
    if (t.spring) throw new Error(`[${def.name}] conveyor on a spring at ${x},${z}`);
    if (!((Math.abs(dx) === 1 && dz === 0) || (Math.abs(dz) === 1 && dx === 0))) {
      throw new Error(`[${def.name}] conveyor at ${x},${z} needs a unit axis direction`);
    }
    t.conveyor = { dx, dz };
    conveyorTiles.add(key(x, z));
  }
  if (startTile.conveyor) throw new Error(`[${def.name}] conveyor on the start tile`);
  if (goalTile.conveyor) throw new Error(`[${def.name}] conveyor on the goal tile`);
  // a belt loop would carry the cube forever — reject cycles at parse time
  for (const k0 of conveyorTiles) {
    const seen = new Set();
    let t = tiles.get(k0);
    while (t && t.conveyor) {
      const kk = key(t.x, t.z);
      if (seen.has(kk)) throw new Error(`[${def.name}] conveyor cycle at ${kk}`);
      seen.add(kk);
      t = tiles.get(key(t.x + t.conveyor.dx, t.z + t.conveyor.dz));
    }
  }

  // ---- pressure plates + doors (M3 wave-1): a door tile sits in a void
  // cell (the parser solidifies it at its plate's height, like a shuttle
  // dock). The door is a wall to every press except one that STARTS on its
  // plate: step onto the plate and the way through opens; step off the
  // plate anywhere else and it closes. The cube's weight only — blocks
  // never press a plate (canPushBlock refuses plate tiles), so the whole
  // mechanic stays a stateless press law: legality depends only on where
  // the press starts, exactly what checkRoll/resolveRoll already know.
  const doors = [];
  for (const d of def.doors || []) {
    const [px, pz] = d.plate || [];
    const [ax, az] = d.at || [];
    const plate = tiles.get(key(px, pz));
    if (!plate) throw new Error(`[${def.name}] door plate ${px},${pz} is not a slab`);
    if (tiles.has(key(ax, az))) throw new Error(`[${def.name}] door at ${ax},${az} must be void in the map`);
    if (Math.abs(ax - px) + Math.abs(az - pz) !== 1) {
      throw new Error(`[${def.name}] door at ${ax},${az} must sit beside its plate ${px},${pz}`);
    }
    if (plate.shuttle || plate.ice || plate.spring || plate.conveyor || plate.crumble || plate.lift) {
      throw new Error(`[${def.name}] door plate on another mechanic at ${px},${pz}`);
    }
    if (plate.plate) throw new Error(`[${def.name}] plate ${px},${pz} already works a door`);
    if (px === startTile.x && pz === startTile.z) throw new Error(`[${def.name}] door plate on the start tile`);
    if (px === goalTile.x && pz === goalTile.z) throw new Error(`[${def.name}] door plate on the goal tile`);
    if (def.key && def.key[0] === px && def.key[1] === pz) throw new Error(`[${def.name}] door plate on the key`);
    const tile = { x: ax, z: az, h: plate.h, crumble: false, door: { x: px, z: pz } };
    tiles.set(key(ax, az), tile);
    plate.plate = { x: ax, z: az };
    doors.push({ plate, tile });
  }

  // ---- timed slabs (delayed crumble, M3 wave-1): TIMED_FUSE seconds
  // after the cube's first landing, the slab falls. A plain slab with a
  // fuse — never stacked on another mechanic, never start/goal/key.
  const timedTiles = new Set();
  for (const [x, z] of def.timed || []) {
    const t = tiles.get(key(x, z));
    if (!t) throw new Error(`[${def.name}] timed slab ${x},${z} is not a slab`);
    if (t.crumble) throw new Error(`[${def.name}] timed slab on a crumble slab at ${x},${z}`);
    if (t.shuttle || t.ice || t.spring || t.conveyor || t.plate || t.door || t.lift) {
      throw new Error(`[${def.name}] timed slab on another mechanic at ${x},${z}`);
    }
    if (x === startTile.x && z === startTile.z) throw new Error(`[${def.name}] timed slab on the start tile`);
    if (x === goalTile.x && z === goalTile.z) throw new Error(`[${def.name}] timed slab on the goal tile`);
    if (def.key && def.key[0] === x && def.key[1] === z) throw new Error(`[${def.name}] timed slab on the key`);
    t.timed = true;
    timedTiles.add(key(x, z));
  }

  // ---- freeze shards (M3 wave-1): landing on one freezes every
  // sentinel for FREEZE_TIME. A consumable pickup on a plain slab —
  // never stacked on another mechanic, a shard, a block, or the key.
  const freezeTiles = new Set();
  const freezes = [];
  for (const [x, z] of def.freeze || []) {
    const t = tiles.get(key(x, z));
    if (!t) throw new Error(`[${def.name}] freeze shard ${x},${z} is not a slab`);
    if (t.shuttle || t.ice || t.spring || t.conveyor || t.crumble || t.timed || t.plate || t.door || t.lift) {
      throw new Error(`[${def.name}] freeze shard on another mechanic at ${x},${z}`);
    }
    if (x === startTile.x && z === startTile.z) throw new Error(`[${def.name}] freeze shard on the start tile`);
    if (x === goalTile.x && z === goalTile.z) throw new Error(`[${def.name}] freeze shard on the goal tile`);
    if (blockTiles.has(key(x, z))) throw new Error(`[${def.name}] freeze shard under a block at ${x},${z}`);
    if (shards.some((s) => s.x === x && s.z === z)) throw new Error(`[${def.name}] freeze shard stacked on a shard at ${x},${z}`);
    if (def.key && def.key[0] === x && def.key[1] === z) throw new Error(`[${def.name}] freeze shard on the key`);
    t.freeze = true;
    freezeTiles.add(key(x, z));
    freezes.push({ x, z });
  }

  // ---- pulsing gaps (M3 wave-1): void cells a phantom slab seals on a
  // cycle. The slab rises to the lowest neighbouring bank (min height).
  const pulseTiles = new Set();
  const pulses = [];
  for (const [x, z] of def.pulse || []) {
    if (tiles.has(key(x, z))) throw new Error(`[${def.name}] pulse gap ${x},${z} is not void`);
    let h = Infinity;
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const n = tiles.get(key(x + dx, z + dz));
      if (n) h = Math.min(h, n.h);
    }
    if (!Number.isFinite(h)) throw new Error(`[${def.name}] pulse gap ${x},${z} has no slab neighbour`);
    tiles.set(key(x, z), { x, z, h, crumble: false, pulse: true });
    pulseTiles.add(key(x, z));
    pulses.push({ x, z });
  }

  // ---- gate key -------------------------------------------------------------
  let gateKey = null;
  if (def.key) {
    const [kx, kz] = def.key;
    if (!tiles.has(key(kx, kz))) throw new Error(`[${def.name}] key ${kx},${kz} is not a slab`);
    if (tiles.get(key(kx, kz)).door) throw new Error(`[${def.name}] key sits on a door tile`);
    if (tiles.get(key(kx, kz)).lift) throw new Error(`[${def.name}] key sits on a lift dock`);
    if (kx === goalTile.x && kz === goalTile.z) throw new Error(`[${def.name}] key sits on the goal`);
    gateKey = { x: kx, z: kz };
  }

  // ---- proximity sentinels (M3 wave-1): an orb with `wake: R` sleeps
  // parked on its patrol until the cube comes within R tiles, then
  // patrols normally. The fairness model deliberately ignores the
  // sleep: every proof treats it as always awake, so dormancy only
  // ever helps the player.
  for (const o of def.orbs || []) {
    if (o.wake !== undefined && (typeof o.wake !== 'number' || !(o.wake >= 1))) {
      throw new Error(`[${def.name}] proximity sentinel wake must be a number >= 1`);
    }
    // boss arenas (M3): `wave: 2` sentinels sleep until the boss phase;
    // a sentinel is woken by proximity OR by the boss, never both
    if (o.wave !== undefined && o.wave !== 2) {
      throw new Error(`[${def.name}] sentinel wave must be 2 (wave 1 is the default)`);
    }
    if (o.wave && o.wake) {
      throw new Error(`[${def.name}] a sentinel cannot be both proximity (wake) and boss (wave)`);
    }
    if (o.wave && !def.boss) {
      throw new Error(`[${def.name}] wave-2 sentinels need a boss arena (def.boss)`);
    }
  }
  // ---- boss arena (M3): grabbing the gate key starts phase 2 — wave-2
  // sentinels wake and every patrol runs at `boss.speed`. The fairness
  // model is deliberately phase-blind: crossings are proven with wave-2
  // sentinels AWAKE at boss speed, so the proven model is at least as
  // hard as either real phase and one static proof covers both.
  let boss = null;
  if (def.boss !== undefined) {
    if (!def.key) throw new Error(`[${def.name}] a boss arena needs a gate key (the phase trigger)`);
    const speed = def.boss.speed === undefined ? 1.35 : def.boss.speed;
    if (typeof speed !== 'number' || !(speed > 1) || speed > 2) {
      throw new Error(`[${def.name}] boss speed must be a number in (1, 2]`);
    }
    boss = { speed };
  }

  // ---- shrink/grow pads + low tunnels (Phase B, ADR-034) -----------------
  // Size is one more bit of cube state. Landing on a shrink pad makes the
  // cube mini (half-size); landing on a grow pad restores it. Pads are
  // permanent fixtures, not pickups — they fire on EVERY landing, so a
  // route can shrink, tunnel, grow and come back. A `low` tile is a tunnel
  // mouth: only the mini cube may ever stand on it (checkRoll prices the
  // size bit; every search in this file carries it in its state when the
  // level uses the mechanic). Pads and tunnels must co-occur — a size
  // change nothing can spend, or a tunnel nothing can enter, is dead
  // decoration and rejected like a lift that joins no two banks.
  const shrinkPads = new Map(); // "x,z" -> 'shrink' | 'grow'
  for (const [kind, list] of [['shrink', def.shrink || []], ['grow', def.grow || []]]) {
    for (const [x, z] of list) {
      const t = tiles.get(key(x, z));
      if (!t) throw new Error(`[${def.name}] ${kind} pad ${x},${z} is not a slab`);
      if (t.shrink || t.grow) throw new Error(`[${def.name}] size pads stacked at ${x},${z}`);
      if (t.shuttle || t.lift || t.door || t.plate || t.ice || t.spring || t.conveyor || t.crumble || t.timed || t.freeze || t.pulse) {
        throw new Error(`[${def.name}] ${kind} pad on another mechanic at ${x},${z}`);
      }
      if (x === startTile.x && z === startTile.z) throw new Error(`[${def.name}] ${kind} pad on the start tile`);
      if (x === goalTile.x && z === goalTile.z) throw new Error(`[${def.name}] ${kind} pad on the goal tile`);
      if (gateKey && gateKey.x === x && gateKey.z === z) throw new Error(`[${def.name}] ${kind} pad on the key`);
      if (blockTiles.has(key(x, z))) throw new Error(`[${def.name}] ${kind} pad under a block at ${x},${z}`);
      if (shards.some((s) => s.x === x && s.z === z)) throw new Error(`[${def.name}] ${kind} pad stacked on a shard at ${x},${z}`);
      t[kind] = true;
      shrinkPads.set(key(x, z), kind);
    }
  }
  const lowTiles = new Set();
  for (const [x, z] of def.low || []) {
    const t = tiles.get(key(x, z));
    if (!t) throw new Error(`[${def.name}] low tile ${x},${z} is not a slab`);
    if (t.low) throw new Error(`[${def.name}] low tile listed twice at ${x},${z}`);
    if (t.shrink || t.grow) throw new Error(`[${def.name}] low tile on a size pad at ${x},${z}`);
    if (t.shuttle || t.lift || t.door || t.plate || t.ice || t.spring || t.conveyor || t.crumble || t.timed || t.freeze || t.pulse) {
      throw new Error(`[${def.name}] low tile on another mechanic at ${x},${z}`);
    }
    if (x === startTile.x && z === startTile.z) throw new Error(`[${def.name}] low tile on the start tile`);
    if (x === goalTile.x && z === goalTile.z) throw new Error(`[${def.name}] low tile on the goal tile`);
    if (gateKey && gateKey.x === x && gateKey.z === z) throw new Error(`[${def.name}] low tile on the key`);
    if (blockTiles.has(key(x, z))) throw new Error(`[${def.name}] block inside a low tunnel at ${x},${z}`);
    // a tunnel cell must connect to the world (a shard niche at the end of
    // one is fine design; a sealed cell can never be entered at any size)
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => tiles.has(key(x + dx, z + dz)))) {
      throw new Error(`[${def.name}] low tile ${x},${z} has no slab neighbour`);
    }
    t.low = true;
    lowTiles.add(key(x, z));
  }
  const startMini = !!def.startMini;
  const hasSize = lowTiles.size > 0;
  if (hasSize && !startMini && ![...shrinkPads.values()].includes('shrink')) {
    throw new Error(`[${def.name}] low tunnels but no way to shrink (no shrink pad, no mini start)`);
  }
  if (shrinkPads.size && !hasSize) throw new Error(`[${def.name}] size pads but no low tunnel to spend them on`);
  if (startMini && !hasSize) throw new Error(`[${def.name}] starts mini but has no low tunnel`);

  // ---- piston pushers (Phase B, ADR-035): a machinery base on a slab,
  // its arm periodically sweeping the strike cell one step along (dx,dz).
  // The base is a wall to every press (checkRoll); the strike cell stays
  // a plain slab in every proof — the arm is a timing hazard you wait
  // out beside, exactly the sliding-bridge doctrine. Live, the arm
  // blocks entry while extended, and a cube resting on the strike cell
  // when it fires is shoved one tile further (the wind-drift law) when
  // that shove is legal — otherwise the arm stalls against the cube.
  // Pistons never crush: being somewhere the arm wants to be is a
  // displacement, never a death.
  const pistons = [];
  const pistonCells = new Map(); // strike cell "x,z" -> piston
  const pistonFootprint = new Set();
  for (const [i, pn] of (def.pistons || []).entries()) {
    const [ax, az] = pn.at || [];
    const { dx, dz } = pn || {};
    if (!((Math.abs(dx) === 1 && dz === 0) || (Math.abs(dz) === 1 && dx === 0))) {
      throw new Error(`[${def.name}] piston ${i} needs a unit axis direction`);
    }
    const base = tiles.get(key(ax, az));
    if (!base) throw new Error(`[${def.name}] piston ${i} base ${ax},${az} is not a slab`);
    const sx = ax + dx;
    const sz = az + dz;
    const strike = tiles.get(key(sx, sz));
    if (!strike) throw new Error(`[${def.name}] piston ${i} strike cell ${sx},${sz} is not a slab`);
    for (const [t, what] of [[base, 'base'], [strike, 'strike cell']]) {
      if (t.shuttle || t.lift || t.door || t.plate || t.ice || t.spring || t.conveyor || t.crumble || t.timed || t.freeze || t.pulse || t.shrink || t.grow || t.low || t.piston || t.turntable) {
        throw new Error(`[${def.name}] piston ${i} ${what} stacked on another mechanic at ${t.x},${t.z}`);
      }
      if (t.x === startTile.x && t.z === startTile.z) throw new Error(`[${def.name}] piston ${i} ${what} on the start tile`);
      if (t.x === goalTile.x && t.z === goalTile.z) throw new Error(`[${def.name}] piston ${i} ${what} on the goal tile`);
      if (gateKey && gateKey.x === t.x && gateKey.z === t.z) throw new Error(`[${def.name}] piston ${i} ${what} on the key`);
      if (blockTiles.has(key(t.x, t.z))) throw new Error(`[${def.name}] piston ${i} ${what} under a block at ${t.x},${t.z}`);
      if (shards.some((s) => s.x === t.x && s.z === t.z)) throw new Error(`[${def.name}] piston ${i} ${what} stacked on a shard at ${t.x},${t.z}`);
    }
    for (const kk of [key(ax, az), key(sx, sz)]) {
      if (pistonFootprint.has(kk)) throw new Error(`[${def.name}] piston ${i} overlaps another piston's footprint at ${kk}`);
      pistonFootprint.add(kk);
    }
    const period = pn.period === undefined ? PISTON_PERIOD : pn.period;
    if (typeof period !== 'number' || !(period >= 1.6) || period > 8) {
      throw new Error(`[${def.name}] piston ${i} period must be a number in [1.6, 8] (got ${pn.period})`);
    }
    const phase = pn.phase === undefined ? 0 : pn.phase;
    if (typeof phase !== 'number' || !(phase >= 0) || phase >= 1) {
      throw new Error(`[${def.name}] piston ${i} phase must be a number in [0, 1) (got ${pn.phase})`);
    }
    const piston = { at: [ax, az], dx, dz, period, phase, strike: { x: sx, z: sz }, id: i };
    base.piston = { dx, dz, id: i };
    pistonCells.set(key(sx, sz), piston);
    pistons.push(piston);
  }

  // turntable cross cells stay pure: nothing else may live on the bar
  for (const k of turntableCells.keys()) {
    const t = tiles.get(k);
    if (t.shuttle || t.lift || t.door || t.plate || t.ice || t.spring || t.conveyor || t.crumble || t.timed || t.freeze || t.pulse || t.shrink || t.grow || t.low || t.piston) {
      throw new Error(`[${def.name}] turntable cell stacked on another mechanic at ${k}`);
    }
    if (t.x === startTile.x && t.z === startTile.z) throw new Error(`[${def.name}] turntable cell on the start tile`);
    if (t.x === goalTile.x && t.z === goalTile.z) throw new Error(`[${def.name}] turntable cell on the goal tile`);
    if (blockTiles.has(k)) throw new Error(`[${def.name}] turntable cell under a block at ${k}`);
    if (shards.some((s) => s.x === t.x && s.z === t.z)) throw new Error(`[${def.name}] turntable cell stacked on a shard at ${k}`);
  }

  // cling banks stay pure (Phase B, ADR-037): a grip face is plain
  // structure — no mechanic fires on the landing, no bar or piston owns the
  // handhold, and no sentinel patrols the climb. Checked LATE so every
  // mechanic parsed after the clings has already claimed its tiles.
  for (const kk of clingBanks) {
    const t = tiles.get(kk);
    if (!t) throw new Error(`[${def.name}] cling bank ${kk} is not a slab`);
    if (t.shuttle || t.lift || t.door || t.plate || t.ice || t.spring || t.conveyor || t.crumble || t.timed || t.freeze || t.pulse || t.shrink || t.grow || t.low || t.piston || t.turntable) {
      throw new Error(`[${def.name}] cling bank ${kk} carries another mechanic`);
    }
    if (t.x === goalTile.x && t.z === goalTile.z) throw new Error(`[${def.name}] cling bank ${kk} is the goal tile`);
    if (blockTiles.has(kk)) throw new Error(`[${def.name}] cling bank ${kk} is under a block`);
  }

  const wind = def.wind || null;
  // one drift force per level (Phase B, ADR-035): a breeze and a piston
  // arm would fight over the same idle cube — never both. A turntable
  // turns the floor itself; a breeze over it is the same fight.
  if (wind && (pistons.length || turntables.length)) {
    throw new Error(`[${def.name}] wind never shares a level with pistons or turntables`);
  }
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
    shuttles,
    shuttleDocks,
    lifts,
    liftDocks,
    iceTiles,
    springTiles,
    conveyorTiles,
    doors,
    timedTiles,
    freezes,
    freezeTiles,
    pulses,
    pulseTiles,
    boss,
    gateKey,
    shrinkPads,
    lowTiles,
    startMini,
    hasSize,
    pistons,
    pistonCells,
    turntables,
    turntableCells,
    clings: def.clings || [],
    clingCells,
    clingPairs,
    clingBanks,
    wind,
    nudge,
  };
}

/** The other dock of the shuttle whose platform stands on `tile` (or null). */
export function shuttleRide(level, tile) {
  if (!tile || !tile.shuttle) return null;
  const sh = level.shuttles[tile.shuttleId];
  if (!sh) return null;
  const onA = tile.x === sh.a[0] && tile.z === sh.a[1];
  const [ox, oz] = onA ? sh.b : sh.a;
  return level.tiles.get(key(ox, oz)) || null;
}

/**
 * Where does ONE press in direction d land the cube, after all automatic
 * follow-through:
 *  - a normal roll (roll law),
 *  - ICE: keeps sliding in the same direction while it lands on more ice,
 *  - SPRING: launches up to 3 tiles in the direction of travel, flying over
 *    void, landing on the first slab (height change up to 3); a failed
 *    launch (no slab within 3) is a fall — null.
 * Returns the final tile, or null when the press is illegal / lethal.
 * (Shuttle docks are plain tiles here: riding the platform is a separate,
 * explicit transition — see `shuttleRide`.)
 */
/** A spring launch from `pos` in direction d: fly over void up to 3 tiles,
 *  land on the first slab (height change up to 3). Null = a fall. */
function springLaunch(level, pos, d, mini = false) {
  let px = pos.x;
  let pz = pos.z;
  for (let k = 1; k <= 3; k++) {
    const cand = level.tiles.get(key(px + d.dx, pz + d.dz));
    px += d.dx;
    pz += d.dz;
    if (!cand) continue; // flew over void (or off the level)
    if (cand.door) continue; // a launch never lands on a door (M3 wave-1): it flies the doorway over
    if (cand.lift) continue; // nor on a lift (Phase B): it flies the shaft over
    if (cand.low && !mini) continue; // nor into a low tunnel at full size: it flies the tunnel mouth over
    const dh = cand.h - pos.h;
    if (dh > 3 || dh < -3) return null; // wall too tall / drop too deep
    return cand;
  }
  return null;
}

/** The cube's size after LANDING on `tile`, given the size it travelled
 *  with: a pad fires on every landing (shrink → mini, grow → full), any
 *  other tile keeps the travelling size (Phase B, ADR-034). */
export function sizeAfter(level, tile, mini) {
  const p = level.shrinkPads.get(key(tile.x, tile.z));
  return p === 'shrink' ? true : p === 'grow' ? false : !!mini;
}

/**
 * The cling edge a press from `from` in direction `d` takes, if the void
 * cell ahead is a declared grip crevice (Phase B, ADR-037). Null when the
 * press is an ordinary target or a plain fall. Both banks are audited at
 * parse, so this is a pure lookup — the one source of truth shared by the
 * resolver, the game and the live bot.
 */
export function clingTarget(level, from, d) {
  if (!level.clingPairs || !level.clingPairs.size) return null;
  return level.clingPairs.get(`${key(from.x, from.z)}|${d.dx},${d.dz}`) || null;
}

export function resolveRoll(level, from, d) {
  return resolveRollAt(level, from, d, false);
}

/**
 * One press by a cube of size `mini` (Phase B, ADR-034): `resolveRoll`
 * priced for the travelling size. The size is re-read after EVERY landing
 * inside the press (a pad fires the moment the cube rests on it), so an
 * ice slide that ends on a shrink pad stops mini, and a mini slide stops
 * at a tunnel mouth the full-size body cannot enter. At full size this is
 * exactly `resolveRoll` — the 200 shipped levels never see a difference.
 */
export function resolveRollAt(level, from, d, mini = false) {
  let size = !!mini;
  const land = (t) => {
    size = sizeAfter(level, t, size);
    return t;
  };
  const step = (pos, dir = d) => {
    const to = level.tiles.get(key(pos.x + dir.dx, pos.z + dir.dz));
    if (!to) {
      // CLINGING (Phase B, ADR-037): a press into a declared grip crevice
      // catches the far face and spans the gap in the same press. The
      // plain law would fall; the declared edge is the only thing that
      // carries it. (Grip banks are plain slabs by the parse audit, so the
      // size bit has nothing to price here.)
      return clingTarget(level, pos, dir);
    }
    if (!checkRoll(level, pos, to, size).ok) return null;
    // Dock-to-dock rolls do not exist in real play: a cube standing on a
    // shuttle platform can only RIDE to the far dock (shuttleRide) or step
    // onto a slab. Stepping onto another dock tile needs THAT platform
    // docked there at the same instant — for a different shuttle that is a
    // phase coincidence the static model cannot promise. L196 shipped two
    // shuttles with adjacent docks (16,9 / 16,8) and identical cycles, so
    // the transfer window never opened in real play and the level was
    // unplayable; the model, treating dock tiles as ordinary slabs, had
    // blessed it. Fixed 2026-11-13 (caught by the live gate).
    if ((pos.shuttle || pos.lift) && (to.shuttle || to.lift)) return null;
    return to;
  };
  let t;
  if (from.spring) {
    // the press STARTS on a spring: it launches instead of rolling
    t = springLaunch(level, from, d, size);
    if (!t) return null;
  } else {
    t = step(from);
    if (!t) return null;
  }
  land(t);
  // Automatic follow-through: the same press keeps resolving until the
  // cube rests on a plain tile. Each mechanic hands over to the next with
  // its own direction law:
  //   SPRING  — launches along the CURRENT travel direction; a failed
  //             launch (no slab within 3) is a fall (null). The game's
  //             autoContinue launches on ANY landing, slides and belt
  //             rides included (the old model let an ice slide stop on a
  //             pad, which blessed L68 "The Lost Stair" — every real
  //             play launched into the void; M2.5, fixed 2026-11-13).
  //   ICE     — keeps sliding in the current travel direction; a blocked
  //             step (wall/void edge) simply ends the slide on the ice.
  //   CONVEYOR (M3 wave-1) — the belt imposes ITS direction, and that
  //             becomes the travel direction for whatever follows (an
  //             ice run after a belt slides the belt's way). A blocked
  //             belt step leaves the cube resting on the belt tile.
  // Belt cycles are rejected at parse; the visited set also guards the
  // combined ice/belt/spring graph — a press that would loop forever
  // never rests, so it resolves to null and the level fails its proof.
  let dir = d;
  const fired = new Set();
  for (;;) {
    if (t.spring) {
      const kk = `P${t.x},${t.z}`;
      if (fired.has(kk)) return null;
      fired.add(kk);
      t = springLaunch(level, t, dir, size);
      if (!t) return null;
      land(t);
      continue;
    }
    if (t.ice) {
      const n = step(t, dir);
      if (!n) break;
      t = land(n);
      continue;
    }
    if (t.conveyor) {
      const kk = `C${t.x},${t.z}`;
      if (fired.has(kk)) return null;
      fired.add(kk);
      const n = step(t, t.conveyor);
      if (!n) break;
      dir = t.conveyor;
      t = land(n);
      continue;
    }
    break;
  }
  return t;
}

/**
 * Where can the cube END UP from `tile` via a mechanic transition — the
 * shuttle ride and the spring launches (ice carries are plain rolls and
 * need no special edge). Used by the fair-reach model, which otherwise
 * expands one adjacent tile at a time and cannot cross a hollowed pit or
 * span. (M2.5, 2026-11-12: the gauntlet spirals make such spans the ONLY
 * route crossing, so bench/timing checks rejected levels the game plays
 * fine — a false negative, verified with a mechanics-aware BFS.)
 */
export function mechanicTargets(level, tile) {
  const out = [];
  if (!tile) return out;
  const ride = shuttleRide(level, tile);
  if (ride) out.push(ride);
  if (tile.spring) {
    for (const d of Object.values(DIRS)) {
      const to = springLaunch(level, tile, d);
      if (to) out.push(to);
    }
  }
  // clinging (Phase B, ADR-037) spans a crevice in one press: without it
  // the fair-reach model would call a cling route unreachable
  for (const d of Object.values(DIRS)) {
    const to = clingTarget(level, tile, d);
    if (to) out.push(to);
  }
  return out;
}

/**
 * Can the cube roll from tile `from` to tile `to`?
 * You may fall up to MAX_DROP, or climb up to MAX_CLIMB.
 * Returns { ok, kind } where kind is 'flat' | 'drop' | 'climb' | 'void' | 'blocked'.
 */
export function checkRoll(level, from, to, mini = false) {
  if (!to) return { ok: false, kind: 'void' };
  // A low tunnel (Phase B, ADR-034) admits only the mini cube: at full
  // size the press is a bump, exactly like rolling into a wall. The size
  // bit rides the one roll predicate so every consumer (game, solver,
  // bot) prices tunnels identically; callers that predate the mechanic
  // get the full-size law by default.
  if (to.low && !mini) return { ok: false, kind: 'blocked' };
  // A piston base (Phase B, ADR-035) is machinery housing: a wall to
  // every press at any size. Its strike cell stays plain floor here —
  // the arm itself is priced only by the live game, never by a proof.
  if (to.piston) return { ok: false, kind: 'blocked' };
  // A door is a wall to every press that does not START on its plate
  // (M3 wave-1). Putting the law here — the one "can the cube roll
  // from→to" predicate — means resolveRoll, the reachability searches,
  // the game and the live bot all inherit it identically.
  if (to.door && !(from.x === to.door.x && from.z === to.door.z)) {
    return { ok: false, kind: 'blocked' };
  }
  // A lift dock (Phase B, ADR-033) dwells at two heights: statically a
  // step is legal if SOME dwell pairing satisfies the roll law — the
  // cube waits for the platform (on the bank, or riding it), exactly as
  // it waits for a shuttle. The live game never passes a lift-flagged
  // tile here (its cube carries the true height and isSolid hands over
  // the platform's actual dwell), so real presses price against the
  // height the platform truly shows; only the proofs use the two-dwell
  // law, and a proof may therefore ask for a wait, never for a climb.
  const fromH = from.lift ? [from.lift.low, from.lift.high] : [from.h];
  const toH = to.lift ? [to.lift.low, to.lift.high] : [to.h];
  let kind = null;
  for (const hf of fromH) {
    for (const ht of toH) {
      const delta = ht - hf;
      if (delta > MAX_CLIMB || -delta > MAX_DROP) continue;
      const k = delta === 0 ? 'flat' : delta > 0 ? 'climb' : 'drop';
      if (k === 'flat') return { ok: true, kind: k };
      kind = kind || k;
    }
  }
  return kind ? { ok: true, kind } : { ok: false, kind: 'blocked' };
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

/** Phase (0..1) of the pulse cycle at a tile: the seal sweeps diagonally. */
export function pulsePhase(t, x, z) {
  const offset = ((((x + z) % 4) + 4) % 4) / 4;
  const ph = (t / PULSE_PERIOD + offset) % 1;
  return ph < 0 ? ph + 1 : ph;
}

/** Is the pulsing gap at (x, z) sealed at time t? Non-pulse tiles: yes. */
export function pulseUp(level, t, x, z) {
  if (!level.pulseTiles.has(key(x, z))) return true;
  return pulsePhase(t, x, z) < PULSE_ON;
}

/**
 * Can `block` ({x, z, heavy}) be pushed by (dx, dz)?
 * Blocks only move onto plain slabs — never onto the goal, other blocks,
 * cracked slabs, sliders, or the key. A HEAVY block (M3 wave-1) is never
 * pushed uphill: its destination must sit at or below its current tile.
 * `occupied` is the set of "x,z" keys of every block right now (heaviness
 * and occupancy travel with the block, not with the tile); callers that
 * track live blocks pass it, the rest get the parsed start positions.
 */
export function canPushBlock(level, block, dx, dz, occupied = null) {
  const to = level.tiles.get(key(block.x + dx, block.z + dz));
  if (!to) return false;
  // blocks never press a pressure plate and never park in a doorway
  // (M3 wave-1: a door is the cube's weight alone)
  if (to.door || to.plate) return false;
  if (to.timed) return false; // nor rest on a timed slab (M3 wave-1)
  if (to.pulse) return false; // nor on a pulsing gap — it would blink out under the block
  if (to.lift) return false; // nor on a lift platform (Phase B) — it would ride away under the block
  if (to.piston) return false; // nor onto a piston base (Phase B): machinery housing
  if (to.turntable) return false; // nor onto a turntable (Phase B): the bar must turn free
  if (level.clingBanks.has(key(to.x, to.z))) return false; // nor onto a cling bank (ADR-037): the grip face stays clear
  if (to.low) return false; // nor into a low tunnel (Phase B): a block is full-size, it would never fit
  if (to.shrink || to.grow) return false; // nor park on a size pad — pads stay clear for the cube
  if (to.x === level.goal.x && to.z === level.goal.z) return false;
  if ((occupied || level.blockTiles).has(key(to.x, to.z))) return false;
  if (to.crumble) return false;
  if (level.sliderTiles.has(key(to.x, to.z))) return false;
  if (level.gateKey && to.x === level.gateKey.x && to.z === level.gateKey.z) return false;
  if (block.heavy) {
    const from = level.tiles.get(key(block.x, block.z));
    if (from && to.h > from.h) return false; // heavy: never uphill
  }
  return true;
}

/** Every tile reachable from the start, ignoring crumble timers and orbs. */
export function reachable(level, blocked = null) {
  const seen = new Set([key(level.start.x, level.start.z)]);
  if (!level.hasSize) {
    const queue = [level.start];
    while (queue.length) {
      const cur = queue.shift();
      const targets = rollTargets(level, cur);
      for (const to of targets) {
        const k = key(to.x, to.z);
        if (blocked && blocked.has(k)) continue; // e.g. the sealed goal
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(to);
        }
      }
    }
    return seen;
  }
  // sized: the same flood over (tile, size) states, projected to tiles —
  // a tile counts reachable when SOME size can stand on it
  const s0 = `${key(level.start.x, level.start.z)}|${level.startMini ? 'm' : 'n'}`;
  const states = new Set([s0]);
  const queue = [{ tile: level.start, mini: level.startMini }];
  while (queue.length) {
    const { tile, mini } = queue.shift();
    for (const s of rollTargetsAt(level, tile, mini)) {
      const k = key(s.to.x, s.to.z);
      if (blocked && blocked.has(k)) continue;
      const sk = `${k}|${s.mini ? 'm' : 'n'}`;
      if (!states.has(sk)) {
        states.add(sk);
        seen.add(k);
        queue.push({ tile: s.to, mini: s.mini });
      }
    }
  }
  return seen;
}

/**
 * All tiles a single player action can move the cube to from `cur`:
 * the four resolved rolls (ice slides / spring launches included) plus,
 * when standing on a shuttle dock, the ride to the far dock.
 */
export function rollTargets(level, cur) {
  const out = [];
  for (const [name, d] of Object.entries(DIRS)) {
    const to = resolveRoll(level, cur, d);
    if (to) out.push(to);
  }
  const ride = shuttleRide(level, cur);
  if (ride) out.push(ride);
  return out;
}

/**
 * The sized transitions (Phase B, ADR-034): every landing one press (or a
 * shuttle ride) can produce from `cur` travelled at size `mini`, each with
 * the size the cube ENDS that press in — a pad on the landing tile has
 * already fired. Searches on size levels carry (tile, size) states built
 * from these; searches on plain levels never call this.
 */
export function rollTargetsAt(level, cur, mini = false) {
  const out = [];
  for (const d of Object.values(DIRS)) {
    const to = resolveRollAt(level, cur, d, mini);
    if (to) out.push({ to, mini: sizeAfter(level, to, mini) });
  }
  const ride = shuttleRide(level, cur);
  if (ride) out.push({ to: ride, mini: !!mini }); // a ride never changes size
  return out;
}

/**
 * Tiles from which the goal can still be reached (reverse walk).
 * Any reachable tile that is NOT in this set is a soft-lock: the player can
 * get there and never finish. We require zero of those.
 */
export function canStillFinish(level) {
  if (level.hasSize) return canStillFinishSized(level);
  const prev = new Map();
  for (const tile of level.tiles.values()) {
    for (const to of rollTargets(level, tile)) {
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
 * The sized twin of canStillFinish: reverse-walk the (tile, size) graph
 * from BOTH goal sizes (the level is finished by standing on the goal at
 * either size), then project — a tile can still finish when at least one
 * of its size states can.
 */
function canStillFinishSized(level) {
  const prev = new Map(); // stateKey -> [stateKey]
  const sKey = (t, m) => `${key(t.x, t.z)}|${m ? 'm' : 'n'}`;
  for (const tile of level.tiles.values()) {
    for (const m of [false, true]) {
      if (tile.low && !m) continue; // an illegal state has no futures
      // pads fire on landing, so some states can never be STOOD in: a
      // shrink pad is only ever occupied mini, a grow pad only ever full.
      // Their phantom futures must not paper over a real size soft-lock
      // (grow inside a low room and every exit is a tunnel mouth).
      if (tile.shrink && !m) continue;
      if (tile.grow && m) continue;
      for (const s of rollTargetsAt(level, tile, m)) {
        const tk = sKey(s.to, s.mini);
        if (!prev.has(tk)) prev.set(tk, []);
        prev.get(tk).push(sKey(tile, m));
      }
    }
  }
  const seenStates = new Set([sKey(level.goal, false), sKey(level.goal, true)]);
  const queue = [...seenStates];
  while (queue.length) {
    const cur = queue.shift();
    for (const from of prev.get(cur) || []) {
      if (!seenStates.has(from)) {
        seenStates.add(from);
        queue.push(from);
      }
    }
  }
  const seen = new Set([key(level.goal.x, level.goal.z)]);
  for (const sk of seenStates) seen.add(sk.split('|')[0]);
  return seen;
}

/**
 * Shortest number of rolls from start to goal (BFS over legal moves).
 * Used as the level's "par" — clearing in exactly this many rolls is a par run.
 *
 * Key-aware: on gateKey levels a sealed gate is impassable before the key is
 * in your pocket (the game rejects any roll onto it), so the player's minimum
 * for the full start→goal journey is the shortest start→key→goal, not the
 * bare start→goal (which may cut straight through the sealed goal tile).
 */
export function shortestRoute(level, start = level.start, goal = level.goal) {
  const startMini = start === level.start ? level.startMini : false;
  const isFullJourney =
    level.gateKey &&
    start.x === level.start.x && start.z === level.start.z &&
    goal.x === level.goal.x && goal.z === level.goal.z;
  if (isFullJourney) {
    const keyTile = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
    if (keyTile) {
      // the key leg hands its ARRIVAL size to the goal leg (the size bit
      // composes across the pickup, ADR-034)
      const a = bfsRolls(level, start, keyTile, startMini);
      if (a.dist < 0) return -1;
      const b = bfsRolls(level, keyTile, goal, a.endMini);
      return b.dist < 0 ? -1 : a.dist + b.dist;
    }
  }
  return bfsRolls(level, start, goal, startMini).dist;
}
/**
 * BFS over presses from `start` (entered at size `startMini`) to `goal`.
 * On size levels the state is (tile, size); on plain levels the size bit
 * is constant and the search is the classic tile BFS. Returns
 * { dist, endMini } — the size the cube stands in on arrival (-1 dist
 * when unreachable, endMini then meaningless).
 */
function bfsRolls(level, start, goal, startMini = false) {
  const goalKey = key(goal.x, goal.z);
  const startKey = key(start.x, start.z);
  if (startKey === goalKey) return { dist: 0, endMini: !!startMini };
  if (!level.hasSize) {
    const dist = new Map([[startKey, 0]]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      const d = dist.get(key(cur.x, cur.z));
      for (const to of rollTargets(level, cur)) {
        const k = key(to.x, to.z);
        if (dist.has(k)) continue;
        dist.set(k, d + 1);
        if (k === goalKey) return { dist: d + 1, endMini: false };
        queue.push(to);
      }
    }
    return { dist: -1, endMini: false };
  }
  const sKey = (k, m) => `${k}|${m ? 'm' : 'n'}`;
  const dist = new Map([[sKey(startKey, startMini), 0]]);
  const queue = [{ tile: start, mini: !!startMini }];
  while (queue.length) {
    const { tile, mini } = queue.shift();
    const d = dist.get(sKey(key(tile.x, tile.z), mini));
    for (const s of rollTargetsAt(level, tile, mini)) {
      const k = key(s.to.x, s.to.z);
      const sk = sKey(k, s.mini);
      if (dist.has(sk)) continue;
      dist.set(sk, d + 1);
      if (k === goalKey) return { dist: d + 1, endMini: s.mini };
      queue.push({ tile: s.to, mini: s.mini });
    }
  }
  return { dist: -1, endMini: false };
}

/**
 * The shortest press-path as a list of landing tiles (start … goal). Each
 * step is one press (resolveRoll semantics, so an ice slide or spring
 * launch is one step landing on the far tile). `path.length - 1` ===
 * shortestRoute. Null when the goal is unreachable.
 */
export function shortestPath(level, start = level.start, goal = level.goal, blocked = null) {
  // key-aware for the full journey (mirrors shortestRoute): on gateKey
  // levels the player must collect the key before the sealed gate opens, so
  // the journey is start → key → goal. The key leg hands its arrival size
  // to the goal leg (ADR-034), so the legs run through the sized engine.
  const startMini = start === level.start ? level.startMini : false;
  const isFullJourney =
    level.gateKey && blocked == null &&
    start.x === level.start.x && start.z === level.start.z &&
    goal.x === level.goal.x && goal.z === level.goal.z;
  if (isFullJourney) {
    const keyTile = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
    if (keyTile) {
      const a = bfsPath(level, start, keyTile, startMini, new Set([key(level.goal.x, level.goal.z)]));
      const b = a && bfsPath(level, keyTile, goal, a.endMini, null);
      if (a && b) return [...a.path, ...b.path.slice(1)];
      return null;
    }
  }
  const r = bfsPath(level, start, goal, startMini, blocked);
  return r ? r.path : null;
}
/**
 * The sized path engine behind shortestPath: BFS over (tile, size) states
 * (plain tile BFS when the level has no size mechanic). Returns
 * { path, endMini } or null.
 */
function bfsPath(level, start, goal, startMini, blocked) {
  const goalKey = key(goal.x, goal.z);
  const startKey = key(start.x, start.z);
  if (startKey === goalKey) return { path: [start], endMini: !!startMini };
  const sKey = (k, m) => (level.hasSize ? `${k}|${m ? 'm' : 'n'}` : k);
  const prev = new Map([[sKey(startKey, startMini), null]]);
  const tileOf = new Map([[sKey(startKey, startMini), start]]);
  const queue = [{ tile: start, mini: !!startMini }];
  while (queue.length) {
    const { tile, mini } = queue.shift();
    const ck = sKey(key(tile.x, tile.z), mini);
    const steps = level.hasSize
      ? rollTargetsAt(level, tile, mini)
      : rollTargets(level, tile).map((to) => ({ to, mini: false }));
    for (const s of steps) {
      const k = key(s.to.x, s.to.z);
      const sk = sKey(k, s.mini);
      if (prev.has(sk)) continue;
      if (blocked && blocked.has(k) && k !== goalKey) continue; // sealed gate
      prev.set(sk, ck);
      tileOf.set(sk, s.to);
      if (k === goalKey) {
        const path = [s.to];
        let kk = ck;
        while (kk) {
          path.push(tileOf.get(kk));
          kk = prev.get(kk);
        }
        return { path: path.reverse(), endMini: s.mini };
      }
      queue.push({ tile: s.to, mini: s.mini });
    }
  }
  return null;
}

/**
 * The mid-path rescue bench: the landing tile at the 50% press count of
 * the shortest path, adjusted to the nearest SAFE tile along that path
 * (safe = not on a sentinel line, not a crumble, not a shuttle dock, not
 * ice, not a spring). On gateKey levels the key must sit on the proven
 * path strictly before the bench — otherwise the level ships without a
 * bench. Null when the level is too short for one to matter (≤ 4
 * presses) or no safe tile exists.
 */
export function rescueTile(level) {
  let path = shortestPath(level);
  let keyIdx = -1;
  if (level.gateKey) {
    // the bench must sit PAST the key: measure the path through the key
    // (start → key → goal), because a player 50% along that journey has
    // necessarily picked the key up
    const keyTile = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
    // sealed gate: the start→key leg may not pass through the goal tile
    const a = keyTile
      ? shortestPath(level, level.start, keyTile, new Set([key(level.goal.x, level.goal.z)]))
      : null;
    const b = keyTile ? shortestPath(level, keyTile, level.goal) : null;
    if (!a || !b) return null;
    path = [...a, ...b.slice(1)];
    keyIdx = a.length - 1;
  }
  if (!path || path.length < 6) return null;
  const { line } = lineRuns(level);
  const isSafe = (t) => {
    const k = key(t.x, t.z);
    // never a low tunnel or a size pad: the bench re-places the cube at
    // full size (ADR-034), so it must be a tile full size may stand on,
    // and standing there must not silently flip the cube's size
    return !line.has(k) && !t.shuttle && !t.lift && !t.crumble && !t.ice && !t.spring && !t.conveyor && !t.door && !t.timed && !t.pulse && !t.low && !t.shrink && !t.grow && !t.piston && !level.pistonCells.has(k) && !t.turntable;
  };
  const mid = Math.floor((path.length - 1) / 2); // 50% of the press count
  for (let r = 0; r < mid; r++) {
    for (const idx of [mid - r, mid + r]) {
      if (idx <= 0 || idx >= path.length - 1) continue; // strictly inside
      if (keyIdx >= 0 && idx <= keyIdx) continue; // bench sits past the key
      if (isSafe(path[idx])) return path[idx];
    }
  }
  return null;
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
  // heaviness is part of a block's identity in the state signature: two
  // layouts with the same block POSITIONS but different heavy blocks on
  // them have different futures (M3 wave-1)
  const blockSig = (blocks) => blocks.map((b) => key(b.x, b.z) + (b.heavy ? 'h' : '')).sort().join(';');
  const startBlocks = level.blocks.map((b) => ({ x: b.x, z: b.z, heavy: !!b.heavy }));
  // the cube's size rides the state signature (Phase B, ADR-034): two
  // visits of one tile at different sizes are different futures — one of
  // them fits through the tunnel ahead
  const startState = `${key(start.x, start.z)}|${blockSig(startBlocks)}|${level.nudge}|${level.startMini ? 'm' : 'n'}`;
  const queue = [[start, new Set(), startBlocks, level.nudge, level.startMini]];
  const seen = new Set([startState]);
  let guard = 0;
  while (queue.length) {
    if (++guard > 400000) return { ok: false, capped: true };
    const [tile, broken, blocks, left, mini] = queue.shift();
    if (tile.x === level.goal.x && tile.z === level.goal.z) return { ok: true };
    // riding the shuttle: one action, no roll law (the platform carries you)
    const ride = shuttleRide(level, tile);
    if (ride) {
      const sig = `${key(ride.x, ride.z)}|${blockSig(blocks)}|${left}|${mini ? 'm' : 'n'}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        queue.push([ride, broken, blocks, left, mini]);
      }
    }
    for (const [name, d] of Object.entries(DIRS)) {
      const tx = tile.x + d.dx;
      const tz = tile.z + d.dz;
      const bk = key(tx, tz);
      const blockIdx = blocks.findIndex((b) => b.x === tx && b.z === tz);

      if (blockIdx >= 0) {
        // A block is in the way: the cube stays, the block slides (costs a nudge).
        if (left <= 0) continue;
        const b = blocks[blockIdx];
        const occupied = new Set(blocks.map((p) => key(p.x, p.z)));
        if (!canPushBlock(level, b, d.dx, d.dz, occupied)) continue;
        const nb = blocks.map((p, i) => (i === blockIdx ? { ...p, x: b.x + d.dx, z: b.z + d.dz } : p));
        const sig = `${key(tile.x, tile.z)}|${blockSig(nb)}|${left - 1}|${mini ? 'm' : 'n'}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        queue.push([tile, broken, nb, left - 1, mini]);
        continue;
      }

      // resolve the press: ice slides / spring launches may carry the cube
      // several tiles in the same action
      const to = resolveRollAt(level, tile, d, mini);
      if (!to) continue;
      const tk = key(to.x, to.z);
      if (broken.has(tk)) continue;
      // a timed slab is modeled exactly like a crumble (gone once you
      // step off it): real play grants TIMED_FUSE of standing/recrossing
      // grace, so the model stays the conservative side of the game
      const nextBroken = tile.crumble || tile.timed ? new Set([...broken, key(tile.x, tile.z)]) : broken;
      const sig = `${tk}|${blockSig(blocks)}|${left}|${sizeAfter(level, to, mini) ? 'm' : 'n'}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      queue.push([to, nextBroken, blocks, left, sizeAfter(level, to, mini)]);
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
    // boss arenas (M3): the phase triggers with the cube standing ON the
    // key — a wave-2 sentinel wakes at its patrol start, so that start
    // must leave the cube room to move (2 tiles ≈ a roll and a half of
    // head start at boss speed; the escape route itself is timing-proven)
    for (const orb of level.orbs) {
      if (!orb.wave) continue;
      const [sx, sz] = orb.path[0];
      const d = Math.hypot(sx - level.gateKey.x, sz - level.gateKey.z);
      if (d < 2) probs.push(`boss wave-2 sentinel spawns ${d.toFixed(1)} tiles from the key`);
    }
  }
  // shuttle docks: the platform is the only thing solid there — nothing
  // static may depend on it or be depended on by it. (shuttleDocks is a Set
  // of "x,z" KEY STRINGS — M2.5, fixed 2026-11-12: the old loop destructured
  // each string into [x, z], i.e. took its first two CHARACTERS, so dock
  // "15,14" was checked as tile (1,5) and false-flagged "ice on a shuttle
  // dock 1,5"; the start/goal comparisons also mixed strings and numbers and
  // could never fire.)
  for (const dock of level.shuttleDocks) {
    const [x, z] = dock.split(',').map(Number);
    if (x === level.start.x && z === level.start.z) probs.push('shuttle dock on the start tile');
    if (x === level.goal.x && z === level.goal.z) probs.push('shuttle dock on the goal tile');
    for (const s of level.shards) if (s.x === x && s.z === z) probs.push(`shard on a shuttle dock ${x},${z}`);
    if (level.iceTiles.has(key(x, z))) probs.push(`ice on a shuttle dock ${x},${z}`);
    if (level.springTiles.has(key(x, z))) probs.push(`spring on a shuttle dock ${x},${z}`);
    for (const orb of level.orbs) {
      if (orb.path.some(([px, pz]) => px === x && pz === z)) {
        probs.push(`orb patrols a shuttle dock ${x},${z}`);
      }
    }
  }
  // an ice slide must not skate through a sentinel's clearance — check the
  // ice tile itself (the cube rests there a beat) and every tile the slide
  // carries it through
  for (const ik of level.iceTiles) {
    const [ix, iz] = ik.split(',').map(Number);
    for (const [name, d] of Object.entries(DIRS)) {
      let px = ix;
      let pz = iz;
      let guard = 0;
      for (;;) {
        for (const orb of level.orbs) {
          for (const [ox, oz] of orb.path) {
            if (Math.max(Math.abs(ox - px), Math.abs(oz - pz)) <= 1) {
              probs.push(`ice at ${ik} slides through sentinel clearance`);
            }
          }
        }
        if (guard++ >= 6) break;
        const t = level.tiles.get(key(px + d.dx, pz + d.dz));
        if (!t || !t.ice) break;
        px += d.dx;
        pz += d.dz;
      }
    }
  }
  // a shuttle's transit corridor flies at dock height: a sentinel one tile
  // away could kill a rider mid-drive
  for (const sh of level.shuttles) {
    let gx = sh.a[0] + sh.dx;
    let gz = sh.a[1] + sh.dz;
    while (gx !== sh.b[0] || gz !== sh.b[1]) {
      for (const orb of level.orbs) {
        for (const [ox, oz] of orb.path) {
          if (Math.max(Math.abs(ox - gx), Math.abs(oz - gz)) <= 1) {
            probs.push(`shuttle drive passes within sentinel clearance`);
          }
        }
      }
      gx += sh.dx;
      gz += sh.dz;
    }
  }
  // lift docks (Phase B, ADR-033): the platform is the only thing solid
  // in the shaft — no sentinel may patrol the dock, and no slide, belt or
  // launch tile may feed it (follow-through cannot wait for a dwell, so
  // the shaft is only ever entered by a deliberate press).
  for (const dock of level.liftDocks) {
    const [x, z] = dock.split(',').map(Number);
    for (const orb of level.orbs) {
      if (orb.path.some(([px, pz]) => px === x && pz === z)) {
        probs.push(`orb patrols a lift dock ${x},${z}`);
      }
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = level.tiles.get(key(x + dx, z + dz));
      if (n && (n.ice || n.spring || n.conveyor)) probs.push(`lift dock ${x},${z} is fed by a slide/belt/launch tile`);
    }
  }
  // a spring launch must not fly through or land near a sentinel: the flight
  // stays under the kill height, so a patrol in the corridor is a mid-air kill
  for (const sk of level.springTiles) {
    const [sx, sz] = sk.split(',').map(Number);
    for (const [name, d] of Object.entries(DIRS)) {
      let px = sx;
      let pz = sz;
      for (let k = 1; k <= 3; k++) {
        px += d.dx;
        pz += d.dz;
        const t = level.tiles.get(key(px, pz));
        for (const orb of level.orbs) {
          for (const [ox, oz] of orb.path) {
            if (Math.max(Math.abs(ox - px), Math.abs(oz - pz)) <= 1) {
              probs.push(`spring at ${sk} can launch into sentinel clearance`);
            }
          }
        }
        if (t) break; // lands here
      }
    }
  }
  // a conveyor carries the cube through every belt tile and onto the first
  // plain tile beyond the belt — none of that carried path may sit inside
  // a sentinel's clearance (the cube cannot choose to stop mid-belt)
  for (const ck of level.conveyorTiles) {
    let t = level.tiles.get(ck);
    let guard = 0;
    const seen = new Set();
    while (t && !seen.has(key(t.x, t.z))) {
      seen.add(key(t.x, t.z));
      for (const orb of level.orbs) {
        for (const [ox, oz] of orb.path) {
          if (Math.max(Math.abs(ox - t.x), Math.abs(oz - t.z)) <= 1) {
            probs.push(`conveyor at ${ck} carries through sentinel clearance`);
          }
        }
      }
      if (!t.conveyor || guard++ > 64) break;
      t = level.tiles.get(key(t.x + t.conveyor.dx, t.z + t.conveyor.dz));
    }
  }
  // a timed slab falls TIMED_FUSE after the first landing — it must
  // never be a tile the player may need to WAIT on: not in a sentinel's
  // clearance (crossing entries and refuges hug the patrol line), not
  // beside a shuttle dock (boarding is a wait), not beside a sliding
  // bridge (ditto). Anywhere else a proven route just walks across it.
  {
    const { line } = lineRuns(level);
    for (const tk of level.timedTiles) {
      const [tx, tz] = tk.split(',').map(Number);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const nk = key(tx + ox, tz + oz);
          const nt = level.tiles.get(nk);
          if (line.has(nk)) probs.push(`timed slab at ${tk} waits inside sentinel clearance`);
          if (nt && nt.shuttle) probs.push(`timed slab at ${tk} beside a shuttle dock`);
          if (level.sliderTiles.has(nk)) probs.push(`timed slab at ${tk} beside a sliding bridge`);
        }
      }
    }
  }
  // piston pushers (Phase B, ADR-035): the strike cell is plain floor in
  // every proof, so — like a timed slab — it must never be a tile the
  // player may need to WAIT on (crossing entries and refuges hug the
  // patrol line; boarding and bridge waits hug their machinery), and no
  // patrol may cross the machinery itself.
  {
    const { line } = lineRuns(level);
    for (const pn of level.pistons) {
      const bk = key(pn.at[0], pn.at[1]);
      const sk = key(pn.strike.x, pn.strike.z);
      if (line.has(bk)) probs.push(`sentinel patrols a piston base ${bk}`);
      if (line.has(sk)) probs.push(`sentinel patrols a piston strike cell ${sk}`);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const nk = key(pn.strike.x + ox, pn.strike.z + oz);
          const nt = level.tiles.get(nk);
          if (line.has(nk)) probs.push(`piston strike cell at ${sk} waits inside sentinel clearance`);
          if (nt && nt.shuttle) probs.push(`piston strike cell at ${sk} beside a shuttle dock`);
          if (nt && nt.lift) probs.push(`piston strike cell at ${sk} beside a lift dock`);
          if (level.sliderTiles.has(nk)) probs.push(`piston strike cell at ${sk} beside a sliding bridge`);
        }
      }
    }
  }
  // turntable bridges (Phase B, ADR-036): the cross cells are plain
  // floor in every proof but timed in the live game, so a patrol may
  // never cross the bar (a crossing burst cannot price the sweep), and
  // no conveyor may feed it (a belt landing must be provably solid).
  {
    const { line } = lineRuns(level);
    for (const tt of level.turntables) {
      const cross = [[tt.at[0], tt.at[1]], [tt.at[0] + 1, tt.at[1]], [tt.at[0] - 1, tt.at[1]], [tt.at[0], tt.at[1] + 1], [tt.at[0], tt.at[1] - 1]];
      for (const [cx, cz] of cross) {
        if (line.has(key(cx, cz))) probs.push(`sentinel patrols a turntable cell ${cx},${cz}`);
      }
    }
    for (const t of level.tiles.values()) {
      if (!t.conveyor) continue;
      const ahead = level.tiles.get(key(t.x + t.conveyor.dx, t.z + t.conveyor.dz));
      if (ahead && ahead.turntable) probs.push(`conveyor at ${t.x},${t.z} feeds a turntable`);
    }
  }
  // size pads and low tunnels vs the patrol line (Phase B, ADR-034): the
  // fairness model simulates crossing bursts as pure geometry, so a pad
  // sitting on the line would flip the cube's size mid-burst, and a line
  // running through a low tunnel would promise full-size rolls the cube
  // cannot make. Neither ever reaches the timing model.
  {
    const { line } = lineRuns(level);
    for (const k of line) {
      const t = level.tiles.get(k);
      if (t && t.low) probs.push(`sentinel patrols a low tunnel tile ${k}`);
      if (t && (t.shrink || t.grow)) probs.push(`size pad on a sentinel patrol line at ${k}`);
    }
  }
  // cling banks (Phase B, ADR-037): a sentinel patrolling a grip face
  // would kill the climb mid-hang — the hang has no waiting spot and the
  // crossing model cannot price it (the generator keeps radius-1
  // clearance via mechSet, this is the backstop)
  for (const kk of level.clingBanks) {
    const [x, z] = kk.split(',').map(Number);
    for (const orb of level.orbs) {
      if (orb.path.some(([px, pz]) => px === x && pz === z)) probs.push(`sentinel patrols a cling bank ${kk}`);
    }
  }
  // a pulsing gap holds for PULSE_ON of a cycle — like a timed slab it
  // must never be a tile the player may need to WAIT on (same audit).
  {
    const { line } = lineRuns(level);
    for (const tk of level.pulseTiles) {
      const [tx, tz] = tk.split(',').map(Number);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const nk = key(tx + ox, tz + oz);
          const nt = level.tiles.get(nk);
          if (line.has(nk)) probs.push(`pulsing gap at ${tk} waits inside sentinel clearance`);
          if (nt && nt.shuttle) probs.push(`pulsing gap at ${tk} beside a shuttle dock`);
          if (level.sliderTiles.has(nk)) probs.push(`pulsing gap at ${tk} beside a sliding bridge`);
        }
      }
    }
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
export const ROLL_TIME = 0.243; // player-directed 2026-11-07: 30% slower cube (0.17 → 0.243 s ≈ 5.88 → 4.12 tiles/s)
/** Horizontal kill radius of a sentinel — the law of the game's collision. */
export const ORB_KILL_RADIUS = 0.62;
/**
 * The smallest safe-start window a crossing may offer. Below this, a human
 * cannot reliably catch the gap (it reads as a trap, not a challenge).
 */
export const TIMING_FLOOR = 0.5;

/**
 * Sentinel-freeze shard (M3 wave-1): landing on one freezes every
 * sentinel for FREEZE_TIME real seconds. The fairness model counts the
 * freeze in PRESSES, not seconds: a freeze-assisted crossing is fair
 * when (presses from the pickup to the crossing entry) + (the burst)
 * fits FREEZE_PRESS_BUDGET — at hurried cadence (≤ ~0.35 s/press,
 * against the 0.243 s roll floor) 8 presses ≈ 2.8 s, inside the 3.2 s
 * freeze with the exit margin to spare.
 */
export const FREEZE_TIME = 3.2;
export const FREEZE_PRESS_BUDGET = 8;
/**
 * A live commit does not run on one ideal timeline — its press schedule
 * varies with load (bot loop latency, a human's reaction), and the game's
 * queue rules make the fast and the slow cases DIFFERENT, not the same
 * schedule shifted. `commitSchedules` returns both bounds; the true
 * schedule always lies between them, so a crossing is proven safe only if
 * the whole band of possible cube positions clears every sentinel at
 * every substep (L7 "Weave", 2026-11-08: the single-trajectory model
 * assumed a re-press gap before EVERY continuation roll, but the commit
 * pre-queues one continuation during the previous roll — the real cube
 * reached the patrol line ~0.25 s EARLIER than the model had it and died
 * on a substep the model never covered; L60 "Below the Cloudline": the
 * opposite edge, where throttled loops make the real cube LATER — both
 * edges are real deaths).
 *
 * Fast bound (driveCommit, ADR-018): roll 0 is pressed; every press
 * pre-queues the next roll during the animation (the game queue dedupes
 * same-direction entries and holds at most 2), so the next roll starts
 * the instant the previous one ends — unless that roll's own pre-queue
 * came from a roll that was itself pre-queued (not pressed), and the
 * direction repeats, in which case one bot loop (poll + re-press) is
 * required. Slow bound: no pre-queue credit at all — every continuation
 * roll is a fresh reaction/loop.
 */
/**
 * Fast bound: the bot's warm-loop minimum — one poll + two evaluates +
 * press + a frame before the first roll starts, and the same for a
 * re-press loop. Slow bound: a (somewhat slow) human's commit — decision
 * to first swipe, then a swipe rhythm after each roll (a human has no
 * queue to ride: every continuation is a fresh swipe).
 */
/**
 * Arc slack, in TILES: the cube mesh traces a pivot arc during a roll, so
 * its x/z progress along the roll axis LEADS or LAGS the linear chord
 * (progress = a.t) by at most this much (measured over the eased 90°
 * pivot: max ≈ 0.119, rounded up to 0.12). The sentinel kill test runs on
 * the MESH position, so the band must extend ARC_SLACK past both progress
 * bounds (2026-11-09 forensics, L7/L179).
 */
export const ARC_SLACK = 0.12;

/**
 * Fast bound — the EARLIEST the committed path can be covered, measured in
 * seconds of GAME time after the safety poll:
 *  - the press executes SYNCHRONOUSLY (roll creation in the same frame as
 *    the poll — forensics 2026-11-09, L7: old 0.06 was ~4× the real delay);
 *  - a pre-queued roll starts on the frame AFTER the previous roll
 *    finishes (one pump frame), and a re-pressed roll needs a full bot
 *    loop — both ≥ 0, so the earliest schedule chains rolls back-to-back;
 *  - the bot's re-press gap can run a hair under a clamped frame in game
 *    time (fast throttling), so no positive loop slack may be assumed —
 *    any residual is covered by ARC_SLACK on the fast edge.
 * Soundness: for every real press pattern the true logical progress
 * p(u) ≤ fastProgress(u), so the fast edge never sits behind the cube.
 *
 * Slow bound: a (somewhat slow) human's commit — reaction to the first
 * swipe, then a swipe rhythm after each roll (a human has no queue to
 * ride: every continuation is a fresh swipe).
 */
export const COMMIT_FAST_PRESS = 0.0;
export const COMMIT_FAST_LOOP = 0.0;
export const COMMIT_SLOW_PRESS = 0.35;
export const COMMIT_SLOW_LOOP = 0.4;

/**
 * Start times of the K rolls for the fast and slow bounds. dirs[k] is the
 * direction of roll k ('up'/'down'/'left'/'right'). Fast: roll 0 starts
 * COMMIT_FAST_PRESS after the safety poll; a roll starts the moment the
 * previous one ends when it was pre-queued by a PRESS (its own, or the
 * press two rolls back covering two slots), otherwise it waits one
 * COMMIT_FAST_LOOP for the bot to re-press. Slow: every roll after the
 * first waits COMMIT_SLOW_LOOP.
 */
export function commitSchedules(dirs) {
  const fast = [COMMIT_FAST_PRESS];
  const slow = [COMMIT_SLOW_PRESS];
  const pressed = [true];
  for (let k = 1; k < dirs.length; k++) {
    const prequeued =
      pressed[k - 1] || (k >= 2 && pressed[k - 2] && dirs[k] !== dirs[k - 1]);
    pressed[k] = !prequeued;
    fast[k] = fast[k - 1] + ROLL_TIME + (prequeued ? 0 : COMMIT_FAST_LOOP);
    slow[k] = slow[k - 1] + ROLL_TIME + COMMIT_SLOW_LOOP;
  }
  return { fast, slow };
}

/** Cube position on `path` at progress p (tiles along the path, 0..N). */
export function bandPos(path, p) {
  if (p <= 0) return { x: path[0].x, z: path[0].z };
  const n = path.length - 1;
  if (p >= n) {
    const e = path[n];
    return { x: e.x, z: e.z };
  }
  const i = Math.floor(p);
  const f = p - i;
  return {
    x: path[i].x + (path[i + 1].x - path[i].x) * f,
    z: path[i].z + (path[i + 1].z - path[i].z) * f,
  };
}

/** Progress (tiles along the path) at real time u for one schedule. */
export function bandProgress(path, sched, u) {
  let p = 0;
  for (let k = 0; k < sched.length; k++) {
    if (u >= sched[k] + ROLL_TIME) {
      p = k + 1;
      continue;
    }
    if (u > sched[k]) return k + (u - sched[k]) / ROLL_TIME;
    return p; // resting before this roll starts (or before the first press)
  }
  return path.length - 1;
}

/**
 * The cube's possible PROGRESS range (tiles along `path`) at real time u
 * since the safety poll. The true logical progress always lies between
 * `slowProgress(u)` and `fastProgress(u)` (fast = earliest schedule, see
 * the constants above); the mesh additionally sits up to ARC_SLACK ahead
 * of / behind its logical progress (pivot-arc lead and lag), so both
 * bounds are extended by ARC_SLACK and clamped to the path.
 */
export function commitBandProgress(path, sched, u) {
  const n = path.length - 1;
  const clamp = (p) => (p < 0 ? 0 : p > n ? n : p);
  return {
    a: clamp(bandProgress(path, sched.slow, u) - ARC_SLACK),
    b: clamp(bandProgress(path, sched.fast, u) + ARC_SLACK),
  };
}

/**
 * The cube's possible positions at real time u since the safety poll:
 * the band's two endpoints (identical when the bounds agree).
 */
export function commitBand(path, sched, u) {
  const { a, b } = commitBandProgress(path, sched, u);
  return { a: bandPos(path, a), b: bandPos(path, b) };
}

/**
 * Squared distance from (px, pz) to the PATH POLYLINE between the band's
 * progress bounds. The cube can sit on any tile-center-to-tile-center
 * segment in between — including the CORNER tiles a straight chord between
 * the endpoints would cut across (forensics 2026-11-09, L179 "The Pincer":
 * fast edge already on the third roll, slow edge still on the first — the
 * chord passed 0.31 tiles past the corner tile the real cube sat on, so a
 * sentinel inside its kill radius of that corner was reported safe and
 * killed the cube).
 */
export function commitBandDistR2(path, sched, u, px, pz) {
  const { a, b } = commitBandProgress(path, sched, u);
  const pts = [bandPos(path, a)];
  for (let i = Math.floor(a) + 1; i < Math.ceil(b); i++) {
    pts.push({ x: path[i].x, z: path[i].z });
  }
  const end = bandPos(path, b);
  const last = pts[pts.length - 1];
  if (last.x !== end.x || last.z !== end.z) pts.push(end);
  if (pts.length === 1) return pointSegDistR2(px, pz, pts[0].x, pts[0].z, pts[0].x, pts[0].z);
  let min = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const d2 = pointSegDistR2(px, pz, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
    if (d2 < min) min = d2;
  }
  return min;
}

/** Squared distance from (px,pz) to the segment (ax,az)–(bx,bz). */
export function pointSegDistR2(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const l2 = abx * abx + abz * abz;
  let f = l2 > 1e-9 ? ((px - ax) * abx + (pz - az) * abz) / l2 : 0;
  f = Math.max(0, Math.min(1, f));
  const dx = px - (ax + abx * f);
  const dz = pz - (az + abz * f);
  return dx * dx + dz * dz;
}

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

  // boss arenas (M3): the proof runs every patrol at phase-2 speed with
  // wave-2 sentinels awake — the hardest the arena ever gets (ADR-029)
  const speedMul = level.boss ? level.boss.speed : 1;
  const T = Math.max(...orbs.map((o) => orbPeriod(o.path, o.speed * speedMul)));
  const HORIZON = orbs.length > 1 ? 2 * T : T; // joint cycle for several sentinels
  const rolls = path.length - 1;
  const R2 = ORB_KILL_RADIUS * ORB_KILL_RADIUS;

  // The commit's press-schedule BAND: the true schedule (pre-queued
  // continuations, bot-loop re-presses, a human's reaction) always lies
  // between the fast and the slow bounds, so the whole band of possible
  // cube positions must clear every sentinel at every substep — a window
  // that only one specific schedule could catch is a pixel-timing trap
  // (ADR-018).
  const dirs = [];
  for (let k = 0; k < rolls; k++) {
    const a = path[k];
    const b = path[k + 1];
    dirs.push(b.z < a.z ? 'up' : b.z > a.z ? 'down' : b.x < a.x ? 'left' : 'right');
  }
  const sched = commitSchedules(dirs);
  const safeStart = (t0) => {
    const end = sched.slow[sched.slow.length - 1] + ROLL_TIME + 0.18;
    const n = Math.ceil((end * TIMING_SUBSTEPS) / ROLL_TIME);
    for (let s = 0; s <= n; s++) {
      const t = t0 + (s / TIMING_SUBSTEPS) * ROLL_TIME;
      for (let oi = 0; oi < orbs.length; oi++) {
        const o = orbs[oi];
        const op = orbPositionT(tables[oi], o.speed * speedMul, o.phase, t);
        if (commitBandDistR2(path, sched, t - t0, op.x, op.z) < R2) return false;
      }
    }
    return true;
  };

  const scan = (step, stopAt = null) => {
    let best = 0;
    let run = 0;
    let prev = null;
    for (let t0 = 0; t0 < HORIZON; t0 += step) {
      if (safeStart(t0)) {
        run = prev === null || t0 - prev > step * 1.5 ? step : run + step;
        if (run > best) {
          best = run;
          // The edge decision only needs "≥ floor": once the run clears it,
          // the exact maximum adds nothing the gate uses (the reported
          // bestWindow in a failure message is then clamped to the floor —
          // the failure still says a fair window exists but is unreachable,
          // which is what the message means). L87: 196/206 candidates were
          // above floor, each paying the full fine scan for a decision this
          // line settles. M2.5, 2026-11-13 (15.5 s → ~0.5 s per graph).
          if (stopAt !== null && best >= stopAt) return best;
        }
      } else {
        run = 0;
      }
      prev = t0;
    }
    return best;
  };

  const coarse = scan(0.02);
  if (coarse + 0.06 < floor) return coarse; // hopeless — skip the fine pass
  return scan(0.005, floor); // authoritative for the decision; clamps at floor
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
          // never revisit a line tile: a back-and-forth "crossing" is not a
          // crossing (it produced self-revising seqs whose reconstruction
          // could emit multi-tile presses as single rolls)
          if (path.some((t) => t.x === nx.x && t.z === nx.z)) continue;
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
// The crossing-graph build is the expensive part of the timing model, and a
// single verify() calls it 2–3× for the same (immutable, parsed) level —
// cache it per level object. Levels are never mutated after parseLevel, so
// this is a pure memo.
const _graphCache = new WeakMap();
export function fairCrossingGraph(level) {
  const hit = _graphCache.get(level);
  if (hit) return hit;
  const r = buildCrossingGraph(level);
  _graphCache.set(level, r);
  return r;
}
function buildCrossingGraph(level) {
  const { line, runs } = lineRuns(level);
  const edges = new Map(); // "x,z" -> [{ to: {x,z}, seq: [{x,z}...] }]
  let bestWindow = 0;
  let anyCandidate = false;
  if (line.size) {
    const addEdge = (from, to, seq, freeze = false) => {
      const k = key(from.x, from.z);
      if (!edges.has(k)) edges.set(k, []);
      edges.get(k).push({ to, seq, freeze });
    };
    // crossings the natural window rejects but a freeze might save
    const unfairCrossings = [];
    const note = (w) => {
      anyCandidate = true;
      if (w > bestWindow) bestWindow = w;
    };
    const offLineNbrs = (t) =>
      DIRS_OBJ.flatMap(([dx, dz]) => {
        const nt = level.tiles.get(key(t.x + dx, t.z + dz));
        // shuttle docks are only solid while their platform dwells — they
        // cannot anchor a timed crossing
        return nt && !line.has(key(nt.x, nt.z)) && !nt.shuttle ? [nt] : [];
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
      // a burst may not slip through a door it never opened: entering a
      // door tile is legal only from its plate (M3 wave-1, mirrors
      // checkRoll — this path steps synthetic tiles so it re-checks)
      const bt = level.tiles.get(key(b.x, b.z));
      if (bt && bt.door && !(a.x === bt.door.x && a.z === bt.door.z)) return false;
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
      const revSeq = [...c.seq].reverse();
      const wRev = crossingWindow(level, c.exit, revSeq, c.entry);
      note(wFwd);
      note(wRev);
      const fwdLegal = seqLegal(c.entry, c.seq, c.exit);
      const revLegal = seqLegal(c.exit, revSeq, c.entry);
      if (wFwd >= TIMING_FLOOR && fwdLegal) addEdge(c.entry, c.exit, c.seq);
      else if (fwdLegal) unfairCrossings.push({ entry: c.entry, exit: c.exit, seq: c.seq });
      if (wRev >= TIMING_FLOOR && revLegal) addEdge(c.exit, c.entry, revSeq);
      else if (revLegal) unfairCrossings.push({ entry: c.exit, exit: c.entry, seq: revSeq });
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

    // FREEZE-ASSISTED CROSSINGS (M3 wave-1): a burst the natural window
    // rejects is still fair when the player can freeze the patrol first:
    // a freeze pickup reachable through crossings already proven fair,
    // with (pickup → entry presses) + (burst presses) inside
    // FREEZE_PRESS_BUDGET. Fixpoint: each freeze crossing unlocked may
    // make another pickup reachable. Press distances run on plain
    // resolved presses in the "frozen world" (patrol-line tiles are
    // walkable while frozen; shuttle rides are excluded — a ride's real
    // seconds would burn the freeze away).
    if (level.freezeTiles && level.freezeTiles.size && unfairCrossings.length) {
      const pickupTiles = [...level.freezeTiles].map((k) => level.tiles.get(k)).filter(Boolean);
      // press distances in the frozen world. On size levels the state is
      // (tile, size) — keyed `${k}|m|n` — and the pickup is seeded at BOTH
      // sizes (the fixpoint below only needs one workable arrival size at
      // the crossing entry; seeding both is the existential reading).
      const pressDistFrom = (from) => {
        if (!level.hasSize) {
          const dist = new Map([[key(from.x, from.z), 0]]);
          const q = [from];
          while (q.length) {
            const cur = q.shift();
            const d0 = dist.get(key(cur.x, cur.z));
            for (const d of Object.values(DIRS)) {
              const to = resolveRoll(level, cur, d);
              if (!to) continue;
              const k2 = key(to.x, to.z);
              if (!dist.has(k2)) {
                dist.set(k2, d0 + 1);
                q.push(to);
              }
            }
          }
          return dist;
        }
        const dist = new Map();
        const q = [];
        for (const m of [false, true]) {
          dist.set(`${key(from.x, from.z)}|${m ? 'm' : 'n'}`, 0);
          q.push({ tile: from, mini: m });
        }
        while (q.length) {
          const { tile: cur, mini } = q.shift();
          const d0 = dist.get(`${key(cur.x, cur.z)}|${mini ? 'm' : 'n'}`);
          for (const d of Object.values(DIRS)) {
            const to = resolveRollAt(level, cur, d, mini);
            if (!to) continue;
            const k2 = `${key(to.x, to.z)}|${sizeAfter(level, to, mini) ? 'm' : 'n'}`;
            if (!dist.has(k2)) {
              dist.set(k2, d0 + 1);
              q.push({ tile: to, mini: sizeAfter(level, to, mini) });
            }
          }
        }
        return dist;
      };
      const distMaps = pickupTiles.map((p) => pressDistFrom(p));
      const reachableFromStart = () => {
        const seen = new Set();
        const q = [];
        const seed = (t) => {
          const k2 = key(t.x, t.z);
          if (!seen.has(k2)) {
            seen.add(k2);
            q.push(level.tiles.get(k2) || t);
          }
        };
        if (line.has(key(level.start.x, level.start.z))) {
          for (const e of edges.get(key(level.start.x, level.start.z)) || []) {
            if (!e.to.isKeyNode) seed(e.to);
          }
        } else {
          seed(level.start);
        }
        while (q.length) {
          const ct = q.shift();
          const tile = level.tiles.get(key(ct.x, ct.z)) || ct;
          const targets = level.hasSize
            ? [...rollTargetsAt(level, tile, false), ...rollTargetsAt(level, tile, true)].map((s) => s.to)
            : rollTargets(level, tile);
          for (const to of targets) {
            if (!line.has(key(to.x, to.z))) seed(to);
          }
          for (const e of edges.get(key(ct.x, ct.z)) || []) {
            if (!e.to.isKeyNode) seed(e.to);
          }
        }
        return seen;
      };
      const pending = new Set(unfairCrossings);
      let changed = true;
      while (changed && pending.size) {
        changed = false;
        const reach = reachableFromStart();
        for (const c of [...pending]) {
          for (let pi = 0; pi < pickupTiles.length; pi++) {
            const pk = key(pickupTiles[pi].x, pickupTiles[pi].z);
            if (!reach.has(pk)) continue;
            // the burst keeps its entry size until the exit landing, so a
            // low exit can only be burst into while mini (ADR-034)
            const exitTile = level.tiles.get(key(c.exit.x, c.exit.z));
            const entryK = key(c.entry.x, c.entry.z);
            const d = !level.hasSize
              ? distMaps[pi].get(entryK)
              : Math.min(
                  ...[false, true]
                    .filter((m) => !exitTile || !exitTile.low || m)
                    .map((m) => distMaps[pi].get(`${entryK}|${m ? 'm' : 'n'}`) ?? Infinity),
                );
            if (d !== undefined && d + c.seq.length + 1 <= FREEZE_PRESS_BUDGET) {
              addEdge(c.entry, c.exit, c.seq, true);
              pending.delete(c);
              changed = true;
              break;
            }
          }
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
/**
 * Fair reachability: BFS over off-line tiles + fair crossing edges, seeded
 * at `from`. Returns the set of node ids reachable ("x,z" for tiles,
 * "key:x,z" for the key node). Used by the timing gate (start → goal)
 * and by the rescue-bench proof (bench → goal).
 */
export function fairReachSet(level, from, keySeed = false, blocked = null, seedSizes = null) {
  if (level.hasSize) return new Set(fairReachStates(level, from, keySeed, blocked, seedSizes).keys());
  const { line, edges } = fairCrossingGraph(level);
  const idOf = (t) => (t.isKeyNode ? `key:${t.x},${t.z}` : key(t.x, t.z));
  const isBlocked = (tk) => blocked && !tk.startsWith('key:') && blocked.has(tk);
  const seen = new Set();
    const q = [];
    let qi = 0; // index pointer (q.shift() is O(n²) on long queues)
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
      for (const e of edges.get(entryK) || []) if (!isBlocked(idOf(e.to))) seed(e.to);
    } else {
      seed(from);
    }
    while (qi < q.length) {
      const ct = q[qi++];
      const targets = new Set((edges.get(idOf(ct)) || []).map((e) => idOf(e.to)));
      if (!ct.isKeyNode) {
        // The game's own transitions — one press = one resolved landing
        // (roll law enforced, ice carry, spring fire, shuttle ride all
        // included). Naive four-neighbour adjacency called a +2 climb
        // "reachable", which blessed levels whose only fair route the cube
        // physically cannot play (M2.5 L20 "Glass Meadow": the start's
        // only legal roll lands on the patrol line; the naive set climbed
        // +2 off the line and declared the goal fair-reachable — the live
        // bot's planner, which mirrors resolveRoll, had no route). Every
        // transition is mechanic-aware by construction (ADR-016 doctrine),
        // and mechanic landings never touch a patrol line (the radius-1
        // sentinel exclusion), so no extra edges are needed. M2.5,
        // 2026-11-13 (false positive found by the live gate).
        const tile = level.tiles.get(key(ct.x, ct.z)) || ct;
        for (const to of rollTargets(level, tile)) {
          if (line.has(key(to.x, to.z))) continue; // off-line landings only
          targets.add(key(to.x, to.z));
        }
      }
      for (const tk of targets) {
        if (seen.has(tk) || isBlocked(tk)) continue;
        seen.add(tk);
        const [tx, tz] = (tk.startsWith('key:') ? tk.slice(4) : tk).split(',').map(Number);
        q.push(tk.startsWith('key:') ? { x: tx, z: tz, isKeyNode: true } : (level.tiles.get(tk) || { x: tx, z: tz }));
      }
    }
    return seen;
}

/**
 * The sized fair-reach engine (Phase B, ADR-034): BFS over (node, size)
 * states on the fair-crossing graph, returning a Map of node id → the set
 * of sizes ('m' | 'n') the node is reachable IN. A crossing edge keeps the
 * cube's size until its exit landing (burst tiles are never pads or low —
 * the spawn audit keeps them off the line), so an edge is traversable at
 * size s exactly when its exit is enterable at s; plain presses expand
 * through rollTargetsAt. The key→goal half of the timing gate composes
 * through this map: it is seeded with precisely the sizes the key itself
 * was reached in, which is what makes the composed proof a play that
 * exists rather than two plays that merely coexist.
 */
export function fairReachStates(level, from, keySeed = false, blocked = null, seedSizes = null) {
  const { line, edges } = fairCrossingGraph(level);
  const idOf = (t) => (t.isKeyNode ? `key:${t.x},${t.z}` : key(t.x, t.z));
  const isBlocked = (tk) => blocked && !tk.startsWith('key:') && blocked.has(tk);
  const sizesAt = new Map(); // id -> Set<'m'|'n'>
  const seenStates = new Set();
  const q = [];
  const sizes = seedSizes && seedSizes.length
    ? seedSizes.map((b) => !!b)
    : keySeed
      ? [false, true] // arriving at the key in either size is a composition question
      : [from.x === level.start.x && from.z === level.start.z ? level.startMini : false];
  const seedState = (t, mini) => {
    if (!t.isKeyNode) {
      const tt = level.tiles.get(key(t.x, t.z)) || t;
      if (tt.low && !mini) return; // an illegal state is never created
    }
    const id = idOf(t);
    if (isBlocked(id)) return;
    const sk = `${id}|${mini ? 'm' : 'n'}`;
    if (seenStates.has(sk)) return;
    seenStates.add(sk);
    if (!sizesAt.has(id)) sizesAt.set(id, new Set());
    sizesAt.get(id).add(mini ? 'm' : 'n');
    q.push({ t, mini });
  };
  const entryK = keySeed ? `key:${from.x},${from.z}` : idOf(from);
  if (!from.isKeyNode && line.has(key(from.x, from.z))) {
    // a start (or the key) sitting on the line seeds only through fair
    // escape edges, once per seedable size
    for (const s of sizes) {
      for (const e of edges.get(entryK) || []) {
        seedState(e.to, e.to.isKeyNode ? s : sizeAfter(level, e.to, s));
      }
    }
  } else {
    for (const s of sizes) seedState(from, s);
  }
  while (q.length) {
    const { t: ct, mini } = q.shift();
    for (const e of edges.get(idOf(ct)) || []) {
      seedState(e.to, e.to.isKeyNode ? mini : sizeAfter(level, e.to, mini));
    }
    if (ct.isKeyNode) continue;
    const tile = level.tiles.get(key(ct.x, ct.z)) || ct;
    for (const s of rollTargetsAt(level, tile, mini)) {
      if (line.has(key(s.to.x, s.to.z))) continue; // off-line landings only
      seedState(s.to, s.mini);
    }
  }
  return sizesAt;
}

export function timingProblems(level) {
  if (!level.orbs.length) return [];
  const { line, edges, bestWindow, anyCandidate } = fairCrossingGraph(level);

  const startK = key(level.start.x, level.start.z);
  const goalK = key(level.goal.x, level.goal.z);

  const reach = fairReachSet(level, level.start);
  if (!reach.has(goalK)) {
    // fall through to the descriptive errors below
  } else if (level.gateKey) {
    // the key must be collectible on a fair route, and the goal must still
    // be reachable after picking it up (fair route from the key)
    const keyK = key(level.gateKey.x, level.gateKey.z);
    const keyOnLine = line.has(keyK);
    // A sealed gate is IMPASSABLE before the key is picked up — the game
    // rejects any roll onto it. The start→key route may not pass through
    // the goal tile; a route that only exists by cutting the sealed gate
    // is a route no player can play.
    if (level.hasSize) {
      // the key leg hands its ARRIVAL sizes to the goal leg (ADR-034):
      // two fair halves only compose when a size exists that finishes
      // the first and starts the second
      const sealedStates = fairReachStates(level, level.start, false, new Set([goalK]), [level.startMini]);
      const keySizes = sealedStates.get(keyOnLine ? `key:${keyK}` : keyK);
      if (!keySizes) {
        return ['gate key is only reachable through the sealed goal or an unfair sentinel crossing'];
      }
      const fromKey = fairReachStates(level, level.gateKey, keyOnLine, null, [...keySizes].map((c) => c === 'm'));
      if (!fromKey.has(goalK)) {
        return ['goal is only reachable from the key through an unfair sentinel crossing'];
      }
      return [];
    }
    const reachSealed = fairReachSet(level, level.start, false, new Set([goalK]));
    if (!reachSealed.has(keyOnLine ? `key:${keyK}` : keyK)) {
      return ['gate key is only reachable through the sealed goal or an unfair sentinel crossing'];
    }
    if (!fairReachSet(level, level.gateKey, keyOnLine).has(goalK)) {
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
