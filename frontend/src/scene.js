import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const palette={red:0xd92d44,blue:0x2866df,metal:0x8b9098,dark:0x202128,yellow:0xf0ce35};
function material(color){return new THREE.MeshStandardMaterial({color,metalness:.05,roughness:.88,flatShading:true});}
const mats=new Map();
function mat(color){if(!mats.has(color))mats.set(color,material(color));return mats.get(color);}
const outlineMaterial=new THREE.LineBasicMaterial({color:0x13151c,transparent:true,opacity:.48});
function box(group,x,y,z,w,h,d,color){const geometry=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(w*h*d>.0001&&w<5&&d<5){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),outlineMaterial);m.add(edges);}group.add(m);return m;}
function cylinder(group,x,y,z,radius,height,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,20),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function line(group,points,color){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color}));group.add(l);return l;}
function textSprite(text,color='#d5e2e8',size=.17){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.font='600 52px sans-serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,66);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true}));s.scale.set(size*5.12,size,1);return s;}
function numberPlate(group,number,color,z){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,128);ctx.fillStyle='#fff';ctx.font='bold 68px sans-serif';ctx.textAlign='center';ctx.fillText(number,128,89);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.18,.085),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));mesh.position.set(0,.02,z);if(z<0)mesh.rotation.y=Math.PI;group.add(mesh);}

