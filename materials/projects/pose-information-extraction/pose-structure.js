// Connections from ideaslab.tool.specs: IL_H36M_POSE + golf.GOLFCLUB.
// Resolve names per file so exported joint ordering can change safely.
export const connections = [
  ['nose','atlas'], ['nose','top_head'], ['nose','left_ear'], ['nose','right_ear'],
  ['root','left_hip'], ['root','right_hip'], ['root','torso'],
  ['torso','clavicle'], ['clavicle','left_shoulder'], ['clavicle','right_shoulder'], ['clavicle','atlas'],
  ['left_hip','left_knee'], ['right_hip','right_knee'],
  ['left_knee','left_ankle'], ['right_knee','right_ankle'],
  ['left_shoulder','left_elbow'], ['right_shoulder','right_elbow'],
  ['left_elbow','left_wrist'], ['right_elbow','right_wrist'],
  ['golf_club_grip','golf_club_heel'], ['golf_club_heel','golf_club_head'],
];
export function poseStructure(joints) {
  if(!Array.isArray(joints)||joints.some(name=>typeof name!=='string')||new Set(joints).size!==joints.length)throw new Error('Expected a unique joint name list');
  const indexes=Object.fromEntries(joints.map((name,index)=>[name,index]));
  const edges=connections.map(pair=>pair.map(name=>{
    if(!Object.hasOwn(indexes,name))throw new Error(`Missing pose joint: ${name}`);
    return indexes[name];
  }));
  const clubEdges=edges.filter(edge=>edge.every(index=>joints[index].startsWith('golf_club_')));
  return {names:joints,edges,indexes,clubEdges};
}
