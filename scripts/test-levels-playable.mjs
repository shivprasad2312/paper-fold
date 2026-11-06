// ---------------------------------------------------------------------------
// KUBIK — playable-route test
//
// The level contract, proven by PLAYING: for every level (and today's daily
// challenge) there must exist at least one route that a player can actually
// complete. The test drives the real keyboard input path in a real browser,
// follows a BFS route, and re-plans from the cube's current tile after any
// death/respawn. A level only passes when the game itself reports `won`.
//
// Hazards are switched off during the route drive (same convention as the
// old autoplay): this test proves the ROUTE exists through the real
// input/render path; hazard solvability (crumble-aware routes, spawn safety,
// push budgets) is proven separately by scripts/verify-levels.mjs. Together
// the two guarantee: a path is there, and hazards can't seal it.
//
//   npm run test:play            (dev server must be running, or set URL=)
//   URL=http://localhost:4173/ npm run test:play   (against a preview build)
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

const URL = process.env.URL || 'http://localhost:5173/';

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

/**
 * Drive the cube through `tiles` (full route incl. start) using `moves`.
 * Pushes keep the cube on its tile, so the driver re-presses the same
 * direction until the cube actually advances.
 */
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
    const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    await page.keyboard.press(keyMap[moves[r]]);
    await waitFor(() => !window.__kubik.game.cube.anim || window.__kubik.game.state === 'won', 8000);
    await wait(30);
  }
  const st = await snap();
  const last = tiles[tiles.length - 1];
  return st.state === 'won' || (st.x === last.x && st.z === last.z);
}

// In-page BFS: tile list + directions from the cube's CURRENT tile to target.
function bfsEval(targetExpr) {
  return `(() => {
    const g = window.__kubik.game;
    const target = ${targetExpr};
    const dirs = [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]];
    const q = [g.level.tiles.get(\`\${g.cube.x},\${g.cube.z}\`)];
    const seen = new Map();
    seen.set(\`\${g.cube.x},\${g.cube.z}\`, null);
    let found = false;
    while (q.length) {
      const cur = q.shift();
      if (cur.x === target.x && cur.z === target.z) { found = true; break; }
      for (const [dname, dx, dz] of dirs) {
        const to = g.level.tiles.get(\`\${cur.x + dx},\${cur.z + dz}\`);
        if (!to) continue;
        const drop = cur.h - to.h;
        if (drop < -1 || drop > 2) continue; // fall at most 2, climb at most 1
        const k = \`\${to.x},\${to.z}\`;
        if (seen.has(k)) continue;
        seen.set(k, { from: \`\${cur.x},\${cur.z}\`, dir: dname });
        q.push(to);
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

/**
 * Reach a target tile by RE-PLAYING: plan a route from the current tile,
 * drive it with real key presses, and after any death/respawn plan again
 * from wherever the cube is. Returns true once the target is reached (or
 * the level is won). Fails fast when no route exists from the current tile.
 */
async function reachTarget(targetExpr) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const st = await snap();
    if (st.state === 'won') return true;
    if (st.state !== 'playing') {
      if (!(await waitFor(() => window.__kubik.game.state === 'playing', 10000))) return false;
    }
    const route = await page.evaluate(new Function(`return (${bfsEval(targetExpr)})()`));
    if (!route) return false; // no route from here
    if (route.moves.length === 0) {
      // already standing on the target — it may still be settling
      await wait(120);
      const s2 = await snap();
      if (s2.state === 'won') return true;
      const at = await page.evaluate(new Function(`return (${targetExpr})`));
      if (s2.x === at.x && s2.z === at.z) return true;
    }
    await driveRoute(route.tiles, route.moves);
  }
  const st = await snap();
  const at = await page.evaluate(new Function(`return (${targetExpr})`));
  return st.state === 'won' || (st.state === 'playing' && st.x === at.x && st.z === at.z);
}

/** Play one level to completion. Returns { ok, moves, note }. */
async function playLevel(index) {
  const setup = await page.evaluate((i) => {
    const { game, startLevel } = window.__kubik;
    startLevel(i);
    const g = game;
    // route-test convention: hazards off (verify-levels.mjs proves the
    // hazards-aware solvability separately)
    g.view.orbs.forEach((o) => (o.holder.visible = false));
    g.view.orbs.length = 0;
    for (const c of g.view.crumbles.values()) c.tile.crumble = false;
    g.level.sliders.forEach((s) => (s.period = 1e9)); // bridges frozen up
    return { name: g.def.name, hasKey: !!g.level.gateKey };
  }, index);

  if (!(await waitFor(() => window.__kubik.game.state === 'playing', 10000))) {
    return { ok: false, moves: 0, note: 'level did not start' };
  }

  let moves = 0;
  if (setup.hasKey) {
    await reachTarget('window.__kubik.game.level.gateKey');
    moves = await page.evaluate(() => window.__kubik.game.moves);
    const gotKey = await waitFor(() => window.__kubik.game.hasKey, 3000);
    if (!gotKey) return { ok: false, moves, note: 'key unreachable / not picked up' };
  }

  const ok = await reachTarget('window.__kubik.game.level.goal');
  if (!ok) return { ok: false, moves, note: 'goal not reached' };
  const won = await waitFor(() => window.__kubik.game.state === 'won', 5000);
  const info = await snap();
  if (!(won && info.idx === index)) return { ok: false, moves, note: `state ${info.state}` };
  moves = await page.evaluate(() => window.__kubik.game.moves);
  return { ok: true, moves, note: '' };
}

// ---------------------------------------------------------------------------
console.log('KUBIK playable-route test — every level must be completable by real play\n');
let pass = 0;
const t0 = Date.now();

for (let i = 0; i < LEVELS.length; i++) {
  const res = await playLevel(i);
  // dismiss the win panel between levels
  await page.evaluate(() => document.getElementById('btn-next').click());
  await wait(200);
  if (res.ok) pass++;
  console.log(
    `${res.ok ? '✓' : '✗'} ${String(i + 1).padStart(2, '0')} ${LEVELS[i].name} — ${res.ok ? `${res.moves} moves` : res.note}`,
  );
}

// today's daily challenge plays with the same contract
await page.evaluate(() => window.__kubik.startDaily());
await waitFor(() => window.__kubik.game.state === 'playing', 10000);
await page.evaluate(() => {
  const gg = window.__kubik.game;
  gg.view.orbs.forEach((o) => (o.holder.visible = false));
  gg.view.orbs.length = 0;
  for (const c of gg.view.crumbles.values()) c.tile.crumble = false;
});
const dailyOk = await reachTarget('window.__kubik.game.level.goal')
  && await waitFor(() => window.__kubik.game.state === 'won', 5000);
if (dailyOk) pass++;
console.log(`${dailyOk ? '✓' : '✗'} DAILY today's challenge ${dailyOk ? '' : '— not completable'}`);

const total = LEVELS.length + 1;
const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`\n${pass}/${total} playable (${secs}s) · page errors: ${errors.length ? errors.length : 'none'}`);
if (errors.length) console.log('errors:', errors.slice(0, 5));
await browser.close();
process.exit(pass === total && !errors.length ? 0 : 1);