export function robotModel(p,id=0){
 const group=new THREE.Group(),color=id<2?palette.red:palette.blue,w=p.width,l=p.length,wheels=[];
 box(group,0,-.035,0,l,.045,w,0x26343e);
 for(const z of [-w/2+.025,w/2-.025])box(group,0,.005,z,l,.055,.035,palette.metal);
 for(const x of [-l/2+.02,l/2-.02])box(group,x,.005,0,.035,.055,w,palette.metal);
 for(const z of [-w/2,w/2])for(const x of p.drive==='tank'?[-l*.35,0,l*.35]:[-l*.33,l*.33]){
   const wheel=cylinder(group,x,-.043,z,.047,.035,0x151e24);wheel.rotation.x=Math.PI/2;
   wheels.push(wheel);
   const hub=cylinder(group,x,-.043,z+(z>0?.019:-.019),.020,.006,0x8096a2);hub.rotation.x=Math.PI/2;
   if(p.drive==='mecanum')for(let i=0;i<8;i++){const a=i*Math.PI/4;const roller=cylinder(group,x+Math.cos(a)*.043,-.043+Math.sin(a)*.043,z,.009,.037,0x505c63);roller.rotation.x=Math.PI/3;roller.rotation.z=a;}
 }
 box(group,-.05,.035,0,.16,.06,.13,0x343a40);box(group,-.05,.07,0,.08,.014,.075,0x1b2329);
 for(let i=0;i<3;i++)box(group,-.06+i*.035,.079,.045,.008,.006,.012,i===0?0x7cf49a:0xf0af57);
 const intake=cylinder(group,l/2+.018,-.025,0,.035,w*.82,palette.yellow);intake.rotation.x=Math.PI/2;
 for(const z of [-w*.34,w*.34])box(group,l/2-.03,0,z,.13,.02,.025,palette.metal);
 const shooter=new THREE.Group();shooter.position.set(-.03,.09,0);group.add(shooter);
 if(p.mechanism==='lift'){
   for(const z of [-.1,.1]){box(group,-.06,.17,z,.025,.37,.022,palette.metal);box(group,-.028,.22,z,.016,.31,.014,p.color);}
   box(group,.05,.34,0,.23,.025,.23,p.color);box(group,.15,.37,0,.018,.06,.23,palette.metal);
 }else if(p.mechanism==='catapult'){
   for(const z of [-.1,.1]){box(shooter,-.04,.035,z,.035,.16,.025,p.color);}
   const arm=box(shooter,.04,.12,0,.28,.025,.065,palette.metal);arm.rotation.z=.6;
   box(shooter,.15,.19,0,.10,.025,.14,p.color);
 }else{
   if(p.mechanism==='turret'||p.mechanism==='wide')cylinder(shooter,0,0,0,.12,.028,0x51616c);
   for(const z of [-.065,.065]){const rail=box(shooter,.03,.055,z,.21,.12,.016,p.color);rail.rotation.z=.7;}
   const fly=cylinder(shooter,.015,.085,0,.07,.10,0x252c30);fly.rotation.x=Math.PI/2;
   if(p.mechanism==='dual'){const fly2=cylinder(shooter,.13,.17,0,.05,.10,0x252c30);fly2.rotation.x=Math.PI/2;}
   box(shooter,-.045,.06,0,.08,.025,.17,palette.metal);
 }
 for(const z of [-w/2-.021,w/2+.021])numberPlate(group,['R1','R2','B1','B2'][id],id<2?'#d65562':'#4e89c8',z);
 // Original faceted bodywork keeps the mechanisms readable from the game camera.
 for(const z of [-w*.41,w*.41])box(group,0,.055,z,l*.86,.065,.018,color);
 box(group,-l*.34,.065,0,.025,.12,w*.8,color);
 const hopper=box(group,-.055,.13,0,.16,.016,.18,0x444955);hopper.rotation.z=-.17;
 for(const z of [-.095,.095])box(group,-.055,.17,z,.17,.08,.012,p.color);
 const cargo=new THREE.Group();cargo.position.set(-.08,.19,0);group.add(cargo);
 for(let i=0;i<4;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.026,10,7),mat(palette.yellow));ball.position.set((i%2)*.055-.027,0,Math.floor(i/2)*.055-.027);cargo.add(ball);}
 const tag=textSprite(id===0?'YOU':['R1','R2','B1','B2'][id],id===0?'#f3d53d':id<2?'#ff6c7d':'#75a3ff',.085);tag.position.y=p.mechanism==='lift'?.55:.43;group.add(tag);
 const arrow=new THREE.Mesh(new THREE.ConeGeometry(.02,.07,3),mat(p.color));arrow.rotation.z=-Math.PI/2;arrow.position.set(l/2+.04,.1,0);group.add(arrow);
 if(id===0){const ring=new THREE.Mesh(new THREE.RingGeometry(Math.max(l,w)*.71,Math.max(l,w)*.71+.008,64),new THREE.MeshBasicMaterial({color:0xc5f38e,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.y=-.102;group.add(ring);}
 group.userData={shooter,wheels,cargo,preset:p};return group;
}

export function createScene(container,presets,onFps){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;container.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#101114');scene.fog=new THREE.Fog('#101114',30,70);
 const camera=new THREE.PerspectiveCamera(43,1,.02,80);camera.position.set(3.5,3.5,4.3);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.14,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=1.7;controls.maxDistance=11;controls.maxPolarAngle=Math.PI*.48;
 scene.add(new THREE.HemisphereLight(0xd7ddeb,0x28292e,1.9));const sun=new THREE.DirectionalLight(0xfff7e8,2.3);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});sun.shadow.bias=-.0002;sun.shadow.normalBias=.015;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xa3b9ff,.5);fill.position.set(3,3,-5);scene.add(fill);
 const ground=box(scene,0,-.14,0,200,.12,200,0x101114);ground.receiveShadow=true;
 const field=new THREE.Group();scene.add(field);
 const tiles=new THREE.Group();field.add(tiles);
 for(let x=0;x<6;x++)for(let z=0;z<6;z++)box(tiles,(x-2.5)*.6096,-.018,(z-2.5)*.6096,.606,.03,.606,(x+z)%2?0x36383e:0x34363b);
 for(let side of [-1,1]){
   box(field,0,.317,side*1.853,3.76,.025,.045,0xb9c3c6);box(field,side*1.853,.317,0,.045,.025,3.76,0xb9c3c6);
   for(let a=-1.8;a<1.9;a+=.6){box(field,a,.16,side*1.856,.023,.31,.03,0x8a989e);box(field,side*1.856,.16,a,.03,.31,.023,0x8a989e);}
   const wallMaterial=new THREE.MeshPhysicalMaterial({color:0xb8ced8,transparent:true,opacity:.13,roughness:.1,depthWrite:false});
   for(let axis of ['x','z']){const panel=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?.012:3.65,.29,axis==='x'?3.65:.012),wallMaterial);panel.position.set(axis==='x'?side*1.84:0,.16,axis==='z'?side*1.84:0);field.add(panel);}
 }
 // Alliance tape and loading zones use FTC field coordinates, converted to Y-up.
 for(const side of [-1,1]){const col=side===1?palette.red:palette.blue;
   box(field,0,.003,side*1.50,3.62,.006,.015,col);
   const x=side===1?-.914:.914,z=side*1.68;
   line(field,[[x-.305,.007,z-side*.14],[x+.305,.007,z-side*.14],[x+.305,.007,side*1.82],[x-.305,.007,side*1.82],[x-.305,.007,z-side*.14]],col);
   const label=textSprite(side===1?'RED ALLIANCE':'BLUE ALLIANCE',side===1?'#e9949b':'#94bce8',.11);label.position.set(0,.02,side*2.04);field.add(label);
 }
 const centerLabel=textSprite('BIOBUZZ','#aab6b9',.19);centerLabel.position.set(.1,.012,0);centerLabel.material.opacity=.33;field.add(centerLabel);
 const scenery=new THREE.Group();scene.add(scenery);
 const robots=new Map(),balls=new Map(),hives=[],flowerBalls=new THREE.Group();scene.add(flowerBalls);
 for(let a=0;a<2;a++){
   const group=new THREE.Group();group.position.set(0,1.116,a===0?.30:-.30);scene.add(group);hives.push(group);
   const col=a===0?palette.red:palette.blue;
   box(group,0,0,0,.80,.035,.034,col);
   for(const s of [-1,1]){
     box(group,s*.29,.0,0,.32,.018,.51,col);
     for(const z of [-.25,.25])box(group,s*.29,.08,z,.32,.16,.013,col);
     box(group,s*.45,.08,0,.015,.16,.51,col);
     const tag=box(group,s*.29,-.018,0,.08,.006,.08,0xe9ecea);box(group,s*.29,-.023,0,.055,.004,.055,0x202930);
   }
 }
 const flowerTops=[];
 for(const [x,z]of[[-1.77,.61],[-.61,-1.77],[1.77,-.61],[.61,1.77]]){
   for(const y of [.13,.29,.546]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.061,.009,8,32),mat(0xe6d979));ring.rotation.x=Math.PI/2;ring.position.set(x,y,z);scene.add(ring);}
   const crown=new THREE.Mesh(new THREE.CylinderGeometry(.074,.064,.035,16,1,true),new THREE.MeshStandardMaterial({color:0xe9d776,side:THREE.DoubleSide,metalness:.3,roughness:.4}));crown.position.set(x,.555,z);scene.add(crown);flowerTops.push(crown);
 }
 const trailPoints=[];let trail=null,trailVisible=false,lastReset=-1,state=null,mode='broadcast',fpsFrames=0,fpsStart=performance.now(),lastStamp=performance.now();
 const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(['broadcast','top','driver'].includes(mode))setCamera(mode);};new ResizeObserver(resize).observe(container);resize();
 function disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}else if(o.isLine&&o.material!==outlineMaterial)o.material.dispose();});group.removeFromParent();}
 function update(s){
   state=s;if(lastReset!==s.resetId){lastReset=s.resetId;while(scenery.children.length)disposeGroup(scenery.children[0]);
     for(const o of s.scenery){if(o.s[1]===.1||o.p[1]===.155)continue;box(scenery,...o.p,...o.s,o.color);}trailPoints.length=0;if(trail){disposeGroup(trail);trail=null;}for(const model of robots.values())model.userData.initialized=false;
   }
   for(const b of s.bots){let model=robots.get(b.id);if(!model||model.userData.presetIndex!==b.preset){if(model)disposeGroup(model);model=robotModel(presets[b.preset],b.id);model.userData.presetIndex=b.preset;scene.add(model);robots.set(b.id,model);}
     model.userData.targetP=new THREE.Vector3(...b.p);model.userData.targetQ=new THREE.Quaternion(...b.q);if(!model.userData.initialized){model.position.copy(model.userData.targetP);model.quaternion.copy(model.userData.targetQ);model.userData.initialized=true;}
     model.userData.speed=b.speed;model.userData.cargo.children.forEach((ball,i)=>{ball.visible=i<b.held.length;if(ball.visible)ball.material=mat([palette.yellow,palette.red,palette.blue][b.held[i]]);});
     if(['turret','wide'].includes(presets[b.preset].mechanism))model.userData.shooter.rotation.y=b.turret;
   }
   const visible=new Set(s.pieces.map(p=>p.id));for(const [id,ball]of balls){if(!visible.has(id))ball.visible=false;}
   for(const p of s.pieces){let ball=balls.get(p.id);if(!ball){ball=new THREE.Mesh(new THREE.SphereGeometry(p.radius,12,8),mat([palette.yellow,palette.red,palette.blue][p.color]));ball.castShadow=true;scene.add(ball);balls.set(p.id,ball);}ball.visible=true;ball.position.set(...p.p);ball.quaternion.set(...p.q);}
   s.hives.forEach((h,i)=>hives[i].rotation.z=h.angle);
   while(flowerBalls.children.length)disposeGroup(flowerBalls.children[0]);
   s.flowers.forEach(f=>f.held.slice(0,8).forEach((color,i)=>{const ball=new THREE.Mesh(new THREE.SphereGeometry(color===0?.0356:.045,12,8),mat([palette.yellow,palette.red,palette.blue][color]));ball.position.set(f.x,.17+i*.065,f.z);flowerBalls.add(ball);}));
   const p=s.bots[0].p;if(!trailPoints.length||Math.hypot(p[0]-trailPoints.at(-1)[0],p[2]-trailPoints.at(-1)[2])>.025){trailPoints.push([p[0],.012,p[2]]);if(trailPoints.length>700)trailPoints.shift();if(trail)disposeGroup(trail);trail=line(scene,trailPoints,0xb5df83);trail.visible=trailVisible;}
 }
 function setCamera(value){mode=value;controls.enabled=value==='orbit';camera.fov=43;camera.updateProjectionMatrix();const fit=Math.max(1,1.1/camera.aspect);if(value==='broadcast'){camera.position.set(3.25,4.15,4.35).multiplyScalar(fit);camera.lookAt(0,.1,0);}if(value==='orbit'){camera.position.set(3.5,3.5,4.3).multiplyScalar(fit);controls.target.set(0,.14,0);controls.update();}if(value==='top'){camera.position.set(0,5.6*fit,.001);camera.lookAt(0,0,0);}if(value==='driver'){camera.position.set(0,1.85*fit,3.7*fit);camera.lookAt(0,.3,-.2);}}
 function frame(stamp){requestAnimationFrame(frame);let dt=Math.min(.1,(stamp-lastStamp)/1000);lastStamp=stamp;
   for(const model of robots.values()){model.position.lerp(model.userData.targetP,Math.min(1,dt*20));model.quaternion.slerp(model.userData.targetQ,Math.min(1,dt*20));for(const wheel of model.userData.wheels)wheel.rotation.y+=(model.userData.speed||0)*dt/.047;}
   if(mode==='orbit')controls.update();if(mode==='follow'&&robots.has(0)){const bot=robots.get(0);const offset=new THREE.Vector3(-1.6,1.8,0).applyQuaternion(bot.quaternion);camera.position.lerp(bot.position.clone().add(offset),dt*4);camera.lookAt(bot.position.clone().add(new THREE.Vector3(0,.12,0)));}
   renderer.render(scene,camera);if(++fpsFrames&&stamp-fpsStart>1000){onFps(Math.round(fpsFrames*1000/(stamp-fpsStart)));fpsFrames=0;fpsStart=stamp;}
 }requestAnimationFrame(frame);
 return {update,setCamera,renderer,setWorkspace(next){if(next==='code'&&mode==='broadcast')setCamera('orbit');else if(next==='play'&&mode==='orbit')setCamera('broadcast');},setQuality(value){renderer.setPixelRatio(value==='low'?1:Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=value!=='low';scene.traverse(o=>{if(o.material&&!Array.isArray(o.material))o.material.needsUpdate=true;});resize();},setTrail(value){trailVisible=value;if(trail)trail.visible=value;}};
}

