export const DRIVES=['mecanum','tank','swerve','xdrive','butterfly'];
export const MECHANISMS=['turret','twin-turret','flywheel','dumper','catapult','lift','wide','dual'];
const finite=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function configureRobot(base,edit={}){
 const p={...base};
 for(const key of ['drive','mechanism'])if((key==='drive'?DRIVES:MECHANISMS).includes(edit[key]))p[key]=edit[key];
 for(const [key,min,max]of [['width',.25,.457],['length',.25,.457],['mass',5,25],['speed',.5,3.5],['shotSpeed',3,10],['cooldown',.15,1.5]])if(edit[key]!==undefined)p[key]=finite(edit[key],base[key],min,max);
 p.lift=edit.lift===undefined?!!(base.lift||base.mechanism==='lift'):!!edit.lift;
 p.liftMount=['front','back'].includes(edit.liftMount)?edit.liftMount:base.liftMount||'front';
 p.intakeMount=['front','back','both'].includes(edit.intakeMount)?edit.intakeMount:base.intakeMount||'front';
 p.pollenOnly=!!base.pollenOnly&&p.mechanism==='turret';
 p.family=p.drive+' · '+p.mechanism+(p.lift?' · Box Tube':'');
 p.capacity=4;
 return p;
}
export function fieldDrive(forward,strafe,heading){
 // World -Z is downfield from the red driver station; +X is right.
 return {forward:Math.cos(heading)*strafe+Math.sin(heading)*forward,strafe:Math.sin(heading)*strafe-Math.cos(heading)*forward};
}
export function robotHeading(q){return Math.atan2(2*(q[3]*q[1]+q[0]*q[2]),1-2*(q[1]*q[1]+q[2]*q[2]));}
export const holonomic=(p,traction=false)=>p.drive!=='tank'&&!(p.drive==='butterfly'&&traction);
