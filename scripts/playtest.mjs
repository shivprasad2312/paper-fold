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
    nudges: g.nudgeLeft,
    blocks: [...g.blocks.keys()],
    hasKey: g.hasKey,
    gateLocked: g.gateLocked,
    deathCause: g.lastDeathCause,
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

// ---- level 1 finish + medal + ghost --------------------------------------
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

const medal = await page.evaluate(() => window.__kubik.save.best[1]?.medal);
check('medal recorded on win', ['bronze', 'silver', 'gold'].includes(medal), `medal=${medal}`);
const ghostLog = await page.evaluate(() => window.__kubik.save.ghosts[1]?.log?.length);
check('best run stored as a ghost route', ghostLog > 1, `log=${ghostLog} points`);
await page.evaluate(() => window.__kubik.restartLevel());
await idle();
const ghostOn = await page.evaluate(() => {
  const g = window.__kubik.game;
  return !!g.ghostMesh && g.ghostMesh.visible;
});
check('ghost cube appears on retry', ghostOn);

// ---- level 3: falls off the void and respawns ----------------------------
await load(2);
await page.keyboard.press('ArrowDown'); // straight off the edge
await waitFor(() => window.__kubik.game.state === 'dead');
const falling = await state();
check('rolling into the void kills', falling.state === 'dead', falling.state);
check('death cause tracked', falling.deathCause === 'void', falling.deathCause);
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

// ---- level 4: telekinesis — push the dark cubes aside --------------------
await load(3); // Twin Bridges (reworked): blocks on both bridgeheads
let l4 = await state();
check('level 4 loads at the walled deck', l4.cube.x === 4 && l4.cube.z === 5, JSON.stringify(l4.cube));
check('two pushes available', l4.nudges === 2, `nudges=${l4.nudges}`);
await shot('20-l4-blocks');
await press('ArrowUp'); // (4,5) -> (4,4)
l4 = await state();
check('rolls to the bridgehead', l4.cube.x === 4 && l4.cube.z === 4, JSON.stringify(l4.cube));
await press('ArrowLeft'); // into the block: a PUSH, not a roll
l4 = await state();
check('push consumes a charge', l4.nudges === 1, `nudges=${l4.nudges}`);
check('block slid one tile aside', l4.blocks.includes('2,4') && !l4.blocks.includes('3,4'), l4.blocks.join(' '));
check('cube stays put while pushing', l4.cube.x === 4 && l4.cube.z === 4, JSON.stringify(l4.cube));
await press('ArrowLeft'); // the bridgehead is clear now
l4 = await state();
check('rolls through the pushed gap', l4.cube.x === 3 && l4.cube.z === 4, JSON.stringify(l4.cube));
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowRight');
await waitFor(() => window.__kubik.game.state === 'won', 15000);
l4 = await state();
check('level 4 winnable with one push', l4.state === 'won', l4.state);

// ---- level 8: the wind carries the cube ----------------------------------
await load(7); // Cascade: wind blowing up-left
let l8 = await state();
check('level 8 loads in the wind', l8.cube.x === 4 && l8.cube.z === 6, JSON.stringify(l8.cube));
// no input: after a breeze period the cube should drift one tile up-left
const drifted = await waitFor(() => {
  const g = window.__kubik.game;
  return !g.cube.anim && g.state === 'playing' && !(g.cube.x === 4 && g.cube.z === 6);
}, 20000);
l8 = await state();
check('wind drifts the idle cube', drifted && l8.cube.x === 3 && l8.cube.z === 5, JSON.stringify(l8.cube));
await shot('21-l8-wind');
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowUp');
await press('ArrowUp');
await waitFor(() => window.__kubik.game.state === 'won', 15000);
l8 = await state();
check('level 8 winnable in the wind', l8.state === 'won', l8.state);

