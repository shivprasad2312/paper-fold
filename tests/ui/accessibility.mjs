import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:'shell'});
try {
 const page=await browser.newPage();
 await page.setViewport({width:1280,height:900});
 await page.goto(process.env.URL||'http://localhost:4173/',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>!!window.__kubik);
 await page.addScriptTag({content:axeSource});
 const scan=async(selector,label)=>{
  // Axe snapshots opacity. Finish finite entrance animations explicitly so
  // software-GL scheduling cannot freeze its snapshot on a fade's first frame.
  // The separate UI flow test exercises the normal animated presentation.
  await page.evaluate(selector=>{
    for (const animation of document.querySelector(selector).getAnimations({subtree:true})) {
      if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
    }
  },selector);
  const result=await page.evaluate(async selector => window.axe.run(document.querySelector(selector), {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}), selector);
  const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  console.log(label,JSON.stringify(violations,null,2));
  if (violations.length) {
    await page.screenshot({path:'shots/a11y-failure.png'});
    console.log(await page.$eval('#btn-next',b=>({bg:getComputedStyle(b).background,color:getComputedStyle(b).color,opacity:getComputedStyle(b).opacity,parents:[b.parentElement,b.closest('.panel'),b.closest('.overlay')].map(e=>({id:e.id,opacity:getComputedStyle(e).opacity,animation:getComputedStyle(e).animation}))})));
  }
  assert.deepEqual(violations,[],label);
 };
 for(const theme of ['dark','light']) {
  await scan('#menu',`home ${theme}`);
  await page.click('#menu [data-open-dialog="settings"]');
  await scan('#settings',`settings ${theme}`);
  await page.keyboard.press('Escape');
  await page.click('#menu [data-open-dialog="help"]');
  await scan('#help',`guide ${theme}`);
  await page.keyboard.press('Escape');
  await page.click('#btn-levels');
  await scan('#levels',`collection ${theme}`);
  await page.keyboard.press('Escape');
  await page.click('#btn-play');
  await page.keyboard.press('Escape');
  await scan('#pause',`pause ${theme}`);
  await page.click('#btn-resume');
  await page.evaluate(()=>window.__kubik.game.win());
  await page.waitForSelector('#win',{visible:true});
  await scan('#win',`completion ${theme}`);
  await page.evaluate(()=>window.__kubik.openMenu());
  if(theme==='dark') {
    await page.click('#menu [data-open-dialog="settings"]');await page.click('#btn-theme-menu');await page.keyboard.press('Escape');
  }
 }
 await page.setViewport({width:320,height:640});
 await page.click('#menu [data-open-dialog="settings"]');
 await scan('#settings','settings 320px');
 console.log('Accessibility scans passed (axe WCAG A/AA, both themes, mobile settings).');
} finally {await browser.close();}
