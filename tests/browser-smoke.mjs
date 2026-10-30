// Run against the Vite development server with CHROME_PATH set to Chromium/Chrome.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

if (!process.env.CHROME_PATH) throw new Error('Set CHROME_PATH to your Chromium/Chrome executable.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
const advance=(n=500)=>page.evaluate(n=>window.__mangoTest.advance(n),n);
const load=async n=>{await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);await advance(120);};
const drag=async(dx,dy)=>{const {sling}=await state();await page.mouse.move(sling.x/2,sling.y/2);await page.mouse.down();await page.mouse.move((sling.x-dx)/2,(sling.y+dy)/2,{steps:2});await page.mouse.up();};
const fire=async(dx,dy)=>{await drag(dx,dy);await advance();};
const selectTheme=async name=>{await page.click('#theme-switch');await page.locator(`#theme-menu [data-theme="${name}"]`).click();};
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.setItem('mango-tope-theme','snow');localStorage.removeItem('mango-tope-unlocked');});await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#score').count(),0);
  await page.click('#levels');assert.equal(await page.locator('.level-tile').count(),30);assert.equal(await page.locator('.level-tile:disabled').count(),29);await page.click('#close-levels');
  await advance(120);const initial=await state();
  assert.equal(initial.ammo,3);assert.equal(initial.shotScale,.195);assert.equal(initial.impactStrength,11.7);assert.equal(initial.bombIntensity,.7);
  assert.equal(await page.locator('.ammo-dot').count(),3);
  assert.equal(initial.remaining,initial.blocks+initial.targets.length);
  assert.equal(initial.hangers,0);assert.equal(initial.projectileSprite,'pebble');assert.equal(initial.targetSprite,'bird');assert.equal(initial.baseCount,1);
  assert.equal(initial.bombs.length,0);
  assert.match(await page.locator('#level-subtitle').innerText(),/every piece and bird/i);
  const expected=['ice','wood','bird','pebble','bomb','lantern','barrel','stone','bamboo','crate','wheel','bucket','snowball','boulder','icearch','sack','sign','ladder','icicles','swing','desert-bone','desert-branch','desert-wall','desert-grass','desert-bucket','desert-wheel','desert-crate','desert-water-jar','jungle-slab','jungle-frog','jungle-mango','jungle-arrow','jungle-rock','jungle-chest','jungle-fence'];
  assert.deepEqual(initial.assets,expected);
  const loaded=await page.evaluate(async names=>Promise.all(names.map(name=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);const vector=['snowball','boulder','icearch','sack','sign','ladder','icicles','swing'].includes(name);i.src=`sprites/${name}.${vector?'svg':'webp'}`;}))),expected);
  assert.ok(loaded.every(Boolean));
  // Snow keeps its original light trajectory while aiming.
  await page.mouse.move(147.5,183.75);await page.mouse.down();await page.mouse.move(90,208.75,{steps:2});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const dot=await page.evaluate(()=>Array.from(document.querySelector('#game').getContext('2d').getImageData(213,160,1,1).data));
  assert.ok(dot[0]>220 && dot[1]>210 && dot[2]>180 && dot[3]>150,'Snow aiming dots should stay light');
  await page.mouse.up();await load(1);
  await drag(125,25);
  const launched=await state();assert.equal(launched.shots,1);
  assert.ok(launched.ball && Math.abs(launched.ball.launchVelocity.x-24.375)<.01,'The launch velocity must be 30% higher than the previous 18.75');
  assert.ok(Math.abs(launched.ball.launchVelocity.y-(-4.875))<.01,'The vertical launch velocity must also increase by 30%');
  await advance();const after=await state();
  assert.equal(after.blocks,initial.blocks,'Structural pieces must remain in the physics world');
  assert.equal(after.bombs.length,initial.bombs.length);
  assert.ok(after.blockPositions.some((b,i)=>Math.hypot(b.x-initial.blockPositions[i].x,b.y-initial.blockPositions[i].y)>.25 || Math.abs(b.angle)>.2),'A real shot must move structure pieces');
  assert.equal(after.targets.length,initial.targets.length,'Bird bodies must stay visible');
  assert.equal(after.hangers,initial.hangers,'Hanging objects must not vanish');
  assert.equal(after.remaining,after.blockPositions.filter(b=>!b.cleared).length+after.targets.filter(b=>!b.cleared).length,'The objective counts pieces and birds, not bombs');
  await load(4);await drag(120,-16);await advance();const partialShot=await state();assert.ok(partialShot.remaining>0&&!partialShot.won,'Partial collapse must not win');
  const signatures=new Set(),names=new Set(),used=new Set(),hangerKinds=new Set();
  for(let n=1;n<=30;n++){
    await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);const before=await state();
    assert.equal(before.ammo,n<15?3:5,`Level ${n} must have the correct stone limit`);assert.equal(before.remaining,before.blockPositions.filter(b=>!b.cleared).length+before.targets.filter(b=>!b.cleared).length,`Level ${n} must exclude bombs from its objective`);assert.equal(before.baseCount,n<=3?1:n<=9?2:3,`Level ${n} should follow the rooftop progression`);assert.equal(before.bombs.length,n>=15?1:0,`Level ${n} should have a bomb only when it has multiple structures`);if(before.bombs.length)assert.ok(before.bombs[0].hanging,`Level ${n} needs a ceiling bomb`);assert.ok(before.targets.length>=1,`Level ${n} needs birds`);names.add(before.layoutName);
    assert.ok(before.roofPositions.every(r=>r.static),`Level ${n} bases must be fixed`);
    assert.ok(before.roofPositions.every((r,i,a)=>!i||r.height>a[i-1].height),`Level ${n} roofs should rise towards the right`);
    for(let i=1;i<before.roofPositions.length;i++){const a=before.roofPositions[i-1],b=before.roofPositions[i];assert.ok(b.x-a.x-(a.width+b.width)/2>=1.8,`Level ${n} needs a real gap between roof slabs`);}
    before.styles.forEach(a=>used.add(a));before.decorations.forEach(a=>used.add(a));before.hangerPositions.forEach(h=>hangerKinds.add(h.type));
    signatures.add(JSON.stringify(before.blockPositions.map(b=>[b.x.toFixed(2),b.y.toFixed(2)])));
    await advance(600);const s=await state();
    assert.equal(s.remaining,before.remaining,`Level ${n} should not clear itself`);if(s.bombs.length)assert.equal(s.bombs[0].hanging,true);
    assert.ok(s.blockPositions.every((b,i)=>Math.hypot(b.x-before.blockPositions[i].x,b.y-before.blockPositions[i].y)<.8||['bucket','boulder','lantern'].includes(before.styles[i])),`Level ${n} should remain stable`);
  }
  assert.equal(signatures.size,30);assert.equal(names.size,30);for(const kind of ['lantern','counterweight','swing','bucket'])assert.ok(hangerKinds.has(kind));
  for(const name of ['ice','wood','stone','bamboo','crate','wheel','bucket','boulder','lantern'])assert.ok(used.has(name),`${name} should appear in a structure`);
  // A direct mouse hit cuts the rope, then the bomb falls before exploding.
  await load(15);assert.match(await page.locator('#level-subtitle').innerText(),/bomb optional/i);const beforeDirect=await state();await drag(90,65);
  let falling;for(let i=0;i<120;i++){await advance(1);const bomb=(await state()).bombs[0];if(bomb.armed && bomb.y>bomb.releaseY+20){falling=bomb;break;}}
  assert.ok(falling && !falling.hanging && !falling.dead,'The struck bomb must visibly fall before detonating');
  assert.equal(falling.releaseReason,'bomb','A body hit should retain the direct-hit behavior');
  assert.ok(Math.abs(falling.x-falling.releaseX)<50,'The released bomb should drop towards its rooftop');
  await advance(240);const directResult=await state(),exploded=directResult.bombs[0];assert.ok(exploded.dead && !exploded.armed,'The falling bomb should explode');
  assert.equal(directResult.bombs.length,1,'The spent casing remains physical');
  assert.equal(directResult.blocks,beforeDirect.blocks,'The explosion must not erase pieces');
  assert.ok(directResult.blockPositions.filter((b,i)=>Math.hypot(b.x-beforeDirect.blockPositions[i].x,b.y-beforeDirect.blockPositions[i].y)>.3).length>=1,'A direct-hit explosion should move nearby pieces');
  // A rope hit releases the first swinging bomb without deleting physical pieces.
  await load(15);const beforeRope=await state();await drag(110,75);
  let ropeDrop;for(let i=0;i<120;i++){await advance(1);const bomb=(await state()).bombs[0];if(bomb.armed && bomb.y>bomb.releaseY+25){ropeDrop=bomb;break;}}
  assert.ok(ropeDrop && ropeDrop.releaseReason==='rope' && !ropeDrop.dead,'A rope hit must detach and drop the bomb before it explodes');
  assert.ok((ropeDrop.x-ropeDrop.releaseX)*ropeDrop.releaseVelocity.x>0,'A cut swinging bomb should continue in its direction of travel');
  await advance(240);const ropeResult=await state();assert.ok(ropeResult.bombs[0].dead,'The rope-cut bomb must explode');
  assert.ok(['block','target','platform','fuse'].includes(ropeResult.bombs[0].detonationTarget),'The rope-cut bomb should explode after falling');
  assert.equal(ropeResult.blocks,beforeRope.blocks,'The blast must leave every structural piece in the world');
  assert.ok(ropeResult.blockPositions.filter((b,i)=>Math.hypot(b.x-beforeRope.blockPositions[i].x,b.y-beforeRope.blockPositions[i].y)>.3).length>=2,'A rope-cut bomb should move multiple pieces');
  // The swinging bomb still disturbs nearby structures after dropping.
  await load(15);const beforeBombRoofs=await state();await drag(110,75);await advance(300);const afterBombRoofs=await state();
  assert.ok(afterBombRoofs.bombs[0].dead,'The first available bomb must explode');
  assert.ok(afterBombRoofs.blockPositions.slice(3).some((b,i)=>Math.hypot(b.x-beforeBombRoofs.blockPositions[i+3].x,b.y-beforeBombRoofs.blockPositions[i+3].y)>.3),'The nearby rooftop should be disturbed');
  // Only medium/hard levels swing; check that motion persists after a long wait.
  await load(14);assert.equal((await state()).bombs.length,0,'Level 14 has no bomb');await advance(600);assert.equal((await state()).bombs.length,0);
  await load(15);assert.equal((await state()).bombs[0].swinging,true);await advance(3000);
  const swings=[];for(let i=0;i<12;i++){await advance(20);const b=(await state()).bombs[0];swings.push(b.x-b.anchor.x);assert.ok(b.hanging);}
  assert.ok(Math.max(...swings)>25 && Math.min(...swings)<-25,'The medium-level pendulum must keep swinging both ways');
  // Cut a moving rope with a real shot: horizontal momentum continues after detachment.
  await load(15);await drag(105,80);
  let movingCut;for(let i=0;i<120;i++){await advance(1);const b=(await state()).bombs[0];if(b.armed){movingCut=b;break;}}
  assert.ok(movingCut && movingCut.releaseReason==='rope' && !movingCut.dead,'A moving rope can be cut');
  assert.ok(Math.abs(movingCut.releaseVelocity.x)>.5,'The bomb had swing momentum at the cut');
  await advance(10);const inFlight=(await state()).bombs[0];
  assert.ok((inFlight.x-movingCut.releaseX)*movingCut.releaseVelocity.x>5,'The bomb should travel in the direction it was swinging');
  await advance(240);assert.ok((await state()).bombs[0].dead,'The swinging bomb eventually explodes');
  // Isolated win fixtures: neither an untouched bomb nor a spent casing blocks progress.
  await load(15);await fire(20,80);
  assert.equal((await state()).bombs[0].hanging,true);
  await page.evaluate(()=>window.__mangoTest.testParkAllBut(-1,true));await advance(150);
  const untouchedBombWin=await state();assert.equal(untouchedBombWin.remaining,0);assert.equal(untouchedBombWin.won,true);assert.equal(untouchedBombWin.bombs[0].hanging,true);
  await load(15);await drag(110,75);await advance(240);
  assert.ok((await state()).bombs[0].dead,'The bomb must have detonated');
  await page.evaluate(()=>{window.__mangoTest.testParkAllBut(-1,true);window.__mangoTest.testBombTop(0,-50);});await advance(150);
  const casingWin=await state();assert.equal(casingWin.bombs[0].cleared,false);assert.equal(casingWin.remaining,0);assert.equal(casingWin.won,true);
  // Isolate the exact whole-body threshold; this is not a gameplay completion test.
  await load(11);await fire(20,80);
  await page.evaluate(()=>{window.__mangoTest.testParkAllBut(0);window.__mangoTest.testPieceTop(0,-5);});await advance(150);
  const partial=await state();assert.equal(partial.remaining,1);assert.equal(partial.finished,false);
  await page.evaluate(()=>window.__mangoTest.testPieceTop(0,5));await advance(150);
  const cleared=await state();assert.equal(cleared.remaining,0);assert.equal(cleared.won,true);
  assert.doesNotMatch(await page.locator('#result-modal').innerText(),/points|score/i);
  // A bird left above its own base also blocks completion.
  await load(11);await fire(20,80);
  await page.evaluate(()=>{window.__mangoTest.testParkAllBut(-1);window.__mangoTest.testBirdTop(0,-5);});await advance(150);
  assert.equal((await state()).remaining,1);assert.equal((await state()).won,false);
  await page.evaluate(()=>window.__mangoTest.testBirdTop(0,5));await advance(150);assert.equal((await state()).won,true);
  // Real misses exhaust all three early stones and do not unlock a partially cleared level.
  await load(4);for(let i=0;i<3;i++)await fire(20,80);await advance(240);
  const lost=await state();assert.equal(lost.shots,3);assert.equal(lost.finished,true);assert.equal(lost.won,false);assert.ok(lost.remaining>0);
  await drag(125,25);assert.equal((await state()).shots,3,'A fourth early shot must not be possible');
  await page.click('#result-button');assert.equal((await state()).shots,0);assert.equal((await state()).ammo,3);
  await load(15);for(let i=0;i<5;i++)await fire(20,80);await advance(240);
  assert.equal((await state()).shots,5);assert.equal((await state()).finished,true);assert.equal((await state()).won,false);
  await drag(125,25);assert.equal((await state()).shots,5,'A sixth late shot must not be possible');
  await page.click('#result-button');assert.equal((await state()).ammo,5);assert.equal((await state()).shots,0);
  // The last level unlocks no phantom levels and returns to level 1.
  await load(30);assert.match(await page.locator('#level-number').innerText(),/30\s*\/\s*30/);await fire(20,80);
  await page.evaluate(()=>window.__mangoTest.testParkAllBut(-1,true));await advance(150);
  assert.equal((await state()).won,true);assert.match(await page.locator('#result-button').innerText(),/desert 31/i);
  await page.click('#result-button');assert.equal((await state()).theme,'desert');assert.equal((await state()).level,31);
  await selectTheme('snow');assert.equal((await state()).theme,'snow');
  await page.click('#levels');assert.equal(await page.locator('.level-tile').count(),30);assert.equal(await page.locator('.level-tile:disabled').count(),0);await page.click('#close-levels');
  // Existing saves from the former 50-level version are clamped to the new limit.
  await page.evaluate(()=>localStorage.setItem('mango-tope-unlocked','50'));await page.reload({waitUntil:'domcontentloaded'});
  await page.click('#levels');assert.equal(await page.locator('.level-tile').count(),30);assert.equal(await page.locator('.level-tile:disabled').count(),0);await page.click('#close-levels');
  const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(process.env.GAME_URL||'http://localhost:5173/',{waitUntil:'domcontentloaded'});await mobile.evaluate(()=>localStorage.setItem('mango-tope-theme','snow'));await mobile.reload({waitUntil:'domcontentloaded'});await mobile.evaluate(()=>window.__mangoTest.advance(120));
  const c=await mobile.evaluate(()=>window.__mangoTest.state().sling),x=c.x*844/1600,y=c.y*390/900,cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-105*844/1600,y:y+5*390/900}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.evaluate(()=>window.__mangoTest.advance(500));const touch=await mobile.evaluate(()=>window.__mangoTest.state());
  assert.equal(touch.shots,1);assert.equal(touch.ammo,3);assert.ok(touch.blockPositions.some((b,i)=>Math.hypot(b.x-initial.blockPositions[i].x,b.y-initial.blockPositions[i].y)>.25),'Touch shot should move physical pieces');
  await mobile.close();assert.deepEqual(errors,[]);
  console.log('Browser smoke passed: three/five stone limits, spaced rooftops across 30 distinct levels, bombs from level 15, optional bombs, reduced blast strength, rope and direct bomb hits, sustained swing, birds, collapse threshold, loss/restart, pointer and touch.');
}finally{await browser.close();}
