import {separateReviewTransition} from './review-transition.js';
import {fadeReviewTarget} from './review-timing.js';
import {highlightRotationAxis} from './rotation-highlight.js';
import {openingSegments,sampleOpening} from './opening.js';
import {add,sub,mul,unit} from '../math.js';
import {frameDefinitions,completedAxes,mix} from './axis-frame.js';
import {createReferencePrelude} from './reference-prelude.js';
import {createTOrientation} from './t-orientation.js';
import {jointPairArrow,jointPairEmphasis} from './joint-pair.js';
import {avoidEndOn} from './pair-camera.js';
import {projectionMotion,projectionView,planeProjectionAngle,projectionSweep} from './vector-projection.js';
import {referenceOverview,cameraOrientation,cameraBetween,uprightCameraBetween,uprightCamera,constrainViewElevation,cameraWithVisiblePlane} from './camera.js';
import {scheduleTimeline} from '../timing.js';
import {reviewTiming,referenceResetOpacity} from './review-timing.js';
import {ease,clamp} from '../ui/timeline.js';

// One T-shaped object, with the root as pivot, the spine as stem, and shoulders
// as crossbar. Geometry and rotation sampling are independent of the player.
export function createSpineTChoreography(model){
 const c=model.context,{entry,meta}=c,reference=frameDefinitions(c.data,meta,entry.frame).reference;
 const sourcePair=f=>({from:c.source(f.from),to:c.source(f.to),joints:f.joints});
 const pairs={spine:sourcePair(c.spine()),shoulder:sourcePair(c.lateral('shoulder'))};
 const origin=pairs.spine.from,stemLength=Math.hypot(...sub(pairs.spine.to,origin)),raw=unit(sub(pairs.spine.to,origin));
 const shoulder=unit(sub(pairs.shoulder.to,pairs.shoulder.from)),halfWidth=Math.hypot(...sub(pairs.shoulder.to,pairs.shoulder.from))/2;
 const values=Object.fromEntries(model.items.map(item=>[item.key,item.computed])),rotation=createTOrientation(reference,raw,shoulder,values);
 const frame={...reference,origin,length:stemLength},target={...frame,...rotation.target};
 // Keep the completed forward arrow readable when construction pulls back.
 const up=reference.y,front=referenceOverview(reference),preferred=add(add(reference.z,mul(reference.x,.55)),mul(up,.35));
 const overview=cameraOrientation(preferred,up),spineView=avoidEndOn(overview,pairs.spine,up,{maxAlignment:.7,targetAlignment:.6}),shoulderView=avoidEndOn(spineView,pairs.shoulder,up,{maxAlignment:.5,targetAlignment:.4});
 const projectionViewpoint=projectionView(shoulder,raw,up,preferred);
 const projectionCamera=cameraOrientation(cameraWithVisiblePlane(cameraBetween(projectionViewpoint,projectionViewpoint,1),raw).direction,up);
 const topView=cameraOrientation(add(mul(up,Math.cos(Math.PI/30)),mul(reference.z,Math.sin(Math.PI/30))),up);
 const polarView=constrainViewElevation(cameraOrientation(rotation.turnedX,up),up);
 const spinView=constrainViewElevation(cameraOrientation(add(raw,mul(reference.z,.12)),up),up,6,65);
 const views={azimuth:topView,polar:polarView,spin:spinView},between=(a,b,t)=>uprightCameraBetween(a,b,t,up,reference.z),prelude=createReferencePrelude(reference,front);
 const action=(id,motionDuration=1600,hold=500,extra={})=>({id,title:id.replaceAll('-',' '),duration:motionDuration+hold,motionDuration,...extra});
 const pairStages=key=>['focus','grow','release','align'].map(phase=>action(key+'-'+phase,phase==='grow'?1600:1100,500,{pair:key,pairPhase:phase}));
 const segments=[...openingSegments(),action('reference-focus',1100),...prelude.segments,action('selected-focus',1300),action('measurement-camera',1800),action('reference-align',2200),
  ...pairStages('spine'),action('shoulder-camera',1500),...pairStages('shoulder'),action('crossbar-plane',1300),action('crossbar-camera',1500),action('crossbar-angle',700,1700),action('crossbar-project',1800),action('crossbar-original-fade',1100),action('reference-t',1500,1000),
  ...['azimuth','polar','spin'].flatMap(key=>[action(key+'-camera',1600),...(key==='azimuth'?[action('azimuth-plane',1300)]:[]),action(key+'-ready',650,900),action(key,3400),...(key==='azimuth'?[action('forward-fade',1100)]:[])]),
  {id:'finish',title:'Review the T orientation',duration:8000,completion:true},action('reset',1200)];
 const duration=scheduleTimeline(segments,entry),index=id=>segments.findIndex(s=>s.id===id),has=(s,id)=>segments.indexOf(s)>=index(id);
 const empty=(opacity=1)=>{const a=completedAxes(frame,opacity);a.x=a.y=a.z=null;return a;};
 const stemEnd=f=>add(origin,mul(f.y,stemLength));
 function tShape(f,opacity=1){
  const top=stemEnd(f),a=empty(opacity);a.frame={...frame,...f};
  a.y={from:origin,to:top,shape:'bar',stopAt:'x'};a.x={from:add(top,mul(f.x,-halfWidth)),to:add(top,mul(f.x,halfWidth)),shape:'bar'};return a;
 }
 function referenceT(f,opacity=1){
  const t=tShape(f,opacity);t.y.keepVisible=true;
  t.z={from:origin,to:add(origin,mul(f.z,stemLength*.5)),opacity:.4};return t;
 }
 const targetT=opacity=>tShape(rotation.target,opacity);
 const plane=(kind,opacity=1,size=1)=>kind==='azimuth'?{origin,u:reference.x,v:reference.z,size:stemLength*.7*size,opacity,axis:'y'}:kind==='polar'?{origin,u:up,v:rotation.horizontal,size:stemLength*.7*size,opacity,axis:'x'}:{origin:pairs.spine.to,u:rotation.turnedX,v:rotation.tiltedZ,size:halfWidth*1.6*size,opacity,axis:'y'};
 const bodyPoints=Object.values(pairs).flatMap(p=>[p.from,p.to]);
 const points=[...bodyPoints,add(origin,mul(up,stemLength)),...[-1,1].flatMap(a=>[-1,1].map(b=>add(origin,add(mul(reference.x,stemLength*.7*a),mul(reference.z,stemLength*.7*b)))))];
 function measured(state,key,p){
  const result=rotation.sample(key,p);state.referenceAxes=key==='azimuth'?referenceT(result.frame):tShape(result.frame);state.referenceAxes.y.keepVisible=true;state.torsoAxes=targetT(.42);state.values=result.values;state.active=key;
  state.plane=plane(key);
  state.sectors=rotation.sectors(key,values[key]*p).map(sector=>({...sector,origin:key==='spin'?pairs.spine.to:origin,radius:key==='spin'?halfWidth*.9:stemLength*.65}));highlightRotationAxis(state,p);
 }
 function sampleState(time){
  const s=segments.find(s=>time<s.end)??segments.at(-1),elapsed=time-s.start,progress=clamp(elapsed/Math.max(1e-9,s.duration)),p=ease(clamp(elapsed/Math.max(1e-9,s.motionDuration??s.duration)));
  const state={segment:s.id,title:s.title,progress,referencePose:.5,selectedPose:1,referenceAxes:null,torsoAxes:null,values:{azimuth:0,polar:0,spin:0},active:null,focus:0,focusOrigin:origin,camera:cameraBetween(front,front,1),sectors:[],jointHighlights:[],pairFocus:null,plane:null};
  if(sampleOpening(state,s,p,values))return state;
  if(s.id==='reference-focus'){state.referencePose=.5-.22*p;state.selectedPose=1-p;return state;}
  if(prelude.sample(state,s,p))return state;
  state.referencePose=0;state.selectedPose=.28;state.referenceAxes=completedAxes(reference);
  if(s.id==='selected-focus'){state.referencePose=.28*(1-p);state.selectedPose=.28*p;return state;}
  const move=s.id==='reference-align'?p:has(s,'reference-align')?1:0,ref={...reference,origin:mix(reference.origin,origin,move),length:reference.length*(1-move)+stemLength*move};
  const destination=referenceT(reference);
  state.referenceAxes=referenceT(reference);
  if(s.id==='reference-align'){
   const original=completedAxes(reference);
   for(const axis of ['x','y','z']){
    state.referenceAxes[axis]={...destination[axis],from:mix(original[axis].from,destination[axis].from,p),to:mix(original[axis].to,destination[axis].to,p)};
    if(axis==='z')state.referenceAxes.z.opacity=1-.6*p;
    if(axis!=='z'){delete state.referenceAxes[axis].shape;state.referenceAxes[axis].shapeBlend=p;}
   }
  }else if(!has(s,'reference-align'))state.referenceAxes=completedAxes(reference);
  const fitPoints=[...points,ref.origin,...['x','y','z'].map(axis=>add(ref.origin,mul(ref[axis],ref.length)))];
  state.pairFocus={points:fitPoints,amount:s.id==='measurement-camera'?p:1};state.camera=between(front,spineView,s.id==='measurement-camera'?p:1);
  if(s.id==='measurement-camera')return state;
  if(!has(s,'spine-focus'))return state;
  state.referenceAxes=referenceT(reference);state.torsoAxes=empty(.65);
  state.torsoAxes.y={from:origin,to:pairs.spine.to,shape:'bar',stopAt:'x'};
  if(has(s,'shoulder-camera'))state.camera=between(spineView,shoulderView,s.id==='shoulder-camera'?p:1);
  if(has(s,'shoulder-focus'))state.torsoAxes.x={from:add(pairs.spine.to,mul(shoulder,-halfWidth)),to:add(pairs.spine.to,mul(shoulder,halfWidth)),shape:'bar'};
  if(s.pair){
   const pair=pairs[s.pair],aligned=s.pair==='spine'?{from:origin,to:pairs.spine.to}:{from:add(pairs.spine.to,mul(shoulder,-halfWidth)),to:add(pairs.spine.to,mul(shoulder,halfWidth))};
   const arrow=jointPairArrow(pair,aligned,s.pairPhase,p);
   if(s.pairPhase==='align')arrow.shapeBlend=p;
   state.torsoAxes[s.pair==='spine'?'y':'x']=arrow;
   state.jointHighlights=[{pose:'selected',joints:pair.joints,strength:jointPairEmphasis(s.pairPhase,p)}];return state;
  }
  if(!has(s,'crossbar-plane'))return state;
  state.plane=plane('spin',1,s.id==='crossbar-plane'?p:1);
  if(has(s,'crossbar-camera'))state.camera=between(shoulderView,projectionCamera,s.id==='crossbar-camera'?p:1);
  if(s.id==='crossbar-angle')state.torsoAxes.angleMarker=planeProjectionAngle(shoulder,raw,{origin:pairs.spine.to,radius:halfWidth*.65,opacity:p});
  if(has(s,'crossbar-project')){
   const q=projectionMotion(shoulder,raw,s.id==='crossbar-project'?'project':'fade',s.id==='crossbar-original-fade'?p:s.id==='crossbar-project'?p:1),top=pairs.spine.to;
   state.torsoAxes.x={from:add(top,mul(q.direction,-halfWidth)),to:add(top,mul(q.direction,halfWidth)),shape:'bar'};
   if(q.originalOpacity>0){state.originalTorsoAxes=empty(.65*q.originalOpacity);state.originalTorsoAxes.x={from:add(top,mul(shoulder,-halfWidth)),to:add(top,mul(shoulder,halfWidth)),shape:'bar'};}
   state.torsoAxes.projectionSweep=projectionSweep(shoulder,q.direction,raw,{origin:top,radius:halfWidth*.8,opacity:q.originalOpacity});
   if(s.id==='crossbar-project')state.torsoAxes.angleMarker=planeProjectionAngle(q.direction,raw,{origin:top,radius:halfWidth*.65});
  }
  if(has(s,'reference-t')){
   state.referenceAxes=referenceT(reference);state.torsoAxes=targetT(.42);state.plane=plane('spin');
  }
  if(s.id==='forward-fade'){
   measured(state,'azimuth',1);state.referenceAxes.z.opacity=.4*(1-p);state.camera=between(topView,topView,1);return state;
  }
  if(s.id==='azimuth-plane'){
   measured(state,'azimuth',0);state.sectors=[];state.plane=plane('azimuth',1,p);state.camera=between(topView,topView,1);return state;
  }
  const order=['azimuth','polar','spin'];
  for(const key of order){
   if(!has(s,key+'-camera'))continue;
   const previous=key==='azimuth'?projectionCamera:views[order[order.indexOf(key)-1]];
   state.camera=between(previous,views[key],s.id===key+'-camera'?p:1);
   if(s.id===key+'-camera'||s.id===key+'-ready'){measured(state,key,0);state.sectors=[];if(key==='azimuth'&&s.id==='azimuth-camera')state.plane=p<1?plane('spin',1,1-p):null;else if(key==='polar')state.plane=plane(key,s.id===key+'-camera'?p:1);return state;}
   if(s.id===key){measured(state,key,p);return state;}
  }
  if(s.id==='finish'){
   measured(state,'spin',1);state.camera=between(spinView,spinView,1);const timing=reviewTiming(progress,s.duration);if(timing.holding)return state;
   const q=timing.progress;
   if(q<.22){const t=ease(q/.22);state.referenceAxes.opacity=1-t;state.values={azimuth:0,polar:0,spin:0};state.sectors=[];state.camera=between(spinView,overview,t);state.pairFocus={points:fitPoints,amount:1-t};state.focus=.28*t;}
   else{
    state.pairFocus=null;state.focus=.28;state.camera=between(overview,overview,1);
    if(q<.34){measured(state,'azimuth',0);state.referenceAxes.opacity=referenceResetOpacity(q,s.duration,.34);state.sectors=[];}
    else{const position=(q-.34)/.57*3,i=Math.min(2,Math.floor(position)),amount=ease(clamp((position-i-.22)/.78));measured(state,order[i],amount);if(i===1&&position-i<.22){state.referenceAxes.z={from:origin,to:add(origin,mul(rotation.sample('azimuth',1).frame.z,stemLength*.5)),opacity:.4*(1-ease((position-i)/.22))};}}
   }
   state.selectedPose=.28+.02*ease(clamp(q/.22));return state;
  }
  if(s.id==='reset'){
   measured(state,'spin',1);state.referenceAxes.opacity=1-p;state.torsoAxes.opacity=.42*(1-p);state.plane.opacity=1-p;state.sectors=[];state.pairFocus=null;state.focus=.28*(1-p);state.camera=between(overview,front,p);state.selectedPose=.3+.7*p;
  }
  return state;
 }
 function sample(time){
  const state=sampleState(time),i=index(state.segment);fadeReviewTarget(state,segments,.34);
  if(i>=index('crossbar-plane')&&i<=index('azimuth-camera')){
   const visible=cameraWithVisiblePlane(state.camera,raw);
   const amount=state.segment==='crossbar-plane'?ease(clamp((time-segments[i].start)/segments[i].motionDuration)):1;
   state.camera={...state.camera,direction:unit(mix(state.camera.direction,visible.direction,amount))};
  }
  state.camera=uprightCamera(state.camera,up);return state;
 }
 return separateReviewTransition({segments,duration,frames:{reference,torso:target},values,sample},entry);
}
