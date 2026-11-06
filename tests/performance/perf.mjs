// PERFORMANCE — measured, not assumed (Phase 9).
// Harness: headless Chromium (SwiftShader, software rendering) — a
// DELIBERATELY pessimistic device. It also paces requestAnimationFrame at a
// low rate (~8 Hz here), which conveniently EXERCISES the game's adaptive
// quality governor (the mobile safeguard).
//
// Metrics:
//   A. scene complexity      — draw calls + triangles (bloom pass disabled so
//                              renderer.info reflects the whole scene)
//   B. steady-state frame cost — per _loop() call, full quality (the 6 s
//                              window ends before the governor's 90-sample
//                              window can fire under harness pacing)
//   C. adaptive governor      — must shed quality (shadows → bloom) under
//                              sustained low fps; one-time step cost recorded
//   D. leak check             — JS heap over 40 level loads
//
// Budgets (software-rendered harness; real GPUs are faster):
//   steady-state frame cost p95 < 16 ms   (60 fps CPU budget, 12× headroom)
//   draw calls < 40 per frame            (merged-slab-mesh design)
//   triangles < 200k                      (scene sanity)
//   heap growth < 30 MB over 40 loads     (no leaks)
//   governor must shed quality under low fps (mobile safeguard alive)
//
// Usage: npm run perf   (dev server must be running, or URL=…)
import { URL, launch, wait, waitFor, bfsEval, close } from '../browser.mjs';

const { browser, page, errors } = await launch();

// ---- startup (measured from a fresh navigation) ---------------------------
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
const ready = await waitFor(
  page,
  () => window.__kubik && window.__kubik.game && window.__kubik.game.state === 'playing',
  30000,
);
const startupMs = Date.now() - t0;
await wait(1200);
console.log(`startup (navigate → first playable level): ${ready ? startupMs + ' ms' : 'FAILED (dev-server cold compile; production build is faster)'}`);

// concurrent masher keeps the world actively playing during samples
let stopMash = false;
const masher = (async () => {
  const dirs = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
  let i = 0;
  while (!stopMash) {
    try {
      await page.keyboard.press(dirs[i++ % 4]);
      await wait(110);
      const st = await page.evaluate(() => window.__kubik.game.state);
      if (st === 'won') await page.evaluate(() => window.__kubik.restartLevel());
    } catch {
      break;
    }
  }
})();

async function sampleFrames(index, seconds, { bloomOff = false } = {}) {
  await page.evaluate((i) => window.__kubik.startLevel(i), index);
  await waitFor(page, () => window.__kubik.game.state === 'playing', 10000);
  return page.evaluate(
    async ({ secs, bloomOff }) => {
      const g = window.__kubik.game;
      const r = g.stage.renderer;
      const prevBloom = g.stage.bloomEnabled;
      if (bloomOff) g.stage.bloomEnabled = false; // whole-scene stats via renderer.info
      const orig = g._loop.bind(g);
      const frames = [];
      const drawCalls = [];
      const triangles = [];
      g._loop = (t) => {
        const a = performance.now();
        orig(t);
        frames.push(performance.now() - a);
        drawCalls.push(r.info.render.calls);
        triangles.push(r.info.render.triangles);
      };
      r.setAnimationLoop(g._loop);
      await new Promise((resolve) => setTimeout(resolve, secs * 1000));
      r.setAnimationLoop(orig);
      g.stage.bloomEnabled = prevBloom;
      const max = (arr) => (arr.length ? Math.max(...arr) : 0);
      return { frames, drawCalls: max(drawCalls), triangles: max(triangles) };
    },
    { secs: seconds, bloomOff },
  );
}

const quant = (arr, q) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

// ---- A + B: scene complexity (bloom off) + steady-state cost, L1 & L44 ----
console.log('\nA/B: L1 (light) — complexity + steady-state cost…');
const light = await sampleFrames(0, 6, { bloomOff: true });
console.log('A/B: L44 (heavy campaign) — complexity + steady-state cost…');
const heavy = await sampleFrames(43, 6, { bloomOff: true });

