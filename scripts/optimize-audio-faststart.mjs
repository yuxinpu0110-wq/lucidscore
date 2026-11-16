import {readdir,rename,unlink,readFile,writeFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve,extname} from 'node:path';
import {spawn} from 'node:child_process';
import {isFaststart} from './audio-atoms.mjs';
const root=resolve(process.argv[2]||'.local/audio'),check=process.argv.includes('--check');
let checked=0,changed=0;const remuxed=new Set();
async function walk(directory){for(const item of await readdir(directory,{withFileTypes:true})){
 const path=join(directory,item.name);if(item.isDirectory()){await walk(path);continue}
 if(!['.m4a','.mp4','.aac'].includes(extname(path).toLowerCase())||item.name.includes('.faststart-tmp.'))continue;
 // ADTS .aac has no MP4 index. Remuxing it as .aac cannot add a moov atom.
 if(extname(path).toLowerCase()==='.aac'){console.log('ADTS AAC: no moov index; use M4A or HLS for indexed seeking:',path);continue}
 if(item.name==='init.mp4'){console.log('HLS initialization header (no media payload):',path);continue}
 checked++;if(await isFaststart(path)){console.log('Faststart verified:',path);continue}
 if(check)throw Error(`moov is not before mdat: ${path}`);
 const temporary=path+'.faststart-tmp'+extname(path);
 try{await new Promise((accept,reject)=>{const child=spawn('ffmpeg',['-nostdin','-v','error','-i',path,'-map','0','-c','copy','-movflags','+faststart','-y',temporary],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',c=>error+=c);child.on('error',reject);child.on('close',code=>code===0?accept():reject(Error(error)))});
  if(!await isFaststart(temporary))throw Error('Remux did not produce faststart');await rename(temporary,path);changed++;remuxed.add(resolve(path));
 }finally{await unlink(temporary).catch(()=>{})}
}}
await walk(root);
if(changed){
 let local;try{local=JSON.parse(await readFile('.local/recording.json','utf8'))}catch{}
 const updates=[];for(const track of local?.webTracks||[]){if(!remuxed.has(resolve(track.file)))continue;
  const hash=createHash('sha256');for await(const chunk of createReadStream(track.file))hash.update(chunk);
  track.fingerprint='sha256:'+hash.digest('hex');track.bytes=(await stat(track.file)).size;delete track.hls;updates.push(track);
 }
 if(updates.length){
  const publicManifest=JSON.parse(await readFile('content/real/web-audio.json','utf8'));
  for(const track of updates){const entry=publicManifest.tracks.find(t=>t.trackId===track.trackId);if(!entry)throw Error('Missing delivery manifest entry');entry.fingerprint=track.fingerprint;entry.bytes=track.bytes;delete entry.hls}
  await writeFile('.local/recording.json',JSON.stringify(local,null,2)+'\n');await writeFile('content/real/web-audio.json',JSON.stringify(publicManifest,null,2)+'\n');
  console.log('Refreshed remuxed delivery fingerprints; regenerate optional HLS with npm run audio:hls.');
 }
}
console.log(`MP4 files checked: ${checked}; losslessly remuxed: ${changed}.`);
