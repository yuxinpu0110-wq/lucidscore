import raw from '../content/real/curated-tours.json';
import {authorGuideLibrary} from './guideLibrary';
import recording from '../content/real/continuous-recording.json';
export interface TourStop {step:number;shortTitle:string;listeningCue:string;bridgeNote:string;movementId:number;sectionId:string;clipStart:number;clipEnd:number;fromBar:number;toBar:number}
export const curatedTours=raw.curatedTours as {id:string;title:string;status:string;stops:TourStop[]}[];
export const highlightsTour=curatedTours[0];
for(const tour of curatedTours){
 let total=0;
 for(const [i,s] of tour.stops.entries()){
  const track=recording.tracks.find(t=>t.movement===s.movementId);
  if(s.step!==i+1||!track||!authorGuideLibrary[s.movementId]?.guides.some(g=>g.id===s.sectionId)||s.clipStart<0||s.clipEnd>track.duration||s.clipEnd<=s.clipStart)throw Error('Invalid curated tour stop');
  total+=s.clipEnd-s.clipStart;
 }
 if(tour.stops.length!==6||total<=0||total>1800)throw Error('Invalid highlights tour duration');
}
