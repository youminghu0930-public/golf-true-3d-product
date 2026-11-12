import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameSeeker} from '../frame-seeker.js';
class FakeVideo extends EventTarget{
 constructor(){super();this.currentTime=0;this.seeking=false;this.callbacks=new Map();this.next=0;}
 requestVideoFrameCallback(fn){const id=++this.next;this.callbacks.set(id,fn);return id;}
 cancelVideoFrameCallback(id){this.callbacks.delete(id);}
 decoded(time){const callbacks=[...this.callbacks.values()];this.callbacks.clear();callbacks.forEach(fn=>fn(0,{mediaTime:time}));}
}
test('strict seeks ignore stale decoded frames and never accept the 250ms approximation',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const video=new FakeVideo(),settled=[];
 const seeker=createFrameSeeker(video,{getTimes:()=>[0,.04,.08],onRequest:()=>{},onSettled:index=>settled.push(index),requirePresentedFrame:true});
 seeker.request(1);video.dispatchEvent(new Event('seeked'));
 t.mock.timers.tick(300);assert.deepEqual(settled,[]);
 video.decoded(0);assert.deepEqual(settled,[]);
 video.decoded(.04);assert.deepEqual(settled,[1]);seeker.reset();
});
test('an already-requested timestamp is not treated as proof of a decoded frame',()=>{
 const video=new FakeVideo(),settled=[];video.currentTime=.05;
 const seeker=createFrameSeeker(video,{getTimes:()=>[0,.04,.08],onRequest:()=>{},onSettled:index=>settled.push(index),requirePresentedFrame:true});
 seeker.request(1);assert.deepEqual(settled,[]);
 video.dispatchEvent(new Event('seeked'));video.decoded(.04);assert.deepEqual(settled,[1]);
 seeker.request(1);assert.deepEqual(settled,[1,1]);seeker.reset();
});
