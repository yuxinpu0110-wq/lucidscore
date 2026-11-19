import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:5330';
const server=process.argv[2]?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--port','5330','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?profilePlayback=1');await page.locator('video').evaluate(v=>window.oldVideo=v);
 await page.getByRole('button',{name:/^跳过序幕(?: →)?$/}).click();
 expect(await page.evaluate(()=>({src:window.oldVideo.getAttribute('src'),paused:window.oldVideo.paused,connected:window.oldVideo.isConnected}))).toEqual({src:null,paused:true,connected:false});
 await expect(page.locator('.tour-lobby-card')).toHaveCount(0);
 await page.locator('nav button').first().click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 await expect(page.locator('.score-ink')).toBeVisible();
 const blur=await page.locator('.floating-player-dock').evaluate(e=>getComputedStyle(e).backdropFilter);expect(blur).toBe('blur(8px)');
 const largeBlurs=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return s.backdropFilter!=='none'&&r.height>80&&r.width>200}).length);expect(largeBlurs).toBe(0);
 const session=await page.context().newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(300);await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThan(.3);const playedFrom=await page.locator('audio').evaluate(a=>a.currentTime);await page.evaluate(()=>performance.clearMarks('lucidscore.app.render'));await page.waitForTimeout(1000);expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThan(playedFrom+.5);
 const renders=await page.evaluate(()=>performance.getEntriesByName('lucidscore.app.render').length);expect(renders).toBeLessThan(8);
 const start=performance.now();await page.getByRole('radio',{name:'结构',exact:true}).check();await expect(page.getByRole('radio',{name:'结构',exact:true})).toBeChecked();const tabRoundtripMs=performance.now()-start;
 await page.getByRole('button',{name:'暂停并探索',exact:true}).click();await session.send('Emulation.setCPUThrottlingRate',{rate:1});
 for(const bar of [13,35,1]){await page.getByRole('spinbutton',{name:'小节号',exact:true}).fill(String(bar));await page.waitForTimeout(400);await expect(page.locator('.measure-liquid-lens')).toBeVisible()}
 await mkdir('tmp/ui-performance',{recursive:true});await page.screenshot({path:'tmp/ui-performance/mobile.png'});
 expect(errors).toEqual([]);await writeFile('tmp/ui-performance/result.json',JSON.stringify({base,rendersPerSecond:renders,tabRoundtripMs,cpuThrottle:4,largeBlurs,blur,errors},null,2));
 console.log(JSON.stringify({pass:true,rendersPerSecond:renders,tabRoundtripMs,largeBlurs,blur,videoReleased:true,tourAbsent:true}));
}finally{await browser?.close();server?.kill()}
