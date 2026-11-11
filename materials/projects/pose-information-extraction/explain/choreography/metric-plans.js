import {createTorsoChoreography} from './torso.js';
import {createSpinePlaneChoreography} from './spine-plane.js';
import {createLateralTurnTiltChoreography} from './lateral-turn-tilt.js';
import {createSpineBendTiltChoreography} from './spine-bend-tilt.js';
import {createSpineTChoreography} from './spine-t.js';
import {createHipDisplacementChoreography} from './hip-displacement.js';
export const metricPlans={
 torso_turn_bend_tilt:createTorsoChoreography,torso_turn_bend_tilt_by_shoulder:createTorsoChoreography,
 hip_turn_on_spine_plane:createSpinePlaneChoreography,shoulder_turn_on_spine_plane:createSpinePlaneChoreography,
 shoulder_turn_tilt:createLateralTurnTiltChoreography,hip_turn_tilt:createLateralTurnTiltChoreography,
 spine_bend_tilt:createSpineBendTiltChoreography,spine_azimuth_polar_spin:createSpineTChoreography,
 hip_sway_thrust_lift:createHipDisplacementChoreography,
};
