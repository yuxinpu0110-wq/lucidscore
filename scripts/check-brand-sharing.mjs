import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const remote=process.argv[2],base=remote||'http://127.0.0.1:5321';
const server=remote?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5321','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(()=>localStorage.setItem('lucidscore_prologue_seen','1'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/mahler/symphonie-2?m=1&sec=3&tab=harmony&mode=free&review=1#listening-content');
 await expect(page.locator('main')).toHaveAttribute('data-view-mode','stage');
 await expect(page.getByRole('radio',{name:'和声',exact:true})).toBeChecked();
 await expect(page.locator('.guide-pagination')).toContainText('3 /');
 await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 await expect(page.locator('.work-home')).toContainText('LucidScore');
 expect(await page.locator('footer a').getAttribute('href')).toBe('https://github.com/yuxinpu0110-wq/lucidscore');
 await page.getByRole('button',{name:'下一段',exact:true}).click();await expect.poll(()=>new URL(page.url()).searchParams.get('sec')).toBe('4');
 await page.getByRole('radio',{name:'结构',exact:true}).check();await page.getByRole('radio',{name:'启发探索',exact:true}).check();
 await expect.poll(()=>new URL(page.url()).searchParams.get('tab')).toBe('structure');await expect.poll(()=>new URL(page.url()).searchParams.get('mode')).toBe('guided');
 await page.getByRole('button',{name:'复制此乐段链接',exact:true}).click();await expect(page.locator('.guide-share')).toContainText('链接已复制');
 const copied=await page.evaluate(()=>navigator.clipboard.readText());expect(new URL(copied).searchParams.get('sec')).toBe('4');expect(new URL(copied).searchParams.get('review')).toBe('1');
 const next=await context.newPage();await next.goto(copied);await expect(next.locator('.guide-pagination')).toContainText('4 /');await expect(next.getByRole('radio',{name:'结构',exact:true})).toBeChecked();await expect(next.getByRole('radio',{name:'启发探索',exact:true})).toBeChecked();await expect(next.locator('audio')).toHaveJSProperty('paused',true);await next.reload();await expect(next.locator('.guide-pagination')).toContainText('4 /');await next.close();
 await page.evaluate(()=>{history.pushState({},'','?m=2&sec=2&tab=orchestration&mode=free');window.dispatchEvent(new PopStateEvent('popstate'))});
 await expect(page.locator('main')).toHaveAttribute('data-movement','2');await expect(page.locator('.guide-pagination')).toContainText('2 /');await expect(page.getByRole('radio',{name:'配器',exact:true})).toBeChecked();
 await page.goBack();await expect(page.locator('main')).toHaveAttribute('data-movement','1');await expect(page.locator('.guide-pagination')).toContainText('4 /');
 await page.goto(base+'/?m=5&sec=23&tab=appreciation&mode=free');await expect(page.locator('main')).toHaveAttribute('data-movement','5');await expect(page.locator('.guide-pagination')).toContainText('23 /');
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThan(1305);expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBeLessThan(1307);await expect(page.locator('.guide-body')).toContainText('持续逾二十分钟');await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 await page.locator('.guide-source summary').click();await expect(page.locator('.guide-source')).toContainText('导听阐释');expect(await page.locator('.guide-source').textContent()).not.toMatch(/依据标识|尚未附外部|v2\.0|m5_g/);
 await expect(page.locator('.sync-honesty-label')).toBeVisible();
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(200);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mkdir('tmp/brand-sharing',{recursive:true});await page.screenshot({path:`tmp/brand-sharing/stage-${width}.png`})}
 const fresh=await browser.newPage();await fresh.goto(base+'/?m=2&sec=2&tab=structure');await expect(fresh.locator('.intro-prologue')).toBeVisible();await fresh.getByRole('button',{name:/^跳过序幕(?: →)?$/}).click();await expect(fresh.locator('main')).toHaveAttribute('data-view-mode','stage');await expect(fresh.locator('.guide-pagination')).toContainText('2 /');await fresh.close();
 expect(errors).toEqual([]);await writeFile('tmp/brand-sharing/result.json',JSON.stringify({base,copied,bar472:1305.866667,errors},null,2));console.log('PASS LucidScore brand, URL restore/sync/popstate/copy/reload, first visit, V472 21:45, sources, mobile/desktop');
}finally{await browser?.close();server?.kill()}
