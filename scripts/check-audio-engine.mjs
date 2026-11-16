import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5310','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 await mkdir('tmp/performance/audio-engine',{recursive:true});await new Promise(r=>setTimeout(r,1000));browser=await chromium.launch({channel:'msedge',headless:true});const result={};
 for(const transport of ['progressive','hls']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{
   window.__contexts=0;window.__sources=0;window.__ramps=[];window.__writes=[];
   const Base=window.AudioContext;window.AudioContext=class extends Base{
    constructor(...args){super(...args);window.__contexts++}
    createMediaElementSource(el){window.__sources++;return super.createMediaElementSource(el)}
    createGain(){const node=super.createGain(),ramp=node.gain.linearRampToValueAtTime.bind(node.gain);node.gain.linearRampToValueAtTime=(v,t)=>{window.__ramps.push({v,t});return ramp(v,t)};return node}
   };
   const set=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(name,value,...args){if(/^--audio-(bass|mid|high)$/.test(name))window.__writes.push({name,value:Number(value),time:performance.now()});return set.call(this,name,value,...args)};
  });
  await page.goto(`http://127.0.0.1:5310/?audio=${transport}&profilePlayback=1`);
  await page.evaluate(()=>window.__originalAudio=document.querySelector('audio'));await page.locator('nav button').nth(4).click();
  const audio=page.locator('audio');await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
  await audio.evaluate(a=>{a.currentTime=2143.6;a.dispatchEvent(new Event('timeupdate'))});
  await expect(page.getByRole('spinbutton',{name:'小节号',exact:true})).toHaveValue('711');
  await page.getByRole('button',{name:'播放',exact:true}).click();await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeGreaterThan(2143.7);
  await page.waitForTimeout(100);await page.evaluate(()=>{performance.clearMarks('lucidscore.app.render');window.__writes=[]});const before=await audio.evaluate(a=>a.currentTime);
  await page.waitForTimeout(800);const after=await audio.evaluate(a=>a.currentTime);
  expect(after-before).toBeGreaterThan(.65);expect(await page.evaluate(()=>performance.getEntriesByName('lucidscore.app.render').length)).toBe(0);
  expect(Number(await page.getByRole('slider',{name:'播放位置'}).inputValue())).toBeGreaterThan(before+.6);
  const writes=await page.evaluate(()=>window.__writes);for(const name of ['bass','mid','high']){
   const band=writes.filter(w=>w.name===`--audio-${name}`);expect(band.length).toBeLessThanOrEqual(26);
   for(let i=1;i<band.length;i++)if(band[i].value!==0)expect(Math.abs(band[i].value-band[i-1].value)).toBeGreaterThanOrEqual(.0049);
  }
  await page.getByRole('button',{name:'+5 秒',exact:true}).click();await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeGreaterThan(after+4.9);
  await expect.poll(()=>page.evaluate(()=>window.__ramps.some(r=>r.v===.001)&&window.__ramps.some(r=>r.v===1))).toBe(true);
  await page.getByRole('button',{name:'暂停并探索',exact:true}).click();await page.getByRole('spinbutton',{name:'小节号',exact:true}).fill('711');await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeCloseTo(2143.266667,1);await page.getByRole('spinbutton',{name:'小节号',exact:true}).fill('712');
  await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeCloseTo(2147,1);await expect(page.getByRole('spinbutton',{name:'小节号',exact:true})).toHaveValue('712');
  if(transport==='hls'){
   expect(await audio.getAttribute('src')).toMatch(/^blob:/);
   expect(requests.some(r=>r.endsWith('/movement-5/index.m3u8'))).toBe(true);expect(requests.some(r=>r.endsWith('.m4s'))).toBe(true);
   await expect.poll(()=>audio.evaluate(a=>{for(let i=0;i<a.buffered.length;i++)if(a.buffered.start(i)<=2147&&a.buffered.end(i)>2147)return a.buffered.end(i)-2147;return 0}),{timeout:15000}).toBeGreaterThan(45);
   expect(await audio.evaluate(a=>{let sum=0;for(let i=0;i<a.buffered.length;i++)sum+=a.buffered.end(i)-a.buffered.start(i);return sum})).toBeLessThan(130);
   const playlist=await readFile('dist/audio/hls/movement-5/index.m3u8','utf8');let elapsed=0,segment;
   for(const match of playlist.matchAll(/#EXTINF:([\d.]+),\s*([^\r\n]+)/g)){if(elapsed<=2147&&elapsed+Number(match[1])>2147){segment=match[2];break}elapsed+=Number(match[1])}
   const count=()=>requests.filter(r=>r.endsWith('/'+segment)).length,n=count();
   await page.getByRole('button',{name:'+5 秒',exact:true}).click();await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeCloseTo(2152,1);
   await page.getByRole('button',{name:'回听小节',exact:true}).click();await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeGreaterThan(2145);await page.waitForTimeout(250);expect(count()).toBe(n);
   // Leave bounded bar audition before measuring continuous transport.
   await page.getByRole('button',{name:'暂停并探索',exact:true}).click();await page.getByRole('button',{name:'播放',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('audio').readyState>=3);
   await audio.evaluate(a=>{window.__hlsStalls=0;a.addEventListener('waiting',()=>window.__hlsStalls++)});const continuousStart=await audio.evaluate(a=>a.currentTime);
   await page.waitForTimeout(8200);const continuous=await audio.evaluate(a=>a.currentTime)-continuousStart;expect(continuous).toBeGreaterThan(7.8);expect(await page.evaluate(()=>window.__hlsStalls)).toBe(0);
  }
  await page.locator('nav button').nth(1).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);await page.getByRole('button',{name:'播放',exact:true}).click();
  expect(await page.evaluate(()=>document.querySelector('audio')===window.__originalAudio)).toBe(true);expect(await page.evaluate(()=>[window.__contexts,window.__sources])).toEqual([1,1]);await expect(audio).toHaveCount(1);expect(errors).toEqual([]);
  result[transport]={playbackSeconds:after-before,appRendersWithinBar:0,bandWrites:writes.length,contexts:1,sources:1,hlsSegmentRequests:requests.filter(r=>r.endsWith('.m4s')).length};
  await page.screenshot({path:`tmp/performance/audio-engine/${transport}.png`});await page.close();
 }
 await writeFile('tmp/performance/audio-engine/result.json',JSON.stringify(result,null,2));console.log('PASS isolated progress / zero App renders inside a bar, capped FFT writes, anti-pop seeks, one audio graph, 35:47 mapping and real HLS buffered replay',result);
}finally{await browser?.close();server.kill()}
