import {browserSnapshotResources,createExclusiveSnapshotMount} from './snapshot-resources.js';
import {measurementFeatureForTitle} from './measurement-features.js';
import {createSnapshotPipeline} from './snapshot-pipeline.js';
import {mountPoseScene} from './snapshot-scene.js';
import {createViewerInfo} from './viewer-info.js';
import {createFrameSeeker} from './frame-seeker.js';
async function json(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}
export async function mountSnapshots(root) {
  const resources=browserSnapshotResources();
  let onSelection=()=>{};
  const config = await json('materials/data/snapshot.json');
  const entries=config.features.map((title,i)=>({title,id:String(config.demo.video),entry:config.demo,key:`feature-${i}`}));
  if(!entries.length)return;
  const shell=document.createElement('div');shell.className='snapshot-shell';
  shell.setAttribute('role','region');shell.setAttribute('aria-roledescription','carousel');shell.setAttribute('aria-label','3D snapshot highlights');
  const wheel=document.createElement('div');wheel.className='snapshot-wheel';shell.append(wheel);
  const dots=document.createElement('div');dots.className='snapshot-dots';dots.setAttribute('aria-label','Choose a snapshot');
  const cards=[],buttons=[];let index=0;
  let position=0,target=0,animation;
  function layout(){
    // Absolute carousel cards do not contribute to their parent's height.
    // Reserve their full height plus the 12px spacing on both edges.
    const cardHeight=Math.max(0,...cards.map(card=>card.offsetHeight));
    if(cardHeight)wheel.style.height=`${cardHeight+24}px`;
    const width=wheel.clientWidth,height=wheel.clientHeight;
    const placements=cards.map((card,i)=>{
      const angle=(i-position)*Math.PI*2/cards.length,depth=Math.cos(angle);
      const radius=cards.length>1?Math.max(220,width*.62):0;
      const scale=1400/(1400+(1-depth)*radius);
      return {depth,scale,x:Math.sin(angle)*radius*scale,y:(12+card.offsetHeight/2-height*.45)*(scale-1)};
    });
    const order=placements.map((_,i)=>i).sort((a,b)=>placements[a].depth-placements[b].depth||a-b);
    cards.forEach((card,i)=>{const p=placements[i];card.style.transform=`translateX(-50%) translate(${p.x}px, ${p.y}px) scale(${p.scale})`;card.style.zIndex=String(order.indexOf(i)+1);});
  }
  function select(next) {
    target=next;index=((target%cards.length)+cards.length)%cards.length;
    onSelection(index);
    cards.forEach((card,i)=>{card.classList.toggle('is-current',i===index);card.inert=i!==index;card.setAttribute('aria-hidden',String(i!==index));buttons[i].setAttribute('aria-current',String(i===index));});
    cancelAnimationFrame(animation);
    const from=position,started=performance.now(),duration=Math.min(900,300+Math.max(0,Math.abs(target-from)-1)*70);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){position=target;layout();return;}
    function tick(now){const progress=Math.min(1,(now-started)/duration),phase=progress**.9,eased=phase*phase*(3-2*phase);position=from+(target-from)*eased;layout();if(progress<1)animation=requestAnimationFrame(tick);}
    animation=requestAnimationFrame(tick);
  }
  const carouselResize=new ResizeObserver(layout);carouselResize.observe(wheel);
  for (const {title} of entries) {
    const card=document.createElement('article');card.className='pose-snapshot snapshot-card';
    card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',title);
    wheel.append(card);cards.push(card);carouselResize.observe(card);
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Show ${title}`);button.append(document.createElement('span'));
    const position=cards.length-1;button.onclick=()=>{let delta=(position-((target%cards.length)+cards.length)%cards.length+cards.length)%cards.length;if(delta>cards.length/2)delta-=cards.length;select(target+delta);};dots.append(button);buttons.push(button);
  }
  for(const [direction,label,step] of [['previous','Previous snapshot',-1],['next','Next snapshot',1]]) {
    const button=document.createElement('button');button.type='button';button.className=`snapshot-arrow snapshot-${direction}`;button.setAttribute('aria-label',label);
    button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${step<0?'M15 5l-7 7 7 7':'M9 5l7 7-7 7'}"/></svg>`;
    button.onclick=()=>select(target+step);button.hidden=entries.length<2;if(entries.length>1)shell.append(button);
  }
  root.replaceChildren(shell);if(entries.length>1)root.append(dots);select(0);
  const report=(card,title,error)=>{console.error(error);const status=card.querySelector('[role=status]');if(status)status.textContent=`${title}: ${error.message}`;};
  if(resources.singleScene){
    const placeholder=i=>{
      const header=make('div',undefined,'snapshot-overview-header');header.append(make('h3',entries[i].title,'snapshot-feature-title'));
      cards[i].replaceChildren(header,make('div',undefined,'snapshot-overview-scene'));
      cards[i].dataset.ready='false';
    };
    cards.forEach((_,i)=>placeholder(i));let previous;
    const loader=createExclusiveSnapshotMount(async i=>{
      if(previous!==undefined)placeholder(previous);
      const {id,entry,title,key}=entries[i];cards[i].replaceChildren();previous=i;
      try{return await mountSnapshotCard(cards[i],id,entry,title,key);}
      catch(error){report(cards[i],title,error);}
    });
    onSelection=i=>{void loader.select(i);};await loader.select(index);
  }else{
    await Promise.all(entries.map(async ({id,entry,title,key},i)=>{
      try {await mountSnapshotCard(cards[i],id,entry,title,key);}
      catch(error){report(cards[i],title,error);}
    }));
  }
  root.setAttribute('aria-busy','false');

}

