import {rotationColors} from './rotation-style.js';
import {channelPath,sharedMeasurementScale} from './materials/projects/pose-information-extraction/explain/measurement-series.js';
export function rotationPlotChannels(metrics,frameCount,xFactorValues){
  const channels=['shoulder','hip'].flatMap(region=>['turn','tilt'].map(key=>({
    key:`${region}-${key}`,label:`${region==='shoulder'?'Shoulder':'Hip'} ${key}`,color:rotationColors[region],dashed:key==='tilt',
    values:Array.from({length:frameCount},(_,i)=>{const value=metrics.metrics?.geometric?.[`${region}_turn_tilt`]?.[key]?.[i];return Number.isFinite(value)?value:null;}),
  })));
  if(xFactorValues)channels.push({key:'xfactor-angle',label:'X-factor',color:rotationColors.xfactor,dashed:false,values:Array.from({length:frameCount},(_,i)=>Number.isFinite(xFactorValues[i])?xFactorValues[i]:null)});
  return channels;
}
export function createRotationPlot({canvas,metrics,frameCount,xFactorValues}){
  const root=document.createElement('div');root.className='snapshot-rotation-plots snapshot-bottom-strip';
  const channels=rotationPlotChannels(metrics,frameCount,xFactorValues);
  const plots=(xFactorValues?['shoulder','hip','xfactor']:['shoulder','hip']).map(region=>createRegionPlot({root,frameCount,region,channels:channels.filter(channel=>channel.key.startsWith(region+'-'))}));
  canvas.parentElement.append(root);
  return {setFrame(frame){plots.forEach(plot=>plot.setFrame(frame));root.dataset.frame=frame;},dispose(){root.remove();}};
}
function createRegionPlot({root:container,frameCount,region,channels}){
  const ns='http://www.w3.org/2000/svg',selected=new Set(channels.map(channel=>channel.key)),lines=new Map();
  let scale=sharedMeasurementScale(channels,2);
  const root=document.createElement('div');root.className='snapshot-rotation-plot';root.setAttribute('aria-label',`${region} rotation line plot`);
  root.style.setProperty('--rotation-panel-color',rotationColors[region]);root.style.setProperty('--rotation-panel-fill',rotationColors[region]+'21');root.style.setProperty('--rotation-panel-border',rotationColors[region]+'99');
  const legend=document.createElement('div');legend.className='snapshot-rotation-legend';
  for(const channel of channels){
    const item=document.createElement('button'),swatch=document.createElement('i');item.type='button';item.setAttribute('aria-pressed','true');item.setAttribute('aria-label',`Toggle ${channel.label}`);
    item.style.color=channel.color;swatch.style.borderTopStyle=channel.dashed?'dashed':'solid';item.append(swatch,document.createTextNode(channel.label));legend.append(item);
    item.onclick=()=>{if(selected.has(channel.key))selected.delete(channel.key);else selected.add(channel.key);item.setAttribute('aria-pressed',String(selected.has(channel.key)));fitVisible();};
  }
  const chart=document.createElement('div');chart.className='snapshot-rotation-chart';
  const ticks=document.createElement('div');ticks.className='snapshot-rotation-ticks';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 120');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${region==='xfactor'?'X-factor':region+' turn and tilt'} in degrees with a synchronized playback cursor`);
  const element=(tag,attributes)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);svg.append(node);return node;};
  const grid=document.createElementNS(ns,'g');svg.prepend(grid);
  for(const channel of channels)lines.set(channel.key,element('path',{fill:'none',stroke:channel.color,'stroke-width':1.5,'stroke-dasharray':channel.dashed?'5 3':'none','vector-effect':'non-scaling-stroke'}));
  function fitVisible(){
    const visible=channels.filter(channel=>selected.has(channel.key));
    if(visible.length)scale=sharedMeasurementScale(visible,2);
    ticks.replaceChildren();grid.replaceChildren();
    const y=value=>(scale.high-value)/(scale.high-scale.low)*120;
    const chartTicks=scale.ticks.length>3?[scale.low,...(scale.low<0&&scale.high>0?[0]:[]),scale.high]:scale.ticks;
    for(const tick of chartTicks){
      const value=document.createElement('span');value.textContent=`${tick}°`;value.style.top=`${y(tick)/120*100}%`;ticks.append(value);
      const line=element('line',{x1:0,x2:1000,y1:y(tick),y2:y(tick),stroke:tick===0?'#aabbb0':'#ced8d1','stroke-width':.65,'vector-effect':'non-scaling-stroke'});grid.append(line);
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
    tooltip.replaceChildren();for(const channel of channels){if(!selected.has(channel.key))continue;const row=document.createElement('div');row.style.color=channel.color;const value=channel.values[frame];row.textContent=`${channel.label}: ${Number.isFinite(value)?value.toFixed(1)+'°':'—'}`;tooltip.append(row);}
    tooltip.style.left=`${ratio*100}%`;tooltip.style.transform=ratio>.5?'translateX(-100%)':'none';tooltip.hidden=selected.size===0;
  };
  svg.addEventListener('pointermove',showHover);svg.addEventListener('pointerleave',()=>{tooltip.hidden=true;hover.style.display='none';});
  root.addEventListener('pointerdown',event=>event.stopPropagation());root.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  fitVisible();
  chart.append(ticks,svg,tooltip);root.append(legend,chart);container.append(root);
  return {setFrame(frame){const x=Math.max(0,Math.min(frameCount-1,frame))/Math.max(1,frameCount-1)*1000;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);root.dataset.frame=frame;},dispose(){root.remove();}};
}
