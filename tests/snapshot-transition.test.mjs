import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {interpolateSnapshotCamera} from '../snapshot-transition.js';
const lens=(position,zoom,fov)=>{const c=new THREE.PerspectiveCamera(fov,1,.01,1000);c.position.set(...position);c.lookAt(0,0,0);c.zoom=zoom;return c;};
const state=c=>({position:c.position.clone(),rotation:c.quaternion.clone(),zoom:c.zoom,fov:c.fov});
const span=c=>c.position.length()*Math.tan(THREE.MathUtils.degToRad(c.fov/2))/c.zoom;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const reverse of [false,true])test(`free/calibrated transition keeps exact endpoints (${reverse?'return':'outgoing'})`,()=>{
 const endpoints=[lens([-50,30,50],12,45),lens([3,2,6],1,58)];if(reverse)endpoints.reverse();
 const [start,end]=endpoints;end.rotateY(.07); // calibrated optical axis need not aim at the body
 for(const t of [0,1]){const c=end.clone();interpolateSnapshotCamera(c,state(start),t);const expected=t?end:start;
  close(c.position.distanceTo(expected.position),0);close(c.quaternion.angleTo(expected.quaternion),0);close(c.zoom,expected.zoom);close(c.fov,expected.fov);}
});
test('long-lens flight does not inflate the subject mid-transition',()=>{
 const start=lens([-50,30,50],12,45),end=lens([3,2,6],1,58);
 for(const t of [.1,.25,.5,.75,.9]){const c=end.clone();interpolateSnapshotCamera(c,state(start),t);close(span(c),span(start)+(span(end)-span(start))*t);
  c.updateMatrixWorld();c.updateProjectionMatrix();const center=new THREE.Vector3().project(c);close(center.x,0);close(center.y,0);}
});
test('opposite views travel around the golfer instead of through the origin',()=>{
 const start=lens([0,0,60],12,45),end=lens([0,0,-6],1,45);const c=end.clone();interpolateSnapshotCamera(c,state(start),.5);close(c.position.length(),33);assert.ok(Number.isFinite(c.zoom)&&c.zoom>0);
});
