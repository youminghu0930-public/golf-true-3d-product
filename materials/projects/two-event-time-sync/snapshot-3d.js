import {createViewerInfo} from './viewer-info.js';
import {faceOnFraming} from './snapshot-framing.js';
import {parseSnapshotEntries} from './snapshot-config.js';
import * as THREE from './vendor/three/three.module.js';
import {interpolateRotation,constrainCameraAboveGround} from './camera-flight.js';
const names = ['nose','atlas','top_head','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle','golf_club_grip','golf_club_shaft','golf_club_heel','golf_club_head'];
const edges = [[0,1],[0,2],[0,3],[0,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16],[17,19],[19,20]];
const valid = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
async function json(url) { const response = await fetch(new URL(url, import.meta.url)); if (!response.ok) throw new Error(`${url}: ${response.status}`); return response.json(); }
export async function mountSnapshots(root, { showCameras = false } = {}) {
  const response=await fetch('materials/data/snapshot.json',{cache:'no-store'});
  if(!response.ok)throw new Error(`Snapshot configuration: ${response.status}`);
  const entries=parseSnapshotEntries(await response.text());
  const title = document.createElement('h3'); title.textContent = '3D snapshot highlights'; title.className='result-subheading media-heading viewer-section-heading';
  title.append(createViewerInfo('snapshot-instructions','Snapshot controls',[
    {gesture:'Left mouse drag / one-finger drag',action:'Rotate the view.'},
    {gesture:'Right mouse drag / two-finger drag',action:'Pan the view.'},
    {gesture:'Scroll / pinch',action:'Zoom in or out.'},
  ],'section-info'));root.append(title);
  if(!entries.length)return;
  const shell=document.createElement('div');shell.className='snapshot-shell';
  shell.setAttribute('role','region');shell.setAttribute('aria-roledescription','carousel');shell.setAttribute('aria-label','3D snapshot highlights');
  const wheel=document.createElement('div');wheel.className='snapshot-wheel';shell.append(wheel);
  const dots=document.createElement('div');dots.className='snapshot-dots';dots.setAttribute('aria-label','Choose a snapshot');
  const cards=[],buttons=[];let index=0,snapshotLoad=0;
  const snapshotStates=new Map(),snapshotTickets=entries.map(()=>0),assets=new Map();
  let warming=false;
  const readAsset=url=>{
    if(!assets.has(url))assets.set(url,json(url).catch(error=>{assets.delete(url);throw error;}));
    return assets.get(url);
  };
  let releaseSnapshot=()=>{};
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
    releaseSnapshot();
    target=next;index=((target%cards.length)+cards.length)%cards.length;
    cards.forEach((card,i)=>{card.classList.toggle('is-current',i===index);card.inert=i!==index;card.setAttribute('aria-hidden',String(i!==index));buttons[i].setAttribute('aria-current',String(i===index));});
    void loadSnapshot(index,++snapshotLoad);
    cancelAnimationFrame(animation);
    const from=position,started=performance.now(),duration=Math.min(900,300+Math.max(0,Math.abs(target-from)-1)*70);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){position=target;layout();return;}
    function tick(now){const progress=Math.min(1,(now-started)/duration),phase=progress**.9,eased=phase*phase*(3-2*phase);position=from+(target-from)*eased;layout();if(progress<1)animation=requestAnimationFrame(tick);}
    animation=requestAnimationFrame(tick);
  }
  const carouselResize=new ResizeObserver(layout);carouselResize.observe(wheel);
  for (const [id, entry] of entries) {
    const card=document.createElement('article');card.className='pose-snapshot snapshot-card';
    card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',`Swing ${id}`);
    const header=document.createElement('div');header.className='snapshot-card-header';
    const heading=document.createElement('h4');heading.textContent=`Swing ${id}`;header.append(heading);card.append(header);
    const pair=document.createElement('div');pair.className='snapshot-comparison';
    for(const variant of ['before','after']){
      const panel=document.createElement('div');panel.className='snapshot-comparison-panel comparison-panel';panel.dataset.model=variant==='after'?'golf':'general';
      const label=document.createElement('div');label.className='panel-heading';
      const text=document.createElement('strong');text.textContent=variant==='before'?'Before synchronization':'After synchronization';label.append(text);
      const viewport=document.createElement('div');viewport.className='snapshot-preview-window';viewport.setAttribute('aria-busy','true');
      const placeholder=document.createElement('div');placeholder.className='snapshot-placeholder';placeholder.textContent='Loading preview…';placeholder.setAttribute('role','status');
      viewport.append(placeholder);panel.append(label,viewport);pair.append(panel);
    }
    card.append(pair);
    wheel.append(card);cards.push(card);carouselResize.observe(card);
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Show swing ${id}`);button.append(document.createElement('span'));
    const position=cards.length-1;button.onclick=()=>{let delta=(position-((target%cards.length)+cards.length)%cards.length+cards.length)%cards.length;if(delta>cards.length/2)delta-=cards.length;select(target+delta);};dots.append(button);buttons.push(button);
  }
  for(const [direction,label,step] of [['previous','Previous snapshot',-1],['next','Next snapshot',1]]) {
    const button=document.createElement('button');button.type='button';button.className=`snapshot-arrow snapshot-${direction}`;button.setAttribute('aria-label',label);
    button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${step<0?'M15 5l-7 7 7 7':'M9 5l7 7-7 7'}"/></svg>`;
    button.onclick=()=>select(target+step);button.hidden=entries.length<2;shell.append(button);
  }
  root.append(shell,dots);
  select(0);
  async function warmPreviews(){
    if(warming)return;
    warming=true;
    try{
      for(let i=0;i<entries.length;i++){
        if(!root.isConnected||document.hidden)break;
        if(i!==index&&cards[i].dataset.previewReady!=='true')await loadSnapshot(i,0,true);
      }
    }finally{warming=false;}
  }
  async function loadSnapshot(i,load,previewOnly=false){
    const [id,entry]=entries[i],ticket=++snapshotTickets[i];
    const stale=()=>ticket!==snapshotTickets[i]||(previewOnly?i===index:load!==snapshotLoad);
    const pair=cards[i].querySelector('.snapshot-comparison');
    const viewports=[...pair.querySelectorAll('.snapshot-preview-window')];
    const stages=[];let controllers=[];
    const discard=()=>{controllers.forEach(controller=>controller.dispose());stages.forEach(stage=>stage.remove());};
    try {
      const duration=entry.duration,stay=entry.stay??0;
      if(!Number.isFinite(duration)||duration<=0)throw new Error('Snapshot duration must be a positive number of seconds');
      if(!Number.isFinite(stay)||stay<0)throw new Error('Snapshot stay must be a nonnegative number of seconds');
      viewports.forEach(viewport=>viewport.setAttribute('aria-busy','true'));
      const [records,detections]=await Promise.all([
        Promise.all(['before','after'].map(variant=>readAsset(`materials/data/3d_results/${variant}/${encodeURIComponent(id)}.json`))),
        readAsset(`materials/data/2d_detections/${encodeURIComponent(id)}/face-on.json`)
      ]);
      if(stale())return;
      const framing=faceOnFraming(detections),counts=records.map(record=>record.reconstruction.length);
      if(counts.some(count=>!Number.isInteger(count)||count<1))throw new Error('Snapshot sequences must contain frames');
      const linkedControllers=[];
      const shareInteraction=state=>{snapshotStates.set(id,{...snapshotStates.get(id),interaction:state});linkedControllers.forEach(controller=>controller.setInteraction(state));};
      const results=await Promise.allSettled(['before','after'].map((variant,j)=>{
        const stage=document.createElement('div');stage.className='snapshot-scene-stage';stage.style.visibility='hidden';viewports[j].append(stage);stages.push(stage);
        return mountPoseScene(stage,id,{joints:entry.joints,range:[0,counts[j]-1],fps:counts[j]/duration},{showCameras,autoPlay:false,resultVariant:variant,reconstructionData:records[j],detectionShaftHistory:true,showTitle:false,centerOnBody:true,faceOnCrop:framing,onInteraction:shareInteraction,poseColor:variant==='before'?'#ffce69':'#63f5b4'});
      }));
      controllers=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
      const failed=results.find(result=>result.status==='rejected');
      if(failed)throw failed.reason;
      if(stale()){discard();return;}
      const retreat=Math.max(...controllers.map(controller=>controller.groundRetreat()));
      const bounds=controllers.map(controller=>controller.fitGround(retreat));
      const left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right));
      const top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom));
      Object.assign(framing,{x:(left+right)/2,y:(top+bottom)/2,width:(right-left)*1.12,height:(bottom-top)*1.12});
      const saved=snapshotStates.get(id);
      let elapsed=saved?.elapsed??0,previous,animationHandle;
      controllers.forEach((controller,j)=>{if(saved?.interaction)controller.setInteraction(saved.interaction);controller.setFrame(Math.min(counts[j]-1,Math.floor(elapsed/duration*counts[j])));});
      const savePosters=()=>{
        // Capture both renders before replacing either viewport.
        const posters=controllers.map((controller,j)=>{
          const poster=document.createElement('img');poster.className='snapshot-still';poster.alt=`${j?'After':'Before'} synchronization · Swing ${id}`;poster.src=controller.capturePreview();return poster;
        });
        viewports.forEach((viewport,j)=>{viewport.replaceChildren(posters[j]);viewport.setAttribute('aria-busy','false');});
        cards[i].dataset.previewReady='true';
      };
      if(previewOnly){savePosters();discard();return;}
      // Reveal both panels together; preserve the previous still until ready.
      viewports.forEach((viewport,j)=>{viewport.replaceChildren(stages[j]);stages[j].style.visibility='';viewport.setAttribute('aria-busy','false');});
      cards[i].dataset.previewReady='true';
      linkedControllers.push(...controllers);
      let visible=false;
      const observer=new IntersectionObserver(items=>{visible=items[0].isIntersecting;});observer.observe(cards[i]);
      releaseSnapshot=()=>{
        snapshotStates.set(id,{...snapshotStates.get(id),elapsed});
        cancelAnimationFrame(animationHandle);observer.disconnect();
        try{savePosters();}finally{discard();releaseSnapshot=()=>{};}
      };
      function tick(now){
        if(stale())return;
        if(!cards[i].isConnected){observer.disconnect();discard();return;}
        const active=visible&&!document.hidden&&!cards[i].inert;
        if(active&&previous!==undefined){elapsed=(elapsed+(now-previous)/1000)%(duration+stay);controllers.forEach((controller,j)=>controller.setFrame(Math.min(counts[j]-1,Math.floor(elapsed/duration*counts[j]))));}
        previous=active?now:undefined;animationHandle=requestAnimationFrame(tick);
      }
      animationHandle=requestAnimationFrame(tick);
      void warmPreviews();
    }catch(error){
      discard();
      if(!stale()){
        console.error(error);
        viewports.forEach(viewport=>{
          viewport.setAttribute('aria-busy','false');
          const placeholder=viewport.querySelector('.snapshot-placeholder');
          if(placeholder)placeholder.textContent='Preview unavailable. Select this swing to retry.';
        });
      }
    }
  }

}
export async function mountPoseScene(card, id, entry, { showCameras = false, autoPlay = true, cameraVideos = {}, rawDetections = {}, bannerMode = false, resultVariant = 'after', snapshotHistory = false, detectionShaftHistory = false, showTitle = true, centerOnBody = false, poseColor, faceOnCrop, onInteraction, reconstructionData } = {}) {
  const {reconstruction: frames, calibration} = reconstructionData??await json(`materials/data/3d_results/${resultVariant}/${encodeURIComponent(id)}.json`);
  const configuredRange = entry.range ?? entry.ranage;
  const range = Array.isArray(configuredRange)
    ? configuredRange.map((value,index)=>value === null ? (index === 0 ? 0 : frames.length-1) : value)
    : configuredRange;
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 0 || range[1] < range[0] || range[1] >= frames.length) throw new Error('Invalid snapshot frame range');
  const [start,end] = range;
  const joints = (entry.joints || []).map(name => name === 'golf_club_haed' ? 'golf_club_head' : name);
  if (joints.some(name => !names.includes(name))) throw new Error('Unknown trail joint');
  let frame = Math.min(end, Math.max(start, entry.highlight_index ?? start));
  let yaw = 0, pitch = 0, zoom = 1, distanceScale = 1;
  const heading = document.createElement('h4'); heading.textContent = `Swing ${id}`; heading.className='media-item-title';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `Rotatable 3D pose for swing ${id}`); canvas.setAttribute('role','img');
  if(showTitle)card.append(heading);
  card.append(canvas);
  const points = frames.slice(start,end+1).flat().filter(valid);
  if (!points.length) throw new Error('No valid 3D points');
  const min = [0,1,2].map(axis => Math.min(...points.map(p=>p[axis])));
  const max = [0,1,2].map(axis => Math.max(...points.map(p=>p[axis])));
  const center = min.map((v,i)=>(v+max[i])/2);
  let radius = Math.max(...points.map(p=>Math.hypot(...p.map((v,i)=>v-center[i])))) || 1;
  const median = values => { const sorted = values.sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; };
  const selectedFrames = frames.slice(start,end+1);
  const groundY = median(selectedFrames.map(pose => Math.max(...[pose[15],pose[16]].filter(valid).map(p=>p[1]))).filter(Number.isFinite));
  const height = groundY - median(selectedFrames.map(pose=>pose[2]).filter(valid).map(p=>p[1]));
  const targetStep = (height > 0 ? height : radius*2)/8;
  const power = 10**Math.floor(Math.log10(targetStep));
  const gridStep = [1,2,5,10].map(n=>n*power).reduce((a,b)=>Math.abs(a-targetStep)<Math.abs(b-targetStep)?a:b);
  // Use the median hip midpoint as the fixed body center for this snapshot.
  const bodyCenters = selectedFrames.filter(pose=>valid(pose[11])&&valid(pose[12])).map(pose=>pose[11].map((v,i)=>(v+pose[12][i])/2));
  const groundX = bodyCenters.length ? median(bodyCenters.map(p=>p[0])) : center[0];
  const groundZ = bodyCenters.length ? median(bodyCenters.map(p=>p[2])) : center[2];
  if(centerOnBody){
    // Center the golfer, rather than the club's asymmetric motion bounds.
    center[0]=groundX;center[2]=groundZ;
    const headHeights=selectedFrames.map(pose=>pose[2]).filter(valid).map(p=>p[1]);
    if(headHeights.length)center[1]=(groundY+median(headHeights))/2;
    radius=Math.max(...points.map(p=>Math.hypot(...p.map((v,i)=>v-center[i]))))||1;
  }
  const extent = Math.max(...points.map(p=>Math.max(Math.abs(p[0]-groundX),Math.abs(p[2]-groundZ)))) || gridStep;
  // Rotate camera coordinates into a right-handed rendering space:
  // source +X is right, source -Y is up, and source +Z points into the screen.
  const unit = height > 0 ? height : radius;
  const vector = p => new THREE.Vector3((p[0]-center[0])/unit, -(p[1]-center[1])/unit, -(p[2]-center[2])/unit);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f7f0');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, bannerMode ? 2 : autoPlay ? 2 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const camera = new THREE.PerspectiveCamera(45,1,.01,100);
  const bound = radius/unit;
  scene.add(new THREE.HemisphereLight('#ffffff','#7d8974',2));
  const light = new THREE.DirectionalLight('#fff6df',3);
  light.position.set(-2,4,3); light.castShadow = true;
  light.shadow.mapSize.set(autoPlay?2048:1024,autoPlay?2048:1024);
  const shadowExtent = Math.max(3,bound*1.8);
  Object.assign(light.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,near:.1,far:20});
  light.shadow.normalBias = .005; light.shadow.bias = -.00015;
  scene.add(light);
  const fill = new THREE.DirectionalLight('#dceaff',1); fill.position.set(3,1,-3); scene.add(fill);
  const material = color => new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.08});
  const boneMaterial = material(poseColor||'#63f5b4');
  if(bannerMode)boneMaterial.transparent=true;
  const jointMaterials = {left:material('#3b82f6'),right:material('#ef4444'),center:boneMaterial};
  if(bannerMode)Object.values(jointMaterials).forEach(surface=>{surface.transparent=true;});
  const boneRadius = .012, jointRadius = .022;
  const cylinder = new THREE.CylinderGeometry(1,1,1,16);
  const sphere = new THREE.SphereGeometry(jointRadius,24,16);
  const axis = new THREE.Vector3(0,1,0);
  const bones = edges.map(([a,b])=>{
    const mesh = new THREE.Mesh(cylinder,boneMaterial); mesh.castShadow = mesh.receiveShadow = true;if(bannerMode)mesh.renderOrder=2;scene.add(mesh);return {a,b,mesh};
  });
  const dots = names.map((name,i)=>{
    if(i===18)return null;
    const mesh = new THREE.Mesh(sphere,jointMaterials[name.startsWith('left_')?'left':name.startsWith('right_')?'right':'center']);
    mesh.castShadow = mesh.receiveShadow = true;if(bannerMode)mesh.renderOrder=3; scene.add(mesh); return mesh;
  });
  // Prebuild timestamped solid trail segments; reveal only samples reached by playback.
  const historyFraction=detectionShaftHistory ? .8 : .3;
  const trails=[];
  const trailCylinder=new THREE.CylinderGeometry(1,1,1,8);
  const trailSphere=new THREE.SphereGeometry(.006,8,6);
  const transform=new THREE.Object3D();
  const fps = Number.isFinite(entry.fps) && entry.fps > 0 ? entry.fps : 60;
  // One fixed scale across the full reconstruction, including frames outside
  // the displayed range, keeps red reserved for the sequence's peak speed.
  const speeds = new Map(); let peakSpeed=0;
  for(const name of bannerMode?['golf_club_head']:joints){
    const index=names.indexOf(name),values=new Float64Array(frames.length);
    for(let f=1;f<frames.length;f++){
      const a=frames[f-1]?.[index],b=frames[f]?.[index];
      if(!valid(a)||!valid(b))continue;
      values[f]=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])*fps;
      peakSpeed=Math.max(peakSpeed,values[f]);
    }
    speeds.set(name,values);
  }
  joints.forEach(name=>{
    const index=names.indexOf(name),segments=[],samples=[];
    for(let f=start;f<=end;f++) {
      const point=frames[f]?.[index];if(!valid(point))continue;
      const to=vector(point);samples.push({point:to,frame:f});
      const previous=frames[f-1]?.[index];
      if(f===start||!valid(previous))continue;
      const from=vector(previous),delta=to.clone().sub(from),length=delta.length();
      if(length>1e-6)segments.push({from,to,delta,length,frame:f});
    }
    const trailMaterial=material('#ffffff');
    trailMaterial.transparent=true;
    trailMaterial.depthWrite=snapshotHistory;
    // Smooth blending with depth writes limits overlap buildup without dithering.
    if(snapshotHistory)trailMaterial.depthFunc=THREE.LessDepth;
    trailMaterial.customProgramCacheKey=()=>snapshotHistory?'snapshot-full-history':'video-short-history';
    trailMaterial.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float historyFrame;\nvarying float trailAge;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntrailAge = historyFrame;');
      shader.fragmentShader='uniform float playbackFrame;\nuniform float historyFrames;\nvarying float trailAge;\n'+shader.fragmentShader;
      const fade=snapshotHistory
        ? `if (trailAge > playbackFrame) discard;
float progress = playbackFrame > ${start.toFixed(1)} ? clamp((trailAge - ${start.toFixed(1)}) / (playbackFrame - ${start.toFixed(1)}), 0.0, 1.0) : 1.0;
diffuseColor.a *= mix(0.1, 1.0, progress);`
        : 'float age = playbackFrame - trailAge;\nif (age < 0.0 || age >= historyFrames) discard;\ndiffuseColor.a *= 1.0 - age / historyFrames;';
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n'+fade);
      shader.uniforms.playbackFrame={value:frame};
      shader.uniforms.historyFrames={value:Math.max(1,(end-start+1)*historyFraction)};
      trailMaterial.userData.shader=shader;
    };
    for(const [items,geometry,isSegment] of [[segments,trailCylinder,true],[samples,trailSphere,false]]) {
      if(!items.length)continue;
      const instanceGeometry=geometry.clone();
      instanceGeometry.setAttribute('historyFrame',new THREE.InstancedBufferAttribute(new Float32Array(items.map(item=>item.frame)),1));
      const mesh=new THREE.InstancedMesh(instanceGeometry,trailMaterial,items.length);
      items.forEach((item,i)=>{
        transform.position.copy(isSegment?item.from.clone().add(item.to).multiplyScalar(.5):item.point);
        transform.quaternion.identity();transform.scale.set(1,1,1);
        if(isSegment){transform.quaternion.setFromUnitVectors(axis,item.delta.clone().normalize());transform.scale.set(.006,item.length,.006);}
        transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
        const relativeSpeed=peakSpeed>0?speeds.get(name)[item.frame]/peakSpeed:0;
        mesh.setColorAt(i,new THREE.Color().setHSL((1-relativeSpeed)*2/3,1,.5));
      });
      mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
      mesh.receiveShadow=true;scene.add(mesh);
      trails.push({mesh,frames:items.map(item=>item.frame)});
    }
  });
  // Shaft sampling is independent of the fade style: snapshots include every
  // valid detected frame (as does the banner); video scenes retain time sampling.
  const clubHistory=[];
  const historyStride=(snapshotHistory||detectionShaftHistory||bannerMode)?1:Math.max(1,Math.round(fps*.1));
  const historyWindow=Math.max(1,(end-start+1)*historyFraction);
  const clubSpeeds=speeds.get('golf_club_head') || speeds.get(joints[0]);
  for(let f=start;f<=end;f+=historyStride){
    const segments=[];
    for(const [a,b] of [[17,19],[19,20]]){
      if(!valid(frames[f]?.[a])||!valid(frames[f]?.[b]))continue;
      const from=vector(frames[f][a]),to=vector(frames[f][b]),delta=to.clone().sub(from),length=delta.length();
      if(length>1e-6)segments.push({from,to,delta,length});
    }
    if(!segments.length)continue;
    const relativeSpeed=peakSpeed>0&&clubSpeeds?clubSpeeds[f]/peakSpeed:0;
    const historyMaterial=material(new THREE.Color().setHSL((1-relativeSpeed)*2/3,1,.5));
    historyMaterial.transparent=true;
    historyMaterial.depthWrite=snapshotHistory;
    if(snapshotHistory)historyMaterial.depthFunc=THREE.LessDepth;
    const mesh=new THREE.InstancedMesh(trailCylinder,historyMaterial,segments.length);
    segments.forEach((item,i)=>{
      transform.position.copy(item.from).add(item.to).multiplyScalar(.5);
      transform.quaternion.setFromUnitVectors(axis,item.delta.clone().normalize());
      transform.scale.set(.0035,item.length,.0035);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    // Fading history receives light, but does not cast opaque shadows.
    mesh.receiveShadow=true;if(bannerMode)mesh.renderOrder=1.5;else if(snapshotHistory)mesh.renderOrder=end-f+1;scene.add(mesh);clubHistory.push({mesh,frame:f});
  }
  const floorPosition = vector([groundX,groundY+jointRadius*unit,groundZ]);
  const cameraGroundExtent=showCameras
    ? Math.max(0,...Object.values(calibration || {}).filter(cal=>valid(cal.t)).map(cal=>Math.max(Math.abs(cal.t[0]-groundX),Math.abs(cal.t[2]-groundZ))))
    : 0;
  // Include camera positions with one grid cell of edge clearance in video scenes.
  const floorExtent=showCameras?Math.max(extent,cameraGroundExtent+Math.max(gridStep,.25*unit)):extent;
  const floorSize = 2*floorExtent/unit;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(floorSize,.025,floorSize),new THREE.MeshStandardMaterial({color:'#e2eadf',roughness:.95,transparent:true}));
  floor.position.copy(floorPosition);floor.position.y-=.0125;floor.receiveShadow=true;floor.renderOrder=-20;scene.add(floor);
  // Keep exact grid spacing while clipping lines to the exact ground size.
  const half = floorSize/2, step = gridStep/unit*(showCameras&&!bannerMode?2:1), gridPoints = [];
  for(let i=-Math.floor(half/step);i<=Math.floor(half/step);i++) {
    const offset=i*step;
    gridPoints.push(offset,0,-half,offset,0,half,-half,0,offset,half,0,offset);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3));
  const grid = new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:'#c5d1c0'}));
  grid.position.copy(floorPosition);grid.position.y+=.001;grid.renderOrder=-19;scene.add(grid);
  // Notebook convention: world = R * camera + t; t is the camera center.
  // Camera models are decorative scene objects, never part of the orbit target.
  const rawOverlays=[],cameraDecorations=[],cameraPresets=new Map();
  let selectedView='free-view',cameraFlight,flightHandle,freeViewState;
  let presetYaw=0,presetPitch=0;
  const cameraObjects = new THREE.Group(); scene.add(cameraObjects);
  const mediaCleanup=[];
  // Tripods live outside cameraObjects so their grounded feet do not feed back
  // into the lowest-object calculation and keep lowering the ground.
  const tripods=[];
  const tripodMaterial=material('#46545a');
  const footMaterial=material('#283438');
  const tripodGeometry=new THREE.CylinderGeometry(1,1,1,12);
  const footGeometry=new THREE.SphereGeometry(1,16,10);
  function tripodRod(group){const mesh=new THREE.Mesh(tripodGeometry,tripodMaterial);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
  function positionRod(mesh,a,b,radius){const delta=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(axis,delta.clone().normalize());mesh.scale.set(radius,delta.length(),radius);}
  function updateTripods(surfaceY){
    for(const tripod of tripods){
      const top=tripod.position.clone();
      const height=Math.max(.03,top.y-surfaceY);
      const hub=top.clone();hub.y=surfaceY+height*.65;
      positionRod(tripod.column,top,hub,.012);
      for(let i=0;i<3;i++){
        const angle=i*Math.PI*2/3+Math.PI/6,spread=Math.min(.22,height*.35);
        const foot=new THREE.Vector3(top.x+Math.cos(angle)*spread,surfaceY+.009,top.z+Math.sin(angle)*spread);
        positionRod(tripod.legs[i],hub,foot,.009);
        tripod.feet[i].position.copy(foot);tripod.feet[i].scale.set(.018,.009,.018);
      }
    }
  }
  let cameraBound = bound;
  for(const [view,cal] of Object.entries(showCameras ? calibration || {} : {})) {
    const {R,t}=cal;
    if(!Array.isArray(R)||R.length!==3||!R.every(row=>valid(row))||!valid(t))continue;
    const cameraToWorld = v => R.map(row=>row.reduce((sum,value,j)=>sum+value*v[j],0));
    const worldPosition=t;
    const position=vector(worldPosition);
    cameraBound=Math.max(cameraBound,position.length()+.25);
    const direction = v => {const p=cameraToWorld(v);return new THREE.Vector3(p[0],-p[1],-p[2]);};
    const right=direction([1,0,0]),up=direction([0,-1,0]),back=direction([0,0,-1]);
    const group=new THREE.Group();group.position.copy(position);
    group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,back));
    cameraObjects.add(group);
    const tripodGroup=new THREE.Group();tripodGroup.userData.cameraView=view;scene.add(tripodGroup);cameraDecorations.push(tripodGroup);
    // Mount inside the body's underside, including its local rearward offset.
    const tripodMount=new THREE.Vector3(0,-.045,.045).applyQuaternion(group.quaternion).add(position);
    const tripod={position:tripodMount,column:tripodRod(tripodGroup),legs:[],feet:[]};
    for(let i=0;i<3;i++){
      tripod.legs.push(tripodRod(tripodGroup));
      const foot=new THREE.Mesh(footGeometry,footMaterial);foot.castShadow=foot.receiveShadow=true;tripodGroup.add(foot);tripod.feet.push(foot);
    }
    tripods.push(tripod);
    const color=view==='face-on'?'#ef4444':'#3b82f6';
    const bodyMaterial=material(color),darkMaterial=material('#34474b');
    const addCameraPart=(geometry,surface,position)=>{
      const mesh=new THREE.Mesh(geometry,surface);mesh.position.set(...position);
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
    };
    addCameraPart(new THREE.BoxGeometry(.18,.12,.09),bodyMaterial,[0,0,.045]);
    addCameraPart(new THREE.BoxGeometry(.055,.04,.055),darkMaterial,[.045,.078,.045]);
    addCameraPart(new THREE.BoxGeometry(.035,.09,.072),darkMaterial,[-.097,-.005,.045]);
    const lens=addCameraPart(new THREE.CylinderGeometry(.048,.04,.084,32,1,true),darkMaterial,[0,0,-.04]);
    lens.rotation.x=Math.PI/2;
    const glass=addCameraPart(new THREE.CircleGeometry(.034,24),new THREE.MeshStandardMaterial({color:'#69b8ce',metalness:.55,roughness:.16}),[0,0,-.082]);
    glass.rotation.y=Math.PI;
    const lensRim=addCameraPart(new THREE.RingGeometry(.034,.04,32),darkMaterial,[0,0,-.082]);
    lensRim.rotation.y=Math.PI;
    // Visualize the actual optical axis, not a look-at aimed at the golfer.
    const forward=direction([0,0,1]).normalize();
    // Place planes near their cameras, one-third of the camera–golfer distance.
    const bodyPoint=bodyCenters.length?vector([groundX,median(bodyCenters.map(p=>p[1])),groundZ]):new THREE.Vector3();
    const depth=position.distanceTo(bodyPoint)/3;
    const K=cal.intrinsic;
    const sx=K?.[0]?.[0]>0?Math.min(.7,K[0][2]/K[0][0]):.35;
    const sy=K?.[1]?.[1]>0?Math.min(.7,K[1][2]/K[1][1]):.35;
    const corners=[[-sx,-sy],[sx,-sy],[sx,sy],[-sx,sy]].map(([x,y])=>new THREE.Vector3(x*depth,y*depth,-depth));
    const segments=[];
    for(let i=0;i<4;i++){segments.push(0,0,0,...corners[i].toArray(),...corners[i].toArray(),...corners[(i+1)%4].toArray());}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));
    group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#78a84a',transparent:true,opacity:.8})));
    group.children.forEach(part=>{part.userData.cameraView=view;});
    cameraDecorations.push(...group.children);
    for(const corner of corners){
      const world=corner.clone().applyQuaternion(group.quaternion).add(position);
      cameraBound=Math.max(cameraBound,world.length()+.15);
    }
    cameraPresets.set(view,{position:position.clone(),rotation:group.quaternion.clone(),K:cal.intrinsic,video:cameraVideos[view]});
    const raw=rawDetections[view];
    if(raw?.joints&&raw?.pred){
      const mapping=names.map(name=>raw.joints.indexOf(name));
      const overlayColor='#ffce69';
      const boneMeshes=[];const rawBoneGeometry=new THREE.CylinderGeometry(1,1,1,8);const rawBoneMaterial=new THREE.MeshBasicMaterial({color:overlayColor,toneMapped:false,transparent:true,depthWrite:false});
      const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(names.length*3),3));
      pointGeometry.setAttribute('jointColor',new THREE.BufferAttribute(new Float32Array(names.length*3),3));
      const dotMaterial=new THREE.ShaderMaterial({
        uniforms:{ringColor:{value:new THREE.Color(overlayColor)},pointSize:{value:16*renderer.getPixelRatio()}},
        vertexShader:'attribute vec3 jointColor; varying vec3 dotColor; uniform float pointSize; void main(){dotColor=jointColor;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=pointSize;}',
        fragmentShader:'uniform vec3 ringColor;varying vec3 dotColor;void main(){float d=length(gl_PointCoord-vec2(.5));float aa=fwidth(d);float outer=1.0-smoothstep(.5-aa,.5,d);float ring=smoothstep(.35-aa,.35+aa,d)*outer;float dot=1.0-smoothstep(.29-aa,.29+aa,d);float alpha=max(ring,dot);if(alpha<.01)discard;gl_FragColor=vec4(mix(ringColor,dotColor,dot),alpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
        transparent:true,depthWrite:false,toneMapped:false
      });
      for(const side of [1,-1]){
        const overlay=new THREE.Group();overlay.position.z=-depth+side*.0005;
        const bones=new THREE.InstancedMesh(rawBoneGeometry,rawBoneMaterial,edges.length);bones.frustumCulled=false;bones.renderOrder=1;overlay.add(bones);boneMeshes.push(bones);
        const joints=new THREE.Points(pointGeometry,dotMaterial);joints.renderOrder=2;overlay.add(joints);
        group.add(overlay);
      }
      rawOverlays.push({raw,mapping,overlayColor,boneMeshes,dotMaterial,pointGeometry,K,depth,group});
    }
    const video=cameraVideos[view];
    if(video){
      const videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;
      const screenMaterial=new THREE.MeshBasicMaterial({map:videoTexture,side:THREE.DoubleSide,toneMapped:false,transparent:true,opacity:bannerMode?1:.3,depthWrite:false});
      if(bannerMode){screenMaterial.depthTest=false;}
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(1,1),screenMaterial);if(bannerMode)screen.renderOrder=1;
      const positionScreen=()=>{
        const width=video.videoWidth||K[0][2]*2,height=video.videoHeight||K[1][2]*2;
        screen.scale.set(width*depth/K[0][0],height*depth/K[1][1],1);
        screen.position.set((width/2-K[0][2])*depth/K[0][0],-(height/2-K[1][2])*depth/K[1][1],-depth);
        videoTexture.needsUpdate=true;updateGround();draw();
      };
      group.add(screen);
      screen.visible=false;
      const refresh=()=>{if(video.readyState>=2){screen.visible=true;positionScreen();}};
      for(const event of ['loadeddata','resize'])video.addEventListener(event,refresh);
      mediaCleanup.push(()=>{for(const event of ['loadeddata','resize'])video.removeEventListener(event,refresh);});
      const redraw=()=>{if(video.readyState>=2){screen.visible=true;videoTexture.needsUpdate=true;draw();}};
      video.addEventListener('seeked',redraw);mediaCleanup.push(()=>video.removeEventListener('seeked',redraw));
      // Dimensions are known from intrinsics even before the video decodes.
      const width=video.videoWidth||K[0][2]*2,height=video.videoHeight||K[1][2]*2;
      screen.scale.set(width*depth/K[0][0],height*depth/K[1][1],1);
      screen.position.set((width/2-K[0][2])*depth/K[0][0],-(height/2-K[1][2])*depth/K[1][1],-depth);
      if(video.readyState>=2)screen.visible=true;
    }

  }
  // Ground height is fixed for the entire reconstruction, not the current frame
  // or the selected playback range. Include sphere/tube thickness below points.
  let lowestPoseY=Infinity;
  for(const pose of frames)for(let i=0;i<pose.length;i++){
    if(i===18||!valid(pose[i]))continue;
    lowestPoseY=Math.min(lowestPoseY,vector(pose[i]).y-jointRadius);
  }
  function updateGround(){
    cameraObjects.updateWorldMatrix(true,true);
    const cameraBounds=new THREE.Box3().setFromObject(cameraObjects);
    const lowestObjectY=Math.min(lowestPoseY,cameraBounds.isEmpty()?Infinity:cameraBounds.min.y);
    const surfaceY=lowestObjectY-.002;
    floor.position.y=surfaceY-.0125;
    grid.position.y=surfaceY+.001;
    updateTripods(surfaceY);
  }
  updateGround();
  floor.visible=grid.visible=!bannerMode;
  // Planar distance guides: horizontal XZ distance, not camera slant distance.
  const distanceGuides=new THREE.Group();distanceGuides.visible=showCameras&&!bannerMode;scene.add(distanceGuides);
  const ringGeometry=new THREE.RingGeometry(.994,1.006,192);
  const dotGeometry=new THREE.CircleGeometry(1.22,48);
  function groundRing(color){
    const ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color,toneMapped:false,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;distanceGuides.add(ring);return ring;
  }
  function groundDot(color){
    const dot=new THREE.Mesh(dotGeometry,new THREE.MeshBasicMaterial({color,toneMapped:false,side:THREE.DoubleSide}));
    dot.rotation.x=-Math.PI/2;distanceGuides.add(dot);return dot;
  }
  function groundConnection(color){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));geometry.setIndex([0,1,2,0,2,3]);
    const line=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,toneMapped:false,side:THREE.DoubleSide}));line.frustumCulled=false;
    distanceGuides.add(line);return line;
  }
  const calibratedRings=[];
  for(const [view,preset] of cameraPresets){
    const color=view==='face-on'?'#ef4444':'#3b82f6';
    calibratedRings.push({position:preset.position,ring:groundRing(color),marker:groundDot(color),connection:groundConnection(color)});
  }
  const centerRing=groundDot('#63f5b4');centerRing.scale.set(.06,.06,1);
  const centerCross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.065,0,0),new THREE.Vector3(.065,0,0),new THREE.Vector3(0,0,-.065),new THREE.Vector3(0,0,.065)
  ]),new THREE.LineBasicMaterial({color:'#63f5b4',toneMapped:false}));distanceGuides.add(centerCross);
  const viewerRing=groundRing('#63f5b4'),viewerMarker=groundDot('#63f5b4'),viewerConnection=groundConnection('#63f5b4');
  const viewerCross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.045,0,0),new THREE.Vector3(.045,0,0),new THREE.Vector3(0,0,-.045),new THREE.Vector3(0,0,.045)
  ]),new THREE.LineBasicMaterial({color:'#63f5b4',toneMapped:false}));distanceGuides.add(viewerCross);
  // Ground guides are opaque, depth-tested scene surfaces, rendered before
  // transparent video planes so normal 3D occlusion and blending are preserved.
  distanceGuides.traverse(guide=>{
    if(guide.material){
      guide.renderOrder=10;guide.frustumCulled=false;
      guide.material.transparent=false;guide.material.depthWrite=true;guide.material.depthTest=true;
      guide.material.polygonOffset=true;guide.material.polygonOffsetFactor=-2;guide.material.polygonOffsetUnits=-2;
    }
  });
  // Viewing-camera guides take precedence where ground guides overlap.
  for(const guide of [viewerRing,viewerMarker,viewerConnection,viewerCross,centerRing,centerCross]){
    guide.renderOrder=11;guide.material.depthWrite=true;guide.material.polygonOffsetFactor=-4;guide.material.polygonOffsetUnits=-4;
  }
  function updateDistanceGuides(){
    if(!distanceGuides.visible)return;
    const y=floor.position.y+.0125+.003;
    centerRing.position.set(0,y,0);centerCross.position.set(0,y,0);
    const place=(ring,marker,connection,position)=>{
      const radius=Math.hypot(position.x,position.z);
      ring.position.set(0,y,0);ring.scale.set(radius,radius,1);
      marker.position.set(position.x,y,position.z);marker.scale.set(.055,.055,1);
      const length=Math.hypot(position.x,position.z)||1;
      const updateLine=(mesh,width,height)=>{
        const vertices=mesh.geometry.attributes.position;
        const px=-position.z/length*width,pz=position.x/length*width;
        vertices.setXYZ(0,px,height,pz);vertices.setXYZ(1,position.x+px,height,position.z+pz);
        vertices.setXYZ(2,position.x-px,height,position.z-pz);vertices.setXYZ(3,-px,height,-pz);vertices.needsUpdate=true;
      };
      updateLine(connection,.008,y);
    };
    calibratedRings.forEach(item=>place(item.ring,item.marker,item.connection,item.position));
    place(viewerRing,viewerMarker,viewerConnection,camera.position);
    viewerCross.position.copy(viewerMarker.position);
  }
  if(faceOnCrop){
    const cal=calibration?.['face-on'];
    if(!cal?.intrinsic||!cal?.R||!valid(cal.t))throw new Error('Missing face-on camera calibration');
    const direction=v=>{const p=cal.R.map(row=>row.reduce((sum,n,j)=>sum+n*v[j],0));return new THREE.Vector3(p[0],-p[1],-p[2]);};
    const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(direction([1,0,0]),direction([0,-1,0]),direction([0,0,-1])));
    cameraPresets.set('face-on',{position:vector(cal.t),rotation,K:cal.intrinsic});
    selectedView='face-on';
  }
  const enablePan=!bannerMode&&(Boolean(faceOnCrop)||Object.keys(cameraVideos).length>0);
  let panX=0,panY=0;
  // Frame the pose and its motion, independently of camera/plane extents.
  distanceScale=1;
  if(Object.keys(cameraVideos).length){yaw=-.65;pitch=.3;}
  let snapshotRetreat=0;
  let renderWidth=0,renderHeight=0;
  function draw() {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    if(w!==renderWidth||h!==renderHeight){renderer.setSize(w,h,false);renderWidth=w;renderHeight=h;}
    camera.aspect=w/h;
    camera.zoom=zoom;
    // Shift the projection for panning, leaving the world-space orbit center fixed.
    if(enablePan)camera.setViewOffset(w,h,-panX,-panY,w,h);
    // Fit the complete motion using the narrower viewport angle.
    camera.fov=45;
    const verticalHalfFov=THREE.MathUtils.degToRad(camera.fov/2);
    const halfFov=Math.min(verticalHalfFov,Math.atan(Math.tan(verticalHalfFov)*camera.aspect));
    const distance=bound*distanceScale/(Math.sin(halfFov)*.84);
    camera.far=Math.max(100,distance+bound*5);
    const minimumCameraY=floor.position.y+.0125+.02;
    if(selectedView==='free-view')pitch=Math.max(pitch,Math.asin(Math.max(-.999,Math.min(.999,minimumCameraY/distance))));
    camera.position.set(distance*Math.sin(yaw)*Math.cos(pitch),distance*Math.sin(pitch),distance*Math.cos(yaw)*Math.cos(pitch));
    camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.fov=45;
    cameraDecorations.forEach(object=>{object.visible=bannerMode||object.userData.cameraView===selectedView?false:selectedView==='free-view'||(cameraFlight&&cameraFlight.progress<.75);});
    const preset=cameraPresets.get(selectedView);
    if(preset){
      const width=preset.video?.videoWidth||preset.K[0][2]*2,height=preset.video?.videoHeight||preset.K[1][2]*2;
      // Navigation is an offset from calibration, never a mutation of R/t/K.
      const localOrbit=new THREE.Quaternion().setFromEuler(new THREE.Euler(presetPitch,presetYaw,0,'YXZ'));
      const orbit=preset.rotation.clone().multiply(localOrbit).multiply(preset.rotation.clone().invert());
      camera.position.copy(preset.position).multiplyScalar(distanceScale).applyQuaternion(orbit);
      camera.quaternion.copy(orbit).multiply(preset.rotation);
      if(faceOnCrop)camera.position.add(new THREE.Vector3(0,0,snapshotRetreat).applyQuaternion(camera.quaternion));
      camera.fov=THREE.MathUtils.radToDeg(2*Math.atan((bannerMode?width/(2*preset.K[0][0]*camera.aspect):Math.max(height/(2*preset.K[1][1]),width/(2*preset.K[0][0]*camera.aspect)))));
    }
    if(cameraFlight){
      const t=cameraFlight.progress;
      camera.position.lerpVectors(cameraFlight.position,camera.position,t);
      interpolateRotation(camera.quaternion,cameraFlight.rotation,camera.quaternion,t);
      camera.fov=THREE.MathUtils.lerp(cameraFlight.fov,camera.fov,t);
      camera.zoom=THREE.MathUtils.lerp(cameraFlight.zoom,camera.zoom,t);
      if(enablePan)camera.setViewOffset(w,h,THREE.MathUtils.lerp(cameraFlight.offsetX,-panX,t),THREE.MathUtils.lerp(cameraFlight.offsetY,-panY,t),w,h);
    }
    if(!bannerMode)constrainCameraAboveGround(camera,minimumCameraY);
    camera.updateProjectionMatrix();
    if(faceOnCrop&&selectedView==='face-on'){
      // Use the same pixel crop for both calibrated cameras. Intrinsics supply
      // each reconstruction's focal length; no independent 3D auto-fit is used.
      const K=preset.K,n=camera.near;
      const cropWidth=Math.max(faceOnCrop.width,faceOnCrop.height*camera.aspect)/zoom;
      const cropHeight=cropWidth/camera.aspect;
      const cropX=faceOnCrop.x-panX/w*cropWidth,cropY=faceOnCrop.y-panY/h*cropHeight;
      const left=(cropX-cropWidth/2-K[0][2])*n/K[0][0];
      const right=(cropX+cropWidth/2-K[0][2])*n/K[0][0];
      const top=-(cropY-cropHeight/2-K[1][2])*n/K[1][1];
      const bottom=-(cropY+cropHeight/2-K[1][2])*n/K[1][1];
      camera.projectionMatrix.makePerspective(left,right,top,bottom,n,camera.far);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
    updateDistanceGuides();
    const belowGround=camera.position.y<floor.position.y+.0125;
    floor.material.opacity=belowGround ? .3 : 1;
    floor.material.depthWrite=!belowGround;
    grid.material.transparent=true;grid.material.opacity=belowGround ? .3 : 1;
    grid.material.depthWrite=!belowGround;
    const pose=frames[frame];
    for(const {a,b,mesh} of bones){
      mesh.visible=valid(pose[a])&&valid(pose[b]);if(!mesh.visible)continue;
      const from=vector(pose[a]),to=vector(pose[b]),delta=to.clone().sub(from),length=delta.length();
      mesh.visible=length>1e-8;if(!mesh.visible)continue;
      mesh.position.copy(from).add(to).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(axis,delta.normalize());mesh.scale.set(boneRadius,length,boneRadius);
    }
    dots.forEach((mesh,i)=>{if(!mesh)return;mesh.visible=valid(pose[i]);if(mesh.visible)mesh.position.copy(vector(pose[i]));});
    for(const trail of trails){
      let low=0,high=trail.frames.length;
      while(low<high){const middle=(low+high)>>>1;if(trail.frames[middle]<=frame)low=middle+1;else high=middle;}
      trail.mesh.count=low;
      const shader=trail.mesh.material.userData.shader;
      if(shader)shader.uniforms.playbackFrame.value=frame;
    }
    for(const past of clubHistory){
      const age=frame-past.frame;
      past.mesh.visible=age>0&&(snapshotHistory||age<historyWindow);
      if(past.mesh.visible)past.mesh.material.opacity=snapshotHistory
        ? .1+.9*(past.frame-start)/Math.max(1,frame-start)
        : .75*(1-age/historyWindow);
    }
    camera.updateMatrixWorld();
    for(const overlay of rawOverlays){
      // Measure actual projected image scale, including distance, zoom, FOV,
      // and orientation, instead of multiplying point size by zoom alone.
      overlay.group.updateWorldMatrix(true,false);
      const origin=overlay.group.localToWorld(new THREE.Vector3(0,0,-overlay.depth)).project(camera);
      const pixel=overlay.group.localToWorld(new THREE.Vector3(overlay.depth/overlay.K[0][0],0,-overlay.depth)).project(camera);
      const verticalPixel=overlay.group.localToWorld(new THREE.Vector3(0,overlay.depth/overlay.K[1][1],-overlay.depth)).project(camera);
      const imageScale=Math.max(.0001,Math.hypot((pixel.x-origin.x)*w/2,(pixel.y-origin.y)*h/2),Math.hypot((verticalPixel.x-origin.x)*w/2,(verticalPixel.y-origin.y)*h/2));
      const detailScale=Math.sqrt(imageScale);
      const bonePixels=Math.max(1.4,Math.min(5.6,2.5*detailScale));
      const jointPixels=Math.max(10,Math.min(36,16*detailScale));
      const points=overlay.raw.pred[frame];
      const project=index=>{
        const p=points?.[overlay.mapping[index]];
        if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1])||(p.length>2&&p[2]<=0)||(p[0]===0&&p[1]===0))return null;
        return [(p[0]-overlay.K[0][2])*overlay.depth/overlay.K[0][0],-(p[1]-overlay.K[1][2])*overlay.depth/overlay.K[1][1],0];
      };
      let n=0;
      for(const [a,b] of edges){
        const from=project(a),to=project(b);if(!from||!to)continue;
        const startPoint=new THREE.Vector3(...from),endPoint=new THREE.Vector3(...to),delta=endPoint.clone().sub(startPoint),length=delta.length();
        if(length<1e-9)continue;
        // Joint rings are screen-sized: trim in projected pixels so the gap
        // stays clear even when the video plane is viewed at an angle.
        const startCamera=overlay.group.localToWorld(startPoint.clone().setZ(-overlay.depth)).applyMatrix4(camera.matrixWorldInverse);
        const endCamera=overlay.group.localToWorld(endPoint.clone().setZ(-overlay.depth)).applyMatrix4(camera.matrixWorldInverse);
        const startScreen=startCamera.clone().applyMatrix4(camera.projectionMatrix);
        const endScreen=endCamera.clone().applyMatrix4(camera.projectionMatrix);
        const screenLength=Math.hypot((endScreen.x-startScreen.x)*w/2,(endScreen.y-startScreen.y)*h/2);
        const inset=jointPixels/2+.5;
        if(screenLength<=inset*2||startCamera.z>=0||endCamera.z>=0)continue;
        const fraction=inset/screenLength;
        const startTrim=fraction*endCamera.z/((1-fraction)*startCamera.z+fraction*endCamera.z);
        const endTrim=fraction*startCamera.z/((1-fraction)*endCamera.z+fraction*startCamera.z);
        startPoint.addScaledVector(delta,startTrim);endPoint.addScaledVector(delta,-endTrim);
        transform.position.copy(startPoint).add(endPoint).multiplyScalar(.5);
        transform.quaternion.setFromUnitVectors(axis,delta.normalize());
        const thickness=Math.min(2.8,bonePixels/1.8/imageScale)*.9*overlay.depth/overlay.K[0][0];
        transform.scale.set(thickness,length*(1-startTrim-endTrim),thickness);transform.updateMatrix();
        overlay.boneMeshes.forEach(mesh=>mesh.setMatrixAt(n,transform.matrix));n++;
      }
      overlay.boneMeshes.forEach(mesh=>{mesh.count=n;mesh.instanceMatrix.needsUpdate=true;});
      overlay.dotMaterial.uniforms.pointSize.value=jointPixels*renderer.getPixelRatio();
      let count=0;const dots=overlay.pointGeometry.attributes.position,colors=overlay.pointGeometry.attributes.jointColor;
      names.forEach((name,i)=>{
        if(i===18)return;const p=project(i);if(!p)return;
        dots.setXYZ(count,...p);
        const color=new THREE.Color(name.startsWith('left_')?'#3b82f6':name.startsWith('right_')?'#ef4444':overlay.overlayColor);
        colors.setXYZ(count++,color.r,color.g,color.b);
      });
      colors.needsUpdate=true;
      overlay.pointGeometry.setDrawRange(0,count);dots.needsUpdate=true;overlay.pointGeometry.computeBoundingSphere();
    }
    canvas.dataset.frame=String(frame);
    renderer.render(scene,camera);
  }
  const publishInteraction=()=>onInteraction?.({zoom,yaw,pitch,presetYaw,presetPitch,panX:panX/Math.max(1,canvas.clientWidth),panY:panY/Math.max(1,canvas.clientHeight)});
  const pointers=new Map();
  const clampZoom=value=>Math.max(.4,Math.min(4,value));
  const pinchDistance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  canvas.onpointerdown=e=>{
    if(cameraFlight)return;
    if(e.pointerType==='mouse'&&e.button!==0&&!(enablePan&&e.button===2))return;
    e.preventDefault();
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove=e=>{
    const previous=pointers.get(e.pointerId);if(!previous)return;
    const before=pointers.size===2?pinchDistance():0;
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:previous.button});
    if(pointers.size===2){
      const after=pinchDistance();if(before>0)zoom=clampZoom(zoom*after/before);
      if(enablePan){panX+=dx/2;panY+=dy/2;}
    }
    else if(pointers.size===1){
      if(enablePan&&previous.button===2){panX+=dx;panY+=dy;}
      else if(selectedView==='free-view'){yaw-=dx*.01;pitch=Math.max(-1.4,Math.min(1.4,pitch+dy*.01));}
      else{const sensitivity=faceOnCrop ? .01 : .0008/Math.max(1,zoom);presetYaw-=dx*sensitivity;presetPitch=Math.max(-1.4,Math.min(1.4,presetPitch-dy*sensitivity));}
    }
    draw();publishInteraction();
  };
  if(enablePan)canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const release=e=>pointers.delete(e.pointerId);
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=release;
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    if(cameraFlight)return;
    // Trackpad pinch arrives as a Ctrl+wheel gesture in supporting browsers.
    zoom=clampZoom(zoom*Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .001)));draw();publishInteraction();
  },{passive:false});
  const resizeObserver=new ResizeObserver(draw);resizeObserver.observe(canvas); draw();
  let animationHandle,disposed=false,playbackEnabled=true;
  const groundCorners=()=>[-1,1].flatMap(x=>[-1,1].map(z=>new THREE.Vector3(floor.position.x+x*floorSize/2,floor.position.y-.0125,floor.position.z+z*floorSize/2)));
  const controller={
    capturePreview(){draw();return canvas.toDataURL();},
    groundRetreat(){
      const preset=cameraPresets.get('face-on'),inverse=preset.rotation.clone().invert();
      return Math.max(0,...groundCorners().map(p=>p.sub(preset.position).applyQuaternion(inverse).z+Math.max(1,floorSize)));
    },
    fitGround(retreat){
      snapshotRetreat=retreat;
      const preset=cameraPresets.get('face-on'),K=preset.K,inverse=preset.rotation.clone().invert();
      const eye=preset.position.clone().add(new THREE.Vector3(0,0,retreat).applyQuaternion(preset.rotation));
      const samples=groundCorners();
      for(const pose of selectedFrames)for(const point of pose.slice(0,17))if(valid(point))samples.push(vector(point));
      const pixels=samples.map(p=>p.sub(eye).applyQuaternion(inverse)).filter(p=>p.z<-.001).map(p=>[K[0][2]-K[0][0]*p.x/p.z,K[1][2]+K[1][1]*p.y/p.z]);
      return {left:Math.min(...pixels.map(p=>p[0])),right:Math.max(...pixels.map(p=>p[0])),top:Math.min(...pixels.map(p=>p[1])),bottom:Math.max(...pixels.map(p=>p[1]))};
    },
    setInteraction(state){
      ({zoom,yaw,pitch,presetYaw,presetPitch}=state);
      panX=state.panX*canvas.clientWidth;panY=state.panY*canvas.clientHeight;
      draw();
    },
    setView(value,{animate=true}={}){
      const next=cameraPresets.has(value)?value:'free-view';
      const recenter=next===selectedView;
      const resetFree=recenter&&next==='free-view';
      const defaultYaw=Object.keys(cameraVideos).length?-.65:0,defaultPitch=Object.keys(cameraVideos).length ? .3 : 0;
      const centered=resetFree?yaw===defaultYaw&&pitch===defaultPitch:presetYaw===0&&presetPitch===0;
      if(recenter&&!cameraFlight&&centered&&panX===0&&panY===0&&(next==='free-view'||distanceScale===1))return;
      const retainedZoom=zoom;
      cancelAnimationFrame(flightHandle);
      const from={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,zoom:camera.zoom,offsetX:camera.view?.offsetX||0,offsetY:camera.view?.offsetY||0,progress:0};
      if(selectedView==='free-view')freeViewState={yaw,pitch,zoom,panX,panY};
      if(next!=='free-view')distanceScale=1;
      selectedView=next;presetYaw=presetPitch=0;
      if(resetFree){yaw=defaultYaw;pitch=defaultPitch;panX=panY=0;zoom=retainedZoom;freeViewState={yaw,pitch,zoom,panX,panY};}
      else if(next==='free-view'&&freeViewState){({yaw,pitch,zoom,panX,panY}=freeViewState);}
      else{panX=panY=0;zoom=recenter?retainedZoom:1;}
      if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){cameraFlight=undefined;draw();return;}
      cameraFlight=from;const started=performance.now();
      function fly(now){
        if(disposed)return;
        const t=Math.min(1,(now-started)/1000);
        from.progress=t*t*t*(t*(t*6-15)+10);
        if(t===1)cameraFlight=undefined;
        draw();if(t<1)flightHandle=requestAnimationFrame(fly);
      }
      flightHandle=requestAnimationFrame(fly);
    },
    setDistance(value){
      const distance=Number(value);if(!Number.isFinite(distance))return;
      cancelAnimationFrame(flightHandle);cameraFlight=undefined;
      distanceScale=Math.max(.4,Math.min(3,distance));draw();
    },
    setPlaying(value){playbackEnabled=Boolean(value);},
    setFrame(value){frame=Math.max(start,Math.min(end,Math.floor(value)));draw();},
    dispose(){cancelAnimationFrame(flightHandle);mediaCleanup.forEach(cleanup=>cleanup());disposed=true;cancelAnimationFrame(animationHandle);resizeObserver.disconnect();renderer.dispose();if(detectionShaftHistory)renderer.forceContextLoss();const geometries=new Set(),materials=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});},
  };
  if(!autoPlay)return controller;
  // Loop the selected motion at its recorded frame rate. Only the current,
  // visible carousel card renders; hidden cards retain their playback position.
  const frameCount = end-start+1;
  let elapsedFrames = frame-start, previousTime;
  let inViewport = false;
  const visibility = new IntersectionObserver(entries=>{inViewport=entries[0].isIntersecting;});
  visibility.observe(canvas);
  function animate(now) {
    if(disposed||!canvas.isConnected){visibility.disconnect();return;}
    const playing = playbackEnabled && inViewport && !document.hidden && !card.inert;
    if(playing && previousTime !== undefined) {
      elapsedFrames = (elapsedFrames+(now-previousTime)*fps/1000)%frameCount;
      const nextFrame = start+Math.floor(elapsedFrames);
      if(nextFrame!==frame){frame=nextFrame;draw();}
    }
    previousTime=playing?now:undefined;
    animationHandle=requestAnimationFrame(animate);
  }
  animationHandle=requestAnimationFrame(animate);
  return controller;
}
