import {openingState} from '../choreography/opening.js';
import {bindWindowPlayback} from './window-input.js';
import {createPlaybackClock} from './playback.js';
import {make} from './dom.js';
import {createRecipeTimeline} from './recipe-timeline.js';
export function mountExplanationPanel(root,model,{show,animate,canvas,opening}){
 root.classList.add('metric-explanation');root.setAttribute('aria-label','Animated measurement explanation');
 root.append(make('p',model.category,'explain-category'),make('h5',model.title,'explain-title'));
 const choices=make('div',undefined,'explain-item-options');choices.setAttribute('role','group');choices.setAttribute('aria-label','Measurement component');
 const progress=make('progress');progress.max=1;progress.value=0;progress.setAttribute('aria-label','Construction progress');
 root.append(choices,progress);
 let windowPlayback,lastSegment;const buttons=[],outputs=[];let time=0,plan=createRecipeTimeline(model.items,model.context.entry.duration,undefined,model.context.entry.stay);
 const playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 function render(){
  const {segment,progress:amount}=plan.sample(time);
  if(segment!==lastSegment){
   buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===(segment.itemIndex??0))));
   show(segment.intro?[]:model.items[segment.itemIndex].steps[segment.stepIndex].visuals);lastSegment=segment;
  }
  progress.value=segment.intro?0:amount;
  if(segment.intro){
   const p=segment.motionDuration?Math.min(1,(time-segment.start)/segment.motionDuration):amount;
   const values=Object.fromEntries(model.items.map(item=>[item.key,item.value])),state=openingState(segment,p,values);opening?.(state);
   outputs.forEach((output,i)=>output.textContent=state.values[model.items[i].key].toFixed(2)+model.items[i].unit);
  }else{
   outputs.forEach((output,i)=>{const item=model.items[i],value=i<segment.itemIndex?item.value:i===segment.itemIndex&&segment.stepIndex===item.steps.length-1?item.value*amount:0;output.textContent=value.toFixed(2)+item.unit;});
   animate(amount);
  }
 }
 function restart(selected){plan=createRecipeTimeline(model.items,model.context.entry.duration,selected,model.context.entry.stay);time=0;lastSegment=undefined;clock.setPlaying(true);render();}
 model.items.forEach((item,i)=>{
  const b=make('button');b.type='button';const output=make('strong',`${item.value.toFixed(2)}${item.unit}`);outputs.push(output);b.append(make('span',item.label),output);b.onclick=()=>restart(i);choices.append(b);buttons.push(b);
 });
 const clock=createPlaybackClock({root,target:root.parentElement.querySelector('canvas')??root,playing,onPlayingChange:value=>windowPlayback?.update(value),onAdvance:delta=>{time=(time+delta)%plan.duration;render();}});
 windowPlayback=bindWindowPlayback(canvas,clock);
 if(!playing)time=plan.duration;
 render();
 return {dispose(){windowPlayback.dispose();clock.dispose();}};
}
