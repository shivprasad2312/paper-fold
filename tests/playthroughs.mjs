// Full real-pointer playthrough sweep. Start the Vite server first, then run
// CHROME_PATH=/path/to/chromium npm run test:playthroughs
// This bot observes positions and fires normal pointer shots. It never parks,
// removes or teleports pieces. Snow/desert avoid bombs; jungle uses them.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
if(!process.env.CHROME_PATH)throw new Error('Set CHROME_PATH to Chromium/Chrome.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
const advance=n=>page.evaluate(n=>window.__mangoTest.advance(n),n);
let seed=123456;
const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
function aim(tx,ty,sy,bombs,avoidBombs=true){
  let best=null;
  for(let dx=30;dx<=130;dx+=2)for(let dy=-30;dy<=130;dy+=2){
    if(Math.hypot(dx,dy)>130)continue;
    const t=(tx-(295-dx*.425))/(dx*.195);if(t<0)continue;
    const y=sy+dy*.425-dy*.195*t+.139*t*t,score=Math.abs(ty-y)+(130-dx)*.035;
    // Conservatively avoid the swinging bomb and the entire rope corridor.
    let safe=true;
    for(const bomb of (avoidBombs?bombs:[]))for(const off of [-95,0,95]){
      const time=(bomb.anchor.x+off-(295-dx*.425))/(dx*.195);
      if(time>0&&sy+dy*.425-dy*.195*time+.139*time*time<190)safe=false;
    }
    if(safe&&(!best||score<best.score))best={dx,dy,score};
  }
  return best;
}
let shotTrace=[];
async function shoot(dx,dy){
  shotTrace.push([dx,dy]);
  const {sling}=await state();
  await page.mouse.move(sling.x/2,sling.y/2);await page.mouse.down();
  await page.mouse.move((sling.x-dx)/2,(sling.y+dy)/2);await page.mouse.up();
  await advance(420);
}
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5173/');
  const failures=[];
  for(const [theme,start] of [['snow',1],['desert',31],['jungle',61]].filter(([t])=>!process.env.TEST_THEME||process.env.TEST_THEME===t)){
    await page.evaluate(t=>{localStorage.setItem('mango-tope-jungle-intro-seen','1');localStorage.setItem('mango-tope-theme',t);},theme);
    await page.reload();await page.evaluate(()=>window.__mangoTest.controlled(true));let wins=0,shots=[],selected=0;
    for(let n=start;n<start+30;n++){
      if(process.env.TEST_LEVELS&&!process.env.TEST_LEVELS.split(',').map(Number).includes(n))continue;
      selected++;if(theme==='jungle')seed=123456;let best=Infinity,won=false;
      for(let attempt=0;attempt<Number(process.env.MAX_ATTEMPTS||(theme==='jungle'?100:12))&&!won;attempt++){
        shotTrace=[];await page.evaluate(n=>{window.__mangoTest.loadLevel(n);window.__mangoTest.advance(120);},n);
        const initial=await state();
        // Both hanging bombs are independently reachable. Try one or both first;
        // the chosen pull and order give the moving ropes multiple opportunities.
        const bombPulls=[[60,100],[65,90],[75,90],[80,85],[85,80],[50,110],[70,90],[75,80],[85,85],[60,95],[65,95],[50,115],[80,90],[70,95],[80,80],[45,110],[75,95],[70,100],[85,75],[65,105],[75,100],[80,95]];
        let opening=theme!=='jungle'?[]:attempt%4===0?[[55,65]]:attempt%4===1?[[55,100]]:[[55,65],bombPulls[attempt%bombPulls.length]];
        // Four-bay prototype has different bomb anchor positions. These
        // openings were measured using ordinary pointer shots, not fixtures.
        if(theme==='jungle'&&initial.baseCount===4){
          const first=[[45,75],[40,75],[90,85],[85,90],[70,95]];
          opening=[first[attempt%first.length]];
          if(attempt%3===2)opening.push(bombPulls[attempt%bombPulls.length]);
        }
        if(process.env.CUSTOM_OPENING)opening=JSON.parse(process.env.CUSTOM_OPENING);
        for(const [dx,dy] of opening){await shoot(dx,dy);if((await state()).finished)break;}
        for(let shot=opening.length;shot<initial.ammo;shot++){
          const s=await state();if(s.finished)break;
          const pieces=s.remainingPositions.filter(p=>p.x>-7&&p.x<16).sort((a,b)=>a.x-b.x);
          if(!pieces.length)break;
          const index=attempt===0?0:Math.floor(random()*Math.min(pieces.length,attempt%3===0?3:8));
          const piece=pieces[index];
          // Aim at the accessible upper edge of pieces lying flat on a roof.
          const dxTarget=theme==='jungle'?[-20,0,-38,16][attempt%4]:-20;
          const pull=aim(800+piece.x*50+dxTarget,Math.min(700-piece.y*50,piece.baseY-25),s.sling.y,s.bombs,theme!=='jungle');
          if(!pull)break;await shoot(pull.dx,pull.dy);
          const after=await state();
          assert.deepEqual(after.roofPositions,initial.roofPositions,`Level ${n}: bases must stay fixed`);
          assert.equal(after.blocks,initial.blocks,`Level ${n}: pieces must stay physical`);
          assert.equal(after.targets.length,initial.targets.length);
          if(theme!=='jungle'&&after.bombs.some(b=>!b.hanging||b.dead))break;
        }
        let result=await state();
        if(result.remaining===0&&!result.finished){await advance(150);result=await state();}
        if(process.env.DEBUG_BALANCE&&result.remaining<best)console.log(`level ${n} attempt ${attempt}: ${result.remaining} left`,JSON.stringify(result.remainingPositions),'pulls:',JSON.stringify(shotTrace));
        best=Math.min(best,result.remaining);
        won=result.won&&(theme==='jungle'?result.bombs.some(b=>b.dead):result.bombs.every(b=>b.hanging&&!b.dead));
        assert.ok(result.shots<=initial.ammo,`Level ${n} exceeded its shot limit`);
        if(won){shots.push(result.shots);if(process.env.DEBUG_BALANCE)console.log(`level ${n} winning pulls: ${JSON.stringify(shotTrace)}; bombs: ${JSON.stringify(result.bombs.map(b=>({dead:b.dead,releaseReason:b.releaseReason})))}`);}
      }
      if(won)wins++;else failures.push({level:n,bestRemaining:best});
      if(process.env.TEST_LEVELS)console.log(`level ${n}: ${won?'won':'unresolved'}; best remaining ${best}`);
    }
    console.log(`${theme}: ${wins}/${selected} wins with real shots (${theme==='jungle'?'bomb-assisted':'bombs untouched'}); winning shots: ${shots.join(',')}`);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[],`Unresolved: ${JSON.stringify(failures)}`);
  console.log('All selected levels cleared within their shot limits.');
}finally{await browser.close();}
