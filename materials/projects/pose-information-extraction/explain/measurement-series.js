import {itemNames,label} from './names.js';
import {measurementColor} from './measurement-colors.js';
export function measurementChannels(metrics,entry,frameCount){
 const metric=metrics.metrics?.[entry.type]?.[entry.subtype];
 if(!metric)throw new Error('Measurements unavailable for this video');
 return Object.entries(metric).filter(([,values])=>Array.isArray(values)).map(([key,values])=>({
  key,label:label(itemNames,key),color:measurementColor(entry.subtype,key),unit:entry.type==='position'?' units':'°',
  values:Array.from({length:frameCount},(_,i)=>Number.isFinite(values[i])?values[i]:null),
 }));
}
export function channelPath(values,top,height,width=1000,domain){
 const finite=values.filter(Number.isFinite),low=domain?.low??Math.min(...finite),high=domain?.high??Math.max(...finite),span=high-low||1;
 let connected=false,path='';
 for(let i=0;i<values.length;i++){
  if(!Number.isFinite(values[i])){connected=false;continue;}
  const x=i/Math.max(1,values.length-1)*width,y=top+height-(values[i]-low)/span*height;
  path+=(connected?'L':'M')+x.toFixed(2)+','+y.toFixed(2);connected=true;
 }
 return {path,low:finite.length?low:0,high:finite.length?high:0};
}

export function sharedMeasurementScale(channels,targetIntervals=4){
 const values=channels.flatMap(channel=>channel.values).filter(Number.isFinite);
 let low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):1;
 if(low===high){const padding=Math.max(1,Math.abs(low)*.1);low-=padding;high+=padding;}
 const raw=(high-low)/targetIntervals,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
 const step=(fraction<1.5?1:fraction<3?2:fraction<7?5:10)*power;
 low=Math.floor(low/step)*step;high=Math.ceil(high/step)*step;
 const ticks=Array.from({length:Math.round((high-low)/step)+1},(_,i)=>Number((low+i*step).toPrecision(12)));
 return {low,high,step,ticks};
}
