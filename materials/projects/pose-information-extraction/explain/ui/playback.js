// One visibility-aware clock for all explanation players. Metric code receives
// elapsed milliseconds and owns its own timeline; the clock owns browser lifecycle.
export function createPlaybackClock({root,target,onAdvance,onPlayingChange=()=>{},playing=!matchMedia('(prefers-reduced-motion: reduce)').matches},runtime={
 request:callback=>requestAnimationFrame(callback),
 cancel:handle=>cancelAnimationFrame(handle),
 observe:(target,callback)=>{const observer=new IntersectionObserver(entries=>callback(entries[0].isIntersecting));observer.observe(target);return ()=>observer.disconnect();},
 hidden:()=>document.hidden,
}){
 let last,handle,visible=false,disposed=false;
 const stopObserving=runtime.observe(target,isVisible=>{visible=isVisible;last=undefined;});
 function tick(now){
  if(disposed||!root.isConnected)return;
  const active=playing&&visible&&!runtime.hidden()&&!root.closest('[inert]');
  if(active)onAdvance(last===undefined?0:now-last);
  last=active?now:undefined;
  handle=runtime.request(tick);
 }
 handle=runtime.request(tick);
 return {
  get playing(){return playing;},
  setPlaying(value){playing=Boolean(value);last=undefined;onPlayingChange(playing);},
  dispose(){disposed=true;runtime.cancel(handle);stopObserving();},
 };
}
