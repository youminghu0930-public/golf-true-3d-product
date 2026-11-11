import {Matrix4,Euler} from '../vendor/three/three.module.js';
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,k)=>a.map(v=>v*k);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length=a=>Math.hypot(...a);
export const unit=a=>{const n=length(a);if(n<1e-10)throw new Error('This frame has no usable direction for this measurement.');return mul(a,1/n);};
export const project=(a,n)=>sub(a,mul(n,dot(a,n)/dot(n,n)));
export const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
export const deg=r=>r*180/Math.PI;
export const rad=d=>d*Math.PI/180;
export const spin=(a,b,n)=>{const x=unit(project(a,n)),y=unit(project(b,n));return deg(Math.atan2(dot(unit(n),cross(x,y)),dot(x,y)));};
export const planeAngle=(a,n)=>deg(Math.asin(Math.max(-1,Math.min(1,dot(unit(a),unit(n))))));
export function rotate(v,n,degrees){const axis=unit(n),r=rad(degrees);return add(add(mul(v,Math.cos(r)),mul(cross(axis,v),Math.sin(r))),mul(axis,dot(axis,v)*(1-Math.cos(r))));}
export function torsoBasis(left,up){const y=unit(up),x=unit(project(left,y));return {x,y,z:unit(cross(x,y))};}
export function eulerYXZ({x,y,z}){const m=new Matrix4().set(x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,0,0,0,1);const e=new Euler().setFromRotationMatrix(m,'YXZ');return {turn:deg(e.y),bend:deg(e.x),tilt:deg(e.z)};}
