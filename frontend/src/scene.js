import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {createHiveField} from './hive-view.js';
import {createFlowerField} from './flower-view.js';
import {LOADING_ZONES,GARDENS} from './field-rules.js';
import {PoseTrack,dampFactor,angleDelta} from './motion.js';

const palette={red:0xd92d44,blue:0x2866df,metal:0x8b9098,dark:0x202128,yellow:0xf0ce35};
function material(color){return new THREE.MeshLambertMaterial({color,flatShading:true});}
const ballMats=[0xf3ce2b,0xdd3044,0x3070e6].map(color=>new THREE.MeshBasicMaterial({color}));
const mats=new Map();
function mat(color){if(!mats.has(color))mats.set(color,material(color));return mats.get(color);}
const outlineMaterial=new THREE.LineBasicMaterial({color:0x101114,transparent:true,opacity:.50});
function box(group,x,y,z,w,h,d,color){const geometry=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(w*h*d>.0001&&w<5&&d<5){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),outlineMaterial);m.add(edges);}group.add(m);return m;}
function cylinder(group,x,y,z,radius,height,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,20),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function line(group,points,color){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color}));group.add(l);return l;}
function textSprite(text,color='#d5e2e8',size=.17){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.font='600 52px sans-serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,66);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true}));s.scale.set(size*5.12,size,1);return s;}
function numberPlate(group,number,color,z){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,128);ctx.fillStyle='#fff';ctx.font='bold 68px sans-serif';ctx.textAlign='center';ctx.fillText(number,128,89);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.18,.085),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));mesh.position.set(0,.02,z);if(z<0)mesh.rotation.y=Math.PI;group.add(mesh);}

export function robotModel(p,id=0){
 const group=new THREE.Group(),color=id<2?palette.red:palette.blue,w=p.width,l=p.length,wheels=[];
 // A readable silhouette: bumper, hopper, four pods and a single launcher assembly.
 box(group,0,-.015,0,l,.09,w,color);
 box(group,0,.04,0,l*.9,.025,w*.9,0x96989c);
 for(const z of [-w/2,w/2])for(const x of p.drive==='tank'?[-l*.34,0,l*.34]:[-l*.33,l*.33]){
  const pod=new THREE.Group();pod.position.set(x,-.043,z);group.add(pod);
  const tire=box(pod,0,0,0,.095,.095,.035,0x1b1b1e);
  if(p.drive==='xdrive')pod.rotation.y=Math.sign(x*z)*Math.PI/4;
  if(p.drive==='mecanum'||p.drive==='butterfly'){const stripe=box(pod,0,0,z>0?.019:-.019,.065,.012,.003,0x74777b);stripe.rotation.z=Math.sign(x*z)*Math.PI/4;}
  wheels.push(pod);
 }
 const hopper=new THREE.Group();group.add(hopper);
 box(hopper,-l*.12,.1,0,l*.53,.035,w*.65,0xbeb673);
 for(const z of [-w*.33,w*.33])box(hopper,-l*.12,.16,z,l*.56,.13,.014,0xc3b878);
 box(hopper,-l*.4,.16,0,.014,.13,w*.67,0xc3b878);
 const shooter=new THREE.Group();shooter.position.set(l*.14,.16,0);group.add(shooter);
 if(['turret','wide','twin-turret'].includes(p.mechanism))cylinder(shooter,0,0,0,w*.26,.03,0x686a6e);
 if(p.mechanism!=='lift')for(const z of p.mechanism==='twin-turret'?[-w*.2,w*.2]:[0]){
  const launcher=box(shooter,.025,.06,z,l*.35,.085,p.mechanism==='twin-turret'?w*.24:w*.47,0x44464b);launcher.rotation.z=.45;
  box(shooter,-.015,.11,z,l*.22,.018,p.mechanism==='twin-turret'?w*.26:w*.5,0xb7babd);
 }
 if(p.intakeMount!=='back')box(group,l/2+.025,-.015,0,.055,.055,w*.82,0xe2bd36);
 if(['back','both'].includes(p.intakeMount))box(group,-l/2-.025,-.015,0,.055,.055,w*.82,0xe2bd36);
 const lift=new THREE.Group();group.add(lift);
 if(p.lift||p.mechanism==='lift'){
  const mount=p.liftMount==='back'?-1:1;
  box(lift,mount*(l*.39),.20,0,.025,.38,.035,0xb0b1b7);
  box(lift,mount*(l*.5+.06),.36,0,.13,.09,.115,0xc5b56d);
 }
 const cargo=new THREE.Group();cargo.position.set(-l*.16,.19,0);group.add(cargo);
 for(let i=0;i<4;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.031,16,10),ballMats[0]);ball.position.set((i%2)*.065-.032,0,Math.floor(i/2)*.065-.032);cargo.add(ball);}
 for(const z of [-w/2-.021,w/2+.021])numberPlate(group,['R1','R2','B1','B2'][id],id<2?'#d92d44':'#2866df',z);
 const tag=textSprite(id===0?'YOU':['R1','R2','B1','B2'][id],id===0?'#f3d53d':id<2?'#ff6c7d':'#75a3ff',.075);tag.position.y=p.lift||p.mechanism==='lift'?.56:.4;group.add(tag);
 group.userData={shooter,wheels,cargo,lift,preset:p};return group;
}

