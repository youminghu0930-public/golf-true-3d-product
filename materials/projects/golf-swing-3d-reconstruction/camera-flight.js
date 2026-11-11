// Preserve the destination when output and target are the same quaternion.
// Three.js slerpQuaternions copies `from` before reading `target`.
export function interpolateRotation(output, from, target, progress) {
  const destination=target.clone();
  return output.copy(from).slerp(destination,progress);
}

// Keep an orbiting camera above the floor without changing its orbit center.
export function constrainCameraAboveGround(camera, minimumY) {
  if(camera.position.y>=minimumY)return;
  const before=camera.position.clone(),radius=before.length();
  const y=Math.min(minimumY,radius*.999999);
  const horizontal=Math.hypot(before.x,before.z);
  const scale=Math.sqrt(Math.max(0,radius*radius-y*y))/(horizontal||1);
  camera.position.set(horizontal?before.x*scale:0,y,horizontal?before.z*scale:Math.sqrt(Math.max(0,radius*radius-y*y)));
  const rotation=camera.quaternion.clone().setFromUnitVectors(before.normalize(),camera.position.clone().normalize());
  camera.quaternion.premultiply(rotation);
}
