import {unit,project,cross,rotate} from '../math.js';
// Independent horizontal turn and signed elevation of a lateral joint line.
export function createDirectionRotation(reference,raw,values){
 const up=reference.y,base=reference.x,horizontal=unit(project(raw,up)),tiltAxis=unit(cross(horizontal,up));
 function sample(key,p){
  const tilt=key==='tilt';
  return {direction:rotate(tilt?horizontal:base,tilt?tiltAxis:up,values[key]*p),
   values:{turn:tilt?values.turn:p===0?0:values.turn*p,tilt:tilt?(p===0?0:values.tilt*p):0},
   sector:{from:tilt?horizontal:base,normal:tilt?tiltAxis:up,angle:values[key]*p,axis:tilt?'z':'y'}};
 }
 return {up,base,horizontal,tiltAxis,sample};
}
