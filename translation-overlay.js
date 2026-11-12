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
export function createTranslationOverlay({scene,toWorld,data,metrics,canvas},groups,labels){
 // Render solid flat strokes into depth before transparent surfaces. Pose
 // fragments in front blend over them; fragments behind fail the depth test.
 // Label connectors remain independent SVG overlays.
 const materials=new Map(groups.map(group=>[group.id,new THREE.ShaderMaterial({
  uniforms:{color:{value:new THREE.Color(group.color)},resolution:{value:new THREE.Vector2(1,1)},width:{value:2}},
  vertexShader:`attribute vec3 other; attribute float side; uniform vec2 resolution; uniform float width;
   void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    vec4 q=projectionMatrix*modelViewMatrix*vec4(other,1.0);
    vec2 delta=(q.xy/q.w-p.xy/p.w)*resolution;
    vec2 normal=length(delta)>0.00001?normalize(vec2(-delta.y,delta.x)):vec2(0.0);
    p.xy+=normal*side*width/resolution*p.w;gl_Position=p;}`,
  fragmentShader:`uniform vec3 color; void main(){gl_FragColor=vec4(color,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  side:THREE.DoubleSide,depthTest:true,depthWrite:true,
 })]));
 const lines=Array.from({length:5},(_,i)=>{
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));
  geometry.setAttribute('other',new THREE.Float32BufferAttribute(new Float32Array(12),3));
  geometry.setAttribute('side',new THREE.Float32BufferAttribute([1,-1,-1,1],1));geometry.setIndex([0,1,2,2,1,3]);
  const line=new THREE.Mesh(geometry,materials.get(groups[i<2?0:i<4?1:2].id));line.frustumCulled=false;line.renderOrder=0;scene.add(line);return line;
 });
 const sphere=new THREE.SphereGeometry(.007,16,12);
 const markers=[['#8b9198','Translation origin'],['#168568','Current hip center']].map(([color,name])=>{
  const marker=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));marker.name=name;scene.add(marker);return marker;
 });
 const cache=new Map();let current;
 return {setFrame(frame){
  if(!cache.has(frame)){cache.set(frame,translationGeometry(data,metrics,frame));if(cache.size>24)cache.delete(cache.keys().next().value);}
  const g=current=cache.get(frame);
  g.lines.forEach(([key,from,to],i)=>{
   const line=lines[i],a=toWorld(from),b=toWorld(to);line.material=materials.get(key);
   const positions=line.geometry.attributes.position,other=line.geometry.attributes.other;
   [a,a,b,b].forEach((point,j)=>positions.setXYZ(j,point.x,point.y,point.z));
   [b,b,a,a].forEach((point,j)=>other.setXYZ(j,point.x,point.y,point.z));
   positions.needsUpdate=other.needsUpdate=true;
  });
  markers[0].position.copy(toWorld(g.origin));markers[1].position.copy(toWorld(g.hip));
  for(const group of groups){const label=labels.get(`${group.id}:${group.id}`);label.anchor=g.anchors[group.id];label.measurement=metrics.metrics.position.hip_sway_thrust_lift[group.id][frame];}
 },updateView(camera,w,h){
  materials.forEach(material=>material.uniforms.resolution.value.set(w,h));
 },dispose(){lines.forEach(line=>{scene.remove(line);line.geometry.dispose();});materials.forEach(material=>material.dispose());markers.forEach(marker=>{scene.remove(marker);marker.material.dispose();});sphere.dispose();}};
}
