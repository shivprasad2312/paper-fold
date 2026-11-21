import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFloorRectangles, emptyFloorProblems } from '../../scripts/empty-floor-audit.mjs';
import { LEVELS, VAULT_LEVELS } from '../../src/levels.js';

const board = (map) => ({id:0,name:'audit fixture',map,start:[0,0],goal:[0,map.length-1]});
test('empty-floor audit catches broad flat floor, not narrow corridors',()=>{
  assert.ok(emptyFloorRectangles(board(Array(8).fill('111111111111'))).length);
  assert.equal(emptyFloorRectangles(board(Array(2).fill('111111111111'))).length,0);
});
test('empty-floor audit does not merge different heights into a blank terrace',()=>{
  assert.equal(emptyFloorRectangles(board(Array(8).fill('112233445566'))).length,0);
});
test('L94 no longer contains a large unbroken empty rectangle',()=>{
  assert.equal(emptyFloorRectangles(LEVELS.find(d=>d.id===94)).length,0);
});
test('curated large terraces stay below their original blank-area sizes',()=>{
  const before={55:85,61:180,68:190,84:209,94:119,129:184,137:260,148:228,162:152,166:176,171:184,182:286,185:200,186:198,189:161,195:154,198:240};
  for(const [id,area] of Object.entries(before)) {
    const largest=emptyFloorRectangles(LEVELS.find(d=>d.id===Number(id)))[0]?.area||0;
    assert.ok(largest<area/2,`L${id}: ${largest} is not less than half of ${area}`);
  }
});
test('no shipped campaign or Vault board has a 96-tile blank terrace',()=>{
  for(const def of [...LEVELS,...VAULT_LEVELS]) assert.deepEqual(emptyFloorProblems(def),[],`L${def.id}`);
});
test('empty-floor ceiling rejects giant plazas but allows safe landing rooms',()=>{
  assert.ok(emptyFloorProblems(board(Array(10).fill('111111111111'))).length);
  assert.deepEqual(emptyFloorProblems(board(Array(5).fill('11111'))),[]);
});
test('height-zero floor is not mistaken for void',()=>{
  assert.ok(emptyFloorProblems(board(Array(10).fill('000000000000'))).length);
});
test('vertical and horizontal terraces are both audited',()=>{
  assert.ok(emptyFloorProblems(board(Array(14).fill('11111111'))).length);
  assert.ok(emptyFloorProblems(board(Array(8).fill('11111111111111'))).length);
});
