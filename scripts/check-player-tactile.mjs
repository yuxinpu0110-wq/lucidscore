import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 await mkdir('tmp/tactile',{recursive:true});
 for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.addInitScript(()=>localStorage.setItem('lucidscore_prologue_seen','1'));
  for(const tour of [false,true]) {
   await page.goto('http://127.0.0.1:5173/?'+(tour?'tour=highlights&step=1':'m=2&sec=1'));
   const shell=page.locator(tour?'.theatre-tour':'.floating-player-dock');
   const slider=shell.getByRole('slider');
   await expect(slider).toHaveAttribute('aria-disabled','false');
   const button=shell.locator(tour?'.tour-play':'.primary');
   await button.scrollIntoViewIfNeeded();
   await button.hover();await page.mouse.down();
   await expect(shell).toHaveAttribute('data-interacting','pressed');
   await expect(button).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
   await expect(button.locator('svg')).toHaveCount(1);
   expect(await button.evaluate(e=>getComputedStyle(e,'::after').backgroundColor)).toBe(tour?'rgba(255, 255, 255, 0.12)':'rgba(28, 25, 23, 0.08)');
   await page.mouse.up();await expect(shell).toHaveAttribute('data-interacting','idle');
   const box=await slider.boundingBox();
   const media=page.locator('audio');
   await page.mouse.move(box.x+box.width*.2,box.y+16);await page.mouse.down();
   const before=await media.evaluate(a=>a.currentTime);
   await page.mouse.move(box.x+box.width*.8,box.y+16,{steps:20});
   await expect(shell).toHaveAttribute('data-interacting','scrubbing');
   expect(await media.evaluate(a=>a.currentTime)).toBe(before);
   expect(Math.abs(await shell.evaluate(e=>parseFloat(e.style.getPropertyValue('--player-drag-x'))))).toBeLessThanOrEqual(3);
   await page.screenshot({path:`tmp/tactile/${width}-${tour}.png`});
   await page.mouse.up();await expect(shell).toHaveAttribute('data-interacting','idle');
   await expect.poll(()=>shell.evaluate(e=>e.style.getPropertyValue('--player-drag-x'))).toBe('0px');
   await page.mouse.move(box.x+box.width*.4,box.y+16);await page.mouse.down();
   await slider.dispatchEvent('pointercancel',{pointerId:1});
   await page.mouse.up();
   await expect(shell).toHaveAttribute('data-interacting','idle');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.close();
 }
 console.log('PASS regular/tour,390/1440, light/dark halo, pointer press/drag/reset, bounded displacement');
} finally {await browser.close()}
