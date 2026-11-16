import {intervalIndex} from './intervalLookup.ts';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** Display choreography from the user's phase table; not a music annotation. */
export function computeMovement5DawnProgress(bar:number):number {
 if(!Number.isFinite(bar)||bar<472)return 0;
 if(bar<=511)return clamp((bar-472)/39)*.25;
 if(bar<=579)return .25+clamp((bar-512)/67)*.30;
 // Reserve the bright gold palette for the emphatic entrance at bar 712.
 // Its intentional target step is softened in real time by the visual engine.
 if(bar<712)return .55+clamp((bar-580)/131)*.17;
 return .95+clamp((bar-712)/50)*.05;
}
/** Fractional bar from the matched recording's existing estimated intervals. */
export function fractionalBarAt(intervals:ReadonlyArray<{start:number;end:number}>,time:number):number|null {
 if(!Number.isFinite(time)||time<0||!intervals.length)return null;
 const index=intervalIndex(intervals,time);if(index>=0){const i=intervals[index];return index+1+(time-i.start)/(i.end-i.start)}
 return time===intervals.at(-1)!.end?intervals.length:null;
}
export function damp(current:number,target:number,seconds:number,attack=.2,release=.66){
 return current+(target-current)*(1-Math.exp(-Math.max(0,seconds)/(target>current?attack:release)));
}
export function bandEnergy(data:Uint8Array,sampleRate:number,fftSize:number,low:number,high:number){
 const first=Math.max(1,Math.ceil(low*fftSize/sampleRate)),last=Math.min(data.length-1,Math.floor(high*fftSize/sampleRate));
 if(last<first)return 0;let sum=0;for(let i=first;i<=last;i++)sum+=data[i];return sum/((last-first+1)*255);
}
