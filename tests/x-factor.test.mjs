import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createXFactorModel} from '../x-factor.js';
import {rotationPlotChannels} from '../rotation-plot.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../materials/data/'+file,import.meta.url)));
test('X-factor matches signed shoulder minus hip turn on every valid demo frame',()=>{
 const data=read('3d_results/00.json'),metrics=read('metrics/00.json'),model=createXFactorModel(data,metrics),g=metrics.metrics.geometric;
 const index=name=>data.joints.indexOf(name),first=data.reconstruction[0];
 assert.deepEqual(model.origin,first[index('left_ankle')].map((v,i)=>(v+first[index('right_ankle')][i])/2));
 assert.deepEqual(model.normal,[0,-1,0]);
 for(let f=0;f<model.frames.length;f++){
  const state=model.frames[f];assert.ok(state);
  const difference=g.shoulder_turn_tilt.turn[f]-g.hip_turn_tilt.turn[f];
  const wrapped=((difference+180)%360+360)%360-180;
  assert.ok(Math.abs(state.angle-wrapped)<1e-6);
  assert.ok(Math.abs(state.shoulder[1])<1e-10);assert.ok(Math.abs(state.hip[1])<1e-10);
 }
 const channels=rotationPlotChannels(metrics,data.reconstruction.length,model.frames.map(state=>state.angle));
 assert.equal(channels.length,5);assert.equal(channels.at(-1).label,'X-factor');assert.equal(channels.at(-1).values[400],model.frames[400].angle);
});

test('X-factor preserves the turn sign convention and wraps across plus/minus 180 degrees',()=>{
 const pairs=[[0,90],[0,-90],[170,-170],[-170,170]];
 const direction=degrees=>[Math.cos(degrees*Math.PI/180),0,Math.sin(degrees*Math.PI/180)];
 const data={joints:['left_ankle','right_ankle','left_shoulder','right_shoulder','left_hip','right_hip'],reconstruction:pairs.map(([hip,shoulder])=>{
  const s=direction(shoulder),h=direction(hip);
  return [[-.2,1,0],[.2,1,0],s.map((v,i)=>v+(i===1?-1:0)),s.map((v,i)=>-v+(i===1?-1:0)),h,h.map(v=>-v)];
 })};
 const model=createXFactorModel(data,{meta:{ref_frame_id:0}});
 model.frames.forEach((state,i)=>assert.ok(Math.abs(state.angle-[90,-90,20,-20][i])<1e-9));
});
