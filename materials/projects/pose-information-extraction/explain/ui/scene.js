import {createFlatArrows} from './arrow-shape.js';
import {jointPairPresentation} from '../choreography/joint-pair.js';
import {createLabels} from './labels.js';
import {phases} from './timeline.js';
import * as THREE from '../../vendor/three/three.module.js';
import {unit,cross,mul,add,rotate} from '../math.js';
// Shared animated primitives. Geometry is allocated once per stage, never per frame.
export function createExplanationLayer(scene,toWorld,canvas){
 const arrows=createFlatArrows(canvas),labels=createLabels(canvas),root=new THREE.Group();root.name='metric-explanation';scene.add(root);let updates=[],jointHighlights=[];
 function clear(){
  labels.clear();arrows.clear();updates=[];const geometries=new Set(),materials=new Set();
  root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)materials.add(node.material);});root.clear();
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});
 }
 function line(points,color,dashed=false){
  const geometry=new THREE.BufferGeometry().setFromPoints(points),material=dashed?new THREE.LineDashedMaterial({color,dashSize:.025,gapSize:.015,depthWrite:false}):new THREE.LineBasicMaterial({color,depthWrite:false});
  const mesh=new THREE.Line(geometry,material);if(dashed)mesh.computeLineDistances();root.add(mesh);return mesh;
 }
 function arrow(from,color){return arrows.add(color);}
 function pointArrow(mesh,from,to){mesh.visible=from.distanceTo(to)>1e-7;mesh.setEndpoints(from,to);}
 function show(visuals,source){
  clear();const world=p=>toWorld(source(p));
  const pairCount=visuals.filter(v=>v.jointPair).length;let pairIndex=0;
  for(const v of visuals){
   if(v.kind==='point'){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.018,16,12),new THREE.MeshBasicMaterial({color:v.color}));mesh.position.copy(world(v.position));root.add(mesh);labels.add(mesh.position,v.label,v.color);updates.push(p=>mesh.scale.setScalar(.5+.5*p.directions));
   }else if(v.kind==='vector'){
    const from=world(v.from),to=world(v.to),mesh=arrow(from,v.color);labels.add(to,v.label,v.color);
    if(v.jointPair){
     const index=pairIndex++;
     updates.push(p=>{const q=jointPairPresentation(Math.max(0,Math.min(1,p.progress*pairCount-index)));pointArrow(mesh,from,from.clone().lerp(to,q.stretch));jointHighlights.push({...v.jointPair,strength:q.strength});});
    }else updates.push(p=>pointArrow(mesh,from,from.clone().lerp(to,p.directions)));
   }else if(v.kind==='projection'){
    const from=world(v.origin),original=world(add(v.origin,mul(v.direction,v.size))),target=world(add(v.origin,mul(v.target,v.size))),mesh=arrow(from,v.color);
    const drop=line([original,original],v.color,true),label=labels.add(original,v.label,v.color);
    updates.push(p=>{
     const to=original.clone().lerp(target,p.projection);pointArrow(mesh,from,to);label.setPosition(to);
     const positions=drop.geometry.attributes.position;positions.setXYZ(1,to.x,to.y,to.z);positions.needsUpdate=true;drop.computeLineDistances();drop.visible=p.projection>0;
    });
   }else if(v.kind==='plane'){
    const n=unit(v.normal),u=unit(cross(n,Math.abs(n[1])<.9?[0,1,0]:[1,0,0])),w=unit(cross(n,u));
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>world(add(v.origin,add(mul(u,a*v.radius),mul(w,b*v.radius)))));
    const geometry=new THREE.BufferGeometry().setFromPoints(corners);geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const material=new THREE.MeshBasicMaterial({color:v.color,opacity:0,transparent:true,side:THREE.DoubleSide,depthWrite:false});root.add(new THREE.Mesh(geometry,material));
    const border=line([...corners,corners[0]],v.color,true);labels.add(corners[2],v.label,v.color);
    updates.push(p=>{material.opacity=.1*p.directions;border.visible=p.directions>.2;});
   }else if(v.kind==='arc'){
    const count=96,points=Array.from({length:count+1},(_,i)=>world(add(v.origin,mul(rotate(v.from,v.normal,v.degrees*i/count),v.radius))));
    const curve=line(points,v.color),from=world(v.origin),sweep=arrow(from,v.color),label=labels.add(points[0],`${v.label} 0.0°`,v.color);
    updates.push(p=>{
     curve.geometry.setDrawRange(0,Math.floor(p.angle*count)+1);
     const to=world(add(v.origin,mul(rotate(v.from,v.normal,v.degrees*p.angle),v.radius)));pointArrow(sweep,from,to);
     sweep.visible=p.directions>.8;label.setPosition(to);label.setText(`${v.label} ${((v.value??v.degrees)*p.angle).toFixed(1)}°`);
    });
   }
  }
  animate(0);
 }
 function animate(progress){jointHighlights=[];const p={...phases(progress),progress};updates.forEach(update=>update(p));return jointHighlights;}
 return {show,animate,updateLabels(camera,w,h){labels.update(camera,w,h);arrows.updateView(camera,w,h);},dispose(){clear();labels.dispose();arrows.dispose();scene.remove(root);}};
}
