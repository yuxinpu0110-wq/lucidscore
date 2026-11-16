import {z} from 'zod';
import type {ContinuousRecording} from './continuousRecording';
const fingerprint=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const schema=z.object({version:z.literal(1),tracks:z.array(z.object({trackId:z.string(),sourceFingerprint:fingerprint,fingerprint,url:z.string().regex(/^\/audio\/movement-[1-5]-web\.m4a$/),duration:z.number().positive(),bytes:z.number().int().positive(),sourceBytes:z.number().int().positive(),codec:z.literal('aac'),bitrate:z.literal(256000),hls:z.object({url:z.string(),duration:z.number().positive(),fingerprint}).optional()})).length(5)});
/** Only build-verified derivatives inherit their original's navigation identity. */
export function validateWebAudio(raw:unknown,original:ContinuousRecording){
 const data=schema.parse(raw),ids=new Set<string>();
 for(const t of data.tracks){
  const source=original.tracks.find(s=>s.id===t.trackId);
  if(!source||ids.has(t.trackId)||source.fingerprint!==t.sourceFingerprint||Math.abs(source.duration-t.duration)>.1||t.url!==`/audio/movement-${source.movement}-web.m4a`)throw Error('网页音源的来源、指纹、时长或编号不匹配');
  ids.add(t.trackId);
  if(t.hls&&(t.hls.url!==`/audio/hls/movement-${source.movement}/index.m3u8`||Math.abs(t.hls.duration-t.duration)>.1))throw Error('HLS来源、编号或时长不匹配');
 }
 return data;
}
