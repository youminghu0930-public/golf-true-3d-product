import {add,sub,mul,length} from '../math.js';
import {axisColors,blendColors} from '../palette.js';

// Build a displacement box: line → rectangle → full box. The three origin
// edges are arrows; translated parallel edges are dashed and direction-colored.
export function displacementAxisGuides(origin,components,active,amount,opacity=1){
 const current=components[active],cursor=add(current.from,mul(sub(current.to,current.from),amount)),guides=[];
 const vectors=components.map((component,i)=>mul(sub(component.to,component.from),i<active?1:i===active?amount:0));
 const seen=new Set();
 components.forEach((component,i)=>{
  if(i>active||length(vectors[i])<1e-10)return;
  const others=[0,1,2].filter(index=>index!==i),color=axisColors[component.axis];
  for(let mask=0;mask<4;mask++){
   let from=origin;
   others.forEach((index,bit)=>{if(mask&(1<<bit))from=add(from,vectors[index]);});
   const to=add(from,vectors[i]);
   // Collapsed dimensions share edges until the rectangle/box opens.
   const signature=JSON.stringify([from,to].map(point=>point.map(value=>Math.round(value*1e9)/1e9)));
   if(seen.has(signature))continue;seen.add(signature);
   const arrow=mask===0;
   guides.push({id:arrow?'axis-measure-'+component.key:'axis-connector-'+component.key+'-'+mask,
    kind:arrow?'arrow':'line',from,to,color,width:arrow?(i===active?4.5:3.4):1.7,
    dashed:!arrow,opacity:i===active?opacity:1});
  }
 });
 guides.push({id:'measurement-cursor',kind:'point',from:cursor,color:blendColors(active?axisColors[components[active-1].axis]:'#8b9198',axisColors[current.axis],opacity),radius:3.5,opacity:1});
 return guides;
}
