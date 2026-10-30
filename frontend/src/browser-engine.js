import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import {navigationPath,clearForRobot} from './navigation.js';
import {FixedClock} from './motion.js';
import {configureRobot,fieldDrive,holonomic} from './robot-config.js';
import {HIVE,HIVE_MASS,HIVE_COM,HIVE_INERTIA,HIVE_FRAME,hivePanels,hivePivot,hiveRotation,hiveWorld,segmentPose} from './hive-geometry.js';
import {HIVE_REST,hiveLoad,hiveWillTip,pollenToTip,cellContains} from './dsim-hive.js';
import {FLOWER,FLOWERS,FLOWER_PLATES,FLOWER_BOXES,flowerWorld,flowerPlatePanels,flowerScored} from './flower-geometry.js';
import {LOADING_ZONES,GARDENS,ballInZone,robotInZone} from './field-rules.js';

const clamp=(n,a=-1,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const vector=(x=0,y=0,z=0)=>({x,y,z});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const heading=b=>{const q=b.rotation();return Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));};
const transform=b=>{const p=b.translation(),q=b.rotation();return {p:[p.x,p.y,p.z],q:[q.x,q.y,q.z,q.w]};};
const isTurret=p=>['turret','wide','twin-turret'].includes(p.mechanism);
const STEP=1/120;
let initialized;

// This is the standalone practice engine. Java/FTC SDK execution stays in the desktop engine.
export async function createBrowserEngine(presets,{autoStart=true}={}) {
 await (initialized??=RAPIER.init());
 const engine=new BrowserEngine(presets);
 if(autoStart)engine.start();
 return engine;
}

