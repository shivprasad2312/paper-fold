// REGRESSION — BUG-001: win panel resurfacing over a fresh run.
// Repro (original): win a level → click Replay within the 900 ms
// delayed-panel window → the stale winShowTimer fires mid-run and pops the
// win panel back over the live level.
// Root cause: winShowTimer was cleared in startLevel/startDaily/openMenu/
// openLevels — but NOT in restartLevel.
// Fix: restartLevel() clears winShowTimer first.
// This test covers BOTH reachable post-win restart paths (Replay before and
// after the panel shows) plus Next, watching 2 s (> 900 ms) each for any
// resurface.
import {  launch, wait, waitFor, state, driveRoute, bfsEval, close } from '../browser.mjs';

const { browser, page, errors } = await launch();
let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`  ✗ ${msg}`);
};

const winHidden = () => page.evaluate(() => document.getElementById('win').classList.contains('hidden'));
const routeToGoal = () => page.evaluate(new Function(`return (${bfsEval('window.__kubik.game.level.goal')})()`));

// play to the win state (does NOT wait for the panel)
async function playToWin() {
  const route = await routeToGoal();
  const drove = await driveRoute(page, route.tiles, route.moves);
  const won = await waitFor(page, () => window.__kubik.game.state === 'won', 8000);
  return drove && won;
}

// watch 2 s (well past the 900 ms window) for a resurface
async function watchNoResurface(label) {
  const t0 = Date.now();
  while (Date.now() - t0 < 2000) {
    if (!(await winHidden())) {
      fail(`win panel resurfaced — ${label}`);
      return;
    }
    await wait(80);
  }
  console.log(`  ✓ no resurface for 2 s — ${label}`);
}

// --- 1. THE EXACT ORIGINAL REPRO: win → Replay INSIDE the 900 ms window ----
await page.evaluate(() => window.__kubik.startLevel(0));
await waitFor(page, () => window.__kubik.game.state === 'playing', 10000);
if (!(await playToWin())) fail('could not play level 1 to the win');
// click Replay immediately — we are still inside the 900 ms timer window
await page.evaluate(() => document.getElementById('btn-replay').click());
const ok1 = await waitFor(page, () => window.__kubik.game.state === 'playing' && window.__kubik.game.moves === 0, 5000);
if (!ok1) fail('Replay did not restart the level');
else await watchNoResurface('Replay inside the 900 ms window (original repro)');

// --- 2. win → wait for the panel → Replay (stale timer already fired) ------
if (await playToWin()) {
  const shown = await waitFor(page, () => !document.getElementById('win').classList.contains('hidden'), 5000);
  if (!shown) fail('win panel never showed on second win');
  await page.evaluate(() => document.getElementById('btn-replay').click());
  const ok2 = await waitFor(page, () => window.__kubik.game.state === 'playing' && window.__kubik.game.moves === 0, 5000);
  if (!ok2) fail('Replay (panel shown) did not restart');
  else await watchNoResurface('Replay after the panel was shown');
}

// --- 3. win → Next (the other transition out of the panel) ------------------
if (await playToWin()) {
  await waitFor(page, () => !document.getElementById('win').classList.contains('hidden'), 5000);
  await page.evaluate(() => document.getElementById('btn-next').click());
  const ok3 = await waitFor(page, () => window.__kubik.game.state === 'playing' && window.__kubik.game.levelIndex === 1, 5000);
  if (!ok3) fail('Next did not advance to level 2');
  else await watchNoResurface('Next → level 2');
}

// --- 4. death → R restarts stay clean ---------------------------------------
await page.evaluate(() => window.__kubik.restartLevel());
await waitFor(page, () => window.__kubik.game.state === 'playing', 5000);
for (let i = 0; i < 3; i++) {
  for (let k = 0; k < 4; k++) {
    await page.keyboard.press('ArrowDown');
    await wait(180);
    if ((await state(page)).state === 'dead') break;
  }
  if ((await state(page)).state === 'dead') {
    await wait(150);
    await page.keyboard.press('KeyR');
    await waitFor(page, () => window.__kubik.game.state === 'playing', 5000);
  }
}
console.log('  ✓ repeated death → R restarts stay clean');

if (errors.length) fail(`page errors during test: ${errors.slice(0, 5).join(' | ')}`);

await close(browser);
if (failed) {
  console.error(`\n✗ BUG-001 regression FAILED (${failed})`);
  process.exit(1);
}
console.log('\n✓ BUG-001 regression passed — win panel never resurfaces a fresh run');
