import {useEffect,useRef,type ReactNode,type RefObject} from 'react';
const fmt=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
/** High-frequency DOM work is isolated from score/guide React renders. */
export function PlaybackProgress({audio,duration,disabled,onDrag,onSeek,onDrop,children,chapters=[]}:{audio:RefObject<HTMLAudioElement|null>;duration:number;disabled:boolean;onDrag:()=>void;onSeek:(time:number)=>void;onDrop:()=>void;children:ReactNode;chapters?:number[]}){
 const mobileCurrent=useRef<HTMLSpanElement>(null);
 const slider=useRef<HTMLInputElement>(null),output=useRef<HTMLOutputElement>(null),dragging=useRef(false),pending=useRef(0);
 useEffect(()=>{
  const a=audio.current;if(!a)return;let raf=0,last=0;
  const paint=()=>{const input=slider.current;if(!input||dragging.current)return;const t=a.currentTime||0;
   input.value=String(t);input.style.setProperty('--progress',`${duration?t/duration*100:0}%`);
   const label=fmt(t);if(mobileCurrent.current)mobileCurrent.current.textContent=label;if(input.getAttribute('aria-valuetext')!==label)input.setAttribute('aria-valuetext',label);
   if(output.current)output.current.textContent=`${label} / ${fmt(duration)}`;
  };
  const frame=(now:number)=>{raf=0;if(now-last>=1000/30){last=now;paint()}if(!a.paused&&!a.ended&&!document.hidden)raf=requestAnimationFrame(frame)};
  const wake=()=>{paint();if(!raf&&!a.paused&&!document.hidden)raf=requestAnimationFrame(frame)};
  const events=['timeupdate','loadedmetadata','seeked','playing','pause','ended','emptied'];for(const e of events)a.addEventListener(e,wake);document.addEventListener('visibilitychange',wake);wake();
  return()=>{cancelAnimationFrame(raf);for(const e of events)a.removeEventListener(e,wake);document.removeEventListener('visibilitychange',wake)};
 },[audio,duration]);
 const start=()=>{if(!dragging.current){dragging.current=true;pending.current=audio.current?.currentTime||0;onDrag()}};
 const drop=()=>{if(!dragging.current)return;dragging.current=false;onSeek(pending.current);onDrop()};
 return <><div className="transport">{children}<button onClick={()=>onSeek((audio.current?.currentTime||0)-5)} disabled={disabled}>−5 秒</button><output ref={output}>0:00 / {fmt(duration)}</output><button onClick={()=>onSeek((audio.current?.currentTime||0)+5)} disabled={disabled}>+5 秒</button></div><input ref={slider} className="timeline" aria-label="播放位置" aria-valuetext="0:00" type="range" min="0" max={duration||60} step="0.1" defaultValue="0" disabled={disabled} onPointerDown={start} onChange={e=>{start();pending.current=+e.target.value;if(mobileCurrent.current)mobileCurrent.current.textContent=fmt(pending.current);e.target.style.setProperty('--progress',`${duration?pending.current/duration*100:0}%`);e.target.setAttribute('aria-valuetext',fmt(pending.current));if(output.current)output.current.textContent=`${fmt(pending.current)} / ${fmt(duration)}`}} onPointerUp={drop} onPointerCancel={drop} onKeyUp={drop} onBlur={drop}/><div className="mobile-time-row" aria-hidden="true"><span ref={mobileCurrent}>0:00</span><span>{fmt(duration)}</span></div><div className="mobile-chapter-ticks" aria-hidden="true">{chapters.map((t,i)=><i key={i} style={{left:`${duration?t/duration*100:0}%`}}/>)}</div></>;
}
