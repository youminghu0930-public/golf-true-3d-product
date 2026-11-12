import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {measurementFeatures,measurementFeatureForTitle} from '../measurement-features.js';
import {measurementPlotChannels} from '../rotation-plot.js';
import {prepareMeasurementSurfaces,fixedRotationRadius} from '../rotation-overlays.js';
import {createStaticMeasurementSampler} from '../materials/projects/pose-information-extraction/explain/static-measurement.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../materials/data/'+file,import.meta.url)));
const data=read('3d_results/00.json'),metrics=read('metrics/00.json'),radius=fixedRotationRadius(data);
test('New card titles select the intended geometric and body-rotation definitions',()=>{
 assert.equal(measurementFeatureForTitle('Geometric spine bend and side tilt'),'geometric-spine');
 assert.equal(measurementFeatureForTitle('Body rotation hip and shoulder turn'),'body-turns');
 assert.equal(measurementFeatureForTitle('Club movement'),null);
});
for(const feature of ['geometric-spine','body-turns'])test(`${feature} uses matching geometry, numbers and plot data with no arrows`,()=>{
 const groups=measurementFeatures[feature].groups,channels=measurementPlotChannels(metrics,data.reconstruction.length,feature);
 assert.equal(channels.length,2);assert.notEqual(channels[0].color,channels[1].color);
 for(const group of groups){
  const sampler=createStaticMeasurementSampler(data,metrics,{type:group.type,subtype:group.subtype});
  const channel=channels.find(channel=>channel.group===group.id);
  for(const frame of [0,150,350,500,692])for(const {state} of sampler.sample(frame,group.keys)){
   const prepared=prepareMeasurementSurfaces(state,radius,group);
   assert.ok(prepared.plane);assert.equal(prepared.plane.shape,feature==='geometric-spine'?'square':'circle');
   assert.equal(prepared.plane.size,radius);assert.equal(prepared.plane.color,channel.color);
   assert.equal(prepared.sectors[0].radius,radius*(group.verticalScale??1));assert.equal(prepared.sectors[0].color,channel.color);
   assert.ok(Math.abs(prepared.sectors[0].angle-channel.values[frame])<1e-5);
   assert.deepEqual(prepared.guides,[]);
   for(const name of ['referenceAxes','torsoAxes','originalReferenceAxes'])for(const axis of ['x','y','z'])assert.equal(prepared[name]?.[axis],undefined);
  }
 }
});

test('Enlarged spine sectors preserve the reference projected baseline and spine direction',async()=>{
 const {sectorBoundary}=await import('../materials/projects/pose-information-extraction/explain/ui/sector-shape.js');
 const {unit,sub,rotate}=await import('../materials/projects/pose-information-extraction/explain/math.js');
 const close=(a,b)=>a.forEach((value,i)=>assert.ok(Math.abs(value-b[i])<1e-10));
 for(const group of measurementFeatures['geometric-spine'].groups){
  const sampler=createStaticMeasurementSampler(data,metrics,{type:group.type,subtype:group.subtype});
  for(const frame of [0,150,350,500,692])for(const {state} of sampler.sample(frame,group.keys)){
   const original=state.sectors[0],sector=prepareMeasurementSurfaces(state,radius,group).sectors[0];
   const points=sectorBoundary(sector).points;
   close(unit(sub(points[0],sector.origin)),original.from);
   close(unit(sub(points.at(-1),sector.origin)),rotate(original.from,original.normal,original.angle));
   close(sector.origin,original.origin);assert.equal(sector.angle,original.angle);
  }
 }
});
