import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotResourceProfile,createExclusiveSnapshotMount} from '../snapshot-resources.js';
test('High-DPI phones avoid peel buffers, cap pixel density, and keep one live scene',()=>{
 const profile=snapshotResourceProfile({width:390,pixelRatio:3});
 assert.equal(profile.depthCompositing,false);assert.equal(profile.singleScene,true);assert.equal(profile.pixelRatio,1.5);assert.equal(profile.shadowSize,1024);
 assert.equal(snapshotResourceProfile({width:1024,coarse:true}).singleScene,true);
 assert.equal(snapshotResourceProfile({width:1400}).depthCompositing,true);
 for(const options of [{floatColor:false},{maxTextures:8}])assert.equal(snapshotResourceProfile(options).depthCompositing,false);
});
test('Rapid mobile feature changes dispose stale scenes before mounting the next',async()=>{
 let live=0,max=0,finish;const events=[];
 const loader=createExclusiveSnapshotMount(async index=>{
  live++;max=Math.max(max,live);events.push('mount '+index);
  if(index===0)await new Promise(resolve=>finish=resolve);
  return ()=>{live--;events.push('dispose '+index);};
 });
 const first=loader.select(0);await Promise.resolve();await Promise.resolve();
 const skipped=loader.select(1),last=loader.select(2);finish();
 await Promise.all([first,skipped,last]);assert.equal(max,1);assert.equal(live,1);
 assert.deepEqual(events,['mount 0','dispose 0','mount 2']);
 await loader.dispose();assert.equal(live,0);
});
