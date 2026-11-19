import {describe,it,expect} from 'vitest';
import {captionFrame} from '../src/prologueCaptions';
describe('media-clock subtitle envelopes',()=>{
 it.each([[0,1.2,4.2],[0,6.2,10.2],[1,1,4.6],[1,5,9.2]])('fades a cue without returning to full opacity at its end',(scene,start,end)=>{
  expect(captionFrame(scene,start).alpha).toBe(0);
  expect(captionFrame(scene,start+.8).alpha).toBe(1);
  const alphas=[end-.5,end-.2,end-.01,end,end+.01].map(t=>captionFrame(scene,t).alpha);
  for(let i=1;i<alphas.length;i++)expect(alphas[i]).toBeLessThanOrEqual(alphas[i-1]);
  expect(captionFrame(scene,end).text).toBe('');
 });
 it('keeps gaps and credits out of subtitle opacity',()=>{
  for(const t of [0,4.7,10,15.5,21.5])expect(captionFrame(1,t)).toEqual({text:'',alpha:0,offset:10});
 });
});
