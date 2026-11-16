import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
const local=JSON.parse(await readFile('.local/recording.json','utf8'));
async function hash(path){const h=createHash('sha256');for await(const c of createReadStream(path))h.update(c);return 'sha256:'+h.digest('hex')}
for(const track of local.webTracks){
 const movement=Number(/movement-(\d)/.exec(track.trackId)[1]),directory=resolve('.local/audio/hls',`movement-${movement}`);
 await mkdir(directory,{recursive:true});
 await new Promise((accept,reject)=>{const child=spawn('ffmpeg',['-nostdin','-v','error','-i',resolve(track.file),'-map','0:a:0','-c:a','copy','-f','hls','-hls_time','4','-hls_playlist_type','vod','-hls_segment_type','fmp4','-hls_fmp4_init_filename','init.mp4','-hls_segment_filename','segment_%04d.m4s','-y','index.m3u8'],{cwd:directory,windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',c=>error+=c);child.on('error',reject);child.on('close',code=>code===0?accept():reject(Error(error)))});
 const playlist=await readFile(join(directory,'index.m3u8'),'utf8'),duration=[...playlist.matchAll(/#EXTINF:([\d.]+)/g)].reduce((n,m)=>n+Number(m[1]),0);
 if(Math.abs(duration-track.duration)>.1)throw Error('HLS duration changed');
 const names=['index.m3u8','init.mp4',...playlist.split(/\r?\n/).filter(n=>/^segment_\d+\.m4s$/.test(n))];
 const files=[];for(const name of names)files.push({name,fingerprint:await hash(join(directory,name)),bytes:(await stat(join(directory,name))).size});
 const manifest={version:1,sourceFingerprint:track.fingerprint,duration,files};await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 track.hls={url:`/audio/hls/movement-${movement}/index.m3u8`,duration,fingerprint:files.find(f=>f.name==='index.m3u8').fingerprint};
 console.log(`HLS movement ${movement}: ${files.length-2} four-second segments; stream copy, ${duration.toFixed(3)}s`);
}
await writeFile('.local/recording.json',JSON.stringify(local,null,2)+'\n');
const publicManifest=JSON.parse(await readFile('content/real/web-audio.json','utf8'));for(const t of publicManifest.tracks)t.hls=local.webTracks.find(s=>s.trackId===t.trackId).hls;await writeFile('content/real/web-audio.json',JSON.stringify(publicManifest,null,2)+'\n');
