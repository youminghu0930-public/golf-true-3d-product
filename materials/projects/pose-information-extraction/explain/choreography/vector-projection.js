import {cameraOrientation} from './camera.js';
import {project,cross,unit,dot,add,mul} from '../math.js';
import {mix} from './axis-frame.js';
// Keep the source visible while its copy drops perpendicularly onto the plane.
// Only the following fade phase removes the source arrow.
export function projectionMotion(direction,normal,phase,progress){
 const projected=unit(project(direction,normal));
 // Reach the plane and the final unit display length in the same motion.
 return {direction:phase==='project'?mix(direction,projected,progress):projected,originalOpacity:phase==='fade'?1-progress:1};
}

// View the difference plane nearly face-on, preserving global vertical.
export function projectionView(direction,normal,globalUp,preferred){
 let face=unit(cross(normal,direction));
 if(dot(face,preferred)<0)face=mul(face,-1);
 return cameraOrientation(add(face,mul(normal,.12)),globalUp);
}

// The visible wedge closes from the source direction onto its plane projection.
export function planeProjectionAngle(direction,normal,{origin,radius,axis='y',opacity=1}){
 const to=unit(direction),from=unit(project(direction,normal));
 const sweep=cross(from,to),magnitude=Math.hypot(...sweep);
 return {origin,from,to,normal:unit(magnitude>1e-8?sweep:cross(from,normal)),
  angle:Math.atan2(magnitude,Math.max(-1,Math.min(1,dot(from,to))))*180/Math.PI,
  radius,axis,opacity,rightAngle:false,squareProgress:0};
}

// Retain the angle removed by projection while the remaining plane angle closes.
export function projectionSweep(original,current,planeNormal,{origin,radius,axis='y',opacity=1}){
 const from=unit(original),to=unit(current),sweep=cross(from,to),magnitude=Math.hypot(...sweep);
 return {origin,from,to,normal:unit(magnitude>1e-8?sweep:cross(from,planeNormal)),
  angle:Math.atan2(magnitude,Math.max(-1,Math.min(1,dot(from,to))))*180/Math.PI,
  radius,axis,opacity,fillOpacity:.36,outline:true};
}
