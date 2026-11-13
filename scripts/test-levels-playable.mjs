// ---------------------------------------------------------------------------
// KUBIK — playable-route test (LIVE hazards)
//
// The level contract, proven by PLAYING: for every level (and today's daily
// challenge) there must exist at least one route a player can actually
// complete, with every hazard RUNNING — sentinels patrol, bridges slide,
// slabs crumble, the breeze blows. The test drives the real keyboard input
// path in a real browser.
//
// Planning uses the SAME fair-crossing graph the verifier uses
// (rules.fairCrossingGraph): the route is a shortest path over off-line
// tiles + sentinel crossings whose safe window is at least TIMING_FLOOR, so
// the bot only ever commits to a crossing the level is proven to allow.
// Driving then waits at each crossing until the window is actually open
// (checked against the sentinels' REAL positions every poll), waits for
// sliding bridges to rise, never waits on a crumbling slab, and re-plans
// after any death/respawn or breeze displacement. A level only passes when
// the game itself reports `won`.
//
// This is the live half of the gate: scripts/verify-levels.mjs proves a fair
// route EXISTS (static windows, soft-lock proof, spawn safety); this file
// proves the route is CATCHABLE by real play. Together: a path is there,
// hazards can't seal it, and a player can actually take it.
//
//   npm run test:play            (dev server must be running, or set URL=)
//   URL=http://localhost:4173/ npm run test:play   (against a preview build)
//   KUBIK_PLAY_OFF=1 npm run test:play             (fast mode: hazards off —
//                                                   route/input sanity only)
// ---------------------------------------------------------------------------
import { existsSync } from 'node:fs';

// In this sandbox the headless shell needs NSS libs built under /tmp; on CI
// the OS provides them and this is a no-op.
const nssDir = '/tmp/dist/Release/lib';
if (existsSync(`${nssDir}/libnss3.so`)) {
  process.env.LD_LIBRARY_PATH = [process.env.LD_LIBRARY_PATH, nssDir].filter(Boolean).join(':');
}

const puppeteer = (await import('puppeteer-core')).default;
const chromium = (await import('@sparticuz/chromium')).default;
const { LEVELS } = await import('../src/levels.js');
const { getDailyLevel } = await import('../src/daily.js');
const {
  parseLevel,
  orbTable,
  orbLineTiles,
  orbDistAlong,
  orbPositionFromDist,
  fairCrossingGraph,
  resolveRoll,
  shuttleRide,
  ROLL_TIME,
  ORB_KILL_RADIUS,
  commitSchedules,
  commitBandDistR2,
  key,
} = await import('../src/rules.js');

const URL = process.env.URL || 'http://localhost:5173/';
const LIVE = process.env.KUBIK_PLAY_OFF !== '1';
const ONLY = (process.env.KUBIK_LEVELS || '')
  .split(',')
  .map((v) => parseInt(v, 10))
  .filter(Boolean);
const DEBUG = process.env.KUBIK_DEBUG === '1';
const dbg = (...a) => {
  if (DEBUG) console.log('   ·', ...a);
};

// fail fast with a useful message instead of a puppeteer timeout
try {
  await fetch(URL, { signal: AbortSignal.timeout(3000) });
} catch {
  console.error(`✗ dev server not reachable at ${URL}`);
  console.error('  start it (npm run dev), point the test at it (URL=...), or bypass with KUBIK_SKIP_HOOKS=1');
  process.exit(2);
}

const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 900, height: 600 },
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => {
  if (!e.message.includes('WebSocket')) errors.push(e.message); // Vite HMR noise
});
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !t.includes('WebSocket')) errors.push(t);
});
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(fn)) return true;
    await wait(100);
  }
  return false;
};
const snap = () =>
  page.evaluate(() => {
    const g = window.__kubik.game;
    return { x: g.cube.x, z: g.cube.z, state: g.state, hasKey: g.hasKey, idx: g.levelIndex };
  });

// ---------------------------------------------------------------------------
// Live-hazard context: built once per level from the level def.
// ---------------------------------------------------------------------------
function liveCtx(def) {
  const line = new Set();
  for (const o of def.orbs || []) for (const k of orbLineTiles(o.path)) line.add(k); // keys "x,z"
  const sliders = new Set();
  for (const s of def.sliders || []) for (const t of s.tiles) sliders.add(key(t[0], t[1]));
  const crumbles = new Set((def.crumble || []).map(([x, z]) => key(x, z)));
  const orbs = (def.orbs || []).map((o) => ({ path: o.path, speed: o.speed, table: orbTable(o.path) }));
  const keyOnLine = !!(def.key && line.has(key(def.key[0], def.key[1])));
  const model = parseLevel(def);
  return {
    def,
    model,
    graph: fairCrossingGraph(model),
    line,
    sliders,
    crumbles,
    orbs,
    docks: model.shuttleDocks,
    keyOnLine,
  };
}

/** Cube tile + real orb positions, in one round-trip. */
async function snapLive() {
  return page.evaluate(() => {
    const g = window.__kubik.game;
    return {
      x: g.cube.x,
      z: g.cube.z,
      state: g.state,
      hasKey: g.hasKey,
      idx: g.levelIndex,
      anim: !!g.cube.anim,
      orbs: g.view.orbs.map((o) => [o.holder.position.x, o.holder.position.z]),
      // the view's own directed distance along the patrol loop — position
      // alone is AMBIGUOUS on out-and-back patrols (two legs, one point),
      // so the wait must anchor on this, never re-derive it from x,z
      orbDist: g.view.orbs.map((o) => o.dist),
    };
  });
}