export function createScene(container,presets,onFps,onFrame=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;container.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#101114');scene.fog=new THREE.Fog('#101114',30,70);
 const camera=new THREE.PerspectiveCamera(48,1,.02,80);camera.position.set(0,4.1,4.3);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.14,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=1.7;controls.maxDistance=11;controls.maxPolarAngle=Math.PI*.48;
 scene.add(new THREE.HemisphereLight(0xffffff,0x85858a,.95));const sun=new THREE.DirectionalLight(0xffffff,.8);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});sun.shadow.bias=-.0002;sun.shadow.normalBias=.015;scene.add(sun);
 const ground=box(scene,0,-.14,0,200,.12,200,0x101114);ground.receiveShadow=true;
 const field=new THREE.Group();scene.add(field);
 const tiles=new THREE.Group();field.add(tiles);
 box(tiles,0,-.018,0,3.6576,.03,3.6576,0x42434a);
 for(let i=1;i<6;i++){const n=-1.8288+i*.6096;line(tiles,[[n,-.002,-1.8288],[n,-.002,1.8288]],0x3d3e44);line(tiles,[[-1.8288,-.002,n],[1.8288,-.002,n]],0x3d3e44);}
 for(let side of [-1,1]){
   box(field,0,.317,side*1.853,3.76,.012,.018,0xb9c3c6);box(field,side*1.853,.317,0,.018,.012,3.76,0xb9c3c6);
   for(let a=-1.8;a<1.9;a+=.6){box(field,a,.16,side*1.856,.012,.31,.012,0x8a989e);box(field,side*1.856,.16,a,.012,.31,.012,0x8a989e);}
   const wallMaterial=new THREE.MeshBasicMaterial({color:0xb8ced8,transparent:true,opacity:.05,depthWrite:false});
   for(let axis of ['x','z']){const panel=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?.012:3.65,.29,axis==='x'?3.65:.012),wallMaterial);panel.position.set(axis==='x'?side*1.84:0,.16,axis==='z'?side*1.84:0);field.add(panel);}
 }
 // Alliance tape and loading zones use FTC field coordinates, converted to Y-up.
 const legacyZones=new THREE.Group();scene.add(legacyZones);
 for(const side of [-1,1]){const col=side===1?palette.red:palette.blue;
   box(legacyZones,0,.003,side*1.50,3.62,.006,.015,col);
   const x=side===1?-.914:.914,z=side*1.68;
   line(legacyZones,[[x-.305,.007,z-side*.14],[x+.305,.007,z-side*.14],[x+.305,.007,side*1.82],[x-.305,.007,side*1.82],[x-.305,.007,z-side*.14]],col);
   const label=textSprite(side===1?'RED ALLIANCE':'BLUE ALLIANCE',side===1?'#e9949b':'#94bce8',.11);label.position.set(0,.02,side*2.04);legacyZones.add(label);
 }
 const centerLabel=textSprite('BIOBUZZ','#aab6b9',.19);centerLabel.position.set(.1,.012,0);centerLabel.material.opacity=.33;field.add(centerLabel);
 const scenery=new THREE.Group();scene.add(scenery);
 const robots=new Map(),balls=new Map(),hives=[],flowerBalls=new THREE.Group();scene.add(flowerBalls);
 for(let a=0;a<2;a++){
   const group=new THREE.Group();group.position.set(0,1.116,a===0?.30:-.30);scene.add(group);hives.push(group);group.userData.backWalls=[];
   const col=a===0?palette.red:palette.blue;
   box(group,0,0,0,.80,.035,.034,col);
   for(const s of [-1,1]){
     box(group,s*.29,.0,0,.32,.018,.51,col);
     for(const z of [-.25,.25])box(group,s*.29,.08,z,.32,.16,.013,col);
     const wall=box(group,s*.13,.08,0,.015,.16,.51,col);group.userData.backWalls.push({wall,side:s});
     const tag=box(group,s*.29,-.018,0,.08,.006,.08,0xe9ecea);box(group,s*.29,-.023,0,.055,.004,.055,0x202930);
   }
 }
 const dsimHive=createHiveField();scene.add(dsimHive.group);dsimHive.group.visible=false;
 const legacyFlowers=new THREE.Group();scene.add(legacyFlowers);
 for(const [x,z]of[[-1.77,.61],[-.61,-1.77],[1.77,-.61],[.61,1.77]]){
   for(const y of [.13,.29,.546]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.061,.009,8,32),mat(0xe6d979));ring.rotation.x=Math.PI/2;ring.position.set(x,y,z);legacyFlowers.add(ring);}
 }
 const flowerField=createFlowerField();scene.add(flowerField);flowerField.visible=false;
 const officialZones=new THREE.Group();scene.add(officialZones);officialZones.visible=false;
 for(let a=0;a<2;a++)for(const zone of [LOADING_ZONES[a],GARDENS[a]])line(officialZones,[[zone.x0,.01,zone.z0],[zone.x1,.01,zone.z0],[zone.x1,.01,zone.z1],[zone.x0,.01,zone.z1],[zone.x0,.01,zone.z0]],a===0?palette.red:palette.blue);
 for(let a=0;a<2;a++){const label=textSprite(a===0?'RED ALLIANCE':'BLUE ALLIANCE',a===0?'#e9949b':'#94bce8',.11);label.position.set(a===0?-2.1:2.1,.02,0);officialZones.add(label);}
 const trailPoints=[];let trail=null,trailVisible=false,lastReset=-1,state=null,mode='driver',presentation='game',fpsFrames=0,fpsStart=performance.now(),lastStamp=performance.now(),flowerSignature='';
 const cameraGoal=new THREE.Vector3(),lookGoal=new THREE.Vector3(),look=new THREE.Vector3(0,.14,0),offset=new THREE.Vector3(),samplePosition=[0,0,0],qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
 let followHeading=0,zoom=1,cameraSnap=true;
 const hiveTracks=hives.map(()=>new PoseTrack());
 const ballGeometry=[new THREE.SphereGeometry(.03556,16,10),new THREE.SphereGeometry(.04572,16,10)];
 const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(['broadcast','top','driver'].includes(mode))setCamera(mode);};new ResizeObserver(resize).observe(container);resize();
 function disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}else if(o.isLine&&o.material!==outlineMaterial)o.material.dispose();});group.removeFromParent();}
 function update(s,{snap=false}={}){
   const stamp=performance.now(),reset=lastReset!==s.resetId;state=s;const measured=s.hives[0]?.geometry==='dsim-v2';dsimHive.group.visible=measured;hives.forEach(h=>h.visible=!measured);if(reset){lastReset=s.resetId;cameraSnap=true;while(scenery.children.length)disposeGroup(scenery.children[0]);
     for(const o of s.scenery){if(o.s[1]===.1||o.p[1]===.155)continue;box(scenery,...o.p,...o.s,o.color);}trailPoints.length=0;if(trail){disposeGroup(trail);trail=null;}for(const model of robots.values())model.userData.initialized=false;
   }
   for(const b of s.bots){const config=b.config||presets[b.preset],signature=JSON.stringify(config);let model=robots.get(b.id);if(!model||model.userData.signature!==signature){if(model)disposeGroup(model);model=robotModel(config,b.id);model.userData.signature=signature;model.userData.presetIndex=b.preset;scene.add(model);robots.set(b.id,model);}
     model.userData.track??=new PoseTrack();model.userData.track.push(b.p,b.q,s.time,stamp,snap||reset||!model.userData.initialized);model.userData.initialized=true;
     model.userData.speed=b.speed;model.userData.cargo.children.forEach((ball,i)=>{ball.visible=i<b.held.length;if(ball.visible)ball.material=ballMats[b.held[i]];});
     if(['turret','wide','twin-turret'].includes(config.mechanism))model.userData.shooter.rotation.y=b.turret;
     if(config.drive==='swerve')model.userData.wheels.forEach((wheel,i)=>wheel.rotation.y=-(b.wheelAngles?.[i]||0));model.userData.lift.position.y=b.liftActive?.15:0;
   }
   const visible=new Set(s.pieces.map(p=>p.id));for(const [id,ball]of balls){if(!visible.has(id))ball.visible=false;}
   for(const p of s.pieces){let ball=balls.get(p.id);if(!ball){ball=new THREE.Mesh(ballGeometry[p.color===0?0:1],ballMats[p.color]);ball.castShadow=true;ball.userData.track=new PoseTrack();scene.add(ball);balls.set(p.id,ball);}ball.userData.track.push(p.p,p.q,s.time,stamp,snap||reset||!ball.visible);ball.visible=true;ball.material=ballMats[p.color];ball.geometry=ballGeometry[p.color===0?0:1];}
   s.hives.forEach((h,i)=>{hiveTracks[i].push([h.angle,0,0],[0,0,0,1],s.time,stamp,snap||reset);for(const {wall,side}of hives[i].userData.backWalls)wall.position.x=side*(h.physical?.13:.45);});
   const physicalFlowers=!!s.flowers[0]?.physical;flowerField.visible=physicalFlowers;legacyFlowers.visible=!physicalFlowers;officialZones.visible=physicalFlowers;legacyZones.visible=!physicalFlowers;flowerBalls.visible=!physicalFlowers;
   const signature=physicalFlowers?'physical':JSON.stringify(s.flowers.map(f=>f.held));
   if(signature!==flowerSignature||reset){flowerSignature=signature;flowerBalls.clear();s.flowers.forEach(f=>f.held.slice(0,8).forEach((color,i)=>{const ball=new THREE.Mesh(ballGeometry[color===0?0:1],ballMats[color]);ball.position.set(f.x,.10+f.held.slice(0,i).reduce((sum,c)=>sum+(c===0?.07112:.09144),0)+(color===0?.03556:.04572),f.z);flowerBalls.add(ball);}));}
   const p=s.bots[0].p;if(trailVisible&&(!trailPoints.length||Math.hypot(p[0]-trailPoints.at(-1)[0],p[2]-trailPoints.at(-1)[2])>.025)){trailPoints.push([p[0],.012,p[2]]);if(trailPoints.length>700)trailPoints.shift();if(trail)disposeGroup(trail);trail=line(scene,trailPoints,0xb5df83);}
 }
 function setCamera(value){mode=value;controls.enabled=value==='orbit'&&presentation==='game';if(value==='orbit'){controls.target.copy(look);controls.update();}}
 renderer.domElement.addEventListener('wheel',e=>{if(mode==='orbit'||presentation!=='game')return;e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.65,1.65);},{passive:false});
 const fingers=new Map();let pinchDistance=0;
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||mode==='orbit')return;fingers.set(e.pointerId,[e.clientX,e.clientY]);renderer.domElement.setPointerCapture(e.pointerId);pinchDistance=0;});
 renderer.domElement.addEventListener('pointermove',e=>{if(!fingers.has(e.pointerId))return;fingers.set(e.pointerId,[e.clientX,e.clientY]);if(fingers.size!==2)return;const [a,b]=[...fingers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinchDistance>0&&distance>0)zoom=THREE.MathUtils.clamp(zoom*pinchDistance/distance,.65,1.65);pinchDistance=distance;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{fingers.delete(e.pointerId);pinchDistance=0;});
 function pose(object,stamp){const t=object.userData.track;if(!t?.ready)return;object.position.fromArray(t.position(stamp,samplePosition));qa.fromArray(t.previousQ);qb.fromArray(t.currentQ);object.quaternion.copy(qa).slerp(qb,t.alpha(stamp));}
 function frame(stamp){requestAnimationFrame(frame);let dt=Math.min(.1,(stamp-lastStamp)/1000);lastStamp=stamp;if(document.hidden)return;onFrame(dt,stamp);const sampleStamp=performance.now();
   if(document.body.dataset.workspace==='play'&&(document.body.classList.contains('garage-open')||(document.body.classList.contains('menu-open')&&['setup','replays'].includes(document.body.dataset.menuScreen))))return;
   for(const model of robots.values())pose(model,sampleStamp);
   for(const ball of balls.values())if(ball.visible)pose(ball,sampleStamp);
   hiveTracks.forEach((t,i)=>{if(t.ready){const angle=t.position(sampleStamp,samplePosition)[0];hives[i].rotation.z=angle;dsimHive.trays[i].rotation.x=angle;}});
   const bot=robots.get(0),fit=Math.max(1,.92/camera.aspect),factor=cameraSnap?1:dampFactor(10,dt);
   if(presentation==='title'&&bot){cameraGoal.copy(bot.position).add(offset.set(...(state?.flowers[0]?.physical?[.85+Math.sin(stamp*.000025)*.1,.58,.68]:[-.68+Math.sin(stamp*.000025)*.10,.54,-.83])));lookGoal.copy(bot.position).add(offset.set(.22,.1,-.08));}
   else if(mode==='orbit'){controls.dampingFactor=dampFactor(8,dt);controls.update();look.copy(controls.target);}
   else {
     lookGoal.set(0,.16,0);
     if(mode==='broadcast')cameraGoal.set(2.9,3.7,3.9).multiplyScalar(fit*zoom);
     if(mode==='top')cameraGoal.set(0,5.6,.001).multiplyScalar(fit*zoom);
     if(mode==='driver'){cameraGoal.set(...(state?.flowers[0]?.physical?[-4.3,4.1,0]:[0,4.1,4.3])).multiplyScalar(fit*zoom);if(bot)lookGoal.set(bot.position.x*.12,.22,bot.position.z*.12);}
     if(mode==='follow'&&bot){const q=bot.quaternion,heading=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));followHeading+=angleDelta(followHeading,heading)*(cameraSnap?1:dampFactor(9,dt));cameraGoal.copy(bot.position).add(offset.set(-Math.cos(followHeading)*1.8,1.9,Math.sin(followHeading)*1.8).multiplyScalar(Math.max(1,fit*.75)*zoom));lookGoal.copy(bot.position).add(offset.set(Math.cos(followHeading)*.3,.18,-Math.sin(followHeading)*.3));}
   }
   if(mode!=='orbit'||presentation==='title'){camera.position.lerp(cameraGoal,factor);look.lerp(lookGoal,factor);camera.lookAt(look);cameraSnap=false;}
   renderer.render(scene,camera);if(++fpsFrames&&stamp-fpsStart>1000){onFps(Math.round(fpsFrames*1000/(stamp-fpsStart)));fpsFrames=0;fpsStart=stamp;}
 }requestAnimationFrame(frame);
 return {update,setCamera,renderer,setPresentation(value){if(presentation!==value)cameraSnap=true;presentation=value;setCamera(mode);},setQuality(value){renderer.setPixelRatio(value==='low'?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=value==='high';scene.traverse(o=>{if(o.material&&!Array.isArray(o.material))o.material.needsUpdate=true;});resize();},setTrail(value){trailVisible=value;if(trail)trail.visible=value;}};
}

