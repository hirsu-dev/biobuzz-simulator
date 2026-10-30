import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBrowserEngine} from '../frontend/src/browser-engine.js';
import {RoomAuthority, SnapshotCadence, sanitizeInput, validCode} from '../frontend/src/room-protocol.js';
import {hiveWorld, HIVE} from '../frontend/src/hive-geometry.js';
import {navigationPath, clearForRobot} from '../frontend/src/navigation.js';
const presets = JSON.parse(await readFile(new URL('../frontend/data/robots.json', import.meta.url), 'utf8'));
const run = (e, seconds) => {for (let i=0;i<Math.round(seconds*120);i++) e.step();};

test('final, pause and reset snapshots cannot be lost between network frame intervals',()=>{
 const cadence=new SnapshotCadence(),state={arena:{resetId:1,phase:'SETTLING'},sim:{paused:false}};
 assert.deepEqual(cadence.take(state,100),{critical:true});assert.equal(cadence.take(state,110),null);
 state.arena.phase='FINISHED';assert.deepEqual(cadence.take(state,115),{critical:true});
 state.sim.paused=true;assert.deepEqual(cadence.take(state,118),{critical:true});
 state.arena.resetId=2;assert.deepEqual(cadence.take(state,122),{critical:true});
 assert.equal(cadence.take(state,130),null);assert.deepEqual(cadence.take(state,180),{critical:false});
});

test('solo practice disables all other robot bodies even when match AI is enabled', async () => {
  const e = await createBrowserEngine(presets, {autoStart:false});
  try {
    e.ai = true; const before = e.bots.slice(1).map(b=>b.body.translation()); run(e,4);
    assert.deepEqual(e.bots.map(b=>b.present),[true,false,false,false]);
    assert.deepEqual(e.bots.map(b=>b.body.isEnabled()),[true,false,false,false]);
    assert.deepEqual(e.bots.slice(1).map(b=>b.body.translation()),before);
    assert.equal(e.snapshot().arena.ai,false); assert.deepEqual(e.score(),[0,0]);
    e.send({type:'arena',action:'match',teleopOnly:true}); assert.ok(e.bots.every(b=>b.present));
    e.send({type:'arena',action:'practice'}); assert.deepEqual(e.bots.map(b=>b.present),[true,false,false,false]);
  } finally {e.dispose();}
});

test('balls in a hive score nothing live; tips score 20; end bonuses wait for final assessment', async () => {
  const e = await createBrowserEngine(presets,{autoStart:false});
  try {
    e.ai=false; e.reset(1,true,true); run(e,.5); assert.deepEqual(e.score(),[0,0]);
    const h=e.hives[0],piece=e.bots[0].held.shift(),p=hiveWorld(h.body.translation(),h.angle,.05,HIVE.floor+.04,-h.side*(HIVE.near+.1));
    e.release(piece,p.x,p.y,p.z,{x:0,y:0,z:0}); run(e,.2);
    assert.equal(h.tips,0); assert.equal(e.score()[0],0);
    h.tips=1; assert.equal(e.score()[0],20);
    const live=e.scoreBreakdown(); assert.equal(live[0].hive,0); assert.equal(live[0].garden,0); assert.equal(live[0].park,0);
    e.ended=true; const final=e.scoreBreakdown(); assert.ok(final[0].hive>=6);assert.equal(final[0].garden,4);
    assert.equal(e.score()[0],Object.values(final[0]).reduce((sum,n)=>sum+n,0));
  } finally {e.dispose();}
});

test('Auto leave and park are assessed at 30 seconds, not while driving in Auto', async () => {
  const e=await createBrowserEngine(presets,{autoStart:false});
  try {
    e.ai=false;e.reset(1,true);e.bots[0].body.setTranslation({x:-1.4,y:.115,z:-.9},true);run(e,.2);
    assert.equal(e.bots[0].left,true); assert.equal(e.scoreBreakdown()[0].auto,0);
    e.elapsed=29.995;run(e,.02); assert.equal(e.scoreBreakdown()[0].auto,8);
    e.bots[0].body.setTranslation({x:-1.63,y:.115,z:1.1},true);run(e,.2);assert.equal(e.scoreBreakdown()[0].auto,8);
  } finally {e.dispose();}
});

test('network inputs control only their slot, use alliance field axes and expire safely', async () => {
  const e=await createBrowserEngine(presets,{autoStart:false});
  try {
    e.networkSlots=[0,2];e.reset(1,true,true);run(e,.3);const red=e.bots[0].body.translation().x,blue=e.bots[2].body.translation().x;
    e.setSlotInput(2,sanitizeInput({forward:1,fieldRelative:true}));run(e,.35);
    assert.ok(e.bots[2].body.translation().x<blue-.15);assert.ok(Math.abs(e.bots[0].body.translation().x-red)<.02);
    run(e,1);assert.ok(Math.abs(e.bots[2].body.linvel().x)<.02);
    assert.equal(e.bots[1].body.isEnabled(),false);assert.equal(e.bots[3].body.isEnabled(),false);
  } finally {e.dispose();}
});