/** Keys ("x,z") of crumbled slabs — they never come back. */
async function brokenKeys() {
  return page.evaluate(() => {
    const g = window.__kubik.game;
    const out = [];
    for (const t of g.level.tiles.values()) if (g.view.isBroken(t.x, t.z)) out.push(`${t.x},${t.z}`);
    return out;
  });
}

/**
 * Is this full crossing safe to START now? The cube is simulated as the
 * commit's press-schedule BAND (rules.js commitBandProgress: the true
 * schedule lies between the earliest (fast) and a human's (slow) bound,
 * each extended by ARC_SLACK for the pivot-arc lead/lag of the mesh, and
 * the whole band is checked as the PATH POLYLINE between the endpoints so
 * corner tiles are covered — ADR-018; forensics 2026-11-09 L7/L179).
 * Each sentinel is predicted from its CURRENT real arc distance
 * (dist + speed·u), exact for the whole crossing. `tail` keeps the check
 * running a little past the slow finish (the anchor dist was read a poll
 * ago; the exit roll is still in flight while the schedule thinks the run
 * is over).
 */
function crossingSafe(ctx, entry, seq, exit, orbsNow, tail = 0.18) {
  // a terminal crossing (the route ENDS on the line, e.g. at the key) has no
  // exit roll — the path is entry → seq…
  const path = exit ? [entry, ...seq, exit] : [entry, ...seq];
  const rolls = path.length - 1;
  const dirs = [];
  for (let k = 0; k < rolls; k++) {
    const a = path[k];
    const b = path[k + 1];
    dirs.push(b.z < a.z ? 'up' : b.z > a.z ? 'down' : b.x < a.x ? 'left' : 'right');
  }
  const sched = commitSchedules(dirs);
  const SUB = 12;
  const R2 = ORB_KILL_RADIUS * ORB_KILL_RADIUS;
  const n = Math.ceil(((sched.slow[sched.slow.length - 1] + ROLL_TIME + tail) * SUB) / ROLL_TIME);
  for (let s = 0; s <= n; s++) {
    const u = (s / SUB) * ROLL_TIME; // real time since "now"
    for (let oi = 0; oi < ctx.orbs.length; oi++) {
      const o = ctx.orbs[oi];
      const op = orbPositionFromDist(o.table, orbsNow[oi].dist + o.speed * u);
      if (commitBandDistR2(path, sched, u, op.x, op.z) < R2) return false;
    }
  }
  return true;
}

/** Current real arc distance of every sentinel. */
function orbsNow(ctx, snapOrbs, snapDists) {
  return ctx.orbs.map((o, i) => ({
    dist: snapDists && typeof snapDists[i] === 'number'
      ? snapDists[i]
      : orbDistAlong(o.path, snapOrbs[i][0], snapOrbs[i][1]),
  }));
}

const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const DIRV = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
const MOVE_V = {
  up: { dx: 0, dz: -1 },
  down: { dx: 0, dz: 1 },
  left: { dx: -1, dz: 0 },
  right: { dx: 1, dz: 0 },
};

/**
 * Plan a route from `cube` to `target` over the fair-crossing graph:
 * off-line tiles + only sentinel crossings the level is proven to allow.
 * Dijkstra in roll count; broken crumble slabs are removed.
 * Returns { tiles, moves } or null (no fair route from here).
 */
