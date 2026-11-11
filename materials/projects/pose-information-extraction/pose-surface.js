import * as THREE from './vendor/three/three.module.js';

// Separate physical surfaces: intact balls joined by open cylindrical sheets.
// Both sides render when translucent; no projected masks or cut-out joint caps.
export function createPoseSurface(boneRadius,jointRadius){
 const cut=Math.sqrt(jointRadius*jointRadius-boneRadius*boneRadius),up=new THREE.Vector3(0,1,0);
 function surfaceMaterial(material){
  const surface=material.clone();surface.side=THREE.DoubleSide;surface.forceSinglePass=false;
  return surface;
 }
 function bone(material){
  return new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24,1,true),surfaceMaterial(material));
 }
 function placeBone(mesh,from,to){
  const delta=to.clone().sub(from),length=delta.length(),span=length-2*cut;
  mesh.visible=span>1e-7;if(!mesh.visible)return;
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(up,delta.multiplyScalar(1/length));mesh.scale.set(boneRadius,span,boneRadius);
 }
 function joint(material){
  return new THREE.Mesh(new THREE.SphereGeometry(jointRadius,24,16),surfaceMaterial(material));
 }
 function placeJoint(mesh,point){mesh.position.copy(point);}
 return {bone,joint,placeBone,placeJoint,cut};
}
