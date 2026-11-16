import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5314','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 await mkdir('tmp/mobile',{recursive:true});await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:width===320?740:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('lucidscore_prologue_seen','1'));await page.goto('http://127.0.0.1:5314');
  if(width<=768){
   const cards=await page.locator('nav button').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,h:b.height}}));expect(cards).toHaveLength(5);for(let i=0;i<5;i++){expect(cards[i].h).toBe(68);if(i)expect(cards[i].y).toBeGreaterThanOrEqual(cards[i-1].y+68)}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`tmp/mobile/lobby-${width}.png`});
  }
  await page.locator('nav button').first().click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);await expect(page.locator('.measure-liquid-lens')).toBeVisible();await page.waitForTimeout(500);
  const dock=await page.locator('.floating-player-dock').boundingBox(),guide=await page.locator('.guide-panel').boundingBox();
  await page.screenshot({path:`tmp/mobile/inspect-${width}.png`});
  if(width<=768){expect(dock.height).toBe(58);expect(guide.y).toBeLessThan(dock.y);expect(await page.locator('.score-follow-pages').evaluate(e=>e.scrollWidth/e.clientWidth)).toBeGreaterThan(1.6);
   await expect(page.locator('.stage-tools').getByRole('switch')).toHaveCount(0);
   expect(await page.locator('.compact-movement-pills').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(60);
   await page.getByRole('button',{name:'审阅与音源',exact:true}).click();await expect(page.locator('.mobile-settings')).toBeVisible();await expect(page.locator('.mobile-settings').getByRole('switch')).toBeVisible();const sheet=await page.locator('dialog').boundingBox();expect(sheet.y).toBeGreaterThan(50);await page.keyboard.press('Escape');
   await page.getByRole('spinbutton',{name:'小节号',exact:true}).fill('4');await page.waitForTimeout(550);expect(await page.locator('.score-follow-pages').evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
   for(const bar of [123,1,4]){
    await page.getByRole('spinbutton').first().fill(String(bar));await page.waitForTimeout(600);
    const height=await page.locator('.score-follow-pages').evaluate(e=>e.getBoundingClientRect().height);expect(height).toBeLessThanOrEqual((width===320?740:900)*.38+1);
    expect(await page.locator('.score-follow-pages').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    const guideTop=await page.locator('.guide-panel').evaluate(e=>e.getBoundingClientRect().top);expect(guideTop).toBeLessThan(dock.y-120);
    await page.screenshot({path:`tmp/mobile/fixed-${width}-bar-${bar}.png`});
   }
   const alignment=await page.locator('.stage-tools .segment-option>span,.guide-depth .segment-option>span').evaluateAll(els=>els.map(e=>{const t=e.getBoundingClientRect(),p=e.closest('fieldset').getBoundingClientRect();return Math.abs(t.y+t.height/2-p.y-p.height/2)}));for(const delta of alignment)expect(delta).toBeLessThan(1.5);
   expect(await page.locator('.score-column').evaluate(e=>getComputedStyle(e).position)).toBe('static');expect(await page.locator('.score-toolbar').evaluate(e=>getComputedStyle(e).position)).toBe('static');
   const initial=await page.locator('.score-column').evaluate(e=>({top:e.getBoundingClientRect().top,y:scrollY}));await page.evaluate(()=>scrollTo(0,350));await page.waitForTimeout(100);
   const moved=await page.locator('.score-column').evaluate(e=>({top:e.getBoundingClientRect().top,y:scrollY}));expect(moved.y-initial.y).toBeGreaterThan(50);expect(Math.abs((initial.top-moved.top)-(moved.y-initial.y))).toBeLessThan(2);
   await page.screenshot({path:`tmp/mobile/scrolled-${width}.png`});await page.evaluate(()=>scrollTo(0,0));
   expect(await page.locator('.timeline').evaluate(e=>getComputedStyle(e).height)).toBe('3.5px');
   expect(await page.locator('.transport .primary').evaluate(e=>getComputedStyle(e).boxShadow)).toBe('none');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }else {expect(await page.locator('.floating-player-dock').evaluate(e=>getComputedStyle(e).position)).not.toBe('fixed');const score=await page.locator('.score-column').boundingBox();expect(guide.x).toBeGreaterThan(score.x+score.width)}
  await page.screenshot({path:`tmp/mobile/stage-${width}.png`});expect(errors).toEqual([]);await page.close();
 }
 console.log('PASS mobile 320/390/768: stacked Lobby, compact header, bottom sheet/dock, same-screen guide/score, pan follow; desktop 1440 retains two columns');
}finally{await browser?.close();server.kill()}
