// Geometry in rendered coordinates (+Y up). Reference planes stay fixed at address.
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const normalize=a=>{const length=Math.hypot(...a);if(length<1e-8)throw new Error('Degenerate Hogan plane reference');return mul(a,1/length);};
export function createHoganPlanes({head,leftAnkle,rightAnkle,shoulder,hip,trajectory,margin=.08}){
  const along=normalize([rightAnkle[0]-leftAnkle[0],0,rightAnkle[2]-leftAnkle[2]]);
  const targets=[shoulder,hip];
  const rises=targets.map(target=>{
    const delta=sub(target,head),rise=normalize(sub(delta,mul(along,dot(delta,along))));
    if(rise[1]<=0)throw new Error('Hogan plane must rise above the club head');
    return rise;
  });
  const samples=[head,...targets,...trajectory];
  const xs=samples.map(p=>dot(sub(p,head),along));
  const min=Math.min(...xs)-margin,max=Math.max(...xs)+margin;
  // The common edge spans the complete projected motion. Equal side lengths
  // keep both panes square, with all extension directed upward from that edge.
  const side=Math.max(max-min,...rises.map(rise=>Math.max(...samples.map(p=>dot(sub(p,head),rise)))+margin));
  const start=(min+max-side)/2;
  const a=add(head,mul(along,start)),b=add(a,mul(along,side));
  return rises.map((rise,i)=>({name:i?'Hip plane':'Shoulder plane',side,along,rise,corners:[a,b,add(b,mul(rise,side)),add(a,mul(rise,side))]}));
}

// The finite envelope is the triangular prism between the two square panes.
export function isInsideHoganEnvelope(point,panes,tolerance=1e-6){
  const delta=sub(point,panes[0].corners[0]),[a,b]=panes.map(p=>p.rise);
  const c=dot(a,b),denominator=1-c*c;
  if(denominator<1e-10)return false;
  const u=(dot(delta,a)-c*dot(delta,b))/denominator;
  const v=(dot(delta,b)-c*dot(delta,a))/denominator;
  const x=dot(delta,panes[0].along),side=panes[0].side;
  return x>=-tolerance&&x<=side+tolerance&&u>=-tolerance&&v>=-tolerance&&u+v<=side+tolerance;
}

export function averageShaftLength(poses,gripIndex,heelIndex){
  const lengths=poses.flatMap(pose=>{
    const grip=pose[gripIndex],heel=pose[heelIndex];
    if(![grip,heel].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))return [];
    const length=Math.hypot(...sub(grip,heel));return length>0?[length]:[];
  });
  if(!lengths.length)throw new Error('No valid club shaft lengths');
  return lengths.reduce((sum,length)=>sum+length,0)/lengths.length;
}
export function distanceToHoganPanes(point,panes){
  return Math.min(...panes.map(pane=>{
    const delta=sub(point,pane.corners[0]);
    const x=Math.max(0,Math.min(pane.side,dot(delta,pane.along)));
    const y=Math.max(0,Math.min(pane.side,dot(delta,pane.rise)));
    return Math.hypot(...sub(delta,add(mul(pane.along,x),mul(pane.rise,y))));
  }));
}
