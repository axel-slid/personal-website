import {execFileSync} from 'node:child_process';
import {mkdirSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const cwd=dirname(fileURLToPath(import.meta.url));
const output=resolve(cwd,'../../openleaf/demo');
mkdirSync(output,{recursive:true});
for (const [id,frame] of [['Papers',35],['Python',270],['Slides',200]]) {
 const name=id.toLowerCase()+'-remotion';
 execFileSync(resolve(cwd,'node_modules/.bin/remotion'),['render','src/index.jsx',id,resolve(output,name+'.mp4'),'--codec=h264','--crf=21','--pixel-format=yuv420p','--concurrency=3','--overwrite','--log=error'],{cwd,stdio:'inherit'});
 execFileSync(resolve(cwd,'node_modules/.bin/remotion'),['still','src/index.jsx',id,resolve(output,name+'.jpg'),'--frame='+frame,'--image-format=jpeg','--overwrite','--log=error'],{cwd,stdio:'inherit'});
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',resolve(output,name+'.mp4'),'-c:v','copy','-an','-movflags','+faststart',resolve(output,name+'.silent.mp4')],{stdio:'inherit'});
 renameSync(resolve(output,name+'.silent.mp4'),resolve(output,name+'.mp4'));
 console.log('Rendered '+id);
}
