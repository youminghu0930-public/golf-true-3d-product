import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),catalogURL=new URL('materials/data/snapshot-videos.json',root);
const catalog=JSON.parse(await fs.readFile(catalogURL,'utf8'));
for(const clip of catalog)for(const view of clip.views){
  const original=view.src.replace(/-seek\.mp4$/,'.mp4'),output=original.replace(/\.mp4$/,'-seek.mp4');
  const source=fileURLToPath(new URL(original,root)),destination=fileURLToPath(new URL(output,root));
  const result=spawnSync('ffmpeg',['-v','error','-y','-i',source,'-map','0:v:0','-an','-c:v','libx264','-preset','fast','-crf','20','-g','1','-keyint_min','1','-bf','0','-fps_mode','passthrough','-movflags','+faststart',destination],{stdio:'inherit'});
  if(result.status!==0)throw new Error(`Could not build ${output}`);
  const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',destination],{encoding:'utf8'});
  if(probe.status!==0)throw new Error(`Could not verify ${output}`);
  const times=JSON.parse(probe.stdout).frames.map(frame=>Number(frame.best_effort_timestamp_time));
  const reference=JSON.parse(await fs.readFile(new URL(original+'.frames.json',root),'utf8'));
  if(times.length!==reference.length||times.some((time,i)=>Math.abs(time-reference[i])>0.00001))throw new Error(`Frame timing changed: ${output}`);
  await fs.writeFile(new URL(output+'.frames.json',root),JSON.stringify(times));view.src=output;
  console.log(`Verified ${output}: ${times.length} frames, identical timestamps, every frame seekable.`);
}
await fs.writeFile(catalogURL,JSON.stringify(catalog,null,2)+'\n');
