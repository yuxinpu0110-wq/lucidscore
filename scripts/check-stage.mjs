import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const maps=JSON.parse(await readFile('content/real/work-measure-sync.json','utf8')).movements;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5199','--strictPort'],{stdio:'ignore',windowsHide:true});let browser;
try{
 await mkdir('tmp/v2',{recursive:true});await new Promise(r=>setTimeout(r,1000));browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5199');await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 await expect(page.locator('.verified-comparisons,.range')).toHaveCount(0);await expect(page.getByRole('button',{name:'保存当前位置（本地）',exact:true})).toHaveCount(0);
 const main=page.locator('main'),audio=page.locator('audio'),home=page.getByRole('button',{name:'展开作品导览'}),review=page.getByRole('button',{name:'审阅与音源',exact:false});
 await expect(main).toHaveAttribute('data-view-mode','lobby');await expect(page.locator('.stage-scene')).not.toBeVisible();await expect(page.locator('.stage-tools')).not.toBeVisible();await expect(page.locator('nav button').first()).toHaveAttribute('aria-pressed','true');await expect(page.locator('h1')).toHaveText('第二交响曲「复活」');
 await expect(page.locator('.work-seal')).toHaveCount(0);await expect(page.getByLabel('内容库',{exact:true})).not.toBeVisible();
 const forbidden=['一部作品，无数次发现','在声音里，寻找线索。','从正在聆听的这一刻','LISTEN CLOSER / 随时探索','听见了什么？','附近谱面','在这一段，听什么'];
 const visible=await page.locator('body').innerText();for(const text of forbidden)expect(visible).not.toContain(text);
 await page.screenshot({path:'tmp/v2/lobby-verified.png'});
 await page.evaluate(()=>window.__originalAudio=document.querySelector('audio'));
 const frameGeometry=()=>page.evaluate(()=>{const left=document.querySelector('.score-toolbar').getBoundingClientRect(),right=document.querySelector('.guide-header-bar').getBoundingClientRect();return {left:{y:left.y,h:left.height},right:{y:right.y,h:right.height},overflow:document.documentElement.scrollWidth>innerWidth}});
 for(const movement of [1,2,3,4,5]){
  await page.locator('nav button').nth(movement-1).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
  await expect(main).toHaveAttribute('data-view-mode','stage');await expect(page.locator('.stage-movement-title')).toBeVisible();
  expect((await page.locator('.lobby-hero-section').boundingBox()).height).toBe(0);
  const layout=await frameGeometry();expect(layout.overflow).toBe(false);expect(layout.left.y).toBeLessThan(400);expect(layout.left.h).toBe(40);expect(layout.right.h).toBe(40);expect(Math.abs(layout.left.y-layout.right.y)).toBeLessThan(1);
  await expect(page.locator('.current-score .score-viewport [role=img]').first()).toBeVisible();await expect(audio).toHaveJSProperty('paused',true);
  await expect(page.getByRole('radio',{name:'自由检索',exact:true})).toHaveCount(1);await expect(page.getByLabel('录音版本',{exact:true})).toHaveCount(1);
  const anchorColors=await page.locator('nav small').evaluateAll(els=>els.map(el=>getComputedStyle(el).color));expect(new Set(anchorColors).size).toBe(1);
  expect(await page.evaluate(()=>document.querySelector('audio')===window.__originalAudio)).toBe(true);
 }
 // Play enters Stage, and returning to Lobby never restarts the audio element.
 await home.click();await expect(main).toHaveAttribute('data-view-mode','lobby');await page.getByRole('button',{name:'开始聆听',exact:true}).click();await expect(main).toHaveAttribute('data-view-mode','stage');
 await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeGreaterThan(.1);const before=await audio.evaluate(a=>a.currentTime),src=await audio.getAttribute('src');
 await home.click();await expect(main).toHaveAttribute('data-view-mode','lobby');await expect(audio).toHaveJSProperty('paused',false);await expect(audio).toHaveAttribute('src',src);expect(await audio.evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(before);
 await page.mouse.wheel(0,180);await expect(main).toHaveAttribute('data-view-mode','stage');await page.getByRole('button',{name:'暂停并探索'}).click();await expect(main).toHaveAttribute('data-view-mode','stage');
 // Drawer is keyboard-operable, restores focus, and never pauses playback.
 await page.getByRole('button',{name:'播放',exact:true}).click();await review.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('内容库',{exact:true})).toBeVisible();await expect(page.locator('.review-drawer .notice')).toContainText('102 段');await expect(audio).toHaveJSProperty('paused',false);
 await page.screenshot({path:'tmp/v2/review-verified.png'});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(review).toBeFocused();await page.getByRole('button',{name:'暂停并探索'}).click();
 await page.locator('nav button').nth(0).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 await page.getByLabel('小节号',{exact:true}).fill('13');await expect(page.getByRole('button',{name:'回到当前小节'})).toBeVisible();await page.getByRole('button',{name:'回到当前小节'}).click();await expect(page.getByRole('button',{name:'回到当前小节'})).toHaveCount(0);
 await page.getByLabel('谱面同步说明',{exact:true}).click();await expect(page.locator('.score-info-panel')).toBeVisible();await expect(page.locator('.score-info-panel')).toContainText('估计');await page.getByLabel('谱面同步说明',{exact:true}).click();
 await page.getByLabel('小节号',{exact:true}).fill('1');await page.getByRole('button',{name:'下一段',exact:true}).click();await expect(page.locator('.guide-heading')).toContainText('窒息的停顿');await expect(audio).toHaveJSProperty('paused',true);
 await page.locator('.guide-range').click();await expect.poll(()=>audio.evaluate(a=>a.currentTime)).toBeGreaterThan(maps[0].tracks[0].intervals[5].start);await expect(audio).toHaveJSProperty('paused',false);
 await page.getByRole('button',{name:'暂停并探索'}).click();
 await page.getByRole('radio',{name:'启发探索',exact:true}).check();await page.getByRole('button',{name:'播放',exact:true}).click();await expect(page.locator('.guide-depth')).toBeHidden();await expect(page.locator('.focus-clue-button')).toBeVisible();
 await page.mouse.move(0,0);expect(await page.locator('.transport .primary').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
 await page.screenshot({path:'tmp/v2/guided-verified.png'});await page.locator('.focus-clue-button').click();await expect(audio).toHaveJSProperty('paused',true);await expect(page.locator('.guide-depth')).toBeVisible();
 await page.getByRole('radio',{name:'自由检索',exact:true}).check();
 // Actual playback position updates must not pull the reader back to the top.
 await page.evaluate(()=>scrollTo(0,450));const scroll=await page.evaluate(()=>scrollY);await audio.evaluate(a=>{a.currentTime+=.1;a.dispatchEvent(new Event('timeupdate'))});expect(await page.evaluate(()=>scrollY)).toBeCloseTo(scroll,0);
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await page.locator('.score-toolbar').boundingBox()).height).toBe(40);expect((await page.locator('.current-score').boundingBox()).y).toBeLessThan(500);
  await page.screenshot({path:`tmp/v2/stage-${width}-verified.png`});
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('nav button').nth(4).click();await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
 const fifth=maps.find(m=>m.movement===5);for(const bar of [472,762]){await audio.evaluate((a,t)=>{a.currentTime=t;a.dispatchEvent(new Event('timeupdate'))},fifth.tracks[0].intervals[bar-1].start+.01);await expect.poll(()=>page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--dawn-progress')))).toBe(bar===472?0:1)}
 await page.screenshot({path:'tmp/v2/dawn-verified.png'});
 // All four delayed-metadata links must seek after the correct source loads.
 for(const movement of [1,2,4,5]){
  const isolated=await browser.newPage({reducedMotion:'reduce'});let release;const hold=new Promise(r=>release=r);
  await isolated.route(`**/audio/movement-${movement}-web.m4a`,async route=>{await hold;await route.continue()});
  await isolated.goto('http://127.0.0.1:5199');await isolated.locator('nav button').nth(movement-1).click();const panel=isolated.locator('.guide-panel');await panel.locator('.guide-index summary').click();await panel.locator('.guide-index button').nth(1).click();await panel.getByRole('radio',{name:'结构',exact:true}).check();
  const link=panel.locator('.guide-body a').first(),from=Number(await link.getAttribute('data-bar-from'));await link.click();await expect(isolated.getByRole('alert')).toContainText('正在载入录音');release();
  await isolated.waitForFunction(()=>document.querySelector('audio').readyState>=1);const d=maps.find(d=>d.movement===movement);await expect.poll(()=>isolated.locator('audio').evaluate(a=>a.currentTime)).toBeCloseTo(d.tracks[0].intervals[from-1].start,2);await expect(isolated.locator('audio')).toHaveJSProperty('paused',true);await isolated.close();
 }
 expect(errors).toEqual([]);console.log('PASS v2 Lobby/Stage, selection/play/scroll triggers, first-screen aligned tools, single source across views, review drawer/focus, no slogans, follow/replay, guided pause, no timeline autoscroll, 320/390px, dawn and four deferred bar links');
}finally{await browser?.close();server.kill()}
