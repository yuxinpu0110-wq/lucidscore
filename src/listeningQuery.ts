import {listeningLayers,type ListeningLayer} from './ListeningLayers';
import type {Mode} from './model';
import {WORK_PATH} from './workRoute';
const tabs=['appreciation','structure','harmony','orchestration'] as const;
export type ListeningQuery={movement:number;section:number;tab:ListeningLayer;mode:Mode;hasSelection:boolean};
export function readListeningQuery(search:string,counts:Record<number,number>):ListeningQuery {
 const p=new URLSearchParams(search),m=Number(p.get('m')),s=Number(p.get('sec'));
 const movement=Number.isInteger(m)&&m>=1&&m<=5?m:1;
 const section=Number.isInteger(s)&&s>=1&&s<=(counts[movement]||1)?s:1;
 const index=tabs.indexOf(p.get('tab') as typeof tabs[number]);
 return {movement,section,tab:listeningLayers[index<0?0:index],mode:p.get('mode')==='guided'?'启发探索':'自由检索',hasSelection:['m','sec','tab','mode'].some(k=>p.has(k))};
}
export function listeningURL(href:string,state:Omit<ListeningQuery,'hasSelection'>):URL {
 const u=new URL(href);u.pathname=WORK_PATH;u.searchParams.delete('catalog');
 u.searchParams.set('m',String(state.movement));u.searchParams.set('sec',String(state.section));
 u.searchParams.set('tab',tabs[listeningLayers.indexOf(state.tab)]);u.searchParams.set('mode',state.mode==='启发探索'?'guided':'free');
 return u;
}
