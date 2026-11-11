// Screen-space callouts remain readable as the shared 3D scene rotates/zooms.
export function createLabels(canvas){
 const root=document.createElement('div');root.className='explain-scene-labels';root.setAttribute('aria-hidden','true');canvas.parentElement.append(root);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');root.append(svg);
 let labels=[];
 function clear(){labels.forEach(item=>item.element.remove());labels=[];svg.replaceChildren();}
 function add(position,value,color){const element=document.createElement('span');element.textContent=value;element.style.color=color;root.append(element);const item={position,element,color};labels.push(item);return {setText(value){element.textContent=value;},setPosition(p){item.position=p;}};}
 function update(camera,width,height){
  root.style.width=width+'px';root.style.height=height+'px';svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();const placed=[];
  for(const {position,element,color} of labels){
   const p=position.clone().project(camera);if(p.z>1||p.z< -1){element.hidden=true;continue;}element.hidden=false;
   const anchorX=(p.x+1)*width/2,anchorY=(1-p.y)*height/2,w=element.offsetWidth,h=element.offsetHeight;
   let best,score=Infinity;
   for(const [dx,dy] of [[10,-h-5],[10,5],[-w-10,-h-5],[-w-10,5],[10,-h-32],[-w-10,-h-32],[10,32],[-w-10,32],[10,60],[-w-10,60]]){
    const x=Math.max(3,Math.min(width-w-3,anchorX+dx)),y=Math.max(3,Math.min(height-h-3,anchorY+dy));
    const overlap=placed.reduce((sum,r)=>sum+Math.max(0,Math.min(x+w+4,r.x+r.w)-Math.max(x-4,r.x))*Math.max(0,Math.min(y+h+3,r.y+r.h)-Math.max(y-3,r.y)),0);
    const cost=overlap*100+Math.hypot(x-anchorX,y-anchorY);if(cost<score){best={x,y,w,h};score=cost;}
   }
   placed.push(best);element.style.left=best.x+'px';element.style.top=best.y+'px';
   const link=document.createElementNS(svg.namespaceURI,'line');link.setAttribute('x1',anchorX);link.setAttribute('y1',anchorY);link.setAttribute('x2',Math.max(best.x,Math.min(best.x+w,anchorX)));link.setAttribute('y2',Math.max(best.y,Math.min(best.y+h,anchorY)));link.setAttribute('stroke',color);svg.append(link);
  }
 }
 return {add,clear,update,dispose(){root.remove();}};
}
