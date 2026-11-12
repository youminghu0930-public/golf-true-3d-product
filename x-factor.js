import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {frameDefinitions} from './materials/projects/pose-information-extraction/explain/choreography/axis-frame.js';
import {add,sub,mul,project,length,unit,spin} from './materials/projects/pose-information-extraction/explain/math.js';
import {createPlaneRenderer} from './materials/projects/pose-information-extraction/explain/ui/plane.js';
import {createRotationSector} from './materials/projects/pose-information-extraction/explain/ui/rotation-sector.js';
import {rotationColors} from './rotation-style.js';
export function createXFactorModel(data,metrics){
  const indexes=Object.fromEntries(data.joints.map((name,i)=>[name,i]));
  const reference=frameDefinitions(data,metrics.meta,0).reference;
  const first=data.reconstruction[0],origin=mul(add(first[indexes.left_ankle],first[indexes.right_ankle]),.5);
  const frames=data.reconstruction.map(pose=>{
    const directions=['shoulder','hip'].map(region=>{
      const a=pose[indexes[`right_${region}`]],b=pose[indexes[`left_${region}`]];
      if(![a,b].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))return null;
      const projected=project(sub(b,a),reference.y);return length(projected)>1e-10?unit(projected):null;
    });
    if(directions.some(direction=>!direction))return null;
    const [shoulder,hip]=directions;
    // Same oriented spin as geometric turn: hip is the baseline, shoulder the target.
    return {shoulder,hip,angle:spin(hip,shoulder,reference.y)};
  });
  return {origin,normal:reference.y,u:reference.x,v:reference.z,frames};
}
export function createXFactorOverlay({scene,toWorld},model,radius){
  const plane=createPlaneRenderer(scene,toWorld),sector=createRotationSector(scene,toWorld);
  plane.update({origin:model.origin,u:model.u,v:model.v,size:radius,shape:'circle',color:rotationColors.xfactor,opacity:1,fillOpacity:.12});
  const cylinder=new THREE.CylinderGeometry(1,1,1,12),axis=new THREE.Vector3(0,1,0);
  const lines=['shoulder','hip'].map(region=>{
    const mesh=new THREE.Mesh(cylinder,new THREE.MeshBasicMaterial({color:rotationColors[region]}));mesh.name=`X-factor projected ${region} direction`;scene.add(mesh);return {region,mesh};
  });
  return {
    setFrame(frame){
      const state=model.frames[frame];
      for(const {region,mesh} of lines){
        mesh.visible=!!state;if(!state)continue;
        // Center both projected directions on the fixed ankle plane. Extend
        // them to its diameter to make their signed separation easy to read.
        const a=toWorld(add(model.origin,mul(state[region],-radius))),b=toWorld(add(model.origin,mul(state[region],radius))),delta=b.clone().sub(a);
        mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(axis,delta.clone().normalize());mesh.scale.set(.004,delta.length(),.004);
      }
      const spec=state?{origin:model.origin,from:state.hip,normal:model.normal,angle:state.angle,radius,color:rotationColors.xfactor,opacity:1,fillOpacity:.38,outline:true}:undefined;
      sector.update(spec);return spec;
    },
    dispose(){plane.dispose();sector.dispose();for(const {mesh} of lines){scene.remove(mesh);mesh.material.dispose();}cylinder.dispose();},
  };
}