function planRoute(ctx, cube, target, broken, sealed = false) {
  const { model, graph } = ctx;
  // While the gate is sealed (no key in pocket) the goal tile is impassable:
  // the game rejects any roll onto it, so a route may not cut through it.
  const goalK = key(model.goal.x, model.goal.z);
  const sealedGoal = (x, z) => sealed && x === model.goal.x && z === model.goal.z;
  // tripwire: a planned route may only reference real, non-line tiles
  // (line tiles appear only inside a crossing step's seq)
  const validateRoute = (r) => {
    if (!r) return r;
    // A press is legal iff resolveRoll (one press = one resolved landing,
    // ice/spring included) lands exactly on the next route tile — this is
    // the same primitive the game executes, so a valid route is a route
    // the game can actually play.
    const bad = [];
    for (let i = 0; i < r.tiles.length; i++) {
      const t = r.tiles[i];
      if (!model.tiles.get(key(t.x, t.z))) bad.push(`tile ${t.x},${t.z} not in model`);
      if (i > 0 && r.moves[i - 1] !== 'ride') {
        const a = r.tiles[i - 1];
        const at = model.tiles.get(key(a.x, a.z));
        if (!at) continue;
        const d = MOVE_V[r.moves[i - 1]];
        const land = d ? resolveRoll(model, at, d) : null;
        if (!land || land.x !== t.x || land.z !== t.z) {
          bad.push(`press ${r.moves[i - 1]} from ${a.x},${a.z} lands ${land ? land.x + ',' + land.z : 'NOWHERE'}, route says ${t.x},${t.z}`);
        }
      }
    }
    if (bad.length) {
      dbg(`PLAN TRIPWIRE (def id=${ctx.def.id}, line=${[...ctx.line].join('|')}): ${bad.join('; ')} | route=${r.tiles.map((x) => x.x + ',' + x.z).join(' ')} | moves=${r.moves.join(' ')}`);
      return null;
    }
    return r;
  };
  const isKeyTarget = !!(ctx.def.key && target.x === ctx.def.key[0] && target.z === ctx.def.key[1]);
  const startK = key(cube.x, cube.z);
  // the key node is a graph waypoint that sits on a line tile
  const targetK = isKeyTarget && ctx.keyOnLine ? `key:${key(target.x, target.z)}` : key(target.x, target.z);
  // seed with the REAL tile object: resolveRoll's height law reads from.h,
  // and a plain {x,z} seed makes every climb look legal (NaN delta)
  const startTile = model.tiles.get(startK) || cube;
  const dist = new Map([[startK, 0]]);
  const prev = new Map();
  const Q = [startTile];
  const done = new Set();
  const hOf = (t) => model.tiles.get(key(t.x, t.z));
  while (Q.length) {
    Q.sort((a, b) => (dist.get(key(a.x, a.z)) ?? 1e9) - (dist.get(key(b.x, b.z)) ?? 1e9));
    const cur = Q.shift();
    const ck = key(cur.x, cur.z);
    if (done.has(ck)) continue;
    if (ck === targetK) break;
    done.add(ck);
    const d0 = dist.get(ck);
    const curH = hOf(cur);
    if (!curH) continue; // standing over void (dying) — replan will fix it
    // resolved off-line neighbours: ONE press may carry the cube several
    // tiles (an ice slide or a spring launch) — the route lands on the
    // resolved tile. Landing on the sentinel line is refused: the generator
    // keeps mechanic corridors clear of patrols, so a fair level never needs
    // to slide into one.
    for (const [dx, dz] of DIRV) {
      const to = resolveRoll(model, cur, { dx, dz });
      if (!to) continue;
      if (graph.line.has(key(to.x, to.z))) continue;
      const k2 = key(to.x, to.z);
      if (broken.has(k2)) continue;
      if (sealedGoal(to.x, to.z) && k2 !== targetK) continue; // sealed gate
      if (d0 + 1 < (dist.get(k2) ?? 1e9)) {
        dist.set(k2, d0 + 1);
        prev.set(k2, { k: ck, seq: null });
        Q.push(to);
      }
    }
    // riding a shuttle: standing on a dock, the platform (when it dwells)
    // carries the cube to the far dock — one action, no press
    if (curH && curH.shuttle) {
      const rideTo = shuttleRide(model, cur);
      if (rideTo) {
        const k2 = key(rideTo.x, rideTo.z);
        if (!broken.has(k2) && d0 + 1 < (dist.get(k2) ?? 1e9)) {
          dist.set(k2, d0 + 1);
          prev.set(k2, { k: ck, seq: 'RIDE' });
          Q.push(rideTo);
        }
      }
    }
    // fair sentinel crossings (entry → exit, seq = the line tiles crossed)
    for (const e of graph.edges.get(ck) || []) {
      const isKeyNode = !!e.to.isKeyNode;
      const k2 = isKeyNode ? `key:${e.to.x},${e.to.z}` : key(e.to.x, e.to.z);
      if (!isKeyNode && broken.has(k2)) continue;
      if (!isKeyNode && sealedGoal(e.to.x, e.to.z) && k2 !== targetK) continue; // sealed gate
      if (d0 + e.seq.length + 1 < (dist.get(k2) ?? 1e9)) {
        dist.set(k2, d0 + e.seq.length + 1);
        prev.set(k2, { k: ck, seq: e.seq });
        Q.push(e.to);
      }
    }
  }
  if (!dist.has(targetK)) return null;

  // reconstruct: target ← … ← start, each step carries the line tiles crossed
  const chain = [];
  let k = targetK;
  while (k !== startK) {
    const p = prev.get(k);
    chain.unshift({ k, seq: p.seq });
    k = p.k;
  }
  const nodeOf = (kk) => {
    const [x, z] = (kk.startsWith('key:') ? kk.slice(4) : kk).split(',').map(Number);
    return { x, z };
  };
  const dirOf = (a, b) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    if (dx > 0) return 'right';
    if (dx < 0) return 'left';
    if (dz > 0) return 'down';
    return 'up';
  };
  const tiles = [{ x: cube.x, z: cube.z }];
  const moves = [];
  for (const step of chain) {
    if (step.seq === 'RIDE') {
      tiles.push(nodeOf(step.k));
      moves.push('ride');
      continue;
    }
    // a keyNode step's seq already ends ON the key tile
    const adds = step.seq
      ? step.k.startsWith('key:')
        ? step.seq
        : [...step.seq, nodeOf(step.k)]
      : [nodeOf(step.k)];
    for (const t of adds) {
      moves.push(dirOf(tiles[tiles.length - 1], t));
      tiles.push(t);
    }
  }
  return validateRoute({ tiles, moves });
}

/**
 * Press one roll and wait for it to ACTUALLY start first (the input sits in
 * a queue until the next game frame pumps it — on throttled headless frames
 * that can be ~100 ms away, and a second press in that gap double-rolls the
 * cube off the planned route). Then wait for the anim to finish.
 */
