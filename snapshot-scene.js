import {browserSnapshotResources} from './snapshot-resources.js';
import {createDepthCompositor} from './depth-compositor.js';
import {snapshotViewCenter,focusedSnapshotOffset} from './snapshot-viewport.js';
import {createMeasurementOverlays} from './rotation-overlays.js';
import {createHoganPlanes,averageShaftLength} from './hogan-planes.js';
import {createVector2DOverlay} from './vector-2d-overlay.js';
import {createCommittedVideoTexture} from './snapshot-texture.js';
import {interpolateSnapshotCamera} from './snapshot-transition.js';
const rawNames = ['nose','atlas','top_head','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle','golf_club_grip','golf_club_shaft','golf_club_heel','golf_club_head'];
const rawEdges = [[0,1],[0,2],[0,3],[0,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16],[17,19],[19,20]];
import {createBannerOverlays} from './materials/projects/pose-information-extraction/explain/ui/banner-overlays.js';
import {registerViewerCapture} from './materials/projects/pose-information-extraction/explain/ui/viewer-transition.js';
import {createVideoMetricOverlays} from './materials/projects/pose-information-extraction/explain/ui/video-overlays.js';
import {rotationBoundsCenter} from './materials/projects/pose-information-extraction/snapshot-framing.js';
import {updatePoseShadowStrength} from './materials/projects/pose-information-extraction/pose-shadow.js';
import {createViewNavigation} from './materials/projects/pose-information-extraction/explain/ui/view-navigation.js';
import {mountViewInput} from './materials/projects/pose-information-extraction/explain/ui/window-input.js';
import {createPoseSurface} from './materials/projects/pose-information-extraction/pose-surface.js';
import {fitPairCamera,fitViewDistance} from './materials/projects/pose-information-extraction/explain/ui/camera-framing.js';
import {poseColors} from './materials/projects/pose-information-extraction/explain/palette.js';
import {mountSnapshotExplanation} from './materials/projects/pose-information-extraction/explain/ui/snapshot.js';
import {poseStructure} from './materials/projects/pose-information-extraction/pose-structure.js';
import {resolveSnapshot} from './materials/projects/pose-information-extraction/snapshot-config.js';
import * as THREE from './materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {interpolateRotation,constrainCameraAboveGround,constrainOrbitAboveGround} from './materials/projects/pose-information-extraction/camera-flight.js';
const valid = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
async function json(url) { const response = await fetch(url); if (!response.ok) throw new Error(`${url}: ${response.status}`); return response.json(); }
export async function mountPoseScene(card, id, entry, { showCameras = false, autoPlay = true, cameraVideos = {}, rawDetections = {}, bannerMode = false, bannerMetrics, snapshotMetrics, videoMetrics, calibratedViews = false, hoganPlanes = false, defaultZoomScale = 1, measurementMetrics, measurementFeature = 'geometric-rotations', showRawDetections = true } = {}) {
  const poseData = await json(`materials/data/3d_results/${encodeURIComponent(id)}.json`);
  const {reconstruction: frames, calibration, joints: jointNames} = poseData;
  const {names,edges,indexes,clubEdges} = poseStructure(jointNames);
  // Visibility only: keep club samples in every bounds, center, scale and
  // camera calculation so hiding the club never changes navigation/framing.
  const isClub=index=>names[index]?.startsWith('golf_club_');
  const snapshot = snapshotMetrics ? resolveSnapshot(entry,snapshotMetrics,frames.length) : null;
  const referenceFrame = snapshot?.referenceFrame;
  const configuredRange = entry.range ?? entry.ranage ?? [0, frames.length-1];
  const range = Array.isArray(configuredRange)
    ? configuredRange.map((value,index)=>value === null ? (index === 0 ? 0 : frames.length-1) : value)
    : configuredRange;
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 0 || range[1] < range[0] || range[1] >= frames.length) throw new Error('Invalid snapshot frame range');
  const [start,end] = range;
  const joints = (hoganPlanes ? ['golf_club_head'] : measurementMetrics ? [] : entry.joints || []).map(name => name === 'golf_club_haed' ? 'golf_club_head' : name);
  if (joints.some(name => !names.includes(name))) throw new Error('Unknown trail joint');
  let frame = Math.min(end, Math.max(start, snapshot?.frame ?? entry.highlight_index ?? start));
  let yaw = 0, pitch = 0, zoom = 2, distanceScale = 1;
  const heading = document.createElement('h4'); heading.textContent = `Swing ${id}`; heading.className='media-item-title';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `3D pose for swing ${id}`); canvas.setAttribute('role','img');
  if(!snapshot)card.append(heading);card.append(canvas);
  const vectorOverlay=createVector2DOverlay(canvas,{names:rawNames,edges:rawEdges});
  const displayedFrames = snapshot ? [frames[referenceFrame],frames[snapshot.frame]] : frames.slice(start,end+1);
  const points = displayedFrames.flat().filter(valid);
  if (!points.length) throw new Error('No valid 3D points');
  const min = [0,1,2].map(axis => Math.min(...points.map(p=>p[axis])));
  const max = [0,1,2].map(axis => Math.max(...points.map(p=>p[axis])));
  const center = snapshot?rotationBoundsCenter(frames,start,end):min.map((v,i)=>(v+max[i])/2);
  const radius = Math.max(...points.map(p=>Math.hypot(...p.map((v,i)=>v-center[i])))) || 1;
  const median = values => { const sorted = values.sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; };
  const selectedFrames = displayedFrames;
  const groundY = median(selectedFrames.map(pose => Math.max(...[pose[indexes.left_ankle],pose[indexes.right_ankle]].filter(valid).map(p=>p[1]))).filter(Number.isFinite));
  const height = groundY - median(selectedFrames.map(pose=>pose[indexes.top_head]).filter(valid).map(p=>p[1]));
  const targetStep = (height > 0 ? height : radius*2)/8;
  const power = 10**Math.floor(Math.log10(targetStep));
  const gridStep = [1,2,5,10].map(n=>n*power).reduce((a,b)=>Math.abs(a-targetStep)<Math.abs(b-targetStep)?a:b);
  // Use the median hip midpoint as the fixed body center for this snapshot.
  const bodyCenters = selectedFrames.filter(pose=>valid(pose[indexes.left_hip])&&valid(pose[indexes.right_hip])).map(pose=>pose[indexes.left_hip].map((v,i)=>(v+pose[indexes.right_hip][i])/2));
  const groundX = bodyCenters.length ? median(bodyCenters.map(p=>p[0])) : center[0];
  const groundZ = bodyCenters.length ? median(bodyCenters.map(p=>p[2])) : center[2];
  const extent = Math.max(...points.map(p=>Math.max(Math.abs(p[0]-groundX),Math.abs(p[2]-groundZ)))) || gridStep;
  // Rotate camera coordinates into a right-handed rendering space:
  // source +X is right, source -Y is up, and source +Z points into the screen.
  const unit = height > 0 ? height : radius;
  const vector = p => new THREE.Vector3((p[0]-center[0])/unit, -(p[1]-center[1])/unit, -(p[2]-center[2])/unit);
  const hoganReference=hoganPlanes?(()=>{
    const pose=frames[start];
    const point=name=>{const p=pose[indexes[name]];if(!valid(p))throw new Error(`Missing Hogan reference joint: ${name}`);return vector(p).toArray();};
    const midpoint=(a,b)=>point(a).map((v,i)=>(v+point(b)[i])/2);
    const trajectory=selectedFrames.map(p=>p[indexes.golf_club_head]).filter(valid).map(p=>vector(p).toArray());
    return createHoganPlanes({head:point('golf_club_head'),leftAnkle:point('left_ankle'),rightAnkle:point('right_ankle'),shoulder:midpoint('left_shoulder','right_shoulder'),hip:midpoint('left_hip','right_hip'),trajectory});
  })():null;
  const hoganTolerance=hoganPlanes?averageShaftLength(selectedFrames,indexes.golf_club_grip,indexes.golf_club_heel)/unit/10:0;
  let snapshotOverlayView;
  let snapshotCamera,snapshotPairFocus,snapshotRotationPivot;
  const snapshotFocus=new THREE.Vector3();let snapshotFocusZoom=1;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f7f0');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  const resources=browserSnapshotResources({floatColor:!!renderer.extensions.get('EXT_color_buffer_float'),maxTextures:renderer.capabilities.maxTextures});
  const depthCompositor=showCameras&&!bannerMode&&resources.depthCompositing?createDepthCompositor(renderer):null;
  canvas.dataset.renderMode=depthCompositor?'depth-composited':'native';
  const renderScene=()=>depthCompositor?depthCompositor.render(scene,camera):renderer.render(scene,camera);
  registerViewerCapture(canvas,renderScene);
  renderer.setPixelRatio(resources.pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const camera = new THREE.PerspectiveCamera(45,1,.01,100);
  const bound = radius/unit,worldFramingPoints=points.map(vector);
  scene.add(new THREE.HemisphereLight('#ffffff','#7d8974',2));
  const light = new THREE.DirectionalLight('#fff6df',3);
  light.position.set(-2,4,3); light.castShadow = true;
  light.shadow.mapSize.set(resources.shadowSize,resources.shadowSize);
  const shadowExtent = Math.max(3,bound*1.8);
  Object.assign(light.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,near:.1,far:20});
  light.shadow.normalBias = .005; light.shadow.bias = -.00015;
  scene.add(light);
  const fill = new THREE.DirectionalLight('#dceaff',1); fill.position.set(3,1,-3); scene.add(fill);
  const material = color => new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.08});
  const boneMaterial = material('#63f5b4');
  if(bannerMode||snapshot)boneMaterial.transparent=true;
  const jointMaterials = {left:material('#3b82f6'),right:material('#ef4444'),center:boneMaterial};
  if(bannerMode||snapshot)Object.values(jointMaterials).forEach(surface=>{surface.transparent=true;});
  const boneRadius = .012, jointRadius = .022;
  const cylinder = new THREE.CylinderGeometry(1,1,1,16);
  const surface=createPoseSurface(boneRadius,jointRadius);
  const translucentTranslation=measurementFeature==='hip-translation';
  const sphere = new THREE.SphereGeometry(jointRadius,24,16);
  const axis = new THREE.Vector3(0,1,0);
  const bones = edges.map(([a,b])=>{
    const mesh = translucentTranslation?surface.bone(boneMaterial):new THREE.Mesh(cylinder,boneMaterial); mesh.castShadow=true;mesh.receiveShadow=false;if(bannerMode)mesh.renderOrder=2;scene.add(mesh);return {a,b,mesh};
  });
  const dots = names.map((name,i)=>{
    const jointMaterial=jointMaterials[name.startsWith('left_')?'left':name.startsWith('right_')?'right':'center'];
    const mesh = bannerMode?new THREE.Mesh(sphere,jointMaterial):surface.joint(jointMaterial);
    mesh.castShadow=true;mesh.receiveShadow=false;if(bannerMode)mesh.renderOrder=3; scene.add(mesh); return mesh;
  });
  const setupPoseShadow=mesh=>{mesh.castShadow=true;};
  if(snapshot)[...bones.map(b=>b.mesh),...dots.filter(Boolean)].forEach(setupPoseShadow);
  let referenceGroup,referenceDots=[],referenceBones=[],selectedPoseOpacity=1;
  if(snapshot){
    // Use the same transform for both poses: no independent centering or scaling.
    // The reference keeps depth testing but cannot obscure the selected pose.
    const referenceMaterial=color=>{
      const surface=material(color);surface.transparent=true;surface.opacity=.5;
      surface.depthWrite=false;return surface;
    };
    const referenceMaterials={left:referenceMaterial('#3b82f6'),right:referenceMaterial('#ef4444'),center:referenceMaterial(poseColors.reference)};
    const referencePose=frames[referenceFrame];
    const side=name=>name.startsWith('left_')?'left':name.startsWith('right_')?'right':'center';
    referenceGroup=new THREE.Group();referenceGroup.name='reference-pose';scene.add(referenceGroup);
    for(const [a,b] of edges){
      if(!valid(referencePose[a])||!valid(referencePose[b]))continue;
      const from=vector(referencePose[a]),to=vector(referencePose[b]),delta=to.clone().sub(from),length=delta.length();
      if(length<=1e-8)continue;
      const mesh=surface.bone(referenceMaterials.center);
      surface.placeBone(mesh,from,to);
      mesh.visible=!isClub(a)&&!isClub(b);
      referenceGroup.add(mesh);referenceBones.push({a,b,mesh});
    }
    names.forEach((name,index)=>{
      if(!valid(referencePose[index]))return;
      const mesh=surface.joint(referenceMaterials[side(name)]);
      surface.placeJoint(mesh,vector(referencePose[index]));mesh.visible=!isClub(index);referenceDots[index]=mesh;referenceGroup.add(mesh);
    });

    referenceGroup.traverse(object=>{if(object.isMesh)setupPoseShadow(object);});
  }
  function setSnapshotPoseOpacity(referenceOpacity,selectedOpacity,jointHighlights=[],boneHighlights=[]){
    if(!snapshot&&!videoMetrics&&!measurementMetrics)return;
    selectedPoseOpacity=selectedOpacity;
    updatePoseShadowStrength(light,referenceOpacity,selectedOpacity);
    if(referenceGroup)referenceGroup.visible=referenceOpacity>.001;
    referenceGroup?.traverse(object=>{if(object.material){object.material.opacity=referenceOpacity;object.material.transparent=true;object.material.depthWrite=referenceOpacity>.999;object.castShadow=true;}});
    for(const object of [...bones.map(b=>b.mesh),...dots.filter(Boolean)]){
      object.material.transparent=true;object.material.opacity=selectedOpacity;object.material.depthWrite=selectedOpacity>.999;object.castShadow=true;
    }
    for(const highlight of jointHighlights){
      const base=highlight.pose==='reference'?referenceOpacity:selectedOpacity;
      const meshes=highlight.pose==='reference'?referenceDots:dots;
      for(const name of highlight.joints){
        const mesh=meshes[indexes[name]];if(!mesh)continue;
        const opacity=base+(1-base)*Math.max(0,Math.min(1,highlight.strength));
        mesh.material.opacity=Math.max(mesh.material.opacity,opacity);mesh.material.depthWrite=opacity>.999;
      }
    }
    for(const highlight of boneHighlights){
      const collection=highlight.pose==='reference'?referenceBones:bones,base=highlight.pose==='reference'?referenceOpacity:selectedOpacity;
      for(const pair of highlight.pairs){
        const ids=pair.map(name=>indexes[name]);
        for(const bone of collection){
          if(!((bone.a===ids[0]&&bone.b===ids[1])||(bone.a===ids[1]&&bone.b===ids[0])))continue;
          const opacity=base+(1-base)*Math.max(0,Math.min(1,highlight.strength));
          bone.mesh.material.opacity=Math.max(bone.mesh.material.opacity,opacity);bone.mesh.material.depthWrite=opacity>.999;
        }
      }
    }
  }
  // Prebuild timestamped solid trail segments; reveal only samples reached by playback.
  const trails=[];
  const trailCylinder=new THREE.CylinderGeometry(1,1,1,8);
  const trailSphere=new THREE.SphereGeometry(.006,8,6);
  const transform=new THREE.Object3D();
  const fps = Number.isFinite(entry.fps) && entry.fps > 0 ? entry.fps : 60;
  // One fixed scale across the full reconstruction, including frames outside
  // the displayed range, keeps red reserved for the sequence's peak speed.
  const speeds = new Map(); let peakSpeed=0;
  for(const name of new Set([...joints,'golf_club_head'])){
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
    trailMaterial.transparent=true;trailMaterial.depthWrite=false;
    // Every depth/color program must share the same live playback clock.
    const trailUniforms={playbackFrame:{value:frame},historyFrames:{value:Math.max(1,(end-start+1)*.3)}};
    trailMaterial.userData.playbackFrame=trailUniforms.playbackFrame;
    trailMaterial.onBeforeCompile=shader=>{
      if(hoganPlanes){
        shader.vertexShader='attribute vec3 trailFrom; attribute vec3 trailTo; varying vec3 trailPoint;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntrailPoint=mix(trailFrom,trailTo,position.y+0.5);');
        shader.fragmentShader='varying vec3 trailPoint; uniform vec3 paneAnchor; uniform vec3 paneAlong; uniform vec3 paneRise0; uniform vec3 paneRise1; uniform float paneSide; uniform float offPlaneTolerance; uniform vec3 toleranceColor; uniform vec3 insideColor; uniform vec3 outsideColor; uniform vec3 futureColor;\n'+shader.fragmentShader;
        Object.assign(shader.uniforms,{paneAnchor:{value:new THREE.Vector3(...hoganReference[0].corners[0])},paneAlong:{value:new THREE.Vector3(...hoganReference[0].along)},paneRise0:{value:new THREE.Vector3(...hoganReference[0].rise)},paneRise1:{value:new THREE.Vector3(...hoganReference[1].rise)},paneSide:{value:hoganReference[0].side},offPlaneTolerance:{value:hoganTolerance},toleranceColor:{value:new THREE.Color('#4e9b70')},insideColor:{value:new THREE.Color('#477db8')},outsideColor:{value:new THREE.Color('#c45b62')},futureColor:{value:new THREE.Color('#92999f')}});
      }
      shader.vertexShader='attribute float historyFrame;\nvarying float trailAge;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntrailAge = historyFrame;');
      shader.fragmentShader='uniform float playbackFrame;\nuniform float historyFrames;\nvarying float trailAge;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', hoganPlanes
        ? `#include <color_fragment>
vec3 offset=trailPoint-paneAnchor;
float cosine=dot(paneRise0,paneRise1),denominator=max(1e-10,1.0-cosine*cosine);
float u=(dot(offset,paneRise0)-cosine*dot(offset,paneRise1))/denominator;
float v=(dot(offset,paneRise1)-cosine*dot(offset,paneRise0))/denominator;
float x=dot(offset,paneAlong);
bool inside=x>=-1e-6&&x<=paneSide+1e-6&&u>=-1e-6&&v>=-1e-6&&u+v<=paneSide+1e-6;
// Distance to the nearest finite pane, measured perpendicular to its surface
// when the projection lies inside it; edges use the true Euclidean distance.
vec3 nearest0=paneAlong*clamp(x,0.0,paneSide)+paneRise0*clamp(dot(offset,paneRise0),0.0,paneSide);
vec3 nearest1=paneAlong*clamp(x,0.0,paneSide)+paneRise1*clamp(dot(offset,paneRise1),0.0,paneSide);
bool nearPlane=min(length(offset-nearest0),length(offset-nearest1))<offPlaneTolerance;
bool finished=trailAge<=playbackFrame;
diffuseColor.rgb=finished?(inside?insideColor:(nearPlane?toleranceColor:outsideColor)):futureColor;
diffuseColor.a*=finished?1.0:0.5;`
        : '#include <color_fragment>\nfloat age = playbackFrame - trailAge;\nif (age < 0.0 || age >= historyFrames) discard;\ndiffuseColor.a *= 1.0 - age / historyFrames;');
      shader.uniforms.playbackFrame=trailUniforms.playbackFrame;
      shader.uniforms.historyFrames=trailUniforms.historyFrames;
      trailMaterial.userData.shader=shader;
    };
    for(const [items,geometry,isSegment] of [[segments,trailCylinder,true],[samples,trailSphere,false]]) {
      if(!items.length)continue;
      const instanceGeometry=geometry.clone();
      instanceGeometry.setAttribute('historyFrame',new THREE.InstancedBufferAttribute(new Float32Array(items.map(item=>item.frame)),1));
      if(hoganPlanes){
        instanceGeometry.setAttribute('trailFrom',new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap(item=>(isSegment?item.from:item.point).toArray())),3));
        instanceGeometry.setAttribute('trailTo',new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap(item=>(isSegment?item.to:item.point).toArray())),3));
      }
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
      mesh.receiveShadow=!hoganPlanes;mesh.visible=true;scene.add(mesh);
      trails.push({mesh,frames:items.map(item=>item.frame)});
    }
  });
  // Stack sampled historical clubs as playback advances, keeping the current
  // club prominent. Sample in time to avoid a dense wall of overlapping shafts.
  const clubHistory=[];
  const historyStride=Math.max(1,Math.round(fps*.1));
  const historyWindow=Math.max(1,(end-start+1)*.3);
  const clubSpeeds=speeds.get('golf_club_head') || speeds.get(joints[0]);
  for(let f=start;!hoganPlanes&&!measurementMetrics&&f<=end;f+=historyStride){
    const segments=[];
    for(const [a,b] of clubEdges){
      if(!valid(frames[f]?.[a])||!valid(frames[f]?.[b]))continue;
      const from=vector(frames[f][a]),to=vector(frames[f][b]),delta=to.clone().sub(from),length=delta.length();
      if(length>1e-6)segments.push({from,to,delta,length});
    }
    if(!segments.length)continue;
    const relativeSpeed=peakSpeed>0&&clubSpeeds?clubSpeeds[f]/peakSpeed:0;
    const historyMaterial=material(new THREE.Color().setHSL((1-relativeSpeed)*2/3,1,.5));
    historyMaterial.transparent=true;historyMaterial.depthWrite=false;
    const mesh=new THREE.InstancedMesh(trailCylinder,historyMaterial,segments.length);
    segments.forEach((item,i)=>{
      transform.position.copy(item.from).add(item.to).multiplyScalar(.5);
      transform.quaternion.setFromUnitVectors(axis,item.delta.clone().normalize());
      transform.scale.set(.0035,item.length,.0035);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    // Fading history receives light, but does not cast opaque shadows.
    mesh.receiveShadow=true;if(bannerMode)mesh.renderOrder=1.5;scene.add(mesh);clubHistory.push({mesh,frame:f});
  }
  const floorPosition = vector([groundX,groundY+jointRadius*unit,groundZ]);
  const cameraGroundExtent=showCameras
    ? Math.max(0,...Object.values(calibration || {}).filter(cal=>valid(cal.t)).map(cal=>Math.max(Math.abs(cal.t[0]-groundX),Math.abs(cal.t[2]-groundZ))))
    : 0;
  // Include camera positions with one grid cell of edge clearance in video scenes.
  const floorExtent=showCameras?Math.max(extent,cameraGroundExtent+Math.max(gridStep,.25*unit)):extent;
  const floorSize = 2*floorExtent/unit;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(floorSize,.025,floorSize),new THREE.MeshStandardMaterial({color:'#e2eadf',roughness:.95,transparent:false}));
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
  const rawOverlays=[],cameraDecorations=[],cameraPresets=new Map(),synchronizedVideoTextures=[],videoRecords=new Map();
  let selectedView='free-view',cameraFlight,flightHandle,freeViewState;
  let presetYaw=0,presetPitch=0;
  const cameraObjects = new THREE.Group(); scene.add(cameraObjects);
  const mediaCleanup=[];
  mediaCleanup.push(()=>vectorOverlay.dispose());
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
  for(const [view,cal] of Object.entries(showCameras||calibratedViews ? calibration || {} : {})) {
    const {R,t}=cal;
    if(!Array.isArray(R)||R.length!==3||!R.every(row=>valid(row))||!valid(t))continue;
    const cameraToWorld = v => R.map(row=>row.reduce((sum,value,j)=>sum+value*v[j],0));
    const worldPosition=t;
    const position=vector(worldPosition);
    cameraBound=Math.max(cameraBound,position.length()+.25);
    const direction = v => {const p=cameraToWorld(v);return new THREE.Vector3(p[0],-p[1],-p[2]);};
    const right=direction([1,0,0]),up=direction([0,-1,0]),back=direction([0,0,-1]);
    if(!showCameras){
      const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,back));
      cameraPresets.set(view,{position:position.clone(),rotation,K:cal.intrinsic,video:cameraVideos[view]});
      continue;
    }
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
    const raw=rawDetections[view]??{joints:rawNames,pred:[]};
    if(showRawDetections&&!hoganPlanes&&raw?.joints&&raw?.pred){
      rawOverlays.push({view,raw,mapping:rawNames.map(name=>raw.joints.indexOf(name)),overlayColor:'#ffce69',K,depth,group});
    }
    const video=cameraVideos[view];
    if(video){
      // Explicit uploads keep both camera textures on the committed 3D frame.
      const videoTexture=createCommittedVideoTexture(video);
      synchronizedVideoTextures.push(videoTexture);
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
      videoRecords.set(view,{texture:videoTexture,screen,frame:null});
      const refresh=()=>{if(video.readyState>=2)positionScreen();};
      for(const event of ['loadeddata','resize'])video.addEventListener(event,refresh);
      mediaCleanup.push(()=>{for(const event of ['loadeddata','resize'])video.removeEventListener(event,refresh);});
      const redraw=()=>{};
      video.addEventListener('seeked',redraw);mediaCleanup.push(()=>video.removeEventListener('seeked',redraw));
      // Dimensions are known from intrinsics even before the video decodes.
      const width=video.videoWidth||K[0][2]*2,height=video.videoHeight||K[1][2]*2;
      screen.scale.set(width*depth/K[0][0],height*depth/K[1][1],1);
      screen.position.set((width/2-K[0][2])*depth/K[0][0],-(height/2-K[1][2])*depth/K[1][1],-depth);
      
    }

  }
  // Ground height is fixed for the entire reconstruction, not the current frame
  // or the selected playback range. Include sphere/tube thickness below points.
  let lowestPoseY=Infinity;
  for(const pose of frames)for(let i=0;i<pose.length;i++){
    if(!valid(pose[i]))continue;
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
  if(hoganPlanes){
    const panes=hoganReference;
    const group=new THREE.Group();group.name='hogan-planes';
    // Tiny static studio/sky environment: generated once, never captures a frame.
    const environmentCanvas=document.createElement('canvas');environmentCanvas.width=256;environmentCanvas.height=128;
    const context=environmentCanvas.getContext('2d');
    const sky=context.createLinearGradient(0,0,0,128);
    sky.addColorStop(0,'#b5cfdf');sky.addColorStop(.46,'#e8f1ee');sky.addColorStop(.52,'#a6b6a1');sky.addColorStop(1,'#55644f');
    context.fillStyle=sky;context.fillRect(0,0,256,128);
    for(const [x,width,alpha] of [[42,28,.9],[171,45,.65]]){
      const glow=context.createLinearGradient(x-width,0,x+width,0);
      glow.addColorStop(0,'rgba(255,255,255,0)');glow.addColorStop(.5,`rgba(255,255,255,${alpha})`);glow.addColorStop(1,'rgba(255,255,255,0)');
      context.fillStyle=glow;context.fillRect(x-width,12,width*2,70);
    }
    const environment=new THREE.CanvasTexture(environmentCanvas);environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;
    mediaCleanup.push(()=>environment.dispose());
    panes.forEach((pane,i)=>{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(pane.corners.flat(),3));
      geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
      // Transparent panes do not write depth or cast solid shadows over the pose.
      const color=i?'#e6ad53':'#68adc6';
      // Even tinted surfaces preserve the original component opacity without
      // lighting or a moving white sheen changing color across the plane.
      const glassMaterial=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false});
      const glass=new THREE.Mesh(geometry,glassMaterial);
      glass.name=pane.name;glass.receiveShadow=false;group.add(glass);
      // Leave the front edge out of each outline; draw their common edge once.
      const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([1,2,3,0].map(j=>new THREE.Vector3(...pane.corners[j]))),new THREE.LineBasicMaterial({color,transparent:true,opacity:.65,depthWrite:false}));
      group.add(outline);
      // Thin polished rims give each otherwise clear pane a readable thickness.
      const rimMaterial=new THREE.MeshPhysicalMaterial({color:i?'#c3c7b6':'#a8cfce',transparent:true,opacity:.48,roughness:.08,metalness:.1,envMap:environment,envMapIntensity:1.2,depthWrite:false});
      for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]]){
        if(i&&a===0&&b===1)continue;
        const path=new THREE.LineCurve3(new THREE.Vector3(...pane.corners[a]),new THREE.Vector3(...pane.corners[b]));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(path,1,.003,6,false),rimMaterial));
      }
    });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(panes[0].corners.slice(0,2).map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#739c9b',transparent:true,opacity:.8,depthWrite:false})));
    scene.add(group);
    canvas.dataset.hoganPlanes=JSON.stringify(panes);
  }
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
  // Snapshots omit the bright green virtual-camera and center ground guides.
  for(const guide of [viewerRing,viewerMarker,viewerConnection,viewerCross,centerRing,centerCross]){
    guide.visible=false;
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
  const overviewFramingPoints=[...worldFramingPoints];
  const overviewCameraBounds=new THREE.Box3().setFromObject(cameraObjects);
  if(!overviewCameraBounds.isEmpty())for(const x of [overviewCameraBounds.min.x,overviewCameraBounds.max.x])for(const y of [floor.position.y,overviewCameraBounds.max.y])for(const z of [overviewCameraBounds.min.z,overviewCameraBounds.max.z])overviewFramingPoints.push(new THREE.Vector3(x,y,z));
  const overviewDirection=new THREE.Vector3(Math.sin(-.65)*Math.cos(.3),Math.sin(.3),Math.cos(-.65)*Math.cos(.3));
  const enablePan=!bannerMode;
  let panX=0,panY=0;
  // Frame the pose and its motion, independently of camera/plane extents.
  distanceScale=1;
  if(Object.keys(cameraVideos).length){yaw=-.65;pitch=.3;}
  const navigation=snapshot?createViewNavigation(draw):null;
  if(navigation)mediaCleanup.push(()=>navigation.dispose());
  let renderWidth=0,renderHeight=0,videoFitDistance,videoFitAspect;
  function draw() {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    if(w!==renderWidth||h!==renderHeight){renderer.setSize(w,h,false);renderWidth=w;renderHeight=h;}
    camera.aspect=w/h;
    const viewZoom=navigation?.zoom??zoom,viewPanX=navigation?.panX??panX,viewPanY=navigation?.panY??panY;
    camera.zoom=viewZoom*snapshotFocusZoom*(selectedView==='free-view'?6:1);
    const bottomStrip=card.querySelector('.snapshot-bottom-strip');
    const viewport=snapshotViewCenter(h,bottomStrip?.offsetTop??h,viewPanX,viewPanY);
    // The plot strip shifts the optical center upward. User pan remains an
    // independent offset, so wheel/pinch zoom stays centered in the clear area.
    if(enablePan||bottomStrip)camera.setViewOffset(w,h,viewport.offsetX,viewport.offsetY,w,h);
    // Fit the complete motion using the narrower viewport angle.
    camera.fov=45;
    const verticalHalfFov=THREE.MathUtils.degToRad(camera.fov/2);
    const halfFov=Math.min(verticalHalfFov,Math.atan(Math.tan(verticalHalfFov)*camera.aspect));
    let distance=Math.max(bound,cameraBound*.85)*distanceScale/(Math.sin(halfFov)*.84);
    const cameraTarget=snapshotFocus.clone();
    if(measurementFeature==='hip-translation'){
      const pose=poseData.reconstruction[0],names=poseData.joints;
      const hip=pose[names.indexOf('root')]??pose[names.indexOf('left_hip')].map((v,i)=>(v+pose[names.indexOf('right_hip')][i])/2);
      cameraTarget.copy(vector(hip));
    }
    let snapshotFitView;
    if(snapshot&&snapshotCamera){
      const direction=vector(snapshotCamera.direction.map((v,i)=>v+center[i])).normalize();
      const up=vector(snapshotCamera.up.map((v,i)=>v+center[i])).normalize();
      const manual=navigation.orient(direction,up);
      // Fit the scripted view only. Manual orbit changes angle, never radius.
      snapshotFitView={direction,up,verticalHalfFov,aspect:camera.aspect,manual};
      distance=fitViewDistance(worldFramingPoints,cameraTarget,direction,up,verticalHalfFov,camera.aspect)*distanceScale;
    }
    if(videoMetrics&&selectedView==='free-view'){
      // Fit the narrower metric layout once per viewport, using the default
      // angle so manual rotation retains a stable radius.
      if(videoFitAspect!==camera.aspect){
        const defaultYaw=Object.keys(cameraVideos).length?-.65:0,defaultPitch=Object.keys(cameraVideos).length?.3:0;
        const direction=new THREE.Vector3(Math.sin(defaultYaw)*Math.cos(defaultPitch),Math.sin(defaultPitch),Math.cos(defaultYaw)*Math.cos(defaultPitch));
        videoFitDistance=fitViewDistance(worldFramingPoints,cameraTarget,direction,new THREE.Vector3(0,1,0),verticalHalfFov,camera.aspect);videoFitAspect=camera.aspect;
      }
      distance=videoFitDistance*distanceScale;
    }
    if(snapshotPairFocus){const fit=fitPairCamera(snapshotPairFocus,vector,halfFov,distance,cameraTarget,snapshotFocusZoom,snapshotFitView);cameraTarget.copy(fit.target);distance=fit.distance;camera.zoom=viewZoom*fit.zoom;}
    if(selectedView==='free-view')distance=6*distanceScale*fitViewDistance(overviewFramingPoints,new THREE.Vector3(),overviewDirection,new THREE.Vector3(0,1,0),verticalHalfFov,camera.aspect,.94);
    camera.near=selectedView==='free-view'?Math.max(.01,distance*.1):.01;
    camera.far=Math.max(100,distance+cameraBound*5);
    const minimumCameraY=floor.position.y+.0125+.02;
    if(selectedView==='free-view')pitch=Math.max(pitch,Math.asin(Math.max(-.999,Math.min(.999,minimumCameraY/distance))));
    camera.position.set(distance*Math.sin(yaw)*Math.cos(pitch),distance*Math.sin(pitch),distance*Math.cos(yaw)*Math.cos(pitch));
    camera.position.add(cameraTarget);camera.up.set(0,1,0);camera.lookAt(cameraTarget);camera.fov=45;
    cameraDecorations.forEach(object=>{object.visible=bannerMode||object.userData.cameraView===selectedView?false:selectedView==='free-view'||(cameraFlight&&cameraFlight.progress<.75);});
    const preset=cameraPresets.get(selectedView);
    if(preset){
      const width=preset.video?.videoWidth||preset.K[0][2]*2,height=preset.video?.videoHeight||preset.K[1][2]*2;
      // Navigation is an offset from calibration, never a mutation of R/t/K.
      const localOrbit=new THREE.Quaternion().setFromEuler(new THREE.Euler(presetPitch,presetYaw,0,'YXZ'));
      const orbit=preset.rotation.clone().multiply(localOrbit).multiply(preset.rotation.clone().invert());
      camera.position.copy(preset.position).multiplyScalar(distanceScale).applyQuaternion(orbit);
      camera.quaternion.copy(orbit).multiply(preset.rotation);
      camera.fov=THREE.MathUtils.radToDeg(2*Math.atan((bannerMode?width/(2*preset.K[0][0]*camera.aspect):Math.max(height/(2*preset.K[1][1]),width/(2*preset.K[0][0]*camera.aspect)))));
    }
    // Calibrated views fit the usable height above the plot, while manual
    // zoom remains a multiplier around that clear-area baseline.
    if(preset&&bottomStrip)camera.zoom*=viewport.cameraZoomScale*.9;
    // Apply the same default framing scale before interpolating either POV.
    camera.zoom*=defaultZoomScale;
    if(preset&&measurementFeature==='hip-translation'){
      // Measure baseline framing without user pan so dragging stays unrestricted.
      camera.setViewOffset(w,h,viewport.offsetX+viewPanX,viewport.offsetY+viewPanY,w,h);
      constrainCameraAboveGround(camera,minimumCameraY);
      camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      const projected=cameraTarget.clone().project(camera);
      const focusOffset=focusedSnapshotOffset(w,h,viewport,projected);
      camera.setViewOffset(w,h,focusOffset.offsetX,focusOffset.offsetY,w,h);
    }
    const targetOffsetX=camera.view?.offsetX??viewport.offsetX,targetOffsetY=camera.view?.offsetY??viewport.offsetY;
    if(cameraFlight){
      const t=cameraFlight.progress;
      camera.near=THREE.MathUtils.lerp(cameraFlight.near,camera.near,t);
      if(cameraFlight.freeTransition)interpolateSnapshotCamera(camera,cameraFlight,t);
      else{
        camera.position.lerpVectors(cameraFlight.position,camera.position,t);
        interpolateRotation(camera.quaternion,cameraFlight.rotation,camera.quaternion,t);
        camera.fov=THREE.MathUtils.lerp(cameraFlight.fov,camera.fov,t);
        camera.zoom=THREE.MathUtils.lerp(cameraFlight.zoom,camera.zoom,t);
      }
      if(enablePan||bottomStrip)camera.setViewOffset(w,h,THREE.MathUtils.lerp(cameraFlight.offsetX,targetOffsetX,t),THREE.MathUtils.lerp(cameraFlight.offsetY,targetOffsetY,t),w,h);
    }
    if(snapshotCamera){
      const {direction}=snapshotFitView,up=snapshotFitView.manual.up;
      const pivot=snapshotRotationPivot?vector(snapshotRotationPivot):cameraTarget;
      const scriptedPosition=cameraTarget.clone().addScaledVector(direction,distance);
      camera.position.copy(navigation.orbitPoint(scriptedPosition,pivot));camera.up.copy(up);
      const lookTarget=navigation.orbitPoint(cameraTarget,pivot);
      constrainOrbitAboveGround(camera.position,pivot,minimumCameraY);
      camera.lookAt(lookTarget);

    }else constrainCameraAboveGround(camera,minimumCameraY);
    camera.updateProjectionMatrix();
    updateDistanceGuides();
    // An opaque ground surface does not change with the observer's viewpoint.
    floor.material.opacity=1;floor.material.depthWrite=true;
    grid.material.transparent=false;grid.material.opacity=1;grid.material.depthWrite=true;
    const pose=frames[frame];
    for(const {a,b,mesh} of bones){
      mesh.visible=selectedPoseOpacity>.001&&valid(pose[a])&&valid(pose[b]);if(!mesh.visible)continue;
      const from=vector(pose[a]),to=vector(pose[b]),delta=to.clone().sub(from),length=delta.length();
      mesh.visible=length>1e-8;if(!mesh.visible)continue;
      if(translucentTranslation)surface.placeBone(mesh,from,to);
      else{
        // Solid feature cards retain their full-length connections.
        mesh.position.copy(from).add(to).multiplyScalar(.5);
        mesh.quaternion.setFromUnitVectors(axis,delta.normalize());mesh.scale.set(boneRadius,length,boneRadius);
      }
    }
    dots.forEach((mesh,i)=>{if(!mesh)return;mesh.visible=selectedPoseOpacity>.001&&valid(pose[i]);if(mesh.visible){if(bannerMode)mesh.position.copy(vector(pose[i]));else surface.placeJoint(mesh,vector(pose[i]));}});
    for(const trail of trails){
      let low=0,high=trail.frames.length;
      while(low<high){const middle=(low+high)>>>1;if(trail.frames[middle]<=frame)low=middle+1;else high=middle;}
      trail.mesh.count=hoganPlanes?trail.frames.length:low;
      trail.mesh.material.userData.playbackFrame.value=frame;
    }
    for(const past of clubHistory){
      const age=frame-past.frame;
      past.mesh.visible=age>0&&age<historyWindow;
      if(past.mesh.visible)past.mesh.material.opacity=.75*(1-age/historyWindow);
    }
    camera.updateMatrixWorld();
    vectorOverlay.render({camera,scene,overlays:rawOverlays,frame,w,h});
    canvas.dataset.frame=String(frame);
    snapshotOverlayView?.(camera,w,h);renderScene();
  }
  // Wheel and pinch share an uncapped zoom-in range across features and POVs.
  // Keep the existing overview zoom-out floor and reject numerical overflow.
  const clampZoom=value=>{
    if(!Number.isFinite(value)||value<=0)return zoom;
    return videoMetrics?value:Math.max(.4,value);
  };
  const zoomAroundWindow=ratio=>{
    const next=clampZoom(zoom*ratio),applied=next/zoom;
    // Scale the projection offset with zoom so its fixed point is the
    // clear-area center, even after a manual pan.
    panX*=applied;panY*=applied;zoom=next;
  };
  if(snapshot){
    mediaCleanup.push(mountViewInput(canvas,ratio=>navigation.zoomBy(ratio),(dx,dy)=>navigation.pan(dx,dy),(dx,dy)=>navigation.rotate(dx,dy),()=>navigation.canRotate));
  }else{
  const pointers=new Map();
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
      const after=pinchDistance();if(before>0)zoomAroundWindow(after/before);
      if(enablePan){panX+=dx/2;panY+=dy/2;}
    }
    else if(pointers.size===1){
      if(enablePan&&previous.button===2){panX+=dx;panY+=dy;}
      else if(selectedView==='free-view'){yaw-=dx*.01;pitch=Math.max(-1.4,Math.min(1.4,pitch+dy*.01));}
      else{
        // Metric videos have no source-video overlay to keep precisely aligned:
        // use Free-view's rotation rate, independent of zoom.
        const sensitivity=videoMetrics ? .01 : .0008/Math.max(1,zoom);
        presetYaw-=dx*sensitivity;presetPitch=Math.max(-1.4,Math.min(1.4,presetPitch-dy*sensitivity));
      }
    }
    draw();
  };
  if(enablePan)canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const release=e=>pointers.delete(e.pointerId);
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=release;
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    if(cameraFlight)return;
    // Trackpad pinch arrives as a Ctrl+wheel gesture in supporting browsers.
    zoomAroundWindow(Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .001)));draw();
  },{passive:false});
  }
  const resizeObserver=new ResizeObserver(draw);resizeObserver.observe(canvas); draw();
  let animationHandle,disposed=false,playbackEnabled=true;
  let metricOverlays;
  const controller={
    setView(value,{animate=true}={}){
      const next=cameraPresets.has(value)?value:'free-view';
      const recenter=next===selectedView;
      const resetFree=recenter&&next==='free-view';
      const defaultYaw=Object.keys(cameraVideos).length?-.65:0,defaultPitch=Object.keys(cameraVideos).length ? .3 : 0;
      const centered=resetFree?yaw===defaultYaw&&pitch===defaultPitch:presetYaw===0&&presetPitch===0;
      if(recenter&&!cameraFlight&&centered&&panX===0&&panY===0&&(next==='free-view'||distanceScale===1))return;
      const retainedZoom=zoom;
      cancelAnimationFrame(flightHandle);
      const from={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,near:camera.near,zoom:camera.zoom,offsetX:camera.view?.offsetX||0,offsetY:camera.view?.offsetY||0,progress:0,freeTransition:(selectedView==='free-view')!==(next==='free-view')};
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
    setRawDetections(view,raw){
      const overlay=rawOverlays.find(overlay=>overlay.view===view);
      if(overlay){overlay.raw=raw;overlay.mapping=rawNames.map(name=>raw.joints.indexOf(name));draw();}
    },
    presentFrame(value,matched=[]){
      frame=Math.max(start,Math.min(end,Math.floor(value)));
      const views=new Map(matched.map(item=>[item.name,item.raw]));
      for(const [view,record] of videoRecords){
        record.screen.visible=views.has(view);
        record.frame=views.has(view)?frame:null;
        if(record.screen.visible)record.texture.commit();
      }
      canvas.dataset.syncState=JSON.stringify({frame,views:Object.fromEntries(views)});
      metricOverlays?.setFrame(frame);draw();
    },
    setPlaying(value){playbackEnabled=Boolean(value);},
    setFrame(value){frame=Math.max(start,Math.min(end,Math.floor(value)));metricOverlays?.setFrame(frame);draw();},
    setMetricSelection(metric,keys=[]){metricOverlays?.setMetric(metric,keys);draw();},
    setMeasurementSelection(keys){metricOverlays?.setSelection(keys);draw();},
    dispose(){cancelAnimationFrame(flightHandle);mediaCleanup.forEach(cleanup=>cleanup());disposed=true;cancelAnimationFrame(animationHandle);resizeObserver.disconnect();depthCompositor?.dispose();renderer.dispose();if(resources.singleScene)renderer.forceContextLoss();const geometries=new Set(),materials=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});},
  };
  if(bannerMode&&bannerMetrics){
    metricOverlays=createBannerOverlays({scene,toWorld:vector,canvas,data:poseData,metrics:bannerMetrics,requestRender:draw});
    snapshotOverlayView=metricOverlays.updateView;mediaCleanup.push(()=>metricOverlays.dispose());
  }
  if(videoMetrics){
    metricOverlays=createVideoMetricOverlays({scene,toWorld:vector,canvas,data:poseData,metrics:videoMetrics,requestRender:draw,setPoses:setSnapshotPoseOpacity});
    snapshotOverlayView=metricOverlays.updateView;mediaCleanup.push(()=>metricOverlays.dispose());
  }
  if(measurementMetrics){
    if(measurementFeature==='hip-translation')setSnapshotPoseOpacity(0,.35);
    metricOverlays=createMeasurementOverlays({scene,toWorld:vector,canvas,data:poseData,metrics:measurementMetrics,feature:measurementFeature,requestRender:draw});
    snapshotOverlayView=metricOverlays.updateView;mediaCleanup.push(()=>metricOverlays.dispose());
  }
  if(snapshot){
    const playback=mountSnapshotExplanation(card,{id,poseData,metrics:snapshotMetrics,entry,scene,toWorld:vector,setPoses:setSnapshotPoseOpacity,draw,canvas,navigation,
      setRotationPivot:value=>{snapshotRotationPivot=value;},setCamera:value=>{snapshotCamera=value;},setPairFocus:value=>{snapshotPairFocus=value;},
      setFocus:(origin,amount)=>{snapshotFocus.copy(vector(origin)).multiplyScalar(amount);snapshotFocusZoom=1+2.4*amount;},
    });
    snapshotOverlayView=playback.updateView;draw();
    mediaCleanup.push(()=>playback.dispose());
  }
  if(snapshot){
    await new Promise(resolve=>requestAnimationFrame(()=>{draw();resolve();}));
    card.querySelector('.snapshot-placeholder')?.remove();card.setAttribute('aria-busy','false');
  }
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
