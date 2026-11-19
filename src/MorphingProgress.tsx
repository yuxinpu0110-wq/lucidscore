import {useEffect,useRef,type ReactNode,type RefObject} from 'react';
import {SkipIcon} from './PlayerIcons';
import {usePlayerInteraction} from './usePlayerInteraction';
const fmt=(time:number)=>{const t=Math.max(0,Math.floor(time));return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`};
type ScrubberProps={audio:RefObject<HTMLAudioElement|null>;start?:number;end:number;disabled:boolean;onDrag:()=>void;onSeek:(time:number)=>void;onDrop:()=>void;label:string;railDecoration?:ReactNode;mapMediaTime?:(time:number)=>number;timeToFraction?:(time:number)=>number;fractionToTime?:(fraction:number)=>number};
type ProgressProps=Omit<ScrubberProps,'start'|'end'|'label'>&{duration:number;children:ReactNode;chapters?:number[]};
export function MorphingProgress({duration,children,...controls}:ProgressProps){
 const {audio,disabled,onSeek}=controls;
 const transport=useRef<HTMLDivElement>(null);
 usePlayerInteraction(transport);
 return <div ref={transport} className="transport morphing-transport">
  {children}
  <button title="快退 5 秒" aria-label="后退 5 秒" disabled={disabled} onClick={()=>onSeek((audio.current?.currentTime||0)-5)}><SkipIcon/></button>
  <div className="morphing-slot"><MorphingScrubber {...controls} end={duration} label="播放位置"/></div>
  <button title="快进 5 秒" aria-label="前进 5 秒" disabled={disabled} onClick={()=>onSeek((audio.current?.currentTime||0)+5)}><SkipIcon forward/></button>
 </div>;
}

export function MorphingScrubber({audio,start=0,end,disabled,onDrag,onSeek,onDrop,label,railDecoration,mapMediaTime,timeToFraction,fractionToTime}:ScrubberProps){
 const timeMapper=useRef(mapMediaTime);timeMapper.current=mapMediaTime;
 const readTime=()=>{const time=audio.current?.currentTime??start;return timeMapper.current?.(time)??time};
 const duration=Math.max(0,end-start);
 const clamp=(time:number)=>Math.max(start,Math.min(start+duration,time));
 const root=useRef<HTMLDivElement>(null),fill=useRef<HTMLDivElement>(null),elapsed=useRef<HTMLSpanElement>(null),remaining=useRef<HTMLSpanElement>(null);
 const track=useRef<HTMLDivElement>(null);
 const previewSegment=useRef<Element|null>(null);
 const segmented=Boolean(railDecoration);
 const gesture=useRef<{kind:'pointer'|'key';id?:number;time:number}|null>(null),callbacks=useRef({onDrag,onSeek,onDrop});callbacks.current={onDrag,onSeek,onDrop};
 const paint=(value:number)=>{
  const t=clamp(value)-start;
  const fraction=timeToFraction?.(t)??(duration>0?t/duration:0);
  if(segmented){
   track.current?.style.setProperty('--scrubber-progress',`${fraction*100}%`);
   const segments=gesture.current?track.current?.firstElementChild?.children:undefined;
   const index=segments?Math.min(segments.length-1,Math.floor(fraction*segments.length)):-1;
   const next=segments?.[index]??null;
   if(previewSegment.current!==next){
    previewSegment.current?.removeAttribute('data-preview');
    next?.setAttribute('data-preview','true');
    previewSegment.current=next;
   }
  }
  else if(fill.current)fill.current.style.transform=`scaleX(${fraction})`;
  if(elapsed.current)elapsed.current.textContent=fmt(t);
  if(remaining.current)remaining.current.textContent=`−${fmt(duration-t)}`;
  root.current?.setAttribute('aria-valuenow',t.toFixed(1));
  root.current?.setAttribute('aria-valuetext',`${fmt(t)} / ${fmt(duration)}`);
 };
 const begin=(kind:'pointer'|'key',id?:number)=>{if(disabled||duration<=0||gesture.current)return;gesture.current={kind,id,time:clamp(readTime())};root.current?.setAttribute('data-scrubbing','true');callbacks.current.onDrag()};
 const point=(x:number)=>{
  const g=gesture.current,rail=root.current?.querySelector('.morphing-rail')?.getBoundingClientRect();
  if(!g||!rail||rail.width<=0)return;
  const fraction=Math.max(0,Math.min(1,(x-rail.left)/rail.width));
  g.time=start+(fractionToTime?.(fraction)??fraction*duration);
  paint(g.time);
 };
 const finish=(commit:boolean)=>{const g=gesture.current;if(!g)return;gesture.current=null;root.current?.setAttribute('data-scrubbing','false');if(commit){callbacks.current.onSeek(g.time);paint(g.time)}else paint(readTime());callbacks.current.onDrop()};
 const finishRef=useRef(finish);finishRef.current=finish;
 useEffect(()=>{
  const a=audio.current;let raf=0,last=0;
  root.current?.setAttribute('data-scrubbing','false');
  const draw=()=>{if(!gesture.current)paint(disabled?(timeMapper.current?.(start)??start):readTime())};
  const frame=(now:number)=>{raf=0;if(now-last>=1000/30){last=now;draw()}if(a&&!a.paused&&!document.hidden)raf=requestAnimationFrame(frame)};
  const wake=()=>{draw();if(!raf&&a&&!a.paused&&!document.hidden)raf=requestAnimationFrame(frame)};
  const cancel=()=>finishRef.current(false);
  for(const e of ['timeupdate','playing','seeked','pause','loadedmetadata','emptied'])a?.addEventListener(e,wake);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',wake);wake();
  return()=>{cancelAnimationFrame(raf);for(const e of ['timeupdate','playing','seeked','pause','loadedmetadata','emptied'])a?.removeEventListener(e,wake);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',wake);gesture.current=null};
 },[audio,start,end,disabled]);
 return <div ref={root} className="morphing-scrubber" role="slider" aria-label={label} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={0} aria-disabled={disabled} tabIndex={disabled?-1:0} data-scrubbing="false"
 onPointerDown={e=>{if(disabled||duration<=0||e.button!==0||gesture.current)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);begin('pointer',e.pointerId);point(e.clientX)}}
 onPointerMove={e=>{if(gesture.current?.kind==='pointer'&&gesture.current.id===e.pointerId)point(e.clientX)}}
 onPointerUp={e=>{if(gesture.current?.kind!=='pointer'||gesture.current.id!==e.pointerId)return;point(e.clientX);finish(true)}}
 onPointerCancel={()=>finish(false)} onLostPointerCapture={()=>finish(false)} onBlur={()=>finish(false)}
 onKeyDown={e=>{if(disabled||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){finish(false);return}begin('key');const g=gesture.current;if(!g||g.kind!=='key')return;const delta=['ArrowLeft','ArrowDown','PageDown'].includes(e.key)?-1:1;g.time=e.key==='Home'?start:e.key==='End'?end:clamp(g.time+delta*(e.key.startsWith('Page')?30:5));paint(g.time)}}
 onKeyUp={e=>{if(gesture.current?.kind==='key'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)){e.preventDefault();finish(true)}}}>
 <div className="morphing-rail"><div ref={track} className="morphing-track">{railDecoration??<div ref={fill} className="morphing-fill"/>}</div></div>
 <div className="morphing-times" aria-hidden="true"><span ref={elapsed}>0:00</span><span ref={remaining}>−{fmt(duration)}</span></div>
 </div>;
}
