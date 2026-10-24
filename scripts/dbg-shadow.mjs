import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => window.__kubik.startLevel(5));
await new Promise((r) => setTimeout(r, 2500));

const diag = await page.evaluate(() => {
  const g = window.__kubik.game;
  const st = g.stage;
  return {
    state: g.state,
    view: !!g.view,
    key: !!st.key,
    shadowEnabled: st.renderer.shadowMap.enabled,
    type: st.renderer.shadowMap.type,
    castShadow: st.key.castShadow,
    map: !!st.key.shadow.map,
    size: st.key.shadow.map ? st.key.shadow.map.width : 0,
    lightPos: st.key.position.toArray(),
    targetPos: st.key.target.position.toArray(),
    cam: [st.key.shadow.camera.left, st.key.shadow.camera.right, st.key.shadow.camera.near, st.key.shadow.camera.far],
  };
});
console.log('DIAG', JSON.stringify(diag));

if (diag.map) {
  const samples = await page.evaluate(() => {
    const st = window.__kubik.game.stage;
    const m = st.key.shadow.map;
    const w = m.width;
    const h = m.height;
    const buf = new Uint8Array(4);
    const out = {};
    for (const [name, x, y] of [['c', w / 2, h / 2], ['a', w / 4, h / 4], ['b', (3 * w) / 4, h / 4], ['d', w / 4, (3 * h) / 4]]) {
      st.renderer.readRenderTargetPixels(m, Math.floor(x), Math.floor(y), 1, 1, buf);
      out[name] = Array.from(buf);
    }
    return out;
  });
  console.log('MAP_SAMPLES', JSON.stringify(samples));
}

const merged = await page.evaluate(() => {
  const g = window.__kubik.game;
  const kids = g.view.group.children;
  return kids.slice(0, 4).map((m) => ({ t: m.type, cast: m.castShadow, rec: m.receiveShadow, vis: m.visible }));
});
console.log('GROUP', JSON.stringify(merged));
await browser.close();
