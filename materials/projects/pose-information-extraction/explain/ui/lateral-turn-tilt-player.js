import {mountCoordinatePlayer} from './coordinate-player.js';
import {createLateralTurnTiltChoreography} from '../choreography/lateral-turn-tilt.js';
export function mountLateralTurnTiltPlayer(root,model,viewer){return mountCoordinatePlayer(root,model,viewer,createLateralTurnTiltChoreography);}
