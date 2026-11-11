// Deduplicate coincident arrows within each visual role. The thick translucent
// final target remains independent of the thin solid source/destination layer.
// Stronger layers own shared components so deselecting another cannot fade them.
export function uniqueVideoAxes(samples,opacityFor=()=>1){
 const seen=new Set(),guideIds=new Set(),result=new Map();
 const ordered=[...samples].sort((a,b)=>opacityFor(b.key)-opacityFor(a.key));
 for(const {key,state} of ordered){
  const next={...state};
  for(const field of ['originalReferenceAxes','referenceAxes','torsoAxes']){
   const frame=state[field];if(!frame)continue;
   const copy={...frame};
   for(const axis of ['x','y','z']){
    const arrow=frame[axis];if(!arrow)continue;
    const role=field==='torsoAxes'?'target':'measurement';
    const signature=role+JSON.stringify([arrow.from,arrow.to].map(point=>point.map(value=>Math.round(value*1e7)/1e7)));
    if(seen.has(signature))delete copy[axis];else seen.add(signature);
   }
   next[field]=copy;
  }
  // Root markers and the animated corner are shared across direction groups.
  if(state.guides)next.guides=state.guides.filter(guide=>{
   if(guideIds.has(guide.id))return false;guideIds.add(guide.id);return true;
  });
  result.set(key,next);
 }
 return samples.map(({key})=>({key,state:result.get(key)}));
}
