// Runs against a separate DEV test copy with 8 jungle mangoes and the
// current four-bay layouts. It never changes the production game.
// GAME_URL must point at that copy; a normal seven-shot game is rejected.
// The opening is a real shot at one bomb; remaining shots avoid the other.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
if(!process.env.CHROME_PATH||!process.env.GAME_URL)throw new Error('Set CHROME_PATH and GAME_URL for the isolated eight-shot test copy.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
const advance=n=>page.evaluate(n=>window.__mangoTest.advance(n),n);
let seed=123456;
const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
function aim(tx,ty,sy,bombs){
  let best=null;
  for(let dx=30;dx<=130;dx+=2)for(let dy=-30;dy<=130;dy+=2){
    if(Math.hypot(dx,dy)>130)continue;
    const t=(tx-(295-dx*.425))/(dx*.195);if(t<0)continue;
    const y=sy+dy*.425-dy*.195*t+.139*t*t,score=Math.abs(ty-y)+(130-dx)*.035;
    let safe=true;
    for(const bomb of bombs.filter(b=>b.hanging&&!b.dead))for(const off of [-95,0,95]){
      const time=(bomb.anchor.x+off-(295-dx*.425))/(dx*.195);
      if(time>0&&sy+dy*.425-dy*.195*time+.139*time*time<190)safe=false;
    }
    if(safe&&(!best||score<best.score))best={dx,dy,score};
  }
  return best;
}
async function shoot(dx,dy){
  const {sling}=await state();await page.mouse.move(sling.x/2,sling.y/2);await page.mouse.down();
  await page.mouse.move((sling.x-dx)/2,(sling.y+dy)/2);await page.mouse.up();await advance(420);
}
const openings=[[45,75],[40,75],[50,75],[55,75],[60,75],[65,75],[70,75],[75,75],[90,75],[45,80],[50,80],[60,80],[70,80],[80,80],[90,80],[45,85],[55,85],[65,85],[75,85],[85,85],[90,85],[45,90],[55,90],[65,90],[70,90],[75,90],[80,90],[85,90],[90,90],[45,95],[55,95],[65,95],[70,95],[45,115],[50,110],[55,105],[60,100]];
try{
  await page.goto(process.env.GAME_URL,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.setItem('mango-tope-jungle-intro-seen','1');localStorage.setItem('mango-tope-theme','jungle');});
  await page.reload();await page.evaluate(()=>window.__mangoTest.controlled(true));
  const levels=(process.env.TEST_LEVELS||'82,85,88').split(',').map(Number),attempts=Number(process.env.MAX_ATTEMPTS||200),unresolved=[];
  for(const n of levels){
    seed=123456;let best=Infinity,valid=0,executed=0,won=null;
    for(let attempt=0;attempt<attempts&&!won;attempt++){
      executed++;await page.evaluate(n=>{window.__mangoTest.loadLevel(n);window.__mangoTest.advance(120);},n);
      const initial=await state();assert.equal(initial.baseCount,4,'Expected a four-base level');assert.equal(initial.ammo,8,'Requires the isolated eight-shot game');
      const trace=[openings[attempt%openings.length]];await shoot(...trace[0]);
      let s=await state();
      // Count exactly one bomb-opening shot; reject cases in which both bombs
      // detonate, so the rest of the attempt is at most seven normal shots.
      if(s.bombs.filter(b=>b.dead).length!==1||s.bombs.some(b=>!b.dead&&!b.hanging))continue;
      valid++;
      for(let i=1;i<8;i++){
        if(s.finished)break;
        const pieces=s.remainingPositions.filter(p=>p.x>-7&&p.x<16).sort((a,b)=>a.x-b.x);if(!pieces.length)break;
        const index=attempt===0?0:Math.floor(random()*Math.min(pieces.length,attempt%3===0?3:8));
        const piece=pieces[index],offset=[-20,0,-38,16][attempt%4];
        const pull=aim(800+piece.x*50+offset,Math.min(700-piece.y*50,piece.baseY-25),s.sling.y,s.bombs);if(!pull)break;
        trace.push([pull.dx,pull.dy]);await shoot(pull.dx,pull.dy);s=await state();
        assert.deepEqual(s.roofPositions,initial.roofPositions,`Level ${n}: fixed bases`);
        assert.equal(s.blocks,initial.blocks,`Level ${n}: pieces remain physical`);
        if(s.bombs.filter(b=>b.dead).length!==1||s.bombs.some(b=>!b.dead&&!b.hanging))break;
      }
      if(s.remaining===0&&!s.finished){await advance(150);s=await state();}
      const oneBomb=s.bombs.filter(b=>b.dead).length===1&&s.bombs.every(b=>b.dead||b.hanging);
      if(oneBomb){best=Math.min(best,s.remaining);if(s.won)won={shots:s.shots,trace,bombs:s.bombs.map(b=>({dead:b.dead,reason:b.releaseReason}))};}
    }
    console.log(JSON.stringify({level:n,attempts:executed,validOneBombOpenings:valid,bestRemaining:Number.isFinite(best)?best:null,won}));
    if(!won)unresolved.push(n);
  }
  assert.deepEqual(errors,[]);
  if(unresolved.length){console.error('Unresolved in this finite search:',unresolved.join(', '));process.exitCode=1;}
}finally{await browser.close();}
