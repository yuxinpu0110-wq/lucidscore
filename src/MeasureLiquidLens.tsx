import {useLayoutEffect,useRef,type RefObject} from 'react';
type LensRect={x:number;y:number;width:number;height:number};
const transform=(r:LensRect,width:number,height:number)=>`translate3d(${r.x.toFixed(3)}px,${r.y.toFixed(3)}px,0) scale(${(r.width/width).toFixed(5)},${(r.height/height).toFixed(5)})`;

/** Browser-composited motion: no animation frame loop, spring or size animation. */
export function MeasureLiquidLens({svg,box,page}:{svg:RefObject<SVGSVGElement|null>;box:[number,number,number,number];page:number}){
 const lens=useRef<HTMLDivElement>(null),camera=useRef<HTMLDivElement>(null),latest=useRef(box),project=useRef<(()=>void)|null>(null);
 latest.current=box;
 useLayoutEffect(()=>{
  const el=lens.current,layer=camera.current,source=svg.current,parent=source?.parentElement;if(!el||!layer||!source||!parent)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');let animation:Animation|null=null,initialized=false,last:LensRect|null=null,lastWidth=source.getBoundingClientRect().width;
  // The outer layer follows the camera. It never cancels the inner slide.
  const projectCamera=()=>{
   const matrix=source.getScreenCTM();if(!matrix)return;
   const origin=parent.getBoundingClientRect();
   layer.style.transform=`matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e-origin.left},${matrix.f-origin.top})`;
  };
  const update=(snap=false)=>{
   projectCamera();
   const [x,y,w,h]=latest.current;
   const target:LensRect={x:x-4,y:y-10,width:Math.max(16,w+8),height:h+20};
   if(last&&!snap&&(Object.keys(target) as (keyof LensRect)[]).every(k=>Math.abs(target[k]-last![k])<.05))return;
   // Capture the visible position before cancelling an interrupted animation.
   const pose=initialized?new DOMMatrix(getComputedStyle(el).transform):null;
   const from=pose?{x:pose.m41,y:pose.m42,width:parseFloat(el.style.width)*pose.m11,height:parseFloat(el.style.height)*pose.m22}:target;
   animation?.cancel();animation=null;
   el.style.width=target.width.toFixed(3)+'px';el.style.height=target.height.toFixed(3)+'px';
   el.style.transform=transform(target,target.width,target.height);el.dataset.ready='true';el.dataset.moving='false';
   if(initialized&&!snap&&!reduce.matches){
    el.dataset.moving='true';
    animation=el.animate([{transform:transform(from,target.width,target.height)},{transform:el.style.transform}],{duration:300,easing:'cubic-bezier(.22,.61,.36,1)'});
    animation.onfinish=()=>{el.dataset.moving='false';animation=null};
   }
   last=target;initialized=true;
  };
  const snap=()=>update(true),resize=()=>{
   const width=source.getBoundingClientRect().width,resized=Math.abs(width-lastWidth)>.5;lastWidth=width;
   projectCamera();if(resized)snap();
  },observer=new ResizeObserver(resize);
  observer.observe(source);observer.observe(parent);source.addEventListener('score-camera',projectCamera);reduce.addEventListener('change',snap);
  project.current=()=>update();update();
  return()=>{project.current=null;animation?.cancel();observer.disconnect();source.removeEventListener('score-camera',projectCamera);reduce.removeEventListener('change',snap)};
 },[svg]);
 useLayoutEffect(()=>{project.current?.()},[box.join(','),page]);
 return <div ref={camera} className="measure-lens-camera" aria-hidden="true"><div ref={lens} className="measure-liquid-lens" data-page={page}><span className="measure-lens-rim"/></div></div>;
}
