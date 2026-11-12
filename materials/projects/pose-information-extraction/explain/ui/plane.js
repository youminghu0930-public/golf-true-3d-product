import * as THREE from '../../vendor/three/three.module.js';
import {add,mul} from '../math.js';
import {axisColors} from '../palette.js';
// A centered plane with independent growth and opacity, reusable across recipes.
export function createPlaneRenderer(scene,toWorld){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));geometry.setIndex([0,1,2,0,2,3]);
 const circleCount=64,circleGeometry=new THREE.BufferGeometry();
 circleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((circleCount+2)*3),3));
 circleGeometry.setIndex(Array.from({length:circleCount},(_,i)=>[0,i+1,i+2]).flat());
 const material=new THREE.MeshBasicMaterial({color:axisColors.y,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=15;scene.add(mesh);
 return {update(spec){
  mesh.visible=!!spec&&spec.opacity>0;if(!mesh.visible)return;
  mesh.geometry=spec.shape==='circle'?circleGeometry:geometry;
  const positions=mesh.geometry.attributes.position;
  if(spec.shape==='circle'){
   const origin=toWorld(spec.origin);positions.setXYZ(0,origin.x,origin.y,origin.z);
   for(let i=0;i<=circleCount;i++){
    const angle=i/circleCount*Math.PI*2;
    const p=toWorld(add(spec.origin,add(mul(spec.u,Math.cos(angle)*spec.size),mul(spec.v,Math.sin(angle)*spec.size))));
    positions.setXYZ(i+1,p.x,p.y,p.z);
   }
  }else{
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  corners.forEach(([a,b],i)=>{const p=toWorld(add(spec.origin,add(mul(spec.u,a*spec.size),mul(spec.v,b*spec.size))));geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);});
  }
  positions.needsUpdate=true;mesh.geometry.computeBoundingSphere();material.opacity=(spec.fillOpacity??.12)*spec.opacity;material.color.set(spec.color??axisColors[spec.axis??'y']);
 },dispose(){scene.remove(mesh);geometry.dispose();circleGeometry.dispose();material.dispose();}};
}
