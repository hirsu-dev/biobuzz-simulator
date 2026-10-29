import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HIVE,CELL_PROFILE,hivePivot,hiveWorld,hiveLocal,inCellProfile} from '../frontend/src/hive-geometry.js';
import {cellContains} from '../frontend/src/dsim-hive.js';

test('hives face the driver stations with DSIM measured raised opening heights',()=>{
 for(const [alliance,side] of [[0,-1],[1,1]]){
  const pivot=hivePivot(alliance),angle=side*HIVE.rest;
  assert.equal(Math.sign(pivot.x),side);
  const mouth=CELL_PROFILE.map(([x,y])=>hiveWorld(pivot,angle,x,y,-side*HIVE.far));
  const heights=mouth.map(p=>p.y/.0254);
  assert.ok(Math.abs(Math.min(...heights)-53.375)<.01);
  assert.ok(Math.abs(Math.max(...heights)-65.497)<.01);
  assert.ok(mouth.every(p=>Math.sign(p.z)===-side));
  assert.ok(Math.abs((HIVE.far-HIVE.near)/.0254-11.75)<1e-9);
 }
});

test('membership follows the tilted cell and excludes the opening rim and roof corners',()=>{
 const pivot=hivePivot(0);
 for(const angle of [-HIVE.rest,-.1,0,.1,HIVE.rest])for(const side of [-1,1]){
  const p=hiveWorld(pivot,angle,0,.08,-side*HIVE.arm);
  const local=hiveLocal(p,pivot,angle);
  assert.ok(Math.abs(local.y-.08)<1e-9);
  assert.equal(cellContains(p,pivot,angle,side),true);
  assert.equal(cellContains(hiveWorld(pivot,angle,0,.08,-side*(HIVE.far+.03)),pivot,angle,side),false);
  assert.equal(cellContains(hiveWorld(pivot,angle,0,HIVE.top-.01,-side*HIVE.arm),pivot,angle,side),false);
 }
 assert.equal(inCellProfile(.22,.28),false);
 assert.equal(inCellProfile(0,.28),true);
});
