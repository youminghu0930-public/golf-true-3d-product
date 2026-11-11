import {mountCoordinatePlayer} from './coordinate-player.js';
import {createHipDisplacementChoreography} from '../choreography/hip-displacement.js';
export function mountHipDisplacementPlayer(root,model,viewer){return mountCoordinatePlayer(root,model,viewer,createHipDisplacementChoreography);}
