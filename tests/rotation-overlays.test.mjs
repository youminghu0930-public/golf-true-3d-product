import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareRotationSurfaces,fixedRotationRadius} from '../rotation-overlays.js';
import {createStaticMeasurementSampler} from '../materials/projects/pose-information-extraction/explain/static-measurement.js';
test('All four geometric rotations retain sectors without arrows or faded poses',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../materials/data/3d_results/00.json',import.meta.url)));
  const metrics=JSON.parse(fs.readFileSync(new URL('../materials/data/metrics/00.json',import.meta.url)));
  let count=0;const radius=fixedRotationRadius(data);
  for(const subtype of ['shoulder_turn_tilt','hip_turn_tilt']){
    const samples=createStaticMeasurementSampler(data,metrics,{type:'geometric',subtype}).sample(350,['turn','tilt']);
    for(const {state} of samples){
      const next=prepareRotationSurfaces(state,radius);
      assert.equal(next.sectors.length,1);assert.equal(next.sectors[0].opacity,1);assert.equal(next.sectors[0].fillOpacity,.38);
      for(const field of ['referenceAxes','torsoAxes','originalReferenceAxes'])for(const axis of ['x','y','z'])assert.equal(next[field]?.[axis],undefined);
      assert.equal(next.sectors[0].radius,radius);
      if(next.plane){assert.equal(next.plane.shape,'circle');assert.equal(next.plane.size,radius);assert.equal(next.plane.fillOpacity,.12);}
      assert.deepEqual(next.guides,[]);
      assert.equal(!!next.plane,state.active==='turn');count++;
    }
  }
  assert.equal(count,4);
});

test('Rotation radius is shared and unchanged as the measured body width changes',()=>{
 const data={joints:['left_shoulder','right_shoulder'],reconstruction:[[[0,0,0],[2,0,0]],[[0,0,0],[4,0,0]]]};
 const radius=fixedRotationRadius(data);assert.equal(radius,3*1.95);
 for(const size of [1,4,8]){
  const result=prepareRotationSurfaces({active:'turn',plane:{size},sectors:[{radius:size}]},radius);
  assert.equal(result.plane.size,radius);assert.equal(result.sectors[0].radius,radius);
 }
});