export function createRobotPreview(container,presets){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,10);camera.position.set(.9,.64,1.05);camera.lookAt(0,.13,0);scene.add(new THREE.HemisphereLight(0xe7e8f3,0x85858a,.95));const light=new THREE.DirectionalLight(0xffffff,.8);light.position.set(-1,3,2);scene.add(light);
 let model,selection='',width=0,height=0;
 const resize=()=>{width=container.clientWidth;height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(container);
 function update(index,slot,config=presets[index]){const signature=JSON.stringify([index,slot,config]);if(selection===signature)return;selection=signature;if(model){model.traverse(o=>{o.geometry?.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});scene.remove(model);}model=robotModel(config,slot);model.children.filter(o=>o.isSprite).forEach(o=>o.visible=false);scene.add(model);resize();}
 function frame(stamp){requestAnimationFrame(frame);if(!width||!height||document.body.dataset.workspace!=='play'||document.body.dataset.menuScreen!=='setup'||document.body.classList.contains('garage-open'))return;if(model)model.rotation.y=stamp*.00015;renderer.render(scene,camera);}requestAnimationFrame(frame);
 return {update};
}

export function robotThumbnail(p){const c=p.color;const isTank=p.drive==='tank';const mechanism=p.mechanism==='lift'?`<path d="M48 27V4h5v23m20 0V4h5v23" stroke="#a9b8bf" stroke-width="4"/><path d="M49 8h30v9H49z" fill="${c}"/>`:p.mechanism==='catapult'?`<path d="M52 31L78 7" stroke="${c}" stroke-width="6"/><ellipse cx="78" cy="7" rx="10" ry="4" fill="#c2d0d4"/>`:`<path d="M48 30l5-18 18-5 13 17-10 12Z" fill="${c}"/><ellipse cx="65" cy="19" rx="11" ry="7" fill="#29363d"/><path d="M54 11l16-5 13 16" stroke="#b6c5cb" stroke-width="3" fill="none"/>`;return `<svg class="robot-picture" viewBox="0 0 130 57" aria-hidden="true"><ellipse cx="65" cy="48" rx="43" ry="6" fill="#0c171d" opacity=".4"/><path d="M27 27l52-9 27 16-50 14Z" fill="#667781"/><path d="M27 27v10l29 16V43Z" fill="#a2b2bb"/><path d="M56 43l50-9v10l-50 9Z" fill="#3c505c"/><g fill="#17232c" stroke="#6d7b83" stroke-width="2"><ellipse cx="34" cy="37" rx="7" ry="9"/><ellipse cx="52" cy="47" rx="7" ry="9"/><ellipse cx="96" cy="40" rx="7" ry="9"/>${isTank?'<ellipse cx="76" cy="44" rx="7" ry="9"/>':''}</g>${mechanism}<path d="M82 35l20-4v6l-20 4Z" fill="#e9d278"/></svg>`;}
