// Mobile devices should never allocate the desktop floating-point peel buffers.
export function snapshotResourceProfile({width=1024,coarse=false,pixelRatio=1,floatColor=true,maxTextures=16}={}){
 const mobile=coarse||width<=768;
 return {singleScene:mobile,depthCompositing:!mobile&&floatColor&&maxTextures>=12,pixelRatio:Math.min(pixelRatio,mobile?1.5:2),shadowSize:mobile?1024:2048};
}
export function browserSnapshotResources(capabilities={}){
 return snapshotResourceProfile({width:window.innerWidth,coarse:matchMedia('(pointer: coarse)').matches,pixelRatio:window.devicePixelRatio||1,...capabilities});
}
// Serialize mount/dispose so quick carousel changes cannot create two live scenes.
export function createExclusiveSnapshotMount(mount){
 let version=0,queue=Promise.resolve(),release;
 return {select(index){const token=++version;
  queue=queue.catch(()=>{}).then(async()=>{
   if(token!==version)return;
   release?.();release=undefined;
   const cleanup=await mount(index);
   if(token!==version){cleanup?.();return;}
   release=cleanup;
  });return queue;
 },dispose(){version++;queue=queue.catch(()=>{}).then(()=>{release?.();release=undefined;});return queue;}};
}
