import {Quaternion,Vector3} from '../../vendor/three/three.module.js';

// Manual view offsets are independent of the scripted camera and timeline.
export function createViewNavigation(onChange=()=>{},runtime={request:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id),now:()=>performance.now(),reduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches}){
 const identity=new Quaternion(),rotation=new Quaternion();
 let panX=0,panY=0,zoom=1,explaining=false,playing=false,animation,handle,lastUp=new Vector3(0,1,0),lastDirection=new Vector3(0,0,1);
 const changed=()=>1-Math.abs(rotation.dot(identity))>1e-10;
 function cancel(){if(handle!==undefined)runtime.cancel(handle);handle=undefined;animation=undefined;}
 function animate(reset){
  cancel();const from=rotation.clone(),x=panX,y=panY,z=zoom,start=runtime.now();
  animation=reset?'reset':'resume';
  function tick(now){
   const t=runtime.reduced()?1:Math.min(1,(now-start)/750),p=t*t*(3-2*t);
   rotation.copy(from).slerp(identity,p);
   if(reset){panX=x*(1-p);panY=y*(1-p);zoom=Math.exp(Math.log(z)*(1-p));}
   if(t===1){handle=undefined;animation=undefined;}else handle=runtime.request(tick);
   onChange();
  }
  handle=runtime.request(tick);
 }
 return {
  get rotated(){return changed();},get canRotate(){return !explaining||!playing;},get returning(){return !!animation;},
  get panX(){return panX;},get panY(){return panY;},get zoom(){return zoom;},
  setPlayback(isExplain,isPlaying){
   explaining=isExplain;playing=isPlaying;
   if(animation==='resume'&&(!explaining||!playing))cancel();
   if(explaining&&playing&&changed()&&!animation)animate(false);
  },
  orient(direction,up){lastDirection.copy(direction).applyQuaternion(rotation);lastUp.copy(up).applyQuaternion(rotation);return {direction:lastDirection.clone(),up:lastUp.clone()};},
  orbitPoint(point,pivot){return point.clone().sub(pivot).applyQuaternion(rotation).add(pivot);},
  rotate(dx,dy){
   if(explaining&&playing)return;cancel();
   const yaw=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),-dx*.008);
   const right=new Vector3().crossVectors(lastUp,lastDirection).normalize().applyQuaternion(yaw);
   const pitch=new Quaternion().setFromAxisAngle(right,-dy*.008);
   rotation.premultiply(yaw).premultiply(pitch).normalize();onChange();
  },
  pan(dx,dy){panX+=dx;panY+=dy;onChange();},
  zoomBy(ratio){const next=zoom*ratio;if(Number.isFinite(next)&&next>0){panX*=ratio;panY*=ratio;zoom=next;onChange();}},
  reset(){animate(true);},dispose:cancel,
 };
}
