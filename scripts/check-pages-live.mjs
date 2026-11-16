import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'https://lucidscore.pages.dev';const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await expect(page).toHaveTitle('LucidScore · 古典音乐交互导听');
 await page.getByRole('button',{name:'进入现场 · 开启原声',exact:true}).click();await expect.poll(()=>page.locator('video').first().evaluate(v=>v.currentTime)).toBeGreaterThan(.2);await page.getByRole('button',{name:'跳过序幕 →'}).click();
 const results=[];
 for(let i=0;i<5;i++){
  await page.locator('nav button').nth(i).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
  await page.getByRole('button',{name:'播放',exact:true}).click();const start=await page.locator('audio').evaluate(a=>a.currentTime);await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThan(start+.3);
  expect(await page.locator('audio').getAttribute('src')).toMatch(/^blob:/);results.push({movement:i+1,transport:'HLS',played:true});await page.getByRole('button',{name:'暂停并探索',exact:true}).click();
 }
 await page.getByRole('button',{name:'审阅与音源',exact:true}).click();await expect(page.locator('.review-drawer .library')).not.toBeVisible();await page.keyboard.press('Escape');
 const assets=await page.evaluate(async()=>{
  const entries=[];for(const path of ['/videos/intro-prologue.mp4','/audio/hls/movement-5/segment_0000.m4s']){const r=await fetch(path,{headers:{Range:'bytes=0-99'}});entries.push({path,status:r.status,range:r.headers.get('content-range'),type:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength})}return entries;
 });for(const item of assets){expect([200,206]).toContain(item.status);expect(item.type).not.toContain('text/html');expect(item.bytes).toBeGreaterThan(0);if(item.status===206)expect(item.bytes).toBe(100)}
 await page.goto(base+'/mahler/symphony-2');await expect(page).toHaveTitle('LucidScore · 古典音乐交互导听');await expect(page.locator('nav button')).toHaveCount(5);
 expect(errors).toEqual([]);await mkdir('.local/deploy',{recursive:true});await writeFile('.local/deploy/pages-live.json',JSON.stringify({base,movements:results,assets,deepLink:true,reviewHidden:true,pageErrors:errors},null,2));console.log('PASS live Pages: prologue with audio, 5 HLS movements, video/segment fetch, hidden review tools, deep-link refresh, no JS errors');
}finally{await browser.close()}
