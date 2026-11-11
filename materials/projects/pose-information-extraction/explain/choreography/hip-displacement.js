import {axisColors,blendColors} from '../palette.js';
import {separateReviewTransition} from './review-transition.js';
import {add,sub,mul,length} from '../math.js';
import {openingSegments,sampleOpening} from './opening.js';
import {frameDefinitions,completedAxes,mix} from './axis-frame.js';
import {referenceOverview,cameraFocusBounds,cameraOrientation,uprightCameraBetween,uprightCamera} from './camera.js';
import {createReferencePrelude} from './reference-prelude.js';
import {avoidEndOn} from './pair-camera.js';
import {createDisplacementGeometry} from './displacement-geometry.js';
import {displacementAxisGuides} from './displacement-guides.js';
import {scheduleTimeline} from '../timing.js';
import {reviewTiming} from './review-timing.js';
import {ease,clamp} from '../ui/timeline.js';

export function createHipDisplacementChoreography(model){
 const c=model.context,g=createDisplacementGeometry(c),reference=frameDefinitions(c.data,c.meta,c.entry.frame).reference;
 const front=referenceOverview(reference),up=reference.y;
 const overview=cameraOrientation(add(add(reference.z,mul(reference.x,.7)),mul(up,.4)),up);
 let hipView=overview;
 for(const pair of [g.referenceHips,g.selectedHips,...g.components])if(length(sub(pair.to,pair.from))>1e-9)hipView=avoidEndOn(hipView,pair,up,{maxAlignment:.85,targetAlignment:.75});
 const prelude=createReferencePrelude(reference,front),between=(a,b,p)=>uprightCameraBetween(a,b,p,up,reference.z);
 const values=Object.fromEntries(g.components.map(v=>[v.key,v.value])),order=g.components.map(v=>v.key);
 const action=(id,motionDuration=1500,hold=500,extra={})=>({id,title:id.replaceAll('-',' '),duration:motionDuration+hold,motionDuration,...extra});
 const segments=[...openingSegments(),action('reference-focus',1100),...prelude.segments,
  action('reference-root',2200),action('scale-camera',1600),action('scale-highlight',1300),action('scale-duplicate',1400),
  action('scale-align',2400),action('scale-mean',2200),action('unit-align',1800),action('unit-axes',1700),action('unit-fade',1000),action('unit-ready',700),
  action('selected-focus',1400),action('root-camera',2000),action('root-markers',1000),action('displacement',1800),
  ...order.flatMap(key=>[action(key+'-ready',600,800),action(key,2200,800)]),
  {id:'finish',title:'Review hip displacement',duration:8000,completion:true},action('reset',1200)];
 const duration=scheduleTimeline(segments,c.entry),index=id=>segments.findIndex(s=>s.id===id),has=(s,id)=>segments.indexOf(s)>=index(id);
 const points=[...c.reference,...c.pose].map(c.source),measurementPoints=cameraFocusBounds(g.components.flatMap(v=>[v.from,v.to]));
 const rowBase=add(g.referenceRoot,add(mul(reference.x,g.scale*2.1),mul(up,g.scale*.7))),meanStart=add(rowBase,mul(up,-g.scale*.63));
 const meanEnd=add(meanStart,mul(reference.x,g.scale)),alignedEnd=add(g.referenceRoot,mul(reference.x,g.scale));
 const bodyBounds=cameraFocusBounds([...points,rowBase,add(rowBase,mul(reference.x,g.scale*Math.max(...g.bones.map(b=>b.length)))),add(rowBase,mul(up,-g.scale*1.5))]);
 function unitAxes(length=reference.length,opacity=1,widthScale=1){
  const axes=completedAxes({...reference,origin:g.referenceRoot,length},opacity);axes.widthScale=widthScale;
  for(const key of ['x','y','z'])axes[key].keepVisible=true;
  return axes;
 }
 const guide=(id,from,to,color,extra={})=>({id,from,to,color,...extra});
 function roots(state,opacity=1){
  state.guides.push(guide('reference-root',g.referenceRoot,null,'#8b9198',{kind:'point',radius:5,opacity}),guide('selected-root',g.selectedRoot,null,'#168568',{kind:'point',radius:5,opacity}));
 }
 function scaleBones(state,s,p){
  const aligned=has(s,'scale-mean')?1:s.id==='scale-align'?p:0,mean=s.id==='scale-mean'?p:has(s,'unit-align')?1:0;
  const strength=s.id==='scale-highlight'?p:s.id==='scale-duplicate'?1:s.id==='scale-align'?1-p:0;
  state.boneHighlights=g.bones.map(b=>{
   const width=b.joints.includes('left_shoulder')&&b.joints.includes('right_shoulder')?'clavicle':b.joints.includes('left_hip')&&b.joints.includes('right_hip')?'root':null;
   return {pose:'reference',pairs:width?b.joints.map(name=>[width,name]):[b.joints],strength};
  });
  if(has(s,'scale-duplicate')&&!has(s,'unit-align'))g.bones.forEach((b,i)=>{
   const row=add(rowBase,mul(up,-i*g.scale*.14)),rowEnd=add(row,mul(reference.x,b.length*g.scale));
   state.boneGuides.push({id:'scale-'+i,from:mix(mix(b.from,row,aligned),meanStart,mean),to:mix(mix(b.to,rowEnd,aligned),meanEnd,mean),
    opacity:(s.id==='scale-duplicate'?p:1)*(1-mean),jointTrim:1-aligned});
  });
  if(mean>0||has(s,'unit-align')){
   const align=s.id==='unit-align'?p:has(s,'unit-axes')?1:0,opacity=s.id==='unit-fade'?1-p:has(s,'unit-ready')?0:mean;
   const from=mix(meanStart,g.referenceRoot,align),to=mix(meanEnd,alignedEnd,align);
   state.boneGuides.push({id:'unit-bone',from,to,opacity});
   state.guides.push(guide('unit-label',to,null,'#657168',{kind:'point',radius:0,label:'1 unit',opacity}));
  }
 }
 function components(state,key,amount,guideOpacity=1,finishColor=0){
  const active=order.indexOf(key);state.active=key;state.values={sway:0,thrust:0,lift:0};
  const current=g.components[active],cursor=mix(current.from,current.to,amount);
  state.guides.push(guide('displacement',cursor,g.selectedRoot,'#8b9198',{kind:'line',width:1.7,dashed:true}));
  g.components.forEach((v,i)=>{
   const p=i<active?1:i===active?amount:0;state.values[v.key]=v.value*p;
  });
  const guides=displacementAxisGuides(g.referenceRoot,g.components,active,amount,guideOpacity);
  const dot=guides.find(guide=>guide.id==='measurement-cursor');
  if(finishColor>0)dot.color=blendColors(axisColors.y,'#168568',finishColor);
  state.guides.push(...guides);
 }
 function sampleState(time){
  const s=segments.find(s=>time<s.end)??segments.at(-1),p=ease(clamp((time-s.start)/Math.max(1e-9,s.motionDuration??s.duration))),progress=clamp((time-s.start)/Math.max(1e-9,s.duration));
  const state={segment:s.id,title:s.title,progress,referencePose:.5,selectedPose:1,referenceAxes:null,torsoAxes:null,values:{sway:0,thrust:0,lift:0},active:null,focus:0,focusOrigin:g.referenceRoot,camera:between(front,front,1),guides:[],boneGuides:[],boneHighlights:[],sectors:[],jointHighlights:[],pairFocus:null,plane:null};
  if(sampleOpening(state,s,p,values))return state;
  if(s.id==='reference-focus'){state.referencePose=.5-.22*p;state.selectedPose=1-p;return state;}
  if(prelude.sample(state,s,p))return state;
  state.referencePose=.28;state.selectedPose=0;state.referenceAxes=unitAxes();
  if(s.id==='reference-root'){
   state.referenceAxes=completedAxes({...reference,origin:mix(reference.origin,g.referenceRoot,p)});return state;
  }
  state.camera=between(front,overview,s.id==='scale-camera'?p:1);
  state.pairFocus={points:bodyBounds,amount:s.id==='scale-camera'?p:1};
  if(s.id==='scale-camera')return state;
  if(!has(s,'selected-focus')){
   scaleBones(state,s,p);
   const size=s.id==='unit-axes'?p:has(s,'unit-fade')?1:0;
   state.referenceAxes=unitAxes(reference.length+(g.scale-reference.length)*size);
   return state;
  }
  state.referenceAxes=unitAxes(g.scale);state.selectedPose=s.id==='selected-focus'?.35*p:.35;
  if(s.id==='selected-focus')return state;
  const close=s.id==='root-camera'?p:1;
  state.camera=between(overview,hipView,close);state.pairFocus={points:bodyBounds.map((point,i)=>mix(point,measurementPoints[i],close)),amount:1};
  state.referencePose=.28-.18*close;state.selectedPose=.35-.23*close;
  state.referenceAxes=unitAxes(g.scale,1-.75*close,1-.4*close);
  if(s.id==='root-camera')return state;
  roots(state,s.id==='root-markers'?p:1);
  if(s.id==='root-markers')return state;
  if(s.id==='displacement'){
   state.guides.push(guide('displacement',g.referenceRoot,mix(g.referenceRoot,g.selectedRoot,p),'#8b9198',{kind:'line',width:1.7,dashed:true}));return state;
  }
  for(const key of order)if(s.id===key+'-ready'||s.id===key){const fade=s.id===key?1:p;const endColor=key==='lift'&&s.id===key?ease(clamp((time-s.start-s.motionDuration)/(s.duration-s.motionDuration))):0;components(state,key,s.id===key?p:0,fade,endColor);return state;}
  components(state,'lift',1,1,1);
  if(s.id==='finish'){
   const timing=reviewTiming(progress,s.duration);if(timing.holding)return state;
   const q=timing.progress;
   state.camera=between(hipView,hipView,1);state.pairFocus={points:measurementPoints,amount:1};
   state.guides=state.guides.filter(v=>!order.includes(v.id)&&!v.id.startsWith('axis-measure-')&&!v.id.startsWith('axis-connector-')&&v.id!=='measurement-cursor'&&v.id!=='displacement');
   if(q<.22){state.values={sway:0,thrust:0,lift:0};state.guides=state.guides.map(v=>v.id==='displacement'?{...v,opacity:.25*(1-q/.22)}:v);}
   else{const position=(q-.22)/.78*3,i=Math.min(2,Math.floor(position)),amount=ease(clamp((position-i-.24)/.76));const phase=position-i,fade=ease(clamp(phase/.18));components(state,order[i],amount,fade,i===2?ease(clamp((phase-.9)/.1)):0);}
  }
  if(s.id==='reset'){
   state.guides=state.guides.map(v=>({...v,opacity:(v.opacity??1)*(1-p)}));state.referenceAxes.opacity*=1-p;
   state.pairFocus={points:measurementPoints,amount:1-p};state.camera=between(hipView,front,p);state.referencePose=.1*(1-p);state.selectedPose=.12+.88*p;
  }
  return state;
 }
 function sample(time){const state=sampleState(time);state.camera=uprightCamera(state.camera,up);return state;}
 return separateReviewTransition({segments,duration,values,geometry:g,frames:{reference,torso:{...reference,origin:g.referenceRoot}},sample},c.entry);
}
