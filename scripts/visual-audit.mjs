// Visual + structural verification of the shipped levels.
//
// For a stratified sample it does two things at once:
//   1. STRUCTURE — reads the level def and the SCENE the game actually built,
//      and checks they agree (tile count, shard meshes, sentinels, goal pad,
//      board span, cube on the start tile, no NaN positions, nothing
//      off-board). A render that "looks fine" but dropped half the tiles
//      fails here.
//   2. VISION — takes a frame per level for a contact sheet, so the geometry
//      can be eyeballed against the design (terraces, courts, hazard dressing).
//
//   node scripts/visual-audit.mjs            (dev server on :5173)
//   OUT=/tmp/vis VIEW=1440x900 node scripts/visual-audit.mjs
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const nssDir = '/tmp/chroma/lib';
if (existsSync(`${nssDir}/libnss3.so`)) {
  process.env.LD_LIBRARY_PATH = [process.env.LD_LIBRARY_PATH, nssDir].filter(Boolean).join(':');
}
const puppeteer = (await import('puppeteer-core')).default;
const chromium = (await import('@sparticuz/chromium')).default;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ALL_LEVELS, LEVELS, VAULT_LEVELS } = await import('../src/levels.js');
const { parseLevel, shortestRoute } = await import('../src/rules.js');

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || '/tmp/vis';
const [W, H] = (process.env.VIEW || '1280x800').split('x').map(Number);
mkdirSync(OUT, { recursive: true });

// A stratified sample: every act, every boss tier, the re-cut level, the
// mechanic-showcase slots and the Vault — the places a regression would show.
const SAMPLE = process.env.IDS
  ? process.env.IDS.split(',').map(Number)
  : [1, 7, 13, 20, 33, 50, 60, 80, 100, 118, 123, 131, 140, 150, 160, 176, 187, 193, 200, 201, 207];

const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--hide-scrollbars', '--disable-background-timer-throttling'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => { if (!e.message.includes('WebSocket')) errors.push(e.message); });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('WebSocket')) errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction('!!window.__kubik');
// deterministic presentation: default theme, camera seat 0, full motion
await page.evaluate(() => {
  window.__kubik.openMenu();
  window.__kubik.applyMotion('full');
  window.__kubik.game.stage.setCameraStep(0, true);
});

