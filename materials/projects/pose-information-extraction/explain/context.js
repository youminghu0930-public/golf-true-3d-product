import {add,sub,mul,dot,unit} from './math.js';
// Mirrors orienter.transform -> placer.transform -> scaler.transform.
// Inverse conversion puts every helper back in the original pose's 3D scene.
export function createContext(data,metrics,entry){
 const meta=metrics.meta,R=meta.orientation,origin=meta.position?.[0],scale=meta.scale;
 if(!Array.isArray(R)||R.length!==3||R.some(row=>!Array.isArray(row)||row.length!==3||!row.every(Number.isFinite))||!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite)||!(scale>0))throw new Error('Metric alignment metadata is incomplete.');
 const indexes=Object.fromEntries(data.joints.map((n,i)=>[n,i]));
 const normalized=p=>mul(sub([0,1,2].map(i=>dot(p,R.map(row=>row[i]))),origin),1/scale);
 const source=p=>{const q=add(mul(p,scale),origin);return R.map(row=>dot(row,q));};
 const pose=data.reconstruction[entry.frame].map(normalized),reference=data.reconstruction[meta.ref_frame_id].map(normalized);
 function point(name,frame=pose){const p=frame[indexes[name]];if(!p||!p.every(Number.isFinite))throw new Error(`Missing measurement joint: ${name}`);return p;}
 const midpoint=(a,b,frame)=>mul(add(point(a,frame),point(b,frame)),.5);
 const lateral=(name,frame=pose)=>({joints:[`right_${name}`,`left_${name}`],from:point(`right_${name}`,frame),to:point(`left_${name}`,frame),vector:sub(point(`left_${name}`,frame),point(`right_${name}`,frame))});
 function spine(part='entire'){
  const upper=part==='lower'?['torso','thorax','clavicle']:['clavicle'];
  const lower=part==='upper'?['thorax','torso','root']:['root'];
  const pick=names=>names.find(n=>Object.hasOwn(indexes,n));
  const u=pick(upper),l=pick(lower),to=u?point(u):midpoint('left_shoulder','right_shoulder'),from=l?point(l):midpoint('left_hip','right_hip');
  return {from,to,vector:sub(to,from),joints:[...(l?[l]:['right_hip','left_hip']),...(u?[u]:['right_shoulder','left_shoulder'])]};
 }
 return {data,metrics,entry,meta,pose,reference,point,midpoint,lateral,spine,source,normalized,unit};
}
