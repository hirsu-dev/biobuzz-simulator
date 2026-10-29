import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBrowserEngine} from '../frontend/src/browser-engine.js';
import {hiveWillTip} from '../frontend/src/dsim-hive.js';
import {HIVE,hiveWorld,hiveLocal} from '../frontend/src/hive-geometry.js';
import {FLOWER,flowerScored} from '../frontend/src/flower-geometry.js';
import {configureRobot} from '../frontend/src/robot-config.js';
const presets=JSON.parse(await readFile(new URL('../frontend/data/robots.json',import.meta.url),'utf8'));
const run=(e,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)e.step();};
const input=(e,values)=>e.send({type:'arena',action:'input',...values});
const create=async()=>{const e=await createBrowserEngine(presets,{autoStart:false});e.ai=false;return e;};

test('all fifteen designs have four finite 3D bodies and a conserved piece inventory',async()=>{
 const e=await create();try{assert.equal(presets.length,15);for(let p=0;p<presets.length;p++){e.send({type:'arena',action:'preset',slot:0,preset:p});run(e,.4);const a=e.snapshot().arena;assert.equal(a.bots.length,4);assert.equal(a.bots[0].preset,p);assert.equal(a.pieces.length+a.bots.reduce((s,b)=>s+b.held.length,0)+a.reserve.reduce((s,n)=>s+n,0),56);for(const b of a.bots)assert.ok([...b.p,...b.q,b.speed].every(Number.isFinite));}}finally{e.dispose();}
});
test('mecanum strafes, tank rejects strafing, and the wall contains driving',async()=>{
 const e=await create();try{run(e,.4);const initial=e.snapshot().arena.bots[0].p;input(e,{strafe:1});run(e,.35);assert.ok(e.snapshot().arena.bots[0].p[2]-initial[2]>.15);e.send({type:'arena',action:'preset',slot:0,preset:1});run(e,.4);const tank=e.snapshot().arena.bots[0].p;input(e,{strafe:1});run(e,.35);assert.ok(Math.abs(e.snapshot().arena.bots[0].p[2]-tank[2])<.02);input(e,{forward:-1});run(e,3);assert.ok(e.snapshot().arena.bots[0].p[0]>-1.7);}finally{e.dispose();}
});
test('shots consume finite inventory and follow a 3D ballistic path',async()=>{
 const e=await create();try{run(e,.4);const shotId=e.bots[0].held[0].id;input(e,{shoot:true,power:.82,elevation:.5});run(e,.2);const a=e.snapshot().arena;assert.equal(a.bots[0].held.length,3);const shot=a.pieces.find(p=>p.id===shotId);assert.ok(shot.p[1]>.7);input(e,{});run(e,2);assert.ok(e.snapshot().arena.pieces.find(p=>p.id===shotId).p[1]<.2);input(e,{shoot:true,power:.82});run(e,3);assert.equal(e.snapshot().arena.bots[0].held.length,0);}finally{e.dispose();}
});
test('intake collects a reachable piece and eject releases it',async()=>{
 const e=await create();try{run(e,.4);input(e,{eject:true});run(e,.1);input(e,{});run(e,.4);const p=e.bots[0].body.translation(),piece=e.pieces[0];e.release(piece,p.x+.29,.036,p.z,{x:0,y:0,z:0});input(e,{intake:true});run(e,.1);assert.equal(e.snapshot().arena.bots[0].held.length,4);input(e,{eject:true});run(e,.1);assert.equal(e.snapshot().arena.bots[0].held.length,3);}finally{e.dispose();}
});
test('pause freezes physics and resets input before resume',async()=>{
 const e=await create();try{input(e,{forward:1,shoot:true,power:.82});run(e,.1);e.send({type:'sim.pause',paused:true});const before=e.snapshot();run(e,1);assert.deepEqual(e.snapshot().arena.bots,before.arena.bots);assert.equal(e.time,before.arena.time);assert.deepEqual(e.input,{});e.send({type:'sim.pause',paused:false});run(e,.5);assert.equal(e.snapshot().arena.bots[0].held.length,3);}finally{e.dispose();}
});
test('full match blocks manual drive and shooting in auto, then settles after the 158-second clock expires',async()=>{
 const e=await create();try{e.send({type:'arena',action:'match'});input(e,{forward:1,shoot:true,intake:true,power:.82});run(e,30.01);assert.equal(e.snapshot().arena.phase,'TRANSITION');assert.equal(e.snapshot().arena.bots[0].held.length,4);assert.ok(Math.abs(e.snapshot().arena.bots[0].p[2]-1.1)<.02);input(e,{});run(e,128);assert.equal(e.snapshot().arena.phase,'SETTLING');run(e,10.1);assert.equal(e.snapshot().arena.phase,'FINISHED');assert.equal(e.snapshot().arena.remaining,0);const at=e.snapshot().arena.bots;input(e,{forward:1});run(e,1);assert.deepEqual(e.snapshot().arena.bots,at);}finally{e.dispose();}
});
test('AI scores in a full quick match without creating extra game pieces',async()=>{
 const e=await create();try{e.ai=true;e.send({type:'arena',action:'match',teleopOnly:true});run(e,130.2);const a=e.snapshot().arena;assert.equal(a.phase,'FINISHED');assert.ok(a.score[0]+a.score[1]>0);const total=a.pieces.length+a.bots.reduce((s,b)=>s+b.held.length,0)+a.hives.reduce((s,h)=>s+(h.physical?0:h.count),0)+a.reserve.reduce((s,n)=>s+n,0);assert.equal(total,56);for(const p of a.pieces)assert.ok(p.p.every(Number.isFinite));}finally{e.dispose();}
});
test('standalone runtime explicitly refuses Java execution',async()=>{
 const e=await create();try{const messages=[];e.subscribe(m=>messages.push(m));e.send({type:'opmode.start'});assert.match(messages.at(-1).text,/desktop edition/);assert.equal(e.snapshot().arena.java,false);}finally{e.dispose();}
});

