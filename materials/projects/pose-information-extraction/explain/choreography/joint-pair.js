import {add,mul} from '../math.js';
import {ease,clamp} from '../ui/timeline.js';
// The same focus -> stretch -> release -> align sequence is used by every joint pair.
export function jointPairEmphasis(phase,progress){
 if(phase==='focus')return ease(progress);
 if(phase==='grow')return 1;
 if(phase==='release')return 1-ease(progress);
 return 0;
}
export function jointPairArrow(pair,aligned,phase,progress){
 const mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
 if(phase==='focus')return {from:pair.from,to:pair.from};
 if(phase==='grow')return {from:pair.from,to:mix(pair.from,pair.to,progress)};
 if(phase==='release')return {from:pair.from,to:pair.to};
 return {from:mix(pair.from,aligned.from,progress),to:mix(pair.to,aligned.to,progress)};
}
export function jointPairProgress(progress){
 const t=clamp(progress);
 if(t<.17)return {phase:'focus',progress:ease(t/.17),strength:ease(t/.17),stretch:0};
 if(t<.65)return {phase:'grow',progress:ease((t-.17)/.48),strength:1,stretch:ease((t-.17)/.48)};
 if(t<.82)return {phase:'release',progress:ease((t-.65)/.17),strength:1-ease((t-.65)/.17),stretch:1};
 return {phase:'align',progress:ease((t-.82)/.18),strength:0,stretch:1};
}
export function pairFocusStage(prefix,name,step){return {id:`${prefix}-${name}-focus`,title:'Joint pair',duration:850,motionDuration:650,step,jointPair:{name,phase:'focus'}};}
export function pairReleaseStage(prefix,name,step){return {id:`${prefix}-${name}-release`,title:'Release joint pair',duration:850,motionDuration:650,step,jointPair:{name,phase:'release'}};}
// Camera settles before joint emphasis; return only after the arrow is complete.
export function jointPairPresentation(progress){
 const t=clamp(progress);
 if(t<.24)return {phase:'camera-in',strength:0,stretch:0,camera:ease(t/.20)};
 if(t>.88)return {phase:'camera-out',strength:0,stretch:1,camera:1-ease((t-.88)/.12)};
 return {...jointPairProgress((t-.24)/.64),camera:1};
}
