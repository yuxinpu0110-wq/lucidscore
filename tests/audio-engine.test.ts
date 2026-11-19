import {afterEach,describe,it,expect,vi} from 'vitest';
import {MahlerAudioEngine} from '../src/MahlerAudioEngine';
const mocks=vi.hoisted(()=>({clients:[] as Array<{fail:()=>void;destroy:ReturnType<typeof vi.fn>}>}));
vi.mock('hls.js',()=>({default:class {
 static isSupported(){return true}static Events={ERROR:'error'};
 fail=()=>{};destroy=vi.fn();attachMedia=vi.fn();loadSource=vi.fn();
 constructor(){mocks.clients.push(this)}on(_event:string,handler:(_:string,data:{fatal:boolean})=>void){this.fail=()=>handler('error',{fatal:true})}
}}));
class Media extends EventTarget {
 paused=false;ended=false;duration=2300;currentTime=0;src='';preload='';
 pause(){this.paused=true}play=vi.fn(()=>{this.paused=false;return Promise.resolve()});load=vi.fn(()=>{this.currentTime=0});canPlayType(){return ''}removeAttribute(){this.src=''}
}
afterEach(()=>vi.useRealTimers());
describe('one-node audio controller',()=>{
 it('attenuates before a playing seek, coalesces requests, restores after readiness',()=>{
  vi.useFakeTimers();const a=new Media(),fade=vi.fn(),engine=new MahlerAudioEngine(a as unknown as HTMLAudioElement,fade);
  engine.seek(100);vi.advanceTimersByTime(20);engine.seek(2147);vi.advanceTimersByTime(39);expect(a.currentTime).toBe(0);
  vi.advanceTimersByTime(1);expect(a.currentTime).toBe(2147);expect(fade).toHaveBeenCalledWith(.001,.04);
  a.dispatchEvent(new Event('seeked'));expect(fade).toHaveBeenLastCalledWith(1,.06);engine.dispose();
 });
 it('cancels delayed work on source changes and has a bounded gain-restoration fallback',()=>{
  vi.useFakeTimers();const a=new Media(),fade=vi.fn(),engine=new MahlerAudioEngine(a as unknown as HTMLAudioElement,fade);
  engine.seek(10);engine.load('/audio/next.m4a');vi.advanceTimersByTime(3000);expect(a.currentTime).toBe(0);expect(a.src).toBe('/audio/next.m4a');expect(a.preload).toBe('auto');
  a.paused=false;engine.seek(20);vi.advanceTimersByTime(2040);expect(fade).toHaveBeenLastCalledWith(1,.06);engine.dispose();
 });
 it('preserves playhead and intent on fatal HLS fallback without stale restoration after another load',async()=>{
  mocks.clients=[];const a=new Media(),engine=new MahlerAudioEngine(a as unknown as HTMLAudioElement,()=>{});
  engine.load('/stream.m3u8','/file.m4a');await vi.waitFor(()=>expect(mocks.clients.length).toBe(1));
  a.currentTime=2147;a.paused=false;mocks.clients[0].fail();expect(a.src).toBe('/file.m4a');expect(a.currentTime).toBe(0);
  a.dispatchEvent(new Event('loadedmetadata'));expect(a.currentTime).toBe(2147);expect(a.play).toHaveBeenCalledOnce();expect(mocks.clients[0].destroy).toHaveBeenCalledOnce();
  engine.load('/another.m3u8','/another.m4a');await vi.waitFor(()=>expect(mocks.clients.length).toBe(2));
  a.currentTime=100;a.paused=false;mocks.clients[1].fail();engine.load('/new.m4a');a.dispatchEvent(new Event('loadedmetadata'));expect(a.currentTime).toBe(0);expect(a.play).toHaveBeenCalledOnce();engine.dispose();
 });
});
