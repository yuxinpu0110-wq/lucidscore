import {useState,type ReactNode} from 'react';
import {ScoreToolbar} from './ScoreToolbar';
import {ScoreViewport} from './ScoreViewport';
import {measureAt,measureIntervals,type MeasureSyncData} from './measureSyncModel';

export function CurrentScore({vocal,data,trackId,fingerprint,time,selectedNumber,onSelect,onLocate,onReplay}:{vocal?:ReactNode;data:MeasureSyncData;trackId:string;fingerprint:string;time:number;selectedNumber:number|null;onSelect:(number:number|null)=>void;onLocate:(trackId:string,start:number,end:number)=>void;onReplay:(start:number,end:number)=>void}){
 const [zoom,Zoom]=useState(false);
 const current=measureAt(data,trackId,fingerprint,time);
 const m=selectedNumber?data.measures[selectedNumber-1]:current?.measure;
 if(!m)return <p className="muted">此处还没有可用的谱面定位；可继续聆听或通过时间轴回听。</p>;
 const interval=measureIntervals(data,m.id).find(i=>i.trackId===trackId&&i.fingerprint===fingerprint);
 const top=Math.max(0,m.box[1]*1232-28);
 const height=Math.min(1232-top,Math.max(160,m.box[3]*1232+56));
 const url=`/assets/scores/third/transparent/page-${m.page}.webp`;
 return <figure className="current-score">
  <ScoreToolbar number={m.number} max={581} page={String(m.page)} manual={selectedNumber!==null} onSelect={onSelect} onFollow={()=>onSelect(null)} onReplay={interval?()=>onReplay(Math.max(0,interval.start-2),Math.min(data.tracks.find(t=>t.id===trackId)!.duration,interval.end+2)):undefined} zoom={zoom} onZoom={()=>Zoom(!zoom)}><p>第三乐章扫描谱的小节索引及离线音频对齐；具体时间与框选仍待人工校核。</p></ScoreToolbar>
  {vocal}
  <div className="score-follow-pages" data-zoom={zoom}>
  <ScoreViewport pages={[{url,page:m.page,view:[0,top,911,height],row:m.system,box:[m.box[0]*911,m.box[1]*1232,m.box[2]*911,m.box[3]*1232],label:`第三乐章第 ${m.number} 小节附近的原谱`}]} preload={[...(m.page>80?[`/assets/scores/third/transparent/page-${m.page-1}.webp`]:[]),m.page<127?`/assets/scores/third/transparent/page-${m.page+1}.webp`:url]}/>

  </div>
 </figure>
}
