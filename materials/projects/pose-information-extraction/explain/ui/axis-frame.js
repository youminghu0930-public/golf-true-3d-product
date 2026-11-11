import {projectArrow,createEndOnMarker} from './arrow-projection.js';
import {arrowShape,roundedBarShape,joinedTStemShape,crossbarContactWidth} from './arrow-shape.js';
import {createPlaneRenderer} from './plane.js';
import {createRotationSector} from './rotation-sector.js';
import * as THREE from '../../vendor/three/three.module.js';
import {axisColors,angleColor} from '../palette.js';
import {add,mul} from '../math.js';
// Projected SVG arrows have no volume and retain exact pixel widths on every GPU.
export function createAxisFrameRenderer(scene,toWorld,baseWidth,canvas,colorAxes={}){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('explain-flat-axes');svg.setAttribute('aria-hidden','true');canvas.parentElement.append(svg);let state;const componentAngle=createRotationSector(scene,toWorld),projectionAngle=createRotationSector(scene,toWorld);
 const componentPlane=createPlaneRenderer(scene,toWorld);
 const angleLabel=document.createElementNS(ns,'text');angleLabel.setAttribute('fill',angleColor);angleLabel.setAttribute('font-size','11');angleLabel.setAttribute('font-family','system-ui');angleLabel.setAttribute('stroke','#f4f7f0');angleLabel.setAttribute('stroke-width','3');angleLabel.setAttribute('paint-order','stroke');svg.append(angleLabel);
 const arrows=Object.fromEntries(Object.entries(axisColors).map(([key,defaultColor])=>{
  const color=axisColors[colorAxes[key]]??defaultColor;
  const group=document.createElementNS(ns,'g'),line=document.createElementNS(ns,'path'),label=document.createElementNS(ns,'text');
  line.setAttribute('stroke','none');line.setAttribute('fill',color);line.setAttribute('stroke-linejoin','round');line.setAttribute('paint-order','stroke');
  label.setAttribute('fill',color);label.setAttribute('font-size','14');label.setAttribute('font-weight','600');label.textContent=key.toUpperCase();
  group.append(line);const marker=createEndOnMarker(group,color);group.append(label);svg.append(group);return [key,{group,line,marker,label}];
 }));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));geometry.setIndex([0,1,2,0,2,3]);
 const plane=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:axisColors.z,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}));plane.renderOrder=17;scene.add(plane);
 function update(next){
  state=next;
  for(const [key,{line,marker,label}] of Object.entries(arrows)){
   const color=state?.[key]?.color??axisColors[state?.[key]?.colorAxis??colorAxes[key]??key];
   line.setAttribute('fill',color);label.setAttribute('fill',color);marker.setColor(color);
  }
  componentPlane.update(state?.componentPlane);componentAngle.update(state?.angleMarker);projectionAngle.update(state?.projectionSweep);plane.visible=!!state&&state.plane>0&&state.planeOpacity>0;
  if(plane.visible){
   const {origin,x,y,length}=state.frame,L=length*state.plane,corners=[origin,add(origin,mul(x,L)),add(add(origin,mul(x,L)),mul(y,L)),add(origin,mul(y,L))];
   corners.forEach((p,i)=>{const v=toWorld(p);geometry.attributes.position.setXYZ(i,v.x,v.y,v.z);});geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();plane.material.opacity=.17*state.planeOpacity*state.opacity;
  }
 }
 function updateView(camera,w,h){
  svg.style.width=w+'px';svg.style.height=h+'px';svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.opacity=state?.opacity??0;svg.style.zIndex='3';
  angleLabel.style.display=state?.angleMarker?'':'none';
  angleLabel.style.opacity=state?.angleMarker?.opacity??1;
  if(state?.angleMarker){const marker=state.angleMarker,p=toWorld(add(marker.origin,mul(add(marker.from,marker.to??state.frame.x),marker.radius*.7))).project(camera);angleLabel.setAttribute('x',(p.x+1)*w/2+4);angleLabel.setAttribute('y',(1-p.y)*h/2-4);angleLabel.textContent=(Math.abs(marker.angle-90)<.05?'90':marker.angle.toFixed(1))+'°';}
  for(const [key,{group,line,marker,label}] of Object.entries(arrows)){
   const width=baseWidth*(state?.widthScale??1),spec=state?.[key];group.style.display=spec?'':'none';if(!spec)continue;group.style.opacity=spec.opacity??1;
   const projection=projectArrow(toWorld(spec.from),toWorld(spec.to),camera,w,h);
   if(!projection){group.style.display='none';continue;}
   const {x,y,tx,ty,arrowOpacity,markerOpacity}=projection;
   const blend=spec.shape==='bar'?1:spec.shapeBlend??0,bar=blend===1;
   let joinedShape;
   const crossSpec=spec.stopAt&&state[spec.stopAt];
   if(bar&&crossSpec){
    const cross=projectArrow(toWorld(crossSpec.from),toWorld(crossSpec.to),camera,w,h);
    if(cross){
     const start={x:cross.x,y:cross.y},end={x:cross.tx,y:cross.ty};
     const crossWidth=crossbarContactWidth(start,end,{x:tx,y:ty},width,crossSpec.shape==='bar'?1:crossSpec.shapeBlend??0);
     if(crossWidth!==null)joinedShape=joinedTStemShape({x,y},{x:tx,y:ty},start,end,width,crossWidth);
    }
   }
   const shape=joinedShape!==undefined?joinedShape:(blend===1?roundedBarShape(x,y,tx,ty,width):arrowShape(x,y,tx,ty,width,blend)),color=spec.color??axisColors[spec.colorAxis??colorAxes[key]??key];
   line.setAttribute('fill',color);line.setAttribute('stroke','none');
   if(shape)line.setAttribute('d',shape);
   line.style.display=shape?'':'none';line.style.opacity=bar||spec.keepVisible?1:arrowOpacity;
   marker.update(bar||spec.keepVisible?null:projection,width>=4?15:10);
   label.style.display=markerOpacity>0&&!bar&&!spec.keepVisible?'':'none';label.style.opacity=markerOpacity;label.setAttribute('x',tx+20);label.setAttribute('y',ty-15);
  }
 }
 return {update,updateView,dispose(){componentPlane.dispose();componentAngle.dispose();projectionAngle.dispose();svg.remove();geometry.dispose();plane.material.dispose();scene.remove(plane);}};
}
