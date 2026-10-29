import * as THREE from 'three';
import {FLOWERS,FLOWER,FLOWER_PLATES,FLOWER_BOXES} from './flower-geometry.js';

export function createFlowerField(){
 const field=new THREE.Group();
 for(const f of FLOWERS){
  const group=new THREE.Group();group.position.set(f.x,0,f.z);group.rotation.y=Math.atan2(f.nx,f.nz);field.add(group);
  for(const plate of FLOWER_PLATES){
   const w=FLOWER.width/2,d=FLOWER.depth/2,shape=new THREE.Shape();shape.moveTo(-w,-d);shape.lineTo(w,-d);shape.lineTo(w,d);shape.lineTo(-w,d);shape.closePath();
   const hole=new THREE.Path();hole.absarc(0,0,plate.radius,0,Math.PI*2,true);shape.holes.push(hole);
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:plate.top-plate.bottom,bevelEnabled:false,curveSegments:32});geometry.rotateX(-Math.PI/2);
   const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:plate.color,flatShading:true}));mesh.position.y=plate.bottom;group.add(mesh);
  }
  for(const part of FLOWER_BOXES){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...part.s),new THREE.MeshLambertMaterial({color:part.color}));mesh.position.set(...part.p);group.add(mesh);}
 }
 return field;
}
