// Plays every level end-to-end in a real browser using BFS routes and the
// real keyboard input path. Hazards are switched off for the route test so we
// verify movement/win logic, not reflexes. Levels with a gate key go fetch
// the key first; levels with blocks rely on the telekinesis pushes.
//   LD_LIBRARY_PATH=... node scripts/autoplay.mjs
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { LEVELS } from '../src/levels.js';

const URL = process.env.URL || 'http://localhost:5173/';

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
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const waitFor = async (fn, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(fn)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
};

const levelCount = LEVELS.length;
let pass = 0;

/**
 * Drive the cube through `tiles` (the full route incl. start) using the
 * matching `moves`. Pushes keep the cube on its tile, so the driver simply
 * re-presses the same direction until the cube actually advances.
 */
async function driveRoute(tiles, moves) {
  let stuck = 0;
  for (let r = 0; r < tiles.length - 1; ) {
    const st = await page.evaluate(() => {
      const g = window.__kubik.game;
      return { x: g.cube.x, z: g.cube.z, state: g.state };
    });
    if (st.state === 'won') return true;
    if (st.state !== 'playing') return false;
    const target = tiles[r + 1];
    if (st.x === target.x && st.z === target.z) { r++; stuck = 0; continue; }
    if (st.x !== tiles[r].x || st.z !== tiles[r].z) return false; // desync
    if (++stuck > 3) return false; // cannot advance (no pushes left, etc.)
    const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    await page.keyboard.press(keyMap[moves[r]]);
    await waitFor(() => !window.__kubik.game.cube.anim || window.__kubik.game.state === 'won', 8000);
    await new Promise((res) => setTimeout(res, 30));
  }
  const st = await page.evaluate(() => {
    const g = window.__kubik.game;
    return { x: g.cube.x, z: g.cube.z, state: g.state };
  });
  const last = tiles[tiles.length - 1];
  return st.state === 'won' || (st.x === last.x && st.z === last.z);
}

// In-page BFS returning the tile list + directions from the cube's tile to target.
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
  })()`;
}

for (let i = 0; i < levelCount; i++) {
  const setup = await page.evaluate((index) => {
    const { game, startLevel } = window.__kubik;
    startLevel(index);
    const g = game;
    // disable hazards for the route test
    g.view.orbs.forEach((o) => (o.holder.visible = false));
    g.view.orbs.length = 0;
    for (const c of g.view.crumbles.values()) c.tile.crumble = false;
    // freeze the sliding bridges: treat them as always up
    g.level.sliders.forEach((s) => (s.period = 1e9));
    return { name: g.def.name, hasKey: !!g.level.gateKey };
  }, i);

  await waitFor(() => window.__kubik.game.state === 'playing');

  let keyMovesCount = 0;
  if (setup.hasKey) {
    const keyRoute = await page.evaluate(new Function(`return ${bfsEval('g.level.gateKey')}`));
    if (!keyRoute) { console.log(`✗ ${String(i + 1).padStart(2, '0')} ${setup.name} — no route to key`); continue; }
    await driveRoute(keyRoute.tiles, keyRoute.moves);
    keyMovesCount = keyRoute.moves.length;
    const gotKey = await waitFor(() => window.__kubik.game.hasKey, 3000);
    if (!gotKey) { console.log(`✗ ${String(i + 1).padStart(2, '0')} ${setup.name} — key not picked up`); continue; }
  }

  const goalRoute = await page.evaluate(new Function(`return ${bfsEval('g.level.goal')}`));
  if (!goalRoute) {
    console.log(`✗ ${String(i + 1).padStart(2, '0')} ${setup.name} — no route`);
    continue;
  }
  await driveRoute(goalRoute.tiles, goalRoute.moves);
  const total = keyMovesCount + goalRoute.moves.length;

  const won = await waitFor(() => window.__kubik.game.state === 'won', 12000);
  const info = await page.evaluate(() => ({
    state: window.__kubik.game.state,
    shards: window.__kubik.game.shardsCollected,
    total: window.__kubik.game.totalShards,
    idx: window.__kubik.game.levelIndex,
  }));
  console.log(
    `${won && info.idx === i ? '✓' : '✗'} ${String(i + 1).padStart(2, '0')} ${setup.name} — ${total} moves` +
      (keyMovesCount ? ` (key ${keyMovesCount})` : '') +
      `, shards ${info.shards}/${info.total}, state ${info.state}`,
  );
  if (won && info.idx === i) pass++;
  // dismiss the win panel
  await page.evaluate(() => document.getElementById('btn-next').click());
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\n${pass}/${levelCount} levels completed`);
if (errors.length) console.log('errors:', errors);
await browser.close();
process.exit(pass === levelCount && !errors.length ? 0 : 1);
