import {Matrix4,Quaternion,Vector3} from '../../vendor/three/three.module.js';
import {unit,cross} from '../math.js';
export function cameraOrientation(direction,up){
 const z=unit(direction),x=unit(cross(up,z)),y=unit(cross(z,x));
 return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...x),new Vector3(...y),new Vector3(...z)));
}

// Shared overview keeps the forward axis clear of the camera's optical axis.
export function referenceOverview(frame){
 const direction=new Vector3(...frame.z).addScaledVector(new Vector3(...frame.x),.65);
 return cameraOrientation(direction.toArray(),frame.y);
}

// Eight stable corners let successive close-ups interpolate without changing
// the focus point count or jumping when a new stage starts.
export function cameraFocusBounds(points){
 const low=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),high=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
 return [0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>[x?high[0]:low[0],y?high[1]:low[1],z?high[2]:low[2]])));
}
export function cameraBetween(from,to,t){
 const q=from.clone().slerp(to,t);
 return {direction:new Vector3(0,0,1).applyQuaternion(q).toArray(),up:new Vector3(0,1,0).applyQuaternion(q).toArray()};
}

// Preserve global vertical even while the scripted view direction changes.
export function uprightCamera(camera,globalUp){return {...camera,up:[...globalUp]};}

// Retain enough normal-facing view to see a plane's area, rather than an edge.
// The supplied normal selects the visible side; camera up stays unchanged.
export function cameraWithVisiblePlane(camera,normal,minFacing=.4){
 const n=new Vector3(...normal).normalize(),d=new Vector3(...camera.direction).normalize(),facing=d.dot(n);
 if(facing>=minFacing)return camera;
 const tangent=d.clone().addScaledVector(n,-facing);
 if(tangent.lengthSq()<1e-12)tangent.crossVectors(n,new Vector3(...camera.up));
 if(tangent.lengthSq()<1e-12)tangent.crossVectors(n,new Vector3(1,0,0));
 tangent.normalize().multiplyScalar(Math.sqrt(1-minFacing*minFacing)).addScaledVector(n,minFacing);
 return {...camera,direction:tangent.toArray()};
}

// Interpolate heading and elevation rather than a rolled quaternion path.
export function uprightCameraBetween(from,to,t,globalUp,forward){
 const up=new Vector3(...globalUp).normalize(),z=new Vector3(...forward).normalize(),x=new Vector3().crossVectors(up,z).normalize();
 function angles(q){
  const d=new Vector3(0,0,1).applyQuaternion(q);
  return {yaw:Math.atan2(d.dot(x),d.dot(z)),pitch:Math.asin(Math.max(-1,Math.min(1,d.dot(up))))};
 }
 const a=angles(from),b=angles(to),delta=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
 const yaw=a.yaw+delta*t,pitch=a.pitch+(b.pitch-a.pitch)*t;
 const direction=z.clone().multiplyScalar(Math.cos(yaw)*Math.cos(pitch)).addScaledVector(x,Math.sin(yaw)*Math.cos(pitch)).addScaledVector(up,Math.sin(pitch));
 return {direction:direction.toArray(),up:[...globalUp]};
}

// Keep a measurement view at a modest elevation instead of below the subject.
export function constrainViewElevation(orientation,globalUp,minDegrees=6,maxDegrees=15){
 const up=new Vector3(...globalUp).normalize(),direction=new Vector3(0,0,1).applyQuaternion(orientation);
 const elevation=Math.asin(Math.max(-1,Math.min(1,direction.dot(up))));
 const pitch=Math.max(minDegrees*Math.PI/180,Math.min(maxDegrees*Math.PI/180,elevation));
 const horizontal=direction.clone().addScaledVector(up,-direction.dot(up)).normalize();
 return cameraOrientation(horizontal.multiplyScalar(Math.cos(pitch)).addScaledVector(up,Math.sin(pitch)).toArray(),globalUp);
}

// Bias an inclination view toward the measured side of the body's lean.
export function viewFromLeanSide(orientation,leanDirection,planeNormal,globalUp){
 const normal=new Vector3(...planeNormal).normalize(),lean=new Vector3(...leanDirection).dot(normal);
 const direction=new Vector3(0,0,1).applyQuaternion(orientation);
 if(Math.abs(lean)>1e-8){
  direction.addScaledVector(normal,-direction.dot(normal)).normalize();
  direction.addScaledVector(normal,Math.sign(lean)*.35).normalize();
 }
 return constrainViewElevation(cameraOrientation(direction.toArray(),globalUp),globalUp);
}
