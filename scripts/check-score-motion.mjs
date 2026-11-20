import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
const base=process.env.BASE||'http://127.0.0.1:5200';
const server=process.env.BASE?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5200','--strictPort'],{stdio:'ignore',windowsHide:true});
let browser;
try{
 if(server)await expect.poll(async()=>{try{return (await fetch(base)).ok}catch{return false}}).toBe(true);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950}});
  await page.addInitScript(()=>localStorage.setItem('lucidscore_prologue_seen','1'));
  await page.goto(base+'/?m=2&sec=1',{waitUntil:'domcontentloaded'});
  const frame=page.locator('.measure-liquid-lens');
  const input=page.locator('.score-toolbar input');
  await expect(frame).toBeVisible({timeout:20000});
  await expect(frame).toHaveCSS('backdrop-filter',width<769?'none':'brightness(1.45) contrast(1.15)');
  await expect(frame).toHaveCSS('background-image',/^linear-gradient/);
  await expect(frame.locator('.measure-lens-rim')).toHaveCount(1);
  await expect(frame.locator('.measure-play-cursor')).toHaveCount(0);
  const position=()=>frame.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
  const before=await position();
  await input.fill('2');
  await expect(frame).toHaveAttribute('data-moving','true');
  const between=await frame.evaluate(el=>{
   const slide=el.getAnimations()[0];
   slide.currentTime=90;
   return new DOMMatrix(getComputedStyle(el).transform).m41;
  });
  await expect(frame).toHaveAttribute('data-moving','false');
  expect(between).toBeGreaterThan(before+.6);
  expect(await position()).toBeGreaterThan(between+.6);
  await input.fill('3');
  await expect(frame).toHaveAttribute('data-moving','true');
  await input.fill('1');
  await expect(frame).toHaveAttribute('data-moving','false');
  expect(await position()).toBeCloseTo(before,1);
  if(width===390){
   const scroll=()=>page.locator('.score-follow-pages').evaluate(el=>el.scrollTop);
   await page.waitForTimeout(700);
   const sameRow=await scroll();
   await input.fill('2');
   await page.waitForTimeout(700);
   expect(await scroll()).toBe(sameRow);
   await input.fill('7');
   await page.waitForTimeout(700);
   expect(await scroll()).toBe(sameRow);
   await input.fill('8');
   await page.waitForTimeout(210);
   const intermediate=await scroll();
   await page.waitForTimeout(490);
   expect(intermediate).toBeGreaterThan(sameRow);
   expect(await scroll()).toBeGreaterThan(intermediate);
  }
  await page.close();
 }
 console.log('PASS restored glass locator, intermediate slide, rapid reversal and eased mobile row scrolling');
}finally{await browser?.close();server?.kill()}
