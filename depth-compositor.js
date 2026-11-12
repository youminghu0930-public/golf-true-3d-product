import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';

// Resolve transparency per pixel: each pass captures the next visible surface,
// then composites the captured layers from back to front in linear color space.
export function createDepthCompositor(renderer,{layers=8,supersampling=2}={}){
 const target=()=>{
  const t=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
  t.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);return t;
 };
 const resolved=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 const opaque=target(),peels=Array.from({length:layers},target),size=new THREE.Vector2();
 const uniforms={opaque:{value:opaque.texture},opaqueDepth:{value:opaque.depthTexture},applyToneMapping:{value:false},toneMappingExposure:{value:1}};
 peels.forEach((t,i)=>uniforms['layer'+i]={value:t.texture});
 const composite=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 uvScreen; void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
  fragmentShader:`
   #ifndef TONE_MAPPING
   #include <tonemapping_pars_fragment>
   vec3 toneMapping(vec3 color){return ACESFilmicToneMapping(color);}
   #endif
   uniform bool applyToneMapping;
   varying vec2 uvScreen; uniform sampler2D opaque; uniform sampler2D opaqueDepth;\n${peels.map((_,i)=>`uniform sampler2D layer${i};`).join('\n')}
   void main(){vec4 sampleColor;vec4 result=vec4(0.0);
    ${peels.map((_,i)=>layers-1-i).map(i=>`sampleColor=texture2D(layer${i},uvScreen);
    if(sampleColor.a>0.0)sampleColor.rgb/=sampleColor.a;
    if(applyToneMapping){
    sampleColor.rgb=toneMapping(sampleColor.rgb);sampleColor=sRGBTransferOETF(sampleColor);
    }
    result.rgb=sampleColor.rgb*sampleColor.a+result.rgb*(1.0-sampleColor.a);
    result.a=sampleColor.a+result.a*(1.0-sampleColor.a);`).join('\n')}
    if(result.a>0.0)result.rgb/=result.a;
    gl_FragColor=result;
    if(applyToneMapping){gl_FragColor=sRGBTransferEOTF(gl_FragColor);}
    // Premultiplied resolve keeps partially covered edges from gaining halos.
    gl_FragColor.rgb*=gl_FragColor.a;
    #include <colorspace_fragment>
   }`});
 const fullscreen=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),composite),camera=new THREE.Camera();fullscreen.add(quad);
 // Resolve depth at each subpixel, composite there, then average only final
 // colors. Resolving MSAA depth before peeling loses thin surface coverage.
 const downsample=new THREE.ShaderMaterial({toneMapped:false,transparent:true,depthTest:false,depthWrite:false,
  uniforms:{image:{value:resolved.texture}},vertexShader:composite.vertexShader,
  fragmentShader:`varying vec2 uvScreen;uniform sampler2D image;void main(){
   gl_FragColor=texture2D(image,uvScreen);
   if(gl_FragColor.a>0.0)gl_FragColor.rgb/=gl_FragColor.a;
   #include <colorspace_fragment>
  }`});
 const patched=new Map();
 function patch(material){
  if(patched.has(material))return patched.get(material);
  const state={enabled:{value:false},first:{value:true},previous:{value:null},opaque:{value:opaque.depthTexture},size:{value:size},bias:{value:0}};
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,...args){
   compile.call(this,shader,...args);
   Object.assign(shader.uniforms,{peelEnabled:state.enabled,peelFirst:state.first,peelPrevious:state.previous,peelOpaque:state.opaque,peelSize:state.size,peelBias:state.bias});
   shader.fragmentShader='uniform bool peelEnabled; uniform bool peelFirst; uniform sampler2D peelPrevious; uniform sampler2D peelOpaque; uniform vec2 peelSize; uniform float peelBias;\n'+shader.fragmentShader;
   // Store premultiplied color so MSAA resolves coverage and opacity once.
   shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','if(peelEnabled)gl_FragColor.rgb*=gl_FragColor.a;\n#include <colorspace_fragment>');
   shader.fragmentShader=shader.fragmentShader.replace(/void\s+main\s*\(\s*\)\s*\{/,`void main(){
    gl_FragDepth=gl_FragCoord.z;
    if(peelEnabled){vec2 screenUV=gl_FragCoord.xy/peelSize;
     float surfaceDepth=gl_FragCoord.z-peelBias;gl_FragDepth=surfaceDepth;
     if(surfaceDepth>=texture2D(peelOpaque,screenUV).r)discard;
     if(!peelFirst&&surfaceDepth<=texture2D(peelPrevious,screenUV).r+0.000001)discard;
    }`);
  };
  material.customProgramCacheKey=function(){return key.call(this)+'|depth-peeling-v1';};material.needsUpdate=true;
  state.restore=()=>{material.onBeforeCompile=compile;material.customProgramCacheKey=key;material.needsUpdate=true;};patched.set(material,state);return state;
 }
 return {render(scene,view){
  renderer.getDrawingBufferSize(size);size.multiplyScalar(supersampling).floor();
  if(opaque.width!==size.x||opaque.height!==size.y)for(const t of [opaque,...peels,resolved])t.setSize(size.x,size.y);
  uniforms.applyToneMapping.value=renderer.toneMapping!==undefined&&renderer.toneMapping!==THREE.NoToneMapping;
  uniforms.toneMappingExposure.value=renderer.toneMappingExposure??1;
  const objects=[],materials=new Map();
  scene.traverse(object=>{
   if(!object.material||!object.visible)return;
   const list=Array.isArray(object.material)?object.material:[object.material];
   // Renderable objects here use homogeneous material transparency.
   const transparent=list.some(material=>material.transparent&&material.opacity>0);
   objects.push({object,transparent});
   if(transparent)for(const material of list)if(!materials.has(material)){
    const state=patch(material);
    // Coplanar reference fills and angle sectors need a stable sub-pixel order.
    // Apply the same depth for peeling comparisons and the depth buffer.
    state.bias.value=Math.max(0,object.renderOrder-15)*0.000002;
    materials.set(material,{depthWrite:material.depthWrite,blending:material.blending,forceSinglePass:material.forceSinglePass,state});
   }
  });
  const background=scene.background,clearColor=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha(),autoClear=renderer.autoClear,shadowUpdate=renderer.shadowMap.autoUpdate,previousTarget=renderer.getRenderTarget();
  try{
   renderer.autoClear=true;
   // Generate the normal continuous shadows with translucent casters present.
   // Reuse that shadow map for all depth layers rather than regenerating it.
   if(shadowUpdate&&objects.some(({object,transparent})=>transparent&&object.castShadow)){
    renderer.setRenderTarget(opaque);renderer.render(scene,view);renderer.shadowMap.autoUpdate=false;
   }
   for(const {object,transparent} of objects)if(transparent)object.visible=false;
   renderer.setRenderTarget(opaque);renderer.render(scene,view);
   renderer.shadowMap.autoUpdate=false;
   // Keep solid geometry on the original hardware-antialiased renderer path.
   // Only transparent surfaces pass through depth compositing.
   renderer.setRenderTarget(previousTarget);renderer.render(scene,view);
   for(const {object,transparent} of objects)object.visible=transparent;
   scene.background=null;renderer.setClearColor(0,0);
   for(const [material,{state}] of materials){material.depthWrite=true;material.blending=THREE.NoBlending;material.forceSinglePass=true;state.enabled.value=true;}
   peels.forEach((t,i)=>{
    for(const {state} of materials.values()){state.first.value=i===0;state.previous.value=i?peels[i-1].depthTexture:opaque.depthTexture;}
    renderer.setRenderTarget(t);renderer.render(scene,view);
   });
   renderer.setRenderTarget(resolved);quad.material=composite;renderer.render(fullscreen,camera);
   renderer.setRenderTarget(previousTarget);renderer.autoClear=false;quad.material=downsample;renderer.render(fullscreen,camera);
  }finally{
   quad.material=composite;objects.forEach(({object})=>object.visible=true);
   for(const [material,saved] of materials){material.depthWrite=saved.depthWrite;material.blending=saved.blending;material.forceSinglePass=saved.forceSinglePass;saved.state.enabled.value=false;}
   scene.background=background;renderer.setClearColor(clearColor,clearAlpha);renderer.autoClear=autoClear;renderer.shadowMap.autoUpdate=shadowUpdate;renderer.setRenderTarget(previousTarget);
  }
 },dispose(){patched.forEach(state=>state.restore());patched.clear();opaque.dispose();resolved.dispose();downsample.dispose();peels.forEach(t=>t.dispose());quad.geometry.dispose();composite.dispose();}};
}