const make=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
async function mountSnapshotCard(card,id,entry,title,key){
  const header=make('div',undefined,'snapshot-overview-header');
  const options=make('div',undefined,'camera-view-options');options.setAttribute('role','group');options.setAttribute('aria-label','Snapshot POV');options.append(make('span','Select POV:','camera-view-label'));
  const info=createViewerInfo(`snapshot-gestures-${key}`,'Snapshot gestures',[
    {gesture:'Left mouse drag / one-finger drag',action:'Rotate the view.'},
    {gesture:'Right mouse drag / two-finger drag',action:'Pan the view.'},
    {gesture:'Scroll / pinch',action:'Zoom around the window center, including after panning.'},
    {gesture:'Select the current POV again',action:'Recenter its position and rotation while keeping zoom. Free view remembers its orientation when switching views.'},
  ],'section-info');
  const buttons=[];
  for(const [value,label] of [['face-on','Face-on view'],['down-the-line','Down-the-line view'],['free-view','Free-view']]){
    const button=make('button',label);button.type='button';button.disabled=true;button.setAttribute('aria-pressed',String(value==='free-view'));options.append(button);buttons.push([button,value]);
  }
  header.append(make('h3',title,'snapshot-feature-title'),options,info);
  const scene=make('div',undefined,'snapshot-overview-scene');
  const status=make('p','Loading swing…','snapshot-overview-status');status.setAttribute('role','status');
  const decoders=make('div',undefined,'video-source-decoders');
  scene.append(status);card.append(header,scene,decoders);
  const feature=title.toLowerCase();
  const hoganPlanes=feature.startsWith("hogan's plane");
  const measurementFeature=measurementFeatureForTitle(title);
  const showRawDetections=!hoganPlanes&&!measurementFeature;
  if(feature!=='club movement'&&!hoganPlanes&&!measurementFeature){
    status.remove();card.dataset.ready='true';return;
  }
  const catalog=await json('materials/data/snapshot-videos.json'),clip=catalog.find(clip=>clip.id===id);
  if(!clip||clip.alignmentError)throw new Error(clip?.alignmentError||`Missing snapshot swing ${id}`);
  const sync=await json(clip.sync);
  const videos={},seekers=[],times=[],rawReady=new Set();
  const streams=clip.views.map(view=>({name:view.name,ready:()=>false}));
  let disposed=false;
  for(const view of clip.views){
    const video=make('video');video.muted=video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');video.tabIndex=-1;
    videos[view.name]=video;decoders.append(video);
  }
  // Build the 3D scene without waiting for either videos or 2D data.
  const measurementMetrics=measurementFeature?await json(`materials/data/metrics/${id}.json`):undefined;
  const controller=await mountPoseScene(scene,id,{...entry,joints:entry.joints??['golf_club_head'],range:[0,clip.frames-1],fps:clip.fps},{showCameras:true,autoPlay:false,cameraVideos:videos,hoganPlanes,defaultZoomScale:measurementFeature==='hip-translation'?8.5:1.25,measurementMetrics,measurementFeature,showRawDetections});
  clip.views.forEach((view,i)=>{
    const video=videos[view.name];
    if(showRawDetections)json(`materials/data/2d_detections/${id}/${view.name}.json`).then(raw=>{
      if(!disposed){controller.setRawDetections(view.name,{...raw,pred:sync.mapping[view.name].map(frame=>raw.pred[frame])});rawReady.add(view.name);}
    }).catch(error=>console.warn('Snapshot 2D overlay unavailable',error));
    json(view.src+'.frames.json').then(timestamps=>{
      if(disposed)return;times[i]=timestamps;
      let settledRaw=null;
      seekers[i]=createFrameSeeker(video,{getTimes:()=>times[i],onRequest:()=>{},onSettled:rawFrame=>{settledRaw=rawFrame;},requirePresentedFrame:true});
      Object.assign(streams[i],{
        ready:()=>video.readyState>=2&&!video.error&&(!showRawDetections||rawReady.has(view.name)),
        decode:async raw=>{settledRaw=null;seekers[i].request(raw);await seekers[i].whenIdle();return settledRaw;},
        reset:()=>seekers[i].reset(),
      });
    }).catch(error=>console.warn('Snapshot video timing unavailable',error));
    // A slow or failed source never blocks animation or the other camera.
    video.addEventListener('error',()=>console.warn(`Snapshot video unavailable: ${view.name}`));
    video.src=view.src;video.load();
  });
  scene.querySelector('h4')?.remove();
  for(const [button,value] of buttons){
    button.disabled=false;
    button.onclick=()=>{controller.setView(value);buttons.forEach(([b,v])=>b.setAttribute('aria-pressed',String(value===v)));};
  }
  status.remove();card.dataset.ready='true';
  const [start,end]=entry.range?.map((value,i)=>value===null?(i?clip.frames-1:0):value)??[0,clip.frames-1];
  let elapsed=0,previous,visible=false,lastFrame;
  const profile=new URLSearchParams(location.search).has('snapshotPerf');
  const samples=[];let presentedAt,renderStarted;
  const pipeline=createSnapshotPipeline({streams,mapping:sync.mapping,present:(frame,matched)=>{
    if(disposed)return;
    renderStarted=performance.now();controller.presentFrame(frame,matched);card.dataset.frame=String(frame);
    if(profile){
      const now=performance.now();
      if(presentedAt!==undefined)samples.push({gap:now-presentedAt,render:now-renderStarted,matched:matched.length});
      presentedAt=now;if(samples.length>120)samples.shift();
      if(samples.length&&samples.length%12===0){
        const gaps=samples.map(s=>s.gap).sort((a,b)=>a-b),renders=samples.map(s=>s.render).sort((a,b)=>a-b);
        card.dataset.playbackStats=JSON.stringify({samples:samples.length,medianGap:gaps[Math.floor(gaps.length*.5)],p95Gap:gaps[Math.floor(gaps.length*.95)],medianRender:renders[Math.floor(renders.length*.5)],matched:matched.length});
      }
    }
  },onDrop:(name,error)=>console.warn(`Snapshot camera withdrawn until ready: ${name}`,error)});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(card);
  const cleanup=()=>{
    if(disposed)return;disposed=true;observer.disconnect();pipeline.dispose();controller.dispose();
    Object.values(videos).forEach(v=>{v.pause();v.removeAttribute('src');v.load();v.remove();});
  };
  function tick(now){
    if(disposed)return;
    if(!card.isConnected){cleanup();return;}
    const playing=visible&&!card.inert&&!document.hidden;
    if(playing){
      if(previous!==undefined)elapsed+=(now-previous)*clip.fps/1000;
      const frame=start+Math.floor(elapsed)%(end-start+1);
      if(frame!==lastFrame&&!pipeline.busy){
        lastFrame=frame;void pipeline.advance(frame);
      }
    }
    if(!playing)presentedAt=undefined;
    previous=playing?now:undefined;
    if(!disposed)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return cleanup;
}
