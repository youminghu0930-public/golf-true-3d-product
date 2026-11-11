import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {createCommittedVideoTexture} from '../snapshot-texture.js';
test('video planes retain the video color/upload path without independent frame callbacks',()=>{
 let callbacks=0;
 const texture=createCommittedVideoTexture({readyState:4,HAVE_CURRENT_DATA:2,requestVideoFrameCallback:()=>callbacks++});
 assert.equal(texture.isVideoTexture,true);
 assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
 assert.equal(texture.generateMipmaps,false);
 const version=texture.version;
 texture.update();texture.update();
 assert.equal(callbacks,0);
 assert.equal(texture.version,version);
 texture.commit();assert.equal(texture.version,version+1);
 texture.dispose();
});
test('camera textures remain unchanged until the shared commit',()=>{
 const textures=[createCommittedVideoTexture({}),createCommittedVideoTexture({})];
 textures[0].update();textures[1].update();
 assert.deepEqual(textures.map(t=>t.version),[0,0]);
 textures.forEach(t=>t.commit());
 assert.deepEqual(textures.map(t=>t.version),[1,1]);
 textures.forEach(t=>t.dispose());
});
