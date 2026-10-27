import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PoseTrack,FixedClock,dampFactor,angleDelta} from '../frontend/src/motion.js';

test('camera damping settles equally at 30, 60, and 144 Hz without overshoot',()=>{
  const results=[30,60,144].map(fps=>{let x=0;for(let i=0;i<fps;i++)x+=(10-x)*dampFactor(9,1/fps);assert.ok(x<10);return x;});
  assert.ok(Math.max(...results)-Math.min(...results)<1e-10);
  assert.ok(Math.abs(angleDelta(Math.PI-.02,-Math.PI+.02)-.04)<1e-10);
});
test('ball rendering fills gaps between physics packets and never extrapolates through walls',()=>{
  const t=new PoseTrack(),out=[];t.push([0,0,0],[0,0,0,1],0,0);t.push([1,2,0],[0,0,0,1],.1,100);
  assert.deepEqual(t.position(150,out),[.5,1,0]);assert.deepEqual(t.position(400,out),[1,2,0]);
  t.push([10,0,0],[0,0,0,1],0,500);assert.deepEqual(t.position(500,out),[10,0,0]);
  t.push([20,0,0],[0,0,0,1],.1,600,true);assert.deepEqual(t.position(600,out),[20,0,0]);
});
test('fixed physics clock preserves real time on slow and fast displays, with bounded resume catch-up',()=>{
  for(const fps of [20,30,60,144]){const c=new FixedClock();let steps=0;for(let i=0;i<fps*3;i++)c.advance(1/fps,()=>steps++);assert.equal(steps,360);}
  const c=new FixedClock();let steps=0;c.advance(30,()=>steps++);assert.equal(steps,12);c.reset();assert.equal(c.accumulator,0);
});
