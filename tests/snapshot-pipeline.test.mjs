import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotPipeline} from '../snapshot-pipeline.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('standalone animation runs while the first video decode is still loading',async()=>{
 const loading=deferred(),frames=[];
 const stream={name:'face-on',ready:()=>true,decode:()=>loading.promise};
 const pipeline=createSnapshotPipeline({streams:[stream],mapping:{'face-on':[4,7,9]},present:(frame,views)=>frames.push({frame,views})});
 await pipeline.advance(0);await pipeline.advance(1);
 assert.deepEqual(frames,[{frame:0,views:[]},{frame:1,views:[]}]);
 pipeline.dispose();loading.resolve(4);await flush();assert.equal(frames.length,2);
});

test('joined cameras, overlays and pose publish only after every mapped frame is decoded',async()=>{
 let block=false;const pending={},frames=[];
 const streams=['face-on','down-the-line'].map(name=>({name,ready:()=>true,decode:raw=>{if(!block)return Promise.resolve(raw);pending[name]={raw,...deferred()};return pending[name].promise;}}));
 const mapping={'face-on':[4,4,9],'down-the-line':[2,5,8]};
 const pipeline=createSnapshotPipeline({streams,mapping,present:(frame,views)=>frames.push({frame,views})});
 await pipeline.advance(0);await flush(); // warm without publishing videos
 block=true;const flight=pipeline.advance(1);await flush();
 assert.equal(pipeline.busy,true);assert.equal(frames.length,1);
 pending['face-on'].resolve(4);await flush();assert.equal(frames.length,1);
 assert.equal(await pipeline.advance(2),false); // no target overwrite while staging
 pending['down-the-line'].resolve(5);await flight;
 assert.deepEqual(frames.at(-1),{frame:1,views:[{name:'face-on',raw:4},{name:'down-the-line',raw:5}]});
 block=false;await pipeline.advance(2);await pipeline.advance(0);
 assert.deepEqual(frames.at(-1),{frame:0,views:[{name:'face-on',raw:4},{name:'down-the-line',raw:2}]});
 pipeline.dispose();
});

test('a late camera joins the current step instead of publishing its old warm-up frame',async()=>{
 let available=false;const calls=[],frames=[];
 const stream={name:'face-on',ready:()=>available,decode:async raw=>{calls.push(raw);return raw;}};
 const pipeline=createSnapshotPipeline({streams:[stream],mapping:{'face-on':[0,3,7,9]},present:(frame,views)=>frames.push({frame,views})});
 await pipeline.advance(0);available=true;await pipeline.advance(1);await flush();await pipeline.advance(3);
 assert.deepEqual(calls,[3,9]);assert.deepEqual(frames.at(-1),{frame:3,views:[{name:'face-on',raw:9}]});pipeline.dispose();
});

test('wrong decoded frames are withdrawn rather than displayed with the new 3D pose',async()=>{
 let wrong=false;const frames=[],dropped=[];
 const stream={name:'face-on',ready:()=>true,decode:async raw=>wrong?raw+1:raw};
 const pipeline=createSnapshotPipeline({streams:[stream],mapping:{'face-on':[1,4]},present:(frame,views)=>frames.push({frame,views}),onDrop:name=>dropped.push(name)});
 await pipeline.advance(0);await flush();wrong=true;await pipeline.advance(1);
 assert.deepEqual(frames.at(-1),{frame:1,views:[]});assert.deepEqual(dropped,['face-on']);pipeline.dispose();
});

test('a stalled joined source is hidden before standalone animation resumes',async()=>{
 let stalled=false;const frames=[],hanging=deferred();
 const stream={name:'face-on',ready:()=>true,decode:raw=>stalled?hanging.promise:Promise.resolve(raw),reset:()=>{}};
 const pipeline=createSnapshotPipeline({streams:[stream],mapping:{'face-on':[1,4]},timeoutMs:10,present:(frame,views)=>frames.push({frame,views})});
 await pipeline.advance(0);await flush();stalled=true;await pipeline.advance(1);
 assert.deepEqual(frames.at(-1),{frame:1,views:[]});pipeline.dispose();hanging.resolve(4);
});
