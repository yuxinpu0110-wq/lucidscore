import {UiIcon} from './UiIcon';
import {memo,useRef,useCallback,type CSSProperties,type ReactNode} from 'react';
const romans=['I','II','III','IV','V'];
const subtitles=['葬礼进行曲 · c小调','回望的兰德勒舞曲 · 降A大调','圣安东尼向鱼群布道 · c小调','原光（女低音独唱） · 降D大调','末日审判与复活合唱 · c小调 → 降E大调'];
export function MovementSwitcher({movement,names,descriptions,onChange,compact=false,controls}:{movement:number;names:string[];descriptions:string[];onChange:(movement:number)=>void;compact?:boolean;controls?:ReactNode}){
 const change=useRef(onChange);change.current=onChange;const stableChange=useCallback((n:number)=>change.current(n),[]);
 return <section className="movement-area" aria-label="乐章与聆听设置"><div className="stage-active-header" hidden={!compact}><h2 className="stage-movement-title"><span>{romans[movement-1]}.</span> {names[movement-1]}</h2><span className="stage-movement-subtitle">{['庄严的快板','中庸的行板','谐谑曲','原光','终乐章'][movement-1]}</span></div><MovementNav movement={movement} names={names} descriptions={descriptions} compact={compact} onChange={stableChange}/><div className="stage-tools" inert={!compact} aria-hidden={!compact}>{controls}</div></section>;
}

const MovementNav=memo(function MovementNav({movement,names,descriptions,compact,onChange}:{movement:number;names:string[];descriptions:string[];compact:boolean;onChange:(n:number)=>void}){return <nav className={`movement-nav${compact?' compact-movement-pills':''}`} aria-label="五个乐章"><div className="movement-rail" style={{'--movement-index':movement-1} as CSSProperties}>
  <span className="movement-highlight" aria-hidden="true"/>
  {names.map((name,i)=><button key={name} data-movement-number={i+1} aria-label={compact?`${romans[i]} · ${name}`:`${romans[i]} · ${name} · ${descriptions[i]}`} aria-pressed={movement===i+1} onClick={()=>onChange(i+1)}>
   <small>{compact?romans[i]:`0${i+1}`}</small>
   <span className="movement-name" lang="de">{name}{!compact&&<span className="movement-chinese">{subtitles[i]}</span>}</span>
   {!compact&&<em data-count={descriptions[i].match(/\d+/)?.[0]} data-summary={descriptions[i].split(' · ')[0]}>{descriptions[i]}<span className="movement-card-arrow"><UiIcon name="external" size={12}/></span></em>}
  </button>)}
 </div></nav>},(a,b)=>a.movement===b.movement&&a.compact===b.compact&&a.names.join()===b.names.join()&&a.descriptions.join()===b.descriptions.join()&&a.onChange===b.onChange);
