import {mountPoseScene} from './snapshot-3d.js';
import {frameAtTime} from './frame-timing.js';
async function read(url){const response=await fetch(new URL(url, import.meta.url),{cache:'no-store'});if(!response.ok)throw new Error(`Banner asset ${response.status}`);return response.json();}
export async function mountBanner(root,settings){
  const catalog=await read('materials/data/videos.json');
  const clip=catalog.find(clip=>clip.id===settings.swing);
  const source=clip?.views.find(view=>view.name==='face-on');if(!source)throw new Error('Face-on banner source missing');
  const [times,syncData,metrics]=await Promise.all([read(source.src+'.frames.json'),read(clip.sync),read(`materials/data/metrics/${encodeURIComponent(clip.id)}.json`)]);
  const mapping=syncData.mapping[source.name];
  if(!mapping?.length||clip.alignmentError)throw new Error('Banner synchronization unavailable');
  const firstTime=times[mapping[0]],lastTime=times[mapping.at(-1)];
  const scene=document.createElement('div');scene.className='banner-pose-scene';scene.setAttribute('aria-hidden','true');
  const video=document.createElement('video');video.className='banner-source-decoder';video.muted=video.defaultMuted=true;video.playsInline=true;video.loop=false;video.preload='auto';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');video.tabIndex=-1;video.src=new URL(source.src,import.meta.url).href;
  const configuredFps=Number(settings.fps);
  const playbackFps=Number.isFinite(configuredFps)&&configuredFps>0?configuredFps:source.fps;
  video.defaultPlaybackRate=video.playbackRate=(mapping.at(-1)-mapping[0])/Math.max(1,mapping.length-1)*playbackFps/source.fps;
  root.replaceChildren(scene,video);
  const controller=await mountPoseScene(scene,clip.id,{range:[0,clip.frames-1],fps:playbackFps,joints:[]},{autoPlay:false,showCameras:true,cameraVideos:{'face-on':video},bannerMode:true,bannerMetrics:metrics});
  controller.setView('face-on',{animate:false});
  const showFrame=frame=>controller.setFrame(frame);
  let callback,visible=false;
  const schedule=()=>{if(!video.paused)callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);};
  function tick(now,metadata){const time=metadata?.mediaTime??video.currentTime;
    if(time>=lastTime){video.currentTime=firstTime;showFrame(0);}
    else showFrame(mappedFrame(mapping,frameAtTime(times,time)));
    schedule();}
  const sync=()=>{
    if(visible&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(error=>console.warn('Banner autoplay unavailable',error));
    else video.pause();
  };
  video.addEventListener('play',()=>{if(callback!==undefined){if(video.requestVideoFrameCallback)video.cancelVideoFrameCallback(callback);else cancelAnimationFrame(callback);}schedule();});
  video.addEventListener('canplay',sync);
  video.addEventListener('loadeddata',()=>{if(video.currentTime<firstTime)video.currentTime=firstTime;showFrame(mappedFrame(mapping,frameAtTime(times,video.currentTime)));sync();});
  video.addEventListener('ended',()=>{video.currentTime=firstTime;showFrame(0);sync();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(root);
  document.addEventListener('visibilitychange',sync);sync();
}

// Locate the synchronized step closest to the raw frame currently decoded.
export function mappedFrame(mapping,rawFrame){
  let low=0,high=mapping.length-1;
  while(low<high){const mid=(low+high)>>>1;if(mapping[mid]<rawFrame)low=mid+1;else high=mid;}
  return low>0&&Math.abs(mapping[low-1]-rawFrame)<Math.abs(mapping[low]-rawFrame)?low-1:low;
}
