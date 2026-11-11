import {add,mul,unit} from '../math.js';
import {cameraOrientation} from './camera.js';

// An oblique close-up keeps both plane directions and the perpendicular result
// readable together, instead of looking straight down any of the three axes.
export function crossProductView(frame){
 const {origin,x,y,z,length}=frame,end=axis=>add(origin,mul(axis,length));
 return {
  points:[origin,end(x),end(y),add(end(x),mul(y,length)),end(z)],
  orientation:cameraOrientation(unit(add(add(mul(x,.7),mul(y,.45)),z)),y),
 };
}
