import {chromium, expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const remote=process.argv[2];
const base=remote||'http://127.0.0.1:5316';
const server=remote?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5316','--strictPort'],{windowsHide:true,stdio:'ignore'});
let browser;
try {
 if(server)await new Promise(r=>setTimeout(r,1000));
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],externalFonts=[],fontResponses=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/fonts\.(googleapis|gstatic)\.com/.test(r.url()))externalFonts.push(r.url())});
 page.on('response',r=>{if(/\.woff2(?:$|\?)/.test(r.url()))fontResponses.push({url:r.url(),status:r.status()})});
 await page.addInitScript(()=>{window.initialHistoryLength=history.length});
 await page.goto(base+'/?review=1#listening-content');
 expect(new URL(page.url()).pathname).toBe('/mahler/symphonie-2');
 expect(new URL(page.url()).search).toBe('?review=1');
 expect(new URL(page.url()).hash).toBe('#listening-content');
 expect(await page.evaluate(()=>history.length===window.initialHistoryLength)).toBe(true);
 await expect(page.locator('.intro-prologue')).toBeVisible();
 const loaded=await page.evaluate(async()=>{
  const result=[];
  for(const weight of [400,600,700]){
   const faces=await document.fonts.load(`${weight} 24px "Noto Serif SC"`,'生死复活马勒第二交响曲');
   result.push({family:'Noto Serif SC',weight,count:faces.length,loaded:faces.every(f=>f.status==='loaded')});
  }
  for(const weight of [400,500,600])for(const style of ['normal','italic']){
   const faces=await document.fonts.load(`${style} ${weight} 24px "Cormorant Garamond"`,'Gustav Mahler');
   result.push({family:'Cormorant Garamond',weight,style,count:faces.length,loaded:faces.every(f=>f.status==='loaded')});
  }
  return result;
 });
 for(const face of loaded){expect(face.count).toBeGreaterThan(0);expect(face.loaded).toBe(true)}
 await page.getByRole('button',{name:/^跳过序幕(?: →)?$/}).click();
 expect(await page.locator('.lobby-hero-section h1').evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Noto Serif SC');
 await page.locator('nav button').first().click();await page.waitForTimeout(900);
 expect(await page.locator('.guide-body').evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Noto Serif SC');
 const shield=await page.locator('main').evaluate(e=>{
  const s=getComputedStyle(e,'::after');return {height:s.height,position:s.position,zIndex:s.zIndex,background:s.backgroundImage,pointerEvents:s.pointerEvents};
 });
 expect(shield.height).toBe('120px');expect(shield.position).toBe('fixed');expect(shield.background).toContain('rgb(8, 9, 12)');expect(shield.pointerEvents).toBe('none');
 const dock=page.locator('.floating-player-dock');expect(Number(await dock.evaluate(e=>getComputedStyle(e).zIndex))).toBeGreaterThan(Number(shield.zIndex));
 await page.evaluate(()=>scrollTo(0,400));await page.waitForTimeout(200);
 await mkdir('tmp/fonts-routes',{recursive:true});await page.screenshot({path:'tmp/fonts-routes/mobile.png'});
 const play=await page.getByRole('button',{name:'播放',exact:true}).boundingBox();
 expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')===document.querySelector('.floating-player-dock .primary'),{x:play.x+play.width/2,y:play.y+play.height/2})).toBe(true);
 await page.goto(base+'/mahler/symphony-2?audio=hls#listening-content');
 expect(new URL(page.url()).pathname).toBe('/mahler/symphonie-2');expect(new URL(page.url()).search).toBe('?audio=hls');
 await page.reload();await expect(page.locator('nav button')).toHaveCount(5);
 await page.goto(base+'/?catalog=1');expect(new URL(page.url()).pathname).toBe('/');
 await page.setViewportSize({width:1440,height:1000});await page.locator('nav button').first().click();await page.waitForTimeout(900);
 expect(await page.locator('main').evaluate(e=>getComputedStyle(e,'::after').content)).toBe('none');
 expect(externalFonts).toEqual([]);expect(fontResponses.length).toBeGreaterThan(0);
 for(const r of fontResponses){expect(new URL(r.url).origin).toBe(new URL(base).origin);expect([200,304]).toContain(r.status)}
 expect(errors).toEqual([]);
 await writeFile('tmp/fonts-routes/result.json',JSON.stringify({base,loaded,fontResponses,shield,externalFonts,errors},null,2));
 console.log('PASS self-hosted fonts (all weights/styles), canonical routes/history/query/hash, first-visit prologue, mobile shield/play control, desktop shield absent');
} finally {await browser?.close();server?.kill()}
