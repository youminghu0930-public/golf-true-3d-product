import {unit,project,cross,rotate} from '../math.js';
// Signed inclination is a rotation from the plane projection to the source.
export function createPlaneInclination(direction,normal,value){
 const projected=project(direction,normal),baseline=unit(projected),axis=unit(cross(baseline,normal));
 return {projected,baseline,axis,value,sample:p=>({direction:rotate(baseline,axis,value*p),angle:p===0?0:value*p})};
}
