import {arrowShape,roundedBarShape} from './arrow-shape.js';

// Reusable screen-width guides, rulers and anchored measurement points.
// Source-space endpoints preserve actual lengths, including signed components.
export function createMeasurementGuides(toWorld,canvas){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.classList.add('explain-flat-axes');svg.setAttribute('aria-hidden','true');canvas.parentElement.append(svg);
 const nodes=new Map();let guides=[];
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const group=document.createElementNS(ns,'g'),path=document.createElementNS(ns,'path'),point=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');
  label.setAttribute('font-size','11');label.setAttribute('font-family','system-ui');label.setAttribute('paint-order','stroke');label.setAttribute('stroke','#f4f7f0');label.setAttribute('stroke-width','3');
  group.append(path,point,label);svg.append(group);const result={group,path,point,label};nodes.set(id,result);return result;
 }
 return {update(next=[]){guides=next;},updateView(camera,w,h){
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.width=w+'px';svg.style.height=h+'px';
  for(const {group} of nodes.values())group.style.display='none';
  const project=p=>{const q=toWorld(p).project(camera);return q.z>=-1&&q.z<=1?{x:(q.x+1)*w/2,y:(1-q.y)*h/2}:null;};
  for(const guide of guides){
   const a=project(guide.from);if(!a)continue;
   const b=guide.to?project(guide.to):a;if(!b)continue;
   const {group,path,point,label}=node(guide.id),width=guide.width??2.7,color=guide.color??'#507867';
   group.style.display='';group.style.opacity=guide.opacity??1;
   point.style.display=guide.kind==='point'?'':'none';path.style.display=guide.kind==='point'?'none':'';
   point.setAttribute('cx',a.x);point.setAttribute('cy',a.y);point.setAttribute('r',guide.radius??4);point.setAttribute('fill',color);
   path.setAttribute('fill',guide.kind==='line'||guide.kind==='ruler'?'none':color);path.setAttribute('stroke',guide.kind==='line'||guide.kind==='ruler'?color:'none');path.setAttribute('stroke-width',width);path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-dasharray',guide.dashed?'5 4':'none');
   let shape=guide.kind==='bar'?roundedBarShape(a.x,a.y,b.x,b.y,width):arrowShape(a.x,a.y,b.x,b.y,width,guide.shapeBlend??0);
   if(guide.kind==='line'||guide.kind==='ruler'){
    shape=`M${a.x} ${a.y} L${b.x} ${b.y}`;
    if(guide.kind==='ruler'){
     const length=Math.hypot(b.x-a.x,b.y-a.y);if(length>1e-7){const nx=-(b.y-a.y)/length*5,ny=(b.x-a.x)/length*5;shape+=` M${a.x-nx} ${a.y-ny} L${a.x+nx} ${a.y+ny} M${b.x-nx} ${b.y-ny} L${b.x+nx} ${b.y+ny}`;}
    }
   }
   path.style.display=shape&&guide.kind!=='point'?'':'none';if(shape)path.setAttribute('d',shape);
   label.style.display=guide.label?'':'none';label.textContent=guide.label??'';label.setAttribute('x',b.x+8);label.setAttribute('y',b.y-8);label.setAttribute('fill',color);
  }
 },dispose(){svg.remove();nodes.clear();}};
}
