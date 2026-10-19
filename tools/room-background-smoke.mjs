import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {testServer} from './server-smoke.mjs';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await testServer({APP_ENV:'dev'});let browser;
try {
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.base);assert.equal(await page.locator('.bg--assembly-hall').count(),1);
 await page.locator('[name=playerName]').fill('Тест выпускного');await page.getByRole('button',{name:'Начать',exact:true}).click();
 await page.getByRole('button',{name:'Перейти к истории',exact:true}).click();
 const art=page.locator('.bg--crt-campus image');await art.waitFor({state:'visible'});
 const url=await art.getAttribute('href');assert.ok(url.endsWith('.webp'));
 const response=await fetch(new URL(url,server.base));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');
 const dimensions=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight}},url);
 assert.ok(dimensions.width>=1600 && dimensions.height>=900);

 const motion=page.locator('.campus-confetti').first();
 assert.notEqual(await motion.evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.locator('[data-setting=still]').click();
 assert.equal(await motion.evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.locator('[data-setting=still]').click();
 await page.evaluate(()=>{const key='ya-specialist/save/v1';const state=JSON.parse(localStorage.getItem(key));state.scene='portfolio';state.nodeIndex=0;localStorage.setItem(key,JSON.stringify(state));});
 await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 const room=page.locator('.bg--hero-room image');await room.waitFor({state:'visible'});
 const roomUrl=await room.getAttribute('href');const roomResponse=await fetch(new URL(roomUrl,server.base));assert.equal(roomResponse.status,200);assert.equal(roomResponse.headers.get('content-type'),'image/webp');
 const star=page.locator('.room-star').first();assert.notEqual(await star.evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.ok(await star.evaluate(e=>e.getAnimations().some(a=>a.playState==='running')));
 await page.locator('.panel').click();await page.screenshot({path:'/tmp/hero-room-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/hero-room-mobile.png'});
 await page.locator('[data-setting=still]').click();
 assert.ok(await page.locator('.scene-motion').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
 await page.locator('[data-setting=still]').click();await page.emulateMedia({reducedMotion:'reduce'});
 assert.ok(await page.locator('.scene-motion').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
 await page.emulateMedia({reducedMotion:'no-preference'});
 for (const scene of ['jobs','test','interview','labor','first-day']) {
  await page.evaluate(scene=>{const key='ya-specialist/save/v1';const state=JSON.parse(localStorage.getItem(key));state.scene=scene;state.nodeIndex=0;localStorage.setItem(key,JSON.stringify(state));},scene);
  await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  const background=scene==='first-day'?'.bg--open-office':scene==='labor'?'.bg--hr-office':'.bg--laptop';
  const laptop=page.locator(`${background} image`);await laptop.waitFor({state:'visible'});
  const src=await laptop.getAttribute('href');const response=await fetch(new URL(src,server.base));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');
  await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();if(image.naturalWidth<1600)throw Error('Laptop illustration too small');},src);
  assert.ok(await page.locator(`${background} .scene-motion`).evaluateAll(es=>es.length>=4 && es.every(e=>e.getAnimations().some(a=>a.playState==='running'))));
  await page.locator('[data-setting=still]').click();
  assert.ok(await page.locator(`${background} .scene-motion`).evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
  await page.locator('[data-setting=still]').click();await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.locator(`${background} .scene-motion`).evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(scene==='first-day') {
   await page.screenshot({path:'/tmp/open-office-mobile.png'});
   await page.setViewportSize({width:1440,height:900});
   await page.screenshot({path:'/tmp/open-office-desktop.png'});
  }
  if(scene==='labor') {
   await page.screenshot({path:'/tmp/hr-office-desktop.png'});
   await page.setViewportSize({width:390,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.waitForFunction(()=>document.querySelector('.stage__portrait').getBoundingClientRect().top>=document.querySelector('.learning-tools').getBoundingClientRect().bottom);
   await page.screenshot({path:'/tmp/hr-office-mobile.png'});
  }
  if(scene==='jobs') {
   await page.screenshot({path:'/tmp/laptop-mobile.png'});
   await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'/tmp/laptop-desktop.png'});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: campus, room, laptop, HR office and team office WebP load in all relevant scenes, scene animations run, manual and system reduced motion disable every effect, mobile fits, no browser errors');
}finally{if(browser)await browser.close();await server.close();}
