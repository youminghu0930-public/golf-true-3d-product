// Preserve the destination when output and target are the same quaternion.
// Three.js slerpQuaternions copies `from` before reading `target`.
export function interpolateRotation(output, from, target, progress) {
  const destination=target.clone();
  return output.copy(from).slerp(destination,progress);
}

// Keep an orbiting camera above the floor without changing its orbit center.
export function constrainCameraAboveGround(camera, minimumY) {
  if(camera.position.y>=minimumY)return;
  const before=camera.position.clone(),radius=Math.max(before.length(),Math.abs(minimumY)+1e-6);
  const y=minimumY;
  const horizontal=Math.hypot(before.x,before.z);
  const scale=Math.sqrt(Math.max(0,radius*radius-y*y))/(horizontal||1);
  camera.position.set(horizontal?before.x*scale:0,y,horizontal?before.z*scale:Math.sqrt(Math.max(0,radius*radius-y*y)));
  const rotation=camera.quaternion.clone().setFromUnitVectors(before.normalize(),camera.position.clone().normalize());
  camera.quaternion.premultiply(rotation);
}

// Clamp orbit elevation at the ground boundary while retaining pivot and radius.
export function constrainOrbitAboveGround(position,target,minimumY){
 if(position.y>=minimumY)return;
 const offset=position.clone().sub(target),minimumOffset=minimumY-target.y;
 const radius=Math.max(offset.length(),Math.abs(minimumOffset)+1e-6),horizontal=Math.hypot(offset.x,offset.z);
 const span=Math.sqrt(Math.max(0,radius*radius-minimumOffset*minimumOffset));
 position.set(target.x+(horizontal?offset.x/horizontal*span:0),minimumY,target.z+(horizontal?offset.z/horizontal*span:span));
}
