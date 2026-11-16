import {readFile,writeFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {parseFile} from 'music-metadata';
import {isFaststart} from './audio-atoms.mjs';

// Original FLAC and mapping identities remain intact. These are verified
// delivery derivatives, not interchangeable user-imported recordings.
const local=JSON.parse(await readFile('.local/recording.json','utf8'));
let previous;try{previous=JSON.parse(await readFile('content/real/web-audio.json','utf8'))}catch{}
async function hash(path){const h=createHash('sha256');for await(const c of createReadStream(path))h.update(c);return 'sha256:'+h.digest('hex')}
async function encode(input,output){await new Promise((accept,reject)=>{const child=spawn('ffmpeg',['-nostdin','-v','error','-i',input,'-map','0:a:0','-c:a','aac','-b:a','256k','-map_metadata','-1','-movflags','+faststart','-y',output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',c=>errors+=c);child.on('error',reject);child.on('exit',code=>code===0?accept():reject(Error(errors||'AAC encode failed')))});}
const tracks=[];
for(const source of local.continuousTracks){
 const file=resolve('.local/audio',`movement-${source.movement}-${source.fingerprint.slice(7,27)}-aac256-v1.m4a`);
 const cached=previous?.tracks.find(t=>t.trackId===source.id&&t.sourceFingerprint===source.fingerprint);
 let valid=false;
 try{valid=cached?.fingerprint===await hash(file)}catch{}
 if(!valid){await encode(source.file,file)}
 if(!await isFaststart(file))throw Error(`Movement ${source.movement}: moov must precede mdat; run audio:faststart`);
 const meta=await parseFile(file,{duration:true,skipCovers:true});
 if(Math.abs(meta.format.duration-source.duration)>.1)throw Error(`Movement ${source.movement}: derivative duration mismatch`);
 const fingerprint=await hash(file),bytes=(await stat(file)).size,sourceBytes=(await stat(source.file)).size;
 let hls;
 if(cached?.fingerprint===fingerprint&&cached.hls){try{const directory=resolve('.local/audio/hls',`movement-${source.movement}`),manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));if(manifest.sourceFingerprint===fingerprint&&await hash(resolve(directory,'index.m3u8'))===cached.hls.fingerprint)hls=cached.hls}catch{}}
 tracks.push({trackId:source.id,sourceFingerprint:source.fingerprint,fingerprint,url:`/audio/movement-${source.movement}-web.m4a`,duration:meta.format.duration,bytes,sourceBytes,codec:'aac',bitrate:256000,file,...(hls?{hls}:{})});
 console.log(`Web audio ${source.movement}: ${(bytes/1e6).toFixed(1)} MB / ${(sourceBytes/1e6).toFixed(1)} MB FLAC; duration delta ${(meta.format.duration-source.duration).toFixed(6)}s`);
}
local.webTracks=tracks;await writeFile('.local/recording.json',JSON.stringify(local,null,2)+'\n');
await writeFile('content/real/web-audio.json',JSON.stringify({version:1,tracks:tracks.map(({file,...track})=>track)},null,2)+'\n');
