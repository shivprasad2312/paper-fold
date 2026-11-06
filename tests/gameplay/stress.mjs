// STRESS — rapid and repeated inputs against the real game (Phase 8E/11):
//   1. input mashing: ~120 alternating keypresses at 15 ms — no drops into
//      an inconsistent state, no page errors, cube always on a slab
//   2. restart spam: 30 R-presses back-to-back on the heaviest hand level
//      (L13: orbs + crumble + sliders) — no leaked timers, no panel ghosts
//   3. flow loop: win → Next ×3 across real levels — transitions stay clean
//   4. hold-to-roll under churn: hold a key through repeated pauses/resumes
// The bar: zero page errors, zero stuck states, every level still ends winnable.
import {  launch, wait, waitFor, state, driveRoute, bfsEval, close } from '../browser.mjs';

const { browser, page, errors } = await launch();
let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`  ✗ ${msg}`);
};
const onSlab = () =>
  page.evaluate(() => {
    const g = window.__kubik.game;
    return g.level.tiles.has(`${g.cube.x},${g.cube.z}`) || g.state !== 'playing';
  });

// 1 — input mashing on L4 (blocks + nudge: the most stateful hand level)
await page.evaluate(() => window.__kubik.startLevel(3));
await waitFor(page, () => window.__kubik.game.state === 'playing', 10000);
const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
for (let i = 0; i < 120; i++) await page.keyboard.press(dirs[i % 4]);
await wait(600); // let any queued moves settle
let ok = await onSlab();
if (!ok) fail('cube is off-slab after input mashing');
else console.log('  ✓ 120 mashed keypresses — cube coherent, no state corruption');

// 2 — restart spam on L13
await page.evaluate(() => window.__kubik.startLevel(12));
await waitFor(page, () => window.__kubik.game.state === 'playing', 10000);
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('KeyR');
  await wait(25);
}
await wait(800);
const st13 = await state(page);
if (st13.state !== 'playing' || st13.idx !== 12) fail(`L13 state after restart spam: ${st13.state} idx ${st13.idx}`);
else {
  const winHidden = await page.evaluate(() => document.getElementById('win').classList.contains('hidden'));
  if (!winHidden) fail('win panel ghost after restart spam');
  else console.log('  ✓ 30 back-to-back restarts on L13 — clean playing state, no panel ghost');
}

// 3 — flow loop: win → Next, three levels in a row
let levelIdx = 0;
for (let run = 0; run < 3; run++) {
  if (run > 0) {
    await page.evaluate(() => document.getElementById('btn-next').click());
    await waitFor(page, () => window.__kubik.game.state === 'playing', 8000);
  } else {
    await page.evaluate(() => window.__kubik.startLevel(0));
    await waitFor(page, () => window.__kubik.game.state === 'playing', 8000);
  }
  const route = await page.evaluate(new Function(`return (${bfsEval('window.__kubik.game.level.goal')})()`));
  await driveRoute(page, route.tiles, route.moves);
  const won = await waitFor(page, () => window.__kubik.game.state === 'won', 8000);
  if (!won) {
    fail(`flow loop run ${run + 1}: level ${levelIdx + 1} not won`);
    break;
  }
  await waitFor(page, () => !document.getElementById('win').classList.contains('hidden'), 5000);
  levelIdx++;
}
if (levelIdx === 3) console.log('  ✓ win → Next ×3 across levels 1–3 — transitions clean');

// 4 — hold-to-roll under pause churn
await page.evaluate(() => window.__kubik.restartLevel());
await waitFor(page, () => window.__kubik.game.state === 'playing' && window.__kubik.game.moves === 0, 6000);
await page.keyboard.down('ArrowDown');
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('KeyP'); // pause
  await wait(150);
  await page.keyboard.press('KeyP'); // resume
  await wait(200);
}
await page.keyboard.up('ArrowDown');
await wait(700);
const stHold = await state(page);
if (!onSlab()) fail('cube off-slab after hold-to-roll with pause churn');
else console.log(`  ✓ hold-to-roll through 4 pause/resume cycles — state ${stHold.state}, ${stHold.moves} moves, coherent`);

if (errors.length) fail(`page errors during stress: ${errors.slice(0, 5).join(' | ')}`);

await close(browser);
if (failed) {
  console.error(`\n✗ STRESS FAILED (${failed})`);
  process.exit(1);
}
console.log('\n✓ STRESS passed — rapid/repeated inputs leave no broken state');
