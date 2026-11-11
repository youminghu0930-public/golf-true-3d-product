import {sub,mul,unit,project,axes,rotate,torsoBasis,eulerYXZ,spin,length} from '../math.js';
import {stage,segment,jointVector,vector,arc,globalStage,projectedSpin,projection,colors} from '../visuals.js';
export function torso(c){
 const shoulder=c.lateral('shoulder'),spine=c.spine('upper'),basis=torsoBasis(shoulder.vector,spine.vector),values=eulerYXZ(basis),o=spine.from,size=length(c.spine().vector)*.85;
 const x1=rotate(axes.x,axes.y,values.turn),y1=axes.y;
 const y2=rotate(y1,x1,values.bend),x2=x1;
 const common=[
  globalStage(c,o,size),
  stage('Build the torso directions','Take right shoulder → left shoulder and spine midpoint → shoulder center. Keep the spine direction; remove its component from the shoulder direction, then normalize the directions.',[
   jointVector(shoulder,'Shoulder direction'),jointVector(spine,'Upper spine'),projection(o,shoulder.vector,spine.vector,size,'Shoulder → perpendicular direction'),vector(o,basis.y,'Torso up',colors.input,size),vector(o,basis.z,'Torso forward',colors.axis,size),
  ]),
 ];
 const turn=stage('Read the turn','The first rotation turns the global frame around its up axis. This is the Y step of the ordered Y → X → Z torso rotation.',[vector(o,axes.x,'Global left',colors.axis,size),vector(o,x1,'After turn',colors.input,size),vector(o,axes.y,'Turn axis',colors.axis,size),arc(o,axes.x,axes.y,values.turn,size*.7,'Turn')]);
 const bend=stage('Read the forward bend','Keep the turn, then bend around the turned left axis. This is the X step; it is not the angle of the spine projected onto a fixed global plane.',[vector(o,y1,'Before bend',colors.axis,size),vector(o,y2,'After bend',colors.input,size),vector(o,x1,'Bend axis',colors.projection,size),arc(o,y1,x1,values.bend,size*.7,'Forward bend')]);
 const tilt=stage('Read the side tilt','Keep the turn and bend, then rotate around the resulting forward axis. This final Z step completes the torso frame.',[vector(o,x2,'Before tilt',colors.axis,size),vector(o,basis.x,'After tilt',colors.input,size),vector(o,basis.z,'Tilt axis',colors.projection,size),arc(o,x2,basis.z,values.tilt,size*.7,'Side tilt')]);
 return {values,items:{turn:[...common,turn],bend:[...common,turn,bend],tilt:[...common,turn,bend,tilt]}};
}
export function spinePlane(c,joint){
 const lateral=c.lateral(joint),spine=c.spine('lower'),o=spine.from,size=length(c.spine().vector)*.85;
 const value=spin(axes.x,lateral.vector,spine.vector);
 return {values:{turn:value},items:{turn:[
  globalStage(c,o,size),
  stage('Choose the moving plane',`Use hip center → spine midpoint as the plane normal. Take right ${joint} → left ${joint} as the direction to measure.`,[jointVector(spine,'Lower spine normal',colors.result),jointVector(lateral,`${joint==='hip'?'Hip':'Shoulder'} direction`)]),
  stage('Project and read the turn','Project both global X and the selected direction onto the plane perpendicular to the lower spine. Read the signed rotation from projected X to the projected direction around the spine normal.',projectedSpin(o,lateral.vector,spine.vector,axes.x,value,size,'Lower-spine plane')),
 ]}};
}
export const kinematic={torso_turn_bend_tilt:torso,hip_turn_on_spine_plane:c=>spinePlane(c,'hip'),shoulder_turn_on_spine_plane:c=>spinePlane(c,'shoulder')};
