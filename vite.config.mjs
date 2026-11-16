import {defineConfig,loadEnv} from 'vite';
import {readFile,stat,mkdir,copyFile,cp} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,extname} from 'node:path';
import {parseByteRange} from './scripts/audio-range.mjs';
const mime={'.m4a':'audio/mp4','.flac':'audio/flac','.m3u8':'application/vnd.apple.mpegurl','.m4s':'audio/mp4','.mp4':'audio/mp4'};
async function hash(path){const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return 'sha256:'+h.digest('hex')}
export default defineConfig(({mode,command})=>{
 const pages=command==='build'&&mode!=='local';
 let library,outDir,building=false;const audioFiles=new Map();
 return {build:{copyPublicDir:true},server:{host:'127.0.0.1',fs:{deny:['**/.git/**','**/.env*','**/Recording/**','**/.local/**']}},plugins:[{
  name:'project-recording-assets',
  async configResolved(config){
   building=config.command==='build';outDir=resolve(config.build.outDir);library=JSON.parse((await readFile('.local/recording.json','utf8')).replace(/^\uFEFF/,''));
   for(const track of [...library.continuousTracks,...(library.webTracks||[])]){
    audioFiles.set(track.url,resolve(track.file));
    if(!track.hls)continue;
    const directory=resolve('.local/audio/hls',track.trackId.replace('-continuous',''));
    const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));
    if(manifest.sourceFingerprint!==track.fingerprint)throw Error('HLS source fingerprint mismatch');
    for(const entry of manifest.files){
     if(!/^(index\.m3u8|init\.mp4|segment_\d+\.m4s)$/.test(entry.name))throw Error('Unexpected HLS asset');
     const file=resolve(directory,entry.name);
     if(building&&await hash(file)!==entry.fingerprint)throw Error('HLS segment fingerprint mismatch');
     audioFiles.set(track.hls.url.replace('index.m3u8',entry.name),file);
    }
   }
  },
  configureServer(server){server.middlewares.use(async(req,res,next)=>{
   const path=(req.url||'').split('?')[0];if(!path.startsWith('/audio/'))return next();
   const target=audioFiles.get(path);if(!target||!['GET','HEAD'].includes(req.method)){res.statusCode=404;res.end();return}
   try{
    const cache=resolve('.local/audio');if(!target.startsWith(cache+'/')&&!target.startsWith(cache+String.fromCharCode(92)))throw Error('outside audio cache');
    const info=await stat(target),range=parseByteRange(req.headers.range,info.size);
    if(range===null){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}
    const {start,end}=range,headers={'Content-Type':mime[extname(target)],'Accept-Ranges':'bytes','Cache-Control':'no-cache','Content-Length':end-start+1};
    if(req.headers.range)headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    res.writeHead(req.headers.range?206:200,headers);if(req.method==='HEAD'){res.end();return}
    const stream=createReadStream(target,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
   }catch{res.statusCode=404;res.end()}
  })},
  async closeBundle(){if(!building)return;for(const [url,file] of audioFiles){if(pages&&(file.endsWith('.flac')||(file.endsWith('.m4a')&&(await stat(file)).size>=24000000)))continue;const target=resolve(outDir,url.slice(1));await mkdir(dirname(target),{recursive:true});await copyFile(file,target)}}
 }]};
});
