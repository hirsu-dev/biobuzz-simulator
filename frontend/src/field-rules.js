// FIRST BIOBUZZ TU06, §9.3, §10.3, §10.5; nominal field dimensions in metres.
export const FIELD_HALF=1.8288;
export const LOADING_ZONES=[{x0:-FIELD_HALF,x1:-FIELD_HALF+.2794,z0:-1.2192,z1:-.635},{x0:FIELD_HALF-.2794,x1:FIELD_HALF,z0:.635,z1:1.2192}];
export const GARDENS=[{x0:-FIELD_HALF,x1:-FIELD_HALF+.5842,z0:FIELD_HALF-.0508,z1:FIELD_HALF},{x0:FIELD_HALF-.5842,x1:FIELD_HALF,z0:-FIELD_HALF,z1:-FIELD_HALF+.0508}];
export function ballInZone(p,r,zone){return Math.hypot(Math.max(zone.x0-p.x,0,p.x-zone.x1),Math.max(zone.z0-p.z,0,p.z-zone.z1))<=r;}
export function robotInZone(p,angle,length,width,zone){
 const cx=(zone.x0+zone.x1)/2,cz=(zone.z0+zone.z1)/2,hx=(zone.x1-zone.x0)/2,hz=(zone.z1-zone.z0)/2,c=Math.cos(angle),s=-Math.sin(angle),dx=p.x-cx,dz=p.z-cz;
 for(const [ax,az] of [[1,0],[0,1],[c,s],[-s,c]]){const reach=hx*Math.abs(ax)+hz*Math.abs(az)+length/2*Math.abs(c*ax+s*az)+width/2*Math.abs(-s*ax+c*az);if(Math.abs(dx*ax+dz*az)>reach)return false;}
 return true;
}
