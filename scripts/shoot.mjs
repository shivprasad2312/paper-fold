import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || 'shots';

import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--hide-scrollbars',
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const steps = JSON.parse(process.env.STEPS || '[]');
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};

await shot('01-menu');

// click Play
await page.click('#btn-play');
await new Promise((r) => setTimeout(r, 1600));
await shot('02-level1');

for (const step of steps) {
  if (step.key) {
    await page.keyboard.press(step.key);
    await new Promise((r) => setTimeout(r, step.wait ?? 300));
  }
  if (step.click) {
    await page.click(step.click);
    await new Promise((r) => setTimeout(r, step.wait ?? 500));
  }
  if (step.waitOnly) {
    await new Promise((r) => setTimeout(r, step.wait ?? 500));
  }
  if (step.shot) await shot(step.shot);
  if (step.eval) console.log('eval:', JSON.stringify(await page.evaluate(step.eval)));
}

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return {
    canvas: [c.width, c.height],
    gl: !!gl,
    renderer: gl ? gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) : null,
  };
});
console.log('info', JSON.stringify(info));
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
