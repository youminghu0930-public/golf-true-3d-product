import {createContext} from './context.js';
import {kinematic} from './metrics/kinematic.js';
import {geometric} from './metrics/geometric.js';
import {position} from './metrics/position.js';
import {subtypeNames,itemNames,typeNames,label} from './names.js';
export const registry={kinematic,geometric,position};
export function explainSnapshot(data,metrics,entry){
 const recipe=registry[entry.type]?.[entry.subtype];if(!recipe)throw new Error('No explanation is registered for this metric.');
 const context=createContext(data,metrics,entry),result=recipe(context),exported=metrics.metrics?.[entry.type]?.[entry.subtype];
 const items=Object.entries(result.items).map(([key,steps])=>{
  const value=exported?.[key]?.[entry.frame],computed=result.values[key];
  if(!Number.isFinite(value)||!Number.isFinite(computed))throw new Error(`No usable ${key} value at this frame.`);
  const difference=entry.type==='position'?Math.abs(value-computed):Math.abs(((value-computed+540)%360)-180);
  return {key,label:label(itemNames,key),value,computed,matches:difference<1e-5,unit:entry.type==='position'?' units':'°',steps};
 });
 return {title:label(subtypeNames,entry.subtype),category:label(typeNames,entry.type),context,items};
}
