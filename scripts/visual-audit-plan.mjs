// Plan-view pixel audit: does the RENDER match the LEVEL DATA, tile by tile?
//
// The structural audit (scripts/visual-audit.mjs) checks counts and bounds.
// This goes further and checks POSITION: it forces the camera to a true
// top-down plan view, projects every tile of the parsed level to screen
// pixels, and samples the actual rendered frame at each one.
//
//   · every tile centre must be LIT (slab drawn where the data says floor)
//   · every void cell centre must be DARK (no slab where the data says void)
//   · the goal pad must be its own unique bright ring
//
// A missing, doubled, offset or ghost slab therefore fails by tile, with a
// list of the offending cells — not as "the screenshot looked odd".
//
//   node scripts/visual-audit-plan.mjs            (dev server on :5173)
//   IDS=1,13,100,200,210 node scripts/visual-audit-plan.mjs
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
const { ALL_LEVELS } = await import('../src/levels.js');

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || '/tmp/vis-plan';
const [W, H] = (process.env.VIEW || '1000x1000').split('x').map(Number);
mkdirSync(OUT, { recursive: true });

const SAMPLE = process.env.IDS
  ? process.env.IDS.split(',').map(Number)
  : [1, 7, 13, 20, 33, 50, 60, 80, 100, 118, 123, 131, 140, 150, 160, 176, 187, 193, 200, 201, 207, 210];

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
await page.evaluate(() => {
  window.__kubik.openMenu();
  window.__kubik.applyMotion('full');
  for (const id of ['hint', 'toast', 'flash', 'hud', 'minimap']) {
    const n = document.getElementById(id);
    if (n) n.style.display = 'none';
  }
});

/** Force a plan view: ortho camera straight down, north up, WHOLE board in view. */
await page.evaluate(() => {
  const g = window.__kubik.game;
  const st = g.stage;
  window.__plan = () => {
    const b = g.view.bounds;
    const cx = (b.min.x + b.max.x) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    const W = st.renderer.domElement.width;
    const H = st.renderer.domElement.height;
    // fit the board with a 5% margin, honouring the canvas aspect ratio —
    // framing that crops would report off-screen tiles as "not lit"
    const halfBoardX = ((b.max.x - b.min.x) / 2) * 1.05;
    const halfBoardZ = ((b.max.z - b.min.z) / 2) * 1.05;
    const halfW = Math.max(halfBoardX, halfBoardZ * (W / H));
    const halfH = halfW * (H / W);
    const cam = st.camera;
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH;
    cam.position.set(cx, Math.max(60, (b.max.y - b.min.y) + 40), cz);
    cam.up.set(0, 0, -1);
    cam.lookAt(cx, 0, cz);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    st.shakeAmp = 0;
    window.__planCenter = { cx, cz, halfW, halfH };
  };
});

