import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFullscreen} from '../frontend/src/fullscreen.js';

function fixture(){
 const doc=new EventTarget(),win=new EventTarget(),classes=new Set(),messages=[];
 const buttons=[0,1].map(()=>{const b=new EventTarget();b.attrs={};b.label={};b.setAttribute=(k,v)=>b.attrs[k]=v;b.querySelector=()=>b.label;return b;});
 doc.documentElement={classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)}};
 doc.querySelectorAll=()=>buttons;
 const enter=async()=>{doc.fullscreenElement=doc.documentElement;doc.dispatchEvent(new Event('fullscreenchange'));};
 doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));};
 doc.documentElement.requestFullscreen=enter;
 let resets=0;
 const controller=createFullscreen({document:doc,window:win,onChange:()=>resets++,notify:(...args)=>messages.push(args)});
 return {doc,win,buttons,classes,messages,controller,resets:()=>resets};
}

test('fullscreen uses the whole document and syncs both buttons after external exit',async()=>{
 const f=fixture();await f.controller.toggle();assert.equal(f.doc.fullscreenElement,f.doc.documentElement);
 for(const b of f.buttons){assert.equal(b.attrs['aria-pressed'],'true');assert.equal(b.label.textContent,'EXIT FULLSCREEN');}
 await f.doc.exitFullscreen();assert.equal(f.controller.active(),false);assert.equal(f.classes.has('game-fullscreen'),false);
 assert.ok(f.buttons.every(b=>b.attrs['aria-pressed']==='false'));assert.ok(f.resets()>=3);
});

test('Escape exits fullscreen and Alt+Enter enters it without reaching gameplay keys',async()=>{
 const f=fixture(),key=(key,altKey=false)=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{key,altKey});f.win.dispatchEvent(e);return e;};
 assert.equal(key('Enter',true).defaultPrevented,true);await Promise.resolve();await Promise.resolve();assert.equal(f.controller.active(),true);
 assert.equal(key('Escape').defaultPrevented,true);await Promise.resolve();assert.equal(f.controller.active(),false);
});

test('unsupported fullscreen provides an explicit reversible expanded-view fallback',async()=>{
 const f=fixture();delete f.doc.documentElement.requestFullscreen;
 await f.controller.toggle();assert.equal(f.classes.has('theater-fullscreen'),true);assert.match(f.messages[0][0],/Expanded view/);
 await f.controller.toggle();assert.equal(f.controller.active(),false);assert.equal(f.classes.has('theater-fullscreen'),false);
});

test('denied requests keep the UI windowed and repeated clicks cannot queue transitions',async()=>{
 const f=fixture();let rejectRequest,calls=0;
 f.doc.documentElement.requestFullscreen=()=>{calls++;return new Promise((_,reject)=>{rejectRequest=reject;});};
 const pending=f.controller.toggle();await f.controller.toggle();assert.equal(calls,1);
 rejectRequest(new Error('Denied'));await pending;assert.equal(f.controller.active(),false);
 assert.equal(f.classes.has('game-fullscreen'),false);assert.match(f.messages[0][0],/blocked fullscreen/);assert.equal(f.messages[0][1],true);
});
