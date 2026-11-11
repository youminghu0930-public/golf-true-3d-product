import {mountCoordinatePlayer} from './coordinate-player.js';
import {createSpinePlaneChoreography} from '../choreography/spine-plane.js';
export function mountSpinePlanePlayer(root,model,viewer){return mountCoordinatePlayer(root,model,viewer,createSpinePlaneChoreography);}
