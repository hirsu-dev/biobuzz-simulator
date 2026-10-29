import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBrowserEngine} from '../frontend/src/browser-engine.js';
import {FLOWER,flowerScored} from '../frontend/src/flower-geometry.js';
import {LOADING_ZONES,GARDENS,ballInZone,robotInZone} from '../frontend/src/field-rules.js';
const presets=JSON.parse(await readFile(new URL('../frontend/data/robots.json',import.meta.url),'utf8'));
const run=(e,s)=>{for(let i=0;i<Math.round(s*120);i++)e.step();};
const create=async()=>{const e=await createBrowserEngine(presets,{autoStart:false});e.ai=false;return e;};
const input=(e,values)=>e.send({type:'arena',action:'input',...values});
const empty=(e,list)=>{for(const [i,p] of list.splice(0).entries())e.release(p,.7+i*.08,.04,1.4,{x:0,y:0,z:0});};
function align(e,f,index=0){const b=e.bots[index],d=b.config.length/2+.13,a=Math.atan2(f.nz,-f.nx);b.body.setTranslation({x:f.x+f.nx*d,y:.115,z:f.z+f.nz*d},true);b.body.setRotation({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)},true);b.body.setLinvel({x:0,y:0,z:0},true);b.body.setAngvel({x:0,y:0,z:0},true);}
const total=e=>e.pieces.filter(p=>p.active).length+e.bots.reduce((n,b)=>n+b.held.length,0)+e.reserve.reduce((n,r)=>n+r.length,0);

test('TU06 reset stages 40 pollen, 16 nectar, four pollen per flower and robot, and six hive nectar',async()=>{
 const e=await create();try{
  assert.equal(e.pieces.length,56);assert.equal(e.pieces.filter(p=>p.color===0).length,40);
  assert.deepEqual(e.flowers.map(f=>f.held.length),[4,4,4,4]);assert.ok(e.bots.every(b=>b.held.length===4&&b.held.every(p=>p.color===0)));
  assert.deepEqual(e.reserve.map(r=>r.length),[5,5]);e.match=true;run(e,.5);assert.deepEqual(e.hives.map(h=>h.held.length),[3,3]);assert.equal(total(e),56);
 }finally{e.dispose();}
});

test('normal intake retrieves all four bottom pollen and the physical stack falls into reach',async()=>{
 const e=await create();try{
  const b=e.bots[0],f=e.flowers[0];empty(e,b.held);align(e,f);input(e,{intake:true});run(e,2);
  assert.equal(b.held.length,4);assert.ok(b.held.every(p=>p.color===0));assert.equal(f.held.length,0);assert.equal(total(e),56);
  assert.ok(b.body.translation().y<.16,'retrieving must not climb the flower plates');
 }finally{e.dispose();}
});

test('flower intake requires the open side and free capacity',async()=>{
 const e=await create();try{
  const b=e.bots[0],f=e.flowers[0];align(e,f);input(e,{intake:true});run(e,.6);assert.equal(f.held.length,4);
  empty(e,b.held);b.body.setRotation({x:0,y:Math.sin(Math.PI/4),z:0,w:Math.cos(Math.PI/4)},true);run(e,.6);assert.equal(b.held.length,0);
  align(e,f);run(e,.4);assert.ok(b.held.length>0);
 }finally{e.dispose();}
});

test('Box Tube drops through the top; pollen can be placed early, nectar unlocks at 1:00',async()=>{
 const e=await create();try{
  e.send({type:'arena',action:'customize',slot:0,config:{lift:true}});const b=e.bots[0],f=e.flowers[0];align(e,f);e.match=true;e.elapsed=90;
  input(e,{place:true});run(e,.2);input(e,{});assert.equal(b.held.length,3);run(e,.6);assert.equal(f.held.length,5);assert.ok(f.held.every(p=>p.active));
  const nectar=e.reserve[0].pop(),old=b.held.shift();e.release(old,.9,.04,1.4,{x:0,y:0,z:0});b.held.unshift(nectar);
  input(e,{place:true});run(e,.2);assert.equal(b.held[0],nectar);assert.match(e.event,/1:00/);
  e.elapsed=98;run(e,.2);input(e,{});assert.ok(!b.held.includes(nectar));assert.equal(nectar.active,true);assert.ok(nectar.body.translation().y<FLOWER.top);run(e,.8);assert.ok(f.held.includes(nectar));assert.equal(total(e),56);
 }finally{e.dispose();}
});

