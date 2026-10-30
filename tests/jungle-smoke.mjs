// Run against the Vite dev server with CHROME_PATH set to Chromium/Chrome.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
if(!process.env.CHROME_PATH)throw new Error('Set CHROME_PATH to Chromium/Chrome.');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mangoTest.state());
const advance=n=>page.evaluate(n=>window.__mangoTest.advance(n),n);
const load=async n=>{await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);await advance(120);};
const selectTheme=async name=>{await page.click('#theme-switch');await page.locator(`#theme-menu [data-theme="${name}"]`).click();};
const drag=async(dx,dy)=>{let {sling}=await state();await page.mouse.move(sling.x/2,sling.y/2);await page.mouse.down();await page.mouse.move((sling.x-dx)/2,(sling.y+dy)/2,{steps:2});await page.mouse.up();};
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5173/',{waitUntil:'domcontentloaded'});
  assert.equal((await state()).theme,'jungle','Fresh visitors should see the jungle');
  // Existing players arrive in the new jungle once, with their chapter progress intact.
  await page.evaluate(()=>{localStorage.setItem('mango-tope-theme','desert');localStorage.setItem('mango-tope-unlocked','8');localStorage.setItem('mango-tope-desert-unlocked','4');localStorage.removeItem('mango-tope-jungle-intro-seen');localStorage.removeItem('mango-tope-jungle-unlocked');});await page.reload({waitUntil:'domcontentloaded'});
  assert.equal((await state()).theme,'jungle');assert.equal(await page.evaluate(()=>localStorage.getItem('mango-tope-unlocked')),'8');assert.equal(await page.evaluate(()=>localStorage.getItem('mango-tope-desert-unlocked')),'4');
  await selectTheme('desert');await page.reload({waitUntil:'domcontentloaded'});assert.equal((await state()).theme,'desert','A chosen theme persists after the one-time introduction');await selectTheme('jungle');
  await page.click('#theme-switch');assert.equal(await page.locator('#theme-switch').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#theme-menu button').count(),3);assert.equal(await page.locator('#theme-menu [data-theme="jungle"]').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#theme-switch').getAttribute('aria-expanded'),'false');
  let initial=await state();assert.equal(initial.theme,'jungle');assert.equal(initial.level,61);assert.equal(initial.ammo,7);assert.equal(initial.projectileSprite,'jungle-mango');assert.equal(initial.bombs.length,2);
  assert.match(await page.locator('#level-number').innerText(),/61\s*\/\s*90/);assert.match(await page.locator('#ammo-label-text').innerText(),/mangoes/i);assert.equal(await page.locator('.ammo-dot').count(),7);
  assert.match(await page.locator('.game-shell').getAttribute('style'),/jungle-canopy/);
  const assets=['jungle-slab','jungle-frog','jungle-mango','jungle-arrow','jungle-rock','jungle-chest','jungle-fence'];
  const loaded=await page.evaluate(async names=>Promise.all(names.map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=`sprites/${name}.webp`;}))),assets);assert.ok(loaded.every(Boolean));
  await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),29);assert.equal(await page.getByRole('button',{name:'Level 61',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Level 90, locked'}).count(),1);await page.click('#close-levels');
  const signatures=new Set(),names=new Set(),styles=new Set(),footholds=new Set(),decorations=new Set(),baseLayouts=new Set(),bayShapes=[new Set(),new Set(),new Set(),new Set()],bands=[[],[],[]];
  for(let n=61;n<=90;n++){
    await page.evaluate(n=>window.__mangoTest.loadLevel(n),n);const before=await state();
    assert.equal(before.level,n);assert.equal(before.ammo,7);assert.equal(before.baseCount,[82,85,88,90].includes(n)?4:3);assert.equal(before.bombs.length,2);
    assert.ok(before.bombs.every(b=>b.hanging&&b.swinging));assert.notEqual(before.bombs[0].anchor.x,before.bombs[1].anchor.x);
    assert.ok(before.targets.some(t=>t.sprite==='jungle-frog')&&before.targets.some(t=>t.sprite==='bird'));
    footholds.add(before.blockPositions.filter(b=>b.isRamp).length);decorations.add(before.decorations.join(','));
    assert.ok([...before.blockPositions,...before.targets].every(b=>b.topY>0),`Level ${n} starts on screen`);
    assert.equal(before.remaining,before.blocks+before.targets.length);
    assert.ok(before.roofPositions.every(r=>r.static),`Level ${n} bases must be fixed`);
    assert.ok(before.roofPositions.every((r,i,a)=>!i||r.height>a[i-1].height),`Level ${n} roofs should rise towards the right`);
    for(let i=1;i<before.roofPositions.length;i++){const a=before.roofPositions[i-1],b=before.roofPositions[i];assert.ok(b.x-a.x-(a.width+b.width)/2>=1,'There must be space between stone bases');}
    baseLayouts.add(JSON.stringify(before.roofPositions.map(r=>[r.x,r.width,r.height])));
    before.roofPositions.forEach((roof,slot)=>{
      const pieces=before.blockPositions.map((b,i)=>({...b,style:before.styles[i]})).filter(b=>Math.abs(b.baseY-(roof.y-9))<.1);
      const courses=new Set(pieces.map(b=>Math.round((b.baseY-(700-b.y*50))/25)));
      assert.ok(courses.size>=3,`Level ${n} bay ${slot+1} needs at least three physical courses`);
      bayShapes[slot].add(JSON.stringify(pieces.map(b=>[+(b.x-roof.x).toFixed(2),+(b.y-roof.height).toFixed(2),b.style])));
    });
    bands[Math.floor((n-61)/10)].push(before.remaining);before.styles.forEach(s=>styles.add(s));names.add(before.layoutName);signatures.add(JSON.stringify(before.blockPositions.map(b=>[b.x.toFixed(2),b.y.toFixed(2)])));
    await advance(600);const after=await state();assert.equal(after.remaining,before.remaining,`Level ${n} must not self-clear`);
    assert.ok(after.blockPositions.every((b,i)=>Math.hypot(b.x-before.blockPositions[i].x,b.y-before.blockPositions[i].y)<.8||['bucket','boulder','lantern'].includes(before.styles[i])),`Level ${n} should start stable`);
    await advance(600);assert.equal((await state()).remaining,before.remaining,`Level ${n} should not self-clear after a longer idle`);
  }
  assert.equal(names.size,30);assert.equal(signatures.size,30);assert.ok(baseLayouts.size>=20,'Base geometry should vary across levels');assert.ok(bayShapes.slice(0,3).every(s=>s.size>=20),'Each position needs varied real structures');for(const name of ['jungle-arrow','jungle-rock','jungle-chest','wheel','desert-bone','jungle-fence'])assert.ok(styles.has(name),`${name} appears across the jungle`);
  assert.ok(footholds.size>=2,'Jungle layouts have different footholds, not identical ladders');assert.ok(decorations.size>=4,'Decorations should vary');
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;assert.ok(avg(bands[0])<avg(bands[1])&&avg(bands[1])<avg(bands[2]),'Later jungle levels should generally have more physical pieces');
  // Real impacts move structures, but never damage or move the fixed bases.
  await load(62);const intact=await state();assert.ok(intact.roofPositions.every(r=>r.static));assert.ok(intact.blockPositions.some(b=>b.isRamp),'The arch has real movable planks');
  assert.ok(intact.roofPositions.every((r,i,a)=>!i||r.height>a[i-1].height));
  await drag(100,24);await advance(420);const firstHit=await state();
  assert.deepEqual(firstHit.roofPositions,intact.roofPositions);assert.ok(firstHit.remaining>0&&firstHit.remaining<intact.remaining);
  assert.ok(firstHit.blockPositions.some(b=>b.isRamp&&b.cleared),'A hit should dislodge a real movable plank');
  assert.ok(firstHit.blockPositions.some((b,i)=>Math.hypot(b.x-intact.blockPositions[i].x,b.y-intact.blockPositions[i].y)>.25));
  await drag(122,8);await advance(420);const secondHit=await state();
  assert.deepEqual(secondHit.roofPositions,intact.roofPositions);assert.ok(secondHit.remaining>0&&!secondHit.won,'Two ordinary shots must not automatically clear level 62');
  assert.equal(secondHit.blocks,intact.blocks,'Falling structures stay physical, not deleted');
  // Two real mango shots can independently cut or strike either swinging bomb.
  for(const [i,dx,dy] of [[0,35,70],[1,55,100]]){
    await load(61);const start=await state();await drag(dx,dy);
    let beforeBlast=await state();for(let frame=0;frame<200;frame++){await advance(2);const s=await state();if(s.bombs[i].dead)break;beforeBlast=s;}
    await advance(300);const after=await state();
    assert.equal(after.shots,1);assert.ok(after.bombs[i].dead,`Mango should detonate bomb ${i+1}`);assert.ok(!after.bombs[1-i].dead,'Either bomb can be hit independently');
    assert.ok(after.remaining<beforeBlast.remaining,'The detonation must actually clear counted pieces, not just the mango impact');assert.deepEqual(after.roofPositions,start.roofPositions,'Bomb blasts leave the bases fixed');assert.equal(after.blocks,start.blocks,'Blasts must not erase pieces');assert.ok(after.blockPositions.some((b,j)=>Math.hypot(b.x-start.blockPositions[j].x,b.y-start.blockPositions[j].y)>.25));
  }
  // Early teaching levels: real mango shots trigger body-to-body collisions.
  // Freeze the render clock; advance exact physics frames for repeatable aim.
  await page.evaluate(()=>window.__mangoTest.controlled(true));
  for(const [n,dx,dy] of [[61,90,24],[62,90,20],[63,90,12],[64,90,20],[65,90,28]]){
    await load(n);const before=await state();await drag(dx,dy);await advance(420);const cascade=await state();
    assert.ok(cascade.bombs.every(b=>b.hanging&&!b.dead),`Level ${n}: the cascade check uses no bomb`);
    assert.ok(cascade.cascadeCollisions>0&&cascade.remaining<before.remaining,`Level ${n}: structures should cascade and clear after a real hit`);
  }
  // The tempting two-bomb opening on level 78 must not auto-clear it.
  await load(78);for(const [dx,dy] of [[55,65],[75,90]]){await drag(dx,dy);await advance(420);}
  assert.ok((await state()).remaining>0,'Level 78 should not clear from this two-bomb opening');
  // Hit each intact bay directly without either bomb. Low-roof accessibility
  // is separately checked with other structures parked in reachability.mjs.
  const directShots=[
    [61,[[115,10],[70,50],[50,95]]],
    [63,[[125,5],[35,90],[50,95]]],
    [65,[[100,15],[35,90],[50,95]]],
    [67,[[100,10],[35,90],[50,95]]],
    [69,[[125,5],[35,90],[50,95]]],
    [71,[[100,15],[35,90],[50,95]]],
    [73,[[105,10],[35,90],[50,95]]],
    [76,[[100,10],[55,55],[50,95]]],
    [77,[[100,15],[35,90],[50,95]]],
    [80,[[100,15],[60,55],[50,95]]],
    [81,[[125,5],[35,90],[50,95]]],
    [83,[[125,-5],[50,65],[50,95]]],
    [86,[[100,15],[65,50],[50,95]]],
    [87,[[105,10],[35,90],[45,95]]],
    [89,[[100,15],[50,60],[50,95]]],
    [82,[[105,-10],[45,65],[55,65],[65,70]]],
    [85,[[120,-10],[60,40],[65,70],[70,70]]],
    [88,[[120,-10],[50,45],[80,55],[90,60]]],
    [90,[[120,-10],[45,65],[50,65],[70,70]]],
  ];
  for(const [n,shots] of directShots)for(const [slot,[dx,dy]] of shots.entries()){
    await load(n);const before=await state();await drag(dx,dy);await advance(130);const after=await state();
    assert.ok(['block','target'].includes(after.lastProjectile?.firstImpact),`Level ${n}: bay ${slot+1} needs a direct shot`);
    assert.ok(Math.abs(after.lastProjectile.firstImpactBaseY-(before.roofPositions[slot].y-9))<1,`Level ${n}: direct shot should reach bay ${slot+1}`);
    assert.ok(after.bombs.every(b=>b.hanging&&!b.dead),`Level ${n}: bay ${slot+1} shot should avoid bombs`);
  }
  await page.evaluate(()=>window.__mangoTest.controlled(false));
  // Test all seven real launches and the loss/restart flow.
  await load(61);for(let i=1;i<=7;i++){await drag(20,80);await advance(500);const s=await state();assert.equal(s.shots,i);assert.equal(await page.locator('#ammo-count').innerText(),String(7-i));if(i<7)assert.equal(s.finished,false);}
  await advance(240);assert.equal((await state()).finished,true);assert.equal((await state()).won,false);await drag(100,30);assert.equal((await state()).shots,7);await page.click('#result-button');assert.equal((await state()).ammo,7);
  // Rule fixture: frogs count, and clearance alone wins with both bombs untouched.
  await load(61);await drag(20,0);await advance(350);assert.equal((await state()).targets[0].sprite,'jungle-frog');
  await page.evaluate(()=>{window.__mangoTest.testParkAllBut(-1,true);window.__mangoTest.testBirdTop(0,-5);});await advance(150);
  assert.equal((await state()).remaining,1);assert.equal((await state()).won,false);
  await page.evaluate(()=>window.__mangoTest.testBirdTop(0,5));await advance(150);
  assert.equal((await state()).won,true);assert.ok((await state()).bombs.every(b=>b.hanging&&!b.dead));assert.match(await page.locator('#result-text').innerText(),/frog/i);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mango-tope-jungle-unlocked')),'2');await page.click('#result-button');assert.equal((await state()).level,62);
  // Independent saves and navigation through all three chapters.
  await page.evaluate(()=>{localStorage.setItem('mango-tope-unlocked','8');localStorage.setItem('mango-tope-desert-unlocked','4');});
  await selectTheme('snow');assert.equal((await state()).theme,'snow');await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),22);await page.click('#close-levels');
  await selectTheme('desert');assert.equal((await state()).theme,'desert');await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),26);await page.click('#close-levels');
  await selectTheme('jungle');assert.equal((await state()).theme,'jungle');await page.click('#levels');assert.equal(await page.locator('.level-tile:disabled').count(),28);await page.click('#close-levels');
  await load(90);await drag(20,80);await advance(350);await page.evaluate(()=>window.__mangoTest.testParkAllBut(-1,true));await advance(150);assert.equal((await state()).won,true);assert.match(await page.locator('#result-button').innerText(),/level 61/i);await page.click('#result-button');assert.equal((await state()).level,61);
  const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(process.env.GAME_URL||'http://localhost:5173/');await mobile.evaluate(()=>localStorage.setItem('mango-tope-theme','jungle'));await mobile.reload();
  const rect=await mobile.locator('#theme-switch').boundingBox();assert.ok(rect&&rect.x>=0&&rect.x+rect.width<=844);assert.equal(await mobile.locator('.ammo-dot').count(),7);await mobile.screenshot({path:'/tmp/jungle-mobile.png'});await mobile.locator('#theme-switch').tap();assert.equal(await mobile.locator('#theme-switch').getAttribute('aria-expanded'),'true');await mobile.locator('#theme-menu [data-theme="snow"]').tap();assert.equal((await mobile.evaluate(()=>window.__mangoTest.state())).theme,'snow');await mobile.close();
  assert.deepEqual(errors,[]);console.log('Jungle smoke passed: 30 stable progressive layouts, seven mangoes, both bombs, frogs, independent saves, progression and mobile.');
}finally{await browser.close();}