test('display refresh rate does not change the simulated driving trajectory',async()=>{
 const results=[];
 for(const fps of [30,60,144]){const e=await create();try{run(e,.4);input(e,{forward:1,turn:.3});for(let i=0;i<fps*.5;i++)e.advance(1/fps);results.push(e.snapshot().arena.bots[0]);}finally{e.dispose();}}
 for(const b of results.slice(1))for(let i=0;i<3;i++)assert.ok(Math.abs(b.p[i]-results[0].p[i])<1e-5);
});
test('neutral input brakes promptly and diagonal drive has the same speed limit',async()=>{
 const e=await create();try{
  run(e,.4);input(e,{forward:.6,strafe:.6});run(e,.3);input(e,{});run(e,.5);assert.ok(e.snapshot().arena.bots[0].speed<.08);
  const b=e.bots[0];b.body.setTranslation({x:1,y:.11,z:0},true);b.body.setLinvel({x:0,y:0,z:0},true);b.body.setRotation({x:0,y:Math.sin(Math.PI/8),z:0,w:Math.cos(Math.PI/8)},true);
  input(e,{forward:1,strafe:1});run(e,.5);assert.ok(e.snapshot().arena.bots[0].speed<=presets[0].speed+.02);
 }finally{e.dispose();}
});

test('field-relative W moves downfield at four headings, including while turning',async()=>{
 const e=await create();try{for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  e.reset();const b=e.bots[0];b.body.setTranslation({x:0,y:.115,z:1.1},true);b.body.setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)},true);
  run(e,.2);const at=b.body.translation();input(e,{fieldRelative:true,forward:1,turn:.4});run(e,.3);const after=b.body.translation();
  assert.ok(after.x>at.x+.18);assert.ok(Math.abs(after.z-at.z)<.03);
 }}finally{e.dispose();}
});

test('swerve and X-drive strafe, butterfly shifts between omni and traction',async()=>{
 const e=await create();try{
  for(const drive of ['swerve','xdrive','butterfly']){e.send({type:'arena',action:'customize',slot:0,config:{drive}});run(e,.2);const z=e.bots[0].body.translation().z;input(e,{fieldRelative:true,strafe:1});run(e,.4);assert.ok(e.bots[0].body.translation().z>z+.15,drive);}
  input(e,{shift:true});run(e,.5);assert.equal(e.bots[0].traction,true);const at=e.bots[0].body.translation();input(e,{strafe:1});run(e,.3);assert.ok(Math.abs(e.bots[0].body.translation().x-at.x)<.03);
  input(e,{shift:true});run(e,.1);assert.equal(e.bots[0].traction,false);
 }finally{e.dispose();}
});

