import {add,sub,mul,unit,project,length,axes} from './math.js';
import {axisNames} from './names.js';
export const colors={input:'#168568',projection:'#507fca',result:'#a752b8',axis:'#87988d',reference:'#ce8b21'};
export const vector=(origin,direction,label,color=colors.input,size=1)=>({kind:'vector',from:origin,to:add(origin,mul(direction,size)),label,color});
export const marker=(position,label,color=colors.reference)=>({kind:'point',position,label,color});
export const segment=(from,to,label,color=colors.input)=>({kind:'vector',from,to,label,color});
export const jointVector=(feature,label,color=colors.input,pose='selected')=>({...segment(feature.from,feature.to,label,color),jointPair:{pose,joints:feature.joints}});
export const plane=(origin,normal,radius,label)=>({kind:'plane',origin,normal:unit(normal),radius,label,color:colors.projection});
export const arc=(origin,from,normal,degrees,radius,label)=>({kind:'arc',origin,from:unit(project(from,normal)),normal:unit(normal),degrees,radius,label,color:colors.result});
export const projection=(origin,direction,normal,size,label='Projection')=>({kind:'projection',origin,direction:unit(direction),target:unit(project(unit(direction),normal)),size,label,color:colors.projection});
export const stage=(title,text,visuals=[],detail='')=>({title,text,visuals,detail});
export function globalStage(c,origin,size){
 const a=c.point('left_ankle',c.reference),b=c.point('right_ankle',c.reference),o=mul(add(a,b),.5);
 return stage('Set the global directions',`Use the reference frame’s right-to-left ankle direction for X, with its vertical component removed. Y points up; the two directions determine forward Z. These axes stay fixed for the selected frame.`,[
  jointVector({from:b,to:a,joints:['right_ankle','left_ankle']},'Reference ankle direction',colors.reference,'reference'),
  ...Object.entries(axes).map(([axis,v],i)=>vector(o,v,axisNames[i],colors.axis,size)),
 ],'Reference-frame alignment is applied before this measurement.');
}
export function projectedSpin(origin,direction,normal,baseline,value,size,planeLabel){
 const projected=project(direction,normal),base=project(baseline,normal);
 return [plane(origin,normal,size*1.2,planeLabel),vector(origin,unit(direction),'Selected direction',colors.input,size),projection(origin,direction,normal,size,'Projected direction'),vector(origin,unit(base),'Zero direction',colors.axis,size),arc(origin,base,normal,value,size*.7,'Signed turn')];
}
export function inclination(origin,direction,normal,value,size,planeLabel){
 const p=project(direction,normal);
 // A vector perpendicular to both directions gives the signed in-plane sweep.
 const n=crossSafe(p,direction,normal);
 return [plane(origin,normal,size*1.2,planeLabel),vector(origin,unit(direction),'Selected direction',colors.input,size),projection(origin,direction,normal,size),{...arc(origin,p,n,Math.abs(value),size*.7,'Inclination'),value}];
}
function crossSafe(a,b,fallback){const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];return length(n)>1e-9?n:unit(sub(fallback,mul(unit(a),fallback.reduce((s,v,i)=>s+v*unit(a)[i],0))));}
