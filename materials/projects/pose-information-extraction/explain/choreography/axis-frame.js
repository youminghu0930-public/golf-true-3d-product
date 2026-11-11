import {ease,clamp} from '../ui/timeline.js';
import {jointPairArrow} from './joint-pair.js';
// Shared axis construction. Only joint selection and the up-vector definition vary.
import {add,sub,mul,unit,project,cross,length,dot,deg} from '../math.js';
export const midpoint=(a,b)=>mul(add(a,b),.5);
export const mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
export function defineAxisFrame(right,left,up){
 const y=unit(up),rawX=unit(sub(left,right)),x=unit(project(rawX,y));
 return {origin:midpoint(right,left),right,left,rawX,x,y,z:unit(cross(x,y)),length:length(sub(left,right))/2};
}
export function frameDefinitions(data,meta,selectedFrame){
 const indexes=Object.fromEntries(data.joints.map((n,i)=>[n,i]));
 const point=(frame,name)=>{const p=data.reconstruction[frame][indexes[name]];if(!p)throw new Error(`Missing axis joint: ${name}`);return p;};
 const first=(names)=>names.find(name=>Object.hasOwn(indexes,name));
 const upper=first(['clavicle']),lower=first(['thorax','torso','root']);
 const up=upper?point(selectedFrame,upper):midpoint(point(selectedFrame,'left_shoulder'),point(selectedFrame,'right_shoulder'));
 const bottom=lower?point(selectedFrame,lower):midpoint(point(selectedFrame,'left_hip'),point(selectedFrame,'right_hip'));
 return {
  reference:{...defineAxisFrame(point(meta.ref_frame_id,'right_ankle'),point(meta.ref_frame_id,'left_ankle'),[0,-1,0]),jointPairs:{lateral:{joints:['right_ankle','left_ankle'],from:point(meta.ref_frame_id,'right_ankle'),to:point(meta.ref_frame_id,'left_ankle')}}},
  torso:{...defineAxisFrame(point(selectedFrame,'right_shoulder'),point(selectedFrame,'left_shoulder'),sub(up,bottom)),jointPairs:{lateral:{joints:['right_shoulder','left_shoulder'],from:point(selectedFrame,'right_shoulder'),to:point(selectedFrame,'left_shoulder')},up:{joints:[...(lower?[lower]:['right_hip','left_hip']),...(upper?[upper]:['right_shoulder','left_shoulder'])],from:bottom,to:up}}},
 };
}
export const constructionSteps=['grow','shrink','up','orthogonalize','plane','forward','plane-fade','complete'];
// User vocabulary: head = starting/anchored end, tail = arrow-tip end.
// Direction interpolation keeps the head fixed and the length constant.
export function directionBetween(from,to,t){
 const cosine=Math.max(-1,Math.min(1,from.reduce((s,v,i)=>s+v*to[i],0))),angle=Math.acos(cosine);
 if(angle<1e-8)return [...to];
 return unit(add(mul(from,Math.sin((1-t)*angle)),mul(to,Math.sin(t*angle))));
}
export function constructAxes(frame,step,progress,pairPhase){
 const index=constructionSteps.indexOf(step),o=frame.origin,L=frame.length;
 // Fade in the angle, pause briefly, then remove the up component.
 const removal=clamp((progress-.28)/.72);
 let x={from:frame.right,to:frame.right},y=null,z=null,plane=0,planeOpacity=0;
 if(index===0)x.to=mix(frame.right,frame.left,progress);
 if(index===1)x={from:mix(frame.right,o,progress),to:frame.left};
 if(index>=2){
  const d=index===3?directionBetween(frame.rawX,frame.x,removal):index>3?frame.x:frame.rawX;
  x={from:o,to:add(o,mul(d,L))};
  y={from:o,to:add(o,mul(frame.y,L*(index===2?progress:1)))};
 }
 if(step==='up'&&pairPhase&&frame.jointPairs?.up)y=jointPairArrow(frame.jointPairs.up,{from:o,to:add(o,mul(frame.y,L))},pairPhase,progress);
 if(index>=4&&index<=6){plane=index===4?progress:1;planeOpacity=index===6?1-progress:1;}
 if(index>=5)z={from:o,to:add(o,mul(frame.z,L*(index===5?progress:1)))};
  const angleMarker=index===3?{
  origin:o,from:frame.y,normal:unit(cross(frame.y,unit(sub(x.to,x.from)))),
  angle:deg(Math.acos(Math.max(-1,Math.min(1,dot(frame.y,unit(sub(x.to,x.from))))))),
  opacity:ease(clamp(progress/.18)),radius:L*.42,axis:'z',rightAngle:true,squareProgress:ease(clamp((removal-.65)/.35)),
 }:null;
 return {x,y,z,plane,planeOpacity,frame,opacity:1,highlight:index===3?'x':null,angleMarker};
}
export function completedAxes(frame,opacity=1){return {...constructAxes(frame,'complete',1),opacity};}
