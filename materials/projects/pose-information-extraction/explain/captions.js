import {reviewTiming} from './choreography/review-timing.js';

// Short action + purpose captions. Export keys and mathematical names stay out
// of the viewer; shared constructions reuse the same wording across metrics.
const common={
 'result-preview':'Preview the selected pose and its final measurements.',
 intro:'Bring in the reference pose to establish the comparison.',
 'reference-focus':'Isolate the reference pose to build the fixed directions.',
 'selected-focus':'Bring in the selected pose to measure its change.',
 'measurement-camera':'Move closer so the measurement geometry is easier to see.',
 'reference-root':'Move the reference axes to the reference hip center, the displacement origin.',
 'scale-camera':'Frame the reference bones so their lengths can be compared.',
 'scale-highlight':'Make the ten reference bones solid to show the lengths used for normalization.',
 'scale-duplicate':'Copy the bone lengths so they can be compared together.',
 'scale-align':'Line up the copied bones to compare their lengths.',
 'scale-mean':'Average the bone lengths to define one normalized unit.',
 'unit-align':'Move the unit bone beside the reference axis to compare lengths.',
 'unit-axes':'Resize each reference axis to one normalized unit.',
 'unit-fade':'Fade the sample bone; the axes now carry the unit length.',
 'unit-ready':'Keep the unit axes at the reference hip center as the displacement origin.',
 'root-camera':'Zoom into the roots and soften the axes to make small offsets visible.',
 'root-markers':'Mark both hip centers to show the start and end of displacement.',
 displacement:'Connect the hip centers to show their total displacement.',
 'target-root':'Move the torso axes to the hip center so both frames share a pivot.',
 compare:'Compare the two axis sets before aligning their origins and lengths.',
 align:'Match the origins and lengths so only orientation differs.',
 'baseline-camera':'Face the projection plane so the direction change is visible.',
 'baseline-angle':'Show how far the reference direction lies outside the spine plane.',
 'baseline-project':'Project the reference direction onto the spine plane to isolate turn.',
 'baseline-fade':'Keep only the projected reference direction for comparison.',
 'projection-camera':'Face the projection plane so the direction change is visible.',
 'projection-angle':'Show the direction’s angle to the plane before projection.',
 projection:'Project onto the horizontal plane to separate turn from tilt.',
 'original-fade':'Fade the original direction so the projected one stays clear.',
 'lateral-camera':'Face the projection plane to compare the selected direction with it.',
 'lateral-stretch-camera':'Adjust the view so the joint-to-joint arrow is easy to see.',
 'lateral-angle':'Show the selected direction’s angle to the spine plane before projection.',
 'lateral-project':'Project the selected direction onto the spine plane to isolate turn.',
 'lateral-fade':'Keep only the projected selected direction for the turn comparison.',
 'rotation-camera':'Face the rotation plane so the turning angle is easy to see.',
 'turn-camera':'Look toward up to see the turn across the horizontal plane.',
 'bend-camera':'Move to the leaning side so forward bend is easier to see.',
 'tilt-camera':'Move to the side to reveal tilt above or below the plane.',
 'bend-plane':'Expand the sideways–up plane to compare the spine’s forward bend.',
 'tilt-plane':'Expand the forward–up plane to compare the spine’s side tilt.',
 'plane-switch':'Fade the bend comparison to prepare the side-tilt plane.',
 'bend-reference-fade':'Show the spine’s planar reference to establish the starting direction.',
 'tilt-reference-fade':'Show the spine’s planar reference to establish the starting direction.',
 'bend-ready':'Compare the spine with its planar reference before measuring bend.',
 'shoulder-camera':'Frame both shoulders so the crossbar’s source is clear.',
 'crossbar-plane':'Build a plane across the spine to set a perpendicular crossbar.',
 'crossbar-camera':'Angle the view so the shoulder projection stays visible.',
 'crossbar-angle':'Show the shoulder line’s angle to the plane before projection.',
 'crossbar-project':'Project the shoulder line across the spine to make a rigid T.',
 'crossbar-original-fade':'Fade the original shoulder line so the rigid crossbar stays clear.',
 'reference-t':'Compare the reference and body T before rotating.',
 'azimuth-camera':'Look down to see the T’s horizontal lean direction.',
 'azimuth-plane':'Show the horizontal plane at the root to measure lean direction.',
 'azimuth-ready':'Compare forward with the horizontal lean direction before turning.',
 'forward-fade':'Fade forward now that lean direction is established.',
 'polar-camera':'Move to the side to see how far the T leans.',
 'polar-ready':'Compare the upright stem with the body spine before inclining.',
 'spin-camera':'Look along the spine to see the crossbar’s twist.',
 'spin-ready':'Compare both crossbars before twisting around the spine.',
 'sway-ready':'Start with sway to isolate sideways displacement.',
 'thrust-ready':'Next, isolate forward displacement along the reference forward axis.',
 'lift-ready':'Finally, isolate vertical displacement along the reference up axis.',
 reset:'Fade the helpers to return to the selected pose.',
};

