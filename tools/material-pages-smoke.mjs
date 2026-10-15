import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { testServer } from './server-smoke.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server=await testServer();let browser;
try {
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const page=await browser.newPage();
 // Protected on direct requests as well as through navigation, including encoded traversal.
 for(const path of ['/materials/methodical/','/materials/criteria/index.html','/materials/analytics/','/x/..%2fmaterials/methodical/index.html']) {
  const response=await fetch(server.base+path,{redirect:'manual'});assert.equal(response.status,302,path);assert.equal(response.headers.get('location'),'/teacher/');
 }
 for(const slug of ['hosting','deploy','start'])assert.equal((await fetch(`${server.base}/materials/${slug}/`)).status,404);
 await page.goto(server.base);
 const aboutLink=page.locator('.menu__footer a');
 assert.equal(await aboutLink.innerText(),'Об электронном образовательном ресурсе');
 assert.equal(await aboutLink.getAttribute('href'),'/about/');
 await page.locator('[name=playerName]').fill('Не потерять ввод');
 const popupPromise=page.waitForEvent('popup');await aboutLink.click();const about=await popupPromise;
 await about.waitForLoadState();
 assert.equal(await about.locator('h1').innerText(),'Об электронном образовательном ресурсе');
 assert.equal(await about.getByRole('heading',{name:'Методические указания',exact:true}).count(),1);
 assert.equal(await about.getByRole('heading',{name:'Соответствие конкурсным критериям',exact:true}).count(),1);
 assert.equal(await about.locator('table').last().locator('tbody tr').count(),7);
 assert.equal(await about.locator('a[href^="/materials/"]').count(),0);
 assert.doesNotMatch(await about.locator('article').innerText(),/Docker|GitHub|npm |SQLite|TEACHER_SETUP_CODE|TypeScript/);
 for(const width of [320,390,1280]) {
  await about.setViewportSize({width,height:850});
  assert.ok(await about.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`about/${width}`);
 }
 await about.close();assert.equal(await page.locator('[name=playerName]').inputValue(),'Не потерять ввод');
 assert.equal((await fetch(server.base+'/about',{redirect:'manual'})).status,302);
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator('[name=playerName]').fill('Настройки не блокируют игру');
 for(const mode of ['gray','hidden','color']) {
  await page.locator(`[data-vision-key=images][data-value=${mode}]`).click();
  assert.equal(await page.locator('html').getAttribute('data-vision-images'),mode);
  const style=await page.locator('.stage__bg').evaluate(e=>({visibility:getComputedStyle(e).visibility,filter:getComputedStyle(e).filter}));
  if(mode==='hidden')assert.equal(style.visibility,'hidden');
  if(mode==='gray')assert.equal(style.filter,'grayscale(1)');
 }
 await page.locator('.vision-panel [name=size]').evaluate(e=>{e.value='200';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('[data-vision-key=font][data-value=serif]').click();
 await page.locator('[data-vision-key=spacing][data-value=wide]').click();
 await page.locator('[data-vision-key=lines][data-value=wide]').click();
 for(const palette of ['light','dark','yellow','blue','cream','default']) {
  await page.locator(`[data-vision-key=palette][data-value=${palette}]`).click();
  for(const width of [320,390,1280]) {
   await page.setViewportSize({width,height:850});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${palette}/${width}`);
   if(palette!=='default') {
    const colors=await page.locator('.learning-tools').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color}));
    assert.equal(colors.bg,palette==='light'?'rgb(255, 255, 255)':palette==='blue'?'rgb(204, 232, 255)':palette==='cream'?'rgb(255, 240, 201)':'rgb(0, 0, 0)');
    assert.equal(colors.fg,palette==='light'?'rgb(0, 0, 0)':palette==='dark'?'rgb(255, 255, 255)':palette==='blue'?'rgb(6, 52, 94)':palette==='cream'?'rgb(59, 41, 20)':'rgb(255, 235, 59)');
   }
  }
 }
 await page.locator('[data-collapse]').click();
 assert.equal(await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.reload();assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),'36px');
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 assert.equal(await page.locator('[data-vision-key=font][data-value=serif]').getAttribute('aria-pressed'),'true');
 await page.locator('.vision-panel [data-reset]').click();assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),'18px');await page.locator('[data-collapse]').click();
 await page.locator('[name=playerName]').fill('Тест');await page.getByRole('button',{name:'Начать',exact:true}).click();
 assert.equal(await page.locator('a[href^="/materials/"]').count(),0);
 assert.doesNotMatch(await page.locator('.learning-intro').innerText(),/Docker|GitHub|TEACHER_SETUP_CODE|npm |SQLite/);
 // An actual browser login must grant access to HTML (cookie Path=/).
 await page.goto(server.base+'/teacher/');
 await page.locator('[name=code]').fill((await readFile(join(server.data,'setup-code'),'utf8')).trim());
 await page.locator('[name=username]').fill('test-teacher');await page.locator('[name=password]').fill('Test-only-password-2026');await page.getByRole('button',{name:'Создать учётную запись'}).click();
 await page.getByRole('heading',{name:'Результаты студентов',exact:true}).waitFor();
 for(const slug of ['methodical','criteria','analytics']) {
  assert.equal((await page.goto(`${server.base}/materials/${slug}/`)).status(),200);
  assert.equal(await page.locator('h1').count(),1);
  const links=await page.locator('a[href^="/materials/"]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
  assert.ok(links.every(link=>/\/(methodical|criteria|analytics)\/$/.test(link)));
 }
 await page.goto(server.base+'/teacher/');await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.getByRole('heading',{name:'Вход преподавателя'}).waitFor();
 await page.goto(server.base+'/materials/methodical/');assert.ok(page.url().endsWith('/teacher/'));
 console.log('PASS: accessibility sizes/fonts/spacing/six palettes, persistence, reset, mobile fit and keyboard focus; teacher-only materials, traversal protection, private pages unavailable after logout, no deployment pages or student technical links');
}finally{if(browser)await browser.close();await server.close();}
