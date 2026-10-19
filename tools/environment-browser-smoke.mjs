import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {testServer} from './server-smoke.mjs';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const prod=await testServer({APP_ENV:'prod'});let dev,browser;
try {
 dev=await testServer({APP_ENV:'dev'});
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const context=await browser.newContext();const page=await context.newPage();
 for(const server of [prod,dev])for(const path of ['/','/teacher/']) {
  const environmentResponse=page.waitForResponse(r=>r.url().endsWith('/api/environment'));
  await page.goto(server.base+path);await environmentResponse;
  await page.waitForLoadState('networkidle');
  const banner=page.locator('.environment-banner');
  if(server===dev){await banner.waitFor({state:'visible'});assert.match(await banner.innerText(),/Тестовая версия/);assert.match(await page.title(),/^\[DEV\]/);}
  else {assert.equal(await banner.isVisible(),false);assert.ok(!(await page.title()).startsWith('[DEV]'));}
 }
 await page.goto(dev.base);await page.locator('.environment-banner').waitFor({state:'visible'});
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:850});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 console.log('PASS: dev label on game and teacher pages, prod stays unlabelled, mobile banner fits');
}finally{if(browser)await browser.close();if(dev)await dev.close();await prod.close();}
