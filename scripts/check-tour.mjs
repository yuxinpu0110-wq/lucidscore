import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:5327',data=JSON.parse(await readFile('content/real/curated-tours.json','utf8')).curatedTours[0];
const server=process.argv[2]?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5327','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?tour=10min');await expect(page.locator('.intro-prologue')).toHaveCount(0);await expect(page.locator('.tour-bar')).toBeVisible();
 await mkdir('tmp/tour',{recursive:true});
 for(const s of data.stops){
  await expect.poll(()=>new URL(page.url()).searchParams.get('step'),{timeout:25000}).toBe(String(s.step));
  await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:25000}).toBeGreaterThanOrEqual(s.clipStart-.05);
  if(await page.locator('audio').evaluate(a=>a.paused))await page.getByRole('button',{name:'播放',exact:true}).click();
  await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:25000}).toBeGreaterThan(s.clipStart+.2);
  expect(await page.locator('audio').count()).toBe(1);expect(await page.locator('.tour-bar').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(52);
  if(s.step===3)await page.screenshot({path:'tmp/tour/active-mobile.png'});
  await page.locator('audio').evaluate((a,t)=>a.currentTime=t,s.clipEnd-.15);
 }
 await expect(page.locator('.tour-finish')).toBeVisible({timeout:15000});await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 await page.getByRole('button',{name:'留在此处，听完终曲合唱',exact:true}).click();await expect(page.locator('.tour-bar')).toHaveCount(0);expect(new URL(page.url()).searchParams.has('tour')).toBe(false);await expect(page.locator('audio')).toHaveJSProperty('paused',false);
 await page.goto(base+'/?tour=10min&step=3');await expect.poll(()=>page.locator('main').getAttribute('data-movement')).toBe('2');await expect(page.locator('.tour-bar')).toContainText('兰德勒');
 await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);const before=await page.locator('audio').evaluate(a=>a.currentTime);await page.getByRole('button',{name:'完整听此处',exact:true}).click();expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(before);await expect(page.locator('.tour-bar')).toHaveCount(0);
 await page.goto(base+'/?tour=10min&step=2');await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:25000}).toBeGreaterThan(164);
 const slider=page.getByRole('slider',{name:'播放位置',exact:true});await slider.focus();await slider.evaluate(e=>{e.value='400';e.dispatchEvent(new Event('change',{bubbles:true}))});await slider.press('End');await slider.press('Tab');await expect(page.locator('.tour-bar')).toHaveCount(0);
 expect(errors).toEqual([]);await mkdir('tmp/tour',{recursive:true});await page.screenshot({path:'tmp/tour/exit.png'});console.log('PASS six stops, same/cross movement playback, one audio, finale/resume, deep link, exit, scrub escape, compact mobile');
}finally{await browser?.close();server?.kill()}
