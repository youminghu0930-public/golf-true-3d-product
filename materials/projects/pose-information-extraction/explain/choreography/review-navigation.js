import {reviewTiming} from './review-timing.js';

// Configured transition belongs to Explain restrictions; Review is unrestricted.
// Older plans retain their authored settling boundary. Pivots affect manual orbit only.
export function reviewNavigation(entry,plan,time,state=plan.sample(time)){
 const intro=plan.segments.find(s=>s.id==='intro'),finish=plan.segments.find(s=>s.id==='finish');
 if(time>=intro.start&&time<finish.start)return {restricted:true,pivot:null};
 if(state.segment!=='finish'||entry.type==='position')return {restricted:false,pivot:null};
 const timing=reviewTiming(state.progress,finish.duration);
 const restricted=entry.transition===undefined&&(timing.holding||timing.progress<.22);
 const pivot=entry.subtype==='spine_azimuth_polar_spin'
  ?state.torsoAxes?.y?.to
  :state.sectors?.[0]?.origin??state.torsoAxes?.frame?.origin??state.referenceAxes?.frame?.origin;
 return {restricted,pivot:pivot??null};
}