async function pressRoll(move, target) {
  // settle: any residual anim (bump/reject from a rejected roll) must clear
  // (bail on ANY non-playing state: a death mid-wait must not be swallowed
  // by an 8 s anim wait that outlives the game's 1 s respawn window)
  await waitFor(() => !window.__kubik.game.cube.anim || window.__kubik.game.state !== 'playing', 2000);
  await page.keyboard.press(keyMap[move]);
  await waitFor(
    ([x, z]) => {
      const g = window.__kubik.game;
      return g.cube.anim || g.state !== 'playing' || (g.cube.x === x && g.cube.z === z);
    },
    [target.x, target.z],
    3000,
  );
  dbg(`press ${move} → ${target.x},${target.z}: anim=${(await page.evaluate(() => window.__kubik.game.cube.anim && window.__kubik.game.cube.anim.type)) || 'none'}`);
  await waitFor(() => !window.__kubik.game.cube.anim || window.__kubik.game.state !== 'playing', 8000);
  await wait(15);
}

/**
 * Drive the cube through `tiles` (full route incl. start) using `moves`,
 * with live hazards:
 *  - a sliding bridge must be UP before the cube steps onto it,
 *  - entering the sentinel line waits for a verified safe window (checked
 *    against the orbs' real positions, re-polled while waiting) — and once
 *    the entry is committed the whole line run is driven as one commit:
 *    each continuation roll is pre-queued during the previous roll so the
 *    cube's path matches the verified simulation with no gaps (waiting
 *    mid-line would let the sentinel sweep through the standing cube),
 *  - the cube never waits ON a crumbling slab.
 * Returns true (won), false (dead/stuck — caller re-plans), or 'replan'
 * (the cube is off the planned route — e.g. pushed by the breeze).
 */
async function driveRouteLive(tiles, moves, ctx) {
  let stuck = 0;
  for (let r = 0; r < tiles.length - 1; ) {
    const st = await snapLive();
    if (st.state === 'won') return true;
    if (st.state !== 'playing') {
      dbg(`main loop non-playing: ${JSON.stringify(await page.evaluate(() => ({
        cause: window.__kubik.game.lastDeathCause,
        cube: [window.__kubik.game.cube.x, window.__kubik.game.cube.z],
        orbs: window.__kubik.game.view.orbs.map((o) => [+o.dist.toFixed(2), +o.holder.position.x.toFixed(2), +o.holder.position.z.toFixed(2)]),
      })))}`);
      return false;
    }
    const target = tiles[r + 1];
    if (st.x === target.x && st.z === target.z) {
      r++;
      stuck = 0;
      continue;
    }
    // a RIDE is exempt from the position gate: the platform may already be
    // carrying the cube (it departs the dock the moment the roll on board
    // settles), so the cube can be mid-track — neither on tiles[r] nor yet
    // on the target. The ride branch below owns the whole transit; gating
    // here replanned from a mid-track position that is not a tile at all
    // (L196 "The Ascent Complete": NO FAIR ROUTE from 16,10, a shuttle
    // track midpoint, 2026-11-13).
    if (st.x !== tiles[r].x || st.z !== tiles[r].z) {
      if (moves[r] !== 'ride') return 'replan';
    }
    if (++stuck > 4) return false; // cannot advance (no pushes left, etc.)

    const onLineTarget = ctx.line.has(key(target.x, target.z));

    if (onLineTarget && !ctx.line.has(key(st.x, st.z))) {
      // entering the patrol line from an off-line tile: the only place a
      // crossing wait is safe (the cube stands clear of the line)
      const seq = [];
      let i = r + 1;
      while (i < tiles.length && ctx.line.has(key(tiles[i].x, tiles[i].z))) {
        seq.push(tiles[i]);
        i++;
      }
      const entry = tiles[r];
      const exit = i < tiles.length ? tiles[i] : null;
      const exitIdx = exit ? i : i - 1; // a terminal crossing ends on the line
      if (!exit && seq.length === 0) return false;
      if (!ctx.crumbles.has(key(st.x, st.z))) {
        const t0 = Date.now();
        let safe = false;
        while (!safe && Date.now() - t0 < 30000) {
          const now = await snapLive();
          if (now.state === 'won') return true;
          if (now.state !== 'playing') return false;
          if (now.x !== entry.x || now.z !== entry.z) return 'replan'; // breeze moved us
          safe = crossingSafe(ctx, entry, seq, exit, orbsNow(ctx, now.orbs, now.orbDist));
          if (!safe) await wait(70);
        }
        dbg(
          `crossing entry ${entry.x},${entry.z} → exit ${exit ? exit.x + ',' + exit.z : 'TERMINAL'} via ${seq.map((t) => t.x + ',' + t.z).join('|')}: ${safe ? 'safe after' : 'TIMEOUT'} ${(Date.now() - t0) / 1000}s`,
        );
        if (!safe) return false;
      }
      // commit: drive the entry roll, the whole line run, and the exit roll
      // without pausing — then STOP at the exit tile. Any further route
      // segment (a re-entry into the line, a bridge, a long hop) needs its
      // own safety wait in the main loop; driving it inside this burst would
      // skip the sentinel check (L19 class: zig-zag double crossing).
      const out = await driveCommit(tiles, moves, r, ctx, exitIdx);
      dbg(`commit returned ${JSON.stringify(out)}`);
      if (out.dead) {
        const ds = await page.evaluate(() => {
          const g = window.__kubik.game;
          return {
            cause: g.lastDeathCause,
            cube: [g.cube.x, g.cube.z, g.state],
            orbs: g.view.orbs.map((o) => [+o.dist.toFixed(3), +o.holder.position.x.toFixed(2), +o.holder.position.z.toFixed(2)]),
          };
        });
        dbg(`DEATH detail: ${JSON.stringify(ds)}`);
      }
      if (out.desync) return 'replan';
      if (out.won) return true;
      if (out.dead || out.stuck) return false;
      r = out.r;
      continue;
    }

    // sliding bridge: wait for it to rise (never on a crumble slab)
    if (ctx.sliders.has(key(target.x, target.z)) && !ctx.crumbles.has(key(st.x, st.z))) {
      const t0 = Date.now();
      let up = false;
      while (!up && Date.now() - t0 < 10000) {
        up = await page.evaluate(([x, z]) => window.__kubik.game.view.sliderUp(x, z), [target.x, target.z]);
        if (!up) await wait(80);
      }
      if (!up) return false;
    }

    // shuttle RIDE: the cube stands on a dock; the platform dwells, takes
    // it, and carries it to the far dock. Phase 1: wait for the drive to
    // finish (the platform dwells at the far dock — generous timeout: under
    // heavy headless throttling game time can crawl). Phase 2: wait for the
    // cube to settle on the dock (the game snaps it within a frame).
    if (moves[r] === 'ride') {
      const t0 = Date.now();
      let arrived = false;
      while (!arrived && Date.now() - t0 < 40000) {
        const st2 = await page.evaluate(
          ([tx, tz]) => {
            const g = window.__kubik.game;
            const p = g.level.shuttles.length ? g.view.shuttlePos(0) : null;
            const dwellFar = !!(
              p && p.docked && p.x === tx && p.z === tz
            );
            return { s: g.state, dwellFar };
          },
          [target.x, target.z],
        );
        if (st2.s === 'won') return true;
        if (st2.s !== 'playing') return false;
        if (st2.dwellFar) break;
        await wait(80);
      }
      let carried = false;
      while (!carried && Date.now() - t0 < 50000) {
        const now = await snapLive();
        if (now.state === 'won') return true;
        if (now.state !== 'playing') return false;
        carried = now.x === target.x && now.z === target.z;
        if (!carried) await wait(80);
      }
      dbg(`ride to ${target.x},${target.z}: ${carried ? 'carried' : 'TIMEOUT'} ${(Date.now() - t0) / 1000}s`);
      if (!carried) return false;
      r++;
      continue;
    }

    // boarding a shuttle dock: the platform must be dwelling there first
    if (ctx.docks.has(key(target.x, target.z)) && !ctx.crumbles.has(key(st.x, st.z))) {
      const t0 = Date.now();
      let docked = false;
      while (!docked && Date.now() - t0 < 10000) {
        docked = await page.evaluate(
          ([x, z]) => window.__kubik.game.view.shuttleDocked(x, z),
          [target.x, target.z],
        );
        if (!docked) await wait(80);
      }
      if (!docked) return false;
    }

    // off-line → off-line, or leaving the line (a cube standing on the line
    // is safe by construction — the sentinel is far — so press immediately)
    const res = await pressRoll(moves[r], target);
    if (res === 'won') return true;
    if (res === 'dead') return false;
  }
  const st = await snapLive();
  const last = tiles[tiles.length - 1];
  return st.state === 'won' || (st.x === last.x && st.z === last.z);
}