function construction(id){
 const prefix=id.startsWith('reference-')?'reference':id.startsWith('torso-')?'torso':null;
 if(!prefix)return;
 const step=id.slice(prefix.length+1),reference=prefix==='reference',source=reference?'reference ankles':'shoulders',name=reference?'reference':'torso';
 const captions={
  'lateral-camera-in':`Move closer so both ${source} and the full arrow stay visible.`,
  'lateral-focus':`Highlight the ${source} to show where left–right comes from.`,
  grow:`Connect right to left to define the ${name}’s left–right direction.`,
  'lateral-release':'Release the joint emphasis so the direction stays in focus.',
  shrink:'Anchor left–right at the midpoint to build a coordinate frame.',
  'up-focus':'Highlight the upper-spine joints to show where up comes from.',
  up:reference?'Add global up so the left–right direction can be leveled.':'Use the upper spine to define the torso’s up direction.',
  'up-release':'Release the joint emphasis so the up direction stays in focus.',
  'up-align':'Move up to the shared origin to compare the two directions.',
  'angle-camera':'Face the two directions so their angle is easy to see.',
  'angle-reveal':'Show the angle to up before making the two directions perpendicular.',
  orthogonalize:'Remove the up component to make left–right perpendicular to up.',
  'cross-camera-in':'Choose an oblique view to see the plane and forward together.',
  plane:'Grow the left–up plane to establish the forward direction.',
  forward:'Draw forward perpendicular to the plane to complete the axes.',
  'plane-fade':'Fade the construction plane; keep the three directions.',
  'cross-camera-out':`Pull back to see the completed ${name} axes.`,
 };
 return captions[step];
}

function measurement(entry,key){
 const torso=entry.subtype.startsWith('torso_'),spine=entry.subtype==='spine_bend_tilt',joint=entry.subtype.startsWith('hip')?'hip':'shoulder';
 const captions={
  turn:torso?'Rotate around up to measure torso turn.':entry.type==='kinematic'?`Rotate toward the projected ${joint} direction to measure turn.`:`Rotate across the horizontal plane to measure ${joint} turn.`,
  bend:torso?'Rotate around the turned left–right axis to measure forward bend.':'Rotate the planar reference toward the spine to measure forward bend.',
  tilt:torso?'Rotate around forward to measure side tilt.':spine?'Rotate the planar reference toward the spine to measure side tilt.':`Rotate from horizontal toward the ${joint} line to measure tilt.`,
  azimuth:'Turn the reference T around global up to match the lean direction.',
  polar:'Incline the reference T toward the spine to measure lean from vertical.',
  spin:'Twist around the spine until the crossbars match.',
  sway:'Measure sway along left–right; the dashed line shows its projection.',
  thrust:'Measure thrust along forward; the dashed line shows its projection.',
  lift:'Measure lift along up; the dashed line shows its projection.',
 };
 return captions[key];
}

