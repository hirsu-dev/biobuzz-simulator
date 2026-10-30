const $=id=>document.getElementById(id);

export function createMenuUI(api){
 let selected=0,lastSelection='',settingsTab='general';
 const presets=api.presets();
 $('setupRobot').replaceChildren(...presets.map((p,i)=>new Option(p.name,String(i))));
 function setup(state){
  selected=api.selectedSlot();const index=state?.arena.bots[selected].preset??[0,5,6,2][selected],p=state?.arena.bots[selected].config||presets[index];
  const key=`${selected}:${JSON.stringify(state?.arena.bots.map(b=>[b.preset,b.config]))}`;if(key===lastSelection)return;lastSelection=key;
  $('setupRobot').value=String(index);$('setupRobotName').textContent=p.name;$('setupRobotFamily').textContent=p.family;
  api.preview(index,selected,p);$('selectedAlliance').textContent=selected<2?'RED ALLIANCE':'BLUE ALLIANCE';$('selectedAlliance').className=selected<2?'red-text':'blue-text';
  $('selectedRole').textContent=['YOU','TEAMMATE · AI','OPPONENT · AI','OPPONENT · AI'][selected];
  for(const button of document.querySelectorAll('[data-slot]'))button.classList.toggle('active',Number(button.dataset.slot)===selected);
  const stats=[['DRIVE SPEED',p.speed+' m/s',p.speed/3,'gold'],['MASS',p.mass+' kg',p.mass/20,'green'],['SHOT SPEED',p.shotSpeed+' m/s',p.shotSpeed/8,'gold'],['FIRE RATE',(1/p.cooldown).toFixed(1)+' /s',1/p.cooldown/4,'red'],['CAPACITY',p.capacity+' PIECES',p.capacity/6,'gold']];
  $('robotStats').innerHTML=stats.map(([name,value,fraction,color])=>`<div class="robot-stat"><div><span>${name}</span><b>${value}</b></div><div class="stat-track"><i class="${color}" style="width:${Math.min(100,fraction*100)}%"></i></div></div>`).join('');
  const positions=state?.arena.flowers[0]?.physical?[[-1.62,1.1],[-1.62,-.15],[1.62,-1.1],[1.62,.15]]:[[.95,1.4],[-.95,1.4],[-.95,-1.4],[.95,-1.4]],map=v=>(v+1.8288)/3.6576*400;
  let svg='<rect x="1" y="1" width="398" height="398" fill="#17191f" stroke="#60636d"/><path d="M1 200H399" stroke="#3d414a"/><path d="M1 355H399V399H1Z" fill="#c6475030"/><path d="M1 1H399V45H1Z" fill="#3466c930"/>';
  for(let n=1;n<6;n++)svg+=`<path d="M${n*400/6} 0V400M0 ${n*400/6}H400" stroke="#33363f" stroke-width=".7"/>`;
  svg+=state?.arena.hives[0]?.geometry==='dsim-v2'?'<path d="M134 147L165 200L134 253M266 147L235 200L266 253M165 200H235" fill="none" stroke="#aaa"/><path d="M165 141V259M235 141V259" stroke="#999"/><rect x="137" y="141" width="56" height="33" fill="#993943"/><rect x="137" y="226" width="56" height="33" fill="#993943"/><rect x="207" y="141" width="56" height="33" fill="#284c91"/><rect x="207" y="226" width="56" height="33" fill="#284c91"/>':'<rect x="145" y="133" width="110" height="134" fill="none" stroke="#858995"/>';
  for(const [x,z] of [[-1.77,.61],[-.61,-1.77],[1.77,-.61],[.61,1.77]])svg+=`<circle cx="${map(x)}" cy="${map(z)}" r="7" fill="none" stroke="#d4c57b"/>`;
  positions.forEach(([x,z],slot)=>{const p=state?.arena.bots[slot].config||presets[state?.arena.bots[slot].preset??[0,5,6,2][slot]],size=p.length/3.6576*400;svg+=`<g data-map-slot="${slot}" role="button" tabindex="0" aria-label="Select ${['R1 your robot','R2 teammate','B1 opponent','B2 opponent'][slot]}"><rect x="${map(x)-size/2}" y="${map(z)-size/2}" width="${size}" height="${size}" fill="${slot<2?'#73313c':'#293f75'}" stroke="${slot===selected?'#f3d535':slot<2?'#de6a72':'#658ed9'}" stroke-width="${slot===selected?3:1}"/><path d="M${map(x)-5} ${map(z)+(slot<2?-size/2:size/2)}h10l-5 ${slot<2?-7:7}Z" fill="#dddfe7"/><text x="${map(x)}" y="${map(z)+4}" text-anchor="middle" fill="#eee" font-size="10">${['R1','R2','B1','B2'][slot]}</text></g>`;});
  $('setupFieldMap').innerHTML=svg;
  for(const el of $('setupFieldMap').querySelectorAll('[data-map-slot]')){const choose=()=>document.querySelector(`[data-slot="${el.dataset.mapSlot}"]`).click();el.onclick=choose;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};}
 }
 $('setupCustomize').onclick=()=>document.getElementById('configure').click();
 $('setupRobot').onchange=()=>{if(api.state()?.arena.java){$('setupRobot').value=String(api.state().arena.bots[selected].preset);api.toast('Stop the Java OpMode before changing robots.',true);return;}api.arena('preset',{slot:selected,preset:Number($('setupRobot').value)});};
 for(const button of document.querySelectorAll('[data-slot]'))button.addEventListener('click',()=>{lastSelection='';setup(api.state());});
 for(const button of document.querySelectorAll('[data-settings-tab]'))button.onclick=()=>{settingsTab=button.dataset.settingsTab;document.body.dataset.settingsTab=settingsTab;document.querySelectorAll('[data-settings-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));};
 for(const id of ['driveSensitivity','turnSensitivity'])$(id).oninput=()=>$(id+'Value').textContent=$(id).value+'%';
 function saveSettings(){const values={};for(const id of ['driveReference','quality','camera','power','elevation','driveSensitivity','turnSensitivity','ai','soundEnabled','showTrail','aimAssist']){const e=$(id);values[id]=e.type==='checkbox'?e.checked:e.value;}try{localStorage.setItem('biobuzz-settings-v2',JSON.stringify(values));api.toast('Settings saved on this device.');}catch{api.toast('This browser could not save settings.',true);}}
 function restoreSettings(){let values;try{values=JSON.parse(localStorage.getItem('biobuzz-settings-v2'));}catch{}if(!values)return;for(const [id,value] of Object.entries(values)){const e=$(id);if(!e||!['driveReference','quality','camera','power','elevation','driveSensitivity','turnSensitivity','ai','soundEnabled','showTrail','aimAssist'].includes(id))continue;if(e.type==='checkbox')e.checked=!!value;else e.value=String(value);e.dispatchEvent(new Event(e.type==='range'?'input':'change'));}}
 $('saveSettings').onclick=()=>{saveSettings();api.closePanel();};
 $('setupRules').onclick=$('homeControls').onclick=()=>$('help').click();
 $('homeCode').onclick=()=>api.code();
 $('homeSingleplayer').onclick=()=>api.navigate('setup');$('setupBack').onclick=()=>api.home();$('homeRobots').onclick=()=>api.panel('garage');$('homeSettings').onclick=$('setupSettings').onclick=()=>api.panel('settings');
 $('homeReplays').onclick=()=>api.replays();$('replaysBack').onclick=()=>api.home();
 $('homeButton').onclick=()=>api.home();$('pauseSettings').onclick=()=>api.panel('settings');
 $('homeContinue').onclick=()=>api.resume();
 document.body.dataset.settingsTab='general';
 return {setup,restoreSettings};
}
