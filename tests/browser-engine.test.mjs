import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBrowserEngine} from '../frontend/src/browser-engine.js';
const presets=JSON.parse(await readFile(new URL('../frontend/data/robots.json',import.meta.url),'utf8'));
const run=(e,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)e.step();};
const input=(e,values)=>e.send({type:'arena',action:'input',...values});
const create=async()=>{const e=await createBrowserEngine(presets,{autoStart:false});e.ai=false;return e;};

test('all ten designs have four finite 3D bodies and a conserved piece inventory',async()=>{
 const e=await create();try{assert.equal(presets.length,10);for(let p=0;p<10;p++){e.send({type:'arena',action:'preset',slot:0,preset:p});run(e,.4);const a=e.snapshot().arena;assert.equal(a.bots.length,4);assert.equal(a.bots[0].preset,p);assert.equal(a.pieces.length+a.bots.reduce((s,b)=>s+b.held.length,0),84);for(const b of a.bots)assert.ok([...b.p,...b.q,b.speed].every(Number.isFinite));}}finally{e.dispose();}
});
test('mecanum strafes, tank rejects strafing, and the wall contains driving',async()=>{
 const e=await create();try{run(e,.4);const initial=e.snapshot().arena.bots[0].p;input(e,{strafe:1});run(e,.35);assert.ok(e.snapshot().arena.bots[0].p[0]-initial[0]>.15);e.send({type:'arena',action:'preset',slot:0,preset:1});run(e,.4);const tank=e.snapshot().arena.bots[0].p;input(e,{strafe:1});run(e,.35);assert.ok(Math.abs(e.snapshot().arena.bots[0].p[0]-tank[0])<.02);input(e,{forward:-1});run(e,3);assert.ok(e.snapshot().arena.bots[0].p[2]<1.68);}finally{e.dispose();}
});
test('shots consume finite inventory and follow a 3D ballistic path',async()=>{
 const e=await create();try{run(e,.4);input(e,{shoot:true,power:.82,elevation:.5});run(e,.2);const a=e.snapshot().arena;assert.equal(a.bots[0].held.length,2);const shot=a.pieces.find(p=>p.id===72);assert.ok(shot.p[1]>.7);input(e,{});run(e,2);assert.ok(e.snapshot().arena.pieces.find(p=>p.id===72).p[1]<.2);input(e,{shoot:true,power:.82});run(e,3);assert.equal(e.snapshot().arena.bots[0].held.length,0);}finally{e.dispose();}
});
test('intake collects a reachable piece and eject releases it',async()=>{
 const e=await create();try{run(e,.4);const p=e.bots[0].body.translation(),piece=e.pieces[0];e.release(piece,p.x,.06,p.z-.32,{x:0,y:0,z:0});input(e,{intake:true});run(e,.1);assert.equal(e.snapshot().arena.bots[0].held.length,4);input(e,{eject:true});run(e,.1);assert.equal(e.snapshot().arena.bots[0].held.length,3);}finally{e.dispose();}
});
test('pause freezes physics and resets input before resume',async()=>{
 const e=await create();try{input(e,{forward:1,shoot:true,power:.82});run(e,.1);e.send({type:'sim.pause',paused:true});const before=e.snapshot();run(e,1);assert.deepEqual(e.snapshot().arena.bots,before.arena.bots);assert.equal(e.time,before.arena.time);assert.deepEqual(e.input,{});e.send({type:'sim.pause',paused:false});run(e,.5);assert.equal(e.snapshot().arena.bots[0].held.length,2);}finally{e.dispose();}
});
test('full match blocks manual drive and shooting in auto, then finishes after 158 seconds',async()=>{
 const e=await create();try{e.send({type:'arena',action:'match'});input(e,{forward:1,shoot:true,intake:true,power:.82});run(e,30.01);assert.equal(e.snapshot().arena.phase,'TRANSITION');assert.equal(e.snapshot().arena.bots[0].held.length,3);assert.ok(Math.abs(e.snapshot().arena.bots[0].p[2]-1.4)<.02);input(e,{});run(e,128);assert.equal(e.snapshot().arena.phase,'FINISHED');assert.equal(e.snapshot().arena.remaining,0);const at=e.snapshot().arena.bots;input(e,{forward:1});run(e,1);assert.deepEqual(e.snapshot().arena.bots,at);}finally{e.dispose();}
});
test('AI scores in a full quick match without creating extra game pieces',async()=>{
 const e=await create();try{e.ai=true;e.send({type:'arena',action:'match',teleopOnly:true});run(e,120.1);const a=e.snapshot().arena;assert.equal(a.phase,'FINISHED');assert.ok(a.score[0]+a.score[1]>0);const total=a.pieces.length+a.bots.reduce((s,b)=>s+b.held.length,0)+a.hives.reduce((s,h)=>s+h.count,0)+a.flowers.reduce((s,f)=>s+f.held.length,0);assert.equal(total,84);for(const p of a.pieces)assert.ok(p.p.every(Number.isFinite));}finally{e.dispose();}
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