// ---- level 12: locked gate + key -----------------------------------------
await load(11); // The Fold: sealed gate, key on the east deck
let l12 = await state();
check('level 12 gate starts sealed', l12.gateLocked === true && !l12.hasKey, `locked=${l12.gateLocked}`);
await shot('22-l12-locked');
// This section isolates the gate/key mechanic: remove the sentinels so the
// test is deterministic (their phase resets on every respawn, which would
// otherwise replay the same death forever). Sentinel timing itself is covered
// by the level 9/11 designs and the verifier.
await page.evaluate(() => {
  window.__kubik.game.view.orbs.length = 0;
});
// WEST route: (1,7) -> (2,7) -> up column 2 -> (3,0) -> goal (4,0).
const westNext = (st) => {
  const { x, z } = st.cube;
  if (x === 1 && z === 7) return 'ArrowRight';
  if (x === 2 && z > 0) return 'ArrowUp';
  if (x === 2 && z === 0) return 'ArrowRight';
  if (x === 3 && z === 0) return 'ArrowRight'; // final step: the sealed gate
  return null;
};
let refused = false;
for (let i = 0; i < 10 && !refused; i++) {
  await waitFor(() => window.__kubik.game.state === 'playing', 8000);
  let st = await state();
  if (st.state === 'won') break; // should never happen without the key
  const next = westNext(st);
  if (next) await press(next);
  st = await state();
  // standing on (3,0) in front of the gate: try the final step (toward the gate)
  if (st.cube.x === 3 && st.cube.z === 0 && st.gateLocked && st.state === 'playing') {
    await press('ArrowRight');
    st = await state();
    if (st.cube.x === 3 && st.cube.z === 0 && st.gateLocked && st.state === 'playing') { refused = true; break; }
  }
}
l12 = await state();
check('locked gate refuses the roll', refused && l12.state === 'playing' && l12.cube.x === 3 && l12.cube.z === 0,
  `at ${l12.cube.x},${l12.cube.z} state=${l12.state}`);
check('still sealed without the key', l12.gateLocked === true, `locked=${l12.gateLocked}`);
// fresh run for the key phase: back at the start, gate sealed again
await page.evaluate(() => window.__kubik.game.restart());
await idle();
// Now fetch the key on the EAST deck (6,4) and win through the opened gate.
const eastNext = (st) => {
  const { x, z } = st.cube;
  if (x === 5 && z === 0) return 'ArrowLeft'; // final step
  if (x === 6 && z === 0) return 'ArrowLeft';
  if (x === 6) return 'ArrowUp';
  if (z === 7) return 'ArrowRight';
  return 'ArrowUp';
};
let won12 = false;
for (let i = 0; i < 16 && !won12; i++) {
  await waitFor(() => window.__kubik.game.state === 'playing' || window.__kubik.game.state === 'won', 8000);
  const st = await state();
  if (st.state === 'won') { won12 = true; break; }
  const next = eastNext(st);
  if (next) await press(next);
}
l12 = await state();
check('key found, gate opens', l12.hasKey && l12.gateLocked === false, `key=${l12.hasKey} locked=${l12.gateLocked}`);
await shot('23-l12-key');
won12 = won12 || l12.state === 'won'; // the winning press may land on the last iteration
check('level 12 winnable with the key', won12 && l12.state === 'won', l12.state);

// ---- level 13: boss — standing on a sinking bridge kills ------------------
await page.evaluate(() => {
  const g = window.__kubik.game;
  g.load(12);
  // freeze the sentinels so only the bridge is tested
  g.view.orbs.forEach((o) => { o.def.speed = 0; o.dist = 0; });
  g.cube = { x: 4, z: 2, h: 0, anim: null, quat: g.cubeMesh.quaternion.clone() };
  g.cubeMesh.position.set(4, 0.5, 2);
  g.queue.length = 0;
});
const sliderKilled = await waitFor(() => {
  const g = window.__kubik.game;
  return g.state === 'dead' && g.lastDeathCause === 'slider';
}, 60000);
const l13 = await state();
check('sinking bridge drops the cube', sliderKilled && l13.deathCause === 'slider', `cause=${l13.deathCause}`);
await shot('24-l13-boss');
await waitFor(() => window.__kubik.game.state === 'playing', 10000);
const l13b = await state();
check('respawns back on the boss deck', l13b.state === 'playing' && l13b.cube.x === 5 && l13b.cube.z === 9, JSON.stringify(l13b.cube));

