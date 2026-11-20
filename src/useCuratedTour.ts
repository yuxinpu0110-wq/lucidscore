import {useEffect,useRef,useState,type RefObject} from 'react';
import {highlightsTour,type TourStop} from './curatedTours';
const fadeInSeconds=1.4,fadeOutSeconds=2;
function smoothGain(progress:number){
 const p=Math.max(0,Math.min(1,progress));
 return p*p*(3-2*p);
}
type Options={enabled:boolean;audio:RefObject<HTMLAudioElement|null>;movement:number;ready:boolean;source:string;select:(stop:TourStop)=>void;gain:(value:number,baseVolume:number)=>void;playing:()=>void;paused:()=>void};
export function useCuratedTour(options:Options){
 const latest=useRef(options);latest.current=options;
 const [step,Step]=useState<number|null>(null),[status,Status]=useState<'loading'|'ready'|'playing'|'finished'>('ready'),[notice,Notice]=useState('');
 const active=useRef<number|null>(null),pending=useRef(false),token=useRef(0),level=useRef(1);
 const baseVolume=useRef(1),[request,Request]=useState(0);
 const pendingSeek=useRef(0);
 const fadeInFrom=useRef<number|null>(null);
 const gain=(v:number)=>{if(Math.abs(v-level.current)>.005||v===0||v===1){level.current=v;latest.current.gain(v,baseVolume.current)}};
 const exit=(message='')=>{if(active.current===null)return;token.current++;active.current=null;pending.current=false;Step(null);Status('ready');gain(1);Notice(message);const u=new URL(location.href);u.searchParams.delete('tour');u.searchParams.delete('step');history.replaceState(history.state,'',u.pathname+u.search+u.hash)};
 const start=(n=1,offset=0)=>{
  if(!latest.current.enabled)return;
  const s=highlightsTour.stops[Number.isInteger(n)&&n>=1&&n<=6?n-1:0];if(active.current===null)baseVolume.current=latest.current.audio.current?.volume??1;token.current++;active.current=s.step;pending.current=true;Request(r=>r+1);
  pendingSeek.current=Math.max(s.clipStart,Math.min(s.clipEnd-.05,s.clipStart+offset));
  latest.current.audio.current?.pause();gain(0);Step(s.step);Status('loading');Notice('');latest.current.select(s);
  const u=new URL(location.href);u.searchParams.set('tour','highlights');u.searchParams.set('step',String(s.step));history.replaceState(history.state,'',u.pathname+u.search+u.hash);
 };
 useEffect(()=>{
  const a=options.audio.current,s=step===null?null:highlightsTour.stops[step-1];
  if(!a||!s||!pending.current||options.movement!==s.movementId||!options.ready)return;
  pending.current=false;const version=token.current;fadeInFrom.current=pendingSeek.current;a.currentTime=pendingSeek.current;Status('ready');
  void a.play().then(()=>{if(token.current!==version)return;Status('playing');latest.current.playing()}).catch(()=>{if(token.current!==version)return;Status('ready');Notice('已定位到本站，点击播放继续');latest.current.paused()});
 },[step,options.ready,options.movement,options.source,request]);
 useEffect(()=>{
  const a=options.audio.current;if(!a)return;let raf=0,last=0;
  const tick=()=>{
   const n=active.current;if(n===null||pending.current)return;
   if(n===6&&(a.ended||a.currentTime>=highlightsTour.stops[5].clipEnd)){a.pause();latest.current.paused();Status('finished');gain(1);return}
   if(a.paused||a.seeking)return;
   const s=highlightsTour.stops[n-1],t=a.currentTime;
   if(t>=s.clipEnd){start(n+1);return}
   const from=fadeInFrom.current,elapsed=from===null?fadeInSeconds:t-from;
   if(elapsed>=fadeInSeconds)fadeInFrom.current=null;
   const fadeIn=fadeInFrom.current===null?1:smoothGain(elapsed/fadeInSeconds);
   gain(Math.min(fadeIn,smoothGain((s.clipEnd-t)/fadeOutSeconds)));
  };
  const frame=(now:number)=>{if(now-last>50){last=now;tick()}if(active.current!==null&&!a.paused)raf=requestAnimationFrame(frame);else raf=0};
  const wake=()=>{tick();if(latest.current.enabled&&!raf&&active.current!==null)raf=requestAnimationFrame(frame)};
  const events=['timeupdate','playing','seeked','ended'];for(const e of events)a.addEventListener(e,wake);if(latest.current.enabled)raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);for(const e of events)a.removeEventListener(e,wake);token.current++;latest.current.gain(1,baseVolume.current)};
 },[]);
 return {step,status,notice,stop:step===null?null:highlightsTour.stops[step-1],start,exit,manualSeek:(t:number)=>{const n=active.current;if(n!==null){const s=highlightsTour.stops[n-1];if(t<s.clipStart||t>s.clipEnd)exit('已退出精华导听，可自由继续聆听');else fadeInFrom.current=null}}};
}
