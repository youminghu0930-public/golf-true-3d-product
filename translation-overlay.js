import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {explainSnapshot} from './materials/projects/pose-information-extraction/explain/index.js';
import {createDisplacementGeometry} from './materials/projects/pose-information-extraction/explain/choreography/displacement-geometry.js';
// Work in the reference's source coordinates, exactly like the child project.
export function translationGeometry(data,metrics,frame){
 const model=explainSnapshot(data,metrics,{type:'position',subtype:'hip_sway_thrust_lift',frame});
 const g=createDisplacementGeometry(model.context),o=g.referenceRoot,h=g.selectedRoot;
 const x=[h[0],o[1],o[2]],z=[o[0],o[1],h[2]],corner=[h[0],o[1],h[2]];
 const midpoint=(a,b)=>a.map((value,i)=>(value+b[i])/2);
 // Label the three edges meeting at the horizontal corner below the hip.
 return {origin:o,hip:h,lines:[['sway',o,x],['sway',z,corner],['thrust',o,z],['thrust',x,corner],['lift',corner,h]],anchors:{sway:midpoint(z,corner),thrust:midpoint(x,corner),lift:h}};
}
export function createTranslationStrokeMaterial(color){
 return new THREE.MeshStandardMaterial({color,roughness:.55,metalness:0,depthTest:true,depthWrite:true});
}
export function createTranslationOverlay({scene,toWorld,data,metrics,canvas},groups,labels){
 // Very thin solid tubes with spherical end caps retain true scene depth.
 const materials=new Map(groups.map(group=>[group.id,createTranslationStrokeMaterial(group.color)]));
 const tubeGeometry=new THREE.CylinderGeometry(1,1,1,16,1,true),capGeometry=new THREE.SphereGeometry(1,16,10);
 const tubeRadius=.0007,up=new THREE.Vector3(0,1,0);
 const lines=Array.from({length:5},(_,i)=>{
  const group=new THREE.Group(),material=materials.get(groups[i<2?0:i<4?1:2].id);
  const shaft=new THREE.Mesh(tubeGeometry,material),caps=[new THREE.Mesh(capGeometry,material),new THREE.Mesh(capGeometry,material)];
  shaft.scale.set(tubeRadius,0,tubeRadius);group.visible=false;
  caps.forEach(cap=>cap.scale.setScalar(tubeRadius));group.add(shaft,...caps);scene.add(group);return {group,shaft,caps};
 });
 const sphere=new THREE.SphereGeometry(.007,16,12);
 const markers=[['#8b9198','Translation origin'],['#168568','Current hip center']].map(([color,name])=>{
  const marker=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));marker.name=name;marker.visible=false;scene.add(marker);return marker;
 });
 const cache=new Map();let current;
 return {setFrame(frame){
  if(!cache.has(frame)){cache.set(frame,translationGeometry(data,metrics,frame));if(cache.size>24)cache.delete(cache.keys().next().value);}
  const g=current=cache.get(frame);
  g.lines.forEach(([key,from,to],i)=>{
   const line=lines[i],a=toWorld(from),b=toWorld(to),delta=b.clone().sub(a),length=delta.length(),material=materials.get(key);
   line.group.visible=length>1e-8;line.shaft.material=material;line.caps.forEach(cap=>cap.material=material);
   line.shaft.position.copy(a).add(b).multiplyScalar(.5);line.shaft.scale.set(tubeRadius,length,tubeRadius);
   if(length>1e-8)line.shaft.quaternion.setFromUnitVectors(up,delta.multiplyScalar(1/length));
   line.caps[0].position.copy(a);line.caps[1].position.copy(b);
  });
  markers.forEach(marker=>marker.visible=true);
  markers[0].position.copy(toWorld(g.origin));markers[1].position.copy(toWorld(g.hip));
  for(const group of groups){const label=labels.get(`${group.id}:${group.id}`);label.anchor=g.anchors[group.id];label.measurement=metrics.metrics.position.hip_sway_thrust_lift[group.id][frame];}
 },updateView(camera,w,h){
  // Tubes use fixed world-space thickness.
 },dispose(){lines.forEach(line=>scene.remove(line.group));tubeGeometry.dispose();capGeometry.dispose();materials.forEach(material=>material.dispose());markers.forEach(marker=>{scene.remove(marker);marker.material.dispose();});sphere.dispose();}};
}
