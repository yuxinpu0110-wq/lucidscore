import http from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,relative} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,expect} from '@playwright/test';
import {parseByteRange} from './audio-range.mjs';
const root=resolve('dist'),web=JSON.parse(await readFile('content/real/web-audio.json','utf8'));
let gate=false,delivered=0,browser;
// A real rate-limited response, not synthetic waiting events. Withhold bytes
// temporarily to exercise the browser's buffer underrun and recovery path.
const server=http.createServer(async(req,res)=>{
 let stream;
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,path==='/'?'index.html':path.slice(1));
  if(relative(root,file).startsWith('..')){res.writeHead(404);res.end();return}
  const info=await stat(file),range=parseByteRange(req.headers.range,info.size);
  if(!range){res.writeHead(416);res.end();return}
  const headers={'Content-Type':({'.m4a':'audio/mp4','.flac':'audio/flac','.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':range.end-range.start+1,'Cache-Control':'no-store'};
  if(req.headers.range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${info.size}`;
  res.writeHead(req.headers.range?206:200,headers);if(req.method==='HEAD'){res.end();return}
  stream=createReadStream(file,{start:range.start,end:range.end,highWaterMark:8192});res.on('close',()=>stream.destroy());
  if(!file.endsWith('.m4a')){stream.pipe(res);return}
  for await(const chunk of stream){
   while(gate&&!res.destroyed)await delay(50);
   if(res.destroyed)break;
   res.write(chunk);delivered+=chunk.length;await delay(chunk.length/(48*1024)*1000);
  }
  res.end();
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
 await page.goto(base);await page.locator('nav button').nth(0).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 const audio=page.locator('audio');expect(await audio.getAttribute('src')).toBe(web.tracks[0].url);await expect(audio).toHaveCount(1);
 await page.getByRole('radio',{name:'启发探索',exact:true}).check();await page.getByRole('button',{name:'播放',exact:true}).click();
 await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeGreaterThan(.5);
 await audio.evaluate(a=>{window.__stalls=0;a.addEventListener('waiting',()=>window.__stalls++)});
 const start=await audio.evaluate(a=>a.currentTime);await page.waitForTimeout(12000);const end=await audio.evaluate(a=>a.currentTime);
 expect(end-start).toBeGreaterThan(11);expect(await page.evaluate(()=>window.__stalls)).toBe(0);
 console.log(`PASS 48 KiB/s: ${(end-start).toFixed(2)}s actual playback in 12s, no rebuffering after startup; ${delivered} bytes transferred`);
 // Check the lower buffer display is derived from actual buffered ranges.
 expect(await page.locator('.playback-buffer-track span').count()).toBeGreaterThan(0);
 gate=true;await expect(page.locator('.playback-buffer')).toHaveAttribute('data-buffering','true',{timeout:45000});
 await expect(page.getByRole('status').filter({hasText:'正在缓冲'})).toBeVisible();await expect(page.locator('.explore')).toHaveAttribute('data-open','false');
 const stalledTime=await audio.evaluate(a=>a.currentTime);gate=false;
 await expect.poll(()=>audio.evaluate(a=>a.currentTime),{timeout:30000}).toBeGreaterThan(stalledTime+1);
 await expect(page.locator('.playback-buffer')).toHaveAttribute('data-buffering','false');await expect(page.locator('.explore')).toHaveAttribute('data-open','false');
 await page.getByRole('button',{name:'暂停并探索',exact:true}).click();await expect(page.locator('.explore')).toHaveAttribute('data-open','true');
 // Cross-movement seeking still uses the established bar mapping and lyrics.
 await page.locator('nav button').nth(4).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 const maps=JSON.parse(await readFile('content/real/work-measure-sync.json','utf8')),fifth=maps.movements.find(m=>m.movement===5);
 await page.getByLabel('小节号',{exact:true}).fill('472');
 await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeCloseTo(fifth.tracks[0].intervals[471].start,1);
 await expect(page.locator('.measure-liquid-lens')).toHaveAttribute('data-page','186');
 // The first syllable begins inside the mapped bar, not at its boundary.
 await audio.evaluate(a=>{a.currentTime+=1;a.dispatchEvent(new Event('timeupdate'))});
 await expect(page.locator('.lyrics-original')).toContainText('Aufersteh’n, ja aufersteh’n wirst du,');
 expect(errors).toEqual([]);console.log('PASS real buffer underrun/recovery without opening exploration, bar472/lyrics/lens and single audio');
}finally{gate=false;await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
