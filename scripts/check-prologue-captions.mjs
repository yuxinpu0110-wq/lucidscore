import {chromium,expect} from '@playwright/test';
const base=process.argv[2]||'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'进入现场 · 开启原声',exact:true}).click();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(.2);await page.locator('video').evaluate(v=>v.pause());await page.evaluate(()=>window.subtitle=document.querySelector('.prologue-caption'));
 const p=page.locator('.prologue-caption');
 for(const [start,end]of [[1.2,4.2],[6.2,10.2],[15.5,19.1],[19.5,23.7]]){
  await page.locator('video').evaluate((v,t)=>v.currentTime=t,start+.1);await expect.poll(()=>p.textContent()).not.toBe('');expect(await page.evaluate(()=>window.subtitle===document.querySelector('.prologue-caption'))).toBe(true);
  await expect.poll(()=>p.evaluate(e=>Number(getComputedStyle(e).opacity))).toBeLessThan(.3);
  await page.locator('video').evaluate((v,t)=>v.currentTime=t,end-.05);await expect.poll(()=>p.evaluate(e=>Number(getComputedStyle(e).opacity))).toBeLessThan(.15);
  await page.locator('video').evaluate((v,t)=>v.currentTime=t,end+.02);await expect(p).toHaveText('');expect(await p.evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(0);expect(await p.evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 }
 await page.locator('video').evaluate(v=>v.currentTime=24.5);await expect(page.locator('.prologue-credits')).toBeVisible();await page.waitForTimeout(1300);expect(await page.locator('.prologue-credits').evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(1);
 await page.getByRole('button',{name:/^跳过序幕(?: →)?$/}).click();await expect(page.locator('.three-choice-gate')).toBeVisible();await page.getByRole('button',{name:/自由检索 · 总谱全集/}).click();await expect(page.locator('video')).toHaveCount(0);expect(errors).toEqual([]);await page.close();
 }console.log('PASS four subtitle envelopes, stable DOM across gaps/seeks, no CSS opacity animation/reset, independent credits, skip/cleanup 390/1440');
}finally{await browser.close()}