test('room authority prevents seat theft, unready starts and client-controlled starts', () => {
  const room=new RoomAuthority('host','Host','ABCDEFGH',15); room.add('guest','Guest');
  assert.equal(room.members[1].slot,2);assert.equal(room.request('guest',{type:'seat',slot:0}),false);
  assert.equal(room.start('host'),false);assert.equal(room.start('guest'),false);
  room.request('guest',{type:'ready',ready:true});assert.equal(room.start('host'),true);
  assert.equal(room.request('guest',{type:'seat',slot:3}),false);
  room.add('watcher','<Watcher>');assert.equal(room.members.at(-1).slot,null);
  assert.equal(room.lobby('guest'),false);assert.equal(room.lobby('host'),true);
  assert.ok(room.members.every(m=>!m.ready));room.remove('guest');assert.equal(room.request('watcher',{type:'seat',slot:2}),true);
});

test('room rejects invalid builds and inputs; four driver slots and eight spectators are bounded', () => {
  const room=new RoomAuthority('host','Host','ABCDEFGH',15);
  for(let n=0;n<11;n++)room.add('p'+n,'Driver');assert.throws(()=>room.add('overflow','Driver'),/full/);
  assert.equal(room.members.filter(m=>m.slot!==null).length,4);
  assert.equal(room.request('host',{type:'robot',preset:99}),false);
  assert.equal(room.request('host',{type:'seat',slot:-1}),false);
  const input=sanitizeInput({forward:Infinity,strafe:300,turn:NaN,shoot:'true',intake:true,slot:0});
  assert.equal(input.forward,0);assert.equal(input.strafe,1);assert.equal(input.turn,0);assert.equal(input.shoot,false);assert.equal(input.intake,true);assert.equal(input.slot,undefined);
  assert.equal(validCode('ABCDEFGH'),true);assert.equal(validCode('<script>'),false);
});

test('AI paths detour around flowers and hive feet without cutting blocked corners', () => {
  const radius=.27,path=navigationPath({x:-1.6,z:-.15},{x:-.95,z:1.1},radius);
  assert.ok(path.length>2);for(const p of path)assert.ok(clearForRobot(p,radius));
  for(let i=1;i<path.length;i++) for(let t=0;t<=1;t+=.1) assert.ok(clearForRobot({x:path[i-1].x+(path[i].x-path[i-1].x)*t,z:path[i-1].z+(path[i].z-path[i-1].z)*t},radius-.015));
});

test('robot-relative forward follows robot heading while field-relative forward stays fixed', async () => {
  const e=await createBrowserEngine(presets,{autoStart:false});
  try {
    for(const fieldRelative of [false,true]){
      e.reset();const b=e.bots[0];b.body.setTranslation({x:-1,y:.115,z:1},true);b.body.setRotation({x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2},true);run(e,.2);
      const p=b.body.translation();e.send({type:'arena',action:'input',forward:1,fieldRelative});run(e,.3);const q=b.body.translation();
      if(fieldRelative){assert.ok(q.x-p.x>.1);assert.ok(Math.abs(q.z-p.z)<.03);}else{assert.ok(q.z-p.z<-.1);assert.ok(Math.abs(q.x-p.x)<.03);}
    }
  }finally{e.dispose();}
});

test('flower assistance accepts a reachable offset, rejects wrong facing and reports missing equipment', async () => {
  const e=await createBrowserEngine(presets,{autoStart:false});
  try {
    assert.equal(e.flowerPlacement(e.bots[0]).reason,'equipment');
    e.send({type:'arena',action:'customize',slot:0,config:{lift:true}});
    const b=e.bots[0],f=e.flowers[0];b.body.setTranslation({x:f.x+b.config.length/2+.16,y:.115,z:f.z+.1},true);
    b.body.setRotation({x:0,y:1,z:0,w:0},true);
    assert.equal(e.flowerPlacement(b).ready,true);const id=b.held[0].id;e.placeFlower(b);assert.equal(b.held.length,3);
    assert.equal(e.flowerPlacement(b).reason,'dropping');run(e,.8);assert.ok(f.held.some(p=>p.id===id));
    b.body.setRotation({x:0,y:0,z:0,w:1},true);assert.equal(e.flowerPlacement(b).reason,'align');
  }finally{e.dispose();}
});
