import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';

// A long-lens free view and a calibrated camera have very different distances
// and zooms. Blend the visible span, rather than those lens values separately.
export function interpolateSnapshotCamera(camera, from, progress) {
  const t=Math.max(0,Math.min(1,progress));
  const targetPosition=camera.position.clone(),targetRotation=camera.quaternion.clone();
  const targetFov=camera.fov,targetZoom=camera.zoom;
  const startDistance=from.position.length(),endDistance=targetPosition.length();
  const up=new THREE.Vector3(0,1,0),origin=new THREE.Vector3();
  const aim=position=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,origin,up));
  const startOffset=aim(from.position).invert().multiply(from.rotation);
  const endOffset=aim(targetPosition).invert().multiply(targetRotation);
  const turn=new THREE.Quaternion().setFromUnitVectors(from.position.clone().normalize(),targetPosition.clone().normalize());
  const partialTurn=new THREE.Quaternion().slerp(turn,t);
  const distance=THREE.MathUtils.lerp(startDistance,endDistance,t);
  camera.position.copy(from.position).normalize().applyQuaternion(partialTurn).multiplyScalar(distance);
  camera.quaternion.copy(aim(camera.position)).multiply(startOffset.slerp(endOffset,t));
  const halfSpan=(distance,fov,zoom)=>distance*Math.tan(THREE.MathUtils.degToRad(fov/2))/zoom;
  const span=THREE.MathUtils.lerp(halfSpan(startDistance,from.fov,from.zoom),halfSpan(endDistance,targetFov,targetZoom),t);
  camera.fov=THREE.MathUtils.lerp(from.fov,targetFov,t);
  camera.zoom=distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/span;
}
