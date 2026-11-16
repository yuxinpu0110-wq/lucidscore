import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {MeasureLiquidLens} from './MeasureLiquidLens';

type Box=[number,number,number,number];
export type ScorePage={url:string;page:number;view:Box;box?:Box;label:string};
type Scene={key:string;pages:ScorePage[]};
const decoded=new Map<string,Promise<void>>();
function prepare(url:string){
 let promise=decoded.get(url);
 if(!promise){
  promise=new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{img.decode().then(()=>resolve(),reject)};img.onerror=()=>reject(Error('谱页加载失败'));img.src=url});
  decoded.set(url,promise);
  promise.catch(()=>{if(decoded.get(url)===promise)decoded.delete(url)});
  if(decoded.size>48)decoded.delete(decoded.keys().next().value!);
 }
 return promise;
}
function useGeometry(view:Box,svg:React.RefObject<SVGSVGElement|null>){
 const target=[...view],signature=target.join(','),current=useRef(target);
 useLayoutEffect(()=>{
  const next=signature.split(',').map(Number),start=[...current.current],motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
  const draw=(v:number[])=>{const el=svg.current;if(!el)return;el.setAttribute('viewBox',v.join(' '));el.style.aspectRatio=`${v[2]}/${v[3]}`;el.dataset.cameraMoving=String(v.some((n,i)=>Math.abs(n-next[i])>.001));el.dispatchEvent(new Event('score-camera'))};
  const snap=()=>{cancelAnimationFrame(frame);current.current=next;draw(next)};
  const changed=()=>{if(motion.matches)snap()};
  if(motion.matches||start.every((n,i)=>n===next[i]))snap();
  else {const began=performance.now();const tick=(now:number)=>{const p=Math.min(1,(now-began)/300),ease=1-(1-p)**3;current.current=start.map((n,i)=>n+(next[i]-n)*ease);draw(current.current);if(p<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)}
  motion.addEventListener('change',changed);return()=>{cancelAnimationFrame(frame);motion.removeEventListener('change',changed)};
 },[signature]);
 return current.current;
}
function Pane({page,outgoing}:{page:ScorePage;outgoing?:boolean}){
 const [mobile,Mobile]=useState(()=>matchMedia('(max-width:768px)').matches);
 useEffect(()=>{const query=matchMedia('(max-width:768px)'),change=()=>Mobile(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change)},[]);
 const view:Box=mobile&&page.box?[page.view[0],Math.max(0,page.box[1]-16),page.view[2],Math.min(1232,page.box[1]+page.box[3]+16)-Math.max(0,page.box[1]-16)]:page.view;
 const svg=useRef<SVGSVGElement>(null),v=useGeometry(view,svg),inkFilter=useId();
 const lastTouch=useRef(Number.NEGATIVE_INFINITY);
 useEffect(()=>{
  const source=svg.current,viewport=source?.closest('.score-follow-pages') as HTMLElement|null;
  if(!mobile||!source||!viewport||!page.box||outgoing)return;
  const touch=()=>{lastTouch.current=performance.now()};
  const follow=()=>{if(performance.now()-lastTouch.current<1200)return;const matrix=source.getScreenCTM();if(!matrix)return;
   const [x,y,w,h]=page.box!,center=new DOMPoint(x+w/2,y+h/2).matrixTransform(matrix),rect=viewport.getBoundingClientRect();
   viewport.scrollTo({left:Math.max(0,viewport.scrollLeft+center.x-rect.left-viewport.clientWidth/2),top:Math.max(0,viewport.scrollTop+center.y-rect.top-viewport.clientHeight/2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  const timer=setTimeout(follow,350),observer=new ResizeObserver(follow);observer.observe(viewport);viewport.addEventListener('pointerdown',touch,{passive:true});
  return()=>{clearTimeout(timer);observer.disconnect();viewport.removeEventListener('pointerdown',touch)};
 },[mobile,page.box?.join(','),page.url,outgoing]);
 return <div className="score-follow-page" data-highlighted={!!page.box}><svg ref={svg} className="score-ink score-transition-ink" viewBox={v.join(' ')} data-camera-moving={v.some((n,i)=>Math.abs(n-view[i])>.001)} style={{aspectRatio:`${v[2]}/${v[3]}`}} role={outgoing?undefined:'img'} aria-label={outgoing?undefined:page.label} preserveAspectRatio="xMidYMin meet">
  <defs><filter id={inkFilter} colorInterpolationFilters="sRGB">
   <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.333333 -.333333 -.333334 0 1" result="scan-ink"/>
   <feComponentTransfer in="scan-ink" result="clean-ink"><feFuncA type="linear" slope="1.12" intercept="-.04"/></feComponentTransfer>
   <feComposite in="clean-ink" in2="SourceAlpha" operator="in" result="notation-mask"/>
   <feFlood className="score-note-color" result="note-color"/>
   <feComposite in="note-color" in2="notation-mask" operator="in"/>
  </filter></defs>
  <image className="score-raster score-raster-transparent" href={page.url} width="911" height="1232" style={{filter:`url(#${inkFilter})`}}/>
 </svg>{!outgoing&&page.box&&<MeasureLiquidLens svg={svg} box={page.box} page={page.page}/>}</div>;
}
/** Keep decoded outgoing pages visible until the latest requested scene is ready. */
export function ScoreViewport({pages,preload=[]}:{pages:ScorePage[];preload?:string[]}){
 const key=pages.map(p=>p.url).join('|'),[shown,Shown]=useState<Scene|null>(null),[old,Old]=useState<Scene|null>(null),[failed,Failed]=useState('');
 const latest=useRef(pages);latest.current=pages;
 const displayed=shown?.key===key?{key,pages}:shown,last=useRef(displayed);last.current=displayed;
 useEffect(()=>{
  let cancelled=false;Failed('');
  Promise.all(latest.current.map(p=>prepare(p.url))).then(()=>{
   if(cancelled||latest.current.map(p=>p.url).join('|')!==key)return;
   if(last.current?.key!==key){Old(last.current);Shown({key,pages:latest.current})}
  }).catch(()=>{if(!cancelled)Failed(key)});
  return()=>{cancelled=true};
 },[key]);
 const preloadKey=preload.join('|');
 useEffect(()=>{for(const url of preloadKey.split('|').filter(Boolean))void prepare(url).catch(()=>{})},[preloadKey]);
 useEffect(()=>{if(!old)return;const timer=setTimeout(()=>Old(null),750);return()=>clearTimeout(timer)},[old]);
 return <div className="score-viewport" aria-busy={shown?.key!==key&&!failed}>
  {old&&<div className="score-scene score-scene-outgoing" aria-hidden="true" key={`old-${old.key}`}>{old.pages.map(p=><Pane key={p.url} page={p} outgoing/>)}</div>}
  {displayed&&<div className={`score-scene${old?' score-scene-incoming':''}`} key={displayed.key}>{displayed.pages.map(p=><Pane key={p.url} page={p}/>)}</div>}
  {failed===key?<p role="status">谱页加载失败；保留上一页，仍可回听或选择其他谱段。</p>:!displayed&&<p role="status">正在准备谱页…</p>}
 </div>;
}
