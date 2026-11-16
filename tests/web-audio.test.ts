import {describe,it,expect} from 'vitest';
import raw from '../content/real/web-audio.json';
import original from '../content/real/continuous-recording.json';
import catalog from '../content/real/catalog.json';
import {validate} from '../src/model';
import {validateContinuous} from '../src/continuousRecording';
import {validateWebAudio} from '../src/webAudio';
const continuous=validateContinuous(original,validate(catalog));
describe('verified web audio derivatives',()=>{
 it('uses five smaller delivery files with matching recording identity and duration',()=>{
  expect(validateWebAudio(raw,continuous).tracks).toHaveLength(5);
  expect(raw.tracks.reduce((n,t)=>n+t.bytes,0)).toBeLessThan(raw.tracks.reduce((n,t)=>n+t.sourceBytes,0)*.55);
 });
 it('rejects changed fingerprints, wrong movement URLs, missing/duplicate tracks and shifted timelines',()=>{
  for(const change of [(d:typeof raw)=>d.tracks[0].sourceFingerprint='sha256:'+'0'.repeat(64),(d:typeof raw)=>d.tracks[0].duration+=1,(d:typeof raw)=>d.tracks[0].url=d.tracks[1].url,(d:typeof raw)=>d.tracks.pop(),(d:typeof raw)=>d.tracks[0]=d.tracks[1]]){const bad=structuredClone(raw);change(bad);expect(()=>validateWebAudio(bad,continuous)).toThrow()}
 });
});
