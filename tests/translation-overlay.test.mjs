import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {translationGeometry} from '../translation-overlay.js';
import {measurementPlotChannels} from '../rotation-plot.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../materials/data/'+file,import.meta.url)));
const data=read('3d_results/00.json'),metrics=read('metrics/00.json');
test('Translation rectangle closes horizontally and its vertical lift reaches the current hip',()=>{
 for(const frame of [0,150,350,500,692]){
  const g=translationGeometry(data,metrics,frame),[a,b,c,d,lift]=g.lines;
  assert.equal(g.lines.length,5);
  for(const [key,from,to] of g.lines){
   const varying={sway:0,thrust:2,lift:1}[key];
   for(let i=0;i<3;i++)if(i!==varying)assert.equal(from[i],to[i]);
  }
  assert.deepEqual(a[1],g.origin);assert.deepEqual(c[1],g.origin);
  assert.deepEqual(a[2],d[1]);assert.deepEqual(c[2],b[1]);
  assert.deepEqual(b[2],d[2]);assert.deepEqual(lift[1],b[2]);assert.deepEqual(lift[2],g.hip);
  for(const line of [b,d]){
   const [key,from,to]=line;
   assert.deepEqual(g.anchors[key],from.map((value,i)=>(value+to[i])/2));
  }
  assert.deepEqual(g.anchors.lift,g.hip);
  const pose=data.reconstruction[frame],index=data.joints.indexOf('root');
  const hip=index>=0?pose[index]:pose[data.joints.indexOf('left_hip')].map((v,i)=>(v+pose[data.joints.indexOf('right_hip')][i])/2);
  hip.forEach((value,i)=>assert.ok(Math.abs(value-g.hip[i])<1e-10));
 }
});
test('Translation plot uses three distinct solid axis channels and exported positional values',()=>{
 const channels=measurementPlotChannels(metrics,data.reconstruction.length,'hip-translation');
 assert.equal(channels.length,3);assert.equal(new Set(channels.map(c=>c.color)).size,3);
 for(const channel of channels){assert.equal(channel.dashed,false);assert.deepEqual(channel.values,metrics.metrics.position.hip_sway_thrust_lift[channel.group]);}
});

test('Flat translation strokes stay hidden until positioned and retain scene depth',async()=>{
 const THREE=await import('../materials/projects/pose-information-extraction/vendor/three/three.module.js');
 const {createTranslationOverlay}=await import('../translation-overlay.js');
 const {measurementFeatures}=await import('../measurement-features.js');
 const scene=new THREE.Scene(),groups=measurementFeatures['hip-translation'].groups;
 const labels=new Map(groups.map(group=>[`${group.id}:${group.id}`,{}]));
 const overlay=createTranslationOverlay({scene,toWorld:p=>new THREE.Vector3(...p),data,metrics},groups,labels);
 const strokes=scene.children.filter(object=>object.material?.isShaderMaterial);
 assert.equal(strokes.length,5);
 assert.ok(scene.children.every(object=>!object.visible));
 overlay.setFrame(150);overlay.updateView(null,800,600);
 for(const stroke of strokes){
  assert.equal(stroke.material.depthTest,true);assert.equal(stroke.material.depthWrite,true);
  assert.deepEqual(stroke.material.uniforms.resolution.value.toArray(),[800,600]);
  assert.equal(stroke.material.uniforms.width.value,2);
 }
 overlay.dispose();assert.equal(scene.children.length,0);
});
