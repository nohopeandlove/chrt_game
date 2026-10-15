import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { testServer } from './server-smoke.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await testServer();
let browser;
try {
 browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined, args: process.env.BROWSER_NO_SANDBOX === '1' ? ['--no-sandbox'] : [] });
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 for (const slug of ['methodical','criteria','analytics','deploy','hosting','start']) {
  assert.equal((await page.goto(`${server.base}/materials/${slug}/`)).status(),200);
  assert.equal(await page.locator('h1').count(),1);
  assert.ok((await page.locator('article').innerText()).length > 1000);
  const links = await page.locator('a[href^="/"]').evaluateAll(nodes => [...new Set(nodes.map(a=>a.getAttribute('href')))]);
  for (const link of links) assert.equal((await fetch(server.base+link)).status,200,link);
  for (const width of [320, 390, 1280]) {
   await page.setViewportSize({width,height:850});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${slug}: ${width}`);
  }
 }
 await page.goto(server.base);
 await page.locator('[name=playerName]').fill('Тест материалов');
 await page.getByRole('button',{name:'Начать',exact:true}).click();
 await page.getByText('Границы модели и преподавателю',{exact:true}).click();
 const link = page.getByRole('link',{name:'методические указания',exact:true});
 assert.equal(await link.getAttribute('href'),'/materials/methodical/');
 assert.equal(await page.getByRole('link',{name:'описание соответствия критериям'}).getAttribute('href'),'/materials/criteria/');
 const saved = await page.evaluate(()=>localStorage.getItem('ya-specialist/save/v1'));
 const popupPromise=page.waitForEvent('popup'); await link.click(); const popup=await popupPromise;
 await popup.waitForLoadState(); assert.equal(await popup.locator('h1').innerText(),'Методическое сопровождение «Я — специалист»');
 assert.equal(await page.evaluate(()=>localStorage.getItem('ya-specialist/save/v1')),saved);
 assert.deepEqual(errors,[]);
 console.log('PASS: production pages, full content, internal links, 320/390/1280px layouts and in-game link opens materials without changing saved progress');
} finally { if(browser) await browser.close(); await server.close(); }
