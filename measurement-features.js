import {rotationColors} from './rotation-style.js';
export const measurementFeatures={
  'geometric-rotations':{xfactor:true,groups:[
    {id:'shoulder',label:'Shoulder',type:'geometric',subtype:'shoulder_turn_tilt',keys:['turn','tilt'],labels:{turn:'Shoulder turn',tilt:'Shoulder tilt'},color:rotationColors.shoulder,shape:'circle',planeKeys:['turn']},
    {id:'hip',label:'Hip',type:'geometric',subtype:'hip_turn_tilt',keys:['turn','tilt'],labels:{turn:'Hip turn',tilt:'Hip tilt'},color:rotationColors.hip,shape:'circle',planeKeys:['turn']},
  ]},
  'geometric-spine':{groups:[
    {id:'bend',label:'Spine bend',type:'geometric',subtype:'spine_bend_tilt',keys:['bend'],labels:{bend:'Spine bend'},color:rotationColors.bend,shape:'square',horizontalScale:1.4,verticalScale:1.7,planeKeys:['bend']},
    {id:'side-tilt',label:'Spine side tilt',type:'geometric',subtype:'spine_bend_tilt',keys:['tilt'],labels:{tilt:'Spine side tilt'},color:rotationColors.sideTilt,shape:'square',horizontalScale:1.4,verticalScale:1.7,planeKeys:['tilt']},
  ]},
  'hip-translation':{combined:true,unit:' units',groups:[
    ...[['sway','Sway','#7540c8'],['thrust','Thrust','#e69a00'],['lift','Lift','#009eaf']].map(([id,label,color])=>({id,label,color,type:'position',subtype:'hip_sway_thrust_lift',keys:[id],labels:{[id]:label}})),
  ]},
  'body-turns':{groups:[
    {id:'shoulder',label:'Shoulder turn',type:'kinematic',subtype:'shoulder_turn_on_spine_plane',keys:['turn'],labels:{turn:'Shoulder turn'},color:rotationColors.shoulder,shape:'circle',planeKeys:['turn']},
    {id:'hip',label:'Hip turn',type:'kinematic',subtype:'hip_turn_on_spine_plane',keys:['turn'],labels:{turn:'Hip turn'},color:rotationColors.hip,shape:'circle',planeKeys:['turn']},
  ]},
};
export function measurementFeatureForTitle(title){
  const value=title.toLowerCase();
  if(value==='absolute hip sway thrust and lift')return 'hip-translation';
  if(value.startsWith('absolute hip, shoulder rotations'))return 'geometric-rotations';
  if(['geometric spine bend and side tilt','absolute spine bend and tilt'].includes(value))return 'geometric-spine';
  if(['body rotation hip and shoulder turn','relative hip and shoulder rotation'].includes(value))return 'body-turns';
  return null;
}