/**
 * Commit driver: from `r` (cube on tiles[r]) drive roll after roll while the
 * route stays on the patrol line, pre-queueing each continuation roll
 * DURING the previous roll so the cube never pauses mid-line. Hands back to
 * the normal loop once the route leaves the line.
 */
async function driveCommit(tiles, moves, r, ctx, exitIdx) {
  let i = r;
  let presses = 0;
  let exited = false;
  while (i < exitIdx) {
    const st = await snapLive();
    if (st.state === 'won') return { won: true, r: i };
    if (st.state !== 'playing') return { dead: true, r: i };
    // catch up: a pre-queued roll may have already carried the cube several
    // tiles ahead — find where it actually is in the remaining route
    let j = i;
    let found = st.x === tiles[i].x && st.z === tiles[i].z;
    while (!found && j + 1 < tiles.length) {
      j++;
      found = st.x === tiles[j].x && st.z === tiles[j].z;
    }
    if (!found) {
      const dbgPos = await page.evaluate(() => {
        const g = window.__kubik.game;
        return { x: g.cube.x, z: g.cube.z, s: g.state, death: g.lastDeathCause };
      });
      dbg(`COMMIT DESYNC at i=${i}: cube=${JSON.stringify(dbgPos)} route=${tiles.slice(i, i + 6).map((t) => t.x + ',' + t.z).join(' ')}`);
      return { desync: true, r: i };
    }
    i = j;
    if (i >= exitIdx) return { r: i }; // this crossing is done — the main
    // loop owns every further segment (it re-checks sentinels before any
    // re-entry into the line)
    const next = tiles[i + 1];
    const onLine = ctx.line.has(key(next.x, next.z));
    if (!onLine && exited) break; // exit roll done — normal loop resumes
    // a shuttle-dock boarding must wait for the platform dwell — the main
    // loop owns that wait; the commit must never press (or pre-queue) the
    // roll into a dock the platform is not standing on
    {
      const nt = ctx.model.tiles.get(key(next.x, next.z));
      if (nt && nt.shuttle) break;
    }
    // a sliding bridge that dips into the void: never press (or pre-queue)
    // a roll onto a down bridge — the roll would fall into the void. Wait
    // for the bridge to rise, same rule as the main loop (and never wait on
    // a crumble slab, which would break while we stand still).
    const nextIsSlider = ctx.sliders.has(key(next.x, next.z));
    if (nextIsSlider && !ctx.crumbles.has(key(st.x, st.z))) {
      const t0s = Date.now();
      let up = false;
      while (!up && Date.now() - t0s < 10000) {
        up = await page.evaluate(([x, z]) => window.__kubik.game.view.sliderUp(x, z), [next.x, next.z]);
        if (!up) await wait(80);
      }
      if (!up) return { stuck: true, r: i };
    }
    // the exit roll is driven inside the commit too: the cube must not pause
    // on the patrol line between the last line roll and the exit roll
    if (exited && !onLine) {
      const res = await pressRoll(moves[i], next);
      if (res === 'won') return { won: true, r: i };
      i++;
      continue;
    }
    const anim = await page.evaluate(() => !!window.__kubik.game.cube.anim);
    const queued = await page.evaluate(() => window.__kubik.game.queue.length > 0);
    if (!anim && !queued) {
      if (++presses > 6) return { stuck: true, r: i };
      await page.keyboard.press(keyMap[moves[i]]);
      // top up the queue (game cap 2, consecutive same-direction deduped)
      // with the next continuation rolls — line tiles AND the exit roll —
      // while this one is still animating: the cube must never pause on the
      // patrol line. A same-direction straight run can't be pre-queued past
      // the first (game dedup); those gaps are one loop iteration each and
      // are absorbed by the 0.5 s window floor.
      const started = await waitFor(
        () => window.__kubik.game.cube.anim || window.__kubik.game.state !== 'playing',
        3000,
      );
      if (started) {
        for (let k = i + 1; k <= i + 2; k++) {
          if (k >= exitIdx) break; // never pre-queue past this crossing's exit
          if (k >= tiles.length - 1) break;
          if (moves[k] === 'ride') continue; // rides need no press
          const tk = ctx.model.tiles.get(key(tiles[k + 1].x, tiles[k + 1].z));
          if (tk && tk.shuttle) continue; // a dock boarding waits for the dwell
          // a slider roll can't be pre-queued: the bridge may be down when
          // the queued roll fires — the next loop iteration presses it with
          // the slider-up wait
          if (ctx.sliders.has(key(tiles[k + 1].x, tiles[k + 1].z))) continue;
          const qlen = await page.evaluate(() => window.__kubik.game.queue.length);
          if (qlen >= 2) break;
          await page.evaluate((mv) => window.__kubik.game.input(mv), moves[k]);
        }
      }
    }
    if (!(await waitFor(() => !window.__kubik.game.cube.anim || window.__kubik.game.state !== 'playing', 8000))) {
      // Under heavy throttling a legitimate roll can outlive the 8 s settle
      // wait. The cube may be mid-line: abandoning it here forces a re-plan
      // from a stale mid-burst position. The roll will finish — wait for the
      // anim to clear (bounded) and let the loop re-press the continuation.
      // (The predicate bails on ANY non-playing state — a death must surface
      // to the loop, not be swallowed past the game's 1 s respawn window.)
      const t0 = Date.now();
      let cleared = false;
      while (!cleared && Date.now() - t0 < 30000) {
        const st2 = await snapLive();
        if (st2.state === 'won') return { won: true, r: i };
        if (st2.state !== 'playing') return { dead: true, r: i };
        if (!st2.anim) break;
        await wait(80);
      }
      dbg(`commit settle extended at ${st.x},${st.z} (onLine=${ctx.line.has(key(st.x, st.z))})`);
    }
    if (!onLine) exited = true; // the exit roll just landed
    await wait(10);
  }
  return { r: i };
}

