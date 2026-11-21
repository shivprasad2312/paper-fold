// Surgical offline curation. Static definitions remain the shipping source.
import { readFileSync, writeFileSync } from 'node:fs';
import { CAMPAIGN2 } from '../src/campaign2.js';
import { LEVELS } from '../src/levels.js';
import { parseLevel, mechanicTiles, shortestPath, shortestRoute, key } from '../src/rules.js';
import { emptyFloorRectangles } from './empty-floor-audit.mjs';
import { verify } from './level-gate.mjs';

const wanted = new Set((process.env.KUBIK_LEVELS || '94').split(',').map(Number));
const defs = structuredClone([...CAMPAIGN2.filter(d=>![192,196].includes(d.id)), ...LEVELS.filter(d=>[192,196].includes(d.id))]);
for (const def of defs.filter(d => wanted.has(d.id))) {
  const original = structuredClone(def), level = parseLevel(def), par = shortestRoute(level);
  const protectedTiles = mechanicTiles(level);
  // Preserve the existing shortest goal/key/shard walks and a one-tile safety
  // margin around moving furniture. Full proof below checks more than this spine.
  for (const t of [level.goal, level.gateKey, ...level.shards].filter(Boolean)) {
    for (const p of shortestPath(level, level.start, t) || []) protectedTiles.add(key(p.x,p.z));
    protectedTiles.add(key(t.x,t.z));
  }
  protectedTiles.add(key(level.start.x,level.start.z));
  for (const k of mechanicTiles(level)) {
    const [x,z] = k.split(',').map(Number);
    for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) protectedTiles.add(key(x+dx,z+dz));
  }
  const map = def.map.map(r=>[...r]);
  // Interrupted slots leave cross-aisles and landing pads, but break broad
  // rectangles into legible fingers. Never change heights or mechanic data.
  let removed = 0;
  for (let z=1;z<map.length-1;z++) for(let x=1;x<map[z].length-1;x++) {
    if (x%4!==1 || z%5===0 || protectedTiles.has(key(x,z))) continue;
    const h=map[z][x];
    if (!(h>='1'&&h<='9')) continue;
    if ([[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>original.map[z+dz]?.[x+dx]===h)) {
      map[z][x]='.'; removed++;
    }
  }
  def.map=map.map(r=>r.join(''));
  const result=verify(def,{par:[par,par]},0);
  if(!result.ok) { console.log(`REJECT L${def.id}: ${result.problems.join('; ')}`); Object.assign(def,original); }
  else console.log(`L${def.id}: removed ${removed}, largest blank ${emptyFloorRectangles(original)[0]?.area||0} → ${emptyFloorRectangles(def)[0]?.area||0}, par ${par}`);
}
const path='src/campaign2.js';
const source=readFileSync(path,'utf8');
const generated = CAMPAIGN2.map(original=>defs.find(d=>d.id===original.id && ![192,196].includes(d.id)) || original);
writeFileSync(path,source.slice(0,source.indexOf('export const CAMPAIGN2 = '))+'export const CAMPAIGN2 = '+JSON.stringify(generated,null,2)+';\n');
let handSource = readFileSync('src/levels.js','utf8');
for (const def of defs.filter(d=>[192,196].includes(d.id) && wanted.has(d.id))) {
  const section = handSource.indexOf(`    id: ${def.id},`);
  const start = handSource.indexOf('    map: [',section);
  const end = handSource.indexOf('    ],',start)+6;
  handSource=handSource.slice(0,start)+'    map: [\n'+def.map.map(r=>`      '${r}',`).join('\n')+'\n    ],'+handSource.slice(end);
}
writeFileSync('src/levels.js',handSource);
