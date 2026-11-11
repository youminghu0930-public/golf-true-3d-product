import {explainSnapshot} from './index.js';
import {metricPlans} from './choreography/metric-plans.js';

// Reuse the exact snapshot geometry at a completed measurement, with no clock,
// camera choreography, construction helpers or review-reset animation.
export function createStaticMeasurementSampler(data,metrics,entry){
 const cache=new Map();
 return {sample(frame,keys){
  if(!keys.length)return [];
  let plan=cache.get(frame);
  if(!plan){
   const model=explainSnapshot(data,metrics,{type:entry.type,subtype:entry.subtype,frame});
   const create=metricPlans[entry.subtype];if(!create)throw new Error('Unsupported video metric');
   plan=create(model);cache.set(frame,plan);if(cache.size>24)cache.delete(cache.keys().next().value);
  }
  return keys.map(key=>{
   const segment=plan.segments.find(s=>s.id===key);if(!segment)throw new Error('Unknown measurement');
   let state=plan.sample(segment.start+(segment.motionDuration??segment.duration));
   if(entry.subtype==='hip_sway_thrust_lift'){
    // Video shows completed axis arrows and joint centers, without construction guides.
    const final=plan.segments.find(segment=>segment.id==='lift');
    state=plan.sample(final.start+(final.motionDuration??final.duration));
    state={...state,active:key,guides:state.guides.filter(guide=>guide.id==='axis-measure-'+key||guide.id==='reference-root'||guide.id==='selected-root')};
   }
   if(['torso_turn_bend_tilt','torso_turn_bend_tilt_by_shoulder'].includes(entry.subtype)){
    // The animated reference has reached the destination at this sample.
    // Retain the frame before this intrinsic rotation as the angle's baseline.
    state.originalReferenceAxes=plan.sample(segment.start).referenceAxes;
   }
   for(const [axis,colorAxis] of Object.entries(plan.targetAxisColors??{}))if(state.torsoAxes?.[axis])state.torsoAxes[axis].colorAxis=colorAxis;
   return {key,state};
  });
 }};
}