test('build edits apply to only the selected slot and survive field reset',async()=>{
 const e=await create();try{e.send({type:'arena',action:'preset',slot:1,preset:0});e.send({type:'arena',action:'customize',slot:0,config:{drive:'swerve',width:.3,mass:9,lift:true}});e.reset();const a=e.snapshot().arena;assert.equal(a.bots[0].config.drive,'swerve');assert.equal(a.bots[0].config.width,.3);assert.equal(a.bots[1].config.drive,'mecanum');assert.ok(Math.abs(e.bots[0].body.mass()-9)<.001);e.send({type:'arena',action:'preset',slot:0,preset:1});assert.equal(e.bots[0].config.drive,'tank');
 const bad=configureRobot(presets[0],{drive:'invalid',width:99,mass:'NaN',capacity:500});assert.equal(bad.drive,'mecanum');assert.equal(bad.width,.457);assert.equal(bad.mass,presets[0].mass);assert.equal(bad.capacity,4);
 }finally{e.dispose();}
});

test('all DSIM hive threshold rows distinguish below-load from a tip',()=>{
 for(const [nectar,required]of [8,7,6,3,1,0].entries()){
  if(required>0)assert.equal(hiveWillTip({pollen:required-1,nectar}),false);
  assert.equal(hiveWillTip({pollen:required,nectar}),true);
 }
});

test('hive detent holds below threshold, then physically swings, spills and scores at the far stop',async()=>{
 const e=await create();try{
  for(const piece of e.pieces.filter(p=>p.active&&p.color))e.release(piece,1.2,.05,1.2,{x:0,y:0,z:0});
  const h=e.hives[0],stage=(piece,i)=>{const p=hiveWorld(h.body.translation(),h.angle,(i%4-1.5)*.08,HIVE.floor+.045,-h.side*(HIVE.near+.08+(i<4?0:.09)));e.release(piece,p.x,p.y,p.z,{x:0,y:0,z:0});};
  for(let i=0;i<7;i++)stage(e.pieces[i],i);run(e,.4);assert.equal(h.tipping,false);assert.equal(h.tips,0);
  stage(e.pieces[7],7);run(e,.1);assert.equal(h.tipping,true);assert.equal(h.tips,0);assert.ok(e.pieces.slice(0,8).every(p=>p.active));
  run(e,1);assert.ok(Math.abs(h.angle)<Math.PI/6);assert.equal(h.tips,0);run(e,7);assert.equal(h.tips,1);assert.equal(h.side,1);assert.ok(e.pieces.slice(0,8).some(p=>p.body.translation().y<.15));assert.equal(h.held.length,0);
  run(e,2);assert.equal(h.tips,1);assert.equal(e.pieces.length,56);
 }finally{e.dispose();}
});

test('assisted shots reach the physical hive and can tip its preloaded nectar',async()=>{
 const e=await create();try{input(e,{shoot:true,assist:true});run(e,3);assert.equal(e.bots[0].held.length,0);assert.ok(e.hives[0].held.length>=3);assert.ok(e.hives[0].held.every(p=>p.active));assert.ok(e.hives[0].tipping||e.hives[0].tips>0);}finally{e.dispose();}
});

test('the closed hive roof deflects a descending ball instead of accepting open-top shots',async()=>{
 const e=await create();try{
  const h=e.hives[0],pivot=h.body.translation(),piece=e.pieces[0],p=hiveWorld(pivot,h.angle,0,HIVE.top+.16,-h.side*HIVE.arm);
  const direction=hiveWorld({x:0,y:0,z:0},h.angle,0,-2,0);e.release(piece,p.x,p.y,p.z,direction);
  run(e,.12);const local=hiveLocal(piece.body.translation(),pivot,h.angle);
  assert.ok(local.y>HIVE.top,'ball must remain above the roof after contact');assert.equal(h.held.includes(piece),false);assert.ok(piece.active);
 }finally{e.dispose();}
});
