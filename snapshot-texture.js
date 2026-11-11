import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';

// Preserve Three's video upload/color path without its asynchronous per-video
// callbacks. Each decoder publishes only after its matching raw frame settles.
export function createCommittedVideoTexture(video){
  const texture=new THREE.Texture(video);
  texture.isVideoTexture=true;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.update=()=>{};
  texture.commit=()=>{texture.needsUpdate=true;};
  return texture;
}