class BrowserEngine {
 constructor(presets){this.clock=new FixedClock(STEP);this.presets=structuredClone(presets);this.selection=[0,5,6,2];this.custom=[null,null,null,null];this.ai=true;this.paused=false;this.listeners=new Set();this.input={};this.resetId=0;this.reset(6829);}
 config(slot){return configureRobot(this.presets[this.selection[slot]],this.custom[slot]||{});}
 subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 emit(message){for(const listener of this.listeners)listener(message);}
 publish(){this.emit(this.snapshot());}
 reset(seed=this.seed,match=false,teleopOnly=false){
  this.clock.reset();
  this.world?.free();this.world=new RAPIER.World(vector(0,-9.81,0));this.world.timestep=STEP;
  this.seed=seed|0;this.time=0;this.elapsed=teleopOnly?38:0;this.match=match;this.ended=false;this.resetId++;this.input={};this.slotInputs={};this.finalScore=null;this.finalBreakdown=null;this.autoScore=[0,0];
  this.bots=[];this.pieces=[];this.scenery=[];this.flowers=[];this.hives=[];this.reserve=[[],[]];this.loaded=[0,0];this.lastLoad=[-2,-2];this.penalties=[0,0];this.settling=0;this.event='Field ready';
  const box=(x,y,z,sx,sy,sz,color,visible=true)=>{this.world.createCollider(RAPIER.ColliderDesc.cuboid(sx/2,sy/2,sz/2).setTranslation(x,y,z).setFriction(.7));if(visible)this.scenery.push({p:[x,y,z],s:[sx,sy,sz],color});};
  box(0,-.05,0,3.8,.1,3.8,'#747b80',false);
  for(const side of [-1,1]){box(side*1.8538,.155,0,.05,.31,3.76,'#aaa',false);box(0,.155,side*1.8538,3.76,.31,.05,'#aaa',false);}
  for(const frame of HIVE_FRAME){const {p,s,q}=segmentPose(frame);this.world.createCollider(RAPIER.ColliderDesc.cuboid(s[0]/2,s[1]/2,s[2]/2).setTranslation(...p).setRotation({x:q[0],y:q[1],z:q[2],w:q[3]}));}
  for(let i=0;i<2;i++){
   const side=i===0?-1:1,hive={side,angle:side*HIVE_REST,tips:0,held:[],tipping:false};
   const pivot=hivePivot(i),anchor=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pivot.x,pivot.y,pivot.z));
   hive.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pivot.x,pivot.y,pivot.z).setRotation(hiveRotation(hive.angle)).setAngularDamping(4.466).setCanSleep(false).setAdditionalMassProperties(HIVE_MASS,vector(0,HIVE_COM,0),vector(HIVE_INERTIA,HIVE_INERTIA,HIVE_INERTIA),{x:0,y:0,z:0,w:1}));
   for(const side of [-1,1])for(const panel of hivePanels(side)){
    const desc=RAPIER.ColliderDesc.convexHull(new Float32Array(panel.points));
    if(!desc)throw new Error('Invalid hive panel');
    this.world.createCollider(desc.setDensity(0).setFriction(panel.kind==='floor'?.6:.5).setRestitution(panel.kind==='back'?0:.15).setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min),hive.body);
   }
   hive.joint=this.world.createImpulseJoint(RAPIER.JointData.revolute(vector(),vector(),vector(1,0,0)),anchor,hive.body,true);hive.joint.setLimits(-HIVE_REST,HIVE_REST);this.hives.push(hive);
  }
  for(const f of FLOWERS){
   this.flowers.push({...f,held:[]});
   for(const plate of FLOWER_PLATES)for(const points of flowerPlatePanels(plate)){
    const worldPoints=[];for(let n=0;n<points.length;n+=3){const p=flowerWorld(f,...points.slice(n,n+3));worldPoints.push(p.x,p.y,p.z);}
    this.world.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(worldPoints)).setFriction(.5).setRestitution(0));
   }
   for(const part of FLOWER_BOXES){const p=flowerWorld(f,...part.p),q={x:0,y:Math.sin(Math.atan2(f.nx,f.nz)/2),z:0,w:Math.cos(Math.atan2(f.nx,f.nz)/2)};this.world.createCollider(RAPIER.ColliderDesc.cuboid(...part.s.map(v=>v/2)).setTranslation(p.x,p.y,p.z).setRotation(q));}
   // Eight contact strips approximate the confinement between the four posts.
   for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=FLOWER.midRadius+.002,y=(FLOWER.midTop+FLOWER.topBottom)/2;this.world.createCollider(RAPIER.ColliderDesc.cuboid(.004/2,(FLOWER.topBottom-FLOWER.midTop)/2,FLOWER.midRadius*Math.tan(Math.PI/8)+.001).setTranslation(f.x+Math.cos(angle)*r,y,f.z+Math.sin(angle)*r).setRotation({x:0,y:-Math.sin(angle/2),z:0,w:Math.cos(angle/2)}).setFriction(.35).setRestitution(0));}
   for(let n=0;n<4;n++){const p=this.addPiece(0,f.x,.036+n*.07112,f.z);p.flower=this.flowers.length-1;}
  }
  for(const a of [0,1])for(let n=0;n<4;n++)this.addPiece(0,(a===0?-1:1)*(1.79-n*.074),.036,(a===0?1:-1)*1.79);
  for(let id=0;id<4;id++){
   const preset=this.selection[id],p=this.config(id),x=(id<2?-1:1)*(1.8288-p.length/2),z=[1.1,-.15,-1.1,.15][id],h=id<2?0:Math.PI;
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,.115,z).setRotation({x:0,y:Math.sin(h/2),z:0,w:Math.cos(h/2)}).setLinearDamping(.08).setAngularDamping(.5).setCanSleep(false).setCcdEnabled(true));
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(p.length/2,.10,p.width/2).setMass(p.mass).setFriction(.08).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.05),body);
   const bot={id,preset,config:p,body,held:[],turret:0,hood:.5,lastShot:-2,lastPlace:-2,lastExtract:-2,traction:false,shiftHeld:false,wheelAngles:[0,0,0,0],left:false,autoPark:false};this.bots.push(bot);
   for(let n=0;n<4;n++){const piece=this.addPiece(0,x,.15,z);if(n<p.capacity)this.capture(piece,bot.held);else this.release(piece,x+(id<2?1:-1)*(p.length/2+.035),.036,z+(n-2)*.072,vector());}
  }
  for(let a=0;a<2;a++){
   const h=this.hives[a];for(let n=0;n<3;n++){const p=hiveWorld(hivePivot(a),h.angle,(n-1)*.094,HIVE.floor+.046,-h.side*(HIVE.near+.06));this.addPiece(a+1,p.x,p.y,p.z);}
   for(let n=0;n<5;n++)this.capture(this.addPiece(a+1,0,0,0),this.reserve[a]);
  }
  this.setParticipants(this.networkSlots??(match?[0,1,2,3]:[0]));
  this.updateFlowers();
 }
 setParticipants(slots){
  for(const bot of this.bots){bot.present=slots.includes(bot.id);bot.body.setEnabled(bot.present);if(!bot.present)delete this.slotInputs[bot.id];}
 }
 setSlotInput(slot,input){if(Number.isInteger(slot)&&this.bots[slot]?.present)this.slotInputs[slot]={input,at:this.time};}
 addPiece(color,x,y,z){
  const radius=color===0?.03556:.04572,mass=(color===0?.2:.32)*.45359237;
  const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setLinearDamping(.015).setAngularDamping(.4).setCcdEnabled(true));
  this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setMass(mass).setFriction(.6).setRestitution(.55),body);
  const piece={id:this.pieces.length,color,radius,mass,body,active:true,lastY:y};this.pieces.push(piece);return piece;
 }
 capture(piece,held){piece.active=false;piece.flower=null;piece.body.setEnabled(false);held.push(piece);}
 release(piece,x,y,z,velocity){piece.active=true;piece.flower=null;piece.body.setTranslation(vector(x,y,z),true);piece.body.setLinvel(velocity,true);piece.body.setAngvel(vector(),true);piece.body.setEnabled(true);piece.lastY=y;}
 goal(alliance){const h=this.hives[alliance],taking=h.tipping&&h.angle*h.side<0?-h.side:h.side;return hiveWorld(hivePivot(alliance),h.angle,0,.12,-taking*(HIVE.far-.025));}
 drive(bot,forward,strafe,turn){
  const p=bot.config,at=bot.body.translation();if(at.y>.19)return;
  if(!holonomic(p,bot.traction))strafe=0;
  if(p.drive==='xdrive'){
   // Four omni wheels at 45 degrees: normalize in wheel space.
   const wheelPeak=Math.max(1,Math.abs(forward+strafe),Math.abs(forward-strafe));forward/=wheelPeak;strafe/=wheelPeak;
  }
  if(p.drive==='swerve'){
   const desired=Math.atan2(strafe,forward||1e-9);let alignment=0;
   bot.wheelAngles=bot.wheelAngles.map(angle=>{let error=wrap(desired-angle);if(Math.abs(error)>Math.PI/2)error=wrap(error+Math.PI);const next=angle+clamp(error,-10*STEP,10*STEP);alignment+=Math.abs(Math.cos(desired-next))/4;return next;});
   forward*=alignment;strafe*=alignment;
  }
  const magnitude=Math.max(1,Math.hypot(forward,strafe));forward/=magnitude;strafe/=magnitude;
  const h=heading(bot.body),v=bot.body.linvel(),mass=bot.body.mass();
  const dx=(Math.cos(h)*forward+Math.sin(h)*strafe)*p.speed*(bot.traction?.72:1),dz=(-Math.sin(h)*forward+Math.cos(h)*strafe)*p.speed*(bot.traction?.72:1);
  // Traction-limited acceleration and stronger neutral braking, in SI units.
  const braking=Math.hypot(forward,strafe)<.01,ax=(dx-v.x)*(braking?14:10),az=(dz-v.z)*(braking?14:10);
  const limit=braking?10:p.drive==='tank'||bot.traction?9:p.drive==='swerve'?8:6.8,scale=Math.min(1,limit/Math.max(.001,Math.hypot(ax,az)));
  bot.body.applyImpulse(vector(ax*scale*mass*STEP,0,az*scale*mass*STEP),true);
  const inertia=mass*(p.length*p.length+p.width*p.width)/12;
  const av=bot.body.angvel();bot.body.applyTorqueImpulse(vector(0,clamp((-turn*3.2-av.y)*14,-18,18)*inertia*STEP,0),true);
 }
 aimShot(bot){
  const at=bot.body.translation(),p=bot.config,g=this.goal(Math.floor(bot.id/2)),v=bot.body.linvel();
  const distance=Math.max(.2,Math.hypot(g.x-at.x,g.z-at.z)-p.length/2-.08);
  const flight=clamp(.45+distance*.22,.58,.95),vy=(g.y-at.y-.26)/flight+4.905*flight;
  const bearing=Math.atan2(-(g.z-at.z),g.x-at.x),mx=at.x+Math.cos(bearing)*(p.length/2+.08),mz=at.z-Math.sin(bearing)*(p.length/2+.08);
  const vx=(g.x-mx)/flight-v.x,vz=(g.z-mz)/flight-v.z,horizontal=Math.hypot(vx,vz);
  bot.aimPitch=Math.atan2(vy,horizontal);bot.aimBearing=Math.atan2(-vz,vx);bot.aimSpeed=Math.hypot(horizontal,vy)*1.008;
 }
 shotPower(bot){this.aimShot(bot);return clamp(bot.aimSpeed/bot.config.shotSpeed*.82,.12,1.2);}
 flowerPlacement(bot){
  const p=bot.config,at=bot.body.translation();
  if(!(p.lift||p.mechanism==='lift'))return {ready:false,reason:'equipment',message:'Add a Box Tube in Customize'};
  if(this.time-bot.lastPlace<.6)return {ready:false,reason:'dropping',message:'Placing piece…'};
  if(!bot.held.length)return {ready:false,reason:'empty',message:'Intake a piece first'};
  const piece=bot.held[0];
  if(this.match&&this.elapsed<98&&piece.color)return {ready:false,reason:'time',message:'Nectar unlocks at 1:00'};
  const h=heading(bot.body),mount=p.liftMount==='back'?-1:1,fx=Math.cos(h)*mount,fz=-Math.sin(h)*mount;
  const index=this.flowers.findIndex(f=>{const dx=f.x-at.x,dz=f.z-at.z,ahead=dx*fx+dz*fz,across=-dx*fz+dz*fx;return fx*f.nx+fz*f.nz<-.65&&ahead>p.length/2+.035&&ahead<p.length/2+.24&&Math.abs(across)<.14;});
  if(index<0)return {ready:false,reason:'align',message:'Face a flower with the '+(mount<0?'rear':'front')+' Box Tube'};
  if(this.flowers[index].held.some(p=>p.body.translation().y+p.radius>FLOWER.topBottom-piece.radius*2))return {ready:false,reason:'full',message:'Flower is full'};
  return {ready:true,reason:'ready',index,message:'Ready · C / FLOWER to place'};
 }
 placeFlower(bot){
  if(this.time-bot.lastPlace<.6)return;
  const status=this.flowerPlacement(bot);if(!status.ready){this.event=status.message;return;}
  const f=this.flowers[status.index],piece=bot.held.shift();
  // A short assisted Box Tube extension centers the outlet; the piece still falls through the physical bore.
  this.release(piece,f.x,FLOWER.topBottom,f.z,vector());piece.flower=status.index;piece.lastAlliance=Math.floor(bot.id/2);bot.lastPlace=this.time;
  this.event='Placed through flower top · '+(piece.color===0?'pollen':piece.color===1?'red nectar':'blue nectar');
 }
 updateFlowers(){
  for(const f of this.flowers)f.held=[];
  for(const piece of this.pieces){if(!piece.active)continue;const p=piece.body.translation();
   if(piece.flower!=null){const f=this.flowers[piece.flower];if(Math.hypot(p.x-f.x,p.z-f.z)>FLOWER.topRadius+.015||p.y-piece.radius>FLOWER.top+.04)piece.flower=null;}
   if(piece.flower==null)for(let i=0;i<this.flowers.length;i++){
    const f=this.flowers[i];if(piece.lastY>=FLOWER.top&&p.y<FLOWER.top&&Math.hypot(p.x-f.x,p.z-f.z)<FLOWER.topRadius-piece.radius*.6){
     piece.flower=i;
     if(this.match&&this.elapsed<98&&piece.color&&piece.lastAlliance!=null){this.penalties[1-piece.lastAlliance]+=20;this.event='G410 · Early nectar: +20 to opponents';}
     break;
    }
   }
   if(piece.flower!=null)this.flowers[piece.flower].held.push(piece);
  }
  for(const f of this.flowers)f.held.sort((a,b)=>a.body.translation().y-b.body.translation().y);
 }
 retrieveFlower(bot){
  const p=bot.config,at=bot.body.translation(),h=heading(bot.body);
  if(bot.held.length>=Math.min(4,p.capacity)||this.time-bot.lastExtract<.3)return;
  for(const f of this.flowers){
   const piece=f.held[0];if(!piece||piece.color!==0||piece.body.translation().y>FLOWER.mid)continue;
   // The intake must face the open, field-facing bottom of the flower.
   for(const sign of p.intakeMount==='both'?[1,-1]:[p.intakeMount==='back'?-1:1]){
    const fx=Math.cos(h)*sign,fz=-Math.sin(h)*sign,dx=f.x-at.x,dz=f.z-at.z,ahead=dx*fx+dz*fz,across=-dx*fz+dz*fx;
    if(fx*f.nx+fz*f.nz>-.75||ahead<p.length/2||ahead>p.length/2+.16||Math.abs(across)>Math.min(.055,p.width*.35))continue;
    f.held.shift();this.capture(piece,bot.held);bot.lastExtract=this.time;this.event='Intake collected flower pollen';return;
   }
  }
 }
 loadNectar(){
  for(let a=0;a<2;a++){
   const available=!this.match||this.elapsed>=98?5:this.hives[a].tips;
   if(!this.reserve[a].length||this.loaded[a]>=available||this.time-this.lastLoad[a]<1)continue;
   const x=(a===0?-1:1)*1.72,z=(a===0?-1:1)*.9;
   if(this.bots.some(b=>b.present&&Math.hypot(b.body.translation().x-x,b.body.translation().z-z)<.4)||this.pieces.some(p=>p.active&&Math.hypot(p.body.translation().x-x,p.body.translation().z-z)<.13))continue;
   const piece=this.reserve[a].shift();this.release(piece,x,.046,z,vector());this.loaded[a]++;this.lastLoad[a]=this.time;
  }
 }
 interact(bot,intake,shoot,power,extract=false,place=false){
  const p=bot.config,at=bot.body.translation(),h=heading(bot.body),fx=Math.cos(h),fz=-Math.sin(h);
  if(intake>0){this.retrieveFlower(bot);if(bot.held.length<Math.min(4,p.capacity))for(const piece of this.pieces){if(!piece.active||piece.flower!=null||piece.waitForFloor||piece.color===2-Math.floor(bot.id/2))continue;const q=piece.body.translation(),dx=q.x-at.x,dz=q.z-at.z,ahead=dx*fx+dz*fz,side=-dx*fz+dz*fx;if(q.y<piece.radius+.025&&((p.intakeMount!=='back'&&ahead>p.length*.25&&ahead<p.length*.5+.15)||(p.intakeMount!=='front'&&p.intakeMount&&ahead< -p.length*.25&&ahead> -p.length*.5-.15))&&Math.abs(side)<p.width*(p.mechanism==='wide'?.68:.48)){this.capture(piece,bot.held);if(bot.held.length>=Math.min(4,p.capacity))break;}}}
  if(place){this.placeFlower(bot);return;}
  if(extract)this.retrieveFlower(bot); // Older replays/input clients remain compatible.
  if(intake<0&&bot.held.length&&this.time-bot.lastShot>.3){this.release(bot.held.shift(),at.x+fx*(p.length/2+.1),.10,at.z+fz*(p.length/2+.1),vector(fx*1.3,.1,fz*1.3));bot.lastShot=this.time;}
  if(!shoot||power<.12||!bot.held.length||this.time-bot.lastShot<p.cooldown)return;
  if(p.pollenOnly&&bot.held[0].color!==0){this.event='Pollen-only turret · eject nectar or use a Box Tube';return;}
  bot.lastShot=this.time;const piece=bot.held.shift();
  piece.lastAlliance=Math.floor(bot.id/2);
  if(p.mechanism==='lift'){this.release(piece,at.x+fx*.32,.68,at.z+fz*.32,vector(fx*.25,0,fz*.25));return;}
  const a=h+(isTurret(p)?bot.turret:0),pitch=bot.assisted?bot.aimPitch:(p.shotAngle+(bot.hood-.5)*35)*Math.PI/180,speed=bot.assisted?bot.aimSpeed:p.shotSpeed*power/.82,v=bot.body.linvel();
  this.release(piece,at.x+Math.cos(a)*(p.length/2+.08),at.y+.26,at.z-Math.sin(a)*(p.length/2+.08),vector(Math.cos(a)*Math.cos(pitch)*speed+v.x,Math.sin(pitch)*speed+v.y,-Math.sin(a)*Math.cos(pitch)*speed+v.z));
 }
 runAI(bot){
  const at=bot.body.translation(),radius=Math.hypot(bot.config.width,bot.config.length)/2+.02;let tx,tz,fire=false;
  if(!bot.held.length){let closest,best=Infinity;for(const piece of this.pieces){const p=piece.body.translation();if(!piece.active||piece.flower!=null||piece.waitForFloor||piece.color===2-Math.floor(bot.id/2)||p.y>.15||!clearForRobot(p,radius))continue;const d=Math.hypot(p.x-at.x,p.z-at.z);if(d<best){best=d;closest=p;}}if(!closest){this.drive(bot,0,0,0);return;}tx=closest.x;tz=closest.z;}
  else{tx=bot.id===1||bot.id===2?-.95:.95;tz=bot.id<2?1.1:-1.1;fire=Math.hypot(tx-at.x,tz-at.z)<.25;}
  if(!fire){
   if(!bot.path||this.time-(bot.pathAt??-1)>.75||Math.hypot(tx-(bot.targetX??99),tz-(bot.targetZ??99))>.2){bot.path=navigationPath(at,{x:tx,z:tz},radius);bot.pathAt=this.time;bot.targetX=tx;bot.targetZ=tz;}
   while(bot.path.length>1&&Math.hypot(bot.path[0].x-at.x,bot.path[0].z-at.z)<.15)bot.path.shift();
   if(bot.path.length){tx=bot.path[0].x;tz=bot.path[0].z;}else{this.drive(bot,0,0,0);return;}
  }
  const goal=fire?this.goal(Math.floor(bot.id/2)):vector(tx,0,tz),error=wrap(Math.atan2(-(goal.z-at.z),goal.x-at.x)-heading(bot.body));
  this.drive(bot,fire?0:clamp(Math.hypot(tx-at.x,tz-at.z)*1.4,0,.65)*Math.max(0,Math.cos(error)),0,clamp(-error*1.8));
  bot.hood=.5;bot.turret=0;bot.assisted=fire;this.interact(bot,1,fire&&Math.abs(error)<.12,fire?this.shotPower(bot):.82);
 }
 parked(bot){return robotInZone(bot.body.translation(),heading(bot.body),bot.config.length,bot.config.width,LOADING_ZONES[Math.floor(bot.id/2)]);}
 updateScoring(){
  this.updateFlowers();
  for(const b of this.bots)if(this.match&&this.elapsed<30){const p=b.body.translation(),a=heading(b.body),reach=Math.abs(Math.cos(a))*b.config.length/2+Math.abs(Math.sin(a))*b.config.width/2;b.left=b.id<2?p.x-reach> -1.825:p.x+reach<1.825;}
  for(const piece of this.pieces){if(!piece.active)continue;const p=piece.body.translation(),v=piece.body.linvel();
   if(p.y<=piece.radius+.004)piece.waitForFloor=false;piece.lastY=p.y;if(p.y<-.3||Math.abs(p.x)>3||Math.abs(p.z)>3)this.release(piece,clamp(p.x,-1.6,1.6),.12,clamp(p.z,-1.6,1.6),vector());
  }
  for(let i=0;i<2;i++){
   const h=this.hives[i],q=h.body.rotation();h.angle=2*Math.atan2(q.x,q.w);
   h.held=this.pieces.filter(p=>p.active&&cellContains(p.body.translation(),h.body.translation(),h.angle,h.side));
   if(!h.tipping&&hiveWillTip(hiveLoad(h.held))){
    for(const piece of h.held)piece.waitForFloor=true;
    h.tipping=true;h.target=-h.side;h.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);h.body.setAngvel(vector(-h.side*.12,0,0),true);this.event=(i===0?'Red':'Blue')+' hive tipping';
   }
   if(h.tipping){
    const w=h.body.angvel().x;
    if(h.angle*h.target>=29*Math.PI/180&&Math.abs(w)<.15){
     h.side=h.target;h.tipping=false;h.tips++;h.angle=h.side*HIVE_REST;
     h.body.setAngvel(vector(),true);h.body.setRotation(hiveRotation(h.angle),true);
     h.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);this.event=(i===0?'Red':'Blue')+' hive tip +20';
    }else if(Math.abs(h.angle)<29*Math.PI/180&&w*h.target<.12)h.body.setAngvel(vector(h.target*.12,0,0),true);
   }
  }
 }
 scoreBreakdown(final=this.match&&this.ended){
  if(this.finalBreakdown)return this.finalBreakdown;
  // TU06 10.5: only tips/flowers/penalties are live; end-state points wait for their assessment boundary.
  const rows=this.hives.map((h,a)=>({tips:h.tips*20,flowers:0,penalties:this.penalties[a],auto:0,hive:0,garden:0,park:0}));
  for(const f of this.flowers){const scored=f.held.filter(flowerScored),nectar=scored.filter(p=>p.color);if(nectar.length){rows[nectar.at(-1).color-1].flowers+=scored.length*2;rows[nectar[0].color-1].flowers+=5;}}
  if(this.match&&this.elapsed>=30)for(let a=0;a<2;a++)rows[a].auto=this.autoScore[a];
  if(final){
   for(let a=0;a<2;a++){const h=this.hives[a];rows[a].hive=this.pieces.filter(p=>p.active&&cellContains(p.body.translation(),h.body.translation(),h.angle,h.side)).length*2;}
   for(const b of this.bots)if(b.present&&(b.telePark??this.parked(b)))rows[Math.floor(b.id/2)].park+=5;
   for(const piece of this.pieces)if(piece.active&&piece.flower==null){const p=piece.body.translation();if(p.y<piece.radius+.02)for(let a=0;a<2;a++)if(ballInZone(p,piece.radius,GARDENS[a]))rows[a].garden++;}
  }
  return rows;
 }
 score(){return this.finalScore??this.scoreBreakdown().map(row=>Object.values(row).reduce((sum,n)=>sum+n,0));}
 step(force=false){
  if((this.paused&&!force)||this.ended)return;
  this.time+=STEP;const before=this.elapsed;if(this.match)this.elapsed=Math.min(158,this.elapsed+STEP);
  if(this.match&&before<30&&this.elapsed>=30)for(const b of this.bots){b.autoPark=b.present&&this.parked(b);if(b.present)this.autoScore[Math.floor(b.id/2)]+=(b.left?3:0)+(b.autoPark?5:0);}
  if(this.match&&before<158&&this.elapsed>=158)for(const b of this.bots)b.telePark=b.present&&this.parked(b);
  const transition=this.match&&this.elapsed>=30&&this.elapsed<38,finished=this.match&&this.elapsed>=158;
  if(!transition&&!finished){
   for(const bot of this.bots){if(!bot.present)continue;if(bot.id===0||this.networkSlots){const p=bot.config,remote=this.slotInputs[bot.id],input=this.match&&this.elapsed<30?{}:this.networkSlots?(remote&&this.time-remote.at<.5?remote.input:{}):this.input;
     if(input.shift&&!bot.shiftHeld&&p.drive==='butterfly')bot.traction=!bot.traction;bot.shiftHeld=!!input.shift;
     // Browser red station is on -X: forward is +X, right is +Z, independent of robot yaw.
     const drive=input.fieldRelative&&holonomic(p,bot.traction)?fieldDrive(-clamp(input.strafe)*(bot.id<2?1:-1),clamp(input.forward)*(bot.id<2?1:-1),heading(bot.body)):input;
     this.drive(bot,clamp(drive.forward),clamp(drive.strafe),clamp(input.turn));bot.assisted=false;bot.hood=clamp(input.elevation??.5,0,1);bot.turret=clamp(input.aim,-Math.PI,Math.PI);let power=clamp(input.power??.82,0,1.2);
     if(input.assist&&isTurret(p)){const at=bot.body.translation(),g=this.goal(Math.floor(bot.id/2));bot.turret=wrap(Math.atan2(-(g.z-at.z),g.x-at.x)-heading(bot.body));power=this.shotPower(bot);bot.turret=wrap(bot.aimBearing-heading(bot.body));bot.assisted=true;}
     this.interact(bot,input.eject?-1:input.intake?1:0,!!input.shoot,power,!!input.extract,!!input.place);
    }else if(this.ai&&this.match)this.runAI(bot);else this.drive(bot,0,0,0);
   }
  }
  this.world.step();this.updateScoring();if(!finished&&!transition)this.loadNectar();
  if(finished){this.input={};this.settling+=STEP;this.event='Time expired · waiting for pieces to settle';if(this.settling>=10||(this.settling>1&&!this.hives.some(h=>h.tipping)&&this.pieces.every(p=>!p.active||Math.hypot(...Object.values(p.body.linvel()))<.08))){this.ended=true;this.finalBreakdown=this.scoreBreakdown();this.finalScore=this.score();this.event='Match complete';}}
 }
 snapshot(){
  const a={time:this.time,elapsed:this.elapsed,match:this.match,ended:this.ended,seed:this.seed,resetId:this.resetId,phase:!this.match?'PRACTICE':this.ended?'FINISHED':this.match&&this.elapsed>=158?'SETTLING':this.elapsed<30?'AUTO':this.elapsed<38?'TRANSITION':this.elapsed<138?'TELEOP':'ENDGAME',remaining:!this.match?0:this.elapsed<30?30-this.elapsed:this.elapsed<38?38-this.elapsed:158-this.elapsed,rules:'TU06 · Oct 22, 2026',reserve:this.reserve.map(r=>r.length),penalties:this.penalties,score:this.score(),scoreBreakdown:this.scoreBreakdown(),event:this.event,ai:this.ai&&this.match&&!this.networkSlots,java:false,scenery:this.scenery,bots:this.bots.map(b=>({...transform(b.body),id:b.id,present:b.present,preset:b.preset,config:b.config,traction:b.traction,flower:this.flowerPlacement(b),liftActive:this.time-b.lastPlace<.6,wheelAngles:b.wheelAngles,held:b.held.map(p=>p.color),turret:b.turret,hood:b.hood,speed:Math.hypot(...Object.values(b.body.linvel()))})),pieces:this.pieces.filter(p=>p.active).map(p=>({...transform(p.body),id:p.id,color:p.color,radius:p.radius})),hives:this.hives.map(h=>({angle:h.angle,side:h.side,count:h.held.length,physical:true,geometry:'dsim-v2',pivot:hivePivot(this.hives.indexOf(h)),tipping:h.tipping,toTip:pollenToTip(h.held),tips:h.tips})),flowers:this.flowers.map(f=>({x:f.x,z:f.z,physical:true,held:f.held.map(p=>p.color),scored:f.held.filter(flowerScored).map(p=>p.color)}))};
  const p=this.bots[0].body.translation();return {type:'state',arena:a,sim:{paused:this.paused,stepRate:120,simTime:this.time},robot:{x:p.x/.0254,y:p.z/.0254,headingDeg:heading(this.bots[0].body)*180/Math.PI},opmode:{state:'IDLE',runtime:0,error:'',warning:''},battery:{volts:12.8},devices:[],telemetry:{lines:['Browser practice physics · 120 Hz','FTC Java runs in the desktop edition.']},panels:{lines:[]},dashboard:{lines:[]}};
 }
 send(m){
  if(m.type==='hello'){this.emit({type:'hello',sdkVersion:'Desktop only',repoName:'Browser drafts'});this.emit({type:'opmodes',list:[],build:{success:false,summary:'Java drafts only · run in the desktop edition'}});}
  else if(m.type==='sim.pause'){this.paused=!!m.paused;this.input={};this.clock.reset();}
  else if(m.type==='sim.step'){for(let i=0;i<Math.round(clamp(m.ms,0,1000)/1000/STEP);i++)this.step(true);}
  else if(m.type==='arena'){
   if(m.action==='input'){this.input={...m};return;}
   if(m.action==='reset'||m.action==='match')this.reset(m.seed??this.seed,m.action==='match',!!m.teleopOnly);
   if(m.action==='practice')this.reset(this.seed,false);
   if(m.action==='ai')this.ai=!!m.enabled;
   if(m.action==='preset'){const slot=clamp(m.slot,0,3)|0,preset=clamp(m.preset,0,this.presets.length-1)|0;this.selection[slot]=preset;this.custom[slot]=null;this.reset();}
   if(m.action==='customize'){const slot=clamp(m.slot,0,3)|0;this.custom[slot]=m.config?configureRobot(this.presets[this.selection[slot]],m.config):null;this.reset();}
   if(m.action==='tune'){const p=this.presets[this.selection[0]];p.mass=clamp(m.mass,5,25);p.speed=clamp(m.speed,.5,4);p.shotSpeed=clamp(m.shotSpeed,2,12);this.reset();}
  }else if(m.type==='opmode.init'||m.type==='opmode.start'||m.type==='code.reload'){this.emit({type:'toast',text:'FTC Java execution requires the desktop edition.',level:'error'});return;}
  else if(m.type==='opmode.stop')this.input={};else return;
  this.publish();
 }
 advance(elapsed){
  if(this.paused||this.ended){this.clock.reset();return 0;}
  const steps=this.clock.advance(elapsed,()=>this.step());
  if(steps)this.publish();return steps;
 }
 start(){
  let previous=performance.now();this.running=true;
  const frame=now=>{if(!this.running)return;const elapsed=(now-previous)/1000;previous=now;if(!document.hidden)this.advance(elapsed);else{this.clock.reset();this.input={};}this.frameId=requestAnimationFrame(frame);};
  this.frameId=requestAnimationFrame(frame);
 }
 dispose(){this.running=false;if(this.frameId)cancelAnimationFrame(this.frameId);this.world.free();this.listeners.clear();}
}