// ---- daily challenge: seeded, solvable, winnable --------------------------
await page.evaluate(() => window.__kubik.startDaily());
await wait(300);
await idle();
let daily = await state();
check('daily challenge loads', daily.idx === -1 && daily.state === 'playing', `idx=${daily.idx}`);
check('daily has a par', (await page.evaluate(() => window.__kubik.game.par)) > 0);
await shot('25-daily');
// Route test with hazards off (same convention as autoplay.mjs): the point is
// that the generated layout is solvable; the verifier proves the solvability
// with the crumble/orb solver. (Emptying the array survives respawns, which
// would otherwise reset the sentinels onto the route.)
await page.evaluate(() => {
  const g = window.__kubik.game;
  g.view.orbs.length = 0;
});
// BFS in-page (avoiding crumble slabs when possible), then drive the route.
const routeKeys = await page.evaluate(() => {
  const g = window.__kubik.game;
  const lvl = g.level;
  const K = (x, z) => x + ',' + z;
  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const bfs = (avoidCrumble) => {
    const start = lvl.start;
    const prev = new Map([[K(start.x, start.z), null]]);
    const q = [start];
    while (q.length) {
      const cur = q.shift();
      if (cur.x === lvl.goal.x && cur.z === lvl.goal.z) break;
      for (const [name, [dx, dz]] of Object.entries(dirs)) {
        const t = lvl.tiles.get(K(cur.x + dx, cur.z + dz));
        if (!t) continue;
        const dh = t.h - cur.h;
        if (dh > 1 || dh < -2) continue;
        if (avoidCrumble && t.crumble) continue;
        const k = K(t.x, t.z);
        if (!prev.has(k)) { prev.set(k, [cur, name]); q.push(t); }
      }
    }
    if (!prev.has(K(lvl.goal.x, lvl.goal.z))) return null;
    const path = [];
    let k = K(lvl.goal.x, lvl.goal.z);
    while (k && prev.get(k)) {
      const [tile, name] = prev.get(k);
      if (name) path.unshift(name);
      k = tile ? K(tile.x, tile.z) : null;
    }
    return path;
  };
  return bfs(true) || bfs(false);
});
check('daily has a computed route', Array.isArray(routeKeys) && routeKeys.length > 0, `${routeKeys?.length} rolls`);
let dailyWon = false;
for (let i = 0; i < 4 && !dailyWon && routeKeys; i++) {
  await waitFor(() => window.__kubik.game.state === 'playing', 8000);
  for (const k of routeKeys) {
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[k];
    await press(key);
    if ((await state()).state !== 'playing') break; // died: retry from respawn
  }
  dailyWon = (await state()).state === 'won';
}
daily = await state();
check('daily challenge is winnable', dailyWon && daily.state === 'won', daily.state);
const dailySaved = await page.evaluate(() => {
  const d = new Date();
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return !!window.__kubik.save.daily[s];
});
check('daily result saved', dailySaved);

// ---- level 12 visual ------------------------------------------------------
await load(11);
await wait(500);
await shot('13-level12');
const l12v = await state();
check('level 12 loads', l12v.idx === 11 && l12v.state === 'playing');

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
const dailyCard = await page.evaluate(() => !!document.querySelector('.daily-card'));
check('daily card in level select', dailyCard);
const medalInCard = await page.evaluate(() => !!document.querySelector('.level-card .medal'));
check('medals shown on level cards', medalInCard);

console.log('\nerrors:', errors.length ? errors : 'none');
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length || errors.length ? 1 : 0);
