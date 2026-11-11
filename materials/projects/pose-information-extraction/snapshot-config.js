import {validateDuration,validateStay} from './explain/timing.js';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
// Flatten metric demos while retaining authored metric order and rejecting duplicate keys.
export function parseSnapshotEntries(source) {
 const config=JSON.parse(source);
 if(!record(config))throw new Error('Snapshot configuration must be an object');
 const stack=[];
 for(const token of source.matchAll(/"(?:\\.|[^"\\])*"|[{}]/g)){
  const value=token[0];
  if(value==='{'){stack.push(new Set());continue;}
  if(value==='}'){stack.pop();continue;}
  if(!/^\s*:/.test(source.slice(token.index+value.length)))continue;
  const key=JSON.parse(value),seen=stack.at(-1);
  if(seen.has(key))throw new Error(`Duplicate snapshot key: ${key}`);
  seen.add(key);
 }
 if(Object.hasOwn(config,'selections')||Object.hasOwn(config,'metrics'))return parseSelections(config);
 const entries=[];
 for(const [type,subtypes] of Object.entries(config)){
  if(!['kinematic','geometric','position'].includes(type))throw new Error(`Unknown snapshot type: ${type}`);
  if(!record(subtypes))throw new Error('Snapshot type must contain subtype objects');
  for(const [subtype,demo] of Object.entries(subtypes)){
   if(!subtype||!record(demo))throw new Error('Snapshot subtype must contain a demo object');
   if(typeof demo.video!=='string'||!/^[\w-]+$/.test(demo.video))throw new Error('Invalid snapshot video name');
   if(!Number.isInteger(demo.frame)||demo.frame<0)throw new Error('Snapshot frame index must be a nonnegative integer');
   validateDuration(demo.duration);validateStay(demo.stay);
   entries.push([demo.video,{type,subtype,frame:demo.frame,...timingFields(demo)}]);
  }
 }
 return entries;
}
const timingFields=entry=>Object.fromEntries(['duration','stay','start_stay','explain','transition','review','end_stay'].filter(key=>entry[key]!==undefined).map(key=>[key,entry[key]]));

// Frame IDs are zero-based reconstruction indices, as exported in metrics meta.
export function resolveSnapshot(entry, metrics, frameCount) {
  if(!entry||!['kinematic','geometric','position'].includes(entry.type))throw new Error('Snapshot type must be kinematic, geometric or position');
  if(typeof entry.subtype!=='string'||!Object.hasOwn(metrics.metrics?.[entry.type]??{},entry.subtype))throw new Error('Unknown snapshot metric subtype');
  validateDuration(entry.duration);validateStay(entry.stay);validateMetricTiming(entry);
  const frame=entry.frame,referenceFrame=metrics.meta?.ref_frame_id;
  for(const [name,index] of [['selected',frame],['reference',referenceFrame]]){
    if(!Number.isInteger(index)||index<0||index>=frameCount)throw new Error(`Invalid ${name} snapshot frame`);
  }
  return {frame,referenceFrame,type:entry.type,subtype:entry.subtype,...timingFields(entry)};
}

function validateMetricTiming(settings){
 if(settings.explain!==undefined)validateDuration(settings.explain);
 for(const key of ['start_stay','transition','review','end_stay'])if(settings[key]!==undefined)validateStay(settings[key]);
}
function parseSelections(config){
 if(!Array.isArray(config.selections)||!config.selections.length)throw new Error('Snapshot selections must be a nonempty array');
 if(!record(config.metrics))throw new Error('Snapshot metrics must be an object');
 const choices=[];
 for(const [type,subtypes] of Object.entries(config.metrics)){
  if(!['kinematic','geometric','position'].includes(type)||!record(subtypes))throw new Error('Invalid snapshot metric category');
  for(const [subtype,settings] of Object.entries(subtypes)){
   if(!subtype||!record(settings))throw new Error('Invalid snapshot metric settings');
   for(const key of ['start_stay','explain','transition','review','end_stay'])if(settings[key]===undefined)throw new Error(`Missing snapshot timing: ${key}`);
   validateMetricTiming(settings);choices.push({type,subtype,...timingFields(settings)});
  }
 }
 return config.selections.flatMap(selection=>{
  if(!record(selection)||typeof selection.video!=='string'||!/^[\w-]+$/.test(selection.video))throw new Error('Invalid snapshot video name');
  if(!Number.isInteger(selection.frame)||selection.frame<0)throw new Error('Snapshot frame index must be a nonnegative integer');
  return choices.map(metric=>[selection.video,{...metric,frame:selection.frame}]);
 });
}
export function parseSnapshotConfiguration(source){
 const entries=parseSnapshotEntries(source),config=JSON.parse(source);
 if(!config.selections)throw new Error('Snapshot configuration requires selections and metrics');
 return {selections:config.selections.map(({video,frame})=>({video,frame})),entries:entries.slice(0,entries.length/config.selections.length)};
}
