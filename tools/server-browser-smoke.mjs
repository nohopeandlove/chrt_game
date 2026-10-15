import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { testServer } from './server-smoke.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server=await testServer();let browser;
try {
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const studentContext=await browser.newContext();const teacherContext=await browser.newContext({acceptDownloads:true});const student=await studentContext.newPage();const teacher=await teacherContext.newPage();const errors=[];
 for(const p of [student,teacher])p.on('pageerror',e=>errors.push(e.message));
 await teacher.goto(server.base+'/teacher/',{waitUntil:'domcontentloaded'});
 await teacher.locator('[name=code]').fill((await readFile(join(server.data,'setup-code'),'utf8')).trim());
 await teacher.locator('[name=username]').fill('teacher-test');await teacher.locator('[name=password]').fill('Only-for-tests-2026');
 await teacher.getByRole('button',{name:'Создать учётную запись',exact:true}).click();await teacher.getByRole('heading',{name:'Результаты студентов',exact:true}).waitFor();
 await student.goto(server.base,{waitUntil:'domcontentloaded'});await student.locator('[name=playerName]').fill('Ученик 01');await student.locator('[name=group]').fill('ИС-21');await student.getByRole('button',{name:'Начать',exact:true}).click();
 await student.getByRole('button',{name:'Перейти к истории',exact:true}).click();await student.getByRole('button',{name:'Кабинет и результаты',exact:true}).click();
 await student.locator('[data-sync-status]').filter({hasText:'Результаты сохранены на сервере'}).waitFor();
 assert.equal(await student.locator('input[type=file]').count(),0);assert.equal(await student.getByRole('button',{name:/Скачать|Импорт|Экспорт|Отчёт для преподавателя/}).count(),0);
 await teacher.getByRole('button',{name:'Обновить сейчас',exact:true}).click();await teacher.locator('.report-table tbody').getByText('Ученик 01',{exact:true}).waitFor();
 // Continue at the existing chapter-4 checkpoint; complete the real bundled task UI.
 await student.keyboard.press('Escape');await student.evaluate(()=>{const key='ya-specialist/save/v1';const s=JSON.parse(localStorage.getItem(key));s.scene='test';s.specialty='dev';localStorage.setItem(key,JSON.stringify(s));});
 await student.reload({waitUntil:'domcontentloaded'});await student.getByRole('button',{name:'Продолжить',exact:true}).click();await student.getByRole('button',{name:'Перейти к заданию',exact:true}).click();
 for(let i=0;i<4;i++){await student.locator('[data-answer="0"]').click();await student.locator('[data-next]:visible').click();}
 await student.getByRole('button',{name:'Кабинет и результаты',exact:true}).click();await student.locator('[data-sync-status]').filter({hasText:'Результаты сохранены на сервере'}).waitFor();
 await teacher.getByRole('button',{name:'Обновить сейчас',exact:true}).click();await teacher.locator('.report-table tbody').getByText('100%',{exact:true}).waitFor();
 await teacher.getByRole('button',{name:'Открыть',exact:true}).click();await teacher.getByRole('heading',{name:'Ученик 01 · ИС-21',exact:true}).waitFor();
 // A failed request leaves an outbox, retried automatically after reconnect and reload.
 await student.getByText('ФИО / учебный код и группа',{exact:true}).click();await studentContext.setOffline(true);await student.locator('[name=group]').fill('ИС-22');await student.getByRole('button',{name:'Сохранить данные',exact:true}).click();
 await student.locator('[data-sync-status]').filter({hasText:'Нет связи'}).waitFor();
 assert.ok(await student.evaluate(()=>JSON.parse(localStorage.getItem('ya-specialist/pending-reports')).length>0));
 await studentContext.setOffline(false);await student.reload({waitUntil:'domcontentloaded'});
 // Opening the game alone retries pending results; no manual upload or continue needed.
 await teacher.locator('[name=group]').fill('ИС-22');await teacher.getByRole('button',{name:'Найти',exact:true}).click();
 await teacher.locator('.report-table tbody').getByText('ИС-22',{exact:true}).waitFor({timeout:20000});
 const dlPromise=teacher.waitForEvent('download');await teacher.getByRole('link',{name:'Скачать CSV для Excel',exact:true}).click();const dl=await dlPromise;const csv=await readFile(await dl.path(),'utf8');assert.ok(csv.includes('Ученик 01'));assert.ok(csv.includes('ИС-22'));
 await server.restart();await teacher.getByRole('button',{name:'Обновить сейчас',exact:true}).click();await teacher.locator('.report-table tbody').getByText('Ученик 01',{exact:true}).waitFor();
 // Another browser cannot read the teacher results or download CSV without signing in.
 const outsider=await browser.newContext();const unauthorized=await outsider.newPage();await unauthorized.goto(server.base+'/teacher/',{waitUntil:'domcontentloaded'});await unauthorized.getByRole('button',{name:'Войти',exact:true}).waitFor();assert.equal(await unauthorized.locator('.report-table').count(),0);
 await teacher.getByRole('button',{name:'Выйти',exact:true}).click();await teacher.getByRole('button',{name:'Войти',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: production teacher setup/login, real student-to-teacher automatic results, 100% task score, no student files, offline outbox retry after reload, CSV, persistent restart and isolated teacher access');
} finally {if(browser)await browser.close();await server.close();}
