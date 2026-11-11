// Keep the template's continuous PCF silhouette. Fade shadow strength rather
// than discarding random shadow-map pixels when the demonstration fades poses.
export function updatePoseShadowStrength(light,referenceOpacity,selectedOpacity){
 const opacity=Math.max(referenceOpacity,selectedOpacity);
 light.shadow.intensity=Math.max(0,Math.min(1,opacity));
}
