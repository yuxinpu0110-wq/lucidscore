import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 await mkdir('tmp/morphing',{recursive:true});
 for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('lucidscore_prologue_seen','1');window.seekWrites=[];const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{...d,set(v){if(this.tagName==='AUDIO')window.seekWrites.push(v);d.set.call(this,v)}})});
 await page.goto('http://127.0.0.1:5173/?m=1&sec=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 const slider=page.getByRole('slider',{name:'播放位置',exact:true});await slider.scrollIntoViewIfNeeded();await expect(page.locator('input.timeline')).toHaveCount(0);expect(await page.locator('.morphing-track').evaluate(e=>getComputedStyle(e).height)).toBe('4px');
 expect(await page.locator('.morphing-transport>button').nth(1).evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(0);
 const geometry=()=>slider.evaluate(e=>{
  const bounds=selector=>e.querySelector(selector).getBoundingClientRect();
  const track=bounds('.morphing-track'), times=bounds('.morphing-times');
  return {center:track.y+track.height/2, left:track.left, right:track.right,
   timeY:times.y, timeLeft:times.left, timeRight:times.right,
   outline:getComputedStyle(e).outlineStyle};
 });
 const idle=await geometry();
 expect(idle.timeLeft).toBe(idle.left);
 expect(idle.timeRight).toBe(idle.right);
 if(width>=769){
  const dock=page.locator('.floating-player-dock');
  const bounds=await dock.boundingBox();
  expect(bounds.width).toBe(680);
  expect(Math.abs(bounds.x+bounds.width/2-width/2)).toBeLessThan(12);
  for(const button of await dock.locator('.morphing-transport>button').all()){
   expect(await button.evaluate(e=>{
    const style=getComputedStyle(e);
    return [style.borderTopWidth,style.boxShadow];
   })).toEqual(['0px','none']);
  }
 }
 const box=await slider.boundingBox();await page.evaluate(()=>window.seekWrites=[]);await page.mouse.move(box.x+3,box.y+16);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+16,{steps:25});await page.waitForTimeout(280);
 expect(await page.evaluate(()=>window.seekWrites.length)).toBe(0);expect(await page.locator('.morphing-track').evaluate(e=>getComputedStyle(e).height)).toBe('10px');expect(await page.locator('.morphing-times').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');expect(await slider.getAttribute('aria-valuenow')).not.toBe('0.0');await page.screenshot({path:`tmp/morphing/active-${width}.png`});
 const active=await geometry();
 expect(active.outline).toBe('none');
 expect(active.timeLeft).toBe(active.left);
 expect(active.timeRight).toBe(active.right);
 // The dock itself stretches on press. Compare the inner vertical spacing.
 expect(Math.abs((active.timeY-active.center)-(idle.timeY-idle.center))).toBeLessThan(1);
 await page.mouse.move(box.x+box.width*.65,box.y-30);await page.mouse.up();await page.waitForTimeout(280);expect(await page.evaluate(()=>window.seekWrites.length)).toBe(1);expect(await page.locator('.morphing-track').evaluate(e=>getComputedStyle(e).height)).toBe('4px');expect(await page.locator('.morphing-times').evaluate(e=>getComputedStyle(e).opacity)).toBe('0.48');
 await slider.focus();await page.evaluate(()=>window.seekWrites=[]);await slider.press('ArrowRight');await page.waitForTimeout(100);expect(await page.evaluate(()=>window.seekWrites.length)).toBe(1);
 await page.evaluate(()=>window.seekWrites=[]);const r=await slider.boundingBox();await page.mouse.move(r.x+r.width*.2,r.y+16);await page.mouse.down();await slider.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();expect(await page.evaluate(()=>window.seekWrites.length)).toBe(0);
 await page.goto('http://127.0.0.1:5173/?m=2&sec=1',{waitUntil:'domcontentloaded'});await expect.poll(()=>page.locator('main').getAttribute('data-score-mode')).toBe('light');expect(await page.locator('.morphing-track').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(28, 25, 23, 0.12)');await page.screenshot({path:`tmp/morphing/light-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await page.close();
 }console.log('PASS morphing4/10px, labels,25 previews0seeks, release1seek, keyboard/cancel, light/dark390/1440');
}finally{await browser.close()}
