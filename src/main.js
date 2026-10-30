import './style.css';
import Matter from 'matter-js';
import './roof-friction.js';

const { Engine, Bodies, Body, Composite, Events, Vector, Constraint } = Matter;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const W=1600,H=900,S=50,ORIGIN_Y=700, TOTAL_LEVELS=30;
const EARLY_SHOTS=3, LATE_SHOTS=5, DESERT_SHOTS=7, JUNGLE_SHOTS=7, BOMB_START_LEVEL=15, SHOT_SCALE=.195, IMPACT_STRENGTH=11.7, DESERT_IMPACT_FACTOR=.72, BOMB_INTENSITY=.7;
const sling={x:295,y:367.5};
const CHAPTERS=['THE SNOWY VILLAGE','THE WINTER FAIR','THE GREAT SNOWY RESCUE'];
const DESERT_CHAPTERS=['THE DESERT VILLAGE','THE DUNE MARKET','THE SANDSTONE FORT'];
const JUNGLE_CHAPTERS=['THE JUNGLE CANOPY','THE WILDWOOD TRAIL','THE LOST JUNGLE FORT'];
const images={};
const spriteNames=['ice','wood','bird','pebble','bomb','lantern','barrel','stone','bamboo','crate','wheel','bucket','snowball','boulder','icearch','sack','sign','ladder','icicles','swing','desert-bone','desert-branch','desert-wall','desert-grass','desert-bucket','desert-wheel','desert-crate','desert-water-jar','jungle-slab','jungle-frog','jungle-mango','jungle-arrow','jungle-rock','jungle-chest','jungle-fence'];
const vectorSprites=new Set(['snowball','boulder','icearch','sack','sign','ladder','icicles','swing']);
for(const name of spriteNames){
  const img=new Image();img.src=`${import.meta.env.BASE_URL}sprites/${name}.${vectorSprites.has(name)?'svg':'webp'}`;images[name]=img;
}
let testControlled=false,cascadeCollisions=0;
let engine,blocks,targets,bombs,stones,platforms,roofOffsets,effects,hangers,currentStone,level=0,shots=0,ammo=EARLY_SHOTS,dragging=false,aim={x:110,y:20},shotAt=0,simTime=0,finished=false,won=false,winAt=null,failAt=null,lastRemaining=-1,muted=false,audio,lastTime=0,accumulator=0,layoutName='';
// Show the newly added chapter once, without touching any chapter's saved progress.
// From then on, remember whichever world the player deliberately chooses.
let theme='jungle';
try{
  if(!localStorage.getItem('mango-tope-jungle-intro-seen')){
    localStorage.setItem('mango-tope-theme','jungle');
    localStorage.setItem('mango-tope-jungle-intro-seen','1');
  }else{
    const saved=localStorage.getItem('mango-tope-theme');
    if(['snow','desert','jungle'].includes(saved))theme=saved;
  }
}catch{}
const progressKey=()=>theme==='snow'?'mango-tope-unlocked':`mango-tope-${theme}-unlocked`;
const themeOffset=()=>theme==='jungle'?60:theme==='desert'?30:0;
function readUnlocked(){try{return Math.min(TOTAL_LEVELS,Math.max(1,Number(localStorage.getItem(progressKey()))||1));}catch{return 1;}}
let unlocked=readUnlocked();const themeLevels={snow:0,desert:0,jungle:0};
const X=x=>800+x*S,Y=y=>ORIGIN_Y-y*S;
function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);}
addEventListener('resize',resize);resize();
function sound(freq=440,duration=.1,type='sine'){if(muted)return;try{audio||=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(65,freq*.6),audio.currentTime+duration);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function roofHeight(x){
  if(x<-7)return theme==='jungle'?4.1:5.3; // launcher ledge
  const tier=x< -1.5?0:x<4.5?1:x<9.8?2:3;
  // Each farther rooftop sits higher, leaving a clear approach to low debris.
  const variation=theme==='snow'?0:[0,.15,-.15][level%3];
  return (theme==='snow'?2.5:3.9)+tier*.55+variation;
}
function nearestRoof(x){let best=roofOffsets[0],distance=Infinity;for(const roof of roofOffsets){const d=Math.abs(x-roof.x);if(d<distance){best=roof;distance=d;}}return best;}
function roofOffset(x){return nearestRoof(x)?.delta??roofHeight(x);}
function baseHeight(x){const roof=nearestRoof(x);return Y(roof?roof.delta+roof.top:roofHeight(x));}
function island(x,top,width,heightAdjustment=0,variant=0){
  const delta=roofHeight(x)+heightAdjustment,px=X(x),py=Y(top+delta),w=width*S;
  const body=Bodies.rectangle(px,py+9,w,18,{isStatic:true,friction:.8,label:'platform',collisionFilter:{category:x<-7?0x0002:0x0001}});
  body.jungleRoof=theme==='jungle'&&x>=-7;
  const roof={x,width,delta,top,body,baseY:py,variant};
  roofOffsets.push(roof);Composite.add(engine.world,body);platforms.push({x:px,y:py,w,roof});
}
function makeBlock(x,y,w,h,material='wood'){
  const px=X(x),py=Y(y+roofOffset(x)),width=w*S,height=h*S;
  const index=blocks.length;
  let style;
  if (material==='stone') style='stone';
  else if (material==='clay') style='ice';
  else if (['bamboo','wheel','bucket','crate','barrel','snowball','boulder','sack'].includes(material)) style=material;
  else if (Math.abs(w-h)<.08) style=index%2?'crate':'barrel';
  else style=['ice','bamboo','wood','stone'][index%4];
  if(theme==='desert'){
    if(material==='water-jar')style='desert-water-jar';
    else if(material==='clay')style='desert-bone';
    else if(material==='stone')style='desert-wall';
    else if(material==='bamboo')style='desert-branch';
    else if(material==='wheel')style='desert-wheel';
    else if(material==='bucket')style='desert-bucket';
    else if(material==='crate')style=index%3===0?'desert-grass':'desert-crate';
    else if(material==='wood'&&Math.abs(w-h)>=.08)style=index%2?'desert-branch':'desert-bone';
    else if(style==='barrel'||style==='crate')style='desert-crate';
  }
  if(theme==='jungle'){
    if(style==='ice')style='wood';
    if(material==='clay')style='desert-bone';
    else if(material==='jungle-rock')style='jungle-rock';
    else if(material==='bamboo')style=index%2?'bamboo':'desert-bone';
    else if(material==='water-jar')style='jungle-chest';
    else if(material==='crate')style=index%3===0?'jungle-chest':'crate';
    else if(material==='wood'&&w>1.5&&h<.5)style=!blocks.some(b=>b.style==='jungle-arrow')?'jungle-arrow':index%2?'jungle-fence':'wood';
  }
  if(material==='ramp')style=theme==='jungle'?'jungle-fence':theme==='desert'?'desert-branch':'wood';
  const options={density:theme==='jungle'?.006:material==='stone'?.0021:.0015,friction:theme==='jungle'?.3:.65,restitution:.03,frictionAir:.005,label:'block'};
  const body=['wheel','desert-wheel','snowball','boulder','jungle-rock'].includes(style) && Math.abs(width-height)<1?Bodies.circle(px,py,width/2,options):Bodies.rectangle(px,py,width,height,{...options,chamfer:{radius:Math.min(4,width*.04,height*.04)}});
  if(material==='ramp'&&theme==='snow')body.friction=.06;
  body.kind='block';body.isRamp=material==='ramp';body.waterJar=theme==='desert'&&material==='water-jar';body.spilled=false;body.baseY=baseHeight(x);body.style=style;body.w=width;body.h=height;body.decoration=width>height*1.8?(theme==='jungle'?[null,null,'lantern',null,'sign',null,'swing',null,'ladder',null,null,null][(level*5+index*7)%12]:theme==='desert'?['lantern','sign','ladder','swing'][index%4]:['lantern','icicles','sign','ladder','icearch','swing'][index%6]):null;blocks.push(body);Composite.add(engine.world,body);return body;
}
function makeTarget(x,y,size=.94){const options={density:.00075,friction:.7,restitution:.08,frictionAir:.005,label:'target'};const body=theme==='jungle'?Bodies.rectangle(X(x),Y(y+roofOffset(x)),size*S,size*S,{...options,chamfer:{radius:Math.min(9,size*S*.2)}}):Bodies.circle(X(x),Y(y+roofOffset(x)),size*S/2,options);body.kind='target';body.sprite=theme==='jungle'&&targets.length%2===0?'jungle-frog':'bird';body.baseY=baseHeight(x);body.drawSize=size===.94?54:size*S+7;targets.push(body);Composite.add(engine.world,body);}
function makeBomb(x,y){const b=Bodies.circle(X(x),Y(y+roofOffset(x)),.37*S,{density:.0014,friction:.65,restitution:.05,label:'bomb'});b.kind='bomb';b.baseY=baseHeight(x);b.dead=false;b.hanging=false;b.armed=false;bombs.push(b);Composite.add(engine.world,b);return b;}
function hangCeilingBomb(x, swinging,direction=1){
  const b=makeBomb(x,0), length=150, offset=swinging?65*direction:0;
  b.hanging=true;b.swinging=swinging;b.anchor={x:X(x),y:0};
  b.frictionAir=swinging?0:.01;
  Body.setPosition(b,{x:b.anchor.x+offset,y:Math.sqrt(length*length-offset*offset)});
  b.rope=Constraint.create({pointA:b.anchor,bodyB:b,length,stiffness:.95,damping:swinging?0:.12});Composite.add(engine.world,b.rope);
}
function releaseCeilingBomb(b, reason='bomb'){
  if(!b.hanging)return;b.hanging=false;b.armed=true;b.releaseY=b.position.y;b.releaseX=b.position.x;b.releaseVelocity={...b.velocity};b.releaseAt=simTime;b.releaseReason=reason;
  if(reason==='bomb'){
    // Keep the existing direct-hit drop: let the solver finish, then remove the impact's momentum.
    b.collisionFilter.mask &= ~0x0004;b.cutThisStep=true;
  }
  // A rope hit does not strike the bomb: it keeps its pendulum velocity and follows a ballistic path.
  Composite.remove(engine.world,b.rope);b.rope=null;sound(380,.1,'triangle');
}
// Swept segment test: a fast stone can cross a thin rope between physics frames.
function pointSegmentDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function segmentsTouch(a,b,c,d,radius){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const c1=cross(a,b,c),c2=cross(a,b,d),c3=cross(c,d,a),c4=cross(c,d,b);
  if(c1*c2<0&&c3*c4<0)return true;
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))<=radius;
}
function checkRopeHits(previous){
  for(const b of bombs){
    if(!b.hanging)continue;
    const dx=b.position.x-b.anchor.x,dy=b.position.y-b.anchor.y,len=Math.hypot(dx,dy);
    // Stop short of the bomb so a direct body hit retains its existing behaviour.
    const end={x:b.position.x-dx/len*42,y:b.position.y-dy/len*42};
    for(const [stone,start] of previous){
      if(pointSegmentDistance(b.position,start,stone.position)<=42)continue;
      if(segmentsTouch(start,stone.position,b.anchor,end,23)){releaseCeilingBomb(b,'rope');break;}
    }
  }
}
function detonate(b,hit='fuse'){
  if(b.dead)return;b.detonationTarget=hit;b.dead=true;b.armed=false;const p={...b.position};Body.setVelocity(b,{x:b.velocity.x+5*BOMB_INTENSITY,y:b.velocity.y-6*BOMB_INTENSITY});
  effects.push({kind:'explosion',x:p.x,y:p.y,life:40});
  for(let i=0;i<22;i++)effects.push({kind:'spark',x:p.x,y:p.y,vx:(Math.random()-.5)*13,vy:(Math.random()-.65)*12,life:28+Math.random()*22,color:i%2?'#fff0a6':'#ff9a50'});
  for(const obj of [...blocks,...targets,...stones]){
    if(obj.isStatic)continue;const dx=obj.position.x-p.x,dy=obj.position.y-p.y,dist=Math.max(18,Math.hypot(dx,dy));const radius=theme==='jungle'?220:250;if(dist>radius)continue;
    // Radial impulse with a little upward lift as the blast reflects off the roof.
    const power=(1-dist/radius)*30*BOMB_INTENSITY;Body.setVelocity(obj,{x:obj.velocity.x+dx/dist*power*1.2,y:obj.velocity.y+dy/dist*power*.6-power*.8});Body.setAngularVelocity(obj,obj.angularVelocity+dx/dist*.08*BOMB_INTENSITY);
  }
  sound(110,.4,'sawtooth');updateUI();
}
// A struck matka spills once; nearby pieces become slippery for a short time.
function spillWater(jar){
  if(jar.spilled)return;jar.spilled=true;jar.pendingSpill=false;
  for(let i=0;i<24;i++)effects.push({kind:'spark',x:jar.position.x,y:jar.position.y,vx:(Math.random()-.5)*10,vy:-Math.random()*8,life:24+Math.random()*18,color:i%2?'#9fddf3':'#58add4'});
  for(const obj of blocks){
    if(obj===jar||obj.isStatic||Math.hypot(obj.position.x-jar.position.x,obj.position.y-jar.position.y)>130)continue;
    if(obj.dryFriction==null)obj.dryFriction=obj.friction;
    obj.friction=Math.min(obj.friction,.06);obj.wetUntil=simTime+4000;
  }
  sound(600,.12,'sine');
}
// A direct hit on a structure releases a physical shockwave; no piece is removed.
function impactBurst(stone){
  if(stone.burst)return;stone.burst=true;const p=stone.position;
  const range=theme==='jungle'?60:theme==='desert'?135:level<14?240:175;
  for(const obj of [...blocks,...bombs,...targets]){
    const dx=obj.position.x-p.x,dy=obj.position.y-p.y,dist=Math.max(20,Math.hypot(dx,dy));
    if(dist>range)continue;
    // Desert's broader forts absorb more of an ordinary stone's shockwave;
    // the projectile itself and optional bomb keep their normal physics.
    const power=(1-dist/range)*IMPACT_STRENGTH*(theme==='jungle'?.5:theme==='desert'?DESERT_IMPACT_FACTOR:1);
    Body.setVelocity(obj,{x:obj.velocity.x+dx/dist*power+power*.45,y:obj.velocity.y+dy/dist*power-power*.35});
  }
  effects.push({kind:'blast',x:p.x,y:p.y,life:36});sound(180,.16,'triangle');
}
function hangBucket(beam){
  const attach={x:beam.w*.5+45,y:beam.h*.15}, c=Math.cos(beam.angle),s=Math.sin(beam.angle);
  const anchor={x:beam.position.x+attach.x*c-attach.y*s,y:beam.position.y+attach.x*s+attach.y*c};
  const bucket=Bodies.rectangle(anchor.x,anchor.y+62,29,30,{density:.00002,friction:.5,frictionAir:.005,label:'block'});
  bucket.kind='block';bucket.baseY=beam.baseY;bucket.style=theme==='desert'?'desert-bucket':'bucket';bucket.w=29;bucket.h=30;bucket.decoration=null;
  const rope=Constraint.create({bodyA:beam,pointA:attach,bodyB:bucket,pointB:{x:0,y:-15},length:47,stiffness:.85,damping:.12});
  blocks.push(bucket);hangers.push({type:'bucket',beam,attach,bucket});Composite.add(engine.world,[bucket,rope]);
}
function hangLantern(beam,type='lantern'){
  // A lamp or stone counterweight hangs outside the bay like a village hoist.
  const attach={x:-beam.w*.5-45,y:beam.h*.15}, isWeight=type==='counterweight';
  const options={density:.00002,friction:.5,frictionAir:.008,label:'block'};
  const x=beam.position.x+attach.x,y=beam.position.y+attach.y+61;
  const lamp=isWeight?Bodies.circle(x,y,15,options):Bodies.rectangle(x,y,22,34,options);
  lamp.kind='block';lamp.baseY=beam.baseY;lamp.style=isWeight?'boulder':'lantern';lamp.w=isWeight?30:22;lamp.h=isWeight?30:34;lamp.decoration=null;
  const rope=Constraint.create({bodyA:beam,pointA:attach,bodyB:lamp,pointB:{x:0,y:-lamp.h/2},length:61-lamp.h/2,stiffness:.8,damping:.12});
  blocks.push(lamp);hangers.push({type,beam,attach,bucket:lamp});Composite.add(engine.world,[lamp,rope]);
}
function hangSwing(beam){
  const attach={x:-beam.w*.5-20,y:beam.h*.15};
  const seat=Bodies.rectangle(beam.position.x+attach.x,beam.position.y+attach.y+48,32,9,{density:.00015,friction:.5,frictionAir:.01,label:'block'});
  seat.kind='block';seat.baseY=beam.baseY;seat.style='wood';seat.w=32;seat.h=9;seat.decoration=null;
  const ropes=[-11,11].map(offset=>Constraint.create({bodyA:beam,pointA:{x:attach.x+offset,y:attach.y},bodyB:seat,pointB:{x:offset,y:-4},length:44,stiffness:.8,damping:.12}));
  blocks.push(seat);hangers.push({type:'swing',beam,attach,bucket:seat});Composite.add(engine.world,[seat,...ropes]);
}
// Snow progresses from one to two and then three rooftops.
// Each code picks a different physical structure, not just a cosmetic skin.
const LEVEL_PATTERNS=[
  'F', 'W', 'B', 'FP', 'SF',
  'PF', 'BF', 'SB', 'PS', 'WBP',
  'PBW', 'FBP', 'WBS', 'FSW', 'WPS',
  'FPBW', 'BPSF', 'WFBS', 'PSBW', 'FBWP',
  'SWFB', 'BPWS', 'WSPF', 'PBSW', 'FSBP',
  'BWFP', 'SPWB', 'FWPS', 'BFSW', 'PSFB',
];
const LEVEL_NAMES=[
  'First Snowfall', 'The Cart Shed', 'Bamboo Beginnings', 'Two Rooftops', 'Stairs and Scaffolds',
  'The Snowy Pair', 'Bamboo Outposts', 'The Little Walkway', 'Snow Steps', 'The Snow Fair',
  'Village Wheels', 'The Frosty Fort', 'The Bamboo Cart', 'Three Watchposts', 'Village Heights',
  'Three Rooftops', 'Bamboo Village', 'The Winter Crossing', 'The Lantern Market', 'The Frosty Quarter',
  'The High Courtyards', 'The Snowy Parade', 'The Village Run', 'The Frozen Fair', 'The Snowy Watch',
  'The Cart Convoy', 'Snowbound Haveli', 'The Winter Gauntlet', 'The Moonlit Market', 'The Great Rooftop',
];
// Desert blueprints reuse the game mechanics but mix in sandstone wall bays.
const DESERT_PATTERNS=[
  'WDP','PDW','FDP','WPS','FSP','WPD','DFP','PSD','DSP','PWF',
  'FPDW','DPSF','WFPD','PSDW','FDWP','SWPD','DPWS','WSPF','PDSW','FSDP',
  'DWFP','SPWD','FWPS','DFSP','PSFD','DFWP','PDWS','SDPF','BDSP','WPDS'
];
const DESERT_NAMES=[
  'First Light','The Sandstone Bay','The Dune Cart','Mud Roof Market','Straw and Steps',
  'The Village Caravan','Branches and Bones','The Old Walkway','Desert Steps','The Dune Fair',
  'The Caravan Yard','The Sunbaked Fort','The Sandstone Cart','Desert Watchposts','The High Dunes',
  'Three Sand Roofs','The Bone Bazaar','The Caravan Crossing','The Lantern Market','The Golden Quarter',
  'The High Courtyards','The Desert Parade','The Village Run','The Sandstone Fair','Three Watchposts',
  'The Cart Convoy','Sandstone Haveli','The Dune Gauntlet','The Camel Market','The Great Desert Fort'
];
// Thirty authored combinations of six genuinely different physical blueprints.
const JUNGLE_PATTERNS=[
 'SDB','FPW','BWP','DSF','WSP','PBF','FDB','SWD','BPS','WDF',
 'PWS','DBW','FSB','SPD','BFD','WSB','PDS','DFW','SBP','WBF',
 'BDS','PWF','FSP','DWB','SFW','PBD','WSD','FBS','DPS','BWF'
];
// Tall towers and selected four-base challenges from the jungle prototype.
const JUNGLE_TALL_LEVELS={75:'TFD',79:'STP'};
const JUNGLE_FOUR_LEVELS={82:'TLWD',85:'LTDF',88:'LSWP',90:'TWFP'};
const JUNGLE_NAMES=[
 'Mango Grove','The Mossy Path','Frog Pond','Hidden Roots','The Canopy Cart',
 'The Forest Steps','The Green Lookout','The Fern Crossing','The Wildwood Market','The River Bend',
 'The Old Tree Fort','The Jungle Hoist','The Rocky Glade','The Forest Caravan','The Broken Trail',
 'The Mossy Citadel','The Vine Bridge','The Frog Village','The Hidden Camp','The Tall Canopy',
 'The Forest Rampart','The Lost Path','The Jungle Bazaar','The Stone Watch','The Emerald Quarter',
 'The Wildwood Keep','The High Plateau','The Forgotten Way','The Canopy Gauntlet','The Great Jungle Fort'
];
// Original difficulty tiers retain the size of the selected harder blueprints.
const LEVEL_COMPLEXITY=[1, 3, 4, 5, 7, 8, 10, 12, 14, 21, 23, 25, 27, 30, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
// Each structure stands on two movable planks overhanging an unbreakable
// rooftop. The planks, supports and payload are all counted physical bodies.
function buildRooftop(x,kind,slot){
  island(x,0,3.4);
  const h=1.1+[0,.12,.24][(level*2+slot*2+1)%3],shift=h-1.1, foot=1.28+((level+slot*2)%5)*.02;
  const upgraded=level>=(theme==='snow'?14:10)&&slot<Math.min(3,1+Math.floor((level-(theme==='snow'?14:10))/7));
  if(theme==='snow'&&level<14){
    for(const side of [-1,1]){
      makeBlock(x+side*foot,.20,1.5,.40,'ramp');
      makeBlock(x+side*foot,.40+h/2,.45,h,kind==='B'?'bamboo':kind==='W'?'stone':'clay');
    }
    const top=1.50+h-1.1;
    makeBlock(x,top+.13,kind==='W'?2.8:2.9,.26,kind==='W'?'bamboo':'wood');
    const deck=top+.26;
    if(kind==='W'&&level<9){makeBlock(x-.85,deck+.30,.60,.60,'wheel');makeBlock(x+.85,deck+.30,.60,.60,'wheel');}
    if(kind==='P'){makeBlock(x,deck+.30,.60,.60,'crate');makeTarget(x,deck+.60+.48);}
    else if(kind==='S'){makeBlock(x-.75,deck+.30,.60,.60,'stone');makeTarget(x+.75,deck+.48);}
    else makeTarget(x,deck+.48);
    return;
  }
  for(const side of [-1,1]){
    makeBlock(x+side*foot,.20,1.5,.40,'ramp');
    makeBlock(x+side*foot,.40+h/2,.45,h,kind==='B'?'bamboo':'stone');
  }
  makeBlock(x,1.63+shift,2.9,.26,'wood');
  if(kind==='P'||kind==='S'){
    makeBlock(x-.37,2.12+shift,.74,.72,kind==='S'?'stone':'crate');
    makeBlock(x+.37,2.12+shift,.74,.72,kind==='S'?'stone':theme==='desert'?'water-jar':'crate');
    let top=2.48+shift;
    if(upgraded){makeBlock(x,top+.36,.72,.72,'crate');top+=.72;}
    makeTarget(x,top+.48);
  }else if(kind==='W'){
    makeBlock(x-.65,2.07+shift,.60,.60,'wheel');makeBlock(x+.65,2.07+shift,.60,.60,'wheel');
    makeBlock(x,2.51+shift,1.95,.28,'bamboo');let top=2.65+shift;
    if(upgraded){makeBlock(x-.69,top+.45,.35,.90,'bamboo');makeBlock(x+.69,top+.45,.35,.90,'bamboo');makeTarget(x,top+.48);makeBlock(x,top+1.05,1.80,.30,'wood');top+=1.20;if(theme==='jungle')makeBlock(x,top+.29,.58,.58,'jungle-rock');}
    else{makeTarget(x,top+.48);if(theme==='jungle')makeBlock(x+.82,top+.29,.58,.58,'jungle-rock');}
  }else{
    makeBlock(x-.69,2.2+shift,.4,.9,'bamboo');makeBlock(x+.69,2.2+shift,.4,.9,'bamboo');
    const upperBeam=makeBlock(x,2.80+shift,1.8,.3,'wood');upperBeam.canHang=true;let top=2.95+shift;
    if(upgraded){makeBlock(x,top+.35,.7,.7,'crate');top+=.70;}
    makeTarget(x,top+.48);
  }
}
// Distinct jungle silhouettes and footholds: no shared bottom scaffold.
// All pieces, including the overhanging planks, remain physical and counted.
function jungleBaySpec(slot){
  // Seeded/structured rather than random at runtime: retries preserve the same
  // authored puzzle. Width/height offsets remain bounded for clear shot lines.
  if(level===0)return {variant:slot,width:3.4,height:0,offset:0};
  const variant=(level*5+slot*7+Math.floor(level/5))%6;
  return {variant,width:[3.25,3.4,3.55,3.7][(level+slot*3+Math.floor(level/4)*(slot+1))%4],
    height:[-.08,0,.08][(level*2+slot+Math.floor(level/3)*slot)%3],offset:[-.16,0,.16][(level+slot*2+Math.floor(level/4)*slot)%3]};
}
function buildJungleRooftop(x,kind,slot,spec){
  island(x,0,spec.width,spec.height,spec.variant);
  const tier=level>=20?2:level>=10?1:0,v=spec.variant;
  if(kind==='T'){
    // A true open-frame tower: each floor rests on two physical posts.
    // One character is sheltered inside; the top rock is loose payload.
    let floor=0;
    const span=[1.08,1.16,1.24][v%3];
    for(let storey=0;storey<4;storey++){
      for(const side of [-1,1])makeBlock(x+side*span,floor+.50,.36,1.0,storey%2?'stone':'bamboo');
      makeBlock(x,floor+1.11,2*span+.56,.22,'wood');
      floor+=1.22;
      if(storey===1)makeTarget(x,floor+.48);
    }
    makeBlock(x,floor+.31,.62,.62,'jungle-rock');
    makeTarget(x+.68,floor+.48);
  }else if(kind==='L'){
    // A lighter lookout balances the fourth bay. On level 85 the posts
    // stand directly on the fixed stone rather than leaving a loose plank.
    const footing=level===24?0:.20;
    if(footing)makeBlock(x,.10,2.50,.20,'wood');
    for(const side of [-1,1])makeBlock(x+side*.90,footing+.45,.36,.90,'bamboo');
    makeBlock(x,footing+1.02,2.25,.24,'wood');
    makeBlock(x,footing+1.49,.70,.70,v%2?'stone':'crate');
    makeTarget(x,footing+2.32);
  }else if(kind==='F'){
    const span=[1.18,1.28,1.36][v%3],h=[1.00,1.10,1.20][(v+1)%3],deck=.40+h;
    for(const side of [-1,1]){
      makeBlock(x+side*span,.20,1.5,.40,'ramp');
      makeBlock(x+side*span,.40+h/2,.45,h,'bamboo');
    }
    makeBlock(x,deck+.13,2*span+.34,.26,'wood');
    makeBlock(x,.34,.64,.68,v%2?'crate':'stone');
    const frame=deck+.26;
    makeBlock(x-.69,frame+.45,.4,.9,'bamboo');makeBlock(x+.69,frame+.45,.4,.9,'bamboo');
    const beam=makeBlock(x,frame+1.05,1.8,.3,'wood');beam.canHang=true;
    let top=frame+1.20;if(tier&&slot<=tier){makeBlock(x,top+.32,.64,.64,'crate');top+=.64;}
    makeTarget(x,top+.48);
  }else if(kind==='P'){
    const u=[.68,.70,.72][v%3];
    if(!spec.compactBay)makeBlock(x+1.4,.275,.55,.55,'stone');
    for(const col of [-1,0,1])makeBlock(x+col*u,u/2,u,u,'crate');
    for(const side of [-1,1])makeBlock(x+side*u/2,1.5*u,u,u,side<0?'stone':'crate');
    let top=2*u;
    // The peak is a third counted structural course, even in the first chapter.
    makeBlock(x,top+u/2,u,u,v%2?'crate':'stone');top+=u;
    makeTarget(x,top+.48);
  }else if(kind==='S'){
    const u=.68,dir=v%2?-1:1;
    for(let col=0;col<3;col++){
      const count=col+1+(tier===2&&col===1?1:0),px=x+(col-1)*u*dir;
      for(let row=0;row<count;row++)makeBlock(px,u*(row+.5),u,u,(row+col)%2?'crate':'stone').friction=.55;
    }
    let top=2.04;const capX=x+(tier===2?.34:.68)*dir;
    if(tier===2){makeBlock(capX,top+.34,1.05,u,'crate').friction=.55;top+=u;}
    makeBlock(capX,top+.13,1.15,.26,'wood').friction=.55;top+=.26;makeTarget(capX,top+.48);
  }else if(kind==='W'){
    const h=[.78,.84,.90][v%3],spread=[.55,.65,.75][(v+1)%3];
    makeBlock(x,.32,.64,.64,'crate');
    for(const side of [-1,1])makeBlock(x+side*1.05,h/2,.62,h,'stone');
    makeBlock(x,h+.13,2.8,.26,'wood');
    for(const side of [-1,1])makeBlock(x+side*spread,h+.56,.60,.60,'wheel');
    makeBlock(x,h+1.0,1.95,.28,'bamboo');let top=h+1.14;
    // The first cart also carries a third visible course. Its side rock
    // remains on the deck rather than floating beside the raised cargo.
    if(!tier)makeBlock(x+.82,top+.29,.58,.58,'jungle-rock');
    makeBlock(x,top+.35,.70,.70,'water-jar');top+=.70;
    makeTarget(x,top+.48);
  }else if(kind==='B'){
    const span=[.85,.95,1.05][v%3];
    for(const side of [-1,1]){
      const px=x+side*span;
      makeBlock(px,.36,.72,.72,'water-jar');
      makeBlock(px,1.08,.72,.72,side<0?'crate':'stone');
      makeBlock(px,1.80,.72,.72,side<0?'stone':'crate');
      makeBlock(px,2.26,1.05,.20,'wood');
      makeTarget(px,2.84);
    }
    // The introductory twin towers have no loose centre cargo: the two
    // three-course stacks themselves teach the cascade without a stray block.
    if(level!==0)makeBlock(x,.36,.68,.72,v%2?'stone':'crate');
    if(tier)makeBlock(x,1.08,.68,.72,tier===2?'stone':'crate');
  }else{
    const span=[1.00,1.12,1.24][v%3];
    for(const side of [-1,1])makeBlock(x+side*span,.60,.50,1.20,'stone');
    makeTarget(x,.48);makeBlock(x,1.34,span*2+.51,.28,'wood');
    makeBlock(x-(span-.12),1.755,.55,.55,'crate');
    makeBlock(x,1.84,.68,.72,'water-jar');let top=2.20;
    makeBlock(x,top+.34,.68,.68,tier===2?'stone':'crate');top+=.68;
    makeTarget(x,top+.48);
  }
}

function setupLevel(n){
  ammo=theme==='jungle'?JUNGLE_SHOTS:theme==='desert'?DESERT_SHOTS:n>=BOMB_START_LEVEL?LATE_SHOTS:EARLY_SHOTS;layoutName=(theme==='jungle'?JUNGLE_NAMES:theme==='desert'?DESERT_NAMES:LEVEL_NAMES)[n-1];
  const codes=(theme==='jungle'?JUNGLE_PATTERNS:theme==='desert'?DESERT_PATTERNS:LEVEL_PATTERNS)[n-1].split(''), complexity=theme!=='snow'?26+Math.min(n-1,24):LEVEL_COMPLEXITY[n-1];
  island(-10.1,0,5.3);
  // Four-bay puzzles alternate with the other layouts in the late chapter.
  const challenge=theme==='jungle'?JUNGLE_FOUR_LEVELS[n+60]:null;
  const fourBay=!!challenge;
  // Compact, still-fixed roofs leave enough room for fallen pieces to reach
  // the gaps; the wider first roof supports the taller opening structures.
  const specs=theme==='jungle'?Array.from({length:fourBay?4:3},(_,i)=>{
    const spec=jungleBaySpec(i);
    return fourBay&&n!==30?{...spec,width:3.05+(i===0?.1:0),compactBay:true}:spec;
  }):[];
  const positions=theme==='snow'&&codes.length===1?[4.8]:theme==='snow'&&codes.length===2?[2.2,10.8]:theme==='jungle'?(fourBay?[-3,2.1,7.2,12.3]:[-1,5.5,12]).map((x,i)=>x+specs[i].offset):[-1,5.5,12];
  const extra=codes.find(c=>c!=='P'&&c!=='W')||'B';
  const types=theme==='jungle'?(challenge||JUNGLE_TALL_LEVELS[n+60]||codes.join('')).split(''):theme==='snow'?codes.slice(0,3):(codes.slice(0,3).includes('P')?codes.slice(0,3):[...codes.filter(c=>c!=='P').slice(0,2),'P']);
  for(let i=0;i<positions.length;i++){
    if(theme==='jungle')buildJungleRooftop(positions[i],types[i],i,specs[i]);
    else buildRooftop(positions[i],types[i],i);
  }
  if(theme==='jungle'){
    // Debris may fall through the launcher ledge, rather than getting
    // stranded behind the sling where no forward shot can reach it.
    for(const b of [...blocks,...targets])b.collisionFilter.mask &= ~0x0002;
  }
  // Introduce physical hanging props gradually, away from the projectile's first tutorial.
  const beam=blocks.filter(b=>b.canHang&&b.position.y+105<b.baseY).sort((a,b)=>a.position.x-b.position.x)[0];
  if(beam&&complexity>=8&&complexity%4===0)hangLantern(beam,complexity%8===0?'lantern':'counterweight');
  if(beam&&complexity>=20&&complexity%9===0)hangBucket(beam);
  if(beam&&complexity>=30&&complexity%10===0&&hangers.length===0)hangSwing(beam);
  // The optional ceiling bomb joins the five-stone challenges at level 15.
  if(theme==='jungle'){hangCeilingBomb(positions[0]-1,true);hangCeilingBomb(positions[positions.length-1]+.7,true,-1);}
  else if((theme==='desert'||n>=BOMB_START_LEVEL)&&positions.length>=2)hangCeilingBomb(positions[1],theme==='desert'||n>=15);
}

function init(){
  sling.y=theme==='jungle'?430:367.5;
  engine=Engine.create({gravity:{x:0,y:1,scale:.001},positionIterations:10,velocityIterations:10});
  cascadeCollisions=0;blocks=[];targets=[];bombs=[];stones=[];platforms=[];roofOffsets=[];effects=[];hangers=[];currentStone=null;shots=0;dragging=false;aim={x:110,y:20};shotAt=0;simTime=0;winAt=null;failAt=null;lastRemaining=-1;finished=false;won=false;accumulator=0;
  Composite.add(engine.world,Bodies.rectangle(800,1080,3000,70,{isStatic:true,label:'floor',friction:.8}));
  const shell=document.querySelector('.game-shell');shell.classList.toggle('desert-theme',theme==='desert');shell.classList.toggle('jungle-theme',theme==='jungle');shell.style.setProperty('--jungle-mango',`url("${import.meta.env.BASE_URL}sprites/jungle-mango.webp")`);
  shell.style.backgroundImage=`url("${import.meta.env.BASE_URL}backgrounds/${theme==='jungle'?'jungle-canopy':theme==='desert'?'desert-distant':'snow-cartoon'}.webp")`;
  $('theme-label').textContent=theme.toUpperCase();$('theme-switch').firstElementChild.textContent=theme==='jungle'?'♣':theme==='desert'?'☀':'❄';
  $('theme-switch').setAttribute('aria-label',`Choose theme (current: ${theme})`);
  document.querySelectorAll('#theme-menu button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.theme===theme)));
  closeThemeMenu();
  $('footer-note').innerHTML=theme==='jungle'?'A LITTLE DHAMAAL, A LOT OF JUNGLE <span>✽</span>':theme==='desert'?'A LITTLE DHAMAAL, A LOT OF SAND <span>✽</span>':'A LITTLE DHAMAAL, A LOT OF SNOW <span>✽</span>';
  $('ammo-label-text').textContent=theme==='jungle'?'YOUR MANGOES':'YOUR STONES';
  $('hint-detail').textContent=theme==='jungle'?'Pull the mango back & release':'Pull the stone back & release';
  $('mission-text').textContent=theme==='jungle'?'Clear pieces, birds & frogs':'Clear pieces & birds';
  canvas.setAttribute('aria-label',`Mango Gulail game. Drag the ${theme==='jungle'?'mango':'stone'} back in the slingshot and release to launch.`);
  setupLevel(level+1);
  Events.on(engine,'collisionStart',e=>{for(const pair of e.pairs){const a=pair.collision.parentA,b=pair.collision.parentB,impact=Vector.magnitude(Vector.sub(a.velocity,b.velocity));if(import.meta.env.DEV&&shots&&['block','target'].includes(a.kind)&&['block','target'].includes(b.kind)&&impact>1)cascadeCollisions++;
    for(const [obj,other] of [[a,b],[b,a]]){
    if(import.meta.env.DEV&&obj.kind==='projectile'&&!obj.firstImpact){obj.firstImpact=other.label;obj.firstImpactBaseY=other.baseY??null;}
    if(shots&&obj.waterJar&&!obj.spilled&&impact>3&&(other.kind==='projectile'||other.kind==='block'||other.label==='platform'))obj.pendingSpill=true;
    if(shots&&obj.kind==='projectile'&&!obj.burst&&impact>2&&(other.kind==='block'||other.kind==='target'||other.kind==='bomb'))impactBurst(obj);
    if(shots&&obj.kind==='bomb'&&!obj.dead){
      if(obj.hanging&&other.kind==='projectile'&&impact>2)releaseCeilingBomb(obj);
      else if(obj.armed&&simTime-obj.releaseAt>200&&obj.position.y>obj.releaseY+35&&(other.kind==='block'||other.kind==='target'||other.label==='platform'||other.label==='floor'))obj.pendingDetonation ||= other.kind||other.label;
      else if(!obj.hanging&&!obj.armed&&impact>3.5&&(other.kind==='projectile'||other.kind==='block'))obj.pendingDetonation ||= other.kind;
    }
  }}});
  $('result-modal').classList.add('hidden');$('levels-modal').classList.add('hidden');$('hint').classList.toggle('hidden',level!==0);updateUI();
}
// A piece counts only once its entire collision shape is below its own starting roof.
// Birds and frogs count too; bomb casings and fixed roofs are excluded.
function remainingPieces(){return [...blocks,...targets].filter(b=>b.bounds.min.y<b.baseY+1);}
function displayLevel(local=level){return local+1+themeOffset();}
function updateUI(){
  const left=ammo-shots,remaining=remainingPieces().length,number=displayLevel();lastRemaining=remaining;
  $('remaining-top').textContent=remaining;$('level-number').innerHTML=`${String(number).padStart(2,'0')} <em>/ ${themeOffset()+30}</em>`;
  $('chapter').textContent=(theme==='jungle'?JUNGLE_CHAPTERS:theme==='desert'?DESERT_CHAPTERS:CHAPTERS)[Math.floor(level/10)];$('level-title').textContent=layoutName;
  $('level-subtitle').textContent=theme==='jungle'?'Clear every piece · Use the bombs wisely!':theme==='desert'&&level===0?'Clear each rooftop · Water jars spill!':level===0?'Knock every piece and bird below the roof!':level===14&&theme==='snow'?'Swinging bomb optional · Clear every rooftop!':`Clear every rooftop · Level ${number}`;
  $('ammo-count').textContent=left;$('ammo-dots').innerHTML=Array.from({length:ammo},(_,i)=>`<div class="ammo-dot ${i>=left?'used':''}"></div>`).join('');$('target-count').textContent=`${remaining} left`;
}
function finish(success){if(finished)return;finished=true;won=success;if(success){unlocked=Math.max(unlocked,Math.min(TOTAL_LEVELS,level+2));try{localStorage.setItem(progressKey(),String(unlocked));}catch{}}$('result-emoji').textContent=success?(theme==='jungle'?'🌿':theme==='desert'?'☀️':'🏔️'):'🪨';$('result-kicker').textContent=success?'ROOFTOPS CLEARED':'NOT QUITE THIS TIME';$('result-title').textContent=success?'Kya baat hai!':'Arre, try again!';$('result-text').textContent=success?(theme==='jungle'?'Every piece, bird and frog fell below its base.':'Every piece and bird fell below its base.'):(theme==='jungle'?'Some pieces, birds or frogs are still above their base. Try again!':'Some pieces or birds are still above their starting base. Try again!');$('result-button').innerHTML=success?(level<TOTAL_LEVELS-1?'Next level <span>→</span>':theme==='snow'?'Next: Desert 31 <span>→</span>':theme==='desert'?'Next: Jungle 61 <span>→</span>':'Back to level 61 <span>→</span>'):'Try again <span>↻</span>';$('result-retry').style.display=success?'block':'none';$('result-modal').classList.remove('hidden');sound(success?650:220,.3,'triangle');}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function setAim(p){let dx=Math.max(0,sling.x-p.x),dy=sling.y-p.y;dy=Math.min(30,Math.max(-130,dy));let len=Math.hypot(dx,dy);if(len>130){dx*=130/len;dy*=130/len;}aim={x:dx,y:dy};}
function pulled(){return{x:sling.x-aim.x*.425,y:sling.y-aim.y*.425};}
canvas.addEventListener('pointerdown',e=>{if(finished||currentStone||shots>=ammo||!$('levels-modal').classList.contains('hidden'))return;const p=point(e);if(Math.hypot(p.x-sling.x,p.y-sling.y)<140){dragging=true;canvas.setPointerCapture(e.pointerId);setAim(p);$('hint').classList.add('hidden');}});
canvas.addEventListener('pointermove',e=>{if(dragging)setAim(point(e));});
function release(){if(!dragging)return;const p=pulled();dragging=false;if(Math.hypot(aim.x,aim.y)<15||aim.x<5){aim={x:110,y:20};return;}const body=Bodies.circle(p.x,p.y,22,{density:.0048,restitution:.12,friction:.5,frictionAir:.001,label:'projectile',collisionFilter:{category:0x0004,mask:0xFFFF & ~0x0002}});body.kind='projectile';const launchVelocity={x:aim.x*SHOT_SCALE,y:aim.y*SHOT_SCALE};if(import.meta.env.DEV)body.launchVelocity=launchVelocity;Body.setVelocity(body,launchVelocity);stones.push(body);currentStone=body;Composite.add(engine.world,body);shots++;shotAt=simTime;updateUI();sound(270,.16,'triangle');}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>{dragging=false;aim={x:110,y:20};});
$('restart').onclick=init;$('dismiss-hint').onclick=()=>$('hint').classList.add('hidden');$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♪':'♫';$('sound').style.opacity=muted?.55:1;$('sound').setAttribute('aria-label',muted?'Turn sound effects on':'Mute sound effects');if(!muted)sound();};$('result-retry').onclick=init;$('result-button').onclick=()=>{if(won){if(level===TOTAL_LEVELS-1&&theme!=='jungle'){themeLevels[theme]=level;theme=theme==='snow'?'desert':'jungle';try{localStorage.setItem('mango-tope-theme',theme);}catch{}unlocked=readUnlocked();level=0;}else level=(level+1)%TOTAL_LEVELS;}init();};
function showLevels(){$('levels-description').textContent=theme==='jungle'?'Jungle Canopy · Levels 61–90':theme==='desert'?'Desert Village · Levels 31–60':'Snowy Village · Levels 1–30';const grid=$('levels-grid');grid.innerHTML='';for(let i=0;i<TOTAL_LEVELS;i++){const b=document.createElement('button');b.className=`level-tile ${i<unlocked?'unlocked':''} ${i===level?'current':''}`;b.textContent=String(displayLevel(i));b.disabled=i>=unlocked;b.setAttribute('aria-label',`Level ${displayLevel(i)}${i>=unlocked?', locked':''}`);b.onclick=()=>{level=i;init();};grid.appendChild(b);}$('levels-modal').classList.remove('hidden');}
function closeThemeMenu(){
  $('theme-menu').classList.add('hidden');
  $('theme-switch').setAttribute('aria-expanded','false');
}
$('theme-switch').onclick=()=>{
  const opening=$('theme-menu').classList.contains('hidden');
  $('theme-menu').classList.toggle('hidden',!opening);
  $('theme-switch').setAttribute('aria-expanded',String(opening));
};
$('theme-menu').addEventListener('click',event=>{
  const button=event.target.closest('button[data-theme]');if(!button)return;
  const selected=button.dataset.theme;
  closeThemeMenu();
  if(selected===theme)return;
  themeLevels[theme]=level;theme=selected;
  try{localStorage.setItem('mango-tope-theme',theme);}catch{}
  unlocked=readUnlocked();level=Math.min(themeLevels[theme],unlocked-1);init();
});
document.addEventListener('pointerdown',event=>{
  if(!$('theme-menu').contains(event.target)&&!$('theme-switch').contains(event.target))closeThemeMenu();
});
$('levels').onclick=showLevels;$('close-levels').onclick=()=>$('levels-modal').classList.add('hidden');addEventListener('keydown',e=>{if(e.key==='Escape'){$('levels-modal').classList.add('hidden');closeThemeMenu();}});
function line(x1,y1,x2,y2,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function sprite(name,x,y,w,h){const img=images[name];if(img.complete&&img.naturalWidth){ctx.drawImage(img,x-w/2,y-h/2,w,h);return;}ctx.fillStyle=name==='ice'?'#a9c4e8':name==='wood'?'#8d6670':'#f2c476';ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,Math.min(8,w/4,h/4));ctx.fill();}
function drawPlatform(p){ctx.save();ctx.translate(p.roof.body.position.x,p.roof.body.position.y);ctx.rotate(p.roof.body.angle);ctx.translate(0,-9);if(theme==='jungle'){
  // Clip the original mossy rock art to a floating, flat-topped stone island.
  const shape=p.roof.variant%3;ctx.beginPath();ctx.moveTo(-p.w/2,-4);ctx.lineTo(p.w/2,-4);ctx.lineTo(p.w/2-8,shape===1?34:26);ctx.lineTo(p.w*(shape===2?.12:.26),shape===1?57:47);ctx.lineTo(-p.w*(shape===2?.31:.18),shape===2?43:52);ctx.lineTo(-p.w*.42,shape===1?24:29);ctx.closePath();ctx.clip();
  const img=images['jungle-slab'];if(img.complete&&img.naturalWidth)ctx.drawImage(img,-p.w/2,-12,p.w,75);else{ctx.fillStyle='#57685b';ctx.fillRect(-p.w/2,0,p.w,60);}
  ctx.fillStyle='#58883c';ctx.fillRect(-p.w/2,-4,p.w,6);ctx.restore();return;
}if(theme==='desert'){
  // Decorative sandstone ledge beneath the fixed collision slab; the top edge remains the clearance line.
  ctx.fillStyle='#9a5d3b';ctx.beginPath();ctx.moveTo(-p.w/2,0);ctx.lineTo(p.w/2,0);ctx.lineTo(p.w/2-10,24);ctx.lineTo(p.w*.27,42);ctx.lineTo(-p.w*.12,50);ctx.lineTo(-p.w*.38,33);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c38656';ctx.beginPath();ctx.moveTo(-p.w/2,0);ctx.lineTo(p.w/2,0);ctx.lineTo(p.w/2-10,19);ctx.lineTo(-p.w/2+7,19);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e7b477';ctx.beginPath();ctx.roundRect(-p.w/2,-4,p.w,9,3);ctx.fill();
  ctx.strokeStyle='#805037';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.w*.25,20);ctx.lineTo(-p.w*.14,33);ctx.lineTo(-p.w*.05,31);ctx.moveTo(p.w*.16,19);ctx.lineTo(p.w*.24,29);ctx.stroke();ctx.restore();return;}ctx.fillStyle='#51445d';ctx.beginPath();ctx.moveTo(-p.w/2,0);ctx.lineTo(p.w/2,0);ctx.lineTo(p.w/2-8,16);ctx.lineTo(-p.w/2+8,16);ctx.closePath();ctx.fill();ctx.fillStyle='#d7e7ff';ctx.beginPath();ctx.moveTo(-p.w/2,-2);ctx.quadraticCurveTo(-p.w*.2,-11,0,-4);ctx.quadraticCurveTo(p.w*.25,-9,p.w/2,-3);ctx.lineTo(p.w/2,3);ctx.lineTo(-p.w/2,3);ctx.fill();for(let i=0;i<Math.max(3,Math.floor(p.w/55));i++){let n=Math.max(3,Math.floor(p.w/55)),x=(i/(n-1)-.5)*p.w*.85;ctx.fillStyle='#f8d993';ctx.shadowColor='#ffc65d';ctx.shadowBlur=13;ctx.beginPath();ctx.arc(x,10,3.5,0,Math.PI*2);ctx.fill();}ctx.restore();}