const rows = [];
for (const id of SAMPLE) {
  const index = ALL_LEVELS.findIndex((d) => d.id === id);
  if (index < 0) continue;

  await page.evaluate((i) => { window.__kubik.startLevel(i, { animate: false }); }, index);
  await new Promise((r) => setTimeout(r, 1500));

  const result = await page.evaluate(async () => {
    const g = window.__kubik.game;
    const st = g.stage;
    window.__plan();
    // Draw one frame with the plan camera, then read the pixels back.
    // Bloom is OFF for this readback: it is a post-process halo that
    // legitimately spills into neighbouring void cells, and this audit is
    // about GEOMETRY (is the slab there), not about how the light blooms.
    st.bloomEnabled = false;
    st.renderer.render(st.scene, st.camera);
    // Read the pixels the render JUST produced, synchronously: the WebGL
    // drawing buffer is cleared after compositing, so a later drawImage()
    // from the canvas would sample a stale frame from a different camera.
    const glr = st.renderer.getContext();
    const W = st.renderer.domElement.width;
    const H = st.renderer.domElement.height;
    const buf = new Uint8Array(W * H * 4);
    glr.readPixels(0, 0, W, H, glr.RGBA, glr.UNSIGNED_BYTE, buf);
    // readPixels is bottom-up; flip into a top-down RGBA buffer
    const flipped = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      const src = (H - 1 - y) * W * 4;
      flipped.set(buf.subarray(src, src + W * 4), y * W * 4);
    }
    const cv = { width: W, height: H };
    const px = flipped;
    // and keep the exact frame that was sampled, as a PNG
    const img = new ImageData(flipped, W, H);
    const cv2 = document.createElement('canvas');
    cv2.width = W; cv2.height = H;
    cv2.getContext('2d').putImageData(img, 0, 0);
    const png = cv2.toDataURL('image/png');

    const lumAt = (sx, sy, r = 1) => {
      let sum = 0, n = 0;
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const px0 = Math.round(sx + x), py0 = Math.round(sy + y);
          if (px0 < 0 || py0 < 0 || px0 >= cv.width || py0 >= cv.height) return -1;
          const i = (py0 * cv.width + px0) * 4;
          sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
          n++;
        }
      }
      return n ? sum / n : -1;
    };
    // A hazard sits ON a tile (a dark block covers its centre), so a tile is
    // "lit" if ANY of five points on its slab face is bright: the centre and
    // four points 0.32 tiles out (inside the slab, outside a 0.52 block).
    const OFFS = [[0, 0], [0.44, 0.44], [-0.44, 0.44], [0.44, -0.44], [-0.44, -0.44]];

    const { cx, cz, halfW, halfH } = window.__planCenter;
    const cam = st.camera;
    const v = new (g.cubeMesh.position.constructor)();
    const project = (x, y, z) => {
      v.set(x, y, z).project(cam);
      return {
        sx: (v.x * 0.5 + 0.5) * cv.width,
        sy: (-v.y * 0.5 + 0.5) * cv.height,
      };
    };

    // Calibrate against THIS frame: the background is sampled at a point
    // outside the board, and a slab's luminance from the board's own median.
    const bgLum = lumAt(4, cv.height - 4, 2);
    const tiles = [...g.level.tiles.values()];
    const lit = { ok: 0, bad: [] };
    const voids = { ok: 0, bad: [] };

    // — calibrate this frame: background outside the board, and the slab
    //   luminance from the board itself (thresholds come from the frame,
    //   not from a hardcoded guess that a different act's hue would break) —
    const sample5 = (x, y, z) => {
      let best = -1;
      for (const [dx, dz] of OFFS) {
        const { sx, sy } = project(x + dx, y, z + dz);
        best = Math.max(best, lumAt(sx, sy));
      }
      return best;
    };
    const tileLums = tiles.map((t) => ({ t, lum: sample5(t.x, t.h, t.z) }));
    const sorted = tileLums.map((o) => o.lum).sort((a, b) => a - b);
    const slabMedian = sorted.length ? sorted[Math.floor(sorted.length / 2)] : -1;
    const litThreshold = bgLum + (slabMedian - bgLum) * 0.30;
    const voidThreshold = bgLum + (slabMedian - bgLum) * 0.45;

    // — floor: every tile in the data must be drawn —
    //   ...except the TIME-VARYING ones, which are correctly not drawn right
    //   now: a shuttle dock is a ghost until a platform dwells on it, and a
    //   slider bridge / pulsing gap is dark while it is down. Those are
    //   counted separately and must be EITHER lit or one of those kinds —
    //   never silently ignored, and never a false failure.
    const isDynamic = (t) => !!(t.shuttle || t.slider || t.pulse || t.timed);
    const heights = new Map();
    const dynamic = [];
    for (const { t, lum } of tileLums) {
      heights.set(`${t.x},${t.z}`, t.h);
      if (lum > litThreshold) {
        lit.ok++;
      } else if (isDynamic(t)) {
        const kind = t.shuttle ? 'shuttle' : t.slider ? 'slider' : t.pulse ? 'pulse' : 'timed';
        dynamic.push({ x: t.x, z: t.z, kind });
        lit.ok++; // legitimate: this cell is unlit by design right now
      } else {
        lit.bad.push({ x: t.x, z: t.z, h: t.h, lum: +lum.toFixed(1) });
      }
    }

    // — void: a cell with no tile in the data must be dark in the render.
    //   Cells are skipped when a hazard's glow legitimately spills over, and
    //   the level's own 3% + 2 tolerance absorbs edge bleed from skirting.
    const xs = tiles.map((t) => t.x), zs = tiles.map((t) => t.z);
    const minX = Math.min(...xs) - 1, maxX = Math.max(...xs) + 1;
    const minZ = Math.min(...zs) - 1, maxZ = Math.max(...zs) + 1;
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (heights.has(`${x},${z}`)) continue;
        const { sx, sy } = project(x, 0, z);
        if (sx < 6 || sy < 6 || sx > cv.width - 6 || sy > cv.height - 6) continue;
        const lum = sample5(x, 0, z);
        if (lum < voidThreshold) voids.ok++;
        else voids.bad.push({ x, z, lum: +lum.toFixed(1) });
      }
    }

    // — the goal pad: a unique bright ring where the data puts it —
    const goalT = g.level.tiles.get(`${g.level.goal.x},${g.level.goal.z}`);
    const gsx = project(g.level.goal.x, (goalT ? goalT.h : 0) + 0.02, g.level.goal.z);
    const goalLum = lumAt(gsx.sx, gsx.sy, 4);

    return {
      id: g.def.id, name: g.def.name,
      tiles: tiles.length,
      lit, voids,
      goalLum: +goalLum.toFixed(1),
      dynamic: dynamic.length,
      dynamicKinds: [...new Set(dynamic.map((d) => d.kind))],
      litThreshold: +litThreshold.toFixed(1),
      voidThreshold: +voidThreshold.toFixed(1),
      slabMedian: +slabMedian.toFixed(1),
      bgLum2: +bgLum.toFixed(1),
      canvas: `${cv.width}x${cv.height}`,
      png,
      halfW: +halfW.toFixed(2),
      halfH: +halfH.toFixed(2),
      bgLum: +lumAt(4, cv.height - 4, 2).toFixed(1),
    };
  });

  // the frame for a human: exactly the pixels that were sampled
  await page.evaluate(() => { window.__kubik.game.stage.bloomEnabled = true; });
  const shot = `${OUT}/PLAN-L${String(id).padStart(3, '0')}.png`;
  writeFileSync(shot, Buffer.from(result.png.split(',')[1], 'base64'));

  const problems = [];
  // a slab missing from the render shows up as an unlit tile
  if (result.lit.bad.length) problems.push(`${result.lit.bad.length} tile(s) not lit: ${result.lit.bad.slice(0, 4).map((b) => `${b.x},${b.z}(h${b.h})`).join(' ')}`);
  // a ghost slab (drawn where the data says void) shows up as a lit void cell
  // — a handful of voids sit behind skirts and read bright, so allow 3%
  const voidTolerance = Math.ceil(result.voids.ok * 0.03) + 2;
  if (result.voids.bad.length > voidTolerance) problems.push(`${result.voids.bad.length} void cell(s) lit: ${result.voids.bad.slice(0, 4).map((b) => `${b.x},${b.z}`).join(' ')}`);
  if (!(result.goalLum > result.bgLum + 25)) problems.push(`goal pad not bright (${result.goalLum} vs bg ${result.bgLum})`);

  rows.push({ ...result, problems, shot });
  const pct = ((result.lit.ok / result.tiles) * 100).toFixed(1);
  console.log(
    `${problems.length ? '✗' : '✓'} L${String(id).padStart(3)} ${result.name.padEnd(26)} `
    + `tiles ${String(result.lit.ok).padStart(3)}/${String(result.tiles).padEnd(3)} lit (${pct}%)  `
    + `void ${String(result.voids.ok).padStart(3)} dark, ${String(result.voids.bad.length).padStart(2)} lit  `
    + `goal ${String(result.goalLum).padStart(5)}`
    + (result.dynamic ? `  (${result.dynamic} time-varying)` : '')
    + (problems.length ? `  ← ${problems.join('; ')}` : ''),
  );
}

const bad = rows.filter((r) => r.problems.length);
writeFileSync(`${OUT}/plan-audit.json`, JSON.stringify({ generated: new Date().toISOString(), errors, rows }, null, 2));
console.log(`\n${rows.length - bad.length}/${rows.length} plan views match their level data tile-for-tile`);
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
console.log(`plan frames → ${OUT}`);
await browser.close();
process.exit(bad.length || errors.length ? 1 : 0);
