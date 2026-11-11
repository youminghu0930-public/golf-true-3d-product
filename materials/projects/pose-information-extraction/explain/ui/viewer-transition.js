const captures=new WeakMap();
export function registerViewerCapture(canvas,render){captures.set(canvas,render);}
// Keep the last rendered view in place while its replacement loads.
export function preserveViewer(container,{duration=200,fadeIncoming=false}={}){
 const previous=container.querySelector(':scope > .viewer-transition-cover');
 previous?.remove();
 const height=container.getBoundingClientRect().height;
 if(!height||!container.children.length)return ()=>{};
 const cover=document.createElement('div');cover.className='viewer-transition-cover';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fadeDuration=reduced?0:duration;cover.style.transitionDuration=`${fadeDuration}ms`;
 cover.setAttribute('aria-hidden','true');cover.inert=true;
 const source=previous&&!previous.classList.contains('is-finished')?previous:container;
 // Freeze each top-level box at its painted position. Reflowing cloned
 // children inside an unpadded overlay shifts headers, canvases and cards.
 const bounds=source.getBoundingClientRect();
 const style=getComputedStyle(source);
 const borderLeft=parseFloat(style.borderLeftWidth)||0,borderTop=parseFloat(style.borderTopWidth)||0;
 for(const child of source.children){
  const clone=child.cloneNode(true),rect=child.getBoundingClientRect();
  if(rect.width&&rect.height){
   Object.assign(clone.style,{position:'absolute',boxSizing:'border-box',
    left:`${rect.left-bounds.left-borderLeft}px`,top:`${rect.top-bounds.top-borderTop}px`,
    width:`${rect.width}px`,height:`${rect.height}px`,margin:'0',right:'auto',bottom:'auto'});
  }
  cover.append(clone);
 }
 const originals=source.querySelectorAll('canvas'),copies=cover.querySelectorAll('canvas');
 originals.forEach((canvas,index)=>{
  captures.get(canvas)?.();
  const copy=copies[index];copy.width=canvas.width;copy.height=canvas.height;
  copy.getContext('2d')?.drawImage(canvas,0,0);
 });
 cover.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
 container.style.minHeight=`${height}px`;
 // Append after callers replace their old content.
 let mounted=false,incoming=[];
 return Object.assign(()=>{
  if(!mounted)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(fadeIncoming)incoming=[...container.children].filter(node=>node!==cover&&!node.classList.contains('viewer-transition-cover')&&!node.classList.contains('video-source-decoders'));
   for(const node of incoming){node.style.removeProperty('opacity');node.animate([{opacity:0},{opacity:1}],{duration:fadeDuration,easing:'ease'});}
   cover.classList.add('is-finished');
   setTimeout(()=>{
    if(cover.parentNode===container&&!container.querySelector('.viewer-transition-cover:not(.is-finished)'))container.style.removeProperty('min-height');
    cover.remove();
   },fadeDuration+20);
  }));
 },{mount(){
  if(fadeIncoming){incoming=[...container.children].filter(node=>!node.classList.contains('video-source-decoders'));incoming.forEach(node=>node.style.opacity='0');}
  container.append(cover);mounted=true;
 }});
}
