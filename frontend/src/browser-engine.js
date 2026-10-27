import RAPIER from '@dimforge/rapier3d-compat';
import {FixedClock} from './motion.js';

const clamp=(n,a=-1,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const vector=(x=0,y=0,z=0)=>({x,y,z});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const heading=b=>{const q=b.rotation();return Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));};
const transform=b=>{const p=b.translation(),q=b.rotation();return {p:[p.x,p.y,p.z],q:[q.x,q.y,q.z,q.w]};};
const isTurret=p=>['turret','wide'].includes(p.mechanism);
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
 constructor(presets){this.clock=new FixedClock(STEP);this.presets=structuredClone(presets);this.selection=[0,5,6,2];this.ai=true;this.paused=false;this.listeners=new Set();this.input={};this.resetId=0;this.reset(6829);}
 subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 emit(message){for(const listener of this.listeners)listener(message);}
 publish(){this.emit(this.snapshot());}
 reset(seed=this.seed,match=false,teleopOnly=false){
  this.clock.reset();
  this.world?.free();this.world=new RAPIER.World(vector(0,-9.81,0));this.world.timestep=STEP;
  this.seed=seed|0;this.time=0;this.elapsed=teleopOnly?38:0;this.match=match;this.ended=false;this.resetId++;this.input={};
  this.bots=[];this.pieces=[];this.scenery=[];this.flowers=[];this.hives=[];this.event='Field ready';
  let randomState=this.seed>>>0;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  const box=(x,y,z,sx,sy,sz,color,visible=true)=>{this.world.createCollider(RAPIER.ColliderDesc.cuboid(sx/2,sy/2,sz/2).setTranslation(x,y,z).setFriction(.7));if(visible)this.scenery.push({p:[x,y,z],s:[sx,sy,sz],color});};
  box(0,-.055,0,3.8,.1,3.8,'#747b80',false);
  for(const side of [-1,1]){box(side*1.8538,.155,0,.05,.31,3.76,'#aaa',false);box(0,.155,side*1.8538,3.76,.31,.05,'#aaa',false);}
  for(const z of [-.61,.61]){box(0,.019,z,.99,.038,.037,'#adb5bf');for(const x of [-.45,.45])box(x,.4,z,.034,.8,.034,'#adb5bf');box(0,.82,z,.93,.03,.035,'#adb5bf');}
  box(0,1.116,0,.035,.035,1.26,'#cbd0d4');
  for(let i=0;i<2;i++){
   const side=i===0?1:-1,hive={side,angle:side*.52,target:side*.52,tips:0,cooldown:0,held:[]};
   hive.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1.116,i===0?.30:-.30).setRotation({x:0,y:0,z:Math.sin(hive.angle/2),w:Math.cos(hive.angle/2)}));
   const cup=(x,y,z,sx,sy,sz)=>this.world.createCollider(RAPIER.ColliderDesc.cuboid(sx/2,sy/2,sz/2).setTranslation(x,y,z),hive.body);
   for(const s of [-1,1]){cup(s*.29,0,0,.32,.018,.51);cup(s*.45,.08,0,.015,.16,.51);for(const z of [-.25,.25])cup(s*.29,.08,z,.32,.16,.013);}
   this.hives.push(hive);
  }
  for(const [x,z] of [[-1.77,.61],[-.61,-1.77],[1.77,-.61],[.61,1.77]]){this.flowers.push({x,z,held:[]});for(let k=0;k<4;k++)box(x+Math.cos(k*Math.PI/2)*.065,.273,z+Math.sin(k*Math.PI/2)*.065,.012,.546,.012,'#d8d8cf');}
  for(let i=0;i<72;i++){let x=random()*3.1-1.55,z=random()*2.7-1.35;if(Math.abs(x)<.65&&Math.abs(z)<.72)x=x<0?-.8:.8;this.addPiece(i<56?0:i<64?1:2,x,.1+random()*.1,z);}
  const starts=[[.95,1.40,Math.PI/2],[-.95,1.40,Math.PI/2],[-.95,-1.40,-Math.PI/2],[.95,-1.40,-Math.PI/2]];
  for(let id=0;id<4;id++){
   const preset=this.selection[id],p=this.presets[preset],[x,z,h]=starts[id];
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,.115,z).setRotation({x:0,y:Math.sin(h/2),z:0,w:Math.cos(h/2)}).setLinearDamping(.08).setAngularDamping(.5).setCanSleep(false).setCcdEnabled(true));
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(p.length/2,.10,p.width/2).setMass(p.mass).setFriction(.08).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.05),body);
   const bot={id,preset,body,held:[],turret:0,hood:.5,lastShot:-2,left:false,autoPark:false};this.bots.push(bot);
   for(const color of [0,0,id<2?1:2])this.capture(this.addPiece(color,x,.15,z),bot.held);
  }
 }
 addPiece(color,x,y,z){
  const radius=color===0?.0356:.045,mass=color===0?.025:.05;
  const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setLinearDamping(.25).setAngularDamping(.3).setCcdEnabled(true));
  this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setMass(mass).setFriction(.55).setRestitution(.25),body);
  const piece={id:this.pieces.length,color,radius,mass,body,active:true,lastY:y};this.pieces.push(piece);return piece;
 }
 capture(piece,held){piece.active=false;piece.body.setEnabled(false);held.push(piece);}
 release(piece,x,y,z,velocity){piece.active=true;piece.body.setTranslation(vector(x,y,z),true);piece.body.setLinvel(velocity,true);piece.body.setAngvel(vector(),true);piece.body.setEnabled(true);piece.lastY=y;}
 goal(alliance){return vector(this.hives[alliance].side*.28,1.40,alliance===0?.30:-.30);}
 drive(bot,forward,strafe,turn){
  const p=this.presets[bot.preset],at=bot.body.translation();if(at.y>.19)return;
  if(p.drive==='tank')strafe=0;
  const magnitude=Math.max(1,Math.hypot(forward,strafe));forward/=magnitude;strafe/=magnitude;
  const h=heading(bot.body),v=bot.body.linvel(),mass=bot.body.mass();
  const dx=(Math.cos(h)*forward+Math.sin(h)*strafe)*p.speed,dz=(-Math.sin(h)*forward+Math.cos(h)*strafe)*p.speed;
  // Traction-limited acceleration and stronger neutral braking, in SI units.
  const braking=Math.hypot(forward,strafe)<.01,ax=(dx-v.x)*(braking?14:10),az=(dz-v.z)*(braking?14:10);
  const limit=braking?9:7,scale=Math.min(1,limit/Math.max(.001,Math.hypot(ax,az)));
  bot.body.applyImpulse(vector(ax*scale*mass*STEP,0,az*scale*mass*STEP),true);
  const inertia=mass*(p.length*p.length+p.width*p.width)/12;
  const av=bot.body.angvel();bot.body.applyTorqueImpulse(vector(0,clamp((-turn*3.2-av.y)*14,-18,18)*inertia*STEP,0),true);
 }
 shotPower(bot){const p=this.presets[bot.preset],at=bot.body.translation(),goal=this.goal(Math.floor(bot.id/2));const d=Math.max(.2,Math.hypot(goal.x-at.x,goal.z-at.z)-p.length/2-.08),angle=(p.shotAngle+(bot.hood-.5)*35)*Math.PI/180,denom=2*Math.cos(angle)**2*(d*Math.tan(angle)-(goal.y-(at.y+.26)));return denom>0?clamp(Math.sqrt(9.81*d*d/denom)*1.06/p.shotSpeed*.82,.12,1.2):.82;}
 interact(bot,intake,shoot,power,extract=false){
  const p=this.presets[bot.preset],at=bot.body.translation(),h=heading(bot.body),fx=Math.cos(h),fz=-Math.sin(h);
  if(intake>0&&bot.held.length<p.capacity)for(const piece of this.pieces){if(!piece.active)continue;const q=piece.body.translation(),dx=q.x-at.x,dz=q.z-at.z,ahead=dx*fx+dz*fz,side=-dx*fz+dz*fx;if(q.y<.15&&ahead>p.length*.25&&ahead<p.length*.5+.15&&Math.abs(side)<p.width*(p.mechanism==='wide'?.68:.48)){this.capture(piece,bot.held);if(bot.held.length>=p.capacity)break;}}
  if(extract)for(const f of this.flowers)if(f.held[0]?.color===0&&Math.hypot(f.x-at.x,f.z-at.z)<.38){this.release(f.held.shift(),at.x+fx*.28,.10,at.z+fz*.28,vector(fx*.4,0,fz*.4));this.event='Pollen released from flower';break;}
  if(intake<0&&bot.held.length&&this.time-bot.lastShot>.3){this.release(bot.held.shift(),at.x+fx*(p.length/2+.1),.10,at.z+fz*(p.length/2+.1),vector(fx*1.3,.1,fz*1.3));bot.lastShot=this.time;}
  if(!shoot||power<.12||!bot.held.length||this.time-bot.lastShot<p.cooldown)return;
  bot.lastShot=this.time;const piece=bot.held.shift();
  if(p.mechanism==='lift'){this.release(piece,at.x+fx*.32,.68,at.z+fz*.32,vector(fx*.25,0,fz*.25));return;}
  const a=h+(isTurret(p)?bot.turret:0),pitch=(p.shotAngle+(bot.hood-.5)*35)*Math.PI/180,speed=p.shotSpeed*power/.82,v=bot.body.linvel();
  this.release(piece,at.x+Math.cos(a)*(p.length/2+.08),at.y+.26,at.z-Math.sin(a)*(p.length/2+.08),vector(Math.cos(a)*Math.cos(pitch)*speed+v.x,Math.sin(pitch)*speed+v.y,-Math.sin(a)*Math.cos(pitch)*speed+v.z));
 }
 runAI(bot){
  const at=bot.body.translation();let tx,tz,fire=false;
  if(!bot.held.length){let closest,best=Infinity;for(const piece of this.pieces){const p=piece.body.translation();if(!piece.active||piece.color===2-Math.floor(bot.id/2)||p.y>.15)continue;const d=Math.hypot(p.x-at.x,p.z-at.z);if(d<best){best=d;closest=p;}}if(!closest){this.drive(bot,0,0,0);return;}tx=closest.x;tz=closest.z;}
  else{tx=bot.id===1||bot.id===2?-.95:.95;tz=bot.id<2?1.1:-1.1;fire=Math.hypot(tx-at.x,tz-at.z)<.25;}
  const goal=fire?this.goal(Math.floor(bot.id/2)):vector(tx,0,tz),error=wrap(Math.atan2(-(goal.z-at.z),goal.x-at.x)-heading(bot.body));
  this.drive(bot,fire?0:clamp(Math.hypot(tx-at.x,tz-at.z)*1.4,0,.65)*Math.max(0,Math.cos(error)),0,clamp(-error*1.8));
  bot.hood=.95;bot.turret=0;this.interact(bot,1,fire&&Math.abs(error)<.12,fire?this.shotPower(bot):.82);
 }
 parked(bot){const p=bot.body.translation();return bot.id<2?p.z>1.50&&p.x> -1.22&&p.x<-.61:p.z< -1.50&&p.x>.61&&p.x<1.22;}
 updateScoring(){
  for(const b of this.bots)if(this.match&&this.elapsed<30&&(b.id<2?b.body.translation().z<1.18:b.body.translation().z> -1.18))b.left=true;
  for(const piece of this.pieces){if(!piece.active)continue;const p=piece.body.translation(),v=piece.body.linvel();
   for(let i=0;i<2&&piece.active;i++){const g=this.goal(i);if(v.y<0&&piece.lastY>=g.y&&p.y<g.y&&Math.abs(p.x-g.x)<.16&&Math.abs(p.z-g.z)<.254){this.capture(piece,this.hives[i].held);this.event=`${i===0?'Red':'Blue'} hive caught ${piece.color===0?'pollen':'nectar'}`;}}
   for(const f of this.flowers)if(piece.active&&v.y<0&&piece.lastY>=.546&&p.y<.546&&Math.hypot(p.x-f.x,p.z-f.z)<.051){this.capture(piece,f.held);this.event='Flower scored';}
   piece.lastY=p.y;if(p.y<-.3||Math.abs(p.x)>3||Math.abs(p.z)>3)this.release(piece,clamp(p.x,-1.6,1.6),.12,clamp(p.z,-1.6,1.6),vector());
  }
  for(let i=0;i<2;i++){const h=this.hives[i];if(h.held.reduce((s,p)=>s+p.mass,0)>=.16&&this.time>h.cooldown){h.side*=-1;h.target=h.side*.52;h.tips++;h.cooldown=this.time+1.2;for(const p of h.held)this.release(p,-h.side*.42,.95,i===0?.30:-.30,vector(-h.side*.8,-.3,(p.id%3-1)*.2));h.held=[];this.event=`${i===0?'Red':'Blue'} hive tip +20`;}
   h.angle+=(h.target-h.angle)*Math.min(1,STEP*5);h.body.setNextKinematicRotation({x:0,y:0,z:Math.sin(h.angle/2),w:Math.cos(h.angle/2)});
  }
 }
 score(){const score=this.hives.map(h=>h.tips*20+h.held.length*2);for(const f of this.flowers){const nectar=f.held.filter(p=>p.color);if(nectar.length){score[nectar.at(-1).color-1]+=f.held.length*2;score[nectar[0].color-1]+=5;}}for(const b of this.bots)score[Math.floor(b.id/2)]+=(b.left?3:0)+(b.autoPark?5:0)+(this.parked(b)?5:0);for(const piece of this.pieces)if(piece.active){const p=piece.body.translation();if(p.y<.1&&p.x>1.7&&p.z>1.22)score[0]++;if(p.y<.1&&p.x< -1.7&&p.z< -1.22)score[1]++;}return score;}
 step(force=false){
  if((this.paused&&!force)||this.ended)return;
  this.time+=STEP;const before=this.elapsed;if(this.match)this.elapsed=Math.min(158,this.elapsed+STEP);
  if(this.match&&before<30&&this.elapsed>=30)for(const b of this.bots)b.autoPark=this.parked(b);
  const transition=this.match&&this.elapsed>=30&&this.elapsed<38;
  if(!transition){
   for(const bot of this.bots){if(bot.id===0){const p=this.presets[bot.preset],input=this.match&&this.elapsed<30?{}:this.input;
     this.drive(bot,clamp(input.forward),clamp(input.strafe),clamp(input.turn));bot.hood=clamp(input.elevation??.5,0,1);bot.turret=clamp(input.aim,-Math.PI,Math.PI);let power=clamp(input.power??.82,0,1.2);
     if(input.assist&&isTurret(p)){const at=bot.body.translation(),g=this.goal(0);bot.turret=wrap(Math.atan2(-(g.z-at.z),g.x-at.x)-heading(bot.body));bot.hood=.95;power=this.shotPower(bot);}
     this.interact(bot,input.eject?-1:input.intake?1:0,!!input.shoot,power,!!input.extract);
    }else if(this.ai)this.runAI(bot);else this.drive(bot,0,0,0);
   }
   this.world.step();this.updateScoring();
  }
  if(this.match&&this.elapsed>=158){this.ended=true;this.input={};for(const b of this.bots){b.body.setLinvel(vector(),true);b.body.setAngvel(vector(),true);}this.event='Match complete';}
 }
 snapshot(){
  const a={time:this.time,elapsed:this.elapsed,match:this.match,ended:this.ended,seed:this.seed,resetId:this.resetId,phase:!this.match?'PRACTICE':this.ended?'FINISHED':this.elapsed<30?'AUTO':this.elapsed<38?'TRANSITION':this.elapsed<138?'TELEOP':'ENDGAME',remaining:!this.match?0:this.elapsed<30?30-this.elapsed:this.elapsed<38?38-this.elapsed:158-this.elapsed,score:this.score(),event:this.event,ai:this.ai,java:false,scenery:this.scenery,bots:this.bots.map(b=>({...transform(b.body),id:b.id,preset:b.preset,held:b.held.map(p=>p.color),turret:b.turret,hood:b.hood,speed:Math.hypot(...Object.values(b.body.linvel()))})),pieces:this.pieces.filter(p=>p.active).map(p=>({...transform(p.body),id:p.id,color:p.color,radius:p.radius})),hives:this.hives.map(h=>({angle:h.angle,side:h.side,count:h.held.length,tips:h.tips})),flowers:this.flowers.map(f=>({x:f.x,z:f.z,held:f.held.map(p=>p.color)}))};
  const p=this.bots[0].body.translation();return {type:'state',arena:a,sim:{paused:this.paused,stepRate:120,simTime:this.time},robot:{x:p.x/.0254,y:p.z/.0254,headingDeg:heading(this.bots[0].body)*180/Math.PI},opmode:{state:'IDLE',runtime:0,error:'',warning:''},battery:{volts:12.8},devices:[],telemetry:{lines:['Browser practice physics · 120 Hz','FTC Java runs in the desktop edition.']},panels:{lines:[]},dashboard:{lines:[]}};
 }
 send(m){
  if(m.type==='hello'){this.emit({type:'hello',sdkVersion:'Desktop only',repoName:'Browser drafts'});this.emit({type:'opmodes',list:[],build:{success:false,summary:'Java drafts only · run in the desktop edition'}});}
  else if(m.type==='sim.pause'){this.paused=!!m.paused;this.input={};this.clock.reset();}
  else if(m.type==='sim.step'){for(let i=0;i<Math.round(clamp(m.ms,0,1000)/1000/STEP);i++)this.step(true);}
  else if(m.type==='arena'){
   if(m.action==='input'){this.input={...m};return;}
   if(m.action==='reset'||m.action==='match')this.reset(m.seed??this.seed,m.action==='match',!!m.teleopOnly);
   if(m.action==='practice'){this.match=false;this.ended=false;this.elapsed=0;}
   if(m.action==='ai')this.ai=!!m.enabled;
   if(m.action==='preset'){const slot=clamp(m.slot,0,3)|0,preset=clamp(m.preset,0,this.presets.length-1)|0;this.selection[slot]=preset;this.reset();}
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
