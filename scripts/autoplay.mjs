// Plays every level end-to-end in a real browser using BFS routes and the
// real keyboard input path. Hazards are switched off for the route test so we
// verify movement/win logic, not reflexes.
//   LD_LIBRARY_PATH=... node scripts/autoplay.mjs
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const URL = process.env.URL || 'http://localhost:5173/';

const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 900, height: 600 },
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
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

const levelCount = await page.evaluate(() => window.__kubik.game.level ? 12 : 12);
let pass = 0;

for (let i = 0; i < levelCount; i++) {
  const route = await page.evaluate((index) => {
    const { game, startLevel } = window.__kubik;
    startLevel(index);
    const g = game;
    // disable hazards for the route test
    g.view.orbs.forEach((o) => (o.holder.visible = false));
    g.view.orbs.length = 0;
    for (const c of g.view.crumbles.values()) c.tile.crumble = false;

    const name = g.def.name;
    const start = g.level.start;
    const goal = g.level.goal;
    const keyOf = (s) => s;
    const dirs = [
      ['up', 0, -1],
      ['down', 0, 1],
      ['left', -1, 0],
      ['right', 1, 0],
    ];
    const q = [start];
    const seen = new Map();
    seen.set(`${start.x},${start.z}`, null);
    let found = false;
    while (q.length) {
      const cur = q.shift();
      if (cur === goal) { found = true; break; }
      for (const [dname, dx, dz] of dirs) {
        const to = g.level.tiles.get(`${cur.x + dx},${cur.z + dz}`);
        if (!to) continue;
        const drop = cur.h - to.h;
        if (drop < 0 || drop > 2) continue;
        const k = `${to.x},${to.z}`;
        if (seen.has(k)) continue;
        seen.set(k, { from: `${cur.x},${cur.z}`, dir: dname });
        q.push(to);
      }
    }
    if (!found) return { name, ok: false, moves: [] };
    const moves = [];
    let cur = `${goal.x},${goal.z}`;
    while (seen.get(cur)) {
      const step = seen.get(cur);
      moves.unshift(step.dir);
      cur = step.from;
    }
    return { name, ok: true, moves };
  }, i);

  if (!route.ok) {
    console.log(`✗ ${String(i + 1).padStart(2, '0')} ${route.name} — no route`);
    continue;
  }

  await waitFor(() => window.__kubik.game.state === 'playing');

  for (const dir of route.moves) {
    const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    await page.keyboard.press(keyMap[dir]);
    await waitFor(() => !window.__kubik.game.cube.anim || window.__kubik.game.state === 'won', 8000);
    await new Promise((r) => setTimeout(r, 30));
  }

  const won = await waitFor(() => window.__kubik.game.state === 'won', 12000);
  const info = await page.evaluate(() => ({
    state: window.__kubik.game.state,
    shards: window.__kubik.game.shardsCollected,
    total: window.__kubik.game.totalShards,
    idx: window.__kubik.game.levelIndex,
  }));
  console.log(`${won && info.idx === i ? '✓' : '✗'} ${String(i + 1).padStart(2, '0')} ${route.name} — ${route.moves.length} moves, shards ${info.shards}/${info.total}, state ${info.state}`);
  if (won && info.idx === i) pass++;
  // dismiss the win panel
  await page.evaluate(() => document.getElementById('btn-next').click());
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\n${pass}/${levelCount} levels completed`);
if (errors.length) console.log('errors:', errors);
await browser.close();
process.exit(pass === levelCount && !errors.length ? 0 : 1);
