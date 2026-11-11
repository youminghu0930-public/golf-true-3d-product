import {highlightRotationAxis} from './rotation-highlight.js';
import {axes,rotate,add,mul} from '../math.js';
import {completedAxes} from './axis-frame.js';
import {referenceOverview,cameraOrientation,uprightCameraBetween} from './camera.js';
// Y–X–Z intrinsic rotation, independent of joints and metric selection.
export function createIntrinsicRotation(reference,target,meta,values){
 const mapDirection=v=>meta.orientation.map(row=>row.reduce((sum,n,i)=>sum+n*v[i],0));
 function rotatedFrame(turn,bend,tilt){
  let x=rotate(axes.x,axes.y,turn),y=axes.y,z=rotate(axes.z,axes.y,turn);
  y=rotate(y,x,bend);z=rotate(z,x,bend);x=rotate(x,z,tilt);y=rotate(y,z,tilt);
  return {...reference,origin:target.origin,length:target.length,x:mapDirection(x),y:mapDirection(y),z:mapDirection(z),rawX:mapDirection(x)};
 }
 const before={turn:rotatedFrame(0,0,0),bend:rotatedFrame(values.turn,0,0),tilt:rotatedFrame(values.turn,values.bend,0)};
 // Stay beyond the end-on marker threshold, so Y reads as a connected arrow
 // while retaining an elevated view of both turn wedges and no camera roll.
 const turnViewAngle=25*Math.PI/180;
 const turnView=add(mul(before.turn.y,Math.cos(turnViewAngle)),mul(before.bend.x,Math.sin(turnViewAngle)));
 const between=(a,b,t)=>uprightCameraBetween(a,b,t,reference.y,reference.z);
 const views={front:referenceOverview(reference),turn:cameraOrientation(turnView,reference.y),bend:cameraOrientation(before.bend.x,reference.y),tilt:cameraOrientation(before.tilt.z,reference.y)};
 function rotationSectors(key,angle){
  const axis={turn:'y',bend:'x',tilt:'z'}[key];
  return ['x','y','z'].filter(direction=>direction!==axis).map(direction=>({
   origin:target.origin,from:before[key][direction],normal:before[key][axis],angle,radius:target.length*.85,axis,direction,
  }));
 }
 function sample(state,s,p){
  const order=['camera-turn','turn','camera-bend','bend','camera-tilt','tilt','finish','reset'],rank=order.indexOf(s.id);
  const turn=rank>1?values.turn:s.id==='turn'?values.turn*p:0,bend=rank>3?values.bend:s.id==='bend'?values.bend*p:0,tilt=rank>5?values.tilt:s.id==='tilt'?values.tilt*p:0;
  state.values={turn,bend,tilt};state.referenceAxes=completedAxes(rotatedFrame(turn,bend,tilt));
  if(s.cameraFor){
   const key=s.cameraFor,previous={turn:'front',bend:'turn',tilt:'bend'}[key];state.camera=between(views[previous],views[key],p);state.referenceAxes.highlight={turn:'y',bend:'x',tilt:'z'}[key];
  }else{
   const key=rank<=1?'turn':rank<=3?'bend':'tilt';state.camera=between(views[key],views[key],1);
  }
  if(['turn','bend','tilt'].includes(s.id)){
   const key=s.id,axis={turn:'y',bend:'x',tilt:'z'}[key];state.active=key;state.referenceAxes.highlight=axis;
   state.sectors=rotationSectors(key,state.values[key]);highlightRotationAxis(state,p);
  }
  if(s.id==='finish')state.sectors=rotationSectors('tilt',values.tilt);
  if(s.id==='reset'){
   state.camera=between(views.tilt,views.front,p);state.focus=1-p;state.referencePose=.5*p;state.selectedPose=.1+.9*p;state.referenceAxes.opacity=1-p;state.torsoAxes.opacity=.42*(1-p);
  }
  return state;
 }
 function setAngles(state,amount){
  state.values=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value*amount]));
  state.referenceAxes=completedAxes(rotatedFrame(state.values.turn,state.values.bend,state.values.tilt));
 }
 return {sample,setAngles};
}
