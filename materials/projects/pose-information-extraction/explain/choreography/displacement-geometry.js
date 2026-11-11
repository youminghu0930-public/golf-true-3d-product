import {add,sub,length} from '../math.js';

// Same ten segments as VanillaPoseScaler; the saved reference scale is fixed.
export const normalizationBones=[
 ['left_shoulder','right_shoulder'],['left_shoulder','left_elbow'],['left_elbow','left_wrist'],
 ['right_shoulder','right_elbow'],['right_elbow','right_wrist'],['left_hip','right_hip'],
 ['left_hip','left_knee'],['left_knee','left_ankle'],['right_hip','right_knee'],['right_knee','right_ankle'],
];
export const displacementComponents=[['sway','x',0],['thrust','z',2],['lift','y',1]];
export function createDisplacementGeometry(c){
 const root=pose=>c.data.joints.includes('root')?c.point('root',pose):c.midpoint('left_hip','right_hip',pose);
 const referenceRoot=root(c.reference),selectedRoot=root(c.pose),delta=sub(selectedRoot,referenceRoot);
 const bones=normalizationBones.map(joints=>{
  const from=c.point(joints[0],c.reference),to=c.point(joints[1],c.reference);
  return {joints,from:c.source(from),to:c.source(to),length:length(sub(to,from))};
 });
 let cursor=referenceRoot;
 const components=displacementComponents.map(([key,axis,index])=>{
  const d=[0,0,0];d[index]=delta[index];const from=cursor;cursor=add(cursor,d);
  return {key,axis,value:delta[index],from:c.source(from),to:c.source(cursor)};
 });
 const origin=c.source([0,0,0]),unitEnd=c.source([1,0,0]);
 return {origin,unitEnd,bones,components,referenceRoot:c.source(referenceRoot),selectedRoot:c.source(selectedRoot),
  scale:c.meta.scale,meanLength:bones.reduce((sum,b)=>sum+b.length,0)/bones.length,
  referenceHips:{joints:['right_hip','left_hip'],from:c.source(c.point('right_hip',c.reference)),to:c.source(c.point('left_hip',c.reference))},
  selectedHips:{joints:['right_hip','left_hip'],from:c.source(c.point('right_hip')),to:c.source(c.point('left_hip'))},
 };
}
