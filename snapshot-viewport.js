// Keep the optical/zoom center in the clear region above a bottom overlay.
// The overlay offset is separate from user pan so zoom scales only manual pan.
export function snapshotViewCenter(height,stripTop=height,panX=0,panY=0){
  const clearHeight=Math.max(0,Math.min(height,stripTop));
  return {clearHeight,cameraZoomScale:height>0?clearHeight/height:1,centerY:clearHeight/2,offsetX:-panX,offsetY:(height-clearHeight)/2-panY};
}
