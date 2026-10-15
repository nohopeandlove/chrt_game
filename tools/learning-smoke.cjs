// Run against a development server. Playwright is a test-only external tool.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAME_TEST_URL || 'http://127.0.0.1:5174';
let browser;
const assert = require('node:assert/strict');
(async () => {
 browser = await chromium.launch({ executablePath:process.env.BROWSER_EXECUTABLE || undefined, args:process.env.BROWSER_NO_SANDBOX === '1' ? ['--no-sandbox'] : [] });
 const context = await browser.newContext({ acceptDownloads:true });
 const page = await context.newPage(); const errors=[];
 page.on('pageerror', e => errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('[name=playerName]').fill('Учебный профиль');
 await page.getByRole('button',{name:'Начать',exact:true}).click();
 await page.getByRole('heading',{name:'Что такое «Я — специалист»?'}).waitFor();
 await page.getByRole('button',{name:'Пройти входную диагностику'}).click();
 for (const [i,a] of [1,2,0].entries()) await page.locator(`[name=q${i}][value="${a}"]`).check();
 const baselineQuestions=await page.locator('.learning-question legend').allTextContents();
 await page.getByRole('button',{name:'Проверить ответы'}).click();
 await page.getByRole('heading',{name:'Результат: 3 из 3'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ya-specialist/save/v1')).learning.baseline),3);
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.locator('.panel__line').filter({hasText: /./}).waitFor();
 const before=await page.locator('.panel__announcement').textContent();
 await page.getByRole('button',{name:'Кабинет и результаты',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('.panel__announcement').textContent(),before);
 // Reopen if the dialog's focused close button was activated by Enter.
 if (!(await page.getByRole('dialog').isVisible())) await page.getByRole('button',{name:'Кабинет и результаты',exact:true}).click();
 assert.equal(await page.locator('input[type=file]').count(),0);
 assert.equal(await page.getByRole('button',{name:/Скачать|Импорт|Экспорт/}).count(),0);
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await page.locator('.vision-panel [name=size]').evaluate(e=>{e.value='125';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('[data-vision-key=palette][data-value=light]').click();
 await page.locator('[data-collapse]').click();
 await page.getByRole('button',{name:'Без анимации',exact:true}).click();
 assert.ok((await page.locator('html').getAttribute('class')).includes('vision-large'));
 assert.equal(await page.locator('html').getAttribute('data-vision-palette'),'light');
 await page.reload();
 assert.equal(await page.locator('html').getAttribute('data-vision-palette'),'light');
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('button',{name:'Кабинет и результаты',exact:true}).click();
 await page.getByText('Маршрут и входная / итоговая диагностика',{exact:true}).click();
 assert.ok((await page.getByRole('dialog').innerText()).includes('3/3'));
 await page.keyboard.press('Escape');
 console.log('PASS: orientation, baseline, persistence, journal, no student file controls, settings, dialog keyboard');
 // Use the real screen modules with fresh UI/state, independent of narrative pacing.
 await page.evaluate(async()=>{
   const {UI}=await import('/src/ui.ts'); const {newGame}=await import('/src/state.ts');
   const {runTest}=await import('/src/screens/test.ts'); const {tests}=await import('/src/content.ts');
   document.querySelector('#app').remove(); const root=document.createElement('div');root.id='app';document.body.append(root);
   window.testState=newGame('PRIVATE NAME','f'); window.testState.specialty=tests.sets[0].specialty;
   window.answers=tests.sets[0].questions.map(q=>q.correct); window.testUI=new UI(root); window.finished=false;
   void runTest(window.testUI,window.testState).then(()=>window.finished=true);
 });
 const answers=await page.evaluate(()=>window.answers);
 for(const a of answers){await page.locator(`[data-answer="${a}"]`).click();await page.locator('[data-next]:visible').click();}
 await page.getByText('Верных ответов:',{exact:false}).waitFor();
 await page.getByText('Разбор ответов и что повторить',{exact:true}).click();
 assert.equal(await page.locator('.learning-review li').count(),answers.length);
 assert.deepEqual(await page.evaluate(()=>window.testState.learning.attempts.map(a=>[a.correct,a.total])),[[answers.length,answers.length]]);
 await page.locator('[data-next]').click(); await page.waitForFunction(()=>window.finished);
 console.log('PASS: specialty test, answer review and recorded attempt');
 await page.evaluate(async()=>{
  const {runQuiz}=await import('/src/screens/labor.ts'); const {recordAttempt}=await import('/src/learning.ts');
  const qs=[{text:'Проверка',options:['нет','да'],correct:1}];window.finished=false;
  void runQuiz(window.testUI,qs,[{when:'1/1'}],(c,t)=>recordAttempt(window.testState,'Трудовые отношения',c,t)).then(()=>window.finished=true);
 });
 await page.locator('[data-answer="0"]').click(); await page.getByText('Не совсем.',{exact:false}).waitFor();await page.locator('[data-next]').click();await page.waitForFunction(()=>window.finished);
 assert.equal(await page.evaluate(()=>window.testState.learning.attempts[1].correct),0);
 await page.evaluate(async()=>{window.testState.learning.final=2;const {runFinal}=await import('/src/screens/final.ts');void runFinal(window.testUI,window.testState,'Итоги',[],'Пройти заново');});
 assert.notDeepEqual(await page.locator('.learning-question legend').allTextContents(),baselineQuestions);
 for(const [i,a] of [0,1,2].entries()) await page.locator(`[name=q${i}][value="${a}"]`).check();
 await page.getByRole('button',{name:'Проверить ответы'}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('heading',{name:'Личный кабинет · результаты'}).waitFor();
 assert.equal(await page.evaluate(()=>window.testState.learning.final),3);
 assert.equal(await page.evaluate(()=>window.testState.learning.finalForm),'transfer-v2');
 console.log('PASS: labor quiz failed answer, final assessment and final learning report');
 // Mobile layout: intro with large text, all controls reachable by scrolling.
 const mobileContext=await browser.newContext({viewport:{width:390,height:844}});
 const mobile=await mobileContext.newPage();await mobile.goto(base,{waitUntil:'domcontentloaded'});
 await mobile.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await mobile.locator('.vision-panel [name=size]').evaluate(e=>{e.value='150';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await mobile.locator('[data-collapse]').click();
 await mobile.locator('[name=playerName]').fill('Тест'); await mobile.getByRole('button',{name:'Начать',exact:true}).click();
 await mobile.getByRole('heading',{name:'Что такое «Я — специалист»?'}).waitFor();
 const bounds=await mobile.locator('.sheet').evaluate(el=>({w:el.scrollWidth,client:el.clientWidth}));
 assert.ok(bounds.w<=bounds.client+1,JSON.stringify(bounds));
 await mobile.getByRole('button',{name:'Перейти к истории'}).click();

 console.log('PASS: 390px viewport, large-text intro and start action, no sheet overflow');
 // Storage denial should warn while leaving play available.
 const denied=await browser.newContext();await denied.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError')};});
 const p=await denied.newPage();await p.goto(base,{waitUntil:'domcontentloaded'});await p.locator('[name=playerName]').fill('Гость');await p.getByRole('button',{name:'Начать',exact:true}).click();await p.locator('.save-warning').waitFor({state:'visible'});
 await p.getByRole('button',{name:'Перейти к истории'}).click();await p.locator('.panel').waitFor({state:'visible'});
 console.log('PASS: storage denied warning and continued gameplay');
 assert.deepEqual(errors,[]);console.log('PASS: no JavaScript errors in tested scenarios');
 await browser.close();
})().catch(async e=>{console.error(e); if (browser) await browser.close(); process.exitCode=1;});
