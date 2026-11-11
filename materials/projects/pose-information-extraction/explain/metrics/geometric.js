import {axes,unit,project,mul,length,rotate,spin,planeAngle} from '../math.js';
import {stage,segment,jointVector,vector,arc,globalStage,projectedSpin,inclination,colors} from '../visuals.js';
function lateral(c,joint){
 const bone=c.lateral(joint),o=mul(bone.from.map((v,i)=>v+bone.to[i]),.5),size=length(c.spine().vector)*.85;
 const turn=spin(axes.x,bone.vector,axes.y),tilt=planeAngle(bone.vector,axes.y);
 const common=[globalStage(c,o,size),stage('Choose the measured direction',`Use the direction from the right ${joint} to the left ${joint}.`,[jointVector(bone,`${joint==='hip'?'Hip':'Shoulder'} direction`)])];
 return {values:{turn,tilt},items:{
  turn:[...common,stage('Project and read the turn','Project the direction onto the horizontal XZ plane. Read its signed rotation from global X around the up axis.',projectedSpin(o,bone.vector,axes.y,axes.x,turn,size,'Horizontal XZ plane'))],
  tilt:[...common,stage('Read the tilt above the plane','Project the direction onto the horizontal XZ plane. Read the angle between the original direction and its projection; the Y component gives its sign.',inclination(o,bone.vector,axes.y,tilt,size,'Horizontal XZ plane'))],
 }};
}
function spineLean(c){
 const bone=c.spine(),o=bone.from,size=length(bone.vector)*.85,bend=planeAngle(bone.vector,axes.z),tilt=planeAngle(bone.vector,axes.x);
 const common=[globalStage(c,o,size),stage('Choose the entire spine','Use hip center → shoulder center as the measured direction.',[jointVector(bone,'Entire spine')])];
 return {values:{bend,tilt},items:{
  bend:[...common,stage('Read the forward bend','Remove the forward Z component to project the spine onto the XY plane. The angle from that projection to the spine gives forward bend; the Z component gives its sign.',inclination(o,bone.vector,axes.z,bend,size,'XY plane'))],
  tilt:[...common,stage('Read the side tilt','Remove the sideways X component to project the spine onto the YZ plane. The angle from that projection to the spine gives side tilt; the X component gives its sign.',inclination(o,bone.vector,axes.x,tilt,size,'YZ plane'))],
 }};
}
function spineTwist(c){
 const spine=c.spine(),shoulder=c.lateral('shoulder'),o=spine.from,size=length(spine.vector)*.85;
 const azimuth=spin(axes.z,spine.vector,axes.y),elevation=planeAngle(spine.vector,axes.y),polar=Math.sign(elevation)*(90-Math.abs(elevation));
 // scipy Rotation.from_euler('zxy', [0, polar, azimuth]): Ry(azimuth) Rx(polar).
 const baseline=rotate(rotate(axes.x,axes.x,polar),axes.y,azimuth),twist=spin(baseline,shoulder.vector,spine.vector);
 const common=[globalStage(c,o,size),stage('Choose spine and shoulder directions','Use hip center → shoulder center for the spine and right shoulder → left shoulder for the crossbar.',[jointVector(spine,'Entire spine'),jointVector(shoulder,'Shoulder crossbar')])];
 const az=stage('Read the lean direction','Project the spine onto the horizontal XZ plane. Measure the signed rotation from global forward Z around global up Y.',projectedSpin(o,spine.vector,axes.y,axes.z,azimuth,size,'Horizontal XZ plane'));
 const po=stage('Read the lean from vertical','First read the spine’s elevation above the horizontal plane. Convert elevation to signed lean from vertical: sign(elevation) × (90° − |elevation|).',[...inclination(o,spine.vector,axes.y,elevation,size,'Horizontal XZ plane'),vector(o,axes.y,'Vertical',colors.axis,size),arc(o,axes.y,Math.abs(polar)>1e-8?unit([spine.vector[2],0,-spine.vector[0]]):axes.x,Math.abs(polar),size*.95,'Lean from vertical')],`Elevation ${elevation.toFixed(2)}° → lean ${polar.toFixed(2)}°`);
 const sp=stage('Read the twist','Tilt and turn a zero-twist frame using the lean and lean direction. Project its left axis and the shoulder crossbar onto the plane perpendicular to the actual spine, then read the signed rotation around the spine.',projectedSpin(o,shoulder.vector,spine.vector,baseline,twist,size,'Plane perpendicular to spine'));
 return {values:{azimuth,polar,spin:twist},items:{azimuth:[...common,az],polar:[...common,po],spin:[...common,az,po,sp]}};
}
export const geometric={shoulder_turn_tilt:c=>lateral(c,'shoulder'),hip_turn_tilt:c=>lateral(c,'hip'),spine_bend_tilt:spineLean,spine_azimuth_polar_spin:spineTwist};