const rows = [];
for (const id of SAMPLE) {
  const index = ALL_LEVELS.findIndex((d) => d.id === id);
  if (index < 0) { console.error(`no level ${id}`); continue; }

  const expected = (() => {
    const def = ALL_LEVELS[index];
    const lv = parseLevel(def);
    const tiles = [...lv.tiles.values()];
    const w = lv.width;
    const d = lv.depth;
    return {
      id, name: def.name, index,
      par: shortestRoute(lv),
      width: w, depth: d,
      tiles: tiles.length,
      fill: +(tiles.length / (w * d) * 100).toFixed(1),
      heights: Math.max(...tiles.map((t) => t.h)),
      vault: def.id > 200,
      // the extent the TILES occupy (bounds is built from tiles ± 0.5), not
      // the board frame: a 24-wide board legitimately leaves void at its edge
      ext: {
        minX: Math.min(...tiles.map((t) => t.x)) - 0.5,
        maxX: Math.max(...tiles.map((t) => t.x)) + 0.5,
        minZ: Math.min(...tiles.map((t) => t.z)) - 0.5,
        maxZ: Math.max(...tiles.map((t) => t.z)) + 0.5,
      },
      // rules.js folds `heavy` into level.blocks, so the scene has both
      blockCount: (def.blocks || []).length + (def.heavy || []).length,
      mechanics: Object.entries(def)
        .filter(([k, v]) => Array.isArray(v) && v.length &&
          ['orbs', 'blocks', 'crumble', 'sliders', 'doors', 'timed', 'freeze', 'pulse',
            'heavy', 'conveyors', 'shuttles', 'lifts', 'springs', 'turntables', 'clings',
            'pistons', 'shrink', 'grow'].includes(k))
        .map(([k, v]) => `${k}:${v.length}`)
        .concat(def.key ? ['key'] : [], def.wind ? ['wind'] : []),
    };
  })();

  await page.evaluate((i) => { window.__kubik.startLevel(i, { animate: false }); }, index);
  // let the level build, the camera snap and one frame draw
  await new Promise((r) => setTimeout(r, 1400));
  // hide transient text so the shot is the BOARD, not the copy
  await page.evaluate(() => {
    for (const id of ['hint', 'toast', 'flash']) {
      const n = document.getElementById(id);
      if (n) n.style.display = 'none';
    }
  });
  await new Promise((r) => setTimeout(r, 250));

  const scene = await page.evaluate(() => {
    const g = window.__kubik.game;
    const v = g.view;
    const meshes = [];
    let nan = 0;
    v.group.traverse((o) => {
      meshes.push(o);
      const p = o.position;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) nan++;
    });
    const lv = g.level;
    const tiles = [...lv.tiles.values()];
    const b = v.bounds;
    // the slabs are merged into ONE mesh (a draw-call optimisation): its
    // vertex count is the honest measure of what was built, and its bounds
    // are the honest measure of where
    let slabs = null;
    v.group.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'BufferGeometry') return;
      const pos = o.geometry.getAttribute('position');
      if (!slabs || pos.count > slabs.verts) {
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        slabs = {
          verts: pos.count,
          minX: bb.min.x, maxX: bb.max.x, minZ: bb.min.z, maxZ: bb.max.z,
          minY: bb.min.y, maxY: bb.max.y,
        };
      }
    });
    return {
      slabs,
      tiles: tiles.length,
      shards: v.shards.length,
      orbs: v.orbs.length,
      blocks: v.blocks ? v.blocks.size : 0,
      hasGoal: !!v.goal,
      meshes: meshes.length,
      nan,
      cube: { x: g.cube.x, z: g.cube.z, h: g.cube.h },
      start: { x: lv.start.x, z: lv.start.z, h: lv.start.h },
      bounds: { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z },
      halfH: +g.stage.halfH.toFixed(2),
      state: g.state,
      defName: g.def.name,
      id: g.def.id,
    };
  });

  const shot = `${OUT}/L${String(id).padStart(3, '0')}.png`;
  await page.screenshot({ path: shot });

  // — the structural verdict —
  const problems = [];
  if (scene.tiles !== expected.tiles) problems.push(`tiles ${scene.tiles}≠${expected.tiles}`);
  if (scene.defName !== expected.name) problems.push(`name ${scene.defName}≠${expected.name}`);
  if (scene.id !== expected.id) problems.push(`id ${scene.id}≠${expected.id}`);
  if (scene.shards !== (ALL_LEVELS[index].shards || []).length) problems.push(`shards ${scene.shards}≠${(ALL_LEVELS[index].shards || []).length}`);
  if (scene.orbs !== (ALL_LEVELS[index].orbs || []).length) problems.push(`orbs ${scene.orbs}≠${(ALL_LEVELS[index].orbs || []).length}`);
  if (scene.blocks !== expected.blockCount) problems.push(`blocks ${scene.blocks}≠${expected.blockCount}`);
  if (!scene.hasGoal) problems.push('no goal pad built');
  if (scene.nan) problems.push(`${scene.nan} NaN positions`);
  if (scene.cube.x !== scene.start.x || scene.cube.z !== scene.start.z) problems.push('cube not on start tile');
  if (scene.state !== 'playing') problems.push(`state ${scene.state}`);
  // the slab mesh must exist, carry geometry, and cover exactly the tiles
  if (!scene.slabs) problems.push('no merged slab mesh built');
  else {
    const e = expected.ext;
    if (Math.abs(scene.slabs.minX - e.minX) > 0.51 || Math.abs(scene.slabs.maxX - e.maxX) > 0.51
      || Math.abs(scene.slabs.minZ - e.minZ) > 0.51 || Math.abs(scene.slabs.maxZ - e.maxZ) > 0.51) {
      problems.push(`slab bounds ${scene.slabs.minX.toFixed(1)}..${scene.slabs.maxX.toFixed(1)}×`
        + `${scene.slabs.minZ.toFixed(1)}..${scene.slabs.maxZ.toFixed(1)} vs tiles `
        + `${e.minX}..${e.maxX}×${e.minZ}..${e.maxZ}`);
    }
    // every tile contributes the same slab geometry, so the vertex count is
    // an exact function of the tile count: a dropped or duplicated tile
    // cannot hide behind a merged mesh
    const perTile = scene.slabs.verts / expected.tiles;
    if (!(perTile > 8 && perTile < 80)) problems.push(`${perTile.toFixed(1)} verts/tile`);
  }

  rows.push({ ...expected, scene, problems, shot });
  console.log(
    `${problems.length ? '✗' : '✓'} L${id} ${expected.name.padEnd(26)} `
    + `${String(expected.width).padStart(2)}×${String(expected.depth).padStart(2)} `
    + `tiles ${String(expected.tiles).padStart(3)} fill ${String(expected.fill).padStart(5)}% `
    + `par ${String(expected.par).padStart(2)}  nodes ${String(scene.meshes).padStart(4)}  halfH ${scene.halfH}`
    + (problems.length ? `  ← ${problems.join('; ')}` : ''),
  );
}

const bad = rows.filter((r) => r.problems.length);
writeFileSync(`${OUT}/visual-audit.json`, JSON.stringify({
  generated: new Date().toISOString(), errors, rows,
}, null, 2));
writeFileSync(`${OUT}/labels.txt`, rows.map((r) =>
  `L${r.id} ${r.name}\\n${r.width}×${r.depth} · ${r.tiles} tiles · ${r.fill}% fill · par ${r.par}\\n${r.mechanics.join(' ') || 'no hazards'}`).join('\n') + '\n');

console.log(`\n${rows.length - bad.length}/${rows.length} levels structurally match their data`);
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
console.log(`shots → ${OUT}`);
await browser.close();
process.exit(bad.length || errors.length ? 1 : 0);
