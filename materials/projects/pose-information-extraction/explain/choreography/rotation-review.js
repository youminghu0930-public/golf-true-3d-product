import {reviewTiming,referenceResetOpacity} from './review-timing.js';
import {cameraOrientation,cameraBetween,uprightCameraBetween} from './camera.js';
import {ease,clamp} from '../ui/timeline.js';
// One continuous global view: reveal the pose, fade-reset the axes, replay Y–X–Z.
export function createRotationReview(reference,rotation){
 const direction=reference.z.map((n,i)=>n+.65*reference.x[i]+.35*reference.y[i]);
 const view=cameraOrientation(direction,reference.y),focus=.32,pose=.3;
 function sample(state,progress,duration){
  const timing=reviewTiming(progress,duration);
  if(timing.holding)return rotation.sample(state,{id:'finish'},1);
  const p=clamp(timing.progress);
  if(p<.22){
   rotation.sample(state,{id:'finish'},1);
   const start=cameraOrientation(state.camera.direction,state.camera.up),t=ease(p/.22);
   state.camera=uprightCameraBetween(start,view,t,reference.y,reference.z);state.focus=1+(focus-1)*t;state.selectedPose=.1+(pose-.1)*t;
   state.referenceAxes.opacity=1-t;state.values={turn:0,bend:0,tilt:0};
   state.sectors=[];return state;
  }
  if(p<.34){
   rotation.setAngles(state,0);state.referenceAxes.opacity=referenceResetOpacity(p,duration,.34);state.sectors=[];
  }else if(p<.88){
   const step=(p-.34)/.54*3,index=Math.min(2,Math.floor(step));
   // Reserve the first quarter of each rotation slot for a quiet pause.
   const motion=clamp((step-index-.25)/.75);
   rotation.sample(state,{id:['turn','bend','tilt'][index]},ease(motion));
  }else rotation.sample(state,{id:'finish'},1);
  state.camera=cameraBetween(view,view,1);state.focus=focus;state.selectedPose=pose;
  return state;
 }
 return {sample,view,focus,pose};
}
