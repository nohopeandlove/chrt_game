// Integration checks for real task instrumentation, offline reports and audio controls.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const context=await browser.newContext({acceptDownloads:true});
 await context.addInitScript(()=>{window.oscillators=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.oscillators++;return original.call(this)};});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
 assert.equal(await page.getByRole('button',{name:'Звук: выкл',exact:true}).getAttribute('aria-pressed'),'false');
 await page.getByRole('button',{name:'Звук: выкл',exact:true}).click();await page.waitForFunction(()=>window.oscillators>=3);
 await page.getByRole('button',{name:'Звук: вкл',exact:true}).click();
 console.log('PASS: sound off by default, opt-in produces real oscillator cues, mute available');
 // Exercise the actual specialty test with a mix of correct and incorrect answers.
 await page.evaluate(async()=>{
   const {UI}=await import('/src/ui.ts');const {newGame}=await import('/src/state.ts');const {tests}=await import('/src/content.ts');const {runTest}=await import('/src/screens/test.ts');
   document.querySelector('#app').remove();const root=document.createElement('div');root.id='app';document.body.append(root);
   window.student=newGame('PRIVATE NICKNAME','f');window.student.specialty=tests.sets[0].specialty;
   window.student.analytics.fullName='Иванова Мария';window.student.analytics.group='ИС-21';
   window.student.learning.baseline=1;
   window.testAnswers=tests.sets[0].questions.map((q,i)=>i<2?q.correct:(q.correct+1)%q.options.length);window.ui=new UI(root);window.finished=false;
   void runTest(window.ui,window.student).then(()=>window.finished=true);
 });
 for(const [i,a] of (await page.evaluate(()=>window.testAnswers)).entries()){
  assert.equal(await page.locator('.quiz__verdict').count(),0);
  await page.locator(`[data-answer="${a}"]`).click();
  assert.equal(await page.locator('[data-answer]:enabled').count(),0);
  assert.equal(await page.locator('[data-answer].is-right').count(),1);
  assert.equal(await page.locator('[data-answer].is-wrong').count(),i<2?0:1);
  assert.ok((await page.locator('.quiz__verdict').innerText()).includes(i<2?'Верно.':'Неверно.'));
  assert.ok((await page.locator('.quiz__verdict p').last().innerText()).length>40);
  await page.locator('[data-next]:visible').click();
 }

 await page.locator('[data-next]').click();await page.waitForFunction(()=>window.finished);
 assert.deepEqual(await page.evaluate(()=>window.student.analytics.outcomes.map(o=>[o.category,o.earned,o.possible])),[['test',2,4]]);
 assert.equal(await page.evaluate(()=>window.student.analytics.events.filter(e=>e.correct===false).length),2);
 // Engine runs real interview content with a scripted UI; stop at next interactive chapter.
 await page.evaluate(async()=>{
   const {Engine}=await import('/src/engine.ts');const {scenes}=await import('/src/content.ts');
   const picks=scenes.get('interview').nodes.filter(n=>n.type==='choice').map(n=>n.options.findIndex(o=>o.score===1));
   window.student.scene='interview';window.student.interview={good:99,neutral:0,bad:0};
   const fake={setBackground(){},say:async()=>{},choice:async()=>picks.shift(),chapter:async()=>{},banner:async()=>{},card:async()=>{},achievement:async()=>{},table:async()=>{},screen:async()=>{throw Error('NEXT_SCREEN')}};
   try{await new Engine(fake,window.student).run()}catch(e){if(e.message!=='NEXT_SCREEN')throw e}
 });
 assert.deepEqual(await page.evaluate(()=>window.student.analytics.outcomes.filter(o=>o.category==='interview').map(o=>[o.earned,o.possible])),[[10,10]]);
 console.log('PASS: real test gives 50% with two precise errors; interview resets stale counters and scores 100%');
 await page.evaluate(async()=>{
   const {Engine}=await import('/src/engine.ts');const {scenes}=await import('/src/content.ts');
   const scene=scenes.get('labor');const node=scene.nodes.find(n=>n.type==='quiz');
   window.ui.say=async()=>{};window.ui.banner=async()=>{};window.ui.achievement=async()=>{};
   window.lawAnswers=node.questions.map(q=>(q.correct+1)%q.options.length);window.finished=false;
   void new Engine(window.ui,window.student).playNode({...node,prompt:undefined},scene).then(()=>window.finished=true);
 });
 for(const answer of await page.evaluate(()=>window.lawAnswers)){await page.locator(`[data-answer="${answer}"]`).click();await page.locator('[data-next]:visible').click();}
 await page.waitForFunction(()=>window.finished);
 assert.equal(await page.evaluate(()=>window.student.analytics.outcomes.filter(o=>o.category==='law').at(-1).earned),0);
 assert.equal(await page.evaluate(()=>window.student.analytics.events.filter(e=>e.category==='law'&&e.correct===false).length),3);
 console.log('PASS: real labor quiz through engine records 0/3 and three question-specific errors');

 // Resume save uses same instrumented engine route; seed values for subsequent jobs UI.
 await page.evaluate(async()=>{
   const {save}=await import('/src/state.ts');const {recordOutcome}=await import('/src/reporting.ts');
   recordOutcome(window.student,'resume',80,100);
   window.student.scene='jobs';save(window.student);localStorage.setItem('ya-specialist/still','true');
 });
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.locator('.panel').waitFor({state:'visible'});await page.locator('.panel').click();
 const vacancy=await page.evaluate(async()=>{const {vacancies}=await import('/src/content.ts');const s=JSON.parse(localStorage.getItem('ya-specialist/save/v1'));return vacancies.find(v=>v.kind==='real'&&v.specialties.includes(s.specialty));});
 await page.locator(`[data-open="${vacancy.id}"]`).click();await page.getByRole('button',{name:'Откликнуться',exact:true}).click();
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('ya-specialist/save/v1')).analytics.events.some(e=>e.answer.includes('Не указано секретное слово'))));
 await page.getByRole('button',{name:'Кабинет и результаты',exact:true}).click();
 await page.getByRole('heading',{name:'Личный кабинет студента',exact:true}).waitFor();
 assert.ok((await page.locator('.metric-grid').innerText()).includes('50%'));
 assert.ok((await page.locator('.metric-grid').innerText()).includes('100%'));
 const anonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать JSON-отчёт',exact:true}).click();
 const anon=JSON.parse(fs.readFileSync(await(await anonDownload).path(),'utf8'));
 assert.equal(anon.analytics.fullName,'');assert.equal(anon.analytics.group,'');assert.ok(!JSON.stringify(anon).includes('PRIVATE NICKNAME'));assert.ok(!('resume' in anon));
 await page.locator('[data-identify]').check();const namedDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать JSON-отчёт',exact:true}).click();
 const named=JSON.parse(fs.readFileSync(await(await namedDownload).path(),'utf8'));assert.equal(named.analytics.fullName,'Иванова Мария');assert.equal(named.diagnostics.baseline,1);
 console.log('PASS: real vacancy error recorded, metrics rendered, anonymous default and explicit identified export');
 await page.getByRole('button',{name:'Отчёт для преподавателя',exact:true}).click();
 const second=structuredClone(named);second.analytics.sessionId='second-session';second.analytics.fullName='=HYPERLINK("bad")';second.analytics.group='@SUM(1)';second.analytics.outcomes=[];
 await page.locator('[data-import]').setInputFiles([
   {name:'first.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(named))},
   {name:'second.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(second))},
   {name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')}
 ]);
 await page.locator('[data-import-status]').filter({hasText:'Принято файлов: 2.'}).waitFor();
 assert.equal(await page.locator('.report-table tbody tr').count(),2);
 assert.ok((await page.locator('.report-table tbody tr').nth(1).innerText()).includes('Нет данных'));
 // Same session replaces, never double-counts a student.
 await page.locator('[data-import]').setInputFiles({name:'again.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(named))});
 await page.locator('[data-import-status]').filter({hasText:'Принято файлов: 1.'}).waitFor();assert.equal(await page.locator('.report-table tbody tr').count(),2);
 const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт таблицы в CSV',exact:true}).click();
 const csv=fs.readFileSync(await(await csvDownload).path(),'utf8');assert.equal(csv.charCodeAt(0),0xFEFF);assert.ok(csv.includes('Иванова Мария'));assert.ok(csv.includes("'@SUM(1)"));assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('Нет данных'));
 await page.locator('[data-detail="0"]').click();await page.getByRole('heading',{name:'Отчёт: Иванова Мария',exact:true}).waitFor();
 console.log('PASS: teacher imports 2 reports, rejects invalid JSON, deduplicates sessions, preserves missing data and exports safe UTF-8 CSV');
 // Malformed imports and an XSS-shaped name cannot inject markup.
 const safety=await page.evaluate(async()=>{const {parseReport,csvCell,restoreAnalytics}=await import('/src/reporting.ts');let rejected=false;try{parseReport(JSON.stringify({format:'ya-specialist-report-v2',analytics:{sessionId:'x',startedAt:new Date().toISOString(),events:[],outcomes:[{category:'test',at:new Date().toISOString(),earned:99,possible:4}]}}))}catch{rejected=true}return {rejected,cells:['=1','  +1','-1','@x','\tbad','safe;"text'].map(csvCell),old:restoreAnalytics(undefined).outcomes.length};});
 assert.equal(safety.rejected,true);assert.equal(safety.old,0);assert.ok(safety.cells.slice(0,5).every(c=>c.startsWith('"\'')));
 await page.setViewportSize({width:320,height:740});
 const teacherBounds=await page.getByRole('dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(teacherBounds.scroll<=teacherBounds.client+1,JSON.stringify(teacherBounds));
 await page.getByRole('button',{name:'Студент',exact:true}).click();
 const studentBounds=await page.getByRole('dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(studentBounds.scroll<=studentBounds.client+1,JSON.stringify(studentBounds));
 console.log('PASS: student/teacher dashboards fit 320px viewport with contained table scrolling');
 assert.deepEqual(errors,[]);console.log('PASS: invalid scores rejected, legacy metadata supported, CSV edge cases protected, no browser errors');
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
