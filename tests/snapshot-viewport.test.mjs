import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {snapshotViewCenter} from '../snapshot-viewport.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function project(zoom,panX=0,panY=0,stripTop=330){
 const w=800,h=460,view=snapshotViewCenter(h,stripTop,panX,panY),camera=new THREE.PerspectiveCamera(45,w/h,.01,100);
 camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.zoom=zoom;camera.setViewOffset(w,h,view.offsetX,view.offsetY,w,h);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const point=new THREE.Vector3().project(camera);return {x:(point.x+1)*w/2,y:(1-point.y)*h/2};
}
test('Default view and every zoom share the clear-area center above the bottom strip',()=>{
 for(const zoom of [.4,1,2,6]){const p=project(zoom);close(p.x,400);close(p.y,165);}
});
test('Manual pan scales around the clear center, without scaling the strip offset',()=>{
 const before=project(1,30,20),after=project(2,60,40);
 close(after.x-400,2*(before.x-400));close(after.y-165,2*(before.y-165));
});
test('Viewers without a bottom strip retain their full-window center',()=>{
 for(const zoom of [1,2,6]){const p=project(zoom,0,0,460);close(p.x,400);close(p.y,230);}
});

test('Camera POV default zoom fits the clear height only when a strip is present',()=>{
 close(snapshotViewCenter(460,320).cameraZoomScale,320/460);
 close(snapshotViewCenter(350,215).cameraZoomScale,215/350);
 close(snapshotViewCenter(460).cameraZoomScale,1);
 const h=460,clear=320,view=snapshotViewCenter(h,clear),camera=new THREE.PerspectiveCamera(45,800/h,.01,100);
 camera.position.z=10;camera.zoom=view.cameraZoomScale;camera.setViewOffset(800,h,view.offsetX,view.offsetY,800,h);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const halfHeight=10*Math.tan(Math.PI/8);
 for(const [worldY,pixelY] of [[halfHeight,0],[-halfHeight,clear]]){const point=new THREE.Vector3(0,worldY,0).project(camera);close((1-point.y)*h/2,pixelY);}
});