function drawBlock(b){ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
  if(theme==='desert'){ctx.shadowColor='#633b2b88';ctx.shadowBlur=5;ctx.shadowOffsetY=2;}
  if(b.h>b.w*1.4 && ['ice','wood','stone','bamboo','desert-bone','desert-branch','desert-wall'].includes(b.style)){ctx.rotate(Math.PI/2);sprite(b.style,0,0,b.h,b.w);ctx.rotate(-Math.PI/2);}else sprite(b.style,0,0,b.w,b.h);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  if(b.waterJar&&b.spilled){ctx.strokeStyle='#6e4434';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-b.h*.2);ctx.lineTo(1,0);ctx.lineTo(-2,b.h*.18);ctx.stroke();}
  if(b.decoration){
    const d=b.decoration;
    if(d==='lantern'){ctx.shadowColor='#ffd57e';ctx.shadowBlur=12;sprite(d,b.w*.32,b.h/2+20,24,42);}
    else if(d==='icicles')sprite(d,0,b.h/2+10,Math.min(80,b.w*.6),25);
    else if(d==='sign')sprite(d,b.w*.35,-b.h/2-18,34,34);
    else if(d==='ladder')sprite(d,-b.w*.32,b.h/2+30,22,55);
    else if(d==='icearch')sprite(d,0,-b.h/2-17,34,34);
    else sprite(d,b.w*.35,b.h/2+31,38,60);
  }
  ctx.restore();}
