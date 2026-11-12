import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../materials/projects/pose-information-extraction/vendor/three/three.module.js';
import {createVector2DOverlay,trimVectorConnection,screenToWorldFraction} from '../vector-2d-overlay.js';
class Element{
 constructor(tag){this.tag=tag;this.attributes={};this.children=[];this.style={};this.dataset={};this.offsetLeft=this.offsetTop=0;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k];}
 append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);}}
 after(node){this.parentElement.append(node);}
 remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}}
}
function fixture(t){
 const previousDocument=globalThis.document,previousStyle=globalThis.getComputedStyle;
 globalThis.document={createElementNS:(_,tag)=>new Element(tag)};globalThis.getComputedStyle=()=>({position:'relative'});
 t.after(()=>{globalThis.document=previousDocument;globalThis.getComputedStyle=previousStyle;});
 const parent=new Element('article'),canvas=new Element('canvas');parent.append(canvas);
 const names=['left_wrist','right_wrist','golf_club_shaft'],edges=[[0,1]],group=new THREE.Group(),scene=new THREE.Scene();scene.add(group);
 const camera=new THREE.PerspectiveCamera(90,1,.01,100);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const overlay={view:'face-on',group,depth:2,K:[[100,0,100],[0,100,100],[0,0,1]],raw:{pred:[[[80,100],[120,100],[100,100]]]},mapping:[0,1,2],overlayColor:'#ffce69'};
 const controller=createVector2DOverlay(canvas,{names,edges});
 const render=()=>controller.render({camera,scene,overlays:[overlay],frame:0,w:200,h:200});
 return {controller,render,scene,group,camera,parent,root:parent.children[1]};
}
const close=(a,b)=>assert.ok(Math.abs(Number(a)-b)<1e-8,`${a} != ${b}`);
test('screen-space trimming preserves ring clearance and perspective depth interpolation',()=>{
 assert.equal(trimVectorConnection({x:0,y:0},{x:10,y:0},5),null);
 assert.deepEqual(trimVectorConnection({x:0,y:0},{x:40,y:0},8),{start:.2,end:.8});
 close(screenToWorldFraction(.5,1,2),1/3);
});
test('2D joints and links are SVG primitives and track camera zoom',t=>{
 const f=fixture(t);f.render();const layer=f.root.children[0],path=layer.children[0],left=layer.children[1];
 assert.equal(path.tag,'path');assert.ok(path.getAttribute('d').startsWith('M86.800,100.000'));
 assert.equal(path.getAttribute('stroke-linecap'),'round');
 const ringRadius=Number(left.children[0].getAttribute('r')),ringStroke=Number(left.children[0].getAttribute('stroke-width')),boneStroke=Number(path.getAttribute('stroke-width'));
 close(boneStroke,ringStroke);
 const endpoint=Number(path.getAttribute('d').match(/^M([^,]+)/)[1])-80;
 close(endpoint,ringRadius);
 // The round cap ends precisely at the hollow ring's inner boundary.
 close(endpoint-boneStroke/2,ringRadius-ringStroke/2);
 assert.equal(left.children[0].tag,'circle');close(left.children[0].getAttribute('cx'),80);assert.equal(left.children[1].getAttribute('fill'),'#3b82f6');
 assert.equal(layer.children[3].style.display,'none'); // hidden shaft midpoint
 f.camera.zoom=2;f.camera.updateProjectionMatrix();f.render();close(left.children[0].getAttribute('cx'),60);
 f.controller.dispose();assert.equal(f.parent.children.length,1);
});
test('vector components behind the observer are hidden',t=>{
 const f=fixture(t);f.group.position.z=5;f.render();const layer=f.root.children[0];assert.equal(layer.children[0].getAttribute('d'),'');
 assert.equal(layer.children[1].style.display,'none');
});
test('opaque scene geometry occludes vectors while translucent camera planes do not',t=>{
 const f=fixture(t);const box=new THREE.Mesh(new THREE.BoxGeometry(1,1,.1),new THREE.MeshBasicMaterial());box.position.z=-1;f.scene.add(box);f.render();
 const layer=f.root.children[0];assert.equal(layer.children[0].getAttribute('d'),'');assert.equal(layer.children[1].style.display,'none');
 box.material.transparent=true;box.material.opacity=.3;f.render();assert.ok(layer.children[0].getAttribute('d').length>0);assert.equal(layer.children[1].style.display,'');
});
