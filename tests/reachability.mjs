// Isolated geometry test: fixed rooftops remain in place, but structures and
// bombs are parked so a low target tests whether a nearer rooftop blocks it.
// This is NOT a full-level playthrough or a claim about ammunition balance.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
if(!process.env.CHROME_PATH)throw new Error('Set CHROME_PATH to Chromium/Chrome.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
function aimCandidates(tx,ty,sy){
  const candidates=[];
  for(let dx=35;dx<=130;dx+=2)for(let dy=-30;dy<=130;dy+=2){
    if(Math.hypot(dx,dy)>130)continue;
    const t=(tx-(295-dx*.425))/(dx*.195);if(t<0)continue;
    const y=sy+dy*.425-dy*.195*t+.139*t*t;
    candidates.push({dx,dy,score:Math.abs(ty-y)+(130-dx)*.03});
  }
  return candidates.sort((a,b)=>a.score-b.score).filter((_,i)=>i%5===0).slice(0,25);
}
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5173/');
  let checked=0;
  for(const [theme,start,examples] of [
    ['snow',1,[1,4,10,16]],
    ['desert',31,[31,32,33,41,42,43]],
    ['jungle',61,[61,62,63,75,79,82,85,88,90]],
  ]){
    await page.evaluate(t=>{localStorage.setItem('mango-tope-jungle-intro-seen','1');localStorage.setItem('mango-tope-theme',t);},theme);
    await page.reload();
    for(let n=start;n<start+30;n++){
      await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);const s=await state();
      assert.ok(s.roofPositions.every(r=>r.static),`Level ${n}: bases must start fixed`);
      assert.ok(s.roofPositions.every((r,i,a)=>!i||r.height>a[i-1].height),`Level ${n}: distant roofs must be higher`);
    }
    for(const n of examples){
      await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);const initial=await state();
      for(let i=0;i<initial.roofPositions.length;i++){
        const roof=initial.roofPositions[i];
        // Test near edge, center and far edge, just above the roof surface.
        for(const fraction of [-1,0,1]){
          const offset=fraction*(roof.width*25-28),tx=roof.bodyX+offset,ty=roof.y-9-23.5;
          let hit=false;
          for(const {dx,dy} of aimCandidates(tx,ty,initial.sling.y)){
            await page.evaluate(([n,i,offset])=>{window.__mangoTest.loadLevel(n);window.__mangoTest.testRoofTarget(i,offset);window.__mangoTest.advance(60);},[n,i,offset]);
            const before=await state();
            await page.mouse.move(before.sling.x/2,before.sling.y/2);await page.mouse.down();
            await page.mouse.move((before.sling.x-dx)/2,(before.sling.y+dy)/2);await page.mouse.up();
            await page.evaluate(()=>window.__mangoTest.advance(80));const after=await state();
            assert.deepEqual(after.roofPositions,before.roofPositions,`Level ${n}: bases must remain fixed`);
            if(after.lastProjectile?.firstImpact==='target'){hit=true;break;}
          }
          assert.ok(hit,`Level ${n}, roof ${i+1}, position ${fraction}: no direct shot to the low target`);
          checked++;
        }
      }
    }
  }
  assert.deepEqual(errors,[]);
  console.log(`Reachability passed: all 90 levels step upward; ${checked} isolated low targets hit directly across representative layouts.`);
}finally{await browser.close();}
