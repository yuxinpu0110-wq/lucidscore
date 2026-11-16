import {useCallback,useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';

/** Layout changes are visual only: the live media element is never replaced. */
export function useStageView(initial:'lobby'|'stage'='lobby'){
 const [viewMode,View]=useState<'lobby'|'stage'>(initial);
 const mode=useRef(viewMode),active=useRef<ViewTransition|null>(null),generation=useRef(0);
 const change=useCallback((next:'lobby'|'stage')=>{
  if(mode.current===next)return;
  mode.current=next;const token=++generation.current;active.current?.skipTransition();
  const root=document.documentElement;
  const syncBackdrop=()=>{const canvas=document.querySelector('.ambient-canvas')||document.body;root.style.setProperty('--view-backdrop',getComputedStyle(canvas).backgroundColor)};
  syncBackdrop();
  const commit=()=>{if(token!==generation.current)return;flushSync(()=>View(next));window.scrollTo({top:0,behavior:'instant'})};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!document.startViewTransition){delete root.dataset.viewTransition;commit();return}
  root.dataset.viewTransition='active';
  try{
   const transition=document.startViewTransition(commit);active.current=transition;
   void transition.ready.catch(()=>{});void transition.updateCallbackDone.catch(()=>{});
   void transition.finished.catch(()=>{}).then(()=>{if(token===generation.current){syncBackdrop();delete root.dataset.viewTransition;active.current=null}});
  }catch{delete root.dataset.viewTransition;commit()}
 },[]);
 const enterStage=useCallback(()=>change('stage'),[change]),returnToLobby=useCallback(()=>change('lobby'),[change]);
 useEffect(()=>{
  if(viewMode!=='lobby')return;
  let wheelDistance=0,touchY=0;
  const reviewing=()=>!!document.querySelector('.review-drawer[open]');
  const scroll=()=>{if(!reviewing()&&window.scrollY>120)enterStage()};
  // A viewport-filling Lobby has no lower panels to scroll into. A deliberate
  // downward wheel/swipe still carries the same entrance gesture.
  const wheel=(event:WheelEvent)=>{if(reviewing()||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;wheelDistance=event.deltaY>0?wheelDistance+event.deltaY:0;if(wheelDistance>120)enterStage()};
  const touchstart=(event:TouchEvent)=>{touchY=event.touches[0]?.clientY||0};
  const touchmove=(event:TouchEvent)=>{if(!reviewing()&&touchY-(event.touches[0]?.clientY||touchY)>120)enterStage()};
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('wheel',wheel,{passive:true});window.addEventListener('touchstart',touchstart,{passive:true});window.addEventListener('touchmove',touchmove,{passive:true});
  return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('wheel',wheel);window.removeEventListener('touchstart',touchstart);window.removeEventListener('touchmove',touchmove)};
 },[viewMode,enterStage]);
 useEffect(()=>()=>{generation.current++;active.current?.skipTransition();delete document.documentElement.dataset.viewTransition},[]);
 return {viewMode,enterStage,returnToLobby};
}
