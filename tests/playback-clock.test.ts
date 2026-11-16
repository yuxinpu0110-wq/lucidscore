import {describe,it,expect} from 'vitest';
import {PlaybackClock} from '../src/PlaybackClock';
import {intervalIndex} from '../src/intervalLookup';
describe('semantic playback clock',()=>{
 it('suppresses high-frequency UI subscriptions until a semantic boundary',()=>{
  const clock=new PlaybackClock();clock.configure([0,3,10,20]);let renders=0;clock.subscribe(()=>renders++);
  for(let t=0;t<3;t+=1/60)clock.sample(t);
  expect(renders).toBe(0);clock.sample(3);expect(renders).toBe(1);
  for(let t=3;t<10;t+=1/60)clock.sample(t);expect(renders).toBe(1);
  clock.sample(10);expect(renders).toBe(2);clock.publish(10.5);expect(clock.getSnapshot()).toBe(10.5);expect(renders).toBe(3);
 });
 it('handles jumps, backwards seeks, track changes and unsubscription',()=>{
  const clock=new PlaybackClock();clock.configure([0,2,4]);let calls=0;const off=clock.subscribe(()=>calls++);
  clock.sample(30);clock.sample(1);expect(calls).toBe(2);clock.configure([0,.5,1.5]);clock.sample(1.6);expect(calls).toBe(3);off();clock.publish(0);expect(calls).toBe(3);
 });
 it('caches sequential hits while retaining binary random access, gaps and half-open endpoints',()=>{
  const spans=Array.from({length:1000},(_,i)=>({start:i*3,end:i*3+2}));
  for(const index of [0,0,1,2,999,7,8,6,0])expect(intervalIndex(spans,spans[index].start+.5)).toBe(index);
  expect(intervalIndex(spans,2)).toBe(-1);expect(intervalIndex(spans,3)).toBe(1);expect(intervalIndex(spans,3000)).toBe(-1);expect(intervalIndex(spans,NaN)).toBe(-1);
 });
});
