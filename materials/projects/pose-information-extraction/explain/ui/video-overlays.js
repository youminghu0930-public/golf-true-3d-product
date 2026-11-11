import {uniqueVideoAxes} from '../video-overlay-components.js';
import {createStaticMeasurementSampler} from '../static-measurement.js';
import {createAxisFrameRenderer} from './axis-frame.js';
import {createRotationSectors} from './rotation-sector.js';
import {createPlaneRenderer} from './plane.js';
import {createMeasurementGuides} from './measurement-guides.js';

export function createVideoMetricOverlays({scene,toWorld,canvas,data,metrics,setPoses,requestRender=()=>{},axisWidthScale=1,prepareState=state=>state}){
 let sampler,keys=[],frame=0,handle,transition;
 const layers=new Map(),levels=new Map();
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fade=(spec,opacity)=>spec?{...spec,opacity:(spec.opacity??1)*opacity}:spec;
 const axes=(spec,opacity)=>spec?{...fade(spec,opacity),planeOpacity:(spec.planeOpacity??0),componentPlane:fade(spec.componentPlane,opacity),angleMarker:fade(spec.angleMarker,opacity),projectionSweep:fade(spec.projectionSweep,opacity)}:spec;
 function advance(){
  if(!transition)return;
  const t=reduced()?1:Math.min(1,(performance.now()-transition.start)/280),p=t*t*(3-2*t);
  for(const [key,from] of transition.from)levels.set(key,from+((keys.includes(key)?1:0)-from)*p);
  if(t===1)transition=undefined;
 }
 function animate(){
  advance();update();requestRender();
  handle=transition?requestAnimationFrame(animate):undefined;
 }
 const clear=()=>{for(const layer of layers.values())layer.dispose();layers.clear();};
 function layerFor(key){
  if(layers.has(key))return layers.get(key);
  const originalReference=createAxisFrameRenderer(scene,toWorld,2.7*axisWidthScale,canvas),reference=createAxisFrameRenderer(scene,toWorld,2.7*axisWidthScale,canvas),target=createAxisFrameRenderer(scene,toWorld,4.5*axisWidthScale,canvas),plane=createPlaneRenderer(scene,toWorld),sectors=createRotationSectors(scene,toWorld),guides=createMeasurementGuides(toWorld,canvas);
  const layer={update(state){originalReference.update(state.originalReferenceAxes);reference.update(state.referenceAxes);target.update(state.torsoAxes);plane.update(state.plane);sectors.update(state.sectors);guides.update(state.guides);},updateView(camera,w,h){originalReference.updateView(camera,w,h);reference.updateView(camera,w,h);target.updateView(camera,w,h);guides.updateView(camera,w,h);},dispose(){originalReference.dispose();reference.dispose();target.dispose();plane.dispose();sectors.dispose();guides.dispose();}};
  layers.set(key,layer);return layer;
 }
 function update(){
  clearInactive();
  const visible=[...levels].filter(([,opacity])=>opacity>0);
  if(!sampler||!visible.length){setPoses(0,1);return;}
  try{for(const {key,state:sampledState} of uniqueVideoAxes(sampler.sample(frame,visible.map(([key])=>key)),key=>levels.get(key))){
   const state=prepareState(sampledState),opacity=levels.get(key);
   layerFor(key).update({...state,originalReferenceAxes:axes(state.originalReferenceAxes,opacity),referenceAxes:axes(state.referenceAxes,opacity),torsoAxes:axes(state.torsoAxes,opacity),plane:fade(state.plane,opacity),sectors:state.sectors?.map(spec=>fade(spec,opacity)),guides:state.guides?.map(spec=>fade(spec,opacity))});
  }setPoses(0,1-.65*Math.max(...visible.map(([,opacity])=>opacity)));}
  catch(error){clear();setPoses(0,1);console.warn('Measurement overlay unavailable for frame',frame,error);}
 }
 function clearInactive(){for(const [key,layer] of layers)if(!keys.includes(key)&&!(levels.get(key)>0)){layer.dispose();layers.delete(key);}}
 return {
  setMetric(entry,selected){cancelAnimationFrame(handle);transition=undefined;levels.clear();selected.forEach(key=>levels.set(key,1));clear();sampler=createStaticMeasurementSampler(data,metrics,entry);keys=[...selected];update();},
  setSelection(selected){
   advance();keys=[...selected];keys.forEach(key=>{if(!levels.has(key))levels.set(key,0);});
   transition={start:performance.now(),from:new Map(levels)};
   cancelAnimationFrame(handle);animate();
  },setFrame(value){frame=value;update();},
  updateView(camera,w,h){for(const layer of layers.values())layer.updateView(camera,w,h);},
  dispose(){cancelAnimationFrame(handle);clear();setPoses(0,1);},
 };
}
