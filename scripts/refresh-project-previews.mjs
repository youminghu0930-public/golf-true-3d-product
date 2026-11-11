// Run explicitly when a child's banner changes. Runtime/build uses committed copies.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const content = JSON.parse(await fs.readFile(path.join(root, 'materials/content.json'), 'utf8'));
const projects = content.sections.flatMap(section => section.projects || []);
for (const project of projects) {
  const source = path.resolve(root, '..', project.id);
  const target = path.join(root, 'materials/projects', project.id);
  const copy = async relative => {
    await fs.mkdir(path.dirname(path.join(target, relative)), {recursive:true});
    await fs.copyFile(path.join(source, relative), path.join(target, relative));
  };
  const visited = new Set();
  async function copyModule(relative) {
    if (visited.has(relative)) return;
    visited.add(relative);
    let code = await fs.readFile(path.join(source, relative), 'utf8');
    // Child modules retain their own data namespace, even on GitHub project paths.
    if (relative === 'hero-banner.js' || relative === 'snapshot-3d.js') {
      code = code.replaceAll('fetch(url', 'fetch(new URL(url, import.meta.url)');
    }
    if (relative === 'snapshot-3d.js') {
      code = code.replace('Math.min(devicePixelRatio || 1, autoPlay ? 2 : 1.5)', 'Math.min(devicePixelRatio || 1, bannerMode ? 2 : autoPlay ? 2 : 1.5)');
    }
    if (relative === 'hero-banner.js') {
      code = code.replace('video.src=source.src;', 'video.src=new URL(source.src,import.meta.url).href;');
      code = code.replace("video.addEventListener('loadeddata'", "video.addEventListener('canplay',sync);\n  video.addEventListener('loadeddata'");
      code = code.replace("if(visible&&!document.hidden)", "if(visible&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)");
    }
    await fs.mkdir(path.dirname(path.join(target, relative)), {recursive:true});
    await fs.writeFile(path.join(target, relative), code);
    for (const match of code.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+\.js)['"]/g)) {
      await copyModule(path.normalize(path.join(path.dirname(relative), match[1])));
    }
  }
  await copyModule('hero-banner.js');
  const catalog = JSON.parse(await fs.readFile(path.join(source, 'materials/data/videos.json'), 'utf8'));
  const clip = catalog.find(clip => clip.id === project.banner.swing);
  if (!clip) throw new Error(`Missing banner swing for ${project.id}`);
  const view = clip.views.find(view => view.name === 'face-on');
  if (!view) throw new Error(`Missing face-on view for ${project.id}`);
  for (const file of [view.src, view.src+'.frames.json', clip.sync].filter(Boolean)) await copy(file);
  const result = project.id === 'two-event-time-sync' ? `after/${clip.id}` : clip.id;
  await copy(`materials/data/3d_results/${result}.json`);
  if (project.id === 'pose-information-extraction') await copy(`materials/data/metrics/${clip.id}.json`);
  await fs.mkdir(path.join(target, 'materials/data'), {recursive:true});
  await fs.writeFile(path.join(target, 'materials/data/videos.json'), JSON.stringify([{...clip,views:[view]}],null,2)+'\n');
  console.log(`Copied ${project.id}: swing ${clip.id}, ${visited.size} modules`);
}