// In-page BFS (fast mode only): tile list + directions from the cube's
// CURRENT tile to target.
function bfsEval(targetExpr) {
  return `(() => {
    const g = window.__kubik.game;
    const target = ${targetExpr};
    const dirs = [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]];
    // one press from a tile in direction (dx,dz): a roll, then the
    // ice-slide / spring-launch follow-through — mirrors rules.resolveRoll
    const resolve = (from, dx, dz) => {
      const step = (p) => {
        const to = g.level.tiles.get(\`\${p.x + dx},\${p.z + dz}\`);
        if (!to) return null;
        const drop = p.h - to.h;
        if (drop < -1 || drop > 2) return null;
        if (p.shuttle && to.shuttle) return null; // no dock-to-dock rolls (mirrors rules.resolveRoll)
        return to;
      };
      const launch = (fromPad) => {
        let px = fromPad.x, pz = fromPad.z;
        for (let k2 = 1; k2 <= 3; k2++) {
          const c = g.level.tiles.get(\`\${px + dx},\${pz + dz}\`);
          px += dx; pz += dz;
          if (!c) continue;
          const dh = c.h - fromPad.h;
          if (dh > 3 || dh < -3) return null;
          return c;
        }
        return null;
      };
      let t = from.spring ? launch(from) : step(from);
      if (!t) return null;
      if (t.spring) {
        t = launch(t);
        if (!t) return null;
      }
      while (t.ice) {
        const n = step(t);
        if (!n) break;
        t = n;
        if (t.spring) { t = launch(t); break; } // a slide landing on a pad fires it (game autoContinue)
      }
      return t;
    };
    const q = [g.level.tiles.get(\`\${g.cube.x},\${g.cube.z}\`)];
    const seen = new Map();
    seen.set(\`\${g.cube.x},\${g.cube.z}\`, null);
    let found = false;
    while (q.length) {
      const cur = q.shift();
      if (cur.x === target.x && cur.z === target.z) { found = true; break; }
      for (const [dname, dx, dz] of dirs) {
        const to = resolve(cur, dx, dz);
        if (!to) continue;
        const k = \`\${to.x},\${to.z}\`;
        if (seen.has(k)) continue;
        seen.set(k, { from: \`\${cur.x},\${cur.z}\`, dir: dname });
        q.push(to);
      }
      if (cur.shuttle) {
        // ride to the far dock
        const sh = g.level.shuttles[cur.shuttleId];
        const onA = cur.x === sh.a[0] && cur.z === sh.a[1];
        const [rx, rz] = onA ? sh.b : sh.a;
        const rt = g.level.tiles.get(\`\${rx},\${rz}\`);
        const rk = \`\${rt.x},\${rt.z}\`;
        if (!seen.has(rk)) {
          seen.set(rk, { from: \`\${cur.x},\${cur.z}\`, dir: 'ride' });
          q.push(rt);
        }
      }
    }
    if (!found) return null;
    const tiles = [];
    const moves = [];
    let cur = \`\${target.x},\${target.z}\`;
    while (seen.get(cur)) {
      const step = seen.get(cur);
      moves.unshift(step.dir);
      const [x, z] = cur.split(',').map(Number);
      tiles.unshift({ x, z });
      cur = step.from;
    }
    const [sx, sz] = \`\${g.cube.x},\${g.cube.z}\`.split(',').map(Number);
    tiles.unshift({ x: sx, z: sz });
    return { tiles, moves };
  })`;
}

