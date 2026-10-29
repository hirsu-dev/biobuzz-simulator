import {DRIVES,MECHANISMS,configureRobot} from './robot-config.js';
const $=id=>document.getElementById(id);
export function openBuilder({slot,base,config,modal,apply}){
 const p=configureRobot(base,config),select=(id,values,current)=>`<select id="${id}">${values.map(v=>`<option value="${v}" ${current===v?'selected':''}>${v.toUpperCase()}</option>`).join('')}</select>`;
 const number=(key,label,min,max,step,scale=1)=>`<label>${label}<input id="build-${key}" type="number" min="${min}" max="${max}" step="0.01" value="${Math.round(p[key]*scale*100)/100}"></label>`;
 modal(`Customize ${['R1','R2','B1','B2'][slot]}`,`<p>Choose a drivetrain and mechanisms. Applying a build resets the field and saves it on this device.</p><div class="form-grid builder-grid"><label>Drivetrain${select('build-drive',DRIVES,p.drive)}</label><label>Launcher${select('build-mechanism',MECHANISMS,p.mechanism)}</label><label>Intake position${select('build-intakeMount',['front','back','both'],p.intakeMount)}</label><label>Box Tube position${select('build-liftMount',['front','back'],p.liftMount)}</label>${number('length','Length (cm)',25,45.7,.1,100)}${number('width','Width (cm)',25,45.7,.1,100)}${number('mass','Mass (kg)',5,25,.5)}${number('speed','Drive speed (m/s)',.5,3.5,.1)}${number('shotSpeed','Launch speed (m/s)',3,10,.1)}${number('cooldown','Shot interval (s)',.15,1.5,.05)}</div><label class="builder-lift"><input id="build-lift" type="checkbox" ${p.lift?'checked':''}> Add a Box Tube for flower placement</label><p>WASD stays aligned to the field on holonomic drives. Butterfly switches to traction mode with V. C places a held piece when the Box Tube is aligned with a flower; normal intake retrieves bottom pollen. I toggles auto intake. Nectar placement opens at 1:00; pollen can be placed earlier. Free drive has no placement timer.</p><div class="modal-actions"><button id="applyBuild" class="primary">APPLY BUILD</button><button id="resetBuild" class="secondary">RESET TO PRESET</button></div><p class="builder-credit">DSIM preset adaptations © 2026 Dohun Kim · <a href="./licenses/DSIM.txt" target="_blank" rel="noreferrer">PolyForm Noncommercial</a>. Models and drive forces are simplified.</p>`);
 $('applyBuild').onclick=()=>{
  const form=$('modalBody');if([...form.querySelectorAll('input[type=number]')].some(input=>!input.reportValidity()))return;
  const edit={};for(const key of ['drive','mechanism','intakeMount','liftMount'])edit[key]=$('build-'+key).value;
  for(const key of ['length','width','mass','speed','shotSpeed','cooldown'])edit[key]=Number($('build-'+key).value)/(['length','width'].includes(key)?100:1);
  edit.lift=$('build-lift').checked;apply(configureRobot(base,edit));$('modal').close();
 };
 $('resetBuild').onclick=()=>{apply(null);$('modal').close();};
}
