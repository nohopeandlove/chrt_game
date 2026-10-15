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
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await page.locator('.vision-dialog [name=size]').selectOption('26');
 await page.locator('.vision-dialog [name=font]').selectOption('serif');
 await page.locator('.vision-dialog [name=spacing]').selectOption('wide');
 await page.locator('.vision-dialog [name=lines]').selectOption('wide');
 for(const palette of ['light','dark','yellow','default']) {
  await page.locator('.vision-dialog [name=palette]').selectOption(palette);
  for(const width of [320,390,1280]) {
   await page.setViewportSize({width,height:850});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${palette}/${width}`);
   if(palette!=='default') {
    const colors=await page.locator('.vision-dialog').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color}));
    assert.equal(colors.bg,palette==='light'?'rgb(255, 255, 255)':'rgb(0, 0, 0)');
    assert.equal(colors.fg,palette==='light'?'rgb(0, 0, 0)':palette==='dark'?'rgb(255, 255, 255)':'rgb(255, 235, 59)');
   }
  }
 }
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.reload();assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),'26px');
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 assert.equal(await page.locator('.vision-dialog [name=font]').inputValue(),'serif');
 await page.locator('.vision-dialog [data-reset]').click();assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),'18px');await page.keyboard.press('Escape');
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
 console.log('PASS: accessibility sizes/fonts/spacing/four palettes, persistence, reset, mobile fit and keyboard focus; teacher-only materials, traversal protection, private pages unavailable after logout, no deployment pages or student technical links');
}finally{if(browser)await browser.close();await server.close();}
