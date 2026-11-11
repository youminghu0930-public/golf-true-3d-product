import {make} from './dom.js';
export function createResetView(canvas,navigation){
 const button=make('button',undefined,'explain-reset-view');button.type='button';
 button.setAttribute('aria-label','Reset view');button.title='Reset view';
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 path.setAttribute('d','M4 10a8 8 0 1 1 1 7M4 4v6h6');svg.append(path);button.append(svg);
 button.onclick=event=>{event.stopPropagation();navigation.reset();};canvas.parentElement.append(button);
 return {dispose(){button.remove();}};
}
