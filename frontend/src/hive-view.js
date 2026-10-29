import * as THREE from 'three';
import {HIVE,CELL_PROFILE,HIVE_FRAME,hivePivot,hivePanels,segmentPose} from './hive-geometry.js';

export function createHiveField(){
 const group=new THREE.Group(),trays=[];
 const metal=new THREE.MeshLambertMaterial({color:0xd6d7d8,flatShading:true});
 const clear=new THREE.MeshLambertMaterial({color:0xe6e6e6,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false});
 const panelEdge=new THREE.LineBasicMaterial({color:0xd8dfe1,transparent:true,opacity:.50});
 for(const frame of HIVE_FRAME){const {p,s,q}=segmentPose(frame),mesh=new THREE.Mesh(new THREE.BoxGeometry(...s),metal);mesh.position.fromArray(p);mesh.quaternion.fromArray(q);mesh.castShadow=true;group.add(mesh);}
 for(let alliance=0;alliance<2;alliance++){
  const tray=new THREE.Group(),pivot=hivePivot(alliance),accent=new THREE.MeshLambertMaterial({color:alliance===0?0xf33a43:0x357cf0,flatShading:true});
  tray.position.set(pivot.x,pivot.y,pivot.z);group.add(tray);trays.push(tray);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.022,.035,HIVE.far*2),metal);beam.position.y=HIVE.floor-.025;tray.add(beam);
  for(const side of [-1,1]){
   for(const panel of hivePanels(side)){
    const geo=new THREE.BufferGeometry(),vertices=[];
    for(let i=1;i<panel.face.length-1;i++)vertices.push(...panel.face[0],...panel.face[i],...panel.face[i+1]);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
    const skin=new THREE.Mesh(geo,clear);skin.renderOrder=3;tray.add(skin);
    const edge=new THREE.BufferGeometry().setFromPoints([...panel.face,panel.face[0]].map(p=>new THREE.Vector3(...p)));tray.add(new THREE.Line(edge,panelEdge));
   }
   for(const along of [HIVE.near,HIVE.far]){
    const center=(HIVE.floor+HIVE.top)/2,shape=new THREE.Shape(CELL_PROFILE.map(([x,y])=>new THREE.Vector2(x*1.09,center+(y-center)*1.09)));
    shape.holes.push(new THREE.Path(CELL_PROFILE.map(([x,y])=>new THREE.Vector2(x,y)).reverse()));
    const rib=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}),accent);rib.position.z=-side*along-.006;rib.castShadow=true;tray.add(rib);
   }
   // The visible bars tie the two colored ribs together without covering the opening.
   for(const x of [-HIVE.halfWidth,HIVE.halfWidth]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.009,.009,HIVE.far-HIVE.near),metal);rail.position.set(x,.15,-side*HIVE.arm);tray.add(rail);}
  }
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.04,12),metal);hub.rotation.z=Math.PI/2;tray.add(hub);
 }
 return {group,trays};
}
