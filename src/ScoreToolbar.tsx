import type {ReactNode} from 'react';
export function ScoreToolbar({number,max,page,manual,onSelect,onFollow,onReplay,zoom,onZoom,children}:{number:number;max:number;page:string;manual:boolean;onSelect:(n:number)=>void;onFollow:()=>void;onReplay?:()=>void;zoom:boolean;onZoom:()=>void;children?:ReactNode}){
 return <div className="score-toolbar score-toolbar-single-line" role="toolbar" aria-label="总谱控制">
  <span className="urtext-label score-plate">PARTITUR<span> · 总谱</span></span>
  <div className="measure-stepper"><button aria-label="上一小节" disabled={number<=1} onClick={()=>onSelect(number-1)}>←</button><label><span className="takt-label">Takt </span><input aria-label="小节号" type="number" min="1" max={max} value={number} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=max)onSelect(n)}}/></label><button aria-label="下一小节" disabled={number>=max} onClick={()=>onSelect(number+1)}>→</button></div>
  <span className="page-badge" title={`原谱第 ${page} 页`}>P.{page}</span>
  <span className="sync-honesty-label" title="当前导航数据标记为待核；具体小节时间与框选仍为参考">段落起点待核 · 谱面框选为参考区间</span>
  <div className="score-toolbar-right">
   {manual?<button className="follow-status" aria-label="回到当前小节" title="回到当前小节" onClick={onFollow}>↺<span className="follow-label"> 当前小节</span></button>:<span className="follow-status is-following" title="实时跟谱 · 估计位置"><span className="follow-dot" aria-hidden="true"/><span className="follow-label">实时跟谱</span></span>}
   <button aria-label="回听小节" title="回听小节" disabled={!onReplay} onClick={onReplay}>↻<span className="score-action-label"> 回听</span></button>
   <button aria-label={zoom?'收起放大':'放大谱面'} title={zoom?'收起放大':'展开谱面'} aria-pressed={zoom} onClick={onZoom}><span aria-hidden="true">⛶</span></button>
   <details className="score-info"><summary aria-label="谱面同步说明" title="小节时间与框选位置为估计，尚待逐小节校核">ⓘ</summary><div className="score-info-panel"><p>小节时间与框选位置为估计，尚待逐小节校核；可在播放条上微调回听。</p>{children}</div></details>
  </div>
 </div>;
}
