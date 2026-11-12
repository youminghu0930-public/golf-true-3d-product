import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const content = JSON.parse(await fs.readFile(new URL('materials/content.json', root), 'utf8'));
if (content.sections.map(section => section.id).join() !== 'abstract,introduction,method,results,discussion,conclusion') {
  throw new Error('Expected the six project sections in order');
}
await fs.rm(new URL('dist/', root), {recursive: true, force: true});
await fs.mkdir(new URL('dist/materials/', root), {recursive: true});
for (const file of ['index.html', 'styles.css', 'main.js', '.nojekyll', 'materials/content.json', 'snapshot-viewer.js', 'snapshot-scene.js', 'snapshot-transition.js', 'snapshot-texture.js', 'snapshot-pipeline.js', 'vector-2d-overlay.js', 'viewer-info.js', 'frame-seeker.js']) {
  await fs.copyFile(new URL(file, root), new URL(`dist/${file}`, root));
}
await fs.cp(new URL('materials/projects/', root), new URL('dist/materials/projects/', root), {recursive:true});
for(const folder of ['3d_results','2d_detections','previews','videos']) await fs.cp(new URL(`materials/data/${folder}/`,root),new URL(`dist/materials/data/${folder}/`,root),{recursive:true});
for(const file of ['snapshot.json','snapshot-videos.json'])await fs.copyFile(new URL(`materials/data/${file}`,root),new URL(`dist/materials/data/${file}`,root));
console.log('Built project page and self-contained project previews in dist/.');
