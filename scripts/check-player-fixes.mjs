import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:5333';
const server=process.argv[2]?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--port','5333','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('lucidscore_prologue_seen','1');const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');window.seekWrites=[];Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{...d,set(v){if(this.tagName==='AUDIO')window.seekWrites.push(v);d.set.call(this,v)}})});
 await page.goto(base+'/?m=2&sec=1');await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 await expect.poll(()=>page.locator('main').getAttribute('data-score-mode')).toBe('light');
 const pill=page.locator('.floating-player-dock');expect(await pill.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(250, 247, 240, 0.92)');expect(await page.locator('.mobile-play-svg').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(28, 25, 23)');
 expect(await page.locator('main').evaluate(e=>getComputedStyle(e,'::after').backgroundImage)).toContain('rgb(244, 239, 230)');expect(await page.locator('audio').getAttribute('preload')).toBe('auto');
 await mkdir('tmp/player-fixes',{recursive:true});await page.screenshot({path:'tmp/player-fixes/light.png'});
 const slider=page.locator('.timeline'),r=await slider.boundingBox();await page.evaluate(()=>window.seekWrites=[]);
 await page.mouse.move(r.x+4,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height/2,{steps:25});
 expect(await page.evaluate(()=>window.seekWrites.length)).toBe(0);expect(await page.locator('.mobile-time-row span').first().textContent()).not.toBe('0:00');
 await page.mouse.move(r.x+r.width*.7,r.y-70,{steps:3});await page.mouse.up();await page.waitForTimeout(250);expect(await page.evaluate(()=>window.seekWrites.length)).toBe(1);await slider.blur();expect(await page.evaluate(()=>window.seekWrites.length)).toBe(1);
 await page.goto(base+'/?m=5&sec=33');await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);await expect(page.locator('.lyrics-panel')).toBeVisible({timeout:20000});
 const panel=page.locator('.lyrics-panel');expect(await panel.evaluate(e=>getComputedStyle(e).maxHeight)).toBe('none');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:900});await page.waitForTimeout(150);expect(await panel.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);for(const p of await panel.locator('p').all())expect(await p.evaluate(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1)).toBe(true);await page.screenshot({path:`tmp/player-fixes/lyrics-${width}.png`})}
 await page.goto(base+'/?m=1&sec=1');await expect.poll(()=>page.locator('main').getAttribute('data-score-mode')).toBe('dark');expect(await pill.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(19, 23, 29, 0.92)');await expect(page.locator('.tour-lobby-card')).toHaveCount(0);expect(errors).toEqual([]);
 console.log('PASS light/dark player+mask, auto preload, 25 drag previews=0 seeks, release=1 seek, multiline lyrics320/390/768, tour absent');
}finally{await browser?.close();server?.kill()}
