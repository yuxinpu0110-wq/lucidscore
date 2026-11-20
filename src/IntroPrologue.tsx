import {UiIcon} from './UiIcon';
import {mediaUrl} from './mediaUrl';
import {highlightsTour} from './curatedTours';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {captionFrame,captionFontText} from './prologueCaptions';
import './prologue.css';
export const PROLOGUE_SEEN='lucidscore_prologue_seen';
const highlightsMinutes=Math.round(highlightsTour.stops.reduce((seconds,stop)=>seconds+stop.clipEnd-stop.clipStart,0)/60);
export const PROLOGUE_CREDITS={composer:'古斯塔夫 · 马勒',title:'c小调第二交响曲「复活」',original:'Gustav Mahler · Symphonie Nr. 2 c-Moll (1888–1894)'};
export function hasSeenPrologue(){try{return localStorage.getItem(PROLOGUE_SEEN)==='1'}catch{return false}}
export function prologueCaption(scene:number,time:number){
 return captionFrame(scene,time).text;
}
export function IntroPrologue({onEnter,onSkip,onTour}:{onTour?:()=>void;onEnter:(guided:boolean)=>void;onSkip:()=>void}){
 const modal=useRef<HTMLDialogElement>(null),first=useRef<HTMLVideoElement>(null);
 const captionNode=useRef<HTMLParagraphElement>(null),pendingCaption=useRef(captionFrame(0,0));
 const paintCaption=()=>{const node=captionNode.current,frame=pendingCaption.current;if(!node)return;node.style.opacity=String(frame.alpha);node.style.transform=`translate3d(0,${frame.offset}px,0)`};
 const phase=useRef(0),disposed=useRef(false);
 const started=useRef(false),startAttempt=useRef(0);
 const [startup,Startup]=useState<'probing'|'blocked'|'playing'>('probing');
 const [credits,Credits]=useState(false);
 const [scene,Scene]=useState(0),[caption,Caption]=useState(''),[choices,Choices]=useState(false),[frozen,Frozen]=useState(false),[error,Error]=useState('');
 useLayoutEffect(()=>{paintCaption()},[caption]);
 useEffect(()=>{
  if(document.fonts){void document.fonts.load('400 24px "Noto Serif SC"',captionFontText+PROLOGUE_CREDITS.composer+PROLOGUE_CREDITS.title).catch(()=>{});void document.fonts.load('italic 400 24px "Cormorant Garamond"',PROLOGUE_CREDITS.original).catch(()=>{})}
 },[]);
 const save=()=>{try{localStorage.setItem(PROLOGUE_SEEN,'1')}catch{}};
 const silence=()=>{startAttempt.current++;first.current?.pause()};
 const showGate=()=>{silence();started.current=false;Choices(true);Credits(true);Frozen(true)};
 const finish=(guided?:boolean)=>{silence();save();if(guided===undefined)onSkip();else onEnter(guided)};
 const ignite=()=>{
  const video=first.current;if(!video||started.current)return;const token=++startAttempt.current;
  // These assignments and play() must remain synchronous with the click.
  video.currentTime=0;video.muted=false;video.volume=1;
  void video.play().then(()=>{if(disposed.current||token!==startAttempt.current)return;started.current=true;Startup('playing');Error('')}).catch((reason:unknown)=>{
   if(disposed.current||token!==startAttempt.current)return;
   video.pause();video.currentTime=0;started.current=false;Startup('blocked');
   if(!(reason instanceof DOMException&&reason.name==='NotAllowedError'))Error('暂时无法播放，请再次点击入场或跳过');
  });
 };
 const next=()=>{
  const v=first.current;if(!started.current||phase.current!==0||!v)return;
  // The same authorized element carries both scenes, including their crossfade.
  v.currentTime=14.5;phase.current=1;Scene(1);
 };
 useEffect(()=>{
  disposed.current=false;modal.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';let raf=0,last=0;
  ignite();
  const tick=(now:number)=>{if(disposed.current)return;if(now-last>=1000/30){last=now;const v=first.current;
   if(v&&started.current){const currentScene=v.currentTime>=14.5?1:0,t=currentScene===1?v.currentTime-14.5:v.currentTime;
    phase.current=currentScene;Scene(currentScene);const frame=captionFrame(currentScene,t);pendingCaption.current=frame;
    if(captionNode.current?.textContent===frame.text)paintCaption();else{if(captionNode.current)captionNode.current.style.opacity='0';Caption(frame.text)}
    Credits(currentScene===1&&t>=9.8);Choices(currentScene===1&&t>=15.5);if(currentScene===1&&t>=21.5){v.pause();Frozen(true);return}}
  }raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
  const video=first.current;
  return()=>{disposed.current=true;cancelAnimationFrame(raf);silence();if(video){video.pause();video.removeAttribute('src');video.load()}document.body.style.overflow=old};
 },[]);
 return <dialog ref={modal} className="intro-prologue" aria-label="马勒第二交响曲序幕" onCancel={e=>{e.preventDefault();showGate()}}>
  <div className="prologue-screen" data-startup={startup} data-scene={scene} data-frozen={frozen} onClick={()=>{if(choices)return;if(!started.current)ignite();else if(phase.current===0)next();else showGate()}}>
   <video ref={first} src={mediaUrl('/videos/intro-prologue.mp4')} playsInline preload="auto" aria-hidden="true" onError={()=>{Error('序幕视频暂时无法加载，请跳过继续');Startup('blocked')}}/>
   <div className="prologue-vignette"/>
   <button hidden={choices} className="prologue-skip" autoFocus onClick={e=>{e.stopPropagation();showGate()}}>跳过序幕 <UiIcon name="right"/></button>
   {startup==='blocked'&&!choices&&<div className="prologue-curtain"><img className="prologue-brand-logo" src="/logo-512.webp" alt="LucidScore" width="68" height="68"/><button className="prologue-ignite" onClick={e=>{e.stopPropagation();ignite()}}>进入现场 · 开启原声</button><p>建议佩戴耳机聆听 · 约 35 秒序幕</p><button className="prologue-silent-skip" onClick={e=>{e.stopPropagation();showGate()}}>跳过并静音浏览</button></div>}
   <div className="prologue-copy" data-credits={credits} data-decisions={choices}>{credits?<div className="prologue-credits"><img className="prologue-brand-logo" src="/logo-512.webp" alt="LucidScore" width="68" height="68"/><p className="prologue-composer">{PROLOGUE_CREDITS.composer}</p><h1 className="prologue-work-title">{PROLOGUE_CREDITS.title}</h1><p className="prologue-original" lang="de">{PROLOGUE_CREDITS.original}</p></div>:<p ref={captionNode} className="prologue-caption">{caption}</p>}
    {choices&&<div className="prologue-decisions three-choice-gate" onClick={e=>e.stopPropagation()}>{onTour&&<button onClick={()=>{silence();save();onTour()}}><strong>精华导听 · 6 个决定性瞬间</strong><small>约 {highlightsMinutes} 分钟 · 六个瞬间</small></button>}<button onClick={()=>finish(true)}><strong>启发探索 · 完整伴听</strong><small>完整伴听 · 听觉问题引导</small></button><button onClick={()=>finish(false)}><strong>自由检索 · 总谱全集</strong><small>五乐章总谱 · 四维解析</small></button></div>}
   </div>
   <div className="prologue-aux" onClick={e=>e.stopPropagation()}>{startup==='playing'&&!choices&&<button className="prologue-advance-hint" onClick={()=>scene===0?next():showGate()}>{scene===0?'点击任意位置跳过':'点击任意位置进入选择'}</button>}{error&&<p role="status">{error}</p>}</div>
  </div>
 </dialog>;
}
