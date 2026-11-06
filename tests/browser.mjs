// Shared bootstrap for the browser-based tests (regression / gameplay / perf).
// Launches headless Chromium (SwiftShader) pointed at the running game.
import { existsSync } from 'node:fs';

// Sandbox NSS libs (no-op on CI where the OS provides them).
const nssDir = '/tmp/dist/Release/lib';
if (existsSync(`${nssDir}/libnss3.so`)) {
  process.env.LD_LIBRARY_PATH = [process.env.LD_LIBRARY_PATH, nssDir].filter(Boolean).join(':');
}

const puppeteer = (await import('puppeteer-core')).default;
const chromium = (await import('@sparticuz/chromium')).default;

export const URL = process.env.URL || 'http://localhost:5173/';

export async function launch(url = URL) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error(`✗ game not reachable at ${url}`);
    console.error('  start it (npm run dev) or point the test at it (URL=...)');
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
    if (!e.message.includes('WebSocket')) errors.push(`pageerror: ${e.message}`);
  });
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('WebSocket')) errors.push(`console: ${t}`);
  });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200)); // let the first level settle
  return { browser, page, errors };
}

/** Flush in-flight CDP commands, then close without racing them. */
export async function close(browser) {
  await wait(250);
  try {
    await browser.close();
  } catch {
    /* close race with a pending command — the test result is already printed */
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const waitFor = async (page, fn, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(fn)) return true;
    await wait(100);
  }
  return false;
};

export const state = (page) =>
  page.evaluate(() => {
    const g = window.__kubik.game;
    return {
      state: g.state,
      paused: g.paused,
      x: g.cube.x,
      z: g.cube.z,
      idx: g.levelIndex,
      moves: g.moves,
    };
  });

/** Drive the cube through `tiles`/`moves` with real key presses. */
export async function driveRoute(page, tiles, moves) {
  const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  let stuck = 0;
  for (let r = 0; r < tiles.length - 1; ) {
    const st = await state(page);
    if (st.state === 'won') return true;
    if (st.state !== 'playing') return false;
    const target = tiles[r + 1];
    if (st.x === target.x && st.z === target.z) { r++; stuck = 0; continue; }
    if (st.x !== tiles[r].x || st.z !== tiles[r].z) return false;
    if (++stuck > 3) return false;
    await page.keyboard.press(keyMap[moves[r]]);
    await waitFor(page, () => !window.__kubik.game.cube.anim || window.__kubik.game.state === 'won', 8000);
    await wait(30);
  }
  const st = await state(page);
  const last = tiles[tiles.length - 1];
  return st.state === 'won' || (st.x === last.x && st.z === last.z);
}

/** In-page BFS from the current cube tile to the target expression. */
export const bfsEval = (targetExpr) => `(() => {
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
      if (drop < -1 || drop > 2) continue;
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
