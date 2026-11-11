import {unit,project,cross,rotate,mul} from '../math.js';
// Match the computation's Ry(azimuth) Rx(polar), then spin about the spine.
export function createTOrientation(reference,spine,shoulder,values){
 const horizontal=unit(project(spine,reference.y)),targetX=unit(project(shoulder,spine));
 const turnedX=rotate(reference.x,reference.y,values.azimuth),turnedZ=rotate(reference.z,reference.y,values.azimuth);
 const tiltedY=rotate(reference.y,turnedX,values.polar),tiltedZ=rotate(turnedZ,turnedX,values.polar);
 const target={x:targetX,y:spine,z:unit(cross(targetX,spine))};
 function sample(key,p){
  const azimuth=key==='azimuth'?values.azimuth*p:values.azimuth,polar=key==='azimuth'?0:key==='polar'?values.polar*p:values.polar,spin=key==='spin'?values.spin*p:0;
  const x0=rotate(reference.x,reference.y,azimuth),z0=rotate(reference.z,reference.y,azimuth);
  const y=rotate(reference.y,x0,polar),z1=rotate(z0,x0,polar);
  return {frame:{x:rotate(x0,y,spin),y,z:rotate(z1,y,spin)},values:{azimuth:p===0&&key==='azimuth'?0:azimuth,polar:p===0&&key==='polar'?0:polar,spin:p===0&&key==='spin'?0:spin}};
 }
 const sectors=(key,angle)=>key==='azimuth'?[{from:reference.z,normal:reference.y,angle,axis:'y'}]:key==='polar'?[{from:reference.y,normal:turnedX,angle,axis:'x'}]:[1,-1].map(sign=>({from:mul(turnedX,sign),normal:spine,angle,axis:'y'}));
 return {target,horizontal,turnedX,tiltedY,tiltedZ,sample,sectors};
}
