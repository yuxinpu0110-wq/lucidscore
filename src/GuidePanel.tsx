import type {GuideData} from './guideContent';
import {guideAt,movementLabels} from './guideContent';
import type {MeasureResearch} from './measureSyncModel';
import {Segmented} from './Segmented';
import {listeningLayers,type ListeningLayer} from './ListeningLayers';
import {GuideText} from './GuideText';
import {useState,type ReactNode} from 'react';

export function GuidePanel({data,research,bar,layer,canSeek,isRangeMapped,showPrompt,promptOnly=false,listeningCue,onRangeReplay,onExplore,onLayer,onBrowse,onReference,onShare}:{data:GuideData;research:MeasureResearch;bar:number|null;layer:ListeningLayer;canSeek:boolean;isRangeMapped?:(from:number,to:number)=>boolean;showPrompt:boolean;promptOnly?:boolean;listeningCue?:ReactNode;onRangeReplay?:(from:number,to:number)=>void;onExplore?:()=>void;onLayer:(value:ListeningLayer)=>void;onBrowse:(number:number)=>void;onReference:(from:number,to?:number)=>void;onShare?:()=>Promise<void>}){
 const [shareStatus,ShareStatus]=useState('');
 const guide=bar?guideAt(data,research,bar):undefined;
 if(!guide)return <section className="guide-panel"><div className="guide-header-bar"><span className="urtext-label">KOMMENTAR · 导读</span></div><p className="muted">{bar?`第 ${bar} 小节暂无导读；谱面仍可浏览和回听。`:'此处暂无可对应的导读；可用小节号浏览。'}</p>{promptOnly&&listeningCue}</section>;
 const source=data.movement===3?research.notes.find(n=>n.id===guide.researchId):undefined;
 const index=data.guides.findIndex(g=>g.id===guide.id);
 const label=movementLabels[data.movement-1]+'乐章';
 const body=layer==='赏析'?guide.appreciation:layer==='结构'?guide.structure:layer==='和声'?guide.harmony:guide.orchestration;
 const canSeekRange=canSeek&&(isRangeMapped?.(guide.from,guide.to)??true);
 return <section className="guide-panel" aria-label={label+'导读'} data-prompt-only={promptOnly}>
  <div className="guide-header-bar"><div>{canSeekRange?<button className="bar-link guide-range measure-range-link" title="回听此段" onClick={()=> (onRangeReplay||onReference)(guide.from,guide.to)}><span className="fragment-id">FRAGMENT {String(index+1).padStart(2,'0')}</span><span> · 第 {guide.from}—{guide.to} 小节 ↗</span></button>:<span className="measure-range-link is-unmapped">FRAGMENT {String(index+1).padStart(2,'0')} · 第 {guide.from}—{guide.to} 小节</span>}</div><div className="guide-pagination"><button aria-label="上一段" disabled={index<=0} onClick={()=>onBrowse(data.guides[index-1].from)}>←</button><span>{index+1} / {data.guides.length}</span><button aria-label="下一段" disabled={index>=data.guides.length-1} onClick={()=>onBrowse(data.guides[index+1].from)}>→</button></div></div>
  <div className="guide-heading"><h3>{guide.title}</h3></div>
  {onShare&&<div className="guide-share"><button aria-label="复制此乐段链接" onClick={()=>{void onShare().then(()=>ShareStatus('链接已复制')).catch(()=>ShareStatus('复制失败，请复制浏览器地址栏链接'))}}>🔗 复制此乐段链接</button><span role="status">{shareStatus}</span></div>}
  {canSeek&&!canSeekRange&&<p className="guide-reading-status">本段稿件编号尚未对应到当前谱本，可阅读正文；此范围暂不提供音频跳转。</p>}
  {!canSeek&&<p className="guide-reading-status">可按段落和小节引用浏览解读；当前尚不能按小节跳转，浏览不会移动播放位置。</p>}
  {promptOnly&&(listeningCue||<div className="guide-listening-state"><button className="liquid-glass-pill" onClick={onExplore}>暂停并展开解析</button></div>)}
  <div className="guide-depth" hidden={promptOnly}>
  <Segmented label="导读角度" options={[...listeningLayers]} value={layer} onChange={v=>onLayer(v as ListeningLayer)}/>
  <GuideText text={body||`这一段暂无${layer}解读。`} onReference={onReference}/>
  {showPrompt&&!canSeek&&<details className="guide-reading-prompt"><summary>这一段的聆听提示</summary><p>{guide.prompt}</p></details>}
  <details className="guide-index"><summary>浏览{label}的 {data.guides.length} 段导读{canSeek?' · 点击后定位并暂停':''}</summary><div>{data.guides.map(g=><button key={g.id} aria-current={g.id===guide.id?'true':undefined} onClick={()=>onBrowse(g.from)}><span>{g.from}—{g.to}</span>{g.title}</button>)}</div></details>
  <details className="guide-source"><summary>解读依据</summary><p><strong>导听阐释</strong> · 作者对当前乐段的听觉与结构解读。</p>{source&&<><p><strong>文献参考</strong> · 以下资料提供相关背景。</p><p><a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.sourceTitle}</a> · {source.sourceLocation}</p>{source.supportingSources?.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> · {s.location}</p>)}</>}</details>
  </div>
 </section>
}
