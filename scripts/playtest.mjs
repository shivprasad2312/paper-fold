// End-to-end playtest in a real (headless) browser.
//   LD_LIBRARY_PATH=... node scripts/playtest.mjs
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || 'shots';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => {
  if (!e.message.includes('WebSocket')) errors.push(e.message);
});
page.on('console', (m) => {
  const t = m.text();
  // Vite's HMR socket can't reach port 443 from the test harness; ignore it.
  if (m.type() === 'error' && !t.includes('WebSocket')) errors.push(t);
});

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Headless software GL runs at a few fps, so wait on game state, not wall time.
const waitFor = async (fn, timeout = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(fn)) return true;
    await wait(120);
  }
  return false;
};
const idle = () => waitFor(() => !window.__kubik.game.cube.anim && window.__kubik.game.state !== 'idle');
const press = async (k) => {
  await page.keyboard.press(k);
  await wait(80);
  await idle();
  await wait(60);
};
const state = () => page.evaluate(() => {
  const g = window.__kubik.game;
  return {
    idx: g.levelIndex,
    state: g.state,
    paused: g.paused,
    cube: { x: g.cube.x, z: g.cube.z, h: g.cube.h },
    shards: g.shardsCollected,
    total: g.totalShards,
    time: +g.elapsed.toFixed(2),
    winVisible: !document.getElementById('win').classList.contains('hidden'),
    deadCrumble: [...g.view.crumbles.values()].filter((c) => c.state !== 'idle').length,
  };
});

const results = [];
function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
}

const load = async (i) => {
  await page.evaluate((n) => window.__kubik.startLevel(n), i);
  await wait(250);
  await idle();
};

// ---- level 1: simple win + shard -----------------------------------------
await load(0);
let s0 = await state();
check('level 1 loads at start', s0.cube.x === 3 && s0.cube.z === 2 && s0.state === 'playing', JSON.stringify(s0.cube));

await press('ArrowUp');
let s1 = await state();
check('roll up moves one tile', s1.cube.x === 3 && s1.cube.z === 1, JSON.stringify(s1.cube));
check('shard picked up', s1.shards === 1, `shards=${s1.shards}`);

// ---- level 2: a 2-step wall still can't be climbed -----------------------
await load(1); // Step Down: heights 3 (start) → 1 → 0 (goal)
let l2 = await state();
check('level 2 loads', l2.cube.h === 3, `h=${l2.cube.h}`);
await press('ArrowUp'); // 3 -> 1, a legal 2-drop
l2 = await state();
check('can drop down two', l2.cube.h === 1, `h=${l2.cube.h}`);
await press('ArrowDown'); // 1 -> 3 is a 2-climb: refused
const blocked = await state();
check('cannot climb a 2-step wall', blocked.cube.x === 3 && blocked.cube.z === 1 && blocked.cube.h === 1,
  `stayed at ${blocked.cube.x},${blocked.cube.z} h${blocked.cube.h}`);
await press('ArrowUp'); // onto the goal terrace
l2 = await state();
check('rolls onto the goal terrace', l2.state === 'won', l2.state);

// ---- level 3: a 1-step climb is now legal --------------------------------
await load(2); // Switchback: start (5,6) h=3, row z=5 is h=2
let l3 = await state();
check('level 3 loads', l3.cube.x === 5 && l3.cube.z === 6 && l3.cube.h === 3, JSON.stringify(l3.cube));
await press('ArrowUp'); // (5,6)h3 -> (5,5)h2, a drop
l3 = await state();
check('drops to the lower terrace', l3.cube.x === 5 && l3.cube.z === 5 && l3.cube.h === 2, JSON.stringify(l3.cube));
await press('ArrowDown'); // (5,5)h2 -> (5,6)h3, a 1-step CLIMB (now legal)
l3 = await state();
check('can climb back up one step', l3.cube.x === 5 && l3.cube.z === 6 && l3.cube.h === 3, JSON.stringify(l3.cube));

// ---- level 1 finish -------------------------------------------------------
await load(0);
await press('ArrowUp');
await press('ArrowUp');
await waitFor(() => window.__kubik.game.state === 'won');
await wait(1200);
const w = await state();
check('reaching the gate wins', w.state === 'won', w.state);
check('win panel shows', w.winVisible, `time=${w.time}`);
await shot('10-win');
check('win time recorded', w.time > 0, `${w.time}s`);

// ---- level 3: falls off the void and respawns ----------------------------
await load(2);
await page.keyboard.press('ArrowDown'); // straight off the edge
await waitFor(() => window.__kubik.game.state === 'dead');
const falling = await state();
check('rolling into the void kills', falling.state === 'dead', falling.state);
await shot('11-death');
await waitFor(() => window.__kubik.game.state === 'playing');
const back = await state();
check('auto respawn after death', back.state === 'playing' && back.cube.z === 6, JSON.stringify(back.cube));

// ---- level 5: cracked slabs ---------------------------------------------
await load(4);
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowUp');
const cr = await state();
check('cracked slab starts to break', cr.deadCrumble > 0, `broken=${cr.deadCrumble}`);
await shot('12-crumble');
await press('ArrowUp');
await press('ArrowUp');
await waitFor(() => window.__kubik.game.state === 'won', 12000);
await wait(1200);
const l5 = await state();
check('level 5 is winnable', l5.state === 'won', l5.state);

// ---- level 12 visual ------------------------------------------------------
await load(11);
await wait(500);
await shot('13-level12');
const l12 = await state();
check('level 12 loads', l12.idx === 11 && l12.state === 'playing');

// ---- pause / restart ------------------------------------------------------
await page.keyboard.press('Escape');
await wait(400);
check('escape pauses', (await state()).paused === true);
await shot('14-pause');
await page.keyboard.press('Escape');
await wait(300);
check('escape resumes', (await state()).paused === false);

// ---- level select ---------------------------------------------------------
await page.evaluate(() => window.__kubik.openLevels());
await wait(600);
await shot('15-levels');
const unlocked = await page.evaluate(() => window.__kubik.save.unlocked);
check('progress unlocks levels', unlocked >= 5, `unlocked=${unlocked}`);

console.log('\nerrors:', errors.length ? errors : 'none');
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length || errors.length ? 1 : 0);
