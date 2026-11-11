import {createVideoMetricOverlays} from './video-overlays.js';
import {bannerMeasurements} from './banner-measurements.js';
export function createBannerOverlays(options){
 const overlays=bannerMeasurements.map(({key,...entry})=>{
  const overlay=createVideoMetricOverlays({...options,setPoses:()=>{},axisWidthScale:1.4,prepareState:state=>{
   const opaquePlane=plane=>plane?{...plane,opacity:1,fillOpacity:.65}:plane;
   const surfacesOnly=axes=>{
    if(!axes)return axes;
    const {x,y,z,...surfaces}=axes;
    return {...surfaces,opacity:1,componentPlane:opaquePlane(axes.componentPlane)};
   };
   return {...state,referenceAxes:surfacesOnly(state.referenceAxes),torsoAxes:surfacesOnly(state.torsoAxes),
    originalReferenceAxes:surfacesOnly(state.originalReferenceAxes),plane:opaquePlane(state.plane),sectors:state.sectors?.map(sector=>({...sector,opacity:1,fillOpacity:.85}))};
  }});
  overlay.setMetric(entry,[key]);return overlay;
 });
 return {
  setFrame(frame){overlays.forEach(overlay=>overlay.setFrame(frame));},
  updateView(camera,w,h){overlays.forEach(overlay=>overlay.updateView(camera,w,h));},
  dispose(){overlays.forEach(overlay=>overlay.dispose());},
 };
}
