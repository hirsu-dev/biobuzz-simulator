export function createTouchControls() {
 const drive=document.getElementById('touchDrive'),turn=document.getElementById('touchTurn');
 const state={lx:0,ly:0,rx:0,a:false,rt:0,lb:false,rb:false,b:false};
 const activePointers=new Map();let enabled=false;
 const clamp=v=>Math.max(-1,Math.min(1,v));
 function draw(){drive.style.setProperty('--stick-x',`${state.lx*34}%`);drive.style.setProperty('--stick-y',`${state.ly*34}%`);turn.style.setProperty('--turn-x',`${state.rx*39}%`);}
 function release(){activePointers.clear();state.lx=state.ly=state.rx=state.rt=0;state.a=state.lb=state.rb=state.b=false;document.querySelectorAll('[data-touch-action]').forEach(b=>{b.classList.remove('held');b.setAttribute('aria-pressed','false');});draw();}
 function setVisible(value){enabled=value;document.body.classList.toggle('touch-controls',value);document.getElementById('touchToggle').setAttribute('aria-pressed',String(value));release();}
 function position(element,e,axis){const r=element.getBoundingClientRect();if(axis==='drive'){let x=(e.clientX-r.left-r.width/2)/(r.width*.34),y=(e.clientY-r.top-r.height/2)/(r.height*.34);const scale=Math.max(1,Math.hypot(x,y));state.lx=x/scale;state.ly=y/scale;}else state.rx=clamp((e.clientX-r.left-r.width/2)/(r.width*.39));draw();}
 for(const [element,axis] of [[drive,'drive'],[turn,'turn']]){
  element.addEventListener('pointerdown',e=>{if(!enabled||activePointers.has(axis))return;e.preventDefault();e.stopPropagation();activePointers.set(axis,e.pointerId);element.setPointerCapture(e.pointerId);position(element,e,axis);});
  element.addEventListener('pointermove',e=>{if(activePointers.get(axis)===e.pointerId){e.preventDefault();position(element,e,axis);}});
  const end=e=>{if(activePointers.get(axis)!==e.pointerId)return;activePointers.delete(axis);if(axis==='drive')state.lx=state.ly=0;else state.rx=0;draw();};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,end);
 }
 for(const button of document.querySelectorAll('[data-touch-action]')){
  const action=button.dataset.touchAction;
  if(action==='intake'){button.onclick=e=>{e.stopPropagation();state.rb=!state.rb;button.classList.toggle('held',state.rb);button.setAttribute('aria-pressed',String(state.rb));};continue;}
  function set(value){if(action==='shoot'){state.a=value;state.rt=value?1:0;}else state[action==='eject'?'lb':'b']=value;button.classList.toggle('held',value);button.setAttribute('aria-pressed',String(value));}
  button.addEventListener('pointerdown',e=>{if(!enabled)return;e.preventDefault();e.stopPropagation();activePointers.set(action,e.pointerId);button.setPointerCapture(e.pointerId);set(true);});
  const end=e=>{if(activePointers.get(action)!==e.pointerId)return;activePointers.delete(action);set(false);};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);
 }
 document.getElementById('touchToggle').onclick=()=>setVisible(!enabled);
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});window.addEventListener('orientationchange',release);window.addEventListener('resize',release);
 document.getElementById('viewport').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!enabled)setVisible(true);},{passive:true});
 setVisible(matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0);
 return {release,sample:()=>enabled?{...state}:null,enabled:()=>enabled};
}