export function robotThumbnail(p){const c=p.color;const isTank=p.drive==='tank';const mechanism=p.mechanism==='lift'?`<path d="M48 27V4h5v23m20 0V4h5v23" stroke="#a9b8bf" stroke-width="4"/><path d="M49 8h30v9H49z" fill="${c}"/>`:p.mechanism==='catapult'?`<path d="M52 31L78 7" stroke="${c}" stroke-width="6"/><ellipse cx="78" cy="7" rx="10" ry="4" fill="#c2d0d4"/>`:`<path d="M48 30l5-18 18-5 13 17-10 12Z" fill="${c}"/><ellipse cx="65" cy="19" rx="11" ry="7" fill="#29363d"/><path d="M54 11l16-5 13 16" stroke="#b6c5cb" stroke-width="3" fill="none"/>`;return `<svg class="robot-picture" viewBox="0 0 130 57" aria-hidden="true"><ellipse cx="65" cy="48" rx="43" ry="6" fill="#0c171d" opacity=".4"/><path d="M27 27l52-9 27 16-50 14Z" fill="#667781"/><path d="M27 27v10l29 16V43Z" fill="#a2b2bb"/><path d="M56 43l50-9v10l-50 9Z" fill="#3c505c"/><g fill="#17232c" stroke="#6d7b83" stroke-width="2"><ellipse cx="34" cy="37" rx="7" ry="9"/><ellipse cx="52" cy="47" rx="7" ry="9"/><ellipse cx="96" cy="40" rx="7" ry="9"/>${isTank?'<ellipse cx="76" cy="44" rx="7" ry="9"/>':''}</g>${mechanism}<path d="M82 35l20-4v6l-20 4Z" fill="#e9d278"/></svg>`;}
