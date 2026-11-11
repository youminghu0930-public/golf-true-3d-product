import {sub,unit,project,length,dot,mul,add} from '../math.js';
import {cameraOrientation,cameraBetween} from './camera.js';
// View perpendicular to the pair, keeping the complete source and aligned arrow
// in a padded bounding sphere. Definitions stay in source coordinates.
export function pairCamera(pair,aligned,preferredDirection=[0,0,-1],up=[0,-1,0]){
 const direction=unit(sub(pair.to,pair.from));
 let normal=project(preferredDirection,direction);
 if(length(normal)<1e-6)normal=project(Math.abs(direction[1])<.9?[0,1,0]:[1,0,0],direction);
 const normalUnit=unit(normal);
 let vertical=project(up,normalUnit);
 if(length(vertical)<1e-6)vertical=project(direction,normalUnit);
 const points=[pair.from,pair.to,...(aligned?[aligned.from,aligned.to]:[])];
 return {points,orientation:cameraOrientation(normalUnit,vertical)};
}

// Preserve the authored view unless the source vector is nearly end-on.
export function avoidEndOn(orientation,pair,up=[0,-1,0],{maxAlignment=.9,targetAlignment=.85}={}){
 const axis=unit(sub(pair.to,pair.from)),view=cameraBetween(orientation,orientation,1).direction,cosine=dot(axis,view);
 if(Math.abs(cosine)<=maxAlignment)return orientation;
 let side=project(view,axis);
 if(length(side)<1e-6)side=cameraBetween(pairCamera(pair,null,view,up).orientation,pairCamera(pair,null,view,up).orientation,1).direction;
 const direction=add(mul(unit(side),Math.sqrt(1-targetAlignment*targetAlignment)),mul(axis,Math.sign(cosine)*targetAlignment));
 return cameraOrientation(direction,up);
}
