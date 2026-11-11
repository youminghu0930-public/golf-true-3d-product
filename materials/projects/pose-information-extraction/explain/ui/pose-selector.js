import {make} from './dom.js';

export function createPoseSelector(selections,onSelect){
 const root=make('aside',undefined,'snapshot-pose-selector');root.setAttribute('aria-label','Snapshot poses');
 root.append(make('h4','Choose a pose','snapshot-navigator-title'));
 const list=make('div',undefined,'snapshot-pose-list');
 const buttons=selections.map((selection,index)=>{
  const button=make('button',undefined,'snapshot-metric-option');button.type='button';
  button.append(make('span',`Pose ${index+1}`,'snapshot-option-title'),make('span',`Video ${selection.video} · Frame ${selection.frame}`,'snapshot-option-description'));
  button.setAttribute('aria-pressed','false');button.onclick=()=>onSelect(index);list.append(button);return button;
 });
 root.append(list);
 return {root,select(index){buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}};
}
