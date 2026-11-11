import {mountPoseScene} from './snapshot-3d.js';
import {frameAtTime} from './frame-timing.js';
async function read(url){const response=await fetch(new URL(url, import.meta.url),{cache:'no-store'});if(!response.ok)throw new Error(`Banner asset ${response.status}`);return response.json();}
export async function mountBanner(root,settings){
  const catalog=await read('materials/data/videos.json');
  const clip=catalog.find(clip=>clip.id===settings.swing);
  const source=clip?.views.find(view=>view.name==='face-on');if(!source)throw new Error('Face-on banner source missing');
  const times=await read(source.src+'.frames.json');
  const scene=document.createElement('div');scene.className='banner-pose-scene';scene.setAttribute('aria-hidden','true');
  const video=document.createElement('video');video.className='banner-source-decoder';video.muted=video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='auto';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');video.tabIndex=-1;video.src=new URL(source.src,import.meta.url).href;
  const configuredFps=Number(settings.fps);
  const playbackFps=Number.isFinite(configuredFps)&&configuredFps>0?configuredFps:source.fps;
  video.defaultPlaybackRate=video.playbackRate=playbackFps/source.fps;
  root.replaceChildren(scene,video);
  const controller=await mountPoseScene(scene,clip.id,{range:[0,clip.frames-1],fps:playbackFps,joints:[]},{autoPlay:false,showCameras:true,cameraVideos:{'face-on':video},bannerMode:true});
  controller.setView('face-on',{animate:false});
  let callback,visible=false;
  const schedule=()=>{if(!video.paused)callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);};
  function tick(now,metadata){controller.setFrame(frameAtTime(times,metadata?.mediaTime??video.currentTime));schedule();}
  const sync=()=>{
    if(visible&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(error=>console.warn('Banner autoplay unavailable',error));
    else video.pause();
  };
  video.addEventListener('play',()=>{if(callback!==undefined){if(video.requestVideoFrameCallback)video.cancelVideoFrameCallback(callback);else cancelAnimationFrame(callback);}schedule();});
  video.addEventListener('canplay',sync);
  video.addEventListener('loadeddata',()=>{controller.setFrame(frameAtTime(times,video.currentTime));sync();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(root);
  document.addEventListener('visibilitychange',sync);sync();
}
