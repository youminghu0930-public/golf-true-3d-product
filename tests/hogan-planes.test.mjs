import test from 'node:test';
import assert from 'node:assert/strict';
import {createHoganPlanes,isInsideHoganEnvelope,averageShaftLength,distanceToHoganPanes} from '../hogan-planes.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const fixture={head:[0,.05,0],leftAnkle:[-1,0,1],rightAnkle:[1,.2,1],shoulder:[.1,1.6,1],hip:[-.1,.9,.8],trajectory:[[-1.3,.05,0],[1.8,2.2,1.1],[.5,1.7,1.6]]};
test('Hogan panes share a horizontal club-head edge, are square and stay above it',()=>{
 const panes=createHoganPlanes(fixture);
 assert.deepEqual(panes[0].corners.slice(0,2),panes[1].corners.slice(0,2));
 for(const pane of panes){
  assert.equal(pane.along[1],0);
  const c=pane.corners;
  for(let i=0;i<4;i++)assert.ok(Math.abs(Math.hypot(...sub(c[i],c[(i+1)%4]))-pane.side)<1e-9);
  assert.ok(Math.abs(dot(sub(c[1],c[0]),sub(c[3],c[0])))<1e-9);
  for(const p of c)assert.ok(p[1]>=fixture.head[1]);
  const v=sub(fixture.head,c[0]);assert.ok(Math.abs(dot(v,pane.rise))<1e-9);assert.ok(dot(v,pane.along)>=0&&dot(v,pane.along)<=pane.side);
 }
});
test('Each pane contains its torso reference and projected club trajectory with margin',()=>{
 createHoganPlanes(fixture).forEach((pane,i)=>{
  const target=i?fixture.hip:fixture.shoulder,delta=sub(target,pane.corners[0]);
  const reconstructed=pane.corners[0].map((v,j)=>v+dot(delta,pane.along)*pane.along[j]+dot(delta,pane.rise)*pane.rise[j]);
  assert.ok(Math.hypot(...sub(target,reconstructed))<1e-9);
  for(const point of [target,...fixture.trajectory]){
   const offset=sub(point,pane.corners[0]),x=dot(offset,pane.along),y=dot(offset,pane.rise);
   assert.ok(x>0&&x<pane.side);assert.ok(y>=-1e-9&&y<pane.side);
  }
 });
});

test('Envelope classification includes both panes and excludes all outer faces',()=>{
 const panes=createHoganPlanes(fixture),[a,b]=panes,side=a.side;
 const point=(x,u,v)=>a.corners[0].map((value,i)=>value+x*a.along[i]+u*a.rise[i]+v*b.rise[i]);
 for(const coordinates of [[side/2,side/4,side/4],[0,0,0],[side,side,0],[side/2,0,side/2],[side/2,side/2,0]])assert.equal(isInsideHoganEnvelope(point(...coordinates),panes),true);
 for(const coordinates of [[-0.1,0,0],[side+.1,0,0],[side/2,-.1,.5],[side/2,.5,-.1],[side/2,side,side]])assert.equal(isInsideHoganEnvelope(point(...coordinates),panes),false);
});

test('Green tolerance uses average grip-to-heel shaft length and finite-pane distance',()=>{
 const average=averageShaftLength([[[0,0,0],[0,2,0]],[[0,0,0],[0,4,0]],[[0,0,0],null]],0,1);
 assert.equal(average,3);
 const panes=createHoganPlanes(fixture),pane=panes[0];
 const point=pane.corners[0].map((v,i)=>v+pane.side*.5*pane.along[i]+pane.side*.5*pane.rise[i]);
 const n=[pane.along[1]*pane.rise[2]-pane.along[2]*pane.rise[1],pane.along[2]*pane.rise[0]-pane.along[0]*pane.rise[2],pane.along[0]*pane.rise[1]-pane.along[1]*pane.rise[0]];
 const offset=distance=>point.map((v,i)=>v+n[i]*distance);
 assert.ok(distanceToHoganPanes(offset(average/20),[pane])<average/10);
 assert.ok(distanceToHoganPanes(offset(average/5),[pane])>average/10);
 const beyond=pane.corners[1].map((v,i)=>v+pane.along[i]);
 assert.ok(Math.abs(distanceToHoganPanes(beyond,[pane])-1)<1e-9);
});
