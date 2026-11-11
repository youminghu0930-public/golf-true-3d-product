// Retiming adapter: existing recipes keep their authored reset and replay, while
// configuration independently controls setup and actual review playback.
export function separateReviewTransition(plan,entry){
 if(entry.transition===undefined)return plan;
 const original=plan.segments.find(s=>s.id==='finish'),transition=entry.transition*1000;
 const ready=entry.type==='position'?.22:entry.subtype==='spine_azimuth_polar_spin'||entry.subtype.startsWith('torso_')?.34:entry.subtype.endsWith('_on_spine_plane')?.4:.38;
 const hold=Math.min(1200,original.duration*.2),cutoff=hold+(original.duration-hold)*ready;
 const setup={...original,id:'review-transition',title:'Prepare review',completion:false,start:original.start,end:original.start+transition,duration:transition};
 const review={...original,start:setup.end,duration:Math.max(0,original.duration-transition)};
 const segments=plan.segments.flatMap(segment=>segment===original?[setup,review]:[segment]);
 return {...plan,segments,sample(time){
  let mapped=time;
  if(time>=setup.start&&time<setup.end)mapped=original.start+cutoff*(time-setup.start)/Math.max(1e-9,transition);
  else if(time>=review.start&&time<review.end)mapped=original.start+cutoff+(original.duration-cutoff)*(time-review.start)/Math.max(1e-9,review.duration);
  const state=plan.sample(mapped);
  if(time>=setup.start&&time<setup.end)state.segment='review-transition';
  if(state.segment==='finish')state.reviewDuration=original.duration;
  return state;
 }};
}
