import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {isFaststart} from './audio-atoms.mjs';
const base=process.argv[2]||'http://127.0.0.1:5318';
const server=process.argv[2]?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5318','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 await mkdir('tmp/prologue',{recursive:true});for(const name of ['intro-abyss','intro-resurrection','intro-prologue'])expect(await isFaststart(`public/videos/${name}.mp4`)).toBe(true);
 await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  const videos=page.locator('video');await expect(videos).toHaveCount(1);await expect(page.locator('.intro-prologue')).toBeVisible();await expect.poll(()=>videos.first().evaluate(v=>v.currentTime)).toBeGreaterThan(.1);expect(await videos.first().evaluate(v=>v.muted)).toBe(false);await expect(page.locator('audio')).toHaveJSProperty('paused',true);
  await videos.first().evaluate(v=>v.currentTime=2);await expect(page.locator('.prologue-caption')).toHaveText('生是什么？');
  await videos.first().evaluate(v=>v.currentTime=14.55);await expect(page.locator('.prologue-screen')).toHaveAttribute('data-scene','1');await page.waitForTimeout(1400);await expect(videos.first()).toHaveJSProperty('paused',false);
  await videos.first().evaluate(v=>v.currentTime=20.5);await expect(page.locator('.prologue-caption')).toHaveText('凡消亡者，终将复活。');
  await videos.first().evaluate(v=>{v.pause();v.currentTime=24.5});await expect(page.locator('.prologue-credits')).toBeVisible();await expect(page.locator('.prologue-credits p')).toHaveCount(2);await expect(page.locator('.prologue-work-title')).toBeVisible();await page.waitForTimeout(1200);const initialCreditsY=await page.locator('.prologue-copy').evaluate(e=>e.getBoundingClientRect().top);
  await videos.first().evaluate(v=>v.currentTime=30.5);await expect(page.getByRole('button',{name:'从未听过 · 开启启发探索'})).toBeVisible();await page.waitForTimeout(1200);expect(await page.locator('.prologue-copy').evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(initialCreditsY-10);await page.screenshot({path:`tmp/prologue/choices-${width}.png`});
  await videos.first().evaluate(v=>v.currentTime=36.1);await expect(page.locator('.prologue-screen')).toHaveAttribute('data-frozen','true');
  await page.getByRole('button',{name:'从未听过 · 开启启发探索'}).click();await expect(page.locator('.intro-prologue')).toHaveCount(0);await expect(page.locator('main')).toHaveAttribute('data-view-mode','stage');await expect(page.locator('audio')).toHaveJSProperty('paused',false);await expect(page.getByRole('radio',{name:'启发探索',exact:true})).toBeChecked();
  await page.getByRole('button',{name:'审阅与音源',exact:true}).click();await page.locator('.review-drawer').getByRole('button',{name:'重看序幕',exact:true}).click();await expect(page.locator('.intro-prologue')).toBeVisible();await expect(page.locator('audio')).toHaveJSProperty('paused',true);await page.getByRole('button',{name:'跳过序幕 →'}).click();await expect(page.locator('main')).toHaveAttribute('data-view-mode','lobby');await page.reload();await expect(page.locator('.intro-prologue')).toHaveCount(0);expect(errors).toEqual([]);await page.close();
 }
 for(const width of [390,1440]){
  const lobby=await browser.newPage({viewport:{width,height:900}});await lobby.addInitScript(()=>localStorage.setItem('lucidscore_prologue_seen','1'));await lobby.goto(base);
  for(let attempt=0;attempt<2;attempt++){
   const back=lobby.getByRole('button',{name:'返回序幕',exact:true});await expect(back).toBeVisible();const box=await back.boundingBox();expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y).toBeGreaterThan(800);
   await back.click();await expect(lobby.locator('.intro-prologue')).toBeVisible();await expect(lobby.locator('audio')).toHaveJSProperty('paused',true);expect(await lobby.locator('video').first().evaluate(v=>v.currentTime)).toBeLessThan(2);await lobby.getByRole('button',{name:'跳过序幕 →'}).click();
  }await lobby.close();
 }
 const free=await browser.newPage();await free.goto(base);await free.getByRole('button',{name:'点击任意位置跳过'}).click();await expect(free.locator('.prologue-screen')).toHaveAttribute('data-scene','1');await free.locator('video').first().evaluate(v=>v.currentTime=30.5);await free.getByRole('button',{name:'已经听过 · 进入自由检索'}).click();await expect(free.getByRole('radio',{name:'自由检索',exact:true})).toBeChecked();await expect(free.locator('audio')).toHaveJSProperty('paused',true);await expect(free.locator('main')).toHaveAttribute('data-view-mode','stage');await free.close();
 const blocked=await browser.newPage({viewport:{width:390,height:844}});await blocked.addInitScript(()=>{
  const native=HTMLMediaElement.prototype.play;window.__ignition=[];
  HTMLMediaElement.prototype.play=function(){if(this.tagName==='VIDEO'){window.__ignition.push({time:this.currentTime,muted:this.muted,volume:this.volume,active:navigator.userActivation.isActive});if(!navigator.userActivation.isActive)return Promise.reject(new DOMException('Test autoplay denial','NotAllowedError'))}return native.call(this)};
 });await blocked.goto(base);await expect(blocked.getByRole('button',{name:'进入现场 · 开启原声',exact:true})).toBeVisible();await blocked.waitForTimeout(900);
 expect(await blocked.locator('video').first().evaluate(v=>({time:v.currentTime,paused:v.paused,muted:v.muted}))).toEqual({time:0,paused:true,muted:false});expect(await blocked.locator('.prologue-caption').textContent()).toBe('');await blocked.screenshot({path:'tmp/prologue/curtain-mobile.png'});
 await blocked.getByRole('button',{name:'进入现场 · 开启原声',exact:true}).click();await expect.poll(()=>blocked.locator('video').first().evaluate(v=>v.currentTime)).toBeGreaterThan(.1);
 expect(await blocked.evaluate(()=>window.__ignition.at(-1))).toEqual({time:0,muted:false,volume:1,active:true});await expect(blocked.locator('.prologue-curtain')).toHaveCount(0);await expect(blocked.locator('.prologue-screen')).toHaveAttribute('data-scene','1',{timeout:20000});await expect(blocked.locator('video')).toHaveJSProperty('paused',false);expect(await blocked.evaluate(()=>window.__ignition.length)).toBe(2);await expect(blocked.locator('.intro-prologue img')).toHaveCount(0);await blocked.close();
 console.log('PASS unmuted autoplay allowed/denied, frozen 00:00 curtain, synchronous gesture ignition, captions/crossfade/freeze, guided/free, skip/replay, mobile/desktop, faststart');
}finally{await browser?.close();server?.kill()}
