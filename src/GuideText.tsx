import {UiIcon} from './UiIcon';
import {memo,Fragment,type ReactNode} from 'react';
import {barTargetPattern,type GuideReference} from './guideBarLink';

const tokens=new RegExp(String.raw`\[([^\]\n]+)\]\(bar:${barTargetPattern}\)|\*\*([^*\n]+)\*\*`,'g');
const roman=['I','II','III','IV','V'];
function inline(text:string,onReference:GuideReference):ReactNode[]{
 const result:ReactNode[]=[];let at=0;
 for(const match of text.matchAll(tokens)){
  const [full,label,movement,from,to,bold]=match;
  result.push(text.slice(at,match.index));
  if(label){
   const range=`第${from}${to?`—${to}`:''}小节`;
   result.push(<a key={match.index} className={movement?'bar-link bar-link-cross':'bar-link'}
    href={movement?`#bar-m${movement}-${from}`:`#bar-${from}`} data-bar-from={from} data-bar-to={to||from} data-bar-movement={movement}
    aria-label={movement?(`第${movement}乐章${range}`):undefined}
    title={movement?`定位到第${movement}乐章${range}（估计位置）`:`定位到第 ${from}${to?`—${to}`:''} 小节（估计位置）`}
    onClick={e=>{e.preventDefault();onReference(Number(from),to?Number(to):undefined,movement?Number(movement):undefined)}}>
    {movement?<><span className="bar-movement-mark" aria-hidden="true">{roman[Number(movement)-1]}</span>{range}<UiIcon name="external"/></>:<><span className="bar-play-mark" aria-hidden="true"/>{label}</>}
   </a>);
  }else result.push(<strong key={match.index}>{inline(bold,onReference)}</strong>);
  at=match.index!+full.length;
 }
 result.push(text.slice(at));return result;
}
function GuideTextContent({text,onReference}:{text:string;onReference:GuideReference}){return <div className="guide-body">{text.split(/\n\s*\n/).map((paragraph,i)=><p key={i}>{paragraph.split('\n').map((line,j)=><Fragment key={j}>{j>0&&<br/>}{inline(line,onReference)}</Fragment>)}</p>)}</div>}

export const GuideText=memo(GuideTextContent);
