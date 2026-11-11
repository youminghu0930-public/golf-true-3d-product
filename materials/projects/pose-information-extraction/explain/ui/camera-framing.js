import {Vector3} from '../../vendor/three/three.module.js';
// Fit a complete joint pair and arrow, using the narrower viewport angle so
// portrait and landscape viewports both preserve margin around the endpoints.
export function fitPairCamera(focus,toWorld,halfFov,defaultDistance,defaultTarget,defaultZoom=1,view){
 const points=focus.points.map(toWorld),center=new Vector3();
 points.forEach(point=>center.add(point));center.multiplyScalar(1/points.length);
 const radius=Math.max(.035,...points.map(point=>point.distanceTo(center)));
 const distance=(view?fitViewDistance(points,center,view.direction,view.up,view.verticalHalfFov,view.aspect,.78):radius/(Math.sin(halfFov)*.62))*(focus.distanceScale??1);
 return {zoom:1+(defaultZoom-1)*(1-focus.amount),target:defaultTarget.clone().lerp(center,focus.amount),distance:defaultDistance+((view?distance:Math.min(defaultDistance,distance))-defaultDistance)*focus.amount};
}

// Fit actual horizontal/vertical extents rather than a sphere constrained by
// the narrower dimension. A tall subject no longer wastes a narrow viewport.
export function fitViewDistance(points,target,direction,up,verticalHalfFov,aspect,margin=.84){
 const forward=direction.clone().normalize(),right=new Vector3().crossVectors(up,forward).normalize();
 if(right.lengthSq()<1e-12)right.crossVectors(new Vector3(0,0,1),forward).normalize();
 const vertical=new Vector3().crossVectors(forward,right).normalize();
 const verticalSlope=Math.tan(verticalHalfFov)*margin,horizontalSlope=verticalSlope*aspect;
 let distance=.1;
 for(const point of points){
  const x=point.x-target.x,y=point.y-target.y,z=point.z-target.z,depth=x*forward.x+y*forward.y+z*forward.z;
  distance=Math.max(distance,depth+Math.abs(x*right.x+y*right.y+z*right.z)/horizontalSlope,depth+Math.abs(x*vertical.x+y*vertical.y+z*vertical.z)/verticalSlope);
 }
 return distance+.035;
}
