import * as THREE from '../../vendor/three/three.module.js';
import {angleColor} from '../palette.js';
import {sectorBoundary} from './sector-shape.js';

export function createRotationSector(scene,toWorld){
 const count=96,geometry=new THREE.BufferGeometry();
 const positions=new THREE.Float32BufferAttribute(new Float32Array((count+2)*3),3);geometry.setAttribute('position',positions);
 geometry.setIndex(Array.from({length:count},(_,i)=>[0,i+1,i+2]).flat());
 const material=new THREE.MeshBasicMaterial({transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=16;scene.add(mesh);
 const outlineGeometry=new THREE.BufferGeometry();
 const outlinePositions=new THREE.Float32BufferAttribute(new Float32Array((count+3)*3),3);outlineGeometry.setAttribute('position',outlinePositions);
 const outline=new THREE.Line(outlineGeometry,new THREE.LineBasicMaterial({transparent:true,opacity:0,depthWrite:false}));outline.renderOrder=18;scene.add(outline);
 function update(spec){
  mesh.visible=!!spec&&Math.abs(spec.angle)>.01;outline.visible=false;if(!mesh.visible)return;
  const {points,amount}=sectorBoundary(spec,count),origin=toWorld(spec.origin);
  positions.setXYZ(0,origin.x,origin.y,origin.z);outlinePositions.setXYZ(0,origin.x,origin.y,origin.z);
  points.forEach((point,i)=>{
   const p=toWorld(point);positions.setXYZ(i+1,p.x,p.y,p.z);outlinePositions.setXYZ(i+1,p.x,p.y,p.z);
  });
  outlinePositions.setXYZ(count+2,origin.x,origin.y,origin.z);
  positions.needsUpdate=true;outlinePositions.needsUpdate=true;
  geometry.computeBoundingSphere();outlineGeometry.computeBoundingSphere();
  const opacity=spec.opacity??1;material.opacity=(spec.fillOpacity??.28)*opacity;
  outline.visible=amount>0||!!spec.outline;outline.material.opacity=.75*(spec.outline?1:amount)*opacity;
  material.color.set(spec.color??angleColor);outline.material.color.copy(material.color);
 }
 return {update,dispose(){geometry.dispose();material.dispose();outlineGeometry.dispose();outline.material.dispose();scene.remove(mesh,outline);}};
}

// Rotation moves two basis directions. Keep their pie surfaces independent,
// while reusing the same renderer as construction-angle markers.
export function createRotationSectors(scene,toWorld){
 const layers=[createRotationSector(scene,toWorld),createRotationSector(scene,toWorld)];
 return {
  update(specs=[]){layers.forEach((layer,i)=>layer.update(specs[i]));},
  dispose(){layers.forEach(layer=>layer.dispose());},
 };
}