/** Hazards-off driver (KUBIK_PLAY_OFF=1 fast mode). */
async function driveRoute(tiles, moves) {
  let stuck = 0;
  for (let r = 0; r < tiles.length - 1; ) {
    const st = await snap();
    if (st.state === 'won') return true;
    if (st.state !== 'playing') return false;
    const target = tiles[r + 1];
    if (st.x === target.x && st.z === target.z) { r++; stuck = 0; continue; }
    if (st.x !== tiles[r].x || st.z !== tiles[r].z) return false; // desync
    if (++stuck > 3) return false; // cannot advance (no pushes left, etc.)
    if (moves[r] === 'ride') {
      const t0 = Date.now();
      let carried = false;
      while (!carried && Date.now() - t0 < 16000) {
        const s2 = await snap();
        if (s2.state === 'won') return true;
        if (s2.state !== 'playing') return false;
        carried = s2.x === target.x && s2.z === target.z;
        if (!carried) await wait(80);
      }
      if (!carried) return false;
      r++;
      continue;
    }
    const res = await pressRoll(moves[r], target);
    if (res === 'won') return true;
    if (res === 'dead') return false;
  }
  const st = await snap();
  const last = tiles[tiles.length - 1];
  return st.state === 'won' || (st.x === last.x && st.z === last.z);
}

/**
 * Reach a target tile by RE-PLAYING: plan a route from the current tile,
 * drive it with real key presses, and after any death/respawn or breeze
 * displacement plan again from wherever the cube is. Returns true once the
 * target is reached (or the level is won).
 */
async function reachTarget(targetExpr, ctx) {
  const target = await page.evaluate(new Function(`return (${targetExpr})`));
  for (let attempt = 0; attempt < 8; attempt++) {
    let st = await snap();
    if (st.state === 'won') return true;
    if (st.state !== 'playing') {
      // a rescue offer? accept it — the bot recovers from the bench (this
      // also exercises the rescue flow live); otherwise wait for the
      // auto-restart
      const offered = await page.evaluate(() => window.__kubik.game.rescueOffered);
      if (offered) await page.evaluate(() => window.__kubik.game.acceptRescue());
      if (!(await waitFor(() => window.__kubik.game.state === 'playing', 10000))) return false;
      // the bench (or the auto-restart) placed the cube — plan from the
      // FRESH position, never the stale one
      st = await snap();
    }
    let route;
    if (LIVE && ctx) {
      const broken = new Set(await brokenKeys());
      route = planRoute(ctx, st, target, broken, !st.hasKey);
      const dc = await page.evaluate(() => window.__kubik.game.lastDeathCause);
      dbg(`attempt ${attempt + 1}: at ${st.x},${st.z} → ${target.x},${target.z} (lastDeath=${dc}): ${route ? route.moves.length + ' rolls: ' + route.tiles.map((t) => t.x + ',' + t.z).join(' ') : 'NO FAIR ROUTE'}`);
    } else {
      route = await page.evaluate(new Function(`return (${bfsEval(targetExpr)})()`));
    }
    if (!route && LIVE && ctx) {
      // the cube may be caught mid-mechanism (a shuttle carrying it between
      // docks, a slide still settling): its position is then not a tile and
      // the planner rightly finds nothing. Wait for it to settle onto a
      // real tile and plan again before declaring the level unplayable
      // (L196, 2026-11-13).
      for (let w = 0; w < 40 && !route; w++) {
        await wait(300);
        const s3 = await snap();
        if (s3.state === 'won') return true;
        if (s3.state !== 'playing') break;
        if (!ctx.model.tiles.has(key(s3.x, s3.z))) continue;
        const broken2 = new Set(await brokenKeys());
        route = planRoute(ctx, s3, target, broken2, !s3.hasKey);
        if (route) dbg(`attempt ${attempt + 1}: re-planned after settling at ${s3.x},${s3.z}: ${route.moves.length} rolls`);
      }
    }
    if (!route) return false; // no fair route from here
    if (route.moves.length === 0) {
      // already standing on the target — it may still be settling
      await wait(120);
      const s2 = await snap();
      if (s2.state === 'won') return true;
      if (s2.x === target.x && s2.z === target.z) return true;
    }
    const res = LIVE && ctx ? await driveRouteLive(route.tiles, route.moves, ctx) : await driveRoute(route.tiles, route.moves);
    if (res === 'replan') continue; // the breeze moved us — plan again
    if (res === true) return true;
  }
  const st = await snap();
  return st.state === 'won' || (st.state === 'playing' && st.x === target.x && st.z === target.z);
}

