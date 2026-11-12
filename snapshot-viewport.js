// Keep the optical/zoom center in the clear region above a bottom overlay.
// The overlay offset is separate from user pan so zoom scales only manual pan.
export function snapshotViewCenter(height,stripTop=height,panX=0,panY=0){
  const clearHeight=Math.max(0,Math.min(height,stripTop));
  return {clearHeight,cameraZoomScale:height>0?clearHeight/height:1,centerY:clearHeight/2,offsetX:-panX,offsetY:(height-clearHeight)/2-panY};
}

// Move a projected fixed focus into the usable area's center, retaining user pan.
export function focusedSnapshotOffset(width,height,viewport,projected){
 const targetY=1-viewport.clearHeight/height;
 return {offsetX:viewport.offsetX+projected.x*width/2,offsetY:viewport.offsetY+(targetY-projected.y)*height/2};
}
