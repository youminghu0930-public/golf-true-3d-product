import {separateReviewTransition} from './review-transition.js';
import {fadeReviewTarget} from './review-timing.js';
import {highlightRotationAxis} from './rotation-highlight.js';
import {openingSegments,sampleOpening} from './opening.js';
import {add,sub,mul,unit} from '../math.js';
import {frameDefinitions,completedAxes,mix} from './axis-frame.js';
import {createReferencePrelude} from './reference-prelude.js';
import {createPlaneInclination} from './plane-inclination.js';
import {jointPairArrow,jointPairEmphasis} from './joint-pair.js';
import {avoidEndOn} from './pair-camera.js';
import {projectionView} from './vector-projection.js';
import {referenceOverview,cameraOrientation,cameraBetween,uprightCameraBetween,uprightCamera,viewFromLeanSide} from './camera.js';
import {scheduleTimeline} from '../timing.js';
import {reviewTiming,referenceResetOpacity} from './review-timing.js';
import {ease,clamp} from '../ui/timeline.js';

export function createSpineBendTiltChoreography(model){
 const c=model.context,{entry,meta}=c,reference=frameDefinitions(c.data,meta,entry.frame).reference;
 const feature=c.spine(),pair={from:c.source(feature.from),to:c.source(feature.to),joints:feature.joints};
 const origin=pair.from,raw=unit(sub(pair.to,pair.from)),L=Math.hypot(...sub(pair.to,pair.from)),up=reference.y;
 const compactLength=Math.min(reference.length,L*.4);
 const frame={...reference,origin,length:L},torso={...frame,y:raw};
 const values=Object.fromEntries(model.items.map(item=>[item.key,item.computed]));
 const front=referenceOverview(reference),preferred=add(add(reference.z,mul(reference.x,.55)),mul(up,.35));
 const overview=cameraOrientation(preferred,up),stretch=avoidEndOn(overview,pair,up,{maxAlignment:.7,targetAlignment:.6});
 const between=(a,b,p)=>uprightCameraBetween(a,b,p,up,reference.z),prelude=createReferencePrelude(reference,front);
 const definitions={bend:{normal:reference.z,axis:'z',u:reference.x,v:up},tilt:{normal:reference.x,axis:'x',u:up,v:reference.z}};
 for(const [key,d] of Object.entries(definitions)){d.measure=createPlaneInclination(raw,d.normal,values[key]);d.view=viewFromLeanSide(projectionView(raw,d.normal,up,preferred),raw,d.normal,up);}
 const action=(id,motionDuration=1600,hold=500,extra={})=>({id,title:id.replaceAll('-',' '),duration:motionDuration+hold,motionDuration,...extra});
 const cycle=key=>[action(key+'-camera',1500),action(key+'-reference-fade',1200,900),action(key+'-ready',700),action(key,3200)];
 const segments=[...openingSegments(),action('reference-focus',1100),...prelude.segments,action('selected-focus',1300),action('measurement-camera',1800),
  action('reference-align',1800),action('reference-trim',1100),action('bend-plane',1400),
  ...['focus','grow','release','align'].map(phase=>action('spine-'+phase,phase==='grow'?1600:1100,500,{pairPhase:phase})),
  ...cycle('bend'),action('plane-switch',1400),action('tilt-plane',1400),...cycle('tilt'),
  {id:'finish',title:'Review spine bend and tilt',duration:6000,completion:true},action('reset',1200)];
 const duration=scheduleTimeline(segments,entry),index=id=>segments.findIndex(s=>s.id===id),has=(s,id)=>segments.indexOf(s)>=index(id);
 const arrow=d=>({from:origin,to:add(origin,mul(d,L))});
 function axes(d,opacity=1){const a=completedAxes(frame,opacity);a.x=arrow(d);a.y=null;a.z=null;return a;}
 function plane(key,size=1,opacity=1){const d=definitions[key];return {origin,u:d.u,v:d.v,size:L*size,opacity,axis:d.axis};}
 const points=[pair.from,pair.to,...[-1,1].flatMap(a=>[-1,1].flatMap(b=>['bend','tilt'].map(key=>add(origin,add(mul(definitions[key].u,L*a),mul(definitions[key].v,L*b))))))];
 function measured(state,key,p){
  const result=definitions[key].measure.sample(p);state.referenceAxes=axes(result.direction,1);state.referenceAxes.x.colorAxis=definitions[key].axis;state.torsoAxes=axes(raw,.42);
  state.values={bend:key==='bend'?result.angle:values.bend,tilt:key==='tilt'?result.angle:0};state.active=key;
  state.sectors=[{origin,from:definitions[key].measure.baseline,normal:definitions[key].measure.axis,angle:result.angle,radius:L*.8,axis:definitions[key].axis}];highlightRotationAxis(state,p);
 }
 function sampleState(time){
  const s=segments.find(s=>time<s.end)??segments.at(-1),elapsed=time-s.start,progress=clamp(elapsed/Math.max(1e-9,s.duration)),p=ease(clamp(elapsed/Math.max(1e-9,s.motionDuration??s.duration)));
  const state={segment:s.id,title:s.title,progress,referencePose:.5,selectedPose:1,referenceAxes:null,torsoAxes:null,values:{bend:0,tilt:0},active:null,focus:0,focusOrigin:origin,camera:cameraBetween(front,front,1),sectors:[],jointHighlights:[],pairFocus:null,plane:null};
  if(sampleOpening(state,s,p,values))return state;
  if(s.id==='reference-focus'){state.referencePose=.5-.22*p;state.selectedPose=1-p;return state;}
  if(prelude.sample(state,s,p))return state;
  state.referencePose=0;state.selectedPose=.28;state.referenceAxes=completedAxes(reference);
  if(s.id==='selected-focus'){state.referencePose=.28*(1-p);state.selectedPose=.28*p;return state;}
  const move=s.id==='reference-align'?p:has(s,'reference-align')?1:0,ref={...reference,origin:mix(reference.origin,origin,move),length:reference.length*(1-move)+compactLength*move};
  state.referenceAxes=completedAxes(ref,has(s,'bend-plane')?.3:1);
  const fitPoints=[...points,ref.origin,...['x','y','z'].map(axis=>add(ref.origin,mul(ref[axis],ref.length)))];
  state.pairFocus={points:fitPoints,amount:s.id==='measurement-camera'?p:1};state.camera=between(front,stretch,s.id==='measurement-camera'?p:1);
  if(s.id==='measurement-camera')return state;
  if(has(s,'bend-plane'))state.plane=plane('bend',s.id==='bend-plane'?p:1);
  if(s.id==='reference-trim')state.referenceAxes=completedAxes({...frame,length:compactLength},1-.7*p);
  if(has(s,'spine-focus')){state.referenceAxes.x=null;state.referenceAxes.y=null;state.referenceAxes.z=null;}
  if(s.pairPhase){state.torsoAxes=axes(raw,.65);state.torsoAxes.x=jointPairArrow(pair,arrow(raw),s.pairPhase,p);state.jointHighlights=[{pose:'selected',joints:pair.joints,strength:jointPairEmphasis(s.pairPhase,p)}];return state;}
  if(!has(s,'bend-camera'))return state;
  const key=has(s,'tilt-plane')?'tilt':'bend',d=definitions[key];
  state.plane=plane(key,s.id==='tilt-plane'?p:1);state.referenceAxes=axes(up,1);state.referenceAxes.x=null;state.torsoAxes=axes(raw,.42);
  if(key==='tilt')state.values.bend=values.bend;
  const previous=key==='bend'?stretch:definitions.bend.view;
  state.camera=between(previous,d.view,s.id===key+'-camera'?p:has(s,key+'-camera')?1:0);
  if(s.id==='plane-switch'){
   measured(state,'bend',1);state.referenceAxes.opacity=1-p;state.plane=plane('bend',1,1-p);state.camera=between(definitions.bend.view,definitions.bend.view,1);state.sectors=[];return state;
  }
  if(s.id==='tilt-plane'){state.referenceAxes=axes(up,1);state.referenceAxes.x=null;state.camera=between(definitions.bend.view,definitions.bend.view,1);return state;}
  if(s.id===key+'-reference-fade'||s.id===key+'-ready'){
   measured(state,key,0);state.referenceAxes.x.opacity=s.id===key+'-reference-fade'?p:1;state.sectors=[];return state;
  }
  if(s.id===key){measured(state,key,p);return state;}
  if(s.id==='finish'){
   measured(state,'tilt',1);state.camera=between(definitions.tilt.view,definitions.tilt.view,1);const timing=reviewTiming(progress,s.duration);if(timing.holding)return state;
   const q=timing.progress;state.plane=plane('tilt',1,.6);
   if(q<.22){const t=ease(q/.22);state.referenceAxes.opacity=1-t;state.values={bend:0,tilt:0};state.sectors=[];state.camera=between(definitions.tilt.view,overview,t);state.pairFocus={points:fitPoints,amount:1-t};state.focus=.32*t;state.plane.opacity=1-.4*t;}
   else{
    state.pairFocus=null;state.focus=.32;state.camera=between(overview,overview,1);
    if(q<.38){measured(state,'bend',0);state.referenceAxes.opacity=referenceResetOpacity(q,s.duration,.38);state.sectors=[];state.plane=plane('bend',1,.6);}
    else {
     // Fade the completed comparison away, then pause with neither plane
     // present before introducing side tilt. Every interval scales with review.
     const hold=.08,fade=.07,settle=.05;
     const motion=(1-.04-.04-hold-fade-settle)/2,t=clamp((q-.38)/.62),bendEnd=.04+motion,fadeEnd=bendEnd+fade,holdEnd=fadeEnd+hold,tiltStart=holdEnd+settle;
     if(t<fadeEnd){
      measured(state,'bend',ease(clamp((t-.04)/motion)));
      const opacity=1-ease(clamp((t-bendEnd)/fade));
      state.plane=plane('bend',1,.6*opacity);state.referenceAxes.opacity=opacity;
      state.sectors.forEach(sector=>{sector.opacity=opacity;});
     }else if(t<holdEnd){
      measured(state,'bend',1);state.plane=null;state.referenceAxes.opacity=0;state.sectors=[];
     }else{
      measured(state,'tilt',ease(clamp((t-tiltStart)/motion)));
      const opacity=ease(clamp((t-holdEnd)/settle));
      state.plane=plane('tilt',1,.6*opacity);state.referenceAxes.opacity=opacity;
     }
    }
   }
   state.selectedPose=.28+.02*ease(clamp(q/.22));return state;
  }
  if(s.id==='reset'){
   measured(state,'tilt',1);state.referenceAxes.opacity=1-p;state.torsoAxes.opacity=.42*(1-p);state.plane=plane('tilt',1,.6*(1-p));state.sectors=[];
   state.pairFocus=null;state.focus=.32*(1-p);state.camera=between(overview,front,p);state.referencePose=.5*p;state.selectedPose=.3+.7*p;
  }
  return state;
 }
 function sample(time){
  const state=sampleState(time);fadeReviewTarget(state,segments,.38);
  // Retain a compact global reference independently of the measuring arrow.
  if(state.segment!=='end-stay'&&index(state.segment)>=index('spine-focus')){
   const remaining=state.segment==='reset'?1-ease(clamp((time-segments.find(s=>s.id==='reset').start)/(segments.find(s=>s.id==='reset').motionDuration??segments.find(s=>s.id==='reset').duration))):1;
   state.originalReferenceAxes=completedAxes({...frame,length:compactLength},.3*remaining);
  }
  if(state.segment==='reset')state.referencePose=0;
  state.camera=uprightCamera(state.camera,up);return state;
 }
 return separateReviewTransition({segments,duration,frames:{reference,torso},values,targetAxisColors:{x:'y'},sample},entry);
}
