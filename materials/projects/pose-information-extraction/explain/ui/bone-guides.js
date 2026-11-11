import * as THREE from '../../vendor/three/three.module.js';

// Physical copies of length samples: one closed capsule per bone, no joints.
// Updating the cylindrical span preserves round ends at every sample length.
export function createBoneGuides(scene,toWorld){
 const group=new THREE.Group();group.name='normalization-bone-copies';scene.add(group);
 const copies=new Map(),up=new THREE.Vector3(0,1,0),boneRadius=.012,jointCut=Math.sqrt(.022**2-boneRadius**2);
 function copy(id){
  if(copies.has(id))return copies.get(id);
  const geometry=new THREE.CapsuleGeometry(1,1,6,16),original=new Float32Array(geometry.attributes.position.array);
  const material=new THREE.MeshStandardMaterial({color:'#8b9198',roughness:.38,metalness:.08,transparent:true});
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  const result={mesh,original};copies.set(id,result);return result;
 }
 return {update(guides=[]){
  for(const {mesh} of copies.values())mesh.visible=false;
  for(const guide of guides){
   const from=toWorld(guide.from),to=toWorld(guide.to),delta=to.clone().sub(from),fullLength=delta.length();
   const length=fullLength-2*jointCut*(guide.jointTrim??0);if(length<1e-7)continue;
   const {mesh,original}=copy(guide.id),radius=Math.min(boneRadius,length/2),halfSpan=Math.max(0,(length-2*radius)/2),positions=mesh.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){const y=original[i*3+1];positions.setXYZ(i,original[i*3]*radius,Math.sign(y)*halfSpan+(y-Math.sign(y)*.5)*radius,original[i*3+2]*radius);}positions.needsUpdate=true;mesh.geometry.computeBoundingSphere();
   mesh.scale.setScalar(1);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,delta.multiplyScalar(1/fullLength));
   mesh.material.color.set(guide.color??'#8b9198');mesh.material.opacity=guide.opacity??1;mesh.material.depthWrite=mesh.material.opacity>.999;mesh.visible=mesh.material.opacity>.001;
  }
 },dispose(){for(const {mesh} of copies.values()){mesh.geometry.dispose();mesh.material.dispose();}scene.remove(group);copies.clear();}};
}
