import {make} from './dom.js';
import {playbackStages} from '../playback-stages.js';

export function createStageTimeline(plan,slider,onSeek){
 const root=make('div',undefined,'explain-stage-timeline'),tags=make('nav',undefined,'explain-stage-tags');
 tags.setAttribute('aria-label','Explanation stages');
 const stages=playbackStages(plan),buttons=stages.map(stage=>{
  const button=make('button',stage.label,'explain-stage-tag');button.type='button';
  button.style.flexGrow=stage.end-stage.start;
  button.setAttribute('aria-label',`Jump to ${stage.label.toLowerCase()} stage`);
  button.title=`${stage.label} · ${(stage.start/1000).toFixed(1)}s`;
  button.onclick=()=>onSeek(stage.start);tags.append(button);return button;
 });
 root.append(slider,tags);
 return {root,update(time){
  const active=stages.findIndex(stage=>time>=stage.start&&time<stage.end);
  buttons.forEach((button,i)=>{if(i===active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
 }};
}