// ---- C: adaptive governor under sustained harness pacing ------------------
// The harness paces rAF at ~8 Hz — a "struggling device". The property we
// verify is behavioural: after sustained low fps, the game must be in a
// DEGRADED state (quality ≥ 2), whenever the shedding happened (it may have
// already shed during the sample windows above).
stopMash = true;
await masher;
const gov = await page.evaluate(async () => {
  const g = window.__kubik.game;
  const q0 = g.stage.quality;
  g.fpsSamples.length = 0; // re-arm the governor's sample window
  const t0 = performance.now();
  let maxStep = 0;
  const r = g.stage.renderer;
  const orig = g._loop.bind(g);
  g._loop = (t) => {
    const a = performance.now();
    orig(t);
    const d = performance.now() - a;
    if (d > maxStep) maxStep = d;
  };
  r.setAnimationLoop(g._loop);
  await new Promise((resolve) => setTimeout(resolve, 16000)); // > governor's 180-sample window
  r.setAnimationLoop(orig);
  return {
    qualityBefore: q0,
    qualityAfter: g.stage.quality,
    maxFrameCostInWindowMs: +maxStep.toFixed(1),
    waitedMs: +(performance.now() - t0).toFixed(0),
  };
});

// ---- D: leak check — 40 level loads ---------------------------------------
const heapOf = () => page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : null));
const heap0 = await heapOf();
const tChurn = Date.now();
for (let i = 0; i < 40; i++) {
  await page.evaluate((idx) => window.__kubik.startLevel(idx), i % 50);
  await wait(90);
}
await wait(1500);
const heap1 = await heapOf();
const churnSecs = (Date.now() - tChurn) / 1000;

const cost = (arr) => ({
  p50: +quant(arr, 0.5).toFixed(2),
  p95: +quant(arr, 0.95).toFixed(2),
  p99: +quant(arr, 0.99).toFixed(2),
});
const report = {
  startupMs,
  light: { ...cost(light.frames), drawCalls: light.drawCalls, triangles: light.triangles },
  heavy: { ...cost(heavy.frames), drawCalls: heavy.drawCalls, triangles: heavy.triangles },
  governor: gov,
  heapMB:
    heap0 == null
      ? null
      : { before: +(heap0 / 1048576).toFixed(1), after: +(heap1 / 1048576).toFixed(1), growth: +((heap1 - heap0) / 1048576).toFixed(1), churnSecs: +churnSecs.toFixed(1) },
  pageErrors: errors,
};
console.log('\n' + JSON.stringify(report, null, 2));

let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`  ✗ ${msg}`);
};
if (report.light.p95 >= 16) fail(`L1 steady-state frame cost p95 ${report.light.p95} ms ≥ 16 ms budget`);
if (report.heavy.p95 >= 16) fail(`L44 steady-state frame cost p95 ${report.heavy.p95} ms ≥ 16 ms budget`);
if (report.light.drawCalls >= 40) fail(`L1 draw calls ${report.light.drawCalls} ≥ 40 budget`);
if (report.heavy.drawCalls >= 40) fail(`L44 draw calls ${report.heavy.drawCalls} ≥ 40 budget`);
if (report.light.triangles >= 200000) fail(`L1 triangles ${report.light.triangles} ≥ 200k budget`);
if (report.heavy.triangles >= 200000) fail(`L44 triangles ${report.heavy.triangles} ≥ 200k budget`);
if (gov.qualityAfter < 2) fail(`adaptive governor: quality ${gov.qualityAfter} after sustained low fps — expected degraded state (≥2)`);
if (report.heapMB && report.heapMB.growth > 30) fail(`heap grew ${report.heapMB.growth} MB over 40 level loads (leak?)`);
if (errors.length) fail(`page errors: ${errors.slice(0, 5).join(' | ')}`);

await close(browser);
if (failed) {
  console.error(`\n✗ PERF FAILED (${failed})`);
  process.exit(1);
}
console.log('\n✓ PERF within budgets (software-rendered harness)');
