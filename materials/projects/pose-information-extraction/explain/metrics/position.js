import {sub,add,mul,axes,length} from '../math.js';
import {stage,segment,vector,marker,globalStage,colors} from '../visuals.js';
export function hipDisplacement(c){
 const from=c.point('root',c.reference),to=c.point('root'),delta=sub(to,from),size=length(c.spine().vector)*.85;
 const common=[globalStage(c,from,size),stage('Normalize the pose','The fixed origin is the midpoint between the reference frame’s ankles. Rotate into the reference axes, subtract that origin, and divide by the reference mean length of ten shoulder, arm, hip and leg segments. One unit is that reference mean segment length.',[
  marker([0,0,0],'Origin · reference ankle midpoint'),
  vector([0,0,0],axes.x,'1 normalized unit',colors.reference,1),
  ...Object.entries(axes).map(([name,v])=>vector([0,0,0],v,`${name.toUpperCase()} from normalized origin`,colors.axis,size)),
  segment(from,to,'Hip center displacement'),
 ]),stage('Compare hip centers','Subtract the reference hip center from the selected hip center. The normalized origin is at the reference ankles; the displacement is measured from the reference hip center.',[segment(from,to,'Selected − reference hip center')])];
 const result={values:{sway:delta[0],thrust:delta[2],lift:delta[1]},items:{}};
 for(const [key,index] of [['sway',0],['thrust',2],['lift',1]]){
  const d=[0,0,0];d[index]=delta[index];result.items[key]=[...common,stage('Read the component',`Read the ${'XYZ'[index]} component of the hip-center displacement, in normalized length units.`,[segment(from,to,'Full displacement',colors.axis),segment(from,add(from,d),`${'XYZ'[index]} component`,colors.result)])];
 }
 return result;
}
export const position={hip_sway_thrust_lift:hipDisplacement};
