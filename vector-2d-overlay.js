import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';
const ns='http://www.w3.org/2000/svg';
const make=(tag,attributes={})=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));return el;};
export function trimVectorConnection(a,b,inset){
  const length=Math.hypot(b.x-a.x,b.y-a.y);
  if(length<=2*inset)return null;
  const t=inset/length;
  return {start:t,end:1-t};
}
// A screen-space fraction must be perspective-correct when testing 3D depth.
export function screenToWorldFraction(fraction,depthA,depthB){
  return fraction*depthA/(depthB*(1-fraction)+fraction*depthA);
}
export function createVector2DOverlay(canvas,{names,edges}){
  const root=make('svg',{'aria-hidden':'true','data-vector-pose':'true'});
  Object.assign(root.style,{position:'absolute',pointerEvents:'none',overflow:'hidden',zIndex:'1'});
  if(getComputedStyle(canvas.parentElement).position==='static')canvas.parentElement.style.position='relative';
  canvas.after(root);
  const layers=new Map(),raycaster=new THREE.Raycaster(),cameraPosition=new THREE.Vector3();
  const viewPoint=(world,camera,w,h)=>{
    const local=world.clone().applyMatrix4(camera.matrixWorldInverse);
    if(local.z>=-camera.near)return null;
    const ndc=world.clone().project(camera);
    if(!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y)||ndc.z>1)return null;
    return {x:(ndc.x+1)*w/2,y:(1-ndc.y)*h/2,depth:-local.z,world};
  };
  function layerFor(overlay){
    let layer=layers.get(overlay);
    if(layer)return layer;
    const group=make('g',{'data-camera':overlay.view||String(layers.size)});
    const path=make('path',{fill:'none',stroke:overlay.overlayColor,'stroke-linecap':'round','vector-effect':'non-scaling-stroke'});
    const joints=names.map(name=>{
      const group=make('g',{'data-joint':name});
      const ring=make('circle',{fill:'none',stroke:overlay.overlayColor,'vector-effect':'non-scaling-stroke'});
      const dot=make('circle',{fill:name.startsWith('left_')?'#3b82f6':name.startsWith('right_')?'#ef4444':overlay.overlayColor});
      group.append(ring,dot);return {group,ring,dot};
    });
    group.append(path,...joints.map(j=>j.group));root.append(group);
    layer={group,path,joints};layers.set(overlay,layer);return layer;
  }
  function render({camera,scene,overlays,frame,w,h}){
    root.setAttribute('viewBox',`0 0 ${w} ${h}`);
    root.setAttribute('width',w);root.setAttribute('height',h);
    root.style.left=`${canvas.offsetLeft}px`;root.style.top=`${canvas.offsetTop}px`;
    root.style.width=`${w}px`;root.style.height=`${h}px`;
    root.dataset.frame=String(frame);
    scene.updateMatrixWorld(true);camera.getWorldPosition(cameraPosition);
    const occluders=[];
    scene.traverseVisible(object=>{
      const materials=Array.isArray(object.material)?object.material:[object.material];
      if(object.isMesh&&materials.some(m=>m&&m.visible&&m.depthWrite&&!m.transparent))occluders.push(object);
    });
    const visible=world=>{
      const direction=world.clone().sub(cameraPosition),distance=direction.length();
      raycaster.ray.set(cameraPosition,direction.multiplyScalar(1/distance));
      raycaster.near=camera.near;raycaster.far=Math.max(0,distance-Math.max(.0001,distance*.00001));
      return raycaster.intersectObjects(occluders,false).length===0;
    };
    // SVG layers follow the same back-to-front order as their image planes.
    const ordered=[...overlays].sort((a,b)=>{
      const depth=o=>o.group.localToWorld(new THREE.Vector3(0,0,-o.depth)).applyMatrix4(camera.matrixWorldInverse).z;
      return depth(a)-depth(b);
    });
    for(const overlay of ordered){
      const layer=layerFor(overlay);root.append(layer.group);
      const origin=overlay.group.localToWorld(new THREE.Vector3(0,0,-overlay.depth));
      const pixel=overlay.group.localToWorld(new THREE.Vector3(overlay.depth/overlay.K[0][0],0,-overlay.depth));
      const verticalPixel=overlay.group.localToWorld(new THREE.Vector3(0,overlay.depth/overlay.K[1][1],-overlay.depth));
      const originNdc=origin.clone().project(camera),pixelNdc=pixel.project(camera),verticalNdc=verticalPixel.project(camera);
      const imageScale=Math.max(.0001,Math.hypot((pixelNdc.x-originNdc.x)*w/2,(pixelNdc.y-originNdc.y)*h/2),Math.hypot((verticalNdc.x-originNdc.x)*w/2,(verticalNdc.y-originNdc.y)*h/2));
      const detailScale=Math.sqrt(imageScale),jointPixels=Math.max(10,Math.min(36,16*detailScale));
      // Match the PoC: bone and ring have equal stroke widths.
      const bonePixels=jointPixels*.15;
      const raw=overlay.raw.pred[frame];
      const projected=names.map((_,i)=>{
        const point=raw?.[overlay.mapping[i]];
        if(!point||!Number.isFinite(point[0])||!Number.isFinite(point[1])||(point.length>2&&point[2]<=0)||(point[0]===0&&point[1]===0))return null;
        const world=overlay.group.localToWorld(new THREE.Vector3((point[0]-overlay.K[0][2])*overlay.depth/overlay.K[0][0],-(point[1]-overlay.K[1][2])*overlay.depth/overlay.K[1][1],-overlay.depth));
        return viewPoint(world,camera,w,h);
      });
      let d='';
      for(const [a,b] of edges){
        const from=projected[a],to=projected[b];if(!from||!to)continue;
        // Match pose-geometry.clippedBone: end at the ring centerline.
        // The equal-width round cap overlaps only the ring stroke, not its hollow interior.
        const trim=trimVectorConnection(from,to,jointPixels*.425);if(!trim)continue;
        const length=Math.hypot(to.x-from.x,to.y-from.y)*(trim.end-trim.start),count=Math.max(1,Math.ceil(length/6));
        let drawing=false;
        for(let i=0;i<count;i++){
          const start=trim.start+(trim.end-trim.start)*i/count,end=trim.start+(trim.end-trim.start)*(i+1)/count;
          const middle=(start+end)/2,worldFraction=screenToWorldFraction(middle,from.depth,to.depth);
          if(!visible(from.world.clone().lerp(to.world,worldFraction))){drawing=false;continue;}
          const x=t=>from.x+(to.x-from.x)*t,y=t=>from.y+(to.y-from.y)*t;
          if(!drawing)d+=`M${x(start).toFixed(3)},${y(start).toFixed(3)}`;
          d+=`L${x(end).toFixed(3)},${y(end).toFixed(3)}`;drawing=true;
        }
      }
      layer.path.setAttribute('d',d);layer.path.setAttribute('stroke-width',bonePixels);
      projected.forEach((point,i)=>{
        const joint=layer.joints[i],show=names[i]!=='golf_club_shaft'&&point&&visible(point.world);
        joint.group.style.display=show?'':'none';if(!show)return;
        for(const circle of [joint.ring,joint.dot]){circle.setAttribute('cx',point.x);circle.setAttribute('cy',point.y);}
        joint.ring.setAttribute('r',jointPixels*.425);joint.ring.setAttribute('stroke-width',jointPixels*.15);joint.dot.setAttribute('r',jointPixels*.29);
      });
    }
  }
  return {render,dispose(){root.remove();layers.clear();}};
}