function describeStep(model,segment,state){
 const entry=model.context.entry,id=segment.id,joint=entry.subtype.startsWith('hip')?'hips':'shoulders',tShape=entry.subtype==='spine_azimuth_polar_spin';
 if(id==='finish'){
  const timing=reviewTiming(state.progress,state.reviewDuration??segment.duration);
  if(timing.holding)return 'Hold the completed result so the final comparison is clear.';
  if(timing.progress<.22)return entry.type==='position'?'Reset the numbers to review each displacement component.':'Fade the comparison vectors so their directions can reset while hidden.';
  const returnEnd=tShape||entry.subtype.startsWith('torso_')?.34:entry.type==='geometric'?.38:.4;
  if(entry.type!=='position'&&timing.progress<returnEnd)return 'Bring the reset vectors back before replaying the measurements.';
  return state.active?'Review: '+measurement(entry,state.active):'Review the same comparison to see how the result is measured.';
 }
 if(id==='reference-align')return tShape?'Rearrange the reference axes into a root-based T for comparison.':entry.subtype==='spine_bend_tilt'?'Move and shrink the reference axes to keep a compact direction guide.':entry.type==='kinematic'?'Move the reference axes onto the spine-plane origin for comparison.':`Move the reference axes to the ${joint==='hips'?'hip':'shoulder'} center for comparison.`;
 if(id==='reference-trim')return entry.subtype==='spine_bend_tilt'?'Make the compact reference translucent so the spine stays clear.':'Fade unused axes so the measured direction stays clear.';
 const built=construction(id);if(built)return built;
 if(id==='plane')return entry.type==='kinematic'?'Build a plane perpendicular to the lower spine to compare turn.':'Create the reference horizontal plane to separate turn from tilt.';
 if(id==='tilt-ready')return entry.subtype==='spine_bend_tilt'?'Compare the spine with its planar reference before measuring tilt.':`Compare the ${joint} with the horizontal plane before measuring tilt.`;
 if(id.startsWith('camera-'))return `Look toward the ${id==='camera-turn'?'up':id==='camera-bend'?'left–right':'forward'} axis to see this rotation clearly.`;
 const pair=id.match(/^(up|spine|lateral|shoulder)-(focus|grow|release|align)$/);
 if(pair){
  const [,,phase]=pair,part=pair[1],source=part==='up'?'lower-spine joints':part==='spine'?'hip and shoulder centers':part==='shoulder'?'shoulders':joint;
  if(phase==='focus')return `Highlight the ${source} to show where this direction comes from.`;
  if(phase==='grow')return part==='spine'?'Connect hip center to shoulder center to define the spine direction.':part==='up'?'Connect the lower-spine joints to define the rotation axis.':`Connect right to left to define the ${source.replace(/s$/,'')} direction.`;
  if(phase==='release')return 'Release the joint emphasis so the measured direction stays clear.';
  return tShape?`Turn the ${part==='spine'?'spine arrow into the T’s stem':'shoulder arrow into the T’s crossbar'}.`:'Anchor the direction at the measurement origin for comparison.';
 }
 return common[id]??measurement(entry,id);
}

// Let the animation explain camera moves, emphasis, fades and simple placement.
// Captions are reserved for definitions, normalization and measurement meaning.
export function stepCaption(model,segment,state){
 const id=segment.id;
 if(id==='finish'){
  const timing=reviewTiming(state.progress,state.reviewDuration??segment.duration);
  if(timing.holding||!state.active)return null;
  const returnEnd=model.context.entry.subtype==='spine_azimuth_polar_spin'||model.context.entry.subtype.startsWith('torso_')?.34:model.context.entry.type==='geometric'?.38:.4;
  if(timing.progress<returnEnd)return null;
  return measurement(model.context.entry,state.active)??null;
 }
 if(/camera|focus|release|fade|ready|markers|preview|intro|reset|compare|trim|align|shrink|highlight|duplicate/.test(id))return null;
 if(['selected-focus','reference-root','target-root','scale-align','unit-fade','plane-switch','reference-t','displacement'].includes(id))return null;
 // The pie already shows this angle; explain the projection that follows it.
 if(/angle/.test(id))return null;
 return describeStep(model,segment,state)??null;
}
