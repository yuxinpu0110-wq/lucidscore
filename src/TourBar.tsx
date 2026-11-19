import {UiIcon} from './UiIcon';
import {highlightsTour} from './curatedTours';
import type {useCuratedTour} from './useCuratedTour';
import {useRef,type CSSProperties,type RefObject} from 'react';
import {PlayIcon} from './PlayerIcons';
import {usePlayerInteraction} from './usePlayerInteraction';
import {MorphingScrubber} from './MorphingProgress';

let elapsed=0;
const segments=highlightsTour.stops.map(stop=>{
 const start=elapsed;
 const duration=stop.clipEnd-stop.clipStart;
 elapsed+=duration;
 return {stop,start,end:elapsed,duration};
});
const lastSegment=segments[segments.length-1];
const total=lastSegment.end;
const segmentAt=(time:number)=>segments.find(segment=>time<segment.end)??lastSegment;
function timeToFraction(time:number){
 const segment=segmentAt(time);
 return (segment.stop.step-1+(time-segment.start)/segment.duration)/segments.length;
}
function fractionToTime(fraction:number){
 const position=fraction*segments.length;
 const index=Math.min(segments.length-1,Math.floor(position));
 return segments[index].start+(position-index)*segments[index].duration;
}

export function TourBar({tour,audio,playing,onToggle,onDrag,onSeek,onDrop,onListenFull}:{tour:ReturnType<typeof useCuratedTour>;audio:RefObject<HTMLAudioElement|null>;playing:boolean;onToggle:()=>void;onDrag:()=>void;onSeek:(t:number)=>void;onDrop:()=>void;onListenFull:()=>void}){
 const shell=useRef<HTMLDivElement>(null);
 const nextStop=useRef<{step:number;offset:number}|null>(null);
 usePlayerInteraction(shell);
 if(!tour.stop)return null;
 const loading=tour.status==='loading';
 const current=segments[tour.step!-1];
 const seekTour=(time:number)=>{
  const segment=segmentAt(time);
  const offset=Math.max(0,Math.min(segment.stop.clipEnd-segment.stop.clipStart-.05,time-segment.start));
  if(segment.stop.step===tour.step)onSeek(segment.stop.clipStart+offset);
  else nextStop.current={step:segment.stop.step,offset};
 };
 const drop=()=>{
  onDrop();
  const next=nextStop.current;nextStop.current=null;
  if(next)tour.start(next.step,next.offset);
 };
 return <div ref={shell} className="tour-bar theatre-tour" aria-label="精华导听旅程">
  <div className="tour-controls">
   <button className="tour-play" disabled={loading} aria-label={playing?'暂停精华导听':'播放精华导听'} onClick={onToggle}>
    <PlayIcon playing={playing}/>
   </button>
   <span className="tour-scene-title" title={tour.stop.shortTitle}><span className="tour-desktop-word">第 </span>{tour.step}/6<span className="tour-desktop-word"> 幕</span> · {tour.stop.shortTitle}</span>
   <nav className="tour-scene-dots" aria-label="六幕选择">{highlightsTour.stops.map(s=>
    <button key={s.step} aria-label={`导览第${s.step}站：${s.shortTitle}`} aria-current={s.step===tour.step?'step':undefined} title={s.shortTitle} onClick={()=>tour.start(s.step)}/>
   )}</nav>
   <button className="tour-stay" aria-label="留在此乐章完整听" onClick={onListenFull}>完整听<span className="tour-desktop-word">此乐章</span></button>
   <button aria-label="退出导览" onClick={()=>tour.exit()}><UiIcon name="close"/></button>
  </div>
  <MorphingScrubber key={tour.step} audio={audio} end={total} disabled={loading}
   mapMediaTime={time=>current.start+Math.max(0,Math.min(current.duration,time-current.stop.clipStart))}
   timeToFraction={timeToFraction} fractionToTime={fractionToTime}
   label="精华导听总进度" onDrag={onDrag} onSeek={seekTour} onDrop={drop}
   railDecoration={<span className="tour-rail-segments" aria-hidden="true">{segments.map(({stop})=>
    <i key={stop.step} data-current={stop.step===tour.step} style={{'--segment-index':stop.step-1} as CSSProperties}/>
   )}</span>}/>
  {loading&&<span className="tour-loading" role="status">加载下一乐章…</span>}
 </div>;
}