function drawHangers(){for(const h of hangers){
  const a=h.beam.angle,c=Math.cos(a),s=Math.sin(a);
  const x=h.beam.position.x+h.attach.x*c-h.attach.y*s,y=h.beam.position.y+h.attach.x*s+h.attach.y*c;
  const edgeOffset=Math.sign(h.attach.x)*h.beam.w*.42;
  const edgeX=h.beam.position.x+edgeOffset*c,edgeY=h.beam.position.y+edgeOffset*s;
  line(edgeX,edgeY,x,y,'#624c56',7);line(edgeX,edgeY,x,y,'#c09c72',3);
  if(h.type==='swing'){
    for(const d of [-11,11]){const bx=h.bucket.position.x+d*Math.cos(h.bucket.angle),by=h.bucket.position.y+d*Math.sin(h.bucket.angle)-4;line(x+d*c,y+d*s,bx,by,'#463c52',4);line(x+d*c,y+d*s,bx,by,'#e1c590',2);}
  }else {line(x,y,h.bucket.position.x,h.bucket.position.y-h.bucket.h/2,'#463c52',5);line(x,y,h.bucket.position.x,h.bucket.position.y-h.bucket.h/2,'#e1c590',2);}
}}

function drawTarget(t){ctx.save();ctx.translate(t.position.x,t.position.y);ctx.rotate(t.angle);if(theme==='desert'){ctx.shadowColor='#633b2b88';ctx.shadowBlur=5;ctx.shadowOffsetY=2;}sprite(t.sprite||'bird',0,0,t.drawSize||54,t.drawSize||54);ctx.restore();}
function drawStone(body){ctx.save();ctx.translate(body.position.x,body.position.y);ctx.rotate(body.angle);sprite(theme==='jungle'?'jungle-mango':'pebble',0,0,50,44);ctx.restore();}
function drawBomb(b){ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);if(b.dead){ctx.filter='grayscale(100%) brightness(70%)';}sprite('bomb',0,-3,54,60);ctx.restore();}
function drawSling(){
  const px=sling.x,py=sling.y;
  // The silver-blue carved fork is original vector artwork; bands track the pull.
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=theme!=='snow'?'#73482e':'#435275';ctx.lineWidth=23;ctx.beginPath();ctx.moveTo(px,py+59);ctx.quadraticCurveTo(px-3,py+35,px,py+19);ctx.lineTo(px-22,py-9);ctx.lineTo(px-25,py-23);ctx.moveTo(px,py+19);ctx.lineTo(px+21,py-9);ctx.lineTo(px+25,py-23);ctx.stroke();
  ctx.strokeStyle=theme!=='snow'?'#c48a50':'#adbedc';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(px,py+59);ctx.quadraticCurveTo(px-3,py+35,px,py+19);ctx.lineTo(px-22,py-9);ctx.lineTo(px-25,py-23);ctx.moveTo(px,py+19);ctx.lineTo(px+21,py-9);ctx.lineTo(px+25,py-23);ctx.stroke();
  ctx.fillStyle=theme!=='snow'?'#a76f41':'#7184aa';ctx.beginPath();ctx.ellipse(px,py+62,26,8,0,0,Math.PI*2);ctx.fill();const p=dragging?pulled():sling;line(px-25,py-23,p.x,p.y,'#63495d',7);line(px+25,py-23,p.x,p.y,'#63495d',7);
  if(!currentStone&&!finished&&shots<ammo)sprite(theme==='jungle'?'jungle-mango':'pebble',p.x,p.y,50,44);ctx.restore();
}
function drawTrajectory(){
  if(!dragging||Math.hypot(aim.x,aim.y)<15)return;
  const p=pulled(),vx=aim.x*SHOT_SCALE,vy=aim.y*SHOT_SCALE;
  for(let i=1;i<27;i++){
    const t=i*4,x=p.x+vx*t,y=p.y+vy*t+.139*t*t;if(y>1000||x>W)break;
    const desert=theme!=='snow';
    ctx.fillStyle=desert?`rgba(91,111,126,${.98-i*.01})`:`rgba(255,245,220,${.92-i*.025})`;
    ctx.beginPath();ctx.arc(x,y,Math.max(desert?3:2,5-i*.12),0,Math.PI*2);ctx.fill();
  }
}
function drawEffects(){for(const e of effects){ctx.save();ctx.globalAlpha=Math.min(1,e.life/18);if(e.kind==='explosion'){
  const progress=(40-e.life)/40,r=20+progress*190;
  const glow=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,r);glow.addColorStop(0,'#fff5bcdd');glow.addColorStop(.28,'#ffbd4fbb');glow.addColorStop(.62,'#f2763888');glow.addColorStop(1,'#504e6900');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff1b8';ctx.lineWidth=8*(1-progress)+2;ctx.beginPath();ctx.arc(e.x,e.y,r*.8,0,Math.PI*2);ctx.stroke();
}else if(e.kind==='blast'){const r=(36-e.life)*4;ctx.strokeStyle='#ffe8ad';ctx.lineWidth=8;ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffb44c66';ctx.beginPath();ctx.arc(e.x,e.y,r*.6,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill();}ctx.restore();}}
function drawCeilingBombs(){for(const b of bombs){if(!b.hanging)continue;line(b.anchor.x,b.anchor.y,b.position.x,b.position.y-16,'#4c4356',7);line(b.anchor.x,b.anchor.y,b.position.x,b.position.y-16,'#d1b894',3);}}
function render(){ctx.clearRect(0,0,W,H);drawCeilingBombs();for(const p of platforms)drawPlatform(p);drawTrajectory();drawSling();drawHangers();for(const b of blocks)drawBlock(b);for(const b of bombs)drawBomb(b);for(const t of targets)drawTarget(t);for(const b of stones)drawStone(b);drawEffects();}
function step(){
  // A gentle, energy-limited drive compensates for solver damping, keeping the
  // pendulum moving indefinitely without prescribing its position or trajectory.
  for(const b of bombs)if(b.hanging&&b.swinging){
    const dx=b.position.x-b.anchor.x,dy=b.position.y-b.anchor.y,len=Math.hypot(dx,dy);
    const tx=dy/len,ty=-dx/len,speed=b.velocity.x*tx+b.velocity.y*ty;
    const energy=speed*speed/2+.27778*(150-dy);
    if(energy<4.1)Body.applyForce(b,b.position,{x:b.mass*speed*tx*.000007,y:b.mass*speed*ty*.000007});
  }
  const previous=stones.map(stone=>[stone,{...stone.position}]);
  Engine.update(engine,1000/60);simTime+=1000/60;
  checkRopeHits(previous);
  for(const b of bombs){
    if(b.cutThisStep){Body.setVelocity(b,{x:0,y:0});b.releaseY=b.position.y;b.cutThisStep=false;}
    // Apply the blast after Matter's collision solver, so it does not erase the impulse.
    if(b.pendingDetonation){const hit=b.pendingDetonation;b.pendingDetonation=null;detonate(b,hit);}
    // Once the triggering stone is clear, future stones can strike the casing too.
    if(!b.hanging&&b.releaseAt!=null&&simTime-b.releaseAt>500)b.collisionFilter.mask |= 0x0004;
  }
  
  for(const b of blocks){if(b.pendingSpill)spillWater(b);if(b.wetUntil&&simTime>=b.wetUntil){b.friction=b.dryFriction;b.dryFriction=null;b.wetUntil=0;}}
  for(const e of effects){if(e.kind==='spark'){e.x+=e.vx;e.y+=e.vy;e.vy+=.12;}e.life--;}effects=effects.filter(e=>e.life>0);
  for(const b of bombs)if(b.armed&&!b.dead&&b.position.y>b.releaseY+35&&simTime-b.releaseAt>500&&(b.position.y>=b.baseY-40||simTime-b.releaseAt>1600))detonate(b);
  const remaining=remainingPieces().length;
  if(remaining!==lastRemaining)updateUI();
  if(shots&&remaining===0){if(winAt===null)winAt=simTime;if(simTime-winAt>1000)finish(true);}
  else winAt=null;
  if(currentStone&&simTime-shotAt>1500&&((Vector.magnitude(currentStone.velocity)<1.1&&simTime-shotAt>2500)||simTime-shotAt>6000||currentStone.position.x>1700||currentStone.position.y>1100))currentStone=null;
  if(!currentStone&&shots>=ammo){if(failAt===null)failAt=simTime;if(remaining>0&&simTime-failAt>3000)finish(false);}else failAt=null;
}
function tick(time){if(!lastTime)lastTime=time;accumulator+=Math.min(time-lastTime,100);lastTime=time;const paused=testControlled||finished||!$('levels-modal').classList.contains('hidden');while(accumulator>=1000/60){if(!paused&&!finished)step();accumulator-=1000/60;}render();requestAnimationFrame(tick);}
if(import.meta.env.DEV)window.__mangoTest={controlled(value){testControlled=!!value;},loadLevel(n){const local=n-themeOffset();if(local<1||local>TOTAL_LEVELS)throw new RangeError('Invalid level');level=local-1;init();},advance(steps){for(let i=0;i<steps&&!finished;i++)step();},
  // Isolated threshold fixture for browser tests; production builds do not expose this.
  testParkAllBut(index,leaveBombs=false){blocks.forEach((b,i)=>{if(i===index)return;Body.setStatic(b,true);Body.setAngle(b,0);Body.setPosition(b,{x:-3000-i*100,y:b.baseY+300});});targets.forEach((t,i)=>{Body.setStatic(t,true);Body.setPosition(t,{x:-9000-i*100,y:t.baseY+300});});if(!leaveBombs)bombs.forEach((b,i)=>{Body.setStatic(b,true);Body.setPosition(b,{x:-12000-i*100,y:b.baseY+300});});},
  // Test only: drop a counted piece onto the otherwise unreachable launcher ledge.
  testLauncherLanding(){
    this.testParkAllBut(0,true);const body=blocks[0],roof=roofOffsets[0];
    Body.setPosition(body,{x:roof.body.position.x,y:roof.baseY-80});Body.setVelocity(body,{x:0,y:0});
  },
  // Reachability fixture: isolate a target resting low on a chosen fixed roof.
  testRoofTarget(index,offset=0){
    this.testParkAllBut(-1);
    const roof=roofOffsets[index+1],target=targets[0];
    if(!roof||!target)throw new RangeError('Invalid roof');
    target.baseY=roof.baseY;Body.setStatic(target,false);Body.setPosition(target,{x:roof.body.position.x+offset,y:roof.baseY-.47*S});Body.setVelocity(target,{x:0,y:0});
  },
  testPieceTop(index,offset){const b=blocks[index];Body.setStatic(b,true);Body.setAngle(b,0);Body.setPosition(b,{x:-1500-index*100,y:b.baseY+offset+b.h/2});},
  testBirdTop(index,offset){const b=targets[index];Body.setStatic(b,true);Body.setPosition(b,{x:-2000-index*100,y:b.baseY+offset+.47*S});},
  testBombTop(index,offset){const b=bombs[index];Body.setStatic(b,true);Body.setPosition(b,{x:-13000-index*100,y:b.baseY+offset+18});},
  state(){return{theme,level:displayLevel(),localLevel:level+1,shots,ammo,shotScale:SHOT_SCALE,impactStrength:IMPACT_STRENGTH,impactFactor:theme==='desert'?DESERT_IMPACT_FACTOR:1,bombIntensity:BOMB_INTENSITY,remaining:remainingPieces().length,cascadeCollisions,effectKinds:effects.map(e=>e.kind),lastProjectile:stones.length?{firstImpact:stones.at(-1).firstImpact,firstImpactBaseY:stones.at(-1).firstImpactBaseY}:null,remainingPositions:remainingPieces().map(b=>({x:(b.position.x-800)/S,y:(ORIGIN_Y-b.position.y)/S,kind:b.kind,baseY:b.baseY,topY:b.bounds.min.y})),ball:currentStone?{x:(currentStone.position.x-800)/S,y:(ORIGIN_Y-currentStone.position.y)/S,vx:currentStone.velocity.x,vy:currentStone.velocity.y,launchVelocity:currentStone.launchVelocity}:null,projectileSprite:theme==='jungle'?'jungle-mango':'pebble',targetSprite:theme==='jungle'?'jungle-frog':'bird',baseCount:roofOffsets.length-1,roofPositions:roofOffsets.slice(1).map(r=>({x:r.x,width:r.width,height:r.delta+r.top,bodyX:r.body.position.x,y:r.body.position.y,angle:r.body.angle,static:r.body.isStatic,bounds:r.body.bounds})),wetBlocks:blocks.filter(b=>b.wetUntil>simTime).length,waterJars:blocks.filter(b=>b.waterJar).map(b=>({x:b.position.x,y:b.position.y,spilled:b.spilled,cleared:b.bounds.min.y>=b.baseY+1})),targets:targets.map(t=>({sprite:t.sprite,x:(t.position.x-800)/S,y:(ORIGIN_Y-t.position.y)/S,baseY:t.baseY,topY:t.bounds.min.y,cleared:t.bounds.min.y>=t.baseY+1})),blocks:blocks.length,blockPositions:blocks.map(b=>({x:(b.position.x-800)/S,y:(ORIGIN_Y-b.position.y)/S,angle:b.angle,parts:b.parts.length,width:b.w,height:b.h,isRamp:!!b.isRamp,baseY:b.baseY,topY:b.bounds.min.y,cleared:b.bounds.min.y>=b.baseY+1})),layoutName,assets:Object.keys(images),styles:blocks.map(b=>b.style),decorations:blocks.map(b=>b.decoration).filter(Boolean),hangers:hangers.length,hangerPositions:hangers.map(h=>({type:h.type,x:h.bucket.position.x,y:h.bucket.position.y,beamX:h.beam.position.x,beamY:h.beam.position.y})),bombs:bombs.map(b=>({dead:b.dead,hanging:b.hanging,swinging:b.swinging,armed:b.armed,releaseReason:b.releaseReason,detonationTarget:b.detonationTarget,releaseX:b.releaseX,releaseVelocity:b.releaseVelocity,releaseY:b.releaseY,x:b.position.x,y:b.position.y,vx:b.velocity.x,vy:b.velocity.y,anchor:b.anchor,baseY:b.baseY,topY:b.bounds.min.y,cleared:b.bounds.min.y>=b.baseY+1})),sling,launcher:'slingshot',finished,won};}};
init();requestAnimationFrame(tick);
