import {axisColors} from './palette.js';

// Card colors follow the reference measuring vector when its color differs
// from the target. Torso explicitly follows rotation axes instead.
export const measurementVectors={
 torso_turn_bend_tilt:{turn:'y',bend:'x',tilt:'z'},
 hip_turn_on_spine_plane:{turn:'x'},
 shoulder_turn_on_spine_plane:{turn:'x'},
 shoulder_turn_tilt:{turn:'x',tilt:'y'},
 hip_turn_tilt:{turn:'x',tilt:'y'},
 spine_bend_tilt:{bend:'z',tilt:'x'},
 spine_azimuth_polar_spin:{azimuth:'z',polar:'y',spin:'x'},
 hip_sway_thrust_lift:{sway:'x',thrust:'z',lift:'y'},
};
measurementVectors.torso_turn_bend_tilt_by_shoulder=measurementVectors.torso_turn_bend_tilt;

export function measurementColor(subtype,key){
 return axisColors[measurementVectors[subtype]?.[key]];
}
