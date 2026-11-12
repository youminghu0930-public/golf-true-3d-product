import {add,mul,rotate} from '../math.js';
import {clamp} from './timeline.js';

// Keep one triangle-fan topology while the curved boundary becomes two straight
// edges. Endpoints stay anchored to their vectors throughout the transformation.
export function sectorBoundary(spec,count=96){
 const amount=spec.rightAngle?clamp(spec.squareProgress??(Math.abs(Math.abs(spec.angle)-90)<.05?1:0)):0;
 const a=mul(spec.from,spec.radius),b=mul(rotate(spec.from,spec.normal,spec.angle),spec.radius);
 const points=Array.from({length:count+1},(_,i)=>{
  const t=i/count,arc=mul(rotate(spec.from,spec.normal,spec.angle*t),spec.radius);
  const edge=t<=.5?add(a,mul(b,t*2)):add(mul(a,(1-t)*2),b);
  const offset=add(mul(arc,1-amount),mul(edge,amount));
  return add(spec.origin,offset);
 });
 return {points,amount};
}
