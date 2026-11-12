import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';

// One small planar capture per pane. No recursion, screen-space tracing or
// transmission pass; the primary scene keeps its existing shadow-map pass.
export function createGlassReflection({renderer,scene,group,geometry,corners}){
  const target=new THREE.WebGLRenderTarget(384,384,{type:THREE.HalfFloatType,depthBuffer:true});
  target.texture.generateMipmaps=false;
  const virtual=new THREE.PerspectiveCamera();
  const planePoint=new THREE.Vector3(...corners[0]);
  const normal=new THREE.Vector3().crossVectors(new THREE.Vector3(...corners[1]).sub(planePoint),new THREE.Vector3(...corners[3]).sub(planePoint)).normalize();
  const textureMatrix=new THREE.Matrix4();
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:{reflection:{value:target.texture},textureMatrix:{value:textureMatrix},paneNormal:{value:normal},eye:{value:new THREE.Vector3()}},
    vertexShader:`uniform mat4 textureMatrix; varying vec4 reflectionUV; varying vec3 worldPoint;
      void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPoint=p.xyz;reflectionUV=textureMatrix*p;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform sampler2D reflection; uniform vec3 paneNormal; uniform vec3 eye; varying vec4 reflectionUV; varying vec3 worldPoint;
      void main(){vec4 reflected=texture2DProj(reflection,reflectionUV);float fresnel=pow(1.0-abs(dot(normalize(eye-worldPoint),paneNormal)),3.0);
      gl_FragColor=vec4(reflected.rgb,reflected.a*(0.18+0.32*fresnel));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Live glass reflection';group.add(mesh);
  const clipPlane=new THREE.Plane(),clip=new THREE.Vector4(),q=new THREE.Vector4();
  const bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  return {
    update(camera){
      const n=normal.clone();if(n.dot(camera.position.clone().sub(planePoint))<0)n.negate();
      const reflectPoint=p=>p.addScaledVector(n,-2*n.dot(p.clone().sub(planePoint)));
      virtual.position.copy(reflectPoint(camera.position.clone()));
      const look=reflectPoint(camera.getWorldDirection(new THREE.Vector3()).add(camera.position));
      virtual.up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(n);virtual.lookAt(look);virtual.updateMatrixWorld();
      virtual.near=camera.near;virtual.far=camera.far;virtual.projectionMatrix.copy(camera.projectionMatrix);
      textureMatrix.copy(bias).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse);
      // Oblique near plane excludes objects on the far side of this glass.
      clipPlane.setFromNormalAndCoplanarPoint(n,planePoint).applyMatrix4(virtual.matrixWorldInverse);
      clip.set(clipPlane.normal.x,clipPlane.normal.y,clipPlane.normal.z,clipPlane.constant);
      const projection=virtual.projectionMatrix.elements;
      q.set((Math.sign(clip.x)+projection[8])/projection[0],(Math.sign(clip.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);
      clip.multiplyScalar(2/clip.dot(q));projection[2]=clip.x;projection[6]=clip.y;projection[10]=clip.z+1-.001;projection[14]=clip.w;
      virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert();
      material.uniforms.eye.value.copy(camera.position);
      const previous=renderer.getRenderTarget(),background=scene.background,alpha=renderer.getClearAlpha(),visible=group.visible,shadows=renderer.shadowMap.autoUpdate;
      try{
        group.visible=false;scene.background=null;renderer.setClearAlpha(0);renderer.shadowMap.autoUpdate=false;
        renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,virtual);
      }finally{
        renderer.setRenderTarget(previous);renderer.setClearAlpha(alpha);scene.background=background;group.visible=visible;renderer.shadowMap.autoUpdate=shadows;
      }
    },
    dispose(){target.dispose();},
  };
}