/** Play one level to completion. Returns { ok, moves, note }. */
async function playLevel(index) {
  const setup = await page.evaluate((i, off) => {
    const { game, startLevel } = window.__kubik;
    startLevel(i);
    const g = game;
    if (off) {
      // fast-mode convention: hazards off (route/input sanity only)
      g.view.orbs.forEach((o) => (o.holder.visible = false));
      g.view.orbs.length = 0;
      for (const c of g.view.crumbles.values()) c.tile.crumble = false;
      g.level.sliders.forEach((s) => (s.period = 1e9)); // bridges frozen up
    }
    return { name: g.def.name, hasKey: !!g.level.gateKey, def: g.def };
  }, index, !LIVE);

  if (!(await waitFor(() => window.__kubik.game.state === 'playing', 10000))) {
    return { ok: false, moves: 0, note: 'level did not start' };
  }

  const ctx = LIVE ? liveCtx(setup.def) : null;
  let moves = 0;
  if (setup.hasKey) {
    await reachTarget('window.__kubik.game.level.gateKey', ctx);
    moves = await page.evaluate(() => window.__kubik.game.moves);
    const gotKey = await waitFor(() => window.__kubik.game.hasKey, 3000);
    if (!gotKey) return { ok: false, moves, note: 'key unreachable / not picked up' };
  }

  const ok = await reachTarget('window.__kubik.game.level.goal', ctx);
  if (!ok) return { ok: false, moves, note: 'goal not reached' };
  const won = await waitFor(() => window.__kubik.game.state === 'won', 5000);
  const info = await snap();
  if (!(won && info.idx === index)) return { ok: false, moves, note: `state ${info.state}` };
  moves = await page.evaluate(() => window.__kubik.game.moves);
  return { ok: true, moves, note: '' };
}

// ---------------------------------------------------------------------------
console.log(
  `KUBIK playable-route test — every level must be completable by real play (${LIVE ? 'LIVE hazards' : 'fast mode, hazards off'})\n`,
);
let pass = 0;
const t0 = Date.now();

for (let i = 0; i < LEVELS.length; i++) {
  if (ONLY.length && !ONLY.includes(i + 1)) continue;
  const res = await playLevel(i);
  // dismiss the win panel between levels
  await page.evaluate(() => document.getElementById('btn-next').click());
  await wait(200);
  if (res.ok) pass++;
  console.log(
    `${res.ok ? '✓' : '✗'} ${String(i + 1).padStart(2, '0')} ${LEVELS[i].name} — ${res.ok ? `${res.moves} moves` : res.note}`,
  );
}

// today's daily challenge plays with the same live contract
await page.evaluate(() => window.__kubik.startDaily());
await waitFor(() => window.__kubik.game.state === 'playing', 10000);
// the page's local date is the source of truth (IST ≠ UTC on half the days)
const dailyDate = await page.evaluate(() => window.__kubik.game.dailyDate);
const dailyDef = getDailyLevel(dailyDate).def;
if (!LIVE) {
  await page.evaluate(() => {
    const gg = window.__kubik.game;
    gg.view.orbs.forEach((o) => (o.holder.visible = false));
    gg.view.orbs.length = 0;
    for (const c of gg.view.crumbles.values()) c.tile.crumble = false;
  });
}
const dailyCtx = LIVE ? liveCtx(dailyDef) : null;
const dailyOk = (await reachTarget('window.__kubik.game.level.goal', dailyCtx)) &&
  (await waitFor(() => window.__kubik.game.state === 'won', 5000));
if (dailyOk) pass++;
console.log(`${dailyOk ? '✓' : '✗'} DAILY today's challenge ${dailyOk ? '' : '— not completable'}`);

// total = the requested set (KUBIK_LEVELS), not the whole catalogue —
// otherwise every stratified (subset) run exits red no matter what it
// passes, and the pre-commit gate blocks every commit. M2.5, 2026-11-13
// (the 14–50 gate passed 38/38 yet exited 1).
const total = (ONLY.length ? ONLY.length : LEVELS.length) + 1;
const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`\n${pass}/${total} playable (${secs}s) · page errors: ${errors.length ? errors.length : 'none'}`);
if (errors.length) console.log('errors:', errors.slice(0, 5));
await browser.close();
process.exit(pass === total && !errors.length ? 0 : 1);
