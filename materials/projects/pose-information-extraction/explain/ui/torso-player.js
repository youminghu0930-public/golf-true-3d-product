import {mountCoordinatePlayer} from './coordinate-player.js';
import {createTorsoChoreography} from '../choreography/torso.js';
export function mountTorsoPlayer(root,model,viewer){return mountCoordinatePlayer(root,model,viewer,createTorsoChoreography);}
