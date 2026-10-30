// Test the actual Matter contact solver, not just the body friction settings.
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import '../src/roof-friction.js';
const {Engine,Bodies,Body,Composite}=Matter;
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,`${message}: ${a} vs ${b}`);
function scene(marked,kind='block',friction=.3){
  const engine=Engine.create();
  const roof=Bodies.rectangle(0,100,2000,20,{isStatic:true,friction:.8,label:'platform'});
  roof.jungleRoof=marked;
  const body=Bodies.rectangle(0,80,20,20,{friction,frictionAir:0,label:kind});body.kind=kind;
  Composite.add(engine.world,[roof,body]);
  for(let i=0;i<3;i++)Engine.update(engine,1000/60);
  return {engine,roof,body};
}
const pairFor=(engine,a,b)=>engine.pairs.list.find(p=>p.isActive&&((p.bodyA===a&&p.bodyB===b)||(p.bodyA===b&&p.bodyB===a)));
for(const friction of [.3,.55]){
  const {engine,roof,body}=scene(true,'block',friction);
  const roofFriction=roof.friction;
  for(let i=0;i<10;i++){
    Engine.update(engine,1000/60);
    const p=pairFor(engine,roof,body);assert.ok(p,'block is in contact with the fixed roof');
    close(p.friction,friction*.7,'roof/block friction is reduced exactly 30%, on every step');
    close(body.friction,friction,'block body friction is unchanged');
    close(roof.friction,roofFriction,'fixed roof body friction is unchanged');
  }
}
for(const kind of ['target','bomb']){
  const {engine,roof,body}=scene(true,kind,.65);Engine.update(engine,1000/60);
  close(pairFor(engine,roof,body).friction,.65,`${kind} contacts are unchanged`);
}
{
  const {engine,roof,body}=scene(false,'block',.3);Engine.update(engine,1000/60);
  close(pairFor(engine,roof,body).friction,.3,'other themes are unchanged');
}
{
  const {engine,body}=scene(true);
  const above=Bodies.rectangle(0,60,20,20,{friction:.55,label:'block'});above.kind='block';Composite.add(engine.world,above);
  for(let i=0;i<5;i++)Engine.update(engine,1000/60);
  const pair=pairFor(engine,body,above);assert.ok(pair,'blocks touch');
  close(pair.friction,.3,'block-on-block friction is unchanged');
}
function slide(marked){
  const {engine,body}=scene(marked);Body.setVelocity(body,{x:4,y:0});
  const start=body.position.x;for(let i=0;i<50;i++)Engine.update(engine,1000/60);
  return body.position.x-start;
}
const normal=slide(false),reduced=slide(true);
assert.ok(reduced>normal+1,`reduced friction should let a block slide farther (${reduced} vs ${normal})`);
console.log(`Roof friction passed: 30% lower only on jungle block/base contacts; slide ${reduced.toFixed(1)} vs ${normal.toFixed(1)} pixels.`);
