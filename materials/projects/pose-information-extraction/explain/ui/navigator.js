import {make} from './dom.js';
import {label,typeNames,subtypeNames,typeDescriptions,metricOptionDescriptions} from '../names.js';

export function createMetricNavigator(entries,onSelect){
 const root=make('aside',undefined,'snapshot-metric-navigator');root.setAttribute('aria-label','Snapshot metrics');
 root.append(make('h4','Choose a metric','snapshot-navigator-title'));
 const list=make('div',undefined,'snapshot-metric-list'),groups=new Map(),buttons=[];
 entries.forEach(([id,entry],index)=>{
  if(!groups.has(entry.type)){
   const group=make('div',undefined,'snapshot-metric-group');
   const heading=make('div',undefined,'snapshot-category-heading');
   heading.append(make('h5',label(typeNames,entry.type)),make('p',typeDescriptions[entry.type],'snapshot-category-description'));
   group.append(heading);list.append(group);groups.set(entry.type,group);
  }
  const button=make('button',undefined,'snapshot-metric-option');button.type='button';
  button.append(make('span',label(subtypeNames,entry.subtype),'snapshot-option-title'));
  const description=metricOptionDescriptions[entry.subtype];
  if(description)button.append(make('span',description,'snapshot-option-description'));
  if(entries.filter(([,item])=>item.type===entry.type&&item.subtype===entry.subtype).length>1)button.append(make('small',`Demo ${id}`));
  button.setAttribute('aria-pressed','false');button.onclick=()=>onSelect(index);
  groups.get(entry.type).append(button);buttons.push(button);
 });
 root.append(list);
 return {root,select(index){buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}};
}
