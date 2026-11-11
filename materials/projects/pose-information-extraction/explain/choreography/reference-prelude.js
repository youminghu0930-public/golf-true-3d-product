import {constructionSegments} from './construction.js';
import {createConstructionCamera} from './construction-camera.js';
import {constructAxes} from './axis-frame.js';
import {sampleConstruction} from './construction-state.js';
// The identical full reference-orientation opening used by angular metrics.
export function createReferencePrelude(frame,front){
 const camera=createConstructionCamera(frame,front);
 return {segments:constructionSegments('reference',frame),sample(state,segment,p){
  if(!segment.id.startsWith('reference-')||!segment.step)return false;
  state.referencePose=.28;state.selectedPose=0;
  if(segment.constructionCamera){
   state.referenceAxes=constructAxes(frame,segment.step,segment.view==='out'?1:0);
   Object.assign(state,camera(segment.view,p));
  }else{
   const result=sampleConstruction(frame,segment,p,'reference');state.referenceAxes=result.axes;state.jointHighlights=result.highlights;
   Object.assign(state,camera(segment.step==='orthogonalize'?'orthogonalize':['plane','forward','plane-fade'].includes(segment.step)?'cross-hold':'hold',1));
  }
  return true;
 }};
}
