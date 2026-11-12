import {measurementFeatures} from './measurement-features.js';
import {rotationColors} from './rotation-style.js';
import {channelPath,sharedMeasurementScale} from './materials/projects/pose-information-extraction/explain/measurement-series.js';
export function measurementPlotChannels(metrics,frameCount,feature='geometric-rotations',xFactorValues){
  const definition=measurementFeatures[feature];
  const channels=definition.groups.flatMap(group=>group.keys.map(key=>({
    key:`${group.id}-${key}`,group:group.id,label:group.labels[key],color:group.color,dashed:group.keys.length>1&&key==='tilt',
    values:Array.from({length:frameCount},(_,i)=>{const value=metrics.metrics?.[group.type]?.[group.subtype]?.[key]?.[i];return Number.isFinite(value)?value:null;}),
  })));
  if(xFactorValues)channels.push({key:'xfactor-angle',group:'xfactor',label:'X-factor',color:rotationColors.xfactor,dashed:false,values:Array.from({length:frameCount},(_,i)=>Number.isFinite(xFactorValues[i])?xFactorValues[i]:null)});
  return channels;
}
export function rotationPlotChannels(metrics,frameCount,xFactorValues){return measurementPlotChannels(metrics,frameCount,'geometric-rotations',xFactorValues);}
export function createRotationPlot({canvas,metrics,frameCount,xFactorValues,feature='geometric-rotations'}){
  const root=document.createElement('div');root.className='snapshot-rotation-plots snapshot-bottom-strip';
  const channels=measurementPlotChannels(metrics,frameCount,feature,xFactorValues);
  const definition=measurementFeatures[feature];
  let groups=definition.groups.map(group=>({id:group.id,label:group.label,color:group.color}));
  if(xFactorValues)groups.push({id:'xfactor',label:'X-factor',color:rotationColors.xfactor});
  if(definition.combined){groups=[{id:'translation',label:'Hip translation',color:'#65766d'}];root.style.height='76px';}
  root.style.setProperty('--measurement-rows',groups.length);root.style.setProperty('--measurement-chart-height',definition.combined?'43px':groups.length===3?'20px':'36px');
  const plots=groups.map(group=>createRegionPlot({root,frameCount,region:group.id,label:group.label,color:group.color,unit:definition.unit??'°',channels:definition.combined?channels:channels.filter(channel=>channel.group===group.id)}));
  canvas.parentElement.append(root);
  return {setFrame(frame){plots.forEach(plot=>plot.setFrame(frame));root.dataset.frame=frame;},dispose(){root.remove();}};
}
function createRegionPlot({root:container,frameCount,region,label,color,channels,unit='°'}){
  const ns='http://www.w3.org/2000/svg',selected=new Set(channels.map(channel=>channel.key)),lines=new Map();
  let scale=sharedMeasurementScale(channels,2);
  const root=document.createElement('div');root.className='snapshot-rotation-plot';root.setAttribute('aria-label',`${label} line plot`);
  root.style.setProperty('--rotation-panel-color',color);root.style.setProperty('--rotation-panel-fill',color+'21');root.style.setProperty('--rotation-panel-border',color+'99');
  const legend=document.createElement('div');legend.className='snapshot-rotation-legend';
  for(const channel of channels){
    const item=document.createElement('button'),swatch=document.createElement('i');item.type='button';item.setAttribute('aria-pressed','true');item.setAttribute('aria-label',`Toggle ${channel.label}`);
    item.style.color=channel.color;swatch.style.borderTopStyle=channel.dashed?'dashed':'solid';item.append(swatch,document.createTextNode(channel.label));legend.append(item);
    item.onclick=()=>{if(selected.has(channel.key))selected.delete(channel.key);else selected.add(channel.key);item.setAttribute('aria-pressed',String(selected.has(channel.key)));fitVisible();};
  }
  const chart=document.createElement('div');chart.className='snapshot-rotation-chart';
  const ticks=document.createElement('div');ticks.className='snapshot-rotation-ticks';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 120');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${label} measurements in ${unit.trim()} with a synchronized playback cursor`);
  const element=(tag,attributes)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);svg.append(node);return node;};
  const grid=document.createElementNS(ns,'g');svg.prepend(grid);
  for(const channel of channels)lines.set(channel.key,element('path',{fill:'none',stroke:channel.color,'stroke-width':1.5,'stroke-dasharray':channel.dashed?'5 3':'none','vector-effect':'non-scaling-stroke'}));
  function fitVisible(){
    const visible=channels.filter(channel=>selected.has(channel.key));
    if(visible.length)scale=sharedMeasurementScale(visible,2);
    ticks.replaceChildren();grid.replaceChildren();
    const y=value=>(scale.high-value)/(scale.high-scale.low)*120;
    // Only the extrema need labels in this compact strip. Their positions
    // are inset for legibility rather than forced onto the grid endpoints.
    for(const [tick,top] of [[scale.high,'4px'],[scale.low,'calc(100% - 4px)']]){
      const value=document.createElement('span');value.textContent=`${tick}${unit==='°'?unit:''}`;value.style.top=top;ticks.append(value);
    }
    for(const tick of scale.ticks){
      const line=element('line',{x1:0,x2:1000,y1:y(tick),y2:y(tick),stroke:tick===0?'#afbfaa88':'#dbe4d688','stroke-width':.65,'vector-effect':'non-scaling-stroke'});grid.append(line);
    }
    for(const channel of channels){const line=lines.get(channel.key);line.style.display=selected.has(channel.key)?'':'none';line.setAttribute('d',channelPath(channel.values,0,120,1000,scale).path);}
    tooltip.hidden=true;hover.style.display='none';
    root.dataset.range=JSON.stringify([scale.low,scale.high]);
  }
  const cursor=element('line',{x1:0,x2:0,y1:0,y2:120,stroke:'#29463b','stroke-width':1.4,'vector-effect':'non-scaling-stroke'});
  const hover=element('line',{x1:0,x2:0,y1:0,y2:120,stroke:'#29463b','stroke-width':1,'stroke-dasharray':'3 3','vector-effect':'non-scaling-stroke'});hover.style.display='none';
  const tooltip=document.createElement('div');tooltip.className='snapshot-rotation-tooltip';tooltip.hidden=true;
  const showHover=event=>{
    const rect=svg.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),frame=Math.round(ratio*Math.max(0,frameCount-1));
    hover.style.display='';hover.setAttribute('x1',ratio*1000);hover.setAttribute('x2',ratio*1000);
    tooltip.replaceChildren();for(const channel of channels){if(!selected.has(channel.key))continue;const row=document.createElement('div');row.style.color=channel.color;const value=channel.values[frame];row.textContent=`${channel.label}: ${Number.isFinite(value)?value.toFixed(unit==='°'?1:3)+unit:'—'}`;tooltip.append(row);}
    tooltip.style.left=`${ratio*100}%`;tooltip.style.transform=ratio>.5?'translateX(-100%)':'none';tooltip.hidden=selected.size===0;
  };
  svg.addEventListener('pointermove',showHover);svg.addEventListener('pointerleave',()=>{tooltip.hidden=true;hover.style.display='none';});
  root.addEventListener('pointerdown',event=>event.stopPropagation());root.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  fitVisible();
  chart.append(ticks,svg,tooltip);root.append(legend,chart);container.append(root);
  return {setFrame(frame){const x=Math.max(0,Math.min(frameCount-1,frame))/Math.max(1,frameCount-1)*1000;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);root.dataset.frame=frame;},dispose(){root.remove();}};
}
