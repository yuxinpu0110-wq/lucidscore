import {useLayoutEffect,useRef,type RefObject} from 'react';

const easeInOutCubic=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export function useScoreScroll(svg:RefObject<SVGSVGElement|null>,box:[number,number,number,number]|undefined,row:number|undefined,enabled:boolean){
 const follow=useRef<((box:[number,number,number,number],row:number|undefined)=>void)|null>(null);
 useLayoutEffect(()=>{
  const source=svg.current,viewport=source?.closest<HTMLElement>('.score-follow-pages');
  if(!enabled||!source||!viewport)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,lastRow:number|undefined,manualUntil=0;
  const cancel=()=>{cancelAnimationFrame(frame);frame=0};
  const manual=()=>{cancel();manualUntil=performance.now()+1200};
  follow.current=([x,y,w,h],row)=>{
   const changedRow=row!==lastRow;
   lastRow=row;
   if(performance.now()<manualUntil||(!changedRow&&frame))return;
   const matrix=source.getScreenCTM();
   if(!matrix)return;
   const center=new DOMPoint(x+w/2,y+h/2).matrixTransform(matrix);
   const rect=viewport.getBoundingClientRect();
   const left=viewport.scrollLeft,top=viewport.scrollTop;
   const localX=center.x-rect.left,localY=center.y-rect.top;
   const width=viewport.clientWidth,height=viewport.clientHeight;
   const seekX=localX<width*.1||localX>width*.9;
   const seekY=changedRow&&(localY<height*.2||localY>height*.8);
   const targetX=seekX?Math.max(0,Math.min(viewport.scrollWidth-width,left+localX-width/2)):left;
   const targetY=seekY?Math.max(0,Math.min(viewport.scrollHeight-height,top+localY-height/2)):top;
   if(Math.abs(targetX-left)<1&&Math.abs(targetY-top)<1)return;
   cancel();
   if(motion.matches){viewport.scrollTo({left:targetX,top:targetY,behavior:'instant'});return}
   const start=performance.now();
   const tick=(now:number)=>{
    const progress=Math.min(1,(now-start)/650);
    const eased=easeInOutCubic(progress);
    viewport.scrollTo({left:left+(targetX-left)*eased,top:top+(targetY-top)*eased,behavior:'instant'});
    frame=progress<1?requestAnimationFrame(tick):0;
   };
   frame=requestAnimationFrame(tick);
  };
  viewport.addEventListener('pointerdown',manual,{passive:true});
  viewport.addEventListener('wheel',manual,{passive:true});
  return()=>{
   follow.current=null;
   cancel();
   viewport.removeEventListener('pointerdown',manual);
   viewport.removeEventListener('wheel',manual);
  };
 },[svg,enabled]);
 useLayoutEffect(()=>{if(box)follow.current?.(box,row)},[box?.join(','),row,enabled]);
}
