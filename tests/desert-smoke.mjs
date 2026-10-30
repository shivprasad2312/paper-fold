// Run against the Vite development server with CHROME_PATH set to Chromium/Chrome.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

if (!process.env.CHROME_PATH) throw new Error('Set CHROME_PATH to your Chromium/Chrome executable.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
const advance=n=>page.evaluate(n=>window.__mangoTest.advance(n),n);
const load=async n=>{await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);await advance(120);};
const selectTheme=async name=>{await page.click('#theme-switch');await page.locator(`#theme-menu [data-theme="${name}"]`).click();};
const drag=async(dx,dy)=>{const {sling}=await state();await page.mouse.move(sling.x/2,sling.y/2);await page.mouse.down();await page.mouse.move((sling.x-dx)/2,(sling.y+dy)/2,{steps:2});await page.mouse.up();};
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.setItem('mango-tope-theme','desert'));await page.reload({waitUntil:'domcontentloaded'});
  const initial=await state();assert.equal(initial.theme,'desert');assert.equal(initial.level,31);assert.equal(initial.ammo,7);assert.equal(initial.bombs.length,1);assert.match(await page.locator('#level-number').innerText(),/31\s*\/\s*60/);
  assert.equal(await page.locator('.ammo-dot').count(),7);assert.equal(await page.locator('#ammo-count').innerText(),'7');
  assert.match(await page.locator('#chapter').innerText(),/desert village/i);
  assert.match(await page.locator('.game-shell').getAttribute('style'),/desert-distant\.webp/);
  assert.equal(await page.locator('.game-shell.desert-theme').count(),1);
  const images=['desert-bone','desert-branch','desert-wall','desert-grass','desert-bucket','desert-wheel','desert-crate','desert-water-jar'];
  const loaded=await page.evaluate(async names=>Promise.all(names.map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=`sprites/${name}.webp`;}))),images);
  assert.ok(loaded.every(Boolean),'The desert-specific artwork should load');
  // Inspect the actual canvas while a real pointer holds an aim: desert dots are bluish-grey.
  await page.mouse.move(147.5,183.75);await page.mouse.down();await page.mouse.move(90,208.75,{steps:2});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const dot=await page.evaluate(()=>Array.from(document.querySelector('#game').getContext('2d').getImageData(213,160,1,1).data));
  assert.ok(dot[0]>=85 && dot[0]<=100 && dot[1]>dot[0] && dot[2]>dot[1] && dot[3]>180,`Desert aiming dots must be bluish-grey: ${dot}`);
  await page.mouse.up();
  const used=new Set(),names=new Set(),signatures=new Set(),hangerKinds=new Set(),difficulty=[[],[],[]];
  for(let n=31;n<=60;n++){
    await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);const before=await state();
    assert.equal(before.theme,'desert');assert.equal(before.ammo,7);assert.equal(before.bombs.length,1);
    assert.equal(before.baseCount,3);assert.ok(before.roofPositions.every(r=>r.width>=3.4),'Desert bases should be broad');assert.ok(Math.max(...before.roofPositions.map(r=>r.height))-Math.min(...before.roofPositions.map(r=>r.height))>=1,'Rooftops should be at different heights');assert.ok(before.waterJars.length>0);assert.ok(before.bombs[0].swinging);assert.ok(before.remaining>=18,'Desert forts should retain substantial physical construction with fewer loose pieces');assert.equal(before.impactFactor,.72);
    const height=Math.max(...[...before.blockPositions,...before.targets].map(b=>(b.baseY-b.topY)/50));
    difficulty[Math.floor((n-31)/10)].push({pieces:before.remaining,height});
    assert.ok([...before.blockPositions,...before.targets].every(b=>b.topY>0),`Level ${n} pieces must begin onscreen`);
    assert.equal(before.remaining,before.blocks+before.targets.length,`Level ${n} starts with all pieces above their bases`);
    assert.equal(before.remaining,before.blockPositions.filter(b=>!b.cleared).length+before.targets.filter(b=>!b.cleared).length);
    assert.ok(before.roofPositions.every(r=>r.static),`Level ${n} bases must be fixed`);
    assert.ok(before.roofPositions.every((r,i,a)=>!i||r.height>a[i-1].height),`Level ${n} roofs should rise towards the right`);
    for(let i=1;i<before.roofPositions.length;i++){const a=before.roofPositions[i-1],b=before.roofPositions[i];assert.ok(b.x-a.x-(a.width+b.width)/2>=1,'Rooftops need gaps');}
    before.styles.forEach(x=>used.add(x));before.hangerPositions.forEach(x=>hangerKinds.add(x.type));names.add(before.layoutName);
    signatures.add(JSON.stringify(before.blockPositions.map(b=>[b.x.toFixed(2),b.y.toFixed(2)])));
    await advance(600);const settled=await state();assert.equal(settled.remaining,before.remaining,`Level ${n} must not clear itself`);
    assert.ok(settled.blockPositions.every((b,i)=>Math.hypot(b.x-before.blockPositions[i].x,b.y-before.blockPositions[i].y)<.8||['bucket','desert-bucket','boulder','lantern'].includes(before.styles[i])),`Level ${n} should start stable`);
    if(n>=15)assert.ok(settled.bombs[0].hanging && settled.bombs[0].swinging);
  }
  assert.equal(names.size,30);assert.equal(signatures.size,30);
  const avg=(band,key)=>band.reduce((sum,item)=>sum+item[key],0)/band.length;
  assert.ok(avg(difficulty[1],'pieces')>avg(difficulty[0],'pieces') && avg(difficulty[2],'pieces')>avg(difficulty[1],'pieces'),'Later chapters should have more physical pieces on average');
  assert.ok(avg(difficulty[1],'height')>avg(difficulty[0],'height') && avg(difficulty[2],'height')>avg(difficulty[1],'height'),'Later chapters should have taller structures on average');
  for(const name of images)assert.ok(used.has(name),`${name} should be used in the desert structures`);
  assert.ok(hangerKinds.has('bucket'),'A physical hanging bucket should appear');
  // A real pointer shot moves the independent bone bodies; they are not deleted.
  await load(31);const beforeShot=await state();assert.ok(beforeShot.styles.includes('desert-bone'));await drag(128,-8);await advance(400);
  const afterShot=await state();assert.equal(afterShot.shots,1);assert.equal(afterShot.blocks,beforeShot.blocks);assert.deepEqual(afterShot.roofPositions,beforeShot.roofPositions,'Impacts must not move the bases');
  assert.ok(afterShot.blockPositions.some((b,i)=>Math.hypot(b.x-beforeShot.blockPositions[i].x,b.y-beforeShot.blockPositions[i].y)>.25),'A stone should physically move the bone structure');
  assert.ok(!afterShot.bombs[0].dead,'This is an ordinary impact, not a bomb blast');
  assert.ok(afterShot.remaining<beforeShot.remaining && afterShot.remaining>beforeShot.remaining*.6,'An ordinary hit should dislodge pieces without clearing the level');
  await drag(120,18);await advance(400);const afterSecond=await state();
  assert.equal(afterSecond.shots,2);assert.ok(afterSecond.remaining<afterShot.remaining,'A second shot should continue to clear the structure');
  // Lock the physics clock while comparing exactly the same shot.
  await page.evaluate(()=>window.__mangoTest.controlled(true));
  for(const n of [35,41,60]){
    await load(n);const first=await state();await drag(128,-8);await advance(400);const hit=await state();
    assert.ok(hit.remaining>=first.remaining*.6,`An ordinary hit should not clear most of level ${n}`);
  }
  await page.evaluate(()=>window.__mangoTest.controlled(false));
  // A water jar is a counted physical body. A real shot causes a single spill
  // and temporarily reduces nearby pieces' friction; the jar remains in play.
  await load(31);const jarBefore=await state();assert.ok(jarBefore.waterJars.length);await drag(65,60);let wet;
  for(let i=0;i<220;i++){await advance(1);const s=await state();if(s.waterJars.some(j=>j.spilled)){wet=s;break;}}
  assert.ok(wet,'A real impact should spill a water jar');assert.ok(wet.wetBlocks>0,'Water should make nearby blocks slippery');assert.equal(wet.blocks,jarBefore.blocks,'The spilled jar remains a physical piece');
  await advance(260);assert.equal((await state()).wetBlocks,0,'Slipperiness should wear off');
  // The optional swinging bomb also responds to a real rope shot in the desert.
  await load(31);await drag(55,80);let cut;
  for(let i=0;i<140;i++){await advance(1);const bomb=(await state()).bombs[0];if(!bomb.hanging){cut=bomb;break;}}
  assert.ok(cut && cut.armed && cut.releaseReason==='rope','A real rope shot should release the desert bomb');
  await advance(240);assert.ok((await state()).bombs[0].dead,'The desert bomb should explode after falling');
  // Seven real missed shots are available, with no early loss or eighth shot.
  await load(31);
  for(let i=1;i<=7;i++){
    await drag(20,80);await advance(500);const s=await state();
    assert.equal(s.shots,i);assert.equal(await page.locator('#ammo-count').innerText(),String(7-i));
    if(i<7)assert.equal(s.finished,false,`Should not lose after only ${i} shots`);
  }
  await advance(240);assert.equal((await state()).finished,true);assert.equal((await state()).won,false);
  await drag(125,25);assert.equal((await state()).shots,7,'An eighth shot must not be possible');
  await page.click('#result-button');assert.equal((await state()).shots,0);assert.equal((await state()).ammo,7);
  // Switching themes preserves separate progress; a run restarts rather than mixing worlds.
  await load(31);
  await page.evaluate(()=>{localStorage.setItem('mango-tope-unlocked','8');localStorage.removeItem('mango-tope-desert-unlocked');});
  await selectTheme('snow');assert.equal((await state()).theme,'snow');assert.match(await page.locator('.game-shell').getAttribute('style'),/snow-cartoon/);
  await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),22);await page.click('#close-levels');
  await selectTheme('desert');assert.equal((await state()).theme,'desert');await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),29);assert.equal(await page.getByRole('button',{name:'Level 31',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Level 60, locked'}).count(),1);assert.match(await page.locator('#levels-description').innerText(),/31–60/);await page.click('#close-levels');
  // Isolated progression fixture, not a gameplay completion test.
  await load(31);await drag(20,80);await advance(350);await page.evaluate(()=>window.__mangoTest.testParkAllBut(-1,true));await advance(150);
  assert.equal((await state()).won,true);assert.equal(await page.evaluate(()=>localStorage.getItem('mango-tope-desert-unlocked')),'2');
  await page.click('#result-button');assert.equal((await state()).level,32);
  await selectTheme('snow');assert.equal((await state()).theme,'snow');await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),22);await page.click('#close-levels');
  await selectTheme('desert');assert.equal((await state()).theme,'desert');await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),28);await page.click('#close-levels');
  // The final desert level advances to the jungle chapter after a win.
  await load(60);assert.match(await page.locator('#level-number').innerText(),/60\s*\/\s*60/);await drag(20,80);await advance(350);await page.evaluate(()=>window.__mangoTest.testParkAllBut(-1,true));await advance(150);assert.equal((await state()).won,true);assert.match(await page.locator('#result-button').innerText(),/jungle 61/i);await page.click('#result-button');assert.equal((await state()).theme,'jungle');assert.equal((await state()).level,61);
  const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(process.env.GAME_URL||'http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await mobile.evaluate(()=>localStorage.setItem('mango-tope-theme','desert'));await mobile.reload();
  assert.equal((await mobile.evaluate(()=>window.__mangoTest.state())).theme,'desert');
  const rect=await mobile.locator('#theme-switch').boundingBox();assert.ok(rect && rect.width>20 && rect.x>=0 && rect.x+rect.width<=844,'The theme switch should be reachable on mobile');
  await mobile.locator('#theme-switch').tap();await mobile.locator('#theme-menu [data-theme="jungle"]').tap();assert.equal((await mobile.evaluate(()=>window.__mangoTest.state())).theme,'jungle');await mobile.locator('#theme-switch').tap();await mobile.locator('#theme-menu [data-theme="snow"]').tap();assert.equal((await mobile.evaluate(()=>window.__mangoTest.state())).theme,'snow');
  await mobile.close();assert.deepEqual(errors,[]);
  console.log('Desert browser smoke passed: seven-shot limit, taller and denser later layouts, desert physics, independent progress, theme switch and mobile.');
}finally{await browser.close();}
