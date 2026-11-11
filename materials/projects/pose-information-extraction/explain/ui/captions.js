import {make} from './dom.js';

// Two lightweight text layers cross-fade like video subtitles. Captions never
// intercept viewer gestures; seeking replaces text immediately without ghosts.
export function createStepCaptions(canvas){
 const root=make('div',undefined,'explain-step-caption');root.setAttribute('aria-label','Step explanation');root.setAttribute('aria-live','off');canvas.parentElement.append(root);
 let current,text;const animations=new Set();
 function clear(){for(const animation of animations)animation.cancel();animations.clear();root.replaceChildren();current=undefined;}
 return {update(next,{immediate=false}={}){
  if(next===text)return;text=next;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(immediate||reduced){clear();if(next){current=make('span',next,'explain-step-caption-text');root.append(current);}return;}
  const old=current;
  if(old){const animation=old.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'});animations.add(animation);animation.finished.then(()=>{old.remove();animations.delete(animation);}).catch(()=>{});}
  current=undefined;
  if(next){current=make('span',next,'explain-step-caption-text');root.append(current);const animation=current.animate([{opacity:0},{opacity:1}],{duration:180,fill:'both'});animations.add(animation);animation.finished.then(()=>animations.delete(animation)).catch(()=>{});}
 },dispose(){clear();root.remove();}};
}
