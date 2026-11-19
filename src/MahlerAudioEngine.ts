import type Hls from 'hls.js';

/** One controller per persistent DOM audio node; HLS never owns another player. */
export class MahlerAudioEngine {
 private hls:Hls|null=null;
 private generation=0;
 private seekGeneration=0;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private restoreTimer:ReturnType<typeof setTimeout>|undefined;
 private restore:(()=>void)|null=null;
 private sourceAbort=new AbortController();
 constructor(readonly audio:HTMLAudioElement,private fade:(value:number,seconds:number)=>void){}
 load(url:string,fallback?:string){
  const token=++this.generation;this.sourceAbort.abort();this.sourceAbort=new AbortController();this.cancelSeek();this.hls?.destroy();this.hls=null;
  this.audio.pause();this.audio.preload='auto';
  const playlist=/\.m3u8(?:$|[?#])/i.test(url);
  // Edge also advertises native HLS, but its native buffering cannot honor our
  // 60s/60s policy. Prefer MSE there; Safari retains its native HLS pipeline.
  const nativeSafari=playlist&&this.audio.canPlayType('application/vnd.apple.mpegurl')&&/Safari/.test(navigator.userAgent)&&!/(Chrome|Chromium|Edg|OPR)/.test(navigator.userAgent);
  if(!playlist||nativeSafari){
   this.audio.src=url;this.audio.load();return;
  }
  this.audio.removeAttribute('src');this.audio.load();
  void import('hls.js').then(({default:Hls})=>{
   if(token!==this.generation)return;
   if(!Hls.isSupported()){if(this.audio.canPlayType('application/vnd.apple.mpegurl')){this.audio.src=url;this.audio.load()}else if(fallback)this.useFallback(fallback);else this.audio.dispatchEvent(new Event('error'));return}
   const hls=new Hls({maxBufferLength:60,maxMaxBufferLength:60,backBufferLength:60,enableWorker:true});this.hls=hls;
   hls.on(Hls.Events.ERROR,(_event,data)=>{if(token===this.generation&&data.fatal){if(fallback)this.useFallback(fallback);else this.audio.dispatchEvent(new Event('error'))}});
   hls.attachMedia(this.audio);hls.loadSource(url);
  }).catch(()=>{if(token===this.generation){if(fallback)this.useFallback(fallback);else this.audio.dispatchEvent(new Event('error'))}});
 }
 private useFallback(url:string){
  const time=this.audio.currentTime,resume=!this.audio.paused;this.load(url);const token=this.generation;
  this.audio.addEventListener('loadedmetadata',()=>{
   if(token!==this.generation)return;
   if(time>0)this.audio.currentTime=Math.min(time,this.audio.duration);
   if(resume)void this.audio.play().catch(()=>{if(token===this.generation)this.audio.dispatchEvent(new Event('error'))});
  },{once:true,signal:this.sourceAbort.signal});
 }
 seek(time:number){
  const a=this.audio,target=Math.max(0,Math.min(time,Number.isFinite(a.duration)?a.duration:time));
  if(!Number.isFinite(target))return;
  this.cancelSeek();const token=++this.seekGeneration;
  if(a.paused||a.ended){a.currentTime=target;return}
  this.fade(.001,.04);
  this.timer=setTimeout(()=>{
   if(token!==this.seekGeneration)return;
   const restore=()=>{if(token!==this.seekGeneration)return;this.clearRestore();this.fade(1,.06)};
   this.restore=restore;a.addEventListener('seeked',restore);a.addEventListener('canplay',restore);
   a.currentTime=target;
   // A failed/no-op seek must never leave the gain attenuated indefinitely.
   this.restoreTimer=setTimeout(restore,2000);
  },40);
 }
 private clearRestore(){clearTimeout(this.restoreTimer);if(this.restore){this.audio.removeEventListener('seeked',this.restore);this.audio.removeEventListener('canplay',this.restore);this.restore=null}}
 cancelSeek(){this.seekGeneration++;clearTimeout(this.timer);this.clearRestore();this.fade(1,.06)}
 dispose(){this.generation++;this.sourceAbort.abort();this.cancelSeek();this.hls?.destroy();this.hls=null}
}
