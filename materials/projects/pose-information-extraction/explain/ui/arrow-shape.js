import {projectArrow,createEndOnMarker} from './arrow-projection.js';
// Join the full stem width to the crossbar's near edge. Only the exposed
// root end is rounded; the shared edge is flush, with no gap or overlap.
export function joinedTStemShape(start,end,crossStart,crossEnd,width,crossWidth=width){
 const length=Math.hypot(end.x-start.x,end.y-start.y),crossLength=Math.hypot(crossEnd.x-crossStart.x,crossEnd.y-crossStart.y);
 if(length<1e-7||crossLength<1e-7)return null;
 const ux=(end.x-start.x)/length,uy=(end.y-start.y)/length,r=Math.min(width/2,length/2);
 let nx=-(crossEnd.y-crossStart.y)/crossLength,ny=(crossEnd.x-crossStart.x)/crossLength;
 if((start.x-crossStart.x)*nx+(start.y-crossStart.y)*ny<0){nx=-nx;ny=-ny;}
 const distance=p=>(p.x-crossStart.x)*nx+(p.y-crossStart.y)*ny-crossWidth/2;
 const point=(along,side)=>({x:start.x+ux*along-uy*side,y:start.y+uy*along+ux*side});
 const polygon=[point(length,-r),point(length,r)];
 for(let i=0;i<=24;i++){const angle=Math.PI/2+i*Math.PI/24;polygon.push(point(r+r*Math.cos(angle),r*Math.sin(angle)));}
 const clipped=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);
  if(da>=0)clipped.push(a);
  if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
 }
 return clipped.length>=3?clipped.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+' Z':null;
}
// The growing crossbar may still be an arrow. Join only once it reaches
// the stem, using its local shaft/head width instead of treating it as a bar.
export function crossbarContactWidth(start,end,contact,width,blend=1){
 const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
 if(length<1e-7)return null;
 const along=((contact.x-start.x)*dx+(contact.y-start.y)*dy)/length;
 const off=Math.abs((contact.x-start.x)*dy-(contact.y-start.y)*dx)/length;
 if(along<0||along>length||off>width)return null;
 const scale=Math.min(1,length/(width*9))*(1-blend)+blend;
 const shaft=width*scale,head=shaft*3*(1-blend),halfHead=shaft*(1.35*(1-blend)+.5*blend);
 return head>0&&along>length-head?2*halfHead*(length-along)/head:shaft;
}
// A capsule keeps bar ends round without a stroke changing their thickness.
export function roundedBarShape(x,y,tx,ty,width){
 const length=Math.hypot(tx-x,ty-y);
 if(length<1e-7)return null;
 const ux=(tx-x)/length,uy=(ty-y)/length,r=Math.min(width/2,length/2);
 const point=(along,side)=>`${x+ux*along-uy*side} ${y+uy*along+ux*side}`;
 return `M${point(r,-r)} L${point(length-r,-r)} A${r} ${r} 0 0 1 ${point(length-r,r)} L${point(r,r)} A${r} ${r} 0 0 1 ${point(r,-r)} Z`;
}
// One closed silhouette avoids a shaft poking through a separate arrowhead.
// Dimensions are CSS pixels, independent of camera distance and orientation.
// When space is limited, scale every dimension together rather than squashing
// the triangle. Keep at least two thirds of the arrow available for its shaft.
export function arrowShape(x,y,tx,ty,width,barAmount=0){
 const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy);
 if(length<1e-7||(length<4&&barAmount<1))return null;
 const ux=dx/length,uy=dy/length,t=Math.max(0,Math.min(1,barAmount));
 const scale=Math.min(1,length/(width*9))*(1-t)+t;
 const shaft=width*scale,head=shaft*3*(1-t),halfHead=shaft*(1.35*(1-t)+.5*t);
 const point=(along,side)=>`${x+ux*along-uy*side} ${y+uy*along+ux*side}`;
 return `M${point(0,-shaft/2)} L${point(length-head,-shaft/2)} L${point(length-head,-halfHead)} L${point(length,0)} L${point(length-head,halfHead)} L${point(length-head,shaft/2)} L${point(0,shaft/2)} Z`;
}
export function createFlatArrows(canvas){
 const ns='http://www.w3.org/2000/svg',root=document.createElementNS(ns,'svg');root.classList.add('explain-flat-axes');root.setAttribute('aria-hidden','true');canvas.parentElement.append(root);
 let arrows=[];
 return {
  add(color,width=2.4){
   const path=document.createElementNS(ns,'path');path.setAttribute('fill',color);path.setAttribute('stroke','none');path.setAttribute('stroke-linejoin','round');path.setAttribute('paint-order','stroke');root.append(path);
   const marker=createEndOnMarker(root,color);
   const arrow={visible:true,from:null,to:null,path,marker,width,setEndpoints(from,to){this.from=from.clone();this.to=to.clone();}};arrows.push(arrow);return arrow;
  },
  updateView(camera,w,h){
   root.setAttribute('viewBox',`0 0 ${w} ${h}`);root.style.width=w+'px';root.style.height=h+'px';
   for(const arrow of arrows){
    const projection=arrow.visible&&arrow.from&&arrow.to?projectArrow(arrow.from,arrow.to,camera,w,h):null;
    const shape=projection?arrowShape(projection.x,projection.y,projection.tx,projection.ty,arrow.width):null;
    arrow.path.style.display=shape?'':'none';if(shape)arrow.path.setAttribute('d',shape);
    arrow.path.style.opacity=projection?.arrowOpacity??0;arrow.marker.update(projection);
   }
  },
  clear(){arrows=[];root.replaceChildren();},dispose(){root.remove();},
 };
}
