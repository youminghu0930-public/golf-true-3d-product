import {mountCoordinatePlayer} from './coordinate-player.js';
import {createSpineTChoreography} from '../choreography/spine-t.js';
export function mountSpineTPlayer(root,model,viewer){return mountCoordinatePlayer(root,model,viewer,createSpineTChoreography);}
