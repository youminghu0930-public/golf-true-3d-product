import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {createPoseSurface} from '../materials/projects/pose-information-extraction/pose-surface.js';
test('Translucent translation uses intact balls and double-sided open sheets meeting the sphere surface',()=>{
 const boneRadius=.012,jointRadius=.022,surface=createPoseSurface(boneRadius,jointRadius);
 const material=new THREE.MeshStandardMaterial({transparent:true,opacity:.35,depthWrite:false});
 const bone=surface.bone(material),joint=surface.joint(material);
 assert.equal(bone.geometry.parameters.openEnded,true);
 for(const mesh of [bone,joint]){assert.equal(mesh.material.side,THREE.DoubleSide);assert.equal(mesh.material.forceSinglePass,false);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.opacity,.35);}
 assert.equal(joint.geometry.parameters.thetaLength,Math.PI);
 surface.placeBone(bone,new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0));
 const endDistance=(1-bone.scale.y)/2;
 assert.ok(Math.abs(endDistance**2+boneRadius**2-jointRadius**2)<1e-12);
 assert.equal(bone.position.y,.5);
 bone.geometry.dispose();joint.geometry.dispose();bone.material.dispose();joint.material.dispose();material.dispose();
});
