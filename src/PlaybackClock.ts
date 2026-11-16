/** React sees semantic boundaries, never the continuously advancing media clock. */
export class PlaybackClock {
 private snapshot=0;
 private bucket=-1;
 private boundaries:number[]=[];
 private listeners=new Set<()=>void>();
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}};
 getSnapshot=()=>this.snapshot;
 configure(boundaries:number[]){this.boundaries=[...new Set(boundaries.filter(Number.isFinite))].sort((a,b)=>a-b);this.bucket=this.index(this.snapshot)}
 private index(time:number){let lo=0,hi=this.boundaries.length;while(lo<hi){const mid=(lo+hi)>>>1;if(this.boundaries[mid]<=time)lo=mid+1;else hi=mid}return lo}
 sample(time:number,force=false){
  if(!Number.isFinite(time))return;
  const bucket=this.index(time);if(!force&&bucket===this.bucket)return;
  this.bucket=bucket;if(time===this.snapshot)return;
  this.snapshot=time;for(const notify of this.listeners)notify();
 }
 publish=(time:number)=>this.sample(time,true);
}
