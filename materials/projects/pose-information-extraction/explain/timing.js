export function validateDuration(seconds){
 if(seconds!==undefined&&(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<=0))throw new Error('Snapshot duration must be a positive number of seconds');
}
export function validateStay(seconds){
 if(seconds!==undefined&&(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0))throw new Error('Snapshot stay must be a nonnegative number of seconds');
}
// Scale motion and hold intervals together; omission preserves authored tempo.
export function scheduleTimeline(segments,seconds,stay){
 if(seconds&&typeof seconds==='object'){
  const settings=seconds;
  if(settings.explain!==undefined)return schedulePhases(segments,settings);
  return scheduleTimeline(segments,settings.duration,settings.stay);
 }
 validateDuration(seconds);validateStay(stay);
 const scalable=segments.filter(segment=>!(stay!==undefined&&segment.completion));
 const natural=scalable.reduce((sum,segment)=>sum+segment.duration,0),target=seconds===undefined?natural:seconds*1000,scale=target/natural;
 let elapsed=0;
 for(const segment of segments){
  segment.duration=stay!==undefined&&segment.completion?stay*1000:segment.duration*scale;if(segment.motionDuration!==undefined)segment.motionDuration*=scale;
  segment.start=elapsed;elapsed+=segment.duration;segment.end=elapsed;
 }
 const total=target+(stay===undefined?0:segments.filter(segment=>segment.completion).length*stay*1000);
 if(segments.length){const last=segments.at(-1);last.end=total;last.duration=total-last.start;}
 return total;
}

function schedulePhases(segments,settings){
 validateDuration(settings.explain);
 for(const key of ['start_stay','transition','review','end_stay'])validateStay(settings[key]);
 // Reserve the end of review for fading helpers back to the pose-only view.
 const review=settings.review*1000,reset=Math.min(800,review*.1);
 const fixed=new Map([['result-preview',settings.start_stay*1000],['finish',review-reset+(settings.transition??0)*1000],['reset',reset]]);
 segments.push({id:'end-stay',title:'Selected pose · final result',opening:'result',duration:settings.end_stay*1000});
 fixed.set('end-stay',settings.end_stay*1000);
 const natural=segments.filter(s=>!fixed.has(s.id)).reduce((n,s)=>n+s.duration,0),scale=settings.explain*1000/natural;
 let elapsed=0;
 for(const segment of segments){
  const factor=fixed.has(segment.id)?(segment.duration?fixed.get(segment.id)/segment.duration:0):scale;
  segment.duration=fixed.get(segment.id)??segment.duration*scale;
  if(segment.motionDuration!==undefined)segment.motionDuration*=factor;
  segment.start=elapsed;elapsed+=segment.duration;segment.end=elapsed;
 }
 return elapsed;
}
