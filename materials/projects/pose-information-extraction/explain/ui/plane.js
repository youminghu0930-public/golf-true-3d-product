import * as THREE from '../../vendor/three/three.module.js';
import {add,mul} from '../math.js';
import {axisColors} from '../palette.js';
// A centered plane with independent growth and opacity, reusable across recipes.
export function createPlaneRenderer(scene,toWorld){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));geometry.setIndex([0,1,2,0,2,3]);
 const material=new THREE.MeshBasicMaterial({color:axisColors.y,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=15;scene.add(mesh);
 return {update(spec){
  mesh.visible=!!spec&&spec.opacity>0;if(!mesh.visible)return;
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  corners.forEach(([a,b],i)=>{const p=toWorld(add(spec.origin,add(mul(spec.u,a*spec.size),mul(spec.v,b*spec.size))));geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);});
  geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();material.opacity=(spec.fillOpacity??.12)*spec.opacity;material.color.set(axisColors[spec.axis??'y']);
 },dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
