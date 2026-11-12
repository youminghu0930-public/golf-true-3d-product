import {createTranslationOverlay} from './translation-overlay.js';
import {measurementFeatures} from './measurement-features.js';
import {createXFactorModel,createXFactorOverlay} from './x-factor.js';
import {rotationColors} from './rotation-style.js';
import {createRotationPlot} from './rotation-plot.js';
import {add,mul,rotate} from './materials/projects/pose-information-extraction/explain/math.js';
import {createVideoMetricOverlays} from './materials/projects/pose-information-extraction/explain/ui/video-overlays.js';

// Use completed video measurements with the banner's solid, surface-only
// presentation. Feature definitions choose the selected metrics and plane shapes.
export function fixedRotationRadius(data){
  const left=data.joints.indexOf('left_shoulder'),right=data.joints.indexOf('right_shoulder');
  const lengths=data.reconstruction.flatMap(pose=>{
    const a=pose[left],b=pose[right];
    if(![a,b].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))return [];
    const length=Math.hypot(...a.map((v,i)=>v-b[i]));return length>0?[length]:[];
  });
  if(!lengths.length)throw new Error('Missing shoulder width for rotation radius');
  return lengths.reduce((sum,value)=>sum+value,0)/lengths.length*1.95;
}
export function prepareMeasurementSurfaces(state,radius,group){
  const {color,shape}=group;
  // Scale reference surfaces about their attachment to the skeleton.
  // Sector directions remain independent of these display dimensions.
  const stretch=axis=>axis?.map((value,index)=>value*(index===1?(group.verticalScale??1):(group.horizontalScale??1)));
  const plane=spec=>spec?{...spec,u:stretch(spec.u),v:stretch(spec.v),size:radius,color,shape,opacity:1,fillOpacity:.12}:spec;
  const surfaces=axes=>{
    if(!axes)return axes;
    const {x,y,z,angleMarker,projectionSweep,...rest}=axes;
    return {...rest,opacity:1,componentPlane:plane(axes.componentPlane)};
  };
  return {...state,referenceAxes:surfaces(state.referenceAxes),torsoAxes:surfaces(state.torsoAxes),originalReferenceAxes:surfaces(state.originalReferenceAxes),
    // Turn and tilt share a horizontal reference plane; render it only once.
    plane:group.planeKeys.includes(state.active)?plane(state.plane):null,guides:[],
    sectors:state.sectors?.map(sector=>({...sector,radius:radius*(group.verticalScale??1),color,opacity:1,fillOpacity:.38,outline:true})),
  };
}
// Preserve the original helper for the geometric hip/shoulder regression checks.
export function prepareRotationSurfaces(state,radius,color){
  return prepareMeasurementSurfaces(state,radius,{color,shape:'circle',planeKeys:['turn']});
}
export function createMeasurementOverlays(options){
  const feature=options.feature??'geometric-rotations',definition=measurementFeatures[feature];
  if(!definition)throw new Error(`Unknown measurement feature: ${feature}`);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.classList.add('rotation-angle-labels');svg.setAttribute('aria-hidden','true');options.canvas.parentElement.append(svg);
  const labels=new Map(),radius=fixedRotationRadius(options.data);
  const xFactorModel=definition.xfactor?createXFactorModel(options.data,options.metrics):null;
  const plot=createRotationPlot({canvas:options.canvas,metrics:options.metrics,frameCount:options.data.reconstruction.length,feature,xFactorValues:xFactorModel?.frames.map(state=>state?.angle??null)});
  const makeLabel=(id,title,color)=>{
    const group=document.createElementNS(ns,'g'),line=document.createElementNS(ns,'path'),dot=document.createElementNS(ns,'circle'),box=document.createElementNS(ns,'rect'),text=document.createElementNS(ns,'text'),kind=document.createElementNS(ns,'text'),value=document.createElementNS(ns,'text');
    line.setAttribute('fill','none');line.setAttribute('stroke-linejoin','round');
    dot.setAttribute('r','2.2');dot.setAttribute('fill',color);
    line.setAttribute('stroke',color);line.setAttribute('stroke-opacity','.6');line.setAttribute('stroke-width','1');
    box.setAttribute('fill',color);box.setAttribute('fill-opacity','.13');box.setAttribute('stroke',color);box.setAttribute('stroke-width','.7');box.setAttribute('rx','4');box.setAttribute('width','154');box.setAttribute('height','44');
    text.setAttribute('fill',color);text.setAttribute('font-size','11');text.setAttribute('font-family','system-ui');text.setAttribute('x','7');text.setAttribute('y','15.5');
    for(const labelText of [kind,value]){labelText.setAttribute('fill',color);labelText.setAttribute('font-family','system-ui');labelText.setAttribute('x','7');}
    kind.setAttribute('font-size','10');kind.setAttribute('y','28');value.setAttribute('font-size','15');value.setAttribute('font-weight','600');value.setAttribute('y','34');
    group.append(box,text,kind,value);svg.append(line,dot,group);const label={group,line,dot,box,text,kind,value,title};labels.set(id,label);return label;
  };
  const overlays=definition.combined?[]:definition.groups.map(group=>{
    for(const key of group.keys)makeLabel(`${group.id}:${key}`,group.labels[key],group.color);
    const overlay=createVideoMetricOverlays({...options,setPoses:()=>{},axisWidthScale:1.4,prepareState:state=>{
      const prepared=prepareMeasurementSurfaces(state,radius,group),label=labels.get(`${group.id}:${state.active}`);
      if(label)label.sector=prepared.sectors?.[0];
      return prepared;
    }});
    overlay.setMetric({type:group.type,subtype:group.subtype},group.keys);
    return overlay;
  });
  if(definition.combined){
    for(const group of definition.groups)makeLabel(`${group.id}:${group.id}`,group.label,group.color);
    overlays.push(createTranslationOverlay(options,definition.groups,labels));
  }
  let xFactor,xFactorLabel;
  if(xFactorModel){
    xFactorLabel=makeLabel('xfactor','X-factor',rotationColors.xfactor);
    xFactor=createXFactorOverlay(options,xFactorModel,radius);xFactorLabel.sector=xFactor.setFrame(0);
  }
  return {
    setFrame(frame){overlays.forEach(overlay=>overlay.setFrame(frame));if(xFactor)xFactorLabel.sector=xFactor.setFrame(frame);plot.setFrame(frame);},
    updateView(camera,w,h){
      overlays.forEach(overlay=>overlay.updateView(camera,w,h));svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const order=[...labels.keys()];
      for(const [id,label] of labels){
        const sector=label.sector;
        if(!sector&&!label.anchor){label.group.style.display=label.line.style.display=label.dot.style.display='none';continue;}
        const offset=sector?mul(rotate(sector.from,sector.normal,sector.angle*.5),sector.radius*.96):[0,0,0];
        const point=options.toWorld(label.anchor??add(sector.origin,offset));
        const projected=point.clone().project(camera);
        const visible=point.clone().applyMatrix4(camera.matrixWorldInverse).z<0&&projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<1.15&&Math.abs(projected.y)<1.15;
        label.group.style.display=label.line.style.display=label.dot.style.display=visible?'':'none';if(!visible)continue;
        const px=(projected.x+1)*w/2,py=(1-projected.y)*h/2;
        const tagWidth=w<260?100:126;
        const x=Math.max(5,w-tagWidth-10),y=10+order.indexOf(id)*50;
        label.group.setAttribute('transform',`translate(${x},${y})`);
        label.box.setAttribute('width',tagWidth);label.text.setAttribute('font-size','10');
        const [region,measurement]=label.title.split(' ');
        label.text.textContent=w<260&&label.title.length>16?label.title.replace('Shoulder','Sh.').replace('Spine','Sp.'):label.title;
        label.kind.textContent='';
        label.value.setAttribute('font-size',w<260?'11':'15');label.value.textContent=sector?`${sector.angle.toFixed(1)}°`:`${label.measurement.toFixed(3)} units`;
        label.group.setAttribute('aria-label',`${label.title}: ${label.value.textContent}`);
        // Inverted L: rise from the angle, then enter the box at left-center.
        label.line.setAttribute('d',`M ${px} ${py} V ${y+22} H ${x}`);
        label.dot.setAttribute('cx',px);label.dot.setAttribute('cy',py);
      }
    },
    dispose(){overlays.forEach(overlay=>overlay.dispose());svg.remove();plot.dispose();xFactor?.dispose();},
  };
}