test('nectar settles above the retrieval opening and cannot be intaken from a flower',async()=>{
 const e=await create();try{
  const b=e.bots[0],f=e.flowers[0];empty(e,b.held);empty(e,f.held);const nectar=e.reserve[0].pop();e.release(nectar,f.x,FLOWER.topBottom,f.z,{x:0,y:0,z:0});nectar.flower=0;
  run(e,1.5);assert.ok(nectar.body.translation().y>FLOWER.mid);align(e,f);input(e,{intake:true});run(e,1);assert.equal(b.held.length,0);assert.equal(f.held[0],nectar);assert.equal(total(e),56);
 }finally{e.dispose();}
});

test('top-entry shots use real flower collisions; side/bottom intrusions do not gain membership',async()=>{
 const e=await create();try{
  const f=e.flowers[0];empty(e,f.held);const p=e.pieces[16];e.release(p,f.x,FLOWER.top+.12,f.z,{x:0,y:-.5,z:0});run(e,.8);assert.ok(f.held.includes(p));assert.ok(p.body.translation().y<.1);
  const q=e.pieces[17];e.release(q,f.x,.04,f.z,{x:0,y:0,z:0});run(e,.2);assert.equal(q.flower,null);
  input(e,{place:true});run(e,.2);assert.equal(e.bots[0].held.length,4);
 }finally{e.dispose();}
});

test('early nectar entering a flower is a single 20-point G410 foul',async()=>{
 const e=await create();try{
  e.match=true;e.elapsed=80;const f=e.flowers[0],p=e.reserve[0].pop();p.lastAlliance=0;e.release(p,f.x,FLOWER.top+.12,f.z,{x:0,y:-.5,z:0});run(e,.8);assert.deepEqual(e.penalties,[0,20]);run(e,.5);assert.deepEqual(e.penalties,[0,20]);
 }finally{e.dispose();}
});

test('normal pickup refuses opponent nectar and preserves the four-piece limit',async()=>{
 const e=await create();try{
  const b=e.bots[0];empty(e,b.held);b.body.setTranslation({x:0,y:.115,z:1},true);b.body.setRotation({x:0,y:0,z:0,w:1},true);
  const p=e.reserve[1].pop();e.release(p,.3,.046,1,{x:0,y:0,z:0});input(e,{intake:true});run(e,.3);assert.equal(b.held.length,0);assert.ok(p.active);
 }finally{e.dispose();}
});

test('scoring excludes retrieval-only pollen and uses partial overlap for zones',()=>{
 const pollen=y=>({radius:.03556,body:{translation:()=>({y})}});
 assert.equal(flowerScored(pollen(.03556)),false);assert.equal(flowerScored(pollen(FLOWER.mid-.02)),true);
 assert.equal(flowerScored(pollen(FLOWER.top+.04)),false);
 assert.equal(ballInZone({x:GARDENS[0].x1+.02,z:1.8},.03556,GARDENS[0]),true);
 assert.equal(robotInZone({x:LOADING_ZONES[0].x1+.1,z:-.9},0,.4,.4,LOADING_ZONES[0]),true);
 assert.equal(robotInZone({x:0,z:0},0,.4,.4,LOADING_ZONES[0]),false);
});

test('topmost nectar owns every scoring piece; bottommost nectar earns its separate five points',async()=>{
 const e=await create();try{
  e.match=true;e.elapsed=100;const f=e.flowers[0];empty(e,f.held);run(e,.1);const baseline=e.score();
  for(let a=0;a<2;a++){const p=e.reserve[a].pop();e.release(p,f.x,FLOWER.topBottom,f.z,{x:0,y:0,z:0});p.flower=0;run(e,.7);}
  const score=e.score();assert.equal(score[0]-baseline[0],5);assert.equal(score[1]-baseline[1],4);
 }finally{e.dispose();}
});

test('match nectar supply unlocks one per completed tip, then the remainder at 1:00',async()=>{
 const e=await create();try{
  e.match=true;e.elapsed=50;run(e,.2);assert.deepEqual(e.reserve.map(r=>r.length),[5,5]);
  e.hives[0].tips=1;run(e,.1);assert.deepEqual(e.reserve.map(r=>r.length),[4,5]);
  e.elapsed=98;
  for(let n=0;n<6;n++){for(const p of e.pieces.filter(p=>p.active&&p.color&&p.body.translation().y<.1))p.body.setTranslation({x:.8+n*.1,y:.046,z:1.35},true);run(e,1.1);}
  assert.deepEqual(e.reserve.map(r=>r.length),[0,0]);assert.equal(total(e),56);
 }finally{e.dispose();}
});
