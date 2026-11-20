import {useLayoutEffect,useRef,type RefObject} from 'react';
type LensRect={x:number;y:number;width:number;height:number};
const transform=(r:LensRect,width:number,height:number)=>`translate3d(${r.x.toFixed(3)}px,${r.y.toFixed(3)}px,0) scale(${(r.width/width).toFixed(5)},${(r.height/height).toFixed(5)})`;
function interpolate(from:LensRect,to:LensRect,progress:number):LensRect{
 const blend=(a:number,b:number)=>a+(b-a)*progress;
 return {x:blend(from.x,to.x),y:blend(from.y,to.y),width:blend(from.width,to.width),height:blend(from.height,to.height)};
}

/** Browser-composited motion: no animation frame loop, spring or size animation. */
export function MeasureLiquidLens({svg,box,page}:{svg:RefObject<SVGSVGElement|null>;box:[number,number,number,number];page:number}){
 const lens=useRef<HTMLDivElement>(null),camera=useRef<HTMLDivElement>(null),latest=useRef(box),project=useRef<(()=>void)|null>(null);
 latest.current=box;
 useLayoutEffect(()=>{
  const el=lens.current,layer=camera.current,source=svg.current,parent=source?.parentElement;if(!el||!layer||!source||!parent)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let slide:{animation:Animation;from:LensRect;to:LensRect}|null=null;
  let last:LensRect|null=null;
  // The outer layer follows the camera. It never cancels the inner slide.
  const projectCamera=()=>{
   const matrix=source.getScreenCTM();if(!matrix)return;
   const origin=parent.getBoundingClientRect();
   layer.style.transform=`matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e-origin.left},${matrix.f-origin.top})`;
  };
  const update=(snap=false)=>{
   const [x,y,w,h]=latest.current;
   const target:LensRect={x:x-4,y:y-10,width:Math.max(16,w+8),height:h+20};
   if(last&&!snap&&(Object.keys(target) as (keyof LensRect)[]).every(k=>Math.abs(target[k]-last![k])<.05))return;
   // Use the running animation's eased progress without forcing a style read.
   const progress=slide?.animation.effect?.getComputedTiming().progress;
   const from=slide
    ?interpolate(slide.from,slide.to,progress??(slide.animation.playState==='finished'?1:0))
    :last??target;
   slide?.animation.cancel();slide=null;
   el.style.width=target.width.toFixed(3)+'px';el.style.height=target.height.toFixed(3)+'px';
   el.style.transform=transform(target,target.width,target.height);el.dataset.ready='true';el.dataset.moving='false';
   if(last&&!snap&&!reduce.matches){
    el.dataset.moving='true';
    const animation=el.animate([{transform:transform(from,target.width,target.height)},{transform:el.style.transform}],{duration:250,easing:'cubic-bezier(.25,.7,.3,1)'});
    slide={animation,from,to:target};
    animation.onfinish=()=>{if(slide?.animation===animation){el.dataset.moving='false';slide=null}};
   }
   last=target;
  };
  const snap=()=>update(true),observer=new ResizeObserver(projectCamera);
  observer.observe(source);observer.observe(parent);source.addEventListener('score-camera',projectCamera);reduce.addEventListener('change',snap);
  project.current=()=>update();projectCamera();update();
  return()=>{project.current=null;slide?.animation.cancel();observer.disconnect();source.removeEventListener('score-camera',projectCamera);reduce.removeEventListener('change',snap)};
 },[svg]);
 useLayoutEffect(()=>{project.current?.()},[box.join(','),page]);
 return <div ref={camera} className="measure-lens-camera" aria-hidden="true"><div ref={lens} className="measure-liquid-lens" data-page={page}><span className="measure-lens-rim"/></div></div>;
}
