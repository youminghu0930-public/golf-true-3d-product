import {mountSpineTPlayer} from './spine-t-player.js';
import {mountHipDisplacementPlayer} from './hip-displacement-player.js';
import {mountSpineBendTiltPlayer} from './spine-bend-tilt-player.js';
import {mountLateralTurnTiltPlayer} from './lateral-turn-tilt-player.js';
import {subtypeDescriptions} from '../names.js';
import {pairCamera} from '../choreography/pair-camera.js';
import {jointPairPresentation} from '../choreography/joint-pair.js';
import {cameraOrientation,cameraBetween} from '../choreography/camera.js';
import {createSnapshotHeader} from './header.js';
import {explainSnapshot} from '../index.js';
import {mountSpinePlanePlayer} from './spine-plane-player.js';
import {mountTorsoPlayer} from './torso-player.js';
import {mountExplanationPanel} from './panel.js';
import {createExplanationLayer} from './scene.js';
import {make} from './dom.js';

// Presentation dispatch belongs to the explanation library, not the pose viewer.
const players=new Map([
 ['position.hip_sway_thrust_lift',mountHipDisplacementPlayer],
 ['geometric.spine_azimuth_polar_spin',mountSpineTPlayer],
 ['geometric.shoulder_turn_tilt',mountLateralTurnTiltPlayer],
 ['geometric.hip_turn_tilt',mountLateralTurnTiltPlayer],
 ['geometric.spine_bend_tilt',mountSpineBendTiltPlayer],
 ['kinematic.hip_turn_on_spine_plane',mountSpinePlanePlayer],
 ['kinematic.shoulder_turn_on_spine_plane',mountSpinePlanePlayer],
 ['kinematic.torso_turn_bend_tilt',mountTorsoPlayer],
 ['kinematic.torso_turn_bend_tilt_by_shoulder',mountTorsoPlayer],
]);
function mountPrimitivePlayer(panel,model,{scene,toWorld,canvas,setPoses,draw,setCamera,setPairFocus}){
 const layer=createExplanationLayer(scene,toWorld,canvas);
 let explaining=false,pairs=[];
 const c=model.context,front=cameraOrientation(c.meta.orientation.map(row=>row[2]),c.meta.orientation.map(row=>row[1]));
 function focus(progress){
  if(!pairs.length){setPairFocus(null);setCamera(null);return;}
  const position=progress*pairs.length,index=Math.min(pairs.length-1,Math.floor(position)),v=pairs[index];
  const q=jointPairPresentation(Math.min(1,position-index));
  const pose=v.jointPair.pose==='reference'?c.reference:c.pose;
  const joints=v.jointPair.joints.map(name=>c.source(c.point(name,pose)));
  const aligned={from:c.source(v.from),to:c.source(v.to)};
  const view=pairCamera({from:joints[0],to:joints.at(-1)},aligned,c.meta.orientation.map(row=>row[2]),c.meta.orientation.map(row=>row[1]));
  setPairFocus({points:[...view.points,...joints],amount:q.camera});setCamera(cameraBetween(front,view.orientation,q.camera));
 }
 const playback=mountExplanationPanel(panel,model,{canvas,
  opening:state=>{setPoses(state.referencePose,state.selectedPose);draw();},
  show:visuals=>{pairs=visuals.filter(v=>v.jointPair);focus(0);explaining=visuals.length>0;setPoses(explaining?.28:.5,explaining?.28:1);layer.show(visuals,model.context.source);draw();},
  animate:progress=>{focus(progress);const highlights=layer.animate(progress);if(explaining)setPoses(.28,.28,highlights);draw();},
 });
 return {updateView:layer.updateLabels,dispose(){playback.dispose();layer.dispose();}};
}
export function mountSnapshotExplanation(card,{id,poseData,metrics,entry,...viewer}){
 const model=explainSnapshot(poseData,metrics,entry);
 const layout=make('div',undefined,'snapshot-explain-layout');
 const figure=make('div',undefined,'snapshot-explain-figure'),panel=make('aside');
 figure.append(viewer.canvas);layout.append(figure,panel);card.append(createSnapshotHeader({title:model.title,description:subtypeDescriptions[entry.subtype]}),layout);card.classList.add('snapshot-explained');
 const mount=players.get(`${entry.type}.${entry.subtype}`)??mountPrimitivePlayer;
 return mount(panel,model,viewer);
}
