import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const isolated=process.argv.includes('--isolated'),base=isolated?'http://127.0.0.1:5335':(process.env.PREVIEW_URL||'http://127.0.0.1:5340');
const server=isolated?spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5335','--strictPort'],{windowsHide:true,stdio:'ignore'}):null;
if(server)await new Promise(r=>setTimeout(r,1000));
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--renderer-process-limit=1']});
try{
 await mkdir('tmp/theatre',{recursive:true});
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^跳过序幕(?: →)?$/}).click();await expect(page.locator('.prologue-skip')).toBeHidden();await expect(page.locator('.three-choice-gate button')).toHaveCount(3);
 const b=page.locator('.three-choice-gate button').first();expect(await b.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');await page.waitForTimeout(1200);await page.screenshot({path:`tmp/theatre/gate-${width}.png`});
 await page.getByRole('button',{name:/精华导听 · 6 个决定性瞬间/}).click();await expect(page.locator('.theatre-tour')).toBeVisible();await expect(page.locator('.tour-scene-dots button')).toHaveCount(6);await expect(page.locator('.tour-stop')).toHaveCount(0);await expect(page.locator('.voicing-toggle,.voicing-shade')).toHaveCount(0);
 await expect(page.locator('.guide-panel>.guide-body')).toBeVisible();expect((await page.locator('.guide-panel>.guide-body').innerText()).length).toBeGreaterThan(80);await expect(page.locator('.guide-depth')).toBeHidden();await expect(page.locator('.floating-player-dock')).toBeHidden();
 await page.getByRole('button',{name:'展开结构 / 和声 / 配器',exact:true}).click();await expect(page.locator('.guide-depth')).toBeVisible();await expect(page.locator('.guide-panel>.guide-body')).toBeVisible();await page.getByRole('button',{name:'收起深入解析',exact:true}).click();await expect(page.locator('.score-ink').first()).toBeVisible({timeout:20000});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);await page.screenshot({path:`tmp/theatre/stage-${width}.png`});
 if(await page.getByRole('button',{name:'暂停精华导听',exact:true}).count())await page.getByRole('button',{name:'暂停精华导听',exact:true}).click();
 const range=page.getByRole('slider',{name:'当前片段进度',exact:true}),rect=await range.boundingBox(),before=await page.locator('audio').evaluate(a=>a.currentTime);
 const track=range.locator('.morphing-track'), times=range.locator('.morphing-times'), idle=await times.boundingBox();
 await expect(page.locator('.tour-play svg')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(track).toHaveCSS('height','4px');
 await page.mouse.move(rect.x+4,rect.y+16);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.55,rect.y+16,{steps:15});
 await expect(track).toHaveCSS('height','10px');
 await expect(range).toHaveCSS('outline-style','none');
 expect(await times.boundingBox()).toEqual(idle);
 expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBe(before);
 await page.mouse.up();await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThan(20);
 await page.getByRole('button',{name:'导览第2站：乌云裂开的阳光',exact:true}).click();
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThan(185);
 await expect(range).toHaveAttribute('aria-valuemin','0');
 await range.press('Home');
 expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(185.6);
 expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBeLessThan(187);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'留在此乐章完整听',exact:true}).click();await expect(page.locator('.floating-player-dock')).toBeVisible();expect(errors).toEqual([]);await page.close();
 }console.log('PASS theatre gate without skip/boxes, six small nodes, default appreciation, expanded analysis, no focus, mobile/desktop and exit');
}finally{await browser.close();server?.kill()}
