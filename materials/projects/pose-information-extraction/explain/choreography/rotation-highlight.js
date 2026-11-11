import {axisColors,brightAxisColors,blendColors} from '../palette.js';
import {sub,dot,cross,length,unit} from '../math.js';
import {ease,clamp} from '../ui/timeline.js';

// Color alone highlights the true rotation line: no halo or thicker stroke.
// Only existing visible vectors can brighten; hidden axes stay hidden.
export function highlightRotationAxis(state,progress){
 const sector=state.sectors?.[0];if(!sector)return;
 const amount=ease(clamp(progress/.12))*ease(clamp((1-progress)/.12));
 if(amount<=0)return;
 const normal=unit(sector.normal),origin=sector.origin;
 for(const key of ['referenceAxes','torsoAxes','originalReferenceAxes','originalTorsoAxes']){
  const axes=state[key];if(!axes||(axes.opacity??1)<=0)continue;
  for(const axis of ['x','y','z']){
   const vector=axes[axis];if(!vector||(vector.opacity??1)<=0)continue;
   const delta=sub(vector.to,vector.from);if(length(delta)<1e-8)continue;
   if(Math.abs(dot(unit(delta),normal))<.99999||length(cross(sub(vector.from,origin),normal))>1e-6)continue;
   const colorAxis=vector.colorAxis??axis;
   vector.color=blendColors(vector.color??axisColors[colorAxis],brightAxisColors[colorAxis],amount);
  }
 }
}
