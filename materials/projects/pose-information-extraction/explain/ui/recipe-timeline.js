import {openingSegments} from '../choreography/opening.js';
import {sequence,STAGE_DURATION,clamp} from './timeline.js';
import {scheduleTimeline} from '../timing.js';
export function createRecipeTimeline(items,seconds,selected,stay){
 const segments=[...openingSegments(),...sequence(items,selected).map(({itemIndex,stepIndex})=>({itemIndex,stepIndex,duration:Math.max(STAGE_DURATION,items[itemIndex].steps[stepIndex].visuals.filter(v=>v.jointPair).length*5300)}))];
 if(stay!==undefined)segments.push({...segments.at(-1),completion:true,duration:0});
 const duration=scheduleTimeline(segments,seconds,stay);
 return {segments,duration,sample(time){const segment=segments.find(step=>time<step.end)??segments.at(-1);return {segment,progress:segment.completion?1:clamp((time-segment.start)/segment.duration)};}};
}
