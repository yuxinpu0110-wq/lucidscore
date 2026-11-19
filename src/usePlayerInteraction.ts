import {useEffect,type RefObject} from 'react';

/** Keep gesture feedback in the DOM, independent of playback state renders. */
export function usePlayerInteraction(ref:RefObject<HTMLElement|null>) {
 useEffect(()=>{
  const shell=ref.current?.closest<HTMLElement>('.floating-player-dock,.theatre-tour');
  if(!shell)return;
  let pointer:number|null=null, origin=0, scrubbing=false;
  const reset=()=>{
   pointer=null;
   shell.dataset.interacting='idle';
   shell.style.setProperty('--player-drag-x','0px');
  };
  const down=(event:PointerEvent)=>{
   const control=(event.target as Element).closest('button,[role="slider"]');
   if(event.button!==0||pointer!==null||!control||control.matches(':disabled,[aria-disabled="true"]'))return;
   pointer=event.pointerId;
   origin=event.clientX;
   scrubbing=control.getAttribute('role')==='slider';
   shell.dataset.interacting=scrubbing?'scrubbing':'pressed';
  };
  const move=(event:PointerEvent)=>{
   if(pointer!==event.pointerId||!scrubbing)return;
   shell.style.setProperty('--player-drag-x',`${Math.max(-3,Math.min(3,(event.clientX-origin)*.025))}px`);
  };
  const up=(event:PointerEvent)=>{if(event.pointerId===pointer)reset()};
  const keyDown=(event:KeyboardEvent)=>{
   if(pointer!==null||![' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))return;
   const control=(event.target as Element).closest('button,[role="slider"]');
   if(control&&!control.matches(':disabled,[aria-disabled="true"]'))shell.dataset.interacting=control.getAttribute('role')==='slider'?'scrubbing':'pressed';
  };
  const focusOut=(event:FocusEvent)=>{if(!shell.contains(event.relatedTarget as Node|null))reset()};
  shell.addEventListener('pointerdown',down);
  shell.addEventListener('lostpointercapture',up);
  shell.addEventListener('keydown',keyDown);
  shell.addEventListener('focusout',focusOut);
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up);
  window.addEventListener('pointercancel',up);
  window.addEventListener('keyup',reset);
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',reset);
  return()=>{
   reset();
   shell.removeEventListener('pointerdown',down);
   shell.removeEventListener('lostpointercapture',up);
   shell.removeEventListener('keydown',keyDown);
   shell.removeEventListener('focusout',focusOut);
   window.removeEventListener('pointermove',move);
   window.removeEventListener('pointerup',up);
   window.removeEventListener('pointercancel',up);
   window.removeEventListener('keyup',reset);
   window.removeEventListener('blur',reset);
   document.removeEventListener('visibilitychange',reset);
  };
 },[ref]);
}
