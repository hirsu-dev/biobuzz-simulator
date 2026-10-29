/*! Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412).
 * DSIM dimension adaptations: https://polyformproject.org/licenses/noncommercial/1.0.0
 */
// Original procedural parts. FIRST TU06 §9.7 and DSIM fieldDims.gen.ts, f930291b.
const IN=.0254;
export const FLOWER={width:5.951*IN,depth:5.013*IN,top:21.404*IN,topBottom:20.254*IN,mid:3.904*IN,midTop:5.254*IN,floor:.354*IN,topRadius:4.171*IN/2,midRadius:3.896*IN/2,sortRadius:3.4*IN/2,bottomRadius:2.79*IN/2,backstop:1.25*IN};
const edge=1.8288-2.629*IN,along=23.392*IN;
export const FLOWERS=[{x:-edge,z:along,nx:1,nz:0},{x:-along,z:-edge,nx:0,nz:1},{x:edge,z:-along,nx:-1,nz:0},{x:along,z:edge,nx:0,nz:-1}];
export const flowerWorld=(f,x,y,z)=>({x:f.x+f.nz*x+f.nx*z,y,z:f.z-f.nx*x+f.nz*z});
export const FLOWER_PLATES=[{bottom:0,top:FLOWER.floor,radius:FLOWER.bottomRadius,color:0x27282c},{bottom:FLOWER.mid,top:FLOWER.midTop,radius:FLOWER.sortRadius,color:0x27282c},{bottom:FLOWER.topBottom,top:FLOWER.top,radius:FLOWER.topRadius,color:0xd7b658}];
export const FLOWER_BOXES=[
 // Rear extrusion leaves the field-facing retrieval opening unobstructed.
 {p:[0,FLOWER.mid/2,-FLOWER.depth/2+.009],s:[.022,FLOWER.mid,.018],color:0xa7acb0},
 ...[-1,1].flatMap(x=>[-1,1].map(z=>({p:[x*.055,(FLOWER.midTop+FLOWER.topBottom)/2,z*.043],s:[.017,FLOWER.topBottom-FLOWER.midTop,.017],color:0x73a845}))),
 {p:[0,FLOWER.top+FLOWER.backstop,-.047],s:[.12,.006,.009],color:0x916cb7},
 ...[-1,1].map(x=>({p:[x*.055,FLOWER.top+FLOWER.backstop/2,-.047],s:[.006,FLOWER.backstop,.006],color:0x777b80})),
];
// Convex annular sectors leave a real opening instead of a solid collision slab.
export function flowerPlatePanels(plate){
 const hw=FLOWER.width/2,hd=FLOWER.depth/2,angles=Array.from({length:32},(_,i)=>i*Math.PI/16);
 for(const x of [-hw,hw])for(const z of [-hd,hd])angles.push((Math.atan2(z,x)+Math.PI*2)%(Math.PI*2));angles.sort((a,b)=>a-b);
 return angles.map((a,i)=>{
  const b=angles[(i+1)%angles.length],point=(angle,r)=>[Math.cos(angle)*r,Math.sin(angle)*r],outer=angle=>point(angle,Math.min(hw/Math.max(1e-10,Math.abs(Math.cos(angle))),hd/Math.max(1e-10,Math.abs(Math.sin(angle)))));
  const ring=[point(a,plate.radius),outer(a),outer(b),point(b,plate.radius)];
  return [plate.bottom,plate.top].flatMap(y=>ring.flatMap(([x,z])=>[x,y,z]));
 });
}
export function flowerScored(piece){const y=piece.body.translation().y;return y+piece.radius>FLOWER.mid&&y-piece.radius<FLOWER.top;}
