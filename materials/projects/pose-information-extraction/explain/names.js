// Shared product vocabulary. Export keys stay stable; labels can change here.
export const typeNames={kinematic:'Body rotations',geometric:'Geometric angles',position:'Geometric translation'};
export const subtypeNames={
 torso_turn_bend_tilt:'Torso: turn, forward bend, tilt',
 hip_turn_on_spine_plane:'Hip: turn',
 shoulder_turn_on_spine_plane:'Shoulder: turn',
 shoulder_turn_tilt:'Shoulder: turn, tilt',hip_turn_tilt:'Hip: turn, tilt',
 spine_bend_tilt:'Spine: forward bend, side tilt',spine_azimuth_polar_spin:'Spine: lean direction, inclination, twist',
 hip_sway_thrust_lift:'Hip: sway, thrust, lift',
};
export const itemNames={turn:'Turn',bend:'Forward bend',tilt:'Side tilt',azimuth:'Lean direction',polar:'Lean from vertical',spin:'Twist around the spine',sway:'Sway',thrust:'Thrust',lift:'Lift'};
export const jointNames={root:'Hip center',torso:'Spine midpoint',clavicle:'Shoulder center',left_shoulder:'Left shoulder',right_shoulder:'Right shoulder',left_hip:'Left hip',right_hip:'Right hip',left_ankle:'Left ankle',right_ankle:'Right ankle'};
export const axisNames=['X · right to left','Y · up','Z · forward'];
export const label=(dictionary,key)=>dictionary[key]??key.replaceAll('_',' ');

// Header descriptions distinguish similar metrics without exposing export keys.
export const subtypeDescriptions={
 torso_turn_bend_tilt:'The shoulders define the torso’s left–right direction, and the upper spine defines up. Compare this frame with the reference-pose axes, then rotate through turn, forward bend and side tilt in that order.',
 hip_turn_on_spine_plane:'Use the lower spine as the rotation axis. Project the hip line and the reference left–right direction onto the plane across that axis, then compare their directions.',
 shoulder_turn_on_spine_plane:'Use the lower spine as the rotation axis. Project the shoulder line and the reference left–right direction onto the plane across that axis, then compare their directions.',
 shoulder_turn_tilt:'Follow the line from the right shoulder to the left shoulder. Its direction across the reference horizontal plane gives turn; its angle above or below that plane gives tilt.',
 hip_turn_tilt:'Follow the line from the right hip to the left hip. Its direction across the reference horizontal plane gives turn; its angle above or below that plane gives tilt.',
 spine_bend_tilt:'Follow the spine from the hip center to the shoulder center. For forward bend, compare it with its projection onto the sideways–up plane. For side tilt, compare it with its projection onto the forward–up plane.',
 spine_azimuth_polar_spin:'Treat the spine and shoulders as a rigid T. Rotate its lean direction around global up, incline it toward the spine, then twist the crossbar around that spine.',
 hip_sway_thrust_lift:'Displacement starts at the reference hip center. One unit is the reference pose’s mean length of ten shoulder, arm, hip and leg segments. Compare the two hip centers, then measure sway (sideways), thrust (forward), and lift (vertical) along the global reference axes.',
};
subtypeNames.torso_turn_bend_tilt_by_shoulder=subtypeNames.torso_turn_bend_tilt;
subtypeDescriptions.torso_turn_bend_tilt_by_shoulder=subtypeDescriptions.torso_turn_bend_tilt;

// Compact context for navigation; full explanations remain in the viewer header.
export const typeDescriptions={
 kinematic:'Based on the body’s forward kinematics',
 geometric:'Direct comparison with the global reference',
 position:'Direct comparison with the global reference',
};
export const metricOptionDescriptions={
 torso_turn_bend_tilt:'Shoulders and upper spine',
 hip_turn_on_spine_plane:'Around the lower spine',
 shoulder_turn_on_spine_plane:'Around the lower spine',
 shoulder_turn_tilt:'Relative to the horizontal plane',
 hip_turn_tilt:'Relative to the horizontal plane',
 spine_bend_tilt:'Relative to the vertical reference planes',
 spine_azimuth_polar_spin:'Rigid T formed by spine and shoulders',
 hip_sway_thrust_lift:'Relative to the global reference',
};
metricOptionDescriptions.torso_turn_bend_tilt_by_shoulder=metricOptionDescriptions.torso_turn_bend_tilt;
