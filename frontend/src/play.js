const $=id=>document.getElementById(id);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeLabel=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;

export function createPlayController(api) {
 let mode='play', menu=true, busy=false, active=false, token=0, phase='', latest, programs=[], build;
 let javaMatch=false, autoName='', teleName='', handoff=false, teleReady=false, event='', eventTimer, lastRecord=-1;
 let recording=[], replay=[], replayIndex=0, replaying=false, replayPaused=false, replayTimer, pausedBeforeReplay=false;
 let framesReset=-1;
 const show=(id,visible)=>$(id).classList.toggle('hidden',!visible);
 const wait=async(predicate,timeout=7000)=>{const start=performance.now();while(performance.now()-start<timeout){if(predicate())return;await delay(40);}throw new Error(latest?.opmode.error||'The Java runtime did not become ready. Check Console in Code testing.');};
 function workspace(next){mode=next;document.body.dataset.workspace=next;document.body.classList.remove('garage-open');$('playTab').setAttribute('aria-selected',next==='play');$('codeTab').setAttribute('aria-selected',next==='code');api.release();$('camera').value=next==='play'?'broadcast':'orbit';api.scene()?.setCamera($('camera').value);if(next==='code')$('editor').focus();else $('viewport').focus();}
 function garage(){document.body.classList.add('garage-open');api.release();}
 function setMenu(value){menu=value;document.body.classList.toggle('menu-open',value);show('playOverlay',value);api.release();if(!value)$('viewport').focus();}
 function ready(){return build?.success&&!build.building&&!build.sourcesChanged&&!api.dirty();}
 function selections(){
  for(const [id,flavor,empty] of [['autoProgram','AUTONOMOUS','No autonomous · wait for TeleOp'],['teleProgram','TELEOP','Select a TeleOp']]){
   const element=$(id),value=element.value;element.replaceChildren(new Option(empty,''));
   for(const p of programs.filter(p=>p.flavor===flavor&&!p.disabled))element.add(new Option(p.name,p.name));
   if([...element.options].some(o=>o.value===value)&&value)element.value=value;else if(element.options.length>1)element.selectedIndex=1;
  }
 }
 function statusBuild(b){build=b;$('playBuild').textContent=!b?'Waiting for compiler':b.building?'Compiling Java…':b.success?(b.sourcesChanged?'Sources changed. Compile them in Code testing.':'Compiled Java ready · same project, same hardware'):'Build failed. Open Code testing → Console.';}
 async function initJava(name,expectedToken=token){
  if(!name)return;await api.stop();if(expectedToken!==token)throw new Error('Session changed.');const p=programs.find(p=>p.name===name);if(!p)throw new Error(`OpMode not found: ${name}`);
  api.send({type:'opmode.init',name:p.name,flavor:p.flavor});await wait(()=>latest?.opmode.state==='INIT'||latest?.opmode.state==='ESTOP');
  if(latest.opmode.state!=='INIT')throw new Error(latest.opmode.error||'Java initialization failed.');
 }
 async function startJava(){api.send({type:'opmode.start'});await wait(()=>latest?.opmode.state==='RUNNING'||latest?.opmode.state==='IDLE'||latest?.opmode.state==='ESTOP');if(latest?.opmode.state==='ESTOP')throw new Error(latest.opmode.error||'Java stopped unexpectedly.');}
 function error(e){api.toast(e.message,true);show('countdown',false);busy=false;active=false;api.send({type:'sim.pause',paused:true});setMenu(true);$('menuTitle').textContent='CHECK YOUR PROGRAM';$('menuDescription').textContent=e.message;show('resumeGame',false);}
 async function begin(practice=false){
  if(busy)return;
  const useJava=$('playControl').value==='java',full=$('playFormat').value==='full';
  if(useJava&&!ready()){api.toast('Save and successfully compile your code in Code testing first.',true);return;}
  if(useJava&&!$('teleProgram').value){api.toast('Choose a TeleOp from your compiled project.',true);return;}
  const current=++token;busy=true;active=false;javaMatch=useJava;autoName=$('autoProgram').value;teleName=$('teleProgram').value;handoff=false;teleReady=false;
  try{
   await api.stop();api.send({type:'sim.pause',paused:true});api.release();setMenu(false);show('matchResult',false);show('replayBar',false);$('menuEyebrow').textContent='READY WHEN YOU ARE';
   show('countdown',true);
   for(let i=3;i>0;i--){if(current!==token)return;$('countdown').innerHTML=`${i}<span>GET READY</span>`;api.sound('count');await delay(750);}
   if(current!==token)return;
   const old=latest?.arena.resetId;
   api.arena(practice?'reset':'match',{seed:Number($('seed').value)||6829,teleopOnly:!full});
   api.send({type:'sim.pause',paused:false});await wait(()=>latest?.arena.resetId!==old);
   recording=[];lastRecord=-1;framesReset=latest.arena.resetId;
   if(useJava){const name=practice||!full?teleName:autoName;await initJava(name);if(name)await startJava();}
   if(current!==token)return;
   active=true;busy=false;phase=latest?.arena.phase;show('countdown',false);api.sound('start');$('viewport').focus();
  }catch(e){if(current===token)error(e);}
 }
 function pauseMenu(){
  if(busy||replaying)return;
  if(menu&&active){resume();return;}
  api.send({type:'sim.pause',paused:true});setMenu(true);show('resumeGame',active);$('menuTitle').textContent=active?'MATCH PAUSED':'ENTER THE ARENA';$('menuDescription').textContent=active?(document.body.classList.contains('browser-engine')?'Your field is paused. Resume when you are ready.':'Your field and Java program are paused together.'):'You + an AI teammate against two AI opponents.';show('matchResult',false);$('beginGame').textContent=active?'RESTART MATCH':'PLAY MATCH';
 }
 function resume(){api.send({type:'sim.pause',paused:false});setMenu(false);}
 function finish(){active=false;replay=recording.slice();api.sound('finish');api.send({type:'sim.pause',paused:true});setMenu(true);show('resumeGame',false);show('watchReplay',replay.length>1);show('matchResult',true);$('menuEyebrow').textContent='MATCH COMPLETE';$('menuTitle').textContent=latest.arena.score[0]===latest.arena.score[1]?'ALLIANCES TIED':latest.arena.score[0]>latest.arena.score[1]?'RED ALLIANCE WINS':'BLUE ALLIANCE WINS';$('menuDescription').textContent='Final practice score · review the run or play again.';$('matchResult').innerHTML=`<span>RED ${latest.arena.score[0]}</span><span>BLUE ${latest.arena.score[1]}</span>`;$('beginGame').textContent='PLAY AGAIN';}
 async function transition(){
  handoff=true;const current=token;
  try{await initJava(teleName,current);if(active&&current===token)teleReady=true;}catch(e){if(current===token)error(e);}
 }
 function update(s){
  latest=s;const a=s.arena;if(!a)return;
  $('controlBadge').textContent=a.java?'JAVA OPMODE':'DRIVER CONTROL';
  $('playInventory').textContent=`POLLEN / NECTAR  ${a.bots[0].held.length}/${api.presets()[a.bots[0].preset]?.capacity||4}`;
  $('playStatus').textContent=s.sim.paused?'PAUSED':a.phase==='AUTO'?'AUTONOMOUS':a.phase==='TRANSITION'?'DRIVER TRANSITION':a.ended?'MATCH OVER':a.java?'JAVA CONTROL':'DRIVE READY';
  $('javaLive').textContent=a.java?`${s.opmode.name||s.opmode.opModeName||'OpMode'} · ${s.opmode.runtime.toFixed(1)}s`:a.bots[0].speed.toFixed(2)+' m/s';
  if(active&&a.resetId!==framesReset){active=false;recording=[];}
  if(active&&a.time-lastRecord>=.25){recording.push(structuredClone(a));lastRecord=a.time;if(recording.length>720)recording.shift();}
  if(active&&a.phase!==phase){phase=a.phase;api.sound('count');if(javaMatch&&phase==='TRANSITION'&&!handoff)transition();if(a.ended)finish();}
  if(active&&teleReady&&!s.sim.paused&&['TELEOP','ENDGAME'].includes(a.phase)){teleReady=false;const current=token;startJava().catch(e=>{if(current===token)error(e);});}
  if(event!==a.event){event=a.event;clearTimeout(eventTimer);$('gameEvent').textContent=/Reset field|Field ready/.test(event)?'':event;eventTimer=setTimeout(()=>$('gameEvent').textContent='',2800);}
 }
 function paintReplay(){const frame=replay[replayIndex];if(!frame)return;api.scene().update(frame);$('redScore').textContent=frame.score[0];$('blueScore').textContent=frame.score[1];$('phase').textContent='REPLAY';$('clock').textContent=timeLabel(frame.remaining);$('replayTime').textContent=timeLabel(frame.time);$('replaySeek').value=Math.round(replayIndex/(replay.length-1)*1000);}
 function beginReplay(){if(replay.length<2)return;pausedBeforeReplay=latest?.sim.paused;api.send({type:'sim.pause',paused:true});replaying=true;replayPaused=false;replayIndex=0;setMenu(false);show('replayBar',true);$('replayToggle').textContent='Pause replay';paintReplay();clearInterval(replayTimer);replayTimer=setInterval(()=>{if(replayPaused)return;if(replayIndex<replay.length-1)replayIndex++;else{replayPaused=true;$('replayToggle').textContent='Play replay';}paintReplay();},250);}
 function exitReplay(){clearInterval(replayTimer);replaying=false;show('replayBar',false);if(latest)api.scene().update(latest.arena);if(!pausedBeforeReplay)api.send({type:'sim.pause',paused:false});setMenu(true);}
 $('playTab').onclick=()=>workspace('play');$('codeTab').onclick=()=>{if(replaying)exitReplay();workspace('code');};
 $('editPlayCode').onclick=()=>workspace('code');$('gameMenu').onclick=pauseMenu;$('resumeGame').onclick=resume;
 $('beginGame').onclick=()=>begin();$('freeDrive').onclick=()=>begin(true);$('playGarage').onclick=garage;$('menuGarage').onclick=garage;$('closeGarage').onclick=()=>document.body.classList.remove('garage-open');
 $('playControl').onchange=()=>show('javaSelections',$('playControl').value==='java');
 $('watchReplay').onclick=beginReplay;$('exitReplay').onclick=exitReplay;$('replayToggle').onclick=()=>{if(replayIndex===replay.length-1)replayIndex=0;replayPaused=!replayPaused;$('replayToggle').textContent=replayPaused?'Play replay':'Pause replay';};$('replaySeek').oninput=()=>{replayIndex=Math.round(Number($('replaySeek').value)/1000*(replay.length-1));paintReplay();};
 $('runInPlay').onclick=async()=>{
  if(!ready()){api.toast('Save & compile your latest Java code first.',true);return;}
  try{api.send({type:'sim.pause',paused:false});if(latest?.opmode.state==='IDLE')await initJava($('opmode').value);if(latest?.opmode.state==='INIT')await startJava();if(latest?.opmode.state==='ESTOP')throw new Error(latest.opmode.error||'Stop the failed program before running again.');$('playControl').value='java';show('javaSelections',true);active=true;javaMatch=false;framesReset=latest.arena.resetId;recording=[];lastRecord=-1;workspace('play');setMenu(false);api.toast('Your Java OpMode is running in Play. Switch tabs anytime.');}catch(e){error(e);}
 };
 window.addEventListener('keydown',e=>{if(mode!=='play'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||$('modal').open)return;if(e.key==='Escape'){e.preventDefault();if(document.body.classList.contains('garage-open'))document.body.classList.remove('garage-open');else pauseMenu();}if(e.key==='Tab'&&!menu){e.preventDefault();const cameras=['broadcast','driver','follow','top','orbit'];$('camera').value=cameras[(cameras.indexOf($('camera').value)+1)%cameras.length];api.scene()?.setCamera($('camera').value);}});
 workspace('play');setMenu(true);
 return {update,programs(list,b){programs=list;selections();if(b)statusBuild(b);},build:statusBuild,workspace,blocked:()=>mode==='play'&&(menu||busy||replaying||document.body.classList.contains('garage-open')),replaying:()=>replaying};
}
