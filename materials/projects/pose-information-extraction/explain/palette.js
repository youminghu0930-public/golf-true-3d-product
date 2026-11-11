// Axis colors are separate from mint bones, blue/red side joints, and gray reference bones.
export const axisColors={x:'#7540c8',y:'#009eaf',z:'#e69a00'};
export const brightAxisColors={x:'#a46bff',y:'#00d8ed',z:'#ffc338'};
export function blendColors(a,b,amount){
 const t=Math.max(0,Math.min(1,amount));
 return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
export function blendAxisColors(from,to,amount){
 const a=axisColors[from],b=axisColors[to],t=Math.max(0,Math.min(1,amount));
 return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
export const poseColors={reference:'#8b9198'};

// Measurement sweeps use one contrasting color independently of the axis.
export const angleColor='#d22681';
