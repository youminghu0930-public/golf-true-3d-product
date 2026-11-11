import {ease,clamp} from '../ui/timeline.js';
// A common result-first opening; scheduled with the rest of each explanation.
export function openingSegments(){return [
 {id:'result-preview',title:'Selected pose · final result',duration:2200,intro:true,opening:'result'},
 {id:'intro',title:'Reference + selected pose',duration:1600,motionDuration:1100,intro:true,opening:'reference'},
];}
export function openingState(segment,progress,values){
 if(!segment.opening)return null;
 return {referencePose:segment.opening==='result'?0:.5*ease(clamp(progress)),selectedPose:1,
  values:Object.fromEntries(Object.entries(values).map(([key,value])=>[key,segment.opening==='result'?value:0]))};
}
export function sampleOpening(state,segment,progress,values){
 const opening=openingState(segment,progress,values);if(!opening)return false;
 Object.assign(state,opening);return true;
}
