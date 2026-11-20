import {useMemo,useState,type ReactNode} from 'react';
import {ScoreToolbar} from './ScoreToolbar';
import {ScoreViewport,type ScorePage} from './ScoreViewport';
import {createWorkBoxLookup} from './workMeasureBoxes';
import rawBoxes from '../content/real/work-measure-boxes.json';
import {syncAt,regionIntervals,type ScoreSyncData} from './scoreSyncModel';
import {workMeasureAt,workBarRange,type WorkMeasureData} from './workMeasureSync';
const workMeasureBox=createWorkBoxLookup(rawBoxes);

/** Spatial candidates follow the registered scan; audio timings remain estimates. */
export function CurrentScorePages({vocal,data,measures,trackId,fingerprint,time,selectedRegion,selectedNumber,onBarSelect,onSelect,onLocate,onReplay}:{vocal?:ReactNode;data:ScoreSyncData;measures:WorkMeasureData;trackId:string;fingerprint:string;time:number;selectedRegion:string|null;selectedNumber:number|null;onBarSelect:(number:number|null)=>void;onSelect:(id:string|null)=>void;onLocate:(id:string,start:number,end:number)=>void;onReplay:(start:number,end:number)=>void}){
 const manual=selectedRegion,Manual=onSelect;
 const [zoom,Zoom]=useState(false);
 const active=syncAt(data,trackId,fingerprint,time);
 const matched=data.tracks.some(t=>t.id===trackId&&t.fingerprint===fingerprint);
 const current=workMeasureAt(measures,trackId,fingerprint,time);
 const selectedBar=selectedNumber?measures.measures[selectedNumber-1]:undefined;
 const region=manual?data.regions.find(r=>r.id===manual):selectedBar?data.regions.find(r=>r.id===selectedBar.regionId):active?.region;
 const number=selectedBar?.number||current?.measure.number||1;
 const barRange=workBarRange(measures,trackId,fingerprint,number);
 const spatial=matched&&!manual?workMeasureBox(measures,number):undefined;
 const regionBoxes=useMemo(()=>region?measures.measures
  .filter(measure=>measure.regionId===region.id)
  .map(measure=>workMeasureBox(measures,measure.number)):[],[region,measures]);
 const sourcePages=region?(spatial&&!region.pages.some(p=>p.page===spatial.page)?[{page:spatial.page,url:`/assets/scores/work/page-${spatial.page}.webp`,box:[0,0,1,1]}]:region.pages):[];
 const scene:ScorePage[]=sourcePages.map(p=>{
  let [x,y,w,h]=p.box;
  const highlight=spatial?.page===p.page?spatial.box:undefined;
  for(const entry of regionBoxes)if(entry?.page===p.page){
   const [bx,by,bw,bh]=entry.box;
   const right=Math.max(x+w,bx+bw+.012),bottom=Math.max(y+h,by+bh+.012);
   x=Math.max(0,Math.min(x,bx-.012));y=Math.max(0,Math.min(y,by-.012));
   w=Math.min(1,right)-x;h=Math.min(1,bottom)-y;
  }
  return {url:p.url,page:p.page,view:[x*911,y*1232,w*911,h*1232],row:highlight?spatial?.system:undefined,box:highlight?[highlight[0]*911,highlight[1]*1232,highlight[2]*911,highlight[3]*1232]:undefined,label:`第 ${data.movement} 乐章 PDF 第 ${p.page} 页原谱`};
 });
 const index=data.regions.findIndex(r=>r.id===region?.id);
 const local=region&&regionIntervals(data,region.id).find(i=>i.trackId===trackId&&i.fingerprint===fingerprint);
 function locate(id:string){const interval=regionIntervals(data,id).find(i=>i.trackId===trackId&&i.fingerprint===fingerprint);if(!interval)return;Manual(id);onLocate(trackId,interval.start,interval.end)}
 return <figure className="current-score score-page-follow" aria-label={`第 ${data.movement} 乐章同步谱面`} data-region={region?.id||''}>
  {!matched?<p role="status">当前音频没有匹配的谱面映射；请使用已配置录音。</p>:<>
   <ScoreToolbar number={number} max={measures.barCount} page={sourcePages.map(p=>p.page).join('、')} manual={manual!==null||selectedNumber!==null} onSelect={onBarSelect} onFollow={()=>{onBarSelect(null);Manual(null)}} onReplay={barRange&&!manual?()=>onReplay(Math.max(0,barRange.start-2),Math.min(measures.tracks[0].duration,barRange.end+2)):undefined} zoom={zoom} onZoom={()=>Zoom(!zoom)}>
    <p>依据参考跟谱视频的局部小节编号及离线对齐生成；变速、停顿与翻页可能造成偏移，尚未逐小节审听。框选为扫描谱小节线候选。</p>
    <label>谱段 <select aria-label="选择附近谱段" value={region?.id||''} onChange={e=>locate(e.target.value)}>{!region&&<option value="">此处暂无同步</option>}{data.regions.map((r,i)=><option value={r.id} key={r.id}>{i+1} · 原谱 P.{r.pages.map(p=>p.page).join('、')}</option>)}</select></label>
    {local&&<button aria-label="定位到此谱段" onClick={()=>onLocate(trackId,local.start,local.end)}>定位谱段</button>}
    {data.sources.map((s,i)=><p key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> · {s.usage}</p>)}
   </ScoreToolbar>
   {selectedNumber!==null&&!selectedBar&&<p className="guide-reading-status">稿件第 {selectedNumber} 小节尚未对应到此谱本；谱面保持当前播放位置。</p>}
   {vocal}
   {region?<div className="score-follow-pages" data-zoom={zoom}><ScoreViewport pages={scene} preload={[...(data.regions[index-1]?.pages||[]),...(data.regions[index+1]?.pages||[])].map(p=>p.url)}/></div>:<p role="status">此处暂无同步谱面，可继续聆听。</p>}

  </>}
   
 </figure>
}
