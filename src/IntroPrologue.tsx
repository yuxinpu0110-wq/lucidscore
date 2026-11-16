import {mediaUrl} from './mediaUrl';
import {useEffect,useRef,useState} from 'react';
import './prologue.css';
export const PROLOGUE_SEEN='lucidscore_prologue_seen';
export const PROLOGUE_CREDITS={composer:'古斯塔夫 · 马勒',title:'c小调第二交响曲「复活」',original:'Gustav Mahler · Symphonie Nr. 2 c-Moll (1888–1894)'};
export function hasSeenPrologue(){try{return localStorage.getItem(PROLOGUE_SEEN)==='1'}catch{return false}}
export function prologueCaption(scene:number,time:number){
 if(scene===0)return time>=1.2&&time<4.2?'生是什么？':time>=6.2&&time<10.2?'死又是什么？':'';
 return time>=1&&time<4.6?'凡诞生者，皆须消亡。':time>=5&&time<9.2?'凡消亡者，终将复活。':'';
}
export function IntroPrologue({onEnter,onSkip}:{onEnter:(guided:boolean)=>void;onSkip:()=>void}){
 const modal=useRef<HTMLDialogElement>(null),first=useRef<HTMLVideoElement>(null);
 const phase=useRef(0),disposed=useRef(false);
 const started=useRef(false),startAttempt=useRef(0);
 const [startup,Startup]=useState<'probing'|'blocked'|'playing'>('probing');
 const [credits,Credits]=useState(false);
 const [scene,Scene]=useState(0),[caption,Caption]=useState(''),[choices,Choices]=useState(false),[frozen,Frozen]=useState(false),[error,Error]=useState('');
 const save=()=>{try{localStorage.setItem(PROLOGUE_SEEN,'1')}catch{}};
 const silence=()=>{startAttempt.current++;first.current?.pause()};
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
    phase.current=currentScene;Scene(currentScene);Caption(prologueCaption(currentScene,t));const end=currentScene===0?(t<4.2?4.2:10.2):(t<4.6?4.6:t<9.2?9.2:Infinity);modal.current?.style.setProperty('--caption-alpha',String(Math.max(0,Math.min(1,(end-t)/.5))));
    Credits(currentScene===1&&t>=9.8);Choices(currentScene===1&&t>=15.5);if(currentScene===1&&t>=21.5){v.pause();Frozen(true);return}}
  }raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
  return()=>{disposed.current=true;cancelAnimationFrame(raf);silence();document.body.style.overflow=old};
 },[]);
 return <dialog ref={modal} className="intro-prologue" aria-label="马勒第二交响曲序幕" onCancel={e=>{e.preventDefault();finish()}}>
  <div className="prologue-screen" data-startup={startup} data-scene={scene} data-frozen={frozen} onClick={()=>{if(!started.current)ignite();else if(phase.current===0)next()}}>
   <video ref={first} src={mediaUrl('/videos/intro-prologue.mp4')} playsInline preload="auto" aria-hidden="true" onError={()=>{Error('序幕视频暂时无法加载，请跳过继续');Startup('blocked')}}/>
   <div className="prologue-vignette"/>
   <button className="prologue-skip" autoFocus onClick={e=>{e.stopPropagation();finish()}}>跳过序幕 →</button>
   {startup==='blocked'&&<div className="prologue-curtain"><button className="prologue-ignite" onClick={e=>{e.stopPropagation();ignite()}}>进入现场 · 开启原声</button><p>建议佩戴耳机聆听 · 约 35 秒序幕</p><button className="prologue-silent-skip" onClick={e=>{e.stopPropagation();finish()}}>跳过并静音浏览</button></div>}
   <div className="prologue-copy" data-credits={credits} data-decisions={choices}>{credits?<div className="prologue-credits"><p className="prologue-composer">{PROLOGUE_CREDITS.composer}</p><h1 className="prologue-work-title">{PROLOGUE_CREDITS.title}</h1><p className="prologue-original" lang="de">{PROLOGUE_CREDITS.original}</p></div>:<p key={caption} className="prologue-caption">{caption}</p>}
    {choices&&<div className="prologue-decisions" onClick={e=>e.stopPropagation()}><button className="prologue-guided" onClick={()=>finish(true)}>从未听过 · 开启启发探索</button><button onClick={()=>finish(false)}>已经听过 · 进入自由检索</button></div>}
   </div>
   <div className="prologue-aux" onClick={e=>e.stopPropagation()}>{startup==='playing'&&scene===0&&<button className="prologue-advance-hint" onClick={()=>void next()}>点击任意位置跳过</button>}{error&&<p role="status">{error}</p>}</div>
  </div>
 </dialog>;
}
