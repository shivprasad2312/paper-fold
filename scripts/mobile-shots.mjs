import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,2500));
await page.screenshot({path:'shots/20-mobile-menu.png'});
await page.tap('#btn-play');
await new Promise(r=>setTimeout(r,2500));
await page.screenshot({path:'shots/21-mobile-game.png'});
await page.tap('.pad-btn.up');
await new Promise(r=>setTimeout(r,2500));
await page.screenshot({path:'shots/22-mobile-roll.png'});
await browser.close();
