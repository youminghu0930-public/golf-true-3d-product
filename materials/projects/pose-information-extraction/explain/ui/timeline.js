// Shared animation timing, independent of DOM, Three.js and metric subtype.
export const STAGE_DURATION=4400;
export const clamp=value=>Math.max(0,Math.min(1,value));
export const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
export function phases(progress){return {directions:ease(progress/.22),projection:ease((progress-.18)/.35),angle:ease((progress-.55)/.3)};}
export function sequence(items,selectedIndex){
 const seen=new Set(),result=[];
 items.forEach((item,itemIndex)=>{
  if(selectedIndex!==undefined&&itemIndex!==selectedIndex)return;
  item.steps.forEach((step,stepIndex)=>{if(!seen.has(step)){seen.add(step);result.push({itemIndex,stepIndex});}});
 });
 return result;
}
