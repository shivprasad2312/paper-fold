// Adversarial smoke search, not a proof of impossibility: real seven-shot runs
// that deliberately avoid bomb bodies and ropes. Start Vite before running.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
if(!process.env.CHROME_PATH)throw new Error('Set CHROME_PATH to Chromium/Chrome.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
let seed=123456;
const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
function aim(tx,ty,sy,bombs){
  let best=null;
  for(let dx=30;dx<=130;dx+=2)for(let dy=-30;dy<=130;dy+=2){
    if(Math.hypot(dx,dy)>130)continue;
    const t=(tx-(295-dx*.425))/(dx*.195);if(t<0)continue;
    const y=sy+dy*.425-dy*.195*t+.139*t*t;
    let safe=true;
    for(const bomb of bombs)for(const off of [-95,0,95]){
      const tt=(bomb.anchor.x+off-(295-dx*.425))/(dx*.195);
      if(tt>0&&sy+dy*.425-dy*.195*tt+.139*tt*tt<190)safe=false;
    }
    const score=Math.abs(ty-y)+(130-dx)*.035;
    if(safe&&(!best||score<best.score))best={dx,dy,score};
  }
  return best;
}
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5173/');
  await page.evaluate(()=>{localStorage.setItem('mango-tope-jungle-intro-seen','1');localStorage.setItem('mango-tope-theme','jungle');});await page.reload();await page.evaluate(()=>window.__mangoTest.controlled(true));
  const wins=[],attempts=Number(process.env.MAX_ATTEMPTS||4);
  for(let n=61;n<=90;n++){
    if(process.env.TEST_LEVELS&&!process.env.TEST_LEVELS.split(',').map(Number).includes(n))continue;
    let won=false;
    for(let attempt=0;attempt<attempts&&!won;attempt++){
      await page.evaluate(n=>{window.__mangoTest.loadLevel(n);window.__mangoTest.advance(120);},n);
      for(let i=0;i<7;i++){
        const s=await state();if(s.finished)break;
        const pieces=s.remainingPositions.filter(b=>b.x>-7&&b.x<16).sort((a,b)=>a.x-b.x);if(!pieces.length)break;
        const index=attempt===0?0:Math.floor(random()*Math.min(pieces.length,attempt%3===0?3:8));
        const p=pieces[index],pull=aim(800+p.x*50-20,Math.min(700-p.y*50,p.baseY-25),s.sling.y,s.bombs);if(!pull)break;
        await page.mouse.move(s.sling.x/2,s.sling.y/2);await page.mouse.down();await page.mouse.move((s.sling.x-pull.dx)/2,(s.sling.y+pull.dy)/2);await page.mouse.up();
        await page.evaluate(()=>window.__mangoTest.advance(420));
        if((await state()).bombs.some(b=>!b.hanging||b.dead))break;
      }
      const result=await state();won=result.won&&result.bombs.every(b=>b.hanging&&!b.dead);
    }
    if(won)wins.push(n);
  }
  console.log(`Mango-only search: up to ${attempts} attempts per selected level; wins on levels ${wins.length?wins.join(', '):'none'}. This is not an exhaustive proof.`);
  assert.deepEqual(errors,[]);assert.deepEqual(wins,[],`Mango-only wins found: ${wins.join(', ')}`);
}finally{await browser.close();}
