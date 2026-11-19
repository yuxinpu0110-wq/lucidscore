import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const base='http://127.0.0.1:5338',stops=JSON.parse(await readFile('content/real/curated-tours.json','utf8')).curatedTours[0].stops;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5338','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 await new Promise(r=>setTimeout(r,1000));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^跳过序幕(?: →)?$/}).click();await expect(page.locator('.three-choice-gate button')).toHaveCount(3);await page.waitForTimeout(1200);await mkdir('tmp/highlights',{recursive:true});await page.screenshot({path:'tmp/highlights/gate.png'});
 await page.getByRole('button',{name:/自由检索 · 总谱全集/}).click();await expect(page.locator('.intro-prologue')).toHaveCount(0);await expect(page.locator('.sync-honesty-label')).toHaveCount(0);await expect(page.locator('.guide-share')).toHaveCount(0);await expect(page.locator('.guide-pagination button[title="复制此乐段链接"]')).toHaveCount(1);
 await page.getByRole('button',{name:'审阅与音源',exact:true}).click();await page.getByRole('button',{name:'进入精华导听',exact:true}).click();
 for(const s of stops){
  await expect.poll(()=>new URL(page.url()).searchParams.get('step'),{timeout:20000}).toBe(String(s.step));
  await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThanOrEqual(s.clipStart-.01);
  if(await page.locator('audio').evaluate(a=>a.paused))await page.getByRole('button',{name:'播放精华导听',exact:true}).click();
  await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThan(s.clipStart+.15);
  await expect(page.locator('.movement-nav')).toHaveCount(0);await expect(page.locator('.measure-liquid-lens')).toBeVisible();await expect(page.locator('.guide-depth')).toBeHidden();
  if(s.step===1){await expect(page.locator('.voicing-toggle,.voicing-shade')).toHaveCount(0);await page.getByRole('button',{name:'展开结构 / 和声 / 配器',exact:true}).click();await expect(page.locator('.guide-depth')).toBeVisible();await page.getByRole('button',{name:'收起深入解析',exact:true}).click();await page.screenshot({path:'tmp/highlights/stage.png'})}
  expect(await page.locator('.tour-bar').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(52);
  await page.locator('audio').evaluate((a,t)=>a.currentTime=t,s.clipEnd-.1);
 }
 await expect(page.locator('.tour-finish')).toBeVisible({timeout:15000});await page.getByRole('button',{name:'自由探索五乐章',exact:true}).click();await expect(page.locator('.tour-bar')).toHaveCount(0);
 await page.goto(base+'/?tour=highlights&step=3',{waitUntil:'domcontentloaded'});await expect.poll(()=>page.locator('main').getAttribute('data-movement'),{timeout:25000}).toBe('2');await expect(page.locator('.intro-prologue')).toHaveCount(0);await page.getByRole('button',{name:'留在此乐章完整听',exact:true}).click();expect(new URL(page.url()).searchParams.has('tour')).toBe(false);await expect(page.locator('.movement-nav')).toBeVisible();expect(errors).toEqual([]);console.log('PASS local three-way Gate, menu, six exact-range scenes, score/lens/focus, collapsible analysis, end/resume, URL and no tour nav clutter');
}finally{await browser?.close();server.kill()}
