// Brief action feedback like a video player: show the action just taken, then
// fade it away. The window remains the only play/pause click target.
export function createPlaybackFeedback(canvas){
 const root=document.createElement('div');root.className='explain-playback-feedback';root.setAttribute('aria-hidden','true');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
 svg.setAttribute('viewBox','0 0 32 32');svg.append(path);root.append(svg);canvas.parentElement.append(root);
 let animation;
 return {
  show(playing){
   animation?.cancel();root.dataset.action=playing?'play':'pause';
   path.setAttribute('d',playing?'M11 7 L25 16 L11 25 Z':'M9 8 H14 V24 H9 Z M18 8 H23 V24 H18 Z');
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   const transform=scale=>`translate(-50%,-50%) scale(${reduced?1:scale})`;
   animation=root.animate([
    {opacity:.95,transform:transform(.85)},
    {opacity:.95,transform:transform(1),offset:.2},
    {opacity:0,transform:transform(1.4)},
   ],{duration:reduced?250:650,easing:'ease-out'});
  },
  dispose(){animation?.cancel();root.remove();},
 };
}
