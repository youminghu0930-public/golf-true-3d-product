import {stepCaption} from './captions.js';

// Caption cues follow semantic actions, rather than every animation segment.
// Begin definitions during joint emphasis and projections during their angle
// preview. Silent follow-through can provide reading time without delaying the
// next explanation or changing the animation's tempo.
export function createCaptionTimeline(model,plan){
 const cues=[];
 for(let i=0;i<plan.segments.length;i++){
  const segment=plan.segments[i];
  if(segment.completion)continue;
  const text=stepCaption(model,segment,plan.sample(segment.start+segment.duration*.5));
  if(!text)continue;
  let start=segment.start;
  const previous=plan.segments[i-1];
  if(previous){
   if(segment.id.endsWith('grow')&&previous.id.endsWith('focus'))start=previous.start;
   if(/(?:project|projection|orthogonalize)$/.test(segment.id)&&/(?:angle|angle-reveal)$/.test(previous.id))start=previous.start;
  }
  // Plane and normal belong to one cross-product explanation.
  const cross=segment.id.match(/^(reference|torso)-(plane|forward)$/);
  const leveling=segment.id.match(/^(reference|torso)-(up|orthogonalize)$/);
  const caption=cross?'Use the left–up plane to define forward, perpendicular to both directions.':leveling?leveling[1]==='reference'?'Use global up to level the left–right direction.':'Use the upper spine as up; make left–right perpendicular to it.':text;
  const last=cues.at(-1);
  if(last?.text===caption){last.actionEnd=segment.end;continue;}
  cues.push({start,actionEnd:segment.end,text:caption});
 }
 for(let i=0;i<cues.length;i++){
  const cue=cues[i],readingTime=Math.max(2800,Math.min(5000,cue.text.split(/\s+/).length*230));
  const boundary=plan.segments.find(s=>s.start>=cue.actionEnd-1e-6&&['selected-focus','finish','reset'].includes(s.id))?.start??plan.duration;
  cue.end=Math.min(cues[i+1]?.start??plan.duration,boundary,Math.max(cue.actionEnd,cue.start+readingTime));
 }
 return {cues,sample(time){
  const segment=plan.segments.find(s=>time>=s.start&&time<s.end);
  // Review uses its actual active measurement; never carry text over a reset.
  if(segment?.completion)return stepCaption(model,segment,plan.sample(time));
  return cues.find(cue=>time>=cue.start&&time<cue.end)?.text??null;
 }};
}
