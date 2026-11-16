type Span={start:number;end:number};
const cursors=new WeakMap<ReadonlyArray<Span>,number>();
/** Sorted, non-overlapping, half-open intervals. Cache the current/next hit. */
export function intervalIndex<T extends Span>(spans:ReadonlyArray<T>,time:number):number {
 if(!Number.isFinite(time))return -1;
 const hit=(i:number)=>i>=0&&i<spans.length&&spans[i].start<=time&&time<spans[i].end;
 const last=cursors.get(spans)??-1;
 if(hit(last))return last;
 if(hit(last+1)){cursors.set(spans,last+1);return last+1}
 let lo=0,hi=spans.length-1;
 while(lo<=hi){const mid=(lo+hi)>>>1,s=spans[mid];if(time<s.start)hi=mid-1;else if(time>=s.end)lo=mid+1;else{cursors.set(spans,mid);return mid}}
 return -1;
}
const identities=new WeakMap<object,Map<string,{id:string}>>();
export function identityAt<T extends {id:string}>(entries:ReadonlyArray<T>,id:string):T|undefined {
 let map=identities.get(entries);if(!map){map=new Map(entries.map(e=>[e.id,e]));identities.set(entries,map)}
 return map.get(id) as T|undefined;
}
