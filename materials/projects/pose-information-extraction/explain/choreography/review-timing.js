// Let the completed result rest before any fade, camera motion or value reset.
export function reviewTiming(progress,duration){
 const hold=Math.min(1200,duration*.2)/duration;
 return {holding:progress<hold,progress:Math.max(0,(progress-hold)/(1-hold))};
}
import {ease,clamp} from '../ui/timeline.js';


// Reset geometry only while fully hidden. A real pause separates the outgoing
// vector from the returning zero direction, within the existing review time.
export function referenceResetOpacity(progress,duration,inEnd=.4){
 const outEnd=.22,activeDuration=Math.max(1,duration-Math.min(1200,duration*.2));
 const pause=Math.min(180/activeDuration,(inEnd-outEnd)*.3);
 if(progress<outEnd)return 1-ease(clamp(progress/outEnd));
 return ease(clamp((progress-outEnd-pause)/(inEnd-outEnd-pause)));
}

// A target can switch from its final direction back to its projected review
// direction even while the same renderer object remains present. Fade it
// explicitly across that reset; presence-only fades cannot detect this change.
export function fadeReviewTarget(state,segments,inEnd=.4,switches=[]){
 if(state.segment!=='finish'||!state.torsoAxes)return;
 const segment=segments.find(s=>s.id==='finish'),timing=reviewTiming(state.progress,segment.duration);
 if(timing.holding)return;
 const q=timing.progress,activeDuration=Math.max(1,segment.duration-Math.min(1200,segment.duration*.2));
 let opacity=q<inEnd?referenceResetOpacity(q,segment.duration,inEnd):1;
 for(const {at,ready} of switches){
  const out=Math.min(240/activeDuration,.05),pause=Math.min(100/activeDuration,(ready-at)*.3);
  if(q>=at-out&&q<at)opacity*=ease(clamp((at-q)/out));
  else if(q>=at&&q<ready)opacity*=ease(clamp((q-at-pause)/(ready-at-pause)));
 }
 state.torsoAxes.opacity=(state.torsoAxes.opacity??1)*opacity;
}
