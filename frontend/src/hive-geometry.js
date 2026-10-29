/*! Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412).
 * DSIM measurement/physics adaptations: https://polyformproject.org/licenses/noncommercial/1.0.0
 */
// Original procedural geometry using dimensions reported by DSIM's fieldDims.gen.ts
// and field-measurements.json (f930291b). No FIRST/DSIM CAD mesh is redistributed.
const IN=.0254,LB=.45359237;
export const HIVE={pivotX:12.75*IN,pivotY:43.95*IN,near:9.644*IN,far:21.394*IN,arm:15.519*IN,floor:-1.468*IN,top:12.529*IN,halfWidth:10.071*IN,rest:Math.PI/6,seatDepth:3.5*IN};
// Floor, lower corner breaks, vertical walls and a two-sided pitched roof.
export const CELL_PROFILE=[[-9,-1.468],[9,-1.468],[10.071,-.39],[10.071,5.86],[9.57,6.775],[.58,12.529],[-.58,12.529],[-9.57,6.775],[-10.071,5.86],[-10.071,-.39]].map(p=>p.map(n=>n*IN));
export const HIVE_MASS=(13+6)*LB;
export const HIVE_COM=(13*(HIVE.floor+HIVE.top)/2+6*(-9.5*IN))/19;
export const HIVE_INERTIA=HIVE_MASS*HIVE.arm**2;
export const hivePivot=alliance=>({x:(alliance===0?-1:1)*HIVE.pivotX,y:HIVE.pivotY,z:0});
export const hiveRotation=angle=>({x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)});
export function hiveWorld(pivot,angle,x,y,z){const c=Math.cos(angle),s=Math.sin(angle);return {x:pivot.x+x,y:pivot.y+c*y-s*z,z:pivot.z+s*y+c*z};}
export function hiveLocal(p,pivot,angle){const y=p.y-pivot.y,z=p.z-pivot.z,c=Math.cos(angle),s=Math.sin(angle);return {x:p.x-pivot.x,y:c*y+s*z,z:-s*y+c*z};}
export function inCellProfile(x,y,margin=0){
 for(let i=0;i<CELL_PROFILE.length;i++){const a=CELL_PROFILE[i],b=CELL_PROFILE[(i+1)%CELL_PROFILE.length],dx=b[0]-a[0],dy=b[1]-a[1];if(dx*(y-a[1])-dy*(x-a[0])<margin*Math.hypot(dx,dy))return false;}
 return true;
}
export function hivePanels(side){
 const z1=-side*HIVE.near,z2=-side*HIVE.far;
 const panels=CELL_PROFILE.map((a,i)=>{
  const b=CELL_PROFILE[(i+1)%CELL_PROFILE.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),skin=i===0?.0127:.0381,n=[dy/length*skin,-dx/length*skin,0];
  const face=[[...a,z1],[...b,z1],[...b,z2],[...a,z2]];
  return {kind:i===0?'floor':i>=4&&i<=6?'roof':'side',face,points:[...face,...face.map(p=>p.map((v,k)=>v+n[k]))].flat()};
 });
 const face=CELL_PROFILE.map(([x,y])=>[x,y,z1]);panels.push({kind:'back',face,points:[...face,...face.map(([x,y,z])=>[x,y,z+side*.0127])].flat()});return panels;
}
export const HIVE_FRAME=[
 ...[-1,1].flatMap(s=>[
  {a:[s*23.74*IN,.025,-19.47*IN],b:[s*23.74*IN,.025,19.47*IN],width:.04},
  ...[-1,1].map(z=>({a:[s*23.74*IN,.04,z*18.5*IN],b:[s*12.75*IN,41.5*IN,0],width:.028})),
 ]),
 {a:[-12.75*IN,41.5*IN,0],b:[12.75*IN,41.5*IN,0],width:.0254},
];
export function segmentPose({a,b,width}){
 const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta),[x,y,z]=delta.map(v=>v/length),q=[z,0,-x,1+y],n=Math.hypot(...q);
 return {p:a.map((v,i)=>(v+b[i])/2),s:[width,length,width],q:n>1e-8?q.map(v=>v/n):[1,0,0,0]};
}
