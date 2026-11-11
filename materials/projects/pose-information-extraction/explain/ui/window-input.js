import {createPlaybackFeedback} from './playback-feedback.js';
// Mouse: left rotates, right pans. Touch: one rotates, two pan/pinch.
// Drag gestures never toggle playback, including when rotation is locked.
export function mountViewInput(canvas,onZoom,onPan=()=>{},onRotate=()=>{},canRotate=()=>true){
 const pointers=new Map();let moved=false,suppressClick=false;
 const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
 const down=event=>{
  if(event.pointerType==='mouse'&&event.button!==0&&event.button!==2)return;
  if(!pointers.size){moved=false;suppressClick=false;}
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,button:event.button});
  if(pointers.size>1){moved=true;suppressClick=true;}
  canvas.setPointerCapture(event.pointerId);
 };
 const move=event=>{
  const point=pointers.get(event.pointerId);if(!point)return;
  const before=pointers.size===2?distance():0;
  if(Math.hypot(event.clientX-point.startX,event.clientY-point.startY)>5){moved=true;suppressClick=true;}
  const dx=event.clientX-point.x,dy=event.clientY-point.y;
  point.x=event.clientX;point.y=event.clientY;
  if(moved){
   if(pointers.size===2||point.button===2)onPan(dx/(pointers.size===2?2:1),dy/(pointers.size===2?2:1));
   else if(canRotate())onRotate(dx,dy);
  }
  if(pointers.size===2&&before>0)onZoom(distance()/before);
 };
 const up=event=>{if(moved)suppressClick=true;pointers.delete(event.pointerId);};
 const cancel=event=>{suppressClick=true;pointers.delete(event.pointerId);};
 const click=event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}};
 const wheel=event=>{event.preventDefault();onZoom(Math.exp(-event.deltaY*(event.ctrlKey?.01:.001)));};
 const context=event=>event.preventDefault();
 const bindings=[['contextmenu',context],['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',up],['click',click,true],['wheel',wheel,{passive:false}]];
 bindings.forEach(([type,handler,options])=>canvas.addEventListener(type,handler,options));
 return ()=>bindings.forEach(([type,handler,options])=>canvas.removeEventListener(type,handler,options));
}

export function bindWindowPlayback(canvas,clock,{feedback=createPlaybackFeedback(canvas)}={}){
 const update=playing=>{
  canvas.setAttribute('role','button');canvas.setAttribute('tabindex','0');
  canvas.setAttribute('aria-label',playing?'Pause explanation':'Play explanation');
  canvas.setAttribute('aria-pressed',String(playing));canvas.dataset.playing=String(playing);
 };
 const toggle=()=>{clock.setPlaying(!clock.playing);feedback.show(clock.playing);};
 const click=event=>{if(event.button===0||event.button===undefined)toggle();};
 const key=event=>{if((event.key===' '||event.key==='Enter')&&!event.repeat){event.preventDefault();toggle();}};
 canvas.addEventListener('click',click);canvas.addEventListener('keydown',key);update(clock.playing);
 return {update,dispose(){canvas.removeEventListener('click',click);canvas.removeEventListener('keydown',key);feedback.dispose();}};
}
