import {pairFocusStage,pairReleaseStage} from './joint-pair.js';
const titles={grow:'Right → left',shrink:'Head → midpoint',up:'Up direction',orthogonalize:'Remove the up component',plane:'Left–up plane',forward:'Forward direction','plane-fade':'Forward axis ready'};
const construction=[['grow',1500],['shrink',1200],['up',1500],['orthogonalize',1700],['plane',1300],['forward',1500],['plane-fade',850]];
export function constructionSegments(prefix,frame,label=prefix){
 return construction.flatMap(([step,motionDuration])=>{
  const action={id:prefix+'-'+step,title:label+' · '+titles[step],duration:motionDuration+500,motionDuration,step};
  if(step==='grow')return [{id:prefix+'-lateral-camera-in',title:'Focus on the axis set',duration:1700,motionDuration:1200,step:'grow',constructionCamera:prefix,view:'in'},pairFocusStage(prefix,'lateral','grow'),{...action,jointPair:{name:'lateral',phase:'grow'}},pairReleaseStage(prefix,'lateral','grow')];
  if(step==='shrink')return [{...action,jointPair:{name:'lateral',phase:'align'}}];
  if(step==='up'&&frame.jointPairs.up)return [pairFocusStage(prefix,'up','up'),{...action,jointPair:{name:'up',phase:'grow'}},pairReleaseStage(prefix,'up','up'),{id:prefix+'-up-align',title:'Align the up-vector head',duration:1700,motionDuration:1200,step:'up',jointPair:{name:'up',phase:'align'}}];
  if(step==='plane')return [{id:prefix+'-cross-camera-in',title:'View the cross product',duration:1700,motionDuration:1200,step:'plane',constructionCamera:prefix,view:'cross'},action];
  if(step==='plane-fade')return [action,{id:prefix+'-cross-camera-out',title:'See the completed axis set',duration:1700,motionDuration:1200,step:'complete',constructionCamera:prefix,view:'out'}];
  if(step!=='orthogonalize')return [action];
  return [
   {id:prefix+'-angle-camera',title:'View the left–up angle',duration:1700,motionDuration:1200,step:'orthogonalize',constructionCamera:prefix,view:'angle'},
   {id:prefix+'-angle-reveal',title:'See the left–up angle',duration:3000,motionDuration:700,step:'orthogonalize',anglePhase:'reveal'},
   {...action,anglePhase:'remove'},
  ];
 });
}

export {scheduleTimeline as scheduleSegments} from '../timing.js';
