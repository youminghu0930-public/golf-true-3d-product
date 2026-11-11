// One source-image crop shared by both reconstructions, independent of their 3D scale.
export function faceOnFraming(detections){
  const bounds=[];
  for(const frame of detections.pred||[]){
    const points=frame.slice(0,17).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&!(p[0]===0&&p[1]===0)&&(p.length<3||p[2]>0));
    if(points.length<8)continue;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    bounds.push([Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]);
  }
  if(!bounds.length)throw new Error('No valid face-on detections for snapshot framing');
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const box=[0,1,2,3].map(i=>median(bounds.map(b=>b[i])));
  const height=Math.max(1,box[3]-box[1]);
  return {x:(box[0]+box[2])/2,y:(box[1]+box[3])/2+height*.08,width:Math.max((box[2]-box[0])*1.15,height*.95),height:height*1.35};
}
