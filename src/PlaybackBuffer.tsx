import {useEffect,useState,type RefObject} from 'react';
/** Native buffering feedback stays local; it never pauses or opens exploration. */
export function PlaybackBuffer({audio,url}:{audio:RefObject<HTMLAudioElement|null>;url:string}){
 const [ranges,Ranges]=useState<[number,number][]>([]),[waiting,Waiting]=useState(false);
 useEffect(()=>{
  const a=audio.current;if(!a)return;let timer:ReturnType<typeof setTimeout>|undefined;
  const progress=()=>{const spans:[number,number][]=[];if(Number.isFinite(a.duration)&&a.duration>0)for(let i=0;i<a.buffered.length;i++)spans.push([a.buffered.start(i)/a.duration*100,a.buffered.end(i)/a.duration*100]);Ranges(spans)};
  const clear=()=>{clearTimeout(timer);Waiting(false);progress()};
  const wait=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!a.paused&&!a.ended&&a.readyState<3)Waiting(true)},400)};
  const listeners={progress,waiting:wait,stalled:wait,seeking:wait,playing:clear,canplay:clear,seeked:clear,pause:clear,ended:clear,emptied:clear,error:clear};
  for(const [event,fn]of Object.entries(listeners))a.addEventListener(event,fn);
  Ranges([]);Waiting(false);progress();
  return()=>{clearTimeout(timer);for(const [event,fn]of Object.entries(listeners))a.removeEventListener(event,fn)};
 },[audio,url]);
 return <div className="playback-buffer" data-buffering={waiting}>
  <div className="playback-buffer-track" aria-hidden="true">{ranges.map(([from,to],i)=><span key={i} style={{left:`${from}%`,width:`${to-from}%`}}/>)}</div>
  {waiting&&<span role="status" className="playback-buffer-message">正在缓冲，稍候会继续播放…</span>}
 </div>;
}
