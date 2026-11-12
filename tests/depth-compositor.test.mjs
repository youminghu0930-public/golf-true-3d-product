import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {createDepthCompositor} from '../depth-compositor.js';
test('Depth peeling isolates solids and resolves transparent layers without changing scene state',()=>{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f2ed');
 const solid=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 const glass=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial({transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));
 glass.renderOrder=16;scene.add(solid,glass);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());hidden.visible=false;scene.add(hidden);
 let target=null,color=new THREE.Color('#111111'),alpha=1;const passes=[];
 const renderer={autoClear:true,shadowMap:{autoUpdate:true},getDrawingBufferSize(v){return v.set(320,200);},getClearColor(v){return v.copy(color);},getClearAlpha(){return alpha;},getRenderTarget(){return target;},setRenderTarget(t){target=t;},setClearColor(c,a){color.set(c);alpha=a;},render(s){
  if(s!==scene){passes.push('composite');return;}
  passes.push([solid.visible,glass.visible]);
  if(glass.visible){assert.equal(glass.material.depthWrite,true);assert.equal(glass.material.blending,THREE.NoBlending);}
 }};
 const compositor=createDepthCompositor(renderer,{layers:3});compositor.render(scene,new THREE.Camera());
 assert.deepEqual(passes,[[true,false],[false,true],[false,true],[false,true],'composite']);
 assert.equal(solid.visible,true);assert.equal(glass.visible,true);assert.equal(hidden.visible,false);
 assert.equal(glass.material.depthWrite,false);assert.equal(glass.material.blending,THREE.NormalBlending);
 assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(target,null);assert.equal(alpha,1);
 const shader={uniforms:{},fragmentShader:'void main() { gl_FragColor=vec4(1.); }'};
 glass.material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/surfaceDepth<=texture2D\(peelPrevious/);
 assert.match(shader.fragmentShader,/surfaceDepth>=texture2D\(peelOpaque/);
 assert.equal(shader.uniforms.peelEnabled.value,false);
 compositor.dispose();solid.geometry.dispose();solid.material.dispose();glass.geometry.dispose();glass.material.dispose();hidden.geometry.dispose();hidden.material.dispose();
});
