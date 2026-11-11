import {mountCoordinatePlayer} from './coordinate-player.js';
import {createSpineBendTiltChoreography} from '../choreography/spine-bend-tilt.js';
export function mountSpineBendTiltPlayer(root,model,viewer){return mountCoordinatePlayer(root,model,viewer,createSpineBendTiltChoreography);}
