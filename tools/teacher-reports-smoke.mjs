import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {testServer} from './server-smoke.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await testServer();let browser;
try {
 const call=(path,method='GET',body,headers={})=>fetch(server.base+path,{method,headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const credentials={username:'teacher-test',password:'Only-for-tests-2026'};
 const code=(await readFile(join(server.data,'setup-code'),'utf8')).trim();
 assert.equal((await call('/api/teacher/setup','POST',{code,...credentials})).status,201);
 const login=await call('/api/teacher/login','POST',credentials);const cookie=login.headers.get('set-cookie').split(';')[0];
 const auth={Cookie:cookie};
 const makeReport=name=>({format:'ya-specialist-report-v2',generatedAt:new Date().toISOString(),diagnostics:{baseline:1,final:null,finalForm:'transfer-v2'},analytics:{sessionId:'local-key',startedAt:new Date().toISOString(),finishedAt:null,fullName:name,group:'ТЕСТ',events:[],outcomes:[]}});
 async function seed(name){const session=await(await call('/api/student/session','POST',{})).json();const report=makeReport(name);assert.equal((await call(`/api/student/reports/${session.id}`,'PUT',{report,revision:1},{Authorization:`Bearer ${session.token}`})).status,200);return {...session,report};}
 const first=await seed('Студент А');const second=await seed('Студент Б');
 const reportPath=`/api/teacher/reports/${first.id}`;
 assert.equal((await call(reportPath,'DELETE')).status,401);
 assert.equal((await call(reportPath,'DELETE',undefined,{Authorization:`Bearer ${first.token}`})).status,401);
 assert.equal((await call(reportPath,'DELETE',undefined,{...auth,Origin:'https://outsider.example'})).status,403);
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const context=await browser.newContext();await context.addCookies([{name:'teacher_session',value:cookie.slice(cookie.indexOf('=')+1),url:server.base}]);
 const page=await context.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.base+'/teacher/');await page.locator('[data-report]').first().waitFor();
 const toggle=id=>page.locator(`[data-report="${id}"]`);const detail=id=>page.locator(`#report-${id}`);
 await toggle(first.id).click();await detail(first.id).getByRole('heading',{name:'Студент А · ТЕСТ',exact:true}).waitFor();
 assert.equal(await toggle(first.id).getAttribute('aria-expanded'),'true');
 assert.equal(await detail(first.id).evaluate(el=>el.previousElementSibling.querySelector('[data-report]').dataset.report),first.id);
 await toggle(second.id).click();await detail(second.id).getByRole('heading',{name:'Студент Б · ТЕСТ',exact:true}).waitFor();assert.equal(await detail(first.id).isVisible(),true);
 await Promise.all([page.waitForResponse(r=>r.url().includes('/api/teacher/reports?')),page.getByRole('button',{name:'Обновить сейчас',exact:true}).click()]);
 assert.equal(await detail(first.id).isVisible(),true);assert.equal(await detail(second.id).isVisible(),true);
 // Changed server data also retains expanded rows and updates the report in place.
 second.report.analytics.group='НОВАЯ';assert.equal((await call(`/api/student/reports/${second.id}`,'PUT',{report:second.report,revision:2},{Authorization:`Bearer ${second.token}`})).status,200);
 await page.getByRole('button',{name:'Обновить сейчас',exact:true}).click();await detail(second.id).getByRole('heading',{name:'Студент Б · НОВАЯ',exact:true}).waitFor();assert.equal(await detail(first.id).isVisible(),true);
 await toggle(first.id).click();assert.equal(await detail(first.id).isVisible(),false);await detail(second.id).locator('[data-collapse]').click();assert.equal(await detail(second.id).isVisible(),false);
 await page.locator(`[data-delete="${first.id}"]`).click();await page.locator(`[data-cancel-delete="${first.id}"]`).click();assert.equal((await call(reportPath,'GET',undefined,auth)).status,200);
 // A server failure keeps the report and lets the teacher retry.
 await page.route('**/api/teacher/reports/'+first.id,async route=>route.request().method()==='DELETE'?route.fulfill({status:500,contentType:'application/json',body:'{"error":"Тестовая ошибка удаления"}'}):route.continue());
 await page.locator(`[data-delete="${first.id}"]`).click();await page.locator(`[data-confirm-delete="${first.id}"]`).click();await page.getByRole('status').filter({hasText:'Тестовая ошибка удаления'}).waitFor();assert.equal(await toggle(first.id).count(),1);assert.equal(await page.locator(`[data-confirm-delete="${first.id}"]`).isEnabled(),true);
 await page.unroute('**/api/teacher/reports/'+first.id);await page.locator(`[data-confirm-delete="${first.id}"]`).click();await toggle(first.id).waitFor({state:'detached'});assert.equal(await toggle(second.id).count(),1);
 assert.equal((await call(reportPath,'GET',undefined,auth)).status,404);assert.equal((await call(reportPath,'DELETE',undefined,auth)).status,404);
 assert.ok(!(await(await call('/api/teacher/export.csv','GET',undefined,auth)).text()).includes('Студент А'));
 assert.equal((await call(`/api/student/reports/${first.id}`,'PUT',{report:first.report,revision:2},{Authorization:`Bearer ${first.token}`})).status,410);
 // The student's saved outbox drops a deleted run instead of recreating it.
 const student=await browser.newPage();await student.goto(server.base);await student.evaluate(({first})=>{
  localStorage.setItem('ya-specialist/pending-reports',JSON.stringify([['local-key',first.report]]));
  localStorage.setItem('ya-specialist/server-session/local-key',JSON.stringify({id:first.id,token:first.token,revision:1}));
 },{first});await student.reload();await student.waitForFunction(()=>JSON.parse(localStorage.getItem('ya-specialist/server-session/local-key')).deleted===true);
 assert.deepEqual(await student.evaluate(()=>JSON.parse(localStorage.getItem('ya-specialist/pending-reports'))),[]);
 await student.reload();assert.equal((await(await call('/api/teacher/reports','GET',undefined,auth)).json()).total,1);
 await server.restart();assert.equal((await call(reportPath,'GET',undefined,auth)).status,404);assert.equal((await call(`/api/student/reports/${first.id}`,'PUT',{report:first.report,revision:3},{Authorization:`Bearer ${first.token}`})).status,410);
 // Removing the only item on the last page returns to the previous page.
 for(let i=0;i<50;i++)await seed(`Дополнительный ${i}`);
 await page.getByRole('button',{name:'Обновить сейчас',exact:true}).click();await page.getByRole('button',{name:'Далее',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'Далее',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-report]').length===1);
 const lastId=await page.locator('[data-report]').getAttribute('data-report');await page.locator('[data-delete]').click();await page.locator('[data-confirm-delete]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-report]').length===50);
 assert.equal((await call(`/api/teacher/reports/${lastId}`,'GET',undefined,auth)).status,404);assert.equal(await page.getByRole('button',{name:'Назад',exact:true}).isDisabled(),true);
 await page.setViewportSize({width:390,height:850});await page.locator('[data-report]').first().click();await page.locator('.teacher-report').waitFor();await page.screenshot({path:'/tmp/teacher-inline-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: inline multiple reports and collapse, refresh preserves expansion, delete cancel/error/retry, authorized deletion only, CSV removal, no sync resurrection or outbox retry, persistence and last-page fallback');
}finally{if(browser)await browser.close();await server.close();}
