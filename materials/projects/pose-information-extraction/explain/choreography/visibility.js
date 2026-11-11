import {ease,clamp} from '../ui/timeline.js';

const threshold=1e-7;
const span=spec=>spec.from&&spec.to?Math.hypot(...spec.to.map((n,i)=>n-spec.from[i])):1;

// Visibility is independent of geometry, values and camera motion. Semantic
// keys distinguish successive pies/planes while keeping moving arrows stable.
function components(state){
 const result=new Map();
 function add(key,object,field='opacity',parent=1,extent=1,signature){
  if(!object)return;
  const opacity=object[field]??1;
  if(opacity*parent<=threshold)return;
  result.set(key,{opacity:opacity*parent,extent,signature,set:factor=>{object[field]=opacity*factor;}});
 }
 for(const pose of ['referencePose','selectedPose'])add(pose,state,pose);
 for(const key of ['referenceAxes','torsoAxes','originalReferenceAxes','originalTorsoAxes']){
  const axes=state[key];if(!axes)continue;
  const parent=axes.opacity??1;
  for(const axis of ['x','y','z'])if(axes[axis]){
   const spec=axes[axis];add(key+'.'+axis,spec,'opacity',parent,span(spec),{from:spec.from,to:spec.to,color:spec.color??spec.colorAxis??axis,shape:spec.shape??'arrow'});
  }
  for(const marker of ['angleMarker','projectionSweep'])if(axes[marker])add(key+'.'+marker,axes[marker],'opacity',parent,Math.abs(axes[marker].angle));
  if(axes.componentPlane)add(key+'.componentPlane',axes.componentPlane,'opacity',parent,axes.componentPlane.size);
  if(axes.plane>0)add(key+'.plane',axes,'planeOpacity',parent,axes.plane);
 }
 if(state.plane){
  const plane=state.plane,orientation=[plane.axis??'y',...(plane.u??[]),...(plane.v??[])].join(',');
  add('plane:'+orientation,plane,'opacity',1,plane.size);
 }
 for(const [i,sector] of (state.sectors??[]).entries())add(`sector:${sector.axis}:${sector.direction??i}`,sector,'opacity',1,Math.abs(sector.angle));
 for(const key of ['guides','boneGuides'])for(const guide of state[key]??[])add(key+':'+guide.id,guide,'opacity',1,guide.kind==='point'?(guide.radius??4):span(guide));
 return result;
}

function sameArrow(a,b){
 const x=a.signature,y=b.signature;
 return x&&y&&x.color===y.color&&x.shape===y.shape&&Math.abs(a.opacity-b.opacity)<.02&&
  ['from','to'].every(key=>x[key].every((v,i)=>Math.abs(v-y[key][i])<1e-6));
}

// Audit a deterministic timeline once. Only discontinuous visibility changes
// get an automatic fade. Existing opacity fades, growth, shrinking, projection,
// and rotation remain authored by their choreographies. Fades use timeline
// time, so pausing and seeking cannot leave delayed or stale components.
export function createVisibilitySampler(plan,{fadeDuration=240}={}){
 const times=new Set([0,plan.duration]);
 for(let time=0;time<plan.duration;time+=40)times.add(time);
 for(const segment of plan.segments){
  const count=segment.completion?64:4;
  for(let i=0;i<=count;i++)times.add(segment.start+segment.duration*i/count);
  if(segment.motionDuration!==undefined)times.add(segment.start+segment.motionDuration);
 }
 const events=[],ordered=[...times].sort((a,b)=>a-b);
 let previousTime=ordered[0],previous=components(plan.sample(previousTime));
 function event(key,from,to,appearing){
  let low=from,high=to;
  for(let i=0;i<20;i++){
   const middle=(low+high)/2,present=components(plan.sample(middle)).has(key);
   if(present===appearing)high=middle;else low=middle;
  }
  const time=(low+high)/2,epsilon=Math.min(.001,(to-from)/100);
  const visible=components(plan.sample(appearing?time+epsilon:time-epsilon)).get(key);
  // A continuous authored fade or a zero-size construction already explains
  // its appearance/disappearance and must not be replaced by another effect.
  if(!visible||visible.opacity<.01||visible.extent<1e-5)return;
  const segment=plan.segments.find(s=>(appearing?time+epsilon:time-epsilon)>=s.start&&(appearing?time+epsilon:time-epsilon)<s.end);
  const duration=Math.min(fadeDuration,(segment?.duration??fadeDuration)*.35);
  events.push({key,time,appearing,duration});
 }
 for(const time of ordered.slice(1)){
  const current=components(plan.sample(time));
  const removed=[...previous.keys()].filter(key=>!current.has(key)),added=[...current.keys()].filter(key=>!previous.has(key)),handoffs=new Set();
  // Moving the same visible arrow between renderer layers is not a hide/show.
  for(const oldKey of removed)for(const newKey of added)if(sameArrow(previous.get(oldKey),current.get(newKey))){handoffs.add(oldKey);handoffs.add(newKey);}
  for(const key of removed)if(!handoffs.has(key))event(key,previousTime,time,false);
  for(const key of added)if(!handoffs.has(key))event(key,previousTime,time,true);
  previous=current;previousTime=time;
 }
 return {events,sample(time){
  const state=plan.sample(time),visible=components(state),factors=new Map();
  for(const event of events){
   const elapsed=event.appearing?time-event.time:event.time-time;
   if(elapsed<0||elapsed>event.duration||!visible.has(event.key))continue;
   const factor=ease(clamp(elapsed/event.duration));factors.set(event.key,Math.min(factors.get(event.key)??1,factor));
  }
  for(const [key,factor] of factors)visible.get(key).set(factor);
  return state;
 }};
}
